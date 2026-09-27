import * as THREE from 'three';

export const TOTAL_LAPS = 3;
export const CHECKPOINT_COUNT = 20;
export const TRACK_HALF_WIDTH = 7.6;
export const SHOULDER_WIDTH = 3.6;
export const BARRIER_HEIGHT = 1.45;
export const SAMPLES = 900;
export const SPLIT_EXTRA_WIDTH = 9.5;
export const RISK_GRIP = 0.74;

/**
 * The circuit is generated as a star-shaped loop: a radius is defined at every
 * 20 degrees around the origin, which guarantees the centreline can never cross
 * itself no matter how the radii are tuned.
 */
const RADII = [
  1.1, 1.13, 0.97, 1.02, 1.16, 1.06, 0.72, 0.63, 0.77, 0.96, 1.11, 1.14, 1.01,
  0.83, 0.91, 1.03, 1.1, 1.09,
];
const RADIUS_X = 186;
const RADIUS_Z = 146;

class GeometryBuilder {
  constructor() {
    this.positions = [];
    this.uvs = [];
    this.indices = [];
  }

  get count() {
    return this.positions.length / 3;
  }

  vertex(x, y, z, u, v) {
    this.positions.push(x, y, z);
    this.uvs.push(u, v);
    return this.count - 1;
  }

  quad(a, b, c, d) {
    this.indices.push(a, b, c, a, c, d);
  }

  toGeometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setIndex(this.indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
}

function buildTrack() {
  const controlPoints = RADII.map((radius, i) => {
    const theta = (i / RADII.length) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(theta) * RADIUS_X * radius, 0, Math.sin(theta) * RADIUS_Z * radius);
  });

  const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.5);
  curve.arcLengthDivisions = SAMPLES * 2;

  const centers = [];
  const tangents = [];
  const rights = [];
  const halfWidthNeg = new Float32Array(SAMPLES);
  const halfWidthPos = new Float32Array(SAMPLES);
  const cumulative = new Float32Array(SAMPLES);
  const curvature = new Float32Array(SAMPLES);

  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < SAMPLES; i++) {
    const u = i / SAMPLES;
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    centers.push(point);
    tangents.push(tangent);
    rights.push(right);
    halfWidthNeg[i] = TRACK_HALF_WIDTH;
    halfWidthPos[i] = TRACK_HALF_WIDTH;
    if (i > 0) cumulative[i] = cumulative[i - 1] + centers[i - 1].distanceTo(point);
  }
  const totalLength = cumulative[SAMPLES - 1] + centers[SAMPLES - 1].distanceTo(centers[0]);

  for (let i = 0; i < SAMPLES; i++) {
    const next = tangents[(i + 1) % SAMPLES];
    const current = tangents[i];
    const ds = centers[i].distanceTo(centers[(i + 1) % SAMPLES]) || 1;
    curvature[i] = (current.z * next.x - current.x * next.z) / ds;
  }

  // Curvature is noisy sample-to-sample; average it over ~30m before using it
  // for the racing line or for picking the corner that hosts the route split.
  const smoothCurvature = new Float32Array(SAMPLES);
  const SMOOTH_RADIUS = 16;
  for (let i = 0; i < SAMPLES; i++) {
    let sum = 0;
    for (let k = -SMOOTH_RADIUS; k <= SMOOTH_RADIUS; k++) {
      sum += curvature[((i + k) % SAMPLES + SAMPLES) % SAMPLES];
    }
    smoothCurvature[i] = sum / (SMOOTH_RADIUS * 2 + 1);
  }

  // --- safe / risk split zone: the tightest sustained corner of the lap ------
  let apexIndex = 0;
  let apexStrength = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const u = i / SAMPLES;
    if (u < 0.12 || u > 0.88) continue;
    const strength = Math.abs(smoothCurvature[i]);
    if (strength > apexStrength) {
      apexStrength = strength;
      apexIndex = i;
    }
  }

  const zoneHalf = Math.round(SAMPLES * 0.055);
  const splitZone = {
    centerIndex: apexIndex,
    startIndex: (apexIndex - zoneHalf + SAMPLES) % SAMPLES,
    endIndex: (apexIndex + zoneHalf) % SAMPLES,
    length: zoneHalf * 2,
    // Positive curvature is a left turn, whose inside sits towards -right.
    sideSign: smoothCurvature[apexIndex] >= 0 ? -1 : 1,
  };

  for (let k = 0; k < splitZone.length; k++) {
    const index = (splitZone.startIndex + k) % SAMPLES;
    const t = k / (splitZone.length - 1);
    const ramp = Math.sin(Math.PI * t);
    const extra = SPLIT_EXTRA_WIDTH * ramp;
    if (splitZone.sideSign < 0) halfWidthNeg[index] = TRACK_HALF_WIDTH + extra;
    else halfWidthPos[index] = TRACK_HALF_WIDTH + extra;
  }

  // --- racing line: bias towards the apex of each corner --------------------
  const racingOffset = new Float32Array(SAMPLES);
  const racingLine = [];
  for (let i = 0; i < SAMPLES; i++) {
    const limitNeg = -(halfWidthNeg[i] - 2.1);
    const limitPos = halfWidthPos[i] - 2.1;
    const offset = THREE.MathUtils.clamp(-smoothCurvature[i] * 165, limitNeg, limitPos);
    racingOffset[i] = offset;
    racingLine.push(centers[i].clone().addScaledVector(rights[i], offset));
  }

  // --- checkpoints ----------------------------------------------------------
  const checkpoints = [];
  for (let i = 0; i < CHECKPOINT_COUNT; i++) {
    const u = i / CHECKPOINT_COUNT;
    const index = Math.round(u * SAMPLES) % SAMPLES;
    checkpoints.push({
      id: i,
      u,
      index,
      position: centers[index].clone(),
      tangent: tangents[index].clone(),
      right: rights[index].clone(),
      halfWidthNeg: halfWidthNeg[index],
      halfWidthPos: halfWidthPos[index],
    });
  }

  // --- start grid -----------------------------------------------------------
  const headingAt = (index) => Math.atan2(tangents[index].x, tangents[index].z);
  const slotAt = (backIndex, lateral) => {
    const index = ((backIndex % SAMPLES) + SAMPLES) % SAMPLES;
    return {
      position: centers[index].clone().addScaledVector(rights[index], lateral),
      heading: headingAt(index),
    };
  };
  const grid = [slotAt(-16, 3.1), slotAt(-30, -3.1), slotAt(-44, 3.1)];
  const startIndex = 0;

  // --- bounds for the minimap ----------------------------------------------
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const center of centers) {
    minX = Math.min(minX, center.x);
    maxX = Math.max(maxX, center.x);
    minZ = Math.min(minZ, center.z);
    maxZ = Math.max(maxZ, center.z);
  }
  const padding = 26;
  const bounds = {
    minX: minX - padding,
    maxX: maxX + padding,
    minZ: minZ - padding,
    maxZ: maxZ + padding,
  };

  const isInSplitZone = (index) => {
    const delta = (index - splitZone.startIndex + SAMPLES) % SAMPLES;
    return delta < splitZone.length;
  };

  const sampleTrack = (position, hint = -1) => {
    let bestIndex = -1;
    let bestDistance = Infinity;

    const scan = (from, to) => {
      for (let i = from; i < to; i++) {
        const index = ((i % SAMPLES) + SAMPLES) % SAMPLES;
        const center = centers[index];
        const dx = position.x - center.x;
        const dz = position.z - center.z;
        const distance = dx * dx + dz * dz;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      }
    };

    if (hint >= 0) scan(hint - 28, hint + 29);
    if (bestIndex < 0 || bestDistance > 2500) {
      bestIndex = -1;
      bestDistance = Infinity;
      for (let i = 0; i < SAMPLES; i += 3) {
        const center = centers[i];
        const dx = position.x - center.x;
        const dz = position.z - center.z;
        const distance = dx * dx + dz * dz;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      scan(bestIndex - 4, bestIndex + 5);
    }

    const center = centers[bestIndex];
    const right = rights[bestIndex];
    const dx = position.x - center.x;
    const dz = position.z - center.z;
    const lateral = dx * right.x + dz * right.z;
    const limit = lateral > 0 ? halfWidthPos[bestIndex] : -halfWidthNeg[bestIndex];
    const onTrack = Math.abs(lateral) <= Math.abs(limit);

    let grip = 1;
    let inSplit = false;
    let riskLane = false;
    let riskBoost = 0;
    if (isInSplitZone(bestIndex)) {
      inSplit = true;
      const delta = (bestIndex - splitZone.startIndex + SAMPLES) % SAMPLES;
      const ramp = Math.sin(Math.PI * (delta / (splitZone.length - 1)));
      const inner = Math.sign(lateral) === splitZone.sideSign;
      riskLane = inner && Math.abs(lateral) > TRACK_HALF_WIDTH - 0.5;
      if (riskLane) {
        // The tight inner lane trades grip for a shorter path plus a boost pad,
        // so committing to it is faster only if the car is actually pointed.
        grip = 1 - (1 - RISK_GRIP) * ramp;
        riskBoost = ramp;
      }
    } else if (!onTrack) {
      const over = Math.abs(lateral) - Math.abs(limit);
      grip = 1 - 0.42 * smoothstep(0, SHOULDER_WIDTH, over);
    }

    return {
      index: bestIndex,
      u: bestIndex / SAMPLES,
      lateral,
      halfWidthNeg: halfWidthNeg[bestIndex],
      halfWidthPos: halfWidthPos[bestIndex],
      onTrack,
      grip,
      center,
      tangent: tangents[bestIndex],
      right,
      distance: Math.sqrt(bestDistance),
      inSplitZone: inSplit,
      riskLane,
      riskBoost,
      curvature: smoothCurvature[bestIndex],
    };
  };

  const routeAt = (position, hint = -1) => {
    const surface = sampleTrack(position, hint);
    if (!surface.inSplitZone) return { route: null, surface };
    return { route: surface.riskLane ? 'RISK' : 'SAFE', surface };
  };

  return {
    curve,
    samples: SAMPLES,
    centers,
    tangents,
    rights,
    halfWidthNeg,
    halfWidthPos,
    cumulative,
    totalLength,
    curvature: smoothCurvature,
    racingLine,
    racingOffset,
    checkpoints,
    splitZone,
    grid,
    startIndex,
    bounds,
    isInSplitZone,
    sampleTrack,
    routeAt,
  };
}

export const TRACK = buildTrack();

// ------------------------------------------------------------------ textures

function makeSurfaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#14161e';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 5200; i++) {
    const shade = Math.random();
    ctx.fillStyle = `rgba(${shade > 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, 0, 256, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(126, 26, 4, 96);
  ctx.fillRect(126, 158, 4, 66);

  ctx.fillStyle = 'rgba(0,229,255,0.34)';
  ctx.fillRect(7, 0, 3, 256);
  ctx.fillRect(246, 0, 3, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeRiskTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(255,46,136,0.16)';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,46,136,0.55)';
  ctx.lineWidth = 7;
  for (let i = -128; i < 256; i += 42) {
    ctx.beginPath();
    ctx.moveTo(i, 128);
    ctx.lineTo(i + 128, 0);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeFinishTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const cells = 16;
  const width = 128 / cells;
  for (let x = 0; x < cells; x++) {
    for (let y = 0; y < 4; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#f2f6ff' : '#0d1018';
      ctx.fillRect(x * width, y * 8, width, 8);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ------------------------------------------------------------------ geometry

const REPEAT_LENGTH = 11;

function ribbonGeometry(
  track,
  {
    y = 0,
    offset = 0,
    wNeg = 0,
    wPos = 0,
    uFrom = 0,
    uTo = 1,
    vScale = 1 / REPEAT_LENGTH,
    vMode = 'length',
  }
) {
  const builder = new GeometryBuilder();
  const from = Math.floor(uFrom * track.samples);
  const to = Math.ceil(uTo * track.samples);
  const span = Math.max(1, to - from);
  let previousLeft = -1;
  let previousRight = -1;

  for (let i = from; i <= to; i++) {
    const index = ((i % track.samples) + track.samples) % track.samples;
    const center = track.centers[index];
    const right = track.rights[index];
    const shift = typeof offset === 'function' ? offset(index) : offset;
    const neg = typeof wNeg === 'function' ? wNeg(index) : wNeg;
    const pos = typeof wPos === 'function' ? wPos(index) : wPos;
    const v =
      vMode === 'unit'
        ? (i - from) / span
        : (i / track.samples) * track.totalLength * vScale;

    const anchorX = center.x + right.x * shift;
    const anchorZ = center.z + right.z * shift;
    const left = builder.vertex(anchorX - right.x * neg, y, anchorZ - right.z * neg, 0, v);
    const rightVertex = builder.vertex(anchorX + right.x * pos, y, anchorZ + right.z * pos, 1, v);

    if (previousLeft >= 0) builder.quad(previousLeft, previousRight, rightVertex, left);
    previousLeft = left;
    previousRight = rightVertex;
  }

  return builder.toGeometry();
}

function wallGeometry(track, sideSign, { yBase = 0.05, yTop = BARRIER_HEIGHT, offset = SHOULDER_WIDTH }) {
  const builder = new GeometryBuilder();
  let previousBottom = -1;
  let previousTop = -1;

  for (let i = 0; i <= track.samples; i++) {
    const index = i % track.samples;
    const center = track.centers[index];
    const right = track.rights[index];
    const half = sideSign > 0 ? track.halfWidthPos[index] : track.halfWidthNeg[index];
    const distance = (half + offset) * sideSign;
    const x = center.x + right.x * distance;
    const z = center.z + right.z * distance;
    const along = (i / track.samples) * track.totalLength * 0.5;

    const bottom = builder.vertex(x, yBase, z, 0, along);
    const top = builder.vertex(x, yTop, z, 1, along);
    if (previousBottom >= 0) builder.quad(previousBottom, previousTop, top, bottom);
    previousBottom = bottom;
    previousTop = top;
  }

  return builder.toGeometry();
}

const TRACK_ASSETS = buildTrackAssets();

export function buildTrackAssets() {
  const sideSign = TRACK.splitZone.sideSign;
  const zoneStart = TRACK.splitZone.startIndex / TRACK.samples;
  const zoneEnd = (TRACK.splitZone.startIndex + TRACK.splitZone.length) / TRACK.samples;

  const riskHalfWidth = (index) => {
    const outer = sideSign > 0 ? TRACK.halfWidthPos[index] : TRACK.halfWidthNeg[index];
    return Math.max(0.02, (outer - TRACK_HALF_WIDTH) / 2);
  };
  const riskAnchor = (index) => {
    const outer = sideSign > 0 ? TRACK.halfWidthPos[index] : TRACK.halfWidthNeg[index];
    return sideSign * ((TRACK_HALF_WIDTH + outer) / 2);
  };

  return {
    surface: ribbonGeometry(TRACK, {
      y: 0,
      wNeg: (i) => TRACK.halfWidthNeg[i],
      wPos: (i) => TRACK.halfWidthPos[i],
    }),
    shoulderNeg: ribbonGeometry(TRACK, {
      y: -0.03,
      offset: (i) => -TRACK.halfWidthNeg[i] - SHOULDER_WIDTH / 2,
      wNeg: () => SHOULDER_WIDTH / 2,
      wPos: () => SHOULDER_WIDTH / 2,
      vScale: 1 / 6,
    }),
    shoulderPos: ribbonGeometry(TRACK, {
      y: -0.03,
      offset: (i) => TRACK.halfWidthPos[i] + SHOULDER_WIDTH / 2,
      wNeg: () => SHOULDER_WIDTH / 2,
      wPos: () => SHOULDER_WIDTH / 2,
      vScale: 1 / 6,
    }),
    glowNeg: ribbonGeometry(TRACK, {
      y: 0.035,
      offset: (i) => -TRACK.halfWidthNeg[i] + 0.35,
      wNeg: () => 0.35,
      wPos: () => 0.35,
    }),
    glowPos: ribbonGeometry(TRACK, {
      y: 0.035,
      offset: (i) => TRACK.halfWidthPos[i] - 0.35,
      wNeg: () => 0.35,
      wPos: () => 0.35,
    }),
    riskLane: ribbonGeometry(TRACK, {
      y: 0.05,
      offset: riskAnchor,
      wNeg: riskHalfWidth,
      wPos: riskHalfWidth,
      uFrom: zoneStart,
      uTo: zoneEnd,
      vScale: 1 / 9,
    }),
    divider: ribbonGeometry(TRACK, {
      y: 0.06,
      offset: () => sideSign * TRACK_HALF_WIDTH,
      wNeg: () => 0.24,
      wPos: () => 0.24,
      uFrom: zoneStart,
      uTo: zoneEnd,
    }),
    finishLine: ribbonGeometry(TRACK, {
      y: 0.07,
      wNeg: () => TRACK.halfWidthNeg[0],
      wPos: () => TRACK.halfWidthPos[0],
      uFrom: -0.002,
      uTo: 0.002,
      vMode: 'unit',
    }),
    wallNeg: wallGeometry(TRACK, -1, {}),
    wallPos: wallGeometry(TRACK, 1, {}),
    capNeg: ribbonGeometry(TRACK, {
      y: BARRIER_HEIGHT,
      offset: (i) => -TRACK.halfWidthNeg[i] - SHOULDER_WIDTH / 2,
      wNeg: () => SHOULDER_WIDTH / 2,
      wPos: () => SHOULDER_WIDTH / 2,
    }),
    capPos: ribbonGeometry(TRACK, {
      y: BARRIER_HEIGHT,
      offset: (i) => TRACK.halfWidthPos[i] + SHOULDER_WIDTH / 2,
      wNeg: () => SHOULDER_WIDTH / 2,
      wPos: () => SHOULDER_WIDTH / 2,
    }),
    textures: {
      surface: makeSurfaceTexture(),
      risk: makeRiskTexture(),
      finish: makeFinishTexture(),
    },
  };
}

export function Track() {
  const assets = TRACK_ASSETS;
  const gantry = TRACK.centers[0];
  const gantryHeading = Math.atan2(TRACK.tangents[0].x, TRACK.tangents[0].z);
  const spanLeft = TRACK.halfWidthNeg[0] + SHOULDER_WIDTH + 1.2;
  const spanRight = TRACK.halfWidthPos[0] + SHOULDER_WIDTH + 1.2;

  return (
    <group>
      <mesh geometry={assets.surface} receiveShadow>
        <meshStandardMaterial
          map={assets.textures.surface}
          roughness={0.88}
          metalness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh geometry={assets.shoulderNeg}>
        <meshStandardMaterial color="#1d1420" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={assets.shoulderPos}>
        <meshStandardMaterial color="#1d1420" roughness={1} side={THREE.DoubleSide} />
      </mesh>

      <mesh geometry={assets.glowNeg}>
        <meshBasicMaterial color="#00e5ff" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={assets.glowPos}>
        <meshBasicMaterial color="#00e5ff" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      <mesh geometry={assets.riskLane}>
        <meshBasicMaterial
          map={assets.textures.risk}
          transparent
          opacity={0.5}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={assets.divider}>
        <meshBasicMaterial color="#ff2e88" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      <mesh geometry={assets.finishLine}>
        <meshBasicMaterial map={assets.textures.finish} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      <mesh geometry={assets.wallNeg}>
        <meshStandardMaterial color="#0e1220" roughness={0.6} metalness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={assets.wallPos}>
        <meshStandardMaterial color="#0e1220" roughness={0.6} metalness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={assets.capNeg}>
        <meshBasicMaterial color="#ff2e88" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={assets.capPos}>
        <meshBasicMaterial color="#00e5ff" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* start / finish gantry */}
      <group position={[gantry.x, 0, gantry.z]} rotation={[0, gantryHeading, 0]}>
        <mesh position={[-spanLeft, 3.6, 0]}>
          <boxGeometry args={[0.7, 7.2, 0.7]} />
          <meshStandardMaterial color="#141a2c" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[spanRight, 3.6, 0]}>
          <boxGeometry args={[0.7, 7.2, 0.7]} />
          <meshStandardMaterial color="#141a2c" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[(spanRight - spanLeft) / 2, 7.1, 0]}>
          <boxGeometry args={[spanLeft + spanRight, 1.5, 0.9]} />
          <meshStandardMaterial color="#0b0f1c" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[(spanRight - spanLeft) / 2, 6.3, 0.5]}>
          <boxGeometry args={[spanLeft + spanRight - 1.4, 0.16, 0.1]} />
          <meshBasicMaterial color="#00e5ff" toneMapped={false} />
        </mesh>
        <mesh position={[-spanLeft, 7.95, 0]}>
          <sphereGeometry args={[0.34, 12, 12]} />
          <meshBasicMaterial color="#ff2e88" toneMapped={false} />
        </mesh>
        <mesh position={[spanRight, 7.95, 0]}>
          <sphereGeometry args={[0.34, 12, 12]} />
          <meshBasicMaterial color="#ff2e88" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export default Track;

