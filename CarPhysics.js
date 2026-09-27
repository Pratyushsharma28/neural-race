/**
 * CarPhysics.js
 * Pure function – no side effects, no Three imports.
 * updateCarPhysics(state, input, delta) → next state
 *
 * Coordinate system: Three.js, Y-up.
 *   heading = 0  → car faces -Z
 *   movement: x += sin(heading)*speed, z -= cos(heading)*speed
 */

// Track waypoints inlined here to avoid circular dependency with Track.jsx
// Keep in sync with Track.jsx TRACK_WAYPOINTS
const WALL_WAYPOINTS = [
  [0, 0], [20, 0], [40, 0], [60, 0], [80, 0],
  [95, -10], [105, -25], [105, -45], [100, -60],
  [85, -72], [70, -80], [60, -90],
  [40, -90], [20, -90], [0, -90], [-20, -90],
  [-40, -85], [-50, -70], [-48, -55], [-40, -45],
  [-30, -30], [-20, -15], [-10, -5], [0, 0],
]

const MAX_SPEED     = 45
const ACCELERATION  = 30
const BRAKE_DECEL   = 45
const FRICTION      = 5
const HANDBRAKE_F   = 32
const MAX_STEER_DEG = 78     // very wide steer angle
const STEER_FALLOFF = 0.50   // minimal falloff — turning stays strong at speed
const STEER_RETURN  = 10
const TURN_SHARPNESS = 11.0  // very responsive turning

export function updateCarPhysics(state, input, delta) {
  let { x, z, vy, heading, steerAngle, driftTime, brakeEvents,
        collisions, onRisk, speed, isBraking, isDrifting } = state

  const { forward, back, left, right, handbrake } = input

  // ── Acceleration / braking ──────────────────────────────────────────────────
  if (forward) {
    vy = Math.min(MAX_SPEED, vy + ACCELERATION * delta)
    isBraking = false
  } else if (back) {
    if (vy > 0.5) {
      // Braking while going forward
      vy = Math.max(0, vy - BRAKE_DECEL * delta)
      isBraking = true
    } else {
      // Reverse
      vy = Math.max(-MAX_SPEED * 0.28, vy - (ACCELERATION * 0.5) * delta)
      isBraking = false
    }
  } else {
    isBraking = false
  }

  // Handbrake / drift
  if (handbrake) {
    vy *= Math.max(0, 1 - HANDBRAKE_F * delta)
    if (!back) isBraking = true
  }

  // Natural friction (coast)
  if (!forward && !back && !handbrake) {
    const sign = vy >= 0 ? 1 : -1
    vy = sign * Math.max(0, Math.abs(vy) - FRICTION * delta)
  }

  // ── Speed-dependent steering ────────────────────────────────────────────────
  const speedFraction = Math.abs(vy) / MAX_SPEED
  const maxSteerNow   = MAX_STEER_DEG * Math.pow(STEER_FALLOFF, speedFraction * 12)
  // right key = turn right visually. With rotation.y = π - heading,
  // decreasing heading turns right. turnRate is negated, so positive steerInput → heading decreases → turns right.
  // But user reports right turns left → steerInput sign is still backwards. Flip it:
  const steerInput  = (left ? 1 : 0) - (right ? 1 : 0)
  const targetSteer = steerInput * maxSteerNow

  steerAngle += (targetSteer - steerAngle) * Math.min(1, delta * 9)
  if (!left && !right) {
    steerAngle *= Math.max(0, 1 - STEER_RETURN * delta)
  }

  // ── Heading (yaw) ───────────────────────────────────────────────────────────
  if (Math.abs(vy) > 0.1) {
    const steerRad = steerAngle * Math.PI / 180
    // rotation.y = π - heading, so increasing heading rotates car LEFT visually.
    // D (right) = positive steerAngle → must DECREASE heading to turn right → negate.
    const turnRate = (vy > 0 ? -1 : 1) * steerRad * (Math.abs(vy) / MAX_SPEED) * TURN_SHARPNESS
    heading += turnRate * delta
  }

  // ── Position update ─────────────────────────────────────────────────────────
  const newX = x + Math.sin(heading) * vy * delta
  const newZ = z - Math.cos(heading) * vy * delta

  // ── Hard wall collision ─────────────────────────────────────────────────────
  const ROAD_HALF = 11.0   // hard limit — car cannot pass this distance from centreline
  let bestDist = Infinity, bestT = 0, bestSeg = 0
  const wpts = WALL_WAYPOINTS
  for (let i = 0; i < wpts.length; i++) {
    const [ax, az] = wpts[i]
    const [bx, bz] = wpts[(i + 1) % wpts.length]
    const dx = bx - ax, dz = bz - az
    const lenSq = dx * dx + dz * dz
    if (lenSq < 0.001) continue
    const t = Math.max(0, Math.min(1, ((newX - ax) * dx + (newZ - az) * dz) / lenSq))
    const cx = ax + t * dx, cz = az + t * dz
    const dist = Math.sqrt((newX - cx) ** 2 + (newZ - cz) ** 2)
    if (dist < bestDist) { bestDist = dist; bestT = t; bestSeg = i }
  }

  let fx = newX, fz = newZ
  if (bestDist > ROAD_HALF) {
    // Push car back to the road edge
    const [ax, az] = wpts[bestSeg]
    const [bx, bz] = wpts[(bestSeg + 1) % wpts.length]
    const dx = bx - ax, dz = bz - az
    const cx = ax + bestT * dx, cz = az + bestT * dz
    const nx = newX - cx, nz = newZ - cz
    const len = Math.sqrt(nx * nx + nz * nz) || 1
    // Project back to road edge
    fx = cx + (nx / len) * ROAD_HALF
    fz = cz + (nz / len) * ROAD_HALF
    // Kill speed into the wall hard, bounce back
    vy *= -0.35   // bounce
    collisions++
  }
  x = fx
  z = fz

  // ── Drift / skid detection ──────────────────────────────────────────────────
  isDrifting = handbrake && Math.abs(vy) > 5
  if (isDrifting) driftTime += delta

  speed = vy

  return {
    x, z, vy, heading, steerAngle, driftTime, brakeEvents,
    collisions, onRisk, speed, isBraking, isDrifting,
    maxSpeed: Math.max(state.maxSpeed || 0, vy),
  }
}

export function createCarState(startX = 0, startZ = 0, startHeading = 0) {
  return {
    x: startX, z: startZ,
    vy: 0,
    heading: startHeading,
    steerAngle: 0,
    driftTime: 0,
    brakeEvents: 0,
    collisions: 0,
    onRisk: false,
    speed: 0,
    maxSpeed: 0,
    isBraking: false,
    isDrifting: false,
    totalDist: 0,
  }
}

export { MAX_SPEED }
