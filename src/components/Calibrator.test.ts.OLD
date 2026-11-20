/**
 * Unit tests for Calibrator component
 * 
 * Tests guard position detection, baseline averaging, calibration quality checks,
 * and retry logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Calibrator, CalibrationState } from './Calibrator';
import { Landmarks, Landmark } from '../types';
import { PoseLandmark } from '../types/pose';

/**
 * Helper function to create a landmark with specified values
 */
function createLandmark(x: number, y: number, z: number, visibility: number): Landmark {
  return { x, y, z, visibility };
}

/**
 * Helper function to create a full set of landmarks
 * Initializes all 33 landmarks with default values
 */
function createLandmarks(overrides: Partial<Record<number, Landmark>> = {}): Landmarks {
  const points: Landmark[] = [];
  
  // Initialize all 33 landmarks with default values
  for (let i = 0; i < 33; i++) {
    points.push(createLandmark(0.5, 0.5, 0, 0.8));
  }
  
  // Apply overrides
  for (const [index, landmark] of Object.entries(overrides)) {
    points[parseInt(index)] = landmark;
  }
  
  return {
    points,
    timestamp: Date.now()
  };
}

/**
 * Helper function to create landmarks representing guard position
 */
function createGuardPositionLandmarks(): Landmarks {
  return createLandmarks({
    [PoseLandmark.NOSE]: createLandmark(0.5, 0.3, 0, 0.9),
    [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.4, 0.45, 0, 0.9),
    [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.6, 0.45, 0, 0.9),
    [PoseLandmark.LEFT_WRIST]: createLandmark(0.45, 0.32, 0, 0.9),  // Near face
    [PoseLandmark.RIGHT_WRIST]: createLandmark(0.55, 0.32, 0, 0.9),  // Near face
    [PoseLandmark.LEFT_ELBOW]: createLandmark(0.35, 0.4, 0, 0.9),
    [PoseLandmark.RIGHT_ELBOW]: createLandmark(0.65, 0.4, 0, 0.9)
  });
}

/**
 * Helper function to create landmarks NOT in guard position (hands down)
 */
function createNonGuardPositionLandmarks(): Landmarks {
  return createLandmarks({
    [PoseLandmark.NOSE]: createLandmark(0.5, 0.3, 0, 0.9),
    [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.4, 0.45, 0, 0.9),
    [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.6, 0.45, 0, 0.9),
    [PoseLandmark.LEFT_WRIST]: createLandmark(0.3, 0.7, 0, 0.9),  // Far from face
    [PoseLandmark.RIGHT_WRIST]: createLandmark(0.7, 0.7, 0, 0.9),  // Far from face
    [PoseLandmark.LEFT_ELBOW]: createLandmark(0.35, 0.55, 0, 0.9),
    [PoseLandmark.RIGHT_ELBOW]: createLandmark(0.65, 0.55, 0, 0.9)
  });
}

describe('Calibrator', () => {
  let calibrator: Calibrator;

  beforeEach(() => {
    calibrator = new Calibrator();
  });

  describe('initialization', () => {
    it('should start in NOT_STARTED state', () => {
      expect(calibrator.getState()).toBe(CalibrationState.NOT_STARTED);
    });

    it('should have null baseline initially', () => {
      expect(calibrator.getBaseline()).toBeNull();
    });

    it('should have zero progress initially', () => {
      expect(calibrator.getProgress()).toBe(0);
    });

    it('should accept custom configuration', () => {
      const customCalibrator = new Calibrator({
        guardProximityThreshold: 0.15,
        minFrameCount: 15
      });
      
      const config = customCalibrator.getConfig();
      expect(config.guardProximityThreshold).toBe(0.15);
      expect(config.minFrameCount).toBe(15);
    });
  });

  describe('guard position detection', () => {
    it('should detect valid guard position', () => {
      const guardLandmarks = createGuardPositionLandmarks();
      expect(calibrator.isInGuardPosition(guardLandmarks)).toBe(true);
    });

    it('should reject non-guard position (hands down)', () => {
      const nonGuardLandmarks = createNonGuardPositionLandmarks();
      expect(calibrator.isInGuardPosition(nonGuardLandmarks)).toBe(false);
    });

    it('should reject guard position with unlevel shoulders', () => {
      const unlevelLandmarks = createLandmarks({
        [PoseLandmark.NOSE]: createLandmark(0.5, 0.3, 0, 0.9),
        [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.4, 0.4, 0, 0.9),  // Lower
        [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.6, 0.5, 0, 0.9),  // Higher (diff = 0.1)
        [PoseLandmark.LEFT_WRIST]: createLandmark(0.45, 0.32, 0, 0.9),
        [PoseLandmark.RIGHT_WRIST]: createLandmark(0.55, 0.32, 0, 0.9)
      });
      
      expect(calibrator.isInGuardPosition(unlevelLandmarks)).toBe(false);
    });

    it('should reject guard position with low visibility landmarks', () => {
      const lowVisibilityLandmarks = createLandmarks({
        [PoseLandmark.NOSE]: createLandmark(0.5, 0.3, 0, 0.9),
        [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.4, 0.45, 0, 0.9),
        [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.6, 0.45, 0, 0.9),
        [PoseLandmark.LEFT_WRIST]: createLandmark(0.45, 0.32, 0, 0.3),  // Low visibility
        [PoseLandmark.RIGHT_WRIST]: createLandmark(0.55, 0.32, 0, 0.9)
      });
      
      expect(calibrator.isInGuardPosition(lowVisibilityLandmarks)).toBe(false);
    });

    it('should reject guard position with insufficient landmarks', () => {
      const insufficientLandmarks: Landmarks = {
        points: [
          createLandmark(0.5, 0.3, 0, 0.9),
          createLandmark(0.4, 0.45, 0, 0.9)
        ],
        timestamp: Date.now()
      };
      
      expect(calibrator.isInGuardPosition(insufficientLandmarks)).toBe(false);
    });

    it('should accept guard position with shoulders slightly unlevel within threshold', () => {
      const slightlyUnlevelLandmarks = createLandmarks({
        [PoseLandmark.NOSE]: createLandmark(0.5, 0.3, 0, 0.9),
        [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.4, 0.45, 0, 0.9),
        [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.6, 0.48, 0, 0.9),  // Diff = 0.03 (< 0.05 threshold)
        [PoseLandmark.LEFT_WRIST]: createLandmark(0.45, 0.32, 0, 0.9),
        [PoseLandmark.RIGHT_WRIST]: createLandmark(0.55, 0.32, 0, 0.9)
      });
      
      expect(calibrator.isInGuardPosition(slightlyUnlevelLandmarks)).toBe(true);
    });
  });

  describe('calibration flow', () => {
    it('should transition to WAITING_FOR_GUARD when started', () => {
      calibrator.startCalibration();
      expect(calibrator.getState()).toBe(CalibrationState.WAITING_FOR_GUARD);
    });

    it('should not record frames before guard position detected', () => {
      calibrator.startCalibration();
      
      const nonGuardLandmarks = createNonGuardPositionLandmarks();
      const recorded = calibrator.recordFrame(nonGuardLandmarks);
      
      expect(recorded).toBe(false);
      expect(calibrator.getGoodFrameCount()).toBe(0);
    });

    it('should transition to RECORDING when guard position detected', () => {
      calibrator.startCalibration();
      
      const guardLandmarks = createGuardPositionLandmarks();
      calibrator.recordFrame(guardLandmarks);
      
      expect(calibrator.getState()).toBe(CalibrationState.RECORDING);
    });

    it('should record frames when in guard position', () => {
      calibrator.startCalibration();
      
      const guardLandmarks = createGuardPositionLandmarks();
      
      // First frame starts recording
      calibrator.recordFrame(guardLandmarks);
      expect(calibrator.getState()).toBe(CalibrationState.RECORDING);
      expect(calibrator.getGoodFrameCount()).toBe(1);
      
      // Subsequent frames are recorded
      calibrator.recordFrame(guardLandmarks);
      expect(calibrator.getGoodFrameCount()).toBe(2);
    });

    it('should update progress as frames are recorded', () => {
      calibrator.startCalibration();
      
      const guardLandmarks = createGuardPositionLandmarks();
      
      // Record some frames
      for (let i = 0; i < 15; i++) {
        calibrator.recordFrame(guardLandmarks);
      }
      
      const progress = calibrator.getProgress();
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(1);
      expect(progress).toBeCloseTo(15 / 30, 2);  // 15 out of 30 target frames
    });

    it('should complete calibration when enough frames collected', () => {
      // Use smaller frame count for faster test
      calibrator = new Calibrator({
        minFrameCount: 5,
        targetFrameCount: 10
      });
      
      calibrator.startCalibration();
      
      const guardLandmarks = createGuardPositionLandmarks();
      
      // Record target number of frames
      for (let i = 0; i < 10; i++) {
        calibrator.recordFrame(guardLandmarks);
      }
      
      expect(calibrator.getState()).toBe(CalibrationState.COMPLETED);
      expect(calibrator.getBaseline()).not.toBeNull();
    });

    it('should handle loss of guard position during recording', () => {
      calibrator.startCalibration();
      
      const guardLandmarks = createGuardPositionLandmarks();
      const nonGuardLandmarks = createNonGuardPositionLandmarks();
      
      // Start recording
      calibrator.recordFrame(guardLandmarks);
      expect(calibrator.getState()).toBe(CalibrationState.RECORDING);
      
      // Lose guard position
      const recorded = calibrator.recordFrame(nonGuardLandmarks);
      
      // Should still be recording, but frame not counted as good
      expect(recorded).toBe(false);
      expect(calibrator.getState()).toBe(CalibrationState.RECORDING);
    });
  });

  describe('baseline calculation', () => {
    it('should calculate accurate baseline from recorded frames', () => {
      calibrator = new Calibrator({
        minFrameCount: 3,
        targetFrameCount: 5
      });
      
      calibrator.startCalibration();
      
      // Create frames with known values
      const frame1 = createLandmarks({
        [PoseLandmark.NOSE]: createLandmark(0.5, 0.3, 0, 0.9),
        [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.4, 0.45, 0, 0.9),
        [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.6, 0.45, 0, 0.9),
        [PoseLandmark.LEFT_WRIST]: createLandmark(0.45, 0.32, -0.1, 0.9),
        [PoseLandmark.RIGHT_WRIST]: createLandmark(0.55, 0.32, -0.1, 0.9)
      });
      
      const frame2 = createLandmarks({
        [PoseLandmark.NOSE]: createLandmark(0.5, 0.31, 0, 0.9),
        [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.39, 0.45, 0, 0.9),
        [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.61, 0.45, 0, 0.9),
        [PoseLandmark.LEFT_WRIST]: createLandmark(0.44, 0.33, -0.09, 0.9),
        [PoseLandmark.RIGHT_WRIST]: createLandmark(0.56, 0.33, -0.11, 0.9)
      });
      
      const frame3 = createLandmarks({
        [PoseLandmark.NOSE]: createLandmark(0.5, 0.29, 0, 0.9),
        [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.41, 0.45, 0, 0.9),
        [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.59, 0.45, 0, 0.9),
        [PoseLandmark.LEFT_WRIST]: createLandmark(0.46, 0.31, -0.11, 0.9),
        [PoseLandmark.RIGHT_WRIST]: createLandmark(0.54, 0.31, -0.09, 0.9)
      });
      
      // Record frames
      calibrator.recordFrame(frame1);
      calibrator.recordFrame(frame2);
      calibrator.recordFrame(frame3);
      
      const baseline = calibrator.finishCalibration();
      
      expect(baseline).not.toBeNull();
      if (!baseline) return;
      
      // Center position should be average of shoulders midpoints
      // Frame 1: (0.4 + 0.6) / 2 = 0.5, y = 0.45
      // Frame 2: (0.39 + 0.61) / 2 = 0.5, y = 0.45
      // Frame 3: (0.41 + 0.59) / 2 = 0.5, y = 0.45
      expect(baseline.centerPosition.x).toBeCloseTo(0.5, 2);
      expect(baseline.centerPosition.y).toBeCloseTo(0.45, 2);
      
      // Head height should be average of nose y positions
      // (0.3 + 0.31 + 0.29) / 3 = 0.3
      expect(baseline.headHeight).toBeCloseTo(0.3, 2);
      
      // Wrist baselines should be averages
      // Left wrist x: (0.45 + 0.44 + 0.46) / 3 = 0.45
      expect(baseline.leftWristBaseline.x).toBeCloseTo(0.45, 2);
      // Right wrist x: (0.55 + 0.56 + 0.54) / 3 = 0.55
      expect(baseline.rightWristBaseline.x).toBeCloseTo(0.55, 2);
    });

    it('should calculate shoulder width from frame average', () => {
      calibrator = new Calibrator({
        minFrameCount: 2,
        targetFrameCount: 3
      });
      
      calibrator.startCalibration();
      
      // Create frames with known shoulder widths
      const frame1 = createLandmarks({
        [PoseLandmark.NOSE]: createLandmark(0.5, 0.3, 0, 0.9),
        [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.3, 0.45, 0, 0.9),  // Width = 0.4
        [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.7, 0.45, 0, 0.9),
        [PoseLandmark.LEFT_WRIST]: createLandmark(0.4, 0.32, 0, 0.9),
        [PoseLandmark.RIGHT_WRIST]: createLandmark(0.6, 0.32, 0, 0.9)
      });
      
      const frame2 = createLandmarks({
        [PoseLandmark.NOSE]: createLandmark(0.5, 0.3, 0, 0.9),
        [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.35, 0.45, 0, 0.9),  // Width = 0.3
        [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.65, 0.45, 0, 0.9),
        [PoseLandmark.LEFT_WRIST]: createLandmark(0.4, 0.32, 0, 0.9),
        [PoseLandmark.RIGHT_WRIST]: createLandmark(0.6, 0.32, 0, 0.9)
      });
      
      calibrator.recordFrame(frame1);
      calibrator.recordFrame(frame2);
      
      const baseline = calibrator.finishCalibration();
      
      expect(baseline).not.toBeNull();
      if (!baseline) return;
      
      // Average width = (0.4 + 0.3) / 2 = 0.35
      expect(baseline.shoulderWidth).toBeCloseTo(0.35, 2);
    });

    it('should reject calibration with insufficient good frames', () => {
      calibrator = new Calibrator({
        minFrameCount: 10,
        targetFrameCount: 20
      });
      
      calibrator.startCalibration();
      
      const guardLandmarks = createGuardPositionLandmarks();
      
      // Record only a few frames
      for (let i = 0; i < 5; i++) {
        calibrator.recordFrame(guardLandmarks);
      }
      
      const baseline = calibrator.finishCalibration();
      
      expect(baseline).toBeNull();
      expect(calibrator.getState()).toBe(CalibrationState.FAILED);
    });

    it('should exclude low visibility frames from averaging', () => {
      calibrator = new Calibrator({
        minFrameCount: 2,
        targetFrameCount: 4,
        calibrationVisibilityThreshold: 0.7
      });
      
      calibrator.startCalibration();
      
      const goodFrame = createGuardPositionLandmarks();
      
      const badFrame = createLandmarks({
        [PoseLandmark.NOSE]: createLandmark(0.5, 0.3, 0, 0.5),  // Low visibility
        [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.4, 0.45, 0, 0.9),
        [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.6, 0.45, 0, 0.9),
        [PoseLandmark.LEFT_WRIST]: createLandmark(0.45, 0.32, 0, 0.9),
        [PoseLandmark.RIGHT_WRIST]: createLandmark(0.55, 0.32, 0, 0.9)
      });
      
      // Record good and bad frames
      calibrator.recordFrame(goodFrame);  // Good
      calibrator.recordFrame(goodFrame);  // Good
      calibrator.recordFrame(badFrame);   // Bad - should not be in guard position due to low visibility
      calibrator.recordFrame(goodFrame);  // Good
      
      // Should have 3 good frames despite recording 4
      expect(calibrator.getGoodFrameCount()).toBe(3);
    });
  });

  describe('retry logic', () => {
    it('should allow retry after failure', () => {
      calibrator = new Calibrator({
        minFrameCount: 10,
        targetFrameCount: 20
      });
      
      calibrator.startCalibration();
      
      const guardLandmarks = createGuardPositionLandmarks();
      
      // Record insufficient frames and fail
      for (let i = 0; i < 5; i++) {
        calibrator.recordFrame(guardLandmarks);
      }
      calibrator.finishCalibration();
      expect(calibrator.getState()).toBe(CalibrationState.FAILED);
      
      // Retry
      calibrator.retry();
      expect(calibrator.getState()).toBe(CalibrationState.WAITING_FOR_GUARD);
      expect(calibrator.getGoodFrameCount()).toBe(0);
    });

    it('should clear previous data on retry', () => {
      calibrator = new Calibrator({
        minFrameCount: 2,
        targetFrameCount: 3
      });
      
      calibrator.startCalibration();
      
      const guardLandmarks = createGuardPositionLandmarks();
      
      // Complete first calibration
      for (let i = 0; i < 3; i++) {
        calibrator.recordFrame(guardLandmarks);
      }
      expect(calibrator.getState()).toBe(CalibrationState.COMPLETED);
      
      // Retry
      calibrator.retry();
      
      expect(calibrator.getState()).toBe(CalibrationState.WAITING_FOR_GUARD);
      expect(calibrator.getGoodFrameCount()).toBe(0);
      expect(calibrator.getBaseline()).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      calibrator = new Calibrator({
        minFrameCount: 2,
        targetFrameCount: 3
      });
      
      calibrator.startCalibration();
      
      const guardLandmarks = createGuardPositionLandmarks();
      
      // Complete calibration
      for (let i = 0; i < 3; i++) {
        calibrator.recordFrame(guardLandmarks);
      }
      
      // Reset
      calibrator.reset();
      
      expect(calibrator.getState()).toBe(CalibrationState.NOT_STARTED);
      expect(calibrator.getBaseline()).toBeNull();
      expect(calibrator.getGoodFrameCount()).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should allow updating configuration', () => {
      calibrator.updateConfig({
        guardProximityThreshold: 0.25,
        minFrameCount: 15
      });
      
      const config = calibrator.getConfig();
      expect(config.guardProximityThreshold).toBe(0.25);
      expect(config.minFrameCount).toBe(15);
      // Other values should remain at defaults
      expect(config.shoulderLevelThreshold).toBe(0.05);
    });

    it('should use updated thresholds for guard detection', () => {
      // Set a very strict proximity threshold
      calibrator.updateConfig({
        guardProximityThreshold: 0.01
      });
      
      // Normal guard position should now fail
      const guardLandmarks = createGuardPositionLandmarks();
      expect(calibrator.isInGuardPosition(guardLandmarks)).toBe(false);
      
      // Very close guard position should pass
      const veryCloseGuard = createLandmarks({
        [PoseLandmark.NOSE]: createLandmark(0.5, 0.3, 0, 0.9),
        [PoseLandmark.LEFT_SHOULDER]: createLandmark(0.4, 0.45, 0, 0.9),
        [PoseLandmark.RIGHT_SHOULDER]: createLandmark(0.6, 0.45, 0, 0.9),
        [PoseLandmark.LEFT_WRIST]: createLandmark(0.495, 0.305, 0, 0.9),  // Very close to nose
        [PoseLandmark.RIGHT_WRIST]: createLandmark(0.505, 0.305, 0, 0.9)   // Very close to nose
      });
      
      expect(calibrator.isInGuardPosition(veryCloseGuard)).toBe(true);
    });
  });
});
