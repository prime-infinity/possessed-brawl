/**
 * Calibrator Component
 * 
 * Responsible for detecting guard position, recording baseline pose measurements
 * during calibration period, and providing quality checks and retry logic.
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 */

import { Landmark, Landmarks, BaselineData } from '../types';
import { PoseLandmark } from '../types/pose';

/**
 * Calibration state
 */
export enum CalibrationState {
  NOT_STARTED = 'not_started',
  WAITING_FOR_GUARD = 'waiting_for_guard',
  RECORDING = 'recording',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Configuration for calibration
 */
export interface CalibratorConfig {
  /**
   * Distance threshold for guard position detection (normalized units)
   * Both wrists must be within this distance of the head
   * @default 0.2
   */
  guardProximityThreshold: number;
  
  /**
   * Maximum vertical difference between shoulders (normalized units)
   * @default 0.05
   */
  shoulderLevelThreshold: number;
  
  /**
   * Minimum number of frames to record during calibration
   * At 30fps, this equals approximately 1 second
   * @default 20
   */
  minFrameCount: number;
  
  /**
   * Target number of frames for calibration
   * @default 30
   */
  targetFrameCount: number;
  
  /**
   * Minimum visibility threshold for landmarks during calibration
   * @default 0.6
   */
  calibrationVisibilityThreshold: number;
}

/**
 * Default configuration for Calibrator
 */
const DEFAULT_CONFIG: CalibratorConfig = {
  guardProximityThreshold: 0.2,
  shoulderLevelThreshold: 0.05,
  minFrameCount: 20,
  targetFrameCount: 30,
  calibrationVisibilityThreshold: 0.6
};

/**
 * Frame buffer entry for calibration recording
 */
interface CalibrationFrame {
  landmarks: Landmarks;
  isGoodFrame: boolean;  // Whether this frame meets quality criteria
}

/**
 * Calibrator implementation
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 */
export class Calibrator {
  private config: CalibratorConfig;
  private state: CalibrationState = CalibrationState.NOT_STARTED;
  private frameBuffer: CalibrationFrame[] = [];
  private baseline: BaselineData | null = null;
  
  constructor(config: Partial<CalibratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current calibration state
   */
  getState(): CalibrationState {
    return this.state;
  }

  /**
   * Get the computed baseline data
   * 
   * @returns BaselineData or null if calibration not completed
   */
  getBaseline(): BaselineData | null {
    return this.baseline;
  }

  /**
   * Get calibration progress (0-1)
   * 
   * Returns the ratio of good frames collected to target frame count.
   * 
   * @returns Progress value between 0 and 1
   */
  getProgress(): number {
    if (this.state !== CalibrationState.RECORDING) {
      return 0;
    }
    
    const goodFrameCount = this.frameBuffer.filter(f => f.isGoodFrame).length;
    return Math.min(1.0, goodFrameCount / this.config.targetFrameCount);
  }

  /**
   * Get count of good frames collected
   */
  getGoodFrameCount(): number {
    return this.frameBuffer.filter(f => f.isGoodFrame).length;
  }

  /**
   * Get current configuration
   */
  getConfig(): CalibratorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CalibratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if landmarks represent guard position
   * 
   * Guard position requires:
   * - Both wrists within threshold distance of head (nose)
   * - Shoulders are level (vertical difference < threshold)
   * - Head is upright (nose is visible)
   * 
   * **Validates: Requirement 2.2** - detect when player is in guard position
   * 
   * @param landmarks - The current pose landmarks
   * @returns true if in guard position, false otherwise
   */
  isInGuardPosition(landmarks: Landmarks): boolean {
    const points = landmarks.points;
    
    // Check if we have enough landmarks
    if (points.length < 33) {
      return false;
    }

    // Get key landmarks for guard position check
    const nose = points[PoseLandmark.NOSE];
    const leftWrist = points[PoseLandmark.LEFT_WRIST];
    const rightWrist = points[PoseLandmark.RIGHT_WRIST];
    const leftShoulder = points[PoseLandmark.LEFT_SHOULDER];
    const rightShoulder = points[PoseLandmark.RIGHT_SHOULDER];

    // Check visibility of all required landmarks
    const requiredLandmarks = [nose, leftWrist, rightWrist, leftShoulder, rightShoulder];
    for (const landmark of requiredLandmarks) {
      if (!landmark || landmark.visibility < this.config.calibrationVisibilityThreshold) {
        return false;
      }
    }

    // Check if shoulders are level (vertical difference < threshold)
    const shoulderVerticalDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    if (shoulderVerticalDiff > this.config.shoulderLevelThreshold) {
      return false;
    }

    // Check if both wrists are near the head (guard position)
    const leftWristDistance = this.euclideanDistance2D(leftWrist, nose);
    const rightWristDistance = this.euclideanDistance2D(rightWrist, nose);

    const inGuardPosition = 
      leftWristDistance < this.config.guardProximityThreshold &&
      rightWristDistance < this.config.guardProximityThreshold;

    return inGuardPosition;
  }

  /**
   * Start calibration process
   * 
   * Resets frame buffer and begins waiting for guard position.
   * 
   * **Validates: Requirement 2.1** - begin calibration flow
   */
  startCalibration(): void {
    this.state = CalibrationState.WAITING_FOR_GUARD;
    this.frameBuffer = [];
    this.baseline = null;
    console.log('Calibration started - waiting for guard position');
  }

  /**
   * Record a frame of baseline data
   * 
   * Only records frames when in guard position during recording state.
   * Automatically handles quality checks and frame filtering.
   * 
   * **Validates: Requirements 2.4, 2.5, 2.6, 2.7** - record baseline measurements
   * 
   * @param landmarks - The current pose landmarks
   * @returns true if frame was recorded, false otherwise
   */
  recordFrame(landmarks: Landmarks): boolean {
    // If waiting for guard position, check if we can start recording
    if (this.state === CalibrationState.WAITING_FOR_GUARD) {
      if (this.isInGuardPosition(landmarks)) {
        this.state = CalibrationState.RECORDING;
        console.log('Guard position detected - starting recording');
      } else {
        // Still waiting
        return false;
      }
    }

    // Only record if we're in recording state
    if (this.state !== CalibrationState.RECORDING) {
      return false;
    }

    // Check if still in guard position
    if (!this.isInGuardPosition(landmarks)) {
      console.warn('Lost guard position during calibration');
      // Don't fail immediately - just skip this frame
      this.frameBuffer.push({
        landmarks,
        isGoodFrame: false
      });
      return false;
    }

    // Check frame quality based on visibility
    const isGoodFrame = this.isFrameQualityGood(landmarks);
    
    this.frameBuffer.push({
      landmarks,
      isGoodFrame
    });

    console.log(`Recorded frame ${this.frameBuffer.length} (good: ${isGoodFrame})`);

    // Check if we've collected enough frames
    const goodFrameCount = this.frameBuffer.filter(f => f.isGoodFrame).length;
    if (goodFrameCount >= this.config.targetFrameCount) {
      // Enough good frames collected - finish calibration
      this.finishCalibration();
    }

    return true;
  }

  /**
   * Check if a frame meets quality criteria
   * 
   * Quality criteria:
   * - All key landmarks visible above threshold
   * - In guard position
   * 
   * **Validates: Requirement 2.3** - handle low visibility frames
   * 
   * @param landmarks - The landmarks to check
   * @returns true if frame is good quality
   */
  private isFrameQualityGood(landmarks: Landmarks): boolean {
    const points = landmarks.points;
    
    // Check key landmarks for calibration
    const keyIndices = [
      PoseLandmark.NOSE,
      PoseLandmark.LEFT_SHOULDER,
      PoseLandmark.RIGHT_SHOULDER,
      PoseLandmark.LEFT_WRIST,
      PoseLandmark.RIGHT_WRIST
    ];

    for (const index of keyIndices) {
      const landmark = points[index];
      if (!landmark || landmark.visibility < this.config.calibrationVisibilityThreshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Finish calibration and compute baseline
   * 
   * Calculates mean values across buffered frames for:
   * - Center position (average of shoulders)
   * - Shoulder width (distance between shoulders)
   * - Head height (vertical position)
   * - Wrist baselines (mean wrist positions in guard stance)
   * 
   * **Validates: Requirements 2.4, 2.5, 2.6, 2.7** - compute baseline measurements
   * 
   * @returns BaselineData or null if insufficient frames
   */
  finishCalibration(): BaselineData | null {
    // Filter to only good frames
    const goodFrames = this.frameBuffer.filter(f => f.isGoodFrame);

    // Check if we have enough good frames
    if (goodFrames.length < this.config.minFrameCount) {
      console.error(`Insufficient good frames: ${goodFrames.length} < ${this.config.minFrameCount}`);
      this.state = CalibrationState.FAILED;
      return null;
    }

    console.log(`Computing baseline from ${goodFrames.length} good frames`);

    // Accumulate values for averaging
    let centerX = 0, centerY = 0;
    let shoulderWidth = 0;
    let headHeight = 0;
    let leftWristX = 0, leftWristY = 0, leftWristZ = 0;
    let rightWristX = 0, rightWristY = 0, rightWristZ = 0;

    for (const frame of goodFrames) {
      const points = frame.landmarks.points;
      
      const nose = points[PoseLandmark.NOSE];
      const leftShoulder = points[PoseLandmark.LEFT_SHOULDER];
      const rightShoulder = points[PoseLandmark.RIGHT_SHOULDER];
      const leftWrist = points[PoseLandmark.LEFT_WRIST];
      const rightWrist = points[PoseLandmark.RIGHT_WRIST];

      // Center position (midpoint of shoulders)
      const centerXFrame = (leftShoulder.x + rightShoulder.x) / 2;
      const centerYFrame = (leftShoulder.y + rightShoulder.y) / 2;
      centerX += centerXFrame;
      centerY += centerYFrame;

      // Shoulder width
      shoulderWidth += this.euclideanDistance2D(leftShoulder, rightShoulder);

      // Head height (nose y position)
      headHeight += nose.y;

      // Wrist positions
      leftWristX += leftWrist.x;
      leftWristY += leftWrist.y;
      leftWristZ += leftWrist.z;
      rightWristX += rightWrist.x;
      rightWristY += rightWrist.y;
      rightWristZ += rightWrist.z;
    }

    // Calculate means
    const frameCount = goodFrames.length;
    this.baseline = {
      centerPosition: {
        x: centerX / frameCount,
        y: centerY / frameCount
      },
      shoulderWidth: shoulderWidth / frameCount,
      headHeight: headHeight / frameCount,
      leftWristBaseline: {
        x: leftWristX / frameCount,
        y: leftWristY / frameCount,
        z: leftWristZ / frameCount
      },
      rightWristBaseline: {
        x: rightWristX / frameCount,
        y: rightWristY / frameCount,
        z: rightWristZ / frameCount
      }
    };

    this.state = CalibrationState.COMPLETED;
    console.log('Calibration completed successfully', this.baseline);

    return this.baseline;
  }

  /**
   * Retry calibration after failure
   * 
   * Resets state and allows calibration to be attempted again.
   * 
   * **Validates: Requirement 2.3** - provide retry option if calibration fails
   */
  retry(): void {
    console.log('Retrying calibration');
    this.startCalibration();
  }

  /**
   * Reset calibrator to initial state
   */
  reset(): void {
    this.state = CalibrationState.NOT_STARTED;
    this.frameBuffer = [];
    this.baseline = null;
  }

  /**
   * Calculate 2D Euclidean distance between two landmarks
   * 
   * @param a - First landmark
   * @param b - Second landmark
   * @returns Distance in normalized coordinates
   */
  private euclideanDistance2D(a: Landmark, b: Landmark): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate 3D Euclidean distance between two landmarks
   * 
   * @param a - First landmark
   * @param b - Second landmark
   * @returns Distance in normalized coordinates
   */
  private euclideanDistance3D(a: Landmark, b: Landmark): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
