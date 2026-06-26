"""
Domain Models — AI Voice Interview Module
100% FREE — No paid API required
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class InterviewStatus(str, Enum):
    PENDING     = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"
    FLAGGED     = "flagged"


class EmotionLabel(str, Enum):
    CONFIDENT   = "confident"
    NERVOUS     = "nervous"
    NEUTRAL     = "neutral"
    SUSPICIOUS  = "suspicious"
    ENGAGED     = "engaged"


class QuestionType(str, Enum):
    BEHAVIORAL  = "behavioral"
    TECHNICAL   = "technical"
    FOLLOW_UP   = "follow_up"
    CLOSING     = "closing"


# ─── Request Schemas ────────────────────────────────────────────────────────

class StartInterviewRequest(BaseModel):
    candidate_id: str
    candidate_name: str
    job_role: str
    job_description: Optional[str] = ""
    candidate_skills: Optional[List[str]] = []
    total_questions: Optional[int] = 8


class AnswerSubmitRequest(BaseModel):
    session_id: str
    question_index: int
    audio_base64: Optional[str] = None          # base64 WEBM/WAV from browser
    transcript_text: Optional[str] = None       # if browser did STT already
    frame_base64_list: Optional[List[str]] = [] # base64 JPEG frames


class EndInterviewRequest(BaseModel):
    session_id: str


# ─── Response Schemas ────────────────────────────────────────────────────────

class QuestionResponse(BaseModel):
    session_id: str
    question_index: int
    question_text: str
    question_type: QuestionType
    tts_audio_base64: Optional[str] = None   # MP3 from edge-tts (free)
    total_questions: int = 0


class FrameAnalysisResult(BaseModel):
    blink_count: int = 0
    gaze_direction: str = "center"
    dominant_emotion: EmotionLabel = EmotionLabel.NEUTRAL
    face_detected: bool = True
    looking_away_ratio: float = 0.0
    suspicious_flags: List[str] = []


class AnswerEvaluation(BaseModel):
    question_index: int
    question_text: str
    question_type: QuestionType
    candidate_transcript: str
    relevance_score: float = Field(ge=0, le=10)
    depth_score: float = Field(ge=0, le=10)
    communication_score: float = Field(ge=0, le=10)
    key_points_covered: List[str] = []
    missed_points: List[str] = []
    follow_up_triggered: bool = False
    frame_analysis: Optional[FrameAnalysisResult] = None
    evaluator_notes: str = ""


class InterviewReport(BaseModel):
    session_id: str
    candidate_id: str
    candidate_name: str
    job_role: str
    interview_date: datetime
    status: InterviewStatus
    total_questions_asked: int
    overall_score: float = Field(ge=0, le=100)
    technical_score: float
    communication_score: float
    behavioral_score: float
    video_integrity_score: float
    evaluations: List[AnswerEvaluation]
    behavioral_summary: str
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str
    red_flags: List[str]
    hiring_decision_notes: str


# ─── In-memory Session ────────────────────────────────────────────────────────

class InterviewSession(BaseModel):
    session_id: str
    candidate_id: str
    candidate_name: str
    job_role: str
    job_description: str
    candidate_skills: List[str]
    status: InterviewStatus = InterviewStatus.PENDING
    questions: List[dict] = []
    current_index: int = 0
    evaluations: List[AnswerEvaluation] = []
    frame_snapshots: List[FrameAnalysisResult] = []
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    conversation_history: List[dict] = []