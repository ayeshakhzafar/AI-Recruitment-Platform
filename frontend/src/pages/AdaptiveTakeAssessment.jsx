// ============================================
// FINAL FIXED ADAPTIVE ASSESSMENT - WITH VIOLATION TRACKING!
// Professional assessment mode with complete anti-cheating
// Save as: frontend/src/pages/AdaptiveTakeAssessment.jsx
// ============================================

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// ✅ TIMER FIX: Format seconds to MM:SS
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function AdaptiveTakeAssessment() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("id");
  const prefilledEmail = searchParams.get("email");
  
  // ✅ NEW: Submission blocking state
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  
  const [started, setStarted] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  
  // Adaptive test state
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [difficulty, setDifficulty] = useState("medium");
  
  // Completion state
  const [completed, setCompleted] = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  
  // Performance tracking
  const [recentAccuracy, setRecentAccuracy] = useState(0.5);
  
  const [loading, setLoading] = useState(false);
  
  // ✅ TIMER STATE - Track elapsed time
  const [timeElapsed, setTimeElapsed] = useState(0);

  // ✅ VIOLATION TRACKING STATE
  // ✅ IMPROVED: Track each violation type separately
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
    
    // Check localStorage first
    const checkLocalStorage = () => {
      if (!email && prefilledEmail) {
        const storedBlock = localStorage.getItem(`submitted_mcq_${assessmentId}_${prefilledEmail}`);
        if (storedBlock === 'true') {
          setAlreadySubmitted(true);
          setEmail(prefilledEmail);
        }
      }
    };
    
    checkLocalStorage();
  }, [assessmentId, prefilledEmail]);

  // Fetch assessment if ID provided in URL
  useEffect(() => {
    const fetchAssessment = async () => {
      if (assessmentId) {
        setLoadingAssessment(true);
        try {
          const res = await fetch(`http://localhost:8000/api/mcq/assessment/${assessmentId}`);
          if (res.ok) {
            const data = await res.json();
            setRole(data.role || "");
            const planned =
              data.num_questions > 0
                ? data.num_questions
                : (Array.isArray(data.questions) ? data.questions.length : 0);
            if (planned > 0) {
              setTotalQuestions(planned);
            }
            console.log("✅ Assessment loaded:", data.role, "questions:", planned || "default");
          }
        } catch (err) {
          console.error("Failed to fetch assessment:", err);
        } finally {
          setLoadingAssessment(false);
        }
      }
    };
    fetchAssessment();
  }, [assessmentId]);

  // Prefill email from URL parameter
  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  // ✅ TAB SWITCH DETECTION with debouncing
  useEffect(() => {
    if (!started || completed) return;
    
    let blurTimeout = null;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations(prev => ({
          ...prev,
          tab_switches: prev.tab_switches + 1
        }));
        
        console.warn("⚠️ TAB SWITCH DETECTED!");
        
        // Clear any pending blur to prevent double-counting
        if (blurTimeout) {
          clearTimeout(blurTimeout);
          blurTimeout = null;
        }
        
        // Show warning modal
        setViolationMessage("Tab switching detected!");
        setShowViolationWarning(true);
        setTimeout(() => setShowViolationWarning(false), 3000);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (blurTimeout) clearTimeout(blurTimeout);
    };
  }, [started, completed]);

  // ✅ WINDOW BLUR DETECTION with delay to prevent double-counting
  useEffect(() => {
    if (!started || completed) return;
    
    let blurTimeout = null;
    
    const handleBlur = () => {
      // Only count blur if NOT a tab switch (with 200ms delay)
      blurTimeout = setTimeout(() => {
        setViolations(prev => ({
          ...prev,
          window_blurs: prev.window_blurs + 1
        }));
        console.warn("⚠️ WINDOW BLUR DETECTED!");
      }, 200);
    };
    
    const handleFocus = () => {
      // Clear pending blur if window regains focus quickly
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
    };
    
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      if (blurTimeout) clearTimeout(blurTimeout);
    };
  }, [started, completed]);

  // ✅ RIGHT-CLICK PREVENTION
  useEffect(() => {
    if (!started || completed) return;
    
    const handleContextMenu = (e) => {
      e.preventDefault();
      
      setViolations(prev => ({
        ...prev,
        right_clicks: prev.right_clicks + 1
      }));
      
      console.warn("⚠️ RIGHT-CLICK DETECTED!");
      
      setViolationMessage("Right-clicking is disabled!");
      setShowViolationWarning(true);
      setTimeout(() => setShowViolationWarning(false), 2000);
      
      return false;
    };
    
    document.addEventListener("contextmenu", handleContextMenu);
    
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [started, completed]);

  // ✅ COPY/PASTE DETECTION
  useEffect(() => {
    if (!started || completed) return;
    
    const handleCopy = (e) => {
      e.preventDefault();
      
      setViolations(prev => ({
        ...prev,
        copy_attempts: prev.copy_attempts + 1
      }));
      
      console.warn("⚠️ COPY DETECTED!");
      
      setViolationMessage("Copying is not allowed!");
      setShowViolationWarning(true);
      setTimeout(() => setShowViolationWarning(false), 2000);
    };
    
    const handlePaste = (e) => {
      e.preventDefault();
      
      setViolations(prev => ({
        ...prev,
        paste_attempts: prev.paste_attempts + 1
      }));
      
      console.warn("⚠️ PASTE DETECTED!");
      
      setViolationMessage("Pasting is not allowed!");
      setShowViolationWarning(true);
      setTimeout(() => setShowViolationWarning(false), 2000);
    };
    
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [started, completed]);


  // ✅ TIMER - Count elapsed time during test
  useEffect(() => {
    if (!started || completed) return;
    
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [started, completed]);

  // ✅ HIDE NAVIGATION DURING TEST
  useEffect(() => {
    // Hide navigation elements
    const nav = document.querySelector('nav');
    const header = document.querySelector('header');
    
    if (nav) nav.style.display = 'none';
    if (header) header.style.display = 'none';
    
    // Restore on unmount
    return () => {
      if (nav) nav.style.display = '';
      if (header) header.style.display = '';
    };
  }, []);

  // ✅ NEW: Enhanced email validation function
  const validateEmail = (emailToValidate) => {
    if (!emailToValidate) {
      setEmailError("⚠️ Please enter your email address");
      return false;
    }
    
    const trimmedEmail = emailToValidate.trim();
    
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

  // ✅ NEW: Check submission status with server
  const checkSubmissionStatus = async (emailToCheck) => {
    try {
      // Check localStorage first
      const storedBlock = localStorage.getItem(`submitted_mcq_${assessmentId}_${emailToCheck}`);
      if (storedBlock === 'true') {
        setAlreadySubmitted(true);
        return true;
      }

      // Check with server
      const response = await fetch(`http://localhost:8000/api/mcq/check-submission/${assessmentId}/${encodeURIComponent(emailToCheck)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.submitted) {
          setAlreadySubmitted(true);
          localStorage.setItem(`submitted_mcq_${assessmentId}_${emailToCheck}`, 'true');
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to check submission status:', err);
    }
    return false;
  };

  // ✅ UPDATED: Start adaptive assessment with submission check
  const handleStart = async (e) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim();
    
    // Validate email
    if (!validateEmail(trimmedEmail)) {
      return;
    }

    if (!role) {
      alert("Please enter a role");
      return;
    }

    // ✅ NEW: Check if already submitted
    const isSubmitted = await checkSubmissionStatus(trimmedEmail);
    if (isSubmitted) {
      setAlreadySubmitted(true);
      return;
    }

    try {
      setLoading(true);
      setEmailError("");
      
      // Question cap: num_questions from HR (adaptive link), else baked questions length
      let questionCount = totalQuestions || 20;
      if (assessmentId) {
        try {
          const assessRes = await fetch(`http://localhost:8000/api/mcq/assessment/${assessmentId}`);
          if (assessRes.ok) {
            const assessData = await assessRes.json();
            const fromList = Array.isArray(assessData.questions)
              ? assessData.questions.length
              : 0;
            const fromMeta = assessData.num_questions > 0 ? assessData.num_questions : 0;
            questionCount = fromList || fromMeta || questionCount;
            console.log(`✅ Using max ${questionCount} questions from assessment`);
          }
        } catch (err) {
          console.warn("Could not fetch assessment, using default question count");
        }
      }
      
      const res = await fetch("http://localhost:8000/api/mcq/adaptive/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: role.trim(),
          candidate_email: trimmedEmail,
          max_questions: questionCount
        })
      });
      
      if (!res.ok) {
        throw new Error("Failed to start assessment");
      }
      
      const data = await res.json();
      
      setSessionId(data.session_id);
      setCurrentQuestion(data.question);
      setQuestionNumber(data.question_number);
      setTotalQuestions(data.total_questions);
      setDifficulty(data.difficulty);
      setStarted(true);
      
    } catch (err) {
      console.error("Failed to start assessment:", err);
      alert("Failed to start assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Submit with violations
  const handleSubmitAnswer = async () => {
    if (!selectedAnswer) {
      alert("Please select an answer");
      return;
    }

    if (loading) {
      console.log("⚠️ Already submitting...");
      return;
    }

    try {
      setLoading(true);
      
      console.log(`📤 Submitting Q${questionNumber}: ${currentQuestion.question_id} → Answer: ${selectedAnswer}`);
      console.log(`⚠️ Sending ${Object.values(violations).reduce((a, b) => a + b, 0)} violations to backend`);
      
      // ✅ SEND VIOLATIONS WITH ANSWER
      const res = await fetch("http://localhost:8000/api/mcq/adaptive/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: currentQuestion.question_id,
          answer: selectedAnswer,
          violations: violations  // ✅ INCLUDE VIOLATIONS
        })
      });
      
      if (!res.ok) {
        throw new Error("Failed to submit answer");
      }
      
      const data = await res.json();
      
      // ✅ DON'T CLEAR VIOLATIONS - Keep them cumulative for final display
      // Violations are tracked in backend, but we keep them here for UI
      
      console.log(`📥 Response: ${data.completed ? "COMPLETED" : `Next Q${data.question_number}`}`);
      
      // ✅ Check if test is complete
      if (data.completed) {
        console.log("🎉 Test completed!");
        setCurrentQuestion(null);
        setCompleted(true);
        // ✅ ADD VIOLATIONS TO FINAL RESULT
        setFinalResult({
          ...data,
          violations: violations
        });
        setSubmissionResult(data);
        // ✅ NEW: Store submission status
        localStorage.setItem(`submitted_mcq_${assessmentId}_${email}`, 'true');
        setAlreadySubmitted(true);
        setLoading(false);
        return;
      }
      
      // ✅ Move to next question immediately
      const nextQuestionData = data.next_question;
      
      if (!nextQuestionData || !nextQuestionData.question_id) {
        console.error("❌ Invalid next question");
        alert("Error loading next question. Please refresh.");
        setLoading(false);
        return;
      }
      
      console.log(`✅ Moving to Q${data.question_number}: ${nextQuestionData.question_id}`);
      console.log(`📊 New difficulty: ${data.current_difficulty}`);
      
      // ✅ Update state instantly with correct difficulty
      setCurrentQuestion(nextQuestionData);
      setQuestionNumber(data.question_number);
      setDifficulty(data.current_difficulty); // ✅ USE THIS, NOT nextQuestionData.difficulty
      setSelectedAnswer(null);
      setRecentAccuracy(data.performance?.recent_accuracy || 0.5);
      setLoading(false);
      
    } catch (err) {
      console.error("❌ ERROR:", err);
      alert("Failed to submit answer. Please try again.");
      setLoading(false);
    }
  };

  
  const getDifficultyColor = (diff) => {
    const colors = {
      easy: "#10b981",
      medium: "#f59e0b",
      hard: "#ef4444"
    };
    return colors[diff] || "#6b7280";
  };

  const getDifficultyIcon = (diff) => {
    const icons = {
      easy: "🟢",
      medium: "🟡",
      hard: "🔴"
    };
    return icons[diff] || "⚪";
  };

  // ✅ NEW: Show "Already Submitted" screen
  if (alreadySubmitted && !started) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }}>
        <div style={{
          background: "#fff",
          padding: 48,
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxWidth: 600,
          width: "100%",
          textAlign: "center"
        }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#111", marginBottom: 16 }}>
            Assessment Already Submitted
          </h1>
          <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 8 }}>
            You have already completed this assessment.
          </p>
          <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 32 }}>
            Email: {email}
          </p>
          
          {submissionResult && (
            <div style={{
              marginTop: 16,
              padding: 24,
              background: submissionResult.score >= 60 ? "#dcfce7" : "#fee2e2",
              border: `3px solid ${submissionResult.score >= 60 ? "#10b981" : "#ef4444"}`,
              borderRadius: 12
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: submissionResult.score >= 60 ? "#166534" : "#991b1b" }}>
                Score: {submissionResult.score}%
              </div>
              <div style={{ fontSize: 16, color: "#374151" }}>
                {submissionResult.correct} out of {submissionResult.total} questions correct
              </div>
            </div>
          )}
          
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: 14, color: "#6b7280" }}>
              The hiring team will review your results and contact you if needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }}>
        <div style={{
          background: "#fff",
          padding: 48,
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxWidth: 500,
          width: "100%"
        }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111", marginBottom: 8 }}>
              Adaptive Assessment
            </h1>
            <p style={{ color: "#666", fontSize: 14 }}>
              Questions adapt to your skill level in real-time
            </p>
          </div>

          {loadingAssessment && (
            <div style={{
              padding: 16,
              background: "#f0f9ff",
              borderRadius: 8,
              textAlign: "center",
              marginBottom: 24,
              color: "#0369a1"
            }}>
              Loading assessment details...
            </div>
          )}

          <form onSubmit={handleStart}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
                Your Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                required
                placeholder="candidate@example.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: `2px solid ${emailError ? "#ef4444" : "#e5e7eb"}`,
                  borderRadius: 8,
                  fontSize: 16,
                  fontFamily: "inherit"
                }}
              />
              {emailError && (
                <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                  {emailError}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
                Role/Position *
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                placeholder="e.g., Software Engineer"
                disabled={loadingAssessment}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 16,
                  fontFamily: "inherit",
                  background: loadingAssessment ? "#f9fafb" : "#fff",
                  cursor: loadingAssessment ? "not-allowed" : "text"
                }}
              />
              {role && (
                <div style={{ 
                  fontSize: 12, 
                  color: "#10b981", 
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}>
                  ✓ Role loaded from assessment
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || loadingAssessment}
              style={{
                width: "100%",
                padding: "14px",
                background: (loading || loadingAssessment) ? "#9ca3af" : "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: (loading || loadingAssessment) ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Starting..." : "🚀 Start Adaptive Test"}
            </button>
          </form>

          {/* ✅ UPDATED WARNING BOX */}
          <div style={{
            marginTop: 24,
            padding: 16,
            background: "#fff3cd",
            border: "2px solid #ffc107",
            borderRadius: 8,
            fontSize: 13,
            color: "#856404"
          }}>
            <strong>⚠️ Professional Assessment Mode:</strong>
            <ul style={{ margin: "8px 0 0 20px", padding: 0 }}>
              <li>20 questions total</li>
              <li>Questions adapt to your performance</li>
              <li><strong>NO feedback during test</strong></li>
              <li>Results shown at completion</li>
              <li>All questions must be answered</li>
              <li><strong style={{ color: "#dc2626" }}>⚠️ Tab switching is monitored</strong></li>
              <li><strong style={{ color: "#dc2626" }}>⚠️ Stay focused on this window</strong></li>
              <li><strong style={{ color: "#dc2626" }}>⚠️ Each email can only submit once</strong></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ✅ VIOLATION WARNING MODAL
  {showViolationWarning && (
    <div style={{
      position: "fixed",
      top: 20,
      right: 20,
      background: "#fee2e2",
      border: "3px solid #dc2626",
      borderRadius: 12,
      padding: 20,
      boxShadow: "0 10px 40px rgba(220, 38, 38, 0.3)",
      zIndex: 9999
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12
      }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div>
          <div style={{ 
            fontWeight: 700, 
            color: "#991b1b",
            fontSize: 16,
            marginBottom: 4
          }}>
            Violation Detected!
          </div>
          <div style={{ color: "#7f1d1d", fontSize: 14 }}>
            {violationMessage || "Please stay on this page"}
          </div>
        </div>
      </div>
    </div>
  )}

  // Completion screen
  if (completed && finalResult) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          background: "#fff",
          padding: 48,
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxWidth: 700,
          width: "100%"
        }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>
              {finalResult.score >= 60 ? "🎉" : "📚"}
            </div>
            
            <h2 style={{ fontSize: 32, fontWeight: 700, color: "#111", marginBottom: 8 }}>
              Assessment Complete!
            </h2>
            
            <p style={{ color: "#666", fontSize: 16 }}>
              Your adaptive test has been submitted
            </p>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: 32,
            borderRadius: 12,
            textAlign: "center",
            marginBottom: 32
          }}>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 8 }}>
              Your Score
            </div>
            <div style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 8
            }}>
              {finalResult.score.toFixed(1)}%
            </div>
            <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 16 }}>
              {finalResult.correct} out of {finalResult.total} questions correct
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 32
          }}>
            <div style={{ 
              padding: 20, 
              background: "#dcfce7", 
              borderRadius: 12,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 12, color: "#166534", marginBottom: 8, fontWeight: 600 }}>
                Correct
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#10b981" }}>
                {finalResult.correct}
              </div>
            </div>
            
            <div style={{ 
              padding: 20, 
              background: "#fee2e2", 
              borderRadius: 12,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 12, color: "#991b1b", marginBottom: 8, fontWeight: 600 }}>
                Wrong
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#ef4444" }}>
                {finalResult.total - finalResult.correct}
              </div>
            </div>
            
            <div style={{ 
              padding: 20, 
              background: "#f3f4f6", 
              borderRadius: 12,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 8, fontWeight: 600 }}>
                Total
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#111" }}>
                {finalResult.total}
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          {finalResult.performance_summary && (
            <div style={{
              padding: 24,
              background: "#f9fafb",
              borderRadius: 12,
              marginBottom: 32
            }}>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                color: "#111", 
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                🎯 Adaptive Performance
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 12,
                  background: "#fff",
                  borderRadius: 8
                }}>
                  <span style={{ fontSize: 14, color: "#666" }}>Final Difficulty Level</span>
                  <span style={{ 
                    fontSize: 14, 
                    fontWeight: 600,
                    color: getDifficultyColor(finalResult.performance_summary.current_difficulty)
                  }}>
                    {getDifficultyIcon(finalResult.performance_summary.current_difficulty)}{" "}
                    <span style={{ textTransform: "capitalize" }}>
                      {finalResult.performance_summary.current_difficulty}
                    </span>
                  </span>
                </div>
                
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 12,
                  background: "#fff",
                  borderRadius: 8
                }}>
                  <span style={{ fontSize: 14, color: "#666" }}>Recent Accuracy</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>
                    {(finalResult.performance_summary.recent_accuracy * 100).toFixed(0)}%
                  </span>
                </div>
                
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 12,
                  background: "#fff",
                  borderRadius: 8
                }}>
                  <span style={{ fontSize: 14, color: "#666" }}>Difficulty Adjustments</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>
                    {finalResult.performance_summary?.total_adjustments 
                      ? (typeof finalResult.performance_summary.total_adjustments === 'number'
                          ? `${finalResult.performance_summary.total_adjustments} times`
                          : 'Multiple times')
                      : '0 times'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ✅ VIOLATIONS SUMMARY */}
          {(() => { const totalViolations = Object.values(finalResult.violations || {}).reduce((a, b) => a + b, 0); return totalViolations > 0; })() && (
            <div style={{
              padding: 20,
              background: "#fef2f2",
              border: "2px solid #fca5a5",
              borderRadius: 12,
              marginBottom: 24
            }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#991b1b",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                ⚠️ Assessment Integrity Alerts
              </h3>
              
              <div style={{
                fontSize: 14,
                color: "#7f1d1d",
                lineHeight: 1.6
              }}>
                <div><strong>{finalResult.violations?.tab_switches || 0}</strong> tab switch{(finalResult.violations?.tab_switches || 0) !== 1 ? 'es' : ''} detected</div>
                <div><strong>{finalResult.violations?.window_blurs || 0}</strong> window blur{(finalResult.violations?.window_blurs || 0) !== 1 ? 's' : ''} detected</div>
                {finalResult.violations?.copy_attempts > 0 && (
                  <div><strong>{finalResult.violations.copy_attempts}</strong> copy attempt{finalResult.violations.copy_attempts !== 1 ? 's' : ''} detected</div>
                )}
                {finalResult.violations?.paste_attempts > 0 && (
                  <div><strong>{finalResult.violations.paste_attempts}</strong> paste attempt{finalResult.violations.paste_attempts !== 1 ? 's' : ''} detected</div>
                )}
                {finalResult.violations?.right_clicks > 0 && (
                  <div><strong>{finalResult.violations.right_clicks}</strong> right click{finalResult.violations.right_clicks !== 1 ? 's' : ''} detected</div>
                )}
                <div style={{ marginTop: 8, fontSize: 13, color: "#991b1b" }}>
                  These events have been recorded and will be reviewed by the hiring team.
                </div>
              </div>
            </div>
          )}

          {/* Result Message */}
          <div style={{
            padding: 20,
            background: finalResult.score >= 60 ? "#dcfce7" : "#fef3c7",
            border: `2px solid ${finalResult.score >= 60 ? "#10b981" : "#f59e0b"}`,
            borderRadius: 12,
            fontSize: 15,
            color: "#374151",
            marginBottom: 24,
            textAlign: "center",
            lineHeight: 1.6
          }}>
            {finalResult.score >= 60 
              ? "🎉 Congratulations! You passed the adaptive assessment. The hiring team will review your performance."
              : "📚 Thank you for completing the assessment. The hiring team will review your results and get back to you."
            }
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  if (currentQuestion) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
        {/* Header */}
        <div style={{
          background: "#fff",
          borderBottom: "2px solid #e5e7eb",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: "#111" }}>
                Question {questionNumber} of {totalQuestions}
              </h3>
              <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
                {email} • {role}
              </div>
            {/* ✅ VIOLATION COUNTER IN HEADER */}
            {(() => { const totalViolations = Object.values(violations).reduce((a, b) => a + b, 0); return totalViolations > 0; })() && (
              <div style={{
                marginTop: 4,
                fontSize: 12,
                color: "#dc2626",
                fontWeight: 600
              }}>
                ⚠️ {Object.values(violations).reduce((a, b) => a + b, 0)} violation{(Object.values(violations).reduce((a, b) => a + b, 0)) > 1 ? 's' : ''} detected
              </div>
            )}
            </div>
            
            {/* ✅ TIMER DISPLAY */}
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#4f46e5",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: 20
            }}>
              ⏱️ {formatTime(timeElapsed)}
            </div>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12
          }}>
            {/* ✅ DIFFICULTY BADGE - USING STATE NOT QUESTION DATA */}
            <div style={{
              padding: "6px 16px",
              background: `${getDifficultyColor(difficulty)}15`,
              color: getDifficultyColor(difficulty),
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 600,
              textTransform: "capitalize",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              {getDifficultyIcon(difficulty)}
              <span style={{ textTransform: "capitalize" }}>{difficulty}</span>
            </div>

            <div style={{
              padding: "6px 12px",
              background: "#f3f4f6",
              borderRadius: 20,
              fontSize: 13,
              color: "#4b5563",
              fontWeight: 600
            }}>
              {questionNumber} / {totalQuestions}
            </div>

            {/* ✅ VIOLATION COUNTER BADGE */}
            {(() => { const totalViolations = Object.values(violations).reduce((a, b) => a + b, 0); return totalViolations > 0; })() && (
              <div style={{
                padding: "6px 12px",
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#dc2626",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4
              }}>
                ⚠️ {Object.values(violations).reduce((a, b) => a + b, 0)}
              </div>
            )}

            <div style={{
              fontSize: 14,
              color: "#666",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              <span style={{ 
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: recentAccuracy >= 0.6 ? "#10b981" : recentAccuracy >= 0.4 ? "#f59e0b" : "#ef4444"
             }} />
             {(recentAccuracy * 100).toFixed(0)}%
          </div>
        </div>
       </div>

        {/* Progress Bar */}
        <div style={{
          height: 4,
          background: "#e5e7eb"
        }}>
          <div style={{
            height: "100%",
            background: "#4f46e5",
            width: `${(questionNumber / totalQuestions) * 100}%`,
            transition: "width 0.3s"
          }} />
        </div>

        {/* Question Content */}
        <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            background: "#fff",
            padding: 40,
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
          }}>
            <div style={{
              display: "inline-block",
              padding: "6px 12px",
              background: "#f0f9ff",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "#0369a1",
              marginBottom: 20
            }}>
              🎯 Adaptive Question • {difficulty}
            </div>

            <h2 style={{
              fontSize: 24,
              marginBottom: 30,
              lineHeight: 1.5,
              color: "#111"
            }}>
              {currentQuestion.question}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => !loading && setSelectedAnswer(opt.label)}
                  disabled={loading}
                  style={{
                    padding: 20,
                    background: selectedAnswer === opt.label ? "#e0e7ff" : "#f9fafb",
                    border: selectedAnswer === opt.label ? "2px solid #4f46e5" : "1px solid #e5e7eb",
                    borderRadius: 12,
                    cursor: loading ? "not-allowed" : "pointer",
                    textAlign: "left",
                    fontSize: 16,
                    transition: "all 0.2s"
                  }}
                >
                  <strong style={{ marginRight: 12, color: "#4f46e5" }}>
                    {opt.label})
                  </strong>
                  {opt.text}
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer || loading}
              style={{
                marginTop: 32,
                width: "100%",
                padding: "14px",
                background: (!selectedAnswer || loading) ? "#9ca3af" : "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: (!selectedAnswer || loading) ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Submitting..." : questionNumber === totalQuestions ? "Submit Final Answer" : "Next Question →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{ fontSize: 18, color: "#666" }}>Loading...</div>
    </div>
  );
}