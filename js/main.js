/**
 * GalaxyJS - Cosmic Animation Library
 * Main JavaScript file
 */

class GalaxyJS {
    constructor(options = {}) {
        this.options = {
            debug: false,
            autoInit: true,
            particleCount: 100,
            trailLength: 20,
            ...options
        };
        
        this.isInitialized = false;
        this.animations = new Map();
        this.particles = [];
        this.trails = [];
        this.mousePosition = { x: 0, y: 0 };
        this.lastMousePosition = { x: 0, y: 0 };
        
        if (this.options.autoInit) {
            this.init();
        }
    }
    
    /**
     * Initialize GalaxyJS
     */
    init() {
        if (this.isInitialized) {
            this.log('GalaxyJS already initialized');
            return;
        }
        
        this.log('Initializing GalaxyJS...');
        
        try {
            // Initialize core components
            this.initEventListeners();
            this.initAnimations();
            this.initDemoCards();
            this.initSmoothScrolling();
            this.initParallaxEffects();
            
            this.isInitialized = true;
            this.log('GalaxyJS initialized successfully');
            
            // Dispatch custom event
            this.dispatchEvent('galaxyjs:initialized', { galaxy: this });
        } catch (error) {
            console.error('Error initializing GalaxyJS:', error);
        }
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Mouse movement tracking
        document.addEventListener('mousemove', (e) => {
            this.lastMousePosition = { ...this.mousePosition };
            this.mousePosition = { x: e.clientX, y: e.clientY };
            this.handleMouseMove(e);
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Scroll events
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });
        
        // Demo card interactions
        document.querySelectorAll('.demo-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.handleDemoCardClick(e);
            });
            
            card.addEventListener('mouseenter', (e) => {
                this.handleDemoCardHover(e, true);
            });
            
            card.addEventListener('mouseleave', (e) => {
                this.handleDemoCardHover(e, false);
            });
        });
        
        // Navigation smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleSmoothScroll(e);
            });
        });
    }
    
    /**
     * Initialize all animations
     */
    initAnimations() {
        // Wait for GalaxyAnimations to be available
        if (typeof GalaxyAnimations === 'undefined') {
            console.error('GalaxyAnimations class not found. Make sure animations.js is loaded before main.js');
            return;
        }
        
        // Initialize animation system
        this.animations = new GalaxyAnimations(this);
        
        // Initialize each animation type
        this.initPulsarAnimations();
        this.initBlackHoleAnimations();
        this.initWormholeAnimations();
        this.initSupernovaAnimations();
        this.initAsteroidAnimations();
        this.initCosmicRayAnimations();
        this.initDwarfPlanetAnimations();
        this.initNebulaAnimations();
        this.initBinaryStarAnimations();
        this.initCosmicDustAnimations();
        this.initTimeDilationAnimations();
        this.initQuantumTunnelingAnimations();
        this.initCMBAnimations();
        this.initGravitationalWaveAnimations();
        this.initDarkMatterAnimations();
        this.initSolarWindAnimations();
        this.initCosmicStringAnimations();
        this.initHawkingRadiationAnimations();
        this.initCosmicInflationAnimations();
        this.initMultiverseAnimations();
        this.initNeutronStarAnimations();
        this.initQuasarAnimations();
        this.initDarkEnergyAnimations();
        this.initCosmicMicrowaveAnimations();
        this.initGravitationalLensingAnimations();
        this.initSpacetimeCurvatureAnimations();
        this.initQuantumEntanglementAnimations();
        this.initCosmicRayBurstAnimations();
        this.initSolarFlareAnimations();
        this.initAsteroidImpactAnimations();
        this.initSpiralGalaxyAnimations();
        this.initCosmicVortexAnimations();
        this.initStellarNurseryAnimations();
        this.initQuantumFieldAnimations();
        this.initDarkMatterWebAnimations();
        this.initNeutronStarCollisionAnimations();
        this.initCosmicStormAnimations();
        this.initInterstellarTravelAnimations();
        this.initBlackHoleMergerAnimations();
        this.initCosmicSymphonyAnimations();
    }
    
    
    /**
     * Initialize demo card interactions
     */
    initDemoCards() {
        const demoCards = document.querySelectorAll('.demo-card');
        demoCards.forEach(card => {
            card.addEventListener('click', (e) => this.handleDemoCardClick(e));
            card.addEventListener('mouseenter', (e) => this.handleDemoCardHover(e, true));
            card.addEventListener('mouseleave', (e) => this.handleDemoCardHover(e, false));
        });
    }
    
    /**
     * Initialize smooth scrolling
     */
    initSmoothScrolling() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
    
    /**
     * Initialize parallax effects
     */
    initParallaxEffects() {
        const parallaxElements = document.querySelectorAll('.cosmic-background > *');
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            
            parallaxElements.forEach((element, index) => {
                const speed = (index + 1) * 0.1;
                element.style.transform = `translateY(${rate * speed}px)`;
            });
        });
    }
    
    /**
     * Handle mouse movement
     */
    handleMouseMove(e) {
        // Update mouse trail
        this.updateMouseTrail();
        
        // Update particle interactions
        this.updateParticleInteractions();
        
        // Dispatch custom event
        this.dispatchEvent('galaxyjs:mousemove', {
            x: e.clientX,
            y: e.clientY,
            deltaX: this.mousePosition.x - this.lastMousePosition.x,
            deltaY: this.mousePosition.y - this.lastMousePosition.y
        });
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Recalculate dimensions
        this.updateDimensions();
        
        // Redraw particles
        this.redrawParticles();
        
        // Dispatch custom event
        this.dispatchEvent('galaxyjs:resize', {
            width: window.innerWidth,
            height: window.innerHeight
        });
    }
    
    /**
     * Handle scroll events
     */
    handleScroll() {
        // Update parallax effects
        this.updateParallaxEffects();
        
        // Update scroll-triggered animations
        this.updateScrollAnimations();
        
        // Dispatch custom event
        this.dispatchEvent('galaxyjs:scroll', {
            scrollY: window.scrollY,
            scrollX: window.scrollX
        });
    }
    
    /**
     * Handle demo card clicks
     */
    handleDemoCardClick(e) {
        const card = e.currentTarget;
        const demoType = card.dataset.demo;
        
        this.log(`Demo card clicked: ${demoType}`);
        
        // Create modal with demo details
        this.showDemoModal(demoType);
        
        // Dispatch custom event
        this.dispatchEvent('galaxyjs:demo-click', {
            demoType,
            element: card
        });
    }
    
    /**
     * Handle demo card hover
     */
    handleDemoCardHover(e, isEntering) {
        const card = e.currentTarget;
        const demoType = card.dataset.demo;
        
        if (isEntering) {
            card.style.transform = 'translateY(-10px) scale(1.05)';
            this.enhanceAnimation(demoType, card);
        } else {
            card.style.transform = 'translateY(0) scale(1)';
            this.resetAnimation(demoType, card);
        }
    }
    
    /**
     * Show demo modal
     */
    showDemoModal(demoType) {
        const modal = this.createModal(demoType);
        document.body.appendChild(modal);
        
        // Animate in
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    }
    
    /**
     * Create modal for demo
     */
    createModal(demoType) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${this.getDemoTitle(demoType)}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${this.getDemoDescription(demoType)}</p>
                    <div class="code-block">
                        <pre><code>${this.getDemoCode(demoType)}</code></pre>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    <button class="btn btn-primary" onclick="window.copyCode('${demoType}')">Copy Code</button>
                </div>
            </div>
        `;
        
        // Close modal functionality
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }
    
    /**
     * Initialize animation for modal demo
     */
    initModalAnimation(demoType, modal) {
        if (!this.animations) {
            console.error('Animations system not initialized');
            return;
        }
        
        const animationElement = modal.querySelector(`.${demoType}-animation`);
        if (!animationElement) {
            console.error(`Animation element not found for ${demoType}`);
            return;
        }
        
        // Stop any existing animations on this element
        const existingAnimation = this.animationFrames.get(animationElement);
        if (existingAnimation) {
            existingAnimation.isActive = false;
        }
        
        // Initialize the specific animation
        switch(demoType) {
            case 'pulsar':
                this.animations.initPulsar(`.${demoType}-animation`, { frequency: 2, intensity: 0.8 });
                break;
            case 'blackhole':
                this.animations.initBlackHole(`.${demoType}-animation`, { eventHorizon: true, accretionDisk: true });
                break;
            case 'wormhole':
                this.animations.initWormhole(`.${demoType}-animation`, { depth: 200, starCount: 20 });
                break;
            case 'supernova':
                this.animations.initSupernova(`.${demoType}-animation`, { explosionForce: 100, particleCount: 30 });
                break;
            case 'asteroids':
                this.animations.initAsteroidField(`.${demoType}-animation`, { asteroidCount: 15, fieldSize: 200 });
                break;
            case 'cosmic-ray':
                this.animations.initCosmicRay(`.${demoType}-animation`, { rayCount: 5, speed: 2 });
                break;
            case 'dwarf-planet':
                this.animations.initDwarfPlanet(`.${demoType}-animation`, { rotationSpeed: 0.01 });
                break;
            case 'nebula':
                this.animations.initNebula(`.${demoType}-animation`, { particleCount: 30, cloudSize: 80 });
                break;
            case 'binary-stars':
                this.animations.initBinaryStars(`.${demoType}-animation`, { orbitSpeed: 0.01, starSize: 12 });
                break;
            case 'cosmic-dust':
                this.animations.initCosmicDust(`.${demoType}-animation`, { particleCount: 50, driftSpeed: 0.005 });
                break;
            case 'time-dilation':
                this.animations.initTimeDilation(`.${demoType}-animation`, { dilationFactor: 0.5, clockSpeed: 0.01 });
                break;
            case 'quantum-tunneling':
                this.animations.initQuantumTunneling(`.${demoType}-animation`, { barrierHeight: 50, particleSpeed: 2 });
                break;
            case 'cmb':
                this.animations.initCMB(`.${demoType}-animation`, { patternSize: 20, noiseLevel: 0.1 });
                break;
            case 'gravitational-waves':
                this.animations.initGravitationalWaves(`.${demoType}-animation`, { waveCount: 3, waveSpeed: 2 });
                break;
            case 'dark-matter':
                this.animations.initDarkMatter(`.${demoType}-animation`, { fieldStrength: 0.5, fieldRadius: 80 });
                break;
            case 'solar-wind':
                this.animations.initSolarWind(`.${demoType}-animation`, { particleCount: 20, windSpeed: 3 });
                break;
            case 'cosmic-strings':
                this.animations.initCosmicStrings(`.${demoType}-animation`, { stringCount: 3, vibrationSpeed: 0.02 });
                break;
            case 'hawking-radiation':
                this.animations.initHawkingRadiation(`.${demoType}-animation`, { radiationRate: 5, particleEnergy: 2 });
                break;
            case 'cosmic-inflation':
                this.animations.initCosmicInflation(`.${demoType}-animation`, { expansionRate: 0.1, fieldStrength: 0.8 });
                break;
            case 'multiverse':
                this.animations.initMultiverse(`.${demoType}-animation`, { universeCount: 3, bubbleSize: 40 });
                break;
            default:
                console.warn(`Unknown demo type: ${demoType}`);
        }
    }
    
    /**
     * Get demo title
     */
    getDemoTitle(demoType) {
        const titles = {
            'pulsar': 'Pulsar Effect',
            'blackhole': 'Black Hole',
            'wormhole': 'Wormhole',
            'supernova': 'Supernova',
            'asteroids': 'Asteroid Field',
            'cosmic-ray': 'Cosmic Ray',
            'dwarf-planet': 'Dwarf Planet',
            'nebula': 'Nebula',
            'binary-stars': 'Binary Stars',
            'cosmic-dust': 'Cosmic Dust',
            'time-dilation': 'Time Dilation',
            'quantum-tunneling': 'Quantum Tunneling',
            'cmb': 'CMB Radiation',
            'gravitational-waves': 'Gravitational Waves',
            'dark-matter': 'Dark Matter',
            'solar-wind': 'Solar Wind',
            'cosmic-strings': 'Cosmic Strings',
            'hawking-radiation': 'Hawking Radiation',
            'cosmic-inflation': 'Cosmic Inflation',
            'multiverse': 'Multiverse',
            'neutron-star': 'Neutron Star',
            'quasar': 'Quasar',
            'dark-energy': 'Dark Energy',
            'cosmic-microwave': 'Cosmic Microwave Background',
            'gravitational-lensing': 'Gravitational Lensing',
            'spacetime-curvature': 'Spacetime Curvature',
            'quantum-entanglement': 'Quantum Entanglement',
            'cosmic-ray-burst': 'Cosmic Ray Burst',
            'solar-flare': 'Solar Flare',
            'asteroid-impact': 'Asteroid Impact',
            'spiral-galaxy': 'Spiral Galaxy',
            'cosmic-vortex': 'Cosmic Vortex',
            'stellar-nursery': 'Stellar Nursery',
            'quantum-field': 'Quantum Field',
            'dark-matter-web': 'Dark Matter Web',
            'neutron-star-collision': 'Neutron Star Collision',
            'cosmic-storm': 'Cosmic Storm',
            'interstellar-travel': 'Interstellar Travel',
            'black-hole-merger': 'Black Hole Merger',
            'cosmic-symphony': 'Cosmic Symphony'
        };
        
        return titles[demoType] || 'Demo';
    }
    
    /**
     * Get demo description
     */
    getDemoDescription(demoType) {
        const descriptions = {
            'pulsar': 'A neutron star that emits regular pulses of radiation as it rotates.',
            'blackhole': 'A region of spacetime where gravity is so strong that nothing can escape.',
            'wormhole': 'A theoretical passage through spacetime that could create shortcuts for long journeys.',
            'supernova': 'A powerful and luminous stellar explosion that occurs at the end of a star\'s life.',
            'asteroids': 'Small rocky objects that orbit the sun, primarily found in the asteroid belt.',
            'cosmic-ray': 'High-energy particles that travel through space at nearly the speed of light.',
            'dwarf-planet': 'A celestial body that orbits the sun but is not large enough to be considered a planet.',
            'nebula': 'A cloud of gas and dust in space, often the birthplace of stars.',
            'binary-stars': 'Two stars that orbit around their common center of mass.',
            'cosmic-dust': 'Tiny particles of matter that exist in interstellar space.',
            'time-dilation': 'The difference in elapsed time measured by two observers due to relative velocity or gravitational potential.',
            'quantum-tunneling': 'A quantum mechanical phenomenon where particles can pass through potential energy barriers.',
            'cmb': 'Cosmic microwave background radiation, the thermal radiation left over from the Big Bang.',
            'gravitational-waves': 'Ripples in spacetime caused by massive accelerating objects.',
            'dark-matter': 'A form of matter that does not emit, absorb, or reflect light, but exerts gravitational force.',
            'solar-wind': 'A stream of charged particles released from the upper atmosphere of the sun.',
            'cosmic-strings': 'Hypothetical one-dimensional topological defects that may have formed during the early universe.',
            'hawking-radiation': 'Thermal radiation predicted to be emitted by black holes due to quantum effects.',
            'cosmic-inflation': 'A theory of exponential expansion of space in the early universe.',
            'multiverse': 'A hypothetical group of multiple universes, including the universe we inhabit.',
            'neutron-star': 'An ultra-dense stellar remnant composed almost entirely of neutrons.',
            'quasar': 'An extremely luminous active galactic nucleus powered by a supermassive black hole.',
            'dark-energy': 'A mysterious form of energy that is causing the expansion of the universe to accelerate.',
            'cosmic-microwave': 'The thermal radiation left over from the Big Bang, filling the entire universe.',
            'gravitational-lensing': 'The bending of light by gravity, predicted by Einstein\'s theory of general relativity.',
            'spacetime-curvature': 'The warping of spacetime caused by mass and energy, as described by general relativity.',
            'quantum-entanglement': 'A quantum mechanical phenomenon where particles become correlated in ways that cannot be explained by classical physics.',
            'cosmic-ray-burst': 'A sudden, intense burst of high-energy particles from space.',
            'solar-flare': 'A sudden flash of increased brightness on the sun, often associated with solar magnetic activity.',
            'asteroid-impact': 'A collision between an asteroid and a planetary body, creating impact craters and debris.',
            'spiral-galaxy': 'A majestic galaxy with spiral arms extending from a central bulge, containing billions of stars.',
            'cosmic-vortex': 'A powerful spacetime whirlpool that distorts the fabric of reality itself.',
            'stellar-nursery': 'A region of space where new stars are born from collapsing clouds of gas and dust.',
            'quantum-field': 'The fundamental substrate of reality where virtual particles constantly appear and disappear.',
            'dark-matter-web': 'The invisible cosmic scaffolding that holds galaxies together in vast interconnected networks.',
            'neutron-star-collision': 'A cataclysmic event where two neutron stars merge, creating gravitational waves and heavy elements.',
            'cosmic-storm': 'Violent space weather with plasma winds, lightning arcs, and energy vortices.',
            'interstellar-travel': 'A journey through space at warp speed, bending spacetime to traverse vast cosmic distances.',
            'black-hole-merger': 'The ultimate cosmic dance where two black holes spiral together and become one.',
            'cosmic-symphony': 'The harmonious vibration of the universe, where all cosmic forces resonate in perfect unity.'
        };
        
        return descriptions[demoType] || 'A cosmic animation effect.';
    }
    
    /**
     * Get demo HTML
     */
    getDemoHTML(demoType) {
        // Return the HTML structure for each demo
        const htmlTemplates = {
            'pulsar': `
                <div class="pulsar-core"></div>
                <div class="pulsar-waves"></div>
            `,
            'blackhole': `
                <div class="event-horizon"></div>
                <div class="accretion-disk"></div>
            `,
            'wormhole': `
                <div class="wormhole-tunnel"></div>
                <div class="wormhole-stars"></div>
            `,
            'supernova': `
                <div class="supernova-core"></div>
                <div class="supernova-shockwave"></div>
            `,
            'asteroids': `
                <div class="asteroid-field">
                    <div class="asteroid asteroid-1"></div>
                    <div class="asteroid asteroid-2"></div>
                    <div class="asteroid asteroid-3"></div>
                    <div class="asteroid asteroid-4"></div>
                </div>
            `,
            'cosmic-ray': `
                <div class="cosmic-ray-animation">
                    <div class="ray-particle"></div>
                    <div class="ray-trail"></div>
                </div>
            `,
            'dwarf-planet': `
                <div class="dwarf-planet"></div>
                <div class="planet-rings"></div>
            `,
            'nebula': `
                <div class="nebula-cloud"></div>
                <div class="nebula-particles"></div>
            `,
            'binary-stars': `
                <div class="star star-1"></div>
                <div class="star star-2"></div>
                <div class="orbit-path"></div>
            `,
            'cosmic-dust': `
                <div class="dust-particle dust-1"></div>
                <div class="dust-particle dust-2"></div>
                <div class="dust-particle dust-3"></div>
                <div class="dust-particle dust-4"></div>
            `,
            'time-dilation': `
                <div class="time-clock"></div>
                <div class="time-warp"></div>
            `,
            'quantum-tunneling': `
                <div class="quantum-particle"></div>
                <div class="energy-barrier"></div>
            `,
            'cmb': `
                <div class="cmb-pattern"></div>
                <div class="cmb-noise"></div>
            `,
            'gravitational-waves': `
                <div class="wave-ripple wave-1"></div>
                <div class="wave-ripple wave-2"></div>
                <div class="wave-ripple wave-3"></div>
            `,
            'dark-matter': `
                <div class="dark-matter-field"></div>
                <div class="visible-matter"></div>
            `,
            'solar-wind': `
                <div class="solar-particles"></div>
                <div class="magnetic-field"></div>
            `,
            'cosmic-strings': `
                <div class="string string-1"></div>
                <div class="string string-2"></div>
                <div class="string string-3"></div>
            `,
            'hawking-radiation': `
                <div class="black-hole-mini"></div>
                <div class="radiation-particles"></div>
            `,
            'cosmic-inflation': `
                <div class="inflation-field"></div>
                <div class="space-expansion"></div>
            `,
            'multiverse': `
                <div class="universe-bubble bubble-1"></div>
                <div class="universe-bubble bubble-2"></div>
                <div class="universe-bubble bubble-3"></div>
            `
        };
        return htmlTemplates[demoType] || '<div class="demo-placeholder">Demo Animation</div>';
    }
    
    /**
     * Get demo code
     */
    getDemoCode(demoType) {
        const codeTemplates = {
            'pulsar': `// HTML Structure
<div class="pulsar-animation">
    <div class="pulsar-core"></div>
    <div class="pulsar-waves"></div>
</div>

// CSS Styles
.pulsar-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pulsar-core {
    width: 20px;
    height: 20px;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 20px #ffffff;
    animation: pulsar-core 2s ease-in-out infinite;
}

.pulsar-waves {
    position: absolute;
    width: 100px;
    height: 100px;
    border: 1px solid #ffffff;
    border-radius: 50%;
    animation: pulsar-waves 2s ease-in-out infinite;
}

@keyframes pulsar-core {
    0%, 100% { 
        transform: scale(1);
        box-shadow: 0 0 20px #ffffff;
    }
    50% { 
        transform: scale(1.5);
        box-shadow: 0 0 40px #ffffff;
    }
}

@keyframes pulsar-waves {
    0% {
        width: 20px;
        height: 20px;
        opacity: 1;
    }
    100% {
        width: 100px;
        height: 100px;
        opacity: 0;
    }
}

// JavaScript Initialization
galaxy.initPulsar('.pulsar-animation', {
    frequency: 2,
    intensity: 0.8
});`,

            'blackhole': `// HTML Structure
<div class="black-hole-animation">
    <div class="event-horizon"></div>
    <div class="accretion-disk"></div>
</div>

// CSS Styles
.black-hole-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.event-horizon {
    width: 60px;
    height: 60px;
    background: #000000;
    border-radius: 50%;
    box-shadow: 0 0 30px #000000;
    animation: event-horizon 3s ease-in-out infinite;
}

.accretion-disk {
    position: absolute;
    width: 100px;
    height: 100px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    animation: accretion-disk 3s linear infinite;
}

@keyframes event-horizon {
    0%, 100% { 
        transform: scale(1);
        box-shadow: 0 0 30px #000000;
    }
    50% { 
        transform: scale(1.1);
        box-shadow: 0 0 50px #000000;
    }
}

@keyframes accretion-disk {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

// JavaScript Initialization
galaxy.initBlackHole('.black-hole-animation', {
    eventHorizon: true,
    accretionDisk: true
});`,

            'wormhole': `// HTML Structure
<div class="wormhole-animation">
    <div class="wormhole-tunnel"></div>
    <div class="wormhole-stars"></div>
</div>

// CSS Styles
.wormhole-animation {
    position: relative;
    width: 100px;
    height: 100px;
    perspective: 1000px;
}

.wormhole-tunnel {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 80px;
    height: 80px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    transform: translate(-50%, -50%) rotateX(75deg);
    animation: wormhole-tunnel 4s linear infinite;
}

.wormhole-stars {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100px;
    height: 100px;
    transform: translate(-50%, -50%);
}

@keyframes wormhole-tunnel {
    0% { 
        transform: translate(-50%, -50%) rotateX(75deg) scale(1);
        opacity: 1;
    }
    100% { 
        transform: translate(-50%, -50%) rotateX(75deg) scale(0.1);
        opacity: 0;
    }
}

// JavaScript Initialization
galaxy.initWormhole('.wormhole-animation', {
    depth: 200,
    starCount: 20
});`,

            'supernova': `// HTML Structure
<div class="supernova-animation">
    <div class="supernova-core"></div>
    <div class="supernova-shockwave"></div>
</div>

// CSS Styles
.supernova-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.supernova-core {
    width: 30px;
    height: 30px;
    background: radial-gradient(circle, #ffff00, #ff6600);
    border-radius: 50%;
    animation: supernova-core 3s ease-out infinite;
}

.supernova-shockwave {
    position: absolute;
    width: 100px;
    height: 100px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    animation: supernova-shockwave 3s ease-out infinite;
}

@keyframes supernova-core {
    0% { 
        transform: scale(1);
        opacity: 1;
    }
    50% { 
        transform: scale(2);
        opacity: 0.8;
    }
    100% { 
        transform: scale(0);
        opacity: 0;
    }
}

@keyframes supernova-shockwave {
    0% {
        transform: scale(0.3);
        opacity: 1;
    }
    100% {
        transform: scale(2);
        opacity: 0;
    }
}

// JavaScript Initialization
galaxy.initSupernova('.supernova-animation', {
    explosionForce: 100,
    particleCount: 30
});`,

            'asteroids': `// HTML Structure
<div class="asteroid-field">
    <div class="asteroid asteroid-1"></div>
    <div class="asteroid asteroid-2"></div>
    <div class="asteroid asteroid-3"></div>
    <div class="asteroid asteroid-4"></div>
</div>

// CSS Styles
.asteroid-field {
    position: relative;
    width: 100px;
    height: 100px;
}

.asteroid {
    position: absolute;
    width: 4px;
    height: 4px;
    background: #666666;
    border-radius: 50%;
    animation: asteroid-move 4s linear infinite;
}

.asteroid-1 { animation-delay: 0s; }
.asteroid-2 { animation-delay: 1s; }
.asteroid-3 { animation-delay: 2s; }
.asteroid-4 { animation-delay: 3s; }

@keyframes asteroid-move {
    0% {
        top: 0;
        left: 0;
        opacity: 0;
    }
    10% {
        opacity: 1;
    }
    90% {
        opacity: 1;
    }
    100% {
        top: 100px;
        left: 100px;
        opacity: 0;
    }
}

// JavaScript Initialization
galaxy.initAsteroidField('.asteroid-field', {
    asteroidCount: 15,
    fieldSize: 200
});`,

            'cosmic-ray': `// HTML Structure
<div class="cosmic-ray-animation">
    <div class="ray-particle"></div>
    <div class="ray-trail"></div>
</div>

// CSS Styles
.cosmic-ray-animation {
    position: relative;
    width: 100px;
    height: 100px;
}

.ray-particle {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2px;
    height: 50px;
    background: linear-gradient(to bottom, #ffffff, transparent);
    transform: translate(-50%, -50%);
    animation: ray-particle 2s linear infinite;
}

.ray-trail {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 1px;
    height: 30px;
    background: linear-gradient(to bottom, #ffffff, transparent);
    transform: translate(-50%, -50%);
    animation: ray-trail 2s linear infinite;
    animation-delay: 0.5s;
}

@keyframes ray-particle {
    0% {
        transform: translate(-50%, -50%) rotate(0deg);
        opacity: 1;
    }
    100% {
        transform: translate(-50%, -50%) rotate(360deg);
        opacity: 0;
    }
}

@keyframes ray-trail {
    0% {
        transform: translate(-50%, -50%) rotate(0deg);
        opacity: 0.5;
    }
    100% {
        transform: translate(-50%, -50%) rotate(360deg);
        opacity: 0;
    }
}

// JavaScript Initialization
galaxy.initCosmicRay('.cosmic-ray-animation', {
    rayCount: 5,
    speed: 2
});`,

            'dwarf-planet': `// HTML Structure
<div class="dwarf-planet-animation">
    <div class="dwarf-planet"></div>
    <div class="planet-rings"></div>
</div>

// CSS Styles
.dwarf-planet-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dwarf-planet {
    width: 40px;
    height: 40px;
    background: radial-gradient(circle, #8b4513, #654321);
    border-radius: 50%;
    animation: dwarf-planet-rotate 10s linear infinite;
}

.planet-rings {
    position: absolute;
    width: 60px;
    height: 20px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    transform: rotateX(75deg);
    animation: planet-rings 15s linear infinite;
}

@keyframes dwarf-planet-rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes planet-rings {
    0% { transform: rotateX(75deg) rotate(0deg); }
    100% { transform: rotateX(75deg) rotate(360deg); }
}

// JavaScript Initialization
galaxy.initDwarfPlanet('.dwarf-planet-animation', {
    rotationSpeed: 0.01
});`,

            'nebula': `// HTML Structure
<div class="nebula-animation">
    <div class="nebula-cloud"></div>
    <div class="nebula-particles"></div>
</div>

// CSS Styles
.nebula-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.nebula-cloud {
    width: 80px;
    height: 80px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent);
    border-radius: 50%;
    animation: nebula-cloud 6s ease-in-out infinite;
}

.nebula-particles {
    position: absolute;
    width: 100px;
    height: 100px;
}

.nebula-particles::before,
.nebula-particles::after {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    background: #ffffff;
    border-radius: 50%;
    animation: particle-drift 4s linear infinite;
}

@keyframes nebula-cloud {
    0%, 100% { 
        transform: scale(1);
        opacity: 0.3;
    }
    50% { 
        transform: scale(1.2);
        opacity: 0.6;
    }
}

@keyframes particle-drift {
    0% {
        top: 0;
        left: 0;
        opacity: 0;
    }
    50% {
        opacity: 1;
    }
    100% {
        top: 100px;
        left: 100px;
        opacity: 0;
    }
}

// JavaScript Initialization
galaxy.initNebula('.nebula-animation', {
    particleCount: 30,
    cloudSize: 80
});`,

            'binary-stars': `// HTML Structure
<div class="binary-stars-animation">
    <div class="star star-1"></div>
    <div class="star star-2"></div>
    <div class="orbit-path"></div>
</div>

// CSS Styles
.binary-stars-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.star {
    position: absolute;
    width: 12px;
    height: 12px;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 10px #ffffff;
}

.star-1 {
    animation: binary-star-1 8s linear infinite;
}

.star-2 {
    animation: binary-star-2 8s linear infinite;
}

.orbit-path {
    position: absolute;
    width: 60px;
    height: 60px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
}

@keyframes binary-star-1 {
    0% { transform: translate(30px, 0px); }
    100% { transform: translate(30px, 0px) rotate(360deg); }
}

@keyframes binary-star-2 {
    0% { transform: translate(-30px, 0px); }
    100% { transform: translate(-30px, 0px) rotate(360deg); }
}

// JavaScript Initialization
galaxy.initBinaryStars('.binary-stars-animation', {
    orbitSpeed: 0.01,
    starSize: 12
});`,

            'cosmic-dust': `// HTML Structure
<div class="cosmic-dust-animation">
    <div class="dust-particle dust-1"></div>
    <div class="dust-particle dust-2"></div>
    <div class="dust-particle dust-3"></div>
    <div class="dust-particle dust-4"></div>
</div>

// CSS Styles
.cosmic-dust-animation {
    position: relative;
    width: 100px;
    height: 100px;
}

.dust-particle {
    position: absolute;
    width: 1px;
    height: 1px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    animation: dust-float 6s linear infinite;
}

.dust-1 { animation-delay: 0s; }
.dust-2 { animation-delay: 1.5s; }
.dust-3 { animation-delay: 3s; }
.dust-4 { animation-delay: 4.5s; }

@keyframes dust-float {
    0% {
        top: 0;
        left: 0;
        opacity: 0;
    }
    20% {
        opacity: 1;
    }
    80% {
        opacity: 1;
    }
    100% {
        top: 100px;
        left: 100px;
        opacity: 0;
    }
}

// JavaScript Initialization
galaxy.initCosmicDust('.cosmic-dust-animation', {
    particleCount: 50,
    driftSpeed: 0.005
});`,

            'time-dilation': `// HTML Structure
<div class="time-dilation-animation">
    <div class="time-clock"></div>
    <div class="time-warp"></div>
</div>

// CSS Styles
.time-dilation-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.time-clock {
    width: 60px;
    height: 60px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    position: relative;
    animation: time-clock 4s ease-in-out infinite;
}

.time-clock::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2px;
    height: 25px;
    background: #ffffff;
    transform: translate(-50%, -100%);
    transform-origin: bottom;
    animation: clock-hand 2s linear infinite;
}

.time-warp {
    position: absolute;
    width: 80px;
    height: 80px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    animation: time-warp 6s ease-in-out infinite;
}

@keyframes time-clock {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
}

@keyframes clock-hand {
    0% { transform: translate(-50%, -100%) rotate(0deg); }
    100% { transform: translate(-50%, -100%) rotate(360deg); }
}

@keyframes time-warp {
    0%, 100% { 
        transform: scale(1);
        opacity: 0.3;
    }
    50% { 
        transform: scale(1.5);
        opacity: 0.8;
    }
}

// JavaScript Initialization
galaxy.initTimeDilation('.time-dilation-animation', {
    dilationFactor: 0.5,
    clockSpeed: 0.01
});`,

            'quantum-tunneling': `// HTML Structure
<div class="quantum-tunneling-animation">
    <div class="quantum-particle"></div>
    <div class="energy-barrier"></div>
</div>

// CSS Styles
.quantum-tunneling-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.quantum-particle {
    position: absolute;
    width: 4px;
    height: 4px;
    background: #ffffff;
    border-radius: 50%;
    left: 20px;
    animation: quantum-tunnel 3s linear infinite;
}

.energy-barrier {
    position: absolute;
    width: 20px;
    height: 60px;
    background: linear-gradient(to right, transparent, #ff6600, transparent);
    border-radius: 10px;
    animation: energy-barrier 3s ease-in-out infinite;
}

@keyframes quantum-tunnel {
    0% { 
        transform: translateX(0px);
        opacity: 1;
    }
    40% { 
        transform: translateX(30px);
        opacity: 0.3;
    }
    60% { 
        transform: translateX(50px);
        opacity: 0.3;
    }
    100% { 
        transform: translateX(80px);
        opacity: 1;
    }
}

@keyframes energy-barrier {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
}

// JavaScript Initialization
galaxy.initQuantumTunneling('.quantum-tunneling-animation', {
    barrierHeight: 50,
    particleSpeed: 2
});`,

            'cmb': `// HTML Structure
<div class="cmb-animation">
    <div class="cmb-pattern"></div>
    <div class="cmb-noise"></div>
</div>

// CSS Styles
.cmb-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000000;
}

.cmb-pattern {
    width: 80px;
    height: 80px;
    background: 
        radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
        radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
    background-size: 20px 20px;
    animation: cmb-pattern 10s linear infinite;
}

.cmb-noise {
    position: absolute;
    width: 80px;
    height: 80px;
    background: 
        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 10px 10px;
    animation: cmb-noise 5s ease-in-out infinite;
}

@keyframes cmb-pattern {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes cmb-noise {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
}

// JavaScript Initialization
galaxy.initCMB('.cmb-animation', {
    patternSize: 20,
    noiseLevel: 0.1
});`,

            'gravitational-waves': `// HTML Structure
<div class="gravitational-waves-animation">
    <div class="wave-ripple wave-1"></div>
    <div class="wave-ripple wave-2"></div>
    <div class="wave-ripple wave-3"></div>
</div>

// CSS Styles
.gravitational-waves-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.wave-ripple {
    position: absolute;
    width: 40px;
    height: 40px;
    border: 1px solid #ffffff;
    border-radius: 50%;
    animation: wave-ripple 3s ease-out infinite;
}

.wave-1 { animation-delay: 0s; }
.wave-2 { animation-delay: 1s; }
.wave-3 { animation-delay: 2s; }

@keyframes wave-ripple {
    0% {
        width: 40px;
        height: 40px;
        opacity: 1;
    }
    100% {
        width: 100px;
        height: 100px;
        opacity: 0;
    }
}

// JavaScript Initialization
galaxy.initGravitationalWaves('.gravitational-waves-animation', {
    waveCount: 3,
    waveSpeed: 2
});`,

            'dark-matter': `// HTML Structure
<div class="dark-matter-animation">
    <div class="dark-matter-field"></div>
    <div class="visible-matter"></div>
</div>

// CSS Styles
.dark-matter-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dark-matter-field {
    width: 80px;
    height: 80px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1), transparent);
    border-radius: 50%;
    animation: dark-matter-field 4s ease-in-out infinite;
}

.visible-matter {
    position: absolute;
    width: 40px;
    height: 40px;
    background: #ffffff;
    border-radius: 50%;
    animation: visible-matter 4s ease-in-out infinite;
}

@keyframes dark-matter-field {
    0%, 100% { 
        transform: scale(1);
        opacity: 0.1;
    }
    50% { 
        transform: scale(1.3);
        opacity: 0.3;
    }
}

@keyframes visible-matter {
    0%, 100% { 
        transform: scale(1);
        opacity: 1;
    }
    50% { 
        transform: scale(0.7);
        opacity: 0.5;
    }
}

// JavaScript Initialization
galaxy.initDarkMatter('.dark-matter-animation', {
    fieldStrength: 0.5,
    fieldRadius: 80
});`,

            'solar-wind': `// HTML Structure
<div class="solar-wind-animation">
    <div class="solar-particles"></div>
    <div class="magnetic-field"></div>
</div>

// CSS Styles
.solar-wind-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.solar-particles {
    position: absolute;
    width: 100px;
    height: 100px;
}

.solar-particles::before,
.solar-particles::after {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    background: #ffffff;
    border-radius: 50%;
    animation: particle-stream 2s linear infinite;
}

.solar-particles::before {
    animation-delay: 0s;
}

.solar-particles::after {
    animation-delay: 1s;
}

.magnetic-field {
    position: absolute;
    width: 80px;
    height: 80px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    animation: magnetic-field 4s ease-in-out infinite;
}

@keyframes particle-stream {
    0% {
        left: 0;
        opacity: 0;
    }
    50% {
        opacity: 1;
    }
    100% {
        left: 100px;
        opacity: 0;
    }
}

@keyframes magnetic-field {
    0%, 100% { 
        transform: scale(1);
        opacity: 0.3;
    }
    50% { 
        transform: scale(1.2);
        opacity: 0.6;
    }
}

// JavaScript Initialization
galaxy.initSolarWind('.solar-wind-animation', {
    particleCount: 20,
    windSpeed: 3
});`,

            'cosmic-strings': `// HTML Structure
<div class="cosmic-strings-animation">
    <div class="string string-1"></div>
    <div class="string string-2"></div>
    <div class="string string-3"></div>
</div>

// CSS Styles
.cosmic-strings-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.string {
    position: absolute;
    width: 2px;
    height: 60px;
    background: #ffffff;
    animation: string-vibrate 2s ease-in-out infinite;
}

.string-1 { animation-delay: 0s; }
.string-2 { animation-delay: 0.7s; }
.string-3 { animation-delay: 1.4s; }

@keyframes string-vibrate {
    0%, 100% { 
        height: 60px;
        opacity: 0.5;
    }
    50% { 
        height: 80px;
        opacity: 1;
    }
}

// JavaScript Initialization
galaxy.initCosmicStrings('.cosmic-strings-animation', {
    stringCount: 3,
    vibrationSpeed: 0.02
});`,

            'hawking-radiation': `// HTML Structure
<div class="hawking-radiation-animation">
    <div class="black-hole-mini"></div>
    <div class="radiation-particles"></div>
</div>

// CSS Styles
.hawking-radiation-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.black-hole-mini {
    width: 30px;
    height: 30px;
    background: #000000;
    border-radius: 50%;
    box-shadow: 0 0 20px #000000;
    animation: black-hole-mini 4s ease-in-out infinite;
}

.radiation-particles {
    position: absolute;
    width: 100px;
    height: 100px;
}

.radiation-particles::before,
.radiation-particles::after {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    background: #ffffff;
    border-radius: 50%;
    animation: radiation-emission 3s linear infinite;
}

@keyframes black-hole-mini {
    0%, 100% { 
        transform: scale(1);
        box-shadow: 0 0 20px #000000;
    }
    50% { 
        transform: scale(1.2);
        box-shadow: 0 0 30px #000000;
    }
}

@keyframes radiation-emission {
    0% {
        top: 50%;
        left: 50%;
        opacity: 1;
    }
    100% {
        top: 0;
        left: 0;
        opacity: 0;
    }
}

// JavaScript Initialization
galaxy.initHawkingRadiation('.hawking-radiation-animation', {
    radiationRate: 5,
    particleEnergy: 2
});`,

            'cosmic-inflation': `// HTML Structure
<div class="cosmic-inflation-animation">
    <div class="inflation-field"></div>
    <div class="space-expansion"></div>
</div>

// CSS Styles
.cosmic-inflation-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.inflation-field {
    width: 20px;
    height: 20px;
    background: radial-gradient(circle, #ffffff, transparent);
    border-radius: 50%;
    animation: inflation-expand 6s ease-out infinite;
}

.space-expansion {
    position: absolute;
    width: 80px;
    height: 80px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    animation: space-expansion 6s ease-out infinite;
}

@keyframes inflation-expand {
    0% { 
        transform: scale(1);
        opacity: 1;
    }
    100% { 
        transform: scale(4);
        opacity: 0;
    }
}

@keyframes space-expansion {
    0% { 
        transform: scale(0.3);
        opacity: 0.3;
    }
    100% { 
        transform: scale(1.5);
        opacity: 0;
    }
}

// JavaScript Initialization
galaxy.initCosmicInflation('.cosmic-inflation-animation', {
    expansionRate: 0.1,
    fieldStrength: 0.8
});`,

            'multiverse': `// HTML Structure
<div class="multiverse-animation">
    <div class="universe-bubble bubble-1"></div>
    <div class="universe-bubble bubble-2"></div>
    <div class="universe-bubble bubble-3"></div>
</div>

// CSS Styles
.multiverse-animation {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.universe-bubble {
    position: absolute;
    width: 40px;
    height: 40px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    animation: universe-bubble 8s ease-in-out infinite;
}

.bubble-1 { animation-delay: 0s; }
.bubble-2 { animation-delay: 2.7s; }
.bubble-3 { animation-delay: 5.3s; }

@keyframes universe-bubble {
    0% {
        transform: scale(0.5);
        opacity: 0.3;
    }
    33% {
        transform: scale(1);
        opacity: 1;
    }
    66% {
        transform: scale(1.2);
        opacity: 1;
    }
    100% {
        transform: scale(0.7);
        opacity: 0.3;
    }
}

// JavaScript Initialization
galaxy.initMultiverse('.multiverse-animation', {
    universeCount: 3,
    bubbleSize: 40
});`
        };
        
        return codeTemplates[demoType] || `// ${this.getDemoTitle(demoType)} Code
galaxy.init${demoType.charAt(0).toUpperCase() + demoType.slice(1)}('.${demoType}-element');`;
    }
    
    /**
     * Show demo
     */
    showDemo(demoType) {
        this.log(`Showing demo for: ${demoType}`);
        // This could trigger a more detailed demo or tutorial
        this.showNotification(`Demo for ${this.getDemoTitle(demoType)}`, 'info');
    }
    
    /**
     * Show animation
     */
    showAnimation(demoType) {
        this.log(`Showing animation for: ${demoType}`);
        // This could trigger a full-screen animation view
        this.showNotification(`Animation for ${this.getDemoTitle(demoType)}`, 'info');
    }
    
    /**
     * Copy code to clipboard
     */
    copyCode(demoType) {
        const code = this.getDemoCode(demoType);
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code).then(() => {
                this.showNotification('Code copied to clipboard!', 'success');
            }).catch(() => {
                this.showNotification('Failed to copy code', 'error');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = code;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showNotification('Code copied to clipboard!', 'success');
            } catch (err) {
                this.showNotification('Failed to copy code', 'error');
            }
            
            document.body.removeChild(textArea);
        }
    }
    
    /**
     * Scroll to section utility function
     */
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        // Set background color based on type
        switch(type) {
            case 'success':
                notification.style.background = '#10b981';
                break;
            case 'error':
                notification.style.background = '#ef4444';
                break;
            case 'warning':
                notification.style.background = '#f59e0b';
                break;
            default:
                notification.style.background = '#3b82f6';
        }
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Update mouse trail
     */
    updateMouseTrail() {
        // Implementation for mouse trail effect
        if (this.trails.length > this.options.trailLength) {
            this.trails.shift();
        }
        
        this.trails.push({
            x: this.mousePosition.x,
            y: this.mousePosition.y,
            timestamp: Date.now()
        });
    }
    
    /**
     * Update particle interactions
     */
    updateParticleInteractions() {
        // Implementation for particle interactions
        this.particles.forEach(particle => {
            const distance = this.getDistance(this.mousePosition, particle.position);
            if (distance < 100) {
                particle.attractTo(this.mousePosition);
            }
        });
    }
    
    /**
     * Update dimensions
     */
    updateDimensions() {
        this.dimensions = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
    
    /**
     * Redraw particles
     */
    redrawParticles() {
        // Implementation for redrawing particles
        this.particles.forEach(particle => {
            particle.update();
        });
    }
    
    /**
     * Update parallax effects
     */
    updateParallaxEffects() {
        // Implementation for parallax effects
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.parallax');
        
        parallaxElements.forEach(element => {
            const speed = element.dataset.speed || 0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    }
    
    /**
     * Update scroll animations
     */
    updateScrollAnimations() {
        // Implementation for scroll-triggered animations
        const elements = document.querySelectorAll('[data-animate-on-scroll]');
        
        elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (isVisible) {
                element.classList.add('animate-in');
            }
        });
    }
    
    /**
     * Enhance animation
     */
    enhanceAnimation(demoType, element) {
        // Implementation for enhancing animations on hover
        const animation = element.querySelector(`.${demoType}-animation`);
        if (animation) {
            animation.style.transform = 'scale(1.2)';
            animation.style.filter = 'brightness(1.5)';
        }
    }
    
    /**
     * Reset animation
     */
    resetAnimation(demoType, element) {
        // Implementation for resetting animations
        const animation = element.querySelector(`.${demoType}-animation`);
        if (animation) {
            animation.style.transform = 'scale(1)';
            animation.style.filter = 'brightness(1)';
        }
    }
    
    /**
     * Get distance between two points
     */
    getDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { galaxy: this, ...detail }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Check animation status
     */
    checkAnimationStatus() {
        const status = {
            initialized: this.isInitialized,
            animationsAvailable: !!this.animations,
            activeAnimations: this.animations ? this.animations.animationFrames.size : 0,
            demoElements: document.querySelectorAll('.demo-card').length,
            animationElements: document.querySelectorAll('[data-demo] .demo-visual').length
        };
        
        console.log('Animation Status:', status);
        return status;
    }
    
    /**
     * Log messages (only in debug mode)
     */
    log(message, ...args) {
        if (this.options.debug) {
            console.log(`[GalaxyJS] ${message}`, ...args);
        }
    }
    
    /**
     * Initialize specific animation types
     */
    initPulsarAnimations() {
        try {
            // Initialize pulsar animations for demo cards
            const elements = document.querySelectorAll('[data-demo="pulsar"] .pulsar-animation');
            if (elements.length > 0 && this.animations) {
                elements.forEach(element => {
                    this.animations.initPulsar(element, { frequency: 2, intensity: 0.8 });
                });
                this.log(`Initialized ${elements.length} pulsar animations`);
            }
        } catch (error) {
            console.error('Error initializing pulsar animations:', error);
        }
    }
    
    initBlackHoleAnimations() {
        try {
            // Initialize black hole animations for demo cards
            const elements = document.querySelectorAll('[data-demo="blackhole"] .black-hole-animation');
            if (elements.length > 0 && this.animations) {
                elements.forEach(element => {
                    this.animations.initBlackHole(element, { eventHorizon: true, accretionDisk: true });
                });
                this.log(`Initialized ${elements.length} black hole animations`);
            }
        } catch (error) {
            console.error('Error initializing black hole animations:', error);
        }
    }
    
    initWormholeAnimations() {
        // Initialize wormhole animations for demo cards
        const elements = document.querySelectorAll('[data-demo="wormhole"] .wormhole-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initWormhole(element, { depth: 200, starCount: 20 });
            });
        }
    }
    
    initSupernovaAnimations() {
        // Initialize supernova animations for demo cards
        const elements = document.querySelectorAll('[data-demo="supernova"] .supernova-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initSupernova(element, { explosionForce: 100, particleCount: 30 });
            });
        }
    }
    
    initAsteroidAnimations() {
        // Initialize asteroid animations for demo cards
        const elements = document.querySelectorAll('[data-demo="asteroids"] .asteroid-field');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initAsteroidField(element, { asteroidCount: 15, fieldSize: 200 });
            });
        }
    }
    
    initCosmicRayAnimations() {
        // Initialize cosmic ray animations for demo cards
        const elements = document.querySelectorAll('[data-demo="cosmic-ray"] .cosmic-ray-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initCosmicRay(element, { rayCount: 5, speed: 2 });
            });
        }
    }
    
    initDwarfPlanetAnimations() {
        // Initialize dwarf planet animations for demo cards
        const elements = document.querySelectorAll('[data-demo="dwarf-planet"] .dwarf-planet-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initDwarfPlanet(element, { rotationSpeed: 0.01 });
            });
        }
    }
    
    initNebulaAnimations() {
        // Initialize nebula animations for demo cards
        const elements = document.querySelectorAll('[data-demo="nebula"] .nebula-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initNebula(element, { particleCount: 30, cloudSize: 80 });
            });
        }
    }
    
    initBinaryStarAnimations() {
        // Initialize binary star animations for demo cards
        const elements = document.querySelectorAll('[data-demo="binary-stars"] .binary-stars-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initBinaryStars(element, { orbitSpeed: 0.01, starSize: 12 });
            });
        }
    }
    
    initCosmicDustAnimations() {
        // Initialize cosmic dust animations for demo cards
        const elements = document.querySelectorAll('[data-demo="cosmic-dust"] .cosmic-dust-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initCosmicDust(element, { particleCount: 50, driftSpeed: 0.005 });
            });
        }
    }
    
    initTimeDilationAnimations() {
        // Initialize time dilation animations for demo cards
        const elements = document.querySelectorAll('[data-demo="time-dilation"] .time-dilation-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initTimeDilation(element, { dilationFactor: 0.5, clockSpeed: 0.01 });
            });
        }
    }
    
    initQuantumTunnelingAnimations() {
        // Initialize quantum tunneling animations for demo cards
        const elements = document.querySelectorAll('[data-demo="quantum-tunneling"] .quantum-tunneling-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initQuantumTunneling(element, { barrierHeight: 50, particleSpeed: 2 });
            });
        }
    }
    
    initCMBAnimations() {
        // Initialize CMB animations for demo cards
        const elements = document.querySelectorAll('[data-demo="cmb"] .cmb-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initCMB(element, { patternSize: 20, noiseLevel: 0.1 });
            });
        }
    }
    
    initGravitationalWaveAnimations() {
        // Initialize gravitational wave animations for demo cards
        const elements = document.querySelectorAll('[data-demo="gravitational-waves"] .gravitational-waves-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initGravitationalWaves(element, { waveCount: 3, waveSpeed: 2 });
            });
        }
    }
    
    initDarkMatterAnimations() {
        // Initialize dark matter animations for demo cards
        const elements = document.querySelectorAll('[data-demo="dark-matter"] .dark-matter-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initDarkMatter(element, { fieldStrength: 0.5, fieldRadius: 80 });
            });
        }
    }
    
    initSolarWindAnimations() {
        // Initialize solar wind animations for demo cards
        const elements = document.querySelectorAll('[data-demo="solar-wind"] .solar-wind-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initSolarWind(element, { particleCount: 20, windSpeed: 3 });
            });
        }
    }
    
    initCosmicStringAnimations() {
        // Initialize cosmic string animations for demo cards
        const elements = document.querySelectorAll('[data-demo="cosmic-strings"] .cosmic-strings-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initCosmicStrings(element, { stringCount: 3, vibrationSpeed: 0.02 });
            });
        }
    }
    
    initHawkingRadiationAnimations() {
        // Initialize Hawking radiation animations for demo cards
        const elements = document.querySelectorAll('[data-demo="hawking-radiation"] .hawking-radiation-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initHawkingRadiation(element, { radiationRate: 5, particleEnergy: 2 });
            });
        }
    }
    
    initCosmicInflationAnimations() {
        // Initialize cosmic inflation animations for demo cards
        const elements = document.querySelectorAll('[data-demo="cosmic-inflation"] .cosmic-inflation-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initCosmicInflation(element, { expansionRate: 0.1, fieldStrength: 0.8 });
            });
        }
    }
    
    initMultiverseAnimations() {
        // Initialize multiverse animations for demo cards
        const elements = document.querySelectorAll('[data-demo="multiverse"] .multiverse-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initMultiverse(element, { universeCount: 3, bubbleSize: 40 });
            });
        }
    }

    initNeutronStarAnimations() {
        // Initialize neutron star animations for demo cards
        const elements = document.querySelectorAll('[data-demo="neutron-star"] .neutron-star-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initNeutronStar(element, { rotationSpeed: 0.005 });
            });
        }
    }

    initQuasarAnimations() {
        // Initialize quasar animations for demo cards
        const elements = document.querySelectorAll('[data-demo="quasar"] .quasar-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initQuasar(element, { accretionRate: 0.01 });
            });
        }
    }

    initDarkEnergyAnimations() {
        // Initialize dark energy animations for demo cards
        const elements = document.querySelectorAll('[data-demo="dark-energy"] .dark-energy-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initDarkEnergy(element, { expansionRate: 0.005 });
            });
        }
    }

    initCosmicMicrowaveAnimations() {
        // Initialize cosmic microwave background animations for demo cards
        const elements = document.querySelectorAll('[data-demo="cmb"] .cmb-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initCMB(element, { patternSize: 20, noiseLevel: 0.1 });
            });
        }
    }

    initGravitationalLensingAnimations() {
        // Initialize gravitational lensing animations for demo cards
        const elements = document.querySelectorAll('[data-demo="gravitational-lensing"] .gravitational-lensing-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initGravitationalLensing(element, { lensingStrength: 0.5 });
            });
        }
    }

    initSpacetimeCurvatureAnimations() {
        // Initialize spacetime curvature animations for demo cards
        const elements = document.querySelectorAll('[data-demo="spacetime-curvature"] .spacetime-curvature-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initSpacetimeCurvature(element, { curvatureRadius: 100 });
            });
        }
    }

    initQuantumEntanglementAnimations() {
        // Initialize quantum entanglement animations for demo cards
        const elements = document.querySelectorAll('[data-demo="quantum-entanglement"] .quantum-entanglement-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initQuantumEntanglement(element, { entanglementStrength: 0.8 });
            });
        }
    }

    initCosmicRayBurstAnimations() {
        // Initialize cosmic ray burst animations for demo cards
        const elements = document.querySelectorAll('[data-demo="cosmic-ray-burst"] .cosmic-ray-burst-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initCosmicRayBurst(element, { burstDuration: 2, particleCount: 50 });
            });
        }
    }

    initSolarFlareAnimations() {
        // Initialize solar flare animations for demo cards
        const elements = document.querySelectorAll('[data-demo="solar-flare"] .solar-flare-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initSolarFlare(element, { flareDuration: 1, particleCount: 10 });
            });
        }
    }

    initAsteroidImpactAnimations() {
        // Initialize asteroid impact animations for demo cards
        const elements = document.querySelectorAll('[data-demo="asteroid-impact"] .asteroid-impact-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initAsteroidImpact(element, { impactSpeed: 10, particleCount: 100 });
            });
        }
    }

    initSpiralGalaxyAnimations() {
        // Initialize spiral galaxy animations for demo cards
        const elements = document.querySelectorAll('[data-demo="spiral-galaxy"] .spiral-galaxy-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initSpiralGalaxy(element, { spiralSpeed: 0.01 });
            });
        }
    }

    initCosmicVortexAnimations() {
        // Initialize cosmic vortex animations for demo cards
        const elements = document.querySelectorAll('[data-demo="cosmic-vortex"] .cosmic-vortex-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initCosmicVortex(element, { vortexStrength: 0.5 });
            });
        }
    }

    initStellarNurseryAnimations() {
        // Initialize stellar nursery animations for demo cards
        const elements = document.querySelectorAll('[data-demo="stellar-nursery"] .stellar-nursery-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initStellarNursery(element, { starBirthRate: 0.01 });
            });
        }
    }

    initQuantumFieldAnimations() {
        // Initialize quantum field animations for demo cards
        const elements = document.querySelectorAll('[data-demo="quantum-field"] .quantum-field-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initQuantumField(element, { fieldStrength: 0.5 });
            });
        }
    }

    initDarkMatterWebAnimations() {
        // Initialize dark matter web animations for demo cards
        const elements = document.querySelectorAll('[data-demo="dark-matter-web"] .dark-matter-web-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initDarkMatterWeb(element, { webStrength: 0.5 });
            });
        }
    }

    initNeutronStarCollisionAnimations() {
        // Initialize neutron star collision animations for demo cards
        const elements = document.querySelectorAll('[data-demo="neutron-star-collision"] .neutron-star-collision-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initNeutronStarCollision(element, { collisionSpeed: 10 });
            });
        }
    }

    initCosmicStormAnimations() {
        // Initialize cosmic storm animations for demo cards
        const elements = document.querySelectorAll('[data-demo="cosmic-storm"] .cosmic-storm-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initCosmicStorm(element, { stormDuration: 10, particleCount: 100 });
            });
        }
    }

    initInterstellarTravelAnimations() {
        // Initialize interstellar travel animations for demo cards
        const elements = document.querySelectorAll('[data-demo="interstellar-travel"] .interstellar-travel-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initInterstellarTravel(element, { travelDuration: 10, distance: 100 });
            });
        }
    }

    initBlackHoleMergerAnimations() {
        // Initialize black hole merger animations for demo cards
        const elements = document.querySelectorAll('[data-demo="black-hole-merger"] .black-hole-merger-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initBlackHoleMerger(element, { mergerSpeed: 10 });
            });
        }
    }

    initCosmicSymphonyAnimations() {
        // Initialize cosmic symphony animations for demo cards
        const elements = document.querySelectorAll('[data-demo="cosmic-symphony"] .cosmic-symphony-animation');
        if (elements.length > 0 && this.animations) {
            elements.forEach(element => {
                this.animations.initCosmicSymphony(element, { symphonyDuration: 10, noteCount: 10 });
            });
        }
    }
}

// Initialize GalaxyJS when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.galaxy = new GalaxyJS({
        debug: true,
        autoInit: true
    });
    
    // Add global utility functions
    window.scrollToSection = (sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    // Add modal close functionality
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal-overlay')) {
            const modal = e.target.closest('.modal-overlay');
            if (modal) {
                modal.remove();
            }
        }
    });
    
    // Add copy code functionality to global scope
    window.copyCode = (demoType) => {
        if (window.galaxy) {
            const code = window.galaxy.getDemoCode(demoType);
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(code).then(() => {
                    window.galaxy.showNotification('Code copied to clipboard!', 'success');
                }).catch(() => {
                    window.galaxy.showNotification('Failed to copy code', 'error');
                });
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = code;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    window.galaxy.showNotification('Code copied to clipboard!', 'success');
                } catch (err) {
                    window.galaxy.showNotification('Failed to copy code', 'error');
                }
                
                document.body.removeChild(textArea);
            }
        }
    };
    
    // Add test function for debugging
    window.testAnimations = () => {
        console.log('Testing animations...');
        if (window.galaxy && window.galaxy.animations) {
            console.log('GalaxyJS animations system is available');
            
            // Test black hole animation
            const blackHoleElement = document.querySelector('[data-demo="blackhole"] .black-hole-animation');
            if (blackHoleElement) {
                console.log('Testing black hole animation...');
                window.galaxy.animations.initBlackHole(blackHoleElement, { eventHorizon: true, accretionDisk: true });
            }
            
            // Test pulsar animation
            const pulsarElement = document.querySelector('[data-demo="pulsar"] .pulsar-animation');
            if (pulsarElement) {
                console.log('Testing pulsar animation...');
                window.galaxy.animations.initPulsar(pulsarElement, { frequency: 2, intensity: 0.8 });
            }
        } else {
            console.error('GalaxyJS animations system not available');
        }
    };
    
    // Add status check function
    window.checkAnimationStatus = () => {
        if (window.galaxy) {
            return window.galaxy.checkAnimationStatus();
        } else {
            console.error('GalaxyJS not available');
            return null;
        }
    };
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GalaxyJS;
} 