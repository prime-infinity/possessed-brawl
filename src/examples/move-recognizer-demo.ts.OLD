/**
 * MoveRecognizer demo
 * 
 * Demonstrates basic usage of the MoveRecognizer component
 * for jab detection with cooldown management.
 */

import { MoveRecognizer } from '../components/MoveRecognizer';
import { Landmarks, BaselineData, MoveType } from '../types';

/**
 * Example: Basic jab detection usage
 */
function basicJabDetectionExample() {
  console.log('=== Basic Jab Detection Example ===\n');

  // Create a MoveRecognizer with default configuration
  const recognizer = new MoveRecognizer();

  // Example baseline data (from calibration)
  const baseline: BaselineData = {
    centerPosition: { x: 0.5, y: 0.5 },
    shoulderWidth: 0.3,
    headHeight: 0.2,
    leftWristBaseline: { x: 0.3, y: 0.4, z: 0 },
    rightWristBaseline: { x: 0.7, y: 0.4, z: 0 },
  };

  // Create mock landmarks with left wrist at baseline
  const createLandmarks = (leftWristZ: number): Landmarks => {
    const points = Array(33).fill(null).map(() => ({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 1.0,
    }));

    points[15] = {
      x: 0.3,
      y: 0.4,
      z: leftWristZ,
      visibility: 1.0,
    };

    return {
      points,
      timestamp: Date.now(),
    };
  };

  // Frame 1: Wrist at baseline (no movement)
  console.log('Frame 1: Left wrist at baseline position');
  let landmarks = createLandmarks(0);
  let moves = recognizer.detectMoves(landmarks, baseline, 100);
  console.log(`  Detected moves: ${moves.length ? moves.map(m => m.type).join(', ') : 'none'}\n`);

  // Frame 2: Wrist moves forward (z = -0.2, beyond threshold of 0.15)
  console.log('Frame 2: Left wrist moves forward (z = -0.2)');
  landmarks = createLandmarks(-0.2);
  moves = recognizer.detectMoves(landmarks, baseline, 100);
  console.log(`  Detected moves: ${moves.length ? moves.map(m => `${m.type} (intensity: ${m.intensity.toFixed(2)})`).join(', ') : 'none'}`);
  console.log(`  Cooldown started: ${recognizer.getCooldowns()[MoveType.JAB]}ms\n`);

  // Frame 3: Wrist still forward, but jab on cooldown
  console.log('Frame 3: Left wrist still forward, but cooldown active');
  landmarks = createLandmarks(-0.2);
  moves = recognizer.detectMoves(landmarks, baseline, 100);
  console.log(`  Detected moves: ${moves.length ? moves.map(m => m.type).join(', ') : 'none (blocked by cooldown)'}`);
  console.log(`  Cooldown remaining: ${recognizer.getCooldowns()[MoveType.JAB]}ms\n`);

  // Simulate time passing
  console.log('Updating cooldowns (500ms elapsed)...');
  recognizer.updateCooldowns(500);
  console.log(`  Cooldown remaining: ${recognizer.getCooldowns()[MoveType.JAB]}ms\n`);

  // Frame 4: After cooldown expires
  console.log('Frame 4: Left wrist forward again, cooldown expired');
  landmarks = createLandmarks(-0.25);
  moves = recognizer.detectMoves(landmarks, baseline, 100);
  console.log(`  Detected moves: ${moves.length ? moves.map(m => `${m.type} (intensity: ${m.intensity.toFixed(2)})`).join(', ') : 'none'}`);
  console.log(`  New cooldown started: ${recognizer.getCooldowns()[MoveType.JAB]}ms\n`);
}

/**
 * Example: Custom threshold configuration
 */
function customConfigExample() {
  console.log('\n=== Custom Configuration Example ===\n');

  // Create a MoveRecognizer with custom thresholds
  const recognizer = new MoveRecognizer({
    jabThreshold: 0.25,  // Higher threshold (harder to trigger)
    jabCooldown: 300,    // Shorter cooldown (faster jabs)
  });

  console.log('Custom configuration:');
  const config = recognizer.getThresholds();
  console.log(`  Jab threshold: ${config.jabThreshold}`);
  console.log(`  Jab cooldown: ${config.jabCooldown}ms\n`);

  // Example baseline
  const baseline: BaselineData = {
    centerPosition: { x: 0.5, y: 0.5 },
    shoulderWidth: 0.3,
    headHeight: 0.2,
    leftWristBaseline: { x: 0.3, y: 0.4, z: 0 },
    rightWristBaseline: { x: 0.7, y: 0.4, z: 0 },
  };

  const createLandmarks = (leftWristZ: number): Landmarks => {
    const points = Array(33).fill(null).map(() => ({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 1.0,
    }));

    points[15] = {
      x: 0.3,
      y: 0.4,
      z: leftWristZ,
      visibility: 1.0,
    };

    return {
      points,
      timestamp: Date.now(),
    };
  };

  // Test with movement that would trigger default threshold but not custom
  console.log('Test 1: Moderate forward movement (z = -0.2)');
  let landmarks = createLandmarks(-0.2);
  let moves = recognizer.detectMoves(landmarks, baseline, 100);
  console.log(`  Detected: ${moves.length ? 'JAB' : 'none (below custom threshold)'}\n`);

  // Test with stronger movement
  console.log('Test 2: Strong forward movement (z = -0.3)');
  landmarks = createLandmarks(-0.3);
  moves = recognizer.detectMoves(landmarks, baseline, 100);
  console.log(`  Detected: ${moves.length ? `JAB (intensity: ${moves[0].intensity.toFixed(2)})` : 'none'}\n`);
}

/**
 * Example: Runtime threshold tuning
 */
function runtimeTuningExample() {
  console.log('\n=== Runtime Threshold Tuning Example ===\n');

  const recognizer = new MoveRecognizer();

  console.log('Initial thresholds:');
  let config = recognizer.getThresholds();
  console.log(`  Jab threshold: ${config.jabThreshold}`);
  console.log(`  Jab cooldown: ${config.jabCooldown}ms\n`);

  // Tune thresholds at runtime
  console.log('Tuning thresholds...');
  recognizer.setThresholds({
    jabThreshold: 0.2,
    jabCooldown: 400,
  });

  console.log('Updated thresholds:');
  config = recognizer.getThresholds();
  console.log(`  Jab threshold: ${config.jabThreshold}`);
  console.log(`  Jab cooldown: ${config.jabCooldown}ms\n`);
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  basicJabDetectionExample();
  customConfigExample();
  runtimeTuningExample();
  console.log('=== Demo Complete ===');
}
