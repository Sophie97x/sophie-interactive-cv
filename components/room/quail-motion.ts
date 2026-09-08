export const QUAIL_LAP = 30;
export const QUAIL_CYCLE = QUAIL_LAP * 4;
// Collision planes include the cutaway's invisible walls. Inset for the bird's body.
export const QUAIL_BOUNDS = {
  left: -5.32,
  right: 5.32,
  back: -4.25,
  front: 4.25,
};
export const QUAIL_WALLS = [
  {
    name: 'back',
    x: 2.95,
    z: QUAIL_BOUNDS.back,
    launchX: 2.95,
    launchZ: 0.3,
    height: 2.15,
  },
  {
    name: 'left',
    x: QUAIL_BOUNDS.left,
    z: 1.95,
    launchX: -2.3,
    launchZ: 1.95,
    height: 1.05,
  },
  {
    name: 'front',
    x: 0.9,
    z: QUAIL_BOUNDS.front,
    launchX: 0.9,
    launchZ: 2.2,
    height: 1.25,
  },
  {
    name: 'right',
    x: QUAIL_BOUNDS.right,
    z: 1,
    launchX: 2.7,
    launchZ: 1,
    height: 1.35,
  },
] as const;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function quailPose(seconds: number) {
  const cycleTime = ((seconds % QUAIL_CYCLE) + QUAIL_CYCLE) % QUAIL_CYCLE;
  const t = cycleTime % QUAIL_LAP;
  const wall = QUAIL_WALLS[Math.floor(cycleTime / QUAIL_LAP)];
  const heading = Math.atan2(wall.x - wall.launchX, wall.z - wall.launchZ);
  const landX = wall.x - Math.sin(heading) * 0.18,
    landZ = wall.z - Math.cos(heading) * 0.18;
  let x = 0.8 + Math.sin((t * Math.PI) / 9) * 0.75;
  let y = 0.28 + Math.abs(Math.sin(t * 9)) * 0.025;
  let z = 1.5 + Math.sin((t * Math.PI) / 4.5) * 0.35;
  let yaw = Math.atan2(
    Math.cos((t * Math.PI) / 9) * 0.75,
    Math.cos((t * Math.PI) / 4.5) * 0.7,
  );
  let roll = 0,
    flap = 0,
    phase = 'walk';
  let peck = 0;
  // Stop twice during a stroll, then take two quick pecks before carrying on.
  const peckStart = t >= 11 ? 11 : 5;
  const peckTime = t - peckStart;
  const walkTime =
    t -
    (t >= 13 ? 2 : t >= 11 ? t - 11 : 0) -
    (t >= 7 ? 2 : t >= 5 ? t - 5 : 0);
  if (t < 18) {
    x = 0.8 + Math.sin((walkTime * Math.PI) / 9) * 0.75;
    z = 1.5 + Math.sin((walkTime * Math.PI) / 4.5) * 0.35;
    yaw = Math.atan2(
      Math.cos((walkTime * Math.PI) / 9) * 0.75,
      Math.cos((walkTime * Math.PI) / 4.5) * 0.7,
    );
    if (peckTime >= 0 && peckTime < 2) {
      phase = 'peck';
      y = 0.28;
      peck = Math.sin(Math.PI * (peckTime % 1)) ** 4;
    }
  }
  if (t >= 18 && t < 20) {
    const u = (t - 18) / 2;
    x = mix(0.8 + Math.sin((14 * Math.PI) / 9) * 0.75, wall.launchX, u);
    z = mix(1.5 + Math.sin((14 * Math.PI) / 4.5) * 0.35, wall.launchZ, u);
    y = mix(0.28, wall.height, u);
    yaw = Math.atan2(wall.launchX - 0.8, wall.launchZ - 1.5);
    flap = Math.sin(t * 45) * 0.9;
    phase = 'takeoff';
  } else if (t >= 20 && t < 22) {
    const u = (t - 20) / 2;
    x = mix(wall.launchX, wall.x, u);
    z = mix(wall.launchZ, wall.z, u);
    y = wall.height;
    yaw = heading;
    flap = Math.sin(t * 45) * 0.9;
    phase = 'fly';
  } else if (t >= 22 && t < 22.3) {
    x = wall.x;
    z = wall.z;
    y = wall.height;
    yaw = heading;
    roll = Math.sin((t - 22) * 30) * 0.12;
    phase = 'bonk';
  } else if (t >= 22.3 && t < 23.3) {
    const u = t - 22.3;
    x = mix(wall.x, landX, u);
    z = mix(wall.z, landZ, u);
    y = mix(wall.height, 0.28, u * u);
    yaw = heading;
    roll = (u * Math.PI) / 2;
    phase = 'fall';
  } else if (t >= 23.3 && t < 25) {
    x = landX;
    z = landZ;
    y = 0.28;
    yaw = heading;
    roll = (Math.PI / 2) * Math.min(1, Math.max(0, 1 - (t - 24) / 0.7));
    phase = 'recover';
  } else if (t >= 25) {
    const u = (t - 25) / 5;
    // Back-wall return follows the aisle beside the desk.
    x =
      wall.name === 'back'
        ? u < 0.22
          ? mix(landX, 2.25, u / 0.22)
          : mix(2.25, 0.8, (u - 0.22) / 0.78)
        : mix(landX, 0.8, u);
    z = mix(landZ, 1.5, u);
    yaw = Math.atan2(0.8 - landX, 1.5 - landZ);
  }
  return { x, y, z, yaw, roll, flap, peck, phase, wall: wall.name };
}
