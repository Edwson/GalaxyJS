# GalaxyJS - Cosmic Animation Library

A sophisticated open-source CSS/JS animation library featuring 20+ stunning space-themed animations. GalaxyJS brings the cosmos to your web projects with scientifically-inspired effects including pulsars, black holes, wormholes, supernovas, and more.

![GalaxyJS Demo](https://img.shields.io/badge/GalaxyJS-Cosmic%20Animations-000000?style=for-the-badge&logo=javascript)

## 🌌 Features

- **20+ Cosmic Animations**: From pulsars to multiverse effects
- **Scientific Accuracy**: Based on real astronomical phenomena
- **Interactive Demos**: Mouse trails, particle systems, gravity simulations
- **Black & White Design**: Elegant monochromatic aesthetic
- **Responsive**: Works on all devices and screen sizes
- **Performance Optimized**: Smooth 60fps animations
- **Modular Architecture**: Easy to customize and extend

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/galaxyjs.git
cd galaxyjs

# Install dependencies (if using npm)
npm install

# Or include directly in your HTML
```

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/animations.css">
    <link rel="stylesheet" href="css/components.css">
</head>
<body>
    <!-- Pulsar Effect -->
    <div class="pulsar-animation">
        <div class="pulsar-core"></div>
        <div class="pulsar-waves"></div>
    </div>

    <!-- Black Hole Effect -->
    <div class="black-hole-animation">
        <div class="event-horizon"></div>
        <div class="accretion-disk"></div>
    </div>

    <script src="js/main.js"></script>
    <script src="js/animations.js"></script>
    <script src="js/interactive.js"></script>
    <script src="js/particles.js"></script>
    
    <script>
        // Initialize GalaxyJS
        const galaxy = new GalaxyJS({
            debug: true,
            autoInit: true
        });
    </script>
</body>
</html>
```

## 🎨 Available Animations

### 1. Pulsar Effect
Neutron star pulse animation with expanding waves.

```javascript
galaxy.initPulsar('.pulsar-element', {
    frequency: 2,
    intensity: 0.8,
    waveCount: 3
});
```

### 2. Black Hole
Event horizon and accretion disk simulation.

```javascript
galaxy.initBlackHole('.blackhole-element', {
    eventHorizon: true,
    accretionDisk: true,
    rotationSpeed: 0.02
});
```

### 3. Wormhole
Space-time tunnel effect with 3D perspective.

```javascript
galaxy.initWormhole('.wormhole-element', {
    depth: 200,
    starCount: 20,
    tunnelSpeed: 0.05
});
```

### 4. Supernova
Stellar explosion with particle burst.

```javascript
galaxy.initSupernova('.supernova-element', {
    explosionForce: 100,
    particleCount: 30,
    duration: 3000
});
```

### 5. Asteroid Field
Dynamic space debris simulation.

```javascript
galaxy.initAsteroidField('.asteroid-element', {
    asteroidCount: 15,
    fieldSize: 200,
    rotationSpeed: 0.01
});
```

### 6. Cosmic Ray
High-energy particle effect.

```javascript
galaxy.initCosmicRay('.cosmic-ray-element', {
    rayCount: 5,
    speed: 2,
    length: 50
});
```

### 7. Dwarf Planet
Small celestial body with rings.

```javascript
galaxy.initDwarfPlanet('.dwarf-planet-element', {
    rotationSpeed: 0.01,
    ringSystem: true
});
```

### 8. Nebula
Interstellar cloud formation.

```javascript
galaxy.initNebula('.nebula-element', {
    particleCount: 30,
    cloudSize: 80,
    driftSpeed: 0.01
});
```

### 9. Binary Stars
Dual star system simulation.

```javascript
galaxy.initBinaryStars('.binary-stars-element', {
    orbitSpeed: 0.01,
    starSize: 12,
    orbitRadius: 30
});
```

### 10. Cosmic Dust
Interstellar particle effects.

```javascript
galaxy.initCosmicDust('.cosmic-dust-element', {
    particleCount: 50,
    driftSpeed: 0.005,
    particleSize: 1
});
```

### 11. Time Dilation
Relativistic time effect.

```javascript
galaxy.initTimeDilation('.time-dilation-element', {
    dilationFactor: 0.5,
    clockSpeed: 0.01
});
```

### 12. Quantum Tunneling
Quantum mechanical effect.

```javascript
galaxy.initQuantumTunneling('.quantum-element', {
    barrierHeight: 50,
    particleSpeed: 2,
    tunnelProbability: 0.3
});
```

### 13. CMB Radiation
Cosmic microwave background.

```javascript
galaxy.initCMB('.cmb-element', {
    patternSize: 20,
    noiseLevel: 0.1,
    rotationSpeed: 0.001
});
```

### 14. Gravitational Waves
Space-time ripples.

```javascript
galaxy.initGravitationalWaves('.gravitational-waves-element', {
    waveCount: 3,
    waveSpeed: 2,
    amplitude: 20
});
```

### 15. Dark Matter
Invisible mass effect.

```javascript
galaxy.initDarkMatter('.dark-matter-element', {
    fieldStrength: 0.5,
    fieldRadius: 80,
    visibleMatterOpacity: 0.5
});
```

### 16. Solar Wind
Charged particle stream.

```javascript
galaxy.initSolarWind('.solar-wind-element', {
    particleCount: 20,
    windSpeed: 3,
    magneticField: true
});
```

### 17. Cosmic Strings
Topological defects.

```javascript
galaxy.initCosmicStrings('.cosmic-strings-element', {
    stringCount: 3,
    vibrationSpeed: 0.02,
    stringLength: 60
});
```

### 18. Hawking Radiation
Black hole evaporation.

```javascript
galaxy.initHawkingRadiation('.hawking-element', {
    radiationRate: 5,
    particleEnergy: 2,
    evaporationSpeed: 0.01
});
```

### 19. Cosmic Inflation
Rapid universe expansion.

```javascript
galaxy.initCosmicInflation('.inflation-element', {
    expansionRate: 0.1,
    fieldStrength: 0.8,
    duration: 6000
});
```

### 20. Multiverse
Parallel universes.

```javascript
galaxy.initMultiverse('.multiverse-element', {
    universeCount: 3,
    bubbleSize: 40,
    expansionSpeed: 0.01
});
```

## 🎮 Interactive Features

### Mouse Trail Effect
```javascript
galaxy.initMouseTrail(container, {
    trailLength: 50,
    particleSize: 3,
    fadeRate: 0.95
});
```

### Particle System
```javascript
const particleSystem = new ParticleSystem(container, {
    particleCount: 100,
    gravity: 0.1,
    friction: 0.98
});
```

### Gravity Simulation
```javascript
galaxy.initGravitySimulation(container, {
    bodyCount: 5,
    gravity: 0.5
});
```

## 🎨 Customization

### CSS Variables
```css
:root {
    --primary-black: #000000;
    --primary-white: #ffffff;
    --cosmic-gray: #1a1a1a;
    --stellar-gray: #2a2a2a;
    --text-primary: #ffffff;
    --text-secondary: #cccccc;
    --glow-white: rgba(255, 255, 255, 0.3);
}
```

### Animation Timing
```javascript
const galaxy = new GalaxyJS({
    debug: false,
    autoInit: true,
    particleCount: 100,
    trailLength: 20,
    animationSpeed: 1.0
});
```

## 📱 Responsive Design

GalaxyJS is fully responsive and works on all devices:

- **Desktop**: Full feature set with high-performance animations
- **Tablet**: Optimized for touch interactions
- **Mobile**: Simplified effects for better performance

## 🔧 API Reference

### Core Methods

#### `GalaxyJS(options)`
Initialize the GalaxyJS library.

#### `galaxy.init()`
Manually initialize all components.

#### `galaxy.pause()`
Pause all animations.

#### `galaxy.resume()`
Resume all animations.

#### `galaxy.clear()`
Clear all effects and particles.

### Event System

```javascript
// Listen for GalaxyJS events
document.addEventListener('galaxyjs:initialized', (e) => {
    console.log('GalaxyJS initialized', e.detail);
});

document.addEventListener('galaxyjs:mousemove', (e) => {
    console.log('Mouse moved', e.detail);
});
```

## 🎯 Performance Tips

1. **Limit Particle Count**: Use fewer particles on mobile devices
2. **Disable Heavy Effects**: Turn off complex animations on low-end devices
3. **Use CSS Transforms**: Leverage hardware acceleration
4. **Optimize Canvas**: Reduce canvas size for better performance

## 🌟 Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/galaxyjs.git
cd galaxyjs

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by real astronomical phenomena
- Built with modern web technologies
- Icons from [Tabler Icons](https://tabler.io/icons)
- Fonts from Google Fonts (Orbitron, Space Mono)

## 📞 Support

- **Documentation**: [https://galaxyjs.dev](https://galaxyjs.dev)
- **Issues**: [GitHub Issues](https://github.com/yourusername/galaxyjs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/galaxyjs/discussions)
- **Email**: support@galaxyjs.dev

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/galaxyjs&type=Date)](https://star-history.com/#yourusername/galaxyjs&Date)

---

**Made with cosmic energy** ⭐

*GalaxyJS - Bringing the universe to your web projects* 