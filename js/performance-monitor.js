/**
 * PerformanceMonitor - Tracks FPS and performance metrics
 * Enables adaptive quality based on device capabilities
 */
class PerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            targetFPS: 60,
            sampleSize: 60,
            adaptiveQuality: true,
            onQualityChange: null,
            ...options
        };

        this.frames = [];
        this.lastFrameTime = performance.now();
        this.fps = 60;
        this.quality = 'high'; // 'low', 'medium', 'high'
        this.frameCount = 0;
        this.isMonitoring = false;
        this.qualityLevels = {
            low: { particleMultiplier: 0.3, canvasScale: 0.5 },
            medium: { particleMultiplier: 0.6, canvasScale: 0.75 },
            high: { particleMultiplier: 1.0, canvasScale: 1.0 }
        };
    }

    /**
     * Start monitoring performance
     */
    start() {
        this.isMonitoring = true;
        this.lastFrameTime = performance.now();
    }

    /**
     * Stop monitoring
     */
    stop() {
        this.isMonitoring = false;
    }

    /**
     * Record a frame - call this once per animation frame
     */
    recordFrame() {
        if (!this.isMonitoring) return;

        const now = performance.now();
        const delta = now - this.lastFrameTime;

        this.frames.push(delta);
        if (this.frames.length > this.options.sampleSize) {
            this.frames.shift();
        }

        this.lastFrameTime = now;
        this.frameCount++;

        // Update FPS calculation
        if (this.frames.length > 0) {
            const avgDelta = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
            this.fps = Math.round(1000 / avgDelta);
        }

        // Adaptive quality adjustment
        if (this.options.adaptiveQuality && this.frameCount % 120 === 0) {
            this.adjustQuality();
        }
    }

    /**
     * Adjust quality based on current FPS
     */
    adjustQuality() {
        const oldQuality = this.quality;

        if (this.fps < 30 && this.quality !== 'low') {
            this.quality = 'low';
        } else if (this.fps < 50 && this.fps >= 30 && this.quality === 'high') {
            this.quality = 'medium';
        } else if (this.fps >= 55 && this.quality === 'low') {
            this.quality = 'medium';
        } else if (this.fps >= 58 && this.quality !== 'high') {
            this.quality = 'high';
        }

        if (oldQuality !== this.quality) {
            console.log(`[PerformanceMonitor] Quality adjusted: ${oldQuality} → ${this.quality} (FPS: ${this.fps})`);
            if (this.options.onQualityChange) {
                this.options.onQualityChange(this.quality, this.qualityLevels[this.quality]);
            }
        }
    }

    /**
     * Get current FPS
     */
    getFPS() {
        return this.fps;
    }

    /**
     * Get current quality level
     */
    getQuality() {
        return this.quality;
    }

    /**
     * Get quality settings
     */
    getQualitySettings() {
        return this.qualityLevels[this.quality];
    }

    /**
     * Get performance stats
     */
    getStats() {
        const avgFrameTime = this.frames.length > 0
            ? this.frames.reduce((a, b) => a + b, 0) / this.frames.length
            : 0;

        return {
            fps: this.fps,
            quality: this.quality,
            avgFrameTime: avgFrameTime.toFixed(2),
            frameCount: this.frameCount,
            isMonitoring: this.isMonitoring
        };
    }

    /**
     * Reset statistics
     */
    reset() {
        this.frames = [];
        this.frameCount = 0;
        this.fps = 60;
        this.lastFrameTime = performance.now();
    }

    /**
     * Check if reduced motion is preferred
     */
    static prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Get device performance tier estimate
     */
    static getDeviceTier() {
        const cores = navigator.hardwareConcurrency || 2;
        const memory = navigator.deviceMemory || 4;

        if (cores >= 8 && memory >= 8) return 'high';
        if (cores >= 4 && memory >= 4) return 'medium';
        return 'low';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}
