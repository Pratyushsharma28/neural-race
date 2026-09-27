import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCarState, resetCarState } from './CarPhysics.js';
import { CHECKPOINT_COUNT, TOTAL_LAPS } from './Track.jsx';

export const CAR_DEFINITIONS = [
  {
    id: 0,
    name: 'YOU',
    isPlayer: true,
    color: '#00e5ff',
    accent: '#ff2e88',
  },
  {
    id: 1,
    name: 'VYPER-9',
    isPlayer: false,
    color: '#ff2e88',
    accent: '#00e5ff',
    ai: {
      skill: 0.94,
      aggression: 0.72,
      route: 'risk',
      lateralBias: -2.4,
      tuning: { enginePower: 72, maxSpeed: 66.5, turnRate: 2.42, gripLateral: 12 },
    },
  },
  {
    id: 2,
    name: 'NOVA-X',
    isPlayer: false,
    color: '#8dff4a',
    accent: '#ffb020',
    ai: {
      skill: 0.87,
      aggression: 0.4,
      route: 'safe',
      lateralBias: 2.7,
      tuning: { enginePower: 69, maxSpeed: 64, turnRate: 2.4, gripLateral: 12.4 },
    },
  },
];

export function createTelemetry() {
  return {
    samples: 0,
    totalTime: 0,
    speedSum: 0,
    maxSpeed: 0,
    driftTime: 0,
    driftAngleSum: 0,
    handbrakeTime: 0,
    offTrackTime: 0,
    wallHits: 0,
    deviationSum: 0,
    deviationSamples: 0,
    cornerTime: 0,
    cornerSpeedSum: 0,
    steeringReversals: 0,
    lastSteerSign: 0,
    riskCommits: 0,
    safeCommits: 0,
    zoneRoute: null,
    nearMisses: 0,
    nearMissCooldown: 0,
    closestApproach: Infinity,
    proximityTime: 0,
    overtakes: 0,
    leadTime: 0,
    lastPosition: null,
  };
}

function createRaceEntry() {
  return {
    gates: 0,
    lap: 1,
    passedInLap: 0,
    progress: 0,
    position: 1,
    u: 0,
    finished: false,
    finishTime: null,
    lapStart: 0,
    lastLapTime: null,
    bestLapTime: null,
    lapTimes: [],
    gap: 0,
  };
}

export function createRaceField(track) {
  return CAR_DEFINITIONS.map((definition, index) => {
    const slot = track.grid[index] || track.grid[0];
    return {
      ...definition,
      state: createCarState({
        position: slot.position,
        heading: slot.heading,
        tuning: definition.ai ? definition.ai.tuning : undefined,
      }),
      race: createRaceEntry(),
      telemetry: definition.isPlayer ? createTelemetry() : null,
      ai: definition.ai
        ? {
            config: definition.ai,
            wander: index * 13.7,
            cooldown: 0,
            stuck: 0,
            side: index % 2 === 0 ? 1 : -1,
          }
        : null,
      group: null,
    };
  });
}

export function resetRaceField(field, track) {
  field.forEach((car, index) => {
    const slot = track.grid[index] || track.grid[0];
    resetCarState(car.state, slot.position, slot.heading);
    Object.assign(car.race, createRaceEntry());
    if (car.telemetry) Object.assign(car.telemetry, createTelemetry());
    if (car.ai) {
      car.ai.cooldown = 0;
      car.ai.stuck = 0;
    }
  });
}

export function createRaceClock() {
  return { startTime: null, elapsed: 0, running: false, finished: false, flash: null, flashId: 0 };
}

/** Ordered checkpoint progress. `gates` counts every gate crossed since the start. */
function updateProgress(car, elapsed) {
  const race = car.race;
  if (race.finished) return false;

  const segFloat = car.state.trackU * CHECKPOINT_COUNT;
  let segment = Math.floor(segFloat) % CHECKPOINT_COUNT;
  if (segment < 0) segment += CHECKPOINT_COUNT;

  let completedLap = false;
  if (segment === race.gates % CHECKPOINT_COUNT) {
    race.gates += 1;
    if (race.gates % CHECKPOINT_COUNT === 0) {
      const lapTime = elapsed - race.lapStart;
      race.lapStart = elapsed;
      race.lapTimes.push(lapTime);
      race.lastLapTime = lapTime;
      if (race.bestLapTime === null || lapTime < race.bestLapTime) race.bestLapTime = lapTime;
      if (race.gates >= CHECKPOINT_COUNT * TOTAL_LAPS) {
        race.finished = true;
        race.finishTime = elapsed;
      }
      completedLap = true;
    }
  }

  race.lap = THREE.MathUtils.clamp(Math.floor(race.gates / CHECKPOINT_COUNT) + 1, 1, TOTAL_LAPS);
  race.passedInLap = race.gates % CHECKPOINT_COUNT;

  const lastSegment = ((race.gates - 1) % CHECKPOINT_COUNT + CHECKPOINT_COUNT) % CHECKPOINT_COUNT;
  let frac = segFloat - lastSegment;
  if (frac < -CHECKPOINT_COUNT / 2) frac += CHECKPOINT_COUNT;
  else if (frac > CHECKPOINT_COUNT / 2) frac -= CHECKPOINT_COUNT;
  race.progress = race.gates + THREE.MathUtils.clamp(frac, -0.5, 1.5);
  race.u = car.state.trackU;

  return completedLap;
}

function rankField(field, gateLength) {
  const order = field.slice().sort((a, b) => {
    if (a.race.finished && b.race.finished) return a.race.finishTime - b.race.finishTime;
    if (a.race.finished) return -1;
    if (b.race.finished) return 1;
    return b.race.progress - a.race.progress;
  });

  const leader = order[0];
  order.forEach((car, index) => {
    car.race.position = index + 1;
    if (index === 0) {
      car.race.gap = 0;
      return;
    }
    if (car.race.finished && leader.race.finished) {
      car.race.gap = car.race.finishTime - leader.race.finishTime;
    } else {
      const metres = (leader.race.progress - car.race.progress) * gateLength;
      car.race.gap = metres / Math.max(18, car.state.speed);
    }
  });
  return order;
}

export function buildResult(field, clock, track) {
  const gateLength = track.totalLength / CHECKPOINT_COUNT;
  const order = rankField(field, gateLength);

  const classification = order.map((car, index) => ({
    id: car.id,
    name: car.name,
    isPlayer: car.isPlayer,
    color: car.color,
    position: index + 1,
    finished: car.race.finished,
    time: car.race.finishTime,
    gap: car.race.gap,
    lapsCompleted: Math.min(TOTAL_LAPS, Math.floor(car.race.gates / CHECKPOINT_COUNT)),
    bestLap: car.race.bestLapTime,
  }));

  const player = field.find((car) => car.isPlayer);
  return {
    finishTime: player.race.finishTime ?? clock.elapsed,
    position: player.race.position,
    lapTimes: player.race.lapTimes.slice(),
    bestLap: player.race.bestLapTime,
    classification,
    telemetry: player.telemetry,
    totalLaps: TOTAL_LAPS,
    trackLength: track.totalLength,
    gateLength,
  };
}

export function formatTime(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '--:--.--';
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  const hundredths = Math.floor((clamped * 100) % 100);
  const pad = (value) => String(value).padStart(2, '0');
  return `${mins}:${pad(secs)}.${pad(hundredths)}`;
}

export function ordinal(position) {
  const suffixes = ['TH', 'ST', 'ND', 'RD'];
  const value = position % 100;
  return position + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}

/**
 * Runs after the car components in the frame loop, so it reads positions that
 * were integrated this frame. Owns lap/checkpoint state, ranking, race timing
 * and the throttled snapshot the HTML HUD and minimap render from.
 */
export function RaceDirector({ field, track, phaseRef, clockRef, onPublish, onFinish, publishRate = 16 }) {
  const gateLength = useMemo(() => track.totalLength / CHECKPOINT_COUNT, [track]);
  const player = useMemo(() => field.find((car) => car.isPlayer), [field]);
  const accumulator = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const clock = clockRef.current;
    const telemetry = player.telemetry;
    const racing = phaseRef.current === 'racing';

    if (racing && clock.startTime === null) {
      clock.startTime = performance.now() / 1000;
      clock.running = true;
    }
    if (clock.running && !clock.finished) {
      clock.elapsed = performance.now() / 1000 - clock.startTime;
    }

    if (racing && !clock.finished) {
      for (const car of field) {
        const completedLap = updateProgress(car, clock.elapsed);
        if (!completedLap || !car.isPlayer) continue;
        clock.flashId += 1;
        const lapsLeft = TOTAL_LAPS - Math.floor(car.race.gates / CHECKPOINT_COUNT);
        clock.flash = car.race.finished
          ? { id: clock.flashId, text: 'FINISH' }
          : lapsLeft === 1
            ? { id: clock.flashId, text: 'FINAL LAP' }
            : { id: clock.flashId, text: `LAP ${car.race.lap}` };
      }

      recordTelemetry(player, field, telemetry, delta, clock.elapsed);
      rankField(field, gateLength);
      if (player.race.position === 1) telemetry.leadTime += delta;
    }

    if (player.race.finished && !clock.finished) {
      clock.finished = true;
      clock.running = false;
      onFinish(buildResult(field, clock, track));
    }

    accumulator.current += delta;
    if (accumulator.current >= 1 / publishRate) {
      accumulator.current = 0;
      onPublish(buildSnapshot(field, clock, telemetry, player));
    }
  });

  return null;
}

function recordTelemetry(player, field, telemetry, delta, elapsed) {
  const state = player.state;

  telemetry.samples += 1;
  telemetry.totalTime += delta;
  telemetry.speedSum += state.speed;
  telemetry.maxSpeed = Math.max(telemetry.maxSpeed, state.speed);

  if (state.drift > 0.12) {
    const weight = delta * Math.min(1, state.drift);
    telemetry.driftTime += weight;
    telemetry.driftAngleSum += state.slipAngle * weight;
  }

  if (!state.onTrack) telemetry.offTrackTime += delta;
  if (state.onTrack) {
    telemetry.deviationSum += Math.abs(state.lateral);
    telemetry.deviationSamples += 1;
  }

  // Time-weighted so that dividing by cornerTime yields a true average corner speed.
  const cornering = Math.abs(state.curvature) > 0.012;
  if (cornering) {
    telemetry.cornerTime += delta;
    telemetry.cornerSpeedSum += state.speed * delta;
  }

  if (state.inSplitZone) {
    const route = state.riskLane ? 'RISK' : 'SAFE';
    if (telemetry.zoneRoute !== route) {
      telemetry.zoneRoute = route;
      if (route === 'RISK') telemetry.riskCommits += 1;
      else telemetry.safeCommits += 1;
    }
  } else {
    telemetry.zoneRoute = null;
  }

  telemetry.nearMissCooldown = Math.max(0, telemetry.nearMissCooldown - delta);
  for (const other of field) {
    if (other === player) continue;
    const distance = state.position.distanceTo(other.state.position);
    telemetry.closestApproach = Math.min(telemetry.closestApproach, distance);
    if (distance < 14) telemetry.proximityTime += delta * 0.5;
    if (distance < 5.2 && telemetry.nearMissCooldown <= 0 && elapsed > 3) {
      telemetry.nearMisses += 1;
      telemetry.nearMissCooldown = 1.4;
    }
  }

  const position = player.race.position;
  if (telemetry.lastPosition !== null && position < telemetry.lastPosition && elapsed > 4) {
    telemetry.overtakes += 1;
  }
  telemetry.lastPosition = position;
}

export function recordPlayerInput(telemetry, input, delta, result) {
  const sign = Math.sign(input.steer);
  if (sign !== 0 && telemetry.lastSteerSign !== 0 && sign !== telemetry.lastSteerSign) {
    telemetry.steeringReversals += 1;
  }
  if (sign !== 0) telemetry.lastSteerSign = sign;

  if (input.handbrake) telemetry.handbrakeTime += delta;
  if (result.wallHit) telemetry.wallHits += 1;
}

function buildSnapshot(field, clock, telemetry, player) {
  const state = player.state;

  return {
    elapsed: clock.elapsed,
    running: clock.running,
    finished: clock.finished,
    flash: clock.flash,
    cars: field.map((car) => ({
      id: car.id,
      name: car.name,
      isPlayer: car.isPlayer,
      color: car.color,
      x: car.state.position.x,
      z: car.state.position.z,
      heading: car.state.heading,
      position: car.race.position,
      lap: car.race.lap,
      finished: car.race.finished,
      time: car.race.finishTime,
    })),
    player: {
      speedKmh: state.speed * 3.6,
      maxSpeedKmh: state.tuning.maxSpeed * 3.6,
      lap: player.race.lap,
      totalLaps: TOTAL_LAPS,
      position: player.race.position,
      fieldSize: field.length,
      passedInLap: player.race.passedInLap,
      checkpoints: CHECKPOINT_COUNT,
      lastLapTime: player.race.lastLapTime,
      bestLapTime: player.race.bestLapTime,
      gap: player.race.gap,
      route: state.inSplitZone ? (state.riskLane ? 'RISK' : 'SAFE') : null,
      offTrack: !state.onTrack,
      drift: state.drift,
      gear: gearFor(state),
      rpm: rpmFor(state),
      wallHits: telemetry.wallHits,
    },
  };
}

function gearFor(state) {
  if (state.forwardSpeed < -0.6) return 'R';
  if (state.speed < 0.8) return 'N';
  const ratio = state.speed / state.tuning.maxSpeed;
  return String(Math.min(6, Math.max(1, Math.floor(ratio * 6) + 1)));
}

function rpmFor(state) {
  const ratio = state.speed / state.tuning.maxSpeed;
  const gearSpan = 1 / 6;
  const withinGear = (ratio % gearSpan) / gearSpan;
  const base = state.speed < 0.8 ? 0.18 : 0.32 + withinGear * 0.62;
  return THREE.MathUtils.clamp(base + (state.drift * 0.1), 0.12, 1);
}

export function useRaceField(track) {
  return useMemo(() => createRaceField(track), [track]);
}
