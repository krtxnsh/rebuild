const flatDistance = (a, b) => Math.hypot(b[0] - a[0], b[2] - a[2]);
const mix = (a, b, t) => a + (b - a) * t;
const lerpPoint = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
export const smooth = t => t * t * (3 - 2 * t);

export function turnToward(angle, target, rate, dt) {
  const delta = Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
  return angle + clamp(delta * damp(12, dt), -rate * dt, rate * dt);
}

export function frameDelta(elapsed) {
  // A suspended page has no movement debt to catch up on.
  return elapsed >= 0.25 ? 0 : Math.min(elapsed, 0.05);
}

export function routeWaypoints(manifest, chapter) {
  const { paths, bridges } = manifest.navigation;
  const path = name => paths.find(p => p.name === name).points;
  const doorstep = (id, setback) => {
    const { world_position: p, forward_world_gltf: d } = manifest.entrances.find(e => e.semantic_id === id + '_Entrance');
    return p.map((v, i) => v - setback * d[i]);
  };
  const { west_end: west, east_end: east } = bridges.BRIDGE_Main;
  const water = path('PATH_Water_Bridge');
  const ration = path('PATH_Ration_Bridge');
  const power = path('PATH_Bridge_Elec');
  // These offsets keep Rio outside the closed doors and on the road-side approaches.
  const atPower = doorstep('ELEC', 0.7);
  const atWater = doorstep('WATER', 0.62);
  const atRation = doorstep('RATION', 0.55);
  // Remove the short Catmull-Rom reversal by the poles. At the west end the
  // Ration road and Water road meet before the little spur to the bridge rail.
  const powerSide = [east, ...power.slice(1, 5), ...power.slice(8, -1), atPower];
  const waterSide = [atWater, ...water.slice(1), west];
  const rationSide = [atRation, ...ration.slice(0, -2), west];
  if (chapter === 'power') return [...waterSide, ...powerSide];
  if (chapter === 'ration') return [...powerSide.reverse(), ...rationSide.reverse()];
  return [...powerSide.reverse(), ...waterSide.reverse()];
}

// Trim each corner locally. The quadratic stays in the tiny triangle defined
// by the incoming road, outgoing road and their intersection.
function roundCorners(points, west, east) {
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    if (b === west || b === east) {
      out.push(b);
      continue;
    }
    const before = flatDistance(a, b), after = flatDistance(b, c);
    const cut = Math.min(0.28, before * 0.4, after * 0.4);
    const from = lerpPoint(b, a, cut / before), to = lerpPoint(b, c, cut / after);
    out.push(from);
    for (let j = 1; j <= 4; j++) {
      const t = j / 4;
      out.push(lerpPoint(lerpPoint(from, b, t), lerpPoint(b, to, t), t));
    }
  }
  out.push(points.at(-1));
  return out;
}

export function buildRioRoute(manifest, chapter, roadHeight) {
  const { west_end: west, east_end: east } = manifest.navigation.bridges.BRIDGE_Main;
  const points = roundCorners(routeWaypoints(manifest, chapter), west, east);
  const samples = [];
  function add(position, deckHeight) {
    const road = roadHeight(position[0], position[2], position[1]);
    if (deckHeight !== undefined) {
      // A smooth maximum at the buried ends lets the actual road cover the low
      // first planks. The exposed deck uses the profile from build_arch_bridge.
      const seam = Math.max(0, 0.065 - Math.abs(road - deckHeight)) / 0.065;
      position[1] = Math.max(road, deckHeight) + 0.01625 * seam * seam;
    } else position[1] = road;
    samples.push({ position, distance: 0 });
  }
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const bridge = (a === west && b === east) || (a === east && b === west);
    const steps = Math.ceil(flatDistance(a, b) / 0.16);
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      // The manifest endpoints contain TERRAIN heights. The deck mesh instead
      // starts at y=.12 and rises 1.30 metres above that fixed local baseline.
      add(lerpPoint(a, b, t), bridge ? 0.12 + 5.2 * t * (1 - t) : undefined);
    }
  }
  add([...points.at(-1)]);

  // The exported road ribbon has a raised edge at the shop. Span those small
  // lips with a step profile, keeping the soles on or above either surface.
  const maxGrade = 0.50;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].position, b = samples[i].position;
    b[1] = Math.max(b[1], a[1] - maxGrade * flatDistance(a, b));
  }
  for (let i = samples.length - 1; i > 0; i--) {
    const a = samples[i - 1].position, b = samples[i].position;
    a[1] = Math.max(a[1], b[1] - maxGrade * flatDistance(a, b));
  }
  let length = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].position, b = samples[i].position;
    length += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    samples[i].distance = length;
  }

  return {
    length,
    samples,
    sample(distance, out) {
      let low = 0, high = samples.length - 1;
      while (low + 1 < high) {
        const mid = (low + high) >>> 1;
        if (samples[mid].distance <= distance) low = mid;
        else high = mid;
      }
      const a = samples[low], b = samples[high];
      const t = clamp((distance - a.distance) / (b.distance - a.distance), 0, 1);
      out.set(mix(a.position[0], b.position[0], t),
        mix(a.position[1], b.position[1], t), mix(a.position[2], b.position[2], t));
    },
  };
}

export class RioWalker {
  distance = 0;
  speed = 0;
  constructor(route) { this.route = route; }

  move(dt) {
    const remaining = this.route.length - this.distance;
    const previous = this.speed;
    const acceleration = 3.0;
    const target = Math.min(2.05, Math.sqrt(2 * acceleration * remaining));
    this.speed += clamp(target - this.speed, -acceleration * dt, acceleration * dt);
    const travelled = Math.min(remaining, (previous + this.speed) * 0.5 * dt);
    this.distance += travelled;
    if (travelled >= remaining) this.speed = 0;
    return travelled;
  }
}
