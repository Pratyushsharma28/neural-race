import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function seededRng(seed) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

// ── Sky dome — vertex-color gradient from horizon blue to zenith deep blue ──
function Sky() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(440, 32, 16)
    const pos = g.attributes.position
    const colors = []
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const t = Math.max(0, Math.min(1, (y + 440) / 880))
      // horizon: #87CEEB (sky blue), zenith: #1A6BAF (deep blue)
      colors.push(
        0.529 + (0.102 - 0.529) * t,
        0.808 + (0.420 - 0.808) * t,
        0.922 + (0.686 - 0.922) * t,
      )
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return g
  }, [])
  return (
    <mesh geometry={geo} scale={[-1, 1, 1]} renderOrder={-100}>
      <meshBasicMaterial side={THREE.BackSide} vertexColors />
    </mesh>
  )
}

// ── Sun with halo glow ────────────────────────────────────────────────────
function Sun() {
  return (
    <group position={[120, 200, -350]}>
      {/* core disc */}
      <mesh>
        <sphereGeometry args={[9, 16, 16]} />
        <meshBasicMaterial color="#FFFDE0" />
      </mesh>
      {/* inner halo */}
      <mesh>
        <sphereGeometry args={[14, 16, 16]} />
        <meshBasicMaterial color="#FFE87A" transparent opacity={0.18} />
      </mesh>
      {/* outer halo */}
      <mesh>
        <sphereGeometry args={[22, 16, 16]} />
        <meshBasicMaterial color="#FFD040" transparent opacity={0.07} />
      </mesh>
    </group>
  )
}

// ── Cloud (flat box clusters) ─────────────────────────────────────────────
function Cloud({ x, y, z, scale = 1 }) {
  return (
    <group position={[x, y, z]} scale={scale}>
      <mesh>
        <boxGeometry args={[12, 3, 5]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.82} />
      </mesh>
      <mesh position={[5, 1.5, 0]}>
        <boxGeometry args={[7, 2.5, 4]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} />
      </mesh>
      <mesh position={[-4, 1, 0]}>
        <boxGeometry args={[6, 2, 4]} />
        <meshBasicMaterial color="#F8F8FF" transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

// ── Mountain — layered with rock mid-band and snow cap ────────────────────
function Mountain({ x, z, h = 40, w = 35 }) {
  return (
    <group position={[x, 0, z]}>
      {/* base slope — warm grey */}
      <mesh position={[0, h * 0.28, 0]}>
        <coneGeometry args={[w, h * 0.56, 7]} />
        <meshLambertMaterial color="#8A9BA8" />
      </mesh>
      {/* main peak — cooler grey */}
      <mesh position={[0, h * 0.62, 0]}>
        <coneGeometry args={[w * 0.58, h * 0.76, 6]} />
        <meshLambertMaterial color="#9AAEBB" />
      </mesh>
      {/* rock band just below snow */}
      <mesh position={[0, h * 0.80, 0]}>
        <coneGeometry args={[w * 0.28, h * 0.18, 6]} />
        <meshLambertMaterial color="#7A8E9A" />
      </mesh>
      {/* snow cap */}
      <mesh position={[0, h * 0.90, 0]}>
        <coneGeometry args={[w * 0.20, h * 0.22, 6]} />
        <meshLambertMaterial color="#EEF4FA" />
      </mesh>
    </group>
  )
}

// ── Tree — 3 variants ────────────────────────────────────────────────────
function Tree({ x, z, scale = 1, variant = 0 }) {
  if (variant === 0) {
    // Layered pine
    return (
      <group position={[x, 0, z]} scale={scale}>
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.16, 0.24, 1.8, 6]} />
          <meshLambertMaterial color="#5C3D1A" />
        </mesh>
        <mesh position={[0, 4.2, 0]}>
          <coneGeometry args={[0.9, 2.8, 7]} />
          <meshLambertMaterial color="#1E6B2E" />
        </mesh>
        <mesh position={[0, 3.1, 0]}>
          <coneGeometry args={[1.3, 2.4, 7]} />
          <meshLambertMaterial color="#267A36" />
        </mesh>
        <mesh position={[0, 2.0, 0]}>
          <coneGeometry args={[1.6, 2.0, 7]} />
          <meshLambertMaterial color="#2E8840" />
        </mesh>
      </group>
    )
  }
  if (variant === 1) {
    // Round deciduous
    return (
      <group position={[x, 0, z]} scale={scale}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.18, 0.26, 2.2, 7]} />
          <meshLambertMaterial color="#6B4422" />
        </mesh>
        <mesh position={[0, 3.8, 0]}>
          <sphereGeometry args={[1.6, 9, 7]} />
          <meshLambertMaterial color="#2E8B3A" />
        </mesh>
        <mesh position={[0.5, 4.4, 0.4]}>
          <sphereGeometry args={[1.0, 8, 6]} />
          <meshLambertMaterial color="#369640" />
        </mesh>
        <mesh position={[-0.6, 4.2, -0.3]}>
          <sphereGeometry args={[0.9, 8, 6]} />
          <meshLambertMaterial color="#288034" />
        </mesh>
      </group>
    )
  }
  // Slim cypress / tall tree
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.14, 0.20, 2.0, 6]} />
        <meshLambertMaterial color="#5A3818" />
      </mesh>
      <mesh position={[0, 4.0, 0]}>
        <coneGeometry args={[0.7, 5.0, 7]} />
        <meshLambertMaterial color="#1A5C28" />
      </mesh>
      <mesh position={[0, 3.0, 0]}>
        <coneGeometry args={[1.0, 3.0, 7]} />
        <meshLambertMaterial color="#226632" />
      </mesh>
    </group>
  )
}

// ── Futuristic building — setback tower with glass facade ────────────────
function Building({ x, z, w, h, d, color, glowColor }) {
  const floors = Math.floor(h / 3)
  return (
    <group position={[x, 0, z]}>
      {/* Base podium */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[w * 1.15, 2.4, d * 1.15]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Main tower */}
      <mesh position={[0, h / 2 + 1.2, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Upper setback */}
      <mesh position={[0, h * 0.78 + 1.2, 0]} castShadow>
        <boxGeometry args={[w * 0.65, h * 0.44, d * 0.65]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Rooftop glow band */}
      <mesh position={[0, h + 1.5, 0]}>
        <boxGeometry args={[w * 0.92, 0.35, d * 0.92]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={0.9} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, h + 3.5, 0]}>
        <cylinderGeometry args={[0.06, 0.10, 4, 5]} />
        <meshLambertMaterial color="#AABBCC" />
      </mesh>
      {/* Glass window strips — front face */}
      {Array.from({ length: Math.min(floors, 10) }).map((_, i) => (
        <mesh key={i} position={[0, 2.4 + i * 3, d / 2 + 0.02]}>
          <planeGeometry args={[w * 0.78, 1.2]} />
          <meshStandardMaterial
            color="#C8E8FF"
            emissive="#88C8F0"
            emissiveIntensity={0.35}
            transparent
            opacity={0.88}
          />
        </mesh>
      ))}
      {/* Glass strips — side face */}
      {Array.from({ length: Math.min(floors, 8) }).map((_, i) => (
        <mesh key={i} position={[w / 2 + 0.02, 2.4 + i * 3, 0]}>
          <planeGeometry args={[d * 0.6, 1.0]} />
          <meshStandardMaterial
            color="#B8D8F8"
            emissive="#70B0E0"
            emissiveIntensity={0.25}
            transparent
            opacity={0.80}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Street lamp ───────────────────────────────────────────────────────────
function Lamp({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 6, 5]} />
        <meshLambertMaterial color="#888899" />
      </mesh>
      <mesh position={[0.5, 6.1, 0]}>
        <boxGeometry args={[1, 0.15, 0.15]} />
        <meshLambertMaterial color="#888899" />
      </mesh>
      <mesh position={[1.05, 6, 0]}>
        <sphereGeometry args={[0.22, 6, 6]} />
        <meshStandardMaterial color="#FFFDE0" emissive="#FFEE88" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

// ── Grandstand ────────────────────────────────────────────────────────────
function Grandstand({ x, z, rot = 0 }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* Tiered seating – 3 steps */}
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[0, 0.6 + i * 0.9, -i * 1.1]} castShadow>
          <boxGeometry args={[12, 0.35, 1.4]} />
          <meshLambertMaterial color={i % 2 === 0 ? '#D0E8F8' : '#FFFFFF'} />
        </mesh>
      ))}
      {/* Back wall */}
      <mesh position={[0, 2.5, -3.8]} castShadow>
        <boxGeometry args={[12, 5, 0.4]} />
        <meshLambertMaterial color="#E8EEF4" />
      </mesh>
    </group>
  )
}

export default function Environment() {
  const r1 = useMemo(() => seededRng(42), [])
  const r2 = useMemo(() => seededRng(17), [])
  const r3 = useMemo(() => seededRng(99), [])

  const trees = useMemo(() => {
    const rng = seededRng(7)
    const positions = []
    let attempts = 0
    while (positions.length < 70 && attempts < 400) {
      attempts++
      const x = (rng() - 0.5) * 320
      const z = (rng() - 0.5) * 280
      if (x > -75 && x < 135 && z > -110 && z < 30) continue
      positions.push({
        x, z,
        scale: 0.7 + rng() * 0.8,
        variant: Math.floor(rng() * 3),  // 3 variants now
      })
    }
    return positions
  }, [])

  const buildings = useMemo(() => {
    const rng = seededRng(13)
    const glows = ['#00CED1', '#00BFFF', '#7DF9FF', '#40E0D0', '#87CEEB']
    return Array.from({ length: 24 }, (_, i) => {
      const side = rng() > 0.5 ? 1 : -1
      return {
        x: side * (130 + rng() * 80),
        z: (rng() - 0.5) * 260,
        w: 5 + rng() * 10,
        h: 10 + rng() * 35,
        d: 5 + rng() * 10,
        color: `hsl(${200 + rng() * 25}, ${10 + rng() * 15}%, ${72 + rng() * 18}%)`,
        glowColor: glows[Math.floor(rng() * glows.length)],
      }
    })
  }, [])

  const clouds = useMemo(() => {
    const rng = seededRng(55)
    return Array.from({ length: 14 }, (_, i) => ({
      x: (rng() - 0.5) * 600,
      y: 80 + rng() * 60,
      z: (rng() - 0.5) * 500,
      scale: 0.8 + rng() * 1.4,
    }))
  }, [])

  const lamps = useMemo(() => {
    // Line of lamps along the main straight (z ≈ 0, x = 0..80)
    const out = []
    for (let i = 0; i <= 8; i++) out.push({ x: i * 10 + 2, z: 7 })
    for (let i = 0; i <= 8; i++) out.push({ x: i * 10 + 2, z: -7 })
    return out
  }, [])

  return (
    <group>
      {/* ── Sky ───────────────────────────────────────────────── */}
      <Sky />
      <Sun />

      {/* ── Clouds ────────────────────────────────────────────── */}
      {clouds.map((c, i) => <Cloud key={i} {...c} />)}

      {/* ── Ground — bright green grass ───────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[600, 600, 4, 4]} />
        <meshLambertMaterial color="#5CB85C" />
      </mesh>

      {/* ── Inner track infield — lighter green ──────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, -0.01, -45]}>
        <planeGeometry args={[140, 100]} />
        <meshLambertMaterial color="#6DC46D" />
      </mesh>

      {/* ── Run-off zone strip around main straight — white/pale ─ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[40, -0.005, 0]}>
        <planeGeometry args={[110, 34]} />
        <meshLambertMaterial color="#D8E8D8" />
      </mesh>

      {/* ── Lighting ──────────────────────────────────────────── */}
      <ambientLight intensity={0.45} color="#D0E8FF" />
      {/* Main sun — warm directional */}
      <directionalLight
        position={[120, 200, -200]}
        intensity={2.2}
        color="#FFF4D0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={500}
        shadow-camera-left={-180}
        shadow-camera-right={180}
        shadow-camera-top={180}
        shadow-camera-bottom={-180}
      />
      {/* Cool sky fill from opposite side */}
      <directionalLight position={[-80, 60, 100]} intensity={0.5} color="#A8C8FF" />
      {/* Subtle bounce light from ground */}
      <directionalLight position={[0, -20, 0]} intensity={0.18} color="#C8E8C0" />

      {/* ── Fog — light atmospheric haze ──────────────────────── */}
      <fog attach="fog" args={['#C0DCF2', 150, 480]} />

      {/* ── Mountains ─────────────────────────────────────────── */}
      <Mountain x={-220} z={-200} h={55} w={45} />
      <Mountain x={-180} z={-260} h={40} w={38} />
      <Mountain x={-260} z={-150} h={65} w={50} />
      <Mountain x={200}  z={-220} h={50} w={42} />
      <Mountain x={250}  z={-160} h={38} w={35} />
      <Mountain x={180}  z={-280} h={60} w={48} />
      <Mountain x={-200} z={120}  h={45} w={40} />
      <Mountain x={220}  z={100}  h={42} w={36} />

      {/* ── Trees ─────────────────────────────────────────────── */}
      {trees.map((t, i) => <Tree key={i} {...t} />)}

      {/* ── Buildings ─────────────────────────────────────────── */}
      {buildings.map((b, i) => <Building key={i} {...b} />)}

      {/* ── Street lamps ──────────────────────────────────────── */}
      {lamps.map((l, i) => <Lamp key={i} {...l} />)}

      {/* ── Grandstands at start/finish ────────────────────────── */}
      <Grandstand x={10} z={10} rot={0} />
      <Grandstand x={30} z={10} rot={0} />
      <Grandstand x={50} z={10} rot={0} />

      {/* ── Pit-lane wall decoration ──────────────────────────── */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[i * 8 + 2, 0.5, 9]} castShadow>
          <boxGeometry args={[0.5, 1, 0.5]} />
          <meshLambertMaterial color={i % 2 === 0 ? '#FF3333' : '#FFFFFF'} />
        </mesh>
      ))}
    </group>
  )
}
