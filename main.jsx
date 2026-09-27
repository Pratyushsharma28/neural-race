import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0,
          background: '#0a0a0a', color: '#ff4444',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace', padding: 40, gap: 16,
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>NEURAL//RACE — Runtime Error</div>
          <div style={{
            background: '#1a0000', border: '1px solid #ff4444',
            borderRadius: 8, padding: 20, maxWidth: 700,
            fontSize: 13, whiteSpace: 'pre-wrap', overflowY: 'auto', maxHeight: 400,
          }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '10px 24px', background: '#ff4444', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
