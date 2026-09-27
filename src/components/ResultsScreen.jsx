import { formatTime, ordinal } from './RaceManager.jsx';
import { TOTAL_LAPS } from './Track.jsx';

function scoreColor(score) {
  if (score >= 67) return '#ff2e88';
  if (score >= 34) return '#ffb020';
  return '#00e5ff';
}

function headlineFor(position) {
  if (position === 1) return 'Victory';
  if (position === 2) return 'Podium finish';
  return 'Race complete';
}

export function ResultsScreen({ result, dna, onRestart, onMenu }) {
  const { stats, axes, archetype } = dna;

  return (
    <div className="screen screen--results">
      <div className="results">
        <header className="results__head">
          <div>
            <p className="results__eyebrow">Driver DNA · report</p>
            <h1 className="results__title">{headlineFor(result.position)}</h1>
          </div>
          <div className="results__stats">
            <div className="stat">
              <div className="stat__label">Finish</div>
              <div className="stat__value">{formatTime(result.finishTime)}</div>
            </div>
            <div className="stat">
              <div className="stat__label">Position</div>
              <div className="stat__value stat__value--accent">
                {ordinal(result.position)}
              </div>
            </div>
            <div className="stat">
              <div className="stat__label">Best lap</div>
              <div className="stat__value">{formatTime(result.bestLap)}</div>
            </div>
          </div>
        </header>

        <div className="results__body">
          <section className="panel">
            <h2 className="panel__title">Driver DNA</h2>
            <div className="dna">
              {axes.map((axis, index) => (
                <div className="dna__row" key={axis.key}>
                  <span className="dna__name">{axis.label}</span>
                  <span className="dna__track">
                    <span
                      className="dna__bar"
                      style={{
                        width: `${axis.score}%`,
                        background: scoreColor(axis.score),
                        boxShadow: `0 0 14px ${scoreColor(axis.score)}80`,
                        animationDelay: `${index * 70}ms`,
                      }}
                    />
                  </span>
                  <span className="dna__score">{axis.score}</span>
                </div>
              ))}
              <p className="dna__hint">{axes.reduce((a, b) => (b.score > a.score ? b : a)).blurb}</p>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">Classification</h2>
            <div className="classification">
              {result.classification.map((entry) => (
                <div
                  key={entry.id}
                  className={`classification__row${entry.isPlayer ? ' classification__row--player' : ''}`}
                >
                  <span className="classification__pos">{ordinal(entry.position)}</span>
                  <span style={{ color: entry.color }}>{entry.name}</span>
                  <span className="classification__time">
                    {entry.finished
                      ? formatTime(entry.time)
                      : `LAP ${Math.min(TOTAL_LAPS, entry.lapsCompleted + 1)}/${TOTAL_LAPS}`}
                  </span>
                </div>
              ))}
            </div>

            <h2 className="panel__title" style={{ marginTop: 22 }}>
              Telemetry
            </h2>
            <div className="telemetry">
              <div>
                <span>Avg speed</span>
                <b>{Math.round(stats.averageSpeedKmh)} km/h</b>
              </div>
              <div>
                <span>Top speed</span>
                <b>{Math.round(stats.topSpeedKmh)} km/h</b>
              </div>
              <div>
                <span>Corner speed</span>
                <b>{Math.round(stats.averageCornerSpeed)} km/h</b>
              </div>
              <div>
                <span>Drift time</span>
                <b>{(stats.driftRatio * 100).toFixed(0)}%</b>
              </div>
              <div>
                <span>Peak slip</span>
                <b>{stats.averageSlipDegrees.toFixed(0)}°</b>
              </div>
              <div>
                <span>Off track</span>
                <b>{stats.offTrackSeconds.toFixed(1)}s</b>
              </div>
              <div>
                <span>Barrier hits</span>
                <b>{stats.wallHits}</b>
              </div>
              <div>
                <span>Near misses</span>
                <b>{stats.nearMisses}</b>
              </div>
              <div>
                <span>Overtakes</span>
                <b>{stats.overtakes}</b>
              </div>
              <div>
                <span>Risk lane</span>
                <b>{stats.riskCommits}×</b>
              </div>
            </div>
          </section>
        </div>

        <section className="archetype">
          <div>
            <span className="archetype__label">Archetype</span>
            <strong className="archetype__name">{archetype.name}</strong>
            <span className="archetype__tag">{archetype.tag}</span>
          </div>
          <div className="archetype__poles">
            <span>
              Strongest <b>{archetype.dominant}</b>
            </span>
            <span>
              Weakest <b>{archetype.weakest}</b>
            </span>
          </div>
        </section>

        <footer className="results__foot">
          <button type="button" className="btn btn--primary" onClick={onRestart}>
            Race Again
          </button>
          <button type="button" className="btn btn--ghost" onClick={onMenu}>
            Main Menu
          </button>
        </footer>
      </div>
    </div>
  );
}

export default ResultsScreen;
