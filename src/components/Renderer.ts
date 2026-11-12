/**
 * Renderer Component - Stage 1 Debug Renderer
 * 
 * Provides basic Canvas rendering infrastructure:
 * - Initialize Canvas 2D context
 * - Set up requestAnimationFrame render loop
 * - Implement coordinate transformation (normalized to canvas pixels)
 * 
 * Task 8.1: Create basic Canvas rendering infrastructure
 * Requirements: 9.1
 */

import { Landmarks, DetectedMove, BaselineData } from '../types';

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
    this.debugMode = config.debugMode ?? false;
    this.targetFps = config.targetFps ?? 30;
    
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
    
    // Draw current state
    // TODO: Implement specific drawing methods in subsequent tasks
    // - Task 8.2: Pose landmark visualization
    // - Task 8.3: Debug text overlay
    // - Task 8.4: Baseline reference visualization
    
    if (this.debugMode) {
      this.drawDebugInfo();
    }
  }
  
  /**
   * Draw basic debug information
   * 
   * Shows FPS and coordinate system info.
   * More detailed debug overlay will be implemented in task 8.3.
   */
  private drawDebugInfo(): void {
    this.ctx.save();
    
    // Draw FPS counter
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`FPS: ${this.currentFps}`, 10, 20);
    
    // Draw canvas dimensions
    this.ctx.fillText(`Canvas: ${this.width}x${this.height}`, 10, 40);
    
    // Draw coordinate system reference
    this.ctx.fillStyle = '#666';
    this.ctx.fillText('0,0 (top-left)', 10, this.height - 40);
    this.ctx.fillText(`${this.width},${this.height} (bottom-right)`, this.width - 200, this.height - 20);
    
    this.ctx.restore();
  }
  
  /**
   * Enable or disable debug mode
   * 
   * @param enabled - Whether to show debug overlay
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
  
  /**
   * Get current FPS
   */
  public getFps(): number {
    return this.currentFps;
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
   * Clean up resources
   */
  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', () => this.resizeCanvas());
  }
}
