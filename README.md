# Possessed Brawl

A browser-based stick-figure fighting game controlled through webcam pose detection using MediaPipe Pose. Created for the Kiroween 2026 hackathon.

## Overview

Control your fighter using your body movements captured through your device's webcam. Perform jabs, power punches, ducks, blocks, and special charge attacks by moving your body in real-time.

## Requirements

- **Browser**: Chrome v100+ (Android) or Safari v15+ (iOS)
- **Connection**: HTTP for localhost development, HTTPS for mobile device testing
- **Orientation**: Landscape mode
- **Performance**: Mid-range mobile device or better

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd possessed-brawl
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open the game in your browser:
   - Local: `http://localhost:3000`
   - Network: `http://<your-ip>:3000` (for mobile testing)


## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## Building for Production

```bash
npm run build
```

The optimized build will be output to the `dist/` directory.

## Controls

### Calibration
Stand in a boxing guard position with hands up near your face. The system will calibrate to your body dimensions.

### Moves
- **Jab**: Thrust left hand forward
- **Power Punch**: Thrust right hand forward
- **Duck**: Drop head and shoulders quickly
- **Block**: Bring both hands close to face
- **Charge Attack**: Pull both hands together, then release (requires stamina)
- **Move Forward**: Widen shoulders
- **Move Backward**: Narrow shoulders

### Developer Controls
- **T Key**: Toggle threshold tuning UI (after calibration)
- **D Key**: Toggle debug overlay

## Developer Features

### Threshold Tuning UI

The threshold tuning UI allows developers to fine-tune move detection parameters in real-time:

- **Access**: Press `T` key after calibration to toggle the UI
- **Features**:
  - Sliders for all move detection thresholds
  - Adjustable cooldown durations
  - Real-time value updates
  - Automatic localStorage persistence
  - Reset to defaults button
- **Location**: Top-right corner of the screen

The tuning UI exposes parameters for:
- **Jab**: Threshold distance, cooldown
- **Power Punch**: Threshold distance, cooldown
- **Duck**: Threshold distance, time window, cooldown
- **Block**: Proximity threshold
- **Charge**: Proximity threshold, release threshold, stamina threshold, cooldown
- **Depth Control**: Forward/backward shoulder width thresholds

All tuned values are saved to localStorage and persist across sessions.

## Development Stages

### Stage 1 (Current)
- ✅ Project structure and configuration
- ⏳ Pose detection and smoothing
- ⏳ Calibration system
- ⏳ Move recognition
- ⏳ Debug overlay

### Stage 2 (Planned)
- Game engine with physics
- AI opponent
- Combat system
- Scoring and match management
- Sound effects

### Stage 3 (Future)
- Enhanced graphics
- Visual effects
- Performance optimizations

## Technologies

- **TypeScript**: Type-safe development
- **Vite**: Fast build tooling
- **MediaPipe Pose**: Real-time pose detection
- **Matter.js**: 2D physics engine
- **Web Audio API**: Sound effects
- **HTML5 Canvas**: Rendering

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Credits

See [CREDITS.md](CREDITS.md) for third-party library attributions.

## Kiroween 2026

This project was created for the Kiroween 2026 hackathon. The `.kiro/` directory contains project specifications and is intentionally tracked in version control per hackathon requirements.
