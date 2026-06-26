"""
STT Service — 100% FREE using Groq Whisper
Model: whisper-large-v3-turbo  (fastest + most accurate)
FREE: 28,800 audio seconds/day — No credit card required
Sign up: console.groq.com

pip install groq

Fallback 1: faster-whisper (local, completely offline)
Fallback 2: browser Web Speech API (frontend does STT, sends text)
"""

import os
import base64
import asyncio
import tempfile
from typing import Optional

# ── Lazy Groq client — NEVER create at module level ─────────────────────────
# Creating at module level crashes on import if .env isn't loaded yet.
# _get_stt_client() is called only when a transcription is actually needed.
_groq_stt = None

def _get_stt_client():
    global _groq_stt
    if _groq_stt is None:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY not set. Add it to your .env file:\n"
                "  GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx\n"
                "Get a free key at: https://console.groq.com"
            )
        _groq_stt = Groq(api_key=api_key)
    return _groq_stt

# ════════════════════════════════════════════════════════════════════
#  PRIMARY: Groq Whisper (FREE — 28,800 sec/day)
# ════════════════════════════════════════════════════════════════════

async def transcribe_groq_whisper(
    audio_base64: str,
    language: str = "en",
    audio_format: str = "webm"
) -> Optional[str]:
    """
    Transcribe audio using Groq's free Whisper API.
    Supports: flac, mp3, mp4, mpeg, m4a, ogg, wav, webm

    28,800 seconds FREE per day — more than enough for interviews.
    Average 3-min answer = 180 sec → 160 interviews/day free.
    """
    try:
        audio_bytes = base64.b64decode(audio_base64)

        # Write to temp file
        suffix = f".{audio_format}"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        loop = asyncio.get_event_loop()

        def _run():
            client = _get_stt_client()
            with open(tmp_path, "rb") as f:
                result = client.audio.transcriptions.create(
                    file=(f"audio{suffix}", f.read()),
                    model="whisper-large-v3-turbo",   # fastest free model
                    language=language,
                    response_format="text",
                    temperature=0.0
                )
            os.unlink(tmp_path)
            return result

        transcript = await loop.run_in_executor(None, _run)
        return str(transcript).strip()

    except Exception as e:
        print(f"[STT Groq Error] {e}")
        return None


# ════════════════════════════════════════════════════════════════════
#  FALLBACK: faster-whisper (completely offline/local)
# ════════════════════════════════════════════════════════════════════

async def transcribe_local_whisper(
    audio_base64: str,
    model_size: str = "base",  # tiny|base|small|medium — base is good enough
    language: Optional[str] = "en"
) -> Optional[str]:
    """
    Transcribe offline using faster-whisper.
    No internet needed, no API key, completely free.

    pip install faster-whisper
    Model sizes (accuracy vs speed):
      tiny  → fastest, less accurate  (~40MB)
      base  → good balance            (~150MB)
      small → better accuracy         (~470MB)
      medium→ near-API accuracy       (~1.5GB)
    """
    try:
        from faster_whisper import WhisperModel

        audio_bytes = base64.b64decode(audio_base64)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        loop = asyncio.get_event_loop()

        def _run():
            # Downloads model on first use, cached locally after
            model = WhisperModel(model_size, device="cpu", compute_type="int8")
            segments, _ = model.transcribe(tmp_path, language=language, beam_size=5)
            text = " ".join(seg.text.strip() for seg in segments)
            os.unlink(tmp_path)
            return text

        return await loop.run_in_executor(None, _run)

    except ImportError:
        print("[STT] faster-whisper not installed. Run: pip install faster-whisper")
        return None
    except Exception as e:
        print(f"[STT Local Error] {e}")
        return None


# ════════════════════════════════════════════════════════════════════
#  MAIN DISPATCHER
# ════════════════════════════════════════════════════════════════════

async def transcribe_audio(
    audio_base64: Optional[str] = None,
    transcript_text: Optional[str] = None,
    language: str = "en",
    audio_format: str = "webm"
) -> str:
    """
    Main entry point. Priority:
    1. If frontend already sent transcript_text → use it directly (zero latency)
    2. Groq Whisper API (free, fast, cloud)
    3. Local faster-whisper (free, offline fallback)

    Returns: transcript string (empty string if all fail)
    """
    # Frontend already transcribed (lowest latency option)
    if transcript_text and transcript_text.strip():
        return transcript_text.strip()

    if not audio_base64:
        return ""

    # Try Groq first (free, fastest, best quality)
    if os.getenv("GROQ_API_KEY"):
        result = await transcribe_groq_whisper(audio_base64, language, audio_format)
        if result:
            return result

    # Fallback to local whisper
    result = await transcribe_local_whisper(audio_base64, language=language)
    if result:
        return result

    return "[Could not transcribe audio]"


# ════════════════════════════════════════════════════════════════════
#  STTService CLASS — keeps your existing services/__init__.py working
#  Your __init__.py does: from .stt_service import STTService, transcribe_audio
#  This class wraps the free functions above so that import never breaks.
# ════════════════════════════════════════════════════════════════════

class STTService:
    """
    Class wrapper around free Groq Whisper STT functions.
    Exists so services/__init__.py import stays unchanged:
        from .stt_service import STTService, transcribe_audio
    """

    async def transcribe(
        self,
        audio_base64: Optional[str] = None,
        transcript_text: Optional[str] = None,
        language: str = "en",
        audio_format: str = "webm"
    ) -> str:
        """Transcribe audio — delegates to module-level transcribe_audio()."""
        return await transcribe_audio(
            audio_base64=audio_base64,
            transcript_text=transcript_text,
            language=language,
            audio_format=audio_format
        )

    async def transcribe_groq(self, audio_base64: str, language: str = "en", audio_format: str = "webm") -> Optional[str]:
        return await transcribe_groq_whisper(audio_base64, language, audio_format)

    async def transcribe_local(self, audio_base64: str, language: str = "en") -> Optional[str]:
        return await transcribe_local_whisper(audio_base64, language=language)