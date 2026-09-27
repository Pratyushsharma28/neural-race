import { useMemo } from 'react'
import { TRACK_WAYPOINTS } from './Track.jsx'

/**
 * Checkpoint – renders a gate at a waypoint.
 * Props: index (waypoint index), active, passed
 */
export default function Checkpoint({ index, active, passed }) {
  const { pos, angle } = useMemo(() => {
    if (index >= TRACK_WAYPOINTS.length) return { pos: [0, 0, 0], angle: 0 }
    const [x, z] = TRACK_WAYPOINTS[index]
    let angle = 0
    if (index < TRACK_WAYPOINTS.length - 1) {
      const [nx, nz] = TRACK_WAYPOINTS[index + 1]
      angle = Math.atan2(nx - x, nz - z)
    }
    return { pos: [x, 0, z], angle }
  }, [index])

  const color = passed ? '#4CAF50' : (active ? '#00CED1' : '#AAAAAA')
  const emissive = active ? '#007A80' : (passed ? '#226622' : '#333333')

  return (
    <group position={pos} rotation={[0, angle, 0]}>
      {/* Left post */}
      <mesh position={[-9, 2, 0]} castShadow>
        <boxGeometry args={[0.4, 4, 0.4]} />
        <meshLambertMaterial color={color} emissive={emissive} />
      </mesh>
      {/* Right post */}
      <mesh position={[9, 2, 0]} castShadow>
        <boxGeometry args={[0.4, 4, 0.4]} />
        <meshLambertMaterial color={color} emissive={emissive} />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[18.4, 0.4, 0.4]} />
        <meshLambertMaterial color={color} emissive={emissive} />
      </mesh>
    </group>
  )
}
