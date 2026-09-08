import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, Cyl } from './props';
import { deskPose, DESK_LAYOUT, DESK_TOP, fingerPress } from './desk-motion';

type V3 = [number, number, number];
function Soft({ at, size, color }: { at: V3; size: V3; color: string }) {
  return (
    <mesh position={at} scale={size} castShadow>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}
function Limb({
  from,
  to,
  radius,
  color,
}: {
  from: V3;
  to: V3;
  radius: number;
  color: string;
}) {
  const a = new THREE.Vector3(...from),
    b = new THREE.Vector3(...to);
  const delta = b.clone().sub(a);
  const shaftLength = Math.max(0.01, delta.length() - radius * 2);
  return (
    <mesh
      position={a.clone().add(b).multiplyScalar(0.5)}
      quaternion={new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        delta.clone().normalize(),
      )}
      castShadow
    >
      <capsuleGeometry args={[radius, shaftLength, 6, 16]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

function WavyHair() {
  const locks = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = -0.32 + (i / 27) * (Math.PI + 0.64);
        const side = Math.cos(angle);
        const points = Array.from({ length: 10 }, (_, j) => {
          const t = j / 9;
          return new THREE.Vector3(
            side * (0.2 + 0.065 * t) +
              Math.sin(t * Math.PI * 3 + i * 0.7) * 0.014,
            0.14 - t * (0.87 - Math.abs(side) * 0.08),
            -Math.sin(angle) * 0.17 +
              0.045 * t +
              Math.sin(t * Math.PI * 2 + i) * 0.018,
          );
        });
        return new THREE.CatmullRomCurve3(points);
      }),
    [],
  );
  return (
    <group>
      <Soft
        at={[0, -0.19, -0.09]}
        size={[0.225, 0.43, 0.135]}
        color="#8c3b35"
      />
      {locks.map((curve, i) => (
        <mesh key={i} castShadow>
          <tubeGeometry args={[curve, 32, 0.023 - (i % 3) * 0.003, 8, false]} />
          <meshStandardMaterial
            color={['#943f37', '#a54c3e', '#81353b', '#b25b45'][i % 4]}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

function Face({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 40, 32);
    const positions = g.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const jaw = Math.max(0, -y);
      positions.setXYZ(
        i,
        positions.getX(i) * 0.215 * (1 - jaw * 0.25),
        y * 0.255,
        positions.getZ(i) * 0.2 * (1 - jaw * 0.12),
      );
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow>
      <meshPhysicalMaterial
        color={color}
        roughness={0.78}
        sheen={0.15}
        sheenColor="#edb4a3"
      />
    </mesh>
  );
}

export function DeskAvatar({ motion }: { motion: boolean }) {
  const elapsed = useRef(0),
    head = useRef<THREE.Group>(null),
    torso = useRef<THREE.Group>(null),
    eyes = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null),
    left = useRef<THREE.Group>(null),
    cup = useRef<THREE.Group>(null),
    snack = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Mesh>(null),
    leftArm = useRef<THREE.Mesh>(null),
    glow = useRef<THREE.PointLight>(null);
  const upperArms = useRef<(THREE.Mesh | null)[]>([]);
  const elbows = useRef<(THREE.Group | null)[]>([]);
  const skin = '#efc6b5',
    hoodie = '#5683a9',
    hair = '#963f3a';
  const moveArm = (mesh: THREE.Mesh | null, elbow: V3, hand: V3) => {
    if (!mesh) return;
    const start = new THREE.Vector3(...elbow),
      end = new THREE.Vector3(...hand),
      delta = end.clone().sub(start);
    mesh.position.copy(start.add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.clone().normalize(),
    );
    mesh.scale.y = delta.length();
  };
  useFrame((_, dt) => {
    if (motion) elapsed.current += Math.min(dt, 0.05);
    const p = deskPose(elapsed.current);
    if (right.current) right.current.position.set(...p.right);
    if (left.current) left.current.position.set(...p.left);
    moveArm(rightArm.current, p.rightElbow, p.right);
    moveArm(leftArm.current, p.leftElbow, p.left);
    moveArm(upperArms.current[0] ?? null, [0.24, 1.52, 0.055], p.rightElbow);
    moveArm(upperArms.current[1] ?? null, [-0.24, 1.52, 0.055], p.leftElbow);
    elbows.current[0]?.position.set(...p.rightElbow);
    elbows.current[1]?.position.set(...p.leftElbow);
    if (head.current) {
      head.current.rotation.x = p.headTilt;
      head.current.rotation.y = p.headTurn;
      head.current.position.y = 1.9 + p.breath * 0.3;
    }
    if (torso.current)
      torso.current.scale.set(1 + p.breath * 0.4, 1 + p.breath, 1 + p.breath);
    if (eyes.current) eyes.current.scale.y = 1 - p.blinkAmount * 0.88;
    for (const [i, hand] of [right.current, left.current].entries()) {
      if (!hand) continue;
      const holding =
        (i === 0 && p.phase === 'drink') || (i === 1 && p.phase === 'snack');
      hand.rotation.x = holding ? -p.grip * 0.18 : 0;
      hand.children.forEach((finger) => {
        if (finger.name.startsWith('typing-finger'))
          finger.rotation.x = holding
            ? p.grip * 0.8
            : 0.04 +
              fingerPress(
                elapsed.current,
                i === 0 ? 1 : -1,
                Number(finger.name.slice(-1)),
              ) *
                0.23;
      });
    }
    if (cup.current) {
      cup.current.position.set(...p.cup);
      cup.current.rotation.x = p.phase === 'drink' ? -p.lift * 0.45 : 0;
    }
    if (snack.current) {
      snack.current.position.set(...p.snack);
      snack.current.rotation.x = p.phase === 'snack' ? -p.lift * 0.8 : 0;
    }
    if (glow.current)
      glow.current.color.setHSL((elapsed.current / 24 + 0.5) % 1, 0.8, 0.67);
  });
  return (
    <group position={DESK_LAYOUT.avatar}>
      <Soft at={[0, 1.01, 0.06]} size={[0.29, 0.2, 0.23]} color="#42414d" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Limb
            from={[side * 0.16, 0.99, 0.12]}
            to={[side * 0.18, 0.87, 0.48]}
            radius={0.115}
            color="#42414d"
          />
          <Limb
            from={[side * 0.18, 0.87, 0.48]}
            to={[side * 0.19, 0.19, 0.57]}
            radius={0.082}
            color="#42414d"
          />
          <Soft
            at={[side * 0.19, 0.15, 0.66]}
            size={[0.105, 0.09, 0.19]}
            color="#eee6dd"
          />
        </group>
      ))}
      <group ref={torso} position={[0, 1.35, 0.045]}>
        <Soft at={[0, 0, 0]} size={[0.29, 0.36, 0.19]} color={hoodie} />
        <Soft
          at={[0, 0.01, 0.181]}
          size={[0.16, 0.27, 0.021]}
          color="#292933"
        />
      </group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Limb
            from={[side * 0.1, 1.63, 0.17]}
            to={[side * 0.17, 1.38, 0.23]}
            radius={0.023}
            color="#7399b9"
          />
        </group>
      ))}
      <Cyl
        args={[0.078, 0.085, 0.13, 16]}
        color={skin}
        position={[0, 1.68, 0.04]}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            ref={(node) => {
              upperArms.current[side > 0 ? 0 : 1] = node;
            }}
            castShadow
          >
            <cylinderGeometry args={[0.1, 0.082, 1, 20]} />
            <meshStandardMaterial color={hoodie} roughness={0.95} />
          </mesh>
          <group
            ref={(node) => {
              elbows.current[side > 0 ? 0 : 1] = node;
            }}
          >
            <Soft at={[0, 0, 0]} size={[0.085, 0.085, 0.085]} color={hoodie} />
          </group>
          <Soft
            at={[side * 0.24, 1.52, 0.055]}
            size={[0.105, 0.105, 0.105]}
            color={hoodie}
          />
          <mesh ref={side > 0 ? rightArm : leftArm} castShadow>
            <cylinderGeometry args={[0.072, 0.085, 1, 16]} />
            <meshStandardMaterial color={hoodie} roughness={0.9} />
          </mesh>
          <group
            ref={side > 0 ? right : left}
            position={[side * 0.2, 1.282, 0.64]}
          >
            <Cyl
              args={[0.064, 0.073, 0.06, 16]}
              position={[0, 0, -0.052]}
              rotation={[Math.PI / 2, 0, 0]}
              color="#d9a995"
            />
            <Cyl
              args={[0.082, 0.068, 0.075, 16]}
              position={[0, 0, -0.025]}
              rotation={[Math.PI / 2, 0, 0]}
              color={hoodie}
            />
            <Soft
              at={[0, -0.001, 0.034]}
              size={[0.072, 0.042, 0.082]}
              color={skin}
            />
            {[
              { x: -0.045, length: 0.054, width: 0.014 },
              { x: -0.016, length: 0.069, width: 0.016 },
              { x: 0.015, length: 0.064, width: 0.016 },
              { x: 0.043, length: 0.051, width: 0.013 },
            ].map((finger, index) => (
              <group
                key={index}
                name={`typing-finger-${index}`}
                position={[
                  side * finger.x,
                  -0.009 + (index === 3 ? -0.004 : 0),
                  0.076,
                ]}
              >
                <Soft
                  at={[0, 0, finger.length * 0.52]}
                  size={[finger.width, 0.018, finger.length]}
                  color={skin}
                />
                <Soft
                  at={[0, 0.014, finger.length * 0.92]}
                  size={[finger.width * 0.72, 0.006, 0.017]}
                  color="#bb466d"
                />
              </group>
            ))}
            <group
              position={[-side * 0.066, -0.014, 0.038]}
              rotation={[0, -side * 0.73, side * 0.2]}
            >
              <Soft
                at={[0, 0, 0.034]}
                size={[0.019, 0.021, 0.043]}
                color={skin}
              />
              <Soft
                at={[0, 0.015, 0.068]}
                size={[0.014, 0.006, 0.015]}
                color="#bb466d"
              />
            </group>
            {[-0.026, 0.004, 0.032].map((x) => (
              <Soft
                key={x}
                at={[x, 0.024, 0.043]}
                size={[0.012, 0.005, 0.012]}
                color="#e4b4a2"
              />
            ))}
            {side < 0 && (
              <group position={[0, 0.005, -0.026]}>
                <mesh>
                  <torusGeometry args={[0.052, 0.014, 8, 18]} />
                  <meshStandardMaterial color="#385885" />
                </mesh>
                <Box
                  args={[0.073, 0.019, 0.075]}
                  position={[0, 0.052, 0]}
                  color="#c5a4a1"
                />
                <Box
                  args={[0.059, 0.022, 0.062]}
                  position={[0, 0.058, 0]}
                  color="#252b35"
                />
                <Box
                  args={[0.012, 0.025, 0.052]}
                  position={[-0.05, 0.025, 0]}
                  color="#d69daf"
                />
              </group>
            )}
          </group>
        </group>
      ))}
      <group ref={head} position={[0, 1.9, 0.06]} scale={0.85}>
        <Face color={skin} />
        <Soft at={[0, 0.08, -0.05]} size={[0.235, 0.23, 0.195]} color={hair} />
        <Soft
          at={[-0.14, 0.145, 0.09]}
          size={[0.11, 0.09, 0.08]}
          color={hair}
        />
        <Soft at={[0.13, 0.16, 0.09]} size={[0.11, 0.09, 0.085]} color={hair} />
        <WavyHair />
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.205, -0.025, 0.005]}>
            <Soft at={[0, 0, 0]} size={[0.028, 0.052, 0.028]} color={skin} />
            <Soft
              at={[side * 0.016, 0, 0.014]}
              size={[0.011, 0.028, 0.012]}
              color="#dca491"
            />
            <mesh position={[side * 0.005, -0.044, 0.019]}>
              <sphereGeometry args={[0.009, 12, 10]} />
              <meshStandardMaterial
                color="#e6c895"
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <Soft
            key={side}
            at={[side * 0.075, 0.065, 0.18]}
            size={[0.06, 0.012, 0.015]}
            color="#633d39"
          />
        ))}
        <group ref={eyes} position={[0, 0.01, 0.179]}>
          {[-1, 1].map((side) => (
            <group key={side}>
              <Soft
                at={[side * 0.078, 0, 0]}
                size={[0.038, 0.018, 0.014]}
                color="#f2eee7"
              />
              <Soft
                at={[side * 0.078, 0, 0.012]}
                size={[0.018, 0.018, 0.011]}
                color="#6b7c70"
              />
              <Soft
                at={[side * 0.078, 0, 0.021]}
                size={[0.008, 0.012, 0.008]}
                color="#252b2d"
              />
              <Soft
                at={[side * 0.078 - 0.006, 0.008, 0.028]}
                size={[0.006, 0.007, 0.004]}
                color="#fff9f1"
              />
            </group>
          ))}
        </group>
        <Soft
          at={[0, -0.047, 0.199]}
          size={[0.027, 0.035, 0.027]}
          color={skin}
        />
        <Soft
          at={[0, -0.009, 0.194]}
          size={[0.018, 0.05, 0.023]}
          color={skin}
        />
        <Soft
          at={[0, -0.104, 0.177]}
          size={[0.037, 0.009, 0.012]}
          color="#b46975"
        />
        {[-1, 1].map((side) => (
          <Soft
            key={side}
            at={[side * 0.135, -0.06, 0.166]}
            size={[0.034, 0.02, 0.009]}
            color="#e8b6a6"
          />
        ))}
        <mesh position={[-0.04, -0.045, 0.213]}>
          <sphereGeometry args={[0.007, 10, 8]} />
          <meshStandardMaterial
            color="#dddde2"
            metalness={0.85}
            roughness={0.2}
          />
        </mesh>
      </group>
      <Cyl
        args={[0.105, 0.105, 0.014, 32]}
        position={[DESK_LAYOUT.cup[0], DESK_TOP + 0.007, DESK_LAYOUT.cup[2]]}
        color="#be987c"
      />
      <group ref={cup} position={DESK_LAYOUT.cup}>
        <Cyl
          args={[0.062, 0.052, 0.14, 20]}
          position={[0, 0.02, 0]}
          color="#e6b8ce"
        />
        <Cyl
          args={[0.051, 0.051, 0.006, 20]}
          position={[0, 0.092, 0]}
          color="#6d4835"
        />
        <mesh position={[0.075, 0.025, 0]}>
          <torusGeometry args={[0.04, 0.012, 8, 16]} />
          <meshStandardMaterial color="#e6b8ce" />
        </mesh>
      </group>
      <Cyl
        args={[0.13, 0.13, 0.012, 24]}
        position={[
          DESK_LAYOUT.snack[0],
          DESK_TOP + 0.006,
          DESK_LAYOUT.snack[2],
        ]}
        color="#f0e8df"
      />
      <group ref={snack} position={DESK_LAYOUT.snack}>
        <Box args={[0.12, 0.045, 0.1]} color="#855335" />
        {[
          [-0.03, 0.027, 0.02],
          [0.035, 0.027, -0.02],
        ].map((p, i) => (
          <Soft
            key={i}
            at={p as V3}
            size={[0.012, 0.006, 0.01]}
            color="#4e342a"
          />
        ))}
      </group>
      <pointLight
        ref={glow}
        position={[0, 1.8, 0.75]}
        color="#86cbe8"
        intensity={1.8}
        distance={2}
        decay={1.3}
      />
    </group>
  );
}
