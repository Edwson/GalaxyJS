/**
 * AdvancedAnimations - High-quality canvas-based animations
 * Integrated version of galaxy-animations.js with modern improvements
 */
class AdvancedAnimations {
    constructor(performanceMonitor = null) {
        this.animations = new Map();
        this.performanceMonitor = performanceMonitor;
        this.canvases = new Map();
        this.animationFrames = new Map();
    }

    /**
     * Create spiral galaxy animation with logarithmic spirals
     */
    createSpiralGalaxy(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const config = {
            numArms: options.numArms || 4,
            numStars: this.getAdaptiveParticleCount(options.numStars || 400),
            spiralTightness: options.spiralTightness || 0.25,
            armSpread: options.armSpread || 0.5,
            centerGlow: options.centerGlow !== false,
            rotationSpeed: options.rotationSpeed || 0.0005
        };

        const canvas = this.createCanvas(container);
        const ctx = canvas.getContext('2d');
        const resizeHandler = () => this.resizeCanvas(canvas, container);
        resizeHandler();
        window.addEventListener('resize', resizeHandler);

        // Generate star data
        const stars = [];
        for (let i = 0; i < config.numStars; i++) {
            const arm = i % config.numArms;
            const t = Math.random() * 4 * Math.PI;
            const r = (t * 32) + Math.random() * 12;
            const angle = t + arm * ((2 * Math.PI) / config.numArms) + (Math.random() - 0.5) * config.armSpread;
            const speed = config.rotationSpeed + Math.random() * config.rotationSpeed * 1.4;
            const brightness = 0.6 + Math.random() * 0.4;
            stars.push({ arm, t, r, angle, speed, baseT: t, brightness });
        }

        const draw = (time) => {
            if (this.performanceMonitor) {
                this.performanceMonitor.recordFrame();
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);
            const cx = w / 2;
            const cy = h / 2;

            // Center glow
            if (config.centerGlow) {
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.12);
                grad.addColorStop(0, 'rgba(255,255,255,0.8)');
                grad.addColorStop(0.5, 'rgba(200,200,255,0.4)');
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.beginPath();
                ctx.arc(cx, cy, w * 0.12, 0, 2 * Math.PI);
                ctx.fillStyle = grad;
                ctx.fill();
            }

            // Draw spiral arms
            for (let i = 0; i < stars.length; i++) {
                const star = stars[i];
                const t = star.baseT + (time * star.speed);
                const r = (t * 32) + Math.sin(time * 0.0002 + star.baseT) * 4;
                const angle = t + star.arm * ((2 * Math.PI) / config.numArms) + (Math.random() - 0.5) * config.armSpread * 0.5;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                const alpha = (0.7 - (r / (w * 0.7))) * star.brightness;

                ctx.beginPath();
                ctx.arc(x, y, 1.1 + Math.random() * 0.7, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(255,255,255,${Math.max(0.1, alpha)})`;
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        };

        const animate = (ts) => {
            draw(ts || 0);
            const frameId = requestAnimationFrame(animate);
            this.animationFrames.set(containerId, frameId);
        };

        animate();
        this.animations.set(containerId, { type: 'spiral-galaxy', canvas, config, cleanup: resizeHandler });
        return containerId;
    }

    /**
     * Create quantum probability cloud animation
     */
    createQuantumCloud(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const config = {
            numParticles: this.getAdaptiveParticleCount(options.numParticles || 220),
            cloudRadius: options.cloudRadius || 0.36,
            flickerSpeed: options.flickerSpeed || 0.0025,
            waveAmplitude: options.waveAmplitude || 0.18,
            waveFrequency: options.waveFrequency || 2.2
        };

        const canvas = this.createCanvas(container);
        const ctx = canvas.getContext('2d');
        const resizeHandler = () => this.resizeCanvas(canvas, container);
        resizeHandler();
        window.addEventListener('resize', resizeHandler);

        // Particle data
        const particles = [];
        for (let i = 0; i < config.numParticles; i++) {
            const baseAngle = Math.random() * 2 * Math.PI;
            const baseRadius = Math.random() * 0.9 + 0.1;
            const phase = Math.random() * 2 * Math.PI;
            const speed = 0.5 + Math.random() * 1.2;
            const color = this.getQuantumColor(i / config.numParticles);
            particles.push({ baseAngle, baseRadius, phase, speed, color });
        }

        const draw = (time) => {
            if (this.performanceMonitor) {
                this.performanceMonitor.recordFrame();
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);
            const cx = w / 2;
            const cy = h / 2;
            const rMax = Math.min(w, h) * config.cloudRadius;

            // Soft cloud glow
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rMax * 1.2);
            grad.addColorStop(0, 'rgba(150,150,255,0.15)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.beginPath();
            ctx.arc(cx, cy, rMax * 1.2, 0, 2 * Math.PI);
            ctx.fillStyle = grad;
            ctx.fill();

            // Draw particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                const t = time * config.flickerSpeed * p.speed + p.phase;
                const radius = rMax * p.baseRadius * (1 + Math.sin(t * config.waveFrequency) * config.waveAmplitude);
                const angle = p.baseAngle + Math.sin(t * 0.7) * 0.5;
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;
                const alpha = 0.18 + 0.65 * Math.abs(Math.sin(t + p.baseAngle));

                ctx.beginPath();
                ctx.arc(x, y, 1.2 + Math.abs(Math.sin(t * 2)) * 1.1, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha})`;
                ctx.shadowColor = `rgb(${p.color.r},${p.color.g},${p.color.b})`;
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        };

        const animate = (ts) => {
            draw(ts || 0);
            const frameId = requestAnimationFrame(animate);
            this.animationFrames.set(containerId, frameId);
        };

        animate();
        this.animations.set(containerId, { type: 'quantum-cloud', canvas, config, cleanup: resizeHandler });
        return containerId;
    }

    /**
     * Create black hole accretion disk animation
     */
    createAccretionDisk(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const config = {
            numRings: options.numRings || 60,
            numParticles: this.getAdaptiveParticleCount(options.numParticles || 320),
            diskRadius: options.diskRadius || 0.38,
            swirlSpeed: options.swirlSpeed || 0.0012,
            blackHoleRadius: options.blackHoleRadius || 0.09
        };

        const canvas = this.createCanvas(container);
        const ctx = canvas.getContext('2d');
        const resizeHandler = () => this.resizeCanvas(canvas, container);
        resizeHandler();
        window.addEventListener('resize', resizeHandler);

        // Precompute ring data
        const rings = [];
        for (let i = 0; i < config.numRings; i++) {
            const r = (i + 1) / config.numRings;
            rings.push({ r });
        }

        // Particle data
        const particles = [];
        for (let i = 0; i < config.numParticles; i++) {
            const ring = Math.floor(Math.random() * config.numRings);
            const angle = Math.random() * 2 * Math.PI;
            const speed = 0.7 + Math.random() * 1.2;
            const phase = Math.random() * 2 * Math.PI;
            const color = this.getAccretionColor(ring / config.numRings);
            particles.push({ ring, angle, speed, phase, color });
        }

        const draw = (time) => {
            if (this.performanceMonitor) {
                this.performanceMonitor.recordFrame();
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);
            const cx = w / 2;
            const cy = h / 2;
            const rMax = Math.min(w, h) * config.diskRadius;
            const rHole = Math.min(w, h) * config.blackHoleRadius;

            // Relativistic glow (Einstein ring)
            const grad = ctx.createRadialGradient(cx, cy, rHole * 0.9, cx, cy, rHole * 1.5);
            grad.addColorStop(0, 'rgba(255,255,255,0.15)');
            grad.addColorStop(0.7, 'rgba(255,255,255,0.25)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.beginPath();
            ctx.arc(cx, cy, rHole * 1.5, 0, 2 * Math.PI);
            ctx.fillStyle = grad;
            ctx.fill();

            // Accretion disk rings
            for (let i = 0; i < rings.length; i++) {
                const ring = rings[i];
                const radius = rHole + (rMax - rHole) * ring.r;
                const alpha = 0.08 + 0.18 * Math.sin(time * config.swirlSpeed * (1 + ring.r) + ring.r * 8);
                const color = this.getAccretionColor(ring.r);

                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
                ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
                ctx.lineWidth = 1.2 + 1.5 * (1 - ring.r);
                ctx.shadowColor = `rgb(${color.r},${color.g},${color.b})`;
                ctx.shadowBlur = 8 * (1 - ring.r);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();
            }

            // Disk particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                const ring = rings[p.ring];
                const radius = rHole + (rMax - rHole) * ring.r;
                const angle = p.angle + time * config.swirlSpeed * p.speed + Math.sin(time * 0.0002 + p.phase) * 0.2;
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;
                const alpha = 0.18 + 0.5 * Math.abs(Math.sin(time * 0.001 + p.phase));

                ctx.beginPath();
                ctx.arc(x, y, 1.1 + Math.random() * 0.7, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha})`;
                ctx.shadowColor = `rgb(${p.color.r},${p.color.g},${p.color.b})`;
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Black hole core
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, rHole, 0, 2 * Math.PI);
            ctx.fillStyle = '#000';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 18;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        };

        const animate = (ts) => {
            draw(ts || 0);
            const frameId = requestAnimationFrame(animate);
            this.animationFrames.set(containerId, frameId);
        };

        animate();
        this.animations.set(containerId, { type: 'accretion-disk', canvas, config, cleanup: resizeHandler });
        return containerId;
    }

    /**
     * Helper: Create canvas element
     */
    createCanvas(container) {
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.background = '#000';
        container.appendChild(canvas);
        this.canvases.set(container.id, canvas);
        return canvas;
    }

    /**
     * Helper: Resize canvas with retina support
     */
    resizeCanvas(canvas, container) {
        const dpr = window.devicePixelRatio || 1;
        const quality = this.performanceMonitor?.getQualitySettings().canvasScale || 1;

        canvas.width = container.offsetWidth * dpr * quality;
        canvas.height = container.offsetHeight * dpr * quality;

        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr * quality, dpr * quality);
    }

    /**
     * Helper: Get adaptive particle count based on performance
     */
    getAdaptiveParticleCount(baseCount) {
        if (!this.performanceMonitor) return baseCount;

        const multiplier = this.performanceMonitor.getQualitySettings().particleMultiplier;
        return Math.floor(baseCount * multiplier);
    }

    /**
     * Helper: Get quantum particle color
     */
    getQuantumColor(t) {
        const hue = t * 360;
        const [r, g, b] = this.hslToRgb(hue / 360, 0.7, 0.7);
        return { r, g, b };
    }

    /**
     * Helper: Get accretion disk color (temperature-based)
     */
    getAccretionColor(t) {
        // Hot inner regions (blue-white) to cooler outer regions (red-orange)
        const temp = 1 - t;
        if (temp > 0.7) {
            return { r: 200 + temp * 55, g: 200 + temp * 55, b: 255 };
        } else if (temp > 0.3) {
            return { r: 255, g: 200 + temp * 55, b: 150 };
        } else {
            return { r: 255, g: 150, b: 100 };
        }
    }

    /**
     * Helper: HSL to RGB conversion
     */
    hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    /**
     * Stop animation
     */
    stop(id) {
        const frameId = this.animationFrames.get(id);
        if (frameId) {
            cancelAnimationFrame(frameId);
            this.animationFrames.delete(id);
        }

        const anim = this.animations.get(id);
        if (anim) {
            if (anim.cleanup) {
                window.removeEventListener('resize', anim.cleanup);
            }
            if (anim.canvas) {
                anim.canvas.remove();
            }
            this.animations.delete(id);
        }
    }

    /**
     * Stop all animations
     */
    stopAll() {
        this.animationFrames.forEach((frameId, id) => {
            this.stop(id);
        });
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            activeAnimations: this.animations.size,
            canvases: this.canvases.size
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedAnimations;
}
