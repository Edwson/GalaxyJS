/**
 * ParticlePool - Object pooling for better memory management
 * Prevents garbage collection overhead by reusing particle objects
 */
class ParticlePool {
    constructor(initialSize = 1000) {
        this.pool = [];
        this.active = new Set();
        this.initialSize = initialSize;

        // Pre-allocate particles
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createParticle());
        }
    }

    /**
     * Create a new particle object
     */
    createParticle() {
        return {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            radius: 1,
            alpha: 1,
            life: 1,
            maxLife: 1,
            color: { r: 255, g: 255, b: 255 },
            angle: 0,
            speed: 0,
            mass: 1,
            inUse: false
        };
    }

    /**
     * Acquire a particle from the pool
     */
    acquire(props = {}) {
        let particle;

        if (this.pool.length > 0) {
            particle = this.pool.pop();
        } else {
            // Pool exhausted, create new particle
            particle = this.createParticle();
        }

        // Reset and configure particle
        Object.assign(particle, {
            x: props.x || 0,
            y: props.y || 0,
            vx: props.vx || 0,
            vy: props.vy || 0,
            radius: props.radius || 1,
            alpha: props.alpha !== undefined ? props.alpha : 1,
            life: props.life || 1,
            maxLife: props.maxLife || 1,
            color: props.color || { r: 255, g: 255, b: 255 },
            angle: props.angle || 0,
            speed: props.speed || 0,
            mass: props.mass || 1,
            inUse: true
        });

        this.active.add(particle);
        return particle;
    }

    /**
     * Release a particle back to the pool
     */
    release(particle) {
        if (!particle || !particle.inUse) return;

        particle.inUse = false;
        this.active.delete(particle);
        this.pool.push(particle);
    }

    /**
     * Release multiple particles
     */
    releaseMany(particles) {
        particles.forEach(p => this.release(p));
    }

    /**
     * Get all active particles
     */
    getActive() {
        return Array.from(this.active);
    }

    /**
     * Get pool statistics
     */
    getStats() {
        return {
            poolSize: this.pool.length,
            activeCount: this.active.size,
            totalAllocated: this.pool.length + this.active.size
        };
    }

    /**
     * Clear all particles
     */
    clear() {
        this.active.forEach(p => {
            p.inUse = false;
            this.pool.push(p);
        });
        this.active.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParticlePool;
}
