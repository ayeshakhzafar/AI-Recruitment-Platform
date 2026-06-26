from datetime import datetime
from domain.interview_models import InterviewReport, InterviewStatus, AnswerEvaluation, QuestionType

try:
    report = InterviewReport(
        session_id="test",
        candidate_id="test",
        candidate_name="test",
        job_role="swe",
        interview_date=datetime.utcnow(),
        status=InterviewStatus.COMPLETED,
        total_questions_asked=1,
        overall_score=80.0,
        technical_score=80.0,
        communication_score=80.0,
        behavioral_score=80.0,
        video_integrity_score=80.0,
        evaluations=[AnswerEvaluation(
            question_index=0,
            question_text="q1",
            question_type=QuestionType.BEHAVIORAL,
            candidate_transcript="a1",
            relevance_score=8.0,
            depth_score=8.0,
            communication_score=8.0
        )],
        behavioral_summary="good",
        strengths=["a"],
        weaknesses=["b"],
        recommendation="Hire",
        red_flags=[],
        hiring_decision_notes="note",
        suspicious_frames=[{"frame": "base64", "reason": "no face", "timestamp": "2023-01-01", "warning": None}]
    )
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))

