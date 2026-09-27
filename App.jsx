import { useState, useCallback } from 'react'
import MainMenu from './components/MainMenu.jsx'
import Countdown from './components/Countdown.jsx'
import Game from './components/Game.jsx'
import ResultsScreen from './components/ResultsScreen.jsx'

// Game states: menu | countdown | racing | results
export default function App() {
  const [gameState, setGameState] = useState('menu')
  const [raceResults, setRaceResults] = useState(null)

  const handleStart = useCallback(() => {
    setGameState('countdown')
  }, [])

  const handleCountdownDone = useCallback(() => {
    setGameState('racing')
  }, [])

  const handleRaceFinished = useCallback((results) => {
    setRaceResults(results)
    setGameState('results')
  }, [])

  const handleRestart = useCallback(() => {
    setRaceResults(null)
    setGameState('countdown')
  }, [])

  const handleMainMenu = useCallback(() => {
    setRaceResults(null)
    setGameState('menu')
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, overflow: 'hidden' }}>
      {gameState === 'menu' && (
        <MainMenu onStart={handleStart} />
      )}
      {gameState === 'countdown' && (
        <Countdown onDone={handleCountdownDone} />
      )}
      {(gameState === 'racing' || gameState === 'countdown') && (
        <Game
          active={gameState === 'racing'}
          onFinished={handleRaceFinished}
        />
      )}
      {gameState === 'results' && raceResults && (
        <ResultsScreen
          results={raceResults}
          onRestart={handleRestart}
          onMainMenu={handleMainMenu}
        />
      )}
    </div>
  )
}
