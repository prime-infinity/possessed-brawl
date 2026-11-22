/**
 * Stroke Capture Component for Spell Duel
 * 
 * Manages off-hand gesture state machine (ready, cast, cancel) and
 * records wand trail for spell recognition.
 * 
 * **Validates: Requirements 4.1-4.5, 5.1-5.7, 6.1-6.4, 7.1-7.4**
 */

import { Landmarks, BaselineData, Stroke, TrailPoint, OffHandState, WandHand } from '../types';
import { StrokeCaptureConfig, DEFAULT_STROKE_CAPTURE_CONFIG } from '../types/spell';
import { PoseLandmark } from '../types/pose';

export class StrokeCapture {
  private config: StrokeCaptureConfig;
  private offHandState: OffHandState = OffHandState.IDLE;
  private stroke: Stroke | null = null;
  private wandTrail: TrailPoint[] = [];
  private armingTimer: number = 0;
  private offHandStartX: number = 0;

  constructor(config: Partial<StrokeCaptureConfig> = {}) {
    this.config = { ...DEFAULT_STROKE_CAPTURE_CONFIG, ...config };
  }

  /**
   * Update off-hand state and record wand position if armed
   * Call this every frame with current landmarks and baseline
   * 
   * **Validates: Requirements 4.1-4.4, 6.1-6.3, 7.1-7.3**
   */
  update(landmarks: Landmarks, baseline: BaselineData, deltaTime: number): void {
    const offHandWrist = this.getOffHandWrist(landmarks, baseline.wandHand);
    const wandWrist = this.getWandWrist(landmarks, baseline.wandHand);
    
    // Debug: Log wrist positions on first frame of arming
    if (this.offHandState === OffHandState.IDLE && offHandWrist && wandWrist) {
      const shoulderY = this.getShoulderY(landmarks, baseline.wandHand);
      const offHandHeight = shoulderY - offHandWrist.y;
      if (offHandHeight > this.config.offHandRaiseThreshold) {
        console.log(`🖐️ Wand hand: ${baseline.wandHand}`);
        console.log(`   Off-hand wrist at: (${offHandWrist.x.toFixed(3)}, ${offHandWrist.y.toFixed(3)})`);
        console.log(`   Wand wrist at: (${wandWrist.x.toFixed(3)}, ${wandWrist.y.toFixed(3)})`);
      }
    }
    
    if (!offHandWrist || !wandWrist) {
      // Cannot see required landmarks, maintain current state
      return;
    }

    const shoulderY = this.getShoulderY(landmarks, baseline.wandHand);
    const offHandHeight = shoulderY - offHandWrist.y; // Positive = raised above shoulders

    // State machine
    switch (this.offHandState) {
      case OffHandState.IDLE:
        if (offHandHeight > this.config.offHandRaiseThreshold) {
          // Off-hand raised, begin arming
          this.offHandState = OffHandState.READY_ARMING;
          this.armingTimer = 0;
          this.offHandStartX = offHandWrist.x;
          console.log('Off-hand raised, arming...');
        }
        break;

      case OffHandState.READY_ARMING:
        // Check if still raised
        if (offHandHeight < this.config.offHandRaiseThreshold - this.config.hysteresisMargin) {
          // Off-hand dropped before arming complete
          this.offHandState = OffHandState.IDLE;
          this.armingTimer = 0;
          console.log('Off-hand dropped, arming canceled');
          break;
        }

        // Check for cancel gesture (horizontal movement)
        const cancelDelta = Math.abs(offHandWrist.x - this.offHandStartX);
        if (cancelDelta > this.config.cancelHorizontalThreshold) {
          this.offHandState = OffHandState.CANCEL;
          this.clearStroke();
          console.log('Cancel gesture detected');
          // Will return to IDLE next frame
          break;
        }

        // Increment arming timer
        this.armingTimer += deltaTime;
        if (this.armingTimer >= this.config.armingDelay) {
          // Armed!
          this.offHandState = OffHandState.READY_ARMED;
          this.startStroke();
          console.log('Off-hand armed, ready to cast');
        }
        break;

      case OffHandState.READY_ARMED:
        // Record wand position
        this.recordWandPosition(wandWrist.x, wandWrist.y, deltaTime);

        // Check if off-hand dropped (cast)
        if (offHandHeight < this.config.offHandRaiseThreshold - this.config.hysteresisMargin) {
          this.offHandState = OffHandState.CAST;
          this.finalizeStroke();
          console.log('Cast gesture detected');
          // Will return to IDLE next frame
          break;
        }

        // Check for cancel gesture
        const cancelDeltaArmed = Math.abs(offHandWrist.x - this.offHandStartX);
        if (cancelDeltaArmed > this.config.cancelHorizontalThreshold) {
          this.offHandState = OffHandState.CANCEL;
          this.clearStroke();
          console.log('Cancel gesture detected while armed');
          // Will return to IDLE next frame
          break;
        }
        break;

      case OffHandState.CAST:
      case OffHandState.CANCEL:
        // Transition back to IDLE
        this.offHandState = OffHandState.IDLE;
        break;
    }

    // Update wand trail ages (for fading)
    this.updateWandTrailAges(deltaTime);
  }

  /**
   * Get off-hand wrist landmark
   * NOTE: Webcam view is mirrored - user's right hand appears on left side of image
   */
  private getOffHandWrist(landmarks: Landmarks, wandHand: WandHand): { x: number; y: number; z: number } | null {
    // User selects their physical wand hand, but image is mirrored
    // If user's wand hand is RIGHT (physical), it appears LEFT in image, so off-hand is RIGHT in image
    const index = wandHand === WandHand.RIGHT 
      ? PoseLandmark.RIGHT_WRIST  // Physical left hand = image right
      : PoseLandmark.LEFT_WRIST;   // Physical right hand = image left
    
    const landmark = landmarks.points[index];
    if (!landmark || landmark.visibility < 0.5) return null;
    return landmark;
  }

  /**
   * Get wand wrist landmark
   * NOTE: Webcam view is mirrored - user's right hand appears on left side of image
   */
  private getWandWrist(landmarks: Landmarks, wandHand: WandHand): { x: number; y: number; z: number } | null {
    // User selects their physical wand hand, but image is mirrored
    // If user's wand hand is RIGHT (physical), it appears LEFT in image
    const index = wandHand === WandHand.RIGHT 
      ? PoseLandmark.LEFT_WRIST   // Physical right hand = image left
      : PoseLandmark.RIGHT_WRIST;  // Physical left hand = image right
    
    const landmark = landmarks.points[index];
    if (!landmark || landmark.visibility < 0.5) return null;
    return landmark;
  }

  /**
   * Get shoulder Y position (average of both shoulders)
   */
  private getShoulderY(landmarks: Landmarks, wandHand: WandHand): number {
    const leftShoulder = landmarks.points[PoseLandmark.LEFT_SHOULDER];
    const rightShoulder = landmarks.points[PoseLandmark.RIGHT_SHOULDER];
    return (leftShoulder.y + rightShoulder.y) / 2;
  }

  /**
   * Start a new stroke
   */
  private startStroke(): void {
    this.stroke = {
      points: [],
      timestamp: Date.now()
    };
    this.wandTrail = [];
  }

  /**
   * Record wand position (called each frame while READY_ARMED)
   * 
   * **Validates: Requirements 5.1, 5.2**
   */
  private recordWandPosition(x: number, y: number, deltaTime: number): void {
    if (!this.stroke) return;

    // Add to stroke (raw positions for recognizer)
    this.stroke.points.push({ x, y });
    
    // Log first few points for debugging
    if (this.stroke.points.length <= 3) {
      console.log(`   📍 Wand point #${this.stroke.points.length}: (${x.toFixed(3)}, ${y.toFixed(3)})`);
    }

    // Add to visual trail (will be lagged for smooth visual)
    this.wandTrail.push({ x, y, age: 0 });
  }

  /**
   * Update wand trail ages for fading
   * 
   * **Validates: Requirement 5.4**
   */
  private updateWandTrailAges(deltaTime: number): void {
    // Age all trail points
    for (const point of this.wandTrail) {
      point.age += deltaTime;
    }

    // Remove points older than fade duration
    this.wandTrail = this.wandTrail.filter(
      p => p.age < this.config.trailFadeDuration
    );
  }

  /**
   * Finalize stroke (called when cast gesture detected)
   * Validates stroke length and bounding box
   * 
   * **Validates: Requirements 5.6, 5.7, 6.2**
   */
  private finalizeStroke(): void {
    if (!this.stroke) return;

    // Validate stroke
    const length = this.calculateStrokeLength();
    const bbox = this.calculateBoundingBox();

    if (length < this.config.minStrokeLength) {
      console.log(`Stroke too short: ${length.toFixed(3)} < ${this.config.minStrokeLength}`);
      this.clearStroke();
      return;
    }

    if (bbox < this.config.minStrokeBoundingBox) {
      console.log(`Stroke bounding box too small: ${bbox.toFixed(3)} < ${this.config.minStrokeBoundingBox}`);
      this.clearStroke();
      return;
    }

    console.log(`Stroke finalized: length=${length.toFixed(3)}, bbox=${bbox.toFixed(3)}, points=${this.stroke.points.length}`);
  }

  /**
   * Calculate total stroke length (Euclidean distance)
   */
  private calculateStrokeLength(): number {
    if (!this.stroke || this.stroke.points.length < 2) return 0;

    let length = 0;
    for (let i = 1; i < this.stroke.points.length; i++) {
      const prev = this.stroke.points[i - 1];
      const curr = this.stroke.points[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  /**
   * Calculate bounding box size (max dimension)
   */
  private calculateBoundingBox(): number {
    if (!this.stroke || this.stroke.points.length < 2) return 0;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const p of this.stroke.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const width = maxX - minX;
    const height = maxY - minY;
    return Math.max(width, height);
  }

  /**
   * Clear current stroke
   * 
   * **Validates: Requirements 6.3, 7.2**
   */
  private clearStroke(): void {
    this.stroke = null;
    this.wandTrail = [];
  }

  /**
   * Get current off-hand state
   */
  getOffHandState(): OffHandState {
    return this.offHandState;
  }

  /**
   * Get finalized stroke (available after CAST)
   * Returns null if no stroke or stroke was canceled
   * 
   * **Validates: Requirement 6.2**
   */
  getStroke(): Stroke | null {
    if (this.offHandState === OffHandState.CAST && this.stroke) {
      const stroke = this.stroke;
      this.stroke = null; // Clear after retrieving
      return stroke;
    }
    return null;
  }

  /**
   * Get wand trail for rendering
   * 
   * **Validates: Requirements 5.3, 5.4, 5.5**
   */
  getWandTrail(): TrailPoint[] {
    return this.wandTrail;
  }

  /**
   * Get arming progress (0-1)
   * For UI feedback during arming delay
   */
  getArmingProgress(): number {
    if (this.offHandState !== OffHandState.READY_ARMING) return 0;
    return Math.min(1, this.armingTimer / this.config.armingDelay);
  }

  /**
   * Set configuration
   */
  setConfig(config: Partial<StrokeCaptureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): StrokeCaptureConfig {
    return { ...this.config };
  }
}
