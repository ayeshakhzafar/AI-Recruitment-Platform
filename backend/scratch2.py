import sys
import os
sys.path.append("/home/badar-faisal/Downloads/FYp1.1/FYP/fyp-recruitment-system/custom-mcq-generation 2/custom-mcq-generation 2/custom-mcq-generation/backend")
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
from main import get_db, app, save_cv_candidate, get_job_posting
from infrastructure.cv_repository import CVProcessor
from application.skill_matcher import SkillMatcher

DATABASE_URL = "mysql+aiomysql://root:Newpassword%40123@127.0.0.1:3306/recruto_mcq"
engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test():
    async with async_session() as db:
        res = await db.execute(text("SELECT application_id, job_id, cv_file_path, manual_name, manual_email FROM job_applications WHERE cv_file_path IS NOT NULL AND is_fetched = 0"))
        pending_apps = res.mappings().all()
        print(f"Found {len(pending_apps)} pending apps")
        
        # Manually invoke the backend logic 
        import os
        cv_processor = CVProcessor()
        skill_matcher = SkillMatcher()
        for app in pending_apps:
            cv_path = app['cv_file_path']
            app_id = app['application_id']
            j_id = app['job_id']
            m_name = app['manual_name']
            m_email = app['manual_email']
            print(f"Processing app: {app_id} | path: {cv_path}")
            if not os.path.exists(cv_path):
                print(f"File not found: {cv_path}")
                continue
            ext = os.path.splitext(cv_path)[1].lower()
            try:
                cv_data = await cv_processor.process_cv_file(cv_path, ext, j_id)
                # Ensure manual name/email overrides the parsed AI output
                cv_data["name"] = m_name or cv_data.get("name", "Unknown Applicant")
                if m_email:
                    cv_data["email"] = m_email

                job_requirements = {}
                if j_id:
                    job = await get_job_posting(db, j_id)
                    if job:
                        job_requirements = job

                skill_result = skill_matcher.match_skills(cv_data.get("skills", []), job_requirements)
                cv_data["missing_skills"] = skill_result["missing_skills"]
                cv_data["extra_skills"] = skill_result["extra_skills"]
                cv_data["skill_match_percentage"] = skill_result["match_percentage"]
                cv_data["source"] = "Candidate Portal"
                cv_data["status"] = "processed"

                candidate_id = await save_cv_candidate(db, cv_data)
                
                # Mark as fetched on success
                await db.execute(text("UPDATE job_applications SET is_fetched = 1 WHERE application_id = :aid"), {"aid": app_id})
            except Exception as e:
                print(f"Error parsing: {str(e)}")
                import traceback
                traceback.print_exc()

asyncio.run(test())
