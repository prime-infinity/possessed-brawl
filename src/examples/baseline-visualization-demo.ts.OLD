/**
 * Baseline Visualization Demo
 * 
 * Demonstrates the baseline reference visualization feature (Task 8.4)
 * Shows how to display calibration baseline data on the debug renderer
 */

import { Renderer } from '../components/Renderer';
import { BaselineData } from '../types';

/**
 * Demo: Display baseline reference visualization
 * 
 * This example shows how the renderer visualizes calibration baseline data:
 * - Yellow line connecting baseline shoulder positions
 * - Cross marker at center position
 * - Circular markers at baseline wrist positions (labeled L and R)
 * - Calibration quality metrics text overlay
 */
export function demoBaselineVisualization() {
  // Get canvas element
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  // Create renderer with debug mode enabled
  const renderer = new Renderer({
    canvas,
    debugMode: true, // Enable debug overlay
    targetFps: 30
  });

  // Example baseline data (normally comes from Calibrator component)
  const mockBaseline: BaselineData = {
    // Center position (normalized coordinates 0-1)
    centerPosition: { x: 0.5, y: 0.4 },
    
    // Shoulder width (normalized distance)
    shoulderWidth: 0.3,
    
    // Head height (normalized y-coordinate)
    headHeight: 0.2,
    
    // Left wrist baseline position in guard stance
    leftWristBaseline: { x: 0.35, y: 0.3, z: 0.05 },
    
    // Right wrist baseline position in guard stance
    rightWristBaseline: { x: 0.65, y: 0.3, z: 0.05 }
  };

  // Optional: Add calibration quality metrics to debug data
  const debugData = {
    calibrationFrames: 30, // Number of frames recorded during calibration
    stamina: 100, // For debug overlay
    cooldowns: {
      jab: 0,
      power_punch: 0,
      duck: 0,
      block: 0,
      charge: 0,
      none: 0
    },
    thresholds: {
      jabThreshold: 0.15,
      powerPunchThreshold: 0.15,
      duckThreshold: 0.1,
      blockProximityThreshold: 0.2,
      chargeProximityThreshold: 0.15,
      chargeReleaseThreshold: 0.3,
      chargeStaminaThreshold: 50,
      jabCooldown: 300,
      powerPunchCooldown: 500,
      duckCooldown: 1000,
      duckTimeWindow: 500,
      chargeCooldown: 2000,
      shoulderWidthForwardThreshold: 1.1,
      shoulderWidthBackwardThreshold: 0.9
    }
  };

  // Update renderer state with baseline data
  renderer.updateState({
    baseline: mockBaseline,
    fps: 30,
    debug: debugData
  });

  // Start render loop
  renderer.start();

  console.log('Baseline visualization demo started');
  console.log('You should see:');
  console.log('- Yellow shoulder line connecting left and right shoulders');
  console.log('- Cross marker (+) at center position');
  console.log('- Two yellow circles marked "L" and "R" at wrist baselines');
  console.log('- Baseline metrics in bottom-left corner (shoulder width, head height, center position)');
}

/**
 * Demo: Display baseline with live pose landmarks
 * 
 * Shows how baseline reference overlays on top of detected pose landmarks
 */
export function demoBaselineWithPose() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const renderer = new Renderer({
    canvas,
    debugMode: true,
    targetFps: 30
  });

  // Mock baseline data
  const baseline: BaselineData = {
    centerPosition: { x: 0.5, y: 0.4 },
    shoulderWidth: 0.3,
    headHeight: 0.2,
    leftWristBaseline: { x: 0.35, y: 0.3, z: 0.05 },
    rightWristBaseline: { x: 0.65, y: 0.3, z: 0.05 }
  };

  // Mock pose landmarks (33-point MediaPipe Pose model)
  const mockLandmarks = {
    points: Array(33).fill(null).map((_, i) => ({
      x: 0.5 + (Math.random() - 0.5) * 0.1,
      y: 0.4 + (i * 0.01),
      z: (Math.random() - 0.5) * 0.2,
      visibility: 0.8 + Math.random() * 0.2
    })),
    timestamp: Date.now()
  };

  // Update state with both landmarks and baseline
  renderer.updateState({
    landmarks: mockLandmarks,
    baseline: baseline,
    fps: 30
  });

  renderer.start();

  console.log('Baseline with pose visualization demo started');
  console.log('You should see:');
  console.log('- Green/red circles for pose landmarks (green = high visibility)');
  console.log('- Cyan skeleton lines connecting joints');
  console.log('- Yellow baseline reference overlaid on top');
}

// Auto-run demo if this file is executed directly
if (typeof window !== 'undefined') {
  console.log('Baseline Visualization Demo');
  console.log('Call demoBaselineVisualization() or demoBaselineWithPose() to run demos');
}
