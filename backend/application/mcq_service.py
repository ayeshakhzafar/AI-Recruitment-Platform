# application/mcq_service.py - FIXED VERSION

import json
import random
import uuid
import asyncio
from typing import List, Dict

from domain.mcq_prompts import (
    build_mcq_prompt,
    build_dynamic_mcq_prompt,
    validate_question_quality,
)
from domain.adaptive_engine import AdaptiveTestEngine
from integrations.llm_api import generate_mcqs_from_llm
from infrastructure.mcq_repository import save_mcqs


async def generate_mcqs_with_retries(prompt: str, max_retries: int = 3):
    """
    Retry mechanism for LLM API calls with exponential backoff
    ✅ FIXED: max_retries default changed from 5 to 3 (must be int, not str)
    """
    wait_time = 5  # seconds

    for attempt in range(1, max_retries + 1):
        try:
            mcqs = await generate_mcqs_from_llm(prompt)
            return mcqs
        except Exception as e:
            print(f"[MCQ-GENERATOR] Attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                print(f"[MCQ-GENERATOR] Retrying in {wait_time} seconds...")
                await asyncio.sleep(wait_time)
                wait_time *= 2  # exponential backoff
            else:
                print("[MCQ-GENERATOR] All retries exhausted.")
                raise

    return []


async def generate_mcqs_service(
    role: str, 
    difficulty: str, 
    num_questions: int = 5,
    mode: str = "standard"
) -> List[Dict]:
    """
    Generate MCQs for a given role with difficulty specification.
    
    Args:
        role: Job role (e.g., "Software Engineer", "Data Scientist")
        difficulty: "easy", "medium", or "hard"
        num_questions: Number of questions to generate
        mode: "standard" (batch) or "adaptive" (dynamic)
    
    Returns:
        List of MCQ dictionaries
    """
    
    if mode == "adaptive":
        # For adaptive mode, generate smaller initial batch
        # Real adaptive logic happens in take_adaptive_test endpoint
        num_questions = min(num_questions, 10)
    
    # Build role-specific, difficulty-aware prompt
    prompt = build_mcq_prompt(role, difficulty, num_questions)
    
    print(f"[MCQ-SERVICE] Generating {num_questions} questions for {role} ({difficulty} level)")
    
    # Call LLM to generate MCQs with retry logic
    try:
        mcqs = await generate_mcqs_with_retries(prompt, max_retries=3)
    except Exception as e:
        print(f"[MCQ-SERVICE] Failed to generate MCQs: {e}")
        return []
    
    if not mcqs:
        print("[MCQ-SERVICE] No questions generated")
        return []
    
    # Validate and filter questions
    valid_mcqs = []
    for q in mcqs:
        validation = validate_question_quality(q, role, difficulty)
        if validation["valid"]:
            valid_mcqs.append(q)
        else:
            print(f"[MCQ-SERVICE] Question validation failed: {validation['issues']}")
    
    # Ensure each question has unique ID and metadata
    for idx, q in enumerate(valid_mcqs):
        if "question_id" not in q or not q["question_id"]:
            q["question_id"] = f"{role}_{difficulty}_{uuid.uuid4().hex[:8]}"
        
        q["role"] = role
        q["difficulty"] = difficulty
        q["order"] = idx + 1
    
    # Randomize question order
    random.shuffle(valid_mcqs)
    
    # Randomize options within each question
    for q in valid_mcqs:
        options = q.get("options", [])
        if not options:
            continue
        
        correct_answer_original = q.get("correct_answer", "A")
        
        # Find correct option text
        correct_option_text = None
        for opt in options:
            if opt.get("label") == correct_answer_original:
                correct_option_text = opt.get("text")
                break
        
        # Shuffle options
        random.shuffle(options)
        
        # Re-assign labels A, B, C, D
        for idx, opt in enumerate(options):
            new_label = chr(65 + idx)  # A=65, B=66, C=67, D=68
            opt["label"] = new_label
            
            # Update correct_answer to new label
            if correct_option_text and opt.get("text") == correct_option_text:
                q["correct_answer"] = new_label
    
    print(f"[MCQ-SERVICE] Successfully generated {len(valid_mcqs)} valid questions")
    
    # Save to database asynchronously (non-blocking)
    try:
       # Clean any invalid entries before saving
       valid_mcqs = [
        q for q in valid_mcqs
        if isinstance(q, dict)
        and "question" in q
        and "correct_answer" in q
        and "options" in q
        and isinstance(q.get("options"), list)
        and len(q["options"]) == 4
       ]

       await save_mcqs(role, difficulty, valid_mcqs)
       print(f"[MCQ-SERVICE] Saved to database")

    except Exception as e:
        print(f"[MCQ-SERVICE] Database save failed (non-critical): {e}")
    
    return valid_mcqs


async def generate_adaptive_question(
    role: str,
    difficulty: str,
    already_asked_topics: List[str] = None,
    previous_performance: float = None
) -> Dict:
    """
    Generate a SINGLE question dynamically for adaptive testing
    
    This is called multiple times during an adaptive test to generate
    questions on-the-fly based on candidate performance.
    """
    
    # Build dynamic prompt for single question
    prompt = build_dynamic_mcq_prompt(
        role=role,
        difficulty=difficulty,
        avoid_topics=already_asked_topics,
        previous_performance=previous_performance
    )
    
    print(f"[ADAPTIVE] Generating 1 question: {role} | {difficulty} | Performance: {previous_performance}")
    
    try:
        # LLM should return a single question
        result = await generate_mcqs_with_retries(prompt, max_retries=3)
        
        if isinstance(result, list) and len(result) > 0:
            question = result[0]
        elif isinstance(result, dict):
            question = result
        else:
            raise ValueError("Invalid response format from LLM")
        
        # Validate
        validation = validate_question_quality(question, role, difficulty)
        if not validation["valid"]:
            print(f"[ADAPTIVE] Question validation failed: {validation['issues']}")
            return None
        
        # Add metadata
        question["question_id"] = f"adaptive_{uuid.uuid4().hex[:8]}"
        question["role"] = role
        question["difficulty"] = difficulty
        question["generated_adaptively"] = True
        
        return question
        
    except Exception as e:
        print(f"[ADAPTIVE] Failed to generate adaptive question: {e}")
        return None


async def conduct_adaptive_test(
    role: str,
    initial_difficulty: str = "medium",
    max_questions: int = 10
) -> Dict:
    """
    FR-MCQ-04: Conduct adaptive test with dynamic difficulty adjustment
    
    Returns:
        {
            "questions": [...],  # All questions asked
            "answers": [...],    # User answers
            "performance_summary": {...},
            "final_score": float
        }
    """
    
    engine = AdaptiveTestEngine()
    questions_asked = []
    answers = []
    already_asked_topics = []
    
    question_count = 0
    
    while engine.should_continue_test(question_count, max_questions):
        # Get next difficulty from adaptive engine
        current_difficulty = engine.get_next_difficulty()
        
        # Calculate current performance for context
        current_performance = engine.calculate_accuracy() * 100 if engine.performance_window else None
        
        # Generate next question
        question = await generate_adaptive_question(
            role=role,
            difficulty=current_difficulty,
            already_asked_topics=already_asked_topics,
            previous_performance=current_performance
        )
        
        if not question:
            print(f"[ADAPTIVE-TEST] Failed to generate question {question_count + 1}")
            continue
        
        questions_asked.append(question)
        already_asked_topics.append(question.get("topic", ""))
        
        # In real implementation, this would pause and wait for user answer
        # For service layer, we just prepare the question
        # The actual answer submission happens via API endpoint
        
        question_count += 1
    
    return {
        "questions": questions_asked,
        "total_questions": len(questions_asked),
        "difficulty_progression": [q.get("difficulty") for q in questions_asked],
        "topics_covered": already_asked_topics,
        "adaptive_engine_state": engine.get_performance_summary()
    }


def calculate_final_score(answers: List[Dict], questions: List[Dict]) -> Dict:
    """
    Calculate comprehensive test score with breakdown
    """
    if not answers or not questions:
        return {
            "total_score": 0,
            "percentage": 0,
            "correct": 0,
            "incorrect": 0,
            "breakdown": {}
        }
    
    correct_count = 0
    difficulty_breakdown = {"easy": {"correct": 0, "total": 0}, 
                           "medium": {"correct": 0, "total": 0},
                           "hard": {"correct": 0, "total": 0}}
    
    for answer in answers:
        q_id = answer.get("question_id")
        user_answer = answer.get("answer")
        
        # Find matching question
        question = next((q for q in questions if q.get("question_id") == q_id), None)
        if not question:
            continue
        
        difficulty = question.get("difficulty", "medium").lower()
        is_correct = user_answer == question.get("correct_answer")
        
        if is_correct:
            correct_count += 1
            difficulty_breakdown[difficulty]["correct"] += 1
        
        difficulty_breakdown[difficulty]["total"] += 1
    
    total = len(answers)
    percentage = (correct_count / total * 100) if total > 0 else 0
    
    return {
        "total_score": correct_count,
        "total_questions": total,
        "percentage": round(percentage, 2),
        "correct": correct_count,
        "incorrect": total - correct_count,
        "difficulty_breakdown": difficulty_breakdown,
        "passed": percentage >= 60  # 60% passing threshold
    }