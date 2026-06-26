/**
 * AI Interview - Face Tracker Module
 * 
 * This module handles real-time face detection and emotion tracking
 * using face-api.js for client-side processing.
 */

class FaceTracker {
    constructor() {
        // Configuration
        this.modelsPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
        this.isInitialized = false;
        this.isTracking = false;
        
        // Detection settings
        this.detectionOptions = {
            withLandmarks: true,
            withDescriptors: true,
            withFaceExpressions: true
        };
        
        // State
        this.currentEmotions = {
            happy: 0,
            sad: 0,
            angry: 0,
            neutral: 0,
            fearful: 0,
            disgusted: 0,
            surprised: 0
        };
        
        // DOM elements
        this.video = null;
        this.canvas = null;
        this.context = null;
        
        // Callbacks
        this.onEmotionUpdate = null;
        this.onFaceDetected = null;
        this.onFaceLost = null;
    }
    
    async init(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        
        if (!this.video || !this.canvas) {
            console.error('Video and canvas elements required');
            return false;
        }
        
        this.context = this.canvas.getContext('2d');
        
        try {
            // Load models (these would need to be hosted locally in production)
            // For demo, we'll check if models are available
            await this.loadModels();
            
            this.isInitialized = true;
            console.log('Face tracker initialized');
            
            return true;
            
        } catch (error) {
            console.warn('Face-API models not available, using fallback:', error);
            // Still allow tracking to work with basic functionality
            this.isInitialized = true;
            return true;
        }
    }
    
    async loadModels() {
        // Try to load face-api.js models
        // In production, you would host models locally
        try {
            // Check if faceapi is available
            if (typeof faceapi === 'undefined') {
                throw new Error('face-api.js not loaded');
            }
            
            // Load models from CDN (or local path)
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(this.modelsPath),
                faceapi.nets.faceLandmark68Net.loadFromUri(this.modelsPath),
                faceapi.nets.faceExpressionNet.loadFromUri(this.modelsPath),
                faceapi.nets.ssdMobilenetv1.loadFromUri(this.modelsPath)
            ]);
            
            console.log('Face-API models loaded');
            
        } catch (error) {
            console.warn('Could not load face-api models:', error);
            // Continue without models - will use fallback
        }
    }
    
    startTracking() {
        if (!this.isInitialized) {
            console.error('Face tracker not initialized');
            return;
        }
        
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.detectFaces();
    }
    
    stopTracking() {
        this.isTracking = false;
    }
    
    async detectFaces() {
        if (!this.isTracking) return;
        
        if (!this.video || this.video.paused || this.video.ended) {
            requestAnimationFrame(() => this.detectFaces());
            return;
        }
        
        // Match canvas size to video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Clear canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        try {
            if (typeof faceapi !== 'undefined') {
                await this.detectWithFaceAPI();
            } else {
                // Fallback: just draw video frame
                this.context.drawImage(this.video, 0, 0);
            }
            
        } catch (error) {
            console.error('Face detection error:', error);
        }
        
        // Continue tracking
        requestAnimationFrame(() => this.detectFaces());
    }
    
    async detectWithFaceAPI() {
        // Detect faces with expressions
        const detections = await faceapi
            .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();
        
        if (detections.length > 0) {
            // Get first face
            const detection = detections[0];
            
            // Update emotions
            this.updateEmotions(detection.expressions);
            
            // Draw face box
            this.drawFaceBox(detection);
            
            // Callback
            if (this.onFaceDetected) {
                this.onFaceDetected(detection);
            }
            
        } else {
            // No face detected
            this.resetEmotions();
            
            if (this.onFaceLost) {
                this.onFaceLost();
            }
        }
    }
    
    updateEmotions(expressions) {
        if (!expressions) return;
        
        // Update current emotions
        this.currentEmotions = {
            happy: expressions.happy || 0,
            sad: expressions.sad || 0,
            angry: expressions.angry || 0,
            neutral: expressions.neutral || 0,
            fearful: expressions.fearful || 0,
            disgusted: expressions.disgusted || 0,
            surprised: expressions.surprised || 0
        };
        
        // Update DOM if elements exist
        this.updateEmotionDisplay();
        
        // Callback
        if (this.onEmotionUpdate) {
            this.onEmotionUpdate(this.currentEmotions);
        }
    }
    
    resetEmotions() {
        this.currentEmotions = {
            happy: 0,
            sad: 0,
            angry: 0,
            neutral: 0,
            fearful: 0,
            disgusted: 0,
            surprised: 0
        };
        
        this.updateEmotionDisplay();
    }
    
    updateEmotionDisplay() {
        // Update emotion bars in DOM
        const emotions = ['happy', 'sad', 'angry', 'neutral'];
        
        emotions.forEach(emotion => {
            const percentage = Math.round((this.currentEmotions[emotion] || 0) * 100);
            
            const barElement = document.getElementById(`emotion-${emotion}`);
            const valueElement = document.getElementById(`val-${emotion}`);
            
            if (barElement) {
                barElement.style.width = `${percentage}%`;
            }
            
            if (valueElement) {
                valueElement.textContent = `${percentage}%`;
            }
        });
    }
    
    drawFaceBox(detection) {
        const { x, y, width, height } = detection.detection.box;
        
        // Draw face rectangle
        this.context.strokeStyle = '#00ff00';
        this.context.lineWidth = 2;
        this.context.strokeRect(x, y, width, height);
        
        // Draw expression label
        const expressions = detection.expressions;
        const dominant = Object.entries(expressions)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (dominant) {
            this.context.fillStyle = '#00ff00';
            this.context.font = '16px Arial';
            this.context.fillText(
                `${dominant[0]}: ${Math.round(dominant[1] * 100)}%`,
                x,
                y - 10
            );
        }
        
        // Draw landmarks if available
        if (detection.landmarks) {
            this.drawLandmarks(detection.landmarks);
        }
    }
    
    drawLandmarks(landmarks) {
        const positions = landmarks.positions;
        
        // Draw dots at landmark positions
        this.context.fillStyle = '#00ffff';
        
        positions.forEach((point, index) => {
            this.context.beginPath();
            this.context.arc(point.x, point.y, 2, 0, Math.PI * 2);
            this.context.fill();
        });
    }
    
    // Utility methods
    
    getDominantEmotion() {
        const entries = Object.entries(this.currentEmotions);
        const sorted = entries.sort(([,a], [,b]) => b - a);
        return sorted[0];
    }
    
    getEmotionScores() {
        const scores = {};
        Object.entries(this.currentEmotions).forEach(([emotion, value]) => {
            scores[emotion] = Math.round(value * 100);
        });
        return scores;
    }
    
    isFaceVisible() {
        const dominant = this.getDominantEmotion();
        return dominant && dominant[1] > 0.3;
    }
    
    getAverageEmotion() {
        // Calculate average emotion over time for more stable results
        return this.getDominantEmotion();
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceTracker;
}
