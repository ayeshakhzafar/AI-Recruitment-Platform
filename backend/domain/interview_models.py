"""
Domain Models — AI Voice Interview Module
100% FREE — No paid API required
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
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
    ICEBREAKER  = "icebreaker"


# ─── Request Schemas ────────────────────────────────────────────────────────

class StartInterviewRequest(BaseModel):
    """candidate_email is required so HR can match MCQ, coding, and interview records."""
    candidate_email: str
    candidate_id: str = ""
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
    # When true, unanswered questions are scored 0 and included in the report
    early_end: bool = False


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
    # Explicit correctness assessment (LLM inferred rubric-based grading)
    is_correct: bool = False
    accuracy_score: float = Field(ge=0, le=100, default=0.0)
    follow_up_triggered: bool = False
    coaching_detected: bool = False
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
    # Composite score derived from per-question correctness/accuracy
    answer_accuracy_score: float = Field(ge=0, le=100, default=0.0)
    answer_correctness_rate: float = Field(ge=0, le=100, default=0.0)
    evaluations: List[AnswerEvaluation]
    behavioral_summary: str
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str
    red_flags: List[str]
    hiring_decision_notes: str
    suspicious_frames: Optional[List[Dict[str, Any]]] = []


# ─── In-memory Session ────────────────────────────────────────────────────────

class InterviewSession(BaseModel):
    session_id: str
    candidate_id: str
    candidate_email: str = ""
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
    fatal_fraud_detected: bool = False
    suspicious_flags: List[str] = []
    integrity_score: float = 100.0
    # Real-time analysis tracking
    tab_switch_count: int = 0
    multiple_face_count: int = 0
    nervous_count: int = 0
    looking_away_count: int = 0
    no_face_count: int = 0
    total_frames_analyzed: int = 0
    analysis_warnings: List[str] = []


# ─── Real-time Analysis Models ───────────────────────────────────────────────


class RealtimeFrameRequest(BaseModel):
    """Request model for real-time frame analysis via WebSocket"""
    session_id: str
    frame_base64: str  # Single frame base64
    is_visible: bool = True  # Tab visibility status
    timestamp: Optional[float] = None


class RealtimeAnalysisResult(BaseModel):
    """Result model for real-time frame analysis"""
    frame_id: str
    face_detected: bool
    multiple_faces: bool
    dominant_emotion: EmotionLabel
    emotions: Dict[str, float] = {}
    gaze_direction: str = "center"
    looking_away: bool = False
    is_visible: bool = True
    warnings: List[str] = []
    analysis_summary: Dict[str, str] = {}


class RealtimeAnalysisSummary(BaseModel):
    """Summary of all real-time analysis for an interview session"""
    session_id: str
    total_frames: int = 0
    face_detected_frames: int = 0
    no_face_frames: int = 0
    multiple_face_frames: int = 0
    nervous_frames: int = 0
    looking_away_frames: int = 0
    tab_switch_count: int = 0
    integrity_score: float = 100.0
    warnings: List[str] = []
    is_flagged: bool = False
    flag_reasons: List[str] = []