import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
export type ZoomCommand = { id: number; direction: 'in' | 'out' };
export const ROOM_ZOOM_LIMITS = { min: 1.1, max: 32 };
export function configureRoomNavigation(controls: OrbitControls) {
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.screenSpacePanning = true;
  controls.zoomToCursor = true;
  controls.zoomSpeed = 0.85;
  controls.panSpeed = 0.75;
  controls.minDistance = ROOM_ZOOM_LIMITS.min;
  controls.maxDistance = ROOM_ZOOM_LIMITS.max;
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = 1.48;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
}

// Keep the point being explored inside the attic without snapping the camera.
export function constrainRoomPan(controls: OrbitControls) {
  const { target, object } = controls;
  const dx = THREE.MathUtils.clamp(target.x, -5.3, 5.3) - target.x;
  const dy = THREE.MathUtils.clamp(target.y, 0.2, 4.4) - target.y;
  const dz = THREE.MathUtils.clamp(target.z, -4.3, 4.3) - target.z;
  target.x += dx;
  target.y += dy;
  target.z += dz;
  object.position.x += dx;
  object.position.y += dy;
  object.position.z += dz;
}
export function applyZoom(
  controls: OrbitControls,
  direction: ZoomCommand['direction'],
) {
  if (direction === 'in') controls.dollyIn(0.8);
  else controls.dollyOut(0.8);
}
