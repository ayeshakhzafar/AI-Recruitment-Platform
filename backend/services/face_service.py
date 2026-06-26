"""
Face Service — FREE using OpenCV + MediaPipe
NO dependency on DeepFace - uses histogram-based face matching.

pip install opencv-python mediapipe
"""

import os
import base64
import asyncio
import json
import numpy as np
from typing import List, Optional, Dict
from domain.interview_models import FrameAnalysisResult, EmotionLabel


# ════════════════════════════════════════════════════════════
#  Face Embedding Storage (in-memory, use Redis for production)
# ════════════════════════════════════════════════════════════════════

_face_embeddings: Dict[str, np.ndarray] = {}
_verification_threshold = 0.40  # Cosine distance threshold for Facenet matching


def _get_face_embedding(image_bytes: bytes) -> Optional[np.ndarray]:
    """
    Extract face embedding using DeepFace.
    """
    try:
        import cv2
        from deepface import DeepFace

        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return None

        # Use DeepFace to get a real facial embedding
        try:
            # anti_spoofing=True helps block photos held up on phones if deepface version supports it
            embedding_objs = DeepFace.represent(
                img_path=frame,
                model_name="Facenet",
                enforce_detection=True,
                detector_backend="opencv",
                anti_spoofing=True
            )
        except TypeError:
            # Fallback for old deepface versions without anti_spoofing parameter
            embedding_objs = DeepFace.represent(
                img_path=frame,
                model_name="Facenet",
                enforce_detection=True,
                detector_backend="opencv"
            )

        if embedding_objs and len(embedding_objs) > 0:
            # Return first face embedding
            
            # Check spoofing result if available in the result dict
            first_face = embedding_objs[0]
            if "is_real" in first_face and not first_face["is_real"]:
               print("[FaceEmbedding] SPOOF DETECTED: Face is not real (e.g., photo on phone)")
               return None
               
            return np.array(first_face["embedding"])
        
        return None

    except Exception as e:
        print(f"[FaceEmbedding] Failed: {e}")
        return None


def register_face(image_bytes: bytes, candidate_id: str) -> bool:
    """
    Register a candidate's face embedding for future verification.
    Stores embedding in memory (use Redis for production).
    """
    embedding = _get_face_embedding(image_bytes)

    if embedding is not None:
        _face_embeddings[candidate_id] = embedding
        print(f"[FaceRegister] Registered face for candidate: {candidate_id}")
        return True

    return False


def verify_face(image_bytes: bytes, candidate_id: str) -> Dict:
    """
    Verify current face against registered face.
    Returns verification result with distance and confidence.
    """
    stored_embedding = _face_embeddings.get(candidate_id)

    if stored_embedding is None:
        return {
            "verified": False,
            "alert": True,
            "distance": 1.0,
            "threshold": _verification_threshold,
            "message": "No registered face found for this candidate",
        }

    current_embedding = _get_face_embedding(image_bytes)

    if current_embedding is None:
        return {
            "verified": False,
            "alert": True,
            "distance": 1.0,
            "threshold": _verification_threshold,
            "message": "No face detected in current image",
        }

    cosine_distance = 1 - np.dot(stored_embedding, current_embedding) / (
        np.linalg.norm(stored_embedding) * np.linalg.norm(current_embedding)
    )

    verified = cosine_distance < _verification_threshold

    return {
        "verified": verified,
        "alert": not verified,
        "distance": float(cosine_distance),
        "threshold": _verification_threshold,
        "message": "Face verified successfully"
        if verified
        else "Face does not match registered face",
    }


def clear_face_registration(candidate_id: str) -> bool:
    """Remove stored face embedding for a candidate."""
    if candidate_id in _face_embeddings:
        del _face_embeddings[candidate_id]
        return True
    return False


# ════════════════════════════════════════════════════════════════════
#  Internal helpers (no imports from other custom services)
# ════════════════════════════════════════════════════════════════════


def _decode_frame(frame_b64: str) -> Optional[np.ndarray]:
    try:
        import cv2

        data = base64.b64decode(frame_b64)
        arr = np.frombuffer(data, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def _face_check(frames: List[np.ndarray]) -> dict:
    try:
        import cv2

        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        no_face = multi_face = 0
        sampled = frames[::2]
        for frame in sampled:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = cascade.detectMultiScale(gray, 1.1, 4, minSize=(60, 60))
            if len(faces) == 0:
                no_face += 1
            elif len(faces) > 1:
                multi_face += 1
        total = max(len(sampled), 1)
        return {
            "face_detected": no_face / total < 0.35,
            "no_face_ratio": round(no_face / total, 2),
            "multiple_faces_detected": multi_face > 0,
        }
    except Exception as e:
        print(f"[FaceCheck] {e}")
        return {
            "face_detected": True,
            "no_face_ratio": 0.0,
            "multiple_faces_detected": False,
        }


EMOTION_MAP = {
    "happy": EmotionLabel.CONFIDENT,
    "neutral": EmotionLabel.NEUTRAL,
    "surprise": EmotionLabel.ENGAGED,
    "fear": EmotionLabel.NERVOUS,
    "sad": EmotionLabel.NERVOUS,
    "angry": EmotionLabel.SUSPICIOUS,
    "disgust": EmotionLabel.SUSPICIOUS,
}


def _emotion_analysis(frames: List[np.ndarray]) -> dict:
    try:
        from deepface import DeepFace

        tallies = {}
        count = 0
        for frame in frames[::3]:
            try:
                res = DeepFace.analyze(
                    frame, actions=["emotion"], enforce_detection=False, silent=True
                )
                if isinstance(res, list):
                    res = res[0]
                for emo, score in res.get("emotion", {}).items():
                    tallies[emo] = tallies.get(emo, 0) + score
                count += 1
            except Exception:
                continue
        if not count:
            return {"dominant_emotion": EmotionLabel.NEUTRAL, "scores": {}}
        avg = {k: v / count for k, v in tallies.items()}
        top = max(avg, key=avg.get)
        return {
            "dominant_emotion": EMOTION_MAP.get(top, EmotionLabel.NEUTRAL),
            "scores": avg,
        }
    except ImportError:
        print("[Emotion] pip install deepface tf-keras")
        return {"dominant_emotion": EmotionLabel.NEUTRAL, "scores": {}}
    except Exception as e:
        print(f"[Emotion] {e}")
        return {"dominant_emotion": EmotionLabel.NEUTRAL, "scores": {}}


def _gaze_estimate(frames: List[np.ndarray]) -> dict:
    try:
        import mediapipe as mp
        import cv2

        mp_fm = mp.solutions.face_mesh
        face_mesh = mp_fm.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )
        away = total = 0
        dirs = {"center": 0, "left": 0, "right": 0, "up": 0, "down": 0}

        # For faster processing, only process every 3rd frame
        for frame in frames[::3]:
            try:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = face_mesh.process(rgb)
                total += 1

                if not result.multi_face_landmarks:
                    away += 1
                    continue

                lm = result.multi_face_landmarks[0].landmark

                # Use nose tip and eye positions for gaze direction
                nose = lm[1]  # Nose tip
                left_eye = lm[33]  # Left eye center
                right_eye = lm[263]  # Right eye center

                # Calculate eye centers
                left_eye_center = lm[468]
                right_eye_center = lm[473]

                # Horizontal gaze: compare nose position to eye centers
                eye_center_x = (left_eye_center.x + right_eye_center.x) / 2
                dx = nose.x - eye_center_x

                # Vertical gaze: compare nose to eye level
                eye_center_y = (left_eye_center.y + right_eye_center.y) / 2
                dy = nose.y - eye_center_y

                # More sensitive thresholds for detecting looking away
                if abs(dx) > 0.035:  # Looking left or right
                    d = "left" if dx < 0 else "right"
                    away += 1
                elif dy < -0.035:  # Looking up
                    d = "up"
                    away += 1
                elif dy > 0.12:  # Looking down
                    d = "down"
                else:
                    d = "center"

                dirs[d] = dirs.get(d, 0) + 1
            except Exception as e:
                continue

        face_mesh.close()
        return {
            "gaze_direction": max(dirs, key=dirs.get),
            "looking_away_ratio": round(away / max(total, 1), 2),
        }
    except ImportError:
        print("[Gaze] pip install mediapipe")
        return {"gaze_direction": "center", "looking_away_ratio": 0.0}
    except Exception as e:
        print(f"[Gaze] {e}")
        return {"gaze_direction": "center", "looking_away_ratio": 0.0}


def _detect_talking(frames: List[np.ndarray]) -> dict:
    """
    Detect if person is talking by analyzing mouth movement.
    Uses lip distance ratio to detect open mouth/talking.
    """
    try:
        import mediapipe as mp
        import cv2

        mp_face = mp.solutions.face_mesh
        face_mesh = mp_face.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )

        # Lip landmark indices
        UPPER_LIP = 13
        LOWER_LIP = 14
        LEFT_corner = 61
        RIGHT_corner = 291

        talking = 0
        total = 0
        mouth_open_ratios = []

        for frame in frames[::2]:  # Check every other frame for speed
            try:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = face_mesh.process(rgb)
                total += 1

                if not result.multi_face_landmarks:
                    continue

                lm = result.multi_face_landmarks[0].landmark

                # Calculate mouth open ratio
                upper_lip = lm[UPPER_LIP]
                lower_lip = lm[LOWER_LIP]
                mouth_height = abs(lower_lip.y - upper_lip.y)

                # Calculate mouth width
                left_corner = lm[LEFT_corner]
                right_corner = lm[RIGHT_corner]
                mouth_width = abs(right_corner.x - left_corner.x)

                # Ratio of height to width - if mouth is open (talking)
                if mouth_width > 0:
                    ratio = mouth_height / mouth_width
                    mouth_open_ratios.append(ratio)

                    # If ratio is high, mouth is open (talking)
                    if ratio > 0.5:
                        talking += 1

            except Exception:
                continue

        face_mesh.close()

        avg_ratio = (
            sum(mouth_open_ratios) / len(mouth_open_ratios) if mouth_open_ratios else 0
        )

        return {
            "talking_detected": talking > 0,
            "talking_ratio": round(talking / max(total, 1), 2),
            "avg_mouth_open_ratio": round(avg_ratio, 3),
        }

    except ImportError:
        print("[Talking] pip install mediapipe")
        return {
            "talking_detected": False,
            "talking_ratio": 0.0,
            "avg_mouth_open_ratio": 0.0,
        }
    except Exception as e:
        print(f"[Talking] {e}")
        return {
            "talking_detected": False,
            "talking_ratio": 0.0,
            "avg_mouth_open_ratio": 0.0,
        }


def _quick_gaze_check(frame: np.ndarray) -> dict:
    """
    Quick single frame gaze check for real-time analysis.
    Uses simpler method without heavy MediaPipe for speed.
    Detects: face presence, multiple faces, and gaze direction.
    """
    try:
        import cv2

        # Use Haar cascade for face detection - more sensitive
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

        # Also load profile face cascade for side views
        profile_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_profileface.xml"
        )

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect frontal faces with more reliable parameters
        faces = cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,  # Less noisy
            minNeighbors=5,  # Standard threshold to reduce false positives
            minSize=(60, 60),  # Reasonable minimum size
            flags=cv2.CASCADE_SCALE_IMAGE,
        )

        # Also try profile face detection
        if profile_cascade.empty() == False:
            profile_faces = profile_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(60, 60),
                flags=cv2.CASCADE_SCALE_IMAGE,
            )
            # Combine both detections without double counting the same region
            if len(profile_faces) > 0:
                faces = list(faces) + list(profile_faces)

        total_faces = len(faces)

        # Simple deduplication in case frontal and profile detect the same face
        if total_faces > 1:
            unique_faces = []
            for face in faces:
                x, y, w, h = face
                is_duplicate = False
                for ux, uy, uw, uh in unique_faces:
                    # Check overlap
                    if x < ux + uw and x + w > ux and y < uy + uh and y + h > uy:
                        is_duplicate = True
                        break
                if not is_duplicate:
                    unique_faces.append(face)
            total_faces = len(unique_faces)
            faces = unique_faces

        print(f"[QuickGaze] Detected {total_faces} face(s)")

        if total_faces == 0:
            return {"gaze": "away", "face_detected": False, "multiple_faces": False}

        if total_faces > 1:
            print(f"[QuickGaze] MULTIPLE FACES DETECTED: {total_faces}")
            return {
                "gaze": "unknown",
                "face_detected": True,
                "multiple_faces": True,
                "face_count": total_faces,
            }

        # Single face - try to detect eye region for gaze
        x, y, w, h = faces[0]

        # Define eye region (upper part of face)
        eye_region = gray[y : y + int(h * 0.4), x : x + w]

        # Simple brightness-based eye detection
        if eye_region.size > 0:
            # Calculate average brightness in left and right halves of eye region
            mid_x = eye_region.shape[1] // 2
            left_brightness = np.mean(eye_region[:, :mid_x])
            right_brightness = np.mean(eye_region[:, mid_x:])

            # Use a much higher threshold to prevent room lighting/shadows from triggering false gaze
            brightness_diff = abs(left_brightness - right_brightness) / 255

            if brightness_diff > 0.35:
                gaze = "left" if left_brightness > right_brightness else "right"
                return {"gaze": gaze, "face_detected": True, "multiple_faces": False}

        return {"gaze": "center", "face_detected": True, "multiple_faces": False}

    except Exception as e:
        print(f"[QuickGaze] {e}")
        return {"gaze": "center", "face_detected": True, "multiple_faces": False}


def _count_blinks(frames: List[np.ndarray]) -> int:
    try:
        import dlib, cv2

        model_path = os.getenv(
            "DLIB_MODEL_PATH", "models/shape_predictor_68_face_landmarks.dat"
        )
        if not os.path.exists(model_path):
            return -1
        detector = dlib.get_frontal_face_detector()
        predictor = dlib.shape_predictor(model_path)
        LEFT, RIGHT = list(range(36, 42)), list(range(42, 48))

        def ear(pts):
            def d(a, b):
                return np.linalg.norm(np.array(a) - np.array(b))

            A = d(pts[1], pts[5])
            B = d(pts[2], pts[4])
            C = d(pts[0], pts[3])
            return (A + B) / (2.0 * C) if C > 0 else 0.0

        blinks = 0
        closed = False
        for frame in frames:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = detector(gray, 0)
            if not faces:
                continue
            shape = predictor(gray, faces[0])
            pts = [(shape.part(i).x, shape.part(i).y) for i in range(68)]
            avg = (ear([pts[i] for i in LEFT]) + ear([pts[i] for i in RIGHT])) / 2
            if avg < 0.25:
                if not closed:
                    blinks += 1
                    closed = True
            else:
                closed = False
        return blinks
    except ImportError:
        return -1
    except Exception:
        return -1


# ════════════════════════════════════════════════════════════════════
#  Standalone: verify_face  (imported by __init__.py)
# ════════════════════════════════════════════════════════════════════


async def verify_face(frame_base64: str) -> Dict:
    """
    Check single frame — is exactly one face visible?
    Returns: {face_detected, multiple_faces, confidence, message}
    """
    try:
        import cv2

        frame = _decode_frame(frame_base64)
        if frame is None:
            return {
                "face_detected": False,
                "multiple_faces": False,
                "confidence": 0.0,
                "message": "Could not decode frame",
            }
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(gray, 1.1, 4, minSize=(60, 60))
        count = len(faces)
        if count == 0:
            return {
                "face_detected": False,
                "multiple_faces": False,
                "confidence": 0.0,
                "message": "No face detected",
            }
        if count > 1:
            return {
                "face_detected": True,
                "multiple_faces": True,
                "confidence": 1.0,
                "message": f"{count} faces — possible assistance",
            }
        return {
            "face_detected": True,
            "multiple_faces": False,
            "confidence": 1.0,
            "message": "OK",
        }
    except Exception as e:
        return {
            "face_detected": False,
            "multiple_faces": False,
            "confidence": 0.0,
            "message": str(e),
        }


# ════════════════════════════════════════════════════════════════════
#  Standalone: analyze_emotions  (imported by __init__.py)
# ════════════════════════════════════════════════════════════════════


async def analyze_emotions(frame_base64_list: List[str]) -> Dict:
    """
    Emotion distribution across multiple frames.
    Returns: {dominant_emotion, emotions, frame_count}
    """
    if not frame_base64_list:
        return {"dominant_emotion": "neutral", "emotions": {}, "frame_count": 0}
    loop = asyncio.get_event_loop()
    frames = [_decode_frame(f) for f in frame_base64_list]
    frames = [f for f in frames if f is not None]
    if not frames:
        return {"dominant_emotion": "neutral", "emotions": {}, "frame_count": 0}
    result = await loop.run_in_executor(None, _emotion_analysis, frames)
    dom = result.get("dominant_emotion", EmotionLabel.NEUTRAL)
    return {
        "dominant_emotion": dom.value if hasattr(dom, "value") else str(dom),
        "emotions": result.get("scores", {}),
        "frame_count": len(frames),
    }


# ════════════════════════════════════════════════════════════════════
#  Full pipeline — used by interview_service.py
# ════════════════════════════════════════════════════════════════════


async def _analyze_frames_full(frame_b64_list: List[str]) -> FrameAnalysisResult:
    if not frame_b64_list:
        return FrameAnalysisResult()
    loop = asyncio.get_event_loop()
    frames = [_decode_frame(f) for f in frame_b64_list]
    frames = [f for f in frames if f is not None]
    if not frames:
        return FrameAnalysisResult(face_detected=False)

    face_r, emo_r, gaze_r, blinks = await asyncio.gather(
        loop.run_in_executor(None, _face_check, frames),
        loop.run_in_executor(None, _emotion_analysis, frames),
        loop.run_in_executor(None, _gaze_estimate, frames),
        loop.run_in_executor(None, _count_blinks, frames),
    )

    flags = []
    if not face_r["face_detected"]:
        flags.append("Face not visible for extended period")
    if face_r.get("multiple_faces_detected"):
        flags.append("Multiple faces detected — possible assistance")
    if gaze_r["looking_away_ratio"] > 0.4:
        flags.append(f"Looking away {gaze_r['looking_away_ratio']:.0%} of the time")
    if blinks > 45:
        flags.append(f"High blink rate ({blinks} blinks)")
    if emo_r["dominant_emotion"] == EmotionLabel.SUSPICIOUS:
        flags.append("Suspicious facial expressions detected")

    return FrameAnalysisResult(
        blink_count=max(blinks, 0),
        gaze_direction=gaze_r["gaze_direction"],
        dominant_emotion=emo_r["dominant_emotion"],
        face_detected=face_r["face_detected"],
        looking_away_ratio=gaze_r["looking_away_ratio"],
        suspicious_flags=flags,
    )


# ════════════════════════════════════════════════════════════════════
#  FaceService CLASS  (imported by __init__.py)
# ════════════════════════════════════════════════════════════════════


class FaceService:
    """
    Full face analysis service for the interview module.
    Self-contained — does NOT import from video_analysis_service.
    """

    def register_face(self, image_bytes: bytes, candidate_id: str) -> bool:
        """Register a candidate's face embedding."""
        return register_face(image_bytes, candidate_id)

    def verify_face(self, image_bytes: bytes, candidate_id: str) -> Dict:
        """Verify current face against registered face."""
        return verify_face(image_bytes, candidate_id)

    def analyze_emotion(self, image_bytes: bytes) -> Dict:
        """Analyze emotions from image bytes."""
        import cv2
        import numpy as np

        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                return {"dominant_emotion": "unknown", "emotions": {}}

            from deepface import DeepFace

            result = DeepFace.analyze(
                frame, actions=["emotion"], enforce_detection=False, silent=True
            )

            if isinstance(result, list):
                result = result[0]

            emotions = result.get("emotion", {})
            if emotions:
                dominant = max(emotions, key=emotions.get)
            else:
                dominant = "neutral"

            return {"dominant_emotion": dominant, "emotions": emotions}
        except Exception as e:
            print(f"[AnalyzeEmotion] {e}")
            return {"dominant_emotion": "unknown", "emotions": {}}

    async def analyze(self, frame_base64_list: List[str]) -> FrameAnalysisResult:
        """Full pipeline: face + emotion + gaze + blink."""
        return await _analyze_frames_full(frame_base64_list)

    async def verify(self, frame_base64: str) -> Dict:
        """Single frame face check."""
        return await verify_face(frame_base64)

    async def emotions(self, frame_base64_list: List[str]) -> Dict:
        """Emotion distribution across frames."""
        return await analyze_emotions(frame_base64_list)
