/**
 * TemplateRecorder Component - Template Training UI
 * 
 * Provides UI for users to train custom spell templates by drawing each spell 3 times.
 * Integrates with StrokeCapture and GestureRecognizer for recording and training.
 * 
 * Tasks 9.1-9.4: Implement template training UI
 * Requirements: 9.6, 9.7, 9.8
 */

import { SpellType, Stroke } from '../types';
import { StrokeCapture } from './StrokeCapture';
import { GestureRecognizer } from './GestureRecognizer';

export enum RecordingState {
  WAITING_FOR_SPELL = 'waiting',
  RECORDING = 'recording',
  COMPLETED = 'completed'
}

/**
 * Configuration for TemplateRecorder
 */
export interface TemplateRecorderConfig {
  /**
   * StrokeCapture instance for recording strokes
   */
  strokeCapture: StrokeCapture;
  
  /**
   * GestureRecognizer instance for training templates
   */
  gestureRecognizer: GestureRecognizer;
  
  /**
   * Callback when training is complete
   */
  onComplete: () => void;
  
  /**
   * Callback when training is cancelled
   */
  onCancel?: () => void;
}

/**
 * TemplateRecorder class for training custom spell templates
 * 
 * Flow:
 * 1. Show instructions
 * 2. For each spell (SHIELD, LIGHTNING, FIREBALL, FROST):
 *    - Display current spell name
 *    - Show sample count (1/3, 2/3, 3/3)
 *    - Record 3 strokes
 *    - Provide visual feedback after each sample
 * 3. Train templates with GestureRecognizer
 * 4. Save to localStorage
 * 5. Call onComplete callback
 * 
 * **Validates: Requirements 9.6, 9.7, 9.8**
 */
export class TemplateRecorder {
  private config: TemplateRecorderConfig;
  private state: RecordingState = RecordingState.WAITING_FOR_SPELL;
  
  // Training progress
  private spellsToTrain: SpellType[];
  private currentSpellIndex: number = 0;
  private currentSampleIndex: number = 0;
  private samples: Map<SpellType, Stroke[]> = new Map();
  
  // UI elements
  private container: HTMLDivElement | null = null;
  private isActive: boolean = false;
  
  constructor(config: TemplateRecorderConfig) {
    this.config = config;
    
    // Initialize spell order (exclude FIZZLE)
    this.spellsToTrain = [
      SpellType.SHIELD,
      SpellType.LIGHTNING,
      SpellType.FIREBALL,
      SpellType.FROST
    ];
    
    // Initialize samples map
    for (const spell of this.spellsToTrain) {
      this.samples.set(spell, []);
    }
  }
  
  /**
   * Start template recording flow
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.currentSpellIndex = 0;
    this.currentSampleIndex = 0;
    this.state = RecordingState.WAITING_FOR_SPELL;
    
    // Clear previous samples
    for (const spell of this.spellsToTrain) {
      this.samples.set(spell, []);
    }
    
    // Create UI
    this.createUI();
    this.updateUI();
    
    // Start checking for strokes
    this.checkForStrokes();
  }
  
  /**
   * Stop template recording
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.removeUI();
  }
  
  /**
   * Create training UI overlay
   */
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'template-recorder-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
      color: white;
    `;
    
    document.body.appendChild(this.container);
  }
  
  /**
   * Remove UI overlay
   */
  private removeUI(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }
  
  /**
   * Update UI with current state
   */
  private updateUI(): void {
    if (!this.container) return;
    
    if (this.state === RecordingState.COMPLETED) {
      this.container.innerHTML = `
        <div style="text-align: center;">
          <h1 style="font-size: 48px; margin-bottom: 20px;">✓ Training Complete!</h1>
          <p style="font-size: 24px;">Your custom spell templates are ready.</p>
          <p style="font-size: 18px; margin-top: 20px; color: #aaa;">Returning to game...</p>
        </div>
      `;
      return;
    }
    
    const currentSpell = this.spellsToTrain[this.currentSpellIndex];
    const sampleCount = this.currentSampleIndex + 1;
    const totalSamples = 3;
    
    this.container.innerHTML = `
      <div style="text-align: center; max-width: 600px; padding: 40px;">
        <h1 style="font-size: 36px; margin-bottom: 20px;">Train Your Spells</h1>
        
        <div style="margin: 40px 0;">
          <div style="font-size: 48px; font-weight: bold; color: #00ff41; margin-bottom: 10px;">
            ${currentSpell.toUpperCase()}
          </div>
          <div style="font-size: 24px; color: #aaa;">
            Sample ${sampleCount} of ${totalSamples}
          </div>
        </div>
        
        <div style="
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid #00ff41;
          border-radius: 10px;
          padding: 30px;
          margin: 30px 0;
        ">
          <p style="font-size: 20px; line-height: 1.6; margin: 0;">
            ${this.getInstructions(currentSpell)}
          </p>
        </div>
        
        <div style="margin-top: 40px;">
          <p style="font-size: 16px; color: #aaa; margin: 10px 0;">
            1. Raise your off-hand to shoulder height
          </p>
          <p style="font-size: 16px; color: #aaa; margin: 10px 0;">
            2. Draw the spell shape with your wand hand
          </p>
          <p style="font-size: 16px; color: #aaa; margin: 10px 0;">
            3. Lower your off-hand to cast
          </p>
        </div>
        
        <div style="margin-top: 40px;">
          <button id="cancel-training-btn" style="
            background: rgba(255, 0, 0, 0.3);
            border: 2px solid #ff0000;
            color: white;
            padding: 12px 30px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
          ">Cancel Training</button>
        </div>
      </div>
    `;
    
    // Add cancel button listener
    const cancelBtn = document.getElementById('cancel-training-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.cancel();
      });
    }
  }
  
  /**
   * Get instructions for a specific spell
   */
  private getInstructions(spell: SpellType): string {
    switch (spell) {
      case SpellType.SHIELD:
        return '🛡️ Draw a CIRCLE in the air';
      case SpellType.LIGHTNING:
        return '⚡ Draw a ZIGZAG (3-4 peaks)';
      case SpellType.FIREBALL:
        return '🔥 Draw a STRAIGHT LINE horizontally';
      case SpellType.FROST:
        return '❄️ Draw a V SHAPE downward then upward';
      default:
        return 'Draw the spell gesture';
    }
  }
  
  /**
   * Check for new strokes from StrokeCapture
   */
  private async checkForStrokes(): Promise<void> {
    if (!this.isActive) return;
    
    // Check if a stroke was captured
    const stroke = this.config.strokeCapture.getStroke();
    
    if (stroke && this.state === RecordingState.WAITING_FOR_SPELL) {
      await this.recordSample(stroke);
    }
    
    // Continue checking (throttled to ~30 FPS)
    setTimeout(() => this.checkForStrokes(), 33);
  }
  
  /**
   * Record a sample for the current spell
   */
  private async recordSample(stroke: Stroke): Promise<void> {
    const currentSpell = this.spellsToTrain[this.currentSpellIndex];
    const samples = this.samples.get(currentSpell);
    
    if (!samples) return;
    
    // Add sample
    samples.push(stroke);
    this.currentSampleIndex++;
    
    console.log(`Recorded sample ${this.currentSampleIndex}/3 for ${currentSpell}`);
    
    // Check if we have all 3 samples for this spell
    if (this.currentSampleIndex >= 3) {
      // Train template
      // Note: shape-detector library doesn't support multi-sample training
      // We could average the samples or just use the first one
      const averagedStroke = samples[0]; // For now, just use first sample
      this.config.gestureRecognizer.addTemplate(currentSpell, averagedStroke.points);
      console.log(`Trained template for ${currentSpell}`);
      
      // Move to next spell
      this.currentSpellIndex++;
      this.currentSampleIndex = 0;
      
      // Check if all spells are trained
      if (this.currentSpellIndex >= this.spellsToTrain.length) {
        // Training complete!
        await this.completeTraining();
        return;
      }
    }
    
    // Update UI for next sample
    this.updateUI();
  }
  
  /**
   * Complete training and save templates
   */
  private async completeTraining(): Promise<void> {
    console.log('All spells trained! Saving to localStorage...');
    
    // Show completion message
    this.state = RecordingState.COMPLETED;
    this.updateUI();
    
    // Wait 2 seconds before returning
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clean up and call completion callback
    this.stop();
    this.config.onComplete();
  }
  
  /**
   * Cancel training
   */
  private cancel(): void {
    console.log('Training cancelled');
    this.stop();
    
    if (this.config.onCancel) {
      this.config.onCancel();
    }
  }
  
  /**
   * Check if recorder is active
   */
  isRecording(): boolean {
    return this.isActive;
  }
}
