from motor.motor_asyncio import AsyncIOMotorClient
import os

_db_client = None
db = None

def init_db():
    global _db_client, db
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    _db_client = AsyncIOMotorClient(mongo_url)
    db = _db_client["recruitment_ai"]
