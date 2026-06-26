import sys
sys.path.append("/home/badar-faisal/Downloads/FYp1.1/FYP/fyp-recruitment-system/custom-mcq-generation 2/custom-mcq-generation 2/custom-mcq-generation/backend")
from infrastructure.cv_repository import CVProcessor
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os

DATABASE_URL = "mysql+aiomysql://root:Newpassword@123@127.0.0.1:3306/recruto_mcq"
engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test():
    async with async_session() as db:
        res = await db.execute(text("SELECT application_id, job_id, cv_file_path, manual_name, manual_email FROM job_applications WHERE cv_file_path IS NOT NULL AND is_fetched = 0"))
        pending_apps = res.mappings().all()
        print(f"Found {len(pending_apps)} pending apps")
        cv_processor = CVProcessor()
        for app in pending_apps:
            cv_path = app['cv_file_path']
            j_id = app['job_id']
            print(f"Processing app: {app['application_id']} | path: {cv_path}")
            if not os.path.exists(cv_path):
                print(f"Path does not exist: {cv_path}")
                continue
            try:
                ext = os.path.splitext(cv_path)[1].lower()
                data = await cv_processor.process_cv_file(cv_path, ext, j_id)
                print(f"Process CV File returned: {data}")
            except Exception as e:
                import traceback
                print(f"Exception parsing CV {app['application_id']}:")
                traceback.print_exc()

asyncio.run(test())
