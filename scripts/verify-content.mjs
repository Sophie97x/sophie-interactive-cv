import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  quailPose,
  QUAIL_CYCLE,
  QUAIL_LAP,
  QUAIL_BOUNDS,
  QUAIL_WALLS,
} from '../components/room/quail-motion.ts';
import * as THREE from 'three';
import { floorShape, HATCH } from '../components/room/room-geometry.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  applyZoom,
  ROOM_ZOOM_LIMITS,
  configureRoomNavigation,
  constrainRoomPan,
} from '../components/room/zoom.ts';
import {
  deskPose,
  DESK_CYCLE,
  DESK_LAYOUT,
  DESK_TOP,
  KEY_TOP,
  fingerPress,
} from '../components/room/desk-motion.ts';
import {
  printPose,
  PRINT_DURATION,
  PRINT_LAYERS,
} from '../components/room/print-motion.ts';
assert.equal(printPose(0).layers, 0, 'Printer begins with an empty bed');
assert.equal(
  printPose(PRINT_DURATION / 2).layers,
  PRINT_LAYERS / 2,
  'Half the model is deposited halfway through',
);
assert.equal(
  printPose(PRINT_DURATION).layers,
  PRINT_LAYERS,
  'All layers finish',
);
assert.equal(printPose(PRINT_DURATION).phase, 'Complete');
assert.equal(
  printPose(36).phase,
  'Printing',
  'Longer print remains active past the old duration',
);
assert.equal(PRINT_DURATION, 90, 'Bunny demo takes 90 seconds');
assert.deepEqual(
  printPose(PRINT_DURATION),
  printPose(1000),
  'Finished print remains, never auto-loops',
);
assert.equal(printPose(0).progress, 0, 'Replay starts empty');
let previousLayers = 0;
for (let t = 0; t <= PRINT_DURATION; t += 0.025) {
  const p = printPose(t);
  assert.ok(
    p.layers >= previousLayers && p.layers <= PRINT_LAYERS,
    'Layers only accumulate',
  );
  for (const key of ['x', 'headY', 'bedZ']) assert.ok(Number.isFinite(p[key]));
  assert.ok(Math.abs(p.x) <= 0.34, 'Head stays inside gantry');
  previousLayers = p.layers;
}
import {
  milestones,
  ongoing,
  projects,
  workProjects,
  dateLabel,
  categories,
} from '../content/index.ts';
const all = [...milestones, ...ongoing, ...projects];
const phases = new Set();
for (let t = 0; t < QUAIL_CYCLE * 2; t += 0.01) {
  const p = quailPose(t);
  phases.add(p.phase);
  for (const key of ['x', 'y', 'z', 'yaw', 'roll', 'flap'])
    assert.ok(Number.isFinite(p[key]), `Invalid quail pose ${key}`);
  assert.ok(p.y >= 0.28 && p.y <= 2.151, 'Quail stays above the floor');
  assert.ok(
    p.x >= QUAIL_BOUNDS.left &&
      p.x <= QUAIL_BOUNDS.right &&
      p.z >= QUAIL_BOUNDS.back &&
      p.z <= QUAIL_BOUNDS.front,
    'Quail stays in the attic',
  );
}
assert.deepEqual(
  [...phases].sort((a, b) => a.localeCompare(b)),
  ['bonk', 'fall', 'fly', 'peck', 'recover', 'takeoff', 'walk'],
);
assert.deepEqual(quailPose(0), quailPose(QUAIL_CYCLE));
assert.equal(quailPose(5.5).phase, 'peck');
assert.equal(quailPose(5.5).peck, 1);
assert.equal(quailPose(5).x, quailPose(6.9).x, 'Quail must stop to peck');
assert.equal(quailPose(5).z, quailPose(6.9).z);
assert.equal(quailPose(8).peck, 0);
assert.ok(quailPose(22.4).y > quailPose(23.2).y, 'Quail falls after bonking');
assert.equal(quailPose(24.9).roll, 0, 'Quail gets back up');
for (const [i, wall] of QUAIL_WALLS.entries()) {
  const time = i * QUAIL_LAP;
  const hit = quailPose(time + 22.1);
  assert.equal(hit.phase, 'bonk');
  assert.equal(hit.wall, wall.name);
  assert.equal(hit.x, wall.x);
  assert.equal(hit.z, wall.z);
  assert.ok(
    quailPose(time + 22.4).y > quailPose(time + 23.2).y,
    `${wall.name}: falls after contact`,
  );
  assert.equal(quailPose(time + 24.9).roll, 0, `${wall.name}: recovers`);
}
const zoomCamera = new THREE.PerspectiveCamera(36, 1, 0.1, 90);
zoomCamera.position.set(0, 4, 20);
const zoomControls = new OrbitControls(zoomCamera);
configureRoomNavigation(zoomControls);
assert.equal(zoomControls.enablePan, true);
assert.equal(zoomControls.zoomToCursor, true);
assert.equal(zoomControls.touches.TWO, THREE.TOUCH.DOLLY_PAN);
assert.ok(ROOM_ZOOM_LIMITS.min < 2, 'Close-up zoom must stay available');
zoomControls.update();
const startingDistance = zoomControls.getDistance();
applyZoom(zoomControls, 'in');
assert.ok(
  zoomControls.getDistance() < startingDistance,
  'Zoom in moves closer',
);
applyZoom(zoomControls, 'out');
assert.ok(
  Math.abs(zoomControls.getDistance() - startingDistance) < 0.001,
  'Zoom out reverses step',
);
for (let i = 0; i < 50; i++) applyZoom(zoomControls, 'in');
assert.ok(
  Math.abs(zoomControls.getDistance() - ROOM_ZOOM_LIMITS.min) < 0.001,
  'Minimum zoom distance enforced',
);
for (let i = 0; i < 50; i++) applyZoom(zoomControls, 'out');
assert.ok(
  Math.abs(zoomControls.getDistance() - ROOM_ZOOM_LIMITS.max) < 0.001,
  'Maximum zoom distance enforced',
);
// Headless controls were never connected to a DOM element; no listeners to dispose.
const beforePanOffset = zoomCamera.position.clone().sub(zoomControls.target);
zoomControls.target.add(new THREE.Vector3(20, -10, 20));
zoomCamera.position.add(new THREE.Vector3(20, -10, 20));
constrainRoomPan(zoomControls);
assert.ok(
  zoomControls.target.distanceTo(new THREE.Vector3(5.3, 0.2, 4.3)) < 0.00001,
);
assert.ok(
  zoomCamera.position
    .clone()
    .sub(zoomControls.target)
    .distanceTo(beforePanOffset) < 0.00001,
  'Pan bounds must preserve viewing offset',
);
const deskPhases = new Set();
for (let t = 0; t < DESK_CYCLE * 2; t += 0.01) {
  const p = deskPose(t);
  deskPhases.add(p.phase);
  for (const key of ['right', 'left', 'cup', 'snack']) {
    assert.ok(p[key].every(Number.isFinite), `Invalid desk pose ${key}`);
    assert.ok(
      p[key][1] >= 1.12 && p[key][1] <= 1.85,
      'Hands and props stay above the desk',
    );
  }
  for (const [side, hand, elbow] of [
    [1, p.right, p.rightElbow],
    [-1, p.left, p.leftElbow],
  ]) {
    const shoulder = new THREE.Vector3(side * 0.24, 1.52, 0.055);
    const e = new THREE.Vector3(...elbow),
      h = new THREE.Vector3(...hand);
    assert.ok(
      Math.abs(shoulder.distanceTo(e) - 0.4) < 0.001,
      'Upper arms keep their length',
    );
    assert.ok(
      Math.abs(e.distanceTo(h) - 0.48) < 0.001,
      'Forearms keep their length',
    );
    if (p.phase === 'typing') {
      assert.ok(
        hand[1] - 0.043 >= KEY_TOP - 0.002,
        'Palms never sink into the keyboard',
      );
      assert.ok(
        Math.abs(hand[0]) + 0.09 < (1.08 * DESK_LAYOUT.keyboardScale) / 2,
        'Fingers stay over the keys',
      );
      assert.ok(
        hand[2] + 0.15 >
          DESK_LAYOUT.keyboard[2] - 0.116 * DESK_LAYOUT.keyboardScale,
        'Fingers reach the key rows',
      );
    }
  }
  assert.ok(p.lift >= 0 && p.lift <= 1);
  assert.ok(p.blinkAmount >= 0 && p.blinkAmount <= 1);
  assert.ok(Math.abs(p.headTurn) <= 0.12);
  assert.ok(Math.abs(p.breath) <= 0.008);
}
assert.deepEqual(
  [...deskPhases].sort((a, b) => a.localeCompare(b)),
  ['drink', 'snack', 'typing'],
);
assert.deepEqual(deskPose(0), deskPose(DESK_CYCLE));
assert.equal(deskPose(25).cup[1], 1.73, 'Cup rim reaches mouth');
assert.equal(deskPose(40).snack[1], 1.78, 'Snack reaches mouth');
assert.deepEqual(deskPose(30).cup, DESK_LAYOUT.cup, 'Cup returns to coaster');
assert.deepEqual(
  deskPose(45).snack,
  DESK_LAYOUT.snack,
  'Snack returns to plate',
);
assert.ok(
  Math.abs(DESK_LAYOUT.cup[1] - 0.05 - (DESK_TOP + 0.014)) < 0.00001,
  'Cup base rests exactly on coaster',
);
assert.ok(
  Math.abs(DESK_LAYOUT.snack[1] - 0.0225 - (DESK_TOP + 0.012)) < 0.00001,
  'Brownie rests exactly on plate',
);
const keyboardHalfWidth = (1.08 * DESK_LAYOUT.keyboardScale) / 2;
assert.ok(
  DESK_LAYOUT.cup[0] - 0.105 > keyboardHalfWidth + 0.03,
  'Cup and coaster clear the keyboard',
);
assert.ok(
  DESK_LAYOUT.snack[0] + 0.13 < -keyboardHalfWidth - 0.03,
  'Plate clears keyboard',
);
for (const [position, radius] of [
  [DESK_LAYOUT.cup, 0.105],
  [DESK_LAYOUT.snack, 0.13],
]) {
  assert.ok(
    position[2] - radius > 1.23 - 0.75,
    'Props stay inside the near desk edge',
  );
  assert.ok(
    position[2] + radius < 1.23 + 0.75,
    'Props stay inside the far desk edge',
  );
}
assert.equal(fingerPress(25, 1, 0), 0, 'Drinking hand stops typing');
assert.equal(fingerPress(40, -1, 0), 0, 'Snack hand stops typing');
assert.ok(
  Array.from({ length: 100 }, (_, i) => fingerPress(i / 10, 1, 0)).some(
    (v) => v > 0.8,
  ),
  'Typing visibly depresses keys',
);
assert.equal(milestones.length, 60);
assert.equal(ongoing.length, 14);
assert.equal(projects.length, 30);
assert.equal(workProjects.length, 66);
assert.equal(new Set(all.map((p) => p.id)).size, 104, 'Duplicate entries');
assert.equal(
  new Set(workProjects.map((p) => p.id)).size,
  66,
  'Duplicate work shelf pieces',
);
for (const p of all) {
  assert.ok(p.description.split(/\s+/).length <= 40, `Copy too long: ${p.id}`);
  assert.match(p.id, /^[mop]-[a-z0-9-]+$/);
  assert.ok(
    p.title && p.description,
    `Missing details for ${p.id}`,
  );
  assert.ok(categories[p.category], `Unknown category ${p.category}`);
  assert.ok(
    [
      'live',
      'prototype',
      'abandoned',
      'delivered',
      'ongoing',
      'research',
      'planned',
    ].includes(p.status),
    p.id,
  );
  if (p.date) {
    for (const part of p.date.split(' → ')) {
      if (part === 'Present') continue;
      assert.match(part, /^20\d{2}(-\d{2}(-\d{2})?)?$/, p.id);
      const padded =
        part.length === 4
          ? part + '-01-01'
          : part.length === 7
            ? part + '-01'
            : part;
      assert.equal(
        new Date(padded + 'T12:00:00Z').toISOString().slice(0, 10),
        padded,
        `Invalid date ${p.id}`,
      );
    }
    assert.equal(p.year, Number(p.date.slice(0, 4)), p.id);
  } else assert.equal(p.year, null, `Do not invent a year for ${p.id}`);
  if (p.url) assert.equal(new URL(p.url).protocol, 'https:');
}
assert.equal(dateLabel('2026-08-06'), '6 Aug 2026');
assert.equal(dateLabel('2018-01 → 2021-01'), 'Jan 2018 – Jan 2021');
assert.equal(milestones.find((p) => p.id === 'm-senior').date, '2024-09');
assert.equal(ongoing.find((p) => p.id === 'o-docker').status, 'delivered');
assert.match(ongoing.find((p) => p.id === 'o-docker').description, /unchanged/);
assert.equal(milestones.find((p) => p.id === 'm-meraki').metrics.length, 0);
assert.equal(projects.find((p) => p.id === 'p-bobcat').status, 'prototype');
assert.match(
  projects.find((p) => p.id === 'p-simpsons').description,
  /not confirmed/,
);
const data = JSON.stringify(all);
// The hatch must reveal a real hole, not a dark rectangle over solid carpet.
const floorGeometry = new THREE.ShapeGeometry(floorShape(9, 7));
const floorMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
const hatchRay = new THREE.Raycaster(
  new THREE.Vector3(HATCH.x, HATCH.z, 2),
  new THREE.Vector3(0, 0, -1),
);
assert.equal(
  hatchRay.intersectObject(floorMesh).length,
  0,
  'Hatch is blocked by the floor',
);
hatchRay.ray.origin.set(0, 0, 2);
assert.ok(
  hatchRay.intersectObject(floorMesh).length > 0,
  'Floor outside hatch is missing',
);
floorGeometry.dispose();
floorMaterial.dispose();
const roomSource = readFileSync('components/room/world.tsx', 'utf8');
assert.equal(
  (roomSource.match(/<Screen position=/g) ?? []).length,
  1,
  'Extra monitor row returned',
);
assert.match(roomSource, /\[-1\.15, 0, 1\.15\]\.map/);
assert.equal(
  projects.find((p) => p.id === 'p-bobcat').url,
  'https://github.com/Sophie97x/bobcat-meshpoint',
);
assert.ok(
  projects.find((p) => p.id === 'p-meshtastic').stack.includes('MeshCore'),
);
assert.ok(projects.find((p) => p.id === 'p-homelab').stack.includes('macOS'));
const workshopSource = readFileSync('components/workshop.tsx', 'utf8');
assert.doesNotMatch(
  workshopSource,
  /className="room-tools"|className="room-intro"/,
);
assert.match(workshopSource, /className="theme-toggle"/);
assert.match(workshopSource, /className="back-to-attic"/);
for (const file of [
  'components/workshop.tsx',
  'components/portfolio.tsx',
  'components/room/shelf.tsx',
]) {
  const source = readFileSync(file, 'utf8');
  assert.doesNotMatch(
    source,
    /Date not recorded|Year not recorded|Documented ·|hobby-year|dateLabel\(/,
    `Project-date clutter returned in ${file}`,
  );
}
assert.doesNotMatch(
  data,
  /-----BEGIN .*PRIVATE KEY|(?:sk|ghp)_[A-Za-z0-9]{20,}|\/Users\/sophie|(?:192\.168|10\.0)\.\d+\.\d+/,
);
if (existsSync('dist/client/index.html')) {
  const html = readFileSync('dist/client/index.html', 'utf8');
  for (const p of all)
    assert.ok(
      html.includes(`id="${p.id}"`),
      `Missing SSR entry ${p.id}; rebuild first`,
    );
  assert.ok(html.includes('SOPHIE WILSON'));
}
console.log(
  'PASS: 104 unique entries; chronology, shelves, status, privacy patterns and static HTML.',
);
