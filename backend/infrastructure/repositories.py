import json
from typing import List, Optional, Any
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime


def _parse_questions_column(qraw: Any) -> list:
    """Normalize questions from DB (JSON string, bytes, or already-parsed list)."""
    if qraw is None or qraw == "":
        return []
    if isinstance(qraw, list):
        return qraw
    if isinstance(qraw, (bytes, bytearray)):
        try:
            parsed = json.loads(qraw.decode("utf-8"))
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, UnicodeDecodeError, TypeError):
            return []
    if isinstance(qraw, str):
        try:
            parsed = json.loads(qraw) if qraw.strip() else []
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, TypeError):
            return []
    return []


# ============================
#   ASSESSMENT REPOSITORY
# ============================
class AssessmentRepository:

    @staticmethod
    async def create(db, data: dict):
        query = text("""
            INSERT INTO assessments (
                assessment_id, role, difficulty, questions,
                duration_minutes, status, created_at, num_questions, is_adaptive
            ) VALUES (
                :assessment_id, :role, :difficulty, :questions,
                :duration_minutes, :status, :created_at, :num_questions, :is_adaptive
            )
        """)

        params = data.copy()
        if isinstance(params["questions"], list):
            params["questions"] = json.dumps(params["questions"])
        params.setdefault("num_questions", 0)
        params.setdefault("is_adaptive", False)

        await db.execute(query, params)
        await db.commit()

    @staticmethod
    async def get_by_id(db, assessment_id: str) -> Optional[dict]:
        query = text("""
            SELECT
                id,
                assessment_id,
                role,
                difficulty,
                questions,
                duration_minutes,
                status,
                created_at,
                updated_at,
                num_questions,
                is_adaptive
            FROM assessments
            WHERE assessment_id = :assessment_id
        """)

        result = await db.execute(query, {"assessment_id": assessment_id})
        row = result.fetchone()

        if not row:
            return None

        questions = _parse_questions_column(row[4])

        return {
            "id": row[0],
            "assessment_id": row[1],
            "role": row[2],
            "difficulty": row[3],
            "questions": questions,
            "duration_minutes": row[5],
            "status": row[6],
            "created_at": row[7].isoformat() if hasattr(row[7], "isoformat") else str(row[7]),
            "updated_at": row[8].isoformat() if row[8] and hasattr(row[8], "isoformat") else None,
            "num_questions": int(row[9] or 0) if len(row) > 9 else 0,
            "is_adaptive": bool(row[10]) if len(row) > 10 else False,
        }

    @staticmethod
    async def get_all(db, status: str = None) -> list:
        """Get all assessments with proper column mapping"""
        if status:
            query = text("SELECT * FROM assessments WHERE status = :status ORDER BY created_at DESC")
            result = await db.execute(query, {"status": status})
        else:
            query = text("SELECT * FROM assessments ORDER BY created_at DESC")
            result = await db.execute(query)

        rows = result.fetchall()
        items = []

        for row in rows:
            # ✅ USE COLUMN NAMES INSTEAD OF INDICES!
            columns = result.keys()
            row_dict = dict(zip(columns, row))
        
            # Parse created_at
            created_at = row_dict.get('created_at')
            if isinstance(created_at, (int, float)):
                created_at = datetime.fromtimestamp(created_at)
            elif isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", ""))
        
            # Parse updated_at
            updated_at = row_dict.get('updated_at')
            if isinstance(updated_at, (int, float)):
                updated_at = datetime.fromtimestamp(updated_at)
            elif isinstance(updated_at, str) and updated_at:
                updated_at = datetime.fromisoformat(updated_at.replace("Z", ""))
        
            # Parse questions JSON
            questions = row_dict.get('questions')
            if isinstance(questions, str):
                questions = json.loads(questions)
        
            items.append({
                "assessment_id": row_dict.get('assessment_id'),
                "role": row_dict.get('role'),
                "difficulty": row_dict.get('difficulty'),
                "questions": questions,
                "num_questions": row_dict.get('num_questions', 0),
                "duration_minutes": row_dict.get('duration_minutes'),
                "status": row_dict.get('status'),
                "is_adaptive": row_dict.get('is_adaptive', False),
                "created_at": created_at.isoformat() if created_at else None,
                "updated_at": updated_at.isoformat() if updated_at else None
            })

        return items

    @staticmethod
    async def update(db, assessment_id: str, data: dict) -> bool:
        set_clause = ", ".join([f"{k} = :{k}" for k in data.keys()])
        query = text(f"UPDATE assessments SET {set_clause} WHERE assessment_id = :assessment_id")

        params = {**data, "assessment_id": assessment_id}
        if "questions" in params:
            params["questions"] = json.dumps(params["questions"])

        result = await db.execute(query, params)
        await db.commit()

        return result.rowcount > 0

    @staticmethod
    async def delete(db, assessment_id: str) -> bool:
        query = text("DELETE FROM assessments WHERE assessment_id = :assessment_id")
        result = await db.execute(query, {"assessment_id": assessment_id})
        await db.commit()
        return result.rowcount > 0




# ============================
#   SESSION REPOSITORY
# ============================
class SessionRepository:
    
    @staticmethod
    async def create(db, session: dict):
        query = text("""
            INSERT INTO sessions 
            (session_id, assessment_id, candidate_email, role, start_time, time_remaining, answers, violations, status, metadata)
            VALUES (:session_id, :assessment_id, :candidate_email, :role, :start_time, :time_remaining, :answers, :violations, :status, :metadata)
        """)
        
        await db.execute(query, {
            "session_id": session["session_id"],
            "assessment_id": session["assessment_id"],
            "candidate_email": session["candidate_email"],
            "role": session["role"],   # <-- REQUIRED FIX
            "start_time": session["start_time"],
            "time_remaining": session["time_remaining"],
            "answers": json.dumps(session.get("answers", {})),
            "violations": json.dumps(session.get("violations", [])),
            "status": session["status"],
            "metadata": json.dumps(session.get("metadata", {}))
        })
        await db.commit()
        return session

    
    # Update get_by_id to parse metadata
    @staticmethod
    async def get_by_id(db, session_id: str) -> Optional[dict]:
        query = text("SELECT * FROM sessions WHERE session_id = :session_id")
        result = await db.execute(query, {"session_id": session_id})
        row = result.fetchone()
    
        if not row:
           return None

    # Map columns by name
        row_dict = dict(row._mapping)  # SQLAlchemy 1.4+ AsyncSession returns Row objects

        start_time = None
        end_time = None
        if row_dict.get("start_time"):
           start_time = datetime.fromisoformat(row_dict["start_time"]) if isinstance(row_dict["start_time"], str) else row_dict["start_time"]
        if row_dict.get("end_time"):
           end_time = datetime.fromisoformat(row_dict["end_time"]) if isinstance(row_dict["end_time"], str) else row_dict["end_time"]

        return {
        "session_id": row_dict.get("session_id"),
        "assessment_id": row_dict.get("assessment_id"),
        "candidate_email": row_dict.get("candidate_email"),
        "role": row_dict.get("role"),
        "start_time": start_time.isoformat() if start_time else None,
        "end_time": end_time.isoformat() if end_time else None,
        "time_remaining": row_dict.get("time_remaining"),
        "answers": json.loads(row_dict.get("answers") or "{}"),
        "violations": json.loads(row_dict.get("violations") or "[]"),
        "status": row_dict.get("status"),
        "metadata": json.loads(row_dict.get("metadata") or "{}")
    }



    @staticmethod
    async def update(db, session_id: str, data: dict) -> bool:
        set_clause = ", ".join([f"{k} = :{k}" for k in data.keys()])
        query = text(f"UPDATE sessions SET {set_clause} WHERE session_id = :session_id")

        params = {**data, "session_id": session_id}

        if "answers" in params:
            params["answers"] = json.dumps(params["answers"])

        if "violations" in params:
            params["violations"] = json.dumps(params["violations"])

        result = await db.execute(query, params)
        await db.commit()

        return result.rowcount > 0




# ============================
#   RESULT REPOSITORY
# ============================

class ResultRepository:

    # ----------------------------
    #   CREATE RESULT
    # ----------------------------
    @staticmethod
    async def create(db, result: dict):

        query = text("""
            INSERT INTO results
            (result_id, session_id, assessment_id, candidate_email, role, difficulty,
             total_questions, correct_answers, wrong_answers, unanswered, score_percentage,
             start_time, end_time, total_time_taken, question_results, violations,
             status, grade)
            VALUES
            (:result_id, :session_id, :assessment_id, :candidate_email, :role, :difficulty,
             :total_questions, :correct_answers, :wrong_answers, :unanswered, :score_percentage,
             :start_time, :end_time, :total_time_taken, :question_results, :violations,
             :status, :grade)
        """)

        await db.execute(query, {
            "result_id": result["result_id"],
            "session_id": result["session_id"],
            "assessment_id": result["assessment_id"],
            "candidate_email": result["candidate_email"],
            "role": result["role"],
            "difficulty": result["difficulty"],
            "total_questions": result["total_questions"],
            "correct_answers": result["correct_answers"],
            "wrong_answers": result["wrong_answers"],
            "unanswered": result["unanswered"],
            "score_percentage": result["score_percentage"],
            "start_time": result["start_time"],
            "end_time": result["end_time"],
            "total_time_taken": result["total_time_taken"],
            "question_results": json.dumps(result["question_results"]),
            "violations": json.dumps(result.get("violations", [])),
            "status": result["status"],
            "grade": result["grade"]
        })

        await db.commit()
        return result

    # ----------------------------
    #   PARSE ROW → DICT
    # ----------------------------
    @staticmethod
    def _row_to_dict(row) -> dict:

        def parse_datetime(value):
            if value is None:
                return None
            if isinstance(value, datetime):
                return value
            if isinstance(value, (int, float)):
                return datetime.fromtimestamp(value)
            if isinstance(value, str):
                try:
                    return datetime.fromisoformat(value.replace("Z", ""))
                except Exception:
                    return None
            return None

        start_time = parse_datetime(row[12])
        end_time = parse_datetime(row[13])
        created_at = parse_datetime(row[19]) if len(row) > 19 else None

        return {
            "result_id": row[1],
            "session_id": row[2],
            "assessment_id": row[3],
            "candidate_email": row[4],
            "role": row[5],
            "difficulty": row[6],
            "total_questions": row[7],
            "correct_answers": row[8],
            "wrong_answers": row[9],
            "unanswered": row[10],
            "score_percentage": float(row[11]),
            "start_time": start_time.isoformat() if start_time else None,
            "end_time": end_time.isoformat() if end_time else None,
            "total_time_taken": row[14],
            "question_results": json.loads(row[15]) if row[15] else [],
            "violations": json.loads(row[16]) if row[16] else [],
            "status": row[17],
            "grade": row[18],
            "flagged": bool(row[20]) if len(row) > 20 else False,
            "flag_reason": row[21] if len(row) > 21 else None,
            "created_at": created_at.isoformat() if created_at else None
        }

    # ----------------------------
    #   GET ALL RESULTS
    # ----------------------------
    @staticmethod
    async def get_all(db: AsyncSession, sort_by: str = "score_percentage"):

        allowed_sort_columns = [
            "score_percentage", "correct_answers", "total_questions",
            "start_time", "end_time"
        ]

        if sort_by not in allowed_sort_columns:
            sort_by = "score_percentage"

        query = text(f"SELECT * FROM results ORDER BY {sort_by} DESC")

        result = await db.execute(query)
        rows = result.fetchall()

        return [ResultRepository._row_to_dict(row) for row in rows]

    # ----------------------------
    #   GET RESULT BY ID
    # ----------------------------
    @staticmethod
    async def get_by_id(db, result_id: str):

        query = text("SELECT * FROM results WHERE result_id = :result_id")

        result = await db.execute(query, {"result_id": result_id})
        row = result.fetchone()

        return ResultRepository._row_to_dict(row) if row else None

    # ----------------------------
    #   GET RESULTS BY CANDIDATE
    # ----------------------------
    @staticmethod
    async def get_by_candidate(db, candidate_email: str):

        query = text("""
            SELECT * FROM results
            WHERE candidate_email = :email
            ORDER BY created_at DESC
        """)

        result = await db.execute(query, {"email": candidate_email})
        rows = result.fetchall()

        return [ResultRepository._row_to_dict(row) for row in rows]

    # ----------------------------
    #   ANALYTICS (FR-RES-07)
    # ----------------------------
    @staticmethod
    async def get_analytics(db) -> dict:
        """Get aggregate analytics - FIXED VERSION"""
        try:
            query = text("""
                SELECT 
                    COUNT(*) as total,
                    AVG(score_percentage) as avg_score,
                    SUM(CASE WHEN score_percentage >= 60 THEN 1 ELSE 0 END) as pass_count
                FROM results
            """)
            result = await db.execute(query)
            row = result.fetchone()
            
            if not row or row[0] == 0:
                print("⚠️ No results found in database")
                return {
                    "total_assessments": 0,
                    "average_score": 0,
                    "pass_rate": 0
                }
            
            total = row[0]
            avg_score = row[1] if row[1] is not None else 0
            pass_count = row[2] if row[2] is not None else 0
            
            return {
                "total_assessments": int(total),
                "average_score": round(float(avg_score), 2),
                "pass_rate": round((pass_count / total * 100), 2) if total > 0 else 0
            }
        except Exception as e:
            print(f"❌ get_analytics error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "total_assessments": 0,
                "average_score": 0,
                "pass_rate": 0
            }
    
    @staticmethod
    async def get_grade_distribution(db) -> dict:
        """Get grade distribution - FIXED VERSION"""
        try:
            query = text("SELECT grade, COUNT(*) as count FROM results GROUP BY grade")
            result = await db.execute(query)
            rows = result.fetchall()
            
            if not rows:
                print("⚠️ No grade distribution data")
                return {}
            
            return {row[0]: int(row[1]) for row in rows}
        except Exception as e:
            print(f"❌ get_grade_distribution error: {e}")
            import traceback
            traceback.print_exc()
            return {}