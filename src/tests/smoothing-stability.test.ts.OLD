/**
 * Property-Based Test: Smoothing Increases Stability
 * 
 * **Validates: Requirements 3.2**
 * 
 * This test validates that applying EMA smoothing to jittery landmark data
 * produces more stable (lower variance) output than the raw input.
 * 
 * Metamorphic Property: For any sequence of raw landmark positions with jitter,
 * applying smoothing SHALL produce output positions with lower variance than the input.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PoseDetector } from '../components/PoseDetector';
import { Landmarks, Landmark, PoseLandmark } from '../types';
import { arbitraryLandmarks } from './testUtils';

/**
 * Calculate variance of a coordinate across a sequence of landmarks
 * 
 * Variance measures the spread of data points from their mean.
 * Lower variance = more stable, less jittery.
 */
function calculateCoordinateVariance(
  sequence: Landmarks[],
  landmarkIndex: number,
  coordinate: 'x' | 'y' | 'z'
): number {
  const values = sequence.map(landmarks => landmarks.points[landmarkIndex][coordinate]);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return variance;
}

/**
 * Calculate average variance across all key joints (waist-up)
 * 
 * Key joints: nose, shoulders, elbows, wrists
 */
function calculateAverageVariance(sequence: Landmarks[]): number {
  // Key waist-up joint indices
  const keyJoints = [
    PoseLandmark.NOSE,
    PoseLandmark.LEFT_SHOULDER,
    PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_ELBOW,
    PoseLandmark.RIGHT_ELBOW,
    PoseLandmark.LEFT_WRIST,
    PoseLandmark.RIGHT_WRIST
  ];

  let totalVariance = 0;
  let count = 0;

  // Calculate variance for x, y, z coordinates of each key joint
  for (const jointIndex of keyJoints) {
    const xVariance = calculateCoordinateVariance(sequence, jointIndex, 'x');
    const yVariance = calculateCoordinateVariance(sequence, jointIndex, 'y');
    const zVariance = calculateCoordinateVariance(sequence, jointIndex, 'z');

    totalVariance += xVariance + yVariance + zVariance;
    count += 3; // 3 coordinates per joint
  }

  return totalVariance / count;
}

/**
 * Generate a jittery landmark sequence by adding noise to base landmarks
 * 
 * Simulates camera jitter/noise that smoothing should reduce.
 */
function arbitraryJitteryLandmarkSequence(): fc.Arbitrary<Landmarks[]> {
  return fc.tuple(
    arbitraryLandmarks(), // Base landmarks
    fc.integer({ min: 3, max: 20 }), // Sequence length (3-20 frames)
    fc.double({ min: 0.01, max: 0.1, noNaN: true }) // Jitter magnitude
  ).map(([baseLandmarks, sequenceLength, jitterMagnitude]) => {
    const sequence: Landmarks[] = [];

    for (let i = 0; i < sequenceLength; i++) {
      // Add random jitter to each landmark
      const jitteredPoints: Landmark[] = baseLandmarks.points.map(point => ({
        x: point.x + (Math.random() - 0.5) * jitterMagnitude,
        y: point.y + (Math.random() - 0.5) * jitterMagnitude,
        z: point.z + (Math.random() - 0.5) * jitterMagnitude,
        visibility: point.visibility
      }));

      sequence.push({
        points: jitteredPoints,
        timestamp: baseLandmarks.timestamp + (i * 33) // 30fps frame timing
      });
    }

    return sequence;
  });
}

/**
 * Apply smoothing to a sequence of landmarks
 * 
 * Iteratively applies PoseDetector.smoothLandmarks() across the sequence.
 */
function applySmoothingToSequence(
  sequence: Landmarks[],
  detector: PoseDetector
): Landmarks[] {
  if (sequence.length === 0) {
    return [];
  }

  const smoothedSequence: Landmarks[] = [];
  
  // First frame has no previous data, so it's not smoothed
  smoothedSequence.push(sequence[0]);

  // Apply smoothing to subsequent frames
  for (let i = 1; i < sequence.length; i++) {
    const smoothed = detector.smoothLandmarks(sequence[i], smoothedSequence[i - 1]);
    smoothedSequence.push(smoothed);
  }

  return smoothedSequence;
}

describe('Property 7: Smoothing Increases Stability', () => {
  describe('**Validates: Requirements 3.2**', () => {
    it('should reduce variance in landmark positions across jittery sequences', () => {
      const detector = new PoseDetector();

      fc.assert(
        fc.property(
          arbitraryJitteryLandmarkSequence(),
          (rawSequence) => {
            // Skip sequences that are too short to measure variance meaningfully
            if (rawSequence.length < 3) {
              return true;
            }

            // Calculate variance of raw jittery data
            const rawVariance = calculateAverageVariance(rawSequence);

            // Apply smoothing across the sequence
            const smoothedSequence = applySmoothingToSequence(rawSequence, detector);

            // Calculate variance of smoothed data
            const smoothedVariance = calculateAverageVariance(smoothedSequence);

            // Smoothing MUST reduce variance (increase stability)
            // Allow for floating point comparison tolerance
            return smoothedVariance <= rawVariance;
          }
        ),
        { numRuns: 100 }
      );

      detector.dispose();
    });

    it('should reduce variance specifically for wrist movements (jab/punch detection)', () => {
      const detector = new PoseDetector();

      fc.assert(
        fc.property(
          arbitraryJitteryLandmarkSequence(),
          (rawSequence) => {
            if (rawSequence.length < 3) {
              return true;
            }

            // Focus on left and right wrists (critical for move detection)
            const leftWristXVarianceRaw = calculateCoordinateVariance(
              rawSequence, 
              PoseLandmark.LEFT_WRIST, 
              'x'
            );
            const rightWristXVarianceRaw = calculateCoordinateVariance(
              rawSequence, 
              PoseLandmark.RIGHT_WRIST, 
              'x'
            );

            const smoothedSequence = applySmoothingToSequence(rawSequence, detector);

            const leftWristXVarianceSmoothed = calculateCoordinateVariance(
              smoothedSequence, 
              PoseLandmark.LEFT_WRIST, 
              'x'
            );
            const rightWristXVarianceSmoothed = calculateCoordinateVariance(
              smoothedSequence, 
              PoseLandmark.RIGHT_WRIST, 
              'x'
            );

            // Smoothing should reduce wrist variance
            return (
              leftWristXVarianceSmoothed <= leftWristXVarianceRaw &&
              rightWristXVarianceSmoothed <= rightWristXVarianceRaw
            );
          }
        ),
        { numRuns: 100 }
      );

      detector.dispose();
    });

    it('should reduce variance for head position (used in calibration)', () => {
      const detector = new PoseDetector();

      fc.assert(
        fc.property(
          arbitraryJitteryLandmarkSequence(),
          (rawSequence) => {
            if (rawSequence.length < 3) {
              return true;
            }

            // Focus on nose (head reference point)
            const noseYVarianceRaw = calculateCoordinateVariance(
              rawSequence, 
              PoseLandmark.NOSE, 
              'y'
            );

            const smoothedSequence = applySmoothingToSequence(rawSequence, detector);

            const noseYVarianceSmoothed = calculateCoordinateVariance(
              smoothedSequence, 
              PoseLandmark.NOSE, 
              'y'
            );

            // Smoothing should reduce nose vertical variance
            return noseYVarianceSmoothed <= noseYVarianceRaw;
          }
        ),
        { numRuns: 100 }
      );

      detector.dispose();
    });

    it('should reduce variance with default smoothing alpha (0.3)', () => {
      const detector = new PoseDetector({ smoothingAlpha: 0.3 });

      fc.assert(
        fc.property(
          arbitraryJitteryLandmarkSequence(),
          (rawSequence) => {
            if (rawSequence.length < 3) {
              return true;
            }

            const rawVariance = calculateAverageVariance(rawSequence);
            const smoothedSequence = applySmoothingToSequence(rawSequence, detector);
            const smoothedVariance = calculateAverageVariance(smoothedSequence);

            return smoothedVariance <= rawVariance;
          }
        ),
        { numRuns: 100 }
      );

      detector.dispose();
    });

    it('should reduce variance with aggressive smoothing alpha (0.1)', () => {
      const detector = new PoseDetector({ smoothingAlpha: 0.1 });

      fc.assert(
        fc.property(
          arbitraryJitteryLandmarkSequence(),
          (rawSequence) => {
            if (rawSequence.length < 3) {
              return true;
            }

            const rawVariance = calculateAverageVariance(rawSequence);
            const smoothedSequence = applySmoothingToSequence(rawSequence, detector);
            const smoothedVariance = calculateAverageVariance(smoothedSequence);

            // Aggressive smoothing (lower alpha) should reduce variance more
            return smoothedVariance < rawVariance;
          }
        ),
        { numRuns: 100 }
      );

      detector.dispose();
    });

    it('should reduce variance even with mild smoothing alpha (0.7)', () => {
      const detector = new PoseDetector({ smoothingAlpha: 0.7 });

      fc.assert(
        fc.property(
          arbitraryJitteryLandmarkSequence(),
          (rawSequence) => {
            if (rawSequence.length < 3) {
              return true;
            }

            const rawVariance = calculateAverageVariance(rawSequence);
            const smoothedSequence = applySmoothingToSequence(rawSequence, detector);
            const smoothedVariance = calculateAverageVariance(smoothedSequence);

            // Even mild smoothing should provide some stability improvement
            return smoothedVariance <= rawVariance;
          }
        ),
        { numRuns: 100 }
      );

      detector.dispose();
    });

    it('should maintain stability improvement across longer sequences', () => {
      const detector = new PoseDetector();

      fc.assert(
        fc.property(
          fc.tuple(
            arbitraryLandmarks(),
            fc.integer({ min: 10, max: 30 }), // Longer sequences
            fc.double({ min: 0.02, max: 0.08, noNaN: true })
          ).map(([baseLandmarks, sequenceLength, jitterMagnitude]) => {
            const sequence: Landmarks[] = [];
            for (let i = 0; i < sequenceLength; i++) {
              const jitteredPoints: Landmark[] = baseLandmarks.points.map(point => ({
                x: point.x + (Math.random() - 0.5) * jitterMagnitude,
                y: point.y + (Math.random() - 0.5) * jitterMagnitude,
                z: point.z + (Math.random() - 0.5) * jitterMagnitude,
                visibility: point.visibility
              }));
              sequence.push({
                points: jitteredPoints,
                timestamp: baseLandmarks.timestamp + (i * 33)
              });
            }
            return sequence;
          }),
          (rawSequence) => {
            const rawVariance = calculateAverageVariance(rawSequence);
            const smoothedSequence = applySmoothingToSequence(rawSequence, detector);
            const smoothedVariance = calculateAverageVariance(smoothedSequence);

            return smoothedVariance < rawVariance;
          }
        ),
        { numRuns: 50 } // Fewer runs since sequences are longer
      );

      detector.dispose();
    });

    it('should reduce variance across all key joints individually', () => {
      const detector = new PoseDetector();

      fc.assert(
        fc.property(
          arbitraryJitteryLandmarkSequence(),
          (rawSequence) => {
            if (rawSequence.length < 3) {
              return true;
            }

            const keyJoints = [
              PoseLandmark.NOSE,
              PoseLandmark.LEFT_SHOULDER,
              PoseLandmark.RIGHT_SHOULDER,
              PoseLandmark.LEFT_ELBOW,
              PoseLandmark.RIGHT_ELBOW,
              PoseLandmark.LEFT_WRIST,
              PoseLandmark.RIGHT_WRIST
            ];

            const smoothedSequence = applySmoothingToSequence(rawSequence, detector);

            // Check that variance is reduced for each key joint
            for (const jointIndex of keyJoints) {
              const rawVarianceX = calculateCoordinateVariance(rawSequence, jointIndex, 'x');
              const rawVarianceY = calculateCoordinateVariance(rawSequence, jointIndex, 'y');
              const rawVarianceZ = calculateCoordinateVariance(rawSequence, jointIndex, 'z');

              const smoothedVarianceX = calculateCoordinateVariance(smoothedSequence, jointIndex, 'x');
              const smoothedVarianceY = calculateCoordinateVariance(smoothedSequence, jointIndex, 'y');
              const smoothedVarianceZ = calculateCoordinateVariance(smoothedSequence, jointIndex, 'z');

              // Each coordinate should have reduced or equal variance
              if (smoothedVarianceX > rawVarianceX) return false;
              if (smoothedVarianceY > rawVarianceY) return false;
              if (smoothedVarianceZ > rawVarianceZ) return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );

      detector.dispose();
    });

    it('should handle edge case: sequence with minimal jitter still maintains stability', () => {
      const detector = new PoseDetector();

      fc.assert(
        fc.property(
          fc.tuple(
            arbitraryLandmarks(),
            fc.integer({ min: 5, max: 10 }),
            fc.double({ min: 0.001, max: 0.01, noNaN: true }) // Very small jitter
          ).map(([baseLandmarks, sequenceLength, jitterMagnitude]) => {
            const sequence: Landmarks[] = [];
            for (let i = 0; i < sequenceLength; i++) {
              const jitteredPoints: Landmark[] = baseLandmarks.points.map(point => ({
                x: point.x + (Math.random() - 0.5) * jitterMagnitude,
                y: point.y + (Math.random() - 0.5) * jitterMagnitude,
                z: point.z + (Math.random() - 0.5) * jitterMagnitude,
                visibility: point.visibility
              }));
              sequence.push({
                points: jitteredPoints,
                timestamp: baseLandmarks.timestamp + (i * 33)
              });
            }
            return sequence;
          }),
          (rawSequence) => {
            const rawVariance = calculateAverageVariance(rawSequence);
            const smoothedSequence = applySmoothingToSequence(rawSequence, detector);
            const smoothedVariance = calculateAverageVariance(smoothedSequence);

            // Even with minimal jitter, smoothing shouldn't increase variance
            return smoothedVariance <= rawVariance;
          }
        ),
        { numRuns: 100 }
      );

      detector.dispose();
    });

    it('should handle edge case: high jitter sequences show significant variance reduction', () => {
      const detector = new PoseDetector();

      fc.assert(
        fc.property(
          fc.tuple(
            arbitraryLandmarks(),
            fc.integer({ min: 5, max: 15 }),
            fc.double({ min: 0.1, max: 0.2, noNaN: true }) // High jitter
          ).map(([baseLandmarks, sequenceLength, jitterMagnitude]) => {
            const sequence: Landmarks[] = [];
            for (let i = 0; i < sequenceLength; i++) {
              const jitteredPoints: Landmark[] = baseLandmarks.points.map(point => ({
                x: point.x + (Math.random() - 0.5) * jitterMagnitude,
                y: point.y + (Math.random() - 0.5) * jitterMagnitude,
                z: point.z + (Math.random() - 0.5) * jitterMagnitude,
                visibility: point.visibility
              }));
              sequence.push({
                points: jitteredPoints,
                timestamp: baseLandmarks.timestamp + (i * 33)
              });
            }
            return sequence;
          }),
          (rawSequence) => {
            const rawVariance = calculateAverageVariance(rawSequence);
            const smoothedSequence = applySmoothingToSequence(rawSequence, detector);
            const smoothedVariance = calculateAverageVariance(smoothedSequence);

            // High jitter should show noticeable variance reduction
            return smoothedVariance < rawVariance;
          }
        ),
        { numRuns: 100 }
      );

      detector.dispose();
    });
  });

  describe('Metamorphic property verification', () => {
    it('should satisfy metamorphic property: smoothing always reduces or maintains variance', () => {
      const detector = new PoseDetector();

      fc.assert(
        fc.property(
          arbitraryJitteryLandmarkSequence(),
          (rawSequence) => {
            if (rawSequence.length < 3) {
              return true;
            }

            const rawVariance = calculateAverageVariance(rawSequence);
            const smoothedSequence = applySmoothingToSequence(rawSequence, detector);
            const smoothedVariance = calculateAverageVariance(smoothedSequence);

            // Core metamorphic property: smoothed variance ≤ raw variance
            return smoothedVariance <= rawVariance;
          }
        ),
        { numRuns: 200 } // More runs for core property
      );

      detector.dispose();
    });
  });
});
