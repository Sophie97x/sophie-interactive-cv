import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { quailPose } from './quail-motion';

function Oval({
  at,
  size,
  color,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={at} scale={size} castShadow>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

function BackStreaks() {
  const streaks = useMemo(
    () =>
      [-0.18, -0.12, -0.06, 0, 0.06, 0.12, 0.18].map((x, i) => {
        const points = Array.from({ length: 9 }, (_, j) => {
          const z = -0.25 + j * 0.038;
          return new THREE.Vector3(
            x + Math.sin(j * 0.6 + i) * 0.007,
            0.056 +
              0.28 *
                Math.sqrt(
                  Math.max(0.025, 1 - (x / 0.27) ** 2 - (z / 0.35) ** 2),
                ),
            z,
          );
        });
        return new THREE.CatmullRomCurve3(points);
      }),
    [],
  );
  return (
    <group>
      {streaks.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 18, 0.008, 5, false]} />
          <meshStandardMaterial color="#ded9bf" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export function Quail({
  motion,
  loved,
  onPet,
}: {
  motion: boolean;
  loved: boolean;
  onPet: () => void;
}) {
  const bird = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null),
    wings = useRef<THREE.Group>(null),
    heart = useRef<THREE.Group>(null),
    eyes = useRef<THREE.Group>(null),
    feet = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.14);
    s.bezierCurveTo(-0.34, 0.06, -0.17, 0.32, 0, 0.14);
    s.bezierCurveTo(0.17, 0.32, 0.34, 0.06, 0, -0.14);
    return s;
  }, []);
  useFrame(({ camera }, dt) => {
    if (motion && !loved) elapsed.current += Math.min(dt, 0.05);
    const p = quailPose(elapsed.current);
    if (body.current) {
      body.current.rotation.x = loved ? -0.04 : p.peck * 1.2;
      body.current.scale.y = 1 + Math.sin(elapsed.current * 3.2) * 0.012;
      body.current.rotation.z =
        p.phase === 'walk' ? Math.sin(elapsed.current * 9) * 0.025 : 0;
    }
    if (bird.current) {
      bird.current.position.set(p.x, p.y, p.z);
      const current = bird.current.rotation.y;
      const next =
        current +
        Math.atan2(Math.sin(p.yaw - current), Math.cos(p.yaw - current));
      bird.current.rotation.set(
        0,
        motion
          ? THREE.MathUtils.damp(current, next, 9, Math.min(dt, 0.05))
          : p.yaw,
        p.roll,
      );
    }
    if (wings.current)
      wings.current.children.forEach((wing, i) => {
        wing.rotation.z = (i ? 1 : -1) * (0.12 + p.flap * 1.1);
      });
    if (eyes.current)
      eyes.current.scale.y =
        loved || p.phase === 'bonk' || elapsed.current % 4.8 > 4.64 ? 0.2 : 1;
    if (feet.current)
      feet.current.children.forEach((foot, i) => {
        foot.rotation.x =
          p.phase === 'fly' || p.phase === 'takeoff'
            ? 0.85
            : p.phase === 'walk'
              ? Math.sin(elapsed.current * 9 + i * Math.PI) * 0.28
              : 0;
      });
    if (heart.current) {
      heart.current.position.set(p.x, p.y + 0.78, p.z);
      heart.current.quaternion.copy(camera.quaternion);
    }
  });
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onPet();
      }}
    >
      <group ref={bird} position={[0.8, 0.28, 1.5]}>
        <group ref={body}>
          <Oval at={[0, 0.05, 0]} size={[0.26, 0.28, 0.33]} color="#77746a" />
          <Oval
            at={[0, 0.13, 0.19]}
            size={[0.19, 0.22, 0.17]}
            color="#d0cebf"
          />
          <Oval
            at={[0, 0.36, 0.14]}
            size={[0.177, 0.16, 0.19]}
            color="#686558"
          />
          <Oval
            at={[0, 0.29, 0.27]}
            size={[0.11, 0.105, 0.035]}
            color="#e0dfd0"
          />
          <group ref={eyes} position={[0, 0.38, 0]}>
            {[-1, 1].map((side) => (
              <group key={side}>
                <Oval
                  at={[side * 0.143, 0, 0.236]}
                  size={[0.047, 0.055, 0.031]}
                  color="#c8c6b8"
                />
                <Oval
                  at={[side * 0.15, 0, 0.252]}
                  size={[0.037, 0.044, 0.026]}
                  color="#282024"
                />
                <Oval
                  at={[side * 0.154, 0.015, 0.273]}
                  size={[0.012, 0.014, 0.008]}
                  color="#fffaf1"
                />
              </group>
            ))}
          </group>
          {[-1, 1].map((side) => (
            <group key={side}>
              <Oval
                at={[side * 0.126, 0.45, 0.23]}
                size={[0.09, 0.019, 0.022]}
                color="#e1ddc6"
              />
              <Oval
                at={[side * 0.139, 0.3, 0.24]}
                size={[0.07, 0.027, 0.025]}
                color="#cfcec1"
              />
              {[0, 1, 2].map((i) => (
                <Oval
                  key={i}
                  at={[
                    side * (0.14 + i * 0.014),
                    0.09 - i * 0.065,
                    0.21 - i * 0.03,
                  ]}
                  size={[0.028, 0.045, 0.02]}
                  color="#45453f"
                />
              ))}
            </group>
          ))}
          <mesh position={[0, 0.33, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.065, 0.13, 5]} />
            <meshStandardMaterial color="#777264" />
          </mesh>
          <BackStreaks />
          {[-1, 1].map((side) => (
            <Oval
              key={side}
              at={[side * 0.073, 0.513, 0.13]}
              size={[0.021, 0.015, 0.124]}
              color="#ddd8bd"
            />
          ))}
          {[0, 1, 2].map((row) =>
            [-1, 0, 1].map((col) => (
              <Oval
                key={`${row}-${col}`}
                at={[
                  col * 0.075,
                  0.13 - row * 0.072,
                  0.346 - row * 0.014 - Math.abs(col) * 0.012,
                ]}
                size={[0.024, 0.03, 0.012]}
                color="#454640"
              />
            )),
          )}
          <group ref={wings}>
            {[-1, 1].map((side) => (
              <group key={side} position={[side * 0.22, 0.16, -0.035]}>
                <Oval
                  at={[0, -0.07, 0]}
                  size={[0.067, 0.17, 0.22]}
                  color="#575953"
                />
                {[0, 1, 2, 3].map((i) => (
                  <group key={i}>
                    <Oval
                      at={[side * 0.035, -0.04 - i * 0.035, 0.1 - i * 0.073]}
                      size={[0.043, 0.075, 0.076]}
                      color={i % 2 ? '#85857b' : '#68695f'}
                    />
                    <Oval
                      at={[side * 0.066, -0.04 - i * 0.035, 0.1 - i * 0.073]}
                      size={[0.01, 0.062, 0.065]}
                      color="#dfd9bd"
                    />
                    {[-1, 1].map((bar) => (
                      <Oval
                        key={bar}
                        at={[
                          side * 0.076,
                          -0.04 - i * 0.035 + bar * 0.035,
                          0.1 - i * 0.073,
                        ]}
                        size={[0.009, 0.012, 0.055]}
                        color="#383e39"
                      />
                    ))}
                  </group>
                ))}
              </group>
            ))}
          </group>
          <Oval
            at={[0, 0.02, -0.29]}
            size={[0.12, 0.08, 0.13]}
            color="#64665e"
          />
        </group>
        <group ref={feet}>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.1, -0.17, 0.04]}>
              <Oval
                at={[0, -0.025, 0]}
                size={[0.022, 0.066, 0.023]}
                color="#b9a797"
              />
              {[-1, 0, 1].map((toe) => (
                <Oval
                  key={toe}
                  at={[toe * 0.034, -0.065, 0.055]}
                  size={[0.015, 0.012, 0.07]}
                  color="#c5b4a5"
                />
              ))}
            </group>
          ))}
        </group>
      </group>
      <group ref={heart} visible={loved} position={[0.8, 1.03, 1.5]}>
        <mesh>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial
            color="#ed629f"
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      </group>
    </group>
  );
}
