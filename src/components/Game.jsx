import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { TRACK, Track } from './Track.jsx';
import { Environment } from './Environment.jsx';
import { CheckpointGates } from './Checkpoint.jsx';
import { PlayerCar } from './PlayerCar.jsx';
import { AIOpponent } from './AIOpponent.jsx';
import { CameraController } from './CameraController.jsx';
import { RaceDirector, createRaceClock, useRaceField } from './RaceManager.jsx';
import { CarControls } from './CarControls.js';
import { HUD } from './HUD.jsx';
import { Minimap } from './Minimap.jsx';

export function Game({ phase, onFinish }) {
  const track = TRACK;
  const field = useRaceField(track);
  const controls = useMemo(() => new CarControls(), []);
  const phaseRef = useRef(phase);
  const clockRef = useRef(null);
  if (clockRef.current === null) clockRef.current = createRaceClock();

  const [snapshot, setSnapshot] = useState(null);

  const player = useMemo(() => field.find((car) => car.isPlayer), [field]);
  const opponents = useMemo(() => field.filter((car) => !car.isPlayer), [field]);

  useEffect(() => {
    phaseRef.current = phase;
    controls.enabled = phase === 'racing';
  }, [phase, controls]);

  useEffect(() => () => controls.detach(), [controls]);

  const handlePublish = useCallback((next) => setSnapshot(next), []);
  const handleFinish = useCallback((result) => onFinish(result), [onFinish]);

  const startSlot = track.grid[0];

  return (
    <>
      <div className="app__canvas">
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{
            fov: 62,
            near: 0.4,
            far: 2800,
            position: [
              startSlot.position.x - Math.sin(startSlot.heading) * 11,
              4.2,
              startSlot.position.z - Math.cos(startSlot.heading) * 11,
            ],
          }}
        >
          <Environment />
          <Track />
          <CheckpointGates track={track} playerCar={player} />
          <PlayerCar car={player} track={track} controls={controls} phaseRef={phaseRef} />
          {opponents.map((car) => (
            <AIOpponent
              key={car.id}
              car={car}
              track={track}
              field={field}
              phaseRef={phaseRef}
              clockRef={clockRef}
            />
          ))}
          <CameraController car={player} />
          <RaceDirector
            field={field}
            track={track}
            phaseRef={phaseRef}
            clockRef={clockRef}
            onPublish={handlePublish}
            onFinish={handleFinish}
          />
        </Canvas>
      </div>

      {phase === 'racing' && snapshot ? (
        <>
          <HUD snapshot={snapshot} />
          <Minimap snapshot={snapshot} track={track} />
        </>
      ) : null}
    </>
  );
}

export default Game;
