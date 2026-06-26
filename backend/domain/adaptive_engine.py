# domain/adaptive_engine.py - ENHANCED VERSION
# Adaptive testing engine for dynamic difficulty adjustment

from typing import Dict, List, Optional


class AdaptiveTestEngine:
    """
    FR-MCQ-04: Adaptive testing engine that adjusts difficulty dynamically
    
    Algorithm:
    - Start with specified difficulty (default: medium)
    - Track rolling accuracy (last 3 questions)
    - If accuracy >= 75%: increase difficulty
    - If accuracy < 50%: decrease difficulty
    - Generate questions on-the-fly using LLM with context
    
    Enhanced Features:
    - Prevents rapid oscillation between difficulties
    - Tracks difficulty change history
    - Provides detailed performance analytics
    """
    
    def __init__(self, initial_difficulty: str = "medium", window_size: int = 3):
        """
        Initialize adaptive test engine
        
        Args:
            initial_difficulty: Starting difficulty ("easy", "medium", "hard")
            window_size: Number of recent questions to track (default: 3)
        """
        self.difficulty_levels = ["easy", "medium", "hard"]
        
        # Set initial difficulty
        if initial_difficulty.lower() in self.difficulty_levels:
            self.difficulty_index = self.difficulty_levels.index(initial_difficulty.lower())
        else:
            self.difficulty_index = 1  # Default to medium
        
        self.initial_difficulty = self.difficulty_levels[self.difficulty_index]
        
        # Performance tracking
        self.performance_window = []  # Track last N answers (1=correct, 0=incorrect)
        self.window_size = window_size
        
        # History tracking
        self.all_responses = []  # Complete history
        self.difficulty_changes = []  # Track when/why difficulty changed
        
        # Stability control (prevent rapid changes)
        self.min_questions_before_change = 2
        self.questions_since_last_change = 0
        self.difficulty_adjustments = 0  # âœ… Track adjustment count
        self.difficulty_history = []  # âœ… Track difficulty of each question
    
    def update_performance(self, is_correct: bool, question_difficulty: str = None):
        """
        Update performance tracking with latest answer
        
        Args:
            is_correct: Whether answer was correct
            question_difficulty: Difficulty of the question answered
        """
        result = 1 if is_correct else 0
        
        # Add to rolling window
        self.performance_window.append(result)
        
        # Keep only last N answers
        if len(self.performance_window) > self.window_size:
            self.performance_window.pop(0)
        
        # Add to complete history
        self.all_responses.append({
            "correct": is_correct,
            "difficulty": question_difficulty or self.get_current_difficulty(),
            "cumulative_accuracy": self.calculate_accuracy()
        })
        
        # Increment stability counter
        self.questions_since_last_change += 1
    
    def calculate_accuracy(self) -> float:
        """
        Calculate accuracy from performance window
        
        Returns:
            Accuracy as decimal (0.0 to 1.0)
        """
        if not self.performance_window:
            return 0.5  # Neutral starting point
        
        return sum(self.performance_window) / len(self.performance_window)
    
    def calculate_overall_accuracy(self) -> float:
        """Calculate accuracy across all questions"""
        if not self.all_responses:
            return 0.0
        
        correct = sum(1 for r in self.all_responses if r["correct"])
        return correct / len(self.all_responses)
    
    def get_next_difficulty(self) -> str:
        """
        Determine next question difficulty based on performance
        
        Returns:
            Difficulty level string
        """
        accuracy = self.calculate_accuracy()
        previous_difficulty = self.get_current_difficulty()
        
        # Check if we have enough data to make changes
        if len(self.performance_window) < 2:
            # Not enough data yet, keep current difficulty
            return previous_difficulty
        
        # Stability check: don't change too frequently
        if self.questions_since_last_change < self.min_questions_before_change:
            return previous_difficulty
        
        # Adaptive logic
        changed = False
        reason = ""
        
        if accuracy >= 0.75 and self.difficulty_index < len(self.difficulty_levels) - 1:
            # Increase difficulty - candidate performing well
            self.difficulty_index += 1
            self.difficulty_adjustments += 1  # âœ… Count adjustment
            changed = True
            reason = f"High accuracy ({accuracy:.1%}) â†’ increase difficulty"
            
        elif accuracy < 0.50 and self.difficulty_index > 0:
            # Decrease difficulty - candidate struggling
            self.difficulty_index -= 1
            self.difficulty_adjustments += 1  # âœ… Count adjustment
            changed = True
            reason = f"Low accuracy ({accuracy:.1%}) â†’ decrease difficulty"
        
        new_difficulty = self.difficulty_levels[self.difficulty_index]
        
        # Log difficulty change
        if changed:
            self.difficulty_changes.append({
                "from": previous_difficulty,
                "to": new_difficulty,
                "reason": reason,
                "after_questions": len(self.all_responses),
                "accuracy_at_change": accuracy
            })
            self.questions_since_last_change = 0
        
        return new_difficulty
    
    def get_current_difficulty(self) -> str:
        """Get current difficulty level"""
        return self.difficulty_levels[self.difficulty_index]
    
    def should_continue_test(self, questions_answered: int, max_questions: int) -> bool:
        """
        Determine if test should continue
        
        Args:
            questions_answered: Number of questions answered so far
            max_questions: Maximum questions allowed
        
        Returns:
            True if test should continue, False otherwise
        """
        # Basic check
        if questions_answered >= max_questions:
            return False
        
        # Optional: Early termination if performance is consistently very poor
        if len(self.all_responses) >= 5:
            overall_accuracy = self.calculate_overall_accuracy()
            if overall_accuracy < 0.2:  # Less than 20% accuracy
                # Could implement early termination, but let's continue for now
                pass
        
        return True
    
    def get_performance_summary(self) -> Dict:
        """
        Get comprehensive summary of adaptive performance
        
        Returns:
            Dictionary with performance metrics
        """
        return {
            "initial_difficulty": self.initial_difficulty,
            "current_difficulty": self.get_current_difficulty(),
            "recent_accuracy": self.calculate_accuracy(),
            "overall_accuracy": self.calculate_overall_accuracy(),
            "performance_window": self.performance_window,
            "total_questions": len(self.all_responses),
            "difficulty_changes": len(self.difficulty_changes),
            "difficulty_adjustments": self.difficulty_adjustments,  # âœ… Add count
            "difficulty_progression": [
                r["difficulty"] for r in self.all_responses
            ],
            "change_history": self.difficulty_changes,
            "final_difficulty_index": self.difficulty_index,
            "difficulty_delta": self.difficulty_index - self.difficulty_levels.index(self.initial_difficulty)
        }
    
    def get_recommendation_score(self) -> Dict:
        """
        Generate recommendation score for candidate
        
        Returns score, level, and reasoning
        """
        overall_accuracy = self.calculate_overall_accuracy()
        final_difficulty = self.get_current_difficulty()
        difficulty_changes = len(self.difficulty_changes)
        
        # Calculate weighted score
        # Higher difficulty + high accuracy = better score
        difficulty_multiplier = {
            "easy": 0.8,
            "medium": 1.0,
            "hard": 1.2
        }
        
        base_score = overall_accuracy * 100
        weighted_score = base_score * difficulty_multiplier.get(final_difficulty, 1.0)
        
        # Determine performance level
        if weighted_score >= 85:
            level = "Excellent"
            recommendation = "Strong candidate with solid performance"
        elif weighted_score >= 70:
            level = "Good"
            recommendation = "Competent candidate, meets requirements"
        elif weighted_score >= 55:
            level = "Fair"
            recommendation = "Adequate performance, some gaps"
        else:
            level = "Needs Improvement"
            recommendation = "Below expected level, requires development"
        
        return {
            "score": round(weighted_score, 2),
            "accuracy": round(overall_accuracy * 100, 2),
            "level": level,
            "final_difficulty": final_difficulty,
            "recommendation": recommendation,
            "difficulty_adaptations": difficulty_changes,
            "consistency": "High" if len(set(self.performance_window[-5:])) <= 2 else "Variable"
        }
    
    def reset(self):
        """Reset engine state for new test"""
        self.difficulty_index = self.difficulty_levels.index(self.initial_difficulty)
        self.performance_window = []
        self.all_responses = []
        self.difficulty_changes = []
        self.questions_since_last_change = 0
        self.difficulty_adjustments = 0  # âœ… Track adjustment count
        self.difficulty_history = []  # âœ… Track difficulty of each question