'use client';
import { createContext, useContext, useRef } from 'react';
import { useFrame as fiberFrame } from '@react-three/fiber';
export const MotionContext = createContext(true);
function useFrame(callback: Parameters<typeof fiberFrame>[0]) {
  const moving = useContext(MotionContext);
  fiberFrame((state, delta) => { if (moving) callback(state, delta); });
}
import * as THREE from 'three';
import { fingerPress } from './desk-motion';

/* Shared palette — warm toy colours with Sophie's teal as the accent. */
export const C = {
  wood: '#b5824f',
  woodDark: '#8d6238',
  metal: '#485460',
  metalLight: '#6b7885',
  dark: '#2f3640',
  screen: '#7cc4c8',
  screenWarm: '#e8c07c',
  cream: '#e8ddc9',
  card: '#d7c9ae',
  coral: '#e8926b',
  green: '#7fb069',
  cat: '#d9a86c',
  white: '#f2 efe8'.replace(' ', ''),
  teal: '#7cc4c8',
  pink: '#e8a0b8',
  red: '#c9584f',
  blue: '#6b93c9',
  yellow: '#e8c96b',
};

type V3 = [number, number, number];
interface P {
  position?: V3;
  rotation?: V3;
  scale?: number;
}

/* ---------------------------------------------------------------- helpers */

export function Box({
  args,
  color,
  position,
  rotation,
  emissive,
  emissiveIntensity = 0,
}: {
  args: V3;
  color: string;
  position?: V3;
  rotation?: V3;
  emissive?: string;
  emissiveIntensity?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color}
        roughness={0.72}
        metalness={0.05}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

export function Cyl({
  args,
  color,
  position,
  rotation,
}: {
  args: [number, number, number, number?];
  color: string;
  position?: V3;
  rotation?: V3;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[args[0], args[1], args[2], args[3] ?? 12]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} />
    </mesh>
  );
}

/* ---------------------------------------------------------------- desk kit */

export function Desk({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[3.4, 0.14, 1.7]} color={C.wood} position={[0, 0.72, 0]} />
      <Box args={[0.16, 0.72, 0.16]} color={C.woodDark} position={[-1.5, 0.36, -0.68]} />
      <Box args={[0.16, 0.72, 0.16]} color={C.woodDark} position={[1.5, 0.36, -0.68]} />
      <Box args={[0.16, 0.72, 0.16]} color={C.woodDark} position={[-1.5, 0.36, 0.68]} />
      <Box args={[0.16, 0.72, 0.16]} color={C.woodDark} position={[1.5, 0.36, 0.68]} />
    </group>
  );
}

export function Monitor({ position, rotation, scale = 1, warm = false }: P & { warm?: boolean }) {
  const glow = warm ? C.screenWarm : C.screen;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[0.5, 0.06, 0.32]} color={C.dark} position={[0, 0.03, 0]} />
      <Box args={[0.08, 0.28, 0.08]} color={C.dark} position={[0, 0.18, 0]} />
      <Box args={[1.25, 0.78, 0.07]} color={C.dark} position={[0, 0.72, 0]} />
      <mesh position={[0, 0.72, 0.042]}>
        <planeGeometry args={[1.12, 0.65]} />
        <meshStandardMaterial
          color={glow}
          emissive={glow}
          emissiveIntensity={1.5}
          roughness={1}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

const KEYBOARD_ROWS = [
  { offset: 0, widths: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { offset: 0.012, widths: [1.35, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.65] },
  { offset: 0.022, widths: [1.65, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.35] },
  { offset: 0.034, widths: [2.15, 1, 1, 1, 1, 1, 1, 1, 1, 2.85] },
  { offset: 0, widths: [1.2, 1.2, 1.2, 5.2, 1.2, 1.2, 1] },
] as const;

export function Keyboard({ position, rotation, scale = 1, typing = false }: P & { typing?: boolean }) {
  const rows = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  useFrame((_, dt) => {
    if (!typing) return;
    elapsed.current += Math.min(dt, 0.05);
    rows.current?.children[2]?.children.forEach((key, i) => {
      key.position.y = [2, 3, 4, 7, 8, 9].includes(i) ? -0.006 * fingerPress(elapsed.current, i < 5 ? 1 : -1, i % 4) : 0;
    });
  });
  const unit = 0.058;
  const gap = 0.012;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[1.08, 0.055, 0.4]} color="#252a30" />
      <Box
        args={[1, 0.018, 0.33]}
        color={C.metalLight}
        position={[0, 0.036, 0]}
      />
      <group ref={rows}>{KEYBOARD_ROWS.map((row, rowIndex) => {
        const rowWidth =
          row.widths.reduce((sum, width) => sum + width, 0) * unit +
          (row.widths.length - 1) * gap;
        let cursor = -rowWidth / 2 + row.offset;
        return (
          <group key={rowIndex} position={[0, 0.069, -0.116 + rowIndex * 0.058]}>
            {row.widths.map((width, keyIndex) => {
              const keyWidth = width * unit;
              const x = cursor + keyWidth / 2;
              cursor += keyWidth + gap;
              return (
                <group key={keyIndex}><Box
                  args={[keyWidth, 0.034, 0.044]}
                  color={
                    width > 4
                      ? C.teal
                      : keyIndex === 0 || keyIndex === row.widths.length - 1
                        ? '#c8d0cf'
                        : '#eee8dc'
                  }
                  position={[x, 0, 0]}
                /></group>
              );
            })}
          </group>
        );
      })}</group>
    </group>
  );
}

export function Mouse({ position, scale = 1 }: P) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <sphereGeometry args={[0.09, 10, 8]} />
      <meshStandardMaterial color={C.dark} roughness={0.6} />
    </mesh>
  );
}

export function Mug({ position, scale = 1, color = C.coral }: P & { color?: string }) {
  return (
    <group position={position} scale={scale}>
      <Cyl args={[0.11, 0.09, 0.2, 12]} color={color} position={[0, 0.1, 0]} />
      <mesh position={[0, 0.185, 0]} castShadow>
        <cylinderGeometry args={[0.095, 0.095, 0.02, 12]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.4} />
      </mesh>
      <mesh position={[0.14, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.055, 0.018, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

export function Plant({ position, scale = 1 }: P) {
  return (
    <group position={position} scale={scale}>
      <Cyl args={[0.16, 0.12, 0.24, 10]} color={C.coral} position={[0, 0.12, 0]} />
      {[
        [0, 0.42, 0, 0],
        [0.1, 0.36, 0.06, 0.5],
        [-0.09, 0.38, -0.05, -0.6],
        [0.03, 0.34, -0.11, 0.9],
      ].map(([x, y, z, tilt], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[tilt, i, tilt * 0.5]} castShadow>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshStandardMaterial color={C.green} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

export function Headset({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh castShadow>
        <torusGeometry args={[0.205, 0.027, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#252a30" roughness={0.48} />
      </mesh>
      <mesh position={[0, -0.006, 0.012]} castShadow>
        <torusGeometry args={[0.176, 0.018, 7, 24, Math.PI]} />
        <meshStandardMaterial color="#65727d" roughness={0.72} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.215, -0.05, 0]}>
          <Box
            args={[0.032, 0.095, 0.04]}
            color="#59636d"
            position={[side * 0.006, 0.055, 0]}
            rotation={[0, 0, side * -0.16]}
          />
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.087, 0.096, 0.075, 18]} />
            <meshStandardMaterial color="#343a42" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.045]} castShadow>
            <torusGeometry args={[0.061, 0.019, 8, 20]} />
            <meshStandardMaterial color="#171a1e" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.047]}>
            <circleGeometry args={[0.057, 20]} />
            <meshStandardMaterial color="#59636d" roughness={0.72} />
          </mesh>
        </group>
      ))}
      <group position={[0.225, -0.066, 0.045]} rotation={[0, 0, -0.62]}>
        <Cyl
          args={[0.009, 0.009, 0.19, 8]}
          color="#2d3339"
          position={[0, -0.095, 0]}
        />
        <mesh position={[0, -0.2, 0]} castShadow>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshStandardMaterial color="#59636d" roughness={0.58} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------- IT gear */

export function Tower({ position, rotation, scale = 1, open = false }: P & { open?: boolean }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[0.5, 0.95, 0.85]} color={C.dark} position={[0, 0.475, 0]} />
      {open ? (
        <>
          <Box args={[0.02, 0.9, 0.8]} color={C.metal} position={[0.3, 0.5, 0.28]} rotation={[0, 0.55, 0]} />
          <Box args={[0.3, 0.02, 0.5]} color={C.green} position={[0, 0.4, 0]} />
          <Box args={[0.12, 0.12, 0.14]} color={C.metalLight} position={[0.08, 0.52, 0.1]} />
        </>
      ) : null}
      <mesh position={[0, 0.62, 0.43]}>
        <circleGeometry args={[0.17, 12]} />
        <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.2, 0.43]}>
        <circleGeometry args={[0.05, 8]} />
        <meshStandardMaterial color={C.coral} emissive={C.coral} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Server rack with blinking LEDs — the homelab in miniature. */
export function ServerRack({ position, rotation, scale = 1, units = 5 }: P & { units?: number }) {
  const leds = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!leds.current) return;
    const t = clock.elapsedTime;
    leds.current.children.forEach((c, i) => {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.5 + Math.abs(Math.sin(t * (1.1 + i * 0.37) + i)) * 1.9;
    });
  });
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[0.9, units * 0.24 + 0.16, 0.75]} color={C.metal} position={[0, (units * 0.24) / 2 + 0.08, 0]} />
      {Array.from({ length: units }).map((_, i) => (
        <Box
          key={i}
          args={[0.82, 0.19, 0.04]}
          color={C.dark}
          position={[0, 0.16 + i * 0.24, 0.38]}
        />
      ))}
      <group ref={leds}>
        {Array.from({ length: units }).map((_, i) => (
          <mesh key={i} position={[0.3, 0.16 + i * 0.24, 0.41]}>
            <boxGeometry args={[0.05, 0.05, 0.02]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? C.coral : C.teal}
              emissive={i % 3 === 0 ? C.coral : C.teal}
              emissiveIntensity={1}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Wireless access point on a little pole, with a pulsing signal ring. */
export function AccessPoint({ position, scale = 1 }: P) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const t = (clock.elapsedTime * 0.55) % 1;
    ring.current.scale.setScalar(0.3 + t * 1.9);
    const m = ring.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.5 * (1 - t);
  });
  return (
    <group position={position} scale={scale}>
      <Cyl args={[0.04, 0.05, 1.4, 8]} color={C.metalLight} position={[0, 0.7, 0]} />
      <Cyl args={[0.3, 0.3, 0.1, 14]} color={C.cream} position={[0, 1.44, 0]} />
      <mesh position={[0, 1.38, 0]}>
        <circleGeometry args={[0.09, 10]} />
        <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position={[0, 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.4, 20]} />
        <meshBasicMaterial color={C.teal} transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Phone({ position, rotation, scale = 1, color = C.dark }: P & { color?: string }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[0.17, 0.02, 0.33]} color={color} />
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.14, 0.28]} />
        <meshStandardMaterial color={C.screen} emissive={C.screen} emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function SimTray({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[0.6, 0.04, 0.42]} color={C.card} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Box
          key={i}
          args={[0.13, 0.02, 0.1]}
          color={C.yellow}
          position={[-0.2 + (i % 3) * 0.2, 0.03, -0.09 + Math.floor(i / 3) * 0.18]}
        />
      ))}
    </group>
  );
}

/** Meshtastic-style LoRa node with a whip antenna. */
export function MeshNode({ position, scale = 1, blinkOffset = 0 }: P & { blinkOffset?: number }) {
  const led = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!led.current) return;
    const m = led.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity =
      0.3 + Math.pow(Math.abs(Math.sin(clock.elapsedTime * 1.6 + blinkOffset)), 6) * 3;
  });
  return (
    <group position={position} scale={scale}>
      <Box args={[0.24, 0.1, 0.16]} color={C.dark} position={[0, 0.05, 0]} />
      <Cyl args={[0.012, 0.012, 0.44, 6]} color={C.metalLight} position={[0.09, 0.27, 0]} />
      <mesh ref={led} position={[-0.06, 0.06, 0.081]}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
        <meshStandardMaterial color={C.green} emissive={C.green} emissiveIntensity={1} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------- era props */

export function Pallet({ position, rotation, scale = 1, boxes = 3 }: P & { boxes?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[1.2, 0.1, 0.9]} color={C.woodDark} position={[0, 0.05, 0]} />
      {Array.from({ length: boxes }).map((_, i) => (
        <Box
          key={i}
          args={[0.52, 0.42, 0.52]}
          color={i % 2 ? C.card : C.cream}
          position={[-0.26 + (i % 2) * 0.52, 0.31 + Math.floor(i / 2) * 0.42, 0]}
          rotation={[0, i * 0.12, 0]}
        />
      ))}
    </group>
  );
}

export function Scanner({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[1.5, 0.5, 0.95]} color={C.cream} position={[0, 0.25, 0]} />
      <Box args={[1.3, 0.08, 0.8]} color={C.metalLight} position={[0, 0.54, 0]} />
      <Box args={[1.1, 0.3, 0.06]} color={C.card} position={[0, 0.7, -0.36]} rotation={[-0.35, 0, 0]} />
      <mesh position={[0, 0.55, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.15, 0.1]} />
        <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function PaperStack({ position, rotation, scale = 1, sheets = 5 }: P & { sheets?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {Array.from({ length: sheets }).map((_, i) => (
        <Box
          key={i}
          args={[0.44, 0.035, 0.6]}
          color={C.cream}
          position={[Math.sin(i * 2.1) * 0.025, 0.02 + i * 0.038, Math.cos(i * 1.7) * 0.025]}
          rotation={[0, i * 0.06, 0]}
        />
      ))}
    </group>
  );
}

export function ToolBoard({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[1.3, 0.9, 0.06]} color={C.woodDark} />
      {[C.coral, C.teal, C.yellow, C.blue].map((c, i) => (
        <group key={i} position={[-0.45 + i * 0.3, 0.12, 0.06]}>
          <Cyl args={[0.022, 0.022, 0.36, 6]} color={C.metalLight} />
          <Cyl args={[0.045, 0.045, 0.16, 8]} color={c} position={[0, -0.24, 0]} />
        </group>
      ))}
    </group>
  );
}

/* ---------------------------------------------------------------- cute bits */

/** A cat, asleep. Non-negotiable. */
export function Cat({ position, rotation, scale = 1 }: P) {
  const tail = useRef<THREE.Group>(null);
  const motion = useContext(MotionContext);
  useFrame(({ clock }) => {
    if (motion && tail.current)
      tail.current.rotation.y = Math.sin(clock.elapsedTime * 0.9) * 0.3;
  });
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh castShadow>
        <sphereGeometry args={[0.22, 28, 20]} />
        <meshStandardMaterial color={C.cat} roughness={0.95} />
      </mesh>
      <mesh position={[0.19, 0.09, 0.05]} castShadow>
        <sphereGeometry args={[0.13, 28, 20]} />
        <meshStandardMaterial color={C.cat} roughness={0.95} />
      </mesh>
      <mesh position={[0.24, 0.19, 0.02]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.045, 0.09, 4]} />
        <meshStandardMaterial color={C.cat} roughness={0.95} />
      </mesh>
      <mesh position={[0.16, 0.2, 0.1]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.045, 0.09, 4]} />
        <meshStandardMaterial color={C.cat} roughness={0.95} />
      </mesh>
      <group ref={tail} position={[-0.18, -0.04, 0]}>
        <mesh position={[-0.1, 0.03, 0]} rotation={[0, 0, 0.5]} castShadow>
          <capsuleGeometry args={[0.035, 0.22, 4, 8]} />
          <meshStandardMaterial color={C.cat} roughness={0.95} />
        </mesh>
      </group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[0.29, 0.12, 0.05 + side * 0.058]}
            scale={[0.6, 1, 1]}
          >
            <sphereGeometry args={[0.022, 16, 12]} />
            <meshStandardMaterial color="#3f343c" roughness={0.35} />
          </mesh>
          <mesh position={[0.305, 0.129, 0.05 + side * 0.058]}>
            <sphereGeometry args={[0.006, 8, 8]} />
            <meshStandardMaterial color="#fff3df" />
          </mesh>
          <mesh
            position={[0.12, -0.15, side * 0.115]}
            scale={[1.4, 0.65, 1]}
            castShadow
          >
            <sphereGeometry args={[0.065, 20, 14]} />
            <meshStandardMaterial color={C.cat} roughness={0.95} />
          </mesh>
          <mesh
            position={[0.305, 0.067, 0.05 + side * 0.022]}
            scale={[0.5, 0.7, 1]}
          >
            <sphereGeometry args={[0.028, 16, 12]} />
            <meshStandardMaterial color="#dfc8bc" />
          </mesh>
        </group>
      ))}
      <mesh position={[0.323, 0.085, 0.05]} scale={[0.5, 0.65, 1]}>
        <sphereGeometry args={[0.016, 12, 10]} />
        <meshStandardMaterial color="#bd7d8c" />
      </mesh>
    </group>
  );
}

/** Pokéball — she built a game collection tracker. */
export function Pokeball({ position, scale = 1 }: P) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = clock.elapsedTime * 0.5;
  });
  return (
    <group ref={g} position={position} scale={scale}>
      <mesh castShadow>
        <sphereGeometry args={[0.15, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={C.red} roughness={0.4} />
      </mesh>
      <mesh castShadow>
        <sphereGeometry args={[0.15, 14, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color={C.cream} roughness={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.15, 0.014, 6, 20]} />
        <meshStandardMaterial color={C.dark} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** A tray of brownies — The Travelling Spoon. */
export function Brownies({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[0.5, 0.05, 0.38]} color={C.metalLight} />
      {Array.from({ length: 4 }).map((_, i) => (
        <Box
          key={i}
          args={[0.19, 0.08, 0.15]}
          color="#5c3a24"
          position={[-0.11 + (i % 2) * 0.22, 0.065, -0.08 + Math.floor(i / 2) * 0.16]}
        />
      ))}
    </group>
  );
}

export function Duck({ position, scale = 1 }: P) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <sphereGeometry args={[0.11, 24, 16]} />
        <meshStandardMaterial color={C.yellow} roughness={0.55} />
      </mesh>
      <mesh position={[0.06, 0.1, 0]} castShadow>
        <sphereGeometry args={[0.07, 24, 16]} />
        <meshStandardMaterial color={C.yellow} roughness={0.55} />
      </mesh>
      <mesh position={[0.13, 0.085, 0]} scale={[1.4, 0.45, 1]}>
        <sphereGeometry args={[0.035, 20, 12]} />
        <meshStandardMaterial color={C.coral} roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[0.085, 0.12, side * 0.052]}>
            <sphereGeometry args={[0.011, 16, 12]} />
            <meshStandardMaterial color="#34313b" roughness={0.25} />
          </mesh>
          <mesh position={[0.089, 0.124, side * 0.059]}>
            <sphereGeometry args={[0.0035, 8, 8]} />
            <meshStandardMaterial color="#fffaf0" />
          </mesh>
          <mesh
            position={[-0.015, 0.012, side * 0.091]}
            scale={[1.4, 0.7, 0.4]}
            rotation={[0, 0, -0.25]}
          >
            <sphereGeometry args={[0.052, 20, 14]} />
            <meshStandardMaterial color="#eebf61" roughness={0.65} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Sign({ position, rotation, scale = 1, color = C.teal }: P & { color?: string }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Cyl args={[0.04, 0.04, 0.9, 6]} color={C.woodDark} position={[0, 0.45, 0]} />
      <Box args={[0.9, 0.34, 0.06]} color={C.cream} position={[0, 0.98, 0]} />
      <Box args={[0.78, 0.06, 0.02]} color={color} position={[0, 1.02, 0.04]} />
      <Box args={[0.5, 0.05, 0.02]} color={C.metalLight} position={[-0.14, 0.9, 0.04]} />
    </group>
  );
}

/* ---------------------------------------------------------- 3D printer */

/** Bed-slinger 3D printer, mid-print, with a spool that turns. */
export function Printer3D({ position, rotation, scale = 1 }: P) {
  const spool = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const bed = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (spool.current) spool.current.rotation.z = -t * 0.32;
    if (head.current) head.current.position.x = Math.sin(t * 0.9) * 0.28;
    if (bed.current) bed.current.position.z = Math.sin(t * 0.55) * 0.16;
  });

  const frame = C.metalLight;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* base */}
      <Box args={[0.95, 0.14, 0.85]} color={C.dark} position={[0, 0.07, 0]} />
      {/* uprights + top rail */}
      <Box args={[0.07, 1.15, 0.07]} color={frame} position={[-0.42, 0.72, -0.32]} />
      <Box args={[0.07, 1.15, 0.07]} color={frame} position={[0.42, 0.72, -0.32]} />
      <Box args={[0.95, 0.07, 0.07]} color={frame} position={[0, 1.29, -0.32]} />
      {/* moving bed */}
      <group ref={bed}>
        <Box args={[0.72, 0.05, 0.6]} color={C.metal} position={[0, 0.2, 0.05]} />
        <Box args={[0.66, 0.02, 0.54]} color="#3f6f6f" position={[0, 0.235, 0.05]} />
        {/* the print in progress */}
        <Box args={[0.16, 0.19, 0.16]} color={C.coral} position={[0.04, 0.34, 0.03]} />
        <Box args={[0.2, 0.03, 0.2]} color={C.coral} position={[0.04, 0.25, 0.03]} />
      </group>
      {/* gantry + hot end */}
      <group ref={head}>
        <Box args={[0.22, 0.2, 0.2]} color={C.dark} position={[0, 0.78, -0.24]} />
        <mesh position={[0, 0.66, -0.24]} castShadow>
          <coneGeometry args={[0.05, 0.12, 8]} />
          <meshStandardMaterial color="#a8562f" emissive="#a8562f" emissiveIntensity={0.7} roughness={0.4} />
        </mesh>
      </group>
      {/* filament spool on the top rail */}
      <group ref={spool} position={[0, 1.5, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
        <Cyl args={[0.26, 0.26, 0.1, 16]} color={C.teal} rotation={[Math.PI / 2, 0, 0]} />
        <Cyl args={[0.1, 0.1, 0.13, 10]} color={C.cream} rotation={[Math.PI / 2, 0, 0]} />
      </group>
      {/* filament run to the hot end */}
      <Cyl args={[0.012, 0.012, 0.6, 6]} color={C.teal} position={[0, 1.18, -0.3]} rotation={[0.2, 0, 0.1]} />
      {/* little control screen */}
      <mesh position={[0.3, 0.19, 0.44]} rotation={[-0.5, 0, 0]}>
        <planeGeometry args={[0.26, 0.14]} />
        <meshStandardMaterial color={C.screenWarm} emissive={C.screenWarm} emissiveIntensity={1.3} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A few finished prints, for the shelf. */
export function PrintedBits({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[-0.16, 0.09, 0]} castShadow>
        <torusKnotGeometry args={[0.07, 0.025, 48, 8]} />
        <meshStandardMaterial color={C.pink} roughness={0.6} />
      </mesh>
      <mesh position={[0.06, 0.08, 0.04]} castShadow>
        <dodecahedronGeometry args={[0.09]} />
        <meshStandardMaterial color={C.green} roughness={0.6} />
      </mesh>
      <Box args={[0.12, 0.12, 0.12]} color={C.yellow} position={[0.24, 0.06, -0.03]} rotation={[0, 0.5, 0]} />
    </group>
  );
}

/* ------------------------------------------------------------ room kit */

export function Shelf({ position, rotation, scale = 1, levels = 3, w = 2.2 }: P & { levels?: number; w?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {Array.from({ length: levels }).map((_, i) => (
        <Box key={i} args={[w, 0.07, 0.55]} color={C.wood} position={[0, 0.5 + i * 0.66, 0]} />
      ))}
      <Box args={[0.09, levels * 0.66 + 0.5, 0.55]} color={C.woodDark} position={[-w / 2, (levels * 0.66) / 2 + 0.25, 0]} />
      <Box args={[0.09, levels * 0.66 + 0.5, 0.55]} color={C.woodDark} position={[w / 2, (levels * 0.66) / 2 + 0.25, 0]} />
    </group>
  );
}

export function Rug({ position, scale = 1 }: P) {
  return (
    <group position={position} scale={scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.7, 28]} />
        <meshStandardMaterial color="#8a5b57" roughness={1} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.15, 1.35, 28]} />
        <meshStandardMaterial color="#a97a6d" roughness={1} />
      </mesh>
    </group>
  );
}

/** Warm floor lamp — the main pool of cosy light in the room. */
export function FloorLamp({ position, scale = 1 }: P) {
  return (
    <group position={position} scale={scale}>
      <Cyl args={[0.28, 0.3, 0.06, 14]} color={C.dark} position={[0, 0.03, 0]} />
      <Cyl args={[0.035, 0.035, 1.9, 8]} color={C.dark} position={[0, 0.95, 0]} />
      <mesh position={[0, 2.0, 0]} castShadow>
        <coneGeometry args={[0.42, 0.5, 14, 1, true]} />
        <meshStandardMaterial color={C.cream} side={THREE.DoubleSide} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.86, 0]}>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.86, 0]} intensity={9} distance={7} decay={2} color="#ffcf9b" />
    </group>
  );
}

/** Window with a dusk sky behind it. */
export function Window({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[2.1, 1.5, 0.08]} color={C.cream} />
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.85, 1.25]} />
        <meshStandardMaterial color="#7fa8c4" emissive="#8fb6cf" emissiveIntensity={0.85} toneMapped={false} />
      </mesh>
      <Box args={[0.06, 1.3, 0.03]} color={C.cream} position={[0, 0, 0.07]} />
      <Box args={[1.9, 0.06, 0.03]} color={C.cream} position={[0, 0, 0.07]} />
    </group>
  );
}

/** String lights along a wall. */
export function StringLights({ position, rotation, scale = 1, count = 9, w = 4 }: P & { count?: number; w?: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.elapsedTime;
    g.current.children.forEach((c, i) => {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 1.4 + Math.sin(t * 1.1 + i * 0.8) * 0.6;
    });
  });
  return (
    <group ref={g} position={position} rotation={rotation} scale={scale}>
      {Array.from({ length: count }).map((_, i) => {
        const t = i / (count - 1);
        return (
          <mesh key={i} position={[-w / 2 + t * w, Math.sin(t * Math.PI) * -0.22, 0]}>
            <sphereGeometry args={[0.055, 8, 6]} />
            <meshStandardMaterial
              color="#ffd9a0"
              emissive="#ffd9a0"
              emissiveIntensity={1.6}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** A pinned corkboard of notes — the runbooks and guides she writes. */
export function Corkboard({ position, rotation, scale = 1 }: P) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Box args={[1.6, 1.1, 0.05]} color="#b98f5e" />
      {[
        [-0.45, 0.28, C.cream],
        [0.05, 0.32, C.yellow],
        [0.5, 0.2, C.cream],
        [-0.3, -0.18, C.pink],
        [0.28, -0.24, C.cream],
        [-0.6, -0.3, C.teal],
      ].map(([x, y, c], i) => (
        <Box
          key={i}
          args={[0.34, 0.28, 0.01]}
          color={c as string}
          position={[x as number, y as number, 0.03]}
          rotation={[0, 0, (i % 2 ? 1 : -1) * 0.07]}
        />
      ))}
    </group>
  );
}
