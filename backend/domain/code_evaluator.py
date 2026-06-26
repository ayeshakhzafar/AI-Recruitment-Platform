# domain/code_evaluator.py
# FR-TEC-05 to FR-TEC-10: Advanced AI-powered code evaluation

import re
import json
from typing import Dict, List, Tuple
from datetime import datetime


class CodeEvaluator:
    """
    Advanced code evaluator that analyzes:
    - Correctness (FR-TEC-05)
    - Efficiency (FR-TEC-06)
    - Code Quality (FR-TEC-07)
    - Problem Solving (FR-TEC-08)
    
    Generates detailed reports (FR-TEC-10)
    """
    
    def __init__(self):
        self.weights = {
            'correctness': 0.40,  # 40% - Most important
            'efficiency': 0.25,   # 25%
            'code_quality': 0.20, # 20%
            'problem_solving': 0.15  # 15%
        }
    
    def evaluate_submission(
        self, 
        code: str, 
        language: str,
        test_results: List[Dict],
        execution_time_ms: int,
        memory_used_mb: float
    ) -> Dict:
        """
        Complete evaluation of a code submission
        
        Args:
            code: Candidate's code
            language: Programming language
            test_results: List of test case results
            execution_time_ms: Total execution time
            memory_used_mb: Memory usage
        
        Returns:
            Complete evaluation dict with all scores and feedback
        """
        
        # 1. Correctness Score (FR-TEC-05)
        correctness_score, tests_passed, tests_total = self._evaluate_correctness(test_results)
        
        # 2. Efficiency Score (FR-TEC-06)
        efficiency_score, time_complexity, space_complexity = self._evaluate_efficiency(
            code, language, execution_time_ms, memory_used_mb, tests_total
        )
        
        # 3. Code Quality Score (FR-TEC-07)
        quality_score, quality_details = self._evaluate_code_quality(code, language)
        
        # 4. Problem Solving Score (FR-TEC-08)
        ps_score, ps_details = self._evaluate_problem_solving(code, language)
        
        # Calculate overall score
        overall_score = (
            correctness_score * self.weights['correctness'] +
            efficiency_score * self.weights['efficiency'] +
            quality_score * self.weights['code_quality'] +
            ps_score * self.weights['problem_solving']
        )
        
        # Determine grade
        grade = self._calculate_grade(overall_score)
        
        # Generate feedback (FR-TEC-10)
        strengths, weaknesses, suggestions = self._generate_feedback(
            correctness_score, efficiency_score, quality_score, ps_score,
            quality_details, ps_details, time_complexity, space_complexity
        )
        
        return {
            'overall_score': round(overall_score, 2),
            'grade': grade,
            'correctness_score': round(correctness_score, 2),
            'tests_passed': tests_passed,
            'tests_total': tests_total,
            'efficiency_score': round(efficiency_score, 2),
            'time_complexity': time_complexity,
            'space_complexity': space_complexity,
            'execution_time_ms': execution_time_ms,
            'memory_used_mb': memory_used_mb,
            'code_quality_score': round(quality_score, 2),
            'readability_score': quality_details['readability'],
            'maintainability_score': quality_details['maintainability'],
            'follows_standards': quality_details['follows_standards'],
            'problem_solving_score': round(ps_score, 2),
            'algorithmic_approach': ps_details['approach'],
            'logic_quality': ps_details['logic'],
            'strengths': strengths,
            'weaknesses': weaknesses,
            'suggestions': suggestions
        }
    
    def _evaluate_correctness(self, test_results: List[Dict]) -> Tuple[float, int, int]:
        """
        FR-TEC-05: Evaluate correctness by comparing outputs
        """
        if not test_results:
            return 0.0, 0, 0
        
        passed = sum(1 for test in test_results if test.get('passed', False))
        total = len(test_results)
        score = (passed / total) * 100 if total > 0 else 0
        
        return score, passed, total
    
    def _evaluate_efficiency(
        self, 
        code: str, 
        language: str, 
        execution_time_ms: int,
        memory_used_mb: float,
        test_count: int
    ) -> Tuple[float, str, str]:
        """
        FR-TEC-06: Evaluate time and space complexity
        """
        # Analyze time complexity
        time_complexity = self._analyze_time_complexity(code, language)
        space_complexity = self._analyze_space_complexity(code, language)
        
        # Score based on execution time (per test case)
        avg_time_per_test = execution_time_ms / test_count if test_count > 0 else execution_time_ms
        
        time_score = 100
        if avg_time_per_test > 1000:  # > 1 second
            time_score = 50
        elif avg_time_per_test > 500:  # > 500ms
            time_score = 70
        elif avg_time_per_test > 100:  # > 100ms
            time_score = 85
        
        # Score based on memory usage
        memory_score = 100
        if memory_used_mb > 100:  # > 100 MB
            memory_score = 50
        elif memory_used_mb > 50:  # > 50 MB
            memory_score = 70
        elif memory_used_mb > 20:  # > 20 MB
            memory_score = 85
        
        # Combined efficiency score
        efficiency_score = (time_score * 0.6 + memory_score * 0.4)
        
        return efficiency_score, time_complexity, space_complexity
    
    def _analyze_time_complexity(self, code: str, language: str) -> str:
        """
        Analyze time complexity from code patterns
        """
        if language == 'python':
            # Check for nested loops
            loop_count = len(re.findall(r'\bfor\b|\bwhile\b', code))
            
            # Check for recursion
            has_recursion = bool(re.search(r'def\s+(\w+).*:\s*.*\1\s*\(', code, re.DOTALL))
            
            if has_recursion:
                return "O(2^n) or O(n!) - Recursive"
            elif loop_count >= 3:
                return "O(n^3) or higher"
            elif loop_count == 2:
                return "O(n^2)"
            elif loop_count == 1:
                return "O(n)"
            else:
                return "O(1)"
        
        return "O(n) - Estimated"
    
    def _analyze_space_complexity(self, code: str, language: str) -> str:
        """
        Analyze space complexity from code patterns
        """
        if language == 'python':
            # Check for data structures
            has_dict = 'dict' in code or '{' in code
            has_list = 'list' in code or '[' in code
            has_set = 'set' in code or 'set(' in code
            
            if has_dict or has_list or has_set:
                return "O(n)"
            else:
                return "O(1)"
        
        return "O(n) - Estimated"
    
    def _evaluate_code_quality(self, code: str, language: str) -> Tuple[float, Dict]:
        """
        FR-TEC-07: Evaluate code quality (readability, maintainability, standards)
        """
        readability_score = self._check_readability(code, language)
        maintainability_score = self._check_maintainability(code, language)
        standards_score = self._check_coding_standards(code, language)
        
        overall_quality = (readability_score + maintainability_score + standards_score) / 3
        
        return overall_quality, {
            'readability': readability_score,
            'maintainability': maintainability_score,
            'follows_standards': standards_score > 70
        }
    
    def _check_readability(self, code: str, language: str) -> float:
        """
        Check code readability
        """
        score = 100
        
        if language == 'python':
            lines = code.split('\n')
            
            # Check for comments
            comment_lines = [l for l in lines if l.strip().startswith('#')]
            if len(comment_lines) / max(len(lines), 1) < 0.1:
                score -= 10
            
            # Check for docstrings
            if '"""' not in code and "'''" not in code:
                score -= 10
            
            # Check for meaningful variable names
            if re.search(r'\b[a-z]\b', code):  # Single letter variables
                score -= 15
            
            # Check line length
            long_lines = [l for l in lines if len(l) > 100]
            if long_lines:
                score -= 10
            
            # Check for whitespace
            if not re.search(r'\n\n', code):  # No blank lines
                score -= 5
        
        return max(score, 0)
    
    def _check_maintainability(self, code: str, language: str) -> float:
        """
        Check code maintainability
        """
        score = 100
        
        if language == 'python':
            # Check function length
            functions = re.findall(r'def\s+\w+\([^)]*\):(.*?)(?=def\s|\Z)', code, re.DOTALL)
            for func in functions:
                lines = [l for l in func.split('\n') if l.strip()]
                if len(lines) > 50:
                    score -= 15
            
            # Check for magic numbers
            magic_numbers = re.findall(r'\b\d{3,}\b', code)
            if len(magic_numbers) > 3:
                score -= 10
            
            # Check for duplicate code
            lines = [l.strip() for l in code.split('\n') if l.strip()]
            if len(lines) != len(set(lines)):
                score -= 10
        
        return max(score, 0)
    
    def _check_coding_standards(self, code: str, language: str) -> float:
        """
        Check adherence to coding standards
        """
        score = 100
        
        if language == 'python':
            # PEP 8 checks
            
            # Check indentation (should be 4 spaces)
            if '\t' in code:
                score -= 15
            
            # Check naming conventions
            # Functions should be snake_case
            functions = re.findall(r'def\s+([a-zA-Z_]\w*)', code)
            for func in functions:
                if not func.islower() and '_' not in func:
                    score -= 5
            
            # Check for trailing whitespace
            lines = code.split('\n')
            if any(line.endswith(' ') for line in lines):
                score -= 5
            
            # Check for imports organization
            if 'import' in code:
                import_lines = [l for l in lines if 'import' in l]
                if import_lines and import_lines != sorted(import_lines):
                    score -= 5
        
        return max(score, 0)
    
    def _evaluate_problem_solving(self, code: str, language: str) -> Tuple[float, Dict]:
        """
        FR-TEC-08: Evaluate problem-solving approach and algorithmic thinking
        """
        approach_score = self._analyze_algorithmic_approach(code, language)
        logic_score = self._analyze_logic_quality(code, language)
        
        overall_ps = (approach_score + logic_score) / 2
        
        return overall_ps, {
            'approach': self._get_approach_description(code, language),
            'logic': self._get_logic_description(code, language)
        }
    
    def _analyze_algorithmic_approach(self, code: str, language: str) -> float:
        """
        Analyze the algorithmic approach
        """
        score = 70  # Base score
        
        # Check for optimal approaches
        if 'hash' in code.lower() or 'dict' in code.lower():
            score += 15  # Using hash maps (good)
        
        if len(re.findall(r'\bfor\b|\bwhile\b', code)) <= 1:
            score += 10  # Linear time (good)
        
        if 'sort' in code.lower():
            score += 5  # Using sorting (sometimes optimal)
        
        return min(score, 100)
    
    def _analyze_logic_quality(self, code: str, language: str) -> float:
        """
        Analyze logic quality
        """
        score = 80  # Base score
        
        # Check for edge case handling
        if 'if' in code and 'not' in code:
            score += 10
        
        # Check for error handling
        if 'try' in code or 'except' in code:
            score += 10
        
        return min(score, 100)
    
    def _get_approach_description(self, code: str, language: str) -> str:
        """
        Get description of algorithmic approach
        """
        if 'hash' in code.lower() or 'dict' in code.lower():
            return "Hash Map based approach - Optimal for lookups"
        elif len(re.findall(r'\bfor\b', code)) >= 2:
            return "Nested iteration approach - Consider optimization"
        elif 'sort' in code.lower():
            return "Sorting-based approach"
        else:
            return "Standard iterative approach"
    
    def _get_logic_description(self, code: str, language: str) -> str:
        """
        Get description of logic quality
        """
        has_edge_cases = 'if' in code and ('not' in code or '==' in code)
        has_error_handling = 'try' in code or 'except' in code
        
        if has_edge_cases and has_error_handling:
            return "Robust logic with edge case and error handling"
        elif has_edge_cases:
            return "Good logic with edge case handling"
        elif has_error_handling:
            return "Includes error handling"
        else:
            return "Basic logic implementation"
    
    def _calculate_grade(self, overall_score: float) -> str:
        """
        Calculate letter grade from score
        """
        if overall_score >= 97:
            return "A+"
        elif overall_score >= 93:
            return "A"
        elif overall_score >= 90:
            return "A-"
        elif overall_score >= 87:
            return "B+"
        elif overall_score >= 83:
            return "B"
        elif overall_score >= 80:
            return "B-"
        elif overall_score >= 77:
            return "C+"
        elif overall_score >= 73:
            return "C"
        elif overall_score >= 70:
            return "C-"
        elif overall_score >= 67:
            return "D+"
        elif overall_score >= 63:
            return "D"
        elif overall_score >= 60:
            return "D-"
        else:
            return "F"
    
    def _generate_feedback(
        self,
        correctness_score: float,
        efficiency_score: float,
        quality_score: float,
        ps_score: float,
        quality_details: Dict,
        ps_details: Dict,
        time_complexity: str,
        space_complexity: str
    ) -> Tuple[List[str], List[str], List[str]]:
        """
        FR-TEC-10: Generate strengths, weaknesses, and suggestions
        """
        strengths = []
        weaknesses = []
        suggestions = []
        
        # Correctness feedback
        if correctness_score == 100:
            strengths.append("All test cases passed - excellent correctness!")
        elif correctness_score >= 70:
            strengths.append(f"Good correctness - {correctness_score:.0f}% tests passed")
            suggestions.append("Review failed test cases to improve correctness")
        else:
            weaknesses.append(f"Low correctness - only {correctness_score:.0f}% tests passed")
            suggestions.append("Debug your solution and test with edge cases")
        
        # Efficiency feedback
        if efficiency_score >= 85:
            strengths.append(f"Efficient solution with {time_complexity} time complexity")
        elif efficiency_score >= 70:
            suggestions.append(f"Consider optimizing - current complexity is {time_complexity}")
        else:
            weaknesses.append("Solution is inefficient - high time/space complexity")
            suggestions.append("Look for O(n) or O(n log n) approaches")
        
        # Code quality feedback
        if quality_score >= 85:
            strengths.append("Well-written, clean, and maintainable code")
        elif quality_score >= 70:
            suggestions.append("Improve code readability with better naming and comments")
        else:
            weaknesses.append("Code quality needs improvement")
            suggestions.append("Follow coding standards and add documentation")
        
        # Problem solving feedback
        if ps_score >= 85:
            strengths.append(f"Strong algorithmic approach - {ps_details['approach']}")
        elif ps_score >= 70:
            suggestions.append("Good approach, but consider alternative algorithms")
        else:
            weaknesses.append("Problem-solving approach needs refinement")
            suggestions.append("Study common algorithms and data structures")
        
        return strengths, weaknesses, suggestions


def generate_ai_feedback_prompt(code: str, language: str, evaluation: Dict) -> str:
    """
    Generate prompt for LLM to provide detailed code feedback
    FR-TEC-08: Use AI to evaluate problem-solving approach
    """
    prompt = f"""Analyze this {language} code submission and provide detailed feedback:

CODE:
```{language}
{code}
```

EVALUATION SCORES:
- Overall: {evaluation['overall_score']}/100 ({evaluation['grade']})
- Correctness: {evaluation['correctness_score']}/100 ({evaluation['tests_passed']}/{evaluation['tests_total']} tests passed)
- Efficiency: {evaluation['efficiency_score']}/100 (Time: {evaluation['time_complexity']}, Space: {evaluation['space_complexity']})
- Code Quality: {evaluation['code_quality_score']}/100
- Problem Solving: {evaluation['problem_solving_score']}/100

Please provide:
1. **Code Review**: Brief analysis of the solution's approach
2. **Strengths**: 2-3 specific things done well
3. **Areas for Improvement**: 2-3 specific suggestions
4. **Optimization Tips**: How to improve efficiency if needed
5. **Best Practices**: Any coding standards that should be followed

Keep feedback constructive, specific, and actionable."""
    
    return prompt