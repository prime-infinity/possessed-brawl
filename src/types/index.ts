/**
 * Type definitions for Spell Duel
 * 
 * Core interfaces and types used throughout the application.
 */

// Re-export pose-specific types and constants
export * from './pose';

// Re-export spell detection types and constants
export * from './spell';

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
 * Types of spells that can be cast
 */
export enum SpellType {
  SHIELD = 'shield',
  LIGHTNING = 'lightning',
  FIREBALL = 'fireball',
  FROST = 'frost'
}

/**
 * A recognized spell with confidence score
 */
export interface RecognizedSpell {
  type: SpellType;
  confidence: number;  // 0-1, computed as (1 - distance/maxDistance)
  matchScore: number;  // Raw distance score from $1 algorithm
  timestamp: number;
}

/**
 * Which hand is the wand hand
 */
export enum WandHand {
  LEFT = 'left',
  RIGHT = 'right'
}

/**
 * Off-hand gesture state for spell casting
 */
export enum OffHandState {
  IDLE = 'idle',
  READY_ARMING = 'ready_arming',
  READY_ARMED = 'ready_armed',
  CAST = 'cast',
  CANCEL = 'cancel'
}

/**
 * A stroke drawn by the wand hand (array of 2D points)
 */
export interface Stroke {
  points: { x: number; y: number }[];
  timestamp: number;
}

/**
 * A point in the visual wand trail (with age for fading)
 */
export interface TrailPoint {
  x: number;
  y: number;
  age: number;  // milliseconds since added
}

/**
 * Baseline pose measurements recorded during calibration
 */
export interface BaselineData {
  wandHand: WandHand;
  centerPosition: { x: number; y: number };
  shoulderWidth: number;
  headHeight: number;
  wandWristBaseline: { x: number; y: number; z: number };
  offHandWristBaseline: { x: number; y: number; z: number };
}

// Keep legacy MoveType for backward compatibility during transition
export enum MoveType {
  JAB = 'jab',
  POWER_PUNCH = 'power_punch',
  DUCK = 'duck',
  BLOCK = 'block',
  CHARGE = 'charge',
  NONE = 'none'
}

export interface DetectedMove {
  type: MoveType;
  intensity: number;
  timestamp: number;
}
