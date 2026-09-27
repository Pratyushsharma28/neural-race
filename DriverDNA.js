/**
 * DriverDNA.js
 * Tracks telemetry during a race and calculates 6 DNA stats (0-100) post-race.
 */

export class DriverDNA {
  constructor() {
    this.reset()
  }

  reset() {
    this.speedSamples = []
    this.maxSpeedReached = 0
    this.driftTime = 0          // seconds in drift
    this.brakeEvents = 0
    this.collisions = 0
    this.riskRouteChosen = false
    this.overtakes = 0
    this.totalTime = 0
    this.lastBrakeState = false
  }

  /** Call every frame with current car state */
  update(state, delta) {
    const speed = Math.abs(state.speed)
    this.speedSamples.push(speed)
    if (speed > this.maxSpeedReached) this.maxSpeedReached = speed

    this.driftTime = state.driftTime
    this.totalTime += delta

    // Count brake events (leading edge)
    if (state.isBraking && !this.lastBrakeState) {
      this.brakeEvents++
    }
    this.lastBrakeState = state.isBraking

    if (state.collisions > (this._lastCollisions || 0)) {
      this.collisions += state.collisions - (this._lastCollisions || 0)
    }
    this._lastCollisions = state.collisions

    if (state.onRisk) this.riskRouteChosen = true
  }

  addOvertake() {
    this.overtakes++
  }

  addCollision() {
    this.collisions++
  }

  /** Returns { speed, risk, precision, drift, aggression, consistency } each 0-100 */
  calculate(raceTime, totalLaps = 3) {
    const avgSpeed = this.speedSamples.length > 0
      ? this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length
      : 0
    const MAX_SPEED = 28

    // Speed stat: avg speed relative to max possible
    const speed = Math.round(Math.min(100, (avgSpeed / (MAX_SPEED * 0.75)) * 100))

    // Risk: whether risk route was chosen + how aggressively
    const risk = Math.round(
      Math.min(100,
        (this.riskRouteChosen ? 45 : 5) +
        Math.min(40, this.overtakes * 12) +
        Math.min(15, (this.brakeEvents < 5 ? 15 : 0))
      )
    )

    // Precision: penalise collisions and excessive braking
    const precision = Math.round(
      Math.max(0, 100 - this.collisions * 20 - Math.max(0, this.brakeEvents - 10) * 2)
    )

    // Drift: time spent drifting mapped to 0-100
    const drift = Math.round(Math.min(100, (this.driftTime / Math.max(1, this.totalTime)) * 400))

    // Aggression: overtakes + top-speed bias
    const topSpeedRatio = this.maxSpeedReached / MAX_SPEED
    const aggression = Math.round(Math.min(100,
      topSpeedRatio * 50 + this.overtakes * 15 + (this.riskRouteChosen ? 20 : 0)
    ))

    // Consistency: low braking variance + few collisions = high consistency
    let speedVariance = 0
    if (this.speedSamples.length > 1) {
      const mean = avgSpeed
      speedVariance = this.speedSamples.reduce((s, v) => s + (v - mean) ** 2, 0) / this.speedSamples.length
    }
    const consistency = Math.round(Math.max(0, 100 - Math.sqrt(speedVariance) * 2 - this.collisions * 10))

    return { speed, risk, precision, drift, aggression, consistency }
  }
}
