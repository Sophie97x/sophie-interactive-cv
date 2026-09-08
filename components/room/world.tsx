'use client';

import {
  Component,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from '@react-three/fiber';
import * as THREE from 'three';
import Chair from './gaming-chair';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  Box,
  Cyl,
  Keyboard,
  Headset,
  MeshNode,
  Cat,
  Brownies,
  Duck,
  PrintedBits,
  MotionContext,
} from './props';
import {
  AtticShell,
  Beanbags,
  WoodDesk,
  HobbyDisplay,
  WorkDisplay,
} from './attic';

import { Banner, RoofAntenna, Skylight, HomeLab } from './attic-extras';
import { Quail } from './quail';
import { DeskAvatar } from './desk-avatar';
import { DESK_LAYOUT } from './desk-motion';
import {
  PRINT_DURATION,
  PRINT_HEIGHT,
  PRINT_LAYERS,
  printPose,
} from './print-motion';
import {
  applyZoom,
  configureRoomNavigation,
  constrainRoomPan,
  type ZoomCommand,
} from './zoom';

export const places = [
  {
    id: 'desk',
    label: 'My desk',
    hint: 'Support, endpoints & automation',
    color: '#88c5b8',
    position: [1.25, 2.4, -0.65],
    year: '2022 — now',
  },
  {
    id: 'printer',
    label: '3D printing',
    hint: 'Bambu A1, SlideKB & things I make',
    color: '#e9a184',
    position: [-4.45, 2.5, 0.25],
    year: '2026',
  },
  {
    id: 'homelab',
    label: 'My homelab',
    hint: 'Servers, containers & self-hosting',
    color: '#95b6d0',
    position: [4.4, 2.3, 0.65],
    year: '2026',
  },
  {
    id: 'repair',
    label: 'The workbench',
    hint: 'Blyth Repair · PCs, phones & consoles',
    color: '#ddb969',
    position: [-4.45, 1.7, 1.2],
    year: '2018 — 2021',
  },
  {
    id: 'radio',
    label: 'Radio corner',
    hint: 'LoRa mesh & hardware experiments',
    color: '#b3a6d3',
    position: [3.5, 2.15, -3.64],
    year: '2026',
  },
  {
    id: 'projects',
    label: 'Hobby shelf',
    hint: 'Apps, games & side projects',
    color: '#9cba7e',
    position: [-1.55, 2.3, -3.48],
    year: '2025 — 2026',
  },
  {
    id: 'work',
    label: 'Work shelf',
    hint: 'Projects, rollouts & responsibilities',
    color: '#aac8cf',
    position: [0.85, 2.72, -3.52],
    year: '2022 — now',
  },
] as const;
export type PlaceId = (typeof places)[number]['id'];
type V3 = [number, number, number];

function Screen({
  position,
  rotation = [0, 0, 0],
  variant = 0,
}: {
  position: V3;
  rotation?: V3;
  variant?: number;
}) {
  const moving = useContext(MotionContext);
  const screenMaterial = useRef<THREE.MeshBasicMaterial>(null),
    screenTime = useRef(0);
  useFrame((_, dt) => {
    if (moving) screenTime.current += Math.min(dt, 0.05);
    if (screenMaterial.current)
      screenMaterial.current.color.setHSL(
        (screenTime.current / 24 + 0.5 + variant * 0.15) % 1,
        0.4,
        0.78,
      );
  });
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 448;
    const x = c.getContext('2d')!;
    x.fillStyle = variant ? '#283642' : '#223f36';
    x.fillRect(0, 0, 768, 448);
    x.fillStyle = variant ? '#344b58' : '#31554a';
    x.fillRect(0, 0, 768, 48);
    ['#e3a49a', '#ead293', '#a8c79a'].forEach((col, i) => {
      x.fillStyle = col;
      x.beginPath();
      x.arc(26 + i * 28, 24, 7, 0, 7);
      x.fill();
    });
    x.fillStyle = '#ecf1df';
    x.font = 'bold 43px monospace';
    x.fillText(
      variant ? 'little things, built.' : "hello, i'm sophie :)",
      34,
      116,
    );
    x.font = '23px monospace';
    const lines = variant
      ? [
          '> software + hardware',
          '> ideas into working things',
          '> always learning something',
          '',
          '  [ all projects ] ↗',
        ]
      : [
          '> support. build. automate.',
          '> Windows / Linux / networks',
          '> Python / PowerShell / TypeScript',
          '',
          '  [ explore my journey ] ↗',
        ];
    lines.forEach((s, i) => {
      x.fillStyle = i === 4 ? '#f4c197' : '#b5d1c2';
      x.fillText(s, 35, 177 + i * 47);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [variant]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={position} rotation={rotation}>
      <Box args={[0.52, 0.055, 0.32]} color="#dfdad0" position={[0, 0.03, 0]} />
      <Box args={[0.075, 0.28, 0.07]} color="#dad6ce" position={[0, 0.18, 0]} />
      <Box args={[1.45, 0.9, 0.075]} color="#24252a" position={[0, 0.74, 0]} />
      <mesh position={[0, 0.74, 0.043]}>
        <planeGeometry args={[1.32, 0.77]} />
        <meshBasicMaterial ref={screenMaterial} map={texture} />
      </mesh>
    </group>
  );
}

function PC({ motion }: { motion: boolean }) {
  const fans = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (motion && fans.current)
      fans.current.children.forEach((fan) => {
        fan.rotation.z += Math.min(dt, 0.1) * 2;
      });
  });
  return (
    // Right bay: entirely inside the desktop, with clearance above and at the legs.
    <group position={[2.05, 0, -1.65]} scale={0.68}>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Box
            key={`${x}-${z}`}
            args={[0.12, 0.07, 0.16]}
            color="#181b21"
            position={[x * 0.24, 0.045, z * 0.4]}
          />
        )),
      )}
      <Box args={[0.68, 0.07, 1.05]} color="#303640" position={[0, 0.105, 0]} />
      <Box args={[0.68, 0.07, 1.05]} color="#303640" position={[0, 1.345, 0]} />
      <Box
        args={[0.045, 1.2, 1.05]}
        color="#22272f"
        position={[-0.318, 0.725, 0]}
      />
      <Box
        args={[0.64, 1.2, 0.04]}
        color="#22272f"
        position={[0, 0.725, -0.505]}
      />
      <Box args={[0.6, 0.27, 0.94]} color="#242a33" position={[0, 0.275, 0]} />
      {/* Motherboard, graphics card and cooler remain visible through the side. */}
      <Box
        args={[0.025, 0.78, 0.72]}
        color="#435953"
        position={[-0.28, 0.83, -0.08]}
      />
      <Box
        args={[0.48, 0.1, 0.66]}
        color="#485563"
        position={[-0.02, 0.55, -0.04]}
      />
      <Box
        args={[0.46, 0.012, 0.59]}
        color="#8fbfb8"
        position={[-0.02, 0.609, -0.04]}
      />
      <Box
        args={[0.2, 0.3, 0.29]}
        color="#677581"
        position={[-0.16, 0.96, -0.12]}
      />
      {[-0.19, -0.11, -0.03].map((z) => (
        <Box
          key={z}
          args={[0.21, 0.022, 0.025]}
          color="#9ba6ad"
          position={[-0.05, 1.05, z]}
        />
      ))}
      <mesh position={[0.327, 0.785, -0.015]}>
        <boxGeometry args={[0.016, 1.04, 0.88]} />
        <meshPhysicalMaterial
          color="#a0c3c8"
          transparent
          opacity={0.2}
          roughness={0.15}
          metalness={0.15}
          depthWrite={false}
        />
      </mesh>
      {[-0.48, 0.48].map((z) => (
        <Box
          key={z}
          args={[0.055, 1.2, 0.045]}
          color="#343d48"
          position={[0.322, 0.725, z]}
        />
      ))}
      <Box
        args={[0.61, 1.15, 0.045]}
        color="#161c25"
        position={[0, 0.705, 0.505]}
      />
      <group position={[0, 0, 0.535]}>
        {[0.34, 0.7, 1.06].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <torusGeometry args={[0.143, 0.016, 10, 32]} />
            <meshStandardMaterial
              color={['#d6a2c5', '#91c5d0', '#9cd0b9'][i]}
              emissive={['#d6a2c5', '#91c5d0', '#9cd0b9'][i]}
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}
        <group ref={fans}>
          {[0.34, 0.7, 1.06].map((y) => (
            <group key={y} position={[0, y, 0.002]}>
              {Array.from({ length: 7 }, (_, i) => (
                <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 7]}>
                  <mesh position={[0, 0.075, 0]} rotation={[0, 0, -0.45]}>
                    <circleGeometry args={[0.065, 12]} />
                    <meshStandardMaterial
                      color="#536876"
                      roughness={0.6}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                </group>
              ))}
              <mesh position={[0, 0, 0.004]}>
                <circleGeometry args={[0.033, 20]} />
                <meshStandardMaterial
                  color="#a9b8bd"
                  metalness={0.4}
                  roughness={0.4}
                />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      {[-0.18, -0.06].map((x) => (
        <Box
          key={x}
          args={[0.07, 0.017, 0.028]}
          color="#10151d"
          position={[x, 1.388, 0.3]}
        />
      ))}
      <Box
        args={[0.04, 0.013, 0.04]}
        position={[0.2, 1.388, 0.3]}
        color="#83c7ad"
        emissive="#8dfbc4"
        emissiveIntensity={1}
      />
    </group>
  );
}

function A1Printer({
  printing,
  printTime,
  motion,
}: {
  printing: boolean;
  printTime: number;
  motion: boolean;
}) {
  const head = useRef<THREE.Group>(null),
    bed = useRef<THREE.Group>(null),
    spools = useRef<THREE.Group>(null);
  const tick = useRef(0);
  const smoothTime = useRef(printTime);
  const layers = useRef<THREE.Group>(null);
  const gantry = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    smoothTime.current =
      !motion || !printing || printTime < smoothTime.current
        ? printTime
        : THREE.MathUtils.damp(smoothTime.current, printTime, 25, dt);
    const p = printPose(
      printTime >= PRINT_DURATION ? printTime : smoothTime.current,
    );
    if (head.current) head.current.position.set(p.x, p.headY, 0);
    if (gantry.current) gantry.current.position.y = p.headY;
    if (bed.current) bed.current.position.z = p.bedZ;
    layers.current?.children.forEach((layer, i) => {
      layer.visible = i < p.layers;
    });
    if (motion && printing && p.phase === 'Printing') {
      tick.current += Math.min(dt, 0.1);
      if (spools.current?.children[0])
        spools.current.children[0].rotation.z = tick.current * 0.17;
    }
  });
  return (
    <group
      position={[-3.4, 1.1, 0.25]}
      rotation={[0, Math.PI / 2 - 0.25, 0]}
      scale={0.9}
    >
      <Box args={[1.04, 0.16, 0.93]} position={[0, 0.08, 0]} color="#e6e5df" />
      <Box
        args={[0.84, 0.075, 0.67]}
        position={[0, 0.18, 0.08]}
        color="#647470"
      />
      {[-0.43, 0.43].map((x) => (
        <Box
          key={x}
          args={[0.065, 1.05, 0.09]}
          position={[x, 0.73, -0.29]}
          color="#c1c8c5"
        />
      ))}
      <Box
        args={[0.99, 0.09, 0.11]}
        position={[0, 1.28, -0.29]}
        color="#e5e5df"
      />
      <group ref={gantry}>
        <Box
          args={[0.94, 0.06, 0.065]}
          position={[0, 0.69, -0.26]}
          color="#7a8b84"
        />
      </group>
      <group ref={bed}>
        <Box
          args={[0.78, 0.035, 0.72]}
          position={[0, 0.24, 0.13]}
          color="#bca77f"
        />
        <group ref={layers} position={[0, 0.2575, 0.13]}>
          {Array.from({ length: PRINT_LAYERS }, (_, i) => {
            const h = PRINT_HEIGHT / PRINT_LAYERS;
            const y = (i + 0.5) * h;
            const slice = (center: number, height: number, radius: number) =>
              radius * Math.sqrt(Math.max(0, 1 - ((y - center) / height) ** 2));
            const radius = Math.max(
              slice(0.1, 0.13, 0.13),
              slice(0.225, 0.1, 0.115),
            );
            const ear = slice(0.325, 0.095, 0.04);
            return (
              <group key={i} visible={false} position={[0, y, 0]}>
                {radius > 0 && (
                  <mesh scale={[1, 1, 0.8]} castShadow>
                    <cylinderGeometry args={[radius, radius, h * 0.98, 32]} />
                    <meshStandardMaterial color="#e9a9b8" roughness={0.72} />
                  </mesh>
                )}
                {y > 0.29 &&
                  [-1, 1].map((side) => (
                    <mesh
                      key={side}
                      position={[side * 0.058, 0, 0]}
                      scale={[1, 1, 0.65]}
                      castShadow
                    >
                      <cylinderGeometry args={[ear, ear, h * 0.98, 24]} />
                      <meshStandardMaterial color="#e9a9b8" roughness={0.72} />
                    </mesh>
                  ))}
                {i === 36 &&
                  [-1, 1].map((side) => (
                    <group key={side} position={[side * 0.041, 0, 0.082]}>
                      <mesh>
                        <sphereGeometry args={[0.013, 16, 12]} />
                        <meshStandardMaterial color="#43333e" roughness={0.3} />
                      </mesh>
                      <mesh position={[-0.003, 0.004, 0.011]}>
                        <sphereGeometry args={[0.004, 8, 8]} />
                        <meshStandardMaterial color="#fff8ec" />
                      </mesh>
                    </group>
                  ))}
                {i === 33 && (
                  <mesh position={[0, 0, 0.092]} scale={[1, 0.7, 0.6]}>
                    <sphereGeometry args={[0.012, 16, 12]} />
                    <meshStandardMaterial color="#a75a72" />
                  </mesh>
                )}
              </group>
            );
          })}
        </group>
      </group>
      <group ref={head}>
        <Box
          args={[0.22, 0.24, 0.23]}
          position={[0, 0.66, -0.17]}
          color="#edece8"
        />
        <Box
          args={[0.14, 0.12, 0.015]}
          position={[0, 0.68, -0.04]}
          color="#53685d"
        />
        <Cyl
          args={[0.025, 0.01, 0.1, 8]}
          position={[0, 0.49, -0.15]}
          color="#d5aa65"
        />
      </group>
      <Box
        args={[0.25, 0.13, 0.17]}
        position={[0.41, 0.19, 0.54]}
        color="#e6e5df"
      />
      <Box
        args={[0.18, 0.09, 0.01]}
        position={[0.41, 0.22, 0.63]}
        color="#76b3a4"
      />
      <group position={[0.86, 0.12, -0.42]}>
        <Cyl args={[0.24, 0.24, 0.06, 16]} color="#e6e5df" />
        <Cyl
          args={[0.035, 0.035, 1, 8]}
          color="#9caea4"
          position={[0, 0.5, 0]}
        />
        <group ref={spools}>
          {['#eab2b3', '#9fcabc', '#e9d397', '#abc5da'].map((c, i) => (
            <group
              key={c}
              position={[
                ((i % 2) - 0.5) * 0.34,
                0.58 + Math.floor(i / 2) * 0.4,
                0,
              ]}
            >
              <Cyl
                args={[0.2, 0.2, 0.12, 20]}
                color="#ece6da"
                rotation={[Math.PI / 2, 0, 0]}
              />
              <Cyl
                args={[0.17, 0.17, 0.14, 20]}
                color={c}
                rotation={[Math.PI / 2, 0, 0]}
              />
              <Cyl
                args={[0.05, 0.05, 0.17, 12]}
                color="#e7e4dc"
                rotation={[Math.PI / 2, 0, 0]}
              />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

function Marker({
  place,
  onSelect,
  onHover,
}: {
  place: (typeof places)[number];
  onSelect: (id: PlaceId) => void;
  onHover: (id: PlaceId | null) => void;
}) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.z = clock.elapsedTime * 0.15;
  });
  const act = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(place.id);
  };
  return (
    <group
      position={[...place.position]}
      onClick={act}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(place.id);
      }}
      onPointerOut={() => onHover(null)}
    >
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.17, 0.024, 8, 36]} />
        <meshBasicMaterial color={place.color} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.068, 12, 10]} />
        <meshStandardMaterial
          color={place.color}
          emissive={place.color}
          emissiveIntensity={0.8}
        />
      </mesh>
      <mesh visible={false}>
        <sphereGeometry args={[0.36, 10, 8]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

function Room({
  onSelect,
  onHover,
  printing,
  printTime,
  motion,
  night,
  onPet,
  loved,
  windowOpen,
  onWindowToggle,
  hatchOpen,
  onHatchToggle,
}: {
  onSelect: (id: PlaceId) => void;
  onHover: (id: PlaceId | null) => void;
  printing: boolean;
  printTime: number;
  motion: boolean;
  night: boolean;
  onPet: () => void;
  loved: boolean;
  windowOpen: boolean;
  onWindowToggle: () => void;
  hatchOpen: boolean;
  onHatchToggle: () => void;
}) {
  const pick = (id: PlaceId) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(id);
  };
  return (
    <MotionContext.Provider value={motion}>
      <group>
        <group scale={[1.25, 1, 1.3]}>
          <AtticShell
            night={night}
            motion={motion}
            hatchOpen={hatchOpen}
            onHatchToggle={onHatchToggle}
          />
          <RoofAntenna onSelect={() => onSelect('radio')} />
          <Skylight
            open={windowOpen}
            onToggle={onWindowToggle}
            night={night}
            motion={motion}
          />
        </group>
        <group position={[1, 0, 0.7]}>
          <Beanbags />
        </group>
        <Quail motion={motion} loved={loved} onPet={onPet} />
        <group position={[0.75, 0, 1]}>
          <group position={[0.5, 0, -1.65]} onClick={pick('desk')}>
            <WoodDesk width={4.3} depth={1.5} />
            <Box
              args={[1.27, 0.01, 0.61]}
              position={[0, 1.11, -0.43]}
              color="#748b87"
            />
            <group rotation={[0, Math.PI, 0]}>
              {[-1.15, 0, 1.15].map((x, i) => (
                <group key={x} scale={0.78} position={[x, 1.105, 0]}>
                  <Screen position={[0, 0, 0]} variant={i % 2} />
                </group>
              ))}
              <Box
                args={[3.15, 0.06, 0.065]}
                position={[0, 1.65, -0.11]}
                color="#343433"
              />
              <Cyl
                args={[0.035, 0.035, 0.7, 10]}
                position={[0, 1.4, -0.14]}
                color="#393936"
              />
              <Keyboard
                position={[0, DESK_LAYOUT.keyboard[1], 0.43]}
                scale={DESK_LAYOUT.keyboardScale}
                typing
              />
            </group>
            <Headset
              position={[-1.65, 1.145, 0.38]}
              rotation={[-Math.PI / 2, 0, -0.32]}
              scale={1.08}
            />
            <Duck position={[1.76, 1.215, 0.42]} />
            <mesh
              position={[0.88, 1.14, -0.15]}
              scale={[0.085, 0.035, 0.13]}
              castShadow
            >
              <sphereGeometry args={[1, 24, 16]} />
              <meshStandardMaterial color="#ddd7d1" roughness={0.6} />
            </mesh>
            <Box
              args={[0.014, 0.008, 0.035]}
              position={[0.88, 1.175, -0.19]}
              color="#48515a"
            />
          </group>
          <group position={DESK_LAYOUT.avatar}>
            <Chair />
          </group>
          <DeskAvatar motion={motion} />
          <PC motion={motion} />
        </group>
        <group
          position={[4.85, 0, 0.65]}
          rotation={[0, -Math.PI / 2, 0]}
          onClick={pick('homelab')}
        >
          <HomeLab />
        </group>
        <group position={[-1.05, 0, 0]}>
          <group
            position={[-3.4, 0, 0.34]}
            rotation={[0, Math.PI / 2, 0]}
            onClick={pick('repair')}
          >
            <WoodDesk width={2.8} depth={1.24} />
            <PrintedBits position={[-0.92, 1.12, 0.1]} scale={1.2} />
            <Brownies position={[1.06, 1.155, 0.1]} />
          </group>
          <group onClick={pick('printer')}>
            <A1Printer
              printing={printing}
              printTime={printTime}
              motion={motion}
            />
          </group>
        </group>
        <group
          position={[-1.55, 0, -3.9]}
          scale={0.85}
          rotation={[0, 0, 0]}
          onClick={pick('projects')}
        >
          <HobbyDisplay />
        </group>
        <group position={[0.85, 0, -3.95]} onClick={pick('work')}>
          <WorkDisplay />
        </group>
        <group position={[3.5, 0, -3.64]} onClick={pick('radio')}>
          <Box
            args={[0.83, 1.55, 0.55]}
            position={[0, 0.78, 0]}
            color="#f3eee8"
          />
          <MeshNode position={[0, 1.57, 0]} scale={1.25} />
          <MeshNode position={[0.21, 1.57, 0.09]} scale={0.7} />
        </group>
        <group
          position={[-4.6, 1.14, 1.27]}
          onClick={(e) => {
            e.stopPropagation();
            onPet();
          }}
        >
          <Cat scale={0.9} />
        </group>
        <Banner text="HOBBIES" position={[-1.55, 2.8, -3.48]} width={1.4} />
        <Banner text="WORK" position={[0.85, 3.04, -3.52]} width={1.5} />
        {places.map((p) => (
          <Marker key={p.id} place={p} onSelect={onSelect} onHover={onHover} />
        ))}
      </group>
    </MotionContext.Provider>
  );
}

function CameraRig({
  focus,
  reset,
  motion,
  onReady,
  zoomCommand,
}: {
  focus: PlaceId | null;
  reset: number;
  motion: boolean;
  onReady: () => void;
  zoomCommand: ZoomCommand;
}) {
  const { camera, gl, size, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const handledZoom = useRef(zoomCommand.id);
  const flying = useRef(true);
  const target = useRef(new THREE.Vector3()),
    position = useRef(new THREE.Vector3());
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    configureRoomNavigation(c);
    c.enableDamping = true;
    c.dampingFactor = 0.09;
    c.target.set(0, 1, -0.4);
    const canvas = gl.domElement;
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute(
      'aria-label',
      'Explore the attic. Drag to turn; right-drag or Shift-drag to move. Scroll to zoom. Arrow keys move when focused. Two fingers move and pinch on touchscreens.',
    );
    const focusCanvas = () => canvas.focus({ preventScroll: true });
    const cancelFlight = (event: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)
      )
        flying.current = false;
    };
    canvas.addEventListener('pointerdown', focusCanvas);
    canvas.addEventListener('keydown', cancelFlight, true);
    c.listenToKeyEvents(canvas);
    c.addEventListener('start', () => {
      flying.current = false;
    });
    c.addEventListener('change', () => {
      constrainRoomPan(c);
      invalidate();
    });
    controls.current = c;
    onReady();
    return () => {
      canvas.removeEventListener('pointerdown', focusCanvas);
      canvas.removeEventListener('keydown', cancelFlight, true);
      c.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate, onReady]);
  useEffect(() => {
    const p = places.find((p) => p.id === focus);
    const mobile = size.width < 700;
    if (p) {
      target.current.set(p.position[0], p.position[1], p.position[2]);
      target.current.y -= 0.5;
      position.current.copy(target.current).add(new THREE.Vector3(6.5, 5, 7.5));
    } else {
      target.current.set(0, 1, -0.35);
      position.current.set(
        mobile ? 18 : 13.2,
        mobile ? 15 : 11,
        mobile ? 20 : 14.3,
      );
    }
    flying.current = true;
    invalidate();
  }, [focus, reset, size.width, size.height, invalidate]);
  useEffect(() => {
    if (handledZoom.current === zoomCommand.id || !controls.current) return;
    handledZoom.current = zoomCommand.id;
    flying.current = false;
    applyZoom(controls.current, zoomCommand.direction);
    invalidate();
  }, [zoomCommand, invalidate]);
  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    if (flying.current) {
      const a = motion ? 1 - Math.exp(-Math.min(delta, 0.1) * 3.6) : 1;
      camera.position.lerp(position.current, a);
      c.target.lerp(target.current, a);
      if (camera.position.distanceTo(position.current) < 0.015)
        flying.current = false;
    }
    c.update();
    constrainRoomPan(c);
  });
  return null;
}

export class CanvasBoundary extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function ContextGuard({ onFail }: { onFail: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', onFail);
    // R3F deliberately releases WebGL on unmount. That is not a failure.
    return () => canvas.removeEventListener('webglcontextlost', onFail);
  }, [gl, onFail]);
  return null;
}

export default function World({
  focus,
  reset,
  motion,
  night,
  printing,
  printTime,
  onSelect,
  onHover,
  onPet,
  loved,
  windowOpen,
  onWindowToggle,
  hatchOpen,
  onHatchToggle,
  onReady,
  onFail,
  zoomCommand,
}: {
  focus: PlaceId | null;
  reset: number;
  motion: boolean;
  night: boolean;
  printing: boolean;
  printTime: number;
  onSelect: (id: PlaceId) => void;
  onHover: (id: PlaceId | null) => void;
  onPet: () => void;
  loved: boolean;
  windowOpen: boolean;
  onWindowToggle: () => void;
  hatchOpen: boolean;
  onHatchToggle: () => void;
  onReady: () => void;
  onFail: () => void;
  zoomCommand: ZoomCommand;
}) {
  return (
    <CanvasBoundary onFail={onFail}>
      <Canvas
        camera={{ fov: 36, position: [11.7, 9.8, 12.7], near: 0.1, far: 90 }}
        dpr={[1, 1.5]}
        shadows="percentage"
        frameloop={motion ? 'always' : 'demand'}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <ContextGuard onFail={onFail} />
        <hemisphereLight
          args={[night ? '#a8becd' : '#fff4df', '#9a8d79', night ? 0.9 : 1.65]}
        />
        <directionalLight
          position={[3, 8, 6]}
          color="#ffe4c7"
          intensity={night ? 2 : 3.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
          shadow-bias={-0.0003}
          shadow-normalBias={0.03}
        />
        <directionalLight
          position={[-3, 4, 2]}
          color="#b7dedb"
          intensity={0.8}
        />
        {night && (
          <pointLight
            position={[0.1, 3, -1]}
            color="#ffb789"
            intensity={10}
            distance={9}
          />
        )}
        <Room
          onSelect={onSelect}
          onHover={onHover}
          onPet={onPet}
          loved={loved}
          hatchOpen={hatchOpen}
          onHatchToggle={onHatchToggle}
          windowOpen={windowOpen}
          onWindowToggle={onWindowToggle}
          motion={motion}
          night={night}
          printing={printing}
          printTime={printTime}
        />
        <CameraRig
          zoomCommand={zoomCommand}
          focus={focus}
          reset={reset}
          motion={motion}
          onReady={onReady}
        />
      </Canvas>
    </CanvasBoundary>
  );
}
