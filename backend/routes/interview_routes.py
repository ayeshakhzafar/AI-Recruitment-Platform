"""
Interview Routes — FastAPI Endpoints
Add to your main.py:
    from routes.interview_routes import interview_router
    app.include_router(interview_router)
"""

import traceback
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from domain.interview_models import (
    StartInterviewRequest,
    AnswerSubmitRequest,
    EndInterviewRequest,
    QuestionResponse,
    InterviewReport,
    RealtimeFrameRequest,
    RealtimeAnalysisResult,
    RealtimeAnalysisSummary,
    EmotionLabel,
)
from application.interview_service import (
    start_interview,
    submit_answer,
    end_interview_and_report,
    get_session_status,
    update_realtime_analysis,
    get_analysis_summary,
    get_suspicious_frames,
)
from services.face_service import FaceService

interview_router = APIRouter(prefix="/interview", tags=["AI Interview"])

# Store active WebSocket connections per session
active_connections: dict[str, WebSocket] = {}

# Initialize face service
face_service = FaceService()


# ══════════════════════════════════════════════════════════════════════
#  REST Endpoint for Real-time Analysis (simpler than WebSocket)
# ══════════════════════════════════════════════════════════════════════


class FrameAnalysisRequest(BaseModel):
    session_id: str
    frame_base64: str
    is_visible: bool = True


@interview_router.post("/analyze-frame")
async def analyze_frame(req: FrameAnalysisRequest):
    """
    REST endpoint for real-time frame analysis.
    Simpler and more reliable than WebSocket.
    """
    import uuid
    from datetime import datetime
    import cv2
    import base64
    import numpy as np
    from services.face_service import _quick_gaze_check

    frame_id = str(uuid.uuid4())
    warnings = []

    try:
        # Decode base64 to image
        img_data = base64.b64decode(req.frame_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return {
                "frame_id": frame_id,
                "face_detected": True,
                "multiple_faces": False,
                "dominant_emotion": "neutral",
                "gaze_direction": "center",
                "looking_away": False,
                "is_visible": req.is_visible,
                "warnings": ["Could not decode frame"],
                "integrity_score": 100,
            }

        # Quick gaze check
        gaze_result = _quick_gaze_check(frame)

        face_detected = gaze_result.get("face_detected", True)
        multiple_faces = gaze_result.get("multiple_faces", False)
        gaze_direction = gaze_result.get("gaze", "center")
        looking_away = gaze_direction != "center"

        # Generate warnings
        if not face_detected:
            warnings.append("⚠️ No face detected")
        if multiple_faces:
            warnings.append("⚠️ Multiple faces detected")
        if gaze_direction == "left":
            warnings.append("👀 Looking left")
        elif gaze_direction == "right":
            warnings.append("👀 Looking right")
        elif gaze_direction == "up":
            warnings.append("👀 Looking up")
        elif gaze_direction == "down":
            warnings.append("👀 Looking down")
        if not req.is_visible:
            warnings.append("🔓 Tab switched")
            
        # ---------- IDENTITY CHECK ----------
        identity_mismatch = False
        terminate_interview = False
        if face_detected and not multiple_faces:
            try:
                from application.interview_service import _sessions
                from services.face_service import verify_face
                
                session_obj = _sessions.get(req.session_id)
                if session_obj and session_obj.candidate_id:
                    # check if the face matches the registered baseline
                    identity_result = verify_face(img_data, session_obj.candidate_id)
                    if identity_result and not identity_result.get("verified", True):
                        warnings.append("🚨 IDENTITY MISMATCH! DIFFERENT PERSON DETECTED!")
                        identity_mismatch = True
                        terminate_interview = True
                        
                        # Massive console print log as explicitly requested!
                        print("\n" + "!"*60)
                        print(f"[SECURITY ALERT] IDENTITY FRAUD DETECTED!!!")
                        print(f"Session ID: {req.session_id}")
                        print(f"Candidate : {session_obj.candidate_id}")
                        print(f"ACTION    : INTERVIEW HAS BEEN FORCIBLY TERMINATED.")
                        print("!"*60 + "\n")
                        
                        # Add a fatal flag permanently to the session object
                        if not hasattr(session_obj, 'fatal_fraud_detected'):
                            session_obj.fatal_fraud_detected = True
                            session_obj.suspicious_flags.append("🚨 IDENTITY FRAUD: Forcibly terminated")
                            session_obj.integrity_score = 0
                            
                            # Automatically submit the interview so HR immediately receives the fraud report
                            try:
                                from application.interview_service import complete_interview
                                # Submit the current progress with a zero baseline
                                complete_interview(req.session_id, [
                                    {"question_index": q.question_index, "transcript": "", "time_spent_seconds": 0} 
                                    for q in session_obj.questions
                                ])
                            except Exception as comp_err:
                                print(f"Could not auto-submit fraud session: {comp_err}")
            except Exception as ident_err:
                print(f"[Identity Check Error] {ident_err}")
        # ------------------------------------

        # Update analysis
        warning_msg = warnings[0] if warnings else None
        update_realtime_analysis(
            session_id=req.session_id,
            face_detected=face_detected,
            multiple_faces=multiple_faces,
            dominant_emotion="neutral",
            looking_away=looking_away,
            is_visible=req.is_visible,
            warning=warning_msg,
            frame_base64=req.frame_base64 if warnings else None,
        )

        # Calculate quick integrity score
        integrity_score = 100
        if not face_detected:
            integrity_score -= 30
        if multiple_faces:
            integrity_score -= 40
        if looking_away:
            integrity_score -= 20
        if not req.is_visible:
            integrity_score -= 30
        if identity_mismatch:
            integrity_score = 0
            
        integrity_score = max(0, integrity_score)

        return {
            "frame_id": frame_id,
            "face_detected": face_detected,
            "multiple_faces": multiple_faces,
            "dominant_emotion": "neutral",
            "gaze_direction": gaze_direction,
            "looking_away": looking_away,
            "is_visible": req.is_visible,
            "identity_mismatch": identity_mismatch,
            "terminate_interview": terminate_interview,
            "warnings": warnings,
            "integrity_score": integrity_score,
        }

    except Exception as e:
        print(f"[Frame Analysis Error] {e}")
        return {
            "frame_id": frame_id,
            "face_detected": True,
            "multiple_faces": False,
            "dominant_emotion": "neutral",
            "gaze_direction": "center",
            "looking_away": False,
            "is_visible": req.is_visible,
            "warnings": [f"Error: {str(e)}"],
            "integrity_score": 100,
        }


@interview_router.post("/verify-before-start")
async def verify_before_interview(data: dict):
    """
    Verify candidate's face matches registered face before starting interview.
    Called by frontend before the interview begins.

    Request:
    {
        "candidate_id": "string",
        "frame_base64": "string"  // base64 encoded image
    }

    Returns:
    {
        "verified": bool,
        "message": str,
        "can_start": bool
    }
    """
    import base64

    candidate_id = data.get("candidate_id")
    frame_base64 = data.get("frame_base64")

    if not candidate_id or not frame_base64:
        return {
            "verified": False,
            "message": "Missing candidate_id or frame",
            "can_start": False,
        }

    try:
        # Decode base64 to image bytes
        image_data = (
            frame_base64.split(",")[-1] if "," in frame_base64 else frame_base64
        )
        image_bytes = base64.b64decode(image_data)

        # Verify face against registered embedding
        result = face_service.verify_face(image_bytes, candidate_id)

        return {
            "verified": result.get("verified", False),
            "message": result.get("message", "Verification failed"),
            "can_start": result.get("verified", False),
            "distance": result.get("distance"),
            "threshold": result.get("threshold"),
        }

    except Exception as e:
        print(f"[VerifyBeforeStart] Error: {e}")
        return {
            "verified": False,
            "message": f"Error during verification: {str(e)}",
            "can_start": False,
        }


@interview_router.post("/start", response_model=QuestionResponse)
async def start(req: StartInterviewRequest):
    """
    Start a new interview session.
    Returns: session_id, first question text, and MP3 TTS audio (base64).
    Frontend: play the audio, start recording candidate.
    """
    try:
        return await start_interview(req)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        print(f"[ERROR] /interview/start: {e}")
        traceback.print_exc()
        raise HTTPException(500, f"Internal error: {str(e)}")


@interview_router.post("/answer")
async def answer(req: AnswerSubmitRequest):
    """
    Submit candidate answer + video frames.
    Returns: next question + TTS audio, OR {"status":"completed"} when done.
    """
    try:
        result = await submit_answer(req)
        if result is None:
            return JSONResponse({"status": "completed", "session_id": req.session_id})
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@interview_router.post("/end", response_model=InterviewReport)
async def end(req: EndInterviewRequest):
    """
    End interview and get full evaluation report.
    Call after receiving status=completed from /answer.
    """
    try:
        return await end_interview_and_report(req.session_id, early_end=req.early_end)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@interview_router.get("/status/{session_id}")
async def status(session_id: str):
    s = get_session_status(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    return s


@interview_router.get("/health")
async def health():
    return {"status": "ok", "stack": "Groq LLM + Groq Whisper + edge-tts + OpenCV"}


# ══════════════════════════════════════════════════════════════════════
#  Real-time Video Analysis WebSocket Endpoint
# ══════════════════════════════════════════════════════════════════════


@interview_router.websocket("/ws/analyze")
async def websocket_analyze(websocket: WebSocket):
    """
    WebSocket endpoint for real-time video frame analysis.

    Frontend sends:
    {
        "session_id": "string",
        "frame_base64": "string",
        "is_visible": true/false,
        "timestamp": number
    }

    Backend responds with:
    {
        "frame_id": "string",
        "face_detected": true/false,
        "multiple_faces": true/false,
        "dominant_emotion": "string",
        "emotions": {},
        "gaze_direction": "string",
        "looking_away": true/false,
        "is_visible": true/false,
        "warnings": [],
        "analysis_summary": {}
    }
    """
    await websocket.accept()
    session_id = None

    try:
        while True:
            # Receive data from frontend
            data = await websocket.receive_json()

            session_id = data.get("session_id")
            frame_base64 = data.get("frame_base64", "")
            is_visible = data.get("is_visible", True)
            timestamp = data.get("timestamp")

            print(
                f"[WebSocket] Received frame for session: {session_id}, is_visible: {is_visible}"
            )

            if not session_id or not frame_base64:
                print("[WebSocket] Missing session_id or frame_base64")
                await websocket.send_json(
                    {"error": "Missing session_id or frame_base64"}
                )
                continue

            # Analyze the frame
            result = await analyze_frame_realtime(
                session_id=session_id,
                frame_base64=frame_base64,
                is_visible=is_visible,
                timestamp=timestamp,
            )

            print(
                f"[WebSocket] Analysis result: gaze={result.get('gaze_direction')}, face_detected={result.get('face_detected')}"
            )

            # Send analysis result back to frontend
            await websocket.send_json(result)

    except WebSocketDisconnect:
        print(f"[WebSocket] Client disconnected: {session_id}")
        if session_id and session_id in active_connections:
            del active_connections[session_id]
    except Exception as e:
        print(f"[WebSocket Error] {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass


async def analyze_frame_realtime(
    session_id: str, frame_base64: str, is_visible: bool = True, timestamp: float = None
) -> dict:
    """
    Analyze a single frame in real-time.
    Returns analysis result with warnings.
    """
    import uuid
    from datetime import datetime
    import asyncio
    from services.face_service import _quick_gaze_check, _detect_talking

    frame_id = str(uuid.uuid4())
    warnings = []

    try:
        # Decode frame
        import cv2
        import base64
        import numpy as np

        # Decode base64 to image
        img_data = base64.b64decode(frame_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return {
                "frame_id": frame_id,
                "face_detected": True,
                "multiple_faces": False,
                "dominant_emotion": "neutral",
                "emotions": {},
                "gaze_direction": "center",
                "looking_away": False,
                "is_visible": is_visible,
                "warnings": ["Could not decode frame"],
                "timestamp": timestamp,
                "analysis_summary": {},
            }

        # Quick gaze check (fast, uses OpenCV)
        print(f"[Frame Analysis] Calling _quick_gaze_check...")
        gaze_result = _quick_gaze_check(frame)
        print(f"[Frame Analysis] Gaze result: {gaze_result}")

        face_detected = gaze_result.get("face_detected", True)
        multiple_faces = gaze_result.get("multiple_faces", False)
        face_count = gaze_result.get("face_count", 0)
        gaze_direction = gaze_result.get("gaze", "center")
        looking_away = gaze_direction != "center"

        # Log detection results
        if multiple_faces:
            print(f"[ALERT] MULTIPLE FACES DETECTED! Count: {face_count}")
        if not face_detected:
            print(f"[ALERT] NO FACE DETECTED!")
        if looking_away:
            print(f"[ALERT] LOOKING AWAY: {gaze_direction}")

        # Analyze emotions (this takes longer but provides emotion data)
        try:
            emotions = await face_service.emotions([frame_base64])
            dominant_emotion = emotions.get("dominant_emotion", "neutral")
            emotion_scores = emotions.get("emotions", {})
        except Exception as e:
            print(f"[Emotion analysis error] {e}")
            dominant_emotion = "neutral"
            emotion_scores = {}

        # Generate warnings based on analysis
        if not face_detected:
            warnings.append("⚠️ No face detected - Are you looking away?")

        if multiple_faces:
            warnings.append("⚠️ Multiple faces detected - Is someone else in the room?")

        if gaze_direction == "left":
            warnings.append("👀 Looking left - Are you looking at notes or phone?")
        elif gaze_direction == "right":
            warnings.append("👀 Looking right - Are you looking at notes or phone?")
        elif gaze_direction == "up":
            warnings.append("👀 Looking up - Are you thinking or looking at ceiling?")
        elif gaze_direction == "down":
            warnings.append("👀 Looking down - Are you reading something?")

        if dominant_emotion == "nervous":
            warnings.append("😰 Detected nervous expressions - Stay calm!")

        if dominant_emotion == "suspicious":
            warnings.append("⚠️ Suspicious expressions detected")

        if not is_visible:
            warnings.append("🔓 Tab switch detected - Stay on this page!")
            
        # ---------- IDENTITY CHECK ----------
        if face_detected and not multiple_faces:
            try:
                from application.interview_service import _sessions
                from services.face_service import verify_face
                
                session_obj = _sessions.get(session_id)
                if session_obj and session_obj.candidate_id:
                    identity_result = verify_face(img_data, session_obj.candidate_id)
                    if identity_result and not identity_result.get("verified", True):
                        warnings.append("🚨 IDENTITY MISMATCH! DIFFERENT PERSON DETECTED!")
                        print(f"[ALERT] IDENTITY MISMATCH DETECTED for session {session_id}")
            except Exception as ident_err:
                print(f"[Identity Check Error] {ident_err}")
        # ------------------------------------

        # Update session analysis data
        warning_msg = warnings[0] if warnings else None
        update_realtime_analysis(
            session_id=session_id,
            face_detected=face_detected,
            multiple_faces=multiple_faces,
            dominant_emotion=dominant_emotion,
            looking_away=looking_away,
            is_visible=is_visible,
            warning=warning_msg,
        )

        return {
            "frame_id": frame_id,
            "face_detected": face_detected,
            "multiple_faces": multiple_faces,
            "dominant_emotion": dominant_emotion,
            "emotions": emotion_scores,
            "gaze_direction": gaze_direction,
            "looking_away": looking_away,
            "is_visible": is_visible,
            "warnings": warnings,
            "timestamp": timestamp,
            "analysis_summary": {
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat(),
                "integrity_score": 100
                if face_detected and not multiple_faces and looking_away == False
                else 50,
            },
        }

    except Exception as e:
        print(f"[Real-time Analysis Error] {e}")
        return {
            "frame_id": frame_id,
            "face_detected": True,
            "multiple_faces": False,
            "dominant_emotion": "neutral",
            "emotions": {},
            "gaze_direction": "center",
            "looking_away": False,
            "is_visible": is_visible,
            "warnings": [f"Analysis error: {str(e)}"],
            "timestamp": timestamp,
            "analysis_summary": {},
        }


@interview_router.get("/analysis/{session_id}", response_model=RealtimeAnalysisSummary)
async def get_analysis_summary_route(session_id: str):
    """
    Get the real-time analysis summary for a session.
    Returns overall integrity score and warnings.
    """
    session = get_session_status(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    # Get analysis summary from service
    summary = get_analysis_summary(session_id)

    return RealtimeAnalysisSummary(
        session_id=summary["session_id"],
        total_frames=summary["total_frames"],
        face_detected_frames=summary["face_detected_frames"],
        no_face_frames=summary["no_face_frames"],
        multiple_face_frames=summary["multiple_face_frames"],
        nervous_frames=summary["nervous_frames"],
        looking_away_frames=summary["looking_away_frames"],
        tab_switch_count=summary["tab_switch_count"],
        integrity_score=summary["integrity_score"],
        warnings=summary["warnings"],
        is_flagged=summary["is_flagged"],
        flag_reasons=summary["flag_reasons"],
    )


@interview_router.get("/suspicious-frames/{session_id}")
async def get_suspicious_frames_route(session_id: str):
    """
    Get all suspicious frames captured during the interview.
    Returns frames where suspicious behavior was detected.
    """
    session = get_session_status(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    frames = get_suspicious_frames(session_id)
    return {"session_id": session_id, "count": len(frames), "frames": frames}
