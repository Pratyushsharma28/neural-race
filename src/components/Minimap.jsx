import { useEffect, useMemo, useRef } from 'react';

const SIZE = 172;
const PADDING = 14;

export function Minimap({ snapshot, track, size = SIZE }) {
  const canvasRef = useRef(null);

  const layout = useMemo(() => {
    const { minX, maxX, minZ, maxZ } = track.bounds;
    const width = maxX - minX;
    const height = maxZ - minZ;
    const scale = Math.min((size - PADDING * 2) / width, (size - PADDING * 2) / height);
    const offsetX = (size - width * scale) / 2;
    const offsetZ = (size - height * scale) / 2;

    const project = (x, z) => [
      offsetX + (x - minX) * scale,
      offsetZ + (z - minZ) * scale,
    ];

    const centre = [];
    for (let i = 0; i < track.samples; i += 3) {
      const point = track.centers[i];
      centre.push(project(point.x, point.z));
    }

    const zone = [];
    const { startIndex, length } = track.splitZone;
    for (let k = 0; k <= length; k += 2) {
      const point = track.centers[(startIndex + k) % track.samples];
      zone.push(project(point.x, point.z));
    }

    const finish = project(track.centers[0].x, track.centers[0].z);

    return { project, centre, zone, finish, scale };
  }, [track, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;

    if (canvas.width !== size * ratio) {
      canvas.width = size * ratio;
      canvas.height = size * ratio;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size, size);

    const stroke = (points, width, color, close = true) => {
      if (points.length < 2) return;
      context.beginPath();
      context.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) context.lineTo(points[i][0], points[i][1]);
      if (close) context.closePath();
      context.lineWidth = width;
      context.strokeStyle = color;
      context.stroke();
    };

    stroke(layout.centre, 8, 'rgba(8,12,22,0.95)');
    stroke(layout.centre, 5.5, 'rgba(120,150,200,0.28)');
    stroke(layout.centre, 1, 'rgba(0,229,255,0.5)');
    stroke(layout.zone, 3, 'rgba(255,46,136,0.85)', false);

    context.beginPath();
    context.arc(layout.finish[0], layout.finish[1], 2.6, 0, Math.PI * 2);
    context.fillStyle = '#ffb020';
    context.fill();

    for (const car of snapshot.cars) {
      const [x, y] = layout.project(car.x, car.z);
      context.beginPath();
      context.arc(x, y, car.isPlayer ? 5.4 : 4, 0, Math.PI * 2);
      context.fillStyle = car.color;
      context.fill();
      if (car.isPlayer) {
        context.lineWidth = 1.6;
        context.strokeStyle = 'rgba(255,255,255,0.9)';
        context.stroke();
      }
    }
  }, [snapshot, layout, size]);

  return (
    <div className="minimap" aria-hidden="true">
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
    </div>
  );
}

export default Minimap;
