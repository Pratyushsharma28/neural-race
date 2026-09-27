import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { updateCar } from './CarPhysics.js';
import { CarBody, ContactShadow } from './PlayerCar.jsx';
import { TRACK_HALF_WIDTH } from './Track.jsx';

const PLANNED_BRAKE_DECEL = 34;
const SCAN_DISTANCE = 72;
const ROUTE_APPROACH = 34;

const _target = new THREE.Vector3();
const _toTarget = new THREE.Vector3();

function normalizeAngle(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function clampToSide(value, side, minAbsolute, maxAbsolute) {
  const low = Math.min(minAbsolute, maxAbsolute);
  const high = Math.max(minAbsolute, maxAbsolute);
  return side > 0
    ? THREE.MathUtils.clamp(value, low, high)
    : THREE.MathUtils.clamp(value, -high, -low);
}

/**
 * True once the split is close enough that the car should already be crossing
 * towards its chosen lane. Deciding only at the zone entry is too late: the
 * cornering grip is fully committed by then and the car never reaches its line.
 */
function inRouteWindow(track, index) {
  const zone = track.splitZone;
  const spacing = track.totalLength / track.samples;
  const approach = Math.round(ROUTE_APPROACH / spacing);
  const delta = (index - zone.startIndex + track.samples) % track.samples;
  return delta < zone.length || delta > track.samples - approach;
}

/**
 * Racing-line follower. Speed is planned from the curvature ahead using the
 * same lateral grip budget the physics applies, so the AI brakes for corners
 * rather than sliding through them.
 */
export function driveAi(car, track, field, delta, elapsed, racing) {
  const state = car.state;
  const config = car.ai.config;
  const runtime = car.ai;
  const samples = track.samples;
  const spacing = track.totalLength / samples;
  const index = state.trackIndex;

  runtime.wander += delta;
  runtime.cooldown = Math.max(0, runtime.cooldown - delta);

  // Plan against a grip budget below what the physics allows, otherwise the car
  // spends all of its lateral grip holding the corner and cannot move onto its
  // racing line. Current surface grip is folded in so the slippery risk lane is
  // approached at a speed it can actually sustain.
  const lateralLimit =
    state.tuning.lateralGripLimit *
    THREE.MathUtils.clamp(state.grip, 0.55, 1) *
    config.skill *
    0.9;
  const scanSamples = Math.max(6, Math.round(SCAN_DISTANCE / spacing));

  let targetSpeed = state.tuning.maxSpeed * config.skill;
  for (let k = 2; k <= scanSamples; k++) {
    const sample = (index + k) % samples;
    const curvature = Math.abs(track.curvature[sample]);
    if (curvature < 1e-4) continue;
    const radius = 1 / curvature;
    const cornerSpeed = Math.sqrt(lateralLimit * radius);
    const distance = k * spacing;
    const reachable = Math.sqrt(cornerSpeed * cornerSpeed + 2 * PLANNED_BRAKE_DECEL * distance);
    if (reachable < targetSpeed) targetSpeed = reachable;
  }

  if (!state.onTrack) targetSpeed = Math.min(targetSpeed, 22);
  if (state.riskLane) targetSpeed *= 1.08;

  // --- aim point -----------------------------------------------------------
  const lookahead = THREE.MathUtils.clamp(15 + state.speed * 0.5, 15, 48);
  const targetIndex = (index + Math.round(lookahead / spacing)) % samples;

  const halfNeg = track.halfWidthNeg[targetIndex];
  const halfPos = track.halfWidthPos[targetIndex];
  const drift = Math.sin(runtime.wander * 0.55 + car.id * 2.1) * 1.2;
  let offset = track.racingOffset[targetIndex] + config.lateralBias * (1 - config.skill * 0.3) + drift;

  if (inRouteWindow(track, targetIndex)) {
    const side = track.splitZone.sideSign;
    if (config.route === 'risk') {
      // Hugging the widened inside is only possible where the extra width exists;
      // elsewhere the band collapses to the outer edge of the normal track.
      const edge = Math.max(side > 0 ? halfPos : halfNeg, TRACK_HALF_WIDTH) - 1.9;
      offset = clampToSide(offset, side, Math.min(edge, TRACK_HALF_WIDTH + 1.4), edge);
    } else {
      offset = clampToSide(offset, -side, 1.4, TRACK_HALF_WIDTH - 1.6);
    }
  }
  offset = THREE.MathUtils.clamp(offset, -(halfNeg - 1.9), halfPos - 1.9);

  _target.copy(track.centers[targetIndex]).addScaledVector(track.rights[targetIndex], offset);
  _toTarget.subVectors(_target, state.position);
  _toTarget.y = 0;

  const headingError = normalizeAngle(Math.atan2(_toTarget.x, _toTarget.z) - state.heading);

  // --- traffic avoidance ---------------------------------------------------
  let avoid = 0;
  for (const other of field) {
    if (other === car) continue;
    const dx = other.state.position.x - state.position.x;
    const dz = other.state.position.z - state.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 17 || distance < 0.001) continue;

    const bearing = normalizeAngle(Math.atan2(dx, dz) - state.heading);
    if (Math.abs(bearing) > 0.55) continue;

    const urgency = (1 - distance / 17) * (0.55 + config.aggression * 0.6);
    const side = Math.abs(bearing) > 0.07 ? Math.sign(bearing) : runtime.side;
    avoid -= side * urgency;

    const along = dx * Math.sin(state.heading) + dz * Math.cos(state.heading);
    if (along > 0 && distance < 11 && targetSpeed > other.state.speed + 2) {
      targetSpeed = Math.max(12, other.state.speed + 1.5);
    }
  }

  // --- stuck recovery ------------------------------------------------------
  if (racing && state.speed < 1.4) {
    runtime.stuck = (runtime.stuck || 0) + delta;
  } else {
    runtime.stuck = 0;
  }
  const reversing = runtime.stuck > 1.6;
  if (runtime.stuck > 3.6) runtime.stuck = 0;

  const steer = THREE.MathUtils.clamp(headingError * 2.6 + avoid * 0.9, -1, 1);
  const speedError = (reversing ? -6 : targetSpeed) - state.forwardSpeed;
  const throttle = reversing ? -0.7 : THREE.MathUtils.clamp(speedError * 0.3, -0.85, 1);

  state.input.throttle = throttle;
  state.input.steer = steer;
  state.input.handbrake = false;

  return updateCar(state, state.input, delta, track, !racing);
}

export function AIOpponent({ car, track, field, phaseRef, clockRef }) {
  const group = useRef(null);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const racing = phaseRef.current === 'racing';
    const elapsed = racing ? clockRef.current.elapsed : 0;

    driveAi(car, track, field, delta, elapsed, racing);

    if (group.current) {
      group.current.position.copy(car.state.position);
      group.current.rotation.y = car.state.heading;
    }
  });

  return (
    <group ref={group} position={car.state.position.toArray()} rotation={[0, car.state.heading, 0]}>
      <CarBody color={car.color} accent={car.accent} state={car.state} />
      <ContactShadow />
    </group>
  );
}

export default AIOpponent;
