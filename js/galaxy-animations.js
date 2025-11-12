// GalaxyJS - High Quality Galaxy Path Animations
// Animation 1: Spiral Galaxy Arms (Logarithmic Spirals)

export function initSpiralGalaxyArms(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Create and style canvas
  let canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.background = '#000';
  container.appendChild(canvas);

  // Handle retina
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.offsetWidth * dpr;
    canvas.height = container.offsetHeight * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  const ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Animation parameters
  const numArms = options.numArms || 4;
  const numStars = options.numStars || 400;
  const spiralTightness = options.spiralTightness || 0.25;
  const armSpread = options.armSpread || 0.5;
  const centerGlow = options.centerGlow !== false;

  // Generate star data
  const stars = [];
  for (let i = 0; i < numStars; i++) {
    const arm = i % numArms;
    const t = Math.random() * 4 * Math.PI;
    const r = (t * 32) + Math.random() * 12;
    const angle = t + arm * ((2 * Math.PI) / numArms) + (Math.random() - 0.5) * armSpread;
    const speed = 0.0005 + Math.random() * 0.0007;
    stars.push({ arm, t, r, angle, speed, baseT: t });
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h / 2;

    // Center glow
    if (centerGlow) {
      let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.12);
      grad.addColorStop(0, 'rgba(255,255,255,0.7)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.12, 0, 2 * Math.PI);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Draw spiral arms
    for (let i = 0; i < stars.length; i++) {
      let star = stars[i];
      // Animate spiral rotation
      let t = star.baseT + (time * star.speed);
      let r = (t * 32) + Math.random() * 12;
      let angle = t + star.arm * ((2 * Math.PI) / numArms) + (Math.random() - 0.5) * armSpread;
      let x = cx + Math.cos(angle) * r;
      let y = cy + Math.sin(angle) * r;
      let alpha = 0.7 - (r / (w * 0.7));
      ctx.beginPath();
      ctx.arc(x, y, 1.1 + Math.random() * 0.7, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0.1, alpha)})`;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Animation loop
  function animate(ts) {
    draw(ts || 0);
    requestAnimationFrame(animate);
  }
  animate();
}

// Animation 2: Quantum Probability Cloud (Wave-like Particle Flicker)
export function initQuantumProbabilityCloud(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.background = '#000';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.offsetWidth * dpr;
    canvas.height = container.offsetHeight * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Animation parameters
  const numParticles = options.numParticles || 220;
  const cloudRadius = options.cloudRadius || 0.36; // as fraction of min(width, height)
  const flickerSpeed = options.flickerSpeed || 0.0025;
  const waveAmplitude = options.waveAmplitude || 0.18;
  const waveFrequency = options.waveFrequency || 2.2;

  // Particle data
  const particles = [];
  for (let i = 0; i < numParticles; i++) {
    const baseAngle = Math.random() * 2 * Math.PI;
    const baseRadius = Math.random() * 0.9 + 0.1;
    const phase = Math.random() * 2 * Math.PI;
    const speed = 0.5 + Math.random() * 1.2;
    particles.push({ baseAngle, baseRadius, phase, speed });
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h / 2;
    const rMax = Math.min(w, h) * cloudRadius;

    // Soft cloud glow
    let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rMax * 1.2);
    grad.addColorStop(0, 'rgba(255,255,255,0.12)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, rMax * 1.2, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw particles
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      // Quantum wave motion
      let t = time * flickerSpeed * p.speed + p.phase;
      let radius = rMax * p.baseRadius * (1 + Math.sin(t * waveFrequency) * waveAmplitude);
      let angle = p.baseAngle + Math.sin(t * 0.7) * 0.5;
      let x = cx + Math.cos(angle) * radius;
      let y = cy + Math.sin(angle) * radius;
      let alpha = 0.18 + 0.65 * Math.abs(Math.sin(t + p.baseAngle));
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + Math.abs(Math.sin(t * 2)) * 1.1, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function animate(ts) {
    draw(ts || 0);
    requestAnimationFrame(animate);
  }
  animate();
}

// Animation 3: Black Hole Accretion Disk (Swirling Matter, Relativistic Effects)
export function initBlackHoleAccretionDisk(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.background = '#000';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.offsetWidth * dpr;
    canvas.height = container.offsetHeight * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Animation parameters
  const numRings = options.numRings || 60;
  const numParticles = options.numParticles || 320;
  const diskRadius = options.diskRadius || 0.38;
  const swirlSpeed = options.swirlSpeed || 0.0012;
  const blackHoleRadius = options.blackHoleRadius || 0.09;

  // Precompute ring data
  const rings = [];
  for (let i = 0; i < numRings; i++) {
    const r = (i + 1) / numRings;
    rings.push({ r });
  }

  // Particle data for disk
  const particles = [];
  for (let i = 0; i < numParticles; i++) {
    const ring = Math.floor(Math.random() * numRings);
    const angle = Math.random() * 2 * Math.PI;
    const speed = 0.7 + Math.random() * 1.2;
    const phase = Math.random() * 2 * Math.PI;
    particles.push({ ring, angle, speed, phase });
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h / 2;
    const rMax = Math.min(w, h) * diskRadius;
    const rHole = Math.min(w, h) * blackHoleRadius;

    // Relativistic glow (Einstein ring)
    let grad = ctx.createRadialGradient(cx, cy, rHole * 0.9, cx, cy, rHole * 1.5);
    grad.addColorStop(0, 'rgba(255,255,255,0.12)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, rHole * 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();

    // Accretion disk (swirling rings)
    for (let i = 0; i < rings.length; i++) {
      let ring = rings[i];
      let radius = rHole + (rMax - rHole) * ring.r;
      let alpha = 0.08 + 0.18 * Math.sin(time * swirlSpeed * (1 + ring.r) + ring.r * 8);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 1.2 + 1.5 * (1 - ring.r);
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8 * (1 - ring.r);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Disk particles (matter swirling)
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      let ring = rings[p.ring];
      let radius = rHole + (rMax - rHole) * ring.r;
      let angle = p.angle + time * swirlSpeed * p.speed + Math.sin(time * 0.0002 + p.phase) * 0.2;
      let x = cx + Math.cos(angle) * radius;
      let y = cy + Math.sin(angle) * radius;
      let alpha = 0.18 + 0.5 * Math.abs(Math.sin(time * 0.001 + p.phase));
      ctx.beginPath();
      ctx.arc(x, y, 1.1 + Math.random() * 0.7, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Black hole core (event horizon)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rHole, 0, 2 * Math.PI);
    ctx.fillStyle = '#000';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function animate(ts) {
    draw(ts || 0);
    requestAnimationFrame(animate);
  }
  animate();
} 