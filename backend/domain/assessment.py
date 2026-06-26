from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MCQOption(BaseModel):
    label: str  # A, B, C, D
    text: str   # The actual option text

class MCQQuestion(BaseModel):
    question: str
    options: List[MCQOption]
    correct_answer: str

class Assessment(BaseModel):
    assessment_id: str
    role: str
    difficulty: str
    questions: List[MCQQuestion]
    duration_minutes: int = 30
    created_at: str
    status: str = "draft"

class AssessmentSession(BaseModel):
    session_id: str
    assessment_id: str
    candidate_email: str
    start_time: str
    end_time: Optional[str] = None
    time_remaining: int  # in seconds
    answers: dict = {}
    violations: List[dict] = []
    status: str = "in_progress"