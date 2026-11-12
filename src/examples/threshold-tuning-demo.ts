/**
 * Threshold Tuning UI Demo
 * 
 * Demonstrates how to integrate the ThresholdTuningUI component
 * with the Move_Recognizer to enable live threshold tuning during development.
 * 
 * This demo shows:
 * - Creating the tuning UI
 * - Connecting it to the Move_Recognizer
 * - Keyboard toggle (T key)
 * - Real-time threshold updates
 */

import { ThresholdTuningUI } from '../components/ThresholdTuningUI';
import { MoveRecognizer } from '../components/MoveRecognizer';
import { ThresholdConfig } from '../types/move';

/**
 * Initialize and run the threshold tuning demo
 */
export function runThresholdTuningDemo(): void {
  console.log('Starting Threshold Tuning Demo...');

  // Create a move recognizer instance
  const moveRecognizer = new MoveRecognizer();

  // Create the tuning UI
  const tuningUI = new ThresholdTuningUI(
    document.body,
    (config: ThresholdConfig) => {
      // Callback when any threshold changes
      console.log('Thresholds updated:', config);
      
      // Apply the new configuration to the move recognizer
      moveRecognizer.setThresholds(config);
    }
  );

  // Set up keyboard shortcut (T key) to toggle the UI
  document.addEventListener('keydown', (event) => {
    if (event.key === 't' || event.key === 'T') {
      tuningUI.toggle();
      console.log(
        `Tuning UI ${tuningUI.getIsVisible() ? 'shown' : 'hidden'}`
      );
    }
  });

  // Initial state: show the UI for demonstration
  tuningUI.show();

  // Log initial configuration
  console.log('Initial thresholds:', moveRecognizer.getThresholds());

  // Create info panel
  createInfoPanel();

  console.log('Threshold Tuning Demo ready!');
  console.log('Press T to toggle the tuning UI');
}

/**
 * Create an info panel with instructions
 */
function createInfoPanel(): void {
  const infoPanel = document.createElement('div');
  infoPanel.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    max-width: 400px;
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    padding: 15px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 999;
  `;

  infoPanel.innerHTML = `
    <h2 style="margin: 0 0 10px 0; font-size: 18px;">Threshold Tuning Demo</h2>
    <p style="margin: 8px 0;">
      This demo shows the threshold tuning UI for the Move_Recognizer component.
    </p>
    <h3 style="margin: 12px 0 8px 0; font-size: 14px;">Controls:</h3>
    <ul style="margin: 0; padding-left: 20px;">
      <li><strong>T Key</strong>: Toggle tuning UI</li>
      <li><strong>Sliders</strong>: Adjust threshold values</li>
      <li><strong>Reset Button</strong>: Restore defaults</li>
    </ul>
    <h3 style="margin: 12px 0 8px 0; font-size: 14px;">Features:</h3>
    <ul style="margin: 0; padding-left: 20px;">
      <li>All threshold parameters are tunable</li>
      <li>Values persist to localStorage</li>
      <li>Real-time updates to Move_Recognizer</li>
      <li>Organized by move type</li>
      <li>Current values displayed next to sliders</li>
    </ul>
    <p style="margin: 12px 0 0 0; font-size: 12px; color: #aaa;">
      Open the browser console to see threshold update logs.
    </p>
  `;

  document.body.appendChild(infoPanel);
}

// Export for manual invocation (auto-run removed for TypeScript compatibility)
export default runThresholdTuningDemo;
