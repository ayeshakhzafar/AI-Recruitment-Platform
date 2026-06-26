"""
Voice Routes - Real-time Voice Interview WebSocket

This module provides WebSocket endpoints for real-time voice interviews.
It handles audio chunks from clients, processes them through STT, LLM, and TTS,
and returns the AI response as audio.
"""

import asyncio
import base64
import json
import os
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

# Import services - these will be initialized in main.py
stt_service = None
llm_service = None
tts_service = None


def init_services(stt, llm, tts):
    """Initialize services with the router."""
    global stt_service, llm_service, tts_service
    stt_service = stt
    llm_service = llm
    tts_service = tts


# In-memory session storage
sessions: Dict[str, dict] = {}


# Welcome message for new interviews
WELCOME_MESSAGE = "Hello! I'm your AI interviewer today. Let's begin. Please tell me about yourself."


async def send_json(websocket: WebSocket, data: dict):
    """Send JSON data through WebSocket."""
    await websocket.send_json(data)


async def send_audio(websocket: WebSocket, audio_bytes: bytes):
    """Send binary audio data through WebSocket."""
    await websocket.send_bytes(audio_bytes)


async def save_session_transcript(session_id: str):
    """Save session transcript to a JSON file."""
    if session_id not in sessions:
        return
    
    session = sessions[session_id]
    
    # Create transcripts directory if it doesn't exist
    transcripts_dir = "transcripts"
    os.makedirs(transcripts_dir, exist_ok=True)
    
    # Save to JSON file
    filepath = os.path.join(transcripts_dir, f"{session_id}.json")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump({
            "session_id": session_id,
            "job_role": session.get("job_role", ""),
            "started_at": session.get("started_at", ""),
            "ended_at": datetime.utcnow().isoformat(),
            "conversation": session.get("conversation_history", [])
        }, f, indent=2, ensure_ascii=False)
    
    # Clean up from memory
    del sessions[session_id]


@router.websocket("/ws/interview/{session_id}")
async def websocket_interview(websocket: WebSocket, session_id: str, job_role: str = Query("Software Engineer")):
    """
    WebSocket endpoint for real-time voice interviews.
    
    Path parameter:
        session_id: Unique session identifier
    
    Query parameter:
        job_role: Job role being interviewed for (default: "Software Engineer")
    
    Protocol:
        1. On connect: Send welcome audio
        2. On binary message: Process audio through STT → LLM → TTS → return response
        3. On disconnect: Save transcript to JSON file
    """
    await websocket.accept()
    
    # Initialize session
    session_data = {
        "session_id": session_id,
        "job_role": job_role,
        "started_at": datetime.utcnow().isoformat(),
        "conversation_history": []
    }
    sessions[session_id] = session_data
    
    print(f"Interview session started: {session_id} for role: {job_role}")
    
    try:
        # Send welcome message
        welcome_audio = await tts_service.text_to_speech(WELCOME_MESSAGE)
        welcome_b64 = base64.b64encode(welcome_audio).decode('utf-8')
        
        await send_json(websocket, {
            "type": "welcome",
            "transcript": WELCOME_MESSAGE,
            "ai_response": WELCOME_MESSAGE,
            "audio_b64": welcome_b64
        })
        
        # Add welcome to conversation history
        session_data["conversation_history"].append({
            "role": "assistant",
            "content": WELCOME_MESSAGE
        })
        
        # Main message loop
        while True:
            # Receive binary audio data
            audio_data = await websocket.receive_bytes()
            
            if not audio_data:
                continue
            
            # Step 1: Transcribe audio using STT service
            transcript = stt_service.transcribe(audio_data, format="webm")
            
            if not transcript:
                # If no transcript, send a prompt
                prompt = "I didn't catch that. Could you please repeat?"
                audio = await tts_service.text_to_speech(prompt)
                audio_b64 = base64.b64encode(audio).decode('utf-8')
                
                await send_json(websocket, {
                    "transcript": "",
                    "ai_response": prompt,
                    "audio_b64": audio_b64
                })
                continue
            
            # Step 2: Add user transcript to conversation history
            session_data["conversation_history"].append({
                "role": "user",
                "content": transcript
            })
            
            # Step 3: Generate AI response using LLM service
            ai_response = llm_service.generate_response(
                session_data["conversation_history"],
                job_role
            )
            
            if not ai_response:
                error_msg = "I'm having trouble generating a response. Let me try again."
                audio = await tts_service.text_to_speech(error_msg)
                audio_b64 = base64.b64encode(audio).decode('utf-8')
                
                await send_json(websocket, {
                    "transcript": transcript,
                    "ai_response": error_msg,
                    "audio_b64": audio_b64
                })
                continue
            
            # Step 4: Add AI response to conversation history
            session_data["conversation_history"].append({
                "role": "assistant",
                "content": ai_response
            })
            
            # Step 5: Convert AI response to speech using TTS service
            audio_bytes = await tts_service.text_to_speech(ai_response)
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            # Step 6: Send response back to client
            await send_json(websocket, {
                "transcript": transcript,
                "ai_response": ai_response,
                "audio_b64": audio_b64
            })
            
    except WebSocketDisconnect:
        print(f"Client disconnected: {session_id}")
        await save_session_transcript(session_id)
        
    except Exception as e:
        print(f"WebSocket error for session {session_id}: {e}")
        await save_session_transcript(session_id)


# Create router
router = APIRouter()
