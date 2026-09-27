const clamp01 = (value) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
const safeRatio = (numerator, denominator) =>
  denominator > 0 && Number.isFinite(numerator) ? numerator / denominator : 0;

/** Reference values for this circuit, used to normalise raw telemetry into 0-100.
 *  They describe a near-perfect lap, so a strong drive lands in the high 80s. */
const PAR = {
  averageSpeedKmh: 152,
  topSpeedKmh: 215,
  cornerSpeed: 32,
  centrelineDeviation: 6,
  driftRatio: 0.14,
  driftSlip: 0.5,
  handbrakeRatio: 0.06,
  proximityRatio: 0.35,
  nearMissesPerMinute: 8,
  overtakes: 3,
  closestApproach: 2.5,
  steeringReversalsPerMinute: 140,
  lapTimeVariance: 0.12,
  wallHitsPerMinute: 6,
};

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

function band(score, low, high) {
  if (score >= high) return 2;
  if (score >= low) return 1;
  return 0;
}

const COPY = {
  speed: [
    'Cautious throttle. You left time on the table through the sweeps.',
    'Solid pace. You carried good speed but backed off in the tight sections.',
    'Flat out. You squeezed every metre out of the straights and the fast corners.',
  ],
  risk: [
    'Clean and calculated. You kept the car out of trouble all race.',
    'Selective bravery. You took the risk lane and the tight lines when it paid.',
    'Zero margin. Barriers, dirt and traffic were all part of the plan.',
  ],
  precision: [
    'Loose lines. You leaned on the run-off areas more than the apexes.',
    'Mostly tidy, with a few wide moments that cost you the racing line.',
    'Surgical. You tracked the apex within a car width for almost the whole race.',
  ],
  drift: [
    'Grip runner. You kept all four wheels pointing where you were going.',
    'Controlled slides on exit. You used rotation to point the car early.',
    'Sideways by choice. You held long, steep slip angles without losing the line.',
  ],
  aggression: [
    'Patient. You let the race come to you and avoided the traffic.',
    'Assertive in the right moments. You dived when a gap actually opened.',
    'Relentless. You hunted the gaps, forced the issue and never lifted.',
  ],
  consistency: [
    'Erratic. Lap times swung widely and the car was rarely settled.',
    'Improving. Early laps were messy but your rhythm settled down.',
    'Metronome. Lap after lap within a few tenths, no matter the traffic.',
  ],
};

export function computeDriverDNA(telemetry, context = {}) {
  const t = telemetry || {};
  const totalTime = Math.max(0.001, t.totalTime || context.finishTime || 0);
  const minutes = totalTime / 60;

  const averageSpeed = safeRatio(t.speedSum, t.samples) || 0;
  const averageSpeedKmh = averageSpeed * 3.6;
  const topSpeedKmh = (t.maxSpeed || 0) * 3.6;
  const averageCornerSpeed = safeRatio(t.cornerSpeedSum, t.cornerTime);
  const offTrackRatio = safeRatio(t.offTrackTime, totalTime);
  const averageDeviation = safeRatio(t.deviationSum, t.deviationSamples);
  const driftRatio = safeRatio(t.driftTime, totalTime);
  const averageSlip = safeRatio(t.driftAngleSum, t.driftTime);
  const handbrakeRatio = safeRatio(t.handbrakeTime, totalTime);
  const proximityRatio = safeRatio(t.proximityTime, totalTime);
  const nearMissRate = safeRatio(t.nearMisses, minutes);
  const wallRate = safeRatio(t.wallHits, minutes);
  const reversalRate = safeRatio(t.steeringReversals, minutes);
  const lapTimes = (Array.isArray(context.lapTimes) ? context.lapTimes : []).filter(
    (value) => Number.isFinite(value) && value > 0
  );
  const lapVariance = lapTimes.length > 1 ? standardDeviation(lapTimes) / Math.max(0.001, mean(lapTimes)) : 0;
  const riskShare = safeRatio(t.riskCommits, (t.riskCommits || 0) + (t.safeCommits || 0));
  const closest = Number.isFinite(t.closestApproach) ? t.closestApproach : PAR.closestApproach * 4;
  const leadRatio = safeRatio(t.leadTime, totalTime);

  const scores = {};

  scores.speed =
    0.45 * clamp01(averageSpeedKmh / PAR.averageSpeedKmh) +
    0.2 * clamp01(topSpeedKmh / PAR.topSpeedKmh) +
    0.35 * clamp01(averageCornerSpeed / PAR.cornerSpeed);

  scores.risk =
    0.26 * clamp01(riskShare) +
    0.22 * clamp01(nearMissRate / PAR.nearMissesPerMinute) +
    0.2 * clamp01(offTrackRatio / 0.06) +
    0.17 * clamp01(wallRate / PAR.wallHitsPerMinute) +
    0.15 * clamp01((averageCornerSpeed / PAR.cornerSpeed - 0.6) / 0.4);

  scores.precision = clamp01(
    1 -
      0.42 * clamp01(averageDeviation / PAR.centrelineDeviation) -
      0.34 * clamp01(offTrackRatio / 0.08) -
      0.24 * clamp01(wallRate / PAR.wallHitsPerMinute)
  );

  scores.drift =
    0.5 * clamp01(driftRatio / PAR.driftRatio) +
    0.32 * clamp01(averageSlip / PAR.driftSlip) +
    0.18 * clamp01(handbrakeRatio / PAR.handbrakeRatio);

  scores.aggression =
    0.28 * clamp01(proximityRatio / PAR.proximityRatio) +
    0.24 * clamp01(nearMissRate / PAR.nearMissesPerMinute) +
    0.2 * clamp01((t.overtakes || 0) / PAR.overtakes) +
    0.16 * clamp01((PAR.closestApproach * 4 - closest) / (PAR.closestApproach * 3)) +
    0.12 * clamp01(leadRatio / 0.5);

  scores.consistency = clamp01(
    1 -
      0.46 * clamp01(lapVariance / PAR.lapTimeVariance) -
      0.3 * clamp01(reversalRate / PAR.steeringReversalsPerMinute) -
      0.24 * clamp01(offTrackRatio / 0.08)
  );

  const axes = [
    { key: 'speed', label: 'Speed' },
    { key: 'risk', label: 'Risk' },
    { key: 'precision', label: 'Precision' },
    { key: 'drift', label: 'Drift' },
    { key: 'aggression', label: 'Aggression' },
    { key: 'consistency', label: 'Consistency' },
  ].map((axis) => {
    const score = Math.round(clamp01(scores[axis.key]) * 100);
    return {
      ...axis,
      score,
      blurb: COPY[axis.key][band(score, 34, 67)],
    };
  });

  return {
    axes,
    archetype: archetypeFor(axes),
    stats: {
      averageSpeedKmh,
      topSpeedKmh,
      averageCornerSpeed: averageCornerSpeed * 3.6,
      driftRatio,
      averageSlipDegrees: (averageSlip * 180) / Math.PI,
      offTrackRatio,
      offTrackSeconds: t.offTrackTime || 0,
      averageDeviation,
      wallHits: t.wallHits || 0,
      nearMisses: t.nearMisses || 0,
      overtakes: t.overtakes || 0,
      closestApproach: Number.isFinite(t.closestApproach) ? t.closestApproach : null,
      riskCommits: t.riskCommits || 0,
      safeCommits: t.safeCommits || 0,
      lapTimes,
      lapVariance,
      leadTime: t.leadTime || 0,
      handbrakeSeconds: t.handbrakeTime || 0,
    },
  };
}

const ARCHETYPES = [
  { keys: ['speed', 'precision'], name: 'APEX SURGEON', tag: 'Fast, clean, almost never off line.' },
  { keys: ['drift', 'aggression'], name: 'SLIPSTREAM BRAWLER', tag: 'Sideways, close, and always hunting.' },
  { keys: ['risk', 'aggression'], name: 'CHAOS ENGINE', tag: 'Wins on the edge or not at all.' },
  { keys: ['consistency', 'precision'], name: 'METRONOME', tag: 'Same lap, again and again, no drama.' },
  { keys: ['speed', 'drift'], name: 'POWERLINE', tag: 'Huge corner speed, carried through slides.' },
  { keys: ['risk', 'drift'], name: 'LIMIT BREAKER', tag: 'Lives past the grip ceiling.' },
  { keys: ['consistency', 'speed'], name: 'CLOCKWORK', tag: 'Relentless lap times at real pace.' },
];

function archetypeFor(axes) {
  const ranked = axes.slice().sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 2).map((axis) => axis.key);
  const match =
    ARCHETYPES.find((archetype) => archetype.keys.every((key) => top.includes(key))) ||
    ARCHETYPES[ARCHETYPES.length - 1];
  return {
    name: match.name,
    tag: match.tag,
    dominant: ranked[0] ? ranked[0].label : 'Speed',
    weakest: ranked[ranked.length - 1] ? ranked[ranked.length - 1].label : 'Consistency',
  };
}

export default computeDriverDNA;
