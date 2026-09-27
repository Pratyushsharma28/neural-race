import * as THREE from 'three';

export const CAR_TUNING = {
  enginePower: 74,
  brakePower: 68,
  reversePower: 34,
  maxSpeed: 71,
  maxReverse: 17,
  drag: 0.00095,
  rollingResistance: 2.6,
  gripLateral: 11.5,
  gripLateralHandbrake: 1.7,
  lateralGripLimit: 13.5,
  turnRate: 2.45,
  steerResponse: 8.5,
  wallMargin: 3.4,
};

export const RISK_BOOST_ACCEL = 42;
export const RISK_BOOST_SPEED_BONUS = 0.14;

const OFF_TRACK_DRAG_MULTIPLIER = 3.6;
const OFF_TRACK_RESISTANCE_MULTIPLIER = 4.2;
const MAX_STEP = 1 / 30;

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();

export const updateResult = {
  wallHit: false,
  offTrack: false,
  slipAngle: 0,
  grip: 1,
  lateral: 0,
  yawRate: 0,
  accel: 0,
  boost: 0,
};

export function createCarState({ position = new THREE.Vector3(), heading = 0, tuning } = {}) {
  return {
    position: position.clone(),
    heading,
    velocity: new THREE.Vector3(),
    steer: 0,
    forwardSpeed: 0,
    lateralSpeed: 0,
    speed: 0,
    slipAngle: 0,
    drift: 0,
    wheelSpin: 0,
    onTrack: true,
    offTrackDepth: 0,
    inSplitZone: false,
    riskLane: false,
    riskBoost: 0,
    understeer: 0,
    curvature: 0,
    trackHint: -1,
    trackIndex: 0,
    trackU: 0,
    lateral: 0,
    grip: 1,
    tuning: { ...CAR_TUNING, ...tuning },
    input: { throttle: 0, steer: 0, handbrake: false },
  };
}

export function resetCarState(state, position, heading) {
  state.position.copy(position);
  state.heading = heading;
  state.velocity.set(0, 0, 0);
  state.steer = 0;
  state.forwardSpeed = 0;
  state.lateralSpeed = 0;
  state.speed = 0;
  state.slipAngle = 0;
  state.drift = 0;
  state.wheelSpin = 0;
  state.onTrack = true;
  state.offTrackDepth = 0;
  state.inSplitZone = false;
  state.riskLane = false;
  state.riskBoost = 0;
  state.understeer = 0;
  state.curvature = 0;
  state.trackHint = -1;
  state.input.throttle = 0;
  state.input.steer = 0;
  state.input.handbrake = false;
  return state;
}

/**
 * Arcade slip-angle model: the heading is rotated first, the existing velocity
 * is then decomposed into the new basis, and lateral grip bleeds off whatever
 * the yaw created. Handbrake lowers that grip, which is what produces a drift.
 */
export function updateCar(state, input, dt, track, frozen = false) {
  const tuning = state.tuning;
  const step = Math.min(dt, MAX_STEP);
  const result = updateResult;
  result.wallHit = false;

  if (frozen) {
    state.velocity.set(0, 0, 0);
    state.forwardSpeed = 0;
    state.lateralSpeed = 0;
    state.speed = 0;
    state.drift = 0;
    state.steer = 0;
    result.offTrack = false;
    result.slipAngle = 0;
    result.grip = 1;
    result.lateral = 0;
    result.yawRate = 0;
    result.accel = 0;
    if (track) readSurface(state, track);
    return result;
  }

  const previousForwardSpeed = state.velocity.dot(forwardOf(state.heading, _forward));

  // Surface is read first: the grip it reports caps how hard the car may yaw.
  const surface = track ? readSurface(state, track) : null;
  const grip = surface ? surface.grip : 1;
  const onTrack = surface ? surface.onTrack : true;
  const boost = surface ? surface.riskBoost : 0;

  // --- steering ---------------------------------------------------------
  const speedFade = 1 - 0.55 * Math.min(1, Math.abs(previousForwardSpeed) / tuning.maxSpeed);
  const steerTarget = THREE.MathUtils.clamp(input.steer || 0, -1, 1);
  state.steer += (steerTarget - state.steer) * Math.min(1, tuning.steerResponse * speedFade * step);

  // `saturation` carries the sign, so reversing naturally inverts the steering.
  const saturation = THREE.MathUtils.clamp(previousForwardSpeed / 11, -1, 1);
  const desiredYaw =
    state.steer * tuning.turnRate * saturation * speedFade * (input.handbrake ? 1.5 : 1);

  // Grip circle: lateral acceleration cannot exceed what the surface provides,
  // so carrying too much speed into a corner understeers the car wide.
  const speedAbs = Math.abs(previousForwardSpeed);
  const yawLimit =
    speedAbs > 1.5
      ? (grip * tuning.lateralGripLimit * (input.handbrake ? 1.6 : 1)) / speedAbs
      : Infinity;
  const yawRate = THREE.MathUtils.clamp(desiredYaw, -yawLimit, yawLimit);
  state.understeer =
    Math.abs(desiredYaw) > 1e-4 ? 1 - Math.min(1, Math.abs(yawRate) / Math.abs(desiredYaw)) : 0;

  state.heading += yawRate * step;
  if (state.heading > Math.PI) state.heading -= Math.PI * 2;
  else if (state.heading < -Math.PI) state.heading += Math.PI * 2;

  // --- decompose into the new basis --------------------------------------
  const forward = forwardOf(state.heading, _forward);
  const right = rightOf(state.heading, _right);

  let forwardSpeed = state.velocity.dot(forward);
  let lateralSpeed = state.velocity.dot(right);

  // --- longitudinal forces -------------------------------------------------
  const throttle = THREE.MathUtils.clamp(input.throttle || 0, -1, 1);
  const previous = forwardSpeed;

  if (throttle > 0) {
    if (forwardSpeed < -0.4) {
      forwardSpeed += tuning.brakePower * throttle * step;
    } else {
      const headroom = 1 - Math.max(0, forwardSpeed) / tuning.maxSpeed;
      forwardSpeed += tuning.enginePower * throttle * Math.max(0, headroom) * step;
    }
  } else if (throttle < 0) {
    const magnitude = -throttle;
    if (forwardSpeed > 0.4) {
      forwardSpeed = Math.max(0, forwardSpeed - tuning.brakePower * magnitude * step);
    } else {
      const headroom = 1 - Math.max(0, -forwardSpeed) / tuning.maxReverse;
      forwardSpeed -= tuning.reversePower * magnitude * Math.max(0, headroom) * step;
    }
  }

  if (boost > 0 && forwardSpeed > 2) {
    forwardSpeed += RISK_BOOST_ACCEL * boost * step;
  }

  if (input.handbrake) {
    const loss = 30 * step;
    forwardSpeed -= Math.sign(forwardSpeed) * Math.min(Math.abs(forwardSpeed), loss);
  }

  const dragCoefficient = tuning.drag * (onTrack ? 1 : OFF_TRACK_DRAG_MULTIPLIER);
  forwardSpeed -= forwardSpeed * Math.abs(forwardSpeed) * dragCoefficient * step;

  const resistance = tuning.rollingResistance * (onTrack ? 1 : OFF_TRACK_RESISTANCE_MULTIPLIER);
  const resistanceLoss = resistance * step;
  if (Math.abs(forwardSpeed) <= resistanceLoss && throttle === 0 && boost === 0) {
    forwardSpeed = 0;
  } else {
    forwardSpeed -= Math.sign(forwardSpeed) * resistanceLoss;
  }

  const speedCeiling =
    tuning.maxSpeed * (0.72 + 0.28 * grip) * (1 + RISK_BOOST_SPEED_BONUS * boost);
  forwardSpeed = THREE.MathUtils.clamp(forwardSpeed, -tuning.maxReverse, speedCeiling);

  // --- lateral grip --------------------------------------------------------
  const lateralGrip = grip * (input.handbrake ? tuning.gripLateralHandbrake : tuning.gripLateral);
  lateralSpeed *= Math.exp(-lateralGrip * step);

  state.velocity.copy(forward).multiplyScalar(forwardSpeed).addScaledVector(right, lateralSpeed);

  // --- soft barriers -------------------------------------------------------
  if (surface && !surface.onTrack) {
    const limit = surface.lateral > 0 ? surface.halfWidthPos : -surface.halfWidthNeg;
    const overshoot = Math.abs(surface.lateral) - limit;
    if (overshoot > tuning.wallMargin) {
      const correction = overshoot - tuning.wallMargin;
      state.position.addScaledVector(surface.right, -Math.sign(surface.lateral) * correction);
      forwardSpeed *= 0.34;
      lateralSpeed *= 0.18;
      state.velocity.copy(forward).multiplyScalar(forwardSpeed).addScaledVector(right, lateralSpeed);
      result.wallHit = true;
    }
  }

  state.position.addScaledVector(state.velocity, step);
  state.position.y = 0;

  // --- derived state --------------------------------------------------------
  state.forwardSpeed = forwardSpeed;
  state.lateralSpeed = lateralSpeed;
  state.speed = Math.abs(forwardSpeed);
  state.slipAngle = Math.atan2(Math.abs(lateralSpeed), Math.abs(forwardSpeed) + 0.001);
  state.drift = THREE.MathUtils.clamp(
    (Math.abs(lateralSpeed) - 2.4) / 16 + (input.handbrake && state.speed > 6 ? 0.35 : 0),
    0,
    1
  );
  state.wheelSpin += forwardSpeed * step * 2.4;

  result.offTrack = !onTrack;
  result.slipAngle = state.slipAngle;
  result.grip = grip;
  result.boost = boost;
  result.lateral = surface ? surface.lateral : 0;
  result.yawRate = yawRate;
  result.accel = step > 0 ? (forwardSpeed - previous) / step : 0;

  state.offTrackDepth = THREE.MathUtils.clamp(
    state.offTrackDepth + (onTrack ? -step * 4 : step * 2),
    0,
    1
  );

  return result;
}

function readSurface(state, track) {
  const surface = track.sampleTrack(state.position, state.trackHint);
  state.trackHint = surface.index;
  state.trackIndex = surface.index;
  state.trackU = surface.u;
  state.lateral = surface.lateral;
  state.grip = surface.grip;
  state.onTrack = surface.onTrack;
  state.inSplitZone = surface.inSplitZone;
  state.riskLane = surface.riskLane;
  state.riskBoost = surface.riskBoost;
  state.curvature = surface.curvature;
  return surface;
}

export function forwardOf(heading, target = new THREE.Vector3()) {
  return target.set(Math.sin(heading), 0, Math.cos(heading));
}

export function rightOf(heading, target = new THREE.Vector3()) {
  return target.set(-Math.cos(heading), 0, Math.sin(heading));
}

export function speedToKmh(speed) {
  return Math.abs(speed) * 3.6;
}

export default { createCarState, resetCarState, updateCar, CAR_TUNING };
