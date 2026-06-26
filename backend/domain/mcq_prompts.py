"""MCQ prompt builders and validation for LLM generation.

Note: domain/mcq_logic.py holds interview schemas; MCQ-specific helpers live here.
"""

from typing import List, Dict, Any, Optional


def build_mcq_prompt(role: str, difficulty: str, num_questions: int) -> str:
    role = (role or "Professional").strip()
    difficulty = (difficulty or "medium").strip().lower()
    n = max(1, min(int(num_questions or 5), 50))

    return f"""Generate exactly {n} unique multiple-choice questions for screening candidates for the role: "{role}".

Difficulty level for all questions: {difficulty}
- easy: fundamentals and definitions
- medium: applied concepts and typical scenarios
- hard: advanced troubleshooting, architecture, or deep trade-offs

Output rules (strict):
1. Return ONLY a valid JSON array (no markdown, no code fences, no commentary).
2. Each element must be an object with these keys:
   - "question": string (clear, single question)
   - "options": array of exactly 4 objects, each with "label" ("A","B","C","D") and "text" (string)
   - "correct_answer": one of "A", "B", "C", "D"
   - "explanation": short string why the answer is correct
   - "topic": short string topic tag (e.g. "APIs", "SQL", "system design")
   - "difficulty": "{difficulty}"
3. Questions must be specific to "{role}", not generic trivia.
4. One clearly correct option; distractors plausible but wrong.

Example shape (structure only, do not copy text):
[
  {{
    "question": "...",
    "options": [
      {{"label": "A", "text": "..."}},
      {{"label": "B", "text": "..."}},
      {{"label": "C", "text": "..."}},
      {{"label": "D", "text": "..."}}
    ],
    "correct_answer": "B",
    "explanation": "...",
    "topic": "...",
    "difficulty": "{difficulty}"
  }}
]

Generate {n} unique MCQs now as a JSON array."""


def build_dynamic_mcq_prompt(
    role: str,
    difficulty: str,
    avoid_topics: Optional[List[str]] = None,
    previous_performance: Optional[float] = None,
) -> str:
    role = (role or "Professional").strip()
    difficulty = (difficulty or "medium").strip().lower()
    avoid_topics = [t for t in (avoid_topics or []) if t and str(t).strip()]
    avoid_block = ""
    if avoid_topics:
        topics_str = ", ".join(str(t) for t in avoid_topics[:40])
        avoid_block = f"\nDo NOT repeat or closely mimic these topics already covered: {topics_str}.\n"

    perf_block = ""
    if previous_performance is not None:
        perf_block = (
            f"\nCandidate recent performance hint (0-100 scale): {previous_performance:.1f}. "
            "Adjust complexity slightly: lower scores favor clearer stems; higher scores allow deeper questions.\n"
        )

    return f"""Generate exactly ONE multiple-choice question for role: "{role}".
Difficulty: {difficulty}
{avoid_block}{perf_block}
Return ONLY a single JSON object (no markdown, no array wrapper), with keys:
- "question", "options" (4 objects with "label" A-D and "text"), "correct_answer" (A-D),
- "explanation", "topic", "difficulty": "{difficulty}"

The question must be fresh and role-relevant."""


def validate_question_quality(
    question: Dict[str, Any], role: str, difficulty: str
) -> Dict[str, Any]:
    from integrations.llm_api import validate_question_structure

    if not isinstance(question, dict):
        return {"valid": False, "issues": ["Question is not an object"]}

    if not validate_question_structure(question):
        return {
            "valid": False,
            "issues": [
                "Missing or invalid fields: need question, 4 options with label/text, correct_answer A-D"
            ],
        }

    return {"valid": True, "issues": []}


def extract_topics_from_questions(questions: List[Dict]) -> List[str]:
    topics: List[str] = []
    seen = set()
    for q in questions or []:
        if not isinstance(q, dict):
            continue
        t = q.get("topic")
        if t is None:
            continue
        s = str(t).strip()
        if s and s.lower() not in seen:
            seen.add(s.lower())
            topics.append(s)
    return topics


def categorize_questions_by_difficulty(questions: List[Dict]) -> Dict[str, List[Dict]]:
    out: Dict[str, List[Dict]] = {"easy": [], "medium": [], "hard": []}
    for q in questions or []:
        if not isinstance(q, dict):
            continue
        d = (q.get("difficulty") or "medium").lower()
        if d not in out:
            d = "medium"
        out[d].append(q)
    return out
