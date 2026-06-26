"""
Analysis Routes - Interview Answer Analysis and Reporting

This module provides REST endpoints for analyzing interview answers
and generating final reports using the AnalysisService.
"""

import os
import json
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

# Import services - will be initialized in main.py
analysis_service = None


def init_services(analysis):
    """Initialize analysis service with the router."""
    global analysis_service
    analysis_service = analysis


# Create router
router = APIRouter(prefix="/analysis", tags=["analysis"])


# Request/Response models
class AnswerAnalysisRequest(BaseModel):
    question: str
    answer: str
    job_role: str


class ReportRequest(BaseModel):
    session_id: str
    candidate_id: Optional[str] = None
    job_role: Optional[str] = None
    conversation_history: Optional[List[Dict]] = None
    emotion_log: Optional[List[Dict]] = None
    face_alerts: Optional[List[Dict]] = None


# Directory for storing reports
REPORTS_DIR = "reports"
TRANSCRIPTS_DIR = "transcripts"

# Ensure directories exist
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(TRANSCRIPTS_DIR, exist_ok=True)


@router.post("/answer")
async def analyze_answer(request: AnswerAnalysisRequest = Body(...)):
    """
    Analyze a single interview answer.
    
    Request body:
        - question: The interview question
        - answer: Candidate's answer
        - job_role: Job role being interviewed for
    
    Returns:
        Dictionary with scoring results:
        - sentiment: { label, score }
        - competencies: { communication, confidence, relevance }
        - word_count: int
        - filler_words: int
        - score: float (0-10)
    """
    try:
        result = analysis_service.analyze_answer(
            question=request.question,
            answer=request.answer,
            job_role=request.job_role
        )
        
        return result
        
    except Exception as e:
        print(f"Answer analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report")
async def generate_report(request: ReportRequest = Body(...)):
    """
    Generate a final interview report.
    
    Request body:
        - session_id: Unique session identifier
        - candidate_id: Candidate identifier (optional)
        - job_role: Job role (optional)
        - conversation_history: List of Q&A pairs (optional)
        - emotion_log: List of emotion events (optional)
        - face_alerts: List of face verification alerts (optional)
    
    The endpoint will:
    1. Load session transcript from saved JSON file if not provided
    2. Run analysis on each answer
    3. Generate final report using LLM
    4. Save report as reports/{session_id}.json
    5. Return full report
    """
    try:
        session_id = request.session_id
        
        # Build session data
        session_data = {
            "session_id": session_id,
            "job_role": request.job_role or "Unknown",
            "conversation_history": request.conversation_history or [],
            "emotion_data": request.emotion_log or [],
            "face_alerts": request.face_alerts or []
        }
        
        # If conversation history not provided, try to load from file
        if not session_data["conversation_history"]:
            transcript_path = os.path.join(TRANSCRIPTS_DIR, f"{session_id}.json")
            if os.path.exists(transcript_path):
                with open(transcript_path, 'r', encoding='utf-8') as f:
                    transcript_data = json.load(f)
                    session_data["conversation_history"] = transcript_data.get("conversation", [])
                    session_data["job_role"] = transcript_data.get("job_role", session_data["job_role"])
        
        # Generate the final report using LLM
        report = analysis_service.generate_final_report(session_data)
        
        # Add per-question analysis if we have conversation history
        if session_data["conversation_history"]:
            qa_analyses = []
            questions = []
            
            # Extract Q&A pairs and analyze each
            for i, msg in enumerate(session_data["conversation_history"]):
                if msg.get("role") == "user":
                    # This is an answer, find the question before it
                    question = ""
                    if i > 0 and session_data["conversation_history"][i-1].get("role") == "assistant":
                        question = session_data["conversation_history"][i-1].get("content", "")
                    
                    answer = msg.get("content", "")
                    
                    if answer:
                        # Analyze this answer
                        analysis = analysis_service.analyze_answer(
                            question=question,
                            answer=answer,
                            job_role=session_data["job_role"]
                        )
                        
                        qa_analyses.append({
                            "question": question,
                            "answer": answer,
                            "analysis": analysis
                        })
            
            report["qa_analyses"] = qa_analyses
        
        # Save report to file
        report_path = os.path.join(REPORTS_DIR, f"{session_id}.json")
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"Report saved to {report_path}")
        
        return report
        
    except Exception as e:
        print(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report/{session_id}")
async def get_report(session_id: str):
    """
    Get a saved interview report.
    
    Path parameter:
        session_id: Unique session identifier
    
    Returns:
        The saved report JSON
    """
    try:
        report_path = os.path.join(REPORTS_DIR, f"{session_id}.json")
        
        if not os.path.exists(report_path):
            raise HTTPException(status_code=404, detail="Report not found")
        
        with open(report_path, 'r', encoding='utf-8') as f:
            report = json.load(f)
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transcript/{session_id}")
async def get_transcript(session_id: str):
    """
    Get a saved interview transcript.
    
    Path parameter:
        session_id: Unique session identifier
    
    Returns:
        The transcript JSON
    """
    try:
        transcript_path = os.path.join(TRANSCRIPTS_DIR, f"{session_id}.json")
        
        if not os.path.exists(transcript_path):
            raise HTTPException(status_code=404, detail="Transcript not found")
        
        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript = json.load(f)
        
        return transcript
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get transcript error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
