from domain.interview_models import InterviewReport, InterviewStatus, AnswerEvaluation, QuestionType
from datetime import datetime
import json
import asyncio

async def test():
    try:
        report = InterviewReport(
            session_id='test',
            candidate_id='test',
            candidate_name='test',
            job_role='swe',
            interview_date=datetime.utcnow(),
            status=InterviewStatus.COMPLETED,
            total_questions_asked=1,
            overall_score=80.0,
            technical_score=80.0,
            communication_score=80.0,
            behavioral_score=80.0,
            video_integrity_score=80.0,
            evaluations=[],
            behavioral_summary='good',
            strengths=[],
            weaknesses=[],
            recommendation='Hire',
            red_flags=[],
            hiring_decision_notes='note',
            suspicious_frames=[{'frame': 'base64', 'reason': 'no face', 'timestamp': '2023-01-01', 'warning': None}]
        )
        print('Created model')
        blob = report.model_dump_json()
        print('Dumped JSON')
    except Exception as e:
        print("ERROR:", str(e))

asyncio.run(test())
