'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { applyZoom, type ZoomCommand } from './zoom';
import {
  Box,
  Cyl,
  Tower,
  ServerRack,
  MeshNode,
  Printer3D,
  Brownies,
  Plant,
  MotionContext,
} from './props';
import type { Entry } from '@/content';
import { CanvasBoundary, ContextGuard } from './world';

function Plaque({ entry, index }: { entry: Entry; index: number }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 200;
    const x = c.getContext('2d')!;
    x.fillStyle = '#f6edda';
    x.fillRect(0, 0, 640, 200);
    x.fillStyle = '#35594a';
    x.font = 'bold 34px sans-serif';
    x.textAlign = 'center';
    const words = entry.title.split(' ');
    const lines: string[] = [''];
    for (const word of words) {
      const last = lines.length - 1;
      if ((lines[last] + ' ' + word).trim().length > 24) lines.push(word);
      else lines[last] += (lines[last] ? ' ' : '') + word;
    }
    lines.slice(0, 2).forEach((s, i) => x.fillText(s, 320, 70 + i * 42));
    x.fillStyle = '#8a977b';
    x.font = '24px monospace';
    x.fillText(String(index + 1).padStart(2, '0'), 320, 170);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [entry, index]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, -0.21, 0.81]}>
      <planeGeometry args={[1.86, 0.55]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

function MiniMonitor({ color }: { color: string }) {
  return (
    <group>
      <Box args={[0.5, 0.06, 0.32]} position={[0, 0.035, 0]} color="#ddd8ce" />
      <Box args={[0.08, 0.25, 0.08]} position={[0, 0.17, 0]} color="#d4d3cb" />
      <Box args={[1.03, 0.69, 0.08]} position={[0, 0.62, 0]} color="#ede2d3" />
      <Box
        args={[0.92, 0.56, 0.013]}
        position={[0, 0.62, 0.05]}
        color={color}
      />
      {Array.from({ length: 4 }, (_, i) => (
        <Box
          key={i}
          args={[0.58 - i * 0.08, 0.03, 0.005]}
          position={[-0.08, 0.78 - i * 0.1, 0.06]}
          color="#d4e4cf"
        />
      ))}
    </group>
  );
}
function MiniPhone() {
  return (
    <group rotation={[-0.12, 0.2, 0]}>
      <Box args={[0.51, 0.95, 0.065]} position={[0, 0.5, 0]} color="#405448" />
      <Box
        args={[0.44, 0.78, 0.015]}
        position={[0, 0.52, 0.043]}
        color="#91c4b4"
      />
      <Cyl
        args={[0.025, 0.025, 0.015, 12]}
        position={[0, 0.08, 0.04]}
        rotation={[Math.PI / 2, 0, 0]}
        color="#c4d9c5"
      />
    </group>
  );
}
function MiniGame() {
  return (
    <group>
      <mesh position={[0, 0.4, 0]} scale={[1.8, 1, 0.8]}>
        <capsuleGeometry args={[0.23, 0.32, 6, 16]} />
        <meshStandardMaterial color="#c3b4d4" roughness={0.8} />
      </mesh>
      <Box
        args={[0.22, 0.04, 0.07]}
        position={[-0.2, 0.47, 0.22]}
        color="#596150"
      />
      <Box
        args={[0.07, 0.17, 0.07]}
        position={[-0.2, 0.47, 0.22]}
        color="#596150"
      />
      {[
        [-0.04, 0.1],
        [0.07, 0.0],
        [0.18, 0.1],
        [0.07, 0.2],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x + 0.14, y + 0.35, 0.23]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial
            color={['#d3a692', '#adc291', '#dbcd98', '#aac4d2'][i]}
          />
        </mesh>
      ))}
    </group>
  );
}
function Miniature({ entry }: { entry: Entry }) {
  const name = entry.title.toLowerCase();
  if (/heltec|slidekb/.test(name)) return <MiniHandheld />;
  if (/simpsons/.test(name)) return <MiniTV />;
  if (/card reader|identity|access/.test(name)) return <MiniCard />;
  if (/3d|case/.test(name)) return <Printer3D scale={0.65} />;
  if (/mesh|bobcat|radio/.test(name)) return <MeshNode scale={2.2} />;
  if (/homelab|server|docker|hermes/.test(name))
    return <ServerRack scale={0.75} units={4} />;
  if (/carrier|telecom|\bline\b|\bsim\b|trunk|phone|usage|imei/.test(name))
    return <MiniPhone />;
  if (/game|surge|collection/.test(name)) return <MiniGame />;
  if (/spoon|brownie/.test(name)) return <Brownies scale={2.1} />;
  if (/pantry|household/.test(name)) return <Plant scale={1.7} />;
  if (entry.category === 'endpoint') return <Tower scale={0.8} />;
  return (
    <MiniMonitor
      color={entry.category === 'automation' ? '#a48791' : '#80a894'}
    />
  );
}

function MiniHandheld() {
  return (
    <group rotation={[-0.12, 0, 0]}>
      <Box args={[0.83, 0.9, 0.2]} position={[0, 0.5, 0]} color="#d9a49e" />
      <Box
        args={[0.63, 0.35, 0.02]}
        position={[0, 0.69, 0.11]}
        color="#405c50"
      />
      <Box
        args={[0.36, 0.03, 0.025]}
        position={[-0.06, 0.72, 0.13]}
        color="#b9dcb4"
      />
      {Array.from({ length: 21 }, (_, i) => (
        <Box
          key={i}
          args={[0.072, 0.065, 0.04]}
          position={[
            ((i % 7) - 3) * 0.095,
            0.38 - Math.floor(i / 7) * 0.09,
            0.12,
          ]}
          color={i === 20 ? '#d8b671' : '#f4e9cf'}
        />
      ))}
      <Cyl
        args={[0.022, 0.028, 0.38, 8]}
        position={[0.31, 1.09, 0]}
        color="#687769"
      />
    </group>
  );
}

function MiniTV() {
  return (
    <group>
      <Box args={[1, 0.79, 0.45]} position={[0, 0.5, 0]} color="#ba9dbb" />
      <Box
        args={[0.69, 0.56, 0.025]}
        position={[-0.095, 0.52, 0.24]}
        color="#f0cc89"
      />
      <Box
        args={[0.48, 0.045, 0.03]}
        position={[-0.09, 0.38, 0.26]}
        color="#d89c80"
      />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Cyl
            args={[0.012, 0.012, 0.4, 8]}
            position={[s * 0.1, 1.05, 0]}
            rotation={[0, 0, -s * 0.65]}
            color="#6c7769"
          />
          <Box
            args={[0.16, 0.1, 0.28]}
            position={[s * 0.29, 0.055, 0]}
            color="#6b655b"
          />
        </group>
      ))}
      {[0.38, 0.62].map((y) => (
        <mesh
          key={y}
          position={[0.37, y, 0.255]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.055, 0.055, 0.04, 12]} />
          <meshStandardMaterial color="#f3dfbf" />
        </mesh>
      ))}
    </group>
  );
}

function MiniCard() {
  return (
    <group rotation={[0, -0.15, -0.1]}>
      <Box args={[0.92, 0.66, 0.09]} position={[0, 0.43, 0]} color="#efe6cd" />
      <Box
        args={[0.92, 0.13, 0.012]}
        position={[0, 0.65, 0.05]}
        color="#a4bda6"
      />
      <Box
        args={[0.19, 0.17, 0.012]}
        position={[-0.25, 0.4, 0.05]}
        color="#c5a563"
      />
      {[0.32, 0.4, 0.48].map((y) => (
        <Box
          key={y}
          args={[0.3, 0.018, 0.012]}
          position={[0.14, y, 0.05]}
          color="#91a48c"
        />
      ))}
    </group>
  );
}

function ShelfItem({
  entry,
  index,
  onSelect,
  onHover,
  motion,
}: {
  entry: Entry;
  index: number;
  onSelect: (entry: Entry) => void;
  onHover: (entry: Entry | null) => void;
  motion: boolean;
}) {
  const model = useRef<THREE.Group>(null),
    hovered = useRef(false);
  useFrame(({ clock }, dt) => {
    if (!model.current) return;
    const goal = hovered.current ? 1.12 : 1;
    model.current.scale.lerp(
      new THREE.Vector3(goal, goal, goal),
      1 - Math.exp(-Math.min(dt, 0.1) * 8),
    );
    if (motion)
      model.current.rotation.y =
        Math.sin(clock.elapsedTime * 0.45 + index) * 0.08;
  });
  const x = ((index % 4) - 1.5) * 2.15,
    y = index < 4 ? 2.64 : 0.67;
  return (
    <group
      position={[x, y, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(entry);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hovered.current = true;
        onHover(entry);
      }}
      onPointerOut={() => {
        hovered.current = false;
        onHover(null);
      }}
    >
      <group ref={model}>
        <Miniature entry={entry} />
      </group>
      <Plaque entry={entry} index={index} />
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[1.75, 1.2, 0.9]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ShelfModel({
  entries,
  onSelect,
  onHover,
  motion,
  hobby,
}: {
  entries: Entry[];
  onSelect: (entry: Entry) => void;
  onHover: (entry: Entry | null) => void;
  motion: boolean;
  hobby: boolean;
}) {
  return (
    <MotionContext.Provider value={motion}>
      <group rotation={[0, -0.12, 0]}>
        <Box
          args={[9.35, 4.8, 0.17]}
          position={[0, 2.35, -0.66]}
          color={hobby ? '#abc1a5' : '#b1cbd0'}
        />
        {[0.48, 2.46, 4.65].map((y) => (
          <Box
            key={y}
            args={[9.6, 0.14, 1.52]}
            position={[0, y, 0]}
            color="#d5ad89"
          />
        ))}
        {[-4.66, 4.66].map((x) => (
          <Box
            key={x}
            args={[0.15, 4.8, 1.52]}
            position={[x, 2.4, 0]}
            color="#c79e79"
          />
        ))}
        {entries.map((e, i) => (
          <ShelfItem
            key={e.id}
            entry={e}
            index={i}
            onSelect={onSelect}
            onHover={onHover}
            motion={motion}
          />
        ))}
      </group>
    </MotionContext.Provider>
  );
}

export default function ProjectShelf({
  entries,
  hobby,
  motion,
  onSelect,
  onHover,
  onFail,
  zoomCommand,
}: {
  entries: Entry[];
  hobby: boolean;
  motion: boolean;
  onSelect: (entry: Entry) => void;
  onHover: (entry: Entry | null) => void;
  onFail: () => void;
  zoomCommand: ZoomCommand;
}) {
  return (
    <CanvasBoundary onFail={onFail}>
      <Canvas
        camera={{ fov: 35, position: [3.4, 4.9, 15.4], near: 0.1, far: 70 }}
        dpr={[1, 1.5]}
        frameloop={motion ? 'always' : 'demand'}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        onCreated={({ camera }) => camera.lookAt(0, 2.1, 0)}
      >
        <ShelfCamera zoomCommand={zoomCommand} />
        <ContextGuard onFail={onFail} />
        <hemisphereLight args={['#fff0d7', '#a3a68c', 2]} />
        <directionalLight
          position={[2, 7, 7]}
          intensity={3.1}
          color="#fff0d7"
        />
        <directionalLight position={[-6, 3, 1]} intensity={1} color="#c8e5db" />
        <ShelfModel
          entries={entries}
          hobby={hobby}
          motion={motion}
          onSelect={onSelect}
          onHover={onHover}
        />
      </Canvas>
    </CanvasBoundary>
  );
}

function ShelfCamera({ zoomCommand }: { zoomCommand: ZoomCommand }) {
  const { camera, gl, size, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null),
    handledZoom = useRef(zoomCommand.id),
    previousFit = useRef<number | null>(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableRotate = false;
    c.enablePan = false;
    c.enableZoom = true;
    c.zoomToCursor = false;
    c.zoomSpeed = 0.75;
    c.target.set(0, 2.1, 0);
    c.addEventListener('change', () => invalidate());
    controls.current = c;
    return () => {
      c.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    const distance = Math.max(
      15.4,
      5.7 /
        Math.tan(THREE.MathUtils.degToRad(17.5)) /
        (size.width / size.height),
    );
    const ratio = distance / 15.4;
    const c = controls.current;
    const zoomRatio =
      previousFit.current && c ? c.getDistance() / previousFit.current : 1;
    const offset = new THREE.Vector3(3.4 * ratio, 2.8 * ratio, distance);
    const fitLength = offset.length();
    previousFit.current = fitLength;
    if (c) {
      c.minDistance = 5;
      c.maxDistance = Math.max(32, fitLength * 1.1);
    }
    offset.setLength(
      THREE.MathUtils.clamp(
        fitLength * zoomRatio,
        5,
        Math.max(32, fitLength * 1.1),
      ),
    );
    camera.position.copy(offset).add(new THREE.Vector3(0, 2.1, 0));
    camera.lookAt(0, 2.1, 0);
    camera.updateProjectionMatrix();
    c?.update();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    if (handledZoom.current === zoomCommand.id || !controls.current) return;
    handledZoom.current = zoomCommand.id;
    applyZoom(controls.current, zoomCommand.direction);
    invalidate();
  }, [zoomCommand, invalidate]);
  return null;
}
