import { useRef, useEffect, useState } from 'react'

const HUD_STYLE = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  userSelect: 'none',
  fontFamily: "'Segoe UI', Tahoma, sans-serif",
}

const PANEL = {
  background: 'rgba(255,255,255,0.15)',
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: 10,
  padding: '10px 16px',
  color: '#1A2A3A',
}

function pad2(n) { return String(Math.floor(n)).padStart(2, '0') }
function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${pad2(m)}:${String(sec.toFixed(2)).padStart(5, '0')}`
}

export default function HUD({ raceRef, carStateRef }) {
  const [display, setDisplay] = useState({
    speed: 0, lap: 1, time: '00:00.00', pos: 1, onRisk: false
  })
  const rafRef = useRef()

  useEffect(() => {
    const tick = () => {
      const race = raceRef?.current
      const car = carStateRef?.current
      if (race && car) {
        setDisplay({
          speed: Math.round(Math.abs(car.speed || 0) * 3.6), // convert to km/h
          lap: Math.min(race.player?.lap || 1, 3),
          time: formatTime(race.elapsed || 0),
          pos: race.playerPosition || 1,
          onRisk: car.onRisk || false,
        })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [raceRef, carStateRef])

  const speedDisplay = display.speed

  return (
    <div style={HUD_STYLE}>
      {/* Logo */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        ...PANEL, textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 4, color: '#00CED1' }}>
          NEURAL//RACE
        </div>
      </div>

      {/* Top-left: Speed */}
      <div style={{ position: 'absolute', top: 16, left: 16, ...PANEL }}>
        <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 2 }}>SPEED</div>
        <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1, color: '#00CED1' }}>
          {speedDisplay}
        </div>
        <div style={{ fontSize: 10, opacity: 0.5 }}>km/h</div>
      </div>

      {/* Top-right: Position */}
      <div style={{ position: 'absolute', top: 16, right: 16, ...PANEL, textAlign: 'right' }}>
        <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 2 }}>POS</div>
        <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1, color: '#1A2A3A' }}>
          {display.pos}<span style={{ fontSize: 14 }}>/3</span>
        </div>
      </div>

      {/* Bottom-left: Lap + Time */}
      <div style={{ position: 'absolute', bottom: 20, left: 16, ...PANEL }}>
        <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 2 }}>LAP</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1A2A3A', lineHeight: 1.1 }}>
          {display.lap}<span style={{ fontSize: 13, opacity: 0.6 }}>/3</span>
        </div>
        <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6, letterSpacing: 2 }}>TIME</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#1A2A3A', fontVariantNumeric: 'tabular-nums' }}>
          {display.time}
        </div>
      </div>

      {/* Route indicator */}
      <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', ...PANEL, textAlign: 'center' }}>
        <div style={{ fontSize: 10, opacity: 0.6, letterSpacing: 2, marginBottom: 4 }}>ROUTE</div>
        <div style={{
          fontSize: 13, fontWeight: 700, letterSpacing: 2,
          color: display.onRisk ? '#FF6B6B' : '#00CED1',
        }}>
          {display.onRisk ? '⚠ RISK' : '✓ SAFE'}
        </div>
      </div>

      {/* Controls hint */}
      <div style={{ position: 'absolute', bottom: 20, right: 16, ...PANEL, fontSize: 10, opacity: 0.5, lineHeight: 1.7 }}>
        <div>W/↑  Accelerate</div>
        <div>S/↓  Brake</div>
        <div>A/D  Steer</div>
        <div>SPACE  Handbrake</div>
      </div>
    </div>
  )
}
