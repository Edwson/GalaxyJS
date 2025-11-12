/**
 * Complete Animation Implementations
 * Every animation has a full working implementation with visible effects
 */

class CompleteAnimations {
    constructor() {
        this.animations = new Map();
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initAllAnimations());
        } else {
            this.initAllAnimations();
        }
    }

    initAllAnimations() {
        console.log('[CompleteAnimations] Initializing all animations...');

        // Initialize each animation type
        this.initPulsarAnimations();
        this.initBlackHoleAnimations();
        this.initWormholeAnimations();
        this.initSupernovaAnimations();
        this.initAsteroidAnimations();
        this.initCosmicRayAnimations();
        this.initDwarfPlanetAnimations();
        this.initNebulaAnimations();
        this.initBinaryStarsAnimations();
        this.initCosmicDustAnimations();
        this.initTimeDilationAnimations();
        this.initQuantumTunnelingAnimations();
        this.initCMBAnimations();
        this.initGravitationalWavesAnimations();
        this.initDarkMatterAnimations();
        this.initSolarWindAnimations();
        this.initCosmicStringsAnimations();
        this.initHawkingRadiationAnimations();
        this.initCosmicInflationAnimations();
        this.initMultiverseAnimations();
        this.initNeutronStarAnimations();
        this.initQuasarAnimations();
        this.initDarkEnergyAnimations();
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

        console.log('[CompleteAnimations] All animations initialized!');
    }

    // 1. PULSAR - Pulsating neutron star
    initPulsarAnimations() {
        document.querySelectorAll('.pulsar-animation').forEach(container => {
            const createPulse = () => {
                const wave = document.createElement('div');
                wave.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(100, 200, 255, 0.8);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                `;
                container.appendChild(wave);

                let scale = 1;
                let opacity = 0.8;
                const animate = () => {
                    scale += 0.08;
                    opacity -= 0.016;
                    wave.style.transform = `translate(-50%, -50%) scale(${scale})`;
                    wave.style.opacity = opacity;
                    wave.style.borderColor = `rgba(100, 200, 255, ${opacity})`;

                    if (opacity > 0) {
                        requestAnimationFrame(animate);
                    } else {
                        wave.remove();
                    }
                };
                animate();
            };

            // Create pulses continuously
            setInterval(createPulse, 600);
            createPulse();
        });
    }

    // 2. BLACK HOLE - Spiraling particles
    initBlackHoleAnimations() {
        document.querySelectorAll('.blackhole-animation').forEach(container => {
            const createParticle = () => {
                const particle = document.createElement('div');
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 40;
                const startX = Math.cos(angle) * distance;
                const startY = Math.sin(angle) * distance;

                particle.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: rgba(255, 200, 100, 0.9);
                    border-radius: 50%;
                    left: 50%;
                    top: 50%;
                    transform: translate(${startX}px, ${startY}px);
                    pointer-events: none;
                    box-shadow: 0 0 4px rgba(255, 200, 100, 0.8);
                `;
                container.appendChild(particle);

                let progress = 0;
                const duration = 3000;
                const startTime = Date.now();

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    progress = elapsed / duration;

                    if (progress < 1) {
                        const currentDistance = distance * (1 - progress);
                        const rotation = angle + progress * Math.PI * 4;
                        const x = Math.cos(rotation) * currentDistance;
                        const y = Math.sin(rotation) * currentDistance;
                        const scale = 1 - progress * 0.8;
                        const opacity = 1 - progress;

                        particle.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
                        particle.style.opacity = opacity;
                        requestAnimationFrame(animate);
                    } else {
                        particle.remove();
                    }
                };
                animate();
            };

            setInterval(createParticle, 100);
        });
    }

    // 3. WORMHOLE - Expanding rings
    initWormholeAnimations() {
        document.querySelectorAll('.wormhole-animation').forEach(container => {
            const createRing = () => {
                const ring = document.createElement('div');
                ring.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 10px;
                    height: 10px;
                    border: 2px solid rgba(150, 100, 255, 0.7);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                `;
                container.appendChild(ring);

                let scale = 1;
                let opacity = 0.7;
                const animate = () => {
                    scale += 0.12;
                    opacity -= 0.014;
                    ring.style.transform = `translate(-50%, -50%) scale(${scale})`;
                    ring.style.opacity = opacity;

                    if (opacity > 0) {
                        requestAnimationFrame(animate);
                    } else {
                        ring.remove();
                    }
                };
                animate();
            };

            setInterval(createRing, 250);
        });
    }

    // 4. SUPERNOVA - Explosive burst
    initSupernovaAnimations() {
        document.querySelectorAll('.supernova-animation').forEach(container => {
            const createBurst = () => {
                const count = 12;
                for (let i = 0; i < count; i++) {
                    const particle = document.createElement('div');
                    const angle = (Math.PI * 2 * i) / count;
                    const speed = 100 + Math.random() * 50;

                    particle.style.cssText = `
                        position: absolute;
                        width: 4px;
                        height: 4px;
                        background: rgba(255, ${150 + Math.random() * 100}, 50, 0.9);
                        border-radius: 50%;
                        left: 50%;
                        top: 50%;
                        pointer-events: none;
                        box-shadow: 0 0 6px rgba(255, 200, 50, 0.8);
                    `;
                    container.appendChild(particle);

                    let progress = 0;
                    const duration = 1500;
                    const startTime = Date.now();

                    const animate = () => {
                        const elapsed = Date.now() - startTime;
                        progress = elapsed / duration;

                        if (progress < 1) {
                            const distance = speed * progress;
                            const x = Math.cos(angle) * distance;
                            const y = Math.sin(angle) * distance;
                            const opacity = 1 - progress;
                            const scale = 1 + progress * 0.5;

                            particle.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
                            particle.style.opacity = opacity;
                            requestAnimationFrame(animate);
                        } else {
                            particle.remove();
                        }
                    };
                    animate();
                }
            };

            setInterval(createBurst, 2000);
            createBurst();
        });
    }

    // 5. ASTEROID - Falling rocks
    initAsteroidAnimations() {
        document.querySelectorAll('.asteroid-animation').forEach(container => {
            const createAsteroid = () => {
                const asteroid = document.createElement('div');
                const size = 6 + Math.random() * 10;
                const startX = Math.random() * 100;

                asteroid.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    background: rgba(150, 150, 150, 0.8);
                    border-radius: 30%;
                    left: ${startX}%;
                    top: -20px;
                    pointer-events: none;
                `;
                container.appendChild(asteroid);

                let y = -20;
                let rotation = 0;
                const speed = 2 + Math.random() * 2;

                const animate = () => {
                    y += speed;
                    rotation += 5;
                    asteroid.style.top = y + 'px';
                    asteroid.style.transform = `rotate(${rotation}deg)`;

                    if (y < container.offsetHeight + 20) {
                        requestAnimationFrame(animate);
                    } else {
                        asteroid.remove();
                    }
                };
                animate();
            };

            setInterval(createAsteroid, 800);
        });
    }

    // 6. COSMIC RAY - Light streaks
    initCosmicRayAnimations() {
        document.querySelectorAll('.cosmic-ray-animation').forEach(container => {
            const createRay = () => {
                const ray = document.createElement('div');
                const length = 30 + Math.random() * 40;
                const angle = Math.random() * 360;
                const x = Math.random() * 100;
                const y = Math.random() * 100;

                ray.style.cssText = `
                    position: absolute;
                    width: 2px;
                    height: ${length}px;
                    background: linear-gradient(to bottom,
                        rgba(255, 255, 255, 0),
                        rgba(255, 255, 255, 0.9),
                        rgba(255, 255, 255, 0)
                    );
                    left: ${x}%;
                    top: ${y}%;
                    transform: rotate(${angle}deg);
                    pointer-events: none;
                    opacity: 0;
                `;
                container.appendChild(ray);

                let opacity = 0;
                let phase = 0;
                const animate = () => {
                    phase += 0.08;
                    opacity = Math.sin(phase) * 0.8;
                    ray.style.opacity = Math.max(0, opacity);

                    if (phase < Math.PI) {
                        requestAnimationFrame(animate);
                    } else {
                        ray.remove();
                    }
                };
                animate();
            };

            setInterval(createRay, 400);
        });
    }

    // 7. DWARF PLANET - Orbiting small planet
    initDwarfPlanetAnimations() {
        document.querySelectorAll('.dwarf-planet-animation').forEach(container => {
            const planet = document.createElement('div');
            planet.style.cssText = `
                position: absolute;
                width: 12px;
                height: 12px;
                background: radial-gradient(circle, rgba(200, 150, 100, 1), rgba(150, 100, 80, 0.8));
                border-radius: 50%;
                pointer-events: none;
            `;
            container.appendChild(planet);

            let angle = 0;
            const radius = 40;
            const animate = () => {
                angle += 0.02;
                const x = 50 + Math.cos(angle) * radius;
                const y = 50 + Math.sin(angle) * radius;
                planet.style.left = x + '%';
                planet.style.top = y + '%';
                requestAnimationFrame(animate);
            };
            animate();
        });
    }

    // 8. NEBULA - Colorful clouds
    initNebulaAnimations() {
        document.querySelectorAll('.nebula-animation').forEach(container => {
            const createCloud = () => {
                const cloud = document.createElement('div');
                const size = 40 + Math.random() * 60;
                const hue = 200 + Math.random() * 80;
                const x = Math.random() * 100;
                const y = Math.random() * 100;

                cloud.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    background: radial-gradient(circle,
                        hsla(${hue}, 70%, 60%, 0.4),
                        transparent
                    );
                    border-radius: 50%;
                    left: ${x}%;
                    top: ${y}%;
                    filter: blur(8px);
                    pointer-events: none;
                    opacity: 0;
                `;
                container.appendChild(cloud);

                let opacity = 0;
                let scale = 0.8;
                let progress = 0;

                const animate = () => {
                    progress += 0.008;
                    opacity = Math.sin(progress * Math.PI) * 0.6;
                    scale = 0.8 + Math.sin(progress * Math.PI) * 0.4;
                    cloud.style.opacity = opacity;
                    cloud.style.transform = `scale(${scale})`;

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        cloud.remove();
                    }
                };
                animate();
            };

            setInterval(createCloud, 1200);
        });
    }

    // 9. BINARY STARS - Two orbiting stars
    initBinaryStarsAnimations() {
        document.querySelectorAll('.binary-stars-animation').forEach(container => {
            const star1 = document.createElement('div');
            const star2 = document.createElement('div');

            star1.style.cssText = `
                position: absolute;
                width: 16px;
                height: 16px;
                background: radial-gradient(circle, rgba(255, 200, 100, 1), rgba(255, 150, 50, 0.6));
                border-radius: 50%;
                box-shadow: 0 0 12px rgba(255, 200, 100, 0.8);
                pointer-events: none;
            `;

            star2.style.cssText = `
                position: absolute;
                width: 12px;
                height: 12px;
                background: radial-gradient(circle, rgba(150, 200, 255, 1), rgba(100, 150, 255, 0.6));
                border-radius: 50%;
                box-shadow: 0 0 10px rgba(150, 200, 255, 0.8);
                pointer-events: none;
            `;

            container.appendChild(star1);
            container.appendChild(star2);

            let angle = 0;
            const radius = 35;
            const animate = () => {
                angle += 0.03;
                const x1 = 50 + Math.cos(angle) * radius;
                const y1 = 50 + Math.sin(angle) * radius;
                const x2 = 50 + Math.cos(angle + Math.PI) * radius;
                const y2 = 50 + Math.sin(angle + Math.PI) * radius;

                star1.style.left = x1 + '%';
                star1.style.top = y1 + '%';
                star2.style.left = x2 + '%';
                star2.style.top = y2 + '%';

                requestAnimationFrame(animate);
            };
            animate();
        });
    }

    // 10. COSMIC DUST - Floating particles
    initCosmicDustAnimations() {
        document.querySelectorAll('.cosmic-dust-animation').forEach(container => {
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                const size = 1 + Math.random() * 2;
                const x = Math.random() * 100;
                const y = Math.random() * 100;
                const duration = 3000 + Math.random() * 2000;

                particle.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    background: rgba(200, 200, 255, 0.6);
                    border-radius: 50%;
                    left: ${x}%;
                    top: ${y}%;
                    pointer-events: none;
                `;
                container.appendChild(particle);

                const animate = () => {
                    const startTime = Date.now();
                    const startY = parseFloat(particle.style.top);
                    const drift = Math.random() * 20 - 10;

                    const move = () => {
                        const elapsed = Date.now() - startTime;
                        const progress = (elapsed % duration) / duration;
                        const newY = (startY + progress * 100) % 100;
                        const newX = parseFloat(particle.style.left) + Math.sin(progress * Math.PI * 4) * 0.2;

                        particle.style.top = newY + '%';
                        particle.style.left = newX + '%';
                        particle.style.opacity = 0.3 + Math.sin(progress * Math.PI * 2) * 0.3;

                        requestAnimationFrame(move);
                    };
                    move();
                };
                animate();
            }
        });
    }

    // 11. TIME DILATION - Warping clock
    initTimeDilationAnimations() {
        document.querySelectorAll('.time-dilation-animation').forEach(container => {
            const clock = document.createElement('div');
            clock.style.cssText = `
                position: absolute;
                width: 40px;
                height: 40px;
                border: 3px solid rgba(100, 200, 255, 0.7);
                border-radius: 50%;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
            `;
            container.appendChild(clock);

            const hand = document.createElement('div');
            hand.style.cssText = `
                position: absolute;
                width: 2px;
                height: 15px;
                background: rgba(100, 200, 255, 0.9);
                left: 50%;
                top: 50%;
                transform-origin: bottom center;
                transform: translate(-50%, -100%);
            `;
            clock.appendChild(hand);

            let rotation = 0;
            let warp = 1;
            let warpDir = 0.01;

            const animate = () => {
                rotation += 4;
                warp += warpDir;
                if (warp > 1.3 || warp < 0.7) warpDir *= -1;

                hand.style.transform = `translate(-50%, -100%) rotate(${rotation}deg)`;
                clock.style.transform = `translate(-50%, -50%) scaleX(${warp})`;
                requestAnimationFrame(animate);
            };
            animate();
        });
    }

    // 12. QUANTUM TUNNELING - Particle phasing through barrier
    initQuantumTunnelingAnimations() {
        document.querySelectorAll('.quantum-tunneling-animation').forEach(container => {
            const createParticle = () => {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background: rgba(200, 100, 255, 0.9);
                    border-radius: 50%;
                    left: 10%;
                    top: 50%;
                    transform: translateY(-50%);
                    pointer-events: none;
                    box-shadow: 0 0 10px rgba(200, 100, 255, 0.8);
                `;
                container.appendChild(particle);

                let x = 10;
                let opacity = 1;
                const animate = () => {
                    x += 0.8;
                    // Phase through barrier (center area)
                    if (x > 45 && x < 55) {
                        opacity = 0.2;
                    } else {
                        opacity = 1;
                    }

                    particle.style.left = x + '%';
                    particle.style.opacity = opacity;

                    if (x < 90) {
                        requestAnimationFrame(animate);
                    } else {
                        particle.remove();
                    }
                };
                animate();
            };

            setInterval(createParticle, 2000);
            createParticle();
        });
    }

    // 13-40: Additional animations (continuing with same pattern)
    // I'll create the rest in a similar comprehensive way...

    initCMBAnimations() {
        document.querySelectorAll('.cmb-animation, .cosmic-microwave-animation').forEach(container => {
            // Create static-like noise pattern
            for (let i = 0; i < 30; i++) {
                const noise = document.createElement('div');
                const size = 2 + Math.random() * 3;
                const x = Math.random() * 100;
                const y = Math.random() * 100;
                const hue = 30 + Math.random() * 60;

                noise.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    background: hsla(${hue}, 60%, 50%, 0.4);
                    border-radius: 50%;
                    left: ${x}%;
                    top: ${y}%;
                    filter: blur(2px);
                    pointer-events: none;
                `;
                container.appendChild(noise);

                const flicker = () => {
                    noise.style.opacity = 0.2 + Math.random() * 0.6;
                    setTimeout(flicker, 100 + Math.random() * 200);
                };
                flicker();
            }
        });
    }

    initGravitationalWavesAnimations() {
        document.querySelectorAll('.gravitational-waves-animation').forEach(container => {
            const createWave = (delay) => {
                setTimeout(() => {
                    const wave = document.createElement('div');
                    wave.style.cssText = `
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 20px;
                        height: 20px;
                        border: 2px solid rgba(100, 255, 200, 0.6);
                        border-radius: 50%;
                        transform: translate(-50%, -50%);
                        pointer-events: none;
                    `;
                    container.appendChild(wave);

                    let scale = 1;
                    let opacity = 0.6;
                    const animate = () => {
                        scale += 0.06;
                        opacity -= 0.012;
                        wave.style.transform = `translate(-50%, -50%) scale(${scale})`;
                        wave.style.opacity = opacity;

                        if (opacity > 0) {
                            requestAnimationFrame(animate);
                        } else {
                            wave.remove();
                        }
                    };
                    animate();
                    createWave(800);
                }, delay);
            };
            createWave(0);
        });
    }

    initDarkMatterAnimations() {
        document.querySelectorAll('.dark-matter-animation').forEach(container => {
            for (let i = 0; i < 15; i++) {
                const particle = document.createElement('div');
                const x = Math.random() * 100;
                const y = Math.random() * 100;

                particle.style.cssText = `
                    position: absolute;
                    width: 3px;
                    height: 3px;
                    background: rgba(50, 50, 100, 0.5);
                    border-radius: 50%;
                    left: ${x}%;
                    top: ${y}%;
                    filter: blur(1px);
                    pointer-events: none;
                `;
                container.appendChild(particle);

                let opacity = 0.5;
                let dir = 0.01;
                const animate = () => {
                    opacity += dir;
                    if (opacity > 0.8 || opacity < 0.2) dir *= -1;
                    particle.style.opacity = opacity;
                    requestAnimationFrame(animate);
                };
                animate();
            }
        });
    }

    initSolarWindAnimations() {
        document.querySelectorAll('.solar-wind-animation').forEach(container => {
            const createParticle = () => {
                const particle = document.createElement('div');
                const y = 20 + Math.random() * 60;

                particle.style.cssText = `
                    position: absolute;
                    width: 3px;
                    height: 3px;
                    background: rgba(255, 200, 100, 0.7);
                    border-radius: 50%;
                    left: 0%;
                    top: ${y}%;
                    pointer-events: none;
                `;
                container.appendChild(particle);

                let x = 0;
                const speed = 2 + Math.random();
                const animate = () => {
                    x += speed;
                    particle.style.left = x + '%';

                    if (x < 100) {
                        requestAnimationFrame(animate);
                    } else {
                        particle.remove();
                    }
                };
                animate();
            };

            setInterval(createParticle, 150);
        });
    }

    initCosmicStringsAnimations() {
        document.querySelectorAll('.cosmic-strings-animation').forEach(container => {
            for (let i = 0; i < 3; i++) {
                const string = document.createElement('div');
                const angle = (i * 60) + 30;

                string.style.cssText = `
                    position: absolute;
                    width: 2px;
                    height: 80%;
                    background: linear-gradient(
                        to bottom,
                        transparent,
                        rgba(255, 100, 255, 0.6),
                        transparent
                    );
                    left: 50%;
                    top: 10%;
                    transform-origin: center;
                    transform: translateX(-50%) rotate(${angle}deg);
                    pointer-events: none;
                `;
                container.appendChild(string);

                let rotation = angle;
                const animate = () => {
                    rotation += 0.5;
                    string.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
                    requestAnimationFrame(animate);
                };
                animate();
            }
        });
    }

    initHawkingRadiationAnimations() {
        document.querySelectorAll('.hawking-radiation-animation').forEach(container => {
            // Central black hole
            const blackHole = document.createElement('div');
            blackHole.style.cssText = `
                position: absolute;
                width: 20px;
                height: 20px;
                background: #000;
                border-radius: 50%;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 15px rgba(100, 100, 255, 0.5);
                pointer-events: none;
            `;
            container.appendChild(blackHole);

            // Emit radiation particles
            const createRadiation = () => {
                const particle = document.createElement('div');
                const angle = Math.random() * Math.PI * 2;

                particle.style.cssText = `
                    position: absolute;
                    width: 2px;
                    height: 2px;
                    background: rgba(200, 200, 255, 0.8);
                    border-radius: 50%;
                    left: 50%;
                    top: 50%;
                    pointer-events: none;
                `;
                container.appendChild(particle);

                let distance = 10;
                const animate = () => {
                    distance += 1.5;
                    const x = Math.cos(angle) * distance;
                    const y = Math.sin(angle) * distance;
                    particle.style.transform = `translate(${x}px, ${y}px)`;
                    particle.style.opacity = 1 - (distance / 60);

                    if (distance < 60) {
                        requestAnimationFrame(animate);
                    } else {
                        particle.remove();
                    }
                };
                animate();
            };

            setInterval(createRadiation, 200);
        });
    }

    initCosmicInflationAnimations() {
        document.querySelectorAll('.cosmic-inflation-animation').forEach(container => {
            const bubble = document.createElement('div');
            bubble.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                border: 2px solid rgba(255, 100, 200, 0.6);
                border-radius: 50%;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
            `;
            container.appendChild(bubble);

            let scale = 1;
            const animate = () => {
                scale += 0.02;
                if (scale > 8) scale = 1;
                bubble.style.transform = `translate(-50%, -50%) scale(${scale})`;
                bubble.style.opacity = 1 - (scale / 8);
                requestAnimationFrame(animate);
            };
            animate();
        });
    }

    initMultiverseAnimations() {
        document.querySelectorAll('.multiverse-animation').forEach(container => {
            for (let i = 0; i < 5; i++) {
                const universe = document.createElement('div');
                const x = 20 + (i * 15);
                const y = 30 + Math.random() * 40;
                const hue = i * 60;

                universe.style.cssText = `
                    position: absolute;
                    width: 25px;
                    height: 25px;
                    background: radial-gradient(circle,
                        hsla(${hue}, 70%, 60%, 0.6),
                        transparent
                    );
                    border-radius: 50%;
                    left: ${x}%;
                    top: ${y}%;
                    filter: blur(3px);
                    pointer-events: none;
                `;
                container.appendChild(universe);

                let scale = 0.8;
                let dir = 0.01;
                const animate = () => {
                    scale += dir;
                    if (scale > 1.2 || scale < 0.8) dir *= -1;
                    universe.style.transform = `scale(${scale})`;
                    requestAnimationFrame(animate);
                };
                animate();
            }
        });
    }

    // Continue with remaining animations...
    initNeutronStarAnimations() {
        document.querySelectorAll('.neutron-star-animation').forEach(container => {
            const star = document.createElement('div');
            star.style.cssText = `
                position: absolute;
                width: 20px;
                height: 20px;
                background: radial-gradient(circle, rgba(200, 220, 255, 1), rgba(150, 180, 255, 0.6));
                border-radius: 50%;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 20px rgba(200, 220, 255, 0.9);
                pointer-events: none;
            `;
            container.appendChild(star);

            let pulse = 1;
            let dir = 0.02;
            const animate = () => {
                pulse += dir;
                if (pulse > 1.3 || pulse < 1) dir *= -1;
                star.style.transform = `translate(-50%, -50%) scale(${pulse})`;
                requestAnimationFrame(animate);
            };
            animate();
        });
    }

    initQuasarAnimations() {
        document.querySelectorAll('.quasar-animation').forEach(container => {
            // Create bright core
            const core = document.createElement('div');
            core.style.cssText = `
                position: absolute;
                width: 15px;
                height: 15px;
                background: radial-gradient(circle, rgba(255, 255, 255, 1), rgba(100, 200, 255, 0.6));
                border-radius: 50%;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 25px rgba(255, 255, 255, 0.9);
                pointer-events: none;
            `;
            container.appendChild(core);

            // Create jets
            const createJet = (angle) => {
                const jet = document.createElement('div');
                jet.style.cssText = `
                    position: absolute;
                    width: 3px;
                    height: 0px;
                    background: linear-gradient(to bottom,
                        rgba(100, 200, 255, 0.8),
                        transparent
                    );
                    left: 50%;
                    top: 50%;
                    transform-origin: top center;
                    transform: translate(-50%, 0) rotate(${angle}deg);
                    pointer-events: none;
                `;
                container.appendChild(jet);

                let length = 0;
                const animate = () => {
                    length += 2;
                    if (length > 60) length = 0;
                    jet.style.height = length + 'px';
                    requestAnimationFrame(animate);
                };
                animate();
            };

            createJet(0);
            createJet(180);
        });
    }

    initDarkEnergyAnimations() {
        document.querySelectorAll('.dark-energy-animation').forEach(container => {
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                const x = Math.random() * 100;
                const y = Math.random() * 100;

                particle.style.cssText = `
                    position: absolute;
                    width: 2px;
                    height: 2px;
                    background: rgba(100, 50, 150, 0.4);
                    border-radius: 50%;
                    left: ${x}%;
                    top: ${y}%;
                    filter: blur(1px);
                    pointer-events: none;
                `;
                container.appendChild(particle);

                const initialX = x;
                const initialY = y;
                let expansion = 0;

                const animate = () => {
                    expansion += 0.05;
                    const newX = initialX + Math.cos(expansion) * expansion;
                    const newY = initialY + Math.sin(expansion) * expansion;
                    particle.style.left = (newX % 100) + '%';
                    particle.style.top = (newY % 100) + '%';
                    requestAnimationFrame(animate);
                };
                animate();
            }
        });
    }

    initGravitationalLensingAnimations() {
        document.querySelectorAll('.gravitational-lensing-animation').forEach(container => {
            const lens = document.createElement('div');
            lens.style.cssText = `
                position: absolute;
                width: 30px;
                height: 30px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
            `;
            container.appendChild(lens);

            // Create light rays that bend
            for (let i = 0; i < 4; i++) {
                const ray = document.createElement('div');
                const angle = i * 90;
                ray.style.cssText = `
                    position: absolute;
                    width: 60px;
                    height: 2px;
                    background: linear-gradient(to right,
                        transparent,
                        rgba(255, 255, 200, 0.6),
                        transparent
                    );
                    left: 50%;
                    top: 50%;
                    transform-origin: center;
                    pointer-events: none;
                `;
                container.appendChild(ray);

                let rotation = angle;
                let bend = 0;
                const animate = () => {
                    rotation += 0.5;
                    bend = Math.sin(rotation * 0.05) * 20;
                    ray.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) translateY(${bend}px)`;
                    requestAnimationFrame(animate);
                };
                animate();
            }
        });
    }

    initSpacetimeCurvatureAnimations() {
        document.querySelectorAll('.spacetime-curvature-animation').forEach(container => {
            // Create grid
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 5; j++) {
                    const dot = document.createElement('div');
                    const baseX = 20 + i * 15;
                    const baseY = 20 + j * 15;

                    dot.style.cssText = `
                        position: absolute;
                        width: 3px;
                        height: 3px;
                        background: rgba(100, 200, 255, 0.5);
                        border-radius: 50%;
                        pointer-events: none;
                    `;
                    container.appendChild(dot);

                    let time = 0;
                    const animate = () => {
                        time += 0.02;
                        const distFromCenter = Math.sqrt(
                            Math.pow(i - 2, 2) + Math.pow(j - 2, 2)
                        );
                        const warp = Math.sin(time - distFromCenter * 0.5) * 10;
                        dot.style.left = (baseX + warp) + '%';
                        dot.style.top = (baseY + warp * 0.5) + '%';
                        requestAnimationFrame(animate);
                    };
                    animate();
                }
            }
        });
    }

    initQuantumEntanglementAnimations() {
        document.querySelectorAll('.quantum-entanglement-animation').forEach(container => {
            const particle1 = document.createElement('div');
            const particle2 = document.createElement('div');

            const particleStyle = `
                position: absolute;
                width: 10px;
                height: 10px;
                background: rgba(255, 100, 255, 0.8);
                border-radius: 50%;
                box-shadow: 0 0 10px rgba(255, 100, 255, 0.8);
                pointer-events: none;
            `;

            particle1.style.cssText = particleStyle;
            particle2.style.cssText = particleStyle;
            container.appendChild(particle1);
            container.appendChild(particle2);

            let angle = 0;
            const animate = () => {
                angle += 0.05;
                const x1 = 50 + Math.cos(angle) * 30;
                const y1 = 50 + Math.sin(angle) * 30;
                const x2 = 50 + Math.cos(angle + Math.PI) * 30;
                const y2 = 50 + Math.sin(angle + Math.PI) * 30;

                particle1.style.left = x1 + '%';
                particle1.style.top = y1 + '%';
                particle2.style.left = x2 + '%';
                particle2.style.top = y2 + '%';

                // Draw connection line
                const line = container.querySelector('.entanglement-line');
                if (line) line.remove();

                const connectionLine = document.createElement('div');
                const dx = x2 - x1;
                const dy = y2 - y1;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angleRad = Math.atan2(dy, dx);

                connectionLine.className = 'entanglement-line';
                connectionLine.style.cssText = `
                    position: absolute;
                    width: ${distance}%;
                    height: 1px;
                    background: rgba(255, 100, 255, 0.3);
                    left: ${x1}%;
                    top: ${y1}%;
                    transform-origin: left center;
                    transform: rotate(${angleRad}rad);
                    pointer-events: none;
                `;
                container.appendChild(connectionLine);

                requestAnimationFrame(animate);
            };
            animate();
        });
    }

    initCosmicRayBurstAnimations() {
        document.querySelectorAll('.cosmic-ray-burst-animation').forEach(container => {
            const createBurst = () => {
                for (let i = 0; i < 8; i++) {
                    const ray = document.createElement('div');
                    const angle = (i / 8) * Math.PI * 2;
                    const length = 40 + Math.random() * 30;

                    ray.style.cssText = `
                        position: absolute;
                        width: 2px;
                        height: ${length}px;
                        background: linear-gradient(to bottom,
                            rgba(255, 255, 255, 0.9),
                            rgba(255, 200, 100, 0.4),
                            transparent
                        );
                        left: 50%;
                        top: 50%;
                        transform-origin: top center;
                        transform: translate(-50%, 0) rotate(${angle}rad);
                        pointer-events: none;
                        opacity: 0;
                    `;
                    container.appendChild(ray);

                    let opacity = 0;
                    let phase = 0;
                    const animate = () => {
                        phase += 0.1;
                        opacity = Math.sin(phase) * 0.9;
                        ray.style.opacity = Math.max(0, opacity);

                        if (phase < Math.PI) {
                            requestAnimationFrame(animate);
                        } else {
                            ray.remove();
                        }
                    };
                    animate();
                }
            };

            setInterval(createBurst, 2500);
            createBurst();
        });
    }

    initSolarFlareAnimations() {
        document.querySelectorAll('.solar-flare-animation').forEach(container => {
            const createFlare = () => {
                const flare = document.createElement('div');
                const angle = Math.random() * Math.PI * 2;
                const length = 50 + Math.random() * 40;

                flare.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: ${length}px;
                    background: linear-gradient(to bottom,
                        rgba(255, 200, 50, 1),
                        rgba(255, 100, 50, 0.6),
                        transparent
                    );
                    left: 50%;
                    top: 50%;
                    transform-origin: top center;
                    transform: translate(-50%, 0) rotate(${angle}rad);
                    pointer-events: none;
                    filter: blur(2px);
                `;
                container.appendChild(flare);

                let scale = 0;
                const animate = () => {
                    scale += 0.05;
                    flare.style.transform = `translate(-50%, 0) rotate(${angle}rad) scaleY(${scale})`;
                    flare.style.opacity = 1 - scale;

                    if (scale < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        flare.remove();
                    }
                };
                animate();
            };

            setInterval(createFlare, 1500);
        });
    }

    initAsteroidImpactAnimations() {
        document.querySelectorAll('.asteroid-impact-animation').forEach(container => {
            const createImpact = () => {
                const asteroid = document.createElement('div');
                asteroid.style.cssText = `
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    background: rgba(150, 150, 150, 0.9);
                    border-radius: 40%;
                    left: ${Math.random() * 60 + 20}%;
                    top: -20px;
                    pointer-events: none;
                `;
                container.appendChild(asteroid);

                let y = -20;
                const animate = () => {
                    y += 4;
                    asteroid.style.top = y + 'px';

                    if (y < container.offsetHeight / 2) {
                        requestAnimationFrame(animate);
                    } else {
                        // Create impact explosion
                        for (let i = 0; i < 12; i++) {
                            const debris = document.createElement('div');
                            const angle = (i / 12) * Math.PI * 2;
                            const x = parseFloat(asteroid.style.left);

                            debris.style.cssText = `
                                position: absolute;
                                width: 4px;
                                height: 4px;
                                background: rgba(255, 150, 50, 0.8);
                                border-radius: 50%;
                                left: ${x}%;
                                top: ${y}px;
                                pointer-events: none;
                            `;
                            container.appendChild(debris);

                            let dist = 0;
                            const animateDebris = () => {
                                dist += 2;
                                const dx = Math.cos(angle) * dist;
                                const dy = Math.sin(angle) * dist;
                                debris.style.transform = `translate(${dx}px, ${dy}px)`;
                                debris.style.opacity = 1 - (dist / 50);

                                if (dist < 50) {
                                    requestAnimationFrame(animateDebris);
                                } else {
                                    debris.remove();
                                }
                            };
                            animateDebris();
                        }
                        asteroid.remove();
                    }
                };
                animate();
            };

            setInterval(createImpact, 3000);
            createImpact();
        });
    }

    initSpiralGalaxyAnimations() {
        document.querySelectorAll('.spiral-galaxy-animation').forEach(container => {
            // If advanced animations available, use them
            if (window.GalaxyHelpers && window.GalaxyHelpers.createSpiralGalaxy) {
                if (!container.id) {
                    container.id = 'spiral-galaxy-' + Math.random().toString(36).substr(2, 9);
                }
                window.GalaxyHelpers.createSpiralGalaxy(container.id, {
                    numArms: 4,
                    numStars: 200
                });
            } else {
                // Fallback simple version
                for (let arm = 0; arm < 4; arm++) {
                    for (let i = 0; i < 20; i++) {
                        const star = document.createElement('div');
                        const t = i * 0.5;
                        const r = t * 3;
                        const angle = t + arm * (Math.PI / 2);

                        star.style.cssText = `
                            position: absolute;
                            width: 2px;
                            height: 2px;
                            background: rgba(255, 255, 255, 0.7);
                            border-radius: 50%;
                            pointer-events: none;
                        `;
                        container.appendChild(star);

                        let rotation = 0;
                        const animate = () => {
                            rotation += 0.01;
                            const currentAngle = angle + rotation;
                            const x = 50 + Math.cos(currentAngle) * r;
                            const y = 50 + Math.sin(currentAngle) * r;
                            star.style.left = x + '%';
                            star.style.top = y + '%';
                            requestAnimationFrame(animate);
                        };
                        animate();
                    }
                }
            }
        });
    }

    initCosmicVortexAnimations() {
        document.querySelectorAll('.cosmic-vortex-animation').forEach(container => {
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 3px;
                    height: 3px;
                    background: rgba(200, 100, 255, 0.7);
                    border-radius: 50%;
                    pointer-events: none;
                `;
                container.appendChild(particle);

                let angle = (i / 20) * Math.PI * 2;
                let radius = 5;
                const animate = () => {
                    angle += 0.05;
                    radius = 5 + Math.sin(angle * 2) * 25 + 25;
                    const x = 50 + Math.cos(angle) * radius;
                    const y = 50 + Math.sin(angle) * radius;
                    particle.style.left = x + '%';
                    particle.style.top = y + '%';
                    requestAnimationFrame(animate);
                };
                animate();
            }
        });
    }

    initStellarNurseryAnimations() {
        document.querySelectorAll('.stellar-nursery-animation').forEach(container => {
            // Create gas clouds
            for (let i = 0; i < 5; i++) {
                const cloud = document.createElement('div');
                const size = 30 + Math.random() * 40;
                const x = Math.random() * 80 + 10;
                const y = Math.random() * 80 + 10;
                const hue = 280 + Math.random() * 40;

                cloud.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    background: radial-gradient(circle,
                        hsla(${hue}, 60%, 50%, 0.4),
                        transparent
                    );
                    border-radius: 50%;
                    left: ${x}%;
                    top: ${y}%;
                    filter: blur(6px);
                    pointer-events: none;
                `;
                container.appendChild(cloud);

                // Add forming stars
                if (Math.random() > 0.5) {
                    const star = document.createElement('div');
                    star.style.cssText = `
                        position: absolute;
                        width: 4px;
                        height: 4px;
                        background: rgba(255, 255, 200, 0.9);
                        border-radius: 50%;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        box-shadow: 0 0 8px rgba(255, 255, 200, 0.8);
                        pointer-events: none;
                    `;
                    cloud.appendChild(star);

                    let brightness = 0.5;
                    let dir = 0.02;
                    const animate = () => {
                        brightness += dir;
                        if (brightness > 1 || brightness < 0.5) dir *= -1;
                        star.style.opacity = brightness;
                        requestAnimationFrame(animate);
                    };
                    animate();
                }
            }
        });
    }

    initQuantumFieldAnimations() {
        document.querySelectorAll('.quantum-field-animation').forEach(container => {
            // Create quantum fluctuations
            for (let i = 0; i < 25; i++) {
                const fluctuation = document.createElement('div');
                const x = (i % 5) * 20 + 10;
                const y = Math.floor(i / 5) * 20 + 10;

                fluctuation.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: rgba(150, 100, 255, 0.6);
                    border-radius: 50%;
                    left: ${x}%;
                    top: ${y}%;
                    pointer-events: none;
                `;
                container.appendChild(fluctuation);

                let phase = Math.random() * Math.PI * 2;
                const animate = () => {
                    phase += 0.05;
                    const intensity = (Math.sin(phase) + 1) / 2;
                    fluctuation.style.opacity = intensity * 0.8;
                    fluctuation.style.transform = `scale(${0.5 + intensity})`;
                    requestAnimationFrame(animate);
                };
                animate();
            }
        });
    }

    initDarkMatterWebAnimations() {
        document.querySelectorAll('.dark-matter-web-animation').forEach(container => {
            // Create web nodes
            const nodes = [];
            for (let i = 0; i < 8; i++) {
                const node = document.createElement('div');
                const angle = (i / 8) * Math.PI * 2;
                const radius = 35;
                const x = 50 + Math.cos(angle) * radius;
                const y = 50 + Math.sin(angle) * radius;

                node.style.cssText = `
                    position: absolute;
                    width: 5px;
                    height: 5px;
                    background: rgba(100, 50, 150, 0.7);
                    border-radius: 50%;
                    left: ${x}%;
                    top: ${y}%;
                    pointer-events: none;
                `;
                container.appendChild(node);
                nodes.push({ element: node, x, y });

                // Create connections
                for (let j = i + 1; j < Math.min(i + 3, 8); j++) {
                    const targetAngle = (j / 8) * Math.PI * 2;
                    const targetX = 50 + Math.cos(targetAngle) * radius;
                    const targetY = 50 + Math.sin(targetAngle) * radius;
                    const dx = targetX - x;
                    const dy = targetY - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const lineAngle = Math.atan2(dy, dx);

                    const line = document.createElement('div');
                    line.style.cssText = `
                        position: absolute;
                        width: ${distance}%;
                        height: 1px;
                        background: rgba(100, 50, 150, 0.3);
                        left: ${x}%;
                        top: ${y}%;
                        transform-origin: left center;
                        transform: rotate(${lineAngle}rad);
                        pointer-events: none;
                    `;
                    container.appendChild(line);
                }
            }
        });
    }

    initNeutronStarCollisionAnimations() {
        document.querySelectorAll('.neutron-star-collision-animation').forEach(container => {
            const star1 = document.createElement('div');
            const star2 = document.createElement('div');

            const starStyle = `
                position: absolute;
                width: 12px;
                height: 12px;
                background: radial-gradient(circle, rgba(200, 220, 255, 1), rgba(150, 180, 255, 0.6));
                border-radius: 50%;
                box-shadow: 0 0 15px rgba(200, 220, 255, 0.9);
                pointer-events: none;
            `;

            star1.style.cssText = starStyle;
            star2.style.cssText = starStyle;
            container.appendChild(star1);
            container.appendChild(star2);

            let distance = 60;
            let collided = false;

            const animate = () => {
                if (!collided) {
                    distance -= 0.5;
                    star1.style.left = `${50 - distance/2}%`;
                    star1.style.top = '50%';
                    star2.style.left = `${50 + distance/2}%`;
                    star2.style.top = '50%';

                    if (distance <= 0) {
                        collided = true;
                        // Create explosion
                        for (let i = 0; i < 16; i++) {
                            const particle = document.createElement('div');
                            const angle = (i / 16) * Math.PI * 2;

                            particle.style.cssText = `
                                position: absolute;
                                width: 3px;
                                height: 3px;
                                background: rgba(255, 200, 100, 0.9);
                                border-radius: 50%;
                                left: 50%;
                                top: 50%;
                                pointer-events: none;
                            `;
                            container.appendChild(particle);

                            let dist = 0;
                            const animateParticle = () => {
                                dist += 2;
                                const x = Math.cos(angle) * dist;
                                const y = Math.sin(angle) * dist;
                                particle.style.transform = `translate(${x}px, ${y}px)`;
                                particle.style.opacity = 1 - (dist / 60);

                                if (dist < 60) {
                                    requestAnimationFrame(animateParticle);
                                } else {
                                    particle.remove();
                                }
                            };
                            animateParticle();
                        }
                        star1.style.opacity = '0';
                        star2.style.opacity = '0';
                        setTimeout(() => {
                            distance = 60;
                            collided = false;
                            star1.style.opacity = '1';
                            star2.style.opacity = '1';
                        }, 2000);
                    }
                }
                requestAnimationFrame(animate);
            };
            animate();
        });
    }

    initCosmicStormAnimations() {
        document.querySelectorAll('.cosmic-storm-animation').forEach(container => {
            const createLightning = () => {
                const lightning = document.createElement('div');
                const startX = Math.random() * 100;
                const segments = 5 + Math.floor(Math.random() * 5);
                let path = `M ${startX},0 `;

                let currentX = startX;
                let currentY = 0;

                for (let i = 0; i < segments; i++) {
                    currentX += (Math.random() - 0.5) * 20;
                    currentY += 100 / segments;
                    path += `L ${currentX},${currentY} `;
                }

                lightning.innerHTML = `
                    <svg style="position: absolute; width: 100%; height: 100%; pointer-events: none;">
                        <path d="${path}"
                              stroke="rgba(200, 200, 255, 0.8)"
                              stroke-width="2"
                              fill="none"
                              filter="url(#glow)"/>
                        <defs>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                    </svg>
                `;
                container.appendChild(lightning);

                setTimeout(() => lightning.remove(), 200);
            };

            // Add storm particles
            for (let i = 0; i < 15; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 3px;
                    height: 3px;
                    background: rgba(200, 200, 255, 0.5);
                    border-radius: 50%;
                    pointer-events: none;
                `;
                container.appendChild(particle);

                let x = Math.random() * 100;
                let y = Math.random() * 100;
                let vx = (Math.random() - 0.5) * 2;
                let vy = (Math.random() - 0.5) * 2;

                const animate = () => {
                    x += vx;
                    y += vy;
                    if (x < 0 || x > 100) vx *= -1;
                    if (y < 0 || y > 100) vy *= -1;
                    particle.style.left = x + '%';
                    particle.style.top = y + '%';
                    requestAnimationFrame(animate);
                };
                animate();
            }

            setInterval(createLightning, 1000 + Math.random() * 2000);
        });
    }

    initInterstellarTravelAnimations() {
        document.querySelectorAll('.interstellar-travel-animation').forEach(container => {
            // Create star trails
            for (let i = 0; i < 20; i++) {
                const star = document.createElement('div');
                const y = Math.random() * 100;
                const speed = 2 + Math.random() * 3;
                const length = 20 + Math.random() * 30;

                star.style.cssText = `
                    position: absolute;
                    width: ${length}px;
                    height: 2px;
                    background: linear-gradient(to right,
                        transparent,
                        rgba(255, 255, 255, 0.8),
                        transparent
                    );
                    top: ${y}%;
                    left: 100%;
                    pointer-events: none;
                `;
                container.appendChild(star);

                let x = 100;
                const animate = () => {
                    x -= speed;
                    if (x < -20) x = 100;
                    star.style.left = x + '%';
                    requestAnimationFrame(animate);
                };
                animate();
            }
        });
    }

    initBlackHoleMergerAnimations() {
        document.querySelectorAll('.black-hole-merger-animation').forEach(container => {
            const bh1 = document.createElement('div');
            const bh2 = document.createElement('div');

            const bhStyle = `
                position: absolute;
                width: 15px;
                height: 15px;
                background: #000;
                border-radius: 50%;
                box-shadow: 0 0 15px rgba(100, 100, 255, 0.6);
                pointer-events: none;
            `;

            bh1.style.cssText = bhStyle;
            bh2.style.cssText = bhStyle;
            container.appendChild(bh1);
            container.appendChild(bh2);

            let angle = 0;
            let radius = 40;
            let merging = false;

            const animate = () => {
                if (!merging && radius > 0) {
                    radius -= 0.2;
                    angle += 0.1;

                    const x1 = 50 + Math.cos(angle) * radius;
                    const y1 = 50 + Math.sin(angle) * radius;
                    const x2 = 50 + Math.cos(angle + Math.PI) * radius;
                    const y2 = 50 + Math.sin(angle + Math.PI) * radius;

                    bh1.style.left = x1 + '%';
                    bh1.style.top = y1 + '%';
                    bh2.style.left = x2 + '%';
                    bh2.style.top = y2 + '%';

                    if (radius <= 0) {
                        merging = true;
                        // Create gravitational wave rings
                        for (let i = 0; i < 3; i++) {
                            setTimeout(() => {
                                const wave = document.createElement('div');
                                wave.style.cssText = `
                                    position: absolute;
                                    top: 50%;
                                    left: 50%;
                                    width: 10px;
                                    height: 10px;
                                    border: 2px solid rgba(100, 200, 255, 0.6);
                                    border-radius: 50%;
                                    transform: translate(-50%, -50%);
                                    pointer-events: none;
                                `;
                                container.appendChild(wave);

                                let scale = 1;
                                let opacity = 0.6;
                                const animateWave = () => {
                                    scale += 0.1;
                                    opacity -= 0.02;
                                    wave.style.transform = `translate(-50%, -50%) scale(${scale})`;
                                    wave.style.opacity = opacity;

                                    if (opacity > 0) {
                                        requestAnimationFrame(animateWave);
                                    } else {
                                        wave.remove();
                                    }
                                };
                                animateWave();
                            }, i * 300);
                        }

                        setTimeout(() => {
                            radius = 40;
                            merging = false;
                        }, 2000);
                    }
                }
                requestAnimationFrame(animate);
            };
            animate();
        });
    }

    initCosmicSymphonyAnimations() {
        document.querySelectorAll('.cosmic-symphony-animation').forEach(container => {
            // Create sound wave visualization
            for (let i = 0; i < 12; i++) {
                const bar = document.createElement('div');
                const x = 10 + i * 7;

                bar.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: 20px;
                    background: linear-gradient(to top,
                        rgba(100, 200, 255, 0.8),
                        rgba(200, 100, 255, 0.8)
                    );
                    left: ${x}%;
                    bottom: 10%;
                    border-radius: 2px;
                    pointer-events: none;
                `;
                container.appendChild(bar);

                let phase = i * 0.5;
                const animate = () => {
                    phase += 0.1;
                    const height = 10 + Math.sin(phase) * 30 + 30;
                    bar.style.height = height + 'px';
                    bar.style.opacity = 0.5 + Math.sin(phase) * 0.3;
                    requestAnimationFrame(animate);
                };
                animate();
            }
        });
    }
}

// Auto-initialize
const completeAnimations = new CompleteAnimations();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CompleteAnimations;
}
