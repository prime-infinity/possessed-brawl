/**
 * MoveRecognizer component implementation
 * 
 * Detects player moves from calibrated pose data, enforces cooldowns
 * and thresholds, and manages move conflict resolution.
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5**
 */

import {
  MoveRecognizer as IMoveRecognizer,
  ThresholdConfig,
  DEFAULT_THRESHOLD_CONFIG,
  CooldownState,
} from '../types/move';
import { Landmarks, BaselineData, DetectedMove, MoveType } from '../types';

/**
 * Position history entry for duck detection
 */
interface PositionHistoryEntry {
  headY: number;
  shoulderY: number;
  timestamp: number;
}

/**
 * Charge attack state machine states
 */
enum ChargeState {
  IDLE = 'idle',
  CHARGING = 'charging',
}

/**
 * Move priority order for conflict resolution
 * Higher number = higher priority
 * CHARGE > BLOCK > DUCK > POWER_PUNCH > JAB
 */
const MOVE_PRIORITY: Record<MoveType, number> = {
  [MoveType.CHARGE]: 5,
  [MoveType.BLOCK]: 4,
  [MoveType.DUCK]: 3,
  [MoveType.POWER_PUNCH]: 2,
  [MoveType.JAB]: 1,
  [MoveType.NONE]: 0,
};

/**
 * MoveRecognizer implementation
 * 
 * Detects moves from pose landmarks relative to calibrated baseline.
 */
export class MoveRecognizer implements IMoveRecognizer {
  private config: ThresholdConfig;
  private cooldowns: CooldownState;
  private positionHistory: PositionHistoryEntry[];
  private chargeState: ChargeState;

  constructor(config: Partial<ThresholdConfig> = {}) {
    // Initialize with default config, overridden by provided config
    this.config = {
      ...DEFAULT_THRESHOLD_CONFIG,
      ...config,
    };

    // Initialize cooldowns to zero (no active cooldowns)
    this.cooldowns = {
      [MoveType.JAB]: 0,
      [MoveType.POWER_PUNCH]: 0,
      [MoveType.DUCK]: 0,
      [MoveType.CHARGE]: 0,
    };

    // Initialize position history for duck detection
    this.positionHistory = [];
    
    // Initialize charge state machine
    this.chargeState = ChargeState.IDLE;
  }

  /**
   * Detect moves from current landmarks relative to baseline
   * 
   * Analyzes current pose data against baseline to detect all active moves.
   * Applies cooldown checks and conflict resolution (priority order).
   * 
   * @param landmarks - Current pose landmarks
   * @param baseline - Calibrated baseline pose data
   * @param stamina - Current stamina value (for charge attack gating)
   * @returns Array of detected moves (single highest priority move or empty)
   */
  detectMoves(
    landmarks: Landmarks,
    baseline: BaselineData,
    stamina: number
  ): DetectedMove[] {
    const detectedMoves: DetectedMove[] = [];

    // Update position history for duck detection
    this.updatePositionHistory(landmarks);

    // Detect jab (left hand forward movement)
    const jabMove = this.detectJab(landmarks, baseline);
    if (jabMove) {
      detectedMoves.push(jabMove);
    }

    // Detect power punch (right hand forward movement)
    const powerPunchMove = this.detectPowerPunch(landmarks, baseline);
    if (powerPunchMove) {
      detectedMoves.push(powerPunchMove);
    }

    // Detect duck (head and shoulders drop)
    const duckMove = this.detectDuck(landmarks, baseline);
    if (duckMove) {
      detectedMoves.push(duckMove);
    }

    // Detect block (both hands near face)
    const blockMove = this.detectBlock(landmarks);
    if (blockMove) {
      detectedMoves.push(blockMove);
    }

    // Detect charge attack (hands together then released)
    const chargeMove = this.detectCharge(landmarks, stamina);
    if (chargeMove) {
      detectedMoves.push(chargeMove);
    }

    // Apply conflict resolution: return only highest priority move
    // Priority order: CHARGE > BLOCK > DUCK > POWER_PUNCH > JAB
    if (detectedMoves.length > 1) {
      // Find the move with the highest priority
      const highestPriorityMove = detectedMoves.reduce((highest, current) => {
        return MOVE_PRIORITY[current.type] > MOVE_PRIORITY[highest.type]
          ? current
          : highest;
      });
      
      return [highestPriorityMove];
    }

    return detectedMoves;
  }

  /**
   * Detect jab move (left wrist forward movement)
   * 
   * @param landmarks - Current pose landmarks
   * @param baseline - Calibrated baseline pose data
   * @returns DetectedMove if jab detected, null otherwise
   */
  private detectJab(landmarks: Landmarks, baseline: BaselineData): DetectedMove | null {
    // Check if jab is on cooldown
    if (this.cooldowns[MoveType.JAB] > 0) {
      return null;
    }

    // Get left wrist position (index 15 from MediaPipe)
    const LEFT_WRIST_INDEX = 15;
    const leftWrist = landmarks.points[LEFT_WRIST_INDEX];

    // Verify landmark is visible
    if (!leftWrist || leftWrist.visibility < 0.5) {
      return null;
    }

    // Calculate z-axis delta from baseline (forward movement)
    // In MediaPipe, negative z means closer to camera (forward)
    // So we look for: baseline.z - current.z > threshold
    const deltaZ = baseline.leftWristBaseline.z - leftWrist.z;

    // Check if delta exceeds threshold
    if (deltaZ > this.config.jabThreshold) {
      // Jab detected! Start cooldown
      this.cooldowns[MoveType.JAB] = this.config.jabCooldown;

      // Calculate intensity based on how far beyond threshold
      const intensity = Math.min(1.0, deltaZ / (this.config.jabThreshold * 2));

      return {
        type: MoveType.JAB,
        intensity,
        timestamp: landmarks.timestamp,
      };
    }

    return null;
  }

  /**
   * Detect power punch move (right wrist forward movement)
   * 
   * @param landmarks - Current pose landmarks
   * @param baseline - Calibrated baseline pose data
   * @returns DetectedMove if power punch detected, null otherwise
   */
  private detectPowerPunch(landmarks: Landmarks, baseline: BaselineData): DetectedMove | null {
    // Check if power punch is on cooldown
    if (this.cooldowns[MoveType.POWER_PUNCH] > 0) {
      return null;
    }

    // Get right wrist position (index 16 from MediaPipe)
    const RIGHT_WRIST_INDEX = 16;
    const rightWrist = landmarks.points[RIGHT_WRIST_INDEX];

    // Verify landmark is visible
    if (!rightWrist || rightWrist.visibility < 0.5) {
      return null;
    }

    // Calculate z-axis delta from baseline (forward movement)
    // In MediaPipe, negative z means closer to camera (forward)
    // So we look for: baseline.z - current.z > threshold
    const deltaZ = baseline.rightWristBaseline.z - rightWrist.z;

    // Check if delta exceeds threshold
    if (deltaZ > this.config.powerPunchThreshold) {
      // Power punch detected! Start cooldown
      this.cooldowns[MoveType.POWER_PUNCH] = this.config.powerPunchCooldown;

      // Calculate intensity based on how far beyond threshold
      const intensity = Math.min(1.0, deltaZ / (this.config.powerPunchThreshold * 2));

      return {
        type: MoveType.POWER_PUNCH,
        intensity,
        timestamp: landmarks.timestamp,
      };
    }

    return null;
  }

  /**
   * Detect duck move (head and shoulders drop)
   * 
   * Requires head and shoulders to drop below threshold within time window.
   * This ensures the drop is fast enough to be a duck (speed check).
   * 
   * @param landmarks - Current pose landmarks
   * @param baseline - Calibrated baseline pose data
   * @returns DetectedMove if duck detected, null otherwise
   */
  private detectDuck(landmarks: Landmarks, baseline: BaselineData): DetectedMove | null {
    // Check if duck is on cooldown
    if (this.cooldowns[MoveType.DUCK] > 0) {
      return null;
    }

    // Get head and shoulder positions (MediaPipe indices)
    const NOSE_INDEX = 0; // Head reference point
    const LEFT_SHOULDER_INDEX = 11;
    const RIGHT_SHOULDER_INDEX = 12;

    const nose = landmarks.points[NOSE_INDEX];
    const leftShoulder = landmarks.points[LEFT_SHOULDER_INDEX];
    const rightShoulder = landmarks.points[RIGHT_SHOULDER_INDEX];

    // Verify landmarks are visible
    if (!nose || nose.visibility < 0.5 ||
        !leftShoulder || leftShoulder.visibility < 0.5 ||
        !rightShoulder || rightShoulder.visibility < 0.5) {
      return null;
    }

    // Calculate current head height (y coordinate)
    const currentHeadY = nose.y;

    // Calculate current shoulder height (average of both shoulders)
    const currentShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

    // Calculate vertical deltas from baseline
    // In screen coordinates, y increases downward, so drop means higher y value
    const headDrop = currentHeadY - baseline.headHeight;
    const shoulderDrop = currentShoulderY - baseline.headHeight; // Using headHeight as shoulder baseline reference

    // Check if drop exceeds threshold
    if (headDrop < this.config.duckThreshold || shoulderDrop < this.config.duckThreshold) {
      return null;
    }

    // Check if drop occurred within time window (speed check)
    if (!this.isDuckWithinTimeWindow(currentHeadY, currentShoulderY, landmarks.timestamp)) {
      return null;
    }

    // Duck detected! Start cooldown
    this.cooldowns[MoveType.DUCK] = this.config.duckCooldown;

    // Calculate intensity based on drop magnitude
    const avgDrop = (headDrop + shoulderDrop) / 2;
    const intensity = Math.min(1.0, avgDrop / (this.config.duckThreshold * 2));

    return {
      type: MoveType.DUCK,
      intensity,
      timestamp: landmarks.timestamp,
    };
  }

  /**
   * Detect block move (both wrists near head)
   * 
   * Block is continuous - no cooldown. Active as long as both wrists
   * remain within proximity threshold of the head.
   * 
   * @param landmarks - Current pose landmarks
   * @returns DetectedMove if block detected, null otherwise
   */
  private detectBlock(landmarks: Landmarks): DetectedMove | null {
    // Block has no cooldown - it's a continuous state
    // Get wrist and head positions (MediaPipe indices)
    const LEFT_WRIST_INDEX = 15;
    const RIGHT_WRIST_INDEX = 16;
    const NOSE_INDEX = 0; // Head reference point

    const leftWrist = landmarks.points[LEFT_WRIST_INDEX];
    const rightWrist = landmarks.points[RIGHT_WRIST_INDEX];
    const nose = landmarks.points[NOSE_INDEX];

    // Verify landmarks are visible
    if (!leftWrist || leftWrist.visibility < 0.5 ||
        !rightWrist || rightWrist.visibility < 0.5 ||
        !nose || nose.visibility < 0.5) {
      return null;
    }

    // Calculate Euclidean distance from each wrist to head (nose)
    const leftWristToHead = Math.sqrt(
      Math.pow(leftWrist.x - nose.x, 2) +
      Math.pow(leftWrist.y - nose.y, 2) +
      Math.pow(leftWrist.z - nose.z, 2)
    );

    const rightWristToHead = Math.sqrt(
      Math.pow(rightWrist.x - nose.x, 2) +
      Math.pow(rightWrist.y - nose.y, 2) +
      Math.pow(rightWrist.z - nose.z, 2)
    );

    // Block is detected when BOTH wrists are within threshold
    const bothHandsNearFace = 
      leftWristToHead <= this.config.blockProximityThreshold &&
      rightWristToHead <= this.config.blockProximityThreshold;

    if (!bothHandsNearFace) {
      return null;
    }

    // Block detected! Calculate intensity based on proximity
    // Closer hands = higher intensity
    const avgDistance = (leftWristToHead + rightWristToHead) / 2;
    const intensity = Math.max(0, 1.0 - (avgDistance / this.config.blockProximityThreshold));

    return {
      type: MoveType.BLOCK,
      intensity,
      timestamp: landmarks.timestamp,
    };
  }

  /**
   * Detect charge attack move (wrists together then released)
   * 
   * Implements a state machine:
   * - IDLE: Waiting for charge preparation (wrists come together)
   * - CHARGING: Wrists together, waiting for release (wrists separate)
   * 
   * Charge attack is only emitted on release if stamina >= threshold.
   * Applies cooldown after successful charge detection.
   * 
   * @param landmarks - Current pose landmarks
   * @param stamina - Current stamina value
   * @returns DetectedMove if charge attack detected, null otherwise
   */
  private detectCharge(landmarks: Landmarks, stamina: number): DetectedMove | null {
    // Get wrist positions (MediaPipe indices)
    const LEFT_WRIST_INDEX = 15;
    const RIGHT_WRIST_INDEX = 16;

    const leftWrist = landmarks.points[LEFT_WRIST_INDEX];
    const rightWrist = landmarks.points[RIGHT_WRIST_INDEX];

    // Verify landmarks are visible
    if (!leftWrist || leftWrist.visibility < 0.5 ||
        !rightWrist || rightWrist.visibility < 0.5) {
      return null;
    }

    // Calculate Euclidean distance between wrists
    const wristDistance = Math.sqrt(
      Math.pow(leftWrist.x - rightWrist.x, 2) +
      Math.pow(leftWrist.y - rightWrist.y, 2) +
      Math.pow(leftWrist.z - rightWrist.z, 2)
    );

    // State machine logic
    if (this.chargeState === ChargeState.IDLE) {
      // Check for charge preparation (wrists come together)
      if (wristDistance <= this.config.chargeProximityThreshold) {
        // Transition to CHARGING state
        this.chargeState = ChargeState.CHARGING;
      }
      return null;
    } else if (this.chargeState === ChargeState.CHARGING) {
      // Check for charge release (wrists separate)
      if (wristDistance >= this.config.chargeReleaseThreshold) {
        // Wrists separated! Check stamina and cooldown
        if (stamina >= this.config.chargeStaminaThreshold && 
            this.cooldowns[MoveType.CHARGE] === 0) {
          // Charge attack detected! Start cooldown and reset state
          this.cooldowns[MoveType.CHARGE] = this.config.chargeCooldown;
          this.chargeState = ChargeState.IDLE;

          // Calculate intensity based on how far wrists separated
          const intensity = Math.min(1.0, 
            (wristDistance - this.config.chargeReleaseThreshold) / 
            (this.config.chargeReleaseThreshold * 0.5)
          );

          return {
            type: MoveType.CHARGE,
            intensity,
            timestamp: landmarks.timestamp,
          };
        } else {
          // Stamina too low or on cooldown - reset state without emitting move
          this.chargeState = ChargeState.IDLE;
          return null;
        }
      }
      // Still charging (wrists still together)
      return null;
    }

    return null;
  }

  /**
   * Update position history for duck detection
   * 
   * Maintains a rolling buffer of recent position data to track movement speed.
   * 
   * @param landmarks - Current pose landmarks
   */
  private updatePositionHistory(landmarks: Landmarks): void {
    // Get head and shoulder positions
    const NOSE_INDEX = 0;
    const LEFT_SHOULDER_INDEX = 11;
    const RIGHT_SHOULDER_INDEX = 12;

    const nose = landmarks.points[NOSE_INDEX];
    const leftShoulder = landmarks.points[LEFT_SHOULDER_INDEX];
    const rightShoulder = landmarks.points[RIGHT_SHOULDER_INDEX];

    // Only record if landmarks are visible
    if (nose && nose.visibility >= 0.5 &&
        leftShoulder && leftShoulder.visibility >= 0.5 &&
        rightShoulder && rightShoulder.visibility >= 0.5) {
      
      const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      
      this.positionHistory.push({
        headY: nose.y,
        shoulderY,
        timestamp: landmarks.timestamp,
      });
    }

    // Clean up old entries beyond time window
    const cutoffTime = landmarks.timestamp - this.config.duckTimeWindow;
    this.positionHistory = this.positionHistory.filter(
      entry => entry.timestamp > cutoffTime
    );
  }

  /**
   * Check if duck drop occurred within time window
   * 
   * Validates that the drop from baseline to current position happened
   * fast enough (within the configured time window).
   * 
   * @param currentHeadY - Current head Y position
   * @param currentShoulderY - Current shoulder Y position
   * @param currentTimestamp - Current timestamp
   * @returns true if drop occurred within time window
   */
  private isDuckWithinTimeWindow(
    currentHeadY: number,
    currentShoulderY: number,
    currentTimestamp: number
  ): boolean {
    // Need at least 2 positions to check time window
    if (this.positionHistory.length < 2) {
      return false;
    }

    // Find the earliest position in the time window
    const earliestEntry = this.positionHistory[0];
    
    // Calculate drop from earliest to current
    const headDropInWindow = currentHeadY - earliestEntry.headY;
    const shoulderDropInWindow = currentShoulderY - earliestEntry.shoulderY;

    // Check if significant drop occurred within window
    // Both head and shoulders should show drop beyond threshold
    return headDropInWindow >= this.config.duckThreshold &&
           shoulderDropInWindow >= this.config.duckThreshold;
  }

  /**
   * Update cooldown timers
   * 
   * Decreases all active cooldown timers by deltaTime.
   * Called each frame with frame time delta.
   * 
   * @param deltaTime - Time elapsed since last update (milliseconds)
   */
  updateCooldowns(deltaTime: number): void {
    // Update each cooldown, clamping to 0
    for (const moveType of Object.keys(this.cooldowns) as Array<keyof CooldownState>) {
      this.cooldowns[moveType] = Math.max(0, this.cooldowns[moveType] - deltaTime);
    }
  }

  /**
   * Configure tunable thresholds
   * 
   * Updates the threshold configuration used for move detection.
   * Allows runtime tuning for development and testing.
   * 
   * @param config - New threshold configuration (partial updates allowed)
   */
  setThresholds(config: Partial<ThresholdConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current threshold configuration
   * 
   * Returns the current threshold configuration for display/debugging.
   * 
   * @returns Current threshold configuration
   */
  getThresholds(): ThresholdConfig {
    // Return a copy to prevent external modification
    return { ...this.config };
  }

  /**
   * Get current cooldown state
   * 
   * Returns remaining cooldown time for each move type.
   * Useful for debug overlay display.
   * 
   * @returns Current cooldown state (milliseconds remaining per move)
   */
  getCooldowns(): CooldownState {
    // Return a copy to prevent external modification
    return { ...this.cooldowns };
  }
}
