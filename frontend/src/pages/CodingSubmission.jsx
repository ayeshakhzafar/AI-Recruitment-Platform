// CodingSubmission.jsx - UPDATED VERSION
// Simple coding challenge submission page (alternative to CodingChallenge.jsx)
// ✅ Updated to match new backend API structure

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';

export default function CodingSubmissionPage() {
  const [searchParams] = useSearchParams();
  const challengeId = searchParams.get('id');

  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [runningTests, setRunningTests] = useState(false);

  useEffect(() => {
    fetchChallenge();
  }, [challengeId]);

  const fetchChallenge = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/coding/challenge/${challengeId}`);
      const data = await res.json();
      setChallenge(data);
      setCode(data.starter_code || '');
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch challenge:', err);
      alert('❌ Failed to load challenge');
    }
  };

  // ✅ UPDATED: Run tests with new backend structure
  const runTests = async () => {
    if (!code.trim()) {
      alert('Please write some code first!');
      return;
    }

    setRunningTests(true);
    setTestResults(null);

    try {
      const res = await fetch('http://localhost:8000/api/coding/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: challengeId,
          code,
          language: challenge.language
        })
      });

      const data = await res.json();
      
      // ✅ Handle compilation errors
      if (data.allow_resubmission && data.compilation_errors) {
        alert(`⚠️ Compilation Errors Found:\n\n${data.compilation_errors.map(e => e.error).join('\n\n')}\n\nPlease fix and try again.`);
      }
      
      setTestResults(data);
    } catch (err) {
      console.error('Test execution failed:', err);
      alert('❌ Failed to run tests');
    }

    setRunningTests(false);
  };

  // ✅ UPDATED: Submit with new backend response structure
  const submitSolution = async () => {
    if (!candidateEmail.trim()) {
      alert('Please enter your email first!');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidateEmail)) {
      alert('❌ Invalid email format');
      return;
    }

    if (!code.trim()) {
      alert('Please write some code first!');
      return;
    }

    setSubmitting(true);

    try {
      console.log('Submitting solution...');
      console.log('challenge_id:', challengeId);
      console.log('candidate_email:', candidateEmail);
      console.log('language:', challenge.language);
      
      const res = await fetch('http://localhost:8000/api/coding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: challengeId,
          candidate_email: candidateEmail,
          code,
          language: challenge.language
        })
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      
      setResult(data);
      
      // Check if response indicates an error or missing score
      if (!res.ok || data.score === undefined || data.score === null) {
        console.log('Submission failed - no score in response');
        alert(`❌ Submission failed: ${data.detail || data.error || 'Unknown error occurred'}`);
        setSubmitting(false);
        return;
      }
      
      // ✅ Display comprehensive results only if score is present
      const breakdown = data.score_breakdown;
      if (breakdown) {
        alert(`✅ Solution Submitted Successfully!

Final Score: ${data.score}%
Performance Level: ${data.performance_level || 'N/A'}

Score Breakdown:
✅ Correctness: ${breakdown.correctness?.score ?? 0}% (${breakdown.correctness?.contribution ?? 0}pts)
⚡ Efficiency: ${breakdown.efficiency?.score ?? 0}% (${breakdown.efficiency?.contribution ?? 0}pts)
📊 Code Quality: ${breakdown.code_quality?.score ?? 0}% (${breakdown.code_quality?.contribution ?? 0}pts)
🧠 Problem Solving: ${breakdown.problem_solving?.score ?? 0}% (${breakdown.problem_solving?.contribution ?? 0}pts)
📖 Readability: ${breakdown.readability?.score ?? 0}% (${breakdown.readability?.contribution ?? 0}pts)

Tests Passed: ${data.passed_tests ?? 0}/${data.total_tests ?? 0}`);
      } else {
        alert(`✅ Solution submitted! Score: ${data.score}%`);
      }
    } catch (err) {
      console.error('Submission failed:', err);
      alert('❌ Failed to submit solution');
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, color: '#6b7280' }}>Loading challenge...</div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <div style={{ fontSize: 18, color: '#6b7280' }}>Challenge not found</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '2px solid #e5e7eb',
        padding: '20px 40px'
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 8 }}>
              {challenge.title}
            </h1>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{
                padding: '4px 12px',
                background: challenge.difficulty === 'easy' ? '#dcfce7' :
                           challenge.difficulty === 'medium' ? '#fef3c7' : '#fee2e2',
                color: challenge.difficulty === 'easy' ? '#166534' :
                       challenge.difficulty === 'medium' ? '#854d0e' : '#991b1b',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600
              }}>
                {challenge.difficulty.toUpperCase()}
              </span>
              <span style={{
                padding: '4px 12px',
                background: '#dbeafe',
                color: '#1e40af',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600
              }}>
                {challenge.language.toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="email"
              placeholder="Your Email"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 15,
                width: 280
              }}
            />

            <button
              onClick={runTests}
              disabled={runningTests}
              style={{
                padding: '12px 24px',
                background: runningTests ? '#9ca3af' : '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: runningTests ? 'not-allowed' : 'pointer'
              }}
            >
              {runningTests ? '⏳ Running...' : '▶️ Run Tests'}
            </button>

            <button
              onClick={submitSolution}
              disabled={submitting || !candidateEmail}
              style={{
                padding: '12px 24px',
                background: submitting || !candidateEmail ? '#9ca3af' : '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting || !candidateEmail ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? '⏳ Submitting...' : '✅ Submit Solution'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, maxWidth: 1400, margin: '0 auto', width: '100%', padding: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Problem Description */}
          <div style={{
            background: '#fff',
            padding: 32,
            borderRadius: 12,
            border: '2px solid #e5e7eb',
            maxHeight: 'calc(100vh - 240px)',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: '#111' }}>
              Problem Description
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', whiteSpace: 'pre-wrap', marginBottom: 24 }}>
              {challenge.description}
            </p>

            {challenge.examples && challenge.examples.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111' }}>Examples</h3>
                {challenge.examples.map((example, idx) => (
                  <div key={idx} style={{
                    background: '#f9fafb',
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 16,
                    fontFamily: 'monospace',
                    fontSize: 14
                  }}>
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: '#6b7280' }}>Input:</strong>{' '}
                      <code style={{ color: '#111' }}>{JSON.stringify(example.input)}</code>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: '#6b7280' }}>Output:</strong>{' '}
                      <code style={{ color: '#111' }}>{JSON.stringify(example.output)}</code>
                    </div>
                    {example.explanation && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb', color: '#6b7280', fontSize: 13 }}>
                        {example.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {challenge.constraints && challenge.constraints.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111' }}>Constraints</h3>
                <ul style={{ paddingLeft: 24, color: '#374151', lineHeight: 1.8 }}>
                  {challenge.constraints.map((constraint, idx) => (
                    <li key={idx} style={{ marginBottom: 8 }}>{constraint}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Code Editor */}
          <div style={{
            background: '#fff',
            padding: 32,
            borderRadius: 12,
            border: '2px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: '#111' }}>
              Your Solution
            </h2>
            
            <div style={{
              flex: 1,
              border: '2px solid #e5e7eb',
              borderRadius: 8,
              overflow: 'hidden',
              marginBottom: 20
            }}>
              <Editor
                height="500px"
                language={challenge.language}
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false
                }}
              />
            </div>

            {/* Test Results (Web Terminal) */}
            {testResults && (
              <div style={{
                marginTop: 20,
                padding: 16,
                background: '#1e293b', // Terminal background
                color: '#e2e8f0', // Terminal text color
                border: '2px solid #e5e7eb',
                borderRadius: 12,
                maxHeight: 400,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: 14,
                marginBottom: 20
              }}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: testResults.all_passed ? '#10b981' : '#f59e0b', fontSize: 16 }}>
                  {testResults.all_passed ? '✅' : '⚠️'} Tests complete: {testResults.passed || 0}/{testResults.total || testResults.results?.length || 0} passed
                </div>
                
                {testResults.execution_time_ms && (
                  <div style={{ color: '#94a3b8', marginBottom: 16 }}>
                    Execution Time: {testResults.execution_time_ms.toFixed(2)}ms
                  </div>
                )}

                {testResults.compilation_errors && testResults.compilation_errors.length > 0 && (
                  <div style={{ color: '#ef4444', marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>Compilation/Execution Errors:</div>
                    {testResults.compilation_errors.map((err, idx) => (
                      <div key={idx} style={{ marginLeft: 16, marginTop: 8 }}>
                        {err.error}
                      </div>
                    ))}
                  </div>
                )}

                {testResults.results?.map((result, idx) => (
                  <div key={idx} style={{
                    marginBottom: 16,
                    padding: 12,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 6,
                    borderLeft: `4px solid ${result.passed ? '#10b981' : '#ef4444'}`
                  }}>
                    <div style={{ color: result.passed ? '#10b981' : '#ef4444', fontWeight: 600, marginBottom: 8 }}>
                      Test {idx + 1}: {result.passed ? 'Passed' : 'Failed'}
                    </div>
                    <div style={{ marginLeft: 16 }}>
                      <div style={{ color: '#cbd5e1', marginBottom: 4 }}>Input: {result.input}</div>
                      <div style={{ color: '#cbd5e1', marginBottom: 4 }}>Expected: {result.expected}</div>
                      {!result.passed && result.actual && result.actual !== 'None' && (
                        <div style={{ color: '#f87171', marginBottom: 4 }}>Actual: {result.actual}</div>
                      )}
                      {result.error && (
                        <div style={{ color: '#ef4444', marginTop: 8 }}>
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Submission Result */}
            {result && result.score_breakdown && (
              <div style={{
                padding: 24,
                background: '#dbeafe',
                border: '3px solid #3b82f6',
                borderRadius: 12
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1e40af', marginBottom: 16 }}>
                  ✅ Solution Submitted!
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 14, color: '#374151' }}>
                  <div>
                    <strong>Final Score:</strong> {result.score}%
                  </div>
                  <div>
                    <strong>Level:</strong> {result.performance_level}
                  </div>
                  <div>
                    <strong>Correctness:</strong> {result.score_breakdown.correctness.score}%
                  </div>
                  <div>
                    <strong>Efficiency:</strong> {result.score_breakdown.efficiency.score}%
                  </div>
                  <div>
                    <strong>Code Quality:</strong> {result.score_breakdown.code_quality.score}%
                  </div>
                  <div>
                    <strong>Problem Solving:</strong> {result.score_breakdown.problem_solving.score}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}