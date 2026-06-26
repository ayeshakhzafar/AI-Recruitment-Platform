import os
from urllib.parse import quote_plus
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text, Column, String, Integer, Float, DateTime, Text, JSON, Enum as SQLEnum
from datetime import datetime
import enum

# =============================
# Environment Variables
# =============================
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "recruto_mcq")

# URL-encode the password to handle special characters like @, #, etc.
ENCODED_PASSWORD = quote_plus(MYSQL_PASSWORD)

DATABASE_URL = (
    f"mysql+aiomysql://{MYSQL_USER}:{ENCODED_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
)

# =============================
# Database Engine
# =============================
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=3600
)

# =============================
# Session Factory
# =============================
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# =============================
# Declarative Base (for models)
# =============================
Base = declarative_base()

# =============================
# Initialize Database
# =============================
async def init_database():
    # Connect without a schema so we can create MYSQL_DATABASE if missing (1049)
    admin_url = (
        f"mysql+aiomysql://{MYSQL_USER}:{ENCODED_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/"
    )
    admin_engine = create_async_engine(admin_url, echo=False, pool_pre_ping=True)
    try:
        async with admin_engine.begin() as conn:
            safe_db = MYSQL_DATABASE.replace("`", "``")
            await conn.execute(
                text(
                    f"CREATE DATABASE IF NOT EXISTS `{safe_db}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
    except Exception as e:
        print(f"⚠ Could not ensure database exists: {e}")
    finally:
        await admin_engine.dispose()

    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        print("✓ MySQL connection successful")
    except Exception as e:
        print(f"✗ MySQL connection failed: {e}")
        print(f"⚠ Make sure MySQL is running (host={MYSQL_HOST}, port={MYSQL_PORT})")
        raise e

# =============================
# Dependency for FastAPI
# =============================
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# =============================
# Interview Database Models
# =============================

class InterviewStatus(str, enum.Enum):
    INITIATED = "initiated"
    IN_PROGRESS = "in_progress"
    VERIFIED = "verified"
    COMPLETED = "completed"

class InterviewSessionModel(Base):
    """Interview session table"""
    __tablename__ = "interview_sessions"
    
    session_id = Column(String(36), primary_key=True)
    candidate_email = Column(String(255), nullable=False)
    candidate_name = Column(String(255))
    job_role = Column(String(255), nullable=False)
    status = Column(SQLEnum(InterviewStatus), default=InterviewStatus.INITIATED)
    face_verified = Column(Integer, default=0)  # 0 = not verified, 1 = verified
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    questions_json = Column(Text)  # JSON array of questions
    responses_json = Column(Text)  # JSON array of responses
    emotion_data_json = Column(Text)  # JSON array of emotion snapshots
    hr_report_json = Column(Text)  # JSON of generated HR report
    overall_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class InterviewQuestionModel(Base):
    """Interview questions bank"""
    __tablename__ = "interview_questions"
    
    question_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_role = Column(String(255))
    category = Column(String(100))  # technical, behavioral, problem_solving, culture_fit
    question_text = Column(Text, nullable=False)
    ideal_answer_points = Column(Text)  # JSON array of key points
    difficulty = Column(String(20))  # easy, medium, hard
    created_at = Column(DateTime, default=datetime.utcnow)

# Add uuid import at the top
import uuid

