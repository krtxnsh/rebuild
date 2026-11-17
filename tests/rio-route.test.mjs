import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildRioRoute, frameDelta, RioWalker, routeWaypoints, turnToward } from '../preview/rio-route.mjs';

const readJson = name => JSON.parse(readFileSync(new URL('../metadata/' + name, import.meta.url)));
const manifest = readJson('scene_manifest.json');
const collision = readJson('collision_manifest.json');
const buffer = readFileSync(new URL('../exports/village_complete.glb', import.meta.url));
const jsonEnd = 20 + buffer.readUInt32LE(12);
const asset = JSON.parse(buffer.toString('utf8', 20, jsonEnd));
const binary = jsonEnd + 8;
const chapters = ['water', 'power', 'ration'];
const at = { set(...p) { this.p = p; } };

// The exported path, terrain and bridge primitives are already in world space.
function triangles(name, material) {
  const node = asset.nodes.find(n => n.name === name);
  assert.ok(!node.translation && !node.rotation && !node.scale);
  return asset.meshes[node.mesh].primitives
    .filter(p => asset.materials[p.material].name === material)
    .flatMap(primitive => {
      const positions = asset.accessors[primitive.attributes.POSITION];
      const indices = asset.accessors[primitive.indices];
      const offset = a => binary + (asset.bufferViews[a.bufferView].byteOffset || 0) + (a.byteOffset || 0);
      const start = offset(positions), indexStart = offset(indices);
      const indexSize = indices.componentType === 5123 ? 2 : 4;
      const indexAt = i => indexSize === 2 ? buffer.readUInt16LE(indexStart + i * 2) : buffer.readUInt32LE(indexStart + i * 4);
      return Array.from({ length: indices.count / 3 }, (_, i) => [0, 1, 2].map(corner => {
        const p = start + indexAt(i * 3 + corner) * 12;
        return [buffer.readFloatLE(p), buffer.readFloatLE(p + 4), buffer.readFloatLE(p + 8)];
      }));
    });
}
function upperSurface(faces, x, z) {
  let height = -Infinity;
  for (const [a, b, c] of faces) {
    const det = (b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2]);
    if (Math.abs(det) < 1e-8) continue;
    const u = ((x - a[0]) * (c[2] - a[2]) - (z - a[2]) * (c[0] - a[0])) / det;
    const v = ((b[0] - a[0]) * (z - a[2]) - (b[2] - a[2]) * (x - a[0])) / det;
    if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6) {
      height = Math.max(height, a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]));
    }
  }
  return height;
}
const road = triangles('TERRAIN_Paths', 'M_Terrain');
const ground = triangles('TERRAIN_Ground', 'M_Terrain');
const planks = triangles('BRIDGE_Main', 'M_Wood');
const roadHeight = (x, z) => Math.max(upperSurface(ground, x, z), upperSurface(road, x, z));
const routes = Object.fromEntries(chapters.map(chapter => [chapter, buildRioRoute(manifest, chapter, roadHeight)]));

const { west_end: west, east_end: east } = manifest.navigation.bridges.BRIDGE_Main;
const dx = east[0] - west[0], dz = east[2] - west[2];
const span = Math.hypot(dx, dz);
const track = (x, z) => ({
  along: ((x - west[0]) * dx + (z - west[2]) * dz) / span,
  offset: ((x - west[0]) * dz - (z - west[2]) * dx) / span,
});

function intersectsCollider(p, box, radius) {
  const [x, y, z, w] = box.rotation_world_quat;
  const [hx, hy, hz] = box.half_extents_gltf_local;
  for (const height of [0.25, 0.7, 1.15]) {
    const a = p[0] - box.center_world[0], b = p[1] + height - box.center_world[1], c = p[2] - box.center_world[2];
    // Inverse quaternion rotation into authored box coordinates.
    const tx = 2 * (-y * c + z * b), ty = 2 * (-z * a + x * c), tz = 2 * (-x * b + y * a);
    const localX = a + w * tx - y * tz + z * ty;
    const localY = b + w * ty - z * tx + x * tz;
    const localZ = c + w * tz - x * ty + y * tx;
    if (Math.abs(localY) <= hy && Math.hypot(Math.max(0, Math.abs(localX) - hx), Math.max(0, Math.abs(localZ) - hz)) < radius) return true;
  }
  return false;
}

for (const chapter of chapters) {
  test(chapter + ' follows authored roads, clears obstacles and rides the actual bridge', t => {
    const route = routes[chapter];
    const obstacles = collision.colliders.filter(box => !/RiverEdge|Floor|Deck|Ramp/.test(box.node));
    let deckSamples = 0, onRoad = 0, largestGrade = 0, largestDeckGap = 0;
    let previous, steepest;
    for (let distance = 0; distance <= route.length; distance += 0.09) {
      route.sample(distance, at);
      const [x, y, z] = at.p;
      const { along, offset } = track(x, z);
      const deck = Math.abs(offset) < 0.08 && along >= 0 && along <= span;
      if (deck) {
        deckSamples++;
        const visibleDeck = upperSurface(planks, x, z);
        const surface = Math.max(visibleDeck, roadHeight(x, z));
        if (Number.isFinite(visibleDeck)) largestDeckGap = Math.max(largestDeckGap, Math.abs(surface - y));
      } else {
        const paved = upperSurface(road, x, z);
        if (Number.isFinite(paved)) onRoad++;
        else assert.ok(distance < 1.2 || route.length - distance < 1.2, 'off-road sample at ' + at.p);
      }
      assert.deepEqual(obstacles.filter(box => intersectsCollider(at.p, box, 0.30)).map(box => box.node), [],
        'obstacle overlap at ' + at.p);
      if (previous) {
        const grade = Math.abs(y - previous[1]) / Math.hypot(x - previous[0], z - previous[2]);
        if (grade > largestGrade) {
          largestGrade = grade;
          steepest = [previous, at.p];
        }
      }
      previous = at.p;
    }
    assert.ok(onRoad > 80);
    assert.ok(deckSamples > 110);
    assert.ok(largestDeckGap < 0.085, 'deck error ' + largestDeckGap);
    t.diagnostic(JSON.stringify({ metres: route.length.toFixed(2), deckSamples, onRoad, largestDeckGap, largestGrade }));
    assert.ok(largestGrade < 0.68, 'grade ' + largestGrade + ' from ' + JSON.stringify(steepest));
  });
}

test('Water and Power departures match the previous arrival exactly', () => {
  assert.deepEqual(routes.water.samples.at(-1).position, routes.power.samples[0].position);
  assert.deepEqual(routes.power.samples.at(-1).position, routes.ration.samples[0].position);
});

test('the Power bend advances without the known lateral reversal or duplicate waypoints', () => {
  for (const chapter of chapters) {
    const points = routeWaypoints(manifest, chapter);
    for (let i = 1; i < points.length; i++) {
      assert.ok(Math.hypot(points[i][0] - points[i-1][0], points[i][2] - points[i-1][2]) > 0.1);
    }
    const eastSide = points.filter(p => p[0] > 6.63);
    const towardPower = chapter === 'power' ? eastSide : eastSide.reverse();
    for (let i = 1; i < towardPower.length; i++) assert.ok(towardPower[i][0] > towardPower[i-1][0]);
  }
});

test('the walker accelerates, brakes and ignores a background-tab suspension', () => {
  for (const fps of [20, 30, 60, 120]) {
    const walk = new RioWalker(routes.water);
    const dt = 1 / fps;
    assert.ok(walk.move(dt) < 0.01);
    assert.ok(walk.move(frameDelta(300)) === 0);
    let maximum = 0, time = dt;
    while (walk.distance < walk.route.length && time < 30) {
      const progress = walk.move(dt);
      assert.ok(progress > 0 && progress <= 2.05 * dt + 1e-9);
      maximum = Math.max(maximum, walk.speed);
      time += dt;
    }
    assert.equal(maximum, 2.05);
    assert.equal(walk.distance, walk.route.length);
    assert.equal(walk.speed, 0);
    assert.ok(time - walk.route.length / 2.05 < 1.0);
  }
});

test('yaw takes the short turn across ±π and observes its speed limit', () => {
  const start = Math.PI - 0.08, target = -Math.PI + 0.15, dt = 1 / 60;
  const yaw = turnToward(start, target, 4.5, dt);
  assert.ok(yaw > start && yaw - start <= 4.5 * dt);
});
