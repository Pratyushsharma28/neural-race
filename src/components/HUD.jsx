import { formatTime, ordinal } from './RaceManager.jsx';

function LapPips({ lap, totalLaps }) {
  return (
    <div className="timeline">
      {Array.from({ length: totalLaps }, (_, index) => {
        const state = index < lap - 1 ? 'done' : index === lap - 1 ? 'current' : '';
        return <span key={index} className={`timeline__pip timeline__pip--${state || 'todo'}`} />;
      })}
    </div>
  );
}

export function HUD({ snapshot }) {
  const { player, elapsed, flash } = snapshot;
  const speedPercent = Math.min(100, (player.speedKmh / player.maxSpeedKmh) * 100);
  const status = player.offTrack ? 'OFF TRACK' : player.drift > 0.35 ? 'DRIFT' : 'GRIP';
  const gapText =
    player.position === 1 ? 'LEADER' : `+${player.gap.toFixed(1)}s`;

  return (
    <div className="hud">
      <div className="hud__top">
        <div className="hud__stack">
          <div className="hud__block">
            <div className="hud__label">Lap</div>
            <div className="hud__value">
              {player.lap}
              <small>/{player.totalLaps}</small>
            </div>
            <LapPips lap={player.lap} totalLaps={player.totalLaps} />
          </div>
          <div className="hud__block hud__block--tight">
            <div className="hud__label">
              Last {formatTime(player.lastLapTime)} · Best {formatTime(player.bestLapTime)}
            </div>
          </div>
        </div>

        <div className="hud__center">
          <div className="hud__block hud__block--wide">
            <div className="hud__label">Elapsed</div>
            <div className="hud__value hud__value--time">{formatTime(elapsed)}</div>
          </div>
          <div className="route">
            <div className="route__title">Route</div>
            <div className="route__options">
              <span
                className={`route__chip route__chip--safe${
                  player.route === 'SAFE' ? ' route__chip--active' : ''
                }`}
              >
                Safe
              </span>
              <span
                className={`route__chip route__chip--risk${
                  player.route === 'RISK' ? ' route__chip--active' : ''
                }`}
              >
                Risk
              </span>
            </div>
          </div>
        </div>

        <div className="hud__block hud__position">
          <div className="hud__label">Position</div>
          <div className="hud__value">
            {ordinal(player.position)}
            <small>/{player.fieldSize}</small>
          </div>
          <div className="hud__label hud__label--gap">{gapText}</div>
        </div>
      </div>

      <div className="hud__bottom">
        <div className="speedo">
          <div className="speedo__readout">
            <span className="speedo__number">{Math.round(player.speedKmh)}</span>
            <span className="speedo__unit">km/h</span>
          </div>
          <div className="speedo__bar">
            <div className="speedo__fill" style={{ width: `${speedPercent}%` }} />
          </div>
          <div className="speedo__gear">
            <span>
              GEAR <b>{player.gear}</b>
            </span>
            <span>{status}</span>
          </div>
        </div>

        <div className="hud__controls">
          <span>
            <b>W/S</b> drive
          </span>
          <span>
            <b>A/D</b> steer
          </span>
          <span>
            <b>SPACE</b> drift
          </span>
        </div>
      </div>

      {flash ? (
        <div className="hud__flash" key={flash.id}>
          {flash.text}
        </div>
      ) : null}
    </div>
  );
}

export default HUD;
