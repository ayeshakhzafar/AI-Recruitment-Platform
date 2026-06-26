# application/result_service.py - FIXED VERSION
# Removes duplicates, fixes logic

from datetime import datetime
from typing import Dict
import uuid


def calculate_grade(percentage: float) -> str:
    """Calculate letter grade based on percentage - SINGLE DEFINITION"""
    if percentage >= 90:
        return "A+"
    elif percentage >= 85:
        return "A"
    elif percentage >= 80:
        return "B+"
    elif percentage >= 75:
        return "B"
    elif percentage >= 70:
        return "C+"
    elif percentage >= 60:
        return "C"
    elif percentage >= 50:
        return "D"
    else:
        return "F"


def detect_suspicious_completion(session_data: dict, assessment_data: dict) -> dict:
    """
    FR-RES-11: Detect unusually fast completion times - SINGLE DEFINITION
    """
    duration_minutes = assessment_data.get("duration_minutes", 30)
    expected_min_time = duration_minutes * 60 * 0.3  # 30% of allocated time
    
    # Parse start time
    start_time_str = session_data.get("start_time")
    if isinstance(start_time_str, str):
        start_time = datetime.fromisoformat(start_time_str.replace('Z', ''))
    else:
        start_time = start_time_str or datetime.now()
    
    # Parse end time
    end_time_str = session_data.get("end_time")
    if isinstance(end_time_str, str):
        end_time = datetime.fromisoformat(end_time_str.replace('Z', ''))
    elif end_time_str is None:
        end_time = datetime.now()
    else:
        end_time = end_time_str
    
    actual_time = (end_time - start_time).total_seconds()
    
    total_questions = len(assessment_data.get("questions", []))
    time_per_question = actual_time / total_questions if total_questions > 0 else 0
    
    flags = []
    
    # Flag if completed too fast
    if actual_time < expected_min_time:
        flags.append({
            "type": "fast_completion",
            "severity": "high",
            "reason": f"Completed in {int(actual_time)}s, expected minimum {int(expected_min_time)}s"
        })
    
    # Flag if spending too little time per question
    if time_per_question < 15:  # Less than 15 seconds per question
        flags.append({
            "type": "rushed_answers",
            "severity": "medium",
            "reason": f"Average {time_per_question:.1f}s per question"
        })
    
    return {
        "is_suspicious": len(flags) > 0,
        "flags": flags
    }


def process_assessment_result(session_data: dict, assessment_data: dict) -> dict:
    """
    Process raw session and assessment data into structured result
    COMPLETE IMPLEMENTATION with suspicious detection
    """
    answers = session_data.get("answers", {})
    if isinstance(answers, str):
        import json
        answers = json.loads(answers)
    
    questions = assessment_data.get("questions", [])
    
    total = len(questions)
    correct = 0
    wrong = 0
    unanswered = 0
    question_results = []
    
    # Grade each question
    for idx, question in enumerate(questions):
        # Try different answer key formats
        candidate_answer = answers.get(str(idx)) or answers.get(idx)
        correct_answer = question.get("correct_answer")
        
        is_correct = False
        if candidate_answer:
            is_correct = (candidate_answer == correct_answer)
        
        if candidate_answer is None:
            unanswered += 1
        elif is_correct:
            correct += 1
        else:
            wrong += 1
        
        question_results.append({
            "question_index": idx,
            "question_text": question.get("question", ""),
            "candidate_answer": candidate_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct
        })
    
    # Calculate percentage and grade
    percentage = (correct / total * 100) if total > 0 else 0
    grade = calculate_grade(percentage)
    
    # Parse timestamps
    start_time_str = session_data.get("start_time")
    if isinstance(start_time_str, str):
        start_time = datetime.fromisoformat(start_time_str.replace('Z', ''))
    else:
        start_time = start_time_str or datetime.now()
    
    end_time_str = session_data.get("end_time")
    if isinstance(end_time_str, str):
        end_time = datetime.fromisoformat(end_time_str.replace('Z', ''))
    elif end_time_str is None:
        end_time = datetime.now()
    else:
        end_time = end_time_str
    
    time_taken = int((end_time - start_time).total_seconds())
    
    # Detect suspicious completion - FR-RES-11
    suspicious_check = detect_suspicious_completion(session_data, assessment_data)
    
    # Build complete result
    result = {
        "result_id": str(uuid.uuid4()),
        "session_id": session_data.get("session_id"),
        "assessment_id": session_data.get("assessment_id"),
        "candidate_email": session_data.get("candidate_email", "unknown"),
        "role": session_data.get("role") or assessment_data.get("role"),
        "difficulty": assessment_data.get("difficulty", "medium"),
        
        "total_questions": total,
        "correct_answers": correct,
        "wrong_answers": wrong,
        "unanswered": unanswered,
        "score_percentage": round(percentage, 2),
        
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "total_time_taken": time_taken,
        
        "question_results": question_results,
        "violations": session_data.get("violations", []),
        
        # FR-RES-11: Suspicious activity flags
        "flagged": suspicious_check["is_suspicious"],
        "flag_reason": suspicious_check["flags"][0]["reason"] if suspicious_check["flags"] else None,
        "suspicious_flags": suspicious_check["flags"],
        
        "status": "completed",
        "grade": grade,
        "created_at": datetime.now().isoformat()
    }
    
    return result