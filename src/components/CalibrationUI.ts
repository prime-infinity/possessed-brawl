/**
 * CalibrationUI Component
 * 
 * Provides visual guidance and feedback during the calibration process.
 * Displays text prompts, stick-figure diagrams, and real-time confirmation.
 * 
 * **Validates: Requirements 2.1, 2.3**
 */

import { CalibrationState } from './Calibrator';

/**
 * Configuration for CalibrationUI
 */
export interface CalibrationUIConfig {
  /**
   * Canvas element for rendering
   */
  canvas: HTMLCanvasElement;
  
  /**
   * Text color for instructions
   * @default '#ffffff'
   */
  textColor: string;
  
  /**
   * Color for stick figure diagram
   * @default '#00ff00'
   */
  diagramColor: string;
  
  /**
   * Color for confirmation feedback
   * @default '#00ff00'
   */
  confirmationColor: string;
  
  /**
   * Font size for main instructions
   * @default 24
   */
  fontSize: number;
}

/**
 * Default configuration for CalibrationUI
 */
const DEFAULT_CONFIG: CalibrationUIConfig = {
  canvas: null as any,  // Must be provided
  textColor: '#ffffff',
  diagramColor: '#00ff00',
  confirmationColor: '#00ff00',
  fontSize: 24
};

/**
 * CalibrationUI implementation
 * 
 * **Validates: Requirements 2.1, 2.3**
 */
export class CalibrationUI {
  private config: CalibrationUIConfig;
  private ctx: CanvasRenderingContext2D;
  private isReadyStanceDetected: boolean = false;
  
  constructor(config: Partial<CalibrationUIConfig> & { canvas: HTMLCanvasElement }) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    const ctx = this.config.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
  }

  /**
   * Update ready stance detection status for real-time feedback
   * 
   * **Validates: Requirement 2.3** - display real-time confirmation
   * 
   * @param isDetected - Whether ready stance is currently detected
   */
  setGuardDetected(isDetected: boolean): void {
    this.isReadyStanceDetected = isDetected;
  }
  
  /**
   * Alias for backward compatibility
   */
  setReadyStanceDetected(isDetected: boolean): void {
    this.setGuardDetected(isDetected);
  }

  /**
   * Render calibration UI for current state
   * 
   * **Validates: Requirements 2.1, 2.3** - display calibration UI elements
   * 
   * @param state - Current calibration state
   * @param progress - Calibration progress (0-1)
   */
  render(state: CalibrationState, progress: number): void {
    const canvas = this.config.canvas;
    const ctx = this.ctx;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clear overlay for non-waiting/recording states
    if (state !== CalibrationState.WAITING_FOR_READY_STANCE && 
        state !== CalibrationState.RECORDING && 
        state !== CalibrationState.COMPLETED) {
      this.removeTextOverlay();
    }
    
    switch (state) {
      case CalibrationState.NOT_STARTED:
      case CalibrationState.SELECTING_WAND_HAND:
        this.renderNotStartedScreen();
        break;
        
      case CalibrationState.WAITING_FOR_READY_STANCE:
        this.renderWaitingScreen();
        break;
        
      case CalibrationState.RECORDING:
        this.renderRecordingScreen(progress);
        break;
        
      case CalibrationState.COMPLETED:
        this.renderCompletedScreen();
        break;
        
      case CalibrationState.FAILED:
        this.renderFailedScreen();
        break;
    }
  }

  /**
   * Render not started screen
   */
  private renderNotStartedScreen(): void {
    const canvas = this.config.canvas;
    const ctx = this.ctx;
    
    ctx.save();
    ctx.fillStyle = this.config.textColor;
    ctx.font = `${this.config.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(
      'Press any key to begin calibration',
      canvas.width / 2,
      canvas.height / 2
    );
    
    ctx.restore();
  }
  /**
   * Update HTML text overlay (cleaner than canvas text)
   */
  private updateTextOverlay(title: string, subtitle: string, showProgress: boolean = false, progress: number = 0): void {
    let overlay = document.getElementById('calibration-text-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'calibration-text-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = showProgress ? '50%' : '20px';
      overlay.style.left = showProgress ? '50%' : '0';
      overlay.style.right = showProgress ? 'auto' : '0';
      overlay.style.transform = showProgress ? 'translate(-50%, -50%)' : 'none';
      overlay.style.textAlign = 'center';
      overlay.style.color = '#fff';
      overlay.style.zIndex = '999';
      overlay.style.pointerEvents = 'none';
      document.body.appendChild(overlay);
    }
    
    let progressHTML = '';
    if (showProgress) {
      progressHTML = `<div style="width: 300px; height: 8px; background: rgba(255,255,255,0.2); border-radius: 10px; margin: 20px auto; overflow: hidden;"><div style="width: ${progress * 100}%; height: 100%; background: linear-gradient(90deg, #00ff41, #00d9ff); transition: width 0.3s;"></div></div><div style="font-size: 18px; font-weight: 700; color: #00ff41;">${Math.round(progress * 100)}%</div>`;
    }
    
    overlay.innerHTML = `<div style="font-size: 24px; font-weight: 600; margin-bottom: 12px;">${title}</div><div style="font-size: 16px; color: #ccc; margin-bottom: 10px;">${subtitle}</div>${progressHTML}`;
  }

  /**
   * Remove text overlay
   */
  private removeTextOverlay(): void {
    const overlay = document.getElementById('calibration-text-overlay');
    if (overlay) overlay.remove();
  }



  /**
   * Render waiting for ready stance screen
   * 
   * **Validates: Requirement 2.1** - display text prompt and stick-figure diagram
   */
  private renderWaitingScreen(): void {
    const canvas = this.config.canvas;
    const ctx = this.ctx;
    
    // Use HTML overlay for crisp text
    this.updateTextOverlay('Assume Ready Stance', 'Raise your off-hand to shoulder height, keep wand hand relaxed');

    // Draw stick figure demonstration
    this.drawReadyStanceDiagram();

    // Draw real-time confirmation if ready stance detected
    if (this.isReadyStanceDetected) {
      this.drawConfirmation();
    }
  }

  /**
   * Render recording screen with progress bar
   * 
   * **Validates: Requirement 2.3** - display calibration progress
   * 
   * @param progress - Progress value (0-1)
   */
  private renderRecordingScreen(progress: number): void {
    this.updateTextOverlay('Hold Still', 'Recording calibration data...', true, progress);
  }

  /**
   * Render calibration completed screen
   */
  private renderCompletedScreen(): void {
    const canvas = this.config.canvas;
    const ctx = this.ctx;
    
    // Use HTML overlay
    this.updateTextOverlay('✓ Calibration Complete!', 'Get ready to fight...');
  }

  /**
   * Render calibration failed screen
   * 
   * **Validates: Requirement 2.3** - provide retry option
   */
  private renderFailedScreen(): void {
    const canvas = this.config.canvas;
    const ctx = this.ctx;
    
    ctx.save();
    ctx.fillStyle = '#ff0000';
    ctx.font = `${this.config.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(
      '✗ Calibration Failed',
      canvas.width / 2,
      canvas.height / 2 - this.config.fontSize
    );
    
    ctx.fillStyle = this.config.textColor;
    ctx.font = `${this.config.fontSize * 0.7}px Arial`;
    ctx.fillText(
      'Not enough good frames collected',
      canvas.width / 2,
      canvas.height / 2 + this.config.fontSize * 0.3
    );
    
    ctx.fillText(
      'Press R to retry',
      canvas.width / 2,
      canvas.height / 2 + this.config.fontSize * 1.5
    );
    
    ctx.restore();
  }

  /**
   * Draw stick figure demonstrating ready stance
   * 
   * **Validates: Requirement 2.1** - show stick-figure diagram
   */
  private drawReadyStanceDiagram(): void {
    const canvas = this.config.canvas;
    const ctx = this.ctx;
    
    // Center the diagram
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 80;
    
    // Scale factor for the diagram
    const scale = 70;
    
    ctx.save();
    ctx.strokeStyle = this.config.diagramColor;
    ctx.fillStyle = this.config.diagramColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Head
    const headRadius = scale * 0.15;
    ctx.beginPath();
    ctx.arc(centerX, centerY - scale * 1.2, headRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Body (torso)
    const shoulderY = centerY - scale * 0.9;
    const hipY = centerY + scale * 0.1;
    ctx.beginPath();
    ctx.moveTo(centerX, shoulderY);
    ctx.lineTo(centerX, hipY);
    ctx.stroke();
    
    // Shoulders
    const shoulderHalfWidth = scale * 0.4;
    ctx.beginPath();
    ctx.moveTo(centerX - shoulderHalfWidth, shoulderY);
    ctx.lineTo(centerX + shoulderHalfWidth, shoulderY);
    ctx.stroke();
    
    // Left arm (bent, hand near face)
    const leftShoulderX = centerX - shoulderHalfWidth;
    const leftElbowX = centerX - scale * 0.15;
    const leftElbowY = centerY - scale * 0.3;
    const leftWristX = centerX - scale * 0.2;
    const leftWristY = centerY - scale * 1.0;  // Near face
    
    ctx.beginPath();
    ctx.moveTo(leftShoulderX, shoulderY);
    ctx.lineTo(leftElbowX, leftElbowY);
    ctx.lineTo(leftWristX, leftWristY);
    ctx.stroke();
    
    // Right arm (bent, hand near face)
    const rightShoulderX = centerX + shoulderHalfWidth;
    const rightElbowX = centerX + scale * 0.15;
    const rightElbowY = centerY - scale * 0.3;
    const rightWristX = centerX + scale * 0.2;
    const rightWristY = centerY - scale * 1.0;  // Near face
    
    ctx.beginPath();
    ctx.moveTo(rightShoulderX, shoulderY);
    ctx.lineTo(rightElbowX, rightElbowY);
    ctx.lineTo(rightWristX, rightWristY);
    ctx.stroke();
    
    // Highlight hands with circles
    ctx.beginPath();
    ctx.arc(leftWristX, leftWristY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(rightWristX, rightWristY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs (simple)
    const hipHalfWidth = scale * 0.15;
    const footY = centerY + scale * 0.8;
    
    ctx.beginPath();
    ctx.moveTo(centerX - hipHalfWidth, hipY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX + hipHalfWidth, hipY);
    ctx.stroke();
    
    ctx.restore();
  }

  /**
   * Draw confirmation indicator when ready stance detected
   * 
   * **Validates: Requirement 2.3** - display real-time confirmation
   */
  private drawConfirmation(): void {
    const canvas = this.config.canvas;
    const ctx = this.ctx;
    
    ctx.save();
    ctx.fillStyle = this.config.confirmationColor;
    ctx.font = `${this.config.fontSize * 0.9}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    ctx.fillText(
      '✓ Ready Stance Detected',
      canvas.width / 2,
      canvas.height - 100
    );
    
    ctx.restore();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CalibrationUIConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
