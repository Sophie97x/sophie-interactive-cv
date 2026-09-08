import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Cyl } from './props';

function Pad({
  size,
  at,
  color = '#28272e',
}: {
  size: [number, number, number];
  at: [number, number, number];
  color?: string;
}) {
  const [w, h, d] = size;
  const geometry = useMemo(
    () => new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.3),
    [w, h, d],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={at} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.88} />
    </mesh>
  );
}

export default function Chair() {
  const back = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.27, 0.88);
    s.quadraticCurveTo(-0.37, 1.13, -0.29, 1.35);
    s.quadraticCurveTo(-0.46, 1.63, -0.35, 1.72);
    s.lineTo(-0.23, 1.83);
    s.quadraticCurveTo(-0.22, 1.99, 0, 1.99);
    s.quadraticCurveTo(0.22, 1.99, 0.23, 1.83);
    s.lineTo(0.35, 1.72);
    s.quadraticCurveTo(0.46, 1.63, 0.29, 1.35);
    s.quadraticCurveTo(0.37, 1.13, 0.27, 0.88);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      curveSegments: 16,
    });
  }, []);
  useEffect(() => () => back.dispose(), [back]);
  return (
    <group>
      <Cyl
        args={[0.065, 0.085, 0.6, 20]}
        color="#55535b"
        position={[0, 0.48, 0]}
      />
      <Pad size={[0.76, 0.15, 0.72]} at={[0, 0.83, 0.05]} />
      <Pad size={[0.53, 0.055, 0.59]} at={[0, 0.923, 0.07]} color="#45414b" />
      <group position={[0, 0, -0.36]} rotation={[-0.06, 0, 0]}>
        <mesh geometry={back} castShadow>
          <meshStandardMaterial color="#29262e" roughness={0.85} />
        </mesh>
        <Pad size={[0.37, 0.18, 0.12]} at={[0, 1.81, 0.115]} color="#b53550" />
        <Pad size={[0.41, 0.16, 0.13]} at={[0, 1.05, 0.135]} color="#49424b" />
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh castShadow>
              <tubeGeometry
                args={[
                  new THREE.CatmullRomCurve3([
                    new THREE.Vector3(side * 0.27, 0.97, 0.13),
                    new THREE.Vector3(side * 0.27, 1.3, 0.15),
                    new THREE.Vector3(side * 0.36, 1.6, 0.13),
                    new THREE.Vector3(side * 0.23, 1.78, 0.13),
                  ]),
                  24,
                  0.045,
                  10,
                  false,
                ]}
              />
              <meshStandardMaterial color="#b53550" roughness={0.86} />
            </mesh>
            <Pad
              size={[0.085, 0.05, 0.02]}
              at={[side * 0.11, 1.62, 0.16]}
              color="#121117"
            />
          </group>
        ))}
      </group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Cyl
            args={[0.035, 0.04, 0.34, 16]}
            color="#4d4953"
            position={[side * 0.43, 0.9, 0.04]}
          />
          <Pad size={[0.13, 0.075, 0.43]} at={[side * 0.43, 1.1, 0.075]} />
        </group>
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} rotation={[0, (i * Math.PI * 2) / 5, 0]}>
          <Pad
            size={[0.065, 0.065, 0.49]}
            at={[0, 0.19, 0.23]}
            color="#53515a"
          />
          {[-1, 1].map((side) => (
            <Cyl
              key={side}
              args={[0.073, 0.073, 0.035, 16]}
              color="#211f25"
              position={[side * 0.038, 0.085, 0.46]}
              rotation={[0, 0, Math.PI / 2]}
            />
          ))}
        </group>
      ))}
    </group>
  );
}
