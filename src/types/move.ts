/**
 * Move detection type definitions
 * 
 * Interfaces and types for the Move_Recognizer component that detects
 * player moves from pose data and enforces cooldowns.
 * 
 * **Validates: Requirements 4.4, 5.4, 6.5, 7.4, 8.6, 12.5**
 */

import { MoveType } from './index';

/**
 * Configuration for all move detection thresholds and cooldowns
 * 
 * This interface contains all tunable parameters for the Move_Recognizer
 * component, allowing fine-tuning of move detection sensitivity and timing.
 * 
 * **Validates: Requirements 4.4, 5.4, 6.5, 7.4, 8.6, 12.5**
 */
export interface ThresholdConfig {
  // Jab detection (left hand forward)
  
  /**
   * Distance threshold for jab detection (normalized, z-axis delta from baseline)
   * 
   * When left wrist moves forward beyond this threshold, a jab is detected.
   * @default 0.15
   * **Validates: Requirement 4.4**
   */
  jabThreshold: number;
  
  /**
   * Cooldown period after jab detection (milliseconds)
   * 
   * Prevents jab detection during this period after a jab is detected.
   * @default 500
   * **Validates: Requirement 4.4**
   */
  jabCooldown: number;
  
  // Power punch detection (right hand forward)
  
  /**
   * Distance threshold for power punch detection (normalized, z-axis delta from baseline)
   * 
   * When right wrist moves forward beyond this threshold, a power punch is detected.
   * @default 0.2
   * **Validates: Requirement 5.4**
   */
  powerPunchThreshold: number;
  
  /**
   * Cooldown period after power punch detection (milliseconds)
   * 
   * Prevents power punch detection during this period after a power punch is detected.
   * @default 800
   * **Validates: Requirement 5.4**
   */
  powerPunchCooldown: number;
  
  // Duck detection (head and shoulders drop)
  
  /**
   * Distance threshold for duck detection (normalized, y-axis delta from baseline)
   * 
   * When head and shoulders drop below this threshold, a duck is detected.
   * @default 0.15
   * **Validates: Requirement 6.5**
   */
  duckThreshold: number;
  
  /**
   * Time window for duck movement (milliseconds)
   * 
   * Duck must occur within this time window to be detected (speed check).
   * @default 300
   * **Validates: Requirement 6.5**
   */
  duckTimeWindow: number;
  
  /**
   * Cooldown period after duck detection (milliseconds)
   * 
   * Prevents duck detection during this period after a duck is detected.
   * @default 600
   * **Validates: Requirement 6.5**
   */
  duckCooldown: number;
  
  // Block detection (both hands near face)
  
  /**
   * Proximity threshold for block detection (normalized distance)
   * 
   * When both wrists are within this distance of the head, a block is detected.
   * Block is continuous with no cooldown.
   * @default 0.25
   * **Validates: Requirement 7.4**
   */
  blockProximityThreshold: number;
  
  // Charge attack detection (hands together then released)
  
  /**
   * Proximity threshold for charge preparation (normalized distance between wrists)
   * 
   * When both wrists are within this distance of each other, charge preparation begins.
   * @default 0.15
   * **Validates: Requirement 8.6**
   */
  chargeProximityThreshold: number;
  
  /**
   * Release threshold for charge attack (normalized distance between wrists)
   * 
   * After charge preparation, when wrists separate beyond this distance, charge is released.
   * @default 0.4
   * **Validates: Requirement 8.6**
   */
  chargeReleaseThreshold: number;
  
  /**
   * Stamina threshold for charge attack
   * 
   * Charge attack is only detected if stamina is at or above this value.
   * @default 50
   * **Validates: Requirement 8.6**
   */
  chargeStaminaThreshold: number;
  
  /**
   * Cooldown period after charge attack detection (milliseconds)
   * 
   * Prevents charge attack detection during this period after a charge is detected.
   * @default 2000
   * **Validates: Requirement 8.6**
   */
  chargeCooldown: number;
  
  // Depth control (shoulder width changes)
  
  /**
   * Shoulder width increase threshold for forward movement (normalized delta from baseline)
   * 
   * When shoulder width increases beyond this threshold, fighter moves forward.
   * @default 0.1
   * **Validates: Requirement 12.5**
   */
  shoulderWidthForwardThreshold: number;
  
  /**
   * Shoulder width decrease threshold for backward movement (normalized delta from baseline)
   * 
   * When shoulder width decreases beyond this threshold, fighter moves backward.
   * @default 0.1
   * **Validates: Requirement 12.5**
   */
  shoulderWidthBackwardThreshold: number;
}

/**
 * Default threshold configuration values
 * 
 * These defaults provide a good starting point for move detection
 * but should be tuned based on testing and user feedback.
 */
export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  // Jab
  jabThreshold: 0.15,
  jabCooldown: 500,
  
  // Power punch
  powerPunchThreshold: 0.2,
  powerPunchCooldown: 800,
  
  // Duck
  duckThreshold: 0.15,
  duckTimeWindow: 300,
  duckCooldown: 600,
  
  // Block
  blockProximityThreshold: 0.25,
  
  // Charge attack
  chargeProximityThreshold: 0.15,
  chargeReleaseThreshold: 0.4,
  chargeStaminaThreshold: 50,
  chargeCooldown: 2000,
  
  // Depth control
  shoulderWidthForwardThreshold: 0.1,
  shoulderWidthBackwardThreshold: 0.1,
};

/**
 * Cooldown state tracking for all move types
 * 
 * Tracks remaining cooldown time for each move type that has a cooldown.
 */
export interface CooldownState {
  [MoveType.JAB]: number;
  [MoveType.POWER_PUNCH]: number;
  [MoveType.DUCK]: number;
  [MoveType.CHARGE]: number;
  // BLOCK has no cooldown (continuous detection)
  // NONE is not a real move
}

/**
 * Move recognizer interface
 * 
 * Detects player moves from calibrated pose data, enforces cooldowns
 * and thresholds, and manages move conflict resolution.
 */
export interface MoveRecognizer {
  /**
   * Detect moves from current landmarks relative to baseline
   * 
   * Analyzes current pose data against baseline to detect all active moves.
   * Applies cooldown checks and conflict resolution (priority order).
   * 
   * @param landmarks - Current pose landmarks
   * @param baseline - Calibrated baseline pose data
   * @param stamina - Current stamina value (for charge attack gating)
   * @returns Array of detected moves (may be empty)
   */
  detectMoves(
    landmarks: import('./index').Landmarks,
    baseline: import('./index').BaselineData,
    stamina: number
  ): import('./index').DetectedMove[];
  
  /**
   * Update cooldown timers
   * 
   * Decreases all active cooldown timers by deltaTime.
   * Called each frame with frame time delta.
   * 
   * @param deltaTime - Time elapsed since last update (milliseconds)
   */
  updateCooldowns(deltaTime: number): void;
  
  /**
   * Configure tunable thresholds
   * 
   * Updates the threshold configuration used for move detection.
   * Allows runtime tuning for development and testing.
   * 
   * @param config - New threshold configuration
   */
  setThresholds(config: Partial<ThresholdConfig>): void;
  
  /**
   * Get current threshold configuration
   * 
   * Returns the current threshold configuration for display/debugging.
   * 
   * @returns Current threshold configuration
   */
  getThresholds(): ThresholdConfig;
  
  /**
   * Get current cooldown state
   * 
   * Returns remaining cooldown time for each move type.
   * Useful for debug overlay display.
   * 
   * @returns Current cooldown state (milliseconds remaining per move)
   */
  getCooldowns(): CooldownState;
}
