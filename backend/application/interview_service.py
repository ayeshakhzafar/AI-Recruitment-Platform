"""
Interview Orchestration Service
Manages full session lifecycle: start → answer loop → report
"""

import uuid
import asyncio
from datetime import datetime
from typing import Optional

from domain.interview_models import (
    InterviewSession, InterviewStatus, InterviewReport,
    StartInterviewRequest, AnswerSubmitRequest,
    QuestionResponse, QuestionType, AnswerEvaluation
)
from services.llm_service import (
    generate_question_plan, generate_followup_question,
    evaluate_answer_interview as evaluate_answer, generate_report_summary
)
from services.tts_service  import synthesize_speech
from services.stt_service  import transcribe_audio
from services.face_service import _analyze_frames_full as analyze_frames

# ── In-memory store (swap with Redis for production) ─────────────────────────
_sessions: dict[str, InterviewSession] = {}

# Analysis tracking for real-time analysis
_analysis_data: dict[str, dict] = {}

# Store captured frames for suspicious behavior
_suspicious_frames: dict[str, list] = {}


# ════════════════════════════════════════════════════════════════════
#  START
# ════════════════════════════════════════════════════════════════════

async def _upsert_voice_interview_session_start(session: InterviewSession) -> None:
    """Create / refresh DB row when voice interview starts (real email for HR matching)."""
    import json
    from sqlalchemy import text
    from infrastructure.db_models import AsyncSessionLocal

    email = (session.candidate_email or "").strip().lower()
    if not email:
        return

    q = text(
        """
        INSERT INTO interview_sessions (
            session_id, candidate_email, candidate_name, job_role, status,
            face_verified, start_time, end_time, questions_json, responses_json,
            emotion_data_json, hr_report_json, overall_score, created_at, updated_at
        ) VALUES (
            :session_id, :email, :name, :role, 'in_progress',
            0, :start_time, NULL, :questions_json, '[]',
            '[]', NULL, NULL, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
            candidate_email = VALUES(candidate_email),
            candidate_name = VALUES(candidate_name),
            job_role = VALUES(job_role),
            status = 'in_progress',
            start_time = COALESCE(interview_sessions.start_time, VALUES(start_time)),
            questions_json = VALUES(questions_json),
            updated_at = NOW()
    """
    )

    questions_json = json.dumps(session.questions or [], default=str)
    started = session.started_at or datetime.utcnow()

    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                q,
                {
                    "session_id": session.session_id,
                    "email": email,
                    "name": session.candidate_name or "",
                    "role": session.job_role or "Software Engineer",
                    "start_time": started,
                    "questions_json": questions_json,
                },
            )
            await db.commit()
    except Exception as e:
        print(f"⚠️ Could not persist interview session start to DB: {e}")


async def start_interview(req: StartInterviewRequest) -> QuestionResponse:
    """
    1. Generate full question plan (1 Groq LLM call)
    2. Generate TTS audio for first question (edge-tts, free)
    3. Store session, return first question
    """
    session_id = str(uuid.uuid4())

    email_norm = (req.candidate_email or "").strip().lower()
    if not email_norm or "@" not in email_norm:
        raise ValueError("Valid candidate_email is required")

    cid = (req.candidate_id or "").strip() or email_norm

    questions = await generate_question_plan(
        job_role=req.job_role,
        job_description=req.job_description or "",
        candidate_skills=req.candidate_skills or [],
        total_questions=req.total_questions or 8
    )

    session = InterviewSession(
        session_id=session_id,
        candidate_id=cid,
        candidate_email=email_norm,
        candidate_name=req.candidate_name,
        job_role=req.job_role,
        job_description=req.job_description or "",
        candidate_skills=req.candidate_skills or [],
        status=InterviewStatus.IN_PROGRESS,
        questions=questions,
        current_index=0,
        started_at=datetime.utcnow()
    )
    _sessions[session_id] = session

    await _upsert_voice_interview_session_start(session)

    first_q    = questions[0]
    tts_audio  = await synthesize_speech(first_q["question_text"])

    session.conversation_history.append({
        "role": "assistant", "content": first_q["question_text"]
    })

    return QuestionResponse(
        session_id=session_id,
        question_index=0,
        question_text=first_q["question_text"],
        question_type=QuestionType(first_q["question_type"]),
        tts_audio_base64=tts_audio,
        total_questions=len(questions)
    )


# ════════════════════════════════════════════════════════════════════
#  SUBMIT ANSWER
# ════════════════════════════════════════════════════════════════════

async def submit_answer(req: AnswerSubmitRequest) -> Optional[QuestionResponse]:
    """
    Process candidate answer:
    - Transcribe audio (Groq Whisper, free)
    - Analyze video frames (local, free)
    - Evaluate answer (Groq LLM, free)
    - Return next question + TTS audio (edge-tts, free)
    - Return None when all questions answered
    """
    session = _sessions.get(req.session_id)
    if not session or session.status != InterviewStatus.IN_PROGRESS:
        raise ValueError(f"Session '{req.session_id}' not found or not active")

    current_q = session.questions[req.question_index]

    # ── Step 1: Transcribe + Analyze frames CONCURRENTLY ────────────
    transcript, frame_result = await asyncio.gather(
        transcribe_audio(
            audio_base64=req.audio_base64,
            transcript_text=req.transcript_text
        ),
        analyze_frames(req.frame_base64_list or [])
    )

    # ── Step 2: Evaluate answer ──────────────────────────────────────
    evaluation = await evaluate_answer(
        question_text=current_q["question_text"],
        question_type=QuestionType(current_q["question_type"]),
        candidate_transcript=transcript,
        job_role=session.job_role,
        frame_analysis=frame_result
    )
    evaluation.question_index = req.question_index
    session.evaluations.append(evaluation)
    session.frame_snapshots.append(frame_result)

    session.conversation_history.append({
        "role": "user", "content": transcript
    })

    # ── Step 3: Follow-up logic ──────────────────────────────────────
    next_index = req.question_index + 1
    avg_score  = (evaluation.relevance_score + evaluation.depth_score) / 2

    should_followup = (
        evaluation.follow_up_triggered
        and avg_score < 4.5
        and current_q["question_type"] not in ("closing", "follow_up")
        and next_index < len(session.questions)
    )

    if should_followup:
        followup = await generate_followup_question(
            job_role=session.job_role,
            original_question=current_q["question_text"],
            candidate_answer=transcript,
            conversation_history=session.conversation_history[-6:]  # last 3 turns
        )
        session.questions.insert(next_index, followup)

    # ── Step 4: Check completion ─────────────────────────────────────
    if next_index >= len(session.questions):
        session.status    = InterviewStatus.COMPLETED
        session.ended_at  = datetime.utcnow()
        return None   # signal: done

    # ── Step 5: Return next question ─────────────────────────────────
    next_q = session.questions[next_index]
    session.current_index = next_index

    session.conversation_history.append({
        "role": "assistant", "content": next_q["question_text"]
    })

    tts_audio = await synthesize_speech(next_q["question_text"])

    return QuestionResponse(
        session_id=req.session_id,
        question_index=next_index,
        question_text=next_q["question_text"],
        question_type=QuestionType(next_q["question_type"]),
        tts_audio_base64=tts_audio,
        total_questions=len(session.questions)
    )


# ════════════════════════════════════════════════════════════════════
#  END + GENERATE REPORT
# ════════════════════════════════════════════════════════════════════

def pad_unanswered_with_zero_scores(session: InterviewSession) -> None:
    """
    For each planned question with no evaluation yet, append a zeroed evaluation
    (not attempted). Keeps per-question scoring consistent when the interview ends early.
    """
    answered = {e.question_index for e in session.evaluations}
    for i, q in enumerate(session.questions):
        if i in answered:
            continue
        try:
            qt = QuestionType(q["question_type"])
        except Exception:
            qt = QuestionType.BEHAVIORAL
        session.evaluations.append(
            AnswerEvaluation(
                question_index=i,
                question_text=q.get("question_text", ""),
                question_type=qt,
                candidate_transcript="",
                relevance_score=0.0,
                depth_score=0.0,
                communication_score=0.0,
                key_points_covered=[],
                missed_points=["Not attempted"],
                is_correct=False,
                accuracy_score=0.0,
                follow_up_triggered=False,
                frame_analysis=None,
                evaluator_notes="Not attempted — scored as 0.",
            )
        )
    session.evaluations.sort(key=lambda e: e.question_index)


async def _persist_voice_interview_to_mysql(session: InterviewSession, report: InterviewReport) -> None:
    """Save voice-interview report to interview_sessions for HR dashboard and /api/interview/report."""
    import json
    from sqlalchemy import text
    from infrastructure.db_models import AsyncSessionLocal

    email = (session.candidate_email or "").strip().lower()
    if not email:
        cid = str(session.candidate_id or "")
        email = cid if "@" in cid else f"{cid or 'unknown'}@interview.local"

    try:
        hr_blob = report.model_dump_json()
    except Exception:
        hr_blob = json.dumps(report.model_dump(mode="json"), default=str)

    questions_json = json.dumps(session.questions or [], default=str)
    evals_dump = [e.model_dump(mode="json") for e in report.evaluations]
    responses_json = json.dumps(evals_dump, default=str)

    started = session.started_at or datetime.utcnow()
    ended = session.ended_at or datetime.utcnow()

    q = text(
        """
        INSERT INTO interview_sessions (
            session_id, candidate_email, candidate_name, job_role, status,
            face_verified, start_time, end_time, questions_json, responses_json,
            hr_report_json, overall_score, created_at, updated_at
        ) VALUES (
            :session_id, :email, :name, :role, 'completed',
            0, :start_time, :end_time, :questions_json, :responses_json,
            :hr_report_json, :overall_score, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
            candidate_email = VALUES(candidate_email),
            candidate_name = VALUES(candidate_name),
            job_role = VALUES(job_role),
            status = 'completed',
            end_time = VALUES(end_time),
            questions_json = VALUES(questions_json),
            responses_json = VALUES(responses_json),
            hr_report_json = VALUES(hr_report_json),
            overall_score = VALUES(overall_score),
            updated_at = NOW()
    """
    )

    async with AsyncSessionLocal() as db:
        await db.execute(
            q,
            {
                "session_id": report.session_id,
                "email": email,
                "name": session.candidate_name or "",
                "role": session.job_role or "Software Engineer",
                "start_time": started,
                "end_time": ended,
                "questions_json": questions_json,
                "responses_json": responses_json,
                "hr_report_json": hr_blob,
                "overall_score": float(report.overall_score),
            },
        )
        await db.commit()


async def end_interview_and_report(session_id: str, early_end: bool = False) -> InterviewReport:
    """
    Calculate scores, generate AI report, return full InterviewReport.
    If early_end is True, pad missing questions with zero scores before reporting.
    """
    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session '{session_id}' not found")

    session.status   = InterviewStatus.COMPLETED
    session.ended_at = session.ended_at or datetime.utcnow()

    if early_end:
        pad_unanswered_with_zero_scores(session)
    elif not session.evaluations and session.questions:
        pad_unanswered_with_zero_scores(session)
    elif len(session.evaluations) < len(session.questions):
        pad_unanswered_with_zero_scores(session)

    evals = sorted(session.evaluations, key=lambda e: e.question_index)
    session.evaluations = evals

    if not evals:
        if session.questions:
            pad_unanswered_with_zero_scores(session)
            evals = sorted(session.evaluations, key=lambda e: e.question_index)
    if not evals:
        raise ValueError("No evaluations recorded (session had no planned questions)")

    # ── Score calculation ────────────────────────────────────────────
    def avg(lst, key):
        return round(sum(getattr(e, key) for e in lst) / len(lst) * 10, 1) if lst else 0.0
        
    def avg_100(lst, key):
        return round(sum(getattr(e, key) for e in lst) / len(lst), 1) if lst else 0.0

    tech_evals = [e for e in evals if e.question_type == QuestionType.TECHNICAL]
    beh_evals  = [e for e in evals if e.question_type in (
                  QuestionType.BEHAVIORAL, QuestionType.FOLLOW_UP)]

    tech_score  = avg_100(tech_evals, "accuracy_score") if tech_evals else avg_100(evals, "accuracy_score")
    comm_score  = avg(evals,       "communication_score")
    beh_score   = avg(beh_evals,   "relevance_score")  if beh_evals else avg(evals, "relevance_score")

    # Video integrity: penalise flags and gaze
    snaps     = session.frame_snapshots
    flag_pen  = sum(len(s.suspicious_flags) for s in snaps) * 10
    gaze_pen  = (sum(s.looking_away_ratio for s in snaps) / max(len(snaps), 1)) * 50
    vid_score_snapshots = max(0.0, 100.0 - flag_pen - gaze_pen)
    
    # Also factor in continuous real-time monitoring data
    analysis_summary = get_analysis_summary(session_id)
    realtime_vid_score = analysis_summary.get("integrity_score", 100.0)
    
    # Include session flags (like identity fraud)
    session_flag_pen = len(getattr(session, "suspicious_flags", [])) * 20
    session_integrity = getattr(session, "integrity_score", 100.0)
    session_score = max(0.0, session_integrity - session_flag_pen)

    # Use the stricter score
    vid_score = round(min(vid_score_snapshots, realtime_vid_score, session_score), 1)

    # FACTOR IN COACHING DETECTED FROM STT
    coaching_count = sum(1 for e in evals if getattr(e, "coaching_detected", False))
    if coaching_count > 0:
        vid_score = max(0.0, vid_score - (coaching_count * 40))
    
    overall = round(
        tech_score  * 0.35 +
        comm_score  * 0.25 +
        beh_score   * 0.25 +
        vid_score   * 0.15,
        1
    )

    # ── Narrative summary ────────────────────────────────────────────
    summary = await generate_report_summary(
        candidate_name=session.candidate_name,
        job_role=session.job_role,
        evaluations=evals,
        overall_score=overall,
        video_integrity_score=vid_score
    )

    red_flags = summary.get("red_flags", [])
    if coaching_count > 0:
        red_flags.append(f"🚨 MULTIPLE VOICES/COACHING DETECTED: The candidate appeared to be receiving answers from someone else in {coaching_count} response(s)!")

    # ── Answer correctness/accuracy summary ─────────────────────────
    answer_accuracy_score = round(
        sum(getattr(e, "accuracy_score", 0.0) for e in evals) / len(evals),
        1
    )
    answer_correctness_rate = round(
        (sum(1 for e in evals if getattr(e, "is_correct", False)) / len(evals)) * 100.0,
        1
    )

    report = InterviewReport(
        session_id=session_id,
        candidate_id=session.candidate_id,
        candidate_name=session.candidate_name,
        job_role=session.job_role,
        interview_date=session.started_at or datetime.utcnow(),
        status=session.status,
        total_questions_asked=len(evals),
        overall_score=overall,
        technical_score=tech_score,
        communication_score=comm_score,
        behavioral_score=beh_score,
        video_integrity_score=vid_score,
        answer_accuracy_score=answer_accuracy_score,
        answer_correctness_rate=answer_correctness_rate,
        evaluations=evals,
        behavioral_summary=summary.get("behavioral_summary", ""),
        strengths=summary.get("strengths", []),
        weaknesses=summary.get("weaknesses", []),
        recommendation=summary.get("recommendation", "Borderline"),
        red_flags=red_flags,
        hiring_decision_notes=summary.get("hiring_decision_notes", ""),
        suspicious_frames=analysis_summary.get("suspicious_frames", [])
    )

    try:
        await _persist_voice_interview_to_mysql(session, report)
    except Exception as e:
        print(f"⚠️ Could not persist interview report to DB (HR dashboard): {e}")

    del _sessions[session_id]
    return report


def get_session_status(session_id: str) -> Optional[dict]:
    s = _sessions.get(session_id)
    if not s:
        # Check if session exists in analysis data (might be ended)
        analysis = _analysis_data.get(session_id, {})
        return analysis
    
    # Include analysis data in session status
    analysis = _analysis_data.get(session_id, {
        "total_frames_analyzed": 0,
        "no_face_count": 0,
        "multiple_face_count": 0,
        "nervous_count": 0,
        "looking_away_count": 0,
        "tab_switch_count": 0,
        "analysis_warnings": []
    })
    
    return {
        "session_id": s.session_id,
        "status": s.status,
        "current_index": s.current_index,
        "total_questions": len(s.questions),
        "candidate_name": s.candidate_name,
        "job_role": s.job_role,
        # Analysis tracking
        "total_frames_analyzed": analysis.get("total_frames_analyzed", 0),
        "no_face_count": analysis.get("no_face_count", 0),
        "multiple_face_count": analysis.get("multiple_face_count", 0),
        "nervous_count": analysis.get("nervous_count", 0),
        "looking_away_count": analysis.get("looking_away_count", 0),
        "tab_switch_count": analysis.get("tab_switch_count", 0),
        "analysis_warnings": analysis.get("analysis_warnings", [])
    }


def update_realtime_analysis(
    session_id: str,
    face_detected: bool = True,
    multiple_faces: bool = False,
    dominant_emotion: str = "neutral",
    looking_away: bool = False,
    is_visible: bool = True,
    warning: str = None,
    frame_base64: str = None
) -> None:
    """
    Update real-time analysis data for a session.
    Called from WebSocket endpoint during interview.
    Saves suspicious frames for evidence.
    """
    if session_id not in _analysis_data:
        _analysis_data[session_id] = {
            "total_frames_analyzed": 0,
            "no_face_count": 0,
            "multiple_face_count": 0,
            "nervous_count": 0,
            "looking_away_count": 0,
            "tab_switch_count": 0,
            "analysis_warnings": [],
            "suspicious_frames": []
        }
    
    # Initialize suspicious frames storage
    if session_id not in _suspicious_frames:
        _suspicious_frames[session_id] = []
    
    data = _analysis_data[session_id]
    data["total_frames_analyzed"] += 1
    
    # Capture frame for evidence if suspicious behavior detected
    should_capture = False
    capture_reason = ""
    
    if not face_detected:
        data["no_face_count"] += 1
        should_capture = True
        capture_reason = "no_face"
    
    if multiple_faces:
        data["multiple_face_count"] += 1
        should_capture = True
        capture_reason = "multiple_faces"
    
    if dominant_emotion == "nervous":
        data["nervous_count"] += 1
        should_capture = True
        capture_reason = "nervous"
    
    if looking_away:
        data["looking_away_count"] += 1
        should_capture = True
        capture_reason = "looking_away"
    
    if not is_visible:
        data["tab_switch_count"] += 1
        # Intentionally NOT setting should_capture = True here per user request, 
        # so we don't save a photo just for a tab switch.
        capture_reason = "tab_switch"
    
    # Save suspicious frame for evidence
    if should_capture and frame_base64 and len(_suspicious_frames[session_id]) < 20:
        _suspicious_frames[session_id].append({
            "frame": frame_base64,
            "reason": capture_reason,
            "timestamp": datetime.utcnow().isoformat(),
            "warning": warning
        })
    
    if warning:
        data["analysis_warnings"].append({
            "warning": warning,
            "timestamp": datetime.utcnow().isoformat()
        })


def get_analysis_summary(session_id: str) -> dict:
    """
    Get analysis summary for a session.
    """
    data = _analysis_data.get(session_id, {})
    suspicious = _suspicious_frames.get(session_id, [])
    
    total_frames = data.get("total_frames_analyzed", 0)
    no_face = data.get("no_face_count", 0)
    multiple_faces = data.get("multiple_face_count", 0)
    nervous = data.get("nervous_count", 0)
    looking_away = data.get("looking_away_count", 0)
    tab_switches = data.get("tab_switch_count", 0)
    
    warnings = []
    flag_reasons = []
    is_flagged = False
    
    if total_frames > 0:
        integrity_score = 100.0
        
        no_face_ratio = no_face / total_frames
        if no_face_ratio > 0.1:
            warnings.append(f"Face not visible {no_face_ratio:.0%} of the time")
            integrity_score -= 20
        elif no_face > 0:
            integrity_score -= min(15.0, no_face * 2.0)
        
        multiple_face_ratio = multiple_faces / total_frames
        if multiple_face_ratio > 0.1:
            warnings.append("Multiple people detected during interview")
            flag_reasons.append("Multiple people detected")
            is_flagged = True
            integrity_score -= 30
        elif multiple_faces > 0:
            integrity_score -= min(20.0, multiple_faces * 5.0)
        
        looking_away_ratio = looking_away / total_frames
        if looking_away_ratio > 0.1:
            warnings.append("Looking away frequently")
            integrity_score -= 15
        elif looking_away > 0:
            integrity_score -= min(10.0, looking_away * 1.0)
        
        if tab_switches >= 1:
            warnings.append(f"Tab switched {tab_switches} times")
            flag_reasons.append("Tab switching detected")
            is_flagged = True
            integrity_score -= 20 * tab_switches
        
        if nervous > total_frames * 0.5:
            warnings.append("Consistently showing nervous expressions")
            integrity_score -= 10
        
        integrity_score = max(0.0, float(integrity_score))
    else:
        integrity_score = 100.0
    
    return {
        "session_id": session_id,
        "total_frames": total_frames,
        "face_detected_frames": total_frames - no_face,
        "no_face_frames": no_face,
        "multiple_face_frames": multiple_faces,
        "nervous_frames": nervous,
        "looking_away_frames": looking_away,
        "tab_switch_count": tab_switches,
        "integrity_score": integrity_score,
        "warnings": warnings,
        "is_flagged": is_flagged,
        "flag_reasons": flag_reasons,
        "suspicious_frames_count": len(suspicious),
        "suspicious_frames": suspicious
    }


def get_suspicious_frames(session_id: str) -> list:
    """Get all suspicious frames captured during the interview."""
    return _suspicious_frames.get(session_id, [])