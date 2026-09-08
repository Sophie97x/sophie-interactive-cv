import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  Box,
  Cyl,
  Cat,
  Pokeball,
  Duck,
  Tower,
  MeshNode,
  Headset,
} from './props';

type V3 = [number, number, number];
export function Banner({
  text,
  position,
  width = 1.5,
}: {
  text: string;
  position: V3;
  width?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 192;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#f5dbe7';
    c.fillRect(0, 0, 768, 192);
    c.strokeStyle = '#b97591';
    c.lineWidth = 8;
    c.strokeRect(12, 12, 744, 168);
    c.fillStyle = '#593d50';
    c.font = 'bold 88px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 384, 102);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[width, width / 4]} />
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((side) => (
        <Cyl
          key={side}
          args={[0.012, 0.012, 0.22, 6]}
          position={[side * width * 0.38, width / 8 + 0.1, 0]}
          color="#efe6d5"
        />
      ))}
    </group>
  );
}

export function Cable({
  points,
  color = '#3f3a42',
  radius = 0.018,
}: {
  points: V3[];
  color?: string;
  radius?: number;
}) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    [points],
  );
  return (
    <mesh>
      <tubeGeometry args={[curve, 48, radius, 6, false]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

export function RoofAntenna({ onSelect }: { onSelect: () => void }) {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <group position={[0.3, 4.68, -3.02]}>
        <Box args={[0.28, 0.09, 0.32]} color="#777581" />
        <Cyl
          args={[0.035, 0.045, 0.9, 12]}
          position={[0, 0.47, 0]}
          color="#aeb2b8"
        />
        <Cyl
          args={[0.028, 0.028, 0.7, 12]}
          position={[0, 1.23, 0]}
          color="#f1ede4"
        />
        <Cyl
          args={[0.014, 0.014, 0.2, 8]}
          position={[0, 1.67, 0]}
          color="#b9bcc0"
        />
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI * 2) / 3, -0.7]}>
            <Cyl
              args={[0.012, 0.012, 0.45, 8]}
              position={[0, 0.32, 0]}
              color="#adb0b9"
            />
          </group>
        ))}
      </group>
      <Cable
        points={[
          [0.3, 4.71, -3.02],
          [0.3, 4.71, -3.65],
          [0.3, 3.6, -3.68],
          [2.8, 1.8, -3.68],
          [2.8, 1.68, -3.5],
          [2.8, 1.635, -2.875],
        ]}
      />
    </group>
  );
}

export function Skylight({
  open,
  night,
  motion,
  onToggle,
}: {
  open: boolean;
  night: boolean;
  motion: boolean;
  onToggle: () => void;
}) {
  const lid = useRef<THREE.Group>(null),
    beam = useRef<THREE.Mesh>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0.7, 0, -0.1);
    return o;
  }, []);
  useFrame((_, dt) => {
    if (lid.current)
      lid.current.rotation.z = motion
        ? THREE.MathUtils.damp(
            lid.current.rotation.z,
            open ? 1.05 : 0,
            7,
            Math.min(dt, 0.05),
          )
        : open
          ? 1.05
          : 0;
    if (beam.current) {
      beam.current.position.set(1.5, 1.62, -1.57);
      beam.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(1.6, 3.2, -2.94).normalize(),
      );
    }
  });
  return (
    <group>
      <group
        position={[2.25, 3.18, -3.04]}
        rotation={[0, 0, -Math.atan2(3.1, 4.5)]}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {[-1, 1].map((side) => (
          <group key={side}>
            <Box
              args={[0.08, 0.14, 1.02]}
              position={[side * 0.77, 0, 0]}
              color="#dec09d"
            />
            <Box
              args={[1.6, 0.14, 0.08]}
              position={[0, 0, side * 0.47]}
              color="#dec09d"
            />
          </group>
        ))}
        <group
          ref={lid}
          position={[-0.74, 0.07, 0]}
          rotation={[0, 0, open ? 1.05 : 0]}
        >
          <group position={[0.74, 0, 0]}>
            {/* Raised room-facing slats and cords remain visible above the glass. */}
            {Array.from({ length: 10 }, (_, i) => (
              <Box
                key={i}
                args={[1.4, 0.035, 0.071]}
                position={[0, 0.075, -0.39 + i * 0.087]}
                rotation={[0.14, 0, 0]}
                color={i % 2 ? '#c4a6bd' : '#e5cadd'}
              />
            ))}
            <Box
              args={[1.45, 0.085, 0.065]}
              position={[0, 0.075, -0.44]}
              color="#94788d"
            />
            {[-0.48, 0.48].map((x) => (
              <Box
                key={x}
                args={[0.014, 0.014, 0.86]}
                position={[x, 0.103, 0]}
                color="#725d70"
              />
            ))}
            <mesh>
              <boxGeometry args={[1.43, 0.045, 0.87]} />
              <meshStandardMaterial
                color={night ? '#7c9ebc' : '#b4e0eb'}
                transparent
                opacity={0.52}
                roughness={0.15}
                metalness={0.2}
              />
            </mesh>
            {[-1, 1].map((side) => (
              <Box
                key={side}
                args={[1.48, 0.075, 0.045]}
                position={[0, 0, side * 0.43]}
                color="#fbf4e7"
              />
            ))}
            <Box
              args={[0.055, 0.075, 0.9]}
              position={[0.72, 0, 0]}
              color="#fbf4e7"
            />
            <Box
              args={[0.045, 0.08, 0.25]}
              position={[0.67, -0.08, 0]}
              color="#a39485"
            />
          </group>
        </group>
      </group>
      <primitive object={target} />
      <spotLight
        position={[2.3, 3.22, -3.04]}
        target={target}
        color={night ? '#a8caff' : '#fff1b6'}
        intensity={open ? (night ? 7 : 28) : 0}
        angle={0.38}
        penumbra={0.5}
        distance={8}
        decay={1}
      />
      <mesh ref={beam} visible={open} raycast={() => null}>
        <cylinderGeometry args={[0.42, 1.05, 4.58, 24, 1, true]} />
        <meshBasicMaterial
          color={night ? '#a8caff' : '#fff0be'}
          transparent
          opacity={night ? 0.045 : 0.095}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        position={[0.7, 0.024, -0.1]}
        rotation={[-Math.PI / 2, 0, -0.4]}
        visible={open}
        raycast={() => null}
      >
        <circleGeometry args={[1.05, 48]} />
        <meshBasicMaterial
          color={night ? '#aac9ec' : '#fff4c7'}
          transparent
          opacity={night ? 0.12 : 0.3}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// Every shelf print has a distinct silhouette; these are decorative, not extra CV claims.
export function ShelfPrint({ index }: { index: number }) {
  switch (index) {
    case 0:
      return <Cat scale={1.2} />;
    case 1:
      return <Pokeball position={[0, 0.15, 0]} scale={0.9} />;
    case 2:
      return <Duck scale={1.4} />;
    case 3:
      return (
        <group>
          <Cyl
            args={[0.11, 0.17, 0.3, 7]}
            color="#b7a1de"
            position={[0, 0.15, 0]}
          />
          <mesh position={[0, 0.33, 0]}>
            <torusGeometry args={[0.1, 0.03, 6, 10]} />
            <meshStandardMaterial color="#c8b4ed" />
          </mesh>
        </group>
      );
    case 4:
      return (
        <group>
          <Box
            args={[0.31, 0.29, 0.21]}
            color="#e5ab66"
            position={[0, 0.18, 0]}
          />
          <Box
            args={[0.23, 0.19, 0.02]}
            color="#a5d3df"
            position={[0, 0.2, 0.115]}
          />
          {[-1, 1].map((s) => (
            <Cyl
              key={s}
              args={[0.013, 0.013, 0.18, 6]}
              color="#56505d"
              position={[s * 0.07, 0.39, 0]}
              rotation={[0, 0, s * 0.4]}
            />
          ))}
        </group>
      );
    case 5:
      return (
        <group>
          <Cyl
            args={[0.06, 0.09, 0.22, 10]}
            color="#f0dfb9"
            position={[0, 0.11, 0]}
          />
          <mesh position={[0, 0.27, 0]} scale={[1, 0.55, 1]}>
            <sphereGeometry
              args={[0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial color="#d27891" />
          </mesh>
        </group>
      );
    case 6:
      return (
        <group>
          <Box
            args={[0.25, 0.2, 0.18]}
            color="#9ec8b8"
            position={[0, 0.13, 0]}
          />
          <Box
            args={[0.24, 0.15, 0.19]}
            color="#aedcca"
            position={[0, 0.34, 0]}
          />
          {[-1, 1].map((s) => (
            <Box
              key={s}
              args={[0.045, 0.045, 0.015]}
              color="#494959"
              position={[s * 0.06, 0.36, 0.102]}
            />
          ))}
        </group>
      );
    case 7:
      return (
        <mesh position={[0, 0.24, 0]}>
          <torusKnotGeometry args={[0.13, 0.038, 48, 8]} />
          <meshStandardMaterial color="#85b9d3" />
        </mesh>
      );
    case 8:
      return (
        <group>
          <Cyl
            args={[0.1, 0.13, 0.15, 12]}
            color="#e5a9ba"
            position={[0, 0.075, 0]}
          />
          <Cyl
            args={[0.04, 0.045, 0.28, 8]}
            color="#99b480"
            position={[0, 0.25, 0]}
          />
          <Cyl
            args={[0.03, 0.03, 0.15, 8]}
            color="#99b480"
            position={[0.06, 0.24, 0]}
            rotation={[0, 0, -0.8]}
          />
        </group>
      );
    default:
      return (
        <group>
          <Box
            args={[0.3, 0.08, 0.2]}
            color="#d8c2e3"
            position={[0, 0.04, 0]}
          />
          <mesh position={[0, 0.23, 0]}>
            <octahedronGeometry args={[0.18]} />
            <meshStandardMaterial color="#bda2df" />
          </mesh>
        </group>
      );
  }
}

export function WorkModel({ index }: { index: number }) {
  if (index === 0) return <Tower scale={0.28} />;
  if (index === 1) return <MeshNode scale={0.7} />;
  if (index === 2) return <Headset scale={0.7} position={[0, 0.18, 0]} />;
  if (index === 3)
    return (
      <group>
        <Box
          args={[0.36, 0.045, 0.25]}
          color="#8ca5bc"
          position={[0, 0.025, 0]}
        />
        <Box
          args={[0.36, 0.26, 0.04]}
          color="#5d7389"
          position={[0, 0.16, -0.1]}
        />
        <Box
          args={[0.3, 0.2, 0.01]}
          color="#9bd1d2"
          position={[0, 0.16, -0.074]}
        />
      </group>
    );
  if (index === 4)
    return (
      <group>
        <Box args={[0.2, 0.37, 0.055]} color="#464054" position={[0, 0.2, 0]} />
        <Box
          args={[0.16, 0.27, 0.014]}
          color="#c7a7d9"
          position={[0, 0.21, 0.04]}
        />
      </group>
    );
  if (index === 5)
    return (
      <group>
        <Box args={[0.32, 0.21, 0.2]} color="#e7ded0" position={[0, 0.13, 0]} />
        <Box
          args={[0.22, 0.015, 0.28]}
          color="#fff9ee"
          position={[0, 0.08, 0.13]}
        />
        <Box
          args={[0.22, 0.012, 0.03]}
          color="#464451"
          position={[0, 0.19, 0.115]}
        />
      </group>
    );
  if (index === 6)
    return (
      <group>
        <Cyl
          args={[0.14, 0.14, 0.1, 14]}
          color="#8bacc0"
          position={[0, 0.05, 0]}
        />
        <Cyl
          args={[0.11, 0.11, 0.09, 14]}
          color="#a4c2d2"
          position={[0, 0.16, 0]}
        />
        <Cyl
          args={[0.08, 0.08, 0.09, 14]}
          color="#bed9e2"
          position={[0, 0.26, 0]}
        />
      </group>
    );
  return (
    <group>
      <Box args={[0.24, 0.33, 0.04]} color="#efe7d8" position={[0, 0.18, 0]} />
      <Box
        args={[0.17, 0.06, 0.012]}
        color="#a7c390"
        position={[0, 0.27, 0.03]}
      />
      <Box
        args={[0.14, 0.025, 0.012]}
        color="#807480"
        position={[0, 0.16, 0.03]}
      />
    </group>
  );
}

export function HomeLab() {
  return (
    <group>
      <Box
        args={[1.18, 0.035, 0.78]}
        position={[0, 1.45, 0.08]}
        color="#55515f"
      />
      {[-1, 1].map((side) => (
        <Box
          key={side}
          args={[0.04, 0.27, 0.68]}
          position={[side * 0.57, 1.32, 0.08]}
          color="#55515f"
        />
      ))}
      <group position={[0, 1.49, 0.08]} rotation={[0, -0.15, 0]}>
        <Box args={[1.05, 0.04, 0.7]} color="#bfc1cc" />
        <Box
          args={[0.83, 0.009, 0.27]}
          position={[0, 0.027, -0.13]}
          color="#393943"
        />
        <Box
          args={[0.31, 0.008, 0.19]}
          position={[0, 0.027, 0.16]}
          color="#a5a8b5"
        />
        <group position={[0, 0.32, -0.36]} rotation={[-0.16, 0, 0]}>
          <Box args={[1.05, 0.63, 0.035]} color="#bfc1cc" />
          <Box
            args={[0.97, 0.54, 0.01]}
            position={[0, 0.01, 0.024]}
            color="#847bba"
            emissive="#8466ad"
            emissiveIntensity={0.4}
          />
          <Banner text="MacBook" position={[0, -0.275, 0.035]} width={0.33} />
        </group>
      </group>
      <Box args={[1.35, 0.07, 0.9]} position={[0, 0.2, 0]} color="#c6a275" />
      <Box args={[1.35, 0.07, 0.9]} position={[0, 1.18, 0]} color="#c6a275" />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          args={[0.06, 1.2, 0.84]}
          position={[s * 0.64, 0.62, 0]}
          color="#49434d"
        />
      ))}
      <group position={[-0.3, 1.27, 0]} scale={0.58}>
        <Box args={[0.88, 0.14, 0.7]} color="#28282f" />
        <Box
          args={[0.75, 0.075, 0.015]}
          color="#17171d"
          position={[0, 0, 0.36]}
        />
        {[-0.24, -0.13].map((x) => (
          <Box
            key={x}
            args={[0.065, 0.025, 0.02]}
            color="#8a909a"
            position={[x, 0, 0.37]}
          />
        ))}
        <Cyl
          args={[0.025, 0.025, 0.012, 12]}
          color="#d8eabd"
          position={[0.31, 0, 0.374]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <Box
          args={[0.14, 0.04, 0.015]}
          color="#b82e45"
          position={[0.13, 0.01, 0.375]}
        />
      </group>
      <group position={[0.31, 1.27, 0]} scale={0.55}>
        <Box args={[0.75, 0.12, 0.44]} color="#d7d9df" />
        {[-0.25, -0.12, 0.01, 0.14].map((x) => (
          <group key={x}>
            <Box
              args={[0.085, 0.055, 0.02]}
              color="#454b58"
              position={[x, 0, 0.235]}
            />
            <Box
              args={[0.016, 0.012, 0.023]}
              color="#b5d584"
              emissive="#a8db77"
              emissiveIntensity={0.6}
              position={[x, 0.042, 0.24]}
            />
          </group>
        ))}
      </group>
      <Cable
        color="#b2a1d6"
        points={[
          [-0.3, 1.27, -0.23],
          [-0.3, 1.35, -0.39],
          [0.35, 1.35, -0.3],
          [0.39, 1.27, 0.13],
        ]}
      />
      <group position={[0, 0.47, 0]}>
        <Box args={[1.22, 0.34, 0.81]} color="#989da6" />
        <Box
          args={[1.24, 0.31, 0.045]}
          color="#343740"
          position={[0, 0, 0.42]}
        />
        {[-1, 1].map((side) => (
          <Box
            key={side}
            args={[0.055, 0.28, 0.08]}
            color="#b3b8c0"
            position={[side * 0.59, 0, 0.47]}
          />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <group
            key={i}
            position={[-0.41 + (i % 4) * 0.21, i < 4 ? 0.07 : -0.065, 0.454]}
          >
            <Box args={[0.185, 0.11, 0.025]} color="#1e2027" />
            <Box
              args={[0.11, 0.012, 0.027]}
              color="#747c87"
              position={[0, 0.02, 0.01]}
            />
            <Box
              args={[0.015, 0.015, 0.03]}
              color="#83b9dd"
              emissive="#83b9dd"
              emissiveIntensity={0.4}
              position={[0.07, -0.025, 0.01]}
            />
          </group>
        ))}
        <Banner text="DELL" position={[0.45, 0, 0.48]} width={0.18} />
      </group>
      <Cable
        color="#93bbc8"
        points={[
          [0.43, 0.47, -0.4],
          [0.54, 0.7, -0.45],
          [0.54, 1.26, -0.38],
          [0.32, 1.27, -0.15],
        ]}
      />
      <Banner text="HOMELAB" position={[0, 0.92, 0.46]} width={1.1} />
    </group>
  );
}
