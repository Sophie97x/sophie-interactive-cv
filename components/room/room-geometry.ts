import * as THREE from 'three';

export const HATCH = { x: -1.35, z: 2.54, width: 1.21, depth: 1.51 };

// Shape XY becomes floor XZ; the hole stays open through both floor layers.
export function floorShape(width: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -depth / 2);
  shape.lineTo(width / 2, -depth / 2);
  shape.lineTo(width / 2, depth / 2);
  shape.lineTo(-width / 2, depth / 2);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(HATCH.x - HATCH.width / 2, HATCH.z - HATCH.depth / 2);
  hole.lineTo(HATCH.x - HATCH.width / 2, HATCH.z + HATCH.depth / 2);
  hole.lineTo(HATCH.x + HATCH.width / 2, HATCH.z + HATCH.depth / 2);
  hole.lineTo(HATCH.x + HATCH.width / 2, HATCH.z - HATCH.depth / 2);
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}
