"""
TTS Service — 100% FREE using edge-tts
Uses Microsoft Edge's neural TTS voices — NO API key, NO credit card.
High quality, natural voices, supports 300+ voices across 40+ languages.

pip install edge-tts

Voices for HR interviewer (professional English):
  Female: en-US-JennyNeural, en-US-AriaNeural, en-GB-SoniaNeural
  Male:   en-US-GuyNeural, en-US-EricNeural, en-GB-RyanNeural
"""

import asyncio
import base64
import io
import os
from typing import Optional

# Default voice — Jenny sounds professional and warm
DEFAULT_VOICE    = os.getenv("TTS_VOICE", "en-US-JennyNeural")
DEFAULT_RATE     = os.getenv("TTS_RATE", "+0%")     # speech speed (-50% to +100%)
DEFAULT_VOLUME   = os.getenv("TTS_VOLUME", "+0%")   # volume


async def synthesize_speech(
    text: str,
    voice: str = DEFAULT_VOICE,
    rate: str  = DEFAULT_RATE,
) -> Optional[str]:
    # NOTE: also exported as text_to_speech() below — both names work
    """
    Convert text to speech using edge-tts (Microsoft Edge neural voices).
    Returns base64-encoded MP3 audio string.
    Completely FREE — no API key, no usage limits.

    Args:
        text:  The text for the interviewer to speak
        voice: Edge-TTS voice name (see list above)
        rate:  Speech rate e.g. "-10%" (slower) or "+10%" (faster)

    Returns:
        base64-encoded MP3 string, or None on failure
    """
    try:
        import edge_tts

        # Communicate object streams audio
        communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate)

        # Collect all audio chunks into memory buffer
        audio_buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.write(chunk["data"])

        audio_buffer.seek(0)
        audio_bytes = audio_buffer.read()

        if not audio_bytes:
            print("[TTS] Warning: No audio generated")
            return None

        return base64.b64encode(audio_bytes).decode("utf-8")

    except ImportError:
        print("[TTS] edge-tts not installed. Run: pip install edge-tts")
        return await _gtts_fallback(text)
    except Exception as e:
        print(f"[TTS Error] {e}")
        return await _gtts_fallback(text)


async def _gtts_fallback(text: str) -> Optional[str]:
    """
    Secondary fallback: gTTS (Google TTS, free, no key needed).
    pip install gtts
    """
    try:
        from gtts import gTTS
        import io

        def _gen():
            tts = gTTS(text=text, lang="en", slow=False)
            buf = io.BytesIO()
            tts.write_to_fp(buf)
            buf.seek(0)
            return buf.read()

        loop = asyncio.get_event_loop()
        audio_bytes = await loop.run_in_executor(None, _gen)
        return base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        print(f"[TTS gTTS Fallback Error] {e}")
        return None


async def list_available_voices() -> list:
    """
    List all available edge-tts voices for English.
    Call this to find voices you like.
    """
    try:
        import edge_tts
        voices = await edge_tts.list_voices()
        return [
            {"name": v["Name"], "gender": v["Gender"], "locale": v["Locale"]}
            for v in voices
            if v["Locale"].startswith("en-")
        ]
    except Exception as e:
        print(f"[TTS List Voices Error] {e}")
        return []


# ════════════════════════════════════════════════════════════════════
#  RECOMMENDED FREE VOICES
# ════════════════════════════════════════════════════════════════════
"""
FEMALE VOICES (Professional HR):
  en-US-JennyNeural     ← Recommended — warm, professional
  en-US-AriaNeural      ← Expressive, friendly
  en-US-MichelleNeural  ← Formal, authoritative
  en-GB-SoniaNeural     ← British accent, professional
  en-IN-NeerjaNeural    ← Indian English (great for Pakistan context)

MALE VOICES:
  en-US-GuyNeural       ← Recommended male voice
  en-US-EricNeural      ← Authoritative
  en-GB-RyanNeural      ← British male

Set in .env:
  TTS_VOICE=en-US-JennyNeural
  TTS_RATE=-5%           ← Slightly slower = easier to understand
"""



# ════════════════════════════════════════════════════════════════════
#  TTSService CLASS — keeps your existing services/__init__.py working
#  If your __init__.py does: from .tts_service import TTSService
#  this class wraps the free functions above so that import never breaks.
# ════════════════════════════════════════════════════════════════════

class TTSService:
    """
    Class wrapper around free edge-tts functions.
    Exists so any services/__init__.py import stays unchanged:
        from .tts_service import TTSService, synthesize_speech
    """

    def __init__(self, voice: str = None, rate: str = None):
        self.voice = voice or os.getenv("TTS_VOICE", "en-US-JennyNeural")
        self.rate  = rate  or os.getenv("TTS_RATE",  "+0%")

    async def synthesize(self, text: str) -> Optional[str]:
        """Convert text to speech. Returns base64 MP3."""
        return await synthesize_speech(text, voice=self.voice, rate=self.rate)

    async def speak(self, text: str) -> Optional[str]:
        """Alias for synthesize()."""
        return await self.synthesize(text)

    async def get_voices(self) -> list:
        """List available English voices."""
        return await list_available_voices()



# Alias — your __init__.py imports text_to_speech, not synthesize_speech
text_to_speech = synthesize_speech