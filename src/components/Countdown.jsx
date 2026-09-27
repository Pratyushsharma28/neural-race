import { useEffect, useState } from 'react';

const LABELS = ['3', '2', '1', 'GO!'];
const LIGHTS = 3;
const GO_LINGER_MS = 950;

/**
 * Runs the 3-2-1-GO sequence. `onStart` fires the instant control is handed to
 * the player; the overlay stays mounted a little longer so GO! can fade out.
 */
export function Countdown({ onStart, duration = 3 }) {
  const [step, setStep] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timers = [];
    for (let index = 1; index <= duration; index++) {
      timers.push(
        setTimeout(() => {
          setStep(index);
          if (index === duration) onStart();
        }, index * 1000)
      );
    }
    timers.push(setTimeout(() => setHidden(true), duration * 1000 + GO_LINGER_MS));
    return () => timers.forEach(clearTimeout);
  }, [duration, onStart]);

  if (hidden) return null;

  const isGo = step >= duration;

  return (
    <div className="countdown">
      <div className="countdown__lights">
        {Array.from({ length: LIGHTS }, (_, index) => (
          <span
            key={index}
            className={`countdown__light${!isGo && index <= step ? ' countdown__light--on' : ''}`}
          />
        ))}
      </div>
      <div className={`countdown__value${isGo ? ' countdown__value--go' : ''}`} key={step}>
        {LABELS[step] ?? ''}
      </div>
      <div className="countdown__hint">{isGo ? 'full throttle' : 'get ready'}</div>
    </div>
  );
}

export default Countdown;
