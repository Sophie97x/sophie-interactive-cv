'use client';
import { createContext, useContext, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { petPose, type PetPose } from './pet-motion';
import { Quail } from './quail';
import type { PetKind } from '@/lib/profile';
export const PetCanUseDesk = createContext(true);

/*
 * The room can have a quail, a cat, a dog, or nobody at all.
 *
 * Cat and dog reuse the quail's wander path (quail-motion) so they pad around
 * the floor on the same route, with their own gaits layered on top — a slow
 * stretch-and-sit for the cat, a busier trot and tail wag for the dog.
 */

type PetProps = {
  motion: boolean;
  loved: boolean;
  onPet: () => void;
  color?: string;
};

/** Four hip pivots, one per leg. */
function useLegRefs() {
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);
  const c = useRef<THREE.Group>(null);
  const d = useRef<THREE.Group>(null);
  return useMemo(() => [a, b, c, d], []);
}

/**
 * Diagonal-pair gait: front-left swings with back-right. Legs only move while
 * actually walking, tuck under when seated, and gather beneath the body for a
 * crouch or a leap.
 */
function swingLegs(
  refs: ReturnType<typeof useLegRefs>,
  p: PetPose,
  loved: boolean,
) {
  const walking = p.phase === 'walk' && !loved;
  refs.forEach((ref, i) => {
    const leg = ref.current;
    if (!leg) return;
    if (p.seated) {
      // back legs fold, front legs stay planted
      leg.rotation.x = i < 2 ? 0 : 1.15;
      return;
    }
    if (p.phase === 'leap' || p.phase === 'hop-down') {
      leg.rotation.x = i < 2 ? -0.5 : 0.55;
      return;
    }
    if (!walking) {
      leg.rotation.x = 0;
      return;
    }
    // diagonal pairs: 0 front-left + 3 back-right, 1 front-right + 2 back-left
    const diagonal = i === 0 || i === 3 ? 0 : Math.PI;
    leg.rotation.x = Math.sin(p.stride * Math.PI * 2 + diagonal) * 0.55;
  });
}

/** Drive the root transform, turning smoothly rather than snapping. */
function placePet(
  root: React.RefObject<THREE.Group | null>,
  p: PetPose,
  motion: boolean,
  dt: number,
) {
  const g = root.current;
  if (!g) return;
  g.position.set(p.x, p.y, p.z);
  const current = g.rotation.y;
  // shortest way round, so it never spins the long way to turn a corner
  const delta = Math.atan2(
    Math.sin(p.yaw - current),
    Math.cos(p.yaw - current),
  );
  g.rotation.set(
    0,
    motion
      ? THREE.MathUtils.damp(current, current + delta, 9, Math.min(dt, 0.05))
      : p.yaw,
    0,
  );
}

function Heart({
  visible,
  position,
}: {
  visible: boolean;
  position: THREE.Vector3;
}) {
  const group = useRef<THREE.Group>(null);
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.14);
    s.bezierCurveTo(-0.34, 0.06, -0.17, 0.32, 0, 0.14);
    s.bezierCurveTo(0.17, 0.32, 0.34, 0.06, 0, -0.14);
    return s;
  }, []);
  useFrame(({ camera }) => {
    if (!group.current) return;
    group.current.position.copy(position);
    group.current.quaternion.copy(camera.quaternion);
  });
  return (
    <group ref={group} visible={visible} scale={0.5}>
      <mesh>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color="#ef6d8a" transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

function CuteEye({
  position,
  size = 0.02,
}: {
  position: [number, number, number];
  size?: number;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 10, 9]} />
        <meshBasicMaterial color="#292421" />
      </mesh>
      <mesh position={[size * 0.3, size * 0.32, size * 0.82]}>
        <sphereGeometry args={[size * 0.28, 7, 7]} />
        <meshBasicMaterial color="#fffdf6" />
      </mesh>
    </group>
  );
}

function Paw({
  color,
  y = -0.13,
  size = 0.034,
}: {
  color: string;
  y?: number;
  size?: number;
}) {
  return (
    <mesh position={[0, y, 0.025]} scale={[1.15, 0.5, 1.35]} castShadow>
      <sphereGeometry args={[size, 10, 8]} />
      <meshStandardMaterial color={color} roughness={0.98} />
    </mesh>
  );
}

/* ------------------------------------------------------------------- cat */

export function Cat({ motion, loved, onPet, color = '#c9873f' }: PetProps) {
  const canUseDesk = useContext(PetCanUseDesk);
  const root = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null),
    tail = useRef<THREE.Group>(null),
    ears = useRef<THREE.Group>(null),
    eyes = useRef<THREE.Group>(null);
  const legRefs = useLegRefs();
  const elapsed = useRef(0);
  const heartAt = useMemo(() => new THREE.Vector3(), []);
  const tailCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.04, -0.09),
        new THREE.Vector3(0.015, 0.13, -0.17),
        new THREE.Vector3(0.055, 0.23, -0.16),
        new THREE.Vector3(0.11, 0.3, -0.08),
      ]),
    [],
  );

  useFrame((_, dt) => {
    if (motion && !loved) elapsed.current += Math.min(dt, 0.05);
    const t = elapsed.current;
    const p = petPose(t, canUseDesk);
    placePet(root, p, motion, dt);
    if (body.current) {
      // Crouch flattens the body before a spring; a gentle sway while walking.
      const walking = p.phase === 'walk';
      body.current.position.y = loved
        ? -0.03
        : -p.crouch * 0.07 +
          (walking ? Math.abs(Math.sin(p.stride * Math.PI)) * 0.012 : 0);
      body.current.rotation.z =
        loved || !walking ? 0 : Math.sin(p.stride * Math.PI) * 0.025;
      // Sitting up: front of the body lifts, back stays down.
      body.current.rotation.x = THREE.MathUtils.damp(
        body.current.rotation.x,
        p.seated ? -0.35 : p.phase === 'leap' ? -0.5 : 0,
        8,
        Math.min(dt, 0.05),
      );
      body.current.scale.y = 1 - p.crouch * 0.16;
    }
    swingLegs(legRefs, p, loved);
    if (tail.current) {
      tail.current.rotation.y =
        Math.sin(t * (loved ? 4 : p.seated ? 1.1 : 2.4)) *
        (p.seated ? 0.28 : 0.5);
      tail.current.rotation.z = Math.sin(t * 0.85) * 0.08;
    }
    if (ears.current)
      ears.current.rotation.x = loved ? -0.2 : Math.sin(t * 0.7) * 0.08;
    if (eyes.current) eyes.current.scale.y = loved || t % 5.2 > 5.05 ? 0.15 : 1;
    heartAt.set(p.x, p.y + 0.62, p.z);
  });

  const fur = <meshStandardMaterial color={color} roughness={0.95} />;
  const dark = new THREE.Color(color).multiplyScalar(0.72).getStyle();

  return (
    <>
      <group
        ref={root}
        onClick={(e) => {
          e.stopPropagation();
          onPet();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <group ref={body}>
          {/* generous invisible hit area so it is easy to click */}
          <mesh visible={false} position={[0, 0.2, 0]}>
            <boxGeometry args={[0.7, 0.55, 0.5]} />
          </mesh>

          {/* body */}
          <mesh
            position={[0, 0.2, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <capsuleGeometry args={[0.135, 0.24, 8, 18]} />
            {fur}
          </mesh>
          {/* head */}
          <group position={[0, 0.36, 0.19]}>
            <mesh castShadow>
              <sphereGeometry args={[0.13, 14, 12]} />
              {fur}
            </mesh>
            <group ref={ears}>
              {[-0.075, 0.075].map((x) => (
                <mesh
                  key={x}
                  position={[x, 0.11, -0.01]}
                  rotation={[0, 0, x > 0 ? -0.2 : 0.2]}
                  castShadow
                >
                  <coneGeometry args={[0.045, 0.1, 4]} />
                  {fur}
                  <mesh position={[0, 0.004, 0.027]}>
                    <coneGeometry args={[0.026, 0.065, 3]} />
                    <meshStandardMaterial color="#e6a4a7" roughness={0.9} />
                  </mesh>
                </mesh>
              ))}
            </group>
            <group ref={eyes}>
              {[-0.055, 0.055].map((x) => (
                <CuteEye key={x} position={[x, 0.02, 0.115]} size={0.019} />
              ))}
            </group>
            <mesh position={[0, -0.025, 0.128]}>
              <sphereGeometry args={[0.016, 8, 8]} />
              <meshBasicMaterial color="#e28fa0" />
            </mesh>
            {[-1, 1].map((side) => (
              <group key={side}>
                <mesh
                  position={[side * 0.025, -0.035, 0.114]}
                  scale={[1, 0.65, 0.55]}
                >
                  <sphereGeometry args={[0.035, 14, 10]} />
                  <meshStandardMaterial color="#f5dfc9" roughness={1} />
                </mesh>
                {[0, 1].map((row) => (
                  <mesh
                    key={row}
                    position={[side * 0.092, -0.025 - row * 0.014, 0.11]}
                    rotation={[0, 0, side * (Math.PI / 2 - 0.13 + row * 0.24)]}
                  >
                    <capsuleGeometry args={[0.0015, 0.09, 3, 5]} />
                    <meshStandardMaterial color="#f6ede2" />
                  </mesh>
                ))}
              </group>
            ))}
          </group>
          {/* legs — hinged at the hip so they can swing */}
          {[
            [-0.08, 0.1],
            [0.08, 0.1],
            [-0.08, -0.11],
            [0.08, -0.11],
          ].map(([x, z], i) => (
            <group key={i} ref={legRefs[i]} position={[x, 0.125, z]}>
              <mesh position={[0, -0.065, 0]} castShadow>
                <cylinderGeometry args={[0.03, 0.028, 0.13, 7]} />
                <meshStandardMaterial color={dark} roughness={0.95} />
              </mesh>
              <Paw color="#f5dfc9" />
            </group>
          ))}
          {/* tail */}
          <group ref={tail} position={[0, 0.25, -0.15]}>
            <mesh castShadow>
              <tubeGeometry args={[tailCurve, 20, 0.028, 8, false]} />
              {fur}
            </mesh>
            <mesh position={[0.11, 0.3, -0.08]} castShadow>
              <sphereGeometry args={[0.029, 9, 8]} />
              {fur}
            </mesh>
          </group>
        </group>
      </group>
      <Heart visible={loved} position={heartAt} />
    </>
  );
}

/* ------------------------------------------------------------------- dog */

export function Dog({ motion, loved, onPet, color = '#c98a55' }: PetProps) {
  const canUseDesk = useContext(PetCanUseDesk);
  const root = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null),
    tail = useRef<THREE.Group>(null),
    head = useRef<THREE.Group>(null),
    ears = useRef<THREE.Group>(null),
    eyes = useRef<THREE.Group>(null);
  const legRefs = useLegRefs();
  const elapsed = useRef(0);
  const heartAt = useMemo(() => new THREE.Vector3(), []);
  const tailCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.06, -0.07),
        new THREE.Vector3(0.01, 0.14, -0.13),
        new THREE.Vector3(0.025, 0.22, -0.12),
      ]),
    [],
  );

  useFrame((_, dt) => {
    if (motion && !loved) elapsed.current += Math.min(dt, 0.05);
    const t = elapsed.current;
    const p = petPose(t, canUseDesk);
    placePet(root, p, motion, dt);
    // busier than the cat — a trot, and a tail that never quite stops
    if (body.current) {
      const walking = p.phase === 'walk';
      body.current.position.y =
        (loved
          ? 0
          : walking
            ? Math.abs(Math.sin(p.stride * Math.PI)) * 0.018
            : 0) -
        p.crouch * 0.07;
      body.current.rotation.x = THREE.MathUtils.damp(
        body.current.rotation.x,
        p.seated ? -0.4 : p.phase === 'leap' ? -0.55 : 0,
        8,
        Math.min(dt, 0.05),
      );
      body.current.scale.y = 1 - p.crouch * 0.16;
    }
    swingLegs(legRefs, p, loved);
    if (tail.current)
      tail.current.rotation.y =
        Math.sin(t * (loved ? 16 : p.seated ? 7 : 11)) * (loved ? 0.9 : 0.6);
    if (head.current)
      head.current.rotation.x = loved
        ? 0.22
        : p.phase === 'sniff'
          ? 0.3
          : Math.sin(t * 1.6) * 0.06;
    if (ears.current)
      ears.current.children.forEach((ear, i) => {
        ear.rotation.x = 0.25 + Math.sin(t * 7 + i) * (loved ? 0.05 : 0.16);
      });
    if (eyes.current) eyes.current.scale.y = loved || t % 4.4 > 4.28 ? 0.15 : 1;
    heartAt.set(p.x, p.y + 0.68, p.z);
  });

  const fur = <meshStandardMaterial color={color} roughness={0.95} />;
  const dark = new THREE.Color(color).multiplyScalar(0.7).getStyle();
  const cream = new THREE.Color(color)
    .lerp(new THREE.Color('#fff6ea'), 0.65)
    .getStyle();

  return (
    <>
      <group
        ref={root}
        onClick={(e) => {
          e.stopPropagation();
          onPet();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <group ref={body}>
          <mesh visible={false} position={[0, 0.22, 0]}>
            <boxGeometry args={[0.7, 0.6, 0.55]} />
          </mesh>

          {/* body */}
          <mesh
            position={[0, 0.23, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <capsuleGeometry args={[0.15, 0.26, 6, 12]} />
            {fur}
          </mesh>
          {/* chest patch */}
          <mesh position={[0, 0.19, 0.15]} castShadow>
            <sphereGeometry args={[0.1, 12, 10]} />
            <meshStandardMaterial color={cream} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.34, 0.13]}>
            <torusGeometry args={[0.105, 0.012, 6, 20]} />
            <meshStandardMaterial color="#6e9ccf" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.28, 0.22]} castShadow>
            <sphereGeometry args={[0.025, 9, 8]} />
            <meshStandardMaterial
              color="#e2b85a"
              metalness={0.25}
              roughness={0.45}
            />
          </mesh>
          {/* head */}
          <group ref={head} position={[0, 0.42, 0.2]}>
            <mesh castShadow>
              <sphereGeometry args={[0.135, 14, 12]} />
              {fur}
            </mesh>
            {/* muzzle */}
            <mesh position={[0, -0.04, 0.11]} castShadow>
              <capsuleGeometry args={[0.055, 0.07, 4, 8]} />
              <meshStandardMaterial color={cream} roughness={0.95} />
            </mesh>
            <mesh position={[0, -0.025, 0.185]}>
              <sphereGeometry args={[0.024, 8, 8]} />
              <meshBasicMaterial color="#2b2622" />
            </mesh>
            {/* floppy ears */}
            <group ref={ears}>
              {[-0.11, 0.11].map((x) => (
                <group key={x} position={[x, 0.03, -0.01]}>
                  <mesh castShadow>
                    <capsuleGeometry args={[0.038, 0.12, 4, 8]} />
                    <meshStandardMaterial color={dark} roughness={0.95} />
                  </mesh>
                  <mesh position={[0, 0, 0.029]} scale={[0.55, 0.72, 0.35]}>
                    <capsuleGeometry args={[0.038, 0.11, 4, 8]} />
                    <meshStandardMaterial color="#d79b91" roughness={0.95} />
                  </mesh>
                </group>
              ))}
            </group>
            <group ref={eyes}>
              {[-0.06, 0.06].map((x) => (
                <CuteEye key={x} position={[x, 0.035, 0.108]} size={0.021} />
              ))}
            </group>
          </group>
          {/* legs — hinged at the hip so they can swing */}
          {[
            [-0.09, 0.11],
            [0.09, 0.11],
            [-0.09, -0.12],
            [0.09, -0.12],
          ].map(([x, z], i) => (
            <group key={i} ref={legRefs[i]} position={[x, 0.145, z]}>
              <mesh position={[0, -0.075, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.032, 0.15, 7]} />
                <meshStandardMaterial color={dark} roughness={0.95} />
              </mesh>
              <Paw color={cream} />
            </group>
          ))}
          {/* wagging tail */}
          <group ref={tail} position={[0, 0.3, -0.18]}>
            <mesh castShadow>
              <tubeGeometry args={[tailCurve, 16, 0.034, 8, false]} />
              {fur}
            </mesh>
            <mesh position={[0.025, 0.22, -0.12]} castShadow>
              <sphereGeometry args={[0.035, 9, 8]} />
              {fur}
            </mesh>
          </group>
        </group>
      </group>
      <Heart visible={loved} position={heartAt} />
    </>
  );
}

/* ----------------------------------------------------------------- rabbit */

/** Hops rather than walks — both back legs together, ears bouncing after. */
export function Rabbit({ motion, loved, onPet, color = '#cfc4bb' }: PetProps) {
  const canUseDesk = useContext(PetCanUseDesk);
  const root = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null),
    ears = useRef<THREE.Group>(null),
    eyes = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const heartAt = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (motion && !loved) elapsed.current += Math.min(dt, 0.05);
    const t = elapsed.current;
    const p = petPose(t, canUseDesk);
    placePet(root, p, motion, dt);
    // A hop is a bounce on the stride rather than a leg swing.
    const hop =
      p.phase === 'walk' && !loved
        ? Math.abs(Math.sin(p.stride * Math.PI)) * 0.11
        : 0;
    if (body.current) {
      body.current.position.y = hop - p.crouch * 0.06;
      body.current.rotation.x = THREE.MathUtils.damp(
        body.current.rotation.x,
        p.seated ? -0.5 : p.phase === 'leap' ? -0.6 : -hop * 1.6,
        9,
        Math.min(dt, 0.05),
      );
      body.current.scale.y = 1 - p.crouch * 0.18;
    }
    if (ears.current)
      ears.current.children.forEach((ear, i) => {
        // ears lag the hop, then flop back
        ear.rotation.x = -0.15 + hop * 2.6 + Math.sin(t * 2 + i) * 0.06;
      });
    if (eyes.current) eyes.current.scale.y = loved || t % 4.8 > 4.68 ? 0.15 : 1;
    heartAt.set(p.x, p.y + 0.6, p.z);
  });

  const fur = <meshStandardMaterial color={color} roughness={0.97} />;
  const pink = '#e7a9b4';

  return (
    <>
      <group
        ref={root}
        onClick={(e) => {
          e.stopPropagation();
          onPet();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <group ref={body}>
          <mesh visible={false} position={[0, 0.2, 0]}>
            <boxGeometry args={[0.55, 0.6, 0.55]} />
          </mesh>
          {/* rounded body */}
          <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.16, 14, 12]} />
            {fur}
          </mesh>
          {/* head */}
          <group position={[0, 0.3, 0.14]}>
            <mesh castShadow>
              <sphereGeometry args={[0.11, 14, 12]} />
              {fur}
            </mesh>
            <group ref={ears}>
              {[-0.05, 0.05].map((x) => (
                <group key={x} position={[x, 0.09, -0.01]}>
                  <mesh position={[0, 0.11, 0]} castShadow>
                    <capsuleGeometry args={[0.028, 0.16, 4, 8]} />
                    {fur}
                  </mesh>
                  <mesh position={[0, 0.11, 0.02]}>
                    <capsuleGeometry args={[0.016, 0.12, 4, 8]} />
                    <meshStandardMaterial color={pink} roughness={0.95} />
                  </mesh>
                </group>
              ))}
            </group>
            <group ref={eyes}>
              {[-0.05, 0.05].map((x) => (
                <CuteEye key={x} position={[x, 0.01, 0.09]} size={0.018} />
              ))}
            </group>
            <mesh position={[0, -0.03, 0.105]}>
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshBasicMaterial color={pink} />
            </mesh>
            {[-0.06, 0.06].map((x) => (
              <mesh
                key={x}
                position={[x, -0.035, 0.092]}
                scale={[1, 0.7, 0.45]}
              >
                <sphereGeometry args={[0.027, 10, 8]} />
                <meshStandardMaterial color="#f3d8d6" roughness={1} />
              </mesh>
            ))}
          </group>
          {/* back feet */}
          {[-0.07, 0.07].map((x) => (
            <mesh
              key={x}
              position={[x, 0.05, -0.06]}
              rotation={[1.5, 0, 0]}
              castShadow
            >
              <capsuleGeometry args={[0.032, 0.08, 4, 8]} />
              {fur}
            </mesh>
          ))}
          {[-0.055, 0.055].map((x) => (
            <mesh
              key={x}
              position={[x, 0.055, 0.105]}
              rotation={[0.25, 0, 0]}
              castShadow
            >
              <capsuleGeometry args={[0.025, 0.07, 4, 8]} />
              {fur}
            </mesh>
          ))}
          {/* bobtail */}
          <mesh position={[0, 0.2, -0.17]} castShadow>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color="#f6f2ec" roughness={1} />
          </mesh>
        </group>
      </group>
      <Heart visible={loved} position={heartAt} />
    </>
  );
}

/* -------------------------------------------------------------------- fox */

/** Dog-shaped, but with a pointed muzzle, upright ears and a big brush tail. */
export function Fox({ motion, loved, onPet, color = '#d9743a' }: PetProps) {
  const canUseDesk = useContext(PetCanUseDesk);
  const root = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null),
    tail = useRef<THREE.Group>(null),
    eyes = useRef<THREE.Group>(null);
  const legRefs = useLegRefs();
  const elapsed = useRef(0);
  const heartAt = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (motion && !loved) elapsed.current += Math.min(dt, 0.05);
    const t = elapsed.current;
    const p = petPose(t, canUseDesk);
    placePet(root, p, motion, dt);
    if (body.current) {
      const walking = p.phase === 'walk';
      body.current.position.y =
        (loved
          ? 0
          : walking
            ? Math.abs(Math.sin(p.stride * Math.PI)) * 0.015
            : 0) -
        p.crouch * 0.07;
      body.current.rotation.x = THREE.MathUtils.damp(
        body.current.rotation.x,
        p.seated ? -0.4 : p.phase === 'leap' ? -0.55 : 0,
        8,
        Math.min(dt, 0.05),
      );
      body.current.scale.y = 1 - p.crouch * 0.16;
    }
    swingLegs(legRefs, p, loved);
    if (tail.current) {
      tail.current.rotation.y = Math.sin(t * (loved ? 9 : 2.2)) * 0.35;
      tail.current.rotation.x = p.seated ? -0.4 : -0.15;
    }
    if (eyes.current) eyes.current.scale.y = loved || t % 5 > 4.88 ? 0.15 : 1;
    heartAt.set(p.x, p.y + 0.66, p.z);
  });

  const fur = <meshStandardMaterial color={color} roughness={0.95} />;
  const dark = new THREE.Color(color).multiplyScalar(0.55).getStyle();
  const cream = '#f6efe4';

  return (
    <>
      <group
        ref={root}
        onClick={(e) => {
          e.stopPropagation();
          onPet();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <group ref={body}>
          <mesh visible={false} position={[0, 0.22, 0]}>
            <boxGeometry args={[0.7, 0.6, 0.6]} />
          </mesh>
          <mesh
            position={[0, 0.22, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <capsuleGeometry args={[0.13, 0.26, 6, 12]} />
            {fur}
          </mesh>
          {/* head with a pointed muzzle */}
          <group position={[0, 0.38, 0.2]}>
            <mesh castShadow>
              <sphereGeometry args={[0.115, 14, 12]} />
              {fur}
            </mesh>
            <mesh
              position={[0, -0.03, 0.1]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <coneGeometry args={[0.06, 0.13, 10]} />
              <meshStandardMaterial color={cream} roughness={0.95} />
            </mesh>
            <mesh position={[0, -0.03, 0.17]}>
              <sphereGeometry args={[0.019, 8, 8]} />
              <meshBasicMaterial color="#2b2622" />
            </mesh>
            {/* upright triangular ears */}
            {[-0.07, 0.07].map((x) => (
              <group
                key={x}
                position={[x, 0.1, -0.01]}
                rotation={[0, 0, x > 0 ? -0.16 : 0.16]}
              >
                <mesh castShadow>
                  <coneGeometry args={[0.045, 0.12, 4]} />
                  <meshStandardMaterial color={dark} roughness={0.95} />
                </mesh>
                <mesh position={[0, -0.006, 0.025]} scale={0.62}>
                  <coneGeometry args={[0.045, 0.1, 4]} />
                  <meshStandardMaterial color="#e8a58f" roughness={0.95} />
                </mesh>
              </group>
            ))}
            <group ref={eyes}>
              {[-0.05, 0.05].map((x) => (
                <CuteEye key={x} position={[x, 0.02, 0.095]} size={0.018} />
              ))}
            </group>
          </group>
          {[
            [-0.08, 0.1],
            [0.08, 0.1],
            [-0.08, -0.11],
            [0.08, -0.11],
          ].map(([x, z], i) => (
            <group key={i} ref={legRefs[i]} position={[x, 0.13, z]}>
              <mesh position={[0, -0.07, 0]} castShadow>
                <cylinderGeometry args={[0.028, 0.026, 0.14, 7]} />
                <meshStandardMaterial color={dark} roughness={0.95} />
              </mesh>
              <Paw color={i < 2 ? cream : dark} />
            </group>
          ))}
          {/* brush tail with a white tip */}
          <group ref={tail} position={[0, 0.27, -0.19]}>
            <mesh position={[0, 0.02, -0.13]} rotation={[1.2, 0, 0]} castShadow>
              <capsuleGeometry args={[0.06, 0.2, 5, 10]} />
              {fur}
            </mesh>
            <mesh position={[0, 0.06, -0.25]} castShadow>
              <sphereGeometry args={[0.055, 10, 8]} />
              <meshStandardMaterial color={cream} roughness={0.97} />
            </mesh>
          </group>
        </group>
      </group>
      <Heart visible={loved} position={heartAt} />
    </>
  );
}

/* ---------------------------------------------------------------- hamster */

/** Small, round and busy — scurries with quick little steps. */
export function Hamster({ motion, loved, onPet, color = '#e0b071' }: PetProps) {
  const canUseDesk = useContext(PetCanUseDesk);
  const root = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null),
    eyes = useRef<THREE.Group>(null);
  const legRefs = useLegRefs();
  const elapsed = useRef(0);
  const heartAt = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (motion && !loved) elapsed.current += Math.min(dt, 0.05);
    const t = elapsed.current;
    const p = petPose(t, canUseDesk);
    placePet(root, p, motion, dt);
    if (body.current) {
      const walking = p.phase === 'walk';
      // quicker, smaller bounce than the bigger animals
      body.current.position.y =
        (loved
          ? 0
          : walking
            ? Math.abs(Math.sin(p.stride * Math.PI * 2)) * 0.012
            : 0) -
        p.crouch * 0.04;
      body.current.rotation.x = THREE.MathUtils.damp(
        body.current.rotation.x,
        p.seated ? -0.55 : 0,
        9,
        Math.min(dt, 0.05),
      );
    }
    swingLegs(legRefs, { ...p, stride: p.stride * 2 }, loved);
    if (eyes.current) eyes.current.scale.y = loved || t % 3.6 > 3.5 ? 0.15 : 1;
    heartAt.set(p.x, p.y + 0.42, p.z);
  });

  const fur = <meshStandardMaterial color={color} roughness={0.97} />;
  const cream = '#f7efe0';

  return (
    <>
      <group
        ref={root}
        scale={0.72}
        onClick={(e) => {
          e.stopPropagation();
          onPet();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <group ref={body}>
          <mesh visible={false} position={[0, 0.16, 0]}>
            <boxGeometry args={[0.5, 0.45, 0.5]} />
          </mesh>
          <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.15, 14, 12]} />
            {fur}
          </mesh>
          <mesh position={[0, 0.12, 0.09]} castShadow>
            <sphereGeometry args={[0.1, 12, 10]} />
            <meshStandardMaterial color={cream} roughness={0.97} />
          </mesh>
          <group position={[0, 0.24, 0.1]}>
            <mesh castShadow>
              <sphereGeometry args={[0.1, 14, 12]} />
              {fur}
            </mesh>
            {[-0.06, 0.06].map((x) => (
              <group key={x} position={[x, 0.08, -0.01]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.04, 10, 8]} />
                  {fur}
                </mesh>
                <mesh position={[0, 0, 0.034]}>
                  <sphereGeometry args={[0.021, 9, 7]} />
                  <meshStandardMaterial color="#dfa5a4" roughness={1} />
                </mesh>
              </group>
            ))}
            <group ref={eyes}>
              {[-0.045, 0.045].map((x) => (
                <CuteEye key={x} position={[x, 0.005, 0.085]} size={0.017} />
              ))}
            </group>
            <mesh position={[0, -0.03, 0.098]}>
              <sphereGeometry args={[0.013, 8, 8]} />
              <meshBasicMaterial color="#d98a95" />
            </mesh>
            {[-0.062, 0.062].map((x) => (
              <mesh
                key={x}
                position={[x, -0.025, 0.075]}
                scale={[1, 0.72, 0.55]}
              >
                <sphereGeometry args={[0.035, 10, 8]} />
                <meshStandardMaterial color="#efb2a9" roughness={1} />
              </mesh>
            ))}
            <mesh position={[-0.014, -0.065, 0.096]}>
              <boxGeometry args={[0.022, 0.034, 0.009]} />
              <meshStandardMaterial color="#fff8e9" roughness={0.9} />
            </mesh>
            <mesh position={[0.014, -0.065, 0.096]}>
              <boxGeometry args={[0.022, 0.034, 0.009]} />
              <meshStandardMaterial color="#fff8e9" roughness={0.9} />
            </mesh>
          </group>
          {[
            [-0.07, 0.07],
            [0.07, 0.07],
            [-0.07, -0.07],
            [0.07, -0.07],
          ].map(([x, z], i) => (
            <group key={i} ref={legRefs[i]} position={[x, 0.07, z]}>
              <mesh position={[0, -0.035, 0]} castShadow>
                <capsuleGeometry args={[0.022, 0.04, 4, 6]} />
                <meshStandardMaterial color={cream} roughness={0.97} />
              </mesh>
              <Paw color={cream} y={-0.055} size={0.026} />
            </group>
          ))}
        </group>
      </group>
      <Heart visible={loved} position={heartAt} />
    </>
  );
}

/* ---------------------------------------------------------------- picker */

export function Pet({
  kind,
  motion,
  loved,
  onPet,
  color,
}: PetProps & { kind: PetKind }) {
  if (kind === 'none') return null;
  if (kind === 'cat')
    return <Cat motion={motion} loved={loved} onPet={onPet} color={color} />;
  if (kind === 'dog')
    return <Dog motion={motion} loved={loved} onPet={onPet} color={color} />;
  if (kind === 'rabbit')
    return <Rabbit motion={motion} loved={loved} onPet={onPet} color={color} />;
  if (kind === 'fox')
    return <Fox motion={motion} loved={loved} onPet={onPet} color={color} />;
  if (kind === 'hamster')
    return (
      <Hamster motion={motion} loved={loved} onPet={onPet} color={color} />
    );
  // The quail keeps its own plumage — its colours are painted per feather.
  return <Quail motion={motion} loved={loved} onPet={onPet} />;
}
