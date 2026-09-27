import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { TRACK_WAYPOINTS } from './Track.jsx'

const WHEEL_RADIUS = 0.35
const WHEEL_WIDTH = 0.25
const MAX_PLAYER_SPEED = 28

/**
 * AIOpponent – single AI car following TRACK_WAYPOINTS.
 * Props: speedFactor (0-1), color, accentColor, carStateRef, startOffset (waypoint index)
 */
export default function AIOpponent({ speedFactor = 0.85, color = 'skyblue', accentColor = '#AAAAAA', carStateRef, startOffset = 2 }) {
  const groupRef = useRef()
  const wheelsRef = useRef([])
  const stateRef = useRef({
    x: TRACK_WAYPOINTS[startOffset][0],
    z: TRACK_WAYPOINTS[startOffset][1],
    heading: Math.PI / 2,   // track starts going +X; physics heading for +X = π/2
    speed: 0,
    nextWP: (startOffset + 1) % TRACK_WAYPOINTS.length,
    lap: 1,
  })

  // Expose position for race manager
  if (!carStateRef.current) {
    carStateRef.current = { x: stateRef.current.x, z: stateRef.current.z }
  }

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const clampedDelta = Math.min(delta, 0.05)
    const s = stateRef.current
    const MAX_SPEED = MAX_PLAYER_SPEED * speedFactor
    const ACCEL = 15 * speedFactor
    const STEER_RATE = 2.5

    // Target: next waypoint
    const wp = TRACK_WAYPOINTS[s.nextWP]
    const dx = wp[0] - s.x
    const dz = wp[1] - s.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    // Steer toward waypoint.
    // Physics convention (matches player): heading=0 → forward is -Z
    //   movement: x += sin(h)*speed,  z -= cos(h)*speed
    // So the heading that points toward (dx, dz) is atan2(dx, -dz) — note negated dz.
    const targetHeading = Math.atan2(dx, -dz)
    let headingDiff = targetHeading - s.heading
    // Normalise to [-π, π]
    while (headingDiff > Math.PI) headingDiff -= Math.PI * 2
    while (headingDiff < -Math.PI) headingDiff += Math.PI * 2
    s.heading += headingDiff * Math.min(1, STEER_RATE * clampedDelta)

    // Slow down for sharp corners
    const sharpness = Math.abs(headingDiff)
    const speedTarget = MAX_SPEED * (1 - sharpness * 0.4)

    // Accelerate/decelerate toward target speed
    if (s.speed < speedTarget) {
      s.speed = Math.min(speedTarget, s.speed + ACCEL * clampedDelta)
    } else {
      s.speed = Math.max(speedTarget * 0.9, s.speed - 18 * clampedDelta)
    }

    // Move — same convention as player: -Z is forward
    s.x +=  Math.sin(s.heading) * s.speed * clampedDelta
    s.z -= Math.cos(s.heading) * s.speed * clampedDelta

    // Advance waypoint when close
    if (dist < 8) {
      s.nextWP = (s.nextWP + 1) % TRACK_WAYPOINTS.length
    }

    // Update exposed state
    carStateRef.current = { x: s.x, z: s.z }

    // Apply transform — rotation.y = π - heading aligns car front (-Z) with movement dir
    groupRef.current.position.set(s.x, 0.5, s.z)
    groupRef.current.rotation.y = Math.PI - s.heading

    // Wheel rotation
    const wheelRot = (s.speed * clampedDelta) / WHEEL_RADIUS
    wheelsRef.current.forEach(w => { if (w) w.rotation.x -= wheelRot })
  })

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1.8, 0.6, 3.6]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.8, 0.2]} castShadow>
        <boxGeometry args={[1.4, 0.5, 2.0]} />
        <meshLambertMaterial color="#D4EEF8" />
      </mesh>
      {/* Accent stripe */}
      <mesh position={[0, 0.61, 0]}>
        <boxGeometry args={[1.82, 0.06, 3.62]} />
        <meshLambertMaterial color={accentColor} />
      </mesh>
      {/* Front wing */}
      <mesh position={[0, 0.1, -2.0]} castShadow>
        <boxGeometry args={[2.1, 0.12, 0.45]} />
        <meshLambertMaterial color={accentColor} />
      </mesh>
      {/* Rear wing */}
      <mesh position={[0, 0.85, 1.6]} castShadow>
        <boxGeometry args={[1.9, 0.12, 0.38]} />
        <meshLambertMaterial color={accentColor} />
      </mesh>
      {/* Tail lights */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.3, 1.85]}>
          <boxGeometry args={[0.35, 0.18, 0.05]} />
          <meshStandardMaterial color="#FF4444" emissive="#440000" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* Wheels */}
      {[[-1.05, -1.1], [1.05, -1.1], [-1.05, 1.1], [1.05, 1.1]].map(([x, z], i) => (
        <group key={i} position={[x, -0.1, z]}>
          <mesh ref={el => wheelsRef.current[i] = el} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 8]} />
            <meshLambertMaterial color="#333344" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
