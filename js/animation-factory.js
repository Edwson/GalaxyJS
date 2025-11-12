/**
 * AnimationFactory - Eliminates code duplication for animation initialization
 * Creates animation initializers dynamically using a factory pattern
 */
class AnimationFactory {
    constructor(galaxyInstance) {
        this.galaxy = galaxyInstance;
        this.animationConfigs = this.getAnimationConfigs();
    }

    /**
     * Get all animation configurations
     */
    getAnimationConfigs() {
        return {
            pulsar: {
                selector: '.pulsar-animation',
                className: 'pulsar-active',
                init: (element) => this.initPulsarAnimation(element)
            },
            blackhole: {
                selector: '.blackhole-animation',
                className: 'blackhole-active',
                init: (element) => this.initBlackHoleAnimation(element)
            },
            wormhole: {
                selector: '.wormhole-animation',
                className: 'wormhole-active',
                init: (element) => this.initWormholeAnimation(element)
            },
            supernova: {
                selector: '.supernova-animation',
                className: 'supernova-active',
                init: (element) => this.initSupernovaAnimation(element)
            },
            asteroid: {
                selector: '.asteroid-animation',
                className: 'asteroid-active',
                init: (element) => this.initAsteroidAnimation(element)
            },
            cosmic_ray: {
                selector: '.cosmic-ray-animation',
                className: 'cosmic-ray-active',
                init: (element) => this.initCosmicRayAnimation(element)
            },
            nebula: {
                selector: '.nebula-animation',
                className: 'nebula-active',
                init: (element) => this.initNebulaAnimation(element)
            },
            binary_stars: {
                selector: '.binary-stars-animation',
                className: 'binary-stars-active',
                init: (element) => this.initBinaryStarsAnimation(element)
            },
            quantum_tunneling: {
                selector: '.quantum-tunneling-animation',
                className: 'quantum-tunneling-active',
                init: (element) => this.initQuantumTunnelingAnimation(element)
            },
            spiral_galaxy: {
                selector: '.spiral-galaxy-animation',
                className: 'spiral-galaxy-active',
                init: (element) => this.initSpiralGalaxyAnimation(element)
            }
        };
    }

    /**
     * Initialize all animations using factory pattern
     */
    initAll() {
        Object.keys(this.animationConfigs).forEach(animationType => {
            this.initAnimation(animationType);
        });
    }

    /**
     * Initialize specific animation type
     */
    initAnimation(animationType) {
        const config = this.animationConfigs[animationType];
        if (!config) {
            console.warn(`[AnimationFactory] Unknown animation type: ${animationType}`);
            return;
        }

        const elements = document.querySelectorAll(config.selector);
        elements.forEach(element => {
            try {
                element.classList.add(config.className);
                config.init(element);
            } catch (error) {
                console.error(`[AnimationFactory] Error initializing ${animationType}:`, error);
            }
        });
    }

    /**
     * Generic element animation initializer
     */
    initGenericAnimation(element, options = {}) {
        const defaults = {
            particles: [],
            updateInterval: 50,
            maxParticles: 20,
            particleLifetime: 2000
        };

        const config = { ...defaults, ...options };
        const particles = [];

        const cleanup = setInterval(() => {
            const now = Date.now();
            const toRemove = [];

            particles.forEach((particle, index) => {
                if (now - particle.timestamp > config.particleLifetime) {
                    particle.element?.remove();
                    toRemove.push(index);
                }
            });

            toRemove.reverse().forEach(index => particles.splice(index, 1));

            if (particles.length >= config.maxParticles) {
                const oldest = particles.shift();
                oldest.element?.remove();
            }
        }, config.updateInterval);

        element.dataset.cleanupInterval = cleanup;
        return { particles, cleanup };
    }

    /**
     * Pulsar animation
     */
    initPulsarAnimation(element) {
        const { particles } = this.initGenericAnimation(element, {
            maxParticles: 15,
            particleLifetime: 1500
        });

        setInterval(() => {
            const wave = document.createElement('div');
            wave.className = 'pulsar-wave';
            wave.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                animation: pulsar-wave 1.5s ease-out forwards;
            `;
            element.appendChild(wave);
            particles.push({ element: wave, timestamp: Date.now() });
        }, 500);
    }

    /**
     * Black hole animation
     */
    initBlackHoleAnimation(element) {
        const { particles } = this.initGenericAnimation(element, {
            maxParticles: 25,
            particleLifetime: 3000,
            updateInterval: 100
        });

        setInterval(() => {
            const particle = document.createElement('div');
            particle.className = 'blackhole-particle';
            const angle = Math.random() * Math.PI * 2;
            const distance = 100 + Math.random() * 100;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 50%;
                left: 50%;
                top: 50%;
                transform: translate(${x}px, ${y}px);
                animation: blackhole-spiral 3s ease-in forwards;
            `;
            element.appendChild(particle);
            particles.push({ element: particle, timestamp: Date.now() });
        }, 100);
    }

    /**
     * Wormhole animation
     */
    initWormholeAnimation(element) {
        const { particles } = this.initGenericAnimation(element, {
            maxParticles: 30,
            particleLifetime: 2000
        });

        setInterval(() => {
            const ring = document.createElement('div');
            ring.className = 'wormhole-ring';
            ring.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 10px;
                height: 10px;
                border: 2px solid rgba(150, 150, 255, 0.6);
                border-radius: 50%;
                animation: wormhole-expand 2s ease-out forwards;
            `;
            element.appendChild(ring);
            particles.push({ element: ring, timestamp: Date.now() });
        }, 200);
    }

    /**
     * Supernova animation
     */
    initSupernovaAnimation(element) {
        const { particles } = this.initGenericAnimation(element, {
            maxParticles: 40,
            particleLifetime: 2500
        });

        setInterval(() => {
            const count = 8;
            for (let i = 0; i < count; i++) {
                const particle = document.createElement('div');
                particle.className = 'supernova-particle';
                const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
                const speed = 2 + Math.random() * 2;

                particle.style.cssText = `
                    position: absolute;
                    width: 3px;
                    height: 3px;
                    background: rgba(255, ${200 + Math.random() * 55}, 100, 0.9);
                    border-radius: 50%;
                    left: 50%;
                    top: 50%;
                    animation: supernova-burst ${speed}s ease-out forwards;
                    --angle: ${angle}rad;
                `;
                element.appendChild(particle);
                particles.push({ element: particle, timestamp: Date.now() });
            }
        }, 1000);
    }

    /**
     * Asteroid animation
     */
    initAsteroidAnimation(element) {
        const { particles } = this.initGenericAnimation(element, {
            maxParticles: 10,
            particleLifetime: 3000
        });

        setInterval(() => {
            const asteroid = document.createElement('div');
            asteroid.className = 'asteroid';
            const size = 8 + Math.random() * 12;
            const startX = Math.random() * 100;
            const startY = -20;
            const duration = 3 + Math.random() * 2;

            asteroid.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: rgba(180, 180, 180, 0.8);
                border-radius: 40%;
                left: ${startX}%;
                top: ${startY}%;
                animation: asteroid-fall ${duration}s linear forwards;
            `;
            element.appendChild(asteroid);
            particles.push({ element: asteroid, timestamp: Date.now() });
        }, 500);
    }

    /**
     * Cosmic ray animation
     */
    initCosmicRayAnimation(element) {
        const { particles } = this.initGenericAnimation(element, {
            maxParticles: 15,
            particleLifetime: 1000
        });

        setInterval(() => {
            const ray = document.createElement('div');
            ray.className = 'cosmic-ray';
            const angle = Math.random() * Math.PI * 2;
            const length = 30 + Math.random() * 40;

            ray.style.cssText = `
                position: absolute;
                width: 2px;
                height: ${length}px;
                background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.9));
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                transform: rotate(${angle}rad);
                animation: cosmic-ray-flash 1s ease-out forwards;
            `;
            element.appendChild(ray);
            particles.push({ element: ray, timestamp: Date.now() });
        }, 300);
    }

    /**
     * Nebula animation
     */
    initNebulaAnimation(element) {
        const { particles } = this.initGenericAnimation(element, {
            maxParticles: 20,
            particleLifetime: 4000
        });

        setInterval(() => {
            const cloud = document.createElement('div');
            cloud.className = 'nebula-cloud';
            const size = 40 + Math.random() * 60;
            const hue = Math.random() * 60 + 240; // Blue-purple range

            cloud.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: radial-gradient(circle, hsla(${hue}, 70%, 60%, 0.3), transparent);
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                filter: blur(10px);
                animation: nebula-drift 4s ease-in-out forwards;
            `;
            element.appendChild(cloud);
            particles.push({ element: cloud, timestamp: Date.now() });
        }, 800);
    }

    /**
     * Binary stars animation
     */
    initBinaryStarsAnimation(element) {
        const star1 = document.createElement('div');
        const star2 = document.createElement('div');

        star1.className = 'binary-star star-1';
        star2.className = 'binary-star star-2';

        star1.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, rgba(255,200,100,1), rgba(255,150,50,0));
            border-radius: 50%;
            animation: binary-orbit-1 4s linear infinite;
        `;

        star2.style.cssText = `
            position: absolute;
            width: 16px;
            height: 16px;
            background: radial-gradient(circle, rgba(150,200,255,1), rgba(100,150,255,0));
            border-radius: 50%;
            animation: binary-orbit-2 4s linear infinite;
        `;

        element.appendChild(star1);
        element.appendChild(star2);
    }

    /**
     * Quantum tunneling animation
     */
    initQuantumTunnelingAnimation(element) {
        const { particles } = this.initGenericAnimation(element, {
            maxParticles: 12,
            particleLifetime: 2000
        });

        setInterval(() => {
            const particle = document.createElement('div');
            particle.className = 'quantum-particle';

            particle.style.cssText = `
                position: absolute;
                width: 6px;
                height: 6px;
                background: rgba(200, 200, 255, 0.8);
                border-radius: 50%;
                left: 10%;
                top: 50%;
                box-shadow: 0 0 10px rgba(200, 200, 255, 0.8);
                animation: quantum-tunnel 2s ease-in-out forwards;
            `;
            element.appendChild(particle);
            particles.push({ element: particle, timestamp: Date.now() });
        }, 500);
    }

    /**
     * Spiral galaxy animation (canvas-based)
     */
    initSpiralGalaxyAnimation(element) {
        if (this.galaxy.advancedAnimations) {
            this.galaxy.advancedAnimations.createSpiralGalaxy(element.id, {
                numArms: 4,
                numStars: 400
            });
        }
    }

    /**
     * Cleanup all animations
     */
    cleanup() {
        document.querySelectorAll('[data-cleanup-interval]').forEach(element => {
            const intervalId = element.dataset.cleanupInterval;
            if (intervalId) {
                clearInterval(parseInt(intervalId));
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationFactory;
}
