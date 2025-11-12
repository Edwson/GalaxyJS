/**
 * AnimationEngine - Modern Web Animations API (WAAPI) wrapper
 * Provides better control and performance than pure CSS animations
 */
class AnimationEngine {
    constructor() {
        this.animations = new Map();
        this.groups = new Map();
        this.isPaused = false;
    }

    /**
     * Create animation using Web Animations API
     * @param {HTMLElement} element - Target element
     * @param {Array} keyframes - Animation keyframes
     * @param {Object} options - Animation options
     * @param {String} name - Optional animation name for tracking
     */
    create(element, keyframes, options = {}, name = null) {
        if (!element || !keyframes) {
            console.error('[AnimationEngine] Missing element or keyframes');
            return null;
        }

        // Default options
        const animOptions = {
            duration: 1000,
            iterations: 1,
            easing: 'ease',
            fill: 'forwards',
            ...options
        };

        try {
            const animation = element.animate(keyframes, animOptions);

            // Store animation reference
            const id = name || this.generateId();
            this.animations.set(id, {
                animation,
                element,
                keyframes,
                options: animOptions,
                state: 'running'
            });

            // Cleanup on finish
            animation.onfinish = () => {
                if (animOptions.iterations !== Infinity) {
                    this.animations.delete(id);
                }
            };

            return { id, animation };
        } catch (error) {
            console.error('[AnimationEngine] Failed to create animation:', error);
            return null;
        }
    }

    /**
     * Create pulsating animation
     */
    createPulse(element, options = {}) {
        const keyframes = [
            { transform: 'scale(1)', opacity: 1 },
            { transform: `scale(${options.scale || 1.2})`, opacity: options.opacity || 0.7 },
            { transform: 'scale(1)', opacity: 1 }
        ];

        return this.create(element, keyframes, {
            duration: options.duration || 2000,
            iterations: Infinity,
            easing: 'ease-in-out',
            ...options
        }, options.name);
    }

    /**
     * Create fade animation
     */
    createFade(element, direction = 'in', options = {}) {
        const keyframes = direction === 'in'
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 1 }, { opacity: 0 }];

        return this.create(element, keyframes, {
            duration: options.duration || 500,
            easing: 'ease',
            ...options
        }, options.name);
    }

    /**
     * Create rotation animation
     */
    createRotation(element, options = {}) {
        const keyframes = [
            { transform: 'rotate(0deg)' },
            { transform: `rotate(${options.degrees || 360}deg)` }
        ];

        return this.create(element, keyframes, {
            duration: options.duration || 2000,
            iterations: options.loop ? Infinity : 1,
            easing: 'linear',
            ...options
        }, options.name);
    }

    /**
     * Create glow animation
     */
    createGlow(element, options = {}) {
        const color = options.color || '#fff';
        const intensity = options.intensity || 20;

        const keyframes = [
            { filter: `drop-shadow(0 0 0px ${color})` },
            { filter: `drop-shadow(0 0 ${intensity}px ${color})` },
            { filter: `drop-shadow(0 0 0px ${color})` }
        ];

        return this.create(element, keyframes, {
            duration: options.duration || 2000,
            iterations: Infinity,
            easing: 'ease-in-out',
            ...options
        }, options.name);
    }

    /**
     * Create particle burst animation
     */
    createParticleBurst(container, options = {}) {
        const count = options.count || 20;
        const particles = [];

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'burst-particle';
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: ${options.color || '#fff'};
                border-radius: 50%;
                pointer-events: none;
            `;

            const angle = (Math.PI * 2 * i) / count;
            const distance = options.distance || 100;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;

            container.appendChild(particle);

            const keyframes = [
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
            ];

            const anim = this.create(particle, keyframes, {
                duration: options.duration || 1000,
                easing: 'cubic-bezier(0, .9, .57, 1)',
                fill: 'forwards'
            });

            particles.push({ particle, animation: anim });

            // Cleanup after animation
            setTimeout(() => {
                particle.remove();
            }, options.duration || 1000);
        }

        return particles;
    }

    /**
     * Play animation by ID
     */
    play(id) {
        const anim = this.animations.get(id);
        if (anim) {
            anim.animation.play();
            anim.state = 'running';
        }
    }

    /**
     * Pause animation by ID
     */
    pause(id) {
        const anim = this.animations.get(id);
        if (anim) {
            anim.animation.pause();
            anim.state = 'paused';
        }
    }

    /**
     * Stop animation by ID
     */
    stop(id) {
        const anim = this.animations.get(id);
        if (anim) {
            anim.animation.cancel();
            this.animations.delete(id);
        }
    }

    /**
     * Pause all animations
     */
    pauseAll() {
        this.animations.forEach((anim, id) => {
            this.pause(id);
        });
        this.isPaused = true;
    }

    /**
     * Resume all animations
     */
    resumeAll() {
        this.animations.forEach((anim, id) => {
            this.play(id);
        });
        this.isPaused = false;
    }

    /**
     * Stop all animations
     */
    stopAll() {
        this.animations.forEach((anim, id) => {
            this.stop(id);
        });
        this.animations.clear();
    }

    /**
     * Get animation by ID
     */
    get(id) {
        return this.animations.get(id);
    }

    /**
     * Create animation group
     */
    createGroup(name, animationIds = []) {
        this.groups.set(name, new Set(animationIds));
    }

    /**
     * Add animation to group
     */
    addToGroup(groupName, animationId) {
        if (!this.groups.has(groupName)) {
            this.groups.set(groupName, new Set());
        }
        this.groups.get(groupName).add(animationId);
    }

    /**
     * Control entire group
     */
    controlGroup(groupName, action) {
        const group = this.groups.get(groupName);
        if (!group) return;

        group.forEach(id => {
            if (action === 'play') this.play(id);
            else if (action === 'pause') this.pause(id);
            else if (action === 'stop') this.stop(id);
        });
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get statistics
     */
    getStats() {
        const states = { running: 0, paused: 0, finished: 0 };
        this.animations.forEach(anim => {
            states[anim.state] = (states[anim.state] || 0) + 1;
        });

        return {
            total: this.animations.size,
            groups: this.groups.size,
            states,
            isPaused: this.isPaused
        };
    }

    /**
     * Check if Web Animations API is supported
     */
    static isSupported() {
        return typeof Element.prototype.animate === 'function';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationEngine;
}
