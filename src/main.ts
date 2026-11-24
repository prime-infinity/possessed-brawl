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
import { Landmarks, BaselineData, MoveType, DetectedMove, RecognizedSpell, OffHandState, WandHand, Stroke, SpellType } from './types';

/**
 * Application state enumeration
 */
export enum AppState {
  NOT_STARTED = 'not_started',
  INITIALIZING = 'initializing',
  CALIBRATING = 'calibrating',
  PRACTICING = 'practicing',
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
  private strokeCapture: StrokeCapture | null = null;
  private gestureRecognizer: GestureRecognizer | null = null;
  private renderer: Renderer;
  private tuningUI: ThresholdTuningUI | null = null;
  
  // State management
  private state: AppState = AppState.NOT_STARTED;
  private isRunning: boolean = false;
  private calibrationCompleted: boolean = false;
  private animationFrameId: number | null = null;
  
  // Pose data
  private currentLandmarks: Landmarks | null = null;
  private previousLandmarks: Landmarks | null = null;
  private baseline: BaselineData | null = null;
  
  // Spell casting state
  private lastRecognizedSpell: RecognizedSpell | null = null;
  private spellDisplayTimer: number = 0;
  private readonly SPELL_DISPLAY_DURATION = 2000; // 2 seconds
  
  // SKIP-CALIBRATION: Hardcoded wand hands
  private readonly WAND_HAND = WandHand.RIGHT;
  private readonly OFF_HAND = WandHand.LEFT;
  private offHandArmed: boolean = false;
  private currentTrail: { x: number; y: number }[] = [];
  private spellOverlay: HTMLDivElement | null = null;
  
  // Practice mode
  private isPracticeMode: boolean = false;
  private practiceSpells: SpellType[] = [SpellType.SHIELD, SpellType.FIREBALL, SpellType.FROST, SpellType.LIGHTNING];
  private currentPracticeIndex: number = 0;
  private practiceOverlay: HTMLDivElement | null = null;
  private practicePhase: 'demonstration' | 'practice' = 'demonstration';
  private demonstrationAnimationId: number | null = null;
  private readonly PRACTICE_STORAGE_KEY = 'spell_duel_practice_completed';
  
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
  private practiceBtn: HTMLButtonElement;
  private loadingScreen: HTMLDivElement;
  private performanceWarning: HTMLDivElement | null = null;

  /**
   * Initialize the application with required DOM elements
   */
  constructor() {
    // Get DOM elements
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.practiceBtn = document.getElementById('practice-btn') as HTMLButtonElement;
    this.loadingScreen = document.getElementById('loading-screen') as HTMLDivElement;
    
    if (!this.canvas || !this.startBtn || !this.practiceBtn || !this.loadingScreen) {
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
      // Check if first time user
      const hasCompletedPractice = localStorage.getItem(this.PRACTICE_STORAGE_KEY);
      
      if (!hasCompletedPractice) {
        // First time - force practice
        this.startPractice().catch(error => {
          console.error('Failed to start practice:', error);
          this.handleError(error);
        });
      } else {
        // Returning user - start game directly
        this.start().catch(error => {
          console.error('Failed to start application:', error);
          this.handleError(error);
        });
      }
    });
    
    // Practice button click handler (only for returning users)
    this.practiceBtn.addEventListener('click', () => {
      this.startPractice().catch(error => {
        console.error('Failed to start practice:', error);
        this.handleError(error);
      });
    });
    
    // Show/hide practice button based on completion status
    const hasCompletedPractice = localStorage.getItem(this.PRACTICE_STORAGE_KEY);
    if (!hasCompletedPractice) {
      // First time - change button text and hide practice button
      this.startBtn.textContent = 'Practice Spells';
      this.practiceBtn.style.display = 'none';
    } else {
      // Returning user - show both buttons
      this.startBtn.textContent = 'Start Game';
      this.practiceBtn.style.display = 'block';
    }
    
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
   * Start practice mode
   */
  async startPractice(): Promise<void> {
    if (this.state !== AppState.NOT_STARTED && this.state !== AppState.ERROR) {
      console.warn('Application already started');
      return;
    }
    
    try {
      this.state = AppState.INITIALIZING;
      this.isPracticeMode = true;
      this.currentPracticeIndex = 0;
      console.log('Starting practice mode...');
      
      // Hide loading screen
      this.loadingScreen.classList.remove('active');
      
      // Initialize PoseDetector (requests webcam permission)
      console.log('Initializing pose detector...');
      await this.poseDetector.initialize();
      console.log('Pose detector initialized successfully');
      
      // Show canvas for rendering
      this.canvas.classList.add('active');
      this.showVideoPreview();
      
      // Show initial instructions
      this.showInitialInstructions();
      
      // Initialize gesture recognizer
      this.gestureRecognizer = new GestureRecognizer();
      
      // Go to practicing state
      this.state = AppState.PRACTICING;
      this.calibrationCompleted = true;
      
      // Show first spell practice
      setTimeout(() => {
        this.showPracticeSpell();
      }, 100);
      
      // Start main loop
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.mainLoop();
      
    } catch (error) {
      console.error('Failed to start practice:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Start the application
   * 
   * SKIP-CALIBRATION BRANCH: Skip hand selection and calibration entirely.
   * Just log wrist detection in real-time.
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
      console.log('Starting application (SKIP-CALIBRATION mode)...');
      
      // Hide loading screen
      this.loadingScreen.classList.remove('active');
      
      // Initialize PoseDetector (requests webcam permission)
      console.log('Initializing pose detector...');
      await this.poseDetector.initialize();
      console.log('Pose detector initialized successfully');
      
      // Show canvas for rendering
      this.canvas.classList.add('active');
      this.showVideoPreview();
      
      // Show initial instruction overlay
      this.showInitialInstructions();
      
      // SKIP hand selection and calibration - go directly to active state
      console.log('⚠️ SKIPPING hand selection and calibration');
      console.log('📊 Will log wrist detection every second...');
      this.state = AppState.ACTIVE;
      this.calibrationCompleted = true;
      
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
   * Show initial instructions with stick figure
   */
  private showInitialInstructions(): void {
    const overlay = document.createElement('div');
    overlay.id = 'initial-instructions-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      color: white;
      padding: clamp(20px, 4vw, 40px);
      border-radius: 15px;
      font-family: Arial, sans-serif;
      text-align: center;
      z-index: 10001;
      border: 3px solid #00ff41;
      max-width: 90%;
      max-height: 90vh;
      overflow: auto;
    `;
    
    overlay.innerHTML = `
      <h2 style="font-size: clamp(20px, 5vw, 28px); margin-bottom: clamp(10px, 2vh, 20px); color: #00ff41;">Raise Both Hands</h2>
      <p style="font-size: clamp(14px, 3.5vw, 18px); color: #ccc; margin-bottom: clamp(15px, 3vh, 30px);">Position yourself so the camera can see both your hands</p>
      <canvas id="instruction-canvas" width="300" height="250" style="margin: 0 auto; display: block; max-width: 100%;"></canvas>
      <p style="font-size: clamp(12px, 2.5vw, 14px); color: #888; margin-top: clamp(10px, 2vh, 20px);">The overlay will disappear once pose is detected</p>
    `;
    
    document.body.appendChild(overlay);
    
    // Draw stick figure on canvas
    const canvas = overlay.querySelector('#instruction-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.drawInstructionStickFigure(canvas);
    }
  }

  /**
   * Draw stick figure with both hands raised (waist-up only)
   */
  private drawInstructionStickFigure(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 20; // Shift down slightly
    const scale = 70;
    
    ctx.strokeStyle = '#00ff41';
    ctx.fillStyle = '#00ff41';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Head
    const headRadius = scale * 0.2;
    ctx.beginPath();
    ctx.arc(centerX, centerY - scale * 1.2, headRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Torso (body line)
    const shoulderY = centerY - scale * 0.9;
    const hipY = centerY + scale * 0.2;
    ctx.beginPath();
    ctx.moveTo(centerX, shoulderY);
    ctx.lineTo(centerX, hipY);
    ctx.stroke();
    
    // Shoulders line
    const shoulderHalfWidth = scale * 0.5;
    ctx.beginPath();
    ctx.moveTo(centerX - shoulderHalfWidth, shoulderY);
    ctx.lineTo(centerX + shoulderHalfWidth, shoulderY);
    ctx.stroke();
    
    // LEFT ARM - RAISED (OFF-HAND)
    const leftShoulderX = centerX - shoulderHalfWidth;
    const leftElbowX = centerX - scale * 0.6;
    const leftElbowY = centerY - scale * 0.6;
    const leftWristX = centerX - scale * 0.65;
    const leftWristY = centerY - scale * 1.1;  // Raised above shoulder
    
    ctx.beginPath();
    ctx.moveTo(leftShoulderX, shoulderY);
    ctx.lineTo(leftElbowX, leftElbowY);
    ctx.lineTo(leftWristX, leftWristY);
    ctx.stroke();
    
    // LEFT HAND - glowing circle
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0, 191, 255, 0.8)';
    ctx.fillStyle = 'rgba(0, 191, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(leftWristX, leftWristY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // RIGHT ARM - RAISED (WAND HAND)
    const rightShoulderX = centerX + shoulderHalfWidth;
    const rightElbowX = centerX + scale * 0.6;
    const rightElbowY = centerY - scale * 0.6;
    const rightWristX = centerX + scale * 0.65;
    const rightWristY = centerY - scale * 1.1;  // Raised above shoulder
    
    ctx.strokeStyle = '#00ff41';
    ctx.fillStyle = '#00ff41';
    ctx.beginPath();
    ctx.moveTo(rightShoulderX, shoulderY);
    ctx.lineTo(rightElbowX, rightElbowY);
    ctx.lineTo(rightWristX, rightWristY);
    ctx.stroke();
    
    // RIGHT HAND - glowing circle
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(rightWristX, rightWristY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  /**
   * Remove initial instructions overlay
   */
  private removeInitialInstructions(): void {
    const overlay = document.getElementById('initial-instructions-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Show practice spell instruction
   */
  private showPracticeSpell(): void {
    if (this.currentPracticeIndex >= this.practiceSpells.length) {
      // All spells practiced - show completion
      this.showPracticeCompletion();
      return;
    }
    
    this.practicePhase = 'demonstration';
    const spell = this.practiceSpells[this.currentPracticeIndex];
    
    // Remove previous overlay if exists
    if (this.practiceOverlay) {
      this.practiceOverlay.remove();
    }
    
    this.practiceOverlay = document.createElement('div');
    this.practiceOverlay.id = 'practice-overlay';
    this.practiceOverlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      color: white;
      padding: clamp(20px, 4vw, 40px);
      border-radius: 15px;
      font-family: Arial, sans-serif;
      text-align: center;
      z-index: 10001;
      border: 3px solid #00bfff;
      max-width: 90%;
      max-height: 90vh;
      overflow: auto;
    `;
    
    const spellName = spell.toUpperCase();
    const emoji = this.getSpellEmoji(spell);
    
    this.practiceOverlay.innerHTML = `
      <h2 style="font-size: clamp(20px, 5vw, 28px); margin-bottom: clamp(10px, 2vh, 15px); color: #00bfff;">Learn: ${spellName}</h2>
      <div style="font-size: clamp(32px, 8vw, 48px); margin-bottom: clamp(10px, 2vh, 15px);">${emoji}</div>
      <p style="font-size: clamp(14px, 3.5vw, 18px); color: #ccc; margin-bottom: clamp(15px, 3vh, 25px);">Watch how to cast this spell:</p>
      <canvas id="practice-demo-canvas" width="400" height="300" style="margin: 0 auto; display: block; max-width: 100%; background: rgba(255,255,255,0.05); border-radius: 10px;"></canvas>
      <p style="font-size: clamp(12px, 2.5vw, 14px); color: #888; margin-top: clamp(10px, 2vh, 15px);">Progress: ${this.currentPracticeIndex + 1} / ${this.practiceSpells.length}</p>
    `;
    
    document.body.appendChild(this.practiceOverlay);
    
    // Start animation
    const canvas = this.practiceOverlay.querySelector('#practice-demo-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.startDemonstrationAnimation(canvas, spell);
    }
  }

  /**
   * Start animated demonstration
   */
  private startDemonstrationAnimation(canvas: HTMLCanvasElement, spell: SpellType): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let frame = 0;
    const totalFrames = 180; // 3 seconds at 60fps
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = 50;
      
      // Draw stick figure
      ctx.strokeStyle = '#00bfff';
      ctx.fillStyle = '#00bfff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Head
      ctx.beginPath();
      ctx.arc(centerX - 100, centerY - scale * 1.2, scale * 0.25, 0, Math.PI * 2);
      ctx.stroke();
      
      // Torso
      const shoulderY = centerY - scale * 0.9;
      ctx.beginPath();
      ctx.moveTo(centerX - 100, shoulderY);
      ctx.lineTo(centerX - 100, centerY + scale * 0.3);
      ctx.stroke();
      
      // Shoulders
      ctx.beginPath();
      ctx.moveTo(centerX - 100 - scale * 0.6, shoulderY);
      ctx.lineTo(centerX - 100 + scale * 0.6, shoulderY);
      ctx.stroke();
      
      // LEFT ARM - RAISED (OFF-HAND)
      const leftWristY = shoulderY - scale * 0.6;
      ctx.strokeStyle = '#00bfff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX - 100 - scale * 0.6, shoulderY);
      ctx.lineTo(centerX - 100 - scale * 0.7, shoulderY - scale * 0.3);
      ctx.lineTo(centerX - 100 - scale * 0.75, leftWristY);
      ctx.stroke();
      
      // Left hand glow
      ctx.fillStyle = 'rgba(0, 191, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(centerX - 100 - scale * 0.75, leftWristY, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // RIGHT ARM - DRAWING (animate)
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      const progress = frame / totalFrames;
      
      // Draw trail for wand hand
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.lineWidth = 3;
      this.drawAnimatedGestureTrail(ctx, spell, progress, centerX + 50, centerY);
      
      // Draw wand hand position
      const wandPos = this.getWandPositionForProgress(spell, progress, centerX + 50, centerY, 60);
      
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX - 100 + scale * 0.6, shoulderY);
      ctx.lineTo(centerX - 100 + scale * 0.8, shoulderY - scale * 0.1);
      ctx.lineTo(wandPos.x, wandPos.y);
      ctx.stroke();
      
      // Wand hand glow
      ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.beginPath();
      ctx.arc(wandPos.x, wandPos.y, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Add instruction text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('1. Raise left hand', centerX, 30);
      ctx.fillText('2. Draw with right hand', centerX, 50);
      ctx.fillText('3. Lower left hand to cast', centerX, 70);
      
      frame++;
      
      if (frame < totalFrames) {
        this.demonstrationAnimationId = requestAnimationFrame(animate);
      } else {
        // Animation complete - move to practice phase
        setTimeout(() => {
          this.transitionToPractice(spell);
        }, 1000);
      }
    };
    
    animate();
  }

  /**
   * Draw animated gesture trail
   */
  private drawAnimatedGestureTrail(ctx: CanvasRenderingContext2D, spell: SpellType, progress: number, centerX: number, centerY: number): void {
    const size = 60;
    
    ctx.beginPath();
    
    switch (spell) {
      case SpellType.SHIELD:
        // Circle
        const angle = progress * Math.PI * 2;
        ctx.arc(centerX, centerY, size, 0, angle);
        break;
        
      case SpellType.FIREBALL:
        // Horizontal line
        const hEnd = centerX - size + (progress * size * 2);
        ctx.moveTo(centerX - size, centerY);
        ctx.lineTo(hEnd, centerY);
        break;
        
      case SpellType.FROST:
        // Vertical line
        const vEnd = centerY - size + (progress * size * 2);
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX, vEnd);
        break;
        
      case SpellType.LIGHTNING:
        // Diagonal line
        const dEnd = progress;
        ctx.moveTo(centerX - size * 0.7, centerY - size * 0.7);
        ctx.lineTo(
          centerX - size * 0.7 + (dEnd * size * 1.4),
          centerY - size * 0.7 + (dEnd * size * 1.4)
        );
        break;
    }
    
    ctx.stroke();
  }

  /**
   * Get wand position based on spell progress
   */
  private getWandPositionForProgress(spell: SpellType, progress: number, centerX: number, centerY: number, size: number): { x: number; y: number } {
    switch (spell) {
      case SpellType.SHIELD:
        // Circle
        const angle = progress * Math.PI * 2;
        return {
          x: centerX + Math.cos(angle - Math.PI / 2) * size,
          y: centerY + Math.sin(angle - Math.PI / 2) * size
        };
        
      case SpellType.FIREBALL:
        // Horizontal line
        return {
          x: centerX - size + (progress * size * 2),
          y: centerY
        };
        
      case SpellType.FROST:
        // Vertical line
        return {
          x: centerX,
          y: centerY - size + (progress * size * 2)
        };
        
      case SpellType.LIGHTNING:
        // Diagonal line
        return {
          x: centerX - size * 0.7 + (progress * size * 1.4),
          y: centerY - size * 0.7 + (progress * size * 1.4)
        };
        
      default:
        return { x: centerX, y: centerY };
    }
  }

  /**
   * Transition from demonstration to practice
   */
  private transitionToPractice(spell: SpellType): void {
    this.practicePhase = 'practice';
    
    if (this.demonstrationAnimationId) {
      cancelAnimationFrame(this.demonstrationAnimationId);
      this.demonstrationAnimationId = null;
    }
    
    if (this.practiceOverlay) {
      this.practiceOverlay.remove();
    }
    
    // Create smaller reference animation in corner
    this.createReferenceAnimation(spell);
    
    // Show instruction text overlay
    this.showPracticeInstructions(spell);
  }

  /**
   * Create small reference animation in bottom-right
   */
  private createReferenceAnimation(spell: SpellType): void {
    const refContainer = document.createElement('div');
    refContainer.id = 'reference-animation';
    refContainer.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #00bfff;
      border-radius: 10px;
      padding: 10px;
      z-index: 9999;
    `;
    
    refContainer.innerHTML = `
      <p style="color: #00bfff; font-size: 12px; margin-bottom: 5px; text-align: center; font-family: Arial;">Reference</p>
      <canvas id="reference-canvas" width="150" height="120"></canvas>
    `;
    
    document.body.appendChild(refContainer);
    
    // Start looping animation
    const canvas = refContainer.querySelector('#reference-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.loopReferenceAnimation(canvas, spell);
    }
  }

  /**
   * Loop reference animation
   */
  private loopReferenceAnimation(canvas: HTMLCanvasElement, spell: SpellType): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let frame = 0;
    const totalFrames = 120;
    
    const animate = () => {
      if (this.practicePhase !== 'practice' || this.state !== AppState.PRACTICING) {
        return; // Stop animation
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = 50;
      const centerY = canvas.height / 2;
      const scale = 25;
      const progress = (frame % totalFrames) / totalFrames;
      
      // Mini stick figure
      ctx.strokeStyle = '#00bfff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      
      // Head
      ctx.beginPath();
      ctx.arc(centerX, centerY - scale * 1.2, scale * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      
      // Body and arms (simplified)
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - scale * 0.9);
      ctx.lineTo(centerX, centerY + scale * 0.3);
      ctx.stroke();
      
      // Left arm raised
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - scale * 0.9);
      ctx.lineTo(centerX - scale * 0.5, centerY - scale * 1.3);
      ctx.stroke();
      
      // Draw gesture trail
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.lineWidth = 2;
      this.drawAnimatedGestureTrail(ctx, spell, progress, centerX + 50, centerY);
      
      // Wand hand
      const wandPos = this.getWandPositionForProgress(spell, progress, centerX + 50, centerY, 30);
      ctx.strokeStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - scale * 0.9);
      ctx.lineTo(wandPos.x, wandPos.y);
      ctx.stroke();
      
      frame++;
      this.demonstrationAnimationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Show practice instructions
   */
  private showPracticeInstructions(spell: SpellType): void {
    const overlay = document.createElement('div');
    overlay.id = 'practice-instruction-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px 30px;
      border-radius: 10px;
      font-family: Arial, sans-serif;
      text-align: center;
      z-index: 9998;
      border: 2px solid #00ff41;
    `;
    
    const spellName = spell.toUpperCase();
    const emoji = this.getSpellEmoji(spell);
    
    overlay.innerHTML = `
      <h3 style="font-size: clamp(18px, 4vw, 24px); margin-bottom: 10px; color: #00ff41;">Now You Try: ${emoji} ${spellName}</h3>
      <p style="font-size: clamp(14px, 3vw, 16px); color: #ccc;">Raise left hand → Draw gesture → Lower left hand</p>
    `;
    
    document.body.appendChild(overlay);
  }

  /**
   * Get emoji for each spell
   */
  private getSpellEmoji(spell: SpellType): string {
    switch (spell) {
      case SpellType.SHIELD:
        return '🛡️';
      case SpellType.FIREBALL:
        return '🔥';
      case SpellType.FROST:
        return '❄️';
      case SpellType.LIGHTNING:
        return '⚡';
      default:
        return '';
    }
  }

  /**
   * Show practice completion screen
   */
  private showPracticeCompletion(): void {
    if (this.practiceOverlay) {
      this.practiceOverlay.remove();
    }
    
    this.practiceOverlay = document.createElement('div');
    this.practiceOverlay.id = 'practice-completion';
    this.practiceOverlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      color: white;
      padding: clamp(30px, 5vw, 50px);
      border-radius: 15px;
      font-family: Arial, sans-serif;
      text-align: center;
      z-index: 10001;
      border: 3px solid #00ff41;
      max-width: 90%;
    `;
    
    this.practiceOverlay.innerHTML = `
      <h2 style="font-size: clamp(24px, 6vw, 36px); margin-bottom: clamp(15px, 3vh, 25px); color: #00ff41;">✓ Practice Complete!</h2>
      <p style="font-size: clamp(16px, 4vw, 20px); color: #ccc; margin-bottom: clamp(20px, 4vh, 30px);">You've mastered all 4 spells!</p>
      <div style="font-size: clamp(14px, 3.5vw, 18px); color: #888; margin-bottom: clamp(20px, 4vh, 30px);">
        <div style="margin: 10px 0;">🛡️ Shield - Circle</div>
        <div style="margin: 10px 0;">🔥 Fireball - Horizontal Line</div>
        <div style="margin: 10px 0;">❄️ Frost - Vertical Line</div>
        <div style="margin: 10px 0;">⚡ Lightning - Diagonal Line</div>
      </div>
      <button id="continue-to-game-btn" style="
        padding: clamp(12px, 2.5vw, 16px) clamp(30px, 5vw, 40px);
        font-size: clamp(14px, 3vw, 18px);
        font-weight: 600;
        background-color: #00ff41;
        color: #000;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        min-height: 48px;
      ">Start Playing</button>
    `;
    
    document.body.appendChild(this.practiceOverlay);
    
    // Save to localStorage that practice is complete
    localStorage.setItem(this.PRACTICE_STORAGE_KEY, 'true');
    
    // Set up continue button
    const continueBtn = this.practiceOverlay.querySelector('#continue-to-game-btn') as HTMLButtonElement;
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        this.exitPracticeMode();
      });
    }
  }

  /**
   * Exit practice mode and start game
   */
  private exitPracticeMode(): void {
    this.isPracticeMode = false;
    this.cleanupPracticeUI();
    
    if (this.practiceOverlay) {
      this.practiceOverlay.remove();
      this.practiceOverlay = null;
    }
    
    // Transition to active game state
    this.state = AppState.ACTIVE;
    console.log('Exiting practice mode - game is now active');
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
      this.render();
      return;
    }
    
    // Apply smoothing if we have previous landmarks
    if (this.previousLandmarks) {
      this.currentLandmarks = this.poseDetector.smoothLandmarks(rawLandmarks, this.previousLandmarks);
    } else {
      this.currentLandmarks = rawLandmarks;
    }
    
    this.previousLandmarks = this.currentLandmarks;
    
    // SKIP-CALIBRATION: Log wrist detection every second
    // REMOVED - no longer needed
    // this.logWristDetection();
    
    // SKIP-CALIBRATION: Spell casting logic
    this.processSpellCasting(deltaTime);
    
    // Step 4: Rendering
    this.render();
  }
  
  /**
   * Process spell casting (SKIP-CALIBRATION branch)
   */
  private processSpellCasting(deltaTime: number): void {
    if (!this.currentLandmarks) return;
    
    // Remove initial instructions once landmarks are detected
    this.removeInitialInstructions();
    
    const leftWrist = this.currentLandmarks.points[15]; // OFF-HAND
    const rightWrist = this.currentLandmarks.points[16]; // WAND HAND
    const leftShoulder = this.currentLandmarks.points[11];
    const rightShoulder = this.currentLandmarks.points[12];
    
    if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return;
    
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const offHandDelta = shoulderY - leftWrist.y;
    const offHandRaised = offHandDelta > 0.0;
    
    // State machine for off-hand
    if (offHandRaised && !this.offHandArmed) {
      // Off-hand raised - ARM spell casting
      this.offHandArmed = true;
      this.currentTrail = [];
    } else if (!offHandRaised && this.offHandArmed) {
      // Off-hand dropped - CAST spell
      this.offHandArmed = false;
      this.castSpell();
    }
    
    // Record wand trail when armed
    if (this.offHandArmed && rightWrist.visibility > 0.5) {
      this.currentTrail.push({ x: rightWrist.x, y: rightWrist.y });
      
      // Limit trail length
      if (this.currentTrail.length > 100) {
        this.currentTrail.shift();
      }
    }
    
    // Update spell display timer
    if (this.lastRecognizedSpell) {
      this.spellDisplayTimer += deltaTime;
      if (this.spellDisplayTimer > this.SPELL_DISPLAY_DURATION) {
        this.lastRecognizedSpell = null;
      }
    }
  }
  
  /**
   * Cast spell - recognize gesture and display result
   */
  private castSpell(): void {
    if (this.currentTrail.length < 10) {
      return;
    }
    
    // Initialize gesture recognizer if not exists
    if (!this.gestureRecognizer) {
      this.gestureRecognizer = new GestureRecognizer();
    }
    
    // Convert trail to Stroke format
    const stroke: Stroke = {
      points: this.currentTrail,
      timestamp: Date.now()
    };
    
    // Recognize the gesture
    const result = this.gestureRecognizer.recognize(stroke);
    
    if (result) {
      this.lastRecognizedSpell = result;
      this.spellDisplayTimer = 0;
      
      // Check if we're in practice mode
      if (this.isPracticeMode && this.state === AppState.PRACTICING) {
        this.handlePracticeSpellCast(result);
      }
    }
    
    // Clear trail
    this.currentTrail = [];
  }

  /**
   * Handle spell cast during practice mode
   */
  private handlePracticeSpellCast(spell: RecognizedSpell): void {
    const targetSpell = this.practiceSpells[this.currentPracticeIndex];
    
    // Check if the cast spell matches the target
    if (spell.type === targetSpell) {
      console.log(`✓ Correct spell cast: ${spell.type}`);
      
      // Clean up current practice UI
      this.cleanupPracticeUI();
      
      // Move to next spell after showing result
      setTimeout(() => {
        this.currentPracticeIndex++;
        this.showPracticeSpell();
      }, 2000);
    } else {
      console.log(`✗ Wrong spell. Expected ${targetSpell}, got ${spell.type}`);
      // Let them try again - no penalty
    }
  }

  /**
   * Clean up practice UI elements
   */
  private cleanupPracticeUI(): void {
    // Remove reference animation
    const refAnim = document.getElementById('reference-animation');
    if (refAnim) refAnim.remove();
    
    // Remove instruction overlay
    const instrOverlay = document.getElementById('practice-instruction-overlay');
    if (instrOverlay) instrOverlay.remove();
    
    // Cancel animation
    if (this.demonstrationAnimationId) {
      cancelAnimationFrame(this.demonstrationAnimationId);
      this.demonstrationAnimationId = null;
    }
  }
  
  // Track last log time for wrist detection
  private lastWristLogTime: number = 0;
  private wristStatusOverlay: HTMLDivElement | null = null;
  
  /**
   * Render skeleton and spell effects on canvas
   */
  private renderSkeletonAndSpells(): void {
    if (!this.currentLandmarks) return;
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw skeleton
    this.drawSkeleton(ctx);
    
    // Draw wand trail (golden)
    if (this.offHandArmed && this.currentTrail.length > 1) {
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      const first = this.normalizedToCanvas(this.currentTrail[0].x, this.currentTrail[0].y);
      ctx.moveTo(first.x, first.y);
      
      for (let i = 1; i < this.currentTrail.length; i++) {
        const point = this.normalizedToCanvas(this.currentTrail[i].x, this.currentTrail[i].y);
        ctx.lineTo(point.x, point.y);
      }
      
      ctx.stroke();
    }
    
    // Draw blue glow on off-hand wrist when armed
    if (this.offHandArmed) {
      const leftWrist = this.currentLandmarks.points[15];
      if (leftWrist && leftWrist.visibility > 0.5) {
        const pos = this.normalizedToCanvas(leftWrist.x, leftWrist.y);
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 191, 255, 0.3)';
        ctx.fill();
        
        // Inner glow
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 191, 255, 0.6)';
        ctx.fill();
        
        // Core
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(135, 206, 250, 1.0)';
        ctx.fill();
      }
    }
  }
  
  /**
   * Draw skeleton stick figure
   */
  private drawSkeleton(ctx: CanvasRenderingContext2D): void {
    if (!this.currentLandmarks) return;
    
    const points = this.currentLandmarks.points;
    
    // Helper to draw a line between two landmarks
    const drawLine = (idx1: number, idx2: number, color: string = 'rgba(0, 255, 0, 0.6)', width: number = 2) => {
      const p1 = points[idx1];
      const p2 = points[idx2];
      if (!p1 || !p2 || p1.visibility < 0.5 || p2.visibility < 0.5) return;
      
      const pos1 = this.normalizedToCanvas(p1.x, p1.y);
      const pos2 = this.normalizedToCanvas(p2.x, p2.y);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(pos1.x, pos1.y);
      ctx.lineTo(pos2.x, pos2.y);
      ctx.stroke();
    };
    
    // Helper to draw a point
    const drawPoint = (idx: number, color: string = 'rgba(255, 255, 0, 0.8)', radius: number = 4) => {
      const p = points[idx];
      if (!p || p.visibility < 0.5) return;
      
      const pos = this.normalizedToCanvas(p.x, p.y);
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    };
    
    // Torso
    drawLine(11, 12); // Shoulders
    drawLine(11, 23); // Left shoulder to hip
    drawLine(12, 24); // Right shoulder to hip
    drawLine(23, 24); // Hips
    
    // Left arm
    drawLine(11, 13, 'rgba(0, 255, 255, 0.6)', 3); // Shoulder to elbow
    drawLine(13, 15, 'rgba(0, 191, 255, 0.7)', 3); // Elbow to wrist (OFF-HAND)
    
    // Right arm
    drawLine(12, 14, 'rgba(255, 215, 0, 0.6)', 3); // Shoulder to elbow
    drawLine(14, 16, 'rgba(255, 215, 0, 0.7)', 3); // Elbow to wrist (WAND HAND)
    
    // Head
    drawLine(0, 11); // Nose to left shoulder
    drawLine(0, 12); // Nose to right shoulder
    
    // Key points
    drawPoint(0, 'rgba(255, 100, 100, 0.9)', 6); // Nose
    drawPoint(11, 'rgba(0, 255, 255, 0.9)', 5); // Left shoulder
    drawPoint(12, 'rgba(255, 215, 0, 0.9)', 5); // Right shoulder
    drawPoint(15, 'rgba(0, 191, 255, 1.0)', 7); // Left wrist (OFF-HAND)
    drawPoint(16, 'rgba(255, 215, 0, 1.0)', 7); // Right wrist (WAND HAND)
  }
  
  /**
   * Convert normalized coordinates to canvas pixels
   */
  private normalizedToCanvas(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.canvas.width,
      y: y * this.canvas.height
    };
  }
  
  /**
   * Render spell result using HTML overlay
   */
  private renderSpellResultHTML(): void {
    if (!this.lastRecognizedSpell) {
      if (this.spellOverlay) {
        this.spellOverlay.style.display = 'none';
      }
      return;
    }
    
    // Create overlay if it doesn't exist
    if (!this.spellOverlay) {
      this.spellOverlay = document.createElement('div');
      this.spellOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 30px 50px;
        border-radius: 15px;
        font-family: Arial, sans-serif;
        text-align: center;
        z-index: 10000;
        border: 3px solid #ffd700;
      `;
      document.body.appendChild(this.spellOverlay);
    }
    
    this.spellOverlay.style.display = 'block';
    
    const spell = this.lastRecognizedSpell;
    const emoji = spell.type === SpellType.SHIELD ? '🛡️' : spell.type === SpellType.LIGHTNING ? '⚡' : spell.type === SpellType.FIREBALL ? '🔥' : '❄️';
    
    this.spellOverlay.innerHTML = `
      <canvas id="spell-shape-canvas" width="150" height="150" style="margin: 0 auto; display: block; margin-bottom: 10px;"></canvas>
      <div style="font-size: 64px; margin-bottom: 10px;">${emoji}</div>
      <div style="font-size: 32px; font-weight: bold; color: #ffd700; margin-bottom: 10px;">${spell.type}</div>
      <div style="font-size: 18px; color: #aaa;">Confidence: ${(spell.confidence * 100).toFixed(1)}%</div>
    `;
    
    // Draw the perfect shape on the canvas
    const canvas = this.spellOverlay.querySelector('#spell-shape-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.drawPerfectShape(canvas, spell.type);
    }
  }

  /**
   * Draw perfect shape representation for each spell type
   */
  private drawPerfectShape(canvas: HTMLCanvasElement, spellType: SpellType): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = 60;
    
    ctx.strokeStyle = '#00ff41'; // Green
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    switch (spellType) {
      case SpellType.SHIELD:
        // Perfect circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.stroke();
        break;
        
      case SpellType.FIREBALL:
        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(centerX - size, centerY);
        ctx.lineTo(centerX + size, centerY);
        ctx.stroke();
        break;
        
      case SpellType.FROST:
        // Vertical line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX, centerY + size);
        ctx.stroke();
        break;
        
      case SpellType.LIGHTNING:
        // Diagonal line (top-left to bottom-right)
        const diagonalSize = size * 0.8;
        ctx.beginPath();
        ctx.moveTo(centerX - diagonalSize, centerY - diagonalSize);
        ctx.lineTo(centerX + diagonalSize, centerY + diagonalSize);
        ctx.stroke();
        break;
    }
  }
  
  /**
   * Render wrist status using HTML overlay (smaller, cleaner)
   */
  /**
   * Render wrist status using HTML overlay (smaller, cleaner)
   */
  private renderWristStatusHTML(): void {
    if (!this.currentLandmarks) {
      if (this.wristStatusOverlay) {
        this.wristStatusOverlay.innerHTML = '<div style="color: #ff6b6b;">❌ No pose detected</div>';
      }
      return;
    }
    
    // Create overlay if it doesn't exist
    if (!this.wristStatusOverlay) {
      this.wristStatusOverlay = document.createElement('div');
      this.wristStatusOverlay.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 9999;
        line-height: 1.5;
      `;
      document.body.appendChild(this.wristStatusOverlay);
    }
    
    const leftWrist = this.currentLandmarks.points[15]; // LEFT_WRIST
    const rightWrist = this.currentLandmarks.points[16]; // RIGHT_WRIST
    const leftShoulder = this.currentLandmarks.points[11]; // LEFT_SHOULDER
    const rightShoulder = this.currentLandmarks.points[12]; // RIGHT_SHOULDER
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    
    let html = '<div style="color: #00ff00; font-weight: bold; margin-bottom: 8px;">🧙 SPELL CASTING MODE</div>';
    html += '<div style="color: #ffff00; font-size: 10px; margin-bottom: 8px;">Right=Wand | Left=Off-hand | Raise left to arm</div>';
    
    // Off-hand status (LEFT)
    if (leftWrist && leftWrist.visibility > 0.5) {
      const leftDelta = shoulderY - leftWrist.y;
      const leftRaised = leftDelta > 0.0;
      const status = this.offHandArmed ? '🔵 ARMED' : (leftRaised ? '⬆️ UP' : '⬇️ DOWN');
      const color = this.offHandArmed ? '#00bfff' : (leftRaised ? '#ffd700' : '#888');
      html += `<div style="color: ${color}; font-weight: bold;">OFF-HAND: ${status}</div>`;
      html += `<div style="color: #888; font-size: 10px; margin-left: 10px;">vis: ${(leftWrist.visibility * 100).toFixed(0)}% | delta: ${leftDelta.toFixed(3)}</div>`;
    } else {
      html += '<div style="color: #ff6b6b;">OFF-HAND: ❌ NOT DETECTED</div>';
    }
    
    html += '<div style="margin: 5px 0;"></div>';
    
    // Wand hand status (RIGHT)
    if (rightWrist && rightWrist.visibility > 0.5) {
      html += `<div style="color: #ffd700; font-weight: bold;">WAND: ${this.offHandArmed ? '✏️ DRAWING' : '⚪ IDLE'}</div>`;
      html += `<div style="color: #888; font-size: 10px; margin-left: 10px;">trail: ${this.currentTrail.length} points</div>`;
    } else {
      html += '<div style="color: #ff6b6b;">WAND: ❌ NOT DETECTED</div>';
    }
    
    html += '<div style="color: #666; font-size: 10px; margin-top: 8px;">Drop left hand to cast</div>';
    
    this.wristStatusOverlay.innerHTML = html;
  }
  
  /**
   * Log wrist detection status (every 1 second)
   */
  private logWristDetection(): void {
    if (!this.currentLandmarks) return;
    
    const currentTime = performance.now();
    if (currentTime - this.lastWristLogTime < 1000) return; // Log every 1 second
    
    this.lastWristLogTime = currentTime;
    
    const leftWrist = this.currentLandmarks.points[15]; // LEFT_WRIST
    const rightWrist = this.currentLandmarks.points[16]; // RIGHT_WRIST
    const leftElbow = this.currentLandmarks.points[13]; // LEFT_ELBOW
    const rightElbow = this.currentLandmarks.points[14]; // RIGHT_ELBOW
    const leftShoulder = this.currentLandmarks.points[11]; // LEFT_SHOULDER
    const rightShoulder = this.currentLandmarks.points[12]; // RIGHT_SHOULDER
    const nose = this.currentLandmarks.points[0]; // NOSE
    
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    
    console.log('═══════════════════════════════════════');
    console.log('👋 COMPREHENSIVE BODY TRACKING');
    console.log('═══════════════════════════════════════');
    
    // NOSE
    if (nose) {
      console.log(`NOSE: (${nose.x.toFixed(3)}, ${nose.y.toFixed(3)}) | vis: ${nose.visibility.toFixed(3)}`);
    }
    console.log('');
    
    // SHOULDERS
    console.log(`SHOULDERS:`);
    console.log(`  Left:  (${leftShoulder.x.toFixed(3)}, ${leftShoulder.y.toFixed(3)}) | vis: ${leftShoulder.visibility.toFixed(3)}`);
    console.log(`  Right: (${rightShoulder.x.toFixed(3)}, ${rightShoulder.y.toFixed(3)}) | vis: ${rightShoulder.visibility.toFixed(3)}`);
    console.log(`  Average Y: ${shoulderY.toFixed(3)}`);
    console.log('');
    
    // ELBOWS
    console.log(`ELBOWS:`);
    if (leftElbow) {
      const leftElbowDelta = shoulderY - leftElbow.y;
      console.log(`  Left:  (${leftElbow.x.toFixed(3)}, ${leftElbow.y.toFixed(3)}) | vis: ${leftElbow.visibility.toFixed(3)} | delta: ${leftElbowDelta.toFixed(3)}`);
    } else {
      console.log(`  Left: ❌ NOT DETECTED`);
    }
    if (rightElbow) {
      const rightElbowDelta = shoulderY - rightElbow.y;
      console.log(`  Right: (${rightElbow.x.toFixed(3)}, ${rightElbow.y.toFixed(3)}) | vis: ${rightElbow.visibility.toFixed(3)} | delta: ${rightElbowDelta.toFixed(3)}`);
    } else {
      console.log(`  Right: ❌ NOT DETECTED`);
    }
    console.log('');
    
    // WRISTS (detailed)
    console.log(`WRISTS:`);
    if (leftWrist) {
      const leftDelta = shoulderY - leftWrist.y;
      const leftRaised = leftDelta > 0.0; // LOWERED THRESHOLD from 0.1 to 0.0
      console.log(`  Left:  (${leftWrist.x.toFixed(3)}, ${leftWrist.y.toFixed(3)}, z:${leftWrist.z.toFixed(3)}) | vis: ${leftWrist.visibility.toFixed(3)}`);
      console.log(`         Delta from shoulder: ${leftDelta.toFixed(3)} | ${leftRaised ? '⬆️ RAISED' : '⬇️ DOWN'}`);
    } else {
      console.log(`  Left: ❌ NOT DETECTED`);
    }
    
    if (rightWrist) {
      const rightDelta = shoulderY - rightWrist.y;
      const rightRaised = rightDelta > 0.0; // LOWERED THRESHOLD from 0.1 to 0.0
      console.log(`  Right: (${rightWrist.x.toFixed(3)}, ${rightWrist.y.toFixed(3)}, z:${rightWrist.z.toFixed(3)}) | vis: ${rightWrist.visibility.toFixed(3)}`);
      console.log(`         Delta from shoulder: ${rightDelta.toFixed(3)} | ${rightRaised ? '⬆️ RAISED' : '⬇️ DOWN'}`);
    } else {
      console.log(`  Right: ❌ NOT DETECTED`);
    }
    
    console.log('');
    console.log(`💡 TIP: Wrist just needs to be at/above shoulder level (delta > 0.0)`);
    console.log('═══════════════════════════════════════');
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
    }, 1000); // 1 second delay to show completion message
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
    
    if (stroke) {
      console.log(`🎯 Spell cast detected! Stroke has ${stroke.points.length} points`);
      console.log(`   First 5 points:`, stroke.points.slice(0, 5).map(p => `(${p.x.toFixed(2)},${p.y.toFixed(2)})`));
      console.log(`   Last 5 points:`, stroke.points.slice(-5).map(p => `(${p.x.toFixed(2)},${p.y.toFixed(2)})`));
      
      // Recognize spell
      const recognizedSpell = this.gestureRecognizer.recognize(stroke);
      
      if (recognizedSpell) {
        console.log(`🔮 Recognition results:`);
        console.log(`   Winner: ${recognizedSpell.type} (confidence: ${(recognizedSpell.confidence * 100).toFixed(1)}%, score: ${recognizedSpell.matchScore.toFixed(3)})`);
        
        // Store for display
        this.lastRecognizedSpell = recognizedSpell;
        this.spellDisplayTimer = this.SPELL_DISPLAY_DURATION;
      } else {
        console.log(`🔮 No spell recognized (rejected)`);
      }
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
        allScores: null
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
    } else if (this.state === AppState.ACTIVE || this.state === AppState.PRACTICING) {
      // SKIP-CALIBRATION: Render skeleton + spell effects
      // Also render during PRACTICING state
      this.renderSkeletonAndSpells();
      this.renderWristStatusHTML();
      this.renderSpellResultHTML();
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
    
    // Clean up wrist status overlay
    if (this.wristStatusOverlay && this.wristStatusOverlay.parentNode) {
      this.wristStatusOverlay.parentNode.removeChild(this.wristStatusOverlay);
      this.wristStatusOverlay = null;
    }
    
    // Clean up spell overlay
    if (this.spellOverlay && this.spellOverlay.parentNode) {
      this.spellOverlay.parentNode.removeChild(this.spellOverlay);
      this.spellOverlay = null;
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
