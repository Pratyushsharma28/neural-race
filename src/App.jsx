import { useCallback, useMemo, useState } from 'react';
import { Game } from './components/Game.jsx';
import { MainMenu } from './components/MainMenu.jsx';
import { Countdown } from './components/Countdown.jsx';
import { ResultsScreen } from './components/ResultsScreen.jsx';
import { computeDriverDNA } from './components/DriverDNA.js';

export function App() {
  const [phase, setPhase] = useState('menu');
  const [raceKey, setRaceKey] = useState(0);
  const [result, setResult] = useState(null);

  const dna = useMemo(
    () =>
      result
        ? computeDriverDNA(result.telemetry, {
            finishTime: result.finishTime,
            trackLength: result.trackLength,
            lapTimes: result.lapTimes,
          })
        : null,
    [result]
  );

  const beginRace = useCallback(() => {
    setResult(null);
    setRaceKey((key) => key + 1);
    setPhase('countdown');
  }, []);

  const handleStart = useCallback(() => setPhase('racing'), []);

  const handleFinish = useCallback((raceResult) => {
    setResult(raceResult);
    setPhase('results');
  }, []);

  const handleMenu = useCallback(() => {
    setResult(null);
    setPhase('menu');
  }, []);

  const sceneMounted = phase === 'countdown' || phase === 'racing';

  return (
    <div className="app">
      {sceneMounted ? (
        <>
          <Game key={`scene-${raceKey}`} phase={phase} onFinish={handleFinish} />
          <Countdown key={`count-${raceKey}`} onStart={handleStart} />
        </>
      ) : null}

      {phase === 'menu' ? <MainMenu onStart={beginRace} /> : null}

      {phase === 'results' && result && dna ? (
        <ResultsScreen result={result} dna={dna} onRestart={beginRace} onMenu={handleMenu} />
      ) : null}

      <div className="vignette" />
      <div className="scanlines" />
    </div>
  );
}

export default App;
