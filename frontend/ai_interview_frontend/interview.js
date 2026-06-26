/**
 * AI Interview - Main Interview Controller
 * 
 * This module handles the main interview flow including:
 * - Question management
 * - Audio recording and transcription
 * - TTS for question playback
 * - Answer submission and analysis
 */

class InterviewController {
    constructor() {
        // Configuration
        this.apiBaseUrl = 'http://localhost:8001/api';
        this.numQuestions = 5;
        
        // State
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.candidateId = null;
        this.capturedFaceImage = null;
        
        // Recording state
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        // Timer
        this.interviewStartTime = null;
        this.questionStartTime = null;
        
        // DOM Elements
        this.elements = {};
        
        // Initialize
        this.init();
    }
    
    async init() {
        this.cacheElements();
        this.bindEvents();
        await this.initializeFaceTracking();
    }
    
    cacheElements() {
        this.elements = {
            // Sections
            setupSection: document.getElementById('setup-section'),
            interviewSection: document.getElementById('interview-section'),
            resultsSection: document.getElementById('results-section'),
            
            // Setup form
            setupForm: document.getElementById('setup-form'),
            candidateName: document.getElementById('candidate-name'),
            jobTitle: document.getElementById('job-title'),
            jobDescription: document.getElementById('job-description'),
            registerVideo: document.getElementById('register-video'),
            registerCanvas: document.getElementById('register-canvas'),
            captureFaceBtn: document.getElementById('capture-face'),
            faceStatus: document.getElementById('face-status'),
            
            // Interview
            currentQuestion: document.getElementById('current-question'),
            totalQuestions: document.getElementById('total-questions'),
            interviewTimer: document.getElementById('interview-timer'),
            questionText: document.getElementById('question-text'),
            playQuestionBtn: document.getElementById('play-question'),
            aiStatus: document.getElementById('ai-status'),
            recordBtn: document.getElementById('record-btn'),
            recordingIndicator: document.getElementById('recording-indicator'),
            transcriptionDisplay: document.getElementById('transcription-display'),
            transcribedText: document.getElementById('transcribed-text'),
            skipBtn: document.getElementById('skip-btn'),
            nextBtn: document.getElementById('next-btn'),
            interviewVideo: document.getElementById('interview-video'),
            interviewCanvas: document.getElementById('interview-canvas'),
            
            // Results
            overallScore: document.getElementById('overall-score'),
            scoreRelevance: document.getElementById('score-relevance'),
            scoreDepth: document.getElementById('score-depth'),
            scoreClarity: document.getElementById('score-clarity'),
            scoreExamples: document.getElementById('score-examples'),
            valRelevance: document.getElementById('val-relevance'),
            valDepth: document.getElementById('val-depth'),
            valClarity: document.getElementById('val-clarity'),
            valExamples: document.getElementById('val-examples'),
            feedbackContent: document.getElementById('feedback-content'),
            restartBtn: document.getElementById('restart-btn'),
            downloadResultsBtn: document.getElementById('download-results')
        };
    }
    
    bindEvents() {
        // Setup form submission
        this.elements.setupForm.addEventListener('submit', (e) => this.handleSetup(e));
        
        // Face capture
        this.elements.captureFaceBtn.addEventListener('click', () => this.captureFace());
        
        // Interview controls
        this.elements.playQuestionBtn.addEventListener('click', () => this.playQuestion());
        this.elements.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.elements.skipBtn.addEventListener('click', () => this.skipQuestion());
        this.elements.nextBtn.addEventListener('click', () => this.nextQuestion());
        
        // Results
        this.elements.restartBtn.addEventListener('click', () => this.restart());
        this.elements.downloadResultsBtn.addEventListener('click', () => this.downloadResults());
    }
    
    async initializeFaceTracking() {
        try {
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            // Show on register video
            this.elements.registerVideo.srcObject = stream;
            this.elements.interviewVideo.srcObject = stream;
            
            // Load Face-API models (would need to be hosted locally in production)
            // For demo, we'll use basic functionality
            console.log('Camera initialized for face tracking');
            
        } catch (error) {
            console.error('Failed to initialize camera:', error);
            this.showMessage('Camera access is required for the interview', 'error');
        }
    }
    
    async handleSetup(event) {
        event.preventDefault();
        
        const candidateName = this.elements.candidateName.value;
        const jobTitle = this.elements.jobTitle.value;
        const jobDescription = this.elements.jobDescription.value;
        
        if (!this.capturedFaceImage) {
            this.showMessage('Please capture your face for verification', 'error');
            return;
        }
        
        // Generate candidate ID
        this.candidateId = `candidate_${Date.now()}`;
        
        // Show loading state
        this.showMessage('Generating interview questions...', 'info');
        
        try {
            // Generate questions
            await this.generateQuestions(jobTitle, jobDescription || '');
            
            // Register face
            await this.registerFace();
            
            // Switch to interview section
            this.showSection('interview');
            
            // Start interview
            this.startInterview();
            
        } catch (error) {
            console.error('Setup failed:', error);
            this.showMessage('Failed to start interview. Please try again.', 'error');
        }
    }
    
    async generateQuestions(jobTitle, jobDescription) {
        const response = await fetch(`${this.apiBaseUrl}/voice/questions/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_title: jobTitle,
                job_description: jobDescription,
                num_questions: this.numQuestions,
                difficulty: 'medium'
            })
        });
        
        if (!response.ok) throw new Error('Failed to generate questions');
        
        const data = await response.json();
        this.questions = data.questions;
        this.elements.totalQuestions.textContent = this.questions.length;
    }
    
    async registerFace() {
        const formData = new FormData();
        formData.append('image', this.capturedFaceImage, 'face.jpg');
        formData.append('candidate_id', this.candidateId);
        
        const response = await fetch(`${this.apiBaseUrl}/vision/register`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            console.warn('Face registration may have failed');
        }
    }
    
    captureFace() {
        const video = this.elements.registerVideo;
        const canvas = this.elements.registerCanvas;
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
            this.capturedFaceImage = blob;
            this.elements.faceStatus.textContent = '✅ Face captured successfully!';
            this.elements.faceStatus.className = 'status-message success';
        }, 'image/jpeg');
    }
    
    startInterview() {
        this.interviewStartTime = Date.now();
        this.currentQuestionIndex = 0;
        this.answers = [];
        
        // Start timer
        this.startTimer();
        
        // Show first question
        this.showQuestion();
    }
    
    startTimer() {
        setInterval(() => {
            if (!this.interviewStartTime) return;
            
            const elapsed = Math.floor((Date.now() - this.interviewStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            
            this.elements.interviewTimer.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }
    
    showQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        this.elements.currentQuestion.textContent = this.currentQuestionIndex + 1;
        this.elements.questionText.textContent = question.question;
        this.elements.aiStatus.textContent = 'Ready';
        
        // Reset answer state
        this.elements.transcriptionDisplay.classList.add('hidden');
        this.elements.transcribedText.textContent = '';
        this.elements.nextBtn.disabled = true;
        
        this.questionStartTime = Date.now();
    }
    
    async playQuestion() {
        const question = this.elements.questionText.textContent;
        
        this.elements.aiStatus.textContent = 'Speaking...';
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/voice/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: question,
                    voice: 'en-US-AriaNeural'
                })
            });
            
            if (!response.ok) throw new Error('TTS failed');
            
            const data = await response.json();
            const audio = new Audio(data.audio_path);
            audio.onended = () => {
                this.elements.aiStatus.textContent = 'Ready';
            };
            audio.play();
            
        } catch (error) {
            console.error('TTS error:', error);
            this.elements.aiStatus.textContent = 'Ready';
        }
    }
    
    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                this.processRecording();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Update UI
            this.elements.recordBtn.textContent = '⏹️ Stop Recording';
            this.elements.recordBtn.classList.add('recording');
            this.elements.recordingIndicator.classList.remove('hidden');
            this.elements.aiStatus.textContent = 'Listening...';
            
        } catch (error) {
            console.error('Recording error:', error);
            this.showMessage('Failed to access microphone', 'error');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            this.isRecording = false;
            
            // Update UI
            this.elements.recordBtn.textContent = '🎤 Click to Record Answer';
            this.elements.recordBtn.classList.remove('recording');
            this.elements.recordingIndicator.classList.add('hidden');
            this.elements.aiStatus.textContent = 'Processing...';
        }
    }
    
    async processRecording() {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Transcribe audio
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/voice/stt`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Transcription failed');
            
            const data = await response.json();
            
            // Show transcription
            this.elements.transcribedText.textContent = data.text;
            this.elements.transcriptionDisplay.classList.remove('hidden');
            this.elements.aiStatus.textContent = 'Transcribed';
            this.elements.nextBtn.disabled = false;
            
            // Store answer
            this.answers[this.currentQuestionIndex] = {
                question: this.questions[this.currentQuestionIndex].question,
                answer: data.text
            };
            
        } catch (error) {
            console.error('Transcription error:', error);
            this.elements.aiStatus.textContent = 'Transcription failed';
            this.showMessage('Could not transcribe audio. Please try again.', 'error');
        }
    }
    
    skipQuestion() {
        // Store empty answer
        this.answers[this.currentQuestionIndex] = {
            question: this.questions[this.currentQuestionIndex].question,
            answer: ''
        };
        
        this.nextQuestion();
    }
    
    async nextQuestion() {
        // Analyze current answer if available
        if (this.answers[this.currentQuestionIndex]?.answer) {
            await this.analyzeCurrentAnswer();
        }
        
        // Move to next question or show results
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.showQuestion();
        } else {
            await this.finishInterview();
        }
    }
    
    async analyzeCurrentAnswer() {
        const answer = this.answers[this.currentQuestionIndex];
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/analysis/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: answer.question,
                    answer: answer.answer,
                    job_title: this.elements.jobTitle.value
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.answers[this.currentQuestionIndex].analysis = data.analysis;
            }
            
        } catch (error) {
            console.error('Analysis error:', error);
        }
    }
    
    async finishInterview() {
        this.elements.aiStatus.textContent = 'Generating results...';
        
        try {
            // Get summary
            const response = await fetch(`${this.apiBaseUrl}/analysis/summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.answers.map(a => ({ question: a.question, answer: a.answer })))
            });
            
            if (!response.ok) throw new Error('Summary failed');
            
            const data = await response.json();
            this.showResults(data.summary);
            
        } catch (error) {
            console.error('Results error:', error);
            this.showResults({
                average_score: 0,
                recommendation: 'Could not generate results. Please try again.'
            });
        }
    }
    
    showResults(summary) {
        this.showSection('results');
        
        // Overall score
        this.elements.overallScore.textContent = `${summary.average_score || '--'}`;
        
        // Score breakdown
        if (summary.detailed_analyses) {
            const avgScores = this.calculateAverageScores(summary.detailed_analyses);
            
            this.elements.scoreRelevance.style.width = `${avgScores.relevance}%`;
            this.elements.scoreDepth.style.width = `${avgScores.depth}%`;
            this.elements.scoreClarity.style.width = `${avgScores.clarity}%`;
            this.elements.scoreExamples.style.width = `${avgScores.examples}%`;
            
            this.elements.valRelevance.textContent = `${avgScores.relevance}%`;
            this.elements.valDepth.textContent = `${avgScores.depth}%`;
            this.elements.valClarity.textContent = `${avgScores.clarity}%`;
            this.elements.valExamples.textContent = `${avgScores.exproles || '--'}%`;
        }
        
        // Feedback
        let feedbackHtml = `<p><strong>Overall Score:</strong> ${summary.average_score}/100</p>`;
        feedbackHtml += `<p><strong>Recommendation:</strong> ${summary.recommendation}</p>`;
        
        if (summary.overall_strengths?.length) {
            feedbackHtml += `<h4>Strengths:</h4><ul>`;
            summary.overall_strengths.forEach(s => {
                feedbackHtml += `<li>${s}</li>`;
            });
            feedbackHtml += `</ul>`;
        }
        
        if (summary.areas_for_improvement?.length) {
            feedbackHtml += `<h4>Areas for Improvement:</h4><ul>`;
            summary.areas_for_improvement.forEach(i => {
                feedbackHtml += `<li>${i}</li>`;
            });
            feedbackHtml += `</ul>`;
        }
        
        this.elements.feedbackContent.innerHTML = feedbackHtml;
    }
    
    calculateAverageScores(analyses) {
        const scores = {
            relevance: 0,
            depth: 0,
            clarity: 0,
            examples: 0
        };
        
        analyses.forEach(analysis => {
            if (analysis.scores) {
                scores.relevance += analysis.scores.relevance || 0;
                scores.depth += analysis.scores.depth || 0;
                scores.clarity += analysis.scores.clarity || 0;
                scores.examples += analysis.scores.examples || 0;
            }
        });
        
        const count = analyses.length || 1;
        return {
            relevance: Math.round(scores.relevance / count),
            depth: Math.round(scores.depth / count),
            clarity: Math.round(scores.clarity / count),
            examples: Math.round(scores.examples / count)
        };
    }
    
    restart() {
        // Reset state
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.candidateId = null;
        this.capturedFaceImage = null;
        this.interviewStartTime = null;
        
        // Reset UI
        this.elements.setupForm.reset();
        this.elements.faceStatus.textContent = '';
        this.elements.faceStatus.className = 'status-message';
        
        // Show setup
        this.showSection('setup');
    }
    
    downloadResults() {
        const results = {
            candidate: this.elements.candidateName.value,
            position: this.elements.jobTitle.value,
            date: new Date().toISOString(),
            answers: this.answers,
            summary: this.elements.feedbackContent.textContent
        };
        
        const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-results-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    showSection(section) {
        this.elements.setupSection.classList.add('hidden');
        this.elements.interviewSection.classList.add('hidden');
        this.elements.resultsSection.classList.add('hidden');
        
        switch(section) {
            case 'setup':
                this.elements.setupSection.classList.remove('hidden');
                break;
            case 'interview':
                this.elements.interviewSection.classList.remove('hidden');
                break;
            case 'results':
                this.elements.resultsSection.classList.remove('hidden');
                break;
        }
    }
    
    showMessage(message, type = 'info') {
        alert(message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.interviewController = new InterviewController();
});
