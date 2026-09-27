import { useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import Track from './Track.jsx'
import PlayerCar from './PlayerCar.jsx'
import AIOpponent from './AIOpponent.jsx'
import CameraController from './CameraController.jsx'
import Environment from './Environment.jsx'
import HUD from './HUD.jsx'
import Minimap from './Minimap.jsx'
import { useCarControls } from './CarControls.js'
import { useRaceManager, TOTAL_LAPS } from './RaceManager.jsx'
import { useFrame } from '@react-three/fiber'

/**
 * RaceLoop – runs inside Canvas, calls updateRace each frame.
 */
function RaceLoop({ active, carStateRef, ai1StateRef, ai2StateRef, raceRef, updateRace, onFinished, dnaRef }) {
  useFrame((_, delta) => {
    if (!active) return
    const playerPos = carStateRef.current || { x: 0, z: 0 }
    const ai1Pos = ai1StateRef.current || { x: 0, z: 0 }
    const ai2Pos = ai2StateRef.current || { x: 0, z: 0 }

    const { finished, raceData } = updateRace(playerPos, ai1Pos, ai2Pos, delta, active)

    if (finished && raceData) {
      const dna = dnaRef.current?.calculate(raceData.finishTime, TOTAL_LAPS)
      onFinished({
        finishTime: raceData.finishTime,
        playerPosition: raceData.playerPosition,
        dna,
      })
    }
  })
  return null
}

export default function Game({ active, onFinished }) {
  const controlsRef = useCarControls()
  const carStateRef = useRef(null)
  const ai1StateRef = useRef(null)
  const ai2StateRef = useRef(null)
  const dnaRef = useRef(null)

  const { raceRef, updateRace, resetRace } = useRaceManager()

  // Prevent multiple finish callbacks
  const finishedRef = useRef(false)
  const handleFinished = useCallback((results) => {
    if (finishedRef.current) return
    finishedRef.current = true
    onFinished(results)
  }, [onFinished])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 600, position: [0, 6, 14] }}
        shadows="soft"
        style={{ background: '#87CEEB' }}
        gl={{ antialias: true, toneMapping: 3, toneMappingExposure: 1.1 }}
      >
        <color attach="background" args={['#87CEEB']} />

        <Environment />
        <Track />

        <PlayerCar
          controlsRef={controlsRef}
          active={active}
          carStateRef={carStateRef}
          dnaRef={dnaRef}
        />

        <AIOpponent
          speedFactor={0.85}
          color="skyblue"
          accentColor="#C0C8D0"
          carStateRef={ai1StateRef}
          startOffset={3}
        />

        <AIOpponent
          speedFactor={0.95}
          color="#A8C8E0"
          accentColor="#9090A0"
          carStateRef={ai2StateRef}
          startOffset={6}
        />

        <CameraController carStateRef={carStateRef} />

        <RaceLoop
          active={active}
          carStateRef={carStateRef}
          ai1StateRef={ai1StateRef}
          ai2StateRef={ai2StateRef}
          raceRef={raceRef}
          updateRace={updateRace}
          onFinished={handleFinished}
          dnaRef={dnaRef}
        />
      </Canvas>

      {/* HTML overlay */}
      <HUD raceRef={raceRef} carStateRef={carStateRef} />
      <Minimap
        carStateRef={carStateRef}
        ai1StateRef={ai1StateRef}
        ai2StateRef={ai2StateRef}
      />
    </div>
  )
}
