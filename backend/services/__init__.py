"""
Services package for AI Interview module.

This package contains the core business logic services:
- STTService: Speech-to-text using Groq Whisper (FREE)
- TTSService: Text-to-speech using Edge TTS (FREE)
- LLMService: Question generation using Groq LLM (FREE)
- FaceService: Face verification and emotion detection using DeepFace (FREE, local)
- AnalysisService: Answer scoring and analysis

All services use lazy initialisation — no API clients are created at import time.
Ensure load_dotenv() is called at the top of main.py before any imports.
"""

from .stt_service      import STTService, transcribe_audio
from .tts_service      import TTSService, text_to_speech
from .llm_service      import LLMService, generate_interview_question, evaluate_answer
from .face_service     import FaceService, verify_face, analyze_emotions
from .analysis_service import AnalysisService

__all__ = [
    "STTService",
    "TTSService",
    "LLMService",
    "FaceService",
    "AnalysisService",
    # Standalone functions for backward compatibility
    "transcribe_audio",
    "text_to_speech",
    "generate_interview_question",
    "evaluate_answer",
    "verify_face",
    "analyze_emotions",
]