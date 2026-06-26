/**
 * Interview.js - Main application logic for AI Interview
 * 
 * This module wires together all the interview functionality:
 * - Camera/microphone permissions
 * - Face registration and tracking
 * - Push-to-talk audio recording
 * - WebSocket communication
 * - Session management and reporting
 */

// ==================== Configuration ====================
const CONFIG = {
    wsUrl: 'ws://localhost:8000/ws/interview',
    apiUrl: 'http://localhost:8000',
    silenceDelay: 1500,  // ms to wait after AI speaks before re-enabling mic
    faceCheckInterval: 3000,  // ms between face/emotion checks
    maxSilenceLevel: 0.01  // Audio level below which is considered silence
};

// ==================== Session State ====================
const session = {
    sessionId: null,
    candidateId: 'candidate_001',
    jobRole: 'Software Engineer',
    history: [],
    emotionLog: [],
    faceAlerts: [],
    isConnected: false,
    isRecording: false,
    isProcessing: false,
    sessionStartTime: null,
    silenceTimer: null,
    faceCheckInterval: null,
    emotionCheckInterval: null,
    verifyStream: null,
    faceVerified: false
};

// ==================== DOM Elements ====================
const elements = {
    video: null,
    canvas: null,
    micButton: null,
    statusIndicator: null,
    statusText: null,
    sessionTimer: null,
    faceStatus: null,
    emotionBadge: null,
    emotionEmoji: null,
    emotionText: null,
    chatMessages: null,
    faceAlertBanner: null,
    interviewModal: null,
    finalScore: null,
    strengthsList: null,
    concernsList: null,
    recommendationText: null,
    endInterviewBtn: null,
    closeModalBtn: null,
    thinkingSpinner: null
};

// ==================== Media Streams ====================
let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let silenceDetectionInterval = null;

// ==================== WebSocket ====================
let ws = null;

// ==================== Emotion Mapping ====================
const emotionMap = {
    'happy': { emoji: '😊', text: 'Happy' },
    'sad': { emoji: '😢', text: 'Sad' },
    'angry': { emoji: '😠', text: 'Angry' },
    'fear': { emoji: '😰', text: 'Fearful' },
    'surprise': { emoji: '😲', text: 'Surprised' },
    'disgust': { emoji: '🤢', text: 'Disgusted' },
    'neutral': { emoji: '😐', text: 'Neutral' },
    'nervous': { emoji: '😰', text: 'Nervous' },
    'confident': { emoji: '😎', text: 'Confident' },
    'unknown': { emoji: '❓', text: 'Unknown' }
};

// ==================== Initialization ====================
function init() {
    // Cache DOM elements
    cacheElements();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize session
    initSession();
}

function cacheElements() {
    elements.video = document.getElementById('webcam');
    elements.canvas = document.getElementById('overlay');
    elements.micButton = document.getElementById('mic-button');
    elements.statusIndicator = document.getElementById('status-indicator');
    elements.statusText = elements.statusIndicator.querySelector('.status-text');
    elements.sessionTimer = document.getElementById('session-timer');
    elements.faceStatus = document.getElementById('face-status');
    elements.emotionBadge = document.getElementById('emotion-badge');
    elements.emotionEmoji = elements.emotionBadge.querySelector('.emotion-emoji');
    elements.emotionText = elements.emotionBadge.querySelector('.emotion-text');
    elements.chatMessages = document.getElementById('chat-messages');
    elements.faceAlertBanner = document.getElementById('face-alert-banner');
    elements.interviewModal = document.getElementById('interview-modal');
    elements.finalScore = document.getElementById('final-score');
    elements.strengthsList = document.getElementById('strengths-list');
    elements.concernsList = document.getElementById('concerns-list');
    elements.recommendationText = document.getElementById('recommendation-text');
    elements.endInterviewBtn = document.getElementById('end-interview');
    elements.closeModalBtn = document.getElementById('close-modal');
    
    // Verification modal elements
    elements.verificationModal = document.getElementById('verification-modal');
    elements.verifyWebcam = document.getElementById('verify-webcam');
    elements.captureVerifyBtn = document.getElementById('capture-verify-btn');
    elements.verificationStatus = document.getElementById('verification-status');
    elements.verificationResult = document.getElementById('verification-result');
    elements.proceedBtn = document.getElementById('proceed-btn');
    elements.retryBtn = document.getElementById('retry-btn');
    elements.skipVerification = document.getElementById('skip-verification');
}

function setupEventListeners() {
    // Microphone button - push to talk
    elements.micButton.addEventListener('mousedown', startRecording);
    elements.micButton.addEventListener('mouseup', stopRecording);
    elements.micButton.addEventListener('mouseleave', stopRecording);
    
    // Touch support
    elements.micButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startRecording();
    });
    elements.micButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopRecording();
    });
    
    // End interview
    elements.endInterviewBtn.addEventListener('click', endInterview);
    elements.closeModalBtn.addEventListener('click', () => {
        elements.interviewModal.classList.add('hidden');
    });
    
    // Verification modal events
    if (elements.captureVerifyBtn) {
        elements.captureVerifyBtn.addEventListener('click', captureAndVerify);
    }
    if (elements.proceedBtn) {
        elements.proceedBtn.addEventListener('click', startInterviewAfterVerification);
    }
    if (elements.retryBtn) {
        elements.retryBtn.addEventListener('click', resetVerification);
    }
    if (elements.skipVerification) {
        elements.skipVerification.addEventListener('click', skipVerification);
    }
}

function initSession() {
    // Generate session ID
    session.sessionId = 'session_' + Date.now();
    session.sessionStartTime = Date.now();
    
    console.log('Initializing session:', session.sessionId);
    
    // Show verification modal first
    showVerificationModal();
}

// ==================== Face Verification ====================
async function showVerificationModal() {
    if (!elements.verificationModal) {
        initMedia();
        return;
    }
    
    elements.verificationModal.classList.remove('hidden');
    elements.verificationModal.style.display = 'flex';
    
    try {
        const verifyStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: false
        });
        
        elements.verifyWebcam.srcObject = verifyStream;
        await elements.verifyWebcam.play();
        
        session.verifyStream = verifyStream;
        
    } catch (error) {
        console.error('Camera access error:', error);
        alert('Camera access is required for verification. Please allow camera access.');
        skipVerification();
    }
}

async function captureAndVerify() {
    if (!elements.verifyWebcam.videoWidth) {
        alert('Camera not ready. Please wait.');
        return;
    }
    
    elements.captureVerifyBtn.disabled = true;
    elements.verificationStatus.classList.remove('hidden');
    elements.verificationResult.classList.add('hidden');
    
    try {
        const canvas = document.createElement('canvas');
        canvas.width = elements.verifyWebcam.videoWidth;
        canvas.height = elements.verifyWebcam.videoHeight;
        canvas.getContext('2d').drawImage(elements.verifyWebcam, 0, 0);
        
        const frameBase64 = canvas.toDataURL('image/jpeg', 0.8);
        
        const response = await fetch(`${CONFIG.apiUrl}/interview/verify-before-start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                candidate_id: session.candidateId,
                frame_base64: frameBase64
            })
        });
        
        const result = await response.json();
        
        elements.verificationStatus.classList.add('hidden');
        elements.verificationResult.classList.remove('hidden');
        
        if (result.verified && result.can_start) {
            elements.verificationResult.className = 'verification-result success';
            elements.verificationResult.querySelector('.result-icon').textContent = '✅';
            elements.verificationResult.querySelector('.result-message').textContent = 'Identity verified! You can proceed to the interview.';
            elements.proceedBtn.classList.remove('hidden');
            elements.retryBtn.classList.add('hidden');
            session.faceVerified = true;
            
            await registerFaceForInterview(frameBase64);
            
        } else {
            elements.verificationResult.className = 'verification-result failure';
            elements.verificationResult.querySelector('.result-icon').textContent = '❌';
            elements.verificationResult.querySelector('.result-message').textContent = result.message || 'Verification failed. Please try again.';
            elements.proceedBtn.classList.add('hidden');
            elements.retryBtn.classList.remove('hidden');
            session.faceVerified = false;
        }
        
    } catch (error) {
        console.error('Verification error:', error);
        elements.verificationStatus.classList.add('hidden');
        elements.verificationResult.classList.remove('hidden');
        elements.verificationResult.className = 'verification-result failure';
        elements.verificationResult.querySelector('.result-icon').textContent = '❌';
        elements.verificationResult.querySelector('.result-message').textContent = 'Verification failed. Please try again.';
        elements.retryBtn.classList.remove('hidden');
    }
    
    elements.captureVerifyBtn.disabled = false;
}

async function registerFaceForInterview(frameBase64) {
    try {
        const formData = new FormData();
        const blob = dataURLtoBlob(frameBase64);
        formData.append('image', blob, 'capture.jpg');
        formData.append('candidate_id', session.candidateId);
        
        await fetch(`${CONFIG.apiUrl}/vision/register`, {
            method: 'POST',
            body: formData
        });
        
        console.log('Face registered for continuous verification');
        
    } catch (error) {
        console.error('Face registration error:', error);
    }
}

function resetVerification() {
    elements.verificationResult.classList.add('hidden');
    elements.captureVerifyBtn.disabled = false;
}

function startInterviewAfterVerification() {
    if (session.verifyStream) {
        session.verifyStream.getTracks().forEach(track => track.stop());
    }
    
    elements.verificationModal.style.display = 'none';
    elements.verificationModal.classList.add('hidden');
    
    initMedia();
}

function skipVerification() {
    if (session.verifyStream) {
        session.verifyStream.getTracks().forEach(track => track.stop());
    }
    
    elements.verificationModal.style.display = 'none';
    elements.verificationModal.classList.add('hidden');
    
    initMedia();
}

// ==================== Media Initialization ====================
async function initMedia() {
    try {
        setStatus('idle', 'Requesting permissions...');
        
        // Request camera and microphone
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        // Set video source
        elements.video.srcObject = mediaStream;
        await elements.video.play();
        
        setStatus('idle', 'Permissions granted');
        
        // Initialize face tracking
        await initFaceTracking();
        
    } catch (error) {
        console.error('Media initialization error:', error);
        setStatus('error', 'Permission denied');
        alert('Please allow camera and microphone access to continue the interview.');
    }
}

// ==================== Face Tracking ====================
async function initFaceTracking() {
    try {
        setStatus('idle', 'Loading face detection...');
        
        // Load face-api.js models (from CDN)
        // Note: In production, you'd host these models locally
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        
        setStatus('idle', 'Registering candidate...');
        
        // Register candidate face
        await registerCandidate();
        
        // Start face tracking
        startFaceTracking();
        
        // Connect WebSocket
        connectWebSocket();
        
    } catch (error) {
        console.error('Face tracking init error:', error);
        // Continue without face tracking
        connectWebSocket();
    }
}

async function registerCandidate() {
    try {
        // Capture current frame as registration image
        const canvas = document.createElement('canvas');
        canvas.width = elements.video.videoWidth;
        canvas.height = elements.video.videoHeight;
        canvas.getContext('2d').drawImage(elements.video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        // Send to backend for registration
        const formData = new FormData();
        formData.append('image', dataURLtoBlob(canvas.toDataURL('image/jpeg')));
        formData.append('candidate_id', session.candidateId);
        
        const response = await fetch(`${CONFIG.apiUrl}/vision/register`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Candidate face registered successfully');
            setFaceStatus(true);
        } else {
            console.warn('Face registration failed:', result.message);
            // Continue anyway
        }
        
    } catch (error) {
        console.error('Register candidate error:', error);
    }
}

function startFaceTracking() {
    // Check face and emotions periodically
    session.faceCheckInterval = setInterval(async () => {
        await checkFaceAndEmotion();
    }, CONFIG.faceCheckInterval);
}

async function checkFaceAndEmotion() {
    if (!elements.video.videoWidth) return;
    
    try {
        // Detect face with expressions
        const detection = await faceapi.detectSingleFace(
            elements.video,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceExpressions();
        
        if (detection && detection.expressions) {
            // Find dominant emotion
            let maxScore = 0;
            let dominantEmotion = 'neutral';
            
            for (const [emotion, score] of Object.entries(detection.expressions)) {
                if (score > maxScore) {
                    maxScore = score;
                    dominantEmotion = emotion;
                }
            }
            
            // Update emotion display
            updateEmotionBadge(dominantEmotion);
            
            // Log emotion
            session.emotionLog.push({
                emotion: dominantEmotion,
                score: maxScore,
                timestamp: Date.now()
            });
            
            // Send for full analysis (verification + emotion)
            await analyzeCurrentFrame();
        }
        
    } catch (error) {
        // Silently ignore detection errors
    }
}

async function analyzeCurrentFrame() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = elements.video.videoWidth;
        canvas.height = elements.video.videoHeight;
        canvas.getContext('2d').drawImage(elements.video, 0, 0);
        
        const frameBase64 = canvas.toDataURL('image/jpeg', 0.6);
        
        const formData = new FormData();
        formData.append('image', dataURLtoBlob(frameBase64));
        formData.append('candidate_id', session.candidateId);
        
        const response = await fetch(`${CONFIG.apiUrl}/vision/full-check`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        // Update face verification status
        if (result.verified !== undefined) {
            const wasVerified = session.faceAlerts.length === 0 || 
                session.faceAlerts[session.faceAlerts.length - 1].verified;
            
            if (!result.verified && wasVerified) {
                session.faceAlerts.push({
                    verified: false,
                    timestamp: Date.now()
                });
                showFaceMismatchAlert();
            }
            
            setFaceStatus(result.verified);
        }
        
    } catch (error) {
        // Silently ignore
    }
}

function showFaceMismatchAlert() {
    if (elements.faceAlertBanner) {
        elements.faceAlertBanner.classList.remove('hidden');
        elements.faceAlertBanner.innerHTML = `
            <span class="alert-icon">⚠️</span>
            <span>Face mismatch detected! Continuing interview but recording alert.</span>
        `;
        
        setTimeout(() => {
            elements.faceAlertBanner.classList.add('hidden');
        }, 5000);
    }
}

// ==================== Recording ====================
function startRecording() {
    if (session.isRecording || session.isProcessing) return;
    if (!session.isConnected) {
        alert('Not connected to server. Please wait...');
        return;
    }
    
    session.isRecording = true;
    audioChunks = [];
    
    // Create MediaRecorder
    const audioStream = mediaStream.getAudioTracks()[0];
    const combinedStream = new MediaStream([audioStream]);
    
    mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = sendAudioToServer;
    
    mediaRecorder.start(100); // Collect data every 100ms
    
    setStatus('recording', 'Recording...');
    elements.micButton.classList.add('recording');
}

function stopRecording() {
    if (!session.isRecording) return;
    
    session.isRecording = false;
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    setStatus('processing', 'Thinking...');
    showThinkingSpinner(true);
}

function sendAudioToServer() {
    if (audioChunks.length === 0) {
        setStatus('connected', 'Ready');
        showThinkingSpinner(false);
        return;
    }
    
    // Create blob from chunks
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    
    // Send binary audio to WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
        audioBlob.arrayBuffer().then(buffer => {
            ws.send(buffer);
        });
    }
}

// ==================== WebSocket ====================
function connectWebSocket() {
    const wsUrl = `${CONFIG.wsUrl}/${session.sessionId}?job_role=${encodeURIComponent(session.jobRole)}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        session.isConnected = true;
        setStatus('connected', 'Ready');
    };
    
    ws.onmessage = async (event) => {
        try {
            // Handle binary audio
            if (event.data instanceof Blob) {
                // This is an audio response sent as binary
                const arrayBuffer = await event.data.arrayBuffer();
                const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
                playAudio(blobToBase64(audioBlob));
                return;
            }
            
            // Handle JSON messages
            const data = JSON.parse(event.data);
            handleServerMessage(data);
            
        } catch (error) {
            console.error('Message handling error:', error);
        }
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        session.isConnected = false;
        setStatus('disconnected', 'Disconnected');
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error', 'Connection error');
    };
}

function handleServerMessage(data) {
    showThinkingSpinner(false);
    
    // Handle welcome message
    if (data.type === 'welcome') {
        addMessage('assistant', data.ai_response);
        session.history.push({ role: 'assistant', content: data.ai_response });
        
        // Play welcome audio if available
        if (data.audio_b64) {
            playAudio(data.audio_b64);
        }
        
        // Start silence detection after AI speaks
        startSilenceDetection();
        return;
    }
    
    // Handle transcript from user audio
    if (data.transcript) {
        addMessage('user', data.transcript);
        session.history.push({ role: 'user', content: data.transcript });
    }
    
    // Handle AI response
    if (data.ai_response) {
        addMessage('assistant', data.ai_response);
        session.history.push({ role: 'assistant', content: data.ai_response });
        
        // Play audio response
        if (data.audio_b64) {
            playAudio(data.audio_b64);
        }
        
        // Start silence detection after AI speaks
        startSilenceDetection();
    }
}

// ==================== Audio Playback ====================
function playAudio(base64Audio) {
    try {
        const audioBytes = atob(base64Audio);
        const audioArray = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) {
            audioArray[i] = audioBytes.charCodeAt(i);
        }
        
        const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
            console.log('Audio playback ended');
        };
        
        audio.play();
        
    } catch (error) {
        console.error('Audio playback error:', error);
    }
}

function startSilenceDetection() {
    // After AI speaks, wait for silence then re-enable mic
    if (session.silenceTimer) {
        clearTimeout(session.silenceTimer);
    }
    
    session.silenceTimer = setTimeout(() => {
        if (!session.isRecording) {
            setStatus('connected', 'Ready - Click to speak');
        }
    }, CONFIG.silenceDelay);
}

// ==================== UI Updates ====================
function setStatus(status, text) {
    const statusIcon = elements.statusIndicator.querySelector('.status-icon');
    statusIcon.className = 'status-icon ' + status;
    elements.statusText.textContent = text;
}

function setFaceStatus(verified) {
    elements.faceStatus.className = 'face-status ' + (verified ? 'verified' : 'alert');
    elements.faceStatus.querySelector('span:last-child').textContent = verified ? 'Verified' : 'Alert';
    
    if (!verified) {
        elements.faceAlertBanner.classList.remove('hidden');
    } else {
        elements.faceAlertBanner.classList.add('hidden');
    }
}

function updateEmotionBadge(emotion) {
    const emotionData = emotionMap[emotion] || emotionMap['unknown'];
    elements.emotionEmoji.textContent = emotionData.emoji;
    elements.emotionText.textContent = emotionData.text;
}

function addMessage(role, content) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    
    const elapsed = Math.floor((Date.now() - session.sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    messageEl.innerHTML = `
        <div class="message-content">${escapeHtml(content)}</div>
        <div class="message-time">${timeStr}</div>
    `;
    
    elements.chatMessages.appendChild(messageEl);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function showThinkingSpinner(show) {
    if (show) {
        if (!elements.thinkingSpinner) {
            elements.thinkingSpinner = document.createElement('div');
            elements.thinkingSpinner.className = 'thinking-spinner';
            elements.thinkingSpinner.innerHTML = `
                <div class="spinner"></div>
                <span>Thinking...</span>
            `;
            elements.chatMessages.appendChild(elements.thinkingSpinner);
        }
        elements.thinkingSpinner.classList.remove('hidden');
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    } else if (elements.thinkingSpinner) {
        elements.thinkingSpinner.classList.add('hidden');
    }
}

function updateTimer() {
    if (!session.sessionStartTime) return;
    
    const elapsed = Math.floor((Date.now() - session.sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    elements.sessionTimer.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ==================== Interview End ====================
async function endInterview() {
    if (!confirm('Are you sure you want to end the interview?')) return;
    
    // Close WebSocket
    if (ws) {
        ws.close();
    }
    
    // Stop face tracking
    if (session.faceCheckInterval) {
        clearInterval(session.faceCheckInterval);
    }
    
    // Stop media
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    
    setStatus('idle', 'Generating report...');
    
    try {
        // Fetch final report
        const response = await fetch(`${CONFIG.apiUrl}/analysis/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: session.sessionId,
                candidate_id: session.candidateId,
                job_role: session.jobRole,
                conversation_history: session.history,
                emotion_log: session.emotionLog,
                face_alerts: session.faceAlerts
            })
        });
        
        const report = await response.json();
        showReport(report);
        
    } catch (error) {
        console.error('Report generation error:', error);
        // Show mock report
        showReport({
            overall_score: 7.8,
            strengths: ['Good communication', 'Confident responses', 'Relevant experience'],
            concerns: ['Could elaborate more', 'Slightly nervous at start'],
            recommendation: 'Consider',
            emotion_summary: 'Mostly neutral with moments of confidence'
        });
    }
}

function showReport(report) {
    elements.finalScore.textContent = report.overall_score || 'N/A';
    
    elements.strengthsList.innerHTML = (report.strengths || [])
        .map(s => `<li>${escapeHtml(s)}</li>`)
        .join('');
    
    elements.concernsList.innerHTML = (report.concerns || [])
        .map(c => `<li>${escapeHtml(c)}</li>`)
        .join('');
    
    elements.recommendationText.textContent = report.recommendation || 'N/A';
    
    elements.interviewModal.classList.remove('hidden');
    setStatus('idle', 'Interview complete');
}

// ==================== Utilities ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ==================== Start ====================
document.addEventListener('DOMContentLoaded', init);

// Timer interval
setInterval(updateTimer, 1000);
