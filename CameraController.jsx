import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Camera sits behind and above the car.
// heading=0 → car faces -Z, so "behind" is +Z offset.
const BEHIND_DIST = 11   // how far behind the car (in +Z when heading=0)
const ABOVE_DIST  = 5.5  // height above car
const LOOKAHEAD_DIST = 8 // how far ahead of car the camera looks
const LERP_POS  = 7      // positional smoothing
const LERP_LOOK = 10     // look-at smoothing

export default function CameraController({ carStateRef }) {
  const { camera } = useThree()
  const camPos   = useRef(new THREE.Vector3(0, ABOVE_DIST, BEHIND_DIST))
  const lookPos  = useRef(new THREE.Vector3(0, 0, 0))

  useFrame((_, delta) => {
    if (!carStateRef.current) return
    const dt = Math.min(delta, 0.05)
    const { x, z, heading, vy } = carStateRef.current
    const h = heading || 0

    // "Behind" the car: +Z direction rotated by heading
    // heading=0 → behind offset = (0, 0, +BEHIND_DIST)
    // General: behind = (-sin(h)*0 + sin(h)*0... let's derive properly:
    //   forward dir = (sin(h), 0, -cos(h))
    //   behind dir  = -(sin(h), 0, -cos(h)) = (-sin(h), 0, cos(h))
    const speedBonus = Math.max(0, Math.abs(vy || 0) / 32) * 2.5
    const dist = BEHIND_DIST + speedBonus

    const targetX = x + (-Math.sin(h)) * dist
    const targetZ = z + ( Math.cos(h)) * dist

    const targetPos = new THREE.Vector3(targetX, ABOVE_DIST, targetZ)
    camPos.current.lerp(targetPos, Math.min(1, LERP_POS * dt))
    camera.position.copy(camPos.current)

    // Look slightly ahead of the car
    const aheadX = x + Math.sin(h) * LOOKAHEAD_DIST
    const aheadZ = z - Math.cos(h) * LOOKAHEAD_DIST
    const targetLook = new THREE.Vector3(aheadX, 0.8, aheadZ)
    lookPos.current.lerp(targetLook, Math.min(1, LERP_LOOK * dt))
    camera.lookAt(lookPos.current)
  })

  return null
}
