import { useLayoutEffect, useMemo, useRef } from 'react';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { TRACK, SHOULDER_WIDTH } from './Track.jsx';

function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CENTERS = TRACK.centers;
const FLATTEN_NEAR = TRACK.halfWidthPos[0] + SHOULDER_WIDTH + 14;
const FLATTEN_FAR = FLATTEN_NEAR + 120;

function distanceToTrack(x, z) {
  let best = Infinity;
  for (let i = 0; i < CENTERS.length; i += 3) {
    const dx = x - CENTERS[i].x;
    const dz = z - CENTERS[i].z;
    const distance = dx * dx + dz * dz;
    if (distance < best) best = distance;
  }
  return Math.sqrt(best);
}

function terrainHeight(x, z) {
  return (
    Math.sin(x * 0.0058) * Math.cos(z * 0.0071) * 17 +
    Math.sin(x * 0.0185 + 1.7) * Math.cos(z * 0.0155 - 0.4) * 5.6 +
    Math.sin(x * 0.047) * Math.cos(z * 0.041) * 1.3
  );
}

function flattenWeight(distance) {
  const t = THREE.MathUtils.clamp((distance - FLATTEN_NEAR) / (FLATTEN_FAR - FLATTEN_NEAR), 0, 1);
  return t * t * (3 - 2 * t);
}

function groundY(x, z) {
  return terrainHeight(x, z) * flattenWeight(distanceToTrack(x, z)) - 0.55;
}

function Instanced({ transforms, children, frustumCulled = false }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || transforms.length === 0) return;
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < transforms.length; i++) {
      const item = transforms[i];
      matrix.compose(item.position, item.quaternion, item.scale);
      mesh.setMatrixAt(i, matrix);
      if (item.color) mesh.setColorAt(i, item.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [transforms]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, transforms.length]} frustumCulled={frustumCulled}>
      {children}
    </instancedMesh>
  );
}

function makeWindowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const random = mulberry32(99);

  ctx.fillStyle = '#080b14';
  ctx.fillRect(0, 0, 64, 128);

  for (let row = 0; row < 16; row++) {
    for (let column = 0; column < 6; column++) {
      if (random() < 0.42) continue;
      const warm = random() < 0.3;
      ctx.fillStyle = warm ? 'rgba(255,176,32,0.85)' : 'rgba(0,229,255,0.7)';
      ctx.fillRect(column * 10 + 3, row * 8 + 2, 6, 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function Terrain() {
  const geometry = useMemo(() => {
    const size = 2400;
    const segments = 118;
    const plane = new THREE.PlaneGeometry(size, size, segments, segments);
    plane.rotateX(-Math.PI / 2);

    const position = plane.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const low = new THREE.Color('#101a22');
    const high = new THREE.Color('#2b3550');
    const tint = new THREE.Color();

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const y = groundY(x, z);
      position.setY(i, y);
      tint.copy(low).lerp(high, THREE.MathUtils.clamp((y + 6) / 30, 0, 1));
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }

    plane.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    plane.computeVertexNormals();
    return plane;
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}

function Scenery() {
  const { trees, trunks, buildings, lamps, lampHeads } = useMemo(() => {
    const random = mulberry32(20260927);
    const treeTransforms = [];
    const trunkTransforms = [];
    const buildingTransforms = [];
    const lampTransforms = [];
    const lampHeadTransforms = [];

    const identity = new THREE.Quaternion();
    const spin = new THREE.Quaternion();
    const color = new THREE.Color();

    // --- trees -------------------------------------------------------------
    let attempts = 0;
    while (treeTransforms.length < 240 && attempts < 4000) {
      attempts++;
      const x = (random() - 0.5) * 1500;
      const z = (random() - 0.5) * 1300;
      const distance = distanceToTrack(x, z);
      if (distance < FLATTEN_NEAR + 16 || distance > 620) continue;

      const scale = 4 + random() * 7;
      const y = groundY(x, z);
      spin.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI * 2);
      color.setHSL(0.42 + random() * 0.1, 0.32, 0.14 + random() * 0.1);

      treeTransforms.push({
        position: new THREE.Vector3(x, y + scale * 0.85, z),
        quaternion: spin.clone(),
        scale: new THREE.Vector3(scale * 0.62, scale * 1.7, scale * 0.62),
        color: color.clone(),
      });
      trunkTransforms.push({
        position: new THREE.Vector3(x, y + scale * 0.3, z),
        quaternion: identity.clone(),
        scale: new THREE.Vector3(scale * 0.16, scale * 0.6, scale * 0.16),
      });
    }

    // --- skyline buildings --------------------------------------------------
    attempts = 0;
    while (buildingTransforms.length < 78 && attempts < 3000) {
      attempts++;
      const angle = random() * Math.PI * 2;
      const radius = 330 + random() * 480;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * 0.82;
      if (distanceToTrack(x, z) < 300) continue;

      const width = 16 + random() * 30;
      const depth = 16 + random() * 30;
      const height = 26 + random() * 130;
      spin.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * 0.5 - 0.25);
      buildingTransforms.push({
        position: new THREE.Vector3(x, groundY(x, z) + height / 2 - 2, z),
        quaternion: spin.clone(),
        scale: new THREE.Vector3(width, height, depth),
      });
    }

    // --- track lamps --------------------------------------------------------
    const lampStep = 34;
    for (let i = 0; i < TRACK.samples; i += lampStep) {
      for (const side of [-1, 1]) {
        const center = TRACK.centers[i];
        const right = TRACK.rights[i];
        const half = side > 0 ? TRACK.halfWidthPos[i] : TRACK.halfWidthNeg[i];
        const reach = half + SHOULDER_WIDTH + 2.6;
        const x = center.x + right.x * reach * side;
        const z = center.z + right.z * reach * side;

        lampTransforms.push({
          position: new THREE.Vector3(x, 4.1, z),
          quaternion: identity.clone(),
          scale: new THREE.Vector3(0.28, 8.2, 0.28),
        });
        lampHeadTransforms.push({
          position: new THREE.Vector3(x - right.x * side * 1.5, 8.1, z - right.z * side * 1.5),
          quaternion: spin.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(right.x, right.z)).clone(),
          scale: new THREE.Vector3(3.1, 0.24, 0.5),
          color: new THREE.Color(side > 0 ? '#00e5ff' : '#ff2e88'),
        });
      }
    }

    return {
      trees: treeTransforms,
      trunks: trunkTransforms,
      buildings: buildingTransforms,
      lamps: lampTransforms,
      lampHeads: lampHeadTransforms,
    };
  }, []);

  const windowTexture = useMemo(makeWindowTexture, []);

  return (
    <group>
      <Instanced transforms={trunks}>
        <cylinderGeometry args={[1, 1.3, 1, 6]} />
        <meshStandardMaterial color="#1b1712" roughness={1} />
      </Instanced>
      <Instanced transforms={trees}>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial roughness={0.95} />
      </Instanced>

      <Instanced transforms={buildings}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#161c2c"
          map={windowTexture}
          emissiveMap={windowTexture}
          emissive="#ffffff"
          emissiveIntensity={1.15}
          roughness={0.72}
          metalness={0.25}
        />
      </Instanced>

      <Instanced transforms={lamps}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#20263a" metalness={0.8} roughness={0.35} />
      </Instanced>
      <Instanced transforms={lampHeads}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </Instanced>
    </group>
  );
}

function Grandstands() {
  const stands = useMemo(() => {
    const placements = [852, 872, 24, 44].map((index) => {
      const i = ((index % TRACK.samples) + TRACK.samples) % TRACK.samples;
      const center = TRACK.centers[i];
      const right = TRACK.rights[i];
      const side = index < 400 ? 1 : -1;
      const reach = (side > 0 ? TRACK.halfWidthPos[i] : TRACK.halfWidthNeg[i]) + SHOULDER_WIDTH + 20;
      return {
        position: [center.x + right.x * reach * side, 0, center.z + right.z * reach * side],
        rotationY: Math.atan2(TRACK.tangents[i].x, TRACK.tangents[i].z),
        side,
      };
    });
    return placements;
  }, []);

  return (
    <group>
      {stands.map((stand, index) => (
        <group key={index} position={stand.position} rotation={[0, stand.rotationY, 0]}>
          {[0, 1, 2, 3].map((step) => (
            <group key={step}>
              <mesh position={[0, 1.1 + step * 1.15, -step * 1.9]}>
                <boxGeometry args={[34, 2.2, 1.9]} />
                <meshStandardMaterial color={step % 2 === 0 ? '#1b2233' : '#232c42'} roughness={0.85} />
              </mesh>
              <mesh position={[0, 2.35 + step * 1.15, -step * 1.9]}>
                <boxGeometry args={[33, 0.22, 1.5]} />
                <meshBasicMaterial color={index % 2 === 0 ? '#00e5ff' : '#ff2e88'} toneMapped={false} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 8.6, -7.4]}>
            <boxGeometry args={[36, 1.1, 0.5]} />
            <meshStandardMaterial color="#0d1120" metalness={0.6} roughness={0.4} />
          </mesh>
          {[-17, -5.7, 5.7, 17].map((x) => (
            <mesh key={x} position={[x, 5.4, -7.2]}>
              <boxGeometry args={[0.5, 6.4, 0.5]} />
              <meshStandardMaterial color="#141a2c" metalness={0.7} roughness={0.35} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Environment() {
  return (
    <group>
      <fog attach="fog" args={['#070a16', 190, 1150]} />
      <color attach="background" args={['#070a16']} />

      <Sky
        distance={4200}
        sunPosition={[-160, 12, -240]}
        turbidity={12}
        rayleigh={3.4}
        mieCoefficient={0.012}
        mieDirectionalG={0.86}
      />
      <Stars radius={420} depth={70} count={2600} factor={5} saturation={0} fade speed={0.6} />

      <hemisphereLight args={['#3d5a8c', '#0a0d16', 0.85]} />
      <ambientLight intensity={0.32} color="#8fb4ff" />
      <directionalLight position={[-160, 120, -240]} intensity={0.85} color="#ffb27a" />
      <directionalLight position={[120, 90, 180]} intensity={0.4} color="#5fd8ff" />

      <Terrain />
      <Scenery />
      <Grandstands />
    </group>
  );
}

export default Environment;
