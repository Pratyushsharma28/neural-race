# NEURAL//RACE

A browser-based 3D circuit racing game. Three laps, two AI rivals, and a
post-race **Driver DNA** report that scores how you actually drove — not just
where you finished.

Built as a college hackathon project with React 19, Three.js and React Three
Fiber.

## Features

- **3D race scene** rendered with React Three Fiber and Three.js.
- **Keyboard driving** — accelerate, brake/reverse, steer, and handbrake drifting.
- **One player car and two AI opponents** racing the same circuit.
- **Three-lap race** with ordered checkpoint progress and live position tracking.
- **Countdown** before the race start.
- **HUD** showing speed, lap, elapsed time, position, the route indicator and a
  controls reminder.
- **Minimap** showing the circuit and every car on it.
- **Procedurally composed environment** — sky, stars, terrain, trees, buildings,
  track lamps and grandstands, all generated at load time from a seeded PRNG.
- **Results screen** with finish time, finishing position and six calculated
  Driver DNA scores: speed, risk, precision, drift, aggression and consistency.
- **Restart the race** or return to the main menu from the results screen.

## Tech stack

| Layer    | Choice                                    |
| -------- | ----------------------------------------- |
| UI       | React 19                                  |
| 3D       | Three.js, React Three Fiber, Drei          |
| Bundler  | Webpack 5 + webpack-dev-server            |
| Transpile| Babel (`preset-env`, `preset-react`)      |

No game engine, no physics library and no 3D assets: the circuit, the car
models, the scenery and all the textures are generated in code.

## Controls

| Action              | Keys            |
| ------------------- | --------------- |
| Accelerate          | `W` / `↑`       |
| Brake / reverse     | `S` / `↓`       |
| Steer left          | `A` / `←`       |
| Steer right         | `D` / `→`       |
| Handbrake / drift   | `Space`         |

## Gameplay

1. Pick **Start Race** on the main menu.
2. Wait out the `3` · `2` · `1` · `GO!` countdown.
3. Complete **3 laps**, passing all 20 checkpoints in order — a missed gate does
   not count the lap.
4. Your position is ranked continuously against the two AI cars by checkpoint
   and lap progress.
5. Crossing the line for the third time opens the **results screen**: finish
   time, final position, best lap, the full classification, a telemetry summary
   and your **Driver DNA** profile with a driver archetype.
6. Choose **Race Again** or **Main Menu**.

### The split

One corner offers two lines. The **cyan SAFE lane** is the long way round with
full grip. The **magenta RISK lane** cuts across the inside: it is 13 m shorter,
it feeds you a boost pad, but the surface is slippery and it will not forgive a
sloppy entry. The HUD route indicator shows which one you committed to, and each
AI car has its own preference.

## Project structure

```
src/
├── App.jsx                    # Menu, countdown, race, and results flow
├── main.jsx                   # React application entry point
├── components/
│   ├── Game.jsx                # Three.js scene and race loop
│   ├── Track.jsx               # Circuit geometry and checkpoint definitions
│   ├── PlayerCar.jsx            # Player vehicle and telemetry collection
│   ├── AIOpponent.jsx           # AI opponent vehicles
│   ├── CarPhysics.js            # Car movement and drift calculations
│   ├── CarControls.js           # Keyboard input handling
│   ├── RaceManager.jsx          # Lap, checkpoint, timing, and position state
│   ├── DriverDNA.js             # Post-race driving-style score calculation
│   ├── CameraController.jsx     # Follow camera
│   ├── Environment.jsx          # Scenic 3D environment
│   ├── Checkpoint.jsx           # Checkpoint gate visual
│   ├── Countdown.jsx            # Race start countdown
│   ├── HUD.jsx                  # Live race information overlay
│   ├── Minimap.jsx              # Track and car position map
│   ├── MainMenu.jsx             # Title screen and how-to-play panel
│   └── ResultsScreen.jsx        # Finish summary and Driver DNA display
├── App.css
└── index.css
```

## Architecture

The circuit is generated as a **star-shaped radial loop**: a radius is defined at
every 20° around the origin and a closed Catmull-Rom curve is fitted through
those points. Because the radius is single-valued in angle, the centreline can
never self-intersect, which is what makes the procedurally widened split safe to
build. From that curve the track module derives per-sample tangents, normals,
curvature, a racing line, barrier walls, 20 checkpoints and the start grid.

Cars run on an **arcade slip-angle model**. Steering rotates the heading first,
then velocity is decomposed into the new forward/lateral basis; lateral grip
bleeds the slip off exponentially, and the handbrake trades that grip for extra
yaw authority. Yaw rate is capped by a **grip circle** (`grip × lateral limit ÷
speed`), so corners have a real speed limit and understeer is reported back to
the car mesh and the AI planner.

The AI plans against the same grip budget the physics enforces. It scans ~72 m
of curvature ahead, computes the speed each corner can be taken at, and brakes
to the tightest constraint it can still reach. It aims at a lookahead point on
the racing line, biased by its own skill, aggression and route preference, and
steers around traffic it detects in a forward cone.

Race state lives in a **mutable per-frame model** (`race.gates`, `race.progress`)
that never touches React. A director component runs last in the frame loop,
ranks the field, records telemetry, and publishes a plain snapshot to React at
**16 Hz** — so the HTML HUD and minimap stay cheap while the scene renders at
60 fps. Checkpoint progress is measured in *gates crossed plus fractional
distance to the next gate*, which stays continuous across the start/finish line
instead of resetting each lap.

## Run locally

```bash
npm ci        # or npm install
npm run dev   # webpack-dev-server on http://localhost:3000
```

Production build:

```bash
npm run build # emits to dist/
```

## Possible future improvements

- **Collision handling between cars.** Barriers are soft and push the car back
  onto the track, but the cars currently pass through each other. Real
  car-to-car contact and an off-track recovery flow would add a lot.
- **Richer AI behaviour.** Personality currently comes from skill, aggression,
  route preference and a lateral bias. Rubber-banding, defending a position, and
  choosing a line around slower traffic would make the field feel alive.
- **Audio and feel.** No engine, tyre or impact sound yet, and no controller
  support, screen-reader labels or reduced-motion fallback.
- **Persistent best times.** Lap records and a personal best across sessions
  (localStorage) would give the Driver DNA report something to beat.
- **Automated checks.** There is no test suite or CI. The physics, track
  geometry and race loop are all pure modules that are easy to unit test, and
  the circuit generation could be property-tested for self-intersection.

## Credits

Created as a college hackathon project. Update this section with the team
members, event, and any asset credits before submission.
