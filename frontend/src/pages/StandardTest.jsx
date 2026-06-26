import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function TakeAssessmentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get("id");
  
  // ✅ NEW: Submission blocking state
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState("");
  const [showEmailScreen, setShowEmailScreen] = useState(false);
  
  const [assessment, setAssessment] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [started, setStarted] = useState(false);

  // Adaptive Mode States
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [askedQuestions, setAskedQuestions] = useState([]);

  // ✅ FIXED: Track violations as object, not array
  const [violations, setViolations] = useState({
    tab_switches: 0,
    window_blurs: 0,
    copy_attempts: 0,
    paste_attempts: 0,
    right_clicks: 0
  });
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationMessage, setViolationMessage] = useState("");

  // ✅ NEW: Check submission status on component mount
  useEffect(() => {
    if (!assessmentId) return;
    
    const init = async () => {
      // Check if email is in URL
      const urlEmail = searchParams.get("email");
      if (urlEmail) {
        const isSubmitted = await checkSubmissionStatus(urlEmail);
        if (!isSubmitted) {
          setShowEmailScreen(true);
        }
      } else {
        setShowEmailScreen(true);
      }
    };
    
    init();
  }, [assessmentId, searchParams]);

  // ✅ NEW: Check submission status
  const checkSubmissionStatus = async (emailToCheck) => {
    try {
      // Check localStorage first
      const storedBlock = localStorage.getItem(`submitted_mcq_${assessmentId}_${emailToCheck}`);
      if (storedBlock === 'true') {
        setAlreadySubmitted(true);
        setCandidateEmail(emailToCheck);
        return true;
      }

      // Check with server
      try {
        const response = await fetch(`http://localhost:8000/api/mcq/check-submission/${assessmentId}/${encodeURIComponent(emailToCheck)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.submitted) {
            setAlreadySubmitted(true);
            setCandidateEmail(emailToCheck);
            localStorage.setItem(`submitted_mcq_${assessmentId}_${emailToCheck}`, 'true');
            return true;
          }
        }
      } catch (apiError) {
        console.log('Submission check API error:', apiError.message);
        // Continue with localStorage only
      }
    } catch (err) {
      console.error('Failed to check submission status:', err);
    }
    return false;
  };

  // ✅ HIDE NAVIGATION DURING TEST
  useEffect(() => {
    const nav = document.querySelector('nav');
    const header = document.querySelector('header');
    
    if (nav) nav.style.display = 'none';
    if (header) header.style.display = 'none';
    
    return () => {
      if (nav) nav.style.display = '';
      if (header) header.style.display = '';
    };
  }, []);

  // ✅ NEW: Enhanced email validation
  const validateEmail = (emailInput) => {
    if (!emailInput) {
      setEmailError("⚠️ Please enter your email address");
      return false;
    }
    
    const trimmedEmail = emailInput.trim();
    
    if (!trimmedEmail.includes('@')) {
      setEmailError("⚠️ Email must contain @ symbol (e.g., name@company.com)");
      return false;
    }
    
    const parts = trimmedEmail.split('@');
    if (parts.length !== 2 || !parts[1]) {
      setEmailError("⚠️ Please enter a valid domain after @ (e.g., name@company.com)");
      return false;
    }
    
    if (!parts[1].includes('.')) {
      setEmailError("⚠️ Domain must have an extension (e.g., name@company.com)");
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError("⚠️ Invalid email format. Please use: name@company.com");
      return false;
    }
    
    return true;
  };

  // ✅ UPDATED: Start assessment with email validation and submission check
  const startAssessment = async (emailInput) => {
    if (!emailInput) {
      alert("Email is required");
      return;
    }
    
    // Validate email
    if (!validateEmail(emailInput)) {
      return;
    }
    
    const trimmedEmail = emailInput.trim();
    
    // ✅ NEW: Check if already submitted
    const isSubmitted = await checkSubmissionStatus(trimmedEmail);
    if (isSubmitted) {
      setAlreadySubmitted(true);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/api/mcq/start-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id: assessmentId,
          candidate_email: trimmedEmail
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to start assessment");
      }

      const data = await res.json();
      const qs = data.assessment?.questions;
      const hasQuestions = Array.isArray(qs) && qs.length > 0;
      const isAdaptiveAssessment = Boolean(data.assessment?.is_adaptive);

      if (!hasQuestions) {
        setLoading(false);
        if (isAdaptiveAssessment) {
          navigate(
            `/adaptive-test?id=${encodeURIComponent(assessmentId)}&email=${encodeURIComponent(trimmedEmail)}`
          );
          return;
        }
        alert(
          "This assessment has no questions in the database yet (for example an unpublished or demo row with an empty question list). Ask HR to regenerate the MCQs or assign a different assessment."
        );
        return;
      }

      setAssessment(data.assessment);
      setSessionId(data.session_id);
      setTimeRemaining(data.time_remaining || data.duration_seconds || 0);
      setAdaptiveMode(data.adaptive || false);
      setCandidateEmail(trimmedEmail);
      
      if (data.adaptive && data.question) {
        setAskedQuestions([data.question]);
      }
      
      setLoading(false);
      setStarted(true);
      setShowEmailScreen(false);
    } catch (err) {
      console.error("Failed to start assessment:", err);
      alert(err.message || "Failed to start assessment. Please try again.");
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!started || submitted || !assessment) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, submitted, assessment]);

  // ✅ Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submitted) {
        setViolations(prev => ({
          ...prev,
          tab_switches: prev.tab_switches + 1
        }));
        setViolationMessage("Tab switching detected!");
        setShowViolationWarning(true);
        setTimeout(() => setShowViolationWarning(false), 3000);
        console.warn("⚠️ TAB SWITCH DETECTED!");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [submitted]);

  // ✅ Window blur detection
  useEffect(() => {
    const handleBlur = () => {
      if (!submitted) {
        setViolations(prev => ({
          ...prev,
          window_blurs: prev.window_blurs + 1
        }));
        console.warn("⚠️ WINDOW BLUR DETECTED!");
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [submitted]);

  // ✅ FIXED: Disable copy/paste and right-click - UPDATE VIOLATIONS AS OBJECT
  useEffect(() => {
    const preventCopy = (e) => { 
      e.preventDefault();
      setViolations(prev => ({
        ...prev,
        copy_attempts: prev.copy_attempts + 1
      }));
      return false;
    };
    
    const preventPaste = (e) => { 
      e.preventDefault();
      setViolations(prev => ({
        ...prev,
        paste_attempts: prev.paste_attempts + 1
      }));
      return false;
    };
    
    const preventRightClick = (e) => { 
      e.preventDefault();
      setViolations(prev => ({
        ...prev,
        right_clicks: prev.right_clicks + 1
      }));
      return false;
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('paste', preventPaste);
    document.addEventListener('contextmenu', preventRightClick);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('paste', preventPaste);
      document.removeEventListener('contextmenu', preventRightClick);
    };
  }, [submitted]);

  const fetchNextQuestion = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/mcq/adaptive/next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          current_score: currentScore,
          questions_answered: askedQuestions.length,
          already_asked: askedQuestions.map(q => q.question_id)
        })
      });

      const data = await res.json();

      if (data.completed) {
        handleSubmit();
      } else {
        setAskedQuestions(prev => [...prev, data.question]);
        setCurrentQuestion(askedQuestions.length);
      }
    } catch (err) {
      console.error("Failed to fetch next question:", err);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionIndex, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleAnswerAndNext = async (questionIndex, answer) => {
    if (!assessment || !assessment.questions) return;
    
    handleAnswerSelect(questionIndex, answer);

    // calculate current score
    const correct = Object.entries(answers).filter(([idx, ans]) => {
      const q = assessment.questions[idx];
      return ans === q.correct_answer;
    }).length;

    const newScore = (correct / (questionIndex + 1)) * 100;
    setCurrentScore(newScore);

    // fetch next question if in adaptive mode
    if (adaptiveMode) {
      await fetchNextQuestion();
    }
  };

  const handleSubmit = async () => {
    if (submitted || !assessment || !assessment.questions) return;
    
    try {
      const res = await fetch("http://localhost:8000/api/mcq/submit-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          answers: answers,
          violations: violations  // ✅ Send as object
        })
      });
      
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
      
      // ✅ NEW: Store submission status
      localStorage.setItem(`submitted_mcq_${assessmentId}_${candidateEmail}`, 'true');
      setAlreadySubmitted(true);
      
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    } catch (err) {
      console.error("Failed to submit assessment:", err);
      alert("Submission failed. Please try again.");
    }
  };

  // ✅ NEW: Show "Already Submitted" screen
  if (alreadySubmitted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}>
        <div style={{
          background: '#fff',
          padding: 48,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxWidth: 600,
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111', marginBottom: 16 }}>
            Assessment Already Submitted
          </h1>
          <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 8 }}>
            You have already completed this assessment.
          </p>
          <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 32 }}>
            Email: {candidateEmail}
          </p>
          
          {result && (
            <div style={{
              marginTop: 16,
              padding: 24,
              background: result.score >= 60 ? '#dcfce7' : '#fee2e2',
              border: `3px solid ${result.score >= 60 ? '#10b981' : '#ef4444'}`,
              borderRadius: 12
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: result.score >= 60 ? '#166534' : '#991b1b' }}>
                Score: {result.score}%
              </div>
              <div style={{ fontSize: 16, color: '#374151' }}>
                {result.correct} out of {result.total} questions correct
              </div>
            </div>
          )}
          
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              The hiring team will review your results and contact you if needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Show email input screen if not started
  if (showEmailScreen && !started && !loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}>
        <div style={{
          background: '#fff',
          padding: 48,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxWidth: 500,
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 8 }}>
              Standard Assessment
            </h1>
            <p style={{ color: '#666', fontSize: 14 }}>
              Enter your email to begin the assessment
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              📧 Your Email Address
            </label>
            <input
              type="email"
              defaultValue=""
              onChange={(e) => {
                setCandidateEmail(e.target.value);
                setEmailError("");
              }}
              onKeyPress={(e) => e.key === 'Enter' && startAssessment(e.target.value)}
              placeholder="your.email@example.com"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: emailError ? '2px solid #ef4444' : '2px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 16,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = emailError ? '#ef4444' : '#4f46e5'}
              onBlur={(e) => e.target.style.borderColor = emailError ? '#ef4444' : '#e5e7eb'}
            />
            {emailError && (
              <div style={{
                marginTop: 8,
                padding: 12,
                background: '#fee2e2',
                border: '1px solid #ef4444',
                borderRadius: 6,
                color: '#991b1b',
                fontSize: 14,
                fontWeight: 500
              }}>
                {emailError}
              </div>
            )}
          </div>

          <button
            onClick={() => startAssessment(candidateEmail)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#9ca3af' : '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = '#4338ca')}
            onMouseLeave={(e) => !loading && (e.target.style.background = loading ? '#9ca3af' : '#4f46e5')}
          >
            {loading ? 'Starting...' : '🚀 Start Assessment'}
          </button>

          <div style={{
            marginTop: 24,
            padding: 16,
            background: '#fef3c7',
            border: '2px solid #fbbf24',
            borderRadius: 8,
            fontSize: 13,
            color: '#856404'
          }}>
            <strong>⚠️ Assessment Rules:</strong>
            <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
              <li>Timer starts immediately</li>
              <li>Tab switching is monitored</li>
              <li>Copy/paste is disabled</li>
              <li>Right-click is disabled</li>
              <li><strong>Each email can only submit once</strong></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Show loading screen when starting assessment
  if (loading) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 16 }}>⏳ Starting assessment...</div>
          <div style={{ color: '#6b7280' }}>Please wait while we load your assessment</div>
        </div>
      </div>
    );
  }

  // If no assessment ID
  if (!assessmentId) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 16 }}>❌ Invalid Assessment</div>
          <div style={{ color: '#6b7280' }}>No assessment ID provided in the URL</div>
        </div>
      </div>
    );
  }

  // ✅ FIXED: Show loading if assessment is null
  if (!assessment) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 16 }}>⏳ Loading assessment...</div>
          <div style={{ color: '#6b7280' }}>Please wait while we prepare your test</div>
        </div>
      </div>
    );
  }

  // ✅ FIXED: Completion screen WITHOUT navigation access
  if (submitted && result) {
    // ✅ Calculate total violations correctly
    const totalViolations = Object.values(violations).reduce((sum, count) => sum + count, 0);
    
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          maxWidth: 700,
          width: '100%',
          background: '#fff',
          padding: 48,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>
              {result.score >= 60 ? '🎉' : '📚'}
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: '#111', marginBottom: 8 }}>
              Assessment Complete!
            </h2>
            <p style={{ color: '#666', fontSize: 16 }}>
              Your assessment has been submitted successfully
            </p>
          </div>

          {/* Score Display */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: 32,
            borderRadius: 12,
            textAlign: 'center',
            marginBottom: 32
          }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 }}>
              Your Score
            </div>
            <div style={{ color: '#fff', fontSize: 64, fontWeight: 700, marginBottom: 8 }}>
              {result.score}%
            </div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18 }}>
              {result.correct} out of {result.total} correct
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 16,
            marginBottom: 32 
          }}>
            <div style={{
              background: '#f9fafb',
              padding: 20,
              borderRadius: 12,
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Grade</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4f46e5' }}>
                {result.grade}
              </div>
            </div>
            
            <div style={{
              background: '#f9fafb',
              padding: 20,
              borderRadius: 12,
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Status</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: result.flagged ? '#dc2626' : '#10b981' }}>
                {result.flagged ? '⚠️ Flagged' : '✅ Clean'}
              </div>
            </div>
            
            <div style={{
              background: '#f9fafb',
              padding: 20,
              borderRadius: 12,
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Correct</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>
                {result.correct}
              </div>
            </div>
            
            <div style={{
              background: '#f9fafb',
              padding: 20,
              borderRadius: 12,
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Violations</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>
                {totalViolations}
              </div>
            </div>
          </div>

          {/* Violation Breakdown */}
          {totalViolations > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '2px solid #fecaca',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24
            }}>
              <h4 style={{ 
                margin: 0, 
                marginBottom: 12, 
                fontSize: 14, 
                fontWeight: 600,
                color: '#991b1b'
              }}>
                ⚠️ Violation Breakdown
              </h4>
              <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                {violations.tab_switches > 0 && (
                  <div style={{ color: '#991b1b' }}>
                    • Tab Switches: <strong>{violations.tab_switches}</strong>
                  </div>
                )}
                {violations.window_blurs > 0 && (
                  <div style={{ color: '#991b1b' }}>
                    • Window Blurs: <strong>{violations.window_blurs}</strong>
                  </div>
                )}
                {violations.copy_attempts > 0 && (
                  <div style={{ color: '#991b1b' }}>
                    • Copy Attempts: <strong>{violations.copy_attempts}</strong>
                  </div>
                )}
                {violations.paste_attempts > 0 && (
                  <div style={{ color: '#991b1b' }}>
                    • Paste Attempts: <strong>{violations.paste_attempts}</strong>
                  </div>
                )}
                {violations.right_clicks > 0 && (
                  <div style={{ color: '#991b1b' }}>
                    • Right Clicks: <strong>{violations.right_clicks}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message */}
          <div style={{
            textAlign: 'center',
            padding: 24,
            background: '#f9fafb',
            borderRadius: 12,
            border: '1px solid #e5e7eb'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: 14, lineHeight: 1.6 }}>
              Your results have been recorded and sent to the HR team. 
              They will review your performance and contact you soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const question = assessment?.questions?.[currentQuestion];

  // ✅ FIXED: Calculate total violations correctly for header
  const totalViolations = Object.values(violations).reduce((sum, count) => sum + count, 0);

  // ✅ FIXED: Add null check for assessment.questions
  if (!question || !assessment.questions) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 16 }}>❌ Error Loading Questions</div>
          <div style={{ color: '#6b7280' }}>Unable to load assessment questions. Please try again.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight: '100vh', background: '#f9fafb'}}>
      {/* Timer Header */}
      <div style={{
        background: timeRemaining < 300 ? '#fee2e2' : '#fff',
        borderBottom: '2px solid #e5e7eb',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div>
          <h3 style={{margin: 0, fontSize: 18}}>
            Question {currentQuestion + 1} of {assessment?.questions?.length || 0}
          </h3>
          {/* ✅ FIXED: Use totalViolations variable */}
          {totalViolations > 0 && (
            <div style={{
              marginTop: 4,
              fontSize: 12,
              color: '#dc2626',
              fontWeight: 600
            }}>
              ⚠️ {totalViolations} violation{totalViolations > 1 ? 's' : ''} detected
            </div>
          )}
        </div>
        <div style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: timeRemaining < 300 ? '#dc2626' : '#4f46e5'
        }}>
          ⏱️ {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Violation Warning Popup */}
      {showViolationWarning && (
        <div style={{
          position: 'fixed',
          top: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fee2e2',
          color: '#991b1b',
          padding: '16px 24px',
          borderRadius: 8,
          border: '2px solid #fca5a5',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1000,
          fontSize: 14,
          fontWeight: 600
        }}>
          ⚠️ {violationMessage}
        </div>
      )}

      {/* Question Content */}
      <div style={{padding: 40, maxWidth: 900, margin: '0 auto'}}>
        <div style={{background: '#fff', padding: 40, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)'}}>
          <h2 style={{fontSize: 24, marginBottom: 30, lineHeight: 1.5}}>
            {question?.question || "Question not available"}
          </h2>

          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            {question?.options?.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(currentQuestion, opt.label)}
                style={{
                  padding: 20,
                  background: answers[currentQuestion] === opt.label ? '#e0e7ff' : '#f9fafb',
                  border: answers[currentQuestion] === opt.label ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 16,
                  transition: 'all 0.2s'
                }}
              >
                <strong style={{marginRight: 12, color: '#4f46e5'}}>{opt.label})</strong>
                {opt.text}
              </button>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 32,
            gap: 16
          }}>
            <button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              style={{
                padding: '12px 24px',
                background: currentQuestion === 0 ? '#e5e7eb' : '#fff',
                color: currentQuestion === 0 ? '#9ca3af' : '#4f46e5',
                border: '2px solid #e5e7eb',
                borderRadius: 8,
                cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                fontSize: 16,
                fontWeight: 600
              }}
            >
              ← Previous
            </button>

            {currentQuestion === (assessment.questions?.length || 0) - 1 ? (
              <button
                onClick={handleSubmit}
                style={{
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                Submit Assessment ✓
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(prev => prev + 1)}
                style={{
                  padding: '12px 24px',
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 600
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}