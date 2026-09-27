import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { updateCarPhysics, createCarState } from './CarPhysics.js'
import { DriverDNA } from './DriverDNA.js'
import * as THREE from 'three'

const WHEEL_R = 0.32
const WHEEL_W = 0.34

// Shared materials (created once, reused)
const matBody   = new THREE.MeshStandardMaterial({ color: '#FFFFFF', metalness: 0.55, roughness: 0.25 })
const matCabin  = new THREE.MeshStandardMaterial({ color: '#C8E8F8', metalness: 0.3, roughness: 0.15, transparent: true, opacity: 0.85 })
const matAccent = new THREE.MeshStandardMaterial({ color: '#00CED1', metalness: 0.7, roughness: 0.2, emissive: '#00CED1', emissiveIntensity: 0.15 })
const matWheel  = new THREE.MeshStandardMaterial({ color: '#222233', metalness: 0.2, roughness: 0.8 })
const matRim    = new THREE.MeshStandardMaterial({ color: '#C8C8D8', metalness: 0.9, roughness: 0.15 })
const matBrake  = new THREE.MeshStandardMaterial({ color: '#FF2222', emissive: '#330000', emissiveIntensity: 0.2 })
const matHeadlight = new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFFFFF', emissiveIntensity: 1.5 })
const matUnderbody = new THREE.MeshStandardMaterial({ color: '#333344', metalness: 0.3, roughness: 0.7 })
const matExhaust  = new THREE.MeshStandardMaterial({ color: '#888899', metalness: 0.85, roughness: 0.2 })

function Wheel({ position, isFront, wheelRef, steerRef }) {
  return (
    <group position={position} ref={isFront ? steerRef : null}>
      {/* Tyre */}
      <mesh ref={wheelRef} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[WHEEL_R, WHEEL_R, WHEEL_W, 12]} />
        <primitive object={matWheel} attach="material" />
      </mesh>
      {/* Rim */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[WHEEL_R * 0.62, WHEEL_R * 0.62, WHEEL_W + 0.01, 8]} />
        <primitive object={matRim} attach="material" />
      </mesh>
    </group>
  )
}

export default function PlayerCar({ controlsRef, active, carStateRef, dnaRef }) {
  const groupRef  = useRef()
  const brakeLRef = useRef()
  const brakeRRef = useRef()

  const wheelRefs  = [useRef(), useRef(), useRef(), useRef()]
  const steerFL    = useRef()
  const steerFR    = useRef()

  const skidPool   = useMemo(() => Array.from({ length: 40 }, () => ({ pos: [0, -10, 0], active: false })), [])
  const skidIdx    = useRef(0)
  const smokePool  = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ id: i, pos: [0, -10, 0], active: false, age: 0 })), [])
  const smokeIdx   = useRef(0)

  // Track starts at [0,0]→[20,0] = +X direction.
  // Physics: heading=0 → -Z. Heading pointing +X = Math.PI/2.
  if (!carStateRef.current) carStateRef.current = createCarState(0, 0, Math.PI / 2)
  if (!dnaRef.current)      dnaRef.current      = new DriverDNA()

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const dt = Math.min(delta, 0.05)
    const controls = controlsRef.current
    const prev = carStateRef.current
    const next = active ? updateCarPhysics(prev, controls, dt) : prev
    carStateRef.current = next
    if (active && dnaRef.current) dnaRef.current.update(next, dt)

    // Position & heading
    // Physics movement at heading h: world direction = (sin h, 0, -cos h)
    // Three.js rotation.y=θ: local -Z faces world (sin θ, 0, cos θ)
    // Match sin θ = sin h AND cos θ = -cos h → θ = π - h  (NOT h+π which flips X)
    groupRef.current.position.set(next.x, 0, next.z)
    groupRef.current.rotation.y = Math.PI - next.heading

    // Wheel spin
    const spin = (next.vy * dt) / WHEEL_R
    wheelRefs.forEach(r => { if (r.current) r.current.rotation.x -= spin })

    // Front-wheel steer
    const steerY = (next.steerAngle * Math.PI) / 180
    if (steerFL.current) steerFL.current.rotation.y = steerY
    if (steerFR.current) steerFR.current.rotation.y = steerY

    // Brake lights
    const bi = next.isBraking ? 1.8 : 0.18
    if (brakeLRef.current) { brakeLRef.current.material.emissiveIntensity = bi }
    if (brakeRRef.current) { brakeRRef.current.material.emissiveIntensity = bi }

    // Skid marks
    if (next.isDrifting && active) {
      const si = skidIdx.current % skidPool.length
      skidPool[si].pos = [next.x, 0.02, next.z]
      skidPool[si].active = true
      skidIdx.current++
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>

      {/* ── FLAT LOW UNDERBODY ── */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[1.80, 0.10, 4.0]} />
        <primitive object={matUnderbody} attach="material" />
      </mesh>

      {/* ── MAIN WEDGE BODY — wide, flat, aggressive ── */}
      {/* Rear wide section */}
      <mesh position={[0, 0.38, 0.8]} castShadow>
        <boxGeometry args={[1.85, 0.38, 2.0]} />
        <primitive object={matBody} attach="material" />
      </mesh>
      {/* Mid body — narrows toward nose */}
      <mesh position={[0, 0.32, -0.4]} castShadow>
        <boxGeometry args={[1.60, 0.30, 1.6]} />
        <primitive object={matBody} attach="material" />
      </mesh>
      {/* Nose wedge — very low and pointed */}
      <mesh position={[0, 0.22, -1.6]} castShadow>
        <boxGeometry args={[1.20, 0.18, 1.2]} />
        <primitive object={matBody} attach="material" />
      </mesh>

      {/* ── SHARP ANGULAR HOOD PANELS ── */}
      <mesh position={[-0.52, 0.40, -1.0]} castShadow rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.60, 0.10, 1.8]} />
        <primitive object={matBody} attach="material" />
      </mesh>
      <mesh position={[0.52, 0.40, -1.0]} castShadow rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.60, 0.10, 1.8]} />
        <primitive object={matBody} attach="material" />
      </mesh>

      {/* ── COCKPIT / CANOPY — narrow and raked back ── */}
      <mesh position={[0, 0.72, 0.1]} castShadow rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.90, 0.38, 1.50]} />
        <primitive object={matCabin} attach="material" />
      </mesh>
      {/* Canopy top spine */}
      <mesh position={[0, 0.96, 0.2]}>
        <boxGeometry args={[0.20, 0.14, 1.30]} />
        <primitive object={matAccent} attach="material" />
      </mesh>

      {/* ── SHARP SHOULDER INTAKES (side vents) ── */}
      <mesh position={[-0.96, 0.52, 0.0]} castShadow rotation={[0, 0, -0.22]}>
        <boxGeometry args={[0.18, 0.30, 1.60]} />
        <primitive object={matAccent} attach="material" />
      </mesh>
      <mesh position={[0.96, 0.52, 0.0]} castShadow rotation={[0, 0, 0.22]}>
        <boxGeometry args={[0.18, 0.30, 1.60]} />
        <primitive object={matAccent} attach="material" />
      </mesh>

      {/* ── WIDE FRONT SPLITTER ── */}
      <mesh position={[0, 0.14, -1.98]}>
        <boxGeometry args={[2.10, 0.07, 0.35]} />
        <primitive object={matAccent} attach="material" />
      </mesh>
      {/* Front blade fins */}
      <mesh position={[-0.70, 0.22, -1.92]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.08, 0.18, 0.45]} />
        <primitive object={matAccent} attach="material" />
      </mesh>
      <mesh position={[0.70, 0.22, -1.92]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[0.08, 0.18, 0.45]} />
        <primitive object={matAccent} attach="material" />
      </mesh>

      {/* ── DRAMATIC TALL REAR WING ── */}
      {/* Wing main plane */}
      <mesh position={[0, 1.30, 1.80]} castShadow>
        <boxGeometry args={[2.20, 0.09, 0.55]} />
        <primitive object={matAccent} attach="material" />
      </mesh>
      {/* Wing end plates — sharp */}
      <mesh position={[-1.12, 1.05, 1.80]} castShadow>
        <boxGeometry args={[0.09, 0.55, 0.60]} />
        <primitive object={matAccent} attach="material" />
      </mesh>
      <mesh position={[1.12, 1.05, 1.80]} castShadow>
        <boxGeometry args={[0.09, 0.55, 0.60]} />
        <primitive object={matAccent} attach="material" />
      </mesh>
      {/* Wing stanchions */}
      <mesh position={[-0.55, 0.88, 1.78]}>
        <boxGeometry args={[0.07, 0.60, 0.10]} />
        <primitive object={matBody} attach="material" />
      </mesh>
      <mesh position={[0.55, 0.88, 1.78]}>
        <boxGeometry args={[0.07, 0.60, 0.10]} />
        <primitive object={matBody} attach="material" />
      </mesh>

      {/* ── SHARK-FIN ENGINE COVER ── */}
      <mesh position={[0, 1.10, 1.10]} castShadow>
        <boxGeometry args={[0.09, 0.72, 0.90]} />
        <primitive object={matBody} attach="material" />
      </mesh>

      {/* ── REAR DIFFUSER ── */}
      <mesh position={[0, 0.16, 2.0]} rotation={[0.30, 0, 0]}>
        <boxGeometry args={[1.70, 0.09, 0.60]} />
        <primitive object={matAccent} attach="material" />
      </mesh>
      {/* Diffuser vanes */}
      {[-0.55, 0, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 0.22, 1.95]} rotation={[0.28, 0, 0]}>
          <boxGeometry args={[0.06, 0.22, 0.50]} />
          <primitive object={matAccent} attach="material" />
        </mesh>
      ))}

      {/* ── POINTED HEADLIGHTS ── */}
      <mesh position={[-0.50, 0.32, -1.96]}>
        <boxGeometry args={[0.44, 0.10, 0.06]} />
        <primitive object={matHeadlight} attach="material" />
      </mesh>
      <mesh position={[0.50, 0.32, -1.96]}>
        <boxGeometry args={[0.44, 0.10, 0.06]} />
        <primitive object={matHeadlight} attach="material" />
      </mesh>
      {/* Headlight slash marks */}
      <mesh position={[-0.52, 0.26, -1.97]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.28, 0.05, 0.05]} />
        <meshStandardMaterial color="#CCEEFF" emissive="#88DDFF" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.52, 0.26, -1.97]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.28, 0.05, 0.05]} />
        <meshStandardMaterial color="#CCEEFF" emissive="#88DDFF" emissiveIntensity={1.2} />
      </mesh>

      {/* ── BRAKE LIGHTS — full-width LED bar ── */}
      <mesh ref={brakeLRef} position={[-0.55, 0.42, 1.96]}>
        <boxGeometry args={[0.50, 0.09, 0.05]} />
        <meshStandardMaterial color="#FF2020" emissive="#FF0000" emissiveIntensity={0.2} />
      </mesh>
      <mesh ref={brakeRRef} position={[0.55, 0.42, 1.96]}>
        <boxGeometry args={[0.50, 0.09, 0.05]} />
        <meshStandardMaterial color="#FF2020" emissive="#FF0000" emissiveIntensity={0.2} />
      </mesh>
      {/* LED bar connecting both */}
      <mesh position={[0, 0.42, 1.96]}>
        <boxGeometry args={[0.50, 0.04, 0.04]} />
        <meshStandardMaterial color="#FF4444" emissive="#FF2222" emissiveIntensity={0.15} />
      </mesh>

      {/* ── WHEELS — wider, lower-profile ── */}
      {/* FL */}
      <Wheel position={[-1.02, 0.32, -1.15]} isFront wheelRef={wheelRefs[0]} steerRef={steerFL} />
      {/* FR */}
      <Wheel position={[1.02, 0.32, -1.15]} isFront wheelRef={wheelRefs[1]} steerRef={steerFR} />
      {/* RL */}
      <Wheel position={[-1.02, 0.32, 1.15]} isFront={false} wheelRef={wheelRefs[2]} steerRef={null} />
      {/* RR */}
      <Wheel position={[1.02, 0.32, 1.15]} isFront={false} wheelRef={wheelRefs[3]} steerRef={null} />

      {/* ── Skid marks ── */}
      {skidPool.map((s, i) =>
        s.active ? (
          <mesh key={i} position={s.pos} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.5, 0.5]} />
            <meshBasicMaterial color="#333" transparent opacity={0.35} depthWrite={false} />
          </mesh>
        ) : null
      )}
    </group>
  )
}
