import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { floorShape, HATCH } from './room-geometry';
import * as THREE from 'three';
import { Box, Cyl } from './props';
import { ShelfPrint, WorkModel } from './attic-extras';

// Cutaway reconstruction from Sophie's attic video; dimensions are approximate.
export function AtticShell({
  night,
  motion,
  hatchOpen,
  onHatchToggle,
}: {
  night: boolean;
  motion: boolean;
  hatchOpen: boolean;
  onHatchToggle: () => void;
}) {
  const lid = useRef<THREE.Group>(null);
  const floor = useMemo(() => floorShape(9, 7), []);
  const base = useMemo(() => floorShape(9.2, 7.2), []);
  useFrame((_, dt) => {
    if (lid.current)
      lid.current.rotation.x = motion
        ? THREE.MathUtils.damp(
            lid.current.rotation.x,
            hatchOpen ? -1.65 : 0,
            7,
            Math.min(dt, 0.05),
          )
        : hatchOpen
          ? -1.65
          : 0;
  });
  const gable = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-4.5, 0);
    s.lineTo(-4.5, 1.55);
    s.lineTo(0, 4.65);
    s.lineTo(4.5, 1.55);
    s.lineTo(4.5, 0);
    s.closePath();
    return s;
  }, []);
  const slope = Math.atan2(3.1, 4.5);
  return (
    <group>
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.008, 0]}
        receiveShadow
      >
        <extrudeGeometry args={[base, { depth: 0.22, bevelEnabled: false }]} />
        <meshStandardMaterial color="#c8bdb1" />
      </mesh>
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        receiveShadow
      >
        <shapeGeometry args={[floor]} />
        <meshStandardMaterial
          color="#e7e3d9"
          side={THREE.DoubleSide}
          roughness={1}
        />
      </mesh>
      <mesh position={[0, 0, -3.54]} receiveShadow>
        <shapeGeometry args={[gable]} />
        <meshStandardMaterial
          color={night ? '#9f8099' : '#d8bfcd'}
          side={THREE.DoubleSide}
          roughness={1}
        />
      </mesh>
      <Box
        args={[0.1, 1.55, 7]}
        position={[-4.55, 0.75, 0]}
        color={night ? '#ad939f' : '#ded0d4'}
      />
      <Box args={[9, 0.14, 0.08]} position={[0, 0.08, -3.46]} color="#eddae1" />
      <Box args={[0.08, 0.14, 7]} position={[-4.46, 0.08, 0]} color="#eddae1" />
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 2.25, 3.1, -3.04]}
          rotation={[0, 0, -side * slope]}
        >
          {side < 0 ? (
            <Box
              args={[5.47, 0.08, 1.02]}
              color={night ? '#a890a5' : '#dfc7d6'}
            />
          ) : (
            [-1, 1].map((part) => (
              <Box
                key={part}
                args={[1.94, 0.08, 1.02]}
                position={[part * 1.77, 0, 0]}
                color={night ? '#a890a5' : '#dfc7d6'}
              />
            ))
          )}
          <Box
            args={[5.55, 0.19, 0.18]}
            position={[0, 0.03, 0.54]}
            color="#fff7f1"
          />
          <Box
            args={[5.55, 0.11, 0.12]}
            position={[0, 0.03, -0.5]}
            color="#fff7f1"
          />
        </group>
      ))}
      <Box args={[0.19, 0.2, 1.2]} position={[0, 4.67, -3]} color="#fff9f2" />
      <group
        position={[HATCH.x, 0.025, HATCH.z]}
        onClick={(e) => {
          e.stopPropagation();
          onHatchToggle();
        }}
      >
        {[-1, 1].map((side) => (
          <group key={side}>
            <Box
              args={[0.08, 0.06, 1.67]}
              position={[side * 0.645, 0, 0]}
              color="#a7aca9"
            />
            <Box
              args={[1.21, 0.06, 0.08]}
              position={[0, 0, side * 0.795]}
              color="#a7aca9"
            />
            <Box
              args={[0.06, 1, 1.51]}
              position={[side * 0.605, -0.53, 0]}
              color="#66636b"
            />
          </group>
        ))}
        <Box
          args={[1.21, 0.04, 1.51]}
          position={[0, -1.03, 0]}
          color="#28252d"
        />
        {[-1, 1].map((side) => (
          <Box
            key={side}
            args={[0.06, 1, 0.07]}
            position={[side * 0.4, -0.52, 0.45]}
            color="#ba9c76"
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <Box
            key={i}
            args={[0.8, 0.055, 0.09]}
            position={[0, -0.18 - i * 0.23, 0.45]}
            color="#d4b68f"
          />
        ))}
        <group
          ref={lid}
          position={[0, 0.025, -HATCH.depth / 2]}
          rotation={[hatchOpen ? -1.65 : 0, 0, 0]}
        >
          <Box
            args={[1.21, 0.045, 1.51]}
            position={[0, 0, HATCH.depth / 2]}
            color="#d1d4d0"
          />
          <Box
            args={[0.18, 0.04, 0.055]}
            position={[0, 0.04, 1.34]}
            color="#73777f"
          />
          {[-0.4, 0.4].map((x) => (
            <Cyl
              key={x}
              args={[0.035, 0.035, 0.13, 12]}
              position={[x, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
              color="#9699a2"
            />
          ))}
        </group>
      </group>
    </group>
  );
}

export function WoodDesk({
  width = 3.6,
  depth = 1.2,
}: {
  width?: number;
  depth?: number;
}) {
  return (
    <group>
      <Box
        args={[width, 0.11, depth]}
        position={[0, 1.05, 0]}
        color="#caa166"
      />
      <Box
        args={[width - 0.12, 0.16, 0.055]}
        position={[0, 0.94, -depth / 2 + 0.04]}
        color="#b48a52"
      />
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Cyl
            key={`${x}-${z}`}
            args={[0.036, 0.031, 1, 10]}
            position={[x * (width / 2 - 0.12), 0.5, z * (depth / 2 - 0.12)]}
            color="#545451"
          />
        )),
      )}
    </group>
  );
}

// One continuous fabric shell: a weighted base, slumped seat and raised back.
function beanbagSurface(x: number, y: number, z: number) {
  const angle = Math.atan2(z, x);
  const upper = Math.max(0, y);
  const folds = Math.sin(angle * 9 + y * 4) * 0.014 * (1 - y * y);
  const spread = 1 + 0.12 * (1 - y) + folds;
  const seat = Math.exp(-(x * x * 5 + (z - 0.18) ** 2 * 6));
  const back = Math.exp(-x * x * 2.5 - (z + 0.65) ** 2 * 4);
  return new THREE.Vector3(
    x * 0.81 * spread,
    Math.max(0.035, 0.5 + y * 0.49 + upper * back * 0.6 - upper * seat * 0.48),
    z * 0.85 * spread,
  );
}

function Beanbag() {
  const { geometry, seams } = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 64, 48);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = beanbagSurface(p.getX(i), p.getY(i), p.getZ(i));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const lines = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const points = Array.from({ length: 65 }, (_, j) => {
        const t = 0.035 + (j / 64) * 2.72;
        const v = beanbagSurface(Math.sin(t) * Math.cos(a), Math.cos(t), Math.sin(t) * Math.sin(a));
        return v.add(new THREE.Vector3(Math.cos(a) * 0.002, 0.003, Math.sin(a) * 0.002));
      });
      return new THREE.CatmullRomCurve3(points);
    });
    return { geometry: g, seams: lines };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial color="#ce5687" roughness={0.96} sheen={0.65} sheenColor="#efb7cd" sheenRoughness={0.85} />
      </mesh>
      {seams.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 64, 0.004, 5, false]} />
          <meshStandardMaterial color="#b54873" roughness={1} />
        </mesh>
      ))}
      <Box
        args={[0.065, 0.095, 0.014]}
        position={[-0.62, 0.22, 0.58]}
        rotation={[0, -0.65, -0.15]}
        color="#f1d9ce"
      />
    </group>
  );
}

export function Beanbags() {
  return (
    <group position={[3.4, 0, 2.45]} rotation={[0, -2.3, 0]}>
      <Beanbag />
    </group>
  );
}

export function HobbyDisplay() {
  return (
    <group>
      {[-0.65, 0.65].flatMap((x) =>
        [-0.3, 0.3].map((z) => (
          <Box
            key={`${x}-${z}`}
            args={[0.055, 2.9, 0.055]}
            position={[x, 1.45, z]}
            color="#333231"
          />
        )),
      )}
      {[0.14, 0.72, 1.3, 1.88, 2.46].map((y, i) => (
        <group key={y}>
          <Box args={[1.36, 0.055, 0.7]} position={[0, y, 0]} color="#775b40" />
          <group position={[-0.3, y + 0.04, 0]}>
            <ShelfPrint index={i * 2} />
          </group>
          <group position={[0.32, y + 0.04, 0]}>
            <ShelfPrint index={i * 2 + 1} />
          </group>
        </group>
      ))}
    </group>
  );
}

export function WorkDisplay() {
  return (
    <group>
      {[-0.76, 0.76].map((x) => (
        <Box
          key={x}
          args={[0.07, 2.75, 0.65]}
          position={[x, 1.375, 0]}
          color="#f3f0ea"
        />
      ))}
      {[0.08, 0.75, 1.42, 2.09, 2.76].map((y, i) => (
        <group key={y}>
          <Box args={[1.58, 0.07, 0.65]} position={[0, y, 0]} color="#f3f0ea" />
          {i < 4 && (
            <>
              <Box
                args={[0.055, 0.65, 0.65]}
                position={[i % 2 ? -0.18 : 0.22, y + 0.34, 0]}
                color="#f3f0ea"
              />
              <group position={[-0.48, y + 0.04, 0]}>
                <WorkModel index={i * 2} />
              </group>
              <group position={[0.44, y + 0.04, 0]}>
                <WorkModel index={i * 2 + 1} />
              </group>
            </>
          )}
        </group>
      ))}
    </group>
  );
}
