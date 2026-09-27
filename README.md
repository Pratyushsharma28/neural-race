# NEURAL//RACE

NEURAL//RACE is a browser based 3D circuit racing game built for a college hackathon project. Drive a player controlled car around a futuristic circuit, race two computer controlled opponents, and review your finish and driving profile after the race.

## Features

- 3D race scene rendered with React Three Fiber and Three.js
- Keyboard driving controls with acceleration, braking/reverse, steering, and handbrake drifting
- One player car and two AI opponents
- Three lap race with ordered checkpoint progress and live position tracking
- Countdown before the race begins
- Heads up display for speed, lap, elapsed time, position, route indicator, and controls
- Minimap showing the circuit and the cars
- Procedurally composed environment with sky, terrain, trees, buildings, lamps, and grandstands
- Results screen with finish time, finishing position, and six calculated Driver DNA scores
- Restart race and return to the main menu options

## Tech stack

- React 19
- Three.js
- React Three Fiber
- Drei
- Webpack and webpack-dev-server
- Babel

## Controls

| Key | Action |
| --- | --- |
| `W` or `↑` | Accelerate |
| `S` or `↓` | Brake / reverse |
| `A` or `←` | Steer left |
| `D` or `→` | Steer right |
| `Space` | Handbrake / drift |

## Gameplay

Choose **Start Race** from the main menu. A short `3`, `2`, `1`, `GO!` countdown leads into the race. Complete three laps by driving through the circuit checkpoints in order. Your position is ranked against two AI cars using checkpoint and lap progress.

When the player finishes, the results screen shows the finish time and position. It also displays Driver DNA scores for speed, risk, precision, drift, aggression, and consistency, calculated from race telemetry. Select **Race Again** to restart or **Main Menu** to return to the title screen.

## Project structure

```text
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

`App.jsx` controls the high-level menu, countdown, racing, and results states. During a race, `Game.jsx` mounts the React Three Fiber canvas and combines the track, environment, cars, and follow camera. `CarControls.js` maintains keyboard input, while `CarPhysics.js` updates the player car state. The race loop passes car positions to `RaceManager.jsx`, which tracks checkpoint and lap progress and determines player position. The HTML HUD and minimap read the live race state. Once the player finishes, telemetry is converted into Driver DNA scores and passed to the results screen.

## Run locally

### Requirements

- Node.js and npm

### Install and start

```bash
git clone <repository-url>
cd neural-race
npm ci
npm run dev
```

Open the local URL printed by webpack-dev-server in your browser.

To create a production build:

```bash
npm run build
```

The build output is written to `dist/`.

## Possible future improvements

- Complete and connect the safe/risk route fork to the rendered track and race logic
- Add collision handling and clearer off-track recovery
- Improve AI race behavior and finish-time ranking
- Add audio, mobile controls, accessibility options, and persistent best times
- Add automated gameplay and build checks

## Credits

Created as a college hackathon project. Update this section with the team members, event, and any asset credits before submission.
