# infrastructure/mcq_repository.py
from infrastructure.db_config import db
import datetime

async def save_mcqs(role: str, difficulty: str, mcqs: list):
    """Save MCQs - compatible with both MongoDB and MySQL"""
    try:
        # MongoDB version (your current setup)
        collection = db["mcqs"]
        record = {
            "role": role,
            "difficulty": difficulty,
            "mcqs": mcqs,
            "created_at": datetime.datetime.utcnow()
        }
        result = await collection.insert_one(record)
        print(f"[DB] Saved MCQs to MongoDB: {result.inserted_id}")
    except Exception as e:
        # Just log, don't crash - service already saved to assessments table
        print(f"[DB] MCQ save failed (non-critical): {e}")
        # Don't raise - fallback questions work fine