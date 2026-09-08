export const PRINT_DURATION = 90;
const PREPARE_SECONDS = 2;
const FINISH_SECONDS = 2;
const DEPOSIT_SECONDS = PRINT_DURATION - PREPARE_SECONDS - FINISH_SECONDS;
export const PRINT_LAYERS = 60;
export const PRINT_HEIGHT = 0.42;

/** A finite demo job: home, deposit real layers, lift and present the bed. */
export function printPose(seconds: number) {
  const t = Math.max(0, Math.min(PRINT_DURATION, seconds));
  const progress = Math.max(
    0,
    Math.min(1, (t - PREPARE_SECONDS) / DEPOSIT_SECONDS),
  );
  const layers = Math.floor(progress * PRINT_LAYERS);
  const finishing = Math.max(
    0,
    Math.min(1, (t - (PRINT_DURATION - FINISH_SECONDS)) / FINISH_SECONDS),
  );
  const angle =
    ((t - PREPARE_SECONDS) / DEPOSIT_SECONDS) * PRINT_LAYERS * Math.PI * 2;
  const y = progress * PRINT_HEIGHT;
  const ear = y > 0.29;
  const radius = ear
    ? 0.04
    : Math.max(
        0.04,
        Math.sqrt(
          Math.max(
            0,
            1 - ((y - (y < 0.18 ? 0.1 : 0.225)) / (y < 0.18 ? 0.13 : 0.1)) ** 2,
          ),
        ) * (y < 0.18 ? 0.13 : 0.115),
      );
  return {
    progress,
    layers,
    phase:
      t < PREPARE_SECONDS
        ? 'Preparing'
        : t < PRINT_DURATION - FINISH_SECONDS
          ? 'Printing'
          : t < PRINT_DURATION
            ? 'Finishing'
            : 'Complete',
    x:
      (Math.cos(angle) * radius + (ear ? (layers % 2 ? -0.058 : 0.058) : 0)) *
        (1 - finishing) +
      0.33 * finishing,
    // The nozzle is at z=-.15; move the bed so each contour meets it.
    bedZ:
      (-0.28 - Math.sin(angle) * radius * 0.8) * (1 - finishing) +
      0.12 * finishing,
    headY: 0.26 + y - 0.44 + finishing * 0.15,
  };
}
