import { useState, useEffect } from 'react'

const COUNTS = ['3', '2', '1', 'GO!']
const DURATION = 900  // ms per count

export default function Countdown({ onDone }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step >= COUNTS.length) {
      onDone()
      return
    }
    const t = setTimeout(() => setStep(s => s + 1), DURATION)
    return () => clearTimeout(t)
  }, [step, onDone])

  const current = COUNTS[Math.min(step, COUNTS.length - 1)]
  const isGo = current === 'GO!'

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 100,
    }}>
      <div
        key={step}
        style={{
          fontSize: isGo ? 96 : 120,
          fontWeight: 900,
          fontFamily: "'Segoe UI', Tahoma, sans-serif",
          color: isGo ? '#00CED1' : '#1A2A3A',
          textShadow: isGo
            ? '0 0 40px rgba(0,206,209,0.7), 0 4px 0 rgba(0,0,0,0.2)'
            : '0 4px 0 rgba(0,206,209,0.4)',
          animation: 'countPop 0.3s ease-out',
          letterSpacing: isGo ? 6 : 0,
        }}
      >
        {current}
      </div>
      <style>{`
        @keyframes countPop {
          from { transform: scale(1.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
