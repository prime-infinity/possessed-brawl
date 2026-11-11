/**
 * Pose detection type definitions and constants
 * 
 * MediaPipe Pose landmark indices and PoseDetector interface
 * Reference: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 */

import { Landmark, Landmarks } from './index';

/**
 * MediaPipe Pose Landmark Indices (33-point model)
 * 
 * The MediaPipe Pose model detects 33 body landmarks.
 * These constants provide semantic access to landmark array indices.
 */
export const PoseLandmark = {
  // Face
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  
  // Upper body
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  
  // Lower body
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/**
 * Type for landmark index values
 */
export type PoseLandmarkIndex = typeof PoseLandmark[keyof typeof PoseLandmark];

/**
 * Key joints used for move detection (waist-up focus)
 */
export const KeyJoints = {
  NOSE: PoseLandmark.NOSE,
  LEFT_SHOULDER: PoseLandmark.LEFT_SHOULDER,
  RIGHT_SHOULDER: PoseLandmark.RIGHT_SHOULDER,
  LEFT_ELBOW: PoseLandmark.LEFT_ELBOW,
  RIGHT_ELBOW: PoseLandmark.RIGHT_ELBOW,
  LEFT_WRIST: PoseLandmark.LEFT_WRIST,
  RIGHT_WRIST: PoseLandmark.RIGHT_WRIST,
} as const;

/**
 * PoseDetector interface for webcam pose detection
 * 
 * Responsible for capturing webcam input, processing frames through
 * MediaPipe Pose, and extracting/smoothing body landmarks.
 * 
 * **Validates: Requirements 1.3**
 */
export interface PoseDetector {
  /**
   * Initialize webcam and MediaPipe Pose
   * 
   * Requests webcam permission, initializes MediaPipe Pose with lite model,
   * sets up video element with mirrored display.
   * 
   * @throws Error if webcam access is denied or MediaPipe initialization fails
   */
  initialize(): Promise<void>;
  
  /**
   * Process a single video frame and return landmarks
   * 
   * Captures current video frame, runs pose estimation, extracts waist-up
   * landmarks, filters by visibility threshold.
   * 
   * @returns Landmarks object or null if no valid pose detected
   */
  processFrame(): Promise<Landmarks | null>;
  
  /**
   * Apply EMA smoothing to landmark positions
   * 
   * Applies Exponential Moving Average filter with alpha=0.3 to each
   * landmark's x, y, z coordinates for stability.
   * 
   * @param raw - Raw landmark data from current frame
   * @param previous - Previously smoothed landmark data
   * @returns Smoothed landmark data
   */
  smoothLandmarks(raw: Landmarks, previous: Landmarks): Landmarks;
  
  /**
   * Check if a landmark has sufficient visibility
   * 
   * @param landmark - The landmark to check
   * @returns true if visibility >= VISIBILITY_THRESHOLD (default 0.5)
   */
  isLandmarkVisible(landmark: Landmark): boolean;
  
  /**
   * Release resources and cleanup
   * 
   * Stops webcam stream, releases MediaPipe resources.
   */
  dispose(): void;
}

/**
 * Configuration options for PoseDetector
 */
export interface PoseDetectorConfig {
  /**
   * Minimum visibility threshold for landmarks (0-1)
   * @default 0.5
   */
  visibilityThreshold: number;
  
  /**
   * EMA smoothing alpha value (0-1)
   * Lower = more smoothing, higher = more responsive
   * @default 0.3
   */
  smoothingAlpha: number;
  
  /**
   * Target frame rate for pose detection
   * @default 30
   */
  targetFps: number;
  
  /**
   * MediaPipe model complexity (0=lite, 1=full, 2=heavy)
   * @default 0
   */
  modelComplexity: number;
  
  /**
   * Mirror the video display horizontally
   * @default true
   */
  mirrorDisplay: boolean;
}
