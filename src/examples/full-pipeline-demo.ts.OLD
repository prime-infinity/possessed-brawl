/**
 * Full Pipeline Demo - Stage 1 Integration
 * 
 * Demonstrates the complete Stage 1 pipeline:
 * 1. Pose Detection (webcam → MediaPipe → landmarks)
 * 2. Calibration (guard position → baseline recording)
 * 3. Move Recognition (landmarks + baseline → detected moves)
 * 4. Debug Rendering (visualization of all data)
 * 
 * This demo shows how all Stage 1 components work together,
 * similar to the main Application class.
 * 
 * Usage:
 * - Open in browser
 * - Click Start to begin
 * - Assume guard position (hands up near face) for calibration
 * - After calibration, perform moves to see detection
 * - Press 'D' to toggle debug overlay
 */

import { PoseDetector } from '../components/PoseDetector';
import { Calibrator, CalibrationState } from '../components/Calibrator';
import { CalibrationUI } from '../components/CalibrationUI';
import { MoveRecognizer } from '../components/MoveRecognizer';
import { Renderer } from '../components/Renderer';
import { Landmarks, BaselineData, MoveType } from '../types';

/**
 * Demo state
 */
enum DemoState {
  NOT_STARTED = 'not_started',
  CALIBRATING = 'calibrating',
  ACTIVE = 'active',
  ERROR = 'error'
}

/**
 * Full pipeline demo class
 */
export class FullPipelineDemo {
  // Components
  private poseDetector: PoseDetector;
  private calibrator: Calibrator;
  private calibrationUI: CalibrationUI;
  private moveRecognizer: MoveRecognizer | null = null;
  private renderer: Renderer;
  
  // State
  private state: DemoState = DemoState.NOT_STARTED;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  
  // Data
  private currentLandmarks: Landmarks | null = null;
  private previousLandmarks: Landmarks | null = null;
  private baseline: BaselineData | null = null;
  
  // Simulated stamina for testing
  private simulatedStamina: number = 100;
  
  // Timing
  private lastFrameTime: number = 0;
  private targetFps: number = 30;
  private frameInterval: number = 1000 / this.targetFps;
  
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Initialize components
    this.poseDetector = new PoseDetector();
    this.calibrator = new Calibrator();
    this.calibrationUI = new CalibrationUI({ canvas });
    this.renderer = new Renderer({ canvas, debugMode: true });
    
    console.log('Full Pipeline Demo initialized');
  }

  /**
   * Start the demo
   */
  async start(): Promise<void> {
    try {
      console.log('Starting full pipeline demo...');
      
      // Initialize pose detector
      console.log('Initializing pose detector...');
      await this.poseDetector.initialize();
      console.log('Pose detector ready');
      
      // Start calibration
      this.state = DemoState.CALIBRATING;
      this.calibrator.startCalibration();
      console.log('Calibration started - assume guard position');
      
      // Start main loop
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.mainLoop();
      
    } catch (error) {
      console.error('Failed to start demo:', error);
      this.state = DemoState.ERROR;
      throw error;
    }
  }

  /**
   * Main processing loop
   */
  private mainLoop = async (): Promise<void> => {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    // Frame rate limiting
    if (deltaTime >= this.frameInterval) {
      this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
      
      try {
        await this.processFrame(deltaTime);
      } catch (error) {
        console.error('Error processing frame:', error);
      }
    }
    
    this.animationFrameId = requestAnimationFrame(this.mainLoop);
  };

  /**
   * Process a single frame
   */
  private async processFrame(deltaTime: number): Promise<void> {
    // Step 1: Pose Detection
    const rawLandmarks = await this.poseDetector.processFrame();
    
    if (!rawLandmarks) {
      return;
    }
    
    // Apply smoothing
    if (this.previousLandmarks) {
      this.currentLandmarks = this.poseDetector.smoothLandmarks(rawLandmarks, this.previousLandmarks);
    } else {
      this.currentLandmarks = rawLandmarks;
    }
    
    this.previousLandmarks = this.currentLandmarks;
    
    // Step 2: Calibration or Move Recognition
    if (this.state === DemoState.CALIBRATING) {
      this.processCalibration();
    } else if (this.state === DemoState.ACTIVE && this.baseline && this.moveRecognizer) {
      this.processMoveRecognition(deltaTime);
    }
    
    // Step 3: Rendering
    this.render();
  }

  /**
   * Process calibration
   */
  private processCalibration(): void {
    if (!this.currentLandmarks) return;
    
    const calState = this.calibrator.getState();
    
    // Update guard detection
    const isGuardDetected = this.calibrator.isInGuardPosition(this.currentLandmarks);
    this.calibrationUI.setGuardDetected(isGuardDetected);
    
    // Record frame
    if (calState === CalibrationState.WAITING_FOR_GUARD || 
        calState === CalibrationState.RECORDING) {
      this.calibrator.recordFrame(this.currentLandmarks);
    }
    
    // Check completion
    if (calState === CalibrationState.COMPLETED) {
      this.onCalibrationComplete();
    }
  }

  /**
   * Handle calibration completion
   */
  private onCalibrationComplete(): void {
    console.log('Calibration completed!');
    
    this.baseline = this.calibrator.getBaseline();
    
    if (!this.baseline) {
      console.error('No baseline data');
      return;
    }
    
    // Initialize move recognizer
    this.moveRecognizer = new MoveRecognizer();
    console.log('Move recognizer initialized');
    
    // Transition to active
    this.state = DemoState.ACTIVE;
    console.log('Demo now active - move detection enabled');
    
    // Start renderer
    this.renderer.start();
  }

  /**
   * Process move recognition
   */
  private processMoveRecognition(deltaTime: number): void {
    if (!this.currentLandmarks || !this.baseline || !this.moveRecognizer) return;
    
    // Update cooldowns
    this.moveRecognizer.updateCooldowns(deltaTime);
    
    // Detect moves
    const detectedMoves = this.moveRecognizer.detectMoves(
      this.currentLandmarks,
      this.baseline,
      this.simulatedStamina
    );
    
    // Update simulated stamina
    this.updateSimulatedStamina(detectedMoves, deltaTime);
    
    // Update renderer
    this.renderer.updateState({
      detectedMoves,
      landmarks: this.currentLandmarks,
      baseline: this.baseline,
      debug: {
        thresholds: this.moveRecognizer.getThresholds(),
        cooldowns: this.moveRecognizer.getCooldowns(),
        stamina: this.simulatedStamina
      }
    });
  }

  /**
   * Update simulated stamina
   */
  private updateSimulatedStamina(detectedMoves: any[], deltaTime: number): void {
    const staminaCosts: { [key: string]: number } = {
      [MoveType.JAB]: 5,
      [MoveType.POWER_PUNCH]: 15,
      [MoveType.DUCK]: 10,
      [MoveType.BLOCK]: 0.1 * (deltaTime / 16.67),
      [MoveType.CHARGE]: 50
    };
    
    // Deduct stamina for moves
    for (const move of detectedMoves) {
      const cost = staminaCosts[move.type] || 0;
      this.simulatedStamina -= cost;
    }
    
    // Regenerate when idle
    if (detectedMoves.length === 0 || 
        (detectedMoves.length === 1 && detectedMoves[0].type === MoveType.NONE)) {
      const regenRate = 5;
      this.simulatedStamina += regenRate * (deltaTime / 1000);
    }
    
    // Clamp to [0, 100]
    this.simulatedStamina = Math.max(0, Math.min(100, this.simulatedStamina));
  }

  /**
   * Render current state
   */
  private render(): void {
    if (this.state === DemoState.CALIBRATING) {
      const calState = this.calibrator.getState();
      const progress = this.calibrator.getProgress();
      this.calibrationUI.render(calState, progress);
    }
    // Active rendering is handled by Renderer component
  }

  /**
   * Stop the demo
   */
  stop(): void {
    console.log('Stopping demo...');
    
    this.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.renderer.stop();
    this.poseDetector.dispose();
    
    console.log('Demo stopped');
  }
}

/**
 * Run the demo
 */
export function runFullPipelineDemo(canvas: HTMLCanvasElement): FullPipelineDemo {
  const demo = new FullPipelineDemo(canvas);
  demo.start();
  return demo;
}
