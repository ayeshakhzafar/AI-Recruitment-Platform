"""
LLM Service — Unified (Groq API, 100% FREE)
=========================================
Handles BOTH use cases with ONE file and ONE API key:

  ① MCQ / Assessment generation  →  LLMService class (your original, unchanged)
  ② Voice Interview module        →  module-level functions at the bottom

Your existing MCQ code needs zero changes.
Your new interview module imports generate_question_plan, etc. from here.

pip install groq httpx
"""

import os
import re
import json
import httpx
from typing import Dict, List, Optional


# ════════════════════════════════════════════════════════════════════
#  SHARED UTILITIES
# ════════════════════════════════════════════════════════════════════

def _strip_fences(text: str) -> str:
    """Remove markdown ```json fences that Groq sometimes adds."""
    return re.sub(r"```json|```", "", text).strip()

def _parse_json(text: str) -> dict:
    """Safely extract and parse first JSON object {} from text."""
    text  = _strip_fences(text)
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start != -1 and end > start:
        text = text[start:end]
    return json.loads(text)

def _parse_json_array(text: str) -> list:
    """Safely extract and parse first JSON array [] from text."""
    text  = _strip_fences(text)
    start = text.find("[")
    end   = text.rfind("]") + 1
    if start != -1 and end > start:
        text = text[start:end]
    return json.loads(text)


# ════════════════════════════════════════════════════════════════════
#  SHARED: Lazy Groq SDK client
#  NOT created at module level — safe to import before .env loads.
#  Used only by interview module functions (section ③ below).
# ════════════════════════════════════════════════════════════════════

_groq_client = None

def _get_groq_client():
    """Return shared Groq SDK client, created on first use."""
    global _groq_client
    if _groq_client is None:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY not set.\n"
                "Add to backend/.env:  GROQ_API_KEY=gsk_xxxx\n"
                "Free key at:          https://console.groq.com"
            )
        _groq_client = Groq(api_key=api_key)
    return _groq_client

def _sdk_call(
    messages: list,
    system: str = None,
    temperature: float = 0.7,
    max_tokens: int = 2000
) -> str:
    """Groq SDK call — used exclusively by interview module functions."""
    client = _get_groq_client()
    msgs   = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.extend(messages)
    resp = client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
        messages=msgs,
        temperature=temperature,
        max_tokens=max_tokens
    )
    return resp.choices[0].message.content


# ════════════════════════════════════════════════════════════════════
#  ① LLMService CLASS  — YOUR ORIGINAL CODE, 100% UNCHANGED
#     Used by: MCQ generation, assessments, all existing modules
#     Do NOT modify this class.
# ════════════════════════════════════════════════════════════════════

class LLMService:
    """Service for generating interview questions using Groq LLM."""

    def __init__(self):
        """Initialize LLM service with Groq API configuration."""
        self.api_key = os.getenv("GROQ_API_KEY")
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model   = os.getenv("LLM_MODEL", "llama-3.1-70b-versatile")

        if not self.api_key:
            raise ValueError("GROQ_API_KEY environment variable is required")

    async def generate_questions(
        self,
        job_title: str,
        job_description: str,
        num_questions: int = 5,
        difficulty: str = "medium"
    ) -> List[Dict]:
        """
        Generate interview questions based on job description.

        Args:
            job_title:        Title of the position
            job_description:  Description of the job role
            num_questions:    Number of questions to generate
            difficulty:       Difficulty level (easy, medium, hard)

        Returns:
            List of generated questions with metadata
        """
        prompt    = self._build_question_prompt(job_title, job_description, num_questions, difficulty)
        response  = await self._call_llm(prompt)
        questions = self._parse_questions_response(response, num_questions)
        return questions

    def _build_question_prompt(
        self,
        job_title: str,
        job_description: str,
        num_questions: int,
        difficulty: str
    ) -> str:
        """Build prompt for question generation."""
        return f"""You are an AI interviewer. Generate {num_questions} {difficulty}-level interview questions for the following job position.

Job Title: {job_title}
Job Description: {job_description}

Generate exactly {num_questions} questions that:
1. Test technical skills relevant to the job
2. Assess problem-solving abilities
3. Evaluate communication skills
4. Are appropriate for a {difficulty} difficulty level

Return the response as a JSON array with objects containing:
- "question": The interview question text
- "category": One of "technical", "behavioral", "problem_solving", "communication"
- "expected_duration": Estimated time to answer in seconds

Format your response as a valid JSON array only, without any additional text."""

    async def _call_llm(self, prompt: str) -> str:
        """Make API call to Groq LLM."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type":  "application/json"
        }
        payload = {
            "model":       self.model,
            "messages":    [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens":  2000
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(self.api_url, headers=headers, json=payload)
            if response.status_code != 200:
                raise Exception(f"Groq LLM API error: {response.text}")
            result = response.json()
            return result["choices"][0]["message"]["content"]

    def _parse_questions_response(self, response: str, expected_count: int) -> List[Dict]:
        """Parse LLM response to extract questions."""
        try:
            questions = json.loads(response)
            if not isinstance(questions, list):
                raise ValueError("Response is not a list")
            for q in questions:
                if "question" not in q:
                    q["question"] = q.get("text", "")
                if "category" not in q:
                    q["category"] = "technical"
                if "expected_duration" not in q:
                    q["expected_duration"] = 60
            return questions[:expected_count]
        except json.JSONDecodeError:
            return self._fallback_parse(response, expected_count)

    def _fallback_parse(self, response: str, expected_count: int) -> List[Dict]:
        """Fallback parsing when JSON fails."""
        questions = []
        lines = response.strip().split("\n")
        for i, line in enumerate(lines[:expected_count]):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith("-") or line.startswith("•")):
                question = line.lstrip("0123456789.-•) ").strip()
                if question:
                    questions.append({
                        "question":          question,
                        "category":          "technical",
                        "expected_duration": 60
                    })
        return questions

    async def evaluate_answer(
        self,
        question: str,
        answer: str,
        job_title: Optional[str] = None
    ) -> Dict:
        """
        Evaluate a candidate's answer to a question.

        Args:
            question:   The interview question
            answer:     Candidate's answer
            job_title:  Optional job title for context

        Returns:
            Evaluation result with scores and feedback
        """
        prompt   = self._build_evaluation_prompt(question, answer, job_title)
        response = await self._call_llm(prompt)
        return self._parse_evaluation_response(response)

    def _build_evaluation_prompt(
        self,
        question: str,
        answer: str,
        job_title: Optional[str]
    ) -> str:
        """Build prompt for answer evaluation."""
        context = f" for a {job_title} position" if job_title else ""
        return f"""You are an AI interviewer evaluating a candidate's answer{context}.

Question: {question}

Candidate's Answer: {answer}

Evaluate this answer on the following criteria (score 0-100 for each):
1. Relevance - How well does it address the question?
2. Depth - Does it show thorough understanding?
3. Clarity - Is it well-organized and easy to understand?
4. Examples - Does it include relevant concrete examples?

Also provide:
- Overall score (weighted average)
- Strengths (list of 2-3 key strengths)
- Areas for improvement (list of 2-3 areas)
- Brief feedback (2-3 sentences)

Return as JSON with keys: relevance, depth, clarity, examples, overall_score, strengths, improvements, feedback"""

    def _parse_evaluation_response(self, response: str) -> Dict:
        """Parse evaluation response from LLM."""
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "error":        "Failed to parse evaluation",
                "raw_response": response[:500]
            }

    async def generate_interview_question(
        self,
        job_role: str,
        question_type: str,
        previous_questions: List[Dict],
        previous_answers: List[str]
    ) -> Dict[str, any]:
        """
        Generate a contextual interview question.

        Args:
            job_role:            The job role being interviewed for
            question_type:       Type of question (introduction, technical, behavioral, etc.)
            previous_questions:  List of previous questions asked
            previous_answers:    List of previous answers given

        Returns:
            Dict with question text and metadata
        """
        context = ""
        if previous_questions and previous_answers:
            context = "\nPrevious Q&A:\n"
            for q, a in zip(previous_questions[-3:], previous_answers[-3:]):
                context += f"Q: {q}\nA: {a}\n\n"

        prompt = f"""You are an AI interviewer for a {job_role} position.
        
{context}
Generate a {question_type} question to ask the candidate.
The question should be contextual based on their previous answers if available.

Return a JSON object with:
- "question": The interview question
- "question_type": The type of question
- "category": One of "technical", "behavioral", "problem_solving", "culture_fit", "introduction"
- "difficulty": "easy", "medium", or "hard"
- "expected_duration": Time to answer in seconds"""

        response = await self._call_llm(prompt)
        try:
            return json.loads(response)
        except:
            return {
                "question":          f"Tell me about your experience with {job_role}",
                "question_type":     question_type,
                "category":          "introduction",
                "difficulty":        "easy",
                "expected_duration": 60
            }


# ════════════════════════════════════════════════════════════════════
#  ② STANDALONE FUNCTIONS — your original backward-compat exports
#     services/__init__.py:
#       from .llm_service import LLMService, generate_interview_question, evaluate_answer
#     These two match exactly what your __init__.py expects.
# ════════════════════════════════════════════════════════════════════

async def generate_interview_question(
    job_role: str,
    question_type: str,
    previous_questions: List[Dict],
    previous_answers: List[str]
) -> Dict[str, any]:
    """Generate interview question using Groq LLM."""
    service = LLMService()
    return await service.generate_interview_question(
        job_role, question_type, previous_questions, previous_answers
    )

async def evaluate_answer(
    question: str,
    answer: str,
    job_title: str = None
) -> Dict:
    """Evaluate a candidate's answer. Returns Dict with scores."""
    service = LLMService()
    return await service.evaluate_answer(question, answer, job_title)


# ════════════════════════════════════════════════════════════════════
#  ③ INTERVIEW MODULE SYSTEM PROMPTS
# ════════════════════════════════════════════════════════════════════

_INTERVIEWER_SYSTEM = """
You are an expert AI HR Interviewer conducting a fully automated voice interview.
Be professional, warm, and unbiased.

RULES:
- Ask ONE question at a time — short and clear (max 2 sentences for TTS)
- Never chain multiple questions
- Be encouraging — never make the candidate feel judged mid-interview
- Adapt based on previous answers

QUESTION STRUCTURE (for a full interview):
1. Icebreaker ("Tell me about yourself")
2-3. Behavioral (STAR method)
4-6. Technical (role-specific)
7. Situational / problem-solving
8. Closing ("Do you have questions for us?")

OUTPUT must be valid JSON only. No extra text. No markdown.
"""

_EVALUATOR_SYSTEM = """
You are an expert HR evaluator. Evaluate interview answers objectively.

SCORING (each 0-10):
- relevance_score: How directly did the answer address the question?
- depth_score: Did they give specific examples, metrics, details?
- communication_score: Clarity, structure, conciseness

CORRECTNESS / ACCURACY:
- is_correct: true/false (answer sufficiently correct for the question's expectations)
- accuracy_score: 0-100 (percentage match to expected content inferred from the question)

OUTPUT must be valid JSON only. No extra text. No markdown fences.
"""


# ════════════════════════════════════════════════════════════════════
#  ④ INTERVIEW MODULE FUNCTIONS
#     Used by: application/interview_service.py
#     These were the missing functions causing your ImportError.
# ════════════════════════════════════════════════════════════════════

async def generate_question_plan(
    job_role: str,
    job_description: str,
    candidate_skills: List[str],
    total_questions: int = 8
) -> List[dict]:
    """
    Generate the full interview question plan in ONE API call.
    Called once at interview start by interview_service.py.
    Returns list of {question_text, question_type} dicts.
    """
    prompt = f"""
Generate exactly {total_questions} interview questions.

JOB ROLE: {job_role}
JOB DESCRIPTION: {job_description or 'Standard role'}
CANDIDATE SKILLS: {', '.join(candidate_skills) if candidate_skills else 'Not provided'}

Return a JSON array of exactly {total_questions} objects:
[
  {{"question_text": "...", "question_type": "behavioral|technical|follow_up|closing"}}
]

Structure:
- Index 0: Warm icebreaker (e.g. "Tell me about yourself and your background.")
- Index 1-2: Behavioral (STAR method — use "Tell me about a time...")
- Index 3-5: Technical (specific to {job_role} and listed skills)
- Index 6: Situational ("How would you handle...")
- Index 7: Closing ("Do you have any questions for us?")

Keep each question max 2 sentences (will be read aloud by TTS).
Return ONLY the JSON array. No other text.
"""
    raw       = _sdk_call([{"role": "user", "content": prompt}], system=_INTERVIEWER_SYSTEM, max_tokens=1500)
    questions = _parse_json_array(raw)
    return questions[:total_questions]


async def generate_followup_question(
    job_role: str,
    original_question: str,
    candidate_answer: str,
    conversation_history: List[dict]
) -> dict:
    """
    Generate ONE context-aware follow-up when answer is too shallow.
    Called conditionally by interview_service.py.
    """
    prompt = f"""
The candidate gave a shallow answer. Generate ONE follow-up question.

ORIGINAL QUESTION: {original_question}
CANDIDATE'S ANSWER: {candidate_answer}
JOB ROLE: {job_role}

Return ONLY this JSON:
{{"question_text": "...", "question_type": "follow_up"}}
Keep under 2 sentences.
"""
    history = conversation_history[-6:]
    raw     = _sdk_call(history + [{"role": "user", "content": prompt}], temperature=0.6, max_tokens=200)
    return _parse_json(raw)


async def evaluate_answer_interview(
    question_text: str,
    question_type,
    candidate_transcript: str,
    job_role: str,
    frame_analysis=None
):
    """
    Score a single voice interview answer.
    Returns AnswerEvaluation domain model (NOT Dict).
    Called per-answer by interview_service.py.

    Separate from evaluate_answer() above which returns Dict for MCQ module.
    """
    from domain.interview_models import AnswerEvaluation

    frame_ctx = ""
    if frame_analysis:
        frame_ctx = f"""
VIDEO SIGNALS:
- Emotion: {frame_analysis.dominant_emotion}
- Gaze: {frame_analysis.gaze_direction}
- Looking away: {frame_analysis.looking_away_ratio:.0%}
- Flags: {', '.join(frame_analysis.suspicious_flags) or 'None'}
"""
    prompt = f"""
Evaluate this interview answer:

JOB ROLE: {job_role}
QUESTION TYPE: {question_type}
QUESTION: {question_text}
CANDIDATE ANSWER: {candidate_transcript if candidate_transcript.strip() else "[No answer provided]"}
{frame_ctx}

Return ONLY this JSON:
{{
  "relevance_score": 0-10,
  "depth_score": 0-10,
  "communication_score": 0-10,
  "key_points_covered": ["point1", "point2"],
  "missed_points": ["what was expected but missing"],
  "is_correct": true or false,
  "accuracy_score": 0-100,
  "follow_up_needed": true or false,
  "coaching_detected": true or false,
  "evaluator_notes": "2-3 sentence professional assessment"
}}
"""
    raw  = _sdk_call([{"role": "user", "content": prompt}], system=_EVALUATOR_SYSTEM + "\n- coaching_detected: Detect if the transcript shows someone else giving the candidate the answer (e.g. background voices coaching them). Set to true if coaching is detected.", temperature=0.3, max_tokens=600)
    data = _parse_json(raw)

    raw_is_correct = data.get("is_correct", False)
    if isinstance(raw_is_correct, str):
        is_correct = raw_is_correct.strip().lower() in ("true", "1", "yes", "correct")
    else:
        is_correct = bool(raw_is_correct)

    return AnswerEvaluation(
        question_index=0,
        question_text=question_text,
        question_type=question_type,
        candidate_transcript=candidate_transcript,
        relevance_score=float(data.get("relevance_score", 5)),
        depth_score=float(data.get("depth_score", 5)),
        communication_score=float(data.get("communication_score", 5)),
        key_points_covered=data.get("key_points_covered", []),
        missed_points=data.get("missed_points", []),
        is_correct=is_correct,
        accuracy_score=float(data.get("accuracy_score", 0.0)),
        follow_up_triggered=bool(data.get("follow_up_needed", False)),
        coaching_detected=bool(data.get("coaching_detected", False)),
        frame_analysis=frame_analysis,
        evaluator_notes=data.get("evaluator_notes", "")
    )


async def generate_report_summary(
    candidate_name: str,
    job_role: str,
    evaluations: list,
    overall_score: float,
    video_integrity_score: float
) -> dict:
    """
    Generate narrative section of the final HR report.
    Called once at interview end by interview_service.py.
    """
    eval_lines = "\n".join([
        f"Q{e.question_index+1} ({e.question_type}): "
        f"R={e.relevance_score} D={e.depth_score} C={e.communication_score} | {e.evaluator_notes}"
        for e in evaluations
    ])

    prompt = f"""
Generate a final interview report for:
CANDIDATE: {candidate_name}
ROLE: {job_role}
OVERALL SCORE: {overall_score:.1f}/100
VIDEO INTEGRITY: {video_integrity_score:.1f}/100

PER-QUESTION EVALUATIONS:
{eval_lines}

Return ONLY this JSON:
{{
  "behavioral_summary": "2-3 sentence summary of behavioral traits",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendation": "Strongly Recommend|Recommend|Borderline|Not Recommend",
  "red_flags": [],
  "hiring_decision_notes": "2-3 sentences for the HR manager"
}}
"""
    raw = _sdk_call(
        [{"role": "user", "content": prompt}],
        system="You are an expert HR analyst. Be objective and professional. Return only valid JSON.",
        temperature=0.4,
        max_tokens=800
    )
    return _parse_json(raw)