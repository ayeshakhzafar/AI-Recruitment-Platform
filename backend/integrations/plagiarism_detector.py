# integrations/plagiarism_detector.py
# FR-TEC-09: Detect potential plagiarism in code submissions

import re
import difflib
from typing import List, Dict, Tuple
from collections import Counter


class PlagiarismDetector:
    """
    Detects code plagiarism by:
    1. Comparing against other submissions
    2. Checking against known solutions
    3. Analyzing code similarity
    """
    
    def __init__(self, similarity_threshold: float = 0.85):
        """
        Args:
            similarity_threshold: Minimum similarity to flag as plagiarism (0.0 to 1.0)
        """
        self.similarity_threshold = similarity_threshold
    
    def check_plagiarism(
        self,
        candidate_code: str,
        candidate_email: str,
        all_submissions: List[Dict],
        language: str
    ) -> Dict:
        """
        Check if code is plagiarized
        
        Args:
            candidate_code: Code to check
            candidate_email: Candidate's email
            all_submissions: List of all submissions for this challenge
            language: Programming language
        
        Returns:
            Dict with plagiarism_score, is_plagiarized, similar_submissions
        """
        # Normalize the candidate's code
        normalized_candidate = self._normalize_code(candidate_code, language)
        
        similar_submissions = []
        max_similarity = 0.0
        
        # Compare against other submissions
        for submission in all_submissions:
            # Skip same candidate
            if submission.get('candidate_email') == candidate_email:
                continue
            
            other_code = submission.get('code', '')
            normalized_other = self._normalize_code(other_code, language)
            
            # Calculate similarity
            similarity = self._calculate_similarity(normalized_candidate, normalized_other)
            
            if similarity > max_similarity:
                max_similarity = similarity
            
            # If highly similar, add to list
            if similarity >= self.similarity_threshold:
                similar_submissions.append({
                    'submission_id': submission.get('submission_id'),
                    'candidate_email': self._anonymize_email(submission.get('candidate_email', '')),
                    'similarity': round(similarity * 100, 2),
                    'submitted_at': submission.get('submitted_at')
                })
        
        # Sort by similarity (highest first)
        similar_submissions.sort(key=lambda x: x['similarity'], reverse=True)
        
        # Determine if plagiarized
        is_plagiarized = max_similarity >= self.similarity_threshold
        plagiarism_score = round(max_similarity * 100, 2)
        
        # Generate details
        details = self._generate_plagiarism_details(
            plagiarism_score, 
            is_plagiarized, 
            similar_submissions,
            normalized_candidate
        )
        
        return {
            'plagiarism_score': plagiarism_score,
            'plagiarism_detected': is_plagiarized,
            'similar_submissions': similar_submissions[:5],  # Top 5 matches
            'details': details,
            'confidence': self._calculate_confidence(plagiarism_score, len(similar_submissions))
        }
    
    def _normalize_code(self, code: str, language: str) -> str:
        """
        Normalize code to reduce false positives from formatting differences
        """
        if language == 'python':
            # Remove comments
            code = re.sub(r'#.*', '', code)
            code = re.sub(r'""".*?"""', '', code, flags=re.DOTALL)
            code = re.sub(r"'''.*?'''", '', code, flags=re.DOTALL)
            
            # Remove docstrings
            code = re.sub(r'^\s*""".*?"""', '', code, flags=re.MULTILINE | re.DOTALL)
            
            # Normalize whitespace
            code = re.sub(r'\s+', ' ', code)
            
            # Remove trailing/leading whitespace
            code = code.strip()
            
            # Normalize variable names to generic names
            # This helps detect plagiarism even if variables are renamed
            code = self._normalize_variables(code, language)
        
        return code.lower()
    
    def _normalize_variables(self, code: str, language: str) -> str:
        """
        Replace variable names with generic placeholders
        """
        if language == 'python':
            # Find all variable names
            variables = re.findall(r'\b([a-z_][a-z0-9_]*)\b', code, re.IGNORECASE)
            
            # Count frequency
            var_counts = Counter(variables)
            
            # Sort by frequency
            sorted_vars = sorted(var_counts.items(), key=lambda x: (-x[1], x[0]))
            
            # Replace with generic names
            var_map = {}
            for idx, (var, _) in enumerate(sorted_vars):
                # Skip Python keywords and built-ins
                if var in ['def', 'if', 'else', 'for', 'while', 'return', 'in', 'and', 'or', 'not',
                          'True', 'False', 'None', 'print', 'len', 'range', 'str', 'int', 'float',
                          'list', 'dict', 'set', 'tuple']:
                    continue
                var_map[var] = f'var{idx}'
            
            # Replace in code
            for original, generic in var_map.items():
                code = re.sub(r'\b' + re.escape(original) + r'\b', generic, code)
        
        return code
    
    def _calculate_similarity(self, code1: str, code2: str) -> float:
        """
        Calculate similarity between two code snippets using multiple methods
        """
        # Method 1: Sequence Matcher (Levenshtein-like)
        seq_similarity = difflib.SequenceMatcher(None, code1, code2).ratio()
        
        # Method 2: Token-based similarity
        tokens1 = set(code1.split())
        tokens2 = set(code2.split())
        
        if not tokens1 or not tokens2:
            token_similarity = 0.0
        else:
            intersection = len(tokens1 & tokens2)
            union = len(tokens1 | tokens2)
            token_similarity = intersection / union if union > 0 else 0.0
        
        # Method 3: Structure similarity (line-by-line)
        lines1 = [l.strip() for l in code1.split('\n') if l.strip()]
        lines2 = [l.strip() for l in code2.split('\n') if l.strip()]
        
        matching_lines = 0
        for line1 in lines1:
            for line2 in lines2:
                if difflib.SequenceMatcher(None, line1, line2).ratio() > 0.9:
                    matching_lines += 1
                    break
        
        max_lines = max(len(lines1), len(lines2))
        structure_similarity = matching_lines / max_lines if max_lines > 0 else 0.0
        
        # Weighted average of all methods
        final_similarity = (
            seq_similarity * 0.5 +
            token_similarity * 0.3 +
            structure_similarity * 0.2
        )
        
        return final_similarity
    
    def _anonymize_email(self, email: str) -> str:
        """
        Anonymize email for privacy
        """
        if '@' not in email:
            return 'anonymous'
        
        username, domain = email.split('@')
        
        if len(username) <= 3:
            masked = username[0] + '***'
        else:
            masked = username[0] + '*' * (len(username) - 2) + username[-1]
        
        return f"{masked}@{domain}"
    
    def _generate_plagiarism_details(
        self,
        score: float,
        is_plagiarized: bool,
        similar_submissions: List[Dict],
        normalized_code: str
    ) -> str:
        """
        Generate detailed plagiarism report
        """
        if not is_plagiarized:
            return "No significant similarity detected with other submissions."
        
        details = f"⚠️ HIGH SIMILARITY DETECTED ({score}%)\n\n"
        
        if similar_submissions:
            details += f"Found {len(similar_submissions)} highly similar submission(s):\n\n"
            for idx, sim in enumerate(similar_submissions[:3], 1):
                details += f"{idx}. Similarity: {sim['similarity']}% "
                details += f"(Submitted: {sim.get('submitted_at', 'Unknown')})\n"
        
        details += "\nRecommendation: Manual review required to confirm plagiarism."
        
        return details
    
    def _calculate_confidence(self, plagiarism_score: float, num_similar: int) -> str:
        """
        Calculate confidence level in plagiarism detection
        """
        if plagiarism_score >= 95 and num_similar >= 1:
            return "Very High"
        elif plagiarism_score >= 90 and num_similar >= 1:
            return "High"
        elif plagiarism_score >= 85:
            return "Medium"
        else:
            return "Low"
    
    def compare_with_known_solutions(
        self,
        candidate_code: str,
        known_solutions: List[str],
        language: str
    ) -> Dict:
        """
        Compare against known/published solutions
        """
        normalized_candidate = self._normalize_code(candidate_code, language)
        
        max_similarity = 0.0
        matched_solution_idx = -1
        
        for idx, solution in enumerate(known_solutions):
            normalized_solution = self._normalize_code(solution, language)
            similarity = self._calculate_similarity(normalized_candidate, normalized_solution)
            
            if similarity > max_similarity:
                max_similarity = similarity
                matched_solution_idx = idx
        
        is_match = max_similarity >= 0.90  # Higher threshold for known solutions
        
        return {
            'matches_known_solution': is_match,
            'similarity': round(max_similarity * 100, 2),
            'matched_solution_index': matched_solution_idx if is_match else None,
            'details': f"Matched with known solution #{matched_solution_idx + 1}" if is_match else "No match with known solutions"
        }
    
    def detect_code_generation_tools(self, code: str, language: str) -> Dict:
        """
        Detect if code was generated by AI tools (basic heuristics)
        """
        indicators = {
            'ai_generated': False,
            'confidence': 'Low',
            'reasons': []
        }
        
        # Check for common AI code patterns
        if language == 'python':
            # Very detailed comments (AI tools often add these)
            comment_lines = len(re.findall(r'#.*', code))
            code_lines = len([l for l in code.split('\n') if l.strip() and not l.strip().startswith('#')])
            
            if code_lines > 0 and comment_lines / code_lines > 0.5:
                indicators['reasons'].append("Unusually high comment-to-code ratio")
            
            # Type hints everywhere (sometimes indicates AI)
            if code.count(':') > code_lines * 0.8:
                indicators['reasons'].append("Extensive use of type hints")
            
            # Perfect docstrings for every function
            functions = len(re.findall(r'def\s+\w+', code))
            docstrings = len(re.findall(r'""".*?"""', code, re.DOTALL))
            
            if functions > 0 and docstrings >= functions:
                indicators['reasons'].append("Every function has detailed docstring")
            
            # Check for AI-typical patterns
            ai_patterns = [
                r'# Step \d+:',  # Numbered steps
                r'# Initialize',  # Formal initialization comments
                r'# Return the result',  # Explicit return comments
                r'# Edge case',  # Edge case handling comments
            ]
            
            for pattern in ai_patterns:
                if re.search(pattern, code):
                    indicators['reasons'].append(f"Found AI-typical pattern: {pattern}")
        
        # Determine confidence
        if len(indicators['reasons']) >= 3:
            indicators['ai_generated'] = True
            indicators['confidence'] = 'High'
        elif len(indicators['reasons']) >= 2:
            indicators['ai_generated'] = True
            indicators['confidence'] = 'Medium'
        elif len(indicators['reasons']) >= 1:
            indicators['confidence'] = 'Low'
        
        return indicators


# Example usage
def example_plagiarism_check():
    """
    Example of how to use the PlagiarismDetector
    """
    detector = PlagiarismDetector(similarity_threshold=0.85)
    
    candidate_code = """
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
"""
    
    other_submissions = [
        {
            'submission_id': 'sub_001',
            'candidate_email': 'other@example.com',
            'code': """
def two_sum(numbers, goal):
    hashmap = {}
    for index, number in enumerate(numbers):
        diff = goal - number
        if diff in hashmap:
            return [hashmap[diff], index]
        hashmap[number] = index
    return []
""",
            'submitted_at': '2024-01-15'
        }
    ]
    
    result = detector.check_plagiarism(
        candidate_code,
        'candidate@example.com',
        other_submissions,
        'python'
    )
    
    print(f"Plagiarism Score: {result['plagiarism_score']}%")
    print(f"Is Plagiarized: {result['plagiarism_detected']}")
    print(f"Similar Submissions: {len(result['similar_submissions'])}")
    print(f"Confidence: {result['confidence']}")


if __name__ == '__main__':
    example_plagiarism_check()