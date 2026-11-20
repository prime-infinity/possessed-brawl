/**
 * Spell casting type definitions for Spell Duel
 * 
 * Interfaces and types for gesture recognition, stroke capture,
 * and spell template management.
 * 
 * **Validates: Requirements 4.5, 5.6, 6.4, 7.4, 8.9, 9.5**
 */

import { SpellType } from './index';

/**
 * Configuration for stroke capture and off-hand gesture detection
 * 
 * **Validates: Requirements 4.5, 5.6, 6.4, 7.4**
 */
export interface StrokeCaptureConfig {
  /**
   * Y-position threshold for off-hand raise detection (relative to shoulders)
   * Off-hand is considered "raised" when wrist.y < shoulder.y - threshold
   * @default 0.05
   */
  offHandRaiseThreshold: number;
  
  /**
   * Time to hold off-hand raised before arming (milliseconds)
   * @default 300
   */
  armingDelay: number;
  
  /**
   * Hysteresis margin to prevent flickering at threshold boundary
   * Off-hand must drop below (threshold - hysteresis) to trigger cast/cancel
   * @default 0.02
   */
  hysteresisMargin: number;
  
  /**
   * Horizontal movement distance for cancel detection
   * If off-hand moves > this distance horizontally while raised, cancel
   * @default 0.15
   */
  cancelHorizontalThreshold: number;
  
  /**
   * Minimum stroke length (total Euclidean distance)
   * Strokes below this are rejected
   * @default 0.3
   */
  minStrokeLength: number;
  
  /**
   * Minimum bounding box size (max dimension: width or height)
   * Strokes with bounding box smaller than this are rejected
   * @default 0.1
   */
  minStrokeBoundingBox: number;
  
  /**
   * Visual lag for wand trail (number of frames)
   * Trail rendering lags behind actual wrist position for smooth visual
   * @default 3
   */
  trailLagFrames: number;
  
  /**
   * Wand trail fade duration (milliseconds)
   * Trail points fade out over this duration
   * @default 500
   */
  trailFadeDuration: number;
}

/**
 * Default stroke capture configuration
 */
export const DEFAULT_STROKE_CAPTURE_CONFIG: StrokeCaptureConfig = {
  offHandRaiseThreshold: 0.05,
  armingDelay: 300,
  hysteresisMargin: 0.02,
  cancelHorizontalThreshold: 0.15,
  minStrokeLength: 0.3,
  minStrokeBoundingBox: 0.1,
  trailLagFrames: 3,
  trailFadeDuration: 500
};

/**
 * Spell template for $1 recognition
 * 
 * **Validates: Requirements 9.1-9.5**
 */
export interface SpellTemplate {
  type: SpellType;
  points: { x: number; y: number }[];  // Normalized to unit square
}

/**
 * Configuration for $1 gesture recognizer
 * 
 * **Validates: Requirement 8.9**
 */
export interface GestureRecognizerConfig {
  /**
   * Number of points to resample strokes to
   * @default 64
   */
  resamplePoints: number;
  
  /**
   * Reference square size for scaling
   * @default 1.0
   */
  referenceSize: number;
  
  /**
   * Rejection threshold for match distance
   * Matches with distance > threshold are rejected as fizzle
   * @default 0.5
   */
  rejectionThreshold: number;
}

/**
 * Default gesture recognizer configuration
 */
export const DEFAULT_GESTURE_RECOGNIZER_CONFIG: GestureRecognizerConfig = {
  resamplePoints: 64,
  referenceSize: 1.0,
  rejectionThreshold: 0.5
};
