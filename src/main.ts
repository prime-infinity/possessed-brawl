/**
 * Possessed Brawl - Main Entry Point
 * 
 * Browser-based stick-figure fighting game controlled through webcam pose detection.
 * For the Kiroween 2026 hackathon.
 * 
 * **Validates: Requirements 1.1, 2.1, 4.1, 9.1**
 */

import { PoseDetector } from './components/PoseDetector';
import { Calibrator, CalibrationState } from './components/Calibrator';
import { CalibrationUI } from './components/CalibrationUI';
import { MoveRecognizer } from './components/MoveRecognizer';
import { Renderer } from './components/Renderer';
import { ThresholdTuningUI } from './components/ThresholdTuningUI';
import { Landmarks, BaselineData, MoveType } from './types';
import { ThresholdConfig } from './types/move';

/**
 * Application state enumeration
 */
export enum AppState {
  NOT_STARTED = 'not_started',
  INITIALIZING = 'initializing',
  CALIBRATING = 'calibrating',
  ACTIVE = 'active',
  ERROR = 'error',
  PAUSED = 'paused'
}

/**
 * Main application class coordinating all Stage 1 components
 * 
 * Manages the lifecycle of:
 * - PoseDetector: Webcam input and MediaPipe pose processing
 * - Calibrator: Baseline pose recording
 * - MoveRecognizer: Move detection from poses
 * - Renderer: Debug overlay visualization
 * 
 * **Validates: Requirements 1.1, 2.1, 4.1, 9.1**
 */
export class Application {
  // Component instances
  private poseDetector: PoseDetector;
  private calibrator: Calibrator;
  private calibrationUI: CalibrationUI;
  private moveRecognizer: MoveRecognizer | null = null;
  private renderer: Renderer;
  private tuningUI: ThresholdTuningUI | null = null;
  
  // State management
  private state: AppState = AppState.NOT_STARTED;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  
  // Pose data
  private currentLandmarks: Landmarks | null = null;
  private previousLandmarks: Landmarks | null = null;
  private baseline: BaselineData | null = null;
  
  // Simulated stamina for Stage 1 testing (will be replaced in Stage 2)
  private simulatedStamina: number = 100;
  
  // Timing
  private lastFrameTime: number = 0;
  private targetFps: number = 30;
  private frameInterval: number = 1000 / this.targetFps;
  
  // FPS tracking for mobile optimization
  private fpsHistory: number[] = [];
  private readonly FPS_HISTORY_SIZE = 30; // Track last 30 frames
  private currentFps: number = 0;
  private readonly MIN_FPS_THRESHOLD = 20; // Below this, we start frame skipping
  private readonly LOW_FPS_WARNING_DURATION = 3000; // 3 seconds of low FPS triggers warning
  private lowFpsStartTime: number | null = null;
  private frameSkipCounter: number = 0;
  private readonly FRAME_SKIP_RATIO = 2; // Process every 2nd frame when FPS is low
  
  // DOM elements
  private canvas: HTMLCanvasElement;
  private startBtn: HTMLButtonElement;
  private loadingScreen: HTMLDivElement;
  private calibrationScreen: HTMLDivElement;
  private performanceWarning: HTMLDivElement | null = null;

  /**
   * Initialize the application with required DOM elements
   */
  constructor() {
    // Get DOM elements
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.loadingScreen = document.getElementById('loading-screen') as HTMLDivElement;
    this.calibrationScreen = document.getElementById('calibration-screen') as HTMLDivElement;
    
    if (!this.canvas || !this.startBtn || !this.loadingScreen || !this.calibrationScreen) {
      throw new Error('Required DOM elements not found');
    }
    
    // Initialize components
    this.poseDetector = new PoseDetector();
    this.calibrator = new Calibrator();
    this.calibrationUI = new CalibrationUI({ canvas: this.canvas });
    this.renderer = new Renderer({ canvas: this.canvas });
    
    // Create performance warning UI element
    this.createPerformanceWarningUI();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    console.log('Possessed Brawl - Application initialized');
  }

  /**
   * Create performance warning UI element
   * 
   * **Validates: Requirement 1.1** - Provide feedback when performance drops below target
   */
  private createPerformanceWarningUI(): void {
    this.performanceWarning = document.createElement('div');
    this.performanceWarning.id = 'performance-warning';
    this.performanceWarning.style.position = 'fixed';
    this.performanceWarning.style.top = '10px';
    this.performanceWarning.style.left = '50%';
    this.performanceWarning.style.transform = 'translateX(-50%)';
    this.performanceWarning.style.backgroundColor = 'rgba(255, 165, 0, 0.9)';
    this.performanceWarning.style.color = '#fff';
    this.performanceWarning.style.padding = '10px 20px';
    this.performanceWarning.style.borderRadius = '5px';
    this.performanceWarning.style.fontFamily = 'Arial, sans-serif';
    this.performanceWarning.style.fontSize = '14px';
    this.performanceWarning.style.zIndex = '10000';
    this.performanceWarning.style.display = 'none';
    this.performanceWarning.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    this.performanceWarning.textContent = '⚠️ Low performance detected. Frame skipping enabled.';
    
    document.body.appendChild(this.performanceWarning);
  }

  /**
   * Set up event handlers for user interaction
   */
  private setupEventHandlers(): void {
    // Start button click handler
    this.startBtn.addEventListener('click', () => {
      this.start().catch(error => {
        console.error('Failed to start application:', error);
        this.handleError(error);
      });
    });
    
    // Calibration retry handler (R key)
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'r' && 
          this.state === AppState.CALIBRATING &&
          this.calibrator.getState() === CalibrationState.FAILED) {
        console.log('Retrying calibration...');
        this.calibrator.retry();
      }
      
      // Threshold tuning UI toggle (T key)
      if (e.key.toLowerCase() === 't') {
        if (this.tuningUI) {
          this.tuningUI.toggle();
          console.log(`Threshold tuning UI ${this.tuningUI.getIsVisible() ? 'shown' : 'hidden'}`);
        }
      }
    });
    
    // Retry button click handler (from HTML UI)
    const retryBtn = document.getElementById('retry-calibration-btn') as HTMLButtonElement;
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (this.state === AppState.CALIBRATING &&
            this.calibrator.getState() === CalibrationState.FAILED) {
          console.log('Retrying calibration...');
          this.calibrator.retry();
          retryBtn.style.display = 'none';
        }
      });
    }
  }

  /**
   * Start the application
   * 
   * Initializes pose detection and begins the calibration flow.
   * 
   * **Validates: Requirements 1.1, 2.1**
   */
  async start(): Promise<void> {
    if (this.state !== AppState.NOT_STARTED && this.state !== AppState.ERROR) {
      console.warn('Application already started');
      return;
    }
    
    try {
      this.state = AppState.INITIALIZING;
      console.log('Starting application...');
      
      // Hide loading screen
      this.loadingScreen.classList.remove('active');
      
      // Initialize PoseDetector (requests webcam permission)
      console.log('Initializing pose detector...');
      await this.poseDetector.initialize();
      console.log('Pose detector initialized successfully');
      
      // Show canvas for rendering
      this.canvas.classList.add('active');
      
      // Start calibration
      this.state = AppState.CALIBRATING;
      this.calibrator.startCalibration();
      console.log('Calibration started - assume guard position');
      
      // Start main loop
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.mainLoop();
      
    } catch (error) {
      console.error('Failed to start application:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Main application loop processing frames through the pipeline
   * 
   * Pipeline: webcam → pose detection → calibration (if needed) → move recognition → rendering
   * 
   * Includes FPS tracking and frame skipping for mobile optimization.
   * 
   * **Validates: Requirements 1.1, 2.1, 4.1, 9.1**
   */
  private mainLoop = async (): Promise<void> => {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    // Update FPS tracking
    this.updateFpsTracking(deltaTime);
    
    // Frame rate limiting (20-30 fps target)
    if (deltaTime >= this.frameInterval) {
      this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
      
      // Frame skipping logic for low FPS
      const shouldSkipFrame = this.shouldSkipFrame();
      
      try {
        if (!shouldSkipFrame) {
          await this.processFrame(deltaTime);
        } else {
          // Skip pose processing but still render to maintain visual feedback
          this.render();
          console.log(`Frame skipped - FPS: ${this.currentFps.toFixed(1)}`);
        }
      } catch (error) {
        console.error('Error processing frame:', error);
        // Continue running despite frame errors
      }
    }
    
    // Continue loop
    this.animationFrameId = requestAnimationFrame(this.mainLoop);
  };

  /**
   * Update FPS tracking with rolling average
   * 
   * Tracks FPS over recent frames and detects sustained low performance.
   * 
   * **Validates: Requirement 1.1**
   */
  private updateFpsTracking(deltaTime: number): void {
    // Calculate instantaneous FPS
    const instantFps = deltaTime > 0 ? 1000 / deltaTime : 0;
    
    // Add to history
    this.fpsHistory.push(instantFps);
    if (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
      this.fpsHistory.shift();
    }
    
    // Calculate rolling average FPS
    if (this.fpsHistory.length > 0) {
      const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
      this.currentFps = sum / this.fpsHistory.length;
    }
    
    // Check for sustained low FPS
    if (this.currentFps < this.MIN_FPS_THRESHOLD) {
      if (this.lowFpsStartTime === null) {
        this.lowFpsStartTime = performance.now();
      } else {
        const lowFpsDuration = performance.now() - this.lowFpsStartTime;
        if (lowFpsDuration > this.LOW_FPS_WARNING_DURATION) {
          this.showPerformanceWarning();
        }
      }
    } else {
      // FPS recovered
      if (this.lowFpsStartTime !== null) {
        this.lowFpsStartTime = null;
        this.hidePerformanceWarning();
      }
    }
  }

  /**
   * Determine if current frame should be skipped
   * 
   * Frame skipping activates when FPS drops below threshold to reduce processing load.
   * 
   * **Validates: Requirement 1.1**
   */
  private shouldSkipFrame(): boolean {
    if (this.currentFps >= this.MIN_FPS_THRESHOLD) {
      this.frameSkipCounter = 0;
      return false;
    }
    
    // Skip every Nth frame when FPS is low
    this.frameSkipCounter++;
    if (this.frameSkipCounter >= this.FRAME_SKIP_RATIO) {
      this.frameSkipCounter = 0;
      return false; // Process this frame
    }
    
    return true; // Skip this frame
  }

  /**
   * Show performance warning UI
   * 
   * **Validates: Requirement 1.1**
   */
  private showPerformanceWarning(): void {
    if (this.performanceWarning && this.performanceWarning.style.display === 'none') {
      this.performanceWarning.style.display = 'block';
      console.warn(`Performance warning: Sustained low FPS (${this.currentFps.toFixed(1)} fps). Frame skipping enabled.`);
    }
  }

  /**
   * Hide performance warning UI
   * 
   * **Validates: Requirement 1.1**
   */
  private hidePerformanceWarning(): void {
    if (this.performanceWarning && this.performanceWarning.style.display === 'block') {
      this.performanceWarning.style.display = 'none';
      console.log(`Performance recovered: FPS now ${this.currentFps.toFixed(1)}`);
    }
  }

  /**
   * Process a single frame through the component pipeline
   * 
   * @param deltaTime - Time elapsed since last frame (milliseconds)
   */
  private async processFrame(deltaTime: number): Promise<void> {
    // Step 1: Pose Detection
    const rawLandmarks = await this.poseDetector.processFrame();
    
    if (!rawLandmarks) {
      // No pose detected this frame, continue with previous data
      return;
    }
    
    // Apply smoothing if we have previous landmarks
    if (this.previousLandmarks) {
      this.currentLandmarks = this.poseDetector.smoothLandmarks(rawLandmarks, this.previousLandmarks);
    } else {
      this.currentLandmarks = rawLandmarks;
    }
    
    this.previousLandmarks = this.currentLandmarks;
    
    // Step 2: Calibration (if in calibration state)
    if (this.state === AppState.CALIBRATING) {
      this.processCalibration();
    }
    
    // Step 3: Move Recognition (if calibrated and active)
    if (this.state === AppState.ACTIVE && this.baseline && this.moveRecognizer) {
      this.processMoveRecognition(deltaTime);
    }
    
    // Step 4: Rendering
    this.render();
  }

  /**
   * Process calibration with current landmarks
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  private processCalibration(): void {
    if (!this.currentLandmarks) return;
    
    const calState = this.calibrator.getState();
    
    // Update calibration UI with guard detection status
    const isGuardDetected = this.calibrator.isInGuardPosition(this.currentLandmarks);
    this.calibrationUI.setGuardDetected(isGuardDetected);
    
    // Record calibration frame
    if (calState === CalibrationState.WAITING_FOR_GUARD || 
        calState === CalibrationState.RECORDING) {
      this.calibrator.recordFrame(this.currentLandmarks);
    }
    
    // Check if calibration completed
    if (calState === CalibrationState.COMPLETED) {
      this.onCalibrationComplete();
    }
    
    // Show retry button if calibration failed
    if (calState === CalibrationState.FAILED) {
      const retryBtn = document.getElementById('retry-calibration-btn') as HTMLButtonElement;
      if (retryBtn) {
        retryBtn.style.display = 'block';
      }
    }
  }

  /**
   * Handle calibration completion
   * 
   * Initializes MoveRecognizer and transitions to active state.
   * 
   * **Validates: Requirements 2.1, 4.1**
   */
  private onCalibrationComplete(): void {
    console.log('Calibration completed successfully');
    
    // Get baseline data
    this.baseline = this.calibrator.getBaseline();
    
    if (!this.baseline) {
      console.error('Calibration completed but no baseline data available');
      return;
    }
    
    // Initialize MoveRecognizer with baseline
    this.moveRecognizer = new MoveRecognizer();
    console.log('MoveRecognizer initialized');
    
    // Initialize threshold tuning UI
    this.tuningUI = new ThresholdTuningUI(
      document.body,
      (config: ThresholdConfig) => {
        // Update move recognizer when thresholds change
        if (this.moveRecognizer) {
          this.moveRecognizer.setThresholds(config);
          console.log('Thresholds updated:', config);
        }
      }
    );
    console.log('Threshold tuning UI initialized (press T to toggle)');
    
    // Transition to active state after a brief delay to show completion message
    setTimeout(() => {
      // Transition to active state
      this.state = AppState.ACTIVE;
      console.log('Application now active - move detection enabled');
      
      // Start renderer
      this.renderer.start();
    }, 1000); // 1 second delay to show completion message
  }

  /**
   * Process move recognition with current landmarks
   * 
   * **Validates: Requirements 4.1, 4.2, 4.3**
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
    
    // Update simulated stamina for Stage 1 testing
    this.updateSimulatedStamina(detectedMoves, deltaTime);
    
    // Update renderer with detected moves and FPS
    this.renderer.updateState({
      detectedMoves,
      landmarks: this.currentLandmarks,
      baseline: this.baseline,
      debug: {
        thresholds: this.moveRecognizer.getThresholds(),
        cooldowns: this.moveRecognizer.getCooldowns(),
        stamina: this.simulatedStamina,
        fps: this.currentFps
      }
    });
  }

  /**
   * Update simulated stamina for Stage 1 testing
   * 
   * Simulates stamina mechanics that will be handled by Game_Engine in Stage 2:
   * - Decreases when moves are performed
   * - Regenerates slowly when idle
   */
  private updateSimulatedStamina(detectedMoves: any[], deltaTime: number): void {
    // Stamina costs per move type (Stage 1 simulation)
    const staminaCosts: { [key: string]: number } = {
      [MoveType.JAB]: 5,
      [MoveType.POWER_PUNCH]: 15,
      [MoveType.DUCK]: 10,
      [MoveType.BLOCK]: 0.1 * (deltaTime / 16.67), // ~2 per second at 60fps
      [MoveType.CHARGE]: 50
    };
    
    // Deduct stamina for performed moves
    for (const move of detectedMoves) {
      const cost = staminaCosts[move.type] || 0;
      this.simulatedStamina -= cost;
    }
    
    // Regenerate stamina when idle (no moves detected)
    if (detectedMoves.length === 0 || 
        (detectedMoves.length === 1 && detectedMoves[0].type === MoveType.NONE)) {
      const regenRate = 5; // 5 per second
      this.simulatedStamina += regenRate * (deltaTime / 1000);
    }
    
    // Clamp stamina to [0, 100]
    this.simulatedStamina = Math.max(0, Math.min(100, this.simulatedStamina));
  }

  /**
   * Render the current frame
   * 
   * **Validates: Requirements 9.1, 9.2**
   */
  private render(): void {
    if (this.state === AppState.CALIBRATING) {
      // Render calibration UI
      const calState = this.calibrator.getState();
      const progress = this.calibrator.getProgress();
      this.calibrationUI.render(calState, progress);
      
      // Display baseline data if completed
      if (calState === CalibrationState.COMPLETED && this.baseline) {
        this.displayBaselineData();
      }
    } else if (this.state === AppState.ACTIVE) {
      // Renderer handles its own rendering in requestAnimationFrame loop
      // We just need to update the state (done in processMoveRecognition)
    }
  }

  /**
   * Display baseline data on canvas for debugging
   */
  private displayBaselineData(): void {
    if (!this.baseline) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

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
    ctx.fillText(`Center: (${this.baseline.centerPosition.x.toFixed(3)}, ${this.baseline.centerPosition.y.toFixed(3)})`, 20, y); y += lineHeight;
    ctx.fillText(`Shoulder Width: ${this.baseline.shoulderWidth.toFixed(3)}`, 20, y); y += lineHeight;
    ctx.fillText(`Head Height: ${this.baseline.headHeight.toFixed(3)}`, 20, y); y += lineHeight;
    ctx.fillText(`Left Wrist: z=${this.baseline.leftWristBaseline.z.toFixed(3)}`, 20, y); y += lineHeight;
    ctx.fillText(`Right Wrist: z=${this.baseline.rightWristBaseline.z.toFixed(3)}`, 20, y);

    ctx.restore();
  }

  /**
   * Handle application errors
   */
  private handleError(error: unknown): void {
    this.state = AppState.ERROR;
    
    const message = error instanceof Error ? error.message : String(error);
    console.error('Application error:', message);
    
    // Show loading screen with error message
    this.loadingScreen.classList.add('active');
    this.canvas.classList.remove('active');
    
    // Display error in the error message div
    const errorDiv = document.getElementById('error-message') as HTMLDivElement;
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('active');
    }
    
    // Re-enable start button for retry
    this.startBtn.textContent = 'Retry';
    this.startBtn.disabled = false;
    
    // Reset state for retry
    this.state = AppState.NOT_STARTED;
  }

  /**
   * Stop the application and clean up resources
   */
  stop(): void {
    console.log('Stopping application...');
    
    this.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.renderer.stop();
    this.poseDetector.dispose();
    
    // Clean up tuning UI if it exists
    if (this.tuningUI) {
      this.tuningUI.dispose();
      this.tuningUI = null;
    }
    
    // Clean up performance warning UI
    if (this.performanceWarning && this.performanceWarning.parentNode) {
      this.performanceWarning.parentNode.removeChild(this.performanceWarning);
      this.performanceWarning = null;
    }
    
    this.state = AppState.NOT_STARTED;
    console.log('Application stopped');
  }

  /**
   * Get current application state (for debugging/testing)
   */
  getState(): AppState {
    return this.state;
  }

  /**
   * Get current baseline data (for debugging/testing)
   */
  getBaseline(): BaselineData | null {
    return this.baseline;
  }

  /**
   * Get current FPS (for debugging/testing)
   * 
   * **Validates: Requirement 1.1**
   */
  getCurrentFps(): number {
    return this.currentFps;
  }
}

// Initialize application when DOM is ready
let app: Application | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initApp() {
  try {
    app = new Application();
    console.log('Possessed Brawl - Ready to start');
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (app) {
    app.stop();
  }
});
