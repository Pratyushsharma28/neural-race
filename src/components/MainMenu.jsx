import { TRACK, TOTAL_LAPS } from './Track.jsx';
import { CAR_DEFINITIONS } from './RaceManager.jsx';

const CONTROLS = [
  { keys: ['W', '↑'], action: 'Accelerate' },
  { keys: ['S', '↓'], action: 'Brake / reverse' },
  { keys: ['A', '←'], action: 'Steer left' },
  { keys: ['D', '→'], action: 'Steer right' },
  { keys: ['SPACE'], action: 'Handbrake / drift' },
];

export function MainMenu({ onStart }) {
  const rivals = CAR_DEFINITIONS.filter((car) => !car.isPlayer);
  const lapKm = TRACK.totalLength / 1000;

  return (
    <div className="screen screen--menu">
      <div className="menu">
        <div>
          <p className="menu__eyebrow">Circuit 01 · Neo Karura</p>
          <h1 className="menu__title">
            Neural<span>//</span>Race
          </h1>
          <p className="menu__tagline">
            Three laps. Two rival programs. One telemetry readout at the end that tells you
            exactly what kind of driver you were.
          </p>

          <div className="menu__actions">
            <button type="button" className="btn btn--primary" onClick={onStart}>
              Start Race
            </button>
          </div>

          <div className="menu__meta">
            <div>
              Laps
              <b>{TOTAL_LAPS}</b>
            </div>
            <div>
              Circuit
              <b>{lapKm.toFixed(2)} km</b>
            </div>
            <div>
              Rivals
              <b>{rivals.map((rival) => rival.name).join(' · ')}</b>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2 className="panel__title">How to play</h2>
          <div className="keylist">
            {CONTROLS.map((control) => (
              <div className="keylist__row" key={control.action}>
                <span>{control.action}</span>
                <span>
                  {control.keys.map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="panel__note">
            Pass every checkpoint in order to count a lap. One corner splits into two lines:
            the cyan <strong>SAFE</strong> lane has full grip, the magenta <strong>RISK</strong>{' '}
            lane is shorter and feeds you a boost pad, but it will not forgive a sloppy entry.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
