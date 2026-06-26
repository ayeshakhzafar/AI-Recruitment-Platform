from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class QuestionResult(BaseModel):
    question_index: int
    question_text: str
    candidate_answer: Optional[str]
    correct_answer: str
    is_correct: bool

class AssessmentResult(BaseModel):
    result_id: str
    session_id: str
    assessment_id: str
    candidate_email: str
    role: str
    difficulty: str
    
    total_questions: int
    correct_answers: int
    wrong_answers: int
    unanswered: int
    score_percentage: float
    
    start_time: str
    end_time: str
    total_time_taken: int
    
    question_results: List[QuestionResult]
    violations: List[dict] = []
    
    status: str = "completed"
    grade: str = "N/A"
    
    created_at: str