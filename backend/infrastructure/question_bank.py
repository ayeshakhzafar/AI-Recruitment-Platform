# ===== QUESTION BANK/LIBRARY (FR-MCQ-13) =====

from sqlalchemy import text
from typing import List
import json

class QuestionBankRepository:
    @staticmethod
    async def save_to_bank(db, question: dict, role: str, topic: str):
        """FR-MCQ-13: Save question to reusable bank"""
        query = text("""
            INSERT INTO question_bank 
            (question_text, options, correct_answer, role, topic, difficulty, times_used)
            VALUES (:question_text, :options, :correct_answer, :role, :topic, :difficulty, 0)
            ON DUPLICATE KEY UPDATE times_used = times_used + 1
        """)
        
        await db.execute(query, {
            "question_text": question["question"],
            "options": json.dumps(question["options"]),
            "correct_answer": question["correct_answer"],
            "role": role,
            "topic": topic,
            "difficulty": question.get("difficulty", "medium")
        })
        await db.commit()
    
    @staticmethod
    async def get_from_bank(db, role: str, topic: str = None, limit: int = 10) -> List[dict]:
        """Retrieve questions from bank"""
        if topic:
            query = text("""
                SELECT * FROM question_bank 
                WHERE role = :role AND topic = :topic 
                ORDER BY times_used ASC, RAND() 
                LIMIT :limit
            """)
            result = await db.execute(query, {"role": role, "topic": topic, "limit": limit})
        else:
            query = text("""
                SELECT * FROM question_bank 
                WHERE role = :role 
                ORDER BY times_used ASC, RAND() 
                LIMIT :limit
            """)
            result = await db.execute(query, {"role": role, "limit": limit})
        
        rows = result.fetchall()
        questions = []
        
        for row in rows:
            questions.append({
                "question": row[1],
                "options": json.loads(row[2]),
                "correct_answer": row[3],
                "difficulty": row[6]
            })
        
        return questions