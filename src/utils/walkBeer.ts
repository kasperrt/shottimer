// Coordinates in the mug's 78 × 92 SVG. During stance the foot slides back
// exactly as far as the mug travels forward, planting the sole on the floor.
function leg(hip: number, phase: number) {
  const swing = Math.max(0, phase * 2 - 1);
  const offset = phase < 0.5 ? 8 - 32 * phase : -8 + 16 * swing;
  const lift = Math.sin(Math.PI * swing);
  const foot = hip + offset;
  const heel = 82 - lift * 7;
  return `M${hip} 62 Q${hip + 5 + lift * 6} 73 ${foot} ${heel} l6 ${-lift * 2}`;
}

export function walkBeer(actor: HTMLDivElement, lane: number) {
  const floor = actor.parentElement;
  if (!floor) return;
  const feet = actor.querySelectorAll<SVGPathElement>('.beer-foot');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let x = actor.offsetLeft + (Number.parseFloat(actor.style.getPropertyValue('--travel')) || 0);
  // Depth is measured in floor pixels. The front edge is zero.
  let depth = Number.parseFloat(actor.style.getPropertyValue('--depth')) || 0;
  let targetX = x;
  let targetDepth = depth;
  let phase = lane / 2;
  let speed = 56;
  let previous = 0;
  let frame = 0;
  let width = actor.offsetWidth;
  let floorWidth = floor.clientWidth;
  let origin = actor.offsetLeft;
  const resize = new ResizeObserver(() => {
    width = actor.offsetWidth;
    floorWidth = floor.clientWidth;
    origin = actor.offsetLeft;
    targetX = x;
    targetDepth = depth;
  });
  resize.observe(floor);
  resize.observe(actor);

  function step(now: number) {
    const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
    previous = now;
    const room = Math.max(0, floorWidth - width);
    x = Math.min(room, Math.max(0, x));
    const farEdge = width * 0.85;
    depth = Math.min(depth, farEdge);
    if (Math.hypot(targetX - x, targetDepth - depth) < 1 || targetX > room || targetDepth > farEdge) {
      // Separate home ranges let the mugs wander independently.
      const middle = room * 0.5;
      const low = lane === 0 ? 0 : Math.min(room, middle + width / 2);
      const high = lane === 0 ? Math.max(0, middle - width / 2) : room;
      const midpoint = (low + high) / 2;
      targetX = x <= midpoint ? midpoint + Math.random() * (high - midpoint) : low + Math.random() * (midpoint - low);
      targetDepth = depth < farEdge / 2 ? farEdge * (0.55 + Math.random() * 0.45) : Math.random() * farEdge * 0.45;
      speed = width * (0.55 + Math.random() * 0.42);
    }
    const dx = targetX - x;
    const dz = targetDepth - depth;
    // Foreshorten the floor axis so a step into the distance covers less screen space.
    const distance = Math.hypot(dx, dz * 1.7);
    const scale = 1 - (0.32 * depth) / Math.max(1, farEdge);
    const travel = Math.min(distance, speed * scale * dt);
    const fraction = travel / Math.max(distance, 0.001);
    x += dx * fraction;
    depth += dz * fraction;
    phase = (phase + (travel * 78) / Math.max(1, width * scale) / 32) % 1;
    actor.style.setProperty('--travel', `${x - origin}px`);
    actor.style.setProperty('--depth', `${depth}px`);
    actor.style.setProperty('--scale', String(scale));
    actor.style.zIndex = String(100 - Math.round(depth));
    if (Math.abs(dx) > 1) actor.style.setProperty('--facing', String(Math.sign(dx)));
    actor.style.setProperty('--bob', `${-Math.abs(Math.sin(phase * Math.PI * 2)) * 2}px`);
    feet[0].setAttribute('d', leg(24, phase));
    feet[1].setAttribute('d', leg(40, (phase + 0.5) % 1));
    frame = requestAnimationFrame(step);
  }
  function updateMotion() {
    cancelAnimationFrame(frame);
    previous = 0;
    if (!motion.matches) frame = requestAnimationFrame(step);
  }
  motion.addEventListener('change', updateMotion);
  updateMotion();
  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    motion.removeEventListener('change', updateMotion);
  };
}
