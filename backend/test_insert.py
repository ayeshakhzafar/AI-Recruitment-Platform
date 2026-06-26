import sys
import os
import uuid
import json
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "mysql+aiomysql://root:Newpassword%40123@127.0.0.1:3306/recruto_mcq"
engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test():
    async with async_session() as db:
        candidate_id = f"candidate_{uuid.uuid4()}"
        try:
            insert_query = text("""
            INSERT INTO cv_candidates (
                email, name, phone, role, skills, cv_filename, cv_text,
                status, skill_match_percentage, cv_source, job_id, raw_text,
                experience, education, created_at
            ) VALUES (
                :email, :name, :phone, :role, :skills, :cv_filename, :cv_text,
                :status, :skill_match_percentage, :cv_source, :job_id, :raw_text,
                :experience, :education, NOW()
            )
            """)
            await db.execute(insert_query, {
                "email": "test@test.com",
                "name": "Test Name",
                "phone": "123",
                "role": "Role",
                "skills": "[]",
                "cv_filename": "Test.pdf",
                "cv_text": "text",
                "status": "processed",
                "skill_match_percentage": 0.0,
                "cv_source": "test",
                "job_id": None,
                "raw_text": "text",
                "experience": "[]",
                "education": "[]"
            })
            await db.commit()
            print("INSERT WORKS WITHOUT CANDIDATE_ID")
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(test())
