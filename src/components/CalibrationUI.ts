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
  private isGuardDetected: boolean = false;
  
  constructor(config: Partial<CalibrationUIConfig> & { canvas: HTMLCanvasElement }) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    const ctx = this.config.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
  }

  /**
   * Update guard detection status for real-time feedback
   * 
   * **Validates: Requirement 2.3** - display real-time confirmation
   * 
   * @param isDetected - Whether guard position is currently detected
   */
  setGuardDetected(isDetected: boolean): void {
    this.isGuardDetected = isDetected;
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

    switch (state) {
      case CalibrationState.NOT_STARTED:
        this.renderNotStartedScreen();
        break;
        
      case CalibrationState.WAITING_FOR_GUARD:
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
   * Render waiting for guard position screen
   * 
   * **Validates: Requirement 2.1** - display text prompt and stick-figure diagram
   */
  private renderWaitingScreen(): void {
    const canvas = this.config.canvas;
    const ctx = this.ctx;
    
    // Draw instruction text
    ctx.save();
    ctx.fillStyle = this.config.textColor;
    ctx.font = `${this.config.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const instructionY = 50;
    ctx.fillText(
      'Assume Guard Position',
      canvas.width / 2,
      instructionY
    );
    
    ctx.font = `${this.config.fontSize * 0.7}px Arial`;
    ctx.fillText(
      'Raise both hands to your face, like a boxer',
      canvas.width / 2,
      instructionY + this.config.fontSize + 10
    );
    
    ctx.restore();

    // Draw stick figure demonstration
    this.drawGuardPositionDiagram();

    // Draw real-time confirmation if guard position detected
    if (this.isGuardDetected) {
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
    const canvas = this.config.canvas;
    const ctx = this.ctx;
    
    // Draw instruction text
    ctx.save();
    ctx.fillStyle = this.config.textColor;
    ctx.font = `${this.config.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    ctx.fillText(
      'Hold Still - Recording...',
      canvas.width / 2,
      50
    );
    
    ctx.restore();

    // Draw progress bar
    const barWidth = 400;
    const barHeight = 30;
    const barX = (canvas.width - barWidth) / 2;
    const barY = canvas.height / 2 - barHeight / 2;
    
    ctx.save();
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress fill
    ctx.fillStyle = this.config.confirmationColor;
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    
    // Border
    ctx.strokeStyle = this.config.textColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Percentage text
    ctx.fillStyle = this.config.textColor;
    ctx.font = `${this.config.fontSize * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.round(progress * 100)}%`,
      canvas.width / 2,
      barY + barHeight / 2
    );
    
    ctx.restore();
  }

  /**
   * Render calibration completed screen
   */
  private renderCompletedScreen(): void {
    const canvas = this.config.canvas;
    const ctx = this.ctx;
    
    ctx.save();
    ctx.fillStyle = this.config.confirmationColor;
    ctx.font = `${this.config.fontSize * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(
      '✓ Calibration Complete!',
      canvas.width / 2,
      canvas.height / 2
    );
    
    ctx.font = `${this.config.fontSize * 0.7}px Arial`;
    ctx.fillStyle = this.config.textColor;
    ctx.fillText(
      'Get ready to fight...',
      canvas.width / 2,
      canvas.height / 2 + this.config.fontSize * 1.5
    );
    
    ctx.restore();
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
   * Draw stick figure demonstrating guard position
   * 
   * **Validates: Requirement 2.1** - show stick-figure diagram
   */
  private drawGuardPositionDiagram(): void {
    const canvas = this.config.canvas;
    const ctx = this.ctx;
    
    // Center the diagram
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 50;
    
    // Scale factor for the diagram
    const scale = 100;
    
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
    const leftElbowX = centerX - scale * 0.6;
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
    const rightElbowX = centerX + scale * 0.6;
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
    
    // Left leg
    ctx.beginPath();
    ctx.moveTo(centerX - hipHalfWidth, hipY);
    ctx.lineTo(centerX - hipHalfWidth, footY);
    ctx.stroke();
    
    // Right leg
    ctx.beginPath();
    ctx.moveTo(centerX + hipHalfWidth, hipY);
    ctx.lineTo(centerX + hipHalfWidth, footY);
    ctx.stroke();
    
    ctx.restore();
  }

  /**
   * Draw confirmation indicator when guard position detected
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
      '✓ Guard Position Detected',
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
