import sys
sys.path.append("/home/badar-faisal/Downloads/FYp1.1/FYP/fyp-recruitment-system/custom-mcq-generation 2/custom-mcq-generation 2/custom-mcq-generation/backend")

from backend.main import get_db, app
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from infrastructure.cv_repository import CVProcessor

DATABASE_URL = "mysql+aiomysql://root:Newpassword@123@127.0.0.1:3306/recruto_mcq"
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
        for app in pending_apps:
            cv_path = app['cv_file_path']
            j_id = app['job_id']
            print(f"Processing app: {app['application_id']} | path: {cv_path}")
            if not os.path.exists(cv_path):
                print(f"File not found: {cv_path}")
                continue
            ext = os.path.splitext(cv_path)[1].lower()
            try:
                data = await cv_processor.process_cv_file(cv_path, ext, j_id)
                print(f"Processed resulting data: type {type(data)}")
                if hasattr(data, 'candidate_id'):
                    print(f"candidate_id property exists: {data.candidate_id}")
                elif isinstance(data, dict) and 'candidate_id' in data:
                    print(f"candidate_id key exists: {data['candidate_id']}")
                else:
                    print("No candidate_id found.")

            except Exception as e:
                print(f"Error parsing: {str(e)}")
                import traceback
                traceback.print_exc()

asyncio.run(test())
