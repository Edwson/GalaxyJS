/**
 * GalaxyJS - Animation Implementations
 * Advanced cosmic animations with physics and interactivity
 */

/**
 * Physics Engine for advanced simulations
 */
class PhysicsEngine {
    constructor() {
        this.gravity = 9.81;
        this.timeStep = 1/60;
    }
    
    updateParticle(particle, deltaTime) {
        // Apply gravity
        particle.vy += this.gravity * deltaTime;
        
        // Update position
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        
        return particle;
    }
    
    checkCollision(particle1, particle2) {
        const dx = particle2.x - particle1.x;
        const dy = particle2.y - particle1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = particle1.radius + particle2.radius;
        
        return distance < minDistance;
    }
    
    resolveCollision(particle1, particle2) {
        const dx = particle2.x - particle1.x;
        const dy = particle2.y - particle1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        const nx = dx / distance;
        const ny = dy / distance;
        
        const relativeVelocityX = particle2.vx - particle1.vx;
        const relativeVelocityY = particle2.vy - particle1.vy;
        
        const speed = relativeVelocityX * nx + relativeVelocityY * ny;
        
        if (speed > 0) return;
        
        const restitution = 0.8;
        const impulse = 2 * speed / (particle1.mass + particle2.mass);
        
        particle1.vx += impulse * particle2.mass * nx;
        particle1.vy += impulse * particle2.mass * ny;
        particle2.vx -= impulse * particle1.mass * nx;
        particle2.vy -= impulse * particle1.mass * ny;
    }
}

class GalaxyAnimations {
    constructor(galaxy) {
        this.galaxy = galaxy;
        this.canvas = null;
        this.ctx = null;
        this.animationFrames = new Map();
        this.particleSystems = new Map();
        this.physicsEngine = new PhysicsEngine();
        this.activeAnimations = new Set();
    }
    
    /**
     * Initialize canvas for animations
     */
    initCanvas(container) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        
        container.appendChild(this.canvas);
        
        return this.canvas;
    }
    
    /**
     * Stop all animations for an element
     */
    stopAnimations(element) {
        const animation = this.animationFrames.get(element);
        if (animation) {
            animation.isActive = false;
            this.animationFrames.delete(element);
        }
    }
    
    /**
     * Stop all animations
     */
    stopAllAnimations() {
        this.animationFrames.forEach((animation, element) => {
            animation.isActive = false;
        });
        this.animationFrames.clear();
        this.activeAnimations.clear();
    }
    
    /**
     * Pulsar Animation
     */
    initPulsar(element, options = {}) {
        const config = {
            frequency: 2, // Hz
            intensity: 0.8,
            waveCount: 3,
            color: '#ffffff',
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            waves: [],
            isActive: true
        };
        
        // Create wave objects
        for (let i = 0; i < config.waveCount; i++) {
            animation.waves.push({
                radius: 0,
                opacity: 1,
                delay: i * (1000 / config.frequency) / config.waveCount
            });
        }
        
        this.animatePulsar(animation);
        this.animationFrames.set(element, animation);
    }
    
    animatePulsar(animation) {
        if (!animation.isActive) return;
        
        const { element, config, waves } = animation;
        const time = Date.now();
        
        // Remove old waves before drawing new ones
        const oldWaves = element.querySelectorAll('.pulsar-wave');
        oldWaves.forEach(wave => wave.remove());
        
        waves.forEach((wave, index) => {
            const elapsed = time - wave.delay;
            const progress = (elapsed % (1000 / config.frequency)) / (1000 / config.frequency);
            
            wave.radius = progress * 100;
            wave.opacity = 1 - progress;
            
            // Create wave element
            const waveEl = document.createElement('div');
            waveEl.className = 'pulsar-wave';
            waveEl.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: ${wave.radius * 2}px;
                height: ${wave.radius * 2}px;
                border: 1px solid ${config.color};
                border-radius: 50%;
                transform: translate(-50%, -50%);
                opacity: ${wave.opacity * config.intensity};
                pointer-events: none;
                transition: none;
            `;
            
            element.appendChild(waveEl);
        });
        
        requestAnimationFrame(() => this.animatePulsar(animation));
    }
    
    /**
     * Black Hole Animation
     */
    initBlackHole(element, options = {}) {
        const config = {
            eventHorizon: true,
            accretionDisk: true,
            rotationSpeed: 0.02,
            diskParticles: 50,
            ...options
        };
        
        const animation = {
            element,
            config,
            angle: 0,
            particles: [],
            isActive: true,
            lastCleanup: Date.now()
        };
        
        // Create accretion disk particles
        if (config.accretionDisk) {
            for (let i = 0; i < config.diskParticles; i++) {
                const angle = (i / config.diskParticles) * Math.PI * 2;
                const radius = 40 + Math.random() * 20;
                
                animation.particles.push({
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius,
                    angle,
                    radius,
                    speed: 0.02 + Math.random() * 0.01
                });
            }
        }
        
        this.animateBlackHole(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateBlackHole(animation) {
        if (!animation.isActive) return;
        
        const { element, config, particles } = animation;
        
        // Clean up old particles periodically
        const now = Date.now();
        if (now - animation.lastCleanup > 100) {
            const oldParticles = element.querySelectorAll('.accretion-particle');
            oldParticles.forEach(particle => particle.remove());
            animation.lastCleanup = now;
        }
        
        // Update particle positions
        particles.forEach(particle => {
            particle.angle += particle.speed;
            particle.x = Math.cos(particle.angle) * particle.radius;
            particle.y = Math.sin(particle.angle) * particle.radius;
        });
        
        // Create particle elements
        particles.forEach(particle => {
            const particleEl = document.createElement('div');
            particleEl.className = 'accretion-particle';
            particleEl.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 2px;
                height: 2px;
                background: #ffffff;
                border-radius: 50%;
                transform: translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px));
                pointer-events: none;
                box-shadow: 0 0 4px #ffffff;
                z-index: 1;
            `;
            
            element.appendChild(particleEl);
        });
        
        requestAnimationFrame(() => this.animateBlackHole(animation));
    }
    
    /**
     * Wormhole Animation
     */
    initWormhole(element, options = {}) {
        const config = {
            depth: 200,
            starCount: 20,
            tunnelSpeed: 0.05,
            ...options
        };
        
        const animation = {
            element,
            config,
            stars: [],
            tunnelDepth: 0,
            isActive: true
        };
        
        // Create stars
        for (let i = 0; i < config.starCount; i++) {
            animation.stars.push({
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 100,
                z: Math.random() * config.depth,
                size: Math.random() * 3 + 1
            });
        }
        
        this.animateWormhole(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateWormhole(animation) {
        if (!animation.isActive) return;
        
        const { element, config, stars } = animation;
        
        // Update star positions
        stars.forEach(star => {
            star.z -= config.tunnelSpeed;
            if (star.z < 1) {
                star.z = config.depth;
                star.x = (Math.random() - 0.5) * 100;
                star.y = (Math.random() - 0.5) * 100;
            }
            
            // Calculate 3D position
            const scale = 1 / star.z;
            const x = star.x * scale;
            const y = star.y * scale;
            const size = star.size * scale;
            
            // Create star element
            const starEl = document.createElement('div');
            starEl.className = 'wormhole-star';
            starEl.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: ${size}px;
                height: ${size}px;
                background: #ffffff;
                border-radius: 50%;
                transform: translate(calc(-50% + ${x}px), calc(-50% + ${y}px));
                pointer-events: none;
                box-shadow: 0 0 ${size * 2}px #ffffff;
                opacity: ${scale};
            `;
            
            element.appendChild(starEl);
            
            // Remove star after frame
            setTimeout(() => {
                if (starEl.parentNode) {
                    starEl.remove();
                }
            }, 50);
        });
        
        requestAnimationFrame(() => this.animateWormhole(animation));
    }
    
    /**
     * Supernova Animation
     */
    initSupernova(element, options = {}) {
        const config = {
            explosionForce: 100,
            particleCount: 30,
            duration: 3000,
            ...options
        };
        
        const animation = {
            element,
            config,
            particles: [],
            startTime: Date.now(),
            isActive: true
        };
        
        // Create explosion particles
        for (let i = 0; i < config.particleCount; i++) {
            const angle = (i / config.particleCount) * Math.PI * 2;
            const velocity = config.explosionForce * (0.5 + Math.random() * 0.5);
            
            animation.particles.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: 1,
                decay: 0.02 + Math.random() * 0.01
            });
        }
        
        this.animateSupernova(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateSupernova(animation) {
        if (!animation.isActive) return;
        
        const { element, config, particles, startTime } = animation;
        const elapsed = Date.now() - startTime;
        const progress = elapsed / config.duration;
        
        if (progress >= 1) {
            animation.isActive = false;
            return;
        }
        
        // Update particles
        particles.forEach(particle => {
            particle.x += particle.vx * 0.1;
            particle.y += particle.vy * 0.1;
            particle.life -= particle.decay;
            
            if (particle.life > 0) {
                const particleEl = document.createElement('div');
                particleEl.className = 'supernova-particle';
                particleEl.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 4px;
                    height: 4px;
                    background: #ffffff;
                    border-radius: 50%;
                    transform: translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px));
                    pointer-events: none;
                    box-shadow: 0 0 8px #ffffff;
                    opacity: ${particle.life};
                `;
                
                element.appendChild(particleEl);
                
                setTimeout(() => {
                    if (particleEl.parentNode) {
                        particleEl.remove();
                    }
                }, 50);
            }
        });
        
        requestAnimationFrame(() => this.animateSupernova(animation));
    }
    
    /**
     * Asteroid Field Animation
     */
    initAsteroidField(element, options = {}) {
        const config = {
            asteroidCount: 15,
            fieldSize: 200,
            rotationSpeed: 0.01,
            ...options
        };
        
        const animation = {
            element,
            config,
            asteroids: [],
            angle: 0,
            isActive: true
        };
        
        // Create asteroids
        for (let i = 0; i < config.asteroidCount; i++) {
            animation.asteroids.push({
                x: (Math.random() - 0.5) * config.fieldSize,
                y: (Math.random() - 0.5) * config.fieldSize,
                size: Math.random() * 4 + 2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.1
            });
        }
        
        this.animateAsteroidField(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateAsteroidField(animation) {
        if (!animation.isActive) return;
        
        const { element, config, asteroids } = animation;
        
        asteroids.forEach(asteroid => {
            asteroid.rotation += asteroid.rotationSpeed;
            
            const asteroidEl = document.createElement('div');
            asteroidEl.className = 'asteroid';
            asteroidEl.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: ${asteroid.size}px;
                height: ${asteroid.size}px;
                background: #666666;
                border-radius: 50%;
                transform: translate(calc(-50% + ${asteroid.x}px), calc(-50% + ${asteroid.y}px)) rotate(${asteroid.rotation}rad);
                pointer-events: none;
            `;
            
            element.appendChild(asteroidEl);
            
            setTimeout(() => {
                if (asteroidEl.parentNode) {
                    asteroidEl.remove();
                }
            }, 50);
        });
        
        requestAnimationFrame(() => this.animateAsteroidField(animation));
    }
    
    /**
     * Cosmic Ray Animation
     */
    initCosmicRay(element, options = {}) {
        const config = {
            rayCount: 5,
            speed: 2,
            length: 50,
            ...options
        };
        
        const animation = {
            element,
            config,
            rays: [],
            isActive: true
        };
        
        // Create cosmic rays
        for (let i = 0; i < config.rayCount; i++) {
            animation.rays.push({
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 100,
                angle: Math.random() * Math.PI * 2,
                progress: Math.random(),
                speed: config.speed * (0.5 + Math.random() * 0.5)
            });
        }
        
        this.animateCosmicRay(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateCosmicRay(animation) {
        if (!animation.isActive) return;
        
        const { element, config, rays } = animation;
        
        rays.forEach(ray => {
            ray.progress += ray.speed * 0.01;
            if (ray.progress > 1) {
                ray.progress = 0;
                ray.x = (Math.random() - 0.5) * 100;
                ray.y = (Math.random() - 0.5) * 100;
                ray.angle = Math.random() * Math.PI * 2;
            }
            
            const rayEl = document.createElement('div');
            rayEl.className = 'cosmic-ray';
            rayEl.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 2px;
                height: ${config.length}px;
                background: linear-gradient(to bottom, #ffffff, transparent);
                transform: translate(calc(-50% + ${ray.x}px), calc(-50% + ${ray.y}px)) rotate(${ray.angle}rad);
                pointer-events: none;
                opacity: ${1 - ray.progress};
            `;
            
            element.appendChild(rayEl);
            
            setTimeout(() => {
                if (rayEl.parentNode) {
                    rayEl.remove();
                }
            }, 50);
        });
        
        requestAnimationFrame(() => this.animateCosmicRay(animation));
    }
    
    /**
     * Particle System
     */
    createParticleSystem(container, options = {}) {
        const config = {
            particleCount: 100,
            gravity: 0.1,
            friction: 0.98,
            bounce: 0.8,
            ...options
        };
        
        const system = {
            container,
            config,
            particles: [],
            isActive: true
        };
        
        // Create particles
        for (let i = 0; i < config.particleCount; i++) {
            system.particles.push({
                x: Math.random() * container.offsetWidth,
                y: Math.random() * container.offsetHeight,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: Math.random() * 3 + 1,
                life: 1,
                decay: 0.001
            });
        }
        
        this.animateParticleSystem(system);
        this.particleSystems.set(container, system);
        
        return system;
    }
    
    animateParticleSystem(system) {
        if (!system.isActive) return;
        
        const { container, config, particles } = system;
        
        particles.forEach(particle => {
            // Apply physics
            particle.vy += config.gravity;
            particle.vx *= config.friction;
            particle.vy *= config.friction;
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Bounce off walls
            if (particle.x < 0 || particle.x > container.offsetWidth) {
                particle.vx *= -config.bounce;
                particle.x = Math.max(0, Math.min(container.offsetWidth, particle.x));
            }
            
            if (particle.y < 0 || particle.y > container.offsetHeight) {
                particle.vy *= -config.bounce;
                particle.y = Math.max(0, Math.min(container.offsetHeight, particle.y));
            }
            
            // Update life
            particle.life -= particle.decay;
            if (particle.life <= 0) {
                particle.life = 1;
                particle.x = Math.random() * container.offsetWidth;
                particle.y = Math.random() * container.offsetHeight;
            }
            
            // Create particle element
            const particleEl = document.createElement('div');
            particleEl.className = 'particle';
            particleEl.style.cssText = `
                position: absolute;
                top: ${particle.y}px;
                left: ${particle.x}px;
                width: ${particle.size}px;
                height: ${particle.size}px;
                background: #ffffff;
                border-radius: 50%;
                pointer-events: none;
                opacity: ${particle.life};
                box-shadow: 0 0 ${particle.size * 2}px #ffffff;
            `;
            
            container.appendChild(particleEl);
            
            setTimeout(() => {
                if (particleEl.parentNode) {
                    particleEl.remove();
                }
            }, 50);
        });
        
        requestAnimationFrame(() => this.animateParticleSystem(system));
    }
    
    /**
     * Mouse Trail Effect
     */
    initMouseTrail(container, options = {}) {
        const config = {
            trailLength: 20,
            particleSize: 3,
            fadeSpeed: 0.95,
            ...options
        };
        
        const trail = {
            container,
            config,
            points: [],
            isActive: true
        };
        
        // Track mouse movement
        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            trail.points.push({ x, y, life: 1 });
            
            if (trail.points.length > config.trailLength) {
                trail.points.shift();
            }
        });
        
        this.animateMouseTrail(trail);
        return trail;
    }
    
    animateMouseTrail(trail) {
        if (!trail.isActive) return;
        
        const { container, config, points } = trail;
        
        points.forEach((point, index) => {
            point.life *= config.fadeSpeed;
            
            if (point.life > 0.01) {
                const trailEl = document.createElement('div');
                trailEl.className = 'trail-particle';
                trailEl.style.cssText = `
                    position: absolute;
                    top: ${point.y}px;
                    left: ${point.x}px;
                    width: ${config.particleSize}px;
                    height: ${config.particleSize}px;
                    background: #ffffff;
                    border-radius: 50%;
                    pointer-events: none;
                    opacity: ${point.life};
                    box-shadow: 0 0 ${config.particleSize * 2}px #ffffff;
                `;
                
                container.appendChild(trailEl);
                
                setTimeout(() => {
                    if (trailEl.parentNode) {
                        trailEl.remove();
                    }
                }, 50);
            }
        });
        
        requestAnimationFrame(() => this.animateMouseTrail(trail));
    }
    
    /**
     * Gravity Simulation
     */
    initGravitySimulation(container, options = {}) {
        const config = {
            bodyCount: 5,
            gravity: 0.5,
            ...options
        };
        
        const simulation = {
            container,
            config,
            bodies: [],
            isActive: true
        };
        
        // Create celestial bodies
        for (let i = 0; i < config.bodyCount; i++) {
            simulation.bodies.push({
                x: Math.random() * container.offsetWidth,
                y: Math.random() * container.offsetHeight,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                mass: Math.random() * 50 + 10,
                size: Math.random() * 20 + 10
            });
        }
        
        this.animateGravitySimulation(simulation);
        return simulation;
    }
    
    animateGravitySimulation(simulation) {
        if (!simulation.isActive) return;
        
        const { container, config, bodies } = simulation;
        
        // Calculate gravitational forces
        bodies.forEach((body, i) => {
            let fx = 0, fy = 0;
            
            bodies.forEach((other, j) => {
                if (i !== j) {
                    const dx = other.x - body.x;
                    const dy = other.y - body.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        const force = (config.gravity * body.mass * other.mass) / (distance * distance);
                        fx += (dx / distance) * force;
                        fy += (dy / distance) * force;
                    }
                }
            });
            
            // Apply forces
            body.vx += fx / body.mass * 0.1;
            body.vy += fy / body.mass * 0.1;
            
            // Update position
            body.x += body.vx;
            body.y += body.vy;
            
            // Bounce off walls
            if (body.x < 0 || body.x > container.offsetWidth) {
                body.vx *= -0.8;
                body.x = Math.max(0, Math.min(container.offsetWidth, body.x));
            }
            
            if (body.y < 0 || body.y > container.offsetHeight) {
                body.vy *= -0.8;
                body.y = Math.max(0, Math.min(container.offsetHeight, body.y));
            }
            
            // Create body element
            const bodyEl = document.createElement('div');
            bodyEl.className = 'gravity-body';
            bodyEl.style.cssText = `
                position: absolute;
                top: ${body.y}px;
                left: ${body.x}px;
                width: ${body.size}px;
                height: ${body.size}px;
                background: #ffffff;
                border-radius: 50%;
                pointer-events: none;
                box-shadow: 0 0 ${body.size}px #ffffff;
            `;
            
            container.appendChild(bodyEl);
            
            setTimeout(() => {
                if (bodyEl.parentNode) {
                    bodyEl.remove();
                }
            }, 50);
        });
        
        requestAnimationFrame(() => this.animateGravitySimulation(simulation));
    }
    
    /**
     * Initialize dwarf planet animation
     */
    initDwarfPlanet(element, options = {}) {
        const config = {
            rotationSpeed: 0.01,
            ringSystem: true,
            ...options
        };
        
        const animation = {
            element,
            config,
            angle: 0,
            isActive: true
        };
        
        this.animateDwarfPlanet(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateDwarfPlanet(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.angle += config.rotationSpeed;
        
        const planet = element.querySelector('.dwarf-planet');
        const rings = element.querySelector('.planet-rings');
        
        if (planet) {
            planet.style.transform = `rotate(${animation.angle}rad)`;
        }
        
        if (rings) {
            rings.style.transform = `rotateX(75deg) rotateY(${animation.angle}rad)`;
        }
        
        requestAnimationFrame(() => this.animateDwarfPlanet(animation));
    }
    
    /**
     * Initialize nebula animation
     */
    initNebula(element, options = {}) {
        const config = {
            particleCount: 30,
            cloudSize: 80,
            driftSpeed: 0.01,
            ...options
        };
        
        const animation = {
            element,
            config,
            particles: [],
            isActive: true
        };
        
        // Create nebula particles
        for (let i = 0; i < config.particleCount; i++) {
            animation.particles.push({
                x: (Math.random() - 0.5) * config.cloudSize,
                y: (Math.random() - 0.5) * config.cloudSize,
                life: Math.random(),
                decay: 0.002
            });
        }
        
        this.animateNebula(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateNebula(animation) {
        if (!animation.isActive) return;
        
        const { element, config, particles } = animation;
        
        particles.forEach(particle => {
            particle.life -= particle.decay;
            
            if (particle.life > 0) {
                const particleEl = document.createElement('div');
                particleEl.className = 'nebula-particle';
                particleEl.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 2px;
                    height: 2px;
                    background: rgba(255, 255, 255, ${particle.life * 0.5});
                    border-radius: 50%;
                    transform: translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px));
                    pointer-events: none;
                `;
                
                element.appendChild(particleEl);
                
                setTimeout(() => {
                    if (particleEl.parentNode) {
                        particleEl.remove();
                    }
                }, 50);
            } else {
                particle.life = 1;
                particle.x = (Math.random() - 0.5) * config.cloudSize;
                particle.y = (Math.random() - 0.5) * config.cloudSize;
            }
        });
        
        requestAnimationFrame(() => this.animateNebula(animation));
    }
    
    /**
     * Initialize binary stars animation
     */
    initBinaryStars(element, options = {}) {
        const config = {
            orbitSpeed: 0.01,
            starSize: 12,
            orbitRadius: 30,
            ...options
        };
        
        const animation = {
            element,
            config,
            angle: 0,
            isActive: true
        };
        
        this.animateBinaryStars(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateBinaryStars(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.angle += config.orbitSpeed;
        
        const star1 = element.querySelector('.star-1');
        const star2 = element.querySelector('.star-2');
        
        if (star1) {
            const x1 = Math.cos(animation.angle) * config.orbitRadius;
            const y1 = Math.sin(animation.angle) * config.orbitRadius;
            star1.style.transform = `translate(${x1}px, ${y1}px) scale(1)`;
        }
        
        if (star2) {
            const x2 = Math.cos(animation.angle + Math.PI) * config.orbitRadius;
            const y2 = Math.sin(animation.angle + Math.PI) * config.orbitRadius;
            star2.style.transform = `translate(${x2}px, ${y2}px) scale(1.2)`;
        }
        
        requestAnimationFrame(() => this.animateBinaryStars(animation));
    }
    
    /**
     * Initialize cosmic dust animation
     */
    initCosmicDust(element, options = {}) {
        const config = {
            particleCount: 50,
            driftSpeed: 0.005,
            particleSize: 1,
            ...options
        };
        
        const animation = {
            element,
            config,
            particles: [],
            isActive: true
        };
        
        // Create dust particles
        for (let i = 0; i < config.particleCount; i++) {
            animation.particles.push({
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 100,
                life: Math.random(),
                decay: 0.001
            });
        }
        
        this.animateCosmicDust(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateCosmicDust(animation) {
        if (!animation.isActive) return;
        
        const { element, config, particles } = animation;
        
        particles.forEach(particle => {
            particle.life -= particle.decay;
            
            if (particle.life > 0) {
                const dustEl = document.createElement('div');
                dustEl.className = 'dust-particle';
                dustEl.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: ${config.particleSize}px;
                    height: ${config.particleSize}px;
                    background: rgba(255, 255, 255, ${particle.life * 0.3});
                    border-radius: 50%;
                    transform: translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px));
                    pointer-events: none;
                `;
                
                element.appendChild(dustEl);
                
                setTimeout(() => {
                    if (dustEl.parentNode) {
                        dustEl.remove();
                    }
                }, 50);
            } else {
                particle.life = 1;
                particle.x = (Math.random() - 0.5) * 100;
                particle.y = (Math.random() - 0.5) * 100;
            }
        });
        
        requestAnimationFrame(() => this.animateCosmicDust(animation));
    }
    
    /**
     * Initialize time dilation animation
     */
    initTimeDilation(element, options = {}) {
        const config = {
            dilationFactor: 0.5,
            clockSpeed: 0.01,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            isActive: true
        };
        
        this.animateTimeDilation(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateTimeDilation(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.time += config.clockSpeed;
        
        const clock = element.querySelector('.time-clock');
        
        if (clock) {
            const scale = 1 + Math.sin(animation.time) * 0.3;
            clock.style.transform = `scale(${scale})`;
        }
        
        requestAnimationFrame(() => this.animateTimeDilation(animation));
    }
    
    /**
     * Initialize quantum tunneling animation
     */
    initQuantumTunneling(element, options = {}) {
        const config = {
            barrierHeight: 50,
            particleSpeed: 2,
            tunnelProbability: 0.3,
            ...options
        };
        
        const animation = {
            element,
            config,
            particleX: -40,
            isActive: true
        };
        
        this.animateQuantumTunneling(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateQuantumTunneling(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.particleX += config.particleSpeed;
        
        const particle = element.querySelector('.quantum-particle');
        
        if (particle) {
            particle.style.transform = `translateX(${animation.particleX}px)`;
            
            // Quantum tunneling effect
            if (animation.particleX > -10 && animation.particleX < 10) {
                particle.style.opacity = '0.3';
            } else {
                particle.style.opacity = '1';
            }
        }
        
        if (animation.particleX > 40) {
            animation.particleX = -40;
        }
        
        requestAnimationFrame(() => this.animateQuantumTunneling(animation));
    }
    
    /**
     * Initialize CMB animation
     */
    initCMB(element, options = {}) {
        const config = {
            patternSize: 20,
            noiseLevel: 0.1,
            rotationSpeed: 0.001,
            ...options
        };
        
        const animation = {
            element,
            config,
            angle: 0,
            isActive: true
        };
        
        this.animateCMB(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateCMB(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.angle += config.rotationSpeed;
        
        const pattern = element.querySelector('.cmb-pattern');
        
        if (pattern) {
            pattern.style.transform = `rotate(${animation.angle}rad)`;
        }
        
        requestAnimationFrame(() => this.animateCMB(animation));
    }
    
    /**
     * Initialize gravitational waves animation
     */
    initGravitationalWaves(element, options = {}) {
        const config = {
            waveCount: 3,
            waveSpeed: 2,
            amplitude: 20,
            ...options
        };
        
        const animation = {
            element,
            config,
            waves: [],
            isActive: true
        };
        
        // Create waves
        for (let i = 0; i < config.waveCount; i++) {
            animation.waves.push({
                radius: 20,
                opacity: 1,
                delay: i * 1000
            });
        }
        
        this.animateGravitationalWaves(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateGravitationalWaves(animation) {
        if (!animation.isActive) return;
        
        const { element, config, waves } = animation;
        const time = Date.now();
        
        waves.forEach((wave, index) => {
            const elapsed = time - wave.delay;
            const progress = (elapsed % 3000) / 3000;
            
            wave.radius = 20 + progress * 80;
            wave.opacity = 1 - progress;
            
            const waveEl = document.createElement('div');
            waveEl.className = 'wave-ripple';
            waveEl.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: ${wave.radius * 2}px;
                height: ${wave.radius * 2}px;
                border: 1px solid rgba(255, 255, 255, ${wave.opacity});
                border-radius: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
            `;
            
            element.appendChild(waveEl);
            
            setTimeout(() => {
                if (waveEl.parentNode) {
                    waveEl.remove();
                }
            }, 50);
        });
        
        requestAnimationFrame(() => this.animateGravitationalWaves(animation));
    }
    
    /**
     * Initialize dark matter animation
     */
    initDarkMatter(element, options = {}) {
        const config = {
            fieldStrength: 0.5,
            fieldRadius: 80,
            visibleMatterOpacity: 0.5,
            ...options
        };
        
        const animation = {
            element,
            config,
            scale: 1,
            isActive: true
        };
        
        this.animateDarkMatter(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateDarkMatter(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.scale = 1 + Math.sin(Date.now() * 0.001) * 0.2;
        
        const field = element.querySelector('.dark-matter-field');
        const matter = element.querySelector('.visible-matter');
        
        if (field) {
            field.style.transform = `scale(${animation.scale})`;
        }
        
        if (matter) {
            matter.style.opacity = config.visibleMatterOpacity;
        }
        
        requestAnimationFrame(() => this.animateDarkMatter(animation));
    }
    
    /**
     * Initialize solar wind animation
     */
    initSolarWind(element, options = {}) {
        const config = {
            particleCount: 20,
            windSpeed: 3,
            magneticField: true,
            ...options
        };
        
        const animation = {
            element,
            config,
            particles: [],
            isActive: true
        };
        
        // Create solar wind particles
        for (let i = 0; i < config.particleCount; i++) {
            animation.particles.push({
                x: -50,
                y: (Math.random() - 0.5) * 100,
                speed: config.windSpeed * (0.5 + Math.random() * 0.5),
                life: 1
            });
        }
        
        this.animateSolarWind(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateSolarWind(animation) {
        if (!animation.isActive) return;
        
        const { element, config, particles } = animation;
        
        particles.forEach(particle => {
            particle.x += particle.speed;
            particle.life -= 0.01;
            
            if (particle.life > 0 && particle.x < 150) {
                const windEl = document.createElement('div');
                windEl.className = 'solar-particle';
                windEl.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 2px;
                    height: 2px;
                    background: rgba(255, 255, 255, ${particle.life});
                    border-radius: 50%;
                    transform: translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px));
                    pointer-events: none;
                `;
                
                element.appendChild(windEl);
                
                setTimeout(() => {
                    if (windEl.parentNode) {
                        windEl.remove();
                    }
                }, 50);
            } else {
                particle.x = -50;
                particle.y = (Math.random() - 0.5) * 100;
                particle.life = 1;
            }
        });
        
        requestAnimationFrame(() => this.animateSolarWind(animation));
    }
    
    /**
     * Initialize cosmic strings animation
     */
    initCosmicStrings(element, options = {}) {
        const config = {
            stringCount: 3,
            vibrationSpeed: 0.02,
            stringLength: 60,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            isActive: true
        };
        
        this.animateCosmicStrings(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateCosmicStrings(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.time += config.vibrationSpeed;
        
        const strings = element.querySelectorAll('.string');
        
        strings.forEach((string, index) => {
            const height = config.stringLength + Math.sin(animation.time + index) * 20;
            string.style.height = `${height}px`;
            string.style.opacity = 0.5 + Math.sin(animation.time + index) * 0.5;
        });
        
        requestAnimationFrame(() => this.animateCosmicStrings(animation));
    }
    
    /**
     * Initialize Hawking radiation animation
     */
    initHawkingRadiation(element, options = {}) {
        const config = {
            radiationRate: 5,
            particleEnergy: 2,
            evaporationSpeed: 0.01,
            ...options
        };
        
        const animation = {
            element,
            config,
            particles: [],
            isActive: true
        };
        
        this.animateHawkingRadiation(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateHawkingRadiation(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        
        // Create radiation particles
        if (Math.random() < config.radiationRate * 0.01) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 30;
            
            animation.particles.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                life: 1,
                decay: 0.02
            });
        }
        
        animation.particles.forEach((particle, index) => {
            particle.life -= particle.decay;
            
            if (particle.life > 0) {
                const radEl = document.createElement('div');
                radEl.className = 'radiation-particle';
                radEl.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 2px;
                    height: 2px;
                    background: rgba(255, 255, 255, ${particle.life});
                    border-radius: 50%;
                    transform: translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px));
                    pointer-events: none;
                `;
                
                element.appendChild(radEl);
                
                setTimeout(() => {
                    if (radEl.parentNode) {
                        radEl.remove();
                    }
                }, 50);
            } else {
                animation.particles.splice(index, 1);
            }
        });
        
        requestAnimationFrame(() => this.animateHawkingRadiation(animation));
    }
    
    /**
     * Initialize cosmic inflation animation
     */
    initCosmicInflation(element, options = {}) {
        const config = {
            expansionRate: 0.1,
            fieldStrength: 0.8,
            duration: 6000,
            ...options
        };
        
        const animation = {
            element,
            config,
            startTime: Date.now(),
            isActive: true
        };
        
        this.animateCosmicInflation(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateCosmicInflation(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        const elapsed = Date.now() - animation.startTime;
        const progress = elapsed / config.duration;
        
        if (progress < 1) {
            const scale = 0.2 + progress * 1.3;
            const opacity = 1 - progress;
            
            const field = element.querySelector('.inflation-field');
            const expansion = element.querySelector('.space-expansion');
            
            if (field) {
                field.style.width = `${20 + progress * 80}px`;
                field.style.height = `${20 + progress * 80}px`;
                field.style.opacity = opacity;
            }
            
            if (expansion) {
                expansion.style.transform = `scale(${scale})`;
                expansion.style.opacity = opacity * 0.3;
            }
            
            requestAnimationFrame(() => this.animateCosmicInflation(animation));
        }
    }
    
    /**
     * Initialize multiverse animation
     */
    initMultiverse(element, options = {}) {
        const config = {
            universeCount: 3,
            bubbleSize: 40,
            expansionSpeed: 0.01,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            isActive: true
        };
        
        this.animateMultiverse(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateMultiverse(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.time += config.expansionSpeed;
        
        const bubbles = element.querySelectorAll('.universe-bubble');
        
        bubbles.forEach((bubble, index) => {
            const phase = (animation.time + index * 2.7) % 8;
            let scale, opacity;
            
            if (phase < 2.7) {
                scale = 0.5 + (phase / 2.7) * 0.5;
                opacity = 0.3 + (phase / 2.7) * 0.7;
            } else if (phase < 5.3) {
                scale = 1 + ((phase - 2.7) / 2.6) * 0.2;
                opacity = 1;
            } else {
                scale = 1.2 - ((phase - 5.3) / 2.7) * 0.7;
                opacity = 1 - ((phase - 5.3) / 2.7) * 0.3;
            }
            
            bubble.style.transform = `scale(${scale})`;
            bubble.style.opacity = opacity;
        });
        
        requestAnimationFrame(() => this.animateMultiverse(animation));
    }
    
    /**
     * Initialize neutron star animation
     */
    initNeutronStar(element, options = {}) {
        const config = {
            rotationSpeed: 0.02,
            magneticField: true,
            pulsarBeams: true,
            ...options
        };
        
        const animation = {
            element,
            config,
            angle: 0,
            isActive: true
        };
        
        this.animateNeutronStar(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateNeutronStar(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.angle += config.rotationSpeed;
        
        const core = element.querySelector('.star-core');
        const magneticField = element.querySelector('.magnetic-field');
        const pulsarBeams = element.querySelector('.pulsar-beams');
        
        if (core) {
            core.style.transform = `rotate(${animation.angle}rad)`;
        }
        
        if (magneticField) {
            magneticField.style.transform = `rotate(${-animation.angle * 0.5}rad)`;
        }
        
        if (pulsarBeams) {
            pulsarBeams.style.transform = `rotate(${animation.angle * 2}rad)`;
        }
        
        requestAnimationFrame(() => this.animateNeutronStar(animation));
    }
    
    /**
     * Initialize quasar animation
     */
    initQuasar(element, options = {}) {
        const config = {
            accretionDiskSpeed: 0.03,
            jetStreamIntensity: 0.8,
            energyBurstRate: 0.1,
            ...options
        };
        
        const animation = {
            element,
            config,
            angle: 0,
            isActive: true
        };
        
        this.animateQuasar(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateQuasar(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.angle += config.accretionDiskSpeed;
        
        const accretionDisk = element.querySelector('.accretion-disk-intense');
        const jetStream = element.querySelector('.jet-stream');
        const energyBursts = element.querySelector('.energy-bursts');
        
        if (accretionDisk) {
            accretionDisk.style.transform = `rotate(${animation.angle}rad)`;
        }
        
        if (jetStream) {
            const intensity = Math.sin(animation.angle * 4) * 0.5 + 0.5;
            jetStream.style.opacity = intensity * config.jetStreamIntensity;
        }
        
        if (energyBursts && Math.random() < config.energyBurstRate) {
            energyBursts.style.transform = `scale(${1 + Math.random() * 0.5})`;
        }
        
        requestAnimationFrame(() => this.animateQuasar(animation));
    }
    
    /**
     * Initialize dark energy animation
     */
    initDarkEnergy(element, options = {}) {
        const config = {
            expansionRate: 0.005,
            fieldStrength: 0.6,
            particleCount: 20,
            ...options
        };
        
        const animation = {
            element,
            config,
            scale: 1,
            particles: [],
            isActive: true
        };
        
        // Create energy particles
        for (let i = 0; i < config.particleCount; i++) {
            animation.particles.push({
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 100,
                life: Math.random(),
                decay: 0.002
            });
        }
        
        this.animateDarkEnergy(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateDarkEnergy(animation) {
        if (!animation.isActive) return;
        
        const { element, config, particles } = animation;
        animation.scale += config.expansionRate;
        
        const spaceFabric = element.querySelector('.space-fabric');
        const expansionField = element.querySelector('.expansion-field');
        
        if (spaceFabric) {
            spaceFabric.style.transform = `scale(${animation.scale})`;
            spaceFabric.style.opacity = Math.max(0, 1 - animation.scale * 0.5);
        }
        
        if (expansionField) {
            expansionField.style.transform = `scale(${1 + Math.sin(Date.now() * 0.001) * 0.2})`;
        }
        
        particles.forEach(particle => {
            particle.life -= particle.decay;
            
            if (particle.life > 0) {
                const particleEl = document.createElement('div');
                particleEl.className = 'energy-particle';
                particleEl.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 2px;
                    height: 2px;
                    background: rgba(255, 255, 255, ${particle.life});
                    border-radius: 50%;
                    transform: translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px));
                    pointer-events: none;
                `;
                
                element.appendChild(particleEl);
                
                setTimeout(() => {
                    if (particleEl.parentNode) {
                        particleEl.remove();
                    }
                }, 50);
            } else {
                particle.life = 1;
                particle.x = (Math.random() - 0.5) * 100;
                particle.y = (Math.random() - 0.5) * 100;
            }
        });
        
        requestAnimationFrame(() => this.animateDarkEnergy(animation));
    }
    
    /**
     * Initialize cosmic microwave background animation
     */
    initCosmicMicrowave(element, options = {}) {
        const config = {
            patternSpeed: 0.001,
            temperatureVariations: true,
            noiseLevel: 0.1,
            ...options
        };
        
        const animation = {
            element,
            config,
            angle: 0,
            isActive: true
        };
        
        this.animateCosmicMicrowave(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateCosmicMicrowave(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.angle += config.patternSpeed;
        
        const radiationPattern = element.querySelector('.radiation-pattern');
        const temperatureVariations = element.querySelector('.temperature-variations');
        const backgroundNoise = element.querySelector('.background-noise');
        
        if (radiationPattern) {
            radiationPattern.style.transform = `rotate(${animation.angle}rad)`;
        }
        
        if (temperatureVariations) {
            const variation = Math.sin(animation.angle * 2) * 0.3 + 0.7;
            temperatureVariations.style.opacity = variation;
        }
        
        if (backgroundNoise) {
            const noise = Math.sin(animation.angle * 3) * 0.2 + 0.3;
            backgroundNoise.style.opacity = noise;
        }
        
        requestAnimationFrame(() => this.animateCosmicMicrowave(animation));
    }
    
    /**
     * Initialize gravitational lensing animation
     */
    initGravitationalLensing(element, options = {}) {
        const config = {
            lensMass: 0.8,
            lightRayCount: 5,
            distortionStrength: 0.5,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            isActive: true
        };
        
        this.animateGravitationalLensing(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateGravitationalLensing(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.time += 0.02;
        
        const lensMass = element.querySelector('.lens-mass');
        const lightRays = element.querySelector('.light-rays');
        const distortedImage = element.querySelector('.distorted-image');
        
        if (lensMass) {
            const massEffect = Math.sin(animation.time) * 0.2 + 1;
            lensMass.style.transform = `scale(${massEffect})`;
        }
        
        if (lightRays) {
            const bendAngle = Math.sin(animation.time) * 15;
            lightRays.style.transform = `rotate(${bendAngle}deg)`;
        }
        
        if (distortedImage) {
            const distortion = Math.sin(animation.time * 2) * 0.3 + 1;
            distortedImage.style.transform = `scale(${distortion})`;
        }
        
        requestAnimationFrame(() => this.animateGravitationalLensing(animation));
    }
    
    /**
     * Initialize spacetime curvature animation
     */
    initSpacetimeCurvature(element, options = {}) {
        const config = {
            massStrength: 0.6,
            fabricGridSize: 20,
            curvatureWaves: true,
            ...options
        };
        
        const animation = {
            element,
            config,
            scale: 1,
            isActive: true
        };
        
        this.animateSpacetimeCurvature(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateSpacetimeCurvature(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.scale = 1 + Math.sin(Date.now() * 0.001) * 0.2;
        
        const fabricGrid = element.querySelector('.fabric-grid');
        const massObject = element.querySelector('.mass-object');
        const curvatureWaves = element.querySelector('.curvature-waves');
        
        if (fabricGrid) {
            fabricGrid.style.transform = `scale(${animation.scale})`;
        }
        
        if (massObject) {
            const gravityEffect = Math.sin(Date.now() * 0.002) * 0.4 + 1;
            massObject.style.transform = `scale(${gravityEffect})`;
        }
        
        if (curvatureWaves) {
            const waveEffect = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
            curvatureWaves.style.transform = `scale(${waveEffect})`;
        }
        
        requestAnimationFrame(() => this.animateSpacetimeCurvature(animation));
    }
    
    /**
     * Initialize quantum entanglement animation
     */
    initQuantumEntanglement(element, options = {}) {
        const config = {
            entanglementStrength: 0.8,
            particleSpinSpeed: 0.02,
            fieldRadius: 30,
            ...options
        };
        
        const animation = {
            element,
            config,
            angle: 0,
            isActive: true
        };
        
        this.animateQuantumEntanglement(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateQuantumEntanglement(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.angle += config.particleSpinSpeed;
        
        const particleA = element.querySelector('.particle-a');
        const particleB = element.querySelector('.particle-b');
        const entanglementField = element.querySelector('.entanglement-field');
        
        if (particleA) {
            particleA.style.transform = `rotate(${animation.angle}rad)`;
        }
        
        if (particleB) {
            particleB.style.transform = `rotate(${-animation.angle}rad)`;
        }
        
        if (entanglementField) {
            const fieldEffect = Math.sin(animation.angle * 2) * 0.3 + 0.7;
            entanglementField.style.transform = `scale(${fieldEffect})`;
        }
        
        requestAnimationFrame(() => this.animateQuantumEntanglement(animation));
    }
    
    /**
     * Initialize cosmic ray burst animation
     */
    initCosmicRayBurst(element, options = {}) {
        const config = {
            burstRate: 0.1,
            rayCount: 8,
            energyWaveSpeed: 0.02,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            isActive: true
        };
        
        this.animateCosmicRayBurst(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateCosmicRayBurst(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.time += config.energyWaveSpeed;
        
        const burstSource = element.querySelector('.burst-source');
        const rayShower = element.querySelector('.ray-shower');
        const energyWave = element.querySelector('.energy-wave');
        
        if (burstSource && Math.random() < config.burstRate) {
            burstSource.style.transform = `scale(${1 + Math.random() * 2})`;
        }
        
        if (rayShower) {
            rayShower.style.transform = `rotate(${animation.time * 50}deg)`;
        }
        
        if (energyWave) {
            const waveScale = 1 + Math.sin(animation.time * 3) * 0.5;
            energyWave.style.transform = `scale(${waveScale})`;
        }
        
        requestAnimationFrame(() => this.animateCosmicRayBurst(animation));
    }
    
    /**
     * Initialize solar flare animation
     */
    initSolarFlare(element, options = {}) {
        const config = {
            flareIntensity: 0.7,
            plasmaArcCount: 4,
            eruptionSpeed: 0.03,
            ...options
        };
        
        const animation = {
            element,
            config,
            scale: 1,
            isActive: true
        };
        
        this.animateSolarFlare(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateSolarFlare(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.scale = 1 + Math.sin(Date.now() * 0.001) * 0.2;
        
        const sunSurface = element.querySelector('.sun-surface');
        const flareEruption = element.querySelector('.flare-eruption');
        const plasmaArcs = element.querySelector('.plasma-arcs');
        
        if (sunSurface) {
            sunSurface.style.transform = `scale(${animation.scale})`;
        }
        
        if (flareEruption && Math.random() < config.flareIntensity * 0.1) {
            flareEruption.style.transform = `scale(${1 + Math.random() * 1.5})`;
        }
        
        if (plasmaArcs) {
            plasmaArcs.style.transform = `rotate(${Date.now() * 0.01}deg)`;
        }
        
        requestAnimationFrame(() => this.animateSolarFlare(animation));
    }
    
    /**
     * Initialize asteroid impact animation
     */
    initAsteroidImpact(element, options = {}) {
        const config = {
            impactForce: 0.8,
            debrisCount: 10,
            craterSize: 0.6,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            isActive: true
        };
        
        this.animateAsteroidImpact(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateAsteroidImpact(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.time += 0.02;
        
        const asteroidBody = element.querySelector('.asteroid-body');
        const impactCrater = element.querySelector('.impact-crater');
        const debrisField = element.querySelector('.debris-field');
        
        if (asteroidBody) {
            const fallProgress = Math.min(1, animation.time / 2);
            asteroidBody.style.top = `${fallProgress * 60}px`;
            asteroidBody.style.transform = `rotate(${fallProgress * 720}deg)`;
        }
        
        if (impactCrater && animation.time > 1.5) {
            const craterProgress = Math.min(1, (animation.time - 1.5) / 1);
            impactCrater.style.transform = `scale(${craterProgress})`;
        }
        
        if (debrisField && animation.time > 2) {
            debrisField.style.transform = `scale(${1 + Math.sin(animation.time * 5) * 0.2})`;
        }
        
        if (animation.time < 4) {
            requestAnimationFrame(() => this.animateAsteroidImpact(animation));
        }
    }
    
    /**
     * Initialize spiral galaxy animation
     */
    initSpiralGalaxy(element, options = {}) {
        const config = {
            rotationSpeed: 0.005,
            starCount: 50,
            armCount: 3,
            coreIntensity: 0.8,
            ...options
        };
        
        const animation = {
            element,
            config,
            angle: 0,
            stars: [],
            isActive: true
        };
        
        // Create dynamic stars
        for (let i = 0; i < config.starCount; i++) {
            animation.stars.push({
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 100,
                size: Math.random() * 2 + 1,
                brightness: Math.random() * 0.5 + 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }
        
        this.animateSpiralGalaxy(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateSpiralGalaxy(animation) {
        if (!animation.isActive) return;
        
        const { element, config, stars } = animation;
        animation.angle += config.rotationSpeed;
        
        const core = element.querySelector('.galaxy-core');
        const spiralArms = element.querySelectorAll('.spiral-arm');
        
        if (core) {
            const corePulse = Math.sin(animation.angle * 2) * 0.2 + 1;
            core.style.transform = `scale(${corePulse})`;
        }
        
        spiralArms.forEach((arm, index) => {
            const armRotation = animation.angle + (index * Math.PI * 2 / config.armCount);
            arm.style.transform = `rotate(${armRotation}rad) scale(${1 + Math.sin(animation.angle * 3) * 0.1})`;
        });
        
        // Animate dynamic stars
        stars.forEach(star => {
            star.phase += 0.01;
            const distance = Math.sqrt(star.x * star.x + star.y * star.y);
            const orbitalSpeed = 1 / (distance + 10);
            
            const newX = star.x * Math.cos(orbitalSpeed) - star.y * Math.sin(orbitalSpeed);
            const newY = star.x * Math.sin(orbitalSpeed) + star.y * Math.cos(orbitalSpeed);
            
            star.x = newX;
            star.y = newY;
            
            // Create star element
            const starEl = document.createElement('div');
            starEl.className = 'dynamic-star';
            starEl.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: ${star.size}px;
                height: ${star.size}px;
                background: rgba(255, 255, 255, ${star.brightness});
                border-radius: 50%;
                transform: translate(calc(-50% + ${star.x}px), calc(-50% + ${star.y}px));
                pointer-events: none;
                z-index: 5;
            `;
            
            element.appendChild(starEl);
            
            setTimeout(() => {
                if (starEl.parentNode) {
                    starEl.remove();
                }
            }, 50);
        });
        
        requestAnimationFrame(() => this.animateSpiralGalaxy(animation));
    }
    
    /**
     * Initialize cosmic vortex animation
     */
    initCosmicVortex(element, options = {}) {
        const config = {
            vortexSpeed: 0.02,
            particleCount: 30,
            energyIntensity: 0.7,
            distortionStrength: 0.5,
            ...options
        };
        
        const animation = {
            element,
            config,
            angle: 0,
            particles: [],
            isActive: true
        };
        
        // Create energy particles
        for (let i = 0; i < config.particleCount; i++) {
            animation.particles.push({
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 100,
                life: Math.random(),
                decay: 0.003,
                energy: Math.random() * 0.5 + 0.5
            });
        }
        
        this.animateCosmicVortex(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateCosmicVortex(animation) {
        if (!animation.isActive) return;
        
        const { element, config, particles } = animation;
        animation.angle += config.vortexSpeed;
        
        const core = element.querySelector('.vortex-core');
        const energyRings = element.querySelector('.energy-rings');
        
        if (core) {
            core.style.transform = `rotate(${animation.angle * 2}rad) scale(${1 + Math.sin(animation.angle * 4) * 0.2})`;
        }
        
        if (energyRings) {
            energyRings.style.transform = `rotate(${-animation.angle}rad) scale(${1 + Math.sin(animation.angle * 2) * 0.3})`;
        }
        
        // Animate energy particles
        particles.forEach(particle => {
            particle.life -= particle.decay;
            
            if (particle.life > 0) {
                // Spiral motion towards center
                const distance = Math.sqrt(particle.x * particle.x + particle.y * particle.y);
                const angle = Math.atan2(particle.y, particle.x) + config.vortexSpeed * 2;
                const newDistance = distance - 0.5;
                
                particle.x = newDistance * Math.cos(angle);
                particle.y = newDistance * Math.sin(angle);
                
                const particleEl = document.createElement('div');
                particleEl.className = 'vortex-particle';
                particleEl.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 2px;
                    height: 2px;
                    background: rgba(0, 255, 255, ${particle.life * particle.energy});
                    border-radius: 50%;
                    transform: translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px));
                    pointer-events: none;
                    z-index: 5;
                `;
                
                element.appendChild(particleEl);
                
                setTimeout(() => {
                    if (particleEl.parentNode) {
                        particleEl.remove();
                    }
                }, 50);
            } else {
                // Reset particle
                particle.life = 1;
                particle.x = (Math.random() - 0.5) * 100;
                particle.y = (Math.random() - 0.5) * 100;
                particle.energy = Math.random() * 0.5 + 0.5;
            }
        });
        
        requestAnimationFrame(() => this.animateCosmicVortex(animation));
    }
    
    /**
     * Initialize stellar nursery animation
     */
    initStellarNursery(element, options = {}) {
        const config = {
            protostarCount: 5,
            nebulaDensity: 0.6,
            windSpeed: 0.01,
            birthRate: 0.1,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            protostars: [],
            isActive: true
        };
        
        // Create protostars
        for (let i = 0; i < config.protostarCount; i++) {
            animation.protostars.push({
                x: Math.random() * 80 + 10,
                y: Math.random() * 80 + 10,
                size: Math.random() * 0.5 + 0.5,
                age: Math.random(),
                growthRate: Math.random() * 0.02 + 0.01
            });
        }
        
        this.animateStellarNursery(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateStellarNursery(animation) {
        if (!animation.isActive) return;
        
        const { element, config, protostars } = animation;
        animation.time += 0.02;
        
        const nebulaCloud = element.querySelector('.nebula-cloud');
        const stellarWinds = element.querySelector('.stellar-winds');
        
        if (nebulaCloud) {
            nebulaCloud.style.transform = `rotate(${animation.time * 0.5}rad) scale(${1 + Math.sin(animation.time) * 0.2})`;
        }
        
        if (stellarWinds) {
            stellarWinds.style.transform = `rotate(${animation.time * 2}rad) scale(${1 + Math.sin(animation.time * 3) * 0.1})`;
        }
        
        // Animate protostars
        protostars.forEach(protostar => {
            protostar.age += protostar.growthRate;
            
            if (protostar.age < 1) {
                const size = protostar.size * (1 + protostar.age);
                const brightness = protostar.age;
                
                const protostarEl = document.createElement('div');
                protostarEl.className = 'dynamic-protostar';
                protostarEl.style.cssText = `
                    position: absolute;
                    top: ${protostar.y}px;
                    left: ${protostar.x}px;
                    width: ${size * 8}px;
                    height: ${size * 8}px;
                    background: radial-gradient(circle, rgba(255,255,255,${brightness}), rgba(255,255,0,${brightness * 0.5}), transparent);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                    z-index: 5;
                `;
                
                element.appendChild(protostarEl);
                
                setTimeout(() => {
                    if (protostarEl.parentNode) {
                        protostarEl.remove();
                    }
                }, 100);
            } else {
                // Reset protostar
                protostar.age = 0;
                protostar.x = Math.random() * 80 + 10;
                protostar.y = Math.random() * 80 + 10;
                protostar.size = Math.random() * 0.5 + 0.5;
            }
        });
        
        requestAnimationFrame(() => this.animateStellarNursery(animation));
    }
    
    /**
     * Initialize quantum field animation
     */
    initQuantumField(element, options = {}) {
        const config = {
            fieldStrength: 0.8,
            fluctuationRate: 0.02,
            virtualParticleCount: 20,
            probabilityWaves: true,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            particles: [],
            isActive: true
        };
        
        // Create virtual particles
        for (let i = 0; i < config.virtualParticleCount; i++) {
            animation.particles.push({
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 100,
                life: Math.random(),
                decay: 0.005,
                spin: Math.random() * Math.PI * 2
            });
        }
        
        this.animateQuantumField(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateQuantumField(animation) {
        if (!animation.isActive) return;
        
        const { element, config, particles } = animation;
        animation.time += config.fluctuationRate;
        
        const fieldGrid = element.querySelector('.field-grid');
        const quantumFluctuations = element.querySelector('.quantum-fluctuations');
        
        if (fieldGrid) {
            const fluctuation = Math.sin(animation.time * 3) * 0.2 + 1;
            fieldGrid.style.transform = `scale(${fluctuation})`;
        }
        
        if (quantumFluctuations) {
            const wave = Math.sin(animation.time * 2) * 0.3 + 0.7;
            quantumFluctuations.style.opacity = wave;
        }
        
        // Animate virtual particles
        particles.forEach(particle => {
            particle.life -= particle.decay;
            particle.spin += 0.1;
            
            if (particle.life > 0) {
                const particleEl = document.createElement('div');
                particleEl.className = 'virtual-particle';
                particleEl.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 2px;
                    height: 2px;
                    background: rgba(0, 255, 255, ${particle.life});
                    border-radius: 50%;
                    transform: translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px)) rotate(${particle.spin}rad);
                    pointer-events: none;
                    z-index: 5;
                `;
                
                element.appendChild(particleEl);
                
                setTimeout(() => {
                    if (particleEl.parentNode) {
                        particleEl.remove();
                    }
                }, 50);
            } else {
                // Reset particle
                particle.life = 1;
                particle.x = (Math.random() - 0.5) * 100;
                particle.y = (Math.random() - 0.5) * 100;
                particle.spin = Math.random() * Math.PI * 2;
            }
        });
        
        requestAnimationFrame(() => this.animateQuantumField(animation));
    }
    
    /**
     * Initialize dark matter web animation
     */
    initDarkMatterWeb(element, options = {}) {
        const config = {
            nodeCount: 8,
            filamentCount: 12,
            webStrength: 0.6,
            voidRegions: true,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            nodes: [],
            filaments: [],
            isActive: true
        };
        
        // Create dark matter nodes
        for (let i = 0; i < config.nodeCount; i++) {
            animation.nodes.push({
                x: Math.random() * 80 + 10,
                y: Math.random() * 80 + 10,
                mass: Math.random() * 0.5 + 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }
        
        // Create cosmic filaments
        for (let i = 0; i < config.filamentCount; i++) {
            animation.filaments.push({
                startX: Math.random() * 100,
                startY: Math.random() * 100,
                endX: Math.random() * 100,
                endY: Math.random() * 100,
                strength: Math.random() * 0.3 + 0.2
            });
        }
        
        this.animateDarkMatterWeb(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateDarkMatterWeb(animation) {
        if (!animation.isActive) return;
        
        const { element, config, nodes, filaments } = animation;
        animation.time += 0.01;
        
        const webStructure = element.querySelector('.web-structure');
        const gravitationalLines = element.querySelector('.gravitational-lines');
        
        if (webStructure) {
            const pulse = Math.sin(animation.time * 2) * 0.2 + 1;
            webStructure.style.transform = `scale(${pulse})`;
        }
        
        if (gravitationalLines) {
            gravitationalLines.style.transform = `rotate(${animation.time * 0.5}rad) scale(${1 + Math.sin(animation.time * 3) * 0.1})`;
        }
        
        // Animate dark matter nodes
        nodes.forEach(node => {
            node.phase += 0.02;
            const glow = Math.sin(node.phase) * 0.3 + 0.7;
            
            const nodeEl = document.createElement('div');
            nodeEl.className = 'dark-matter-node';
            nodeEl.style.cssText = `
                position: absolute;
                top: ${node.y}px;
                left: ${node.x}px;
                width: ${node.mass * 6}px;
                height: ${node.mass * 6}px;
                background: radial-gradient(circle, rgba(128,0,255,${glow}), rgba(64,0,128,${glow * 0.5}));
                border-radius: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 5;
            `;
            
            element.appendChild(nodeEl);
            
            setTimeout(() => {
                if (nodeEl.parentNode) {
                    nodeEl.remove();
                }
            }, 100);
        });
        
        // Animate cosmic filaments
        filaments.forEach(filament => {
            const filamentEl = document.createElement('div');
            filamentEl.className = 'cosmic-filament';
            const length = Math.sqrt((filament.endX - filament.startX) ** 2 + (filament.endY - filament.startY) ** 2);
            const angle = Math.atan2(filament.endY - filament.startY, filament.endX - filament.startX);
            
            filamentEl.style.cssText = `
                position: absolute;
                top: ${filament.startY}px;
                left: ${filament.startX}px;
                width: ${length}px;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(128,0,255,${filament.strength}), transparent);
                transform: translate(-50%, -50%) rotate(${angle}rad);
                pointer-events: none;
                z-index: 3;
            `;
            
            element.appendChild(filamentEl);
            
            setTimeout(() => {
                if (filamentEl.parentNode) {
                    filamentEl.remove();
                }
            }, 100);
        });
        
        requestAnimationFrame(() => this.animateDarkMatterWeb(animation));
    }
    
    /**
     * Initialize neutron star collision animation
     */
    initNeutronStarCollision(element, options = {}) {
        const config = {
            collisionSpeed: 0.01,
            gravitationalWaveIntensity: 0.8,
            kilonovaBrightness: 0.7,
            debrisCount: 40,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            debris: [],
            isActive: true
        };
        
        // Create collision debris
        for (let i = 0; i < config.debrisCount; i++) {
            animation.debris.push({
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 100,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 1,
                decay: 0.01
            });
        }
        
        this.animateNeutronStarCollision(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateNeutronStarCollision(animation) {
        if (!animation.isActive) return;
        
        const { element, config, debris } = animation;
        animation.time += config.collisionSpeed;
        
        const starA = element.querySelector('.star-a');
        const starB = element.querySelector('.star-b');
        const collisionWave = element.querySelector('.collision-wave');
        
        if (starA && starB) {
            const collisionProgress = Math.min(1, animation.time / 2);
            const separation = 40 * (1 - collisionProgress);
            
            starA.style.transform = `translateX(${-separation}px) scale(${1 + collisionProgress * 0.5})`;
            starB.style.transform = `translateX(${separation}px) scale(${1 + collisionProgress * 0.5})`;
        }
        
        if (collisionWave && animation.time > 1) {
            const waveProgress = (animation.time - 1) / 2;
            collisionWave.style.transform = `scale(${0.3 + waveProgress * 1.7})`;
            collisionWave.style.opacity = 1 - waveProgress;
        }
        
        // Animate collision debris
        if (animation.time > 1.5) {
            debris.forEach(debrisPiece => {
                debrisPiece.life -= debrisPiece.decay;
                
                if (debrisPiece.life > 0) {
                    debrisPiece.x += debrisPiece.vx;
                    debrisPiece.y += debrisPiece.vy;
                    
                    const debrisEl = document.createElement('div');
                    debrisEl.className = 'collision-debris';
                    debrisEl.style.cssText = `
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 2px;
                        height: 2px;
                        background: rgba(255, 102, 0, ${debrisPiece.life});
                        border-radius: 50%;
                        transform: translate(calc(-50% + ${debrisPiece.x}px), calc(-50% + ${debrisPiece.y}px));
                        pointer-events: none;
                        z-index: 5;
                    `;
                    
                    element.appendChild(debrisEl);
                    
                    setTimeout(() => {
                        if (debrisEl.parentNode) {
                            debrisEl.remove();
                        }
                    }, 50);
                }
            });
        }
        
        if (animation.time < 6) {
            requestAnimationFrame(() => this.animateNeutronStarCollision(animation));
        }
    }
    
    /**
     * Initialize cosmic storm animation
     */
    initCosmicStorm(element, options = {}) {
        const config = {
            stormIntensity: 0.7,
            lightningFrequency: 0.1,
            plasmaParticleCount: 25,
            windSpeed: 0.02,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            plasma: [],
            isActive: true
        };
        
        // Create plasma particles
        for (let i = 0; i < config.plasmaParticleCount; i++) {
            animation.plasma.push({
                x: Math.random() * 100,
                y: Math.random() * 100,
                charge: Math.random() > 0.5 ? 1 : -1,
                energy: Math.random() * 0.5 + 0.5,
                life: Math.random()
            });
        }
        
        this.animateCosmicStorm(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateCosmicStorm(animation) {
        if (!animation.isActive) return;
        
        const { element, config, plasma } = animation;
        animation.time += 0.02;
        
        const stormClouds = element.querySelector('.storm-clouds');
        const lightningArcs = element.querySelector('.lightning-arcs');
        
        if (stormClouds) {
            stormClouds.style.transform = `rotate(${animation.time * 0.3}rad) scale(${1 + Math.sin(animation.time * 2) * 0.2})`;
        }
        
        if (lightningArcs && Math.random() < config.lightningFrequency) {
            lightningArcs.style.opacity = 0.4;
            setTimeout(() => {
                lightningArcs.style.opacity = 0.1;
            }, 100);
        }
        
        // Animate plasma particles
        plasma.forEach(particle => {
            particle.life -= 0.01;
            
            if (particle.life > 0) {
                // Plasma motion
                particle.x += Math.sin(animation.time + particle.energy) * 0.5;
                particle.y += Math.cos(animation.time + particle.energy) * 0.5;
                
                const plasmaEl = document.createElement('div');
                plasmaEl.className = 'plasma-particle';
                plasmaEl.style.cssText = `
                    position: absolute;
                    top: ${particle.y}px;
                    left: ${particle.x}px;
                    width: 3px;
                    height: 3px;
                    background: ${particle.charge > 0 ? 'rgba(0,255,255,0.8)' : 'rgba(255,0,255,0.8)'};
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                    z-index: 5;
                `;
                
                element.appendChild(plasmaEl);
                
                setTimeout(() => {
                    if (plasmaEl.parentNode) {
                        plasmaEl.remove();
                    }
                }, 100);
            } else {
                // Reset particle
                particle.life = 1;
                particle.x = Math.random() * 100;
                particle.y = Math.random() * 100;
                particle.charge = Math.random() > 0.5 ? 1 : -1;
                particle.energy = Math.random() * 0.5 + 0.5;
            }
        });
        
        requestAnimationFrame(() => this.animateCosmicStorm(animation));
    }
    
    /**
     * Initialize interstellar travel animation
     */
    initInterstellarTravel(element, options = {}) {
        const config = {
            warpSpeed: 0.03,
            starTrailCount: 15,
            spaceDistortion: 0.6,
            destinationDistance: 100,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            starTrails: [],
            isActive: true
        };
        
        // Create star trails
        for (let i = 0; i < config.starTrailCount; i++) {
            animation.starTrails.push({
                x: Math.random() * 100,
                y: Math.random() * 100,
                length: Math.random() * 30 + 10,
                speed: Math.random() * 0.02 + 0.01,
                brightness: Math.random() * 0.5 + 0.5
            });
        }
        
        this.animateInterstellarTravel(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateInterstellarTravel(animation) {
        if (!animation.isActive) return;
        
        const { element, config, starTrails } = animation;
        animation.time += config.warpSpeed;
        
        const starship = element.querySelector('.starship');
        const warpField = element.querySelector('.warp-field');
        
        if (starship) {
            const travelProgress = (Math.sin(animation.time) + 1) / 2;
            starship.style.transform = `translateX(${-40 + travelProgress * 80}px) scale(${1 + Math.sin(animation.time * 2) * 0.5})`;
        }
        
        if (warpField) {
            const distortion = Math.sin(animation.time * 3) * 0.3 + 1;
            warpField.style.transform = `scale(${distortion}) rotate(${animation.time * 0.5}rad)`;
        }
        
        // Animate star trails
        starTrails.forEach(trail => {
            trail.x -= trail.speed;
            
            if (trail.x < -20) {
                trail.x = 120;
            }
            
            const trailEl = document.createElement('div');
            trailEl.className = 'star-trail';
            trailEl.style.cssText = `
                position: absolute;
                top: ${trail.y}px;
                left: ${trail.x}px;
                width: ${trail.length}px;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,${trail.brightness}), transparent);
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 5;
            `;
            
            element.appendChild(trailEl);
            
            setTimeout(() => {
                if (trailEl.parentNode) {
                    trailEl.remove();
                }
            }, 100);
        });
        
        requestAnimationFrame(() => this.animateInterstellarTravel(animation));
    }
    
    /**
     * Initialize black hole merger animation
     */
    initBlackHoleMerger(element, options = {}) {
        const config = {
            mergerSpeed: 0.008,
            gravitationalWaveStrength: 0.9,
            eventHorizonDistortion: 0.7,
            finalSingularitySize: 0.8,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            isActive: true
        };
        
        this.animateBlackHoleMerger(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateBlackHoleMerger(animation) {
        if (!animation.isActive) return;
        
        const { element, config } = animation;
        animation.time += config.mergerSpeed;
        
        const blackHole1 = element.querySelector('.black-hole-1');
        const blackHole2 = element.querySelector('.black-hole-2');
        const mergerRing = element.querySelector('.merger-ring');
        const finalSingularity = element.querySelector('.final-singularity');
        
        if (blackHole1 && blackHole2) {
            const mergerProgress = Math.min(1, animation.time / 3);
            const separation = 25 * (1 - mergerProgress);
            
            blackHole1.style.transform = `translateX(${-separation}px) scale(${1 + mergerProgress * 0.2})`;
            blackHole2.style.transform = `translateX(${separation}px) scale(${1 + mergerProgress * 0.2})`;
        }
        
        if (mergerRing) {
            mergerRing.style.transform = `rotate(${animation.time * 2}rad) scale(${1 + Math.sin(animation.time * 4) * 0.1})`;
        }
        
        if (finalSingularity && animation.time > 5) {
            const formationProgress = (animation.time - 5) / 3;
            finalSingularity.style.transform = `scale(${formationProgress})`;
            finalSingularity.style.opacity = formationProgress;
        }
        
        if (animation.time < 10) {
            requestAnimationFrame(() => this.animateBlackHoleMerger(animation));
        }
    }
    
    /**
     * Initialize cosmic symphony animation
     */
    initCosmicSymphony(element, options = {}) {
        const config = {
            harmonicCount: 8,
            resonanceFrequency: 0.02,
            particleCount: 35,
            waveAmplitude: 0.6,
            ...options
        };
        
        const animation = {
            element,
            config,
            time: 0,
            harmonics: [],
            particles: [],
            isActive: true
        };
        
        // Create harmonic waves
        for (let i = 0; i < config.harmonicCount; i++) {
            animation.harmonics.push({
                frequency: (i + 1) * 0.5,
                amplitude: Math.random() * 0.3 + 0.2,
                phase: Math.random() * Math.PI * 2,
                color: `hsl(${i * 45}, 70%, 60%)`
            });
        }
        
        // Create resonant particles
        for (let i = 0; i < config.particleCount; i++) {
            animation.particles.push({
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 100,
                resonance: Math.random() * 0.5 + 0.5,
                energy: Math.random() * 0.5 + 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }
        
        this.animateCosmicSymphony(animation);
        this.animationFrames.set(element, animation);
    }
    
    animateCosmicSymphony(animation) {
        if (!animation.isActive) return;
        
        const { element, config, harmonics, particles } = animation;
        animation.time += config.resonanceFrequency;
        
        const harmonicWaves = element.querySelector('.harmonic-waves');
        const cosmicStrings = element.querySelector('.cosmic-strings-vibrating');
        
        if (harmonicWaves) {
            const resonance = Math.sin(animation.time * 2) * 0.2 + 1;
            harmonicWaves.style.transform = `rotate(${animation.time}rad) scale(${resonance})`;
        }
        
        if (cosmicStrings) {
            const vibration = Math.sin(animation.time * 5) * 0.3 + 1;
            cosmicStrings.style.transform = `scale(${vibration})`;
        }
        
        // Animate harmonic waves
        harmonics.forEach((harmonic, index) => {
            const waveEl = document.createElement('div');
            waveEl.className = 'harmonic-wave';
            const amplitude = harmonic.amplitude * Math.sin(animation.time * harmonic.frequency + harmonic.phase);
            
            waveEl.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 80px;
                height: 2px;
                background: ${harmonic.color};
                border-radius: 1px;
                transform: translate(-50%, -50%) rotate(${index * 45}deg) scaleY(${amplitude});
                opacity: 0.3;
                pointer-events: none;
                z-index: 5;
            `;
            
            element.appendChild(waveEl);
            
            setTimeout(() => {
                if (waveEl.parentNode) {
                    waveEl.remove();
                }
            }, 100);
        });
        
        // Animate resonant particles
        particles.forEach(particle => {
            particle.phase += particle.resonance * 0.02;
            const energy = particle.energy * Math.sin(animation.time * 3 + particle.phase);
            
            const particleEl = document.createElement('div');
            particleEl.className = 'resonant-particle';
            particleEl.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 3px;
                height: 3px;
                background: rgba(255, 255, 255, ${energy});
                border-radius: 50%;
                transform: translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px)) scale(${1 + energy * 0.5});
                pointer-events: none;
                z-index: 5;
            `;
            
            element.appendChild(particleEl);
            
            setTimeout(() => {
                if (particleEl.parentNode) {
                    particleEl.remove();
                }
            }, 100);
        });
        
        requestAnimationFrame(() => this.animateCosmicSymphony(animation));
    }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GalaxyAnimations, PhysicsEngine };
} 