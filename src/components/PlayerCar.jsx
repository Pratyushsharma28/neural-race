import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { updateCar } from './CarPhysics.js';
import { recordPlayerInput } from './RaceManager.jsx';

const WHEELS = [
  { x: 0.98, z: 1.42, front: true },
  { x: -0.98, z: 1.42, front: true },
  { x: 1.02, z: -1.46, front: false },
  { x: -1.02, z: -1.46, front: false },
];

const WHEEL_RADIUS = 0.42;
const scratchInput = { throttle: 0, steer: 0, handbrake: false, anyKey: false };

/** Shared vehicle mesh. The car's nose points along local +Z. */
export function CarBody({ color, accent, state }) {
  const chassis = useRef(null);
  const spinners = useRef([]);
  const steers = useRef([]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);

    if (chassis.current) {
      const roll = -THREE.MathUtils.clamp(state.lateralSpeed * 0.02, -0.15, 0.15);
      const pitch = THREE.MathUtils.clamp(-state.input.throttle * 0.03 + state.understeer * 0.03, -0.07, 0.07);
      chassis.current.rotation.z += (roll - chassis.current.rotation.z) * Math.min(1, delta * 11);
      chassis.current.rotation.x += (pitch - chassis.current.rotation.x) * Math.min(1, delta * 8);
    }

    const spin = (state.forwardSpeed / WHEEL_RADIUS) * delta;
    for (let i = 0; i < spinners.current.length; i++) {
      const wheel = spinners.current[i];
      if (wheel) wheel.rotation.x += spin;
    }

    const steerAngle = state.steer * 0.4;
    for (let i = 0; i < steers.current.length; i++) {
      const knuckle = steers.current[i];
      if (knuckle) knuckle.rotation.y += (steerAngle - knuckle.rotation.y) * Math.min(1, delta * 18);
    }
  });

  const paint = <meshStandardMaterial color={color} metalness={0.62} roughness={0.26} />;

  return (
    <group ref={chassis}>
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[1.72, 0.34, 3.5]} />
        {paint}
      </mesh>
      <mesh position={[0, 0.46, 1.92]} rotation={[0.14, 0, 0]} castShadow>
        <boxGeometry args={[1.34, 0.22, 1.05]} />
        {paint}
      </mesh>
      <mesh position={[0, 0.27, 2.16]}>
        <boxGeometry args={[1.88, 0.06, 0.54]} />
        <meshStandardMaterial color="#0b0d14" metalness={0.4} roughness={0.62} />
      </mesh>

      <mesh position={[0, 0.83, -0.05]} scale={[1, 0.6, 1.75]}>
        <sphereGeometry args={[0.62, 20, 14]} />
        <meshStandardMaterial color="#05070d" metalness={0.95} roughness={0.06} />
      </mesh>
      <mesh position={[0, 0.78, -1.12]} castShadow>
        <boxGeometry args={[0.34, 0.24, 1.5]} />
        <meshStandardMaterial color={accent} metalness={0.55} roughness={0.32} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.86, 0.46, -0.35]} castShadow>
          <boxGeometry args={[0.32, 0.3, 2.1]} />
          <meshStandardMaterial color="#11151f" metalness={0.55} roughness={0.4} />
        </mesh>
      ))}

      <mesh position={[0, 1.12, -1.86]} castShadow>
        <boxGeometry args={[1.96, 0.07, 0.46]} />
        <meshStandardMaterial color="#0d1119" metalness={0.7} roughness={0.3} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.95, 0.95, -1.86]}>
          <boxGeometry args={[0.06, 0.46, 0.52]} />
          <meshStandardMaterial color={accent} metalness={0.4} roughness={0.4} />
        </mesh>
      ))}

      <mesh position={[0, 0.5, 2.45]}>
        <boxGeometry args={[1.08, 0.07, 0.06]} />
        <meshBasicMaterial color="#f4fbff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.63, -2.07]}>
        <boxGeometry args={[1.52, 0.1, 0.06]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.16, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.3, 4.2]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} toneMapped={false} depthWrite={false} />
      </mesh>

      {WHEELS.map((wheel, index) => (
        <group
          key={index}
          position={[wheel.x, WHEEL_RADIUS, wheel.z]}
          ref={
            wheel.front
              ? (node) => {
                  steers.current[index] = node;
                }
              : undefined
          }
        >
          <group
            ref={(node) => {
              spinners.current[index] = node;
            }}
          >
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.3, 18]} />
              <meshStandardMaterial color="#0a0c12" roughness={0.94} metalness={0.08} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.23, 0.23, 0.32, 10]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

export function ContactShadow() {
  return (
    <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.6, 4.8]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.42} depthWrite={false} />
    </mesh>
  );
}

export function PlayerCar({ car, track, controls, phaseRef }) {
  const group = useRef(null);

  useEffect(() => {
    controls.attach(window);
    return () => controls.detach();
  }, [controls]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const racing = phaseRef.current === 'racing';
    const input = controls.read(scratchInput);
    const state = car.state;

    state.input.throttle = input.throttle;
    state.input.steer = input.steer;
    state.input.handbrake = input.handbrake;

    const result = updateCar(state, input, delta, track, !racing);

    if (group.current) {
      group.current.position.copy(state.position);
      group.current.rotation.y = state.heading;
    }

    if (racing) recordPlayerInput(car.telemetry, input, delta, result);
  });

  return (
    <group ref={group} position={car.state.position.toArray()} rotation={[0, car.state.heading, 0]}>
      <CarBody color={car.color} accent={car.accent} state={car.state} />
      <ContactShadow />
    </group>
  );
}

export default PlayerCar;
