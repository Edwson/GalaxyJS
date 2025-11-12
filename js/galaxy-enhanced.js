/**
 * GalaxyJS Enhanced - Integration layer for modern features
 * Integrates all new modules with existing GalaxyJS codebase
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('[GalaxyJS Enhanced] Initializing modern features...');

    // Check if Web Animations API is supported
    if (!AnimationEngine.isSupported()) {
        console.warn('[GalaxyJS Enhanced] Web Animations API not supported, falling back to CSS animations');
    }

    // Initialize Performance Monitor
    const performanceMonitor = new PerformanceMonitor({
        targetFPS: 60,
        adaptiveQuality: true,
        onQualityChange: (quality, settings) => {
            console.log(`[Performance] Quality changed to ${quality}`, settings);
            // Apply quality settings to all active animations
            if (window.galaxy && window.galaxy.advancedAnimations) {
                window.galaxy.advancedAnimations.performanceMonitor = performanceMonitor;
            }
        }
    });

    performanceMonitor.start();

    // Initialize Particle Pool
    const particlePool = new ParticlePool(1000);

    // Initialize Animation Engine
    const animationEngine = new AnimationEngine();

    // Initialize Advanced Animations
    const advancedAnimations = new AdvancedAnimations(performanceMonitor);

    // Initialize Accessibility Manager
    let accessibilityManager;

    // Extend the existing GalaxyJS instance with modern features
    if (typeof GalaxyJS !== 'undefined') {
        // Wait for GalaxyJS to initialize
        document.addEventListener('galaxyjs:initialized', function(e) {
            const galaxyInstance = e.detail.galaxy;

            console.log('[GalaxyJS Enhanced] Extending GalaxyJS with modern features');

            // Add modern components to galaxy instance
            galaxyInstance.performanceMonitor = performanceMonitor;
            galaxyInstance.particlePool = particlePool;
            galaxyInstance.animationEngine = animationEngine;
            galaxyInstance.advancedAnimations = advancedAnimations;

            // Initialize Accessibility
            accessibilityManager = new AccessibilityManager(galaxyInstance);
            galaxyInstance.accessibilityManager = accessibilityManager;

            // Initialize Animation Factory
            const animationFactory = new AnimationFactory(galaxyInstance);
            galaxyInstance.animationFactory = animationFactory;

            // Add method to get performance stats
            galaxyInstance.getPerformanceStats = function() {
                return {
                    performance: performanceMonitor.getStats(),
                    particlePool: particlePool.getStats(),
                    animations: animationEngine.getStats(),
                    advanced: advancedAnimations.getStats(),
                    accessibility: {
                        reducedMotion: accessibilityManager.isReducedMotion(),
                        recommendations: accessibilityManager.getRecommendedSettings()
                    }
                };
            };

            // Add method to enable/disable modern features
            galaxyInstance.setModernFeatures = function(enabled) {
                if (enabled) {
                    console.log('[GalaxyJS Enhanced] Modern features enabled');
                    performanceMonitor.start();
                } else {
                    console.log('[GalaxyJS Enhanced] Modern features disabled');
                    performanceMonitor.stop();
                }
            };

            // Add method to create enhanced particle effect
            galaxyInstance.createEnhancedParticles = function(container, options = {}) {
                const defaults = {
                    count: 50,
                    color: { r: 255, g: 255, b: 255 },
                    maxLife: 2000,
                    speed: 2
                };

                const config = { ...defaults, ...options };
                const quality = performanceMonitor.getQualitySettings();
                const adjustedCount = Math.floor(config.count * quality.particleMultiplier);

                const particles = [];
                for (let i = 0; i < adjustedCount; i++) {
                    const particle = particlePool.acquire({
                        x: Math.random() * container.offsetWidth,
                        y: Math.random() * container.offsetHeight,
                        vx: (Math.random() - 0.5) * config.speed,
                        vy: (Math.random() - 0.5) * config.speed,
                        life: 1,
                        maxLife: config.maxLife,
                        color: config.color
                    });
                    particles.push(particle);
                }

                return particles;
            };

            // Add method to release particles
            galaxyInstance.releaseParticles = function(particles) {
                particlePool.releaseMany(particles);
            };

            // Add skip to content link for accessibility
            accessibilityManager.addSkipLink();

            // Monitor FPS and log statistics periodically
            if (galaxyInstance.options.debug) {
                setInterval(() => {
                    const stats = galaxyInstance.getPerformanceStats();
                    console.log('[GalaxyJS Enhanced] Stats:', stats);
                }, 5000);
            }

            // Announce initialization to screen readers
            accessibilityManager.announce('GalaxyJS animation library loaded');

            console.log('[GalaxyJS Enhanced] Initialization complete');
            console.log('[GalaxyJS Enhanced] Use galaxy.getPerformanceStats() to view performance metrics');

            // Dispatch custom event for extension complete
            document.dispatchEvent(new CustomEvent('galaxyjs:enhanced', {
                detail: {
                    galaxy: galaxyInstance,
                    performanceMonitor,
                    particlePool,
                    animationEngine,
                    advancedAnimations,
                    accessibilityManager
                }
            }));
        });
    } else {
        console.warn('[GalaxyJS Enhanced] GalaxyJS not found, running standalone');

        // Create standalone instance
        window.galaxyEnhanced = {
            performanceMonitor,
            particlePool,
            animationEngine,
            advancedAnimations,
            getStats: () => ({
                performance: performanceMonitor.getStats(),
                particlePool: particlePool.getStats(),
                animations: animationEngine.getStats(),
                advanced: advancedAnimations.getStats()
            })
        };
    }

    // Add global helper functions
    window.GalaxyHelpers = {
        /**
         * Create a quick animation using WAAPI
         */
        quickAnimate: function(element, keyframes, duration = 1000) {
            if (!animationEngine) return null;
            return animationEngine.create(element, keyframes, { duration });
        },

        /**
         * Create a pulsing glow effect
         */
        createGlow: function(element, options = {}) {
            if (!animationEngine) return null;
            return animationEngine.createGlow(element, options);
        },

        /**
         * Create particle burst effect
         */
        createBurst: function(container, options = {}) {
            if (!animationEngine) return null;
            return animationEngine.createParticleBurst(container, options);
        },

        /**
         * Create spiral galaxy animation
         */
        createSpiralGalaxy: function(containerId, options = {}) {
            if (!advancedAnimations) return null;
            return advancedAnimations.createSpiralGalaxy(containerId, options);
        },

        /**
         * Create quantum cloud animation
         */
        createQuantumCloud: function(containerId, options = {}) {
            if (!advancedAnimations) return null;
            return advancedAnimations.createQuantumCloud(containerId, options);
        },

        /**
         * Create accretion disk animation
         */
        createAccretionDisk: function(containerId, options = {}) {
            if (!advancedAnimations) return null;
            return advancedAnimations.createAccretionDisk(containerId, options);
        },

        /**
         * Get current FPS
         */
        getFPS: function() {
            return performanceMonitor.getFPS();
        },

        /**
         * Check if reduced motion is preferred
         */
        prefersReducedMotion: function() {
            return PerformanceMonitor.prefersReducedMotion();
        },

        /**
         * Get device performance tier
         */
        getDeviceTier: function() {
            return PerformanceMonitor.getDeviceTier();
        }
    };

    // Log available features
    console.log('[GalaxyJS Enhanced] Available helpers:', Object.keys(window.GalaxyHelpers));
    console.log('[GalaxyJS Enhanced] Device Tier:', PerformanceMonitor.getDeviceTier());
    console.log('[GalaxyJS Enhanced] Reduced Motion:', PerformanceMonitor.prefersReducedMotion());
});

// Add cleanup on page unload
window.addEventListener('beforeunload', function() {
    // Cleanup all animations
    if (window.galaxy) {
        if (window.galaxy.advancedAnimations) {
            window.galaxy.advancedAnimations.stopAll();
        }
        if (window.galaxy.animationEngine) {
            window.galaxy.animationEngine.stopAll();
        }
        if (window.galaxy.performanceMonitor) {
            window.galaxy.performanceMonitor.stop();
        }
        if (window.galaxy.particlePool) {
            window.galaxy.particlePool.clear();
        }
        if (window.galaxy.accessibilityManager) {
            window.galaxy.accessibilityManager.destroy();
        }
    }

    console.log('[GalaxyJS Enhanced] Cleanup complete');
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PerformanceMonitor,
        ParticlePool,
        AnimationEngine,
        AdvancedAnimations,
        AnimationFactory,
        AccessibilityManager,
        CanvasOptimizer
    };
}
