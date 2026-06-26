"""
Pydantic models for CV data - Separate domain models
"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from datetime import datetime

class CVUploadRequest(BaseModel):
    """Request model for CV upload"""
    job_id: Optional[str] = None
    source: str = "manual_upload"

class ExtractedCVData(BaseModel):
    """Model for extracted CV data"""
    candidate_id: Optional[str] = None
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience: List[Dict] = Field(default_factory=list)
    education: List[Dict] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    cv_file_path: Optional[str] = None
    source: str = "manual_upload"
    job_id: Optional[str] = None
    skill_match_percentage: float = 0.0
    missing_skills: List[str] = Field(default_factory=list)
    extra_skills: List[str] = Field(default_factory=list)
    status: str = "pending"
    extracted_at: datetime = Field(default_factory=datetime.now)
    raw_text: Optional[str] = None

class JobPosting(BaseModel):
    """Model for job posting"""
    job_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    required_skills: List[str] = Field(default_factory=list)
    experience_level: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    posted_at: datetime = Field(default_factory=datetime.now)
    posted_by: Optional[str] = None
    status: str = "active"
    assessment_id: Optional[str] = None

class SkillMatchResult(BaseModel):
    """Model for skill matching result"""
    candidate_skills: List[str] = Field(default_factory=list)
    required_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    extra_skills: List[str] = Field(default_factory=list)
    match_percentage: float = 0.0
    skill_breakdown: Dict = Field(default_factory=dict)

class CVProcessingLog(BaseModel):
    """Model for CV processing logs"""
    log_id: Optional[str] = None
    candidate_id: Optional[str] = None
    cv_file_name: str
    processing_status: str
    extracted_data: Optional[Dict] = None
    error_message: Optional[str] = None
    processed_at: datetime = Field(default_factory=datetime.now)
    source: str = "manual_upload"
    job_id: Optional[str] = None