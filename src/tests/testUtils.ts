/**
 * Test utilities for generating arbitrary pose data
 * Used for property-based testing with fast-check
 */

import * as fc from 'fast-check';
import { Landmark, Landmarks, PoseLandmark } from '../types';

/**
 * Generate a random Landmark with all properties
 */
export function arbitraryLandmark(): fc.Arbitrary<Landmark> {
  return fc.record({
    x: fc.double({ min: 0, max: 1, noNaN: true }),
    y: fc.double({ min: 0, max: 1, noNaN: true }),
    z: fc.double({ min: -1, max: 1, noNaN: true }),
    visibility: fc.double({ min: 0, max: 1, noNaN: true }),
  });
}

/**
 * Generate a landmark with high visibility (>0.5)
 * Useful for testing scenarios where landmarks should be visible
 */
export function arbitraryVisibleLandmark(): fc.Arbitrary<Landmark> {
  return fc.record({
    x: fc.double({ min: 0, max: 1, noNaN: true }),
    y: fc.double({ min: 0, max: 1, noNaN: true }),
    z: fc.double({ min: -1, max: 1, noNaN: true }),
    visibility: fc.double({ min: 0.5, max: 1, noNaN: true }),
  });
}

/**
 * Generate a full Landmarks object with 33 points (MediaPipe Pose standard)
 */
export function arbitraryLandmarks(): fc.Arbitrary<Landmarks> {
  return fc.record({
    points: fc.array(arbitraryLandmark(), { minLength: 33, maxLength: 33 }),
    timestamp: fc.nat(),
  });
}

/**
 * Generate Landmarks with all points having high visibility
 */
export function arbitraryVisibleLandmarks(): fc.Arbitrary<Landmarks> {
  return fc.record({
    points: fc.array(arbitraryVisibleLandmark(), { minLength: 33, maxLength: 33 }),
    timestamp: fc.nat(),
  });
}

/**
 * MediaPipe Pose landmark indices for key body parts
 * @deprecated Use PoseLandmark from '../types/pose' instead
 */
export const LANDMARK_INDICES = PoseLandmark;

/**
 * Generate landmarks for a specific body part with related positioning
 * Useful for testing move detection logic
 */
export function arbitraryWristLandmark(): fc.Arbitrary<Landmark> {
  return arbitraryVisibleLandmark();
}

export function arbitraryShoulderLandmark(): fc.Arbitrary<Landmark> {
  return fc.record({
    x: fc.double({ min: 0.3, max: 0.7, noNaN: true }), // Shoulders typically in middle third
    y: fc.double({ min: 0.2, max: 0.5, noNaN: true }), // Upper body
    z: fc.double({ min: -0.2, max: 0.2, noNaN: true }), // Near body center
    visibility: fc.double({ min: 0.6, max: 1, noNaN: true }), // Usually highly visible
  });
}

export function arbitraryHeadLandmark(): fc.Arbitrary<Landmark> {
  return fc.record({
    x: fc.double({ min: 0.3, max: 0.7, noNaN: true }), // Head typically centered
    y: fc.double({ min: 0.1, max: 0.3, noNaN: true }), // Top of frame
    z: fc.double({ min: -0.1, max: 0.1, noNaN: true }), // Near front
    visibility: fc.double({ min: 0.7, max: 1, noNaN: true }), // Usually highly visible
  });
}

/**
 * Generate a Landmarks object with realistic body positioning
 * This constrains the random values to be more anatomically plausible
 */
export function arbitraryRealisticLandmarks(): fc.Arbitrary<Landmarks> {
  // Create an array of 33 landmark generators
  const landmarkGenerators = [
    // Head landmarks (0-10)
    ...Array(11).fill(0).map(() => arbitraryHeadLandmark()),
    // Shoulder landmarks (11-12)
    arbitraryShoulderLandmark(),
    arbitraryShoulderLandmark(),
    // Arm landmarks (13-22)
    ...Array(10).fill(0).map(() => arbitraryWristLandmark()),
    // Lower body landmarks (23-32)
    ...Array(10).fill(0).map(() => arbitraryLandmark())
  ];

  return fc.record({
    points: fc.tuple(...landmarkGenerators as [fc.Arbitrary<Landmark>, ...fc.Arbitrary<Landmark>[]])
      .map(tuple => [...tuple]),
    timestamp: fc.nat(),
  }) as fc.Arbitrary<Landmarks>;
}

/**
 * Calculate Euclidean distance between two landmarks
 */
export function distanceBetweenLandmarks(a: Landmark, b: Landmark): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + 
    Math.pow(a.y - b.y, 2) + 
    Math.pow(a.z - b.z, 2)
  );
}

/**
 * Calculate 2D distance (ignoring z-axis) between two landmarks
 */
export function distance2D(a: Landmark, b: Landmark): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + 
    Math.pow(a.y - b.y, 2)
  );
}

/**
 * Check if a landmark is visible above threshold
 */
export function isVisible(landmark: Landmark, threshold = 0.5): boolean {
  return landmark.visibility >= threshold;
}
