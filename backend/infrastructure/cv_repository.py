"""
Database repository for CV data operations - Separate infrastructure layer
"""
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json
from datetime import datetime
import uuid

class CVRepository:
    """Repository for CV data operations"""
    
    @staticmethod
    async def save_cv_candidate(db: AsyncSession, cv_data: dict) -> str:
        """Save extracted CV candidate data to database"""
        try:
            candidate_id = cv_data.get('candidate_id') or f"candidate_{uuid.uuid4()}"
            
            query = text("""
                INSERT INTO cv_candidates (
                    candidate_id,
                    email, name, phone, role, skills, cv_filename, cv_text,
                    status, skill_match_percentage, cv_source, job_id, raw_text,
                    experience, education, created_at
                ) VALUES (
                    :candidate_id,
                    :email, :name, :phone, :role, :skills, :cv_filename, :cv_text,
                    :status, :skill_match_percentage, :cv_source, :job_id, :raw_text,
                    :experience, :education, NOW()
                )
            """)
            
            await db.execute(query, {
                'candidate_id': candidate_id,
                'email': cv_data.get('email', ''),
                'name': cv_data.get('name', ''),
                'phone': cv_data.get('phone', ''),
                'role': cv_data.get('role', ''),
                'skills': json.dumps(cv_data.get('skills', [])),
                'cv_filename': cv_data.get('cv_file_path', ''),
                'cv_text': cv_data.get('raw_text', '')[:5000],
                'skill_match_percentage': float(cv_data.get('skill_match_percentage', 0)),
                'status': cv_data.get('status', 'pending'),
                'cv_source': cv_data.get('cv_source', 'manual_upload'),
                'job_id': cv_data.get('job_id'),
                'raw_text': cv_data.get('raw_text', '')[:5000],
                'experience': json.dumps(cv_data.get('experience', [])),
                'education': json.dumps(cv_data.get('education', [])),
            })
            
            await db.commit()
            return candidate_id
            
        except Exception as e:
            print(f"Error saving CV candidate: {e}")
            await db.rollback()
            raise
    
    @staticmethod
    async def get_candidate_by_email(db: AsyncSession, email: str) -> Optional[Dict]:
        """Get candidate by email"""
        try:
            query = text("""
                SELECT candidate_id, email, name, phone, role, skills, cv_filename, cv_text, 
                       status, skill_match_percentage, cv_source, job_id, raw_text,
                       experience, education, created_at
                FROM cv_candidates 
                WHERE email = :email
                ORDER BY created_at DESC
                LIMIT 1
            """)
            
            result = await db.execute(query, {'email': email})
            row = result.fetchone()
            
            if row:
                return {
                    'candidate_id': row[0],
                    'email': row[1],
                    'name': row[2],
                    'phone': row[3],
                    'role': row[4],
                    'skills': json.loads(row[5]) if row[5] else [],
                    'cv_file_path': row[6],
                    'raw_text': row[7],
                    'status': row[8],
                    'skill_match_percentage': row[9],
                    'cv_source': row[10],
                    'job_id': row[11],
                    'missing_skills': [],
                    'extra_skills': [],
                    'experience': json.loads(row[12]) if row[12] else [],
                    'education': json.loads(row[13]) if row[13] else [],
                    'extracted_at': str(row[14]) if row[14] else None
                }
            return None
            
        except Exception as e:
            print(f"Error fetching candidate: {e}")
            return None
    
    @staticmethod
    async def get_all_candidates(db: AsyncSession, 
                                 status: str = None, 
                                 job_id: str = None,
                                 min_match: float = None) -> List[Dict]:
        """Get all CV candidates with filters"""
        try:
            query_str = """
                SELECT candidate_id, email, name, phone, role, skills, cv_filename, cv_text, 
                       status, skill_match_percentage, cv_source, job_id, raw_text,
                       experience, education, created_at
                FROM cv_candidates WHERE 1=1
            """
            params = {}
            
            if status:
                query_str += " AND status = :status"
                params['status'] = status
            
            if job_id:
                query_str += " AND job_id = :job_id"
                params['job_id'] = job_id
            
            if min_match is not None:
                query_str += " AND skill_match_percentage >= :min_match"
                params['min_match'] = min_match
            
            query_str += " ORDER BY created_at DESC"
            
            result = await db.execute(text(query_str), params)
            rows = result.fetchall()
            
            candidates = []
            for row in rows:
                # Safely parse JSON fields
                try:
                    skills = json.loads(row[5]) if row[5] and row[5] != '[]' else []
                except (json.JSONDecodeError, TypeError):
                    skills = []
                try:
                    experience = json.loads(row[12]) if row[12] and row[12] != '[]' else []
                except (json.JSONDecodeError, TypeError):
                    experience = []
                try:
                    education = json.loads(row[13]) if row[13] and row[13] != '[]' else []
                except (json.JSONDecodeError, TypeError):
                    education = []
                
                candidates.append({
                    'candidate_id': row[0],
                    'email': row[1],
                    'name': row[2],
                    'phone': row[3],
                    'role': row[4],
                    'skills': skills,
                    'cv_file_path': row[6],
                    'raw_text': row[7],
                    'status': row[8],
                    'skill_match_percentage': row[9],
                    'cv_source': row[10],
                    'job_id': row[11],
                    'missing_skills': [],
                    'extra_skills': [],
                    'experience': experience,
                    'education': education,
                    'extracted_at': str(row[14]) if row[14] else None
                })
            
            return candidates
            
        except Exception as e:
            print(f"Error fetching candidates: {e}")
            return []
    
    @staticmethod
    async def get_job_posting(db: AsyncSession, job_id: str) -> Optional[Dict]:
        """Get job posting by ID"""
        try:
            query = text("SELECT * FROM job_postings WHERE job_id = :job_id")
            result = await db.execute(query, {'job_id': job_id})
            row = result.fetchone()
            
            if row:
                return {
                    'job_id': row[0],
                    'title': row[1],
                    'description': row[2],
                    'required_skills': json.loads(row[3]) if row[3] else [],
                    'experience_level': row[4],
                    'location': row[5],
                    'salary_range': row[6],
                    'posted_at': str(row[7]) if row[7] else None,
                    'posted_by': row[8],
                    'status': row[9],
                    'assessment_id': row[10]
                }
            return None
            
        except Exception as e:
            print(f"Error fetching job posting: {e}")
            return None
    
    @staticmethod
    async def get_all_job_postings(db: AsyncSession, status: str = "active") -> List[Dict]:
        """Get all job postings"""
        try:
            query = text("SELECT * FROM job_postings WHERE status = :status ORDER BY posted_at DESC")
            result = await db.execute(query, {'status': status})
            rows = result.fetchall()
            
            job_postings = []
            for row in rows:
                job_postings.append({
                    'job_id': row[0],
                    'title': row[1],
                    'description': row[2],
                    'required_skills': json.loads(row[3]) if row[3] else [],
                    'experience_level': row[4],
                    'location': row[5],
                    'salary_range': row[6],
                    'posted_at': str(row[7]) if row[7] else None,
                    'posted_by': row[8],
                    'status': row[9],
                    'assessment_id': row[10]
                })
            
            return job_postings
            
        except Exception as e:
            print(f"Error fetching job postings: {e}")
            return []