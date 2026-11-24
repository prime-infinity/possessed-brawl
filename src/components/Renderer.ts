/**
 * Renderer Component - Stage 1 Debug Renderer
 * 
 * Provides basic Canvas rendering infrastructure:
 * - Initialize Canvas 2D context
 * - Set up requestAnimationFrame render loop
 * - Implement coordinate transformation (normalized to canvas pixels)
 * - Pose landmark visualization with skeleton connections
 * 
 * Task 8.1: Create basic Canvas rendering infrastructure
 * Task 8.2: Implement pose landmark visualization
 * Task 8.5: Add debug mode toggle feature
 * Requirements: 9.1, 9.2, 9.6
 */

import { Landmarks, DetectedMove, BaselineData, RecognizedSpell, OffHandState, TrailPoint, WandHand, SpellType } from '../types';
import { PoseLandmark } from '../types/pose';

/**
 * LocalStorage key for storing debug mode preference
 */
const DEBUG_MODE_STORAGE_KEY = 'possessedBrawl_debugMode';

/**
 * Configuration for the Renderer
 */
export interface RendererConfig {
  /**
   * Canvas element to render to
   */
  canvas: HTMLCanvasElement;
  
  /**
   * Enable debug mode overlay
   * @default false
   */
  debugMode?: boolean;
  
  /**
   * Target frame rate for rendering
   * @default 30
   */
  targetFps?: number;
  
  /**
   * Visibility threshold for landmarks
   * @default 0.5
   */
  visibilityThreshold?: number;
}

/**
 * Complete render state containing all data for a frame
 */
export interface RenderState {
  /**
   * Current pose landmarks (if available)
   */
  landmarks?: Landmarks;
  
  /**
   * Currently detected moves
   */
  detectedMoves?: DetectedMove[];
  
  /**
   * Calibration baseline data
   */
  baseline?: BaselineData;
  
  /**
   * Spell casting state (Stage 1)
   */
  spell?: {
    offHandState: OffHandState;
    trail: TrailPoint[];
    recognizedSpell: RecognizedSpell | null;
    allScores: { type: string; score: number }[] | null;
  };
  
  /**
   * Game state (Stage 2)
   */
  game?: {
    roundTimer: string;        // Formatted timer (MM:SS)
    playerScore: number;
    aiScore: number;
    playerCombo: number;
    aiCombo: number;
    playerHealth: number;      // 0-100
    aiHealth: number;          // 0-100
    playerMana: number;        // 0-100
    aiMana: number;           // 0-100
  };
  
  /**
   * Current frames per second
   */
  fps?: number;
  
  /**
   * Custom data for debug display
   */
  debug?: Record<string, any>;
}

/**
 * Renderer class for Canvas-based rendering
 * 
 * Handles all drawing operations for the game, including:
 * - Stage 1: Debug overlay with pose landmarks and move detection info
 * - Stage 2+: Game graphics, fighters, UI elements
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private debugMode: boolean;
  private targetFps: number;
  private visibilityThreshold: number;
  
  // Animation frame management
  private animationFrameId: number | null = null;
  private isRunning = false;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsUpdateTime = 0;
  private currentFps = 0;
  
  // Current render state
  private currentState: RenderState = {};
  
  // Canvas dimensions
  private width = 0;
  private height = 0;
  
  /**
   * Create a new Renderer instance
   */
  constructor(config: RendererConfig) {
    this.canvas = config.canvas;
    this.targetFps = config.targetFps ?? 30;
    this.visibilityThreshold = config.visibilityThreshold ?? 0.5;
    
    // Load debug mode preference from localStorage, falling back to config value
    this.debugMode = this.loadDebugModePreference() ?? config.debugMode ?? false;
    
    // Get 2D rendering context
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    this.ctx = ctx;
    
    // Initialize canvas size
    this.resizeCanvas();
    
    // Set up resize listener for responsive layout
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Set up keyboard event listener for debug mode toggle
    this.setupDebugToggle();
  }
  
  /**
   * Resize canvas to match display size
   * Handles mobile device screen dimensions and orientation changes
   */
  private resizeCanvas(): void {
    // Get display size (use canvas dimensions if clientWidth/Height are 0, for testing)
    const displayWidth = this.canvas.clientWidth || this.canvas.width || 0;
    const displayHeight = this.canvas.clientHeight || this.canvas.height || 0;
    
    // Only update if we have valid dimensions
    if (displayWidth > 0 && displayHeight > 0) {
      // Check if canvas size needs update
      if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;
      }
      
      this.width = this.canvas.width;
      this.height = this.canvas.height;
    }
  }
  
  /**
   * Transform normalized coordinates (0-1) to canvas pixel coordinates
   * 
   * MediaPipe outputs normalized coordinates where:
   * - x: 0 (left) to 1 (right)
   * - y: 0 (top) to 1 (bottom)
   * - z: depth relative to hips (negative = closer to camera)
   * 
   * This method converts to canvas pixel coordinates for drawing.
   * 
   * @param x - Normalized x coordinate (0-1)
   * @param y - Normalized y coordinate (0-1)
   * @returns Object with pixel coordinates {x, y}
   */
  public normalizedToPixels(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.width,
      y: y * this.height
    };
  }
  
  /**
   * Transform canvas pixel coordinates to normalized coordinates (0-1)
   * 
   * Inverse of normalizedToPixels, useful for debugging and testing.
   * 
   * @param x - Pixel x coordinate
   * @param y - Pixel y coordinate
   * @returns Object with normalized coordinates {x, y}
   */
  public pixelsToNormalized(x: number, y: number): { x: number; y: number } {
    return {
      x: x / this.width,
      y: y / this.height
    };
  }
  
  /**
   * Start the render loop using requestAnimationFrame
   * 
   * Runs at target FPS (20-30 fps) for smooth animation on mobile devices.
   * Uses requestAnimationFrame for optimal performance and battery life.
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.frameCount = 0;
    
    // Start render loop
    this.renderLoop(this.lastFrameTime);
  }
  
  /**
   * Stop the render loop
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Main render loop - called by requestAnimationFrame
   */
  private renderLoop = (currentTime: number): void => {
    if (!this.isRunning) {
      return;
    }
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
    
    // Calculate delta time
    const deltaTime = currentTime - this.lastFrameTime;
    const targetFrameTime = 1000 / this.targetFps;
    
    // Frame rate limiting - only render if enough time has passed
    if (deltaTime < targetFrameTime) {
      return;
    }
    
    // Update FPS counter
    this.frameCount++;
    const fpsDelta = currentTime - this.fpsUpdateTime;
    if (fpsDelta >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / fpsDelta);
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
    
    // Render the current frame
    this.render();
    
    this.lastFrameTime = currentTime;
  };
  
  /**
   * Update the current render state
   * 
   * Call this to update what will be drawn on the next frame.
   * The render loop will automatically draw the updated state.
   * 
   * @param state - Partial render state to update
   */
  public updateState(state: Partial<RenderState>): void {
    this.currentState = {
      ...this.currentState,
      ...state
    };
  }
  
  /**
   * Render a single frame
   * 
   * Clears the canvas and draws all elements based on current state.
   */
  private render(): void {
    // Clear canvas
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw pose landmarks if available
    if (this.currentState.landmarks) {
      this.drawPoseLandmarks(this.currentState.landmarks);
    }
    
    // Draw baseline reference visualization if available
    if (this.currentState.baseline) {
      this.drawBaselineReference(this.currentState.baseline);
    }
    
    // Draw spell casting visuals (Stage 1)
    if (this.currentState.spell) {
      this.drawWandTrail(this.currentState.spell.trail);
      this.drawOffHandRune(this.currentState.spell.offHandState);
      
      if (this.currentState.spell.recognizedSpell) {
        this.drawSpellResult(this.currentState.spell.recognizedSpell);
        this.drawSpellEffect(this.currentState.spell.recognizedSpell);
      }
    }
    
    // Draw game UI (Stage 2)
    if (this.currentState.game) {
      this.drawGameUI(this.currentState.game);
    }
    
    // Draw debug overlay if enabled
    if (this.debugMode) {
      this.drawDebugInfo();
    }
    
    // Draw debug mode toggle notification if present
    this.drawDebugModeNotification();
  }
  
  /**
   * Manually trigger a single render (for testing)
   * 
   * @internal
   */
  public renderFrame(): void {
    this.render();
  }
  
  /**
   * Draw pose landmarks with skeleton connections
   * 
   * Task 8.2: Pose landmark visualization
   * - Draws circles for each visible landmark (green if visible, red if low visibility)
   * - Draws skeleton lines connecting anatomical joints
   * - Requirements: 9.1, 9.2
   * 
   * @param landmarks - The pose landmarks to draw
   */
  private drawPoseLandmarks(landmarks: Landmarks): void {
    this.ctx.save();
    
    // First draw skeleton lines (so they appear behind the landmark circles)
    this.drawSkeletonLines(landmarks);
    
    // Then draw landmark circles on top
    for (let i = 0; i < landmarks.points.length; i++) {
      const landmark = landmarks.points[i];
      
      // Skip landmarks with no visibility data (shouldn't happen but defensive)
      if (landmark.visibility === undefined) {
        continue;
      }
      
      // Convert normalized coordinates to pixel coordinates
      const pixel = this.normalizedToPixels(landmark.x, landmark.y);
      
      // Determine color based on visibility threshold
      const isVisible = landmark.visibility >= this.visibilityThreshold;
      const color = isVisible ? '#00ff00' : '#ff0000'; // Green if visible, red if low visibility
      const radius = isVisible ? 5 : 3; // Larger circle for visible landmarks
      
      // Draw landmark circle
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(pixel.x, pixel.y, radius, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }
  
  /**
   * Draw baseline reference visualization
   * 
   * Task 8.4: Baseline reference visualization
   * - Draws baseline shoulder line
   * - Draws center position marker
   * - Draws baseline wrist positions
   * - Shows calibration quality metrics
   * Requirements: 2.7, 9.3
   * 
   * @param baseline - The baseline data to visualize
   */
  private drawBaselineReference(baseline: BaselineData): void {
    this.ctx.save();
    
    // Use yellow color for baseline reference (distinct from pose landmarks)
    const baselineColor = '#ffff00';
    const markerRadius = 8;
    const lineWidth = 3;
    
    // Calculate shoulder positions from center and shoulder width
    // Shoulders are horizontally aligned at the center Y position
    const halfWidth = baseline.shoulderWidth / 2;
    const leftShoulderPos = {
      x: baseline.centerPosition.x - halfWidth,
      y: baseline.centerPosition.y
    };
    const rightShoulderPos = {
      x: baseline.centerPosition.x + halfWidth,
      y: baseline.centerPosition.y
    };
    
    // 1. Draw baseline shoulder line
    const leftShoulderPixel = this.normalizedToPixels(leftShoulderPos.x, leftShoulderPos.y);
    const rightShoulderPixel = this.normalizedToPixels(rightShoulderPos.x, rightShoulderPos.y);
    
    this.ctx.strokeStyle = baselineColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(leftShoulderPixel.x, leftShoulderPixel.y);
    this.ctx.lineTo(rightShoulderPixel.x, rightShoulderPixel.y);
    this.ctx.stroke();
    
    // 2. Draw center position marker (cross)
    const centerPixel = this.normalizedToPixels(baseline.centerPosition.x, baseline.centerPosition.y);
    const crossSize = 10;
    
    this.ctx.strokeStyle = baselineColor;
    this.ctx.lineWidth = 2;
    
    // Vertical line of cross
    this.ctx.beginPath();
    this.ctx.moveTo(centerPixel.x, centerPixel.y - crossSize);
    this.ctx.lineTo(centerPixel.x, centerPixel.y + crossSize);
    this.ctx.stroke();
    
    // Horizontal line of cross
    this.ctx.beginPath();
    this.ctx.moveTo(centerPixel.x - crossSize, centerPixel.y);
    this.ctx.lineTo(centerPixel.x + crossSize, centerPixel.y);
    this.ctx.stroke();
    
    // Outer circle around center
    this.ctx.strokeStyle = baselineColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(centerPixel.x, centerPixel.y, markerRadius, 0, 2 * Math.PI);
    this.ctx.stroke();
    
    // 3. Draw baseline wrist positions (circles with labels)
    const wandWristPixel = this.normalizedToPixels(
      baseline.wandWristBaseline.x,
      baseline.wandWristBaseline.y
    );
    const offHandWristPixel = this.normalizedToPixels(
      baseline.offHandWristBaseline.x,
      baseline.offHandWristBaseline.y
    );
    
    // Wand hand wrist marker
    this.ctx.fillStyle = baselineColor;
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    this.ctx.arc(wandWristPixel.x, wandWristPixel.y, markerRadius, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.globalAlpha = 1.0;
    this.ctx.strokeStyle = baselineColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(wandWristPixel.x, wandWristPixel.y, markerRadius, 0, 2 * Math.PI);
    this.ctx.stroke();
    
    // Off-hand wrist marker
    this.ctx.fillStyle = baselineColor;
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    this.ctx.arc(offHandWristPixel.x, offHandWristPixel.y, markerRadius, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.globalAlpha = 1.0;
    this.ctx.strokeStyle = baselineColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(offHandWristPixel.x, offHandWristPixel.y, markerRadius, 0, 2 * Math.PI);
    this.ctx.stroke();
    
    // Add labels for wrists
    this.ctx.fillStyle = baselineColor;
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${baseline.wandHand === 'right' ? 'R' : 'L'} (wand)`, wandWristPixel.x, wandWristPixel.y);
    this.ctx.fillText(`${baseline.wandHand === 'right' ? 'L' : 'R'} (off)`, offHandWristPixel.x, offHandWristPixel.y);
    
    // Baseline metrics removed from display - use debug overlay (D key) for detailed info
    
    this.ctx.restore();
  }
  
  /**
   * Draw skeleton lines connecting anatomical joints
   * 
   * Follows MediaPipe Pose's 33-landmark model connections.
   * Only draws lines between landmarks that are both visible.
   * 
   * @param landmarks - The pose landmarks
   */
  private drawSkeletonLines(landmarks: Landmarks): void {
    // Define skeleton connections based on human anatomy
    // Each connection is a pair of landmark indices [from, to]
    const connections: [number, number][] = [
      // Face
      [PoseLandmark.LEFT_EYE, PoseLandmark.RIGHT_EYE],
      [PoseLandmark.LEFT_EYE, PoseLandmark.NOSE],
      [PoseLandmark.RIGHT_EYE, PoseLandmark.NOSE],
      [PoseLandmark.LEFT_EYE, PoseLandmark.LEFT_EAR],
      [PoseLandmark.RIGHT_EYE, PoseLandmark.RIGHT_EAR],
      [PoseLandmark.MOUTH_LEFT, PoseLandmark.MOUTH_RIGHT],
      
      // Shoulders
      [PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER],
      
      // Left arm
      [PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_ELBOW],
      [PoseLandmark.LEFT_ELBOW, PoseLandmark.LEFT_WRIST],
      [PoseLandmark.LEFT_WRIST, PoseLandmark.LEFT_PINKY],
      [PoseLandmark.LEFT_WRIST, PoseLandmark.LEFT_INDEX],
      [PoseLandmark.LEFT_WRIST, PoseLandmark.LEFT_THUMB],
      [PoseLandmark.LEFT_PINKY, PoseLandmark.LEFT_INDEX],
      
      // Right arm
      [PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_ELBOW],
      [PoseLandmark.RIGHT_ELBOW, PoseLandmark.RIGHT_WRIST],
      [PoseLandmark.RIGHT_WRIST, PoseLandmark.RIGHT_PINKY],
      [PoseLandmark.RIGHT_WRIST, PoseLandmark.RIGHT_INDEX],
      [PoseLandmark.RIGHT_WRIST, PoseLandmark.RIGHT_THUMB],
      [PoseLandmark.RIGHT_PINKY, PoseLandmark.RIGHT_INDEX],
      
      // Torso
      [PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_HIP],
      [PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_HIP],
      [PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP],
      
      // Left leg
      [PoseLandmark.LEFT_HIP, PoseLandmark.LEFT_KNEE],
      [PoseLandmark.LEFT_KNEE, PoseLandmark.LEFT_ANKLE],
      [PoseLandmark.LEFT_ANKLE, PoseLandmark.LEFT_HEEL],
      [PoseLandmark.LEFT_ANKLE, PoseLandmark.LEFT_FOOT_INDEX],
      [PoseLandmark.LEFT_HEEL, PoseLandmark.LEFT_FOOT_INDEX],
      
      // Right leg
      [PoseLandmark.RIGHT_HIP, PoseLandmark.RIGHT_KNEE],
      [PoseLandmark.RIGHT_KNEE, PoseLandmark.RIGHT_ANKLE],
      [PoseLandmark.RIGHT_ANKLE, PoseLandmark.RIGHT_HEEL],
      [PoseLandmark.RIGHT_ANKLE, PoseLandmark.RIGHT_FOOT_INDEX],
      [PoseLandmark.RIGHT_HEEL, PoseLandmark.RIGHT_FOOT_INDEX],
    ];
    
    this.ctx.strokeStyle = '#00ffff'; // Cyan color for skeleton lines
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    
    // Draw each connection
    for (const [fromIdx, toIdx] of connections) {
      // Ensure indices are within bounds
      if (fromIdx >= landmarks.points.length || toIdx >= landmarks.points.length) {
        continue;
      }
      
      const fromLandmark = landmarks.points[fromIdx];
      const toLandmark = landmarks.points[toIdx];
      
      // Only draw line if both landmarks are visible
      if (
        fromLandmark.visibility >= this.visibilityThreshold &&
        toLandmark.visibility >= this.visibilityThreshold
      ) {
        const fromPixel = this.normalizedToPixels(fromLandmark.x, fromLandmark.y);
        const toPixel = this.normalizedToPixels(toLandmark.x, toLandmark.y);
        
        this.ctx.beginPath();
        this.ctx.moveTo(fromPixel.x, fromPixel.y);
        this.ctx.lineTo(toPixel.x, toPixel.y);
        this.ctx.stroke();
      }
    }
  }
  
  /**
   * Draw basic debug information
   * 
   * Shows FPS and coordinate system info.
   * More detailed debug overlay will be implemented in task 8.3.
   */
  /**
   * Draw comprehensive debug information overlay
   * 
   * Task 10.6: Update debug overlay for Spell Duel
   * - Display off-hand state (IDLE, READY_ARMING, READY_ARMED, CAST, CANCEL)
   * - Display wand trail points count
   * - Display match scores for all 4 spell templates
   * - Display active thresholds
   * - Display current stroke metrics
   * - Display FPS counter
   * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8
   */
  private drawDebugInfo(): void {
    // Get or create debug overlay container
    let overlay = document.getElementById('debug-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'debug-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        color: white;
        pointer-events: none;
        z-index: 1000;
      `;
      document.body.appendChild(overlay);
    }

    // === LEFT COLUMN ===
    const leftColumn = document.createElement('div');
    leftColumn.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';

    // Performance section
    const perfSection = this.createDebugSection('PERFORMANCE', [
      `FPS: ${this.currentState.fps !== undefined ? this.currentState.fps.toFixed(1) : this.currentFps}`,
      `Canvas: ${this.width}x${this.height}`
    ]);
    leftColumn.appendChild(perfSection);

    // Spell casting state section
    const spellStateContent: string[] = [];
    if (this.currentState.spell) {
      spellStateContent.push(`Off-hand: ${this.currentState.spell.offHandState}`);
      spellStateContent.push(`Trail points: ${this.currentState.spell.trail.length}`);
      
      if (this.currentState.spell.recognizedSpell) {
        const spell = this.currentState.spell.recognizedSpell;
        spellStateContent.push(`Last spell: ${spell.type}`);
        spellStateContent.push(`Confidence: ${(spell.confidence * 100).toFixed(1)}%`);
      }
    } else {
      spellStateContent.push('<span style="color: #888;">No spell data</span>');
    }
    const spellStateSection = this.createDebugSection('SPELL CASTING', spellStateContent);
    leftColumn.appendChild(spellStateSection);

    // === RIGHT COLUMN ===
    const rightColumn = document.createElement('div');
    rightColumn.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';

    // Match scores section (all templates)
    const scoresContent: string[] = [];
    if (this.currentState.spell?.allScores && this.currentState.spell.allScores.length > 0) {
      for (const { type, score } of this.currentState.spell.allScores) {
        scoresContent.push(`${type}: ${score.toFixed(3)}`);
      }
    } else {
      scoresContent.push('<span style="color: #888;">No match scores</span>');
    }
    const scoresSection = this.createDebugSection('MATCH SCORES', scoresContent);
    rightColumn.appendChild(scoresSection);

    // Update overlay
    overlay.innerHTML = '';
    overlay.appendChild(leftColumn);
    overlay.appendChild(rightColumn);
  }

  /**
   * Helper method to create a debug section with title and content
   */
  private createDebugSection(title: string, content: string[]): HTMLDivElement {
    const section = document.createElement('div');
    section.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      padding: 8px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'color: #ffff00; font-weight: bold; margin-bottom: 5px;';
    titleEl.textContent = `=== ${title} ===`;
    section.appendChild(titleEl);

    const contentEl = document.createElement('div');
    contentEl.style.cssText = 'color: white; line-height: 1.4;';
    contentEl.innerHTML = content.join('<br>');
    section.appendChild(contentEl);

    return section;
  }

  
  /**
   * Enable or disable debug mode
   * 
   * @param enabled - Whether to show debug overlay
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.saveDebugModePreference(enabled);
  }
  
  /**
   * Toggle debug mode on/off
   * 
   * @returns The new debug mode state
   */
  public toggleDebugMode(): boolean {
    this.debugMode = !this.debugMode;
    this.saveDebugModePreference(this.debugMode);
    this.showDebugModeNotification(this.debugMode);
    return this.debugMode;
  }
  
  /**
   * Set up keyboard event listener for debug mode toggle
   * 
   * Task 8.5: Add keyboard shortcut (e.g., 'D' key) to toggle debug overlay
   * Requirements: 9.6
   * 
   * @private
   */
  private setupDebugToggle(): void {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Check if 'D' key was pressed (case-insensitive)
      if (event.key === 'd' || event.key === 'D') {
        // Don't trigger if user is typing in an input field
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        
        this.toggleDebugMode();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    // Store reference for cleanup (optional, if we need to remove listener later)
    // We don't expose this for now, but could add removeDebugToggle() method if needed
  }
  
  /**
   * Load debug mode preference from localStorage
   * 
   * Task 8.5: Store debug mode preference in localStorage
   * Requirements: 9.6
   * 
   * @returns The stored debug mode preference, or null if not found or unavailable
   * @private
   */
  private loadDebugModePreference(): boolean | null {
    try {
      const stored = localStorage.getItem(DEBUG_MODE_STORAGE_KEY);
      if (stored === null) {
        return null;
      }
      return stored === 'true';
    } catch (error) {
      // localStorage might be unavailable (private browsing, storage full, etc.)
      console.warn('Failed to load debug mode preference from localStorage:', error);
      return null;
    }
  }
  
  /**
   * Save debug mode preference to localStorage
   * 
   * Task 8.5: Store debug mode preference in localStorage
   * Requirements: 9.6
   * 
   * @param enabled - The debug mode state to save
   * @private
   */
  private saveDebugModePreference(enabled: boolean): void {
    try {
      localStorage.setItem(DEBUG_MODE_STORAGE_KEY, enabled.toString());
    } catch (error) {
      // localStorage might be unavailable (private browsing, storage full, etc.)
      // Graceful degradation - continue without saving preference
      console.warn('Failed to save debug mode preference to localStorage:', error);
    }
  }
  
  /**
   * Show a brief notification when debug mode is toggled
   * 
   * Provides visual feedback to the user when pressing 'D' key
   * 
   * @param enabled - The new debug mode state
   * @private
   */
  private showDebugModeNotification(enabled: boolean): void {
    // Draw notification on next frame
    const message = enabled ? 'Debug Mode: ON' : 'Debug Mode: OFF';
    const color = enabled ? '#00ff00' : '#ff0000';
    
    // Store notification state temporarily
    const notification = {
      message,
      color,
      startTime: performance.now(),
      duration: 1000 // Show for 1 second
    };
    
    // Add to current state for rendering
    this.currentState.debug = {
      ...this.currentState.debug,
      notification
    };
  }
  
  /**
   * Draw debug mode toggle notification
   * 
   * Shows a brief message in the center of the screen when debug mode is toggled
   * 
   * @private
   */
  private drawDebugModeNotification(): void {
    const notification = this.currentState.debug?.notification;
    
    if (!notification) {
      return;
    }
    
    const currentTime = performance.now();
    const elapsed = currentTime - notification.startTime;
    
    // Check if notification should still be visible
    if (elapsed > notification.duration) {
      // Clear notification from state
      if (this.currentState.debug) {
        delete this.currentState.debug.notification;
      }
      return;
    }
    
    // Calculate fade-out opacity (fade in last 200ms)
    const fadeOutStart = notification.duration - 200;
    let opacity = 1.0;
    if (elapsed > fadeOutStart) {
      opacity = 1.0 - ((elapsed - fadeOutStart) / 200);
    }
    
    this.ctx.save();
    
    // Draw semi-transparent background
    this.ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * opacity})`;
    const padding = 20;
    const fontSize = 24;
    this.ctx.font = `bold ${fontSize}px monospace`;
    
    const textMetrics = this.ctx.measureText(notification.message);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;
    
    const bgWidth = textWidth + padding * 2;
    const bgHeight = textHeight + padding * 2;
    const bgX = (this.width - bgWidth) / 2;
    const bgY = 100; // Position near top of screen
    
    this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
    
    // Draw text
    this.ctx.fillStyle = notification.color;
    this.ctx.globalAlpha = opacity;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      notification.message,
      this.width / 2,
      bgY + bgHeight / 2
    );
    
    this.ctx.restore();
  }
  
  /**
   * Get current FPS
   */
  public getFps(): number {
    return this.currentFps;
  }
  
  /**
   * Draw wand trail (Task 10.2)
   * 
   * **Validates: Requirements 5.3, 5.4**
   */
  private drawWandTrail(trail: TrailPoint[]): void {
    if (!trail || trail.length < 2) return;
    
    this.ctx.save();
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Draw trail as polyline with fade
    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1];
      const curr = trail[i];
      
      // Calculate alpha based on age (fade from 1.0 to 0.0 over 500ms)
      const alpha = Math.max(0, 1 - (curr.age / 500));
      
      // Convert normalized coordinates to pixels
      const prevPixel = this.normalizedToPixels(prev.x, prev.y);
      const currPixel = this.normalizedToPixels(curr.x, curr.y);
      
      // Golden/orange color for wand trail
      this.ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
      
      this.ctx.beginPath();
      this.ctx.moveTo(prevPixel.x, prevPixel.y);
      this.ctx.lineTo(currPixel.x, currPixel.y);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }
  
  /**
   * Draw off-hand rune glow (Task 10.3)
   * 
   * **Validates: Requirement 4.4**
   */
  private drawOffHandRune(offHandState: OffHandState): void {
    // Only draw when READY_ARMED
    if (offHandState !== OffHandState.READY_ARMED) return;
    
    // Find off-hand wrist in current landmarks
    if (!this.currentState.landmarks || !this.currentState.baseline) return;
    
    const offHandWristIndex = this.currentState.baseline.wandHand === WandHand.LEFT 
      ? PoseLandmark.RIGHT_WRIST 
      : PoseLandmark.LEFT_WRIST;
    
    const offHandWrist = this.currentState.landmarks.points[offHandWristIndex];
    if (!offHandWrist || offHandWrist.visibility < this.visibilityThreshold) return;
    
    const pixel = this.normalizedToPixels(offHandWrist.x, offHandWrist.y);
    
    this.ctx.save();
    
    // Pulsing glow effect (animate between 0.7-1.0 alpha)
    const pulseAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 300);
    
    // Draw glowing circle with blur
    this.ctx.shadowBlur = 30;
    this.ctx.shadowColor = `rgba(0, 191, 255, ${pulseAlpha})`;
    this.ctx.fillStyle = `rgba(0, 191, 255, ${pulseAlpha * 0.5})`;
    
    this.ctx.beginPath();
    this.ctx.arc(pixel.x, pixel.y, 40, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Inner bright circle
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = `rgba(135, 206, 250, ${pulseAlpha})`;
    this.ctx.beginPath();
    this.ctx.arc(pixel.x, pixel.y, 20, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  /**
   * Draw spell result overlay (Task 10.4)
   * 
   * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
   */
  private drawSpellResult(spell: RecognizedSpell): void {
    this.ctx.save();
    
    const centerX = this.width / 2;
    const centerY = this.height / 3;
    
    // Spell name in smaller text for better screen visibility
    this.ctx.fillStyle = '#00ff41';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Add text shadow for visibility
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    this.ctx.shadowBlur = 10;
    
    this.ctx.fillText(spell.type, centerX, centerY);
    
    // Confidence percentage
    this.ctx.font = '14px monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(
      `${(spell.confidence * 100).toFixed(1)}% confidence`,
      centerX,
      centerY + 25
    );
    
    this.ctx.restore();
  }
  
  /**
   * Draw placeholder spell effects (Task 10.5)
   * 
   * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
   */
  private drawSpellEffect(spell: RecognizedSpell): void {
    // All spells get effects now (no FIZZLE)
    
    this.ctx.save();
    
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Simple procedural effects (no sprites)
    switch (spell.type) {
      case SpellType.SHIELD:
        // Glowing circle outline around center
        this.ctx.strokeStyle = 'rgba(100, 149, 237, 0.6)';
        this.ctx.lineWidth = 5;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = 'rgba(100, 149, 237, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 150, 0, 2 * Math.PI);
        this.ctx.stroke();
        break;
        
      case SpellType.LIGHTNING:
        // Zigzag lightning bolt
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        this.ctx.lineWidth = 4;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
        
        this.ctx.beginPath();
        const startX = this.width * 0.2;
        const endX = this.width * 0.8;
        const midX1 = this.width * 0.4;
        const midX2 = this.width * 0.6;
        
        this.ctx.moveTo(startX, centerY);
        this.ctx.lineTo(midX1, centerY - 50);
        this.ctx.lineTo(midX1 + 20, centerY);
        this.ctx.lineTo(midX2, centerY + 50);
        this.ctx.lineTo(midX2 + 20, centerY);
        this.ctx.lineTo(endX, centerY);
        this.ctx.stroke();
        break;
        
      case SpellType.FIREBALL:
        // Orange/red circle projectile
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
        gradient.addColorStop(0, 'rgba(255, 140, 0, 0.9)');
        gradient.addColorStop(0.5, 'rgba(255, 69, 0, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowBlur = 30;
        this.ctx.shadowColor = 'rgba(255, 69, 0, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI);
        this.ctx.fill();
        break;
        
      case SpellType.FROST:
        // Blue wave effect expanding outward
        this.ctx.strokeStyle = 'rgba(0, 191, 255, 0.6)';
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = 'rgba(0, 191, 255, 0.8)';
        
        // Draw multiple expanding circles
        for (let i = 0; i < 3; i++) {
          const radius = 80 + i * 40;
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          this.ctx.stroke();
        }
        break;
    }
    
    this.ctx.restore();
  }
  
  /**
   * Get canvas dimensions
   */
  public getDimensions(): { width: number; height: number } {
    return {
      width: this.width,
      height: this.height
    };
  }

  /**
   * Draw game UI overlay (round timer, scores, combos)
   * **Validates: Requirements 18.6, 19.4**
   */
  public drawGameUI(gameState: RenderState['game']): void {
    if (!gameState) return;

    this.ctx.save();

    // Add text shadow for visibility
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    this.ctx.shadowBlur = 4;

    // Draw round timer at top center
    this.drawRoundTimer(gameState.roundTimer);

    // Draw scores at top left and right
    this.drawScores(gameState.playerScore, gameState.aiScore);

    // Draw combos below scores
    this.drawCombos(gameState.playerCombo, gameState.aiCombo);

    // Draw health and mana bars
    this.drawHealthBars(gameState.playerHealth, gameState.aiHealth);
    this.drawManaBars(gameState.playerMana, gameState.aiMana);

    this.ctx.restore();
  }

  /**
   * Draw round timer
   * **Validates: Requirement 18.6**
   */
  private drawRoundTimer(timer: string): void {
    const centerX = this.width / 2;
    const y = 30;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 36px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    // Check if time is running out (< 10 seconds) for warning color
    const timeParts = timer.split(':');
    const totalSeconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
    
    if (totalSeconds <= 10 && totalSeconds > 0) {
      // Flash red when time is running out
      const flash = Math.floor(Date.now() / 500) % 2 === 0;
      this.ctx.fillStyle = flash ? '#ff0000' : '#ffffff';
    }

    this.ctx.fillText(timer, centerX, y);
  }

  /**
   * Draw player and AI scores
   * **Validates: Requirement 19.4**
   */
  private drawScores(playerScore: number, aiScore: number): void {
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textBaseline = 'top';

    // Player score (left)
    this.ctx.fillStyle = '#00ff41';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`P: ${playerScore}`, 20, 20);

    // AI score (right)
    this.ctx.fillStyle = '#ff4136';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`AI: ${aiScore}`, this.width - 20, 20);
  }

  /**
   * Draw combo indicators
   * **Validates: Requirement 19.2**
   */
  private drawCombos(playerCombo: number, aiCombo: number): void {
    if (playerCombo === 0 && aiCombo === 0) return;

    this.ctx.font = 'bold 18px monospace';
    this.ctx.textBaseline = 'top';

    // Player combo (left)
    if (playerCombo > 0) {
      this.ctx.fillStyle = '#ffff00';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`${playerCombo}x COMBO!`, 20, 50);
    }

    // AI combo (right)
    if (aiCombo > 0) {
      this.ctx.fillStyle = '#ffff00';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${aiCombo}x COMBO!`, this.width - 20, 50);
    }
  }

  /**
   * Draw health bars for both wizards
   * **Validates: Requirements 14.3, 14.4**
   */
  private drawHealthBars(playerHealth: number, aiHealth: number): void {
    const barWidth = 200;
    const barHeight = 20;
    const y = this.height - 60;

    // Player health bar (left)
    this.drawBar(
      20,
      y,
      barWidth,
      barHeight,
      playerHealth,
      100,
      this.getHealthColor(playerHealth),
      'HP'
    );

    // AI health bar (right)
    this.drawBar(
      this.width - 20 - barWidth,
      y,
      barWidth,
      barHeight,
      aiHealth,
      100,
      this.getHealthColor(aiHealth),
      'HP'
    );
  }

  /**
   * Draw mana bars for both wizards
   * **Validates: Requirements 14.5, 14.6**
   */
  private drawManaBars(playerMana: number, aiMana: number): void {
    const barWidth = 200;
    const barHeight = 15;
    const y = this.height - 35;

    // Player mana bar (left)
    this.drawBar(
      20,
      y,
      barWidth,
      barHeight,
      playerMana,
      100,
      '#1e90ff',
      'MP'
    );

    // AI mana bar (right)
    this.drawBar(
      this.width - 20 - barWidth,
      y,
      barWidth,
      barHeight,
      aiMana,
      100,
      '#1e90ff',
      'MP'
    );
  }

  /**
   * Draw a resource bar with label
   */
  private drawBar(
    x: number,
    y: number,
    width: number,
    height: number,
    value: number,
    maxValue: number,
    color: string,
    label: string
  ): void {
    const fillWidth = (value / maxValue) * width;

    // Background (empty bar)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x, y, width, height);

    // Filled portion
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, fillWidth, height);

    // Border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);

    // Label
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${label}: ${Math.floor(value)}`, x + 5, y + height / 2);
  }

  /**
   * Get health bar color based on health percentage
   */
  private getHealthColor(health: number): string {
    if (health > 60) {
      return '#00ff00'; // Green
    } else if (health > 30) {
      return '#ffff00'; // Yellow
    } else {
      return '#ff0000'; // Red
    }
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', () => this.resizeCanvas());
  }
}
