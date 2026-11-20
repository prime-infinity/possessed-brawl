/**
 * Calibration Demo
 * 
 * Demonstrates how to use the PoseDetector and Calibrator components together.
 * This example shows the complete calibration flow:
 * 1. Initialize webcam and pose detection
 * 2. Wait for guard position
 * 3. Record baseline data
 * 4. Display calibration UI feedback
 * 
 * Usage:
 * - Include this in your main application or run as standalone demo
 * - Press any key to start calibration
 * - Assume guard position (hands up near face)
 * - Hold still while recording
 * - Press R to retry if calibration fails
 */

import { PoseDetector } from '../components/PoseDetector';
import { Calibrator, CalibrationState } from '../components/Calibrator';
import { CalibrationUI } from '../components/CalibrationUI';
import { Landmarks } from '../types';

/**
 * Demo application class
 */
export class CalibrationDemo {
  private poseDetector: PoseDetector;
  private calibrator: Calibrator;
  private calibrationUI: CalibrationUI;
  private canvas: HTMLCanvasElement;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.poseDetector = new PoseDetector();
    this.calibrator = new Calibrator();
    this.calibrationUI = new CalibrationUI({ canvas });
  }

  /**
   * Initialize and start the demo
   */
  async start(): Promise<void> {
    try {
      console.log('Initializing pose detector...');
      await this.poseDetector.initialize();
      console.log('Pose detector initialized successfully');

      // Set up keyboard controls
      this.setupKeyboardControls();

      // Start calibration on any key press
      console.log('Press any key to begin calibration');
      
      // Start the render loop
      this.isRunning = true;
      this.renderLoop();

    } catch (error) {
      console.error('Failed to initialize:', error);
      this.displayError(error);
    }
  }

  /**
   * Set up keyboard controls
   */
  private setupKeyboardControls(): void {
    document.addEventListener('keydown', (e) => {
      if (this.calibrator.getState() === CalibrationState.NOT_STARTED) {
        // Any key starts calibration
        console.log('Starting calibration...');
        this.calibrator.startCalibration();
      } else if (e.key.toLowerCase() === 'r' && 
                 this.calibrator.getState() === CalibrationState.FAILED) {
        // R key retries calibration
        console.log('Retrying calibration...');
        this.calibrator.retry();
      }
    });
  }

  /**
   * Main render loop
   */
  private renderLoop = async (): Promise<void> => {
    if (!this.isRunning) return;

    try {
      // Process current video frame
      const landmarks = await this.poseDetector.processFrame();

      // Update calibration if in progress
      if (landmarks) {
        this.updateCalibration(landmarks);
      }

      // Render calibration UI
      const state = this.calibrator.getState();
      const progress = this.calibrator.getProgress();
      
      // Update guard detection status for real-time feedback
      if (landmarks) {
        const isGuardDetected = this.calibrator.isInGuardPosition(landmarks);
        this.calibrationUI.setGuardDetected(isGuardDetected);
      }
      
      this.calibrationUI.render(state, progress);

      // Display baseline data if completed
      if (state === CalibrationState.COMPLETED) {
        this.displayBaselineData();
      }

    } catch (error) {
      console.error('Error in render loop:', error);
    }

    // Continue loop
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };

  /**
   * Update calibration with current landmarks
   */
  private updateCalibration(landmarks: Landmarks): void {
    const state = this.calibrator.getState();

    if (state === CalibrationState.WAITING_FOR_GUARD || 
        state === CalibrationState.RECORDING) {
      this.calibrator.recordFrame(landmarks);
    }
  }

  /**
   * Display baseline data on canvas (for debugging)
   */
  private displayBaselineData(): void {
    const baseline = this.calibrator.getBaseline();
    if (!baseline) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // Display baseline values as text overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, this.canvas.height - 150, 300, 140);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let y = this.canvas.height - 140;
    const lineHeight = 20;

    ctx.fillText('Baseline Data:', 20, y); y += lineHeight;
    ctx.fillText(`Center: (${baseline.centerPosition.x.toFixed(3)}, ${baseline.centerPosition.y.toFixed(3)})`, 20, y); y += lineHeight;
    ctx.fillText(`Shoulder Width: ${baseline.shoulderWidth.toFixed(3)}`, 20, y); y += lineHeight;
    ctx.fillText(`Head Height: ${baseline.headHeight.toFixed(3)}`, 20, y); y += lineHeight;
    ctx.fillText(`Left Wrist: (${baseline.leftWristBaseline.x.toFixed(3)}, ${baseline.leftWristBaseline.y.toFixed(3)}, ${baseline.leftWristBaseline.z.toFixed(3)})`, 20, y); y += lineHeight;
    ctx.fillText(`Right Wrist: (${baseline.rightWristBaseline.x.toFixed(3)}, ${baseline.rightWristBaseline.y.toFixed(3)}, ${baseline.rightWristBaseline.z.toFixed(3)})`, 20, y);

    ctx.restore();
  }

  /**
   * Display error message on canvas
   */
  private displayError(error: unknown): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.fillStyle = '#ff0000';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const message = error instanceof Error ? error.message : String(error);
    ctx.fillText('Error:', this.canvas.width / 2, this.canvas.height / 2 - 30);
    
    ctx.font = '18px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2 + 10);

    ctx.restore();
  }

  /**
   * Stop the demo and clean up resources
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.poseDetector.dispose();
    console.log('Calibration demo stopped');
  }
}

/**
 * Initialize and run the demo
 */
export function runCalibrationDemo(canvas: HTMLCanvasElement): CalibrationDemo {
  const demo = new CalibrationDemo(canvas);
  demo.start();
  return demo;
}
