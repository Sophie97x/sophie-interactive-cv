/*
 * Ground motion for the cat and the dog.
 *
 * The quail's path deliberately flies it into the walls for the bonk gag, which
 * looks wrong on something with four legs. This keeps a mammal on the floor:
 * it pads a loop around the open carpet, stops now and then to sniff, and every
 * so often crouches, springs up onto the desk, sits for a while and hops back
 * down.
 *
 * The waypoints are hand-placed in the clear floor space — away from the desk,
 * the workbench, the shelving and the beanbags — so the route never walks
 * through furniture.
 */

export type PetPhase =
  | 'walk'
  | 'sniff'
  | 'crouch'
  | 'leap'
  | 'sit'
  | 'hop-down';

export type PetPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** 0 normally, 1 fully compressed just before a jump. */
  crouch: number;
  /** How far through a stride, for the leg swing. Frozen while still. */
  stride: number;
  /** True while sitting on the desk, so legs can tuck under. */
  seated: boolean;
  phase: PetPhase;
};

const FLOOR_Y = 0.02;

/** Desk top, and the spot on the floor the pet jumps from. */
const DESK = { x: 1.35, y: 1.14, z: -0.5 };
const LAUNCH = { x: 1.35, z: 0.72 };

/** A loop around the open carpet. Nothing here overlaps furniture. */
const PATH: { x: number; z: number; pause?: number }[] = [
  { x: -2.3, z: 2.5 },
  { x: -0.7, z: 3.05, pause: 2.2 },
  { x: 1.5, z: 2.8 },
  { x: 2.9, z: 1.9, pause: 1.8 },
  { x: 2.4, z: 0.9 },
  { x: 0.3, z: 1.3 },
  { x: -1.9, z: 1.5, pause: 2.0 },
];

/** Metres per second on the floor. */
const SPEED = 0.75;

const legs = (() => {
  let total = 0;
  const segs = PATH.map((node, i) => {
    const next = PATH[(i + 1) % PATH.length];
    const len = Math.hypot(next.x - node.x, next.z - node.z);
    const seg = {
      from: node,
      to: next,
      len,
      start: total,
      pause: node.pause ?? 0,
    };
    total += node.pause ?? 0;
    total += len / SPEED;
    return seg;
  });
  return { segs, total };
})();

/** Where the walk loop puts the pet at `t` seconds into it. */
function walkAt(t: number) {
  const time = ((t % legs.total) + legs.total) % legs.total;
  for (const seg of legs.segs) {
    const pauseEnd = seg.start + seg.pause;
    if (time < pauseEnd) {
      const heading = Math.atan2(seg.to.x - seg.from.x, seg.to.z - seg.from.z);
      return {
        x: seg.from.x,
        z: seg.from.z,
        yaw: heading,
        moving: false,
        stride: 0,
      };
    }
    const travel = seg.len / SPEED;
    if (time < pauseEnd + travel) {
      const u = (time - pauseEnd) / travel;
      return {
        x: seg.from.x + (seg.to.x - seg.from.x) * u,
        z: seg.from.z + (seg.to.z - seg.from.z) * u,
        yaw: Math.atan2(seg.to.x - seg.from.x, seg.to.z - seg.from.z),
        moving: true,
        stride: (u * seg.len) / 0.42,
      };
    }
  }
  const last = legs.segs[legs.segs.length - 1];
  return { x: last.to.x, z: last.to.z, yaw: 0, moving: false, stride: 0 };
}

/* ---------------------------------------------------------- the routine */

const WANDER = legs.total; // one full lap of the carpet
const APPROACH = 2.2;
const CROUCH = 0.8;
const LEAP = 0.75;
const SIT = 9;
const DOWN = 0.75;
const SETTLE = 1.4;

export const PET_CYCLE =
  WANDER + APPROACH + CROUCH + LEAP + SIT + DOWN + SETTLE;

const ease = (u: number) => u * u * (3 - 2 * u);

export function petPose(seconds: number, canUseDesk = true): PetPose {
  const t = ((seconds % PET_CYCLE) + PET_CYCLE) % PET_CYCLE;

  // --- 1. wander the carpet ---
  if (t < WANDER || !canUseDesk) {
    const w = walkAt(canUseDesk ? t : seconds);
    return {
      x: w.x,
      y: FLOOR_Y,
      z: w.z,
      yaw: w.yaw,
      crouch: 0,
      stride: w.stride,
      seated: false,
      phase: w.moving ? 'walk' : 'sniff',
    };
  }

  const end = walkAt(WANDER);
  let m = t - WANDER;

  // --- 2. walk over to the front of the desk ---
  if (m < APPROACH) {
    const u = ease(m / APPROACH);
    const x = end.x + (LAUNCH.x - end.x) * u;
    const z = end.z + (LAUNCH.z - end.z) * u;
    return {
      x,
      y: FLOOR_Y,
      z,
      yaw: Math.atan2(LAUNCH.x - end.x, LAUNCH.z - end.z),
      crouch: 0,
      stride: (m * SPEED) / 0.42,
      seated: false,
      phase: 'walk',
    };
  }
  m -= APPROACH;

  // face the desk for everything that follows
  const faceDesk = Math.atan2(DESK.x - LAUNCH.x, DESK.z - LAUNCH.z);

  // --- 3. settle, wiggle, crouch ---
  if (m < CROUCH) {
    return {
      x: LAUNCH.x,
      y: FLOOR_Y,
      z: LAUNCH.z,
      yaw: faceDesk,
      crouch: ease(m / CROUCH),
      stride: 0,
      seated: false,
      phase: 'crouch',
    };
  }
  m -= CROUCH;

  // --- 4. spring up onto the desk, on an arc ---
  if (m < LEAP) {
    const u = m / LEAP;
    const arc = Math.sin(u * Math.PI) * 0.42; // the hop over the edge
    return {
      x: LAUNCH.x + (DESK.x - LAUNCH.x) * u,
      y: FLOOR_Y + (DESK.y - FLOOR_Y) * ease(u) + arc,
      z: LAUNCH.z + (DESK.z - LAUNCH.z) * u,
      yaw: faceDesk,
      crouch: 1 - ease(u),
      stride: 0,
      seated: false,
      phase: 'leap',
    };
  }
  m -= LEAP;

  // --- 5. sit up there and watch the room ---
  if (m < SIT) {
    // a slow look left and right while seated
    const look = Math.sin((m / SIT) * Math.PI * 2) * 0.5;
    return {
      x: DESK.x,
      y: DESK.y,
      z: DESK.z,
      yaw: faceDesk + Math.PI + look,
      crouch: 0,
      stride: 0,
      seated: true,
      phase: 'sit',
    };
  }
  m -= SIT;

  // --- 6. hop back down ---
  if (m < DOWN) {
    const u = m / DOWN;
    return {
      x: DESK.x + (LAUNCH.x - DESK.x) * u,
      y: DESK.y + (FLOOR_Y - DESK.y) * ease(u) + Math.sin(u * Math.PI) * 0.16,
      z: DESK.z + (LAUNCH.z - DESK.z) * u,
      yaw: faceDesk + Math.PI,
      crouch: u > 0.75 ? (u - 0.75) / 0.25 : 0,
      stride: 0,
      seated: false,
      phase: 'hop-down',
    };
  }
  m -= DOWN;

  // --- 7. shake it off, then the loop starts again ---
  const u = ease(m / SETTLE);
  const first = PATH[0];
  return {
    x: LAUNCH.x + (first.x - LAUNCH.x) * u,
    y: FLOOR_Y,
    z: LAUNCH.z + (first.z - LAUNCH.z) * u,
    yaw: Math.atan2(first.x - LAUNCH.x, first.z - LAUNCH.z),
    crouch: (1 - u) * 0.4,
    stride: (m * SPEED) / 0.42,
    seated: false,
    phase: 'walk',
  };
}
