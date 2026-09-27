import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const _forward = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _smoothedLook = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

const BASE_FOV = 62;

export function CameraController({ car, height = 4.1, distance = 10.4 }) {
  const camera = useThree((state) => state.camera);
  const look = useRef(null);
  const ready = useRef(false);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const state = car.state;

    _forward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
    const speedRatio = THREE.MathUtils.clamp(state.speed / state.tuning.maxSpeed, 0, 1.25);

    const pull = distance + speedRatio * 3.4;
    const lift = height + speedRatio * 0.55;
    const lateral = THREE.MathUtils.clamp(state.lateralSpeed * 0.09, -1.5, 1.5);

    _desired
      .copy(state.position)
      .addScaledVector(_forward, -pull)
      .setY(state.position.y + lift);
    _desired.x -= _forward.z * lateral;
    _desired.z += _forward.x * lateral;
    if (_desired.y < 1.3) _desired.y = 1.3;

    _lookTarget
      .copy(state.position)
      .addScaledVector(_forward, 6.5 + speedRatio * 5)
      .setY(state.position.y + 1.35);

    if (!ready.current || !look.current) {
      camera.position.copy(_desired);
      _smoothedLook.copy(_lookTarget);
      look.current = _smoothedLook.clone();
      ready.current = true;
    } else {
      const positionLerp = 1 - Math.exp(-9 * delta);
      const lookLerp = 1 - Math.exp(-14 * delta);
      camera.position.lerp(_desired, positionLerp);
      look.current.lerp(_lookTarget, lookLerp);
    }

    camera.up.copy(_up);
    camera.lookAt(look.current);

    const targetFov = BASE_FOV + speedRatio * 13 + state.drift * 3;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, delta * 4);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

export default CameraController;
