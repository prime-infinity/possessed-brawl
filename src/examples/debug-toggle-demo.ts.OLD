/**
 * Debug Toggle Demo - Task 8.5
 * 
 * Simple demo showing the debug mode toggle feature in action.
 * 
 * Usage:
 * 1. Press 'D' key to toggle debug mode on/off
 * 2. Refresh the page - the preference should persist
 * 3. Check browser console for localStorage value
 * 
 * Requirements: 9.6
 */

import { Renderer } from '../components/Renderer';
import type { Landmarks } from '../types';

// Create canvas
const canvas = document.createElement('canvas');
canvas.width = 1280;
canvas.height = 720;
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.maxWidth = '1280px';
canvas.style.maxHeight = '720px';
document.body.appendChild(canvas);

// Create info overlay
const info = document.createElement('div');
info.style.cssText = `
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px;
  font-family: monospace;
  font-size: 14px;
  border-radius: 8px;
  max-width: 400px;
  line-height: 1.6;
  z-index: 1000;
`;
info.innerHTML = `
  <h3 style="margin: 0 0 10px 0; color: #00ff00;">Debug Toggle Demo (Task 8.5)</h3>
  <p style="margin: 5px 0;"><strong>Press 'D' key</strong> to toggle debug mode</p>
  <p style="margin: 5px 0; color: #aaa;">The preference persists across page reloads</p>
  <hr style="margin: 10px 0; border-color: #444;">
  <p style="margin: 5px 0; font-size: 12px; color: #888;">
    Current localStorage value:<br/>
    <code id="storage-value" style="color: #0ff;">Loading...</code>
  </p>
  <p style="margin: 5px 0; font-size: 12px; color: #888;">
    Debug mode state:<br/>
    <code id="debug-state" style="color: #0ff;">Loading...</code>
  </p>
`;
document.body.appendChild(info);

const storageValueElement = document.getElementById('storage-value')!;
const debugStateElement = document.getElementById('debug-state')!;

// Update localStorage display
function updateStorageDisplay() {
  const value = localStorage.getItem('possessedBrawl_debugMode');
  storageValueElement.textContent = value || 'null (not set)';
  storageValueElement.style.color = value === 'true' ? '#0f0' : '#f00';
}

// Create renderer with debug mode enabled by default for demo
const renderer = new Renderer({
  canvas,
  debugMode: false, // Start with OFF to demonstrate toggle
  targetFps: 30
});

// Generate mock landmarks for visualization
function generateMockLandmarks(): Landmarks {
  const time = performance.now() / 1000;
  
  // Create 33 landmarks (MediaPipe Pose landmark count)
  const points = Array.from({ length: 33 }, (_, i) => {
    // Create some interesting patterns for different landmark groups
    let x = 0.5;
    let y = 0.5;
    let z = 0;
    
    // Head landmarks (0-10)
    if (i < 11) {
      x = 0.5 + Math.sin(time + i * 0.3) * 0.05;
      y = 0.3 + Math.cos(time + i * 0.2) * 0.05;
      z = -0.2;
    }
    // Upper body landmarks (11-22)
    else if (i < 23) {
      x = 0.5 + Math.sin(time * 0.5 + i * 0.5) * 0.2;
      y = 0.5 + Math.cos(time * 0.5 + i * 0.3) * 0.1;
      z = 0;
    }
    // Lower body landmarks (23-32)
    else {
      x = 0.5 + Math.sin(time * 0.3 + i * 0.4) * 0.1;
      y = 0.7 + Math.cos(time * 0.3 + i * 0.2) * 0.1;
      z = 0.1;
    }
    
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      z,
      visibility: 0.8 + Math.random() * 0.2
    };
  });
  
  return {
    points,
    timestamp: performance.now()
  };
}

// Generate mock baseline data
const mockBaseline = {
  centerPosition: { x: 0.5, y: 0.4 },
  shoulderWidth: 0.25,
  headHeight: 0.15,
  leftWristBaseline: { x: 0.35, y: 0.35, z: -0.1 },
  rightWristBaseline: { x: 0.65, y: 0.35, z: -0.1 }
};

// Generate mock detected moves
function generateMockMoves() {
  const time = performance.now() / 1000;
  const moves = [];
  
  // Randomly generate moves
  if (Math.sin(time) > 0.8) {
    moves.push({
      type: 'jab' as const,
      intensity: 0.8,
      timestamp: performance.now()
    });
  }
  
  if (Math.cos(time * 1.3) > 0.85) {
    moves.push({
      type: 'block' as const,
      intensity: 1.0,
      timestamp: performance.now()
    });
  }
  
  return moves;
}

// Update debug state display
function updateDebugStateDisplay() {
  const isDebugMode = renderer['debugMode'];
  debugStateElement.textContent = isDebugMode ? 'ON (visible)' : 'OFF (hidden)';
  debugStateElement.style.color = isDebugMode ? '#0f0' : '#f00';
}

// Animation loop
function animate() {
  // Generate mock data
  const landmarks = generateMockLandmarks();
  const moves = generateMockMoves();
  
  // Update renderer state
  renderer.updateState({
    landmarks,
    baseline: mockBaseline,
    detectedMoves: moves,
    debug: {
      cooldowns: {
        jab: Math.random() * 500,
        power_punch: Math.random() * 800,
        duck: Math.random() * 600,
        block: 0,
        charge: Math.random() * 2000,
        none: 0
      },
      thresholds: {
        jabThreshold: 0.15,
        jabCooldown: 500,
        powerPunchThreshold: 0.2,
        powerPunchCooldown: 800,
        duckThreshold: 0.1,
        duckTimeWindow: 300,
        duckCooldown: 600,
        blockProximityThreshold: 0.15,
        chargeProximityThreshold: 0.1,
        chargeReleaseThreshold: 0.3,
        chargeStaminaThreshold: 50,
        chargeCooldown: 2000,
        shoulderWidthForwardThreshold: 0.05,
        shoulderWidthBackwardThreshold: 0.05
      },
      stamina: 75 + Math.sin(performance.now() / 2000) * 25,
      calibrationFrames: 30
    }
  });
  
  // Update displays
  updateStorageDisplay();
  updateDebugStateDisplay();
  
  requestAnimationFrame(animate);
}

// Start renderer and animation
renderer.start();
animate();

// Log initial state
console.log('Debug Toggle Demo Started');
console.log('Press "D" key to toggle debug mode');
console.log('Current debug mode:', renderer['debugMode']);
console.log('Current localStorage value:', localStorage.getItem('possessedBrawl_debugMode'));

// Add instructions to page
const instructions = document.createElement('div');
instructions.style.cssText = `
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 15px 30px;
  font-family: monospace;
  font-size: 16px;
  border-radius: 8px;
  border: 2px solid #00ff00;
  text-align: center;
  animation: pulse 2s ease-in-out infinite;
`;
instructions.innerHTML = `
  <strong>Press 'D' to toggle debug overlay</strong><br/>
  <span style="font-size: 12px; color: #aaa;">Your preference will persist across page reloads</span>
`;
document.body.appendChild(instructions);

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;
document.head.appendChild(style);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  renderer.dispose();
});
