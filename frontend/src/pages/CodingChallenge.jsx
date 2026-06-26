// CodingChallenge.jsx - UNIFIED VERSION
// ✅ Shows challenge LIST when no ID parameter (HR/Admin view)
// ✅ Shows challenge TEST when ID parameter present (Candidate view)
// ✅ Timer, violations, auto-save all work when taking test
// ✅ Auto-start session when candidate opens challenge link
// ✅ Submission blocking - prevents retaking after submission

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';

// ✅ Simple Error Boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', background: '#fee2e2', minHeight: '100vh' }}>
          <h1 style={{ color: '#dc2626' }}>Something went wrong</h1>
          <p style={{ color: '#991b1b' }}>{this.state.error?.message || 'Unknown error'}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '12px 24px', 
              background: '#dc2626', 
              color: 'white', 
              border: 'none', 
              borderRadius: 6,
              cursor: 'pointer',
              marginTop: 20
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function CodingChallengePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const challengeId = searchParams.get('id');
  
  // ============ TABS ============
  const [activeTab, setActiveTab] = useState('generate');
  
  // ============ GENERATE TAB STATES ============
  const [generating, setGenerating] = useState(false);
  
  // Generation form
  const [role, setRole] = useState('Software Engineer');
  const [difficulty, setDifficulty] = useState('medium');
  const [language, setLanguage] = useState('python');
  const [topic, setTopic] = useState('');
  const [numChallenges, setNumChallenges] = useState(3);
  
  // ============ MANAGE TAB STATES ============
  const [challenges, setChallenges] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  
  // ============ TEST VIEW STATES ============
  const [challenge, setChallenge] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [autoStarted, setAutoStarted] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  
  // Candidate Info
  const [candidateEmail, setCandidateEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // Code Editor
  const [code, setCode] = useState('');
  const editorRef = useRef(null);
  
  // Timer
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const timerIntervalRef = useRef(null);
  const lastTimeRemainingRef = useRef(null);
  
  // Auto-save
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  
  // Test Results
  const [testResults, setTestResults] = useState(null);
  const [runningTests, setRunningTests] = useState(false);
  
  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  
  // Violations
  const [violations, setViolations] = useState([]);
  const violationCountRef = useRef(0);
  
  // Loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Version History
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);

  // ✅ NEW: Submission blocking state
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // ============ DETERMINE VIEW MODE ============
  const isTestMode = !!challengeId; // If ID present, show test view
  
  // ✅ HIDE NAVIGATION: When in test mode, hide parent navigation
  useEffect(() => {
    if (isTestMode) {
      // Hide navigation bar for candidate view
      const nav = document.querySelector('nav');
      if (nav) {
        nav.style.display = 'none';
      }
      
      // Add fullscreen body style (removed overflow:hidden for scrolling)
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      
      return () => {
        // Restore navigation when leaving test
        if (nav) {
          nav.style.display = '';
        }
        document.body.style.margin = '';
        document.body.style.padding = '';
      };
    }
  }, [isTestMode]);
  
  // ============ FETCH CHALLENGES ============
  useEffect(() => {
    if (activeTab === 'manage' && !isTestMode) {
      fetchChallenges();
    }
  }, [activeTab, isTestMode]);

  const fetchChallenges = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('http://localhost:8000/api/coding/challenges');
      const data = await res.json();
      // ✅ FIX: Ensure we have an array and format the data properly
      if (data.challenges && Array.isArray(data.challenges)) {
        // Format the data to ensure all properties are strings
        const formattedChallenges = data.challenges.map(challenge => ({
          ...challenge,
          title: String(challenge.title || 'Untitled Challenge'),
          description: String(challenge.description || ''),
          language: String(challenge.language || 'python'),
          difficulty: String(challenge.difficulty || 'medium'),
          constraints: challenge.constraints ? String(challenge.constraints) : '',
          starter_code: challenge.starter_code ? String(challenge.starter_code) : '',
          created_at: challenge.created_at ? String(challenge.created_at) : new Date().toISOString(),
          challenge_id: String(challenge.challenge_id || Date.now().toString())
        }));
        setChallenges(formattedChallenges);
      } else {
        setChallenges([]);
      }
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
      setChallenges([]);
    }
    setLoadingList(false);
  };

  const generateChallenges = async () => {
    setGenerating(true);
    try {
      const res = await fetch('http://localhost:8000/api/coding/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          difficulty,
          language,
          topic: topic || undefined,
          num_challenges: numChallenges
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ Generated ${data.generated_count} coding challenges!`);
        fetchChallenges();
        setActiveTab('manage');
      }
    } catch (err) {
      console.error('Generation failed:', err);
      alert('❌ Failed to generate challenges');
    }
    setGenerating(false);
  };

  const deleteChallenge = async (challengeIdToDelete) => {
    if (!confirm('Delete this challenge?')) return;
    
    try {
      await fetch(`http://localhost:8000/api/coding/challenge/${challengeIdToDelete}`, {
        method: 'DELETE'
      });
      fetchChallenges();
      setSelectedChallenge(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const getChallengeLink = (id) => {
    return `${window.location.origin}/coding-challenges?id=${id}`;
  };

  const copyChallengeLink = (challengeId) => {
    const link = getChallengeLink(challengeId);
    navigator.clipboard.writeText(link);
    alert("📋 Challenge link copied to clipboard!");
  };

  const viewChallenge = (challengeId) => {
    navigate(`/coding-challenges?id=${challengeId}`);
  };

  // ============ TEST VIEW LOGIC ============
  
  // ✅ NEW: Check submission status on component mount
  useEffect(() => {
    if (!isTestMode || !challengeId) return;
    
    checkSubmissionStatus();
  }, [isTestMode, challengeId]);

  // ✅ NEW: Check if email has already submitted
  const checkSubmissionStatus = async () => {
    try {
      // Check localStorage first for quick blocking
      const storedBlock = localStorage.getItem(`submitted_${challengeId}_${candidateEmail}`);
      if (storedBlock === 'true') {
        setAlreadySubmitted(true);
        return;
      }

      // If we have sessionId, check with server for more accurate status
      if (sessionId) {
        const response = await fetch(`http://localhost:8000/api/coding/session/${sessionId}/submission-status`);
        if (response.ok) {
          const data = await response.json();
          if (data.submitted) {
            setAlreadySubmitted(true);
            localStorage.setItem(`submitted_${challengeId}_${candidateEmail}`, 'true');
          }
        }
      }
    } catch (err) {
      console.error('Failed to check submission status:', err);
    }
  };

  // Fetch challenge when in test mode
  useEffect(() => {
    if (isTestMode && challengeId) {
      fetchChallenge();
    }
  }, [isTestMode, challengeId]);

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/coding/challenge/${challengeId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch challenge');
      }
      
      const data = await response.json();
      console.log('📦 Challenge loaded:', data.title);
      
      // ✅ FIX: Format challenge data to ensure all properties are strings
      const formattedChallenge = {
        ...data,
        title: String(data.title || 'Untitled Challenge'),
        description: String(data.description || ''),
        language: String(data.language || 'python'),
        difficulty: String(data.difficulty || 'medium'),
        constraints: data.constraints ? String(data.constraints) : '',
        starter_code: data.starter_code ? String(data.starter_code) : '',
        test_cases: Array.isArray(data.test_cases) ? data.test_cases : []
      };
      
      setChallenge(formattedChallenge);
      setCode(formattedChallenge.starter_code || '');
      setLanguage(formattedChallenge.language || 'python');
      setLoading(false);
    } catch (err) {
      console.error('Fetch challenge error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // ✅ ENHANCED SESSION RESTORATION: Check localStorage and restore session state
  useEffect(() => {
    if (!isTestMode || !challenge || sessionId) return;
    
    const stored = sessionStorage.getItem(`session_${challengeId}`);
    if (stored) {
      try {
        const sessionData = JSON.parse(stored);
        console.log('🔄 Restoring session from localStorage:', sessionData);
        
        // ✅ NEW: Check if this email has already submitted
        const storedBlock = localStorage.getItem(`submitted_${challengeId}_${sessionData.email}`);
        if (storedBlock === 'true') {
          setAlreadySubmitted(true);
          setCandidateEmail(sessionData.email);
          return;
        }
        
        // Restore session state
        setSessionId(sessionData.sessionId);
        setCandidateEmail(sessionData.email);
        setEmailSubmitted(true); // Skip email screen
        setAutoStarted(true); // Mark as started
        
        console.log('✅ Session restored, will load code and timer');
        
        // ✅ CRITICAL FIX: Immediately load session data to restore timer
        loadSavedSessionData(sessionData.sessionId);
        
      } catch (err) {
        console.error('Failed to restore session:', err);
        sessionStorage.removeItem(`session_${challengeId}`);
      }
    }
  }, [isTestMode, challenge, challengeId]);

  // ✅ NEW: Enhanced session data loading with timer restoration
  const loadSavedSessionData = async (sessionIdToLoad) => {
    try {
      console.log('🔄 Loading saved session data for timer restoration...');
      const response = await fetch(`http://localhost:8000/api/coding/session/${sessionIdToLoad}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Session data loaded:', data);
        
        // ✅ CRITICAL FIX: If time is remaining and session is in progress, RESTART the timer
        if (data.time_remaining_seconds !== undefined && data.time_remaining_seconds > 0) {
          console.log('✅ Timer state - Remaining:', data.time_remaining_seconds, 'Status:', data.status);
          
          // ✅ ALWAYS restart the timer if time is remaining, regardless of server's active status
          // The server might mark it as inactive, but we need to keep it running on frontend
          setTimeRemaining(data.time_remaining_seconds);
          setTimerActive(true); // ✅ FORCE restart the timer on frontend
          
          console.log('✅ Timer RESTARTED and will continue counting down');
        } else if (data.time_remaining_seconds <= 0) {
          // Time expired on server
          console.log('⏰ Time already expired on server');
          handleTimeExpired();
        }
        
        // Load saved code
        if (data.current_code && 
            data.current_code !== 'in_progress' && 
            data.current_code !== code &&
            data.current_code.length > 20) {
          setCode(data.current_code);
          console.log('✅ Loaded saved code from session');
        }
      }
    } catch (err) {
      console.error('Failed to load session data:', err);
    }
  };

  // ✅ AUTO-START SESSION
  useEffect(() => {
    if (!isTestMode || !emailSubmitted) return; // ✅ CHANGED: Require email first
    
    console.log('🔵 AUTO-START CHECK:');
    console.log('   challenge:', !!challenge, challenge?.title);
    console.log('   sessionId:', sessionId);
    console.log('   autoStarted:', autoStarted);
    console.log('   loading:', loading);
    console.log('   emailSubmitted:', emailSubmitted);
    
    if (challenge && !sessionId && !autoStarted && !loading && emailSubmitted) {
      console.log('🟢 ✅ CONDITIONS MET - STARTING SESSION!');
      setAutoStarted(true);
      autoStartSession(candidateEmail); // ✅ CHANGED: Use candidateEmail state
    } else {
      console.log('⚠️ CONDITIONS NOT MET - Not starting session');
    }
  }, [challenge, sessionId, autoStarted, loading, isTestMode, emailSubmitted]);

  // ✅ NEW: Handle email submission with submission check
  const handleStartSession = () => {
    // Clear previous error
    setEmailError('');
    
    // Trim email
    const email = candidateEmail.trim();
    
    // Check if empty
    if (!email) {
      setEmailError('⚠️ Please enter your email address');
      return;
    }
    
    // Check for @ symbol
    if (!email.includes('@')) {
      setEmailError('⚠️ Email must contain @ symbol (e.g., name@company.com)');
      return;
    }
    
    // Check for domain after @
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[1]) {
      setEmailError('⚠️ Please enter a valid domain after @ (e.g., name@company.com)');
      return;
    }
    
    // Check for extension (dot in domain)
    if (!parts[1].includes('.')) {
      setEmailError('⚠️ Domain must have an extension (e.g., name@company.com)');
      return;
    }
    
    // Check valid format with regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('⚠️ Invalid email format. Please use: name@company.com');
      return;
    }
    
    // ✅ NEW: Check if this email has already submitted for this challenge
    const storedBlock = localStorage.getItem(`submitted_${challengeId}_${email}`);
    if (storedBlock === 'true') {
      setAlreadySubmitted(true);
      setCandidateEmail(email);
      return;
    }
    
    console.log('📧 Email submitted:', email);
    setCandidateEmail(email); // Save trimmed version
    setEmailSubmitted(true);
  };

  const autoStartSession = async (email) => {
    try {
      // ✅ NEW: Check if already submitted before starting session
      const storedBlock = localStorage.getItem(`submitted_${challengeId}_${email}`);
      if (storedBlock === 'true') {
        setAlreadySubmitted(true);
        return;
      }

      console.log('🔵 AUTO-START: Calling /api/coding/session/start');
      console.log('   Challenge ID:', challengeId);
      console.log('   Email:', email);
      
      const response = await fetch('http://localhost:8000/api/coding/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: challengeId,
          candidate_email: email,
          time_limit_minutes: 30
        })
      });

      console.log('🔵 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('🟢 ✅ SESSION CREATED:', data);
      console.log('   Session ID:', data.session_id);
      console.log('   Time remaining:', data.time_remaining_seconds, 'seconds');
      
      const timeInSeconds = data.time_remaining_seconds || (data.time_limit_minutes * 60) || 1800;
      
      setSessionId(data.session_id);
      setSessionData(data);
      setTimeRemaining(timeInSeconds);
      setTimerActive(true);
      
      // ✅ ENHANCED PERSISTENCE: Save comprehensive session data to localStorage
      sessionStorage.setItem(`session_${challengeId}`, JSON.stringify({
        sessionId: data.session_id,
        email: email,
        startTime: new Date().toISOString(),
        timeRemaining: timeInSeconds,
        timerActive: true
      }));
      
      console.log('✅ TIMER ACTIVATED:', formatTime(timeInSeconds));
      console.log('✅ ENHANCED SESSION DATA SAVED TO SESSIONSTORAGE');
      
    } catch (err) {
      console.error('🔴 AUTO-START FAILED:', err);
      console.error('   Error message:', err.message);
      alert('Failed to start session: ' + err.message);
    }
  };

  // ✅ ENHANCED TIMER COUNTDOWN - Robust timer that survives page reloads
  // This effect handles cleanup when timerActive or isTestMode changes
  useEffect(() => {
    // Clear interval if timer becomes inactive
    if (!isTestMode || !timerActive) {
      if (timerIntervalRef.current) {
        console.log('🛑 Clearing timer interval (inactive or not test mode)');
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      lastTimeRemainingRef.current = null;
    }
  }, [timerActive, isTestMode]); // ✅ Only cleanup when timerActive or isTestMode changes
  
  // ✅ ENHANCED TIMER START: Separate effect to start timer when timeRemaining is available
  useEffect(() => {
    // Don't start if not in test mode or timer not active
    if (!isTestMode || !timerActive) {
      return;
    }
    
    // Don't start if timeRemaining is not set yet or already expired
    if (timeRemaining === null || timeRemaining === undefined || timeRemaining <= 0) {
      console.log('⏱️ Timer not started - invalid timeRemaining:', timeRemaining);
      return;
    }

    // ✅ Don't start a new interval if one is already running
    if (timerIntervalRef.current) {
      console.log('⏱️ Timer already running, skipping restart');
      return;
    }

    // ✅ Only start if timeRemaining changed from null/undefined to a number (first time it's set)
    const wasNull = lastTimeRemainingRef.current === null || lastTimeRemainingRef.current === undefined;
    
    if (!wasNull && lastTimeRemainingRef.current === timeRemaining) {
      // Same value, no change needed
      return;
    }

    // First time timeRemaining is set OR value changed - start/restart the timer
    lastTimeRemainingRef.current = timeRemaining;
    console.log('⏱️ Timer STARTING/RESTARTING - timeRemaining:', timeRemaining, 'seconds');

    // Create interval that ticks every second
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        // Safety checks
        if (prev === null || prev === undefined) {
          return prev;
        }
        
        // If already at 0, don't go negative
        if (prev <= 0) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          lastTimeRemainingRef.current = null;
          handleTimeExpired();
          return 0;
        }
        
        // Decrement by 1 second
        const newValue = prev - 1;
        
        // ✅ UPDATE SESSIONSTORAGE with new time (for page reload persistence)
        const stored = sessionStorage.getItem(`session_${challengeId}`);
        if (stored) {
          try {
            const sessionData = JSON.parse(stored);
            sessionData.timeRemaining = newValue;
            sessionStorage.setItem(`session_${challengeId}`, JSON.stringify(sessionData));
          } catch (err) {
            console.error('Failed to update sessionStorage time:', err);
          }
        }
        
        // If just hit 0, trigger expiry
        if (newValue === 0) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          lastTimeRemainingRef.current = null;
          handleTimeExpired();
          return 0;
        }
        
        // Return new value (this triggers React re-render!)
        return newValue;
      });
    }, 1000); // Every 1000ms = 1 second

    console.log('✅ Timer interval started successfully');

    // No cleanup here - cleanup is handled by the effect above
  }, [timeRemaining, timerActive, isTestMode]); // ✅ Include all dependencies to start timer when timeRemaining is first set

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimeExpired = async () => {
    console.log('⏰ TIME EXPIRED - Auto-submitting...');
    setTimeExpired(true);
    setTimerActive(false);
    
    // ✅ Clear timer interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    lastTimeRemainingRef.current = null;
    
    // ✅ PERSISTENCE: Clear session from localStorage
    sessionStorage.removeItem(`session_${challengeId}`);
    
    alert('⏰ Time expired! Auto-submitting your solution...');
    await handleSubmit(true);
  };

  // ✅ VIOLATIONS TRACKING
  useEffect(() => {
    if (!isTestMode || !sessionId) return;

    const handleBlur = () => {
      console.log('?? BLUR EVENT FIRED');
      // Fires when candidate clicks outside the browser or switches tabs
      logViolation('tab_switch', 'Focus lost / Switched away from tab');
    };

    const handleVisibilityChange = () => {
      console.log('?? VISIBILITY CHANGE:', document.visibilityState);
      if (document.visibilityState === 'hidden') {
        logViolation('tab_switch', 'Tab changed or minimized');
      }
    };

    const handleCopy = (e) => {
      console.log('?? COPY EVENT FIRED');
      logViolation('copy', 'Copied content to clipboard');
    };

    const handlePaste = (e) => {
      console.log('?? PASTE EVENT FIRED');
      logViolation('paste', 'Pasted content into editor');
    };

    // Use window 'blur' to catch switching to other apps/monitors
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Attach copy/paste to window in the CAPTURE phase (true)
    // This intercepts the event BEFORE Monaco editor can swallow it!
    window.addEventListener('copy', handleCopy, true);
    window.addEventListener('paste', handlePaste, true);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('paste', handlePaste, true);
    };
  }, [sessionId, isTestMode]);

  const logViolation = async (type, description) => {
    violationCountRef.current += 1;
    const newViolation = { type, description, timestamp: new Date() };
    setViolations(prev => [...prev, newViolation]);
    
    console.log(`⚠️ VIOLATION #${violationCountRef.current}:`, type);

    try {
      await fetch('http://localhost:8000/api/coding/log-violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          violation_type: type,
          description: description
        })
      });
    } catch (err) {
      console.error('Failed to log violation:', err);
    }
  };

  // ✅ AUTO-SAVE
  useEffect(() => {
    if (!isTestMode || !sessionId || !code) return;

    const autoSaveInterval = setInterval(() => {
      handleAutoSave();
    }, 30000); // Every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [sessionId, code, isTestMode]);

  // ✅ NEW: Load saved code when session starts
  useEffect(() => {
    if (!sessionId) return;
    loadSavedCode();
  }, [sessionId]);

  const loadSavedCode = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/coding/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        
        // ✅ FIX: Only load timer if timer hasn't started yet (prevents cleanup)
        // But we handle timer restoration in loadSavedSessionData now
        if (data.time_remaining_seconds !== undefined && !timerIntervalRef.current) {
          const isActive = data.status === 'in_progress';
          console.log('✅ Loaded timer from session API:', data.time_remaining_seconds, 'seconds remaining, active:', isActive);
          
          // Set both states - React will batch them, but the timer effect will run after
          setTimeRemaining(data.time_remaining_seconds);
          setTimerActive(isActive);
        }
        
        // ✅ FIX: Only load if it's actual code (not status text like "in_progress")
        if (data.current_code && 
            data.current_code !== 'in_progress' && 
            data.current_code !== code &&
            data.current_code.length > 20) { // Must be actual code
          setCode(data.current_code);
          console.log('✅ Loaded saved code from session');
        }
      }
    } catch (err) {
      console.error('Failed to load saved code:', err);
    }
  };
  

  // ✅ NEW: Manual save function (creates version)
  const handleManualSave = async () => {
    if (!sessionId) {
      alert('No active session');
      return;
    }
    
    try {
      setAutoSaveStatus('Saving...');
      
      // Call BOTH endpoints:
      // 1. Save version (creates new entry in versions table)
      const versionResponse = await fetch('http://localhost:8000/api/coding/save-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          code: code
        })
      });
      
      if (!versionResponse.ok) {
        throw new Error('Failed to save version');
      }
      
      const versionData = await versionResponse.json();
      console.log('✅ Version saved:', versionData.version_number);
      
      setAutoSaveStatus('✓ Saved');
      setTimeout(() => setAutoSaveStatus(''), 2000);
      alert(`✓ Code saved as Version ${versionData.version_number}!`);
      
    } catch (err) {
      console.error('Manual save failed:', err);
      setAutoSaveStatus('✗ Save failed');
      alert('Failed to save code: ' + err.message);
    }
  };

  const handleAutoSave = async () => {
    try {
      setAutoSaveStatus('Saving...');
      await fetch('http://localhost:8000/api/coding/auto-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          code: code
        })
      });
      setLastSaved(new Date());
      setAutoSaveStatus('✓ Saved');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    } catch (err) {
      console.error('Auto-save failed:', err);
      setAutoSaveStatus('✗ Save failed');
    }
  };

  // RUN TESTS
  const handleRunTests = async () => {
    setRunningTests(true);
    setTestResults(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/coding/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: challengeId,
          code: code,
          language: language
        })
      });

      const data = await response.json();
      setTestResults(data);
    } catch (err) {
      console.error('Test run failed:', err);
      alert('Failed to run tests');
    }
    setRunningTests(false);
  };

  // ✅ UPDATED: SUBMIT SOLUTION with submission blocking
  const handleSubmit = async (isAutoSubmit = false) => {
    if (submitted && !isAutoSubmit) {
      alert('Already submitted!');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/coding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          challenge_id: challengeId,
          candidate_email: candidateEmail,
          code: code,
          language: language
        })
      });

      const data = await response.json();
      setSubmissionResult(data);
      setSubmitted(true);
      setAlreadySubmitted(true); // ✅ NEW: Block future access
      setTimerActive(false);
      
      // ✅ NEW: Store in localStorage to block future attempts
      localStorage.setItem(`submitted_${challengeId}_${candidateEmail}`, 'true');
      
      alert(`✅ Submitted! Score: ${data.score}%`);
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Failed to submit solution');
    }
    setSubmitting(false);
  };

  // FETCH VERSION HISTORY
  const fetchVersionHistory = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/coding/session/${sessionId}/versions`);
      const data = await response.json();
      setVersions(data.versions || []);
      setShowVersions(true);
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    }
  };

  const restoreVersion = (versionCode) => {
    setCode(versionCode);
    setShowVersions(false);
    alert('✓ Version restored!');
  };

  // ============ RENDER ============
  
  // Wrap the entire component with ErrorBoundary
  return (
    <ErrorBoundary>
      <CodingChallengeContent 
        isTestMode={isTestMode}
        alreadySubmitted={alreadySubmitted}
        submissionResult={submissionResult}
        candidateEmail={candidateEmail}
        challenge={challenge}
        challengeId={challengeId}
        loading={loading}
        error={error}
        emailSubmitted={emailSubmitted}
        timeExpired={timeExpired}
        code={code}
        timeRemaining={timeRemaining}
        formatTime={formatTime}
        violations={violations}
        autoSaveStatus={autoSaveStatus}
        language={language}
        setCode={setCode}
        showVersions={showVersions}
        setShowVersions={setShowVersions}
        versions={versions}
        restoreVersion={restoreVersion}
        fetchVersionHistory={fetchVersionHistory}
        handleRunTests={handleRunTests}
        runningTests={runningTests}
        submitted={submitted}
        sessionId={sessionId}
        handleManualSave={handleManualSave}
        submitting={submitting}
        handleSubmit={handleSubmit}
        testResults={testResults}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        setRole={setRole}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        setLanguage={setLanguage}
        topic={topic}
        setTopic={setTopic}
        numChallenges={numChallenges}
        setNumChallenges={setNumChallenges}
        generating={generating}
        generateChallenges={generateChallenges}
        challenges={challenges}
        loadingList={loadingList}
        selectedChallenge={selectedChallenge}
        setSelectedChallenge={setSelectedChallenge}
        copyChallengeLink={copyChallengeLink}
        viewChallenge={viewChallenge}
        deleteChallenge={deleteChallenge}
        setCandidateEmail={setCandidateEmail}
        emailError={emailError}
        handleStartSession={handleStartSession}
      />
    </ErrorBoundary>
  );
}

// Separate component to isolate rendering logic
// Separate component to isolate rendering logic
function CodingChallengeContent({
  isTestMode,
  alreadySubmitted,
  submissionResult,
  candidateEmail,
  challenge,
  challengeId,
  loading,
  error,
  emailSubmitted,
  timeExpired,
  code,
  timeRemaining,
  formatTime,
  violations,
  autoSaveStatus,
  language,
  setCode,
  showVersions,
  setShowVersions,
  versions,
  restoreVersion,
  fetchVersionHistory,
  handleRunTests,
  runningTests,
  submitted,
  sessionId,
  handleManualSave,
  submitting,
  handleSubmit,
  testResults,
  activeTab,
  setActiveTab,
  role,
  setRole,
  difficulty,
  setDifficulty,
  setLanguage,
  topic,
  setTopic,
  numChallenges,
  setNumChallenges,
  generating,
  generateChallenges,
  challenges,
  loadingList,
  selectedChallenge,
  setSelectedChallenge,
  copyChallengeLink,
  viewChallenge,
  deleteChallenge,
  candidateEmail: email,
  setCandidateEmail,
  emailError,
  handleStartSession
}) {
  
  // ✅ NEW: Show "Already Submitted" screen
  if (isTestMode && alreadySubmitted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f9fafb' }}>
        <div style={{
          background: '#fff',
          border: '2px solid #e5e7eb',
          borderRadius: 12,
          padding: 48,
          maxWidth: 600,
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111', marginBottom: 16 }}>
            Solution Already Submitted
          </h1>
          <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 8 }}>
            You have already submitted your solution for this challenge.
          </p>
          <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 32 }}>
            Email: {candidateEmail}
          </p>
          
          {/* Submission Result - SAFELY RENDERED */}
          {submissionResult ? (
            <div style={{
              marginTop: 16,
              padding: 24,
              background: submissionResult.score >= 60 ? '#dcfce7' : '#fee2e2',
              border: `3px solid ${submissionResult.score >= 60 ? '#10b981' : '#ef4444'}`,
              borderRadius: 12
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: submissionResult.score >= 60 ? '#166534' : '#991b1b' }}>
                {submissionResult.score}% - {submissionResult.performance_level || 'Completed'}
              </div>
              
              {/* Score Breakdown - SAFELY CHECKED */}
              {submissionResult.score_breakdown && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Correctness</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{submissionResult.score_breakdown.correctness?.score || 0}%</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{submissionResult.score_breakdown.correctness?.feedback || 'N/A'}</div>
                  </div>
                  
                  <div style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Efficiency</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{submissionResult.score_breakdown.efficiency?.score || 0}%</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{submissionResult.score_breakdown.efficiency?.feedback || 'N/A'}</div>
                  </div>
                  
                  <div style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Code Quality</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{submissionResult.score_breakdown.code_quality?.score || 0}%</div>
                  </div>
                  
                  <div style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Problem Solving</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{submissionResult.score_breakdown.problem_solving?.score || 0}%</div>
                  </div>
                </div>
              )}
              
              <div style={{ fontSize: 16, color: '#374151' }}>
                {(submissionResult.passed_tests || 0)}/{(submissionResult.total_tests || 0)} test cases passed
              </div>
              
              {/* Improvement Suggestions - SAFELY CHECKED */}
              {submissionResult.improvement_suggestions && submissionResult.improvement_suggestions.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '2px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>💡 Suggestions:</div>
                  <ul style={{ fontSize: 13, lineHeight: 1.6, paddingLeft: 20 }}>
                    {submissionResult.improvement_suggestions.slice(0, 3).map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 16 }}>
              Submission details are being loaded...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show TEST VIEW if ID parameter present (candidate view)
  if (isTestMode) {
    // ✅ NEW: Email input screen (before starting test)
    if (!emailSubmitted && !loading && !error) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f9fafb' }}>
          <div style={{
            background: '#fff',
            border: '2px solid #e5e7eb',
            borderRadius: 12,
            padding: 40,
            maxWidth: 600,
            width: '100%'
          }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111', marginBottom: 16, textAlign: 'center' }}>
              {challenge?.title || 'Coding Challenge'}
            </h1>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
              <span style={{
                padding: '6px 16px',
                background: challenge?.difficulty === 'easy' ? '#dcfce7' : 
                           challenge?.difficulty === 'medium' ? '#fef3c7' : '#fee2e2',
                color: challenge?.difficulty === 'easy' ? '#166534' :
                       challenge?.difficulty === 'medium' ? '#854d0e' : '#991b1b',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600
              }}>
                {(challenge?.difficulty || 'medium').toUpperCase()}
              </span>
              <span style={{
                padding: '6px 16px',
                background: '#dbeafe',
                color: '#1e40af',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600
              }}>
                {(challenge?.language || 'python').toUpperCase()}
              </span>
            </div>

            <div style={{
              background: '#fef3c7',
              border: '2px solid #fbbf24',
              borderRadius: 8,
              padding: 20,
              marginBottom: 24
            }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#854d0e', fontSize: 16 }}>
                ⚠️ Important Instructions
              </div>
              <ul style={{ marginLeft: 20, lineHeight: 1.8, color: '#854d0e', fontSize: 14 }}>
                <li><strong>Time Limit:</strong> You have 30 minutes to complete this challenge</li>
                <li><strong>Auto-save:</strong> Your code will be saved automatically every 30 seconds</li>
                <li><strong>Manual Save:</strong> Use the "💾 Save Code" button to save anytime</li>
                <li><strong>Monitoring:</strong> Tab switching, copy-paste events are tracked</li>
                <li><strong>Code Requirements:</strong> Write ONLY the function - no imports, no main, no test code</li>
                <li><strong>Timer:</strong> Starts immediately after you enter your email</li>
                <li><strong>Submission:</strong> Solution auto-submits when timer expires</li>
              </ul>
            </div>

            <div style={{
              background: '#e0e7ff',
              border: '2px solid #6366f1',
              borderRadius: 8,
              padding: 16,
              marginBottom: 24
            }}>
              <div style={{ fontSize: 13, color: '#3730a3', lineHeight: 1.6 }}>
                <strong>📝 What NOT to include in your code:</strong><br/>
                • Do NOT import libraries (already included)<br/>
                • Do NOT write main() or test code<br/>
                • Do NOT include print/console statements<br/>
                • Write ONLY the required function<br/>
                • For Go: NO 'package main' or 'func main()'<br/>
                • For C++/Java: NO main() function<br/>
                • For Python: NO if __name__ == "__main__"<br/>
                • For JavaScript: NO console.log() or test code
              </div>
            </div>

            <div style={{
              background: '#e0e7ff',
              border: '2px solid #6366f1',
              borderRadius: 8,
              padding: 16,
              marginBottom: 24
            }}>
              <div style={{ fontSize: 13, color: '#3730a3', lineHeight: 1.6 }}>
                <strong>📝 Language-Specific Instructions:</strong><br/>
                <br/>
                <strong>Python:</strong> NO if __name__ == "__main__"<br/>
                &nbsp;&nbsp;• Write ONLY the required function<br/>
                &nbsp;&nbsp;• Function name and parameters must exactly match what the challenge asks<br/>
                &nbsp;&nbsp;• Do NOT include imports unless specified, test code, main() checks, or print statements<br/>
                &nbsp;&nbsp;• Can import standard libraries if needed<br/>
                <br/>
                <strong>Go:</strong> NO 'package main' or 'func main()'<br/>
                &nbsp;&nbsp;• Ensure your function name and signature match the challenge exactly<br/>
                &nbsp;&nbsp;• Do NOT include a main() function or extra imports<br/>
                &nbsp;&nbsp;• Only import what you actually use<br/>
                &nbsp;&nbsp;• The platform must be able to locate and call your function directly for test cases<br/>
                &nbsp;&nbsp;• Can import packages (e.g., import "sort")<br/>
                &nbsp;&nbsp;• DO NOT import "fmt" - it's already included<br/>
                <br/>
                <strong>JavaScript:</strong> NO console.log() or test code<br/>
                &nbsp;&nbsp;• Return the result, don't print it<br/>
                &nbsp;&nbsp;• Function name and parameters must exactly match the challenge<br/>
                &nbsp;&nbsp;• Do NOT include any test code or console.log statements<br/>
                <br/>
                <strong>C++:</strong> NO int main()<br/>
                &nbsp;&nbsp;• Include necessary headers<br/>
                &nbsp;&nbsp;• Write ONLY the solution function<br/>
                &nbsp;&nbsp;• Function signature must match exactly what's requested<br/>
                <br/>
                <strong>Java:</strong> NO public static void main()<br/>
                &nbsp;&nbsp;• Write ONLY the class and method<br/>
                &nbsp;&nbsp;• Method name and parameters must exactly match the challenge<br/>
                &nbsp;&nbsp;• Do NOT include main method or extra imports<br/>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 16, fontWeight: 600, color: '#374151' }}>
                📧 Enter your email to begin
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setCandidateEmail(e.target.value);
                  setEmailError(''); // Clear error when typing
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleStartSession()}
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
              onClick={handleStartSession}
              style={{
                width: '100%',
                padding: '16px',
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#4338ca'}
              onMouseLeave={(e) => e.target.style.background = '#4f46e5'}
            >
              🚀 Start Challenge (Timer Starts!)
            </button>
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 16 }}>⏳ Loading challenge...</div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, color: '#ef4444', marginBottom: 16 }}>❌ Error</div>
            <div style={{ color: '#6b7280' }}>{error}</div>
          </div>
        </div>
      );
    }

    // ✅ NEW: Show submission result page when time expires
    if (isTestMode && timeExpired) {
      return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            background: '#fff',
            border: '2px solid #e5e7eb',
            borderRadius: 12,
            padding: 48,
            maxWidth: 700,
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111', marginBottom: 16 }}>
              Time Expired!
            </h1>
            <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 32 }}>
              Your solution has been automatically submitted
            </p>

            {submissionResult ? (
              <>
                <div style={{
                  background: submissionResult.score >= 60 ? '#dcfce7' : '#fee2e2',
                  border: `3px solid ${submissionResult.score >= 60 ? '#10b981' : '#ef4444'}`,
                  borderRadius: 12,
                  padding: 32,
                  marginBottom: 32
                }}>
                  <div style={{ fontSize: 64, fontWeight: 700, color: submissionResult.score >= 60 ? '#166534' : '#991b1b', marginBottom: 8 }}>
                    {submissionResult.score}%
                  </div>
                  <div style={{ fontSize: 18, color: '#6b7280' }}>
                    {(submissionResult.passed_tests || 0)}/{(submissionResult.total_tests || 0)} test cases passed
                  </div>
                </div>

                <div style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 24,
                  marginBottom: 24,
                  textAlign: 'left'
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Your Final Solution:</h3>
                  <pre style={{
                    background: '#1e293b',
                    color: '#e2e8f0',
                    padding: 16,
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'monospace',
                    overflow: 'auto',
                    maxHeight: 300
                  }}>
                    {code}
                  </pre>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 16, color: '#6b7280' }}>
                Loading submission results...
              </p>
            )}
          </div>
        </div>
      );
    }

    // Return the full test interface
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#f9fafb',
        position: 'fixed',      // ✅ Fullscreen overlay
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,           // ✅ Above navigation
        overflowY: 'auto'
      }}>
        {/* Header with Timer */}
        <div style={{
          background: '#fff',
          borderBottom: '2px solid #e5e7eb',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 4 }}>
              {challenge?.title || 'Coding Challenge'}
            </h1>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              {candidateEmail}
            </div>
          </div>

          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              color: timeRemaining < 300 ? '#ef4444' : '#111',
              fontFamily: 'monospace',
              animation: timeRemaining < 300 ? 'pulse 1s infinite' : 'none'
            }}>
              ⏱️ {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        {/* Violations Warning */}
        {violations.length > 0 && (
          <div style={{
            background: '#fef3c7',
            border: '2px solid #fbbf24',
            borderRadius: 8,
            padding: 12,
            margin: '16px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, color: '#854d0e' }}>
                Suspicious Activity Detected
              </div>
              <div style={{ fontSize: 14, color: '#854d0e' }}>
                {violations.length} warning{violations.length > 1 ? 's' : ''} logged
              </div>
            </div>
          </div>
        )}

        {/* Auto-save Status */}
        {autoSaveStatus && (
          <div style={{
            position: 'fixed',
            top: 80,
            right: 32,
            background: '#10b981',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 14
          }}>
            {autoSaveStatus}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 32 }}>
          {/* Left: Problem Description */}
          <div style={{
            background: '#fff',
            border: '2px solid #e5e7eb',
            borderRadius: 12,
            padding: 24,
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto'
          }}>
            {/* ✅ NEW: Challenge badges */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <span style={{
                padding: '6px 16px',
                background: challenge?.difficulty === 'easy' ? '#dcfce7' : 
                           challenge?.difficulty === 'medium' ? '#fef3c7' : '#fee2e2',
                color: challenge?.difficulty === 'easy' ? '#166534' :
                       challenge?.difficulty === 'medium' ? '#854d0e' : '#991b1b',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600
              }}>
                {(challenge?.difficulty || 'medium').toUpperCase()}
              </span>
              <span style={{
                padding: '6px 16px',
                background: '#dbeafe',
                color: '#1e40af',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600
              }}>
                {(challenge?.language || 'python').toUpperCase()}
              </span>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Problem Description</h2>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#374151' }}>
              {challenge?.description || 'No description available'}
            </div>

            {challenge?.test_cases && challenge.test_cases.length > 0 && (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 12 }}>Examples</h3>
                {challenge.test_cases.slice(0, 2).map((tc, idx) => (
                  <div key={idx} style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 12,
                    fontFamily: 'monospace',
                    fontSize: 13
                  }}>
                    <div><strong>Input:</strong> {JSON.stringify(tc.input)}</div>
                    <div><strong>Output:</strong> {tc.expected_output}</div>
                  </div>
                ))}
              </>
            )}

            {challenge?.constraints && (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 12 }}>Constraints</h3>
                <div style={{ whiteSpace: 'pre-wrap', color: '#6b7280', fontSize: 14 }}>
                  {challenge.constraints}
                </div>
              </>
            )}
          </div>

          {/* Right: Code Editor */}
          <div style={{
            background: '#fff',
            border: '2px solid #e5e7eb',
            borderRadius: 12,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 200px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600 }}>Your Solution</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={fetchVersionHistory}
                  style={{
                    padding: '6px 12px',
                    background: '#6b7280',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  📜 History
                </button>
              </div>
            </div>

            <div style={{ flex: 1, marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleRunTests}
                disabled={runningTests || submitted}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: runningTests ? '#9ca3af' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: runningTests || submitted ? 'not-allowed' : 'pointer'
                }}
              >
                {runningTests ? '⏳ Running...' : '▶ Run Tests'}
              </button>

              {/* ✅ NEW: Manual Save Button */}
              <button
                onClick={handleManualSave}
                disabled={!sessionId || submitted}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: (!sessionId || submitted) ? '#9ca3af' : '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: (!sessionId || submitted) ? 'not-allowed' : 'pointer'
                }}
              >
                💾 Save Code
              </button>

              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting || submitted || timeExpired || timeRemaining === 0} 
                style={{
                  flex: 1,
                  padding: '12px',
                  background: (submitted || timeExpired) ? '#9ca3af' : '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: (submitting || submitted || timeExpired) ? 'not-allowed' : 'pointer'
                }}
              >
                {timeExpired ? '⏰ Time Expired' : submitted ? '✓ Submitted' : submitting ? '⏳ Submitting...' : '✓ Submit Solution'}
              </button>
            </div>

            {/* Test Results (Web Terminal) */}
            {testResults && (
              <div style={{
                marginTop: 16,
                padding: 16,
                background: '#1e293b', // Terminal background
                color: '#e2e8f0', // Terminal text color
                border: '2px solid #e5e7eb',
                borderRadius: 8,
                maxHeight: 300,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: 13
              }}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: testResults.passed === testResults.total ? '#10b981' : '#f59e0b' }}>
                  {testResults.passed === testResults.total ? '✅' : '⚠️'} Tests complete: {testResults.passed || 0}/{testResults.total || testResults.results?.length || 0} passed
                </div>
                
                {testResults.compilation_errors && testResults.compilation_errors.length > 0 && (
                  <div style={{ color: '#ef4444', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600 }}>Compilation/Execution Errors:</div>
                    {testResults.compilation_errors.map((err, idx) => (
                      <div key={idx} style={{ marginLeft: 12, marginTop: 4 }}>
                        {err.error}
                      </div>
                    ))}
                  </div>
                )}

                {testResults.results?.map((result, idx) => (
                  <div key={idx} style={{
                    marginBottom: 16,
                    padding: 8,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 4,
                    borderLeft: `4px solid ${result.passed ? '#10b981' : '#ef4444'}`
                  }}>
                    <div style={{ color: result.passed ? '#10b981' : '#ef4444', fontWeight: 600, marginBottom: 4 }}>
                      Test {idx + 1}: {result.passed ? 'Passed' : 'Failed'}
                    </div>
                    <div style={{ marginLeft: 12 }}>
                      <div style={{ color: '#94a3b8' }}>Input: {result.input}</div>
                      <div style={{ color: '#94a3b8' }}>Expected: {result.expected}</div>
                      {!result.passed && result.actual && result.actual !== 'None' && (
                        <div style={{ color: '#f87171' }}>Actual: {result.actual}</div>
                      )}
                      {result.error && (
                        <div style={{ color: '#ef4444', marginTop: 4 }}>
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Submission Result */}
            {submissionResult && (
              <div style={{
                marginTop: 16,
                padding: 16,
                background: submissionResult.score >= 60 ? '#dcfce7' : '#fee2e2',
                border: `2px solid ${submissionResult.score >= 60 ? '#10b981' : '#ef4444'}`,
                borderRadius: 8,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
                  {submissionResult.score}%
                </div>
                <div style={{ fontSize: 16 }}>
                  {(submissionResult.passed_tests || 0)}/{(submissionResult.total_tests || 0)} test cases passed
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Version History Modal */}
        {showVersions && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: 32,
              maxWidth: 600,
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Version History</h2>
              {versions.map((v, idx) => (
                <div key={idx} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 12
                }}>
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                    {new Date(v.saved_at).toLocaleString()}
                  </div>
                  <button
                    onClick={() => restoreVersion(v.code)}
                    style={{
                      padding: '6px 12px',
                      background: '#4f46e5',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))}
              <button
                onClick={() => setShowVersions(false)}
                style={{
                  marginTop: 16,
                  padding: '8px 16px',
                  background: '#6b7280',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============ ADMIN/HIRING MANAGER VIEW ============
  // Show tabbed interface for generating and managing challenges
  return (
    <div style={{minHeight:'100vh', padding:40, background:'#f9fafb'}}>
      <div style={{maxWidth: 1600, margin: '0 auto'}}>
        {/* PAGE HEADER */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111", marginBottom: 8 }}>
            💻 Coding Challenge Management
          </h1>
          <p style={{ color: "#666", fontSize: 16 }}>
            Generate new coding challenges and manage existing ones
          </p>
        </div>

        {/* TAB NAVIGATION */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginBottom: 32,
          borderBottom: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('generate')}
            style={{
              padding: '16px 32px',
              background: activeTab === 'generate' ? '#4f46e5' : 'transparent',
              color: activeTab === 'generate' ? '#fff' : '#666',
              border: 'none',
              borderBottom: activeTab === 'generate' ? '3px solid #4f46e5' : 'none',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            🎯 Generate New
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            style={{
              padding: '16px 32px',
              background: activeTab === 'manage' ? '#4f46e5' : 'transparent',
              color: activeTab === 'manage' ? '#fff' : '#666',
              border: 'none',
              borderBottom: activeTab === 'manage' ? '3px solid #4f46e5' : 'none',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            📚 Manage Existing
          </button>
        </div>

        {/* ========== GENERATE TAB ========== */}
        {activeTab === 'generate' && (
          <div style={{maxWidth: 900, margin: '0 auto'}}>
            {/* Generation Form */}
            <div style={{
              background: '#fff',
              border: '2px solid #e5e7eb',
              borderRadius: 12,
              padding: 32,
              marginBottom: 32
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>
                Generate New Coding Challenges
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                    Role
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g., Software Engineer"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14
                    }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14
                    }}
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="go">Go</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                    Topic (Optional)
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Arrays, Trees, Dynamic Programming"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                    Number of Challenges
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={numChallenges}
                    onChange={(e) => setNumChallenges(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14
                    }}
                  />
                </div>
              </div>

              <button
                onClick={generateChallenges}
                disabled={generating}
                style={{
                  padding: '12px 32px',
                  background: generating ? '#9ca3af' : '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: generating ? 'not-allowed' : 'pointer'
                }}
              >
                {generating ? '⏳ Generating...' : '🤖 Generate Challenges'}
              </button>
            </div>
          </div>
        )}

        {/* ========== MANAGE TAB ========== */}
        {activeTab === 'manage' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: selectedChallenge ? '420px 1fr' : '1fr',
            gap: 24,
            minHeight: 600
          }}>
            {/* LEFT: CHALLENGES LIST */}
            <div style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              border: '2px solid #e5e7eb',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 280px)'
            }}>
              {/* Header */}
              <div style={{
                padding: 24,
                borderBottom: '2px solid #e5e7eb',
                background: '#f9fafb'
              }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 16 }}>
                  📚 All Challenges
                </h2>
                
                <div style={{
                  padding: '12px',
                  background: '#f3f4f6',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#6b7280',
                  marginBottom: 16
                }}>
                  {challenges.length} challenges • Use tabs above to generate more
                </div>
              </div>

              {/* List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: 16
              }}>
                {loadingList ? (
                  <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                    <div>Loading challenges...</div>
                  </div>
                ) : challenges.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                    <div style={{ fontSize: 14 }}>No challenges found</div>
                    <div style={{ fontSize: 12, marginTop: 8 }}>Generate one in the Generate tab</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {challenges.map((challengeItem) => (
                      <div
                        key={challengeItem.challenge_id}
                        onClick={() => setSelectedChallenge(challengeItem)}
                        style={{
                          padding: 16,
                          background: selectedChallenge?.challenge_id === challengeItem.challenge_id
                            ? '#dbeafe'
                            : '#f9fafb',
                          border: selectedChallenge?.challenge_id === challengeItem.challenge_id
                            ? '2px solid #3b82f6'
                            : '2px solid #e5e7eb',
                          borderRadius: 12,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#111',
                          marginBottom: 8
                        }}>
                          {challengeItem.title}
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: '#666',
                          marginBottom: 8
                        }}>
                          {challengeItem.language} • {challengeItem.difficulty}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '4px 8px',
                            background: challengeItem.difficulty === 'easy' ? '#dcfce7' : 
                                       challengeItem.difficulty === 'medium' ? '#fef3c7' : '#fee2e2',
                            color: challengeItem.difficulty === 'easy' ? '#166534' :
                                   challengeItem.difficulty === 'medium' ? '#92400e' : '#991b1b',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}>
                            {challengeItem.difficulty}
                          </span>
                          <span style={{
                            padding: '4px 8px',
                            background: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            {challengeItem.language.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 11, color: '#999' }}>
                            {new Date(challengeItem.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: CHALLENGE DETAILS */}
            {selectedChallenge && (
              <div style={{
                background: '#fff',
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                border: '2px solid #e5e7eb',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 280px)'
              }}>
                {/* Header */}
                <div style={{
                  padding: 24,
                  background: '#f9fafb',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111' }}>
                        {selectedChallenge.title}
                      </h3>
                      <div style={{ marginTop: 8, fontSize: 14, color: '#666', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>{selectedChallenge.language}</span>
                        <span>•</span>
                        <span>{selectedChallenge.difficulty} difficulty</span>
                        <span>•</span>
                        <span>{new Date(selectedChallenge.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <span style={{
                          padding: '6px 12px',
                          background: selectedChallenge.difficulty === 'easy' ? '#dcfce7' : 
                                     selectedChallenge.difficulty === 'medium' ? '#fef3c7' : '#fee2e2',
                          color: selectedChallenge.difficulty === 'easy' ? '#166534' :
                                 selectedChallenge.difficulty === 'medium' ? '#854d0e' : '#991b1b',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {selectedChallenge.difficulty.toUpperCase()}
                        </span>
                        <span style={{
                          padding: '6px 12px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {selectedChallenge.language.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedChallenge(null)}
                      style={{
                        padding: '8px 16px',
                        background: '#fff',
                        color: '#666',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    >
                      ✖
                    </button>
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => copyChallengeLink(selectedChallenge.challenge_id)}
                      style={{
                        padding: "8px 16px",
                        background: "#fff",
                        color: "#4f46e5",
                        border: "1px solid #4f46e5",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    >
                      📋 Copy Link
                    </button>

                    <button
                      onClick={() => viewChallenge(selectedChallenge.challenge_id)}
                      style={{
                        padding: "8px 16px",
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    >
                      👁️ View Challenge
                    </button>

                    <button
                      onClick={() => deleteChallenge(selectedChallenge.challenge_id)}
                      style={{
                        padding: "8px 16px",
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #fca5a5",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Challenge Details */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 24
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#111' }}>
                        Description
                      </h4>
                      <div style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                        color: '#374151',
                        fontSize: 14,
                        background: '#f9fafb',
                        padding: 16,
                        borderRadius: 8,
                        border: '1px solid #e5e7eb'
                      }}>
                        {selectedChallenge.description}
                      </div>
                    </div>

                    {selectedChallenge.constraints && (
                      <div>
                        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#111' }}>
                          Constraints
                        </h4>
                        <div style={{
                          whiteSpace: 'pre-wrap',
                          color: '#6b7280',
                          fontSize: 13,
                          background: '#f9fafb',
                          padding: 12,
                          borderRadius: 6,
                          border: '1px solid #e5e7eb'
                        }}>
                          {selectedChallenge.constraints}
                        </div>
                      </div>
                    )}

                    {selectedChallenge.starter_code && (
                      <div>
                        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#111' }}>
                          Starter Code
                        </h4>
                        <pre style={{
                          background: '#1e293b',
                          color: '#e2e8f0',
                          padding: 16,
                          borderRadius: 6,
                          fontSize: 13,
                          fontFamily: 'monospace',
                          overflow: 'auto',
                          maxHeight: 200
                        }}>
                          {selectedChallenge.starter_code}
                        </pre>
                      </div>
                    )}

                    {selectedChallenge.test_cases && selectedChallenge.test_cases.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#111' }}>
                          Test Cases ({selectedChallenge.test_cases.length})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {selectedChallenge.test_cases.slice(0, 3).map((tc, idx) => (
                            <div key={idx} style={{
                              background: '#f9fafb',
                              border: '1px solid #e5e7eb',
                              borderRadius: 6,
                              padding: 12,
                              fontSize: 13,
                              fontFamily: 'monospace'
                            }}>
                              <div><strong>Input:</strong> {JSON.stringify(tc.input)}</div>
                              <div><strong>Expected:</strong> {tc.expected_output}</div>
                            </div>
                          ))}
                          {selectedChallenge.test_cases.length > 3 && (
                            <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                              + {selectedChallenge.test_cases.length - 3} more test cases
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}