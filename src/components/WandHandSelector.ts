/**
 * WandHandSelector Component
 * 
 * Interactive hand selection and verification screen.
 * User selects wand hand, then raises each hand to verify detection.
 */

import { Landmarks, WandHand } from '../types';
import { PoseLandmark } from '../types/pose';

export enum SelectionState {
  CHOOSE_HAND = 'choose_hand',
  VERIFY_WAND_HAND = 'verify_wand_hand',
  VERIFY_OFF_HAND = 'verify_off_hand',
  COMPLETED = 'completed'
}

export interface WandHandSelectorConfig {
  canvas: HTMLCanvasElement;
  onComplete: (wandHand: WandHand, verified: boolean) => void;
}

/**
 * WandHandSelector - Interactive hand selection with verification
 */
export class WandHandSelector {
  private config: WandHandSelectorConfig;
  private state: SelectionState = SelectionState.CHOOSE_HAND;
  private selectedWandHand: WandHand | null = null;
  private verifiedWandHand: boolean = false;
  private verifiedOffHand: boolean = false;
  
  private overlay: HTMLDivElement | null = null;
  
  constructor(config: WandHandSelectorConfig) {
    this.config = config;
  }
  
  /**
   * Start the selection process
   */
  start(): void {
    this.state = SelectionState.CHOOSE_HAND;
    this.createUI();
  }
  
  /**
   * Update with current landmarks for verification
   */
  update(landmarks: Landmarks): void {
    if (this.state === SelectionState.VERIFY_WAND_HAND) {
      this.verifyWandHand(landmarks);
    } else if (this.state === SelectionState.VERIFY_OFF_HAND) {
      this.verifyOffHand(landmarks);
    }
  }
  
  /**
   * Create UI overlay
   */
  private createUI(): void {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      color: white;
      font-family: Arial, sans-serif;
    `;
    
    document.body.appendChild(this.overlay);
    this.updateUI();
  }
  
  /**
   * Update UI based on current state
   */
  private updateUI(): void {
    if (!this.overlay) return;
    
    switch (this.state) {
      case SelectionState.CHOOSE_HAND:
        this.overlay.innerHTML = `
          <div style="text-align: center;">
            <h1 style="font-size: 36px; margin-bottom: 40px;">Which hand holds your wand?</h1>
            <div style="display: flex; gap: 40px;">
              <button id="select-left-hand" style="
                padding: 20px 60px;
                font-size: 24px;
                background: rgba(0, 191, 255, 0.3);
                border: 3px solid #00bfff;
                color: white;
                border-radius: 10px;
                cursor: pointer;
              ">LEFT HAND</button>
              <button id="select-right-hand" style="
                padding: 20px 60px;
                font-size: 24px;
                background: rgba(0, 191, 255, 0.3);
                border: 3px solid #00bfff;
                color: white;
                border-radius: 10px;
                cursor: pointer;
              ">RIGHT HAND</button>
            </div>
          </div>
        `;
        
        document.getElementById('select-left-hand')?.addEventListener('click', () => {
          this.selectedWandHand = WandHand.LEFT;
          this.state = SelectionState.VERIFY_WAND_HAND;
          this.updateUI();
        });
        
        document.getElementById('select-right-hand')?.addEventListener('click', () => {
          this.selectedWandHand = WandHand.RIGHT;
          this.state = SelectionState.VERIFY_WAND_HAND;
          this.updateUI();
        });
        break;
        
      case SelectionState.VERIFY_WAND_HAND:
        this.overlay.innerHTML = `
          <div style="text-align: center;">
            <h1 style="font-size: 36px; margin-bottom: 20px;">Raise your WAND HAND</h1>
            <p style="font-size: 24px; color: #00ff41;">
              (Your ${this.selectedWandHand?.toUpperCase()} hand)
            </p>
            <p style="font-size: 18px; color: #aaa; margin-top: 40px;">
              Detecting...
            </p>
          </div>
        `;
        break;
        
      case SelectionState.VERIFY_OFF_HAND:
        this.overlay.innerHTML = `
          <div style="text-align: center;">
            <h1 style="font-size: 36px; margin-bottom: 20px;">Now raise your OTHER hand</h1>
            <p style="font-size: 24px; color: #00bfff;">
              (Your ${this.selectedWandHand === WandHand.RIGHT ? 'LEFT' : 'RIGHT'} hand)
            </p>
            <p style="font-size: 18px; color: #aaa; margin-top: 40px;">
              Detecting...
            </p>
          </div>
        `;
        break;
        
      case SelectionState.COMPLETED:
        // Will be removed by caller
        break;
    }
  }
  
  /**
   * Verify wand hand is raised
   */
  private verifyWandHand(landmarks: Landmarks): void {
    if (!this.selectedWandHand) return;
    
    const leftWrist = landmarks.points[PoseLandmark.LEFT_WRIST];
    const rightWrist = landmarks.points[PoseLandmark.RIGHT_WRIST];
    const leftShoulder = landmarks.points[PoseLandmark.LEFT_SHOULDER];
    const rightShoulder = landmarks.points[PoseLandmark.RIGHT_SHOULDER];
    
    if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return;
    
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    
    // Check which hand is raised
    const leftRaised = (shoulderY - leftWrist.y) > 0.1;
    const rightRaised = (shoulderY - rightWrist.y) > 0.1;
    
    console.log(`🔍 Verifying wand hand (${this.selectedWandHand}):`);
    console.log(`   Left wrist Y: ${leftWrist.y.toFixed(3)}, Shoulder Y: ${shoulderY.toFixed(3)}, Raised: ${leftRaised}`);
    console.log(`   Right wrist Y: ${rightWrist.y.toFixed(3)}, Shoulder Y: ${shoulderY.toFixed(3)}, Raised: ${rightRaised}`);
    
    // Verify correct hand is raised
    if (this.selectedWandHand === WandHand.LEFT && leftRaised && !rightRaised) {
      console.log('✅ LEFT wand hand verified!');
      this.verifiedWandHand = true;
      this.state = SelectionState.VERIFY_OFF_HAND;
      this.updateUI();
    } else if (this.selectedWandHand === WandHand.RIGHT && rightRaised && !leftRaised) {
      console.log('✅ RIGHT wand hand verified!');
      this.verifiedWandHand = true;
      this.state = SelectionState.VERIFY_OFF_HAND;
      this.updateUI();
    }
  }
  
  /**
   * Verify off-hand is raised
   */
  private verifyOffHand(landmarks: Landmarks): void {
    if (!this.selectedWandHand) return;
    
    const leftWrist = landmarks.points[PoseLandmark.LEFT_WRIST];
    const rightWrist = landmarks.points[PoseLandmark.RIGHT_WRIST];
    const leftShoulder = landmarks.points[PoseLandmark.LEFT_SHOULDER];
    const rightShoulder = landmarks.points[PoseLandmark.RIGHT_SHOULDER];
    
    if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return;
    
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    
    // Check which hand is raised
    const leftRaised = (shoulderY - leftWrist.y) > 0.1;
    const rightRaised = (shoulderY - rightWrist.y) > 0.1;
    
    console.log(`🔍 Verifying off-hand (${this.selectedWandHand === WandHand.LEFT ? 'RIGHT' : 'LEFT'}):`);
    console.log(`   Left wrist Y: ${leftWrist.y.toFixed(3)}, Raised: ${leftRaised}`);
    console.log(`   Right wrist Y: ${rightWrist.y.toFixed(3)}, Raised: ${rightRaised}`);
    
    // Verify OPPOSITE hand is raised
    if (this.selectedWandHand === WandHand.LEFT && rightRaised && !leftRaised) {
      console.log('✅ RIGHT off-hand verified!');
      this.verifiedOffHand = true;
      this.complete();
    } else if (this.selectedWandHand === WandHand.RIGHT && leftRaised && !rightRaised) {
      console.log('✅ LEFT off-hand verified!');
      this.verifiedOffHand = true;
      this.complete();
    }
  }
  
  /**
   * Complete selection
   */
  private complete(): void {
    this.state = SelectionState.COMPLETED;
    
    console.log('═══════════════════════════════════════');
    console.log('🎯 HAND SELECTION COMPLETE');
    console.log(`   Wand hand: ${this.selectedWandHand}`);
    console.log(`   Verified: ${this.verifiedWandHand && this.verifiedOffHand}`);
    console.log('═══════════════════════════════════════');
    
    // Remove overlay
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
    
    // Call completion callback
    if (this.selectedWandHand) {
      this.config.onComplete(this.selectedWandHand, this.verifiedWandHand && this.verifiedOffHand);
    }
  }
  
  /**
   * Clean up
   */
  dispose(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
  }
}
