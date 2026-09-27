const DNA_LABELS = ['speed', 'risk', 'precision', 'drift', 'aggression', 'consistency']
const DNA_COLORS = ['#00CED1', '#FF6B6B', '#4CAF50', '#FF9800', '#E040FB', '#2196F3']
const DNA_ICONS  = ['⚡', '⚠', '🎯', '🌀', '💥', '📊']

function pad2(n) { return String(Math.floor(n)).padStart(2, '0') }
function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${pad2(m)}:${String(sec.toFixed(2)).padStart(5, '0')}`
}

function DNABar({ label, value, color, icon }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: '#555', textTransform: 'uppercase' }}>
          {icon} {label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 8, background: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4,
          background: color,
          width: `${value}%`,
          transition: 'width 1s ease-out',
          boxShadow: `0 0 8px ${color}66`,
        }} />
      </div>
    </div>
  )
}

export default function ResultsScreen({ results, onRestart, onMainMenu }) {
  const { finishTime, playerPosition, dna } = results
  const posLabel = playerPosition === 1 ? '🥇 1ST' : playerPosition === 2 ? '🥈 2ND' : '🥉 3RD'
  const message = playerPosition === 1 ? 'VICTORY!' : playerPosition === 2 ? 'SO CLOSE!' : 'NICE TRY!'

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(160deg, #E8F4F8 0%, #C8DCF0 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', fontFamily: "'Segoe UI', Tahoma, sans-serif",
      padding: 20,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          fontSize: 48, fontWeight: 900, letterSpacing: 6,
          color: playerPosition === 1 ? '#00CED1' : '#1A2A3A',
          textShadow: playerPosition === 1 ? '0 0 20px rgba(0,206,209,0.5)' : 'none',
        }}>
          {message}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: '#1A2A3A', letterSpacing: 4 }}>
          {posLabel}
        </div>
        <div style={{ fontSize: 15, marginTop: 8, color: '#555' }}>
          Finish Time: <strong>{formatTime(finishTime)}</strong>
        </div>
      </div>

      {/* DNA section */}
      <div style={{
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,206,209,0.25)',
        borderRadius: 14, padding: '20px 28px',
        width: '100%', maxWidth: 420,
        marginBottom: 28,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, letterSpacing: 4,
          color: '#00CED1', marginBottom: 16, textAlign: 'center',
        }}>
          DRIVER DNA
        </div>
        {dna && DNA_LABELS.map((key, i) => (
          <DNABar
            key={key}
            label={key}
            value={dna[key] ?? 0}
            color={DNA_COLORS[i]}
            icon={DNA_ICONS[i]}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 14 }}>
        <button
          onClick={onRestart}
          style={{
            padding: '12px 32px',
            background: '#00CED1', color: '#fff',
            border: 'none', borderRadius: 8,
            fontSize: 15, fontWeight: 700, letterSpacing: 2,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,206,209,0.35)',
          }}
        >
          RACE AGAIN
        </button>
        <button
          onClick={onMainMenu}
          style={{
            padding: '12px 32px',
            background: 'rgba(255,255,255,0.5)', color: '#1A2A3A',
            border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: 8,
            fontSize: 15, fontWeight: 600, letterSpacing: 2,
            cursor: 'pointer',
          }}
        >
          MAIN MENU
        </button>
      </div>
    </div>
  )
}
