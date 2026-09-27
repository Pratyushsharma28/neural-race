import { useState } from 'react'

const HOW_TO_PLAY = `
CONTROLS
  W / ↑  ·  Accelerate
  S / ↓  ·  Brake / Reverse
  A / ←  ·  Steer Left
  D / →  ·  Steer Right
  SPACE  ·  Handbrake (drift)

RACE RULES
  · 3 laps around the circuit
  · Pass through all checkpoint gates in order
  · Beat 2 AI opponents to take P1
  · At the fork: take the RISK lane for a shortcut
    (tighter, faster) or SAFE for the wider line

DRIVER DNA
  After the race, your driving style is analysed
  across 6 dimensions: Speed · Risk · Precision ·
  Drift · Aggression · Consistency
`

export default function MainMenu({ onStart }) {
  const [showHow, setShowHow] = useState(false)

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(160deg, #E8F4F8 0%, #C8DCF0 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      userSelect: 'none',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          fontSize: 56, fontWeight: 900, letterSpacing: 8,
          color: '#1A2A3A', textShadow: '0 2px 0 #00CED1',
        }}>
          NEURAL
        </div>
        <div style={{
          fontSize: 56, fontWeight: 900, letterSpacing: 8,
          color: '#00CED1', marginTop: -16,
        }}>
          //RACE
        </div>
        <div style={{ fontSize: 14, letterSpacing: 3, color: '#666', marginTop: 8 }}>
          FUTURISTIC CIRCUIT RACING
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        <button
          onClick={onStart}
          style={{
            width: 220, padding: '14px 0',
            background: '#00CED1', color: '#fff',
            border: 'none', borderRadius: 8,
            fontSize: 18, fontWeight: 700, letterSpacing: 3,
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,206,209,0.4)',
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          START RACE
        </button>

        <button
          onClick={() => setShowHow(h => !h)}
          style={{
            width: 220, padding: '12px 0',
            background: 'rgba(255,255,255,0.5)',
            color: '#1A2A3A', border: '1.5px solid rgba(0,206,209,0.5)',
            borderRadius: 8, fontSize: 14, fontWeight: 600, letterSpacing: 2,
            cursor: 'pointer',
          }}
        >
          {showHow ? 'CLOSE' : 'HOW TO PLAY'}
        </button>
      </div>

      {/* How to play panel */}
      {showHow && (
        <div style={{
          marginTop: 28,
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,206,209,0.3)',
          borderRadius: 12, padding: '20px 32px',
          maxWidth: 360, textAlign: 'left',
          fontSize: 13, lineHeight: 2, color: '#2A3A4A',
          whiteSpace: 'pre-line',
        }}>
          {HOW_TO_PLAY}
        </div>
      )}

      {/* Decorative car silhouette (simple boxes) */}
      <div style={{ position: 'absolute', bottom: 32, opacity: 0.12, pointerEvents: 'none' }}>
        <div style={{ width: 120, height: 30, background: '#00CED1', borderRadius: 6 }} />
      </div>
    </div>
  )
}
