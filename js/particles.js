/**
 * GalaxyJS - Particle Systems
 * Advanced particle systems for cosmic effects
 */

class ParticleSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            particleCount: 100,
            gravity: 0.1,
            friction: 0.98,
            bounce: 0.8,
            particleSize: 2,
            colors: ['#ffffff', '#cccccc', '#999999'],
            ...options
        };
        
        this.particles = [];
        this.emitters = [];
        this.forces = [];
        this.isActive = true;
        
        this.init();
    }
    
    init() {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        
        this.container.appendChild(this.canvas);
        
        // Initialize particles
        this.createInitialParticles();
        
        // Start animation loop
        this.animate();
    }
    
    createInitialParticles() {
        for (let i = 0; i < this.options.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }
    
    createParticle(x = null, y = null) {
        return {
            x: x !== null ? x : Math.random() * this.canvas.width,
            y: y !== null ? y : Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: this.options.particleSize + Math.random() * 2,
            life: 1,
            decay: 0.001 + Math.random() * 0.002,
            color: this.options.colors[Math.floor(Math.random() * this.options.colors.length)],
            type: 'cosmic'
        };
    }
    
    animate() {
        if (!this.isActive) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update particles
        this.particles.forEach((particle, index) => {
            this.updateParticle(particle);
            this.drawParticle(particle);
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
                this.particles.push(this.createParticle());
            }
        });
        
        // Update emitters
        this.emitters.forEach(emitter => {
            this.updateEmitter(emitter);
        });
        
        // Apply forces
        this.forces.forEach(force => {
            this.applyForce(force);
        });
        
        requestAnimationFrame(() => this.animate());
    }
    
    updateParticle(particle) {
        // Apply gravity
        particle.vy += this.options.gravity;
        
        // Apply friction
        particle.vx *= this.options.friction;
        particle.vy *= this.options.friction;
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Bounce off walls
        if (particle.x < 0 || particle.x > this.canvas.width) {
            particle.vx *= -this.options.bounce;
            particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
        }
        
        if (particle.y < 0 || particle.y > this.canvas.height) {
            particle.vy *= -this.options.bounce;
            particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
        }
        
        // Update life
        particle.life -= particle.decay;
    }
    
    drawParticle(particle) {
        this.ctx.fillStyle = particle.color;
        this.ctx.globalAlpha = particle.life;
        this.ctx.shadowColor = particle.color;
        this.ctx.shadowBlur = particle.size * 2;
        
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.globalAlpha = 1;
    }
    
    addEmitter(x, y, options = {}) {
        const emitter = {
            x,
            y,
            rate: options.rate || 5,
            burst: options.burst || 1,
            angle: options.angle || 0,
            spread: options.spread || Math.PI * 2,
            speed: options.speed || 2,
            life: options.life || 1,
            decay: options.decay || 0.01,
            size: options.size || 2,
            color: options.color || '#ffffff',
            active: true,
            lastEmit: 0
        };
        
        this.emitters.push(emitter);
        return emitter;
    }
    
    updateEmitter(emitter) {
        if (!emitter.active) return;
        
        const now = Date.now();
        if (now - emitter.lastEmit > (1000 / emitter.rate)) {
            for (let i = 0; i < emitter.burst; i++) {
                const angle = emitter.angle + (Math.random() - 0.5) * emitter.spread;
                const speed = emitter.speed * (0.5 + Math.random() * 0.5);
                
                const particle = {
                    x: emitter.x,
                    y: emitter.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: emitter.size + Math.random() * 2,
                    life: emitter.life,
                    decay: emitter.decay,
                    color: emitter.color,
                    type: 'emitted'
                };
                
                this.particles.push(particle);
            }
            
            emitter.lastEmit = now;
        }
    }
    
    addForce(x, y, strength, radius, type = 'attract') {
        const force = {
            x,
            y,
            strength,
            radius,
            type,
            active: true
        };
        
        this.forces.push(force);
        return force;
    }
    
    applyForce(force) {
        if (!force.active) return;
        
        this.particles.forEach(particle => {
            const dx = force.x - particle.x;
            const dy = force.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < force.radius && distance > 0) {
                const intensity = (force.radius - distance) / force.radius;
                const forceX = (dx / distance) * force.strength * intensity;
                const forceY = (dy / distance) * force.strength * intensity;
                
                if (force.type === 'attract') {
                    particle.vx += forceX * 0.1;
                    particle.vy += forceY * 0.1;
                } else if (force.type === 'repel') {
                    particle.vx -= forceX * 0.1;
                    particle.vy -= forceY * 0.1;
                }
            }
        });
    }
    
    createExplosion(x, y, intensity = 1) {
        const particleCount = Math.floor(20 * intensity);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const velocity = 2 + Math.random() * 3;
            
            const particle = {
                x,
                y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: 2 + Math.random() * 3,
                life: 1,
                decay: 0.02 + Math.random() * 0.01,
                color: `hsl(${Math.random() * 60 + 30}, 100%, 70%)`,
                type: 'explosion'
            };
            
            this.particles.push(particle);
        }
    }
    
    createWave(x, y, radius = 50) {
        const wave = {
            x,
            y,
            radius: 0,
            maxRadius: radius,
            speed: 2,
            life: 1,
            decay: 0.02,
            active: true
        };
        
        const animateWave = () => {
            if (!wave.active) return;
            
            wave.radius += wave.speed;
            wave.life -= wave.decay;
            
            if (wave.life > 0 && wave.radius < wave.maxRadius) {
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${wave.life})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                
                requestAnimationFrame(animateWave);
            } else {
                wave.active = false;
            }
        };
        
        animateWave();
    }
    
    createMagneticField(x, y, strength = 1) {
        const field = {
            x,
            y,
            strength,
            radius: 100,
            particles: [],
            active: true
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
        
        const animateField = () => {
            if (!field.active) return;
            
            field.particles.forEach(particle => {
                particle.angle += particle.speed;
                particle.x = field.x + Math.cos(particle.angle) * particle.distance;
                particle.y = field.y + Math.sin(particle.angle) * particle.distance;
                
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            });
            
            requestAnimationFrame(animateField);
        };
        
        animateField();
        return field;
    }
    
    createCosmicDust() {
        const dustParticles = [];
        
        for (let i = 0; i < 50; i++) {
            dustParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 1 + 0.5,
                life: Math.random(),
                decay: 0.001,
                color: 'rgba(255, 255, 255, 0.3)'
            });
        }
        
        const animateDust = () => {
            dustParticles.forEach(particle => {
                particle.life -= particle.decay;
                
                if (particle.life > 0) {
                    this.ctx.fillStyle = particle.color;
                    this.ctx.globalAlpha = particle.life;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    particle.life = 1;
                    particle.x = Math.random() * this.canvas.width;
                    particle.y = Math.random() * this.canvas.height;
                }
            });
            
            this.ctx.globalAlpha = 1;
            requestAnimationFrame(animateDust);
        };
        
        animateDust();
    }
    
    createStellarWind(x, y, direction = 0) {
        const windEmitter = this.addEmitter(x, y, {
            rate: 10,
            burst: 3,
            angle: direction,
            spread: Math.PI / 4,
            speed: 3,
            life: 0.5,
            decay: 0.01,
            size: 1,
            color: '#ffffff'
        });
        
        return windEmitter;
    }
    
    createNebula(x, y, radius = 100) {
        const nebulaParticles = [];
        
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            
            nebulaParticles.push({
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                size: Math.random() * 3 + 1,
                life: Math.random(),
                decay: 0.002,
                color: `hsl(${Math.random() * 60 + 200}, 70%, 70%)`
            });
        }
        
        const animateNebula = () => {
            nebulaParticles.forEach(particle => {
                particle.life -= particle.decay;
                
                if (particle.life > 0) {
                    this.ctx.fillStyle = particle.color;
                    this.ctx.globalAlpha = particle.life;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    particle.life = 1;
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * radius;
                    particle.x = x + Math.cos(angle) * distance;
                    particle.y = y + Math.sin(angle) * distance;
                }
            });
            
            this.ctx.globalAlpha = 1;
            requestAnimationFrame(animateNebula);
        };
        
        animateNebula();
    }
    
    pause() {
        this.isActive = false;
    }
    
    resume() {
        this.isActive = true;
        this.animate();
    }
    
    clear() {
        this.particles = [];
        this.emitters = [];
        this.forces = [];
    }
    
    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
    }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParticleSystem;
} 