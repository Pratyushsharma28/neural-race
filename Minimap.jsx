import { useRef, useEffect } from 'react'
import { TRACK_WAYPOINTS } from './Track.jsx'

const MAP_SIZE = 150
const PADDING = 14

function getScale() {
  const xs = TRACK_WAYPOINTS.map(p => p[0])
  const zs = TRACK_WAYPOINTS.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minZ = Math.min(...zs), maxZ = Math.max(...zs)
  const rangeX = maxX - minX || 1
  const rangeZ = maxZ - minZ || 1
  const scale = (MAP_SIZE - PADDING * 2) / Math.max(rangeX, rangeZ)
  return { scale, minX, minZ, rangeX, rangeZ }
}

const { scale, minX, minZ } = getScale()

function worldToMap(x, z) {
  return [
    PADDING + (x - minX) * scale,
    PADDING + (z - minZ) * scale,
  ]
}

export default function Minimap({ carStateRef, ai1StateRef, ai2StateRef }) {
  const canvasRef = useRef()
  const rafRef = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE)

      // Background
      ctx.fillStyle = 'rgba(30,50,70,0.75)'
      ctx.beginPath()
      ctx.roundRect(0, 0, MAP_SIZE, MAP_SIZE, 8)
      ctx.fill()

      // Track outline
      ctx.beginPath()
      const first = worldToMap(TRACK_WAYPOINTS[0][0], TRACK_WAYPOINTS[0][1])
      ctx.moveTo(first[0], first[1])
      for (let i = 1; i < TRACK_WAYPOINTS.length; i++) {
        const [mx, mz] = worldToMap(TRACK_WAYPOINTS[i][0], TRACK_WAYPOINTS[i][1])
        ctx.lineTo(mx, mz)
      }
      ctx.closePath()
      ctx.strokeStyle = '#C8CDD4'
      ctx.lineWidth = 6
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Start line marker
      const [sx, sz] = worldToMap(0, 0)
      ctx.fillStyle = '#00CED1'
      ctx.fillRect(sx - 3, sz - 1, 6, 2)

      // AI dots
      const drawDot = (state, color) => {
        if (!state?.current) return
        const [mx, mz] = worldToMap(state.current.x || 0, state.current.z || 0)
        ctx.beginPath()
        ctx.arc(mx, mz, 4, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }
      drawDot(ai1StateRef, '#87CEEB')
      drawDot(ai2StateRef, '#B0C4DE')

      // Player dot (draw last = on top)
      if (carStateRef?.current) {
        const [px, pz] = worldToMap(carStateRef.current.x || 0, carStateRef.current.z || 0)
        ctx.beginPath()
        ctx.arc(px, pz, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#00CED1'
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 1.5
        ctx.fill()
        ctx.stroke()
      }

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '9px Segoe UI, sans-serif'
      ctx.fillText('MAP', 5, 12)

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [carStateRef, ai1StateRef, ai2StateRef])

  return (
    <canvas
      ref={canvasRef}
      width={MAP_SIZE}
      height={MAP_SIZE}
      style={{
        position: 'absolute',
        bottom: 20,
        right: 16,
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.2)',
        pointerEvents: 'none',
      }}
    />
  )
}
