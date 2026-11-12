/**
 * Type definitions for Possessed Brawl
 * 
 * Core interfaces and types used throughout the application.
 */

// Re-export pose-specific types and constants
export * from './pose';

// Re-export move detection types and constants
export * from './move';

/**
 * A single body landmark point from MediaPipe Pose
 */
export interface Landmark {
  x: number;           // Normalized 0-1 (horizontal)
  y: number;           // Normalized 0-1 (vertical)
  z: number;           // Depth estimate (relative to hips)
  visibility: number;  // Confidence score 0-1
}

/**
 * Collection of 33 body landmarks from MediaPipe Pose
 */
export interface Landmarks {
  points: Landmark[];
  timestamp: number;
}

/**
 * Types of moves that can be detected
 */
export enum MoveType {
  JAB = 'jab',
  POWER_PUNCH = 'power_punch',
  DUCK = 'duck',
  BLOCK = 'block',
  CHARGE = 'charge',
  NONE = 'none'
}

/**
 * A detected move with intensity and timing
 */
export interface DetectedMove {
  type: MoveType;
  intensity: number;    // 0-1 scale for visualization
  timestamp: number;
}

/**
 * Baseline pose measurements recorded during calibration
 */
export interface BaselineData {
  centerPosition: { x: number; y: number };
  shoulderWidth: number;
  headHeight: number;
  leftWristBaseline: { x: number; y: number; z: number };
  rightWristBaseline: { x: number; y: number; z: number };
}
