import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * TRACK_WAYPOINTS: [[x, z], ...] forming a closed circuit.
 * Includes: long straight, corners, hairpin, safe/risk fork.
 * Exported for use by AI, minimap, and race manager.
 */
export const TRACK_WAYPOINTS = [
  // Start/finish straight
  [0, 0],
  [20, 0],
  [40, 0],
  [60, 0],
  [80, 0],
  // Right turn into back section
  [95, -10],
  [105, -25],
  [105, -45],
  [100, -60],
  // Safe/Risk fork start – both rejoin at [60, -90]
  // SAFE route: gentle wide curve
  [85, -72],   // index 10 – safe route
  [70, -80],
  [60, -90],
  // (Risk route waypoints are tracked separately below)
  // Back straight
  [40, -90],
  [20, -90],
  [0, -90],
  [-20, -90],
  // Hairpin at left end
  [-40, -85],
  [-50, -70],
  [-48, -55],
  [-40, -45],
  // Return straight
  [-30, -30],
  [-20, -15],
  [-10, -5],
  [0, 0],   // closes loop
]

/**
 * RISK_FORK_WAYPOINTS: tighter/faster shortcut through the fork.
 * Joins main track at index 12 ([60,-90]).
 */
export const RISK_FORK_WAYPOINTS = [
  [100, -60],   // branching from index 8
  [95, -75],
  [75, -88],
  [60, -90],    // rejoins main
]

/** Safe fork branch waypoints (from index 8 to 12) */
export const SAFE_FORK_WAYPOINTS = [
  [100, -60],
  [85, -72],
  [70, -80],
  [60, -90],
]

/** Checkpoint gates – [waypointIndex, label] */
export const CHECKPOINT_INDICES = [4, 8, 12, 16, 20]

// Track half-width — 13 units each side = 26 units total, comfortably 3 cars wide
const ROAD_WIDTH = 13
const BARRIER_H = 1.4

function buildTrackGeometry(waypoints) {
  const points = waypoints.map(([x, z]) => new THREE.Vector2(x, z))
  // Close the loop
  points.push(points[0].clone())

  const positions = []
  const indices = []

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i]
    const next = points[i + 1]
    const dir = new THREE.Vector2(next.x - curr.x, next.y - curr.y).normalize()
    const perp = new THREE.Vector2(-dir.y, dir.x)

    const bl = new THREE.Vector2(curr.x - perp.x * ROAD_WIDTH, curr.y - perp.y * ROAD_WIDTH)
    const br = new THREE.Vector2(curr.x + perp.x * ROAD_WIDTH, curr.y + perp.y * ROAD_WIDTH)
    const fl = new THREE.Vector2(next.x - perp.x * ROAD_WIDTH, next.y - perp.y * ROAD_WIDTH)
    const fr = new THREE.Vector2(next.x + perp.x * ROAD_WIDTH, next.y + perp.y * ROAD_WIDTH)

    const base = i * 4
    positions.push(
      bl.x, 0.02, bl.y,
      br.x, 0.02, br.y,
      fl.x, 0.02, fl.y,
      fr.x, 0.02, fr.y,
    )
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export default function Track() {
  const trackGeo = useMemo(() => buildTrackGeometry(TRACK_WAYPOINTS), [])

  // Build barrier meshes along track edges
  const barrierSegments = useMemo(() => {
    const segs = []
    const pts = [...TRACK_WAYPOINTS, TRACK_WAYPOINTS[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i]
      const [x2, z2] = pts[i + 1]
      const dx = x2 - x1, dz = z2 - z1
      const len = Math.sqrt(dx * dx + dz * dz)
      const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2
      const angle = Math.atan2(dx, dz)
      const nx = -dz / len, nz = dx / len
      segs.push({ cx, cz, angle, len, nx, nz })
    }
    return segs
  }, [])

  // Road markings: dashed centre line
  const centreMarks = useMemo(() => {
    const marks = []
    const pts = TRACK_WAYPOINTS
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i]
      const [x2, z2] = pts[i + 1]
      const dx = x2 - x1, dz = z2 - z1
      const len = Math.sqrt(dx * dx + dz * dz)
      const steps = Math.floor(len / 5)
      for (let s = 0; s < steps; s++) {
        if (s % 2 === 0) {
          const t = (s + 0.5) / steps
          marks.push({ x: x1 + dx * t, z: z1 + dz * t, angle: Math.atan2(dx, dz), segLen: 2 })
        }
      }
    }
    return marks
  }, [])

  // Rumble strip segments (alternating red/white boxes along track edges)
  const rumbleStrips = useMemo(() => {
    const strips = []
    const pts = [...TRACK_WAYPOINTS, TRACK_WAYPOINTS[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i]
      const [x2, z2] = pts[i + 1]
      const dx = x2 - x1, dz = z2 - z1
      const len = Math.sqrt(dx * dx + dz * dz)
      const angle = Math.atan2(dx, dz)
      const nx = -dz / len, nz = dx / len
      const steps = Math.max(2, Math.floor(len / 2.5))
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps
        const cx = x1 + dx * t
        const cz = z1 + dz * t
        const color = s % 2 === 0 ? '#FF3333' : '#FFFFFF'
        // left edge
        strips.push({ x: cx - nx * (ROAD_WIDTH - 1.2), z: cz - nz * (ROAD_WIDTH - 1.2), angle, color })
        // right edge
        strips.push({ x: cx + nx * (ROAD_WIDTH - 1.2), z: cz + nz * (ROAD_WIDTH - 1.2), angle, color })
      }
    }
    return strips
  }, [])

  return (
    <group>
      {/* Road surface — slightly darker tarmac */}
      <mesh geometry={trackGeo} receiveShadow>
        <meshLambertMaterial color="#B0B8C2" />
      </mesh>

      {/* Rumble strips */}
      {rumbleStrips.map((rs, i) => (
        <mesh key={i} position={[rs.x, 0.03, rs.z]} rotation={[0, rs.angle, 0]}>
          <boxGeometry args={[2.4, 0.02, 1.8]} />
          <meshLambertMaterial color={rs.color} />
        </mesh>
      ))}

      {/* White barriers on both sides of track */}
      {barrierSegments.map((seg, i) => (
        <group key={i}>
          {/* Left barrier */}
          <mesh
            position={[
              seg.cx - seg.nx * ROAD_WIDTH,
              BARRIER_H / 2,
              seg.cz - seg.nz * ROAD_WIDTH,
            ]}
            rotation={[0, seg.angle, 0]}
            castShadow
          >
            <boxGeometry args={[seg.len + 0.1, BARRIER_H, 0.5]} />
            <meshLambertMaterial color="#FFFFFF" />
          </mesh>
          {/* Colored accent top on left barrier */}
          <mesh
            position={[
              seg.cx - seg.nx * ROAD_WIDTH,
              BARRIER_H,
              seg.cz - seg.nz * ROAD_WIDTH,
            ]}
            rotation={[0, seg.angle, 0]}
          >
            <boxGeometry args={[seg.len + 0.1, 0.15, 0.55]} />
            <meshLambertMaterial color="#00CED1" />
          </mesh>
          {/* Right barrier */}
          <mesh
            position={[
              seg.cx + seg.nx * ROAD_WIDTH,
              BARRIER_H / 2,
              seg.cz + seg.nz * ROAD_WIDTH,
            ]}
            rotation={[0, seg.angle, 0]}
            castShadow
          >
            <boxGeometry args={[seg.len + 0.1, BARRIER_H, 0.5]} />
            <meshLambertMaterial color="#FFFFFF" />
          </mesh>
          {/* Colored accent top on right barrier */}
          <mesh
            position={[
              seg.cx + seg.nx * ROAD_WIDTH,
              BARRIER_H,
              seg.cz + seg.nz * ROAD_WIDTH,
            ]}
            rotation={[0, seg.angle, 0]}
          >
            <boxGeometry args={[seg.len + 0.1, 0.15, 0.55]} />
            <meshLambertMaterial color="#00CED1" />
          </mesh>
        </group>
      ))}

      {/* Dashed centre line */}
      {centreMarks.map((m, i) => (
        <mesh key={i} position={[m.x, 0.04, m.z]} rotation={[0, m.angle, 0]}>
          <boxGeometry args={[m.segLen, 0.01, 0.28]} />
          <meshLambertMaterial color="#FFFFFF" opacity={0.7} transparent />
        </mesh>
      ))}

      {/* Start/finish line — checkered pattern approximation */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[i * 3.2 - 11, 0.05, -1]} rotation={[0, 0, 0]}>
          <boxGeometry args={[3.0, 0.01, 2]} />
          <meshLambertMaterial color={i % 2 === 0 ? '#FFFFFF' : '#111111'} />
        </mesh>
      ))}

      {/* Fork sign: SAFE — cyan */}
      <mesh position={[105, 1.5, -62]}>
        <boxGeometry args={[4, 1, 0.18]} />
        <meshStandardMaterial color="#00CED1" emissive="#00CED1" emissiveIntensity={0.3} />
      </mesh>
      {/* Fork sign: RISK — coral */}
      <mesh position={[105, 1.5, -57]}>
        <boxGeometry args={[4, 1, 0.18]} />
        <meshStandardMaterial color="#FF6B6B" emissive="#FF2222" emissiveIntensity={0.2} />
      </mesh>

      {/* Hairpin marker posts (left end of track) */}
      {[[-50, -75], [-55, -65], [-55, -55]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.5, z]}>
          <cylinderGeometry args={[0.2, 0.2, 3, 6]} />
          <meshLambertMaterial color={i % 2 === 0 ? '#FF3333' : '#FFFFFF'} />
        </mesh>
      ))}
    </group>
  )
}
