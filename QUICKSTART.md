# GalaxyJS 2.0 Quick Start Guide

Get up and running with the modernized GalaxyJS in minutes!

---

## Installation

### Option 1: Direct Include (Simplest)

Add to your HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/animations.css">
    <link rel="stylesheet" href="css/modern-animations.css">
</head>
<body>
    <!-- Your content -->

    <!-- Include scripts -->
    <script src="js/particle-pool.js"></script>
    <script src="js/performance-monitor.js"></script>
    <script src="js/animation-engine.js"></script>
    <script src="js/advanced-animations.js"></script>
    <script src="js/animation-factory.js"></script>
    <script src="js/accessibility.js"></script>
    <script src="js/canvas-optimizer.js"></script>
    <script src="js/main.js"></script>
    <script src="js/animations.js"></script>
    <script src="js/particles.js"></script>
    <script src="js/galaxy-enhanced.js"></script>
</body>
</html>
```

That's it! All features are now available.

### Option 2: npm (Coming Soon)

```bash
npm install galaxyjs
```

---

## Basic Usage

### Auto-Initialization

Everything works automatically:

```html
<script src="js/galaxy-enhanced.js"></script>
<script>
    // GalaxyJS is automatically initialized and enhanced!
    document.addEventListener('galaxyjs:enhanced', (e) => {
        console.log('GalaxyJS 2.0 ready!');
    });
</script>
```

### Manual Initialization

```javascript
const galaxy = new GalaxyJS({
    debug: true,
    autoInit: true,
    particleCount: 100
});
```

---

## Examples

### 1. Create a Spiral Galaxy Animation

```html
<div id="my-galaxy" style="width: 500px; height: 500px;"></div>

<script>
    GalaxyHelpers.createSpiralGalaxy('my-galaxy', {
        numArms: 4,
        numStars: 400,
        rotationSpeed: 0.0005
    });
</script>
```

### 2. Create a Quantum Cloud

```html
<div id="quantum" style="width: 400px; height: 400px;"></div>

<script>
    GalaxyHelpers.createQuantumCloud('quantum', {
        numParticles: 220,
        flickerSpeed: 0.0025
    });
</script>
```

### 3. Create a Black Hole Accretion Disk

```html
<div id="blackhole" style="width: 600px; height: 600px;"></div>

<script>
    GalaxyHelpers.createAccretionDisk('blackhole', {
        numRings: 60,
        swirlSpeed: 0.0012
    });
</script>
```

### 4. Animate Any Element with WAAPI

```javascript
// Pulse effect
GalaxyHelpers.createGlow(document.getElementById('my-element'), {
    color: '#0af',
    intensity: 25,
    duration: 2000
});

// Particle burst
GalaxyHelpers.createBurst(document.getElementById('container'), {
    count: 30,
    distance: 150,
    color: '#fff'
});
```

### 5. Use Object Pooling for Particles

```javascript
document.addEventListener('galaxyjs:enhanced', (e) => {
    const { galaxy } = e.detail;

    // Create pooled particles (no garbage collection!)
    const particles = galaxy.createEnhancedParticles(container, {
        count: 100,
        color: { r: 255, g: 200, b: 100 },
        maxLife: 2000
    });

    // When done, release back to pool
    setTimeout(() => {
        galaxy.releaseParticles(particles);
    }, 5000);
});
```

### 6. Monitor Performance

```javascript
document.addEventListener('galaxyjs:enhanced', (e) => {
    const { galaxy } = e.detail;

    // Get real-time stats
    setInterval(() => {
        const stats = galaxy.getPerformanceStats();
        console.log(`FPS: ${stats.performance.fps}`);
        console.log(`Quality: ${stats.performance.quality}`);
        console.log(`Active Particles: ${stats.particlePool.activeCount}`);
    }, 1000);
});
```

### 7. Respect User Preferences (Accessibility)

```javascript
// Check if user prefers reduced motion
if (GalaxyHelpers.prefersReducedMotion()) {
    // Use minimal animations
    console.log('Using reduced motion');
} else {
    // Full animation experience
    console.log('Full animations enabled');
}

// Get device performance tier
const tier = GalaxyHelpers.getDeviceTier();
console.log(`Device tier: ${tier}`); // 'low', 'medium', or 'high'
```

---

## Performance Tips

### Adaptive Quality

The library automatically adjusts quality based on performance:

- **High Quality**: 60 FPS, 100% particles, full resolution
- **Medium Quality**: 50-60 FPS, 60% particles, 75% resolution
- **Low Quality**: <50 FPS, 30% particles, 50% resolution

### Manual Control

```javascript
document.addEventListener('galaxyjs:enhanced', (e) => {
    const { performanceMonitor } = e.detail;

    // Disable adaptive quality
    performanceMonitor.options.adaptiveQuality = false;

    // Or handle quality changes manually
    performanceMonitor.options.onQualityChange = (quality, settings) => {
        console.log(`Quality changed to ${quality}`);
        // Apply custom settings
    };
});
```

---

## Accessibility Features

### Keyboard Navigation

- **Arrow Keys**: Navigate between demo cards
- **Enter/Space**: Activate focused element
- **Escape**: Close modals
- **Tab**: Standard focus navigation

### Screen Reader Support

All animations have proper ARIA labels and live region announcements.

### Reduced Motion

Automatically respects `prefers-reduced-motion`:

```css
/* User setting: Reduce motion */
@media (prefers-reduced-motion: reduce) {
    /* All animations automatically reduced to 0.01ms */
}
```

---

## Development

### Run Development Server

```bash
npm start
# Opens at http://localhost:3000
```

### Lint Code

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

---

## API Reference

### Global Helpers

```javascript
GalaxyHelpers.quickAnimate(element, keyframes, duration)
GalaxyHelpers.createGlow(element, options)
GalaxyHelpers.createBurst(container, options)
GalaxyHelpers.createSpiralGalaxy(id, options)
GalaxyHelpers.createQuantumCloud(id, options)
GalaxyHelpers.createAccretionDisk(id, options)
GalaxyHelpers.getFPS()
GalaxyHelpers.prefersReducedMotion()
GalaxyHelpers.getDeviceTier()
```

### Galaxy Instance Methods

```javascript
galaxy.getPerformanceStats()
galaxy.createEnhancedParticles(container, options)
galaxy.releaseParticles(particles)
galaxy.setModernFeatures(enabled)
```

### Performance Monitor

```javascript
performanceMonitor.start()
performanceMonitor.stop()
performanceMonitor.recordFrame()
performanceMonitor.getFPS()
performanceMonitor.getQuality()
performanceMonitor.getStats()
```

### Animation Engine

```javascript
animationEngine.create(element, keyframes, options, name)
animationEngine.createPulse(element, options)
animationEngine.createFade(element, direction, options)
animationEngine.createRotation(element, options)
animationEngine.createGlow(element, options)
animationEngine.play(id)
animationEngine.pause(id)
animationEngine.stop(id)
```

### Particle Pool

```javascript
particlePool.acquire(props)
particlePool.release(particle)
particlePool.releaseMany(particles)
particlePool.getActive()
particlePool.getStats()
particlePool.clear()
```

---

## Events

### galaxyjs:initialized

Fired when original GalaxyJS initializes:

```javascript
document.addEventListener('galaxyjs:initialized', (e) => {
    const { galaxy } = e.detail;
    console.log('GalaxyJS initialized');
});
```

### galaxyjs:enhanced

Fired when modern features are loaded:

```javascript
document.addEventListener('galaxyjs:enhanced', (e) => {
    const {
        galaxy,
        performanceMonitor,
        particlePool,
        animationEngine,
        advancedAnimations,
        accessibilityManager
    } = e.detail;

    console.log('Enhanced features loaded!');
});
```

---

## Troubleshooting

### Animations not working

1. Check browser console for errors
2. Ensure all scripts are loaded in correct order
3. Verify container elements have dimensions (width/height)

### Low FPS

1. Check quality setting: `galaxy.getPerformanceStats().performance.quality`
2. Reduce particle count
3. Enable adaptive quality: `performanceMonitor.options.adaptiveQuality = true`

### WAAPI not supported

The library automatically falls back to CSS animations. Check browser compatibility:
- Chrome 36+
- Firefox 48+
- Safari 13.1+
- Edge 79+

---

## Full Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>GalaxyJS 2.0 Demo</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/animations.css">
    <link rel="stylesheet" href="css/modern-animations.css">
    <style>
        body { margin: 0; background: #000; color: #fff; }
        #galaxy { width: 100vw; height: 100vh; }
        #stats {
            position: fixed;
            top: 10px;
            left: 10px;
            font-family: monospace;
            background: rgba(0,0,0,0.7);
            padding: 10px;
        }
    </style>
</head>
<body>
    <div id="galaxy"></div>
    <div id="stats"></div>

    <!-- Scripts -->
    <script src="js/particle-pool.js"></script>
    <script src="js/performance-monitor.js"></script>
    <script src="js/animation-engine.js"></script>
    <script src="js/advanced-animations.js"></script>
    <script src="js/animation-factory.js"></script>
    <script src="js/accessibility.js"></script>
    <script src="js/canvas-optimizer.js"></script>
    <script src="js/main.js"></script>
    <script src="js/animations.js"></script>
    <script src="js/particles.js"></script>
    <script src="js/galaxy-enhanced.js"></script>

    <script>
        document.addEventListener('galaxyjs:enhanced', (e) => {
            const { galaxy } = e.detail;

            // Create spiral galaxy
            GalaxyHelpers.createSpiralGalaxy('galaxy', {
                numArms: 6,
                numStars: 500
            });

            // Show live stats
            setInterval(() => {
                const stats = galaxy.getPerformanceStats();
                document.getElementById('stats').innerHTML = `
                    FPS: ${stats.performance.fps}<br>
                    Quality: ${stats.performance.quality}<br>
                    Active Particles: ${stats.particlePool.activeCount}/${stats.particlePool.totalAllocated}<br>
                    Animations: ${stats.animations.total}<br>
                    Reduced Motion: ${stats.accessibility.reducedMotion}
                `;
            }, 100);
        });
    </script>
</body>
</html>
```

---

## Next Steps

- Read [MODERNIZATION.md](MODERNIZATION.md) for full feature documentation
- Explore [index.html](index.html) for 40+ animation demos
- Check [package.json](package.json) for build scripts
- Join the community on GitHub

---

**Enjoy creating cosmic animations! 🌌✨**
