"""
Analysis Service — Answer scoring and interview analysis
Your __init__.py: from .analysis_service import AnalysisService

Combines LLM evaluation + video analysis into final per-answer scores
and overall interview scoring logic.
"""

from typing import List, Optional, Dict
from domain.interview_models import (
    AnswerEvaluation, FrameAnalysisResult, InterviewReport,
    InterviewSession, QuestionType, InterviewStatus
)
from datetime import datetime


class AnalysisService:
    """
    Aggregates per-answer evaluations into overall interview scores
    and generates the final hiring report.

    Used by interview_service.py and can also be used standalone.
    """

    # ── Score weights ────────────────────────────────────────────────
    WEIGHT_TECHNICAL    = 0.35
    WEIGHT_COMMUNICATION = 0.25
    WEIGHT_BEHAVIORAL   = 0.25
    WEIGHT_VIDEO        = 0.15

    # ── Recommendation thresholds ────────────────────────────────────
    THRESHOLD_STRONG    = 85.0
    THRESHOLD_RECOMMEND = 70.0
    THRESHOLD_BORDERLINE = 55.0

    # ────────────────────────────────────────────────────────────────

    def calculate_scores(
        self,
        evaluations: List[AnswerEvaluation],
        frame_snapshots: List[FrameAnalysisResult]
    ) -> Dict[str, float]:
        """
        Calculate all component scores from evaluations + video data.

        Returns:
            {
              "technical_score":      0-100,
              "communication_score":  0-100,
              "behavioral_score":     0-100,
              "video_integrity_score":0-100,
              "overall_score":        0-100
            }
        """
        if not evaluations:
            return {
                "technical_score": 0.0,
                "communication_score": 0.0,
                "behavioral_score": 0.0,
                "video_integrity_score": 100.0,
                "overall_score": 0.0
            }

        def avg(lst, key):
            return round(sum(getattr(e, key) for e in lst) / len(lst) * 10, 1) if lst else 0.0

        tech_evals = [e for e in evaluations if e.question_type == QuestionType.TECHNICAL]
        beh_evals  = [e for e in evaluations if e.question_type in (
                       QuestionType.BEHAVIORAL, QuestionType.FOLLOW_UP)]

        technical_score     = avg(tech_evals, "depth_score")        if tech_evals else avg(evaluations, "depth_score")
        communication_score = avg(evaluations, "communication_score")
        behavioral_score    = avg(beh_evals, "relevance_score")      if beh_evals else avg(evaluations, "relevance_score")

        # Video integrity: penalise flags and gaze away
        if frame_snapshots:
            flag_penalty = sum(len(s.suspicious_flags) for s in frame_snapshots) * 10
            gaze_penalty = (sum(s.looking_away_ratio for s in frame_snapshots) /
                            len(frame_snapshots)) * 50
            video_score  = round(max(0.0, 100.0 - flag_penalty - gaze_penalty), 1)
        else:
            video_score  = 100.0

        overall = round(
            technical_score     * self.WEIGHT_TECHNICAL +
            communication_score * self.WEIGHT_COMMUNICATION +
            behavioral_score    * self.WEIGHT_BEHAVIORAL +
            video_score         * self.WEIGHT_VIDEO,
            1
        )

        return {
            "technical_score":       technical_score,
            "communication_score":   communication_score,
            "behavioral_score":      behavioral_score,
            "video_integrity_score": video_score,
            "overall_score":         overall
        }

    def get_recommendation(self, overall_score: float) -> str:
        """Convert overall score to hiring recommendation string."""
        if overall_score >= self.THRESHOLD_STRONG:
            return "Strongly Recommend"
        elif overall_score >= self.THRESHOLD_RECOMMEND:
            return "Recommend"
        elif overall_score >= self.THRESHOLD_BORDERLINE:
            return "Borderline"
        else:
            return "Not Recommend"

    def collect_red_flags(
        self,
        evaluations: List[AnswerEvaluation],
        frame_snapshots: List[FrameAnalysisResult]
    ) -> List[str]:
        """Aggregate all red flags from video analysis."""
        flags = set()
        for snap in frame_snapshots:
            for flag in snap.suspicious_flags:
                flags.add(flag)
        # Low score flag
        avg_score = sum(
            (e.relevance_score + e.depth_score) / 2
            for e in evaluations
        ) / max(len(evaluations), 1)
        if avg_score < 3.0:
            flags.add("Consistently low answer quality across all questions")
        return list(flags)

    def score_single_answer(self, evaluation: AnswerEvaluation) -> float:
        """
        Quick single-answer composite score (0-100).
        Useful for per-question display on the frontend.
        """
        return round(
            (evaluation.relevance_score * 0.4 +
             evaluation.depth_score * 0.35 +
             evaluation.communication_score * 0.25) * 10,
            1
        )

    def build_report(
        self,
        session: "InterviewSession",
        summary: Dict
    ) -> InterviewReport:
        """
        Build the final InterviewReport from session + LLM summary.
        Called by interview_service.end_interview_and_report().

        Args:
            session: completed InterviewSession
            summary: dict from llm_service.generate_report_summary()
        """
        scores = self.calculate_scores(session.evaluations, session.frame_snapshots)
        flags  = self.collect_red_flags(session.evaluations, session.frame_snapshots)

        return InterviewReport(
            session_id=session.session_id,
            candidate_id=session.candidate_id,
            candidate_name=session.candidate_name,
            job_role=session.job_role,
            interview_date=session.started_at or datetime.utcnow(),
            status=InterviewStatus.COMPLETED,
            total_questions_asked=len(session.evaluations),
            overall_score=scores["overall_score"],
            technical_score=scores["technical_score"],
            communication_score=scores["communication_score"],
            behavioral_score=scores["behavioral_score"],
            video_integrity_score=scores["video_integrity_score"],
            evaluations=session.evaluations,
            behavioral_summary=summary.get("behavioral_summary", ""),
            strengths=summary.get("strengths", []),
            weaknesses=summary.get("weaknesses", []),
            recommendation=summary.get(
                "recommendation",
                self.get_recommendation(scores["overall_score"])
            ),
            red_flags=summary.get("red_flags", flags),
            hiring_decision_notes=summary.get("hiring_decision_notes", "")
        )