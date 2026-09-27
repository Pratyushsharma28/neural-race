import { useRef, useCallback } from 'react'
import { TRACK_WAYPOINTS, CHECKPOINT_INDICES } from './Track.jsx'

const TOTAL_LAPS = 3
const CHECKPOINT_RADIUS = 12  // units

/**
 * useRaceManager() returns:
 *   raceRef – mutable race state (read in useFrame without re-renders)
 *   updateRace(playerPos, ai1Pos, ai2Pos, delta) → { finished, raceData }
 *   resetRace()
 */
export function useRaceManager() {
  const raceRef = useRef(createRaceState())

  const resetRace = useCallback(() => {
    raceRef.current = createRaceState()
  }, [])

  const updateRace = useCallback((playerPos, ai1Pos, ai2Pos, delta, active) => {
    if (!active) return { finished: false }
    const race = raceRef.current
    if (race.finished) return { finished: true, raceData: race }

    race.elapsed += delta

    // --- update checkpoint progress for all cars ---
    updateCarProgress(race.player, playerPos)
    updateCarProgress(race.ai1, ai1Pos)
    updateCarProgress(race.ai2, ai2Pos)

    // --- compute positions (rank order) ---
    const cars = [
      { id: 'player', prog: progress(race.player) },
      { id: 'ai1',    prog: progress(race.ai1) },
      { id: 'ai2',    prog: progress(race.ai2) },
    ].sort((a, b) => b.prog - a.prog)

    race.playerPosition = cars.findIndex(c => c.id === 'player') + 1

    // --- check finish ---
    if (race.player.lap > TOTAL_LAPS && !race.finished) {
      race.finished = true
      race.finishTime = race.elapsed
      // Record AI finish times (approximate)
      if (!race.ai1FinishTime) race.ai1FinishTime = race.elapsed * (1 + (race.ai1.lap <= TOTAL_LAPS ? 0.05 : 0))
      if (!race.ai2FinishTime) race.ai2FinishTime = race.elapsed * (1 + (race.ai2.lap <= TOTAL_LAPS ? 0.02 : 0))
    }

    return {
      finished: race.finished,
      raceData: race,
    }
  }, [])

  return { raceRef, updateRace, resetRace }
}

function createRaceState() {
  return {
    elapsed: 0,
    finished: false,
    finishTime: 0,
    ai1FinishTime: 0,
    ai2FinishTime: 0,
    playerPosition: 1,
    player: createCarProgress(),
    ai1: createCarProgress(),
    ai2: createCarProgress(),
  }
}

function createCarProgress() {
  return {
    lap: 1,
    nextCheckpoint: 0,   // index into CHECKPOINT_INDICES
    checkpointsPassed: 0,
    lapStartTime: 0,
  }
}

/** Total virtual progress (higher = further ahead) */
function progress(cp) {
  return (cp.lap - 1) * CHECKPOINT_INDICES.length + cp.checkpointsPassed
}

function updateCarProgress(cp, pos) {
  if (cp.lap > TOTAL_LAPS) return
  const cpIdx = CHECKPOINT_INDICES[cp.nextCheckpoint]
  if (cpIdx === undefined) {
    // Completed all checkpoints in lap
    cp.lap++
    cp.checkpointsPassed = 0
    cp.nextCheckpoint = 0
    return
  }

  const [wx, wz] = TRACK_WAYPOINTS[cpIdx]
  const dx = pos.x - wx
  const dz = pos.z - wz
  const dist = Math.sqrt(dx * dx + dz * dz)

  if (dist < CHECKPOINT_RADIUS) {
    cp.checkpointsPassed++
    cp.nextCheckpoint++
    if (cp.nextCheckpoint >= CHECKPOINT_INDICES.length) {
      cp.lap++
      cp.checkpointsPassed = 0
      cp.nextCheckpoint = 0
    }
  }
}

export { TOTAL_LAPS, CHECKPOINT_INDICES }
