"""
Vision Routes - REST API for Face Features

This module provides REST endpoints for face registration, verification,
and emotion analysis using the FaceService.
"""

import asyncio
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.face_service import FaceService, register_face, verify_face


face_service = FaceService()


# Create router
router = APIRouter(prefix="/vision", tags=["vision"])


@router.post("/register")
async def register_face(image: UploadFile = File(...), candidate_id: str = Form(...)):
    """
    Register a candidate's face for verification.

    Accepts multipart form with:
    - image: Image file (jpg, png)
    - candidate_id: Unique candidate identifier

    Returns:
        { "success": bool, "message": str }
    """
    try:
        # Read image bytes
        image_bytes = await image.read()

        if not image_bytes:
            return {"success": False, "message": "No image provided"}

        # Register the face
        success = face_service.register_face(image_bytes, candidate_id)

        if success:
            return {
                "success": True,
                "message": f"Face registered successfully for candidate {candidate_id}",
            }
        else:
            return {
                "success": False,
                "message": "Failed to register face. Please ensure the image contains a clear face.",
            }

    except Exception as e:
        print(f"Register face error: {e}")
        return {"success": False, "message": f"Error registering face: {str(e)}"}


@router.post("/verify")
async def verify_face(image: UploadFile = File(...), candidate_id: str = Form(...)):
    """
    Verify a candidate's face against registered face.

    Accepts multipart form with:
    - image: Live captured image file
    - candidate_id: Unique candidate identifier

    Returns:
        { "verified": bool, "alert": bool, "distance": float }
    """
    try:
        # Read image bytes
        image_bytes = await image.read()

        if not image_bytes:
            raise HTTPException(status_code=400, detail="No image provided")

        # Verify the face
        result = face_service.verify_face(image_bytes, candidate_id)

        return {
            "verified": result.get("verified", False),
            "alert": result.get("alert", True),
            "distance": result.get("distance", 1.0),
            "threshold": result.get("threshold", 0.4),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Verify face error: {e}")
        return {"verified": False, "alert": True, "distance": 1.0, "error": str(e)}


@router.post("/emotion")
async def analyze_emotion(image: UploadFile = File(...)):
    """
    Analyze emotions from an image.

    Accepts multipart form with:
    - image: Image file

    Returns:
        { "dominant_emotion": str, "emotions": dict }
    """
    try:
        # Read image bytes
        image_bytes = await image.read()

        if not image_bytes:
            raise HTTPException(status_code=400, detail="No image provided")

        # Analyze emotions
        result = face_service.analyze_emotion(image_bytes)

        return {
            "dominant_emotion": result.get("dominant_emotion", "unknown"),
            "emotions": result.get("emotions", {}),
            "timestamp": result.get("timestamp", 0),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Emotion analysis error: {e}")
        return {"dominant_emotion": "unknown", "emotions": {}, "error": str(e)}


@router.post("/full-check")
async def full_check(image: UploadFile = File(...), candidate_id: str = Form(...)):
    """
    Run both face verification and emotion analysis in parallel.

    Accepts multipart form with:
    - image: Live captured image file
    - candidate_id: Unique candidate identifier

    Returns:
        Combined result from both verify and emotion analysis
    """
    try:
        # Read image bytes
        image_bytes = await image.read()

        if not image_bytes:
            raise HTTPException(status_code=400, detail="No image provided")

        # Run both checks in parallel
        verify_task = asyncio.create_task(
            asyncio.to_thread(face_service.verify_face, image_bytes, candidate_id)
        )
        emotion_task = asyncio.create_task(
            asyncio.to_thread(face_service.analyze_emotion, image_bytes)
        )

        verify_result, emotion_result = await asyncio.gather(
            verify_task, emotion_task, return_exceptions=True
        )

        # Handle verification result
        if isinstance(verify_result, Exception):
            verify_result = {"verified": False, "alert": True, "distance": 1.0}

        # Handle emotion result
        if isinstance(emotion_result, Exception):
            emotion_result = {"dominant_emotion": "unknown", "emotions": {}}

        return {
            "verified": verify_result.get("verified", False),
            "alert": verify_result.get("alert", True),
            "distance": verify_result.get("distance", 1.0),
            "threshold": verify_result.get("threshold", 0.4),
            "dominant_emotion": emotion_result.get("dominant_emotion", "unknown"),
            "emotions": emotion_result.get("emotions", {}),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Full check error: {e}")
        return {
            "verified": False,
            "alert": True,
            "distance": 1.0,
            "dominant_emotion": "unknown",
            "emotions": {},
            "error": str(e),
        }
