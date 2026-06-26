import { useState, useRef, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000/interview/ws/analyze';

export default function AIInterviewPage() {
  const [step, setStep] = useState('setup'); // setup, interview, results
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const isPreconfigured = !!params.get('e');

  const [formData, setFormData] = useState({
    candidate_email: params.get('e') || '',
    candidate_name: params.get('n') || '',
    job_role: params.get('r') || '',
    job_description: '',
    candidate_skills: params.get('s') || '',
    total_questions: params.get('q') ? parseInt(params.get('q'), 10) : 5
  });
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioBase64, setAudioBase64] = useState(null);
  /** Set when interview finishes — HR views full report in dashboard; candidate sees thank-you only */
  const [completedSessionId, setCompletedSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [faceImage, setFaceImage] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
 const [audioChunks, setAudioChunks] = useState([]);
  
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Voice verification refs
  const voiceVerificationRecorderRef = useRef(null);
  const voiceVerificationStreamRef = useRef(null);
  const voiceVerificationChunksRef = useRef([]);
  const vvAnimationFrameRef = useRef(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Voice verification state
  const [voiceVerified, setVoiceVerified] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  
  // Real-time speech recognition
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  
  // Real-time analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisWarnings, setAnalysisWarnings] = useState([]);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [currentGaze, setCurrentGaze] = useState('center');
  const [faceDetected, setFaceDetected] = useState(true);
  const [identityMismatch, setIdentityMismatch] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState(null);
  const analysisIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  const [fatalError, setFatalError] = useState(null);
  
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const wsRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);

  // Initialize camera
  useEffect(() => {
    let stream = null;
    
    const initCamera = async () => {
      if (step === 'setup' || step === 'interview') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            console.log('Camera initialized successfully');
          }
        } catch (err) {
          console.warn('Camera/mic init (non-blocking for FYP):', err);
          // setError('Camera access required for interview: ' + err.message);
        }
      }
    };
    
    initCamera();
    
    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  useEffect(() => {
    return () => {
      const a = ttsAudioRef.current;
      if (a) {
        a.pause();
        try {
          a.src = '';
        } catch (_) {}
        ttsAudioRef.current = null;
      }
    };
  }, []);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);
      
      if (!visible && session && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Send tab switch notification
        wsRef.current.send(JSON.stringify({
          session_id: session.session_id,
          frame_base64: '',
          is_visible: false,
          timestamp: Date.now()
        }));
        setAnalysisWarnings(prev => [...prev, { type: 'tab', message: '⚠️ Tab switched! Stay on this page.', time: new Date().toLocaleTimeString() }]);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session]);

  // Start real-time analysis when entering interview
  useEffect(() => {
    console.log('Effect triggered - step:', step, 'session:', session ? session.session_id : null, 'analyzing:', isAnalyzing);
    
    if (step === 'interview' && session && session.session_id && !isAnalyzing) {
      console.log('Starting real-time analysis...');
      // Wait for video to be ready
      setTimeout(() => {
        if (videoRef.current) {
          startRealtimeAnalysis();
        } else {
          console.log('Video ref not ready, waiting...');
          setTimeout(startRealtimeAnalysis, 2000);
        }
      }, 2000);
    }
    
    return () => {
      stopRealtimeAnalysis();
    };
  }, [step, session?.session_id]);

  const startRealtimeAnalysis = () => {
    if (!session || !session.session_id) {
      console.log('No session, not starting analysis');
      return;
    }
    
    console.log('Starting real-time analysis for session:', session.session_id);
    setIsAnalyzing(true);
    
    // Use REST API instead of WebSocket for reliability
    const analyzeFrame = async () => {
      if (!videoRef.current || !session || !session.session_id) return;
      
      try {
        const canvas = document.createElement('canvas');
        // Use higher resolution for better detection
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Use higher quality JPEG
        const frameBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        // Store for display
        setCapturedFrame(canvas.toDataURL('image/jpeg', 0.8));
        
        // Call REST API
        const response = await fetch(`${API_BASE}/interview/analyze-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.session_id,
            frame_base64: frameBase64,
            is_visible: document.visibilityState === 'visible'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Analysis result:', data);
          
          // Update states
          if (data.gaze_direction) setCurrentGaze(data.gaze_direction);
          if (data.face_detected !== undefined) setFaceDetected(data.face_detected);
          if (data.identity_mismatch !== undefined) setIdentityMismatch(data.identity_mismatch);
          if (data.integrity_score) setIntegrityScore(data.integrity_score);
          if (data.terminate_interview === true) {
             setFatalError("⚠️FATAL SECURITY VIOLATION⚠️\\n\\nWe detected an unapproved secondary person attempting to supply answers on behalf of the registered candidate. \\n\\nThis interview session has been permanently terminated and an administrative flag has been added to your HR file with zero score.");
             setStep("completed");
             setCompletedSessionId(session.session_id);
             stopRecording();
             stopVoiceVerification();
             stopTtsPlayback();
          }
          
          // Handle warnings
          if (data.warnings && data.warnings.length > 0) {
            // Only keep warnings from the current frame to prevent them from getting stuck
            setAnalysisWarnings(data.warnings.map(w => ({ 
                type: 'analysis', 
                message: w, 
                time: new Date().toLocaleTimeString() 
            })));
          } else {
            setAnalysisWarnings([]); // Clear warnings if the issue is resolved
          }
        }
      } catch (err) {
        console.error('Frame analysis error:', err);
      }
    };
    
    // Start the interval
    analysisIntervalRef.current = setInterval(analyzeFrame, 1500);
    
    // Run once immediately
    analyzeFrame();
  };

  const stopRealtimeAnalysis = () => {
    console.log('Stopping real-time analysis');
    
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    
    setIsAnalyzing(false);
    setCurrentGaze('center');
    setFaceDetected(true);
    setIntegrityScore(100);
  };

  const captureAndSendFrame = (ws) => {
    if (!videoRef.current || !session || ws.readyState !== WebSocket.OPEN) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 320; // Smaller size for faster processing
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    
    // Flip horizontally to match mirror effect
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    const frameBase64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
    
    // Store the captured frame for display
    const displayCanvas = document.createElement('canvas');
    displayCanvas.width = 320;
    displayCanvas.height = 240;
    const displayCtx = displayCanvas.getContext('2d');
    displayCtx.translate(displayCanvas.width, 0);
    displayCtx.scale(-1, 1);
    displayCtx.drawImage(videoRef.current, 0, 0, displayCanvas.width, displayCanvas.height);
    setCapturedFrame(displayCanvas.toDataURL('image/jpeg'));
    
    ws.send(JSON.stringify({
      session_id: session.session_id,
      frame_base64: frameBase64,
      is_visible: document.visibilityState === 'visible',
      timestamp: Date.now()
    }));
  };

  const captureFace = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) {
      console.warn('captureFace: no video frame (camera unavailable)');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) {
        console.warn('captureFace: toBlob returned null');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceImage(reader.result);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.92);
  };
  
  // Voice verification - record and transcribe voice sample using MediaRecorder
  const startVoiceVerification = async () => {
    try {
      console.log('Starting voice verification...');
      setError('');
      setVoiceTranscript('');
      
      // Request microphone access explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Store the stream for cleanup later
      voiceVerificationStreamRef.current = stream;
      
      // Set up audio visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const vvAudioContextRef = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      // Start audio level visualization
      const updateAudioLevel = () => {
        if (!analyser) return;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        vvAnimationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();
      
      // Use MediaRecorder for audio capture
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        console.log('Voice verification recording stopped');
        // Stop visualization
        if (vvAnimationFrameRef.current) {
          cancelAnimationFrame(vvAnimationFrameRef.current);
        }
        setAudioLevel(0);
        
        // Convert to base64
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          console.log('Voice verification audio captured, length:', blob.size);
          
          // Send to backend for transcription
          try {
            const response = await fetch(`${API_BASE}/api/interview/transcribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio_base64: base64 })
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.text && data.text.length > 0) {
                setVoiceTranscript(data.text);
                setVoiceVerified(true);
                console.log('Voice verified with transcript:', data.text);
              } else {
                setError('No speech detected. Please try again.');
              }
            } else {
              setError('Failed to transcribe audio. Please try again.');
            }
          } catch (err) {
            console.error('Transcription error:', err);
            setError('Failed to transcribe audio: ' + err.message);
          }
        };
        reader.readAsDataURL(blob);
        
        // Clean up stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
      
      recorder.onerror = (e) => {
        console.error('Voice verification MediaRecorder error:', e);
        setError('Recording error: ' + e.error);
      };
      
      // Start recording
      recorder.start(100);
      voiceVerificationRecorderRef.current = recorder;
      voiceVerificationChunksRef.current = chunks;
      setIsListening(true);
      console.log('Started voice verification recording');
      
    } catch (err) {
      console.error('Failed to start voice verification:', err);
      setError('Failed to access microphone: ' + err.message + '. Please ensure you have granted microphone permission.');
      setIsListening(false);
    }
  };
  
  const stopVoiceVerification = () => {
    if (voiceVerificationRecorderRef.current) {
      voiceVerificationRecorderRef.current.stop();
      voiceVerificationRecorderRef.current = null;
      setIsListening(false);
      console.log('Stopped voice verification recording');
    }
  };

  const stopTtsPlayback = () => {
    const a = ttsAudioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
      try {
        a.src = '';
      } catch (_) {}
      ttsAudioRef.current = null;
    }
    setIsBotSpeaking(false);
  };

  const playAudio = (base64) => {
    if (!base64) return;
    stopTtsPlayback();
    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    ttsAudioRef.current = audio;
    setIsBotSpeaking(true);
    audio.onended = () => {
      setIsBotSpeaking(false);
      ttsAudioRef.current = null;
    };
    audio.onerror = () => {
      setIsBotSpeaking(false);
      ttsAudioRef.current = null;
    };
    audio.play().catch(() => {
      setIsBotSpeaking(false);
      ttsAudioRef.current = null;
    });
  };

  const startInterview = async (e) => {
    e.preventDefault();
    // Allow bypass of faceImage and voice verification for testing
    setLoading(true);
    setError('');

    try {
      // 1. Register Candidate Face on Backend (Only if captured)
      if (faceImage) {
        const formDataObj = new FormData();
        const faceBlob = await (await fetch(faceImage)).blob();
        formDataObj.append('image', faceBlob, 'face.jpg');
        formDataObj.append('candidate_id', formData.candidate_email.trim().toLowerCase());
        
        try {
          const faceResponse = await fetch(`${API_BASE}/vision/register`, {
            method: 'POST',
            body: formDataObj
          });
          
          if (!faceResponse.ok) {
             console.warn('Face registration failed, but proceeding anyway for testing mode.');
          }
        } catch (err) {
          console.warn('Face API error:', err);
        }
      }
      
      // Skipped strict face blocking check
      // 2. Start Interview Session
      const response = await fetch(`${API_BASE}/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_email: formData.candidate_email.trim().toLowerCase(),
          candidate_id: formData.candidate_email.trim().toLowerCase(),
          candidate_name: formData.candidate_name.trim(),
          job_role: formData.job_role,
          job_description: formData.job_description,
          candidate_skills: formData.candidate_skills.split(',').map(s => s.trim()).filter(Boolean),
          total_questions: formData.total_questions,
        })
      });

      if (!response.ok) throw new Error('Failed to start interview');

      const data = await response.json();
      setCompletedSessionId(null);
      setSession(data);
      setCurrentQuestion(data);
      setStep('interview');

      // Play TTS audio if available
      if (data.tts_audio_base64) {
        playAudio(data.tts_audio_base64);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      // Request microphone access explicitly
      console.log('Requesting microphone access...');
      setError('');
      
      // First try to get user media for audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      audioStreamRef.current = stream;
      
      // Set up audio analysis for visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Start audio level visualization
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();
      
      // Use MediaRecorder for audio capture
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        console.log('MediaRecorder stopped, processing audio...');
        // Stop audio level visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevel(0);
        
        // Convert audio to base64
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          setAudioBase64(base64);
          console.log('Audio captured, length:', blob.size);
        };
        reader.readAsDataURL(blob);
        
        // Clean up audio stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
      
      recorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setError('Recording error: ' + e.error);
      };
      
      // Start recording with timeslice of 100ms for regular data availability
      recorder.start(100);
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      setIsListening(true);
      setLiveTranscript('Recording your answer...');
      setTranscript('');
      console.log('Started MediaRecorder recording');
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone: ' + err.message + '. Please ensure you have granted microphone permission.');
      setIsRecording(false);
      setIsListening(false);
    }
  };
  
  // Fallback MediaRecorder function
  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result.split(',')[1]);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
    } catch (err) {
      setError('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    // Stop voice verification recorder if active
    if (voiceVerificationRecorderRef.current) {
      voiceVerificationRecorderRef.current.stop();
      voiceVerificationRecorderRef.current = null;
    }
    
    // Stop MediaRecorder if active
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    
    // Clean up audio stream and visualization
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setAudioLevel(0);
    setIsRecording(false);
    setIsListening(false);
    console.log('Recording stopped. Transcript:', transcript);
  };

  const submitAnswer = async () => {
    setLoading(true);
    setError('');
    stopTtsPlayback();

    try {
      // If no audio recorded, use transcript text
      const payload = {
        session_id: session.session_id,
        question_index: currentQuestion.question_index,
        audio_base64: audioBase64 || undefined,
        transcript_text: transcript || undefined,
        frame_base64_list: faceImage ? [faceImage.split(',')[1]] : []
      };

      const response = await fetch(`${API_BASE}/interview/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.status === 'completed') {
        // Get final report
        await getReport(session.session_id);
      } else {
        setCurrentQuestion(data);
        setAudioBase64(null);
        setTranscript('');
        if (data.tts_audio_base64) {
          playAudio(data.tts_audio_base64);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getReport = async (sessionId, options = {}) => {
    setLoading(true);
    try {
      // Stop real-time analysis first
      stopRealtimeAnalysis();
      
      const response = await fetch(`${API_BASE}/interview/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          early_end: !!options.earlyEnd,
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(errBody || 'Failed to complete interview');
      }
      // Consume body so the report is generated server-side & saved for HR — do not show to candidate
      await response.json().catch(() => ({}));

      setCompletedSessionId(sessionId);
      setSession(null);
      setCurrentQuestion(null);
      setStep('results');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const endInterviewEarly = async () => {
    if (!session?.session_id) return;
    if (!window.confirm('End the interview now? Unanswered questions will be scored as 0.')) return;
    setError('');
    stopTtsPlayback();
    if (isRecording) {
      stopRecording();
    }
    stopRealtimeAnalysis();
    await getReport(session.session_id, { earlyEnd: true });
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f3f4f6',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes botSpeak {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.5); }
          50% { transform: scale(1.04); box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); }
        }
      `}</style>
      {/* Header */}
      <div style={{
        background: '#0f172a',
        color: 'white',
        padding: '24px 32px',
        borderRadius: '16px',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{ background: '#ffffff20', padding: '12px', borderRadius: '12px', fontSize: '24px' }}>
          🎙️
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em' }}>Autonomous AI Interview</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
            {step === 'setup' && 'Candidate Identity Verification & System Onboarding'}
            {step === 'interview' && 'Live Evaluation Session in Progress'}
            {(step === 'results' || step === 'completed') && 'Evaluation Concluded'}
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontWeight: '500'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Setup Step */}
      {step === 'setup' && (
        <form onSubmit={startInterview}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 1fr) minmax(350px, 1.2fr)',
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Left Column: Candidate Overview */}
            <div style={{
              background: 'white',
              padding: '32px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '700', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>
                Session Configuration
              </h2>
              
              {!isPreconfigured && (
                <div style={{ marginBottom: '20px', padding: '12px', background: '#fffbeb', color: '#b45309', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }}>
                  Manual configuration mode active. Please fill all fields.
                </div>
              )}

              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Candidate Name
                  </label>
                  {isPreconfigured ? (
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{formData.candidate_name}</div>
                  ) : (
                    <input type="text" required value={formData.candidate_name} onChange={e => setFormData({...formData, candidate_name: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Candidate Email
                  </label>
                  {isPreconfigured ? (
                    <div style={{ fontSize: '16px', color: '#334155' }}>{formData.candidate_email}</div>
                  ) : (
                    <input type="email" required value={formData.candidate_email} onChange={e => setFormData({...formData, candidate_email: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Target Role
                  </label>
                  {isPreconfigured ? (
                    <div style={{ fontSize: '16px', color: '#334155', fontWeight: '500' }}>{formData.job_role}</div>
                  ) : (
                    <input type="text" required value={formData.job_role} onChange={e => setFormData({...formData, job_role: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Extracted Skills
                  </label>
                  {isPreconfigured ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {formData.candidate_skills.split(',').map((s, i) => (
                        <span key={i} style={{ background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <input type="text" value={formData.candidate_skills} onChange={e => setFormData({...formData, candidate_skills: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  )}
                </div>

                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Interview Length
                  </label>
                  <div style={{ fontSize: '15px', color: '#334155' }}>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{formData.total_questions}</span> strict technical questions
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Verification Modules */}
            <div style={{
              background: 'white',
              padding: '32px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>
                Identity Integrity & Verification
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Face Capture Box */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Face Anchor</span>
                    {faceImage ? <span style={{ color: '#059669' }}>✓ Verified</span> : <span style={{ color: '#ef4444' }}>Required</span>}
                  </div>
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '8px', transform: 'scaleX(-1)', backgroundColor: '#cbd5e1', border: faceImage ? '2px solid #10b981' : '2px dashed #94a3b8' }} />
                    <button type="button" onClick={captureFace} style={{ marginTop: '16px', width: '100%', background: faceImage ? '#f1f5f9' : '#0f172a', color: faceImage ? '#0f172a' : '#fff', border: faceImage ? '1px solid #cbd5e1' : 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {faceImage ? 'Retake Photo' : 'Capture Integrity Anchor'}
                    </button>
                    <p style={{ margin: '12px 0 0', fontSize: '11px', color: '#64748b', textAlign: 'center', lineHeight: '1.4' }}>
                      This anchor image serves as the permanent baseline for live anti-spoofing detection. Look directly at the camera.
                    </p>
                  </div>
                </div>

                {/* Voice Capture Box */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Voice Signature</span>
                    {voiceVerified ? <span style={{ color: '#059669' }}>✓ Verified</span> : <span style={{ color: '#ef4444' }}>Required</span>}
                  </div>
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}>
                       <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: isListening ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', transition: 'all 0.3s', border: isListening ? '2px solid #ef4444' : 'none', animation: isListening ? 'pulse 1.5s infinite' : 'none' }}>
                         🎤
                       </div>
                       {voiceTranscript ? (
                         <div style={{ marginTop: '16px', fontSize: '12px', color: '#059669', textAlign: 'center', fontWeight: '500', fontStyle: 'italic', background: '#ecfdf5', padding: '8px', borderRadius: '6px' }}>
                           "{voiceTranscript.substring(0, 40)}..."
                         </div>
                       ) : (
                         <p style={{ marginTop: '16px', fontSize: '12px', color: '#64748b', textAlign: 'center', margin: '16px 0 0' }}>
                           Record a 5-second sample holding your natural speaking voice.
                         </p>
                       )}
                    </div>
                    <button type="button" onClick={isListening ? stopVoiceVerification : startVoiceVerification} style={{ width: '100%', background: isListening ? '#ef4444' : '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {isListening ? '⏹️ Stop Recording' : (voiceVerified ? 'Retake Sample' : 'Record Baseline')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Start Button Area */}
              <div style={{ marginTop: '8px', borderTop: '2px solid #f1f5f9', paddingTop: '24px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: loading ? '#94a3b8' : '#0f172a',
                    color: 'white',
                    border: 'none',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: loading ? 'none' : '0 4px 12px rgba(15, 23, 42, 0.2)'
                  }}
                >
                  {loading ? 'Initializing Secure Connection...' : 'Enter Secure Evaluation Environment'}
                </button>
                <p style={{ margin: '12px 0 0', fontSize: '11px', color: '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Activity, tab visibility, and identity are continuously monitored.
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Interview Step */}
      {step === 'interview' && currentQuestion && (
        <div style={{
          background: '#f8fafc',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 32px',
            background: 'white',
            borderBottom: '1px solid #e2e8f0',
          }}>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b', fontWeight: '800', letterSpacing: '-0.5px' }}>
              {formData.job_role || 'Software Engineer'}
            </h1>
            <button
              onClick={endInterviewEarly}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'transparent',
                border: 'none',
                color: '#4f46e5',
                fontWeight: '700',
                fontSize: '15px',
                cursor: 'pointer'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
              Leave Interview
            </button>
          </div>

          {/* Main Content Split */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            
            {/* Left Column (Video & Controls) */}
            <div style={{ flex: '7', padding: '32px 48px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              
              {/* Progress and Timer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  <span style={{ fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                    Question {currentQuestion.question_index + 1}/{currentQuestion.total_questions}
                  </span>
                  <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', flex: 1, maxWidth: '200px' }}>
                    <div style={{ 
                      width: `${((currentQuestion.question_index + 1) / currentQuestion.total_questions) * 100}%`, 
                      height: '100%', 
                      background: '#4f46e5', 
                      borderRadius: '2px' 
                    }} />
                  </div>
                </div>
                
                <div style={{ 
                  background: '#475569', 
                  color: 'white', 
                  padding: '6px 12px', 
                  borderRadius: '6px', 
                  fontSize: '14px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px' 
                }}>
                  Total remaining time <span style={{ background: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>13:00</span>
                </div>
              </div>

              {/* Identity Mismatch Banner */}
              {identityMismatch && (
                <div style={{ background: '#ef4444', color: 'white', padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', animation: 'pulse 2s infinite' }}>
                  🚨 IDENTITY MISMATCH DETECTED! VERIFICATION BLOCKED.
                </div>
              )}

              {/* Videos Side by Side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                
                {/* AI Avatar */}
                <div style={{ 
                  aspectRatio: '16/9', 
                  borderRadius: '8px', 
                  overflow: 'hidden', 
                  border: isBotSpeaking ? '3px solid #6366f1' : '3px solid #4f46e5',
                  position: 'relative',
                  backgroundColor: '#cbd5e1'
                }}>
                  <img src="/ai_interviewer.png" alt="AI Interviewer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {isBotSpeaking && (
                    <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '4px' }}>
                      <span style={{ width: '6px', height: '16px', background: 'white', borderRadius: '3px', animation: 'pulse 0.8s infinite alternate' }} />
                      <span style={{ width: '6px', height: '24px', background: 'white', borderRadius: '3px', animation: 'pulse 0.8s infinite alternate 0.2s' }} />
                      <span style={{ width: '6px', height: '12px', background: 'white', borderRadius: '3px', animation: 'pulse 0.8s infinite alternate 0.4s' }} />
                    </div>
                  )}
                </div>

                {/* User WebCam */}
                <div style={{ 
                  aspectRatio: '16/9', 
                  borderRadius: '8px', 
                  overflow: 'hidden', 
                  position: 'relative',
                  backgroundColor: '#e2e8f0',
                  border: faceDetected && !identityMismatch ? '3px solid transparent' : '3px solid #ef4444'
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)'
                    }}
                  />
                  {isRecording && (
                    <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 12px', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <span style={{ width: '12px', height: '12px', background: '#4f46e5', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '14px' }}>
                         {[...Array(5)].map((_, i) => (
                           <div key={i} style={{ width: '3px', background: '#a5b4fc', borderRadius: '2px', height: `${Math.max(20, Math.min(100, (audioLevel / 50) * 100))}%`, transition: 'height 0.1s ease' }} />
                         ))}
                      </div>
                    </div>
                  )}

                  {/* Integrity Overlay */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                      Integrity: {Math.round(integrityScore)}%
                    </div>
                    {!isTabVisible && (
                      <div style={{ background: '#ef4444', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                        WARNING: Tab switched!
                      </div>
                    )}
                    {identityMismatch && (
                      <div style={{ background: '#ef4444', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                        IDENTITY MISMATCH!
                      </div>
                    )}
                    
                    {/* Render Analysis Warnings (Looking away, multiple faces, etc.) */}
                    {analysisWarnings.map((warning, idx) => (
                      <div key={idx} style={{ 
                        background: '#f59e0b', 
                        color: 'white', 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        maxWidth: '200px',
                        textAlign: 'right'
                      }}>
                        {warning.message}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Subtitles Box */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                <div style={{ 
                  background: '#475569', 
                  color: 'white', 
                  padding: '12px 24px', 
                  borderRadius: '12px', 
                  fontSize: '14px',
                  fontWeight: '500',
                  minWidth: '350px',
                  maxWidth: '80%',
                  textAlign: 'center',
                  minHeight: '44px',
                  filter: identityMismatch ? 'blur(12px)' : 'none',
                  transition: 'filter 0.3s ease'
                }}>
                  {isBotSpeaking ? `AVA: ${currentQuestion.question_text}` : (isRecording ? `YOU: ${liveTranscript || transcript || '...'}` : 'Waiting for your response...')}
                </div>
              </div>

              {/* Controls (CC, Chat) */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: 'auto' }}>
                <button style={{ width: '48px', height: '48px', borderRadius: '12px', border: '2px solid #a5b4fc', background: 'white', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9.5 13.5a2.5 2.5 0 0 1 0-5"/><path d="M16.5 13.5a2.5 2.5 0 0 1 0-5"/></svg>
                </button>
                <button style={{ width: '48px', height: '48px', borderRadius: '12px', border: '2px solid #a5b4fc', background: 'white', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                </button>
              </div>

              {/* Primary Action Button */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px', gap: '16px' }}>
                {(!isRecording && (audioBase64 || transcript)) ? (
                  <button
                    onClick={submitAnswer}
                    disabled={loading || isBotSpeaking || identityMismatch}
                    style={{
                      background: loading || isBotSpeaking || identityMismatch ? '#a5b4fc' : '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '16px 64px',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: loading || isBotSpeaking || identityMismatch ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {loading ? 'Processing...' : 'Submit Answer'}
                  </button>
                ) : (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={loading || isBotSpeaking || identityMismatch}
                    style={{
                      background: loading || isBotSpeaking || identityMismatch ? '#a5b4fc' : (isRecording ? '#ef4444' : '#4f46e5'),
                      color: 'white',
                      border: 'none',
                      padding: '16px 64px',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: loading || isBotSpeaking || identityMismatch ? 'not-allowed' : 'pointer',
                      boxShadow: isRecording ? '0 4px 14px 0 rgba(239, 68, 68, 0.39)' : '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isRecording ? 'Stop Recording' : 'Start Answer'}
                  </button>
                )}
              </div>
              
            </div>

            {/* Right Column (Chat Panel) */}
            <div style={{ flex: '3', borderLeft: '1px solid #e2e8f0', background: 'white', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '24px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '16px' }}>Interview Conversation</div>
                <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              
              <div style={{ 
                flex: 1, 
                padding: '24px 20px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '24px',
                filter: identityMismatch ? 'blur(12px)' : 'none',
                transition: 'filter 0.3s ease',
                pointerEvents: identityMismatch ? 'none' : 'auto',
                userSelect: identityMismatch ? 'none' : 'auto'
              }}>
                {/* AI Greeting Bubble (Simulated greeting) */}
                {currentQuestion.question_index === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Ava</span>
                    <div style={{ background: '#e0e7ff', padding: '16px', borderRadius: '0 16px 16px 16px', color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
                      Hi, I'm Ava, the AI interviewer for this interview. Thank you for your interest in the position of {formData.job_role || 'developer'}. Hopefully, we will have a productive session. If you are ready to start the interview, please click "Start Answer" when I ask a question.
                    </div>
                  </div>
                )}

                {/* AI Active Question Bubble */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Ava</span>
                  <div style={{ background: '#e0e7ff', padding: '16px', borderRadius: '0 16px 16px 16px', color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
                    {currentQuestion.question_text}
                  </div>
                </div>

                {/* User Response Bubble */}
                {(isRecording || transcript || liveTranscript) && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>You</span>
                    <div style={{ background: 'white', border: '1px solid #f1f5f9', padding: '16px', borderRadius: '16px 0 16px 16px', color: '#334155', fontSize: '14px', lineHeight: '1.6', maxWidth: '90%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      {liveTranscript || transcript || (isRecording ? 'Listening...' : '')}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Results: candidate confirmation only — full report is HR-only */}
      {(step === 'completed' || step === 'results') && completedSessionId && (
        <div style={{
          background: 'white',
          padding: '40px 32px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          maxWidth: '520px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>{fatalError ? '🚨' : '✅'}</div>
          <h2 style={{ margin: '0 0 12px', fontSize: '24px', color: fatalError ? '#ef4444' : '#111827' }}>
            {fatalError ? 'Interview Terminated' : 'Interview complete'}
          </h2>
          
          {fatalError ? (
            <p style={{ margin: '0 0 16px', color: '#ef4444', fontSize: '16px', lineHeight: 1.6, fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>
              {fatalError}
            </p>
          ) : (
            <p style={{ margin: '0 0 16px', color: '#4b5563', fontSize: '16px', lineHeight: 1.6 }}>
              Thank you{formData.candidate_name ? `, ${formData.candidate_name}` : ''}. Your responses have been submitted successfully.
            </p>
          )}
          <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>
            Scores and detailed feedback are available only to the recruitment team. If you are selected to move forward, they will contact you with next steps.
          </p>
          <p style={{ margin: '0 0 28px', fontSize: '12px', color: '#9ca3af' }}>
            Reference ID (for support only):<br />
            <code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', wordBreak: 'break-all' }}>{completedSessionId}</code>
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
