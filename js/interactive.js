/**
 * GalaxyJS - Interactive Features
 * Advanced interactive cosmic effects and simulations
 */

class GalaxyInteractive {
    constructor(galaxy) {
        this.galaxy = galaxy;
        this.mouseTrail = null;
        this.particleSystem = null;
        this.gravitySimulation = null;
        this.interactiveElements = new Map();
        this.isActive = false;
    }
    
    /**
     * Initialize all interactive features
     */
    init() {
        this.initMouseTrailDemo();
        this.initParticleDemo();
        this.initGravityDemo();
        this.initScrollEffects();
        this.initKeyboardControls();
        this.isActive = true;
    }
    
    /**
     * Initialize Mouse Trail Demo
     */
    initMouseTrailDemo() {
        const demoArea = document.getElementById('mouse-trail-demo');
        if (!demoArea) return;
        
        // Show better instructions
        const instructions = demoArea.querySelector('.trail-instructions');
        if (instructions) {
            instructions.textContent = 'Move your mouse over this area to see the cosmic trail';
            instructions.style.color = '#ffffff';
            instructions.style.textAlign = 'center';
            instructions.style.padding = '20px';
        }
        
        // Set demo area to relative positioning
        demoArea.style.position = 'relative';
        demoArea.style.overflow = 'hidden';
        demoArea.style.minHeight = '300px';
        demoArea.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        demoArea.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        demoArea.style.borderRadius = '8px';
        demoArea.style.cursor = 'crosshair';
        
        // Create canvas for trail effect
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = demoArea.offsetWidth;
            canvas.height = demoArea.offsetHeight;
        };
        
        resizeCanvas();
        
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '2';
        
        demoArea.appendChild(canvas);
        
        // Handle window resize
        window.addEventListener('resize', resizeCanvas);
        
        // Trail configuration
        const trailConfig = {
            maxLength: 30,
            particleSize: 6,
            fadeRate: 0.88,
            colors: ['#ffffff', '#ffdd44', '#ff6644', '#dd44ff', '#4488ff']
        };
        
        const trail = {
            points: [],
            canvas,
            ctx,
            config: trailConfig
        };
        
        // Mouse tracking
        demoArea.addEventListener('mousemove', (e) => {
            const rect = demoArea.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Hide instructions when mouse starts moving
            if (instructions) {
                instructions.style.display = 'none';
            }
            
            trail.points.push({
                x,
                y,
                life: 1,
                timestamp: Date.now()
            });
            
            if (trail.points.length > trailConfig.maxLength) {
                trail.points.shift();
            }
        });
        
        // Animation loop
        const animateTrail = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            trail.points.forEach((point, index) => {
                point.life *= trailConfig.fadeRate;
                
                if (point.life > 0.01) {
                    const size = trailConfig.particleSize * point.life;
                    const colorIndex = Math.floor((1 - point.life) * trailConfig.colors.length);
                    const color = trailConfig.colors[Math.min(colorIndex, trailConfig.colors.length - 1)];
                    
                    ctx.fillStyle = color;
                    ctx.globalAlpha = point.life;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = size * 2;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0; // Reset shadow
                }
            });
            
            // Remove dead points
            trail.points = trail.points.filter(point => point.life > 0.01);
            
            requestAnimationFrame(animateTrail);
        };
        
        // Start animation
        animateTrail();
        
        // Store reference
        this.mouseTrail = trail;
    }
    
    /**
     * Initialize Particle Demo
     */
    initParticleDemo() {
        const demoArea = document.getElementById('particle-demo');
        if (!demoArea) return;
        
        // Show better instructions
        const instructions = demoArea.querySelector('.particle-instructions');
        if (instructions) {
            instructions.textContent = 'Click anywhere to create cosmic particle explosions';
            instructions.style.color = '#ffffff';
            instructions.style.textAlign = 'center';
            instructions.style.padding = '20px';
        }
        
        // Set demo area styling
        demoArea.style.position = 'relative';
        demoArea.style.overflow = 'hidden';
        demoArea.style.minHeight = '300px';
        demoArea.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        demoArea.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        demoArea.style.borderRadius = '8px';
        demoArea.style.cursor = 'crosshair';
        
        // Create canvas for particle system
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = demoArea.offsetWidth;
        canvas.height = demoArea.offsetHeight;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.cursor = 'crosshair';
        
        demoArea.appendChild(canvas);
        
        // Particle system configuration
        const particleConfig = {
            maxParticles: 200,
            gravity: 0.1,
            friction: 0.98,
            bounce: 0.8,
            particleSize: 2,
            colors: ['#ffffff', '#cccccc', '#999999']
        };
        
        const particles = [];
        
        // Click to create particles
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Hide instructions when clicking
            if (instructions) {
                instructions.style.display = 'none';
            }
            
            // Create particle burst
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const velocity = 3 + Math.random() * 2;
                
                particles.push({
                    x,
                    y,
                    vx: Math.cos(angle) * velocity,
                    vy: Math.sin(angle) * velocity,
                    life: 1,
                    decay: 0.005 + Math.random() * 0.005,
                    size: particleConfig.particleSize + Math.random() * 2,
                    color: particleConfig.colors[Math.floor(Math.random() * particleConfig.colors.length)]
                });
            }
        });
        
        // Animation loop
        const animateParticles = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach((particle, index) => {
                // Apply physics
                particle.vy += particleConfig.gravity;
                particle.vx *= particleConfig.friction;
                particle.vy *= particleConfig.friction;
                
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // Bounce off walls
                if (particle.x < 0 || particle.x > canvas.width) {
                    particle.vx *= -particleConfig.bounce;
                    particle.x = Math.max(0, Math.min(canvas.width, particle.x));
                }
                
                if (particle.y < 0 || particle.y > canvas.height) {
                    particle.vy *= -particleConfig.bounce;
                    particle.y = Math.max(0, Math.min(canvas.height, particle.y));
                }
                
                // Update life
                particle.life -= particle.decay;
                
                if (particle.life > 0) {
                    ctx.fillStyle = particle.color;
                    ctx.globalAlpha = particle.life;
                    ctx.shadowColor = particle.color;
                    ctx.shadowBlur = particle.size * 2;
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            
            // Remove dead particles
            for (let i = particles.length - 1; i >= 0; i--) {
                if (particles[i].life <= 0) {
                    particles.splice(i, 1);
                }
            }
            
            // Limit particle count
            if (particles.length > particleConfig.maxParticles) {
                particles.splice(0, particles.length - particleConfig.maxParticles);
            }
            
            requestAnimationFrame(animateParticles);
        };
        
        animateParticles();
        this.particleSystem = { particles, canvas, ctx, config: particleConfig };
    }
    
    /**
     * Initialize Gravity Demo
     */
    initGravityDemo() {
        const demoArea = document.getElementById('gravity-demo');
        if (!demoArea) return;
        
        // Show better instructions
        const instructions = demoArea.querySelector('.gravity-instructions');
        if (instructions) {
            instructions.textContent = 'Click to add celestial bodies and watch gravity in action';
            instructions.style.color = '#ffffff';
            instructions.style.textAlign = 'center';
            instructions.style.padding = '20px';
        }
        
        // Set demo area styling
        demoArea.style.position = 'relative';
        demoArea.style.overflow = 'hidden';
        demoArea.style.minHeight = '300px';
        demoArea.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        demoArea.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        demoArea.style.borderRadius = '8px';
        demoArea.style.cursor = 'crosshair';
        
        // Create canvas for gravity simulation
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = demoArea.offsetWidth;
        canvas.height = demoArea.offsetHeight;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.cursor = 'crosshair';
        
        demoArea.appendChild(canvas);
        
        // Gravity simulation configuration
        const gravityConfig = {
            maxBodies: 10,
            gravity: 0.5,
            bounce: 0.8,
            friction: 0.99
        };
        
        const bodies = [];
        
        // Click to add celestial bodies
        canvas.addEventListener('click', (e) => {
            if (bodies.length >= gravityConfig.maxBodies) {
                bodies.shift(); // Remove oldest body
            }
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Hide instructions when clicking
            if (instructions) {
                instructions.style.display = 'none';
            }
            
            bodies.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                mass: Math.random() * 50 + 20,
                size: Math.random() * 15 + 10,
                color: `hsl(${Math.random() * 360}, 70%, 70%)`
            });
        });
        
        // Animation loop
        const animateGravity = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculate gravitational forces
            bodies.forEach((body, i) => {
                let fx = 0, fy = 0;
                
                bodies.forEach((other, j) => {
                    if (i !== j) {
                        const dx = other.x - body.x;
                        const dy = other.y - body.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 0 && distance < 200) {
                            const force = (gravityConfig.gravity * body.mass * other.mass) / (distance * distance);
                            fx += (dx / distance) * force;
                            fy += (dy / distance) * force;
                        }
                    }
                });
                
                // Apply forces
                body.vx += fx / body.mass * 0.1;
                body.vy += fy / body.mass * 0.1;
                
                // Apply friction
                body.vx *= gravityConfig.friction;
                body.vy *= gravityConfig.friction;
                
                // Update position
                body.x += body.vx;
                body.y += body.vy;
                
                // Bounce off walls
                if (body.x < body.size || body.x > canvas.width - body.size) {
                    body.vx *= -gravityConfig.bounce;
                    body.x = Math.max(body.size, Math.min(canvas.width - body.size, body.x));
                }
                
                if (body.y < body.size || body.y > canvas.height - body.size) {
                    body.vy *= -gravityConfig.bounce;
                    body.y = Math.max(body.size, Math.min(canvas.height - body.size, body.y));
                }
                
                // Draw body
                ctx.fillStyle = body.color;
                ctx.shadowColor = body.color;
                ctx.shadowBlur = body.size;
                ctx.beginPath();
                ctx.arc(body.x, body.y, body.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw gravitational field lines
                bodies.forEach((other, j) => {
                    if (i !== j) {
                        const dx = other.x - body.x;
                        const dy = other.y - body.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < 100 && distance > 0) {
                            const opacity = (100 - distance) / 100;
                            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(body.x, body.y);
                            ctx.lineTo(other.x, other.y);
                            ctx.stroke();
                        }
                    }
                });
            });
            
            requestAnimationFrame(animateGravity);
        };
        
        animateGravity();
        this.gravitySimulation = { bodies, canvas, ctx, config: gravityConfig };
    }
    
    /**
     * Initialize Scroll Effects
     */
    initScrollEffects() {
        // Parallax scrolling for cosmic background
        const cosmicBackground = document.querySelector('.cosmic-background');
        if (cosmicBackground) {
            window.addEventListener('scroll', () => {
                const scrolled = window.pageYOffset;
                const rate = scrolled * -0.5;
                
                const starsLayer = cosmicBackground.querySelector('.stars-layer');
                const nebulaLayer = cosmicBackground.querySelector('.nebula-layer');
                
                if (starsLayer) {
                    starsLayer.style.transform = `translateY(${rate * 0.3}px)`;
                }
                
                if (nebulaLayer) {
                    nebulaLayer.style.transform = `translateY(${rate * 0.6}px)`;
                }
            });
        }
        
        // Scroll-triggered animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    
                    // Trigger specific animations based on data attributes
                    const animationType = entry.target.dataset.animation;
                    if (animationType) {
                        this.triggerAnimation(animationType, entry.target);
                    }
                }
            });
        }, observerOptions);
        
        // Observe elements with animation attributes
        document.querySelectorAll('[data-animation]').forEach(element => {
            observer.observe(element);
        });
    }
    
    /**
     * Initialize Keyboard Controls
     */
    initKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Escape':
                    this.clearAllEffects();
                    break;
                case ' ':
                    e.preventDefault();
                    this.togglePause();
                    break;
                case 'r':
                case 'R':
                    this.resetAll();
                    break;
                case '1':
                    this.activateEffect('pulsar');
                    break;
                case '2':
                    this.activateEffect('blackhole');
                    break;
                case '3':
                    this.activateEffect('wormhole');
                    break;
            }
        });
    }
    
    /**
     * Trigger specific animation
     */
    triggerAnimation(type, element) {
        switch (type) {
            case 'pulsar':
                this.galaxy.animations.initPulsar(element, { frequency: 1 });
                break;
            case 'blackhole':
                this.galaxy.animations.initBlackHole(element);
                break;
            case 'wormhole':
                this.galaxy.animations.initWormhole(element);
                break;
            case 'supernova':
                this.galaxy.animations.initSupernova(element);
                break;
            case 'particles':
                this.galaxy.animations.createParticleSystem(element);
                break;
        }
    }
    
    /**
     * Clear all effects
     */
    clearAllEffects() {
        // Clear mouse trail
        if (this.mouseTrail) {
            this.mouseTrail.points = [];
        }
        
        // Clear particles
        if (this.particleSystem) {
            this.particleSystem.particles = [];
        }
        
        // Clear gravity bodies
        if (this.gravitySimulation) {
            this.gravitySimulation.bodies = [];
        }
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        this.isActive = !this.isActive;
        
        if (!this.isActive) {
            // Pause all animations
            this.pauseAllAnimations();
        } else {
            // Resume all animations
            this.resumeAllAnimations();
        }
    }
    
    /**
     * Reset all simulations
     */
    resetAll() {
        this.clearAllEffects();
        this.isActive = true;
        this.resumeAllAnimations();
    }
    
    /**
     * Activate specific effect
     */
    activateEffect(effectType) {
        const demoArea = document.querySelector('.demo-area');
        if (!demoArea) return;
        
        this.clearAllEffects();
        
        switch (effectType) {
            case 'pulsar':
                this.galaxy.animations.initPulsar(demoArea);
                break;
            case 'blackhole':
                this.galaxy.animations.initBlackHole(demoArea);
                break;
            case 'wormhole':
                this.galaxy.animations.initWormhole(demoArea);
                break;
        }
    }
    
    /**
     * Pause all animations
     */
    pauseAllAnimations() {
        // Implementation for pausing animations
        console.log('All animations paused');
    }
    
    /**
     * Resume all animations
     */
    resumeAllAnimations() {
        // Implementation for resuming animations
        console.log('All animations resumed');
    }
    
    /**
     * Create cosmic explosion effect
     */
    createExplosion(x, y, intensity = 1) {
        const particles = [];
        const particleCount = Math.floor(20 * intensity);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const velocity = 2 + Math.random() * 3;
            
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: 1,
                decay: 0.02 + Math.random() * 0.01,
                size: 2 + Math.random() * 3,
                color: `hsl(${Math.random() * 60 + 30}, 100%, 70%)`
            });
        }
        
        return particles;
    }
    
    /**
     * Create cosmic wave effect
     */
    createWave(x, y, radius = 50) {
        const wave = {
            x,
            y,
            radius: 0,
            maxRadius: radius,
            speed: 2,
            life: 1,
            decay: 0.02
        };
        
        return wave;
    }
    
    /**
     * Create magnetic field effect
     */
    createMagneticField(x, y, strength = 1) {
        const field = {
            x,
            y,
            strength,
            radius: 100,
            particles: []
        };
        
        // Create field particles
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const distance = 30 + Math.random() * 70;
            
            field.particles.push({
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                angle,
                distance,
                speed: 0.02 + Math.random() * 0.01
            });
        }
        
        return field;
    }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GalaxyInteractive;
} 