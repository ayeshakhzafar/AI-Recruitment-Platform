import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "mysql+aiomysql://root:Newpassword@123@127.0.0.1:3306/recruto_mcq"
engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test():
    async with async_session() as db:
        res = await db.execute(text("SELECT * FROM job_applications ORDER BY application_id DESC LIMIT 1"))
        print(res.fetchone())

asyncio.run(test())
