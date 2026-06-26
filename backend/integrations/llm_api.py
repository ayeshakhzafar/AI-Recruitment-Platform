# integrations/llm_api.py - FIXED VERSION WITH GROQ
# Compatible with new MCQ generation system

import os
import json
import uuid
import asyncio
import aiohttp
from typing import List, Dict, Optional

# ============================================
# FREE LLM API - GROQ (TRULY FREE & UNLIMITED)
# Sign up at: https://console.groq.com/keys
# No credit card needed, generous rate limits
# ============================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("⚠️  GROQ_API_KEY not set. Set it in .env file")
    print("   Get free key from: https://console.groq.com/keys")

# Groq's free model (fast and high quality)
SELECTED_MODEL = "llama-3.3-70b-versatile"

# Alternative Groq models (all free):
# SELECTED_MODEL = "llama-3.1-8b-instant"  # Faster but smaller
# SELECTED_MODEL = "mixtral-8x7b-32768"    # Good for longer context


async def generate_mcqs_from_llm(prompt: str, max_retries: int = 3) -> List[Dict]:
    """
    Generate MCQs using Groq API
    
    Args:
        prompt: The complete prompt (already built by mcq_logic.py)
        max_retries: Number of retry attempts on failure
    
    Returns:
        List of MCQ dictionaries in standard format
    
    Note: The prompt should already be complete from build_mcq_prompt()
          We don't modify it, just send it as-is to preserve role-specific context
    """
    
    # Extract expected number of questions from prompt
    import re
    match = re.search(r'(\d+)\s+(?:unique|questions|MCQs)', prompt, re.IGNORECASE)
    expected_count = int(match.group(1)) if match else 5
    
    print(f"[LLM-API] Generating {expected_count} questions using {SELECTED_MODEL}")
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": SELECTED_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are an expert technical interviewer. Generate high-quality, role-specific multiple-choice questions in valid JSON format."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
        "max_tokens": 3000,
        "top_p": 0.9
    }
    
    for attempt in range(max_retries):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=90)  # Longer timeout for quality models
                ) as resp:
                    
                    if resp.status != 200:
                        error_text = await resp.text()
                        print(f"❌ OpenRouter API error (attempt {attempt+1}/{max_retries}): {resp.status}")
                        print(f"   Error: {error_text[:200]}")
                        
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2 ** attempt)  # Exponential backoff
                            continue
                        else:
                            print(f"⚠️  All retries failed, using fallback questions")
                            return generate_fallback_questions(expected_count)
                    
                    data = await resp.json()
                    
                    # Extract response content
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    
                    if not content:
                        print(f"❌ Empty response from LLM (attempt {attempt+1}/{max_retries})")
                        if attempt < max_retries - 1:
                            continue
                        else:
                            return generate_fallback_questions(expected_count)
                    
                    # Clean markdown JSON formatting if present
                    content = clean_json_response(content)
                    
                    # Parse JSON
                    try:
                        questions = json.loads(content)
                    except json.JSONDecodeError as e:
                        print(f"❌ JSON parse error (attempt {attempt+1}/{max_retries}): {e}")
                        print(f"   Raw content preview: {content[:300]}...")
                        
                        # Try to extract JSON from text
                        questions = extract_json_from_text(content)
                        
                        if not questions and attempt < max_retries - 1:
                            await asyncio.sleep(1)
                            continue
                        elif not questions:
                            return generate_fallback_questions(expected_count)
                    
                    # Validate and normalize questions
                    validated_questions = validate_and_normalize_questions(questions, expected_count)
                    
                    if validated_questions:
                        if len(validated_questions) < expected_count:
                            missing = expected_count - len(validated_questions)
                            print(f"⚠️ Only {len(validated_questions)}/{expected_count} valid questions. Filling the remaining {missing} with fallback questions.")
                            validated_questions += generate_fallback_questions(missing)

                        print(f"✅ Successfully generated {len(validated_questions)} questions")
                        return validated_questions
                    else:
                        print(f"⚠️  No valid questions generated (attempt {attempt+1}/{max_retries})")
                        if attempt < max_retries - 1:
                            continue
                        else:
                            return generate_fallback_questions(expected_count)
                    
        except asyncio.TimeoutError:
            print(f"⏱️  Request timeout (attempt {attempt+1}/{max_retries})")
            if attempt < max_retries - 1:
                await asyncio.sleep(2)
                continue
            else:
                return generate_fallback_questions(expected_count)
                
        except Exception as e:
            print(f"❌ Unexpected error (attempt {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2)
                continue
            else:
                return generate_fallback_questions(expected_count)
    
    # Should never reach here, but just in case
    return generate_fallback_questions(expected_count)


async def generate_single_mcq_dynamic(
    role: str, 
    difficulty: str, 
    avoid_topics: List[str] = None,
    previous_performance: float = None
) -> Optional[Dict]:
    """
    Generate ONE question dynamically for adaptive testing
    
    This uses build_dynamic_mcq_prompt() from mcq_logic.py
    """
    from domain.mcq_prompts import build_dynamic_mcq_prompt
    
    # Build specialized prompt for single question
    prompt = build_dynamic_mcq_prompt(
        role=role,
        difficulty=difficulty,
        avoid_topics=avoid_topics,
        previous_performance=previous_performance
    )
    
    print(f"[ADAPTIVE-LLM] Generating 1 {difficulty} question for {role}")
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": SELECTED_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are an expert interviewer. Generate ONE high-quality question in valid JSON format."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.8,  # Slightly higher for variety in adaptive mode
        "max_tokens": 800
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=45)
            ) as resp:
                
                if resp.status != 200:
                    error_text = await resp.text()
                    print(f"❌ Adaptive LLM error: {resp.status} - {error_text[:200]}")
                    return generate_fallback_question(role, difficulty)
                
                data = await resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                if not content:
                    return generate_fallback_question(role, difficulty)
                
                # Clean JSON
                content = clean_json_response(content)
                
                # Parse - should be single question dict or array with 1 item
                try:
                    parsed = json.loads(content)
                    
                    if isinstance(parsed, list):
                        question = parsed[0] if parsed else None
                    elif isinstance(parsed, dict):
                        question = parsed
                    else:
                        question = None
                    
                    if not question:
                        return generate_fallback_question(role, difficulty)
                    
                    # ✅ CRITICAL FIX: ALWAYS generate NEW unique ID (don't use setdefault!)
                    question["question_id"] = f"q_{uuid.uuid4().hex[:8]}"  # ← Force new ID every time!
                    question["difficulty"] = difficulty  # ← Force correct difficulty
                    question.setdefault("topic", "general")
                    question.setdefault("role", role)
                    
                    # Validate structure
                    if validate_question_structure(question):
                        print(f"✅ Generated adaptive question {question['question_id']} on {question.get('topic', 'unknown')}")
                        return question
                    else:
                        print(f"⚠️  Invalid question structure")
                        return generate_fallback_question(role, difficulty)
                    
                except json.JSONDecodeError as e:
                    print(f"❌ JSON parse error in adaptive: {e}")
                    return generate_fallback_question(role, difficulty)
                
    except Exception as e:
        print(f"❌ Adaptive question generation error: {e}")
        return generate_fallback_question(role, difficulty)


# ============================================
# HELPER FUNCTIONS
# ============================================

def clean_json_response(content: str) -> str:
    """
    Clean LLM response to extract pure JSON
    Handles markdown code blocks and extra text
    """
    content = content.strip()
    
    # Remove markdown JSON blocks
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        # Generic code block
        parts = content.split("```")
        if len(parts) >= 3:
            content = parts[1].strip()
            # Remove language identifier if present
            if content.startswith("json\n"):
                content = content[5:].strip()
    
    # Remove any leading/trailing text that's not JSON
    # Find first [ or {
    start_bracket = min(
        content.find('[') if '[' in content else len(content),
        content.find('{') if '{' in content else len(content)
    )
    
    if start_bracket < len(content):
        content = content[start_bracket:]
    
    # Find last ] or }
    end_bracket = max(
        content.rfind(']'),
        content.rfind('}')
    )
    
    if end_bracket >= 0:
        content = content[:end_bracket + 1]
    
    return content


def extract_json_from_text(text: str) -> Optional[List[Dict]]:
    """
    Attempt to extract JSON array from messy text
    Last resort before falling back
    """
    import re
    
    # Try to find JSON array pattern
    pattern = r'\[\s*\{.*?\}\s*\]'
    matches = re.findall(pattern, text, re.DOTALL)
    
    for match in matches:
        try:
            questions = json.loads(match)
            if isinstance(questions, list) and all(isinstance(q, dict) for q in questions):
                return questions
        except:
            continue
    
    return None


def validate_question_structure(question: Dict) -> bool:
    """
    Validate that a question has required fields and structure
    """
    required_fields = ["question", "options", "correct_answer"]
    
    # Check required fields exist
    if not all(field in question for field in required_fields):
        return False
    
    # Check options is a list with 4 items
    options = question.get("options", [])
    if not isinstance(options, list) or len(options) != 4:
        return False
    
    # Check each option has label and text
    for opt in options:
        if not isinstance(opt, dict):
            return False
        if "label" not in opt or "text" not in opt:
            return False
    
    # Check correct_answer is valid
    valid_answers = ["A", "B", "C", "D"]
    if question.get("correct_answer") not in valid_answers:
        return False
    
    # Check question text is reasonable length
    q_text = question.get("question", "")
    if len(q_text) < 10 or len(q_text) > 500:
        return False
    
    return True


def validate_and_normalize_questions(questions: any, expected_count: int) -> List[Dict]:
    """
    Validate and normalize a list of questions
    Ensures all questions have required fields and correct structure
    """
    if not isinstance(questions, list):
        print(f"⚠️  Response is not a list: {type(questions)}")
        return []
    
    validated = []
    
    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            print(f"⚠️  Question {i+1} is not a dict: {type(q)}")
            continue
        
        # Validate structure
        if not validate_question_structure(q):
            print(f"⚠️  Question {i+1} failed validation")
            continue
        
        # Ensure ID exists
        if "question_id" not in q or not q["question_id"]:
            q["question_id"] = f"q{i+1}_{uuid.uuid4().hex[:6]}"
        
        # Ensure difficulty and topic
        q.setdefault("difficulty", "medium")
        q.setdefault("topic", "general")
        
        # Ensure explanation
        if "explanation" not in q or not q["explanation"]:
            q["explanation"] = f"The correct answer is {q.get('correct_answer', 'A')}"
        
        validated.append(q)
    
    print(f"[VALIDATION] {len(validated)}/{len(questions)} questions passed validation")
    
    return validated

# ============================================
# FALLBACK QUESTIONS
# ============================================

def generate_fallback_questions(num: int = 5) -> List[Dict]:
    """
    High-quality fallback questions when API fails
    These are better than the old fallbacks - more professional
    """
    fallback_pool = [
        {
            "question": "What is the primary purpose of version control systems like Git?",
            "difficulty": "easy",
            "topic": "Version Control",
            "options": [
                {"label": "A", "text": "To track changes in code over time and enable collaboration"},
                {"label": "B", "text": "To compile code faster"},
                {"label": "C", "text": "To deploy applications to production"},
                {"label": "D", "text": "To write automated tests"}
            ],
            "correct_answer": "A",
            "explanation": "Version control systems track code changes and enable team collaboration"
        },
        {
            "question": "In object-oriented programming, what does encapsulation refer to?",
            "difficulty": "medium",
            "topic": "Object-Oriented Programming",
            "options": [
                {"label": "A", "text": "Bundling data and methods that operate on that data within a single unit"},
                {"label": "B", "text": "Inheriting properties from a parent class"},
                {"label": "C", "text": "Creating multiple methods with the same name"},
                {"label": "D", "text": "Converting objects to JSON format"}
            ],
            "correct_answer": "A",
            "explanation": "Encapsulation is about bundling data with the methods that operate on it"
        },
        {
            "question": "What is the time complexity of accessing an element in a hash table (average case)?",
            "difficulty": "medium",
            "topic": "Data Structures",
            "options": [
                {"label": "A", "text": "O(n)"},
                {"label": "B", "text": "O(log n)"},
                {"label": "C", "text": "O(1)"},
                {"label": "D", "text": "O(n²)"}
            ],
            "correct_answer": "C",
            "explanation": "Hash tables provide O(1) average-case access time"
        },
        {
            "question": "Which HTTP status code indicates that a resource was successfully created?",
            "difficulty": "easy",
            "topic": "Web Development",
            "options": [
                {"label": "A", "text": "200 OK"},
                {"label": "B", "text": "201 Created"},
                {"label": "C", "text": "204 No Content"},
                {"label": "D", "text": "301 Moved Permanently"}
            ],
            "correct_answer": "B",
            "explanation": "201 Created is the standard response for successful resource creation"
        },
        {
            "question": "In database design, what is normalization primarily used for?",
            "difficulty": "medium",
            "topic": "Databases",
            "options": [
                {"label": "A", "text": "Reducing data redundancy and improving data integrity"},
                {"label": "B", "text": "Increasing query performance"},
                {"label": "C", "text": "Encrypting sensitive data"},
                {"label": "D", "text": "Backing up databases"}
            ],
            "correct_answer": "A",
            "explanation": "Normalization reduces redundancy and improves data integrity"
        },
        {
            "question": "What is the purpose of a foreign key in a relational database?",
            "difficulty": "easy",
            "topic": "Databases",
            "options": [
                {"label": "A", "text": "To establish a relationship between two tables"},
                {"label": "B", "text": "To encrypt data"},
                {"label": "C", "text": "To index all columns"},
                {"label": "D", "text": "To backup the database"}
            ],
            "correct_answer": "A",
            "explanation": "Foreign keys create relationships between tables"
        },
        {
            "question": "In Agile development, what is a sprint?",
            "difficulty": "easy",
            "topic": "Software Development",
            "options": [
                {"label": "A", "text": "A time-boxed period for completing a set of work"},
                {"label": "B", "text": "A bug in the code"},
                {"label": "C", "text": "A deployment pipeline"},
                {"label": "D", "text": "A testing framework"}
            ],
            "correct_answer": "A",
            "explanation": "A sprint is a fixed time period (usually 1-4 weeks) for completing work"
        },
        {
            "question": "What does API stand for?",
            "difficulty": "easy",
            "topic": "Software Development",
            "options": [
                {"label": "A", "text": "Application Programming Interface"},
                {"label": "B", "text": "Advanced Program Integration"},
                {"label": "C", "text": "Automated Process Implementation"},
                {"label": "D", "text": "Application Process Interface"}
            ],
            "correct_answer": "A",
            "explanation": "API stands for Application Programming Interface"
        }
    ]
    
    # Cycle through fallbacks to get requested number
    questions = []
    for i in range(num):
        template = fallback_pool[i % len(fallback_pool)].copy()
        template["question_id"] = f"fallback_{i+1}_{uuid.uuid4().hex[:6]}"
        questions.append(template)
    
    print(f"⚠️  Using {num} fallback questions (API unavailable)")
    return questions


def generate_fallback_question(role: str, difficulty: str) -> Dict:
    """Single fallback question for adaptive mode"""
    return {
        "question_id": f"fallback_{uuid.uuid4().hex[:8]}",
        "question": f"What is a key responsibility of a {role}?",
        "difficulty": difficulty,
        "topic": "General Knowledge",
        "role": role,
        "options": [
            {"label": "A", "text": "Effective communication with team members"},
            {"label": "B", "text": "Continuous learning and skill development"},
            {"label": "C", "text": "Problem-solving and critical thinking"},
            {"label": "D", "text": "All of the above"}
        ],
        "correct_answer": "D",
        "explanation": "All these are important responsibilities for any professional role"
    }