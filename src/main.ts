/**
 * Spell Duel - Main Entry Point
 * 
 * Browser-based wizard duel game controlled through webcam pose detection.
 * For the Kiroween 2026 hackathon.
 * 
 * **Validates: Requirements 1.1, 2.1, 4.1, 9.1**
 */

import { PoseDetector } from './components/PoseDetector';
import { Calibrator, CalibrationState } from './components/Calibrator';
import { CalibrationUI } from './components/CalibrationUI';
import { Renderer } from './components/Renderer';
import { ThresholdTuningUI } from './components/ThresholdTuningUI';
import { StrokeCapture } from './components/StrokeCapture';
import { GestureRecognizer } from './components/GestureRecognizer';
import { TemplateRecorder } from './components/TemplateRecorder';
import { WandHandSelector, SelectionState } from './components/WandHandSelector';
import { Landmarks, BaselineData, MoveType, DetectedMove, RecognizedSpell, OffHandState, WandHand } from './types';

/**
 * Application state enumeration
 */
export enum AppState {
  NOT_STARTED = 'not_started',
  INITIALIZING = 'initializing',
  SELECTING_HANDS = 'selecting_hands',
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
  private wandHandSelector: WandHandSelector | null = null;
  private strokeCapture: StrokeCapture | null = null;
  private gestureRecognizer: GestureRecognizer | null = null;
  private templateRecorder: TemplateRecorder | null = null;
  private renderer: Renderer;
  private tuningUI: ThresholdTuningUI | null = null;
  
  // State management
  private state: AppState = AppState.NOT_STARTED;
  private isRunning: boolean = false;
  private calibrationCompleted: boolean = false;
  private isTrainingMode: boolean = false;
  private animationFrameId: number | null = null;
  
  // Pose data
  private currentLandmarks: Landmarks | null = null;
  private previousLandmarks: Landmarks | null = null;
  private baseline: BaselineData | null = null;
  
  // Spell casting state
  private lastRecognizedSpell: RecognizedSpell | null = null;
  private spellDisplayTimer: number = 0;
  private readonly SPELL_DISPLAY_DURATION = 2000; // 2 seconds
  
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
  private trainSpellsBtn: HTMLButtonElement;
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
    this.trainSpellsBtn = document.getElementById('train-spells-btn') as HTMLButtonElement;
    this.loadingScreen = document.getElementById('loading-screen') as HTMLDivElement;
    this.calibrationScreen = document.getElementById('calibration-screen') as HTMLDivElement;
    
    if (!this.canvas || !this.startBtn || !this.trainSpellsBtn || !this.loadingScreen || !this.calibrationScreen) {
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
    
    console.log('Spell Duel - Application initialized');
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
   * Show video preview in bottom-right corner
   */
  private showVideoPreview(): void {
    const video = this.poseDetector.getVideoElement();
    if (video) {
      video.style.display = 'block';
      video.style.position = 'fixed';
      video.style.top = 'auto';
      video.style.left = 'auto';
      video.style.bottom = '20px';
      video.style.right = '20px';
      video.style.width = '240px';
      video.style.height = '180px';
      video.style.border = '3px solid #00ff41';
      video.style.borderRadius = '12px';
      video.style.opacity = '1';
      video.style.zIndex = '1000';
      video.style.boxShadow = '0 4px 20px rgba(0, 255, 65, 0.5)';
      video.style.objectFit = 'cover';
      video.style.pointerEvents = 'none';
    }
  }

  /**
   * Hide video preview
   */
  private hideVideoPreview(): void {
    const video = this.poseDetector.getVideoElement();
    if (video) {
      video.style.display = 'none';
    }
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
    
    // Train spells button click handler
    this.trainSpellsBtn.addEventListener('click', () => {
      this.startTemplateTraining().catch(error => {
        console.error('Failed to start template training:', error);
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
      this.showVideoPreview();
      
      // Start hand selection
      this.state = AppState.SELECTING_HANDS;
      this.wandHandSelector = new WandHandSelector({
        canvas: this.canvas,
        onComplete: (wandHand: WandHand, verified: boolean) => {
          console.log(`Hand selection complete: ${wandHand}, verified: ${verified}`);
          // Set wand hand in calibrator
          this.calibrator.selectWandHand(wandHand);
          // Start calibration
          this.startCalibration();
        }
      });
      this.wandHandSelector.start();
      
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
   * Start calibration after hand selection
   */
  private startCalibration(): void {
    this.state = AppState.CALIBRATING;
    this.calibrator.startCalibration();
    console.log('Calibration started - assume ready stance');
  }
  
  /**
   * Start template training flow
   * 
   * **Validates: Requirements 9.6, 9.7, 9.8**
   */
  async startTemplateTraining(): Promise<void> {
    try {
      this.state = AppState.INITIALIZING;
      this.isTrainingMode = true;
      console.log('Starting template training...');
      
      // Hide loading screen
      this.loadingScreen.classList.remove('active');
      
      // Initialize PoseDetector (requests webcam permission)
      console.log('Initializing pose detector...');
      await this.poseDetector.initialize();
      console.log('Pose detector initialized successfully');
      
      // Show canvas for rendering
      this.canvas.classList.add('active');
      this.showVideoPreview();
      
      // Start hand selection
      this.state = AppState.SELECTING_HANDS;
      this.wandHandSelector = new WandHandSelector({
        canvas: this.canvas,
        onComplete: (wandHand: WandHand, verified: boolean) => {
          console.log(`Hand selection complete (training mode): ${wandHand}, verified: ${verified}`);
          // Set wand hand in calibrator
          this.calibrator.selectWandHand(wandHand);
          // Start calibration
          this.startCalibration();
        }
      });
      this.wandHandSelector.start();
      
      // Start main loop
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.mainLoop();
      
    } catch (error) {
      console.error('Failed to start template training:', error);
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
      // No pose detected this frame
      // Still render calibration UI if in calibration state
      if (this.state === AppState.CALIBRATING) {
        this.render();
      }
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
    
    // Step 2.5: Hand selection (if in selection state)
    if (this.state === AppState.SELECTING_HANDS && this.wandHandSelector) {
      this.wandHandSelector.update(this.currentLandmarks);
    }
    
    // Step 3: Move Recognition (if calibrated and active)
    if (this.state === AppState.ACTIVE && this.baseline) {
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
    if (calState === CalibrationState.WAITING_FOR_READY_STANCE || 
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
   * Initializes spell casting components and transitions to active state.
   * 
   * **Validates: Requirements 2.1, 4.1**
   */
  private onCalibrationComplete(): void {
    console.log('Calibration completed successfully');
    
    if (this.calibrationCompleted) return;
    this.calibrationCompleted = true;
    
    // Get baseline data
    this.baseline = this.calibrator.getBaseline();
    
    if (!this.baseline) {
      console.error('Calibration completed but no baseline data available');
      return;
    }

    // Initialize StrokeCapture and GestureRecognizer
    this.strokeCapture = new StrokeCapture();
    this.gestureRecognizer = new GestureRecognizer();
    console.log('Spell casting components initialized');

    // TODO: Initialize threshold tuning UI for spell casting thresholds
    // this.tuningUI = new ThresholdTuningUI(...);
    console.log('Threshold tuning UI will be initialized here');
    
    // Transition to active state after a brief delay to show completion message
    setTimeout(() => {
      // Remove calibration text overlay
      const overlay = document.getElementById('calibration-text-overlay');
      if (overlay) overlay.remove();
      
      this.hideVideoPreview();
      // Transition to active state
      this.state = AppState.ACTIVE;
      console.log('Application now active - spell casting enabled');
      
      // Start renderer
      this.renderer.start();
      
      // If this was initiated from "Train My Spells", start template recorder
      if (this.isTrainingMode && this.strokeCapture && this.gestureRecognizer) {
        this.startTemplateRecorder();
      }
    }, 1000); // 1 second delay to show completion message
  }
  
  /**
   * Start template recorder
   * 
   * **Validates: Requirements 9.6, 9.7, 9.8**
   */
  private startTemplateRecorder(): void {
    if (!this.strokeCapture || !this.gestureRecognizer) {
      console.error('Cannot start template recorder: components not initialized');
      return;
    }
    
    this.templateRecorder = new TemplateRecorder({
      strokeCapture: this.strokeCapture,
      gestureRecognizer: this.gestureRecognizer,
      onComplete: () => {
        console.log('Template training complete');
        // Return to loading screen
        this.stop();
        this.loadingScreen.classList.add('active');
        this.canvas.classList.remove('active');
        this.state = AppState.NOT_STARTED;
      },
      onCancel: () => {
        console.log('Template training cancelled');
        // Return to loading screen
        this.stop();
        this.loadingScreen.classList.add('active');
        this.canvas.classList.remove('active');
        this.state = AppState.NOT_STARTED;
      }
    });
    
    this.templateRecorder.start();
  }

  /**
   * Process spell casting with current landmarks
   * 
   * **Validates: Requirements 4.1, 5.1, 6.1, 8.1**
   */
  private processMoveRecognition(deltaTime: number): void {
    if (!this.currentLandmarks || !this.baseline || !this.strokeCapture || !this.gestureRecognizer) return;

    // Update stroke capture with current landmarks and baseline
    this.strokeCapture.update(this.currentLandmarks, this.baseline, deltaTime);
    
    // Check if spell was cast
    const stroke = this.strokeCapture.getStroke();
    let allScores: { type: string; score: number }[] | null = null;
    
    if (stroke) {
      console.log(`🎯 Spell cast detected! Stroke has ${stroke.points.length} points`);
      console.log(`   First 5 points:`, stroke.points.slice(0, 5).map(p => `(${p.x.toFixed(2)},${p.y.toFixed(2)})`));
      console.log(`   Last 5 points:`, stroke.points.slice(-5).map(p => `(${p.x.toFixed(2)},${p.y.toFixed(2)})`));
      
      // Recognize spell
      const recognizedSpell = this.gestureRecognizer.recognize(stroke);
      allScores = this.gestureRecognizer.getAllScores(stroke);
      
      console.log(`🔮 Recognition results:`);
      console.log(`   Winner: ${recognizedSpell.type} (confidence: ${(recognizedSpell.confidence * 100).toFixed(1)}%, score: ${recognizedSpell.matchScore.toFixed(3)})`);
      console.log(`   All scores:`, allScores.map(s => `${s.type}=${s.score.toFixed(3)}`).join(', '));
      
      // Store for display
      this.lastRecognizedSpell = recognizedSpell;
      this.spellDisplayTimer = this.SPELL_DISPLAY_DURATION;
    }
    
    // Update spell display timer
    if (this.spellDisplayTimer > 0) {
      this.spellDisplayTimer = Math.max(0, this.spellDisplayTimer - deltaTime);
      if (this.spellDisplayTimer === 0) {
        this.lastRecognizedSpell = null;
      }
    }
    
    // Update renderer with current state
    this.renderer.updateState({
      detectedMoves: [],
      landmarks: this.currentLandmarks,
      baseline: this.baseline,
      spell: {
        offHandState: this.strokeCapture.getOffHandState(),
        trail: this.strokeCapture.getWandTrail(),
        recognizedSpell: this.lastRecognizedSpell,
        allScores: allScores
      },
      debug: {
        thresholds: {},
        cooldowns: {},
        stamina: this.simulatedStamina,
        fps: this.currentFps
      }
    });
  }

  /**
   * Update simulated stamina for Stage 1 testing (legacy, will be replaced)
   */
  private updateSimulatedStamina(detectedMoves: DetectedMove[], deltaTime: number): void {
    // Regenerate stamina when idle
    const regenRate = 5; // 5 per second
    this.simulatedStamina += regenRate * (deltaTime / 1000);
    
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
   * 
   * NOTE: This display is removed for cleaner UI. Enable debug mode (D key) to see spell casting info.
   */
  private displayBaselineData(): void {
    // Baseline data display removed - use debug overlay instead (press D key)
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
    console.log('Spell Duel - Ready to start');
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
