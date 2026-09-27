import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GATE_HEIGHT = 5.4;

/** A single neon checkpoint gate. `onRegister` hands the curtain material up so
 *  the gate collection can highlight whichever gate the leader must hit next. */
export function Checkpoint({ checkpoint, onRegister, index }) {
  const { position, tangent, halfWidthNeg, halfWidthPos } = checkpoint;
  const heading = Math.atan2(tangent.x, tangent.z);
  const span = halfWidthNeg + halfWidthPos;
  const mid = (halfWidthNeg - halfWidthPos) / 2;
  const edgeNeg = mid + span / 2;
  const edgePos = mid - span / 2;
  const isFinish = index === 0;

  return (
    <group position={[position.x, 0, position.z]} rotation={[0, heading, 0]}>
      {[edgeNeg, edgePos].map((x) => (
        <mesh key={x} position={[x, GATE_HEIGHT / 2, 0]}>
          <boxGeometry args={[0.3, GATE_HEIGHT, 0.3]} />
          <meshStandardMaterial color="#151b2c" metalness={0.75} roughness={0.3} />
        </mesh>
      ))}

      <mesh position={[mid, GATE_HEIGHT, 0]}>
        <boxGeometry args={[span + 0.7, 0.32, 0.34]} />
        <meshStandardMaterial color="#0e1322" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[mid, GATE_HEIGHT - 0.3, 0.2]}>
        <boxGeometry args={[span + 0.4, 0.1, 0.06]} />
        <meshBasicMaterial color={isFinish ? '#ffb020' : '#00e5ff'} toneMapped={false} />
      </mesh>

      <mesh position={[mid, GATE_HEIGHT / 2, 0]}>
        <planeGeometry args={[span, GATE_HEIGHT - 0.4]} />
        <meshBasicMaterial
          ref={(node) => {
            if (node) onRegister(index, node);
          }}
          color={isFinish ? '#ffffff' : '#00e5ff'}
          transparent
          opacity={isFinish ? 0.14 : 0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[mid, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[span, isFinish ? 2.2 : 0.5]} />
        <meshBasicMaterial
          color={isFinish ? '#ffb020' : '#00e5ff'}
          transparent
          opacity={isFinish ? 0.5 : 0.22}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function CheckpointGates({ track, playerCar }) {
  const materials = useRef([]);
  const baseColors = useMemo(
    () =>
      track.checkpoints.map((checkpoint, index) =>
        new THREE.Color(index === 0 ? '#ffd9a0' : '#0a7f92')
      ),
    [track]
  );
  const activeColor = useMemo(() => new THREE.Color('#ff2e88'), []);

  const register = useMemo(
    () => (index, material) => {
      materials.current[index] = material;
    },
    []
  );

  useFrame(() => {
    const nextGate = playerCar.race.gates % track.checkpoints.length;
    for (let i = 0; i < materials.current.length; i++) {
      const material = materials.current[i];
      if (!material) continue;
      const active = i === nextGate;
      const target = active ? 0.4 : i === 0 ? 0.13 : 0.06;
      material.opacity += (target - material.opacity) * 0.12;
      material.color.lerp(active ? activeColor : baseColors[i], 0.14);
    }
  });

  return (
    <group>
      {track.checkpoints.map((checkpoint, index) => (
        <Checkpoint key={checkpoint.id} checkpoint={checkpoint} index={index} onRegister={register} />
      ))}
    </group>
  );
}

export default Checkpoint;
