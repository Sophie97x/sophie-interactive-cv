type V3 = [number, number, number];
// One coordinate system for the person, input devices and resting props.
export const DESK_TOP = 1.105;
export const DESK_LAYOUT = {
  avatar: [0.5, 0, -2.88] as V3,
  keyboard: [0, 1.14525, 0.8] as V3,
  keyboardScale: 1.1,
  cup: [0.76, 1.169, 0.66] as V3,
  snack: [-0.78, 1.1395, 0.66] as V3,
};
export const KEY_TOP =
  DESK_LAYOUT.keyboard[1] + 0.086 * DESK_LAYOUT.keyboardScale;
export function fingerPress(seconds: number, side: number, finger: number) {
  const t = ((seconds % 46) + 46) % 46;
  if ((side > 0 && t >= 22 && t < 29) || (side < 0 && t >= 37 && t < 44))
    return 0;
  return (
    Math.max(0, Math.sin(t * 0.85)) *
    Math.max(0, Math.sin(t * (10 + finger) + finger * 1.7 + side * 2)) ** 4
  );
}

/** Two fixed-length arm bones, with elbows bending outwards and down. */
export function elbowPose(side: number, hand: V3): V3 {
  const shoulder: V3 = [side * 0.24, 1.52, 0.055];
  const delta = hand.map((v, i) => v - shoulder[i]);
  const distance = Math.hypot(...delta);
  const direction = delta.map((v) => v / distance);
  const along = (0.4 ** 2 - 0.48 ** 2 + distance ** 2) / (2 * distance);
  const bend = [side * 0.7, -1, -0.3];
  const dot = bend.reduce((n, v, i) => n + v * direction[i], 0);
  const normal = bend.map((v, i) => v - dot * direction[i]);
  const length = Math.hypot(...normal);
  const height = Math.sqrt(Math.max(0, 0.4 ** 2 - along ** 2));
  return shoulder.map(
    (v, i) => v + direction[i] * along + (normal[i] / length) * height,
  ) as V3;
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const blend = (a: V3, b: V3, t: number): V3 =>
  a.map((n, i) => n + (b[i] - n) * t) as V3;
export const DESK_CYCLE = 46;
export function deskPose(seconds: number) {
  const t = ((seconds % DESK_CYCLE) + DESK_CYCLE) % DESK_CYCLE;
  const rightHome: V3 = [0.2, 1.282, 0.64],
    leftHome: V3 = [-0.2, 1.282, 0.64];
  const cupRest = DESK_LAYOUT.cup,
    snackRest = DESK_LAYOUT.snack;
  let right: V3 = [...rightHome],
    left: V3 = [...leftHome];
  let cup: V3 = [...cupRest],
    snack: V3 = [...snackRest];
  let lift = 0,
    grip = 0,
    phase = 'typing';
  if ((t >= 22 && t < 29) || (t >= 37 && t < 44)) {
    const drink = t < 29,
      u = t - (drink ? 22 : 37);
    phase = drink ? 'drink' : 'snack';
    const rest = drink ? cupRest : snackRest;
    const mouth: V3 = [drink ? 0.02 : -0.02, drink ? 1.73 : 1.78, 0.29];
    const home = drink ? rightHome : leftHome;
    lift = ease((u - 0.65) / 1.2) * (1 - ease((u - 4.7) / 1.3));
    const object = blend(rest, mouth, lift);
    grip = ease(u / 0.65) * (1 - ease(u - 6));
    const offset: V3 = drink ? [0.092, 0.025, -0.075] : [-0.03, 0.06, -0.09];
    const hold = object.map((v, i) => v + offset[i]) as V3;
    const reach = rest.map((v, i) => v + offset[i]) as V3;
    const hand =
      u < 0.65
        ? blend(home, reach, ease(u / 0.65))
        : u > 6
          ? blend(reach, home, ease(u - 6))
          : hold;
    if (drink) {
      right = hand;
      cup = object;
    } else {
      left = hand;
      snack = object;
    }
  } else {
    const typing = Math.max(0, Math.sin(t * 0.85)) ** 0.5;
    right[0] += Math.sin(t * 1.4) * 0.01 * typing;
    left[0] += Math.sin(t * 1.2 + 1) * 0.01 * typing;
  }
  return {
    phase,
    right,
    left,
    cup,
    snack,
    lift,
    grip,
    rightElbow: elbowPose(1, right),
    leftElbow: elbowPose(-1, left),
    headTilt:
      phase === 'drink' ? -lift * 0.13 : 0.07 + Math.sin(t * 0.55) * 0.018,
    headTurn:
      phase === 'typing' ? Math.sin(t * 0.31) * Math.sin(t * 0.12) * 0.12 : 0,
    breath: Math.sin(t * 1.6) * 0.008,
    blinkAmount: Math.exp(-((((t % 5.4) - 5.3) / 0.065) ** 2)),
    blink: t % 5.4 > 5.22,
  };
}
