/**
 * Unit tests for MoveRecognizer component
 * 
 * Tests jab detection, cooldown management, and configuration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MoveRecognizer } from './MoveRecognizer';
import { Landmarks, BaselineData, MoveType } from '../types';
import { DEFAULT_THRESHOLD_CONFIG } from '../types/move';

/**
 * Helper function to create mock landmarks
 * Note: Wrists positioned FAR from head to avoid triggering block detection
 */
function createMockLandmarks(leftWristZ: number, timestamp: number = Date.now()): Landmarks {
  const points = Array(33).fill(null).map(() => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1.0,
  }));

  // Set nose/head (index 0) at top of frame
  points[0] = {
    x: 0.5,
    y: 0.2,
    z: 0,
    visibility: 1.0,
  };

  // Set left wrist (index 15) - far from head
  points[15] = {
    x: 0.2,
    y: 0.6,
    z: leftWristZ,
    visibility: 1.0,
  };

  // Set right wrist (index 16) to baseline position by default - far from head
  points[16] = {
    x: 0.8,
    y: 0.6,
    z: 0,
    visibility: 1.0,
  };

  return {
    points,
    timestamp,
  };
}

/**
 * Helper function to create mock landmarks with custom right wrist position
 * Note: Wrists positioned FAR from head to avoid triggering block detection
 */
function createMockLandmarksWithRightWrist(rightWristZ: number, timestamp: number = Date.now()): Landmarks {
  const points = Array(33).fill(null).map(() => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1.0,
  }));

  // Set nose/head (index 0) at top of frame
  points[0] = {
    x: 0.5,
    y: 0.2,
    z: 0,
    visibility: 1.0,
  };

  // Set left wrist (index 15) to baseline position - far from head
  points[15] = {
    x: 0.2,
    y: 0.6,
    z: 0,
    visibility: 1.0,
  };

  // Set right wrist (index 16) - far from head
  points[16] = {
    x: 0.8,
    y: 0.6,
    z: rightWristZ,
    visibility: 1.0,
  };

  return {
    points,
    timestamp,
  };
}

/**
 * Helper function to create mock landmarks with custom head and shoulder positions
 * Note: Wrists positioned FAR from head to avoid triggering block detection
 */
function createMockLandmarksWithDuck(
  headY: number,
  shoulderY: number,
  timestamp: number = Date.now()
): Landmarks {
  const points = Array(33).fill(null).map(() => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1.0,
  }));

  // Set nose/head (index 0)
  points[0] = {
    x: 0.5,
    y: headY,
    z: 0,
    visibility: 1.0,
  };

  // Set left shoulder (index 11)
  points[11] = {
    x: 0.4,
    y: shoulderY,
    z: 0,
    visibility: 1.0,
  };

  // Set right shoulder (index 12)
  points[12] = {
    x: 0.6,
    y: shoulderY,
    z: 0,
    visibility: 1.0,
  };

  // Set wrists to baseline positions - FAR from head to avoid block detection
  points[15] = {
    x: 0.2,
    y: 0.8,
    z: 0,
    visibility: 1.0,
  };

  points[16] = {
    x: 0.8,
    y: 0.8,
    z: 0,
    visibility: 1.0,
  };

  return {
    points,
    timestamp,
  };
}

/**
 * Helper function to create mock landmarks with block positioning
 * Both wrists positioned near head within block threshold
 */
function createMockLandmarksWithBlock(blocking: boolean, timestamp: number = Date.now()): Landmarks {
  const points = Array(33).fill(null).map(() => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1.0,
  }));

  // Set nose/head (index 0) at top of frame
  points[0] = {
    x: 0.5,
    y: 0.2,
    z: 0,
    visibility: 1.0,
  };

  if (blocking) {
    // Both wrists near head (within default threshold of 0.25)
    // But horizontally spread apart to avoid triggering charge detection
    // Distance between wrists: sqrt((0.65-0.35)^2) = 0.3 > chargeProximityThreshold (0.15)
    points[15] = {
      x: 0.35,
      y: 0.25,
      z: 0,
      visibility: 1.0,
    };

    points[16] = {
      x: 0.65,
      y: 0.25,
      z: 0,
      visibility: 1.0,
    };
  } else {
    // Wrists far from head
    points[15] = {
      x: 0.2,
      y: 0.6,
      z: 0,
      visibility: 1.0,
    };

    points[16] = {
      x: 0.8,
      y: 0.6,
      z: 0,
      visibility: 1.0,
    };
  }

  return {
    points,
    timestamp,
  };
}

/**
 * Helper function to create mock baseline data
 */
function createMockBaseline(): BaselineData {
  return {
    centerPosition: { x: 0.5, y: 0.5 },
    shoulderWidth: 0.3,
    headHeight: 0.2,
    leftWristBaseline: { x: 0.3, y: 0.4, z: 0 },
    rightWristBaseline: { x: 0.7, y: 0.4, z: 0 },
  };
}

describe('MoveRecognizer', () => {
  let recognizer: MoveRecognizer;
  let baseline: BaselineData;

  beforeEach(() => {
    recognizer = new MoveRecognizer();
    baseline = createMockBaseline();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = recognizer.getThresholds();
      expect(config.jabThreshold).toBe(DEFAULT_THRESHOLD_CONFIG.jabThreshold);
      expect(config.jabCooldown).toBe(DEFAULT_THRESHOLD_CONFIG.jabCooldown);
    });

    it('should accept partial config override', () => {
      const customRecognizer = new MoveRecognizer({
        jabThreshold: 0.25,
        jabCooldown: 1000,
      });
      const config = customRecognizer.getThresholds();
      expect(config.jabThreshold).toBe(0.25);
      expect(config.jabCooldown).toBe(1000);
      // Other values should remain default
      expect(config.powerPunchThreshold).toBe(DEFAULT_THRESHOLD_CONFIG.powerPunchThreshold);
    });

    it('should initialize cooldowns to zero', () => {
      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.JAB]).toBe(0);
      expect(cooldowns[MoveType.POWER_PUNCH]).toBe(0);
      expect(cooldowns[MoveType.DUCK]).toBe(0);
      expect(cooldowns[MoveType.CHARGE]).toBe(0);
    });
  });

  describe('jab detection', () => {
    it('should detect jab when left wrist moves forward beyond threshold', () => {
      // Baseline left wrist z = 0
      // Move left wrist to z = -0.2 (forward, since negative z is closer)
      // Delta = 0 - (-0.2) = 0.2
      // Default threshold = 0.15
      // Should detect jab since 0.2 > 0.15
      const landmarks = createMockLandmarks(-0.2);
      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(1);
      expect(moves[0].type).toBe(MoveType.JAB);
      expect(moves[0].intensity).toBeGreaterThan(0);
      expect(moves[0].timestamp).toBe(landmarks.timestamp);
    });

    it('should not detect jab when movement is below threshold', () => {
      // Move left wrist to z = -0.1 (small forward movement)
      // Delta = 0 - (-0.1) = 0.1
      // Default threshold = 0.15
      // Should NOT detect jab since 0.1 < 0.15
      const landmarks = createMockLandmarks(-0.1);
      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should not detect jab when wrist moves backward', () => {
      // Move left wrist to z = 0.2 (backward, away from camera)
      // Delta = 0 - 0.2 = -0.2 (negative)
      // Should NOT detect jab since delta is negative
      const landmarks = createMockLandmarks(0.2);
      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should calculate intensity based on delta magnitude', () => {
      // Baseline z = 0, threshold = 0.15
      // Test 1: z = -0.2, delta = 0.2, intensity ≈ 0.67 (0.2 / 0.3)
      const landmarks1 = createMockLandmarks(-0.2);
      const moves1 = recognizer.detectMoves(landmarks1, baseline, 100);
      expect(moves1[0].intensity).toBeCloseTo(0.67, 1);

      // Reset cooldown
      recognizer.updateCooldowns(500);

      // Test 2: z = -0.3, delta = 0.3, intensity = 1.0 (capped)
      const landmarks2 = createMockLandmarks(-0.3);
      const moves2 = recognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves2[0].intensity).toBe(1.0);
    });

    it('should not detect jab when landmark visibility is low', () => {
      const landmarks = createMockLandmarks(-0.2);
      // Set low visibility for left wrist
      landmarks.points[15].visibility = 0.3;

      const moves = recognizer.detectMoves(landmarks, baseline, 100);
      expect(moves).toHaveLength(0);
    });

    it('should respect custom threshold configuration', () => {
      const customRecognizer = new MoveRecognizer({ jabThreshold: 0.25 });
      
      // Delta = 0.2, which is now below threshold
      const landmarks = createMockLandmarks(-0.2);
      const moves = customRecognizer.detectMoves(landmarks, baseline, 100);
      expect(moves).toHaveLength(0);

      // Delta = 0.3, which is above threshold
      const landmarks2 = createMockLandmarks(-0.3);
      const moves2 = customRecognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves2).toHaveLength(1);
      expect(moves2[0].type).toBe(MoveType.JAB);
    });
  });

  describe('cooldown management', () => {
    it('should apply cooldown after jab detection', () => {
      const landmarks = createMockLandmarks(-0.2);
      recognizer.detectMoves(landmarks, baseline, 100);

      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.JAB]).toBe(DEFAULT_THRESHOLD_CONFIG.jabCooldown);
    });

    it('should block jab detection during cooldown', () => {
      // First jab
      const landmarks1 = createMockLandmarks(-0.2);
      const moves1 = recognizer.detectMoves(landmarks1, baseline, 100);
      expect(moves1).toHaveLength(1);

      // Immediate second attempt - should be blocked
      const landmarks2 = createMockLandmarks(-0.2);
      const moves2 = recognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves2).toHaveLength(0);

      // Cooldown should still be active
      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.JAB]).toBeGreaterThan(0);
    });

    it('should allow jab detection after cooldown expires', () => {
      // First jab
      const landmarks1 = createMockLandmarks(-0.2);
      recognizer.detectMoves(landmarks1, baseline, 100);

      // Update cooldowns to expire jab cooldown
      recognizer.updateCooldowns(DEFAULT_THRESHOLD_CONFIG.jabCooldown);

      // Cooldown should be zero
      expect(recognizer.getCooldowns()[MoveType.JAB]).toBe(0);

      // Second jab should work
      const landmarks2 = createMockLandmarks(-0.2, Date.now() + 1000);
      const moves2 = recognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves2).toHaveLength(1);
      expect(moves2[0].type).toBe(MoveType.JAB);
    });

    it('should decrease cooldowns by delta time', () => {
      const landmarks = createMockLandmarks(-0.2);
      recognizer.detectMoves(landmarks, baseline, 100);

      const initialCooldown = DEFAULT_THRESHOLD_CONFIG.jabCooldown;
      expect(recognizer.getCooldowns()[MoveType.JAB]).toBe(initialCooldown);

      // Update by 100ms
      recognizer.updateCooldowns(100);
      expect(recognizer.getCooldowns()[MoveType.JAB]).toBe(initialCooldown - 100);

      // Update by another 200ms
      recognizer.updateCooldowns(200);
      expect(recognizer.getCooldowns()[MoveType.JAB]).toBe(initialCooldown - 300);
    });

    it('should not let cooldowns go below zero', () => {
      const landmarks = createMockLandmarks(-0.2);
      recognizer.detectMoves(landmarks, baseline, 100);

      // Update by more than cooldown duration
      recognizer.updateCooldowns(DEFAULT_THRESHOLD_CONFIG.jabCooldown + 100);

      expect(recognizer.getCooldowns()[MoveType.JAB]).toBe(0);
    });

    it('should respect custom cooldown configuration', () => {
      const customRecognizer = new MoveRecognizer({ jabCooldown: 1000 });
      
      const landmarks = createMockLandmarks(-0.2);
      customRecognizer.detectMoves(landmarks, baseline, 100);

      expect(customRecognizer.getCooldowns()[MoveType.JAB]).toBe(1000);
    });

    it('should track cooldowns independently for each move type', () => {
      // Trigger jab
      const landmarks = createMockLandmarks(-0.2);
      recognizer.detectMoves(landmarks, baseline, 100);

      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.JAB]).toBe(DEFAULT_THRESHOLD_CONFIG.jabCooldown);
      // Other move types should still be zero
      expect(cooldowns[MoveType.POWER_PUNCH]).toBe(0);
      expect(cooldowns[MoveType.DUCK]).toBe(0);
      expect(cooldowns[MoveType.CHARGE]).toBe(0);
    });
  });

  describe('configuration management', () => {
    it('should update threshold configuration', () => {
      recognizer.setThresholds({
        jabThreshold: 0.2,
        jabCooldown: 600,
      });

      const config = recognizer.getThresholds();
      expect(config.jabThreshold).toBe(0.2);
      expect(config.jabCooldown).toBe(600);
    });

    it('should preserve other config values when updating', () => {
      recognizer.setThresholds({
        jabThreshold: 0.2,
      });

      const config = recognizer.getThresholds();
      expect(config.jabThreshold).toBe(0.2);
      // Other values should remain default
      expect(config.jabCooldown).toBe(DEFAULT_THRESHOLD_CONFIG.jabCooldown);
      expect(config.powerPunchThreshold).toBe(DEFAULT_THRESHOLD_CONFIG.powerPunchThreshold);
    });

    it('should return a copy of config to prevent external modification', () => {
      const config1 = recognizer.getThresholds();
      config1.jabThreshold = 999;

      const config2 = recognizer.getThresholds();
      expect(config2.jabThreshold).toBe(DEFAULT_THRESHOLD_CONFIG.jabThreshold);
    });

    it('should return a copy of cooldowns to prevent external modification', () => {
      const landmarks = createMockLandmarks(-0.2);
      recognizer.detectMoves(landmarks, baseline, 100);

      const cooldowns1 = recognizer.getCooldowns();
      cooldowns1[MoveType.JAB] = 0;

      const cooldowns2 = recognizer.getCooldowns();
      expect(cooldowns2[MoveType.JAB]).toBe(DEFAULT_THRESHOLD_CONFIG.jabCooldown);
    });
  });

  describe('power punch detection', () => {
    it('should detect power punch when right wrist moves forward beyond threshold', () => {
      // Baseline right wrist z = 0
      // Move right wrist to z = -0.25 (forward, since negative z is closer)
      // Delta = 0 - (-0.25) = 0.25
      // Default threshold = 0.2
      // Should detect power punch since 0.25 > 0.2
      const landmarks = createMockLandmarksWithRightWrist(-0.25);
      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(1);
      expect(moves[0].type).toBe(MoveType.POWER_PUNCH);
      expect(moves[0].intensity).toBeGreaterThan(0);
      expect(moves[0].timestamp).toBe(landmarks.timestamp);
    });

    it('should not detect power punch when movement is below threshold', () => {
      // Move right wrist to z = -0.15 (small forward movement)
      // Delta = 0 - (-0.15) = 0.15
      // Default threshold = 0.2
      // Should NOT detect power punch since 0.15 < 0.2
      const landmarks = createMockLandmarksWithRightWrist(-0.15);
      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should not detect power punch when wrist moves backward', () => {
      // Move right wrist to z = 0.25 (backward, away from camera)
      // Delta = 0 - 0.25 = -0.25 (negative)
      // Should NOT detect power punch since delta is negative
      const landmarks = createMockLandmarksWithRightWrist(0.25);
      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should calculate intensity based on delta magnitude', () => {
      // Baseline z = 0, threshold = 0.2
      // Test 1: z = -0.25, delta = 0.25, intensity ≈ 0.625 (0.25 / 0.4)
      const landmarks1 = createMockLandmarksWithRightWrist(-0.25);
      const moves1 = recognizer.detectMoves(landmarks1, baseline, 100);
      expect(moves1[0].intensity).toBeCloseTo(0.625, 2);

      // Reset cooldown
      recognizer.updateCooldowns(800);

      // Test 2: z = -0.4, delta = 0.4, intensity = 1.0 (capped)
      const landmarks2 = createMockLandmarksWithRightWrist(-0.4);
      const moves2 = recognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves2[0].intensity).toBe(1.0);
    });

    it('should not detect power punch when landmark visibility is low', () => {
      const landmarks = createMockLandmarksWithRightWrist(-0.25);
      // Set low visibility for right wrist
      landmarks.points[16].visibility = 0.4;

      const moves = recognizer.detectMoves(landmarks, baseline, 100);
      expect(moves).toHaveLength(0);
    });

    it('should respect custom threshold configuration', () => {
      const customRecognizer = new MoveRecognizer({ powerPunchThreshold: 0.3 });
      
      // Delta = 0.25, which is now below threshold
      const landmarks = createMockLandmarksWithRightWrist(-0.25);
      const moves = customRecognizer.detectMoves(landmarks, baseline, 100);
      expect(moves).toHaveLength(0);

      // Delta = 0.35, which is above threshold
      const landmarks2 = createMockLandmarksWithRightWrist(-0.35);
      const moves2 = customRecognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves2).toHaveLength(1);
      expect(moves2[0].type).toBe(MoveType.POWER_PUNCH);
    });

    it('should apply cooldown after power punch detection', () => {
      const landmarks = createMockLandmarksWithRightWrist(-0.25);
      recognizer.detectMoves(landmarks, baseline, 100);

      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.POWER_PUNCH]).toBe(DEFAULT_THRESHOLD_CONFIG.powerPunchCooldown);
    });

    it('should block power punch detection during cooldown', () => {
      // First power punch
      const landmarks1 = createMockLandmarksWithRightWrist(-0.25);
      const moves1 = recognizer.detectMoves(landmarks1, baseline, 100);
      expect(moves1).toHaveLength(1);

      // Immediate second attempt - should be blocked
      const landmarks2 = createMockLandmarksWithRightWrist(-0.25);
      const moves2 = recognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves2).toHaveLength(0);

      // Cooldown should still be active
      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.POWER_PUNCH]).toBeGreaterThan(0);
    });

    it('should allow power punch detection after cooldown expires', () => {
      // First power punch
      const landmarks1 = createMockLandmarksWithRightWrist(-0.25);
      recognizer.detectMoves(landmarks1, baseline, 100);

      // Update cooldowns to expire power punch cooldown
      recognizer.updateCooldowns(DEFAULT_THRESHOLD_CONFIG.powerPunchCooldown);

      // Cooldown should be zero
      expect(recognizer.getCooldowns()[MoveType.POWER_PUNCH]).toBe(0);

      // Second power punch should work
      const landmarks2 = createMockLandmarksWithRightWrist(-0.25, Date.now() + 1000);
      const moves2 = recognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves2).toHaveLength(1);
      expect(moves2[0].type).toBe(MoveType.POWER_PUNCH);
    });

    it('should respect custom cooldown configuration', () => {
      const customRecognizer = new MoveRecognizer({ powerPunchCooldown: 1200 });
      
      const landmarks = createMockLandmarksWithRightWrist(-0.25);
      customRecognizer.detectMoves(landmarks, baseline, 100);

      expect(customRecognizer.getCooldowns()[MoveType.POWER_PUNCH]).toBe(1200);
    });

    it('should not interfere with jab cooldown', () => {
      // Trigger power punch
      const landmarks = createMockLandmarksWithRightWrist(-0.25);
      recognizer.detectMoves(landmarks, baseline, 100);

      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.POWER_PUNCH]).toBe(DEFAULT_THRESHOLD_CONFIG.powerPunchCooldown);
      // Jab cooldown should still be zero
      expect(cooldowns[MoveType.JAB]).toBe(0);
    });

    it('should handle missing right wrist landmark gracefully', () => {
      const landmarks = createMockLandmarksWithRightWrist(-0.25);
      landmarks.points[16] = null as any; // Simulate missing right wrist

      const moves = recognizer.detectMoves(landmarks, baseline, 100);
      expect(moves).toHaveLength(0);
    });
  });

  describe('move conflict resolution', () => {
    it('should return only CHARGE when multiple moves detected (CHARGE has highest priority)', () => {
      const startTime = Date.now();
      
      // Create landmarks that would trigger both JAB and CHARGE
      const landmarks = createMockLandmarks(-0.2, startTime);
      
      // Manually position wrists together to trigger charge preparation
      landmarks.points[15] = { x: 0.5, y: 0.5, z: 0, visibility: 1.0 };
      landmarks.points[16] = { x: 0.51, y: 0.5, z: 0, visibility: 1.0 };
      
      // Trigger charge preparation
      recognizer.detectMoves(landmarks, baseline, 100);
      
      // Now separate wrists and also trigger jab (left wrist forward)
      const landmarks2 = createMockLandmarks(-0.2, startTime + 100);
      landmarks2.points[15] = { x: 0.3, y: 0.5, z: -0.2, visibility: 1.0 }; // Far apart + forward for jab
      landmarks2.points[16] = { x: 0.7, y: 0.5, z: 0, visibility: 1.0 };
      
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);
      
      // Should only return CHARGE (priority 5 > JAB priority 1)
      expect(moves).toHaveLength(1);
      expect(moves[0].type).toBe(MoveType.CHARGE);
    });

    it('should return only BLOCK when BLOCK and DUCK detected (BLOCK > DUCK)', () => {
      const startTime = Date.now();
      
      // Build position history for duck
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      // Create landmarks that trigger both BLOCK and DUCK
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      // Position both wrists near head for block
      landmarks2.points[15] = { x: 0.45, y: 0.25, z: 0, visibility: 1.0 };
      landmarks2.points[16] = { x: 0.55, y: 0.25, z: 0, visibility: 1.0 };
      
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);
      
      // Should only return BLOCK (priority 4 > DUCK priority 3)
      expect(moves).toHaveLength(1);
      expect(moves[0].type).toBe(MoveType.BLOCK);
    });

    it('should return only DUCK when DUCK and POWER_PUNCH detected (DUCK > POWER_PUNCH)', () => {
      const startTime = Date.now();
      
      // Build position history for duck
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      // Create landmarks that trigger both DUCK and POWER_PUNCH
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      // Position right wrist forward for power punch (far from head to avoid block)
      landmarks2.points[16] = { x: 0.8, y: 0.8, z: -0.25, visibility: 1.0 };
      landmarks2.points[15] = { x: 0.2, y: 0.8, z: 0, visibility: 1.0 };
      
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);
      
      // Should only return DUCK (priority 3 > POWER_PUNCH priority 2)
      expect(moves).toHaveLength(1);
      expect(moves[0].type).toBe(MoveType.DUCK);
    });

    it('should return only POWER_PUNCH when POWER_PUNCH and JAB detected (POWER_PUNCH > JAB)', () => {
      // Create landmarks with both wrists forward
      const landmarks = createMockLandmarks(-0.2);
      landmarks.points[16] = { x: 0.8, y: 0.6, z: -0.25, visibility: 1.0 }; // Right wrist forward
      
      const moves = recognizer.detectMoves(landmarks, baseline, 100);
      
      // Should only return POWER_PUNCH (priority 2 > JAB priority 1)
      expect(moves).toHaveLength(1);
      expect(moves[0].type).toBe(MoveType.POWER_PUNCH);
    });

    it('should return empty array when no moves detected', () => {
      const landmarks = createMockLandmarks(0); // No movement
      const moves = recognizer.detectMoves(landmarks, baseline, 100);
      
      expect(moves).toHaveLength(0);
    });

    it('should return single move when only one move detected', () => {
      const landmarks = createMockLandmarks(-0.2); // Only jab
      const moves = recognizer.detectMoves(landmarks, baseline, 100);
      
      expect(moves).toHaveLength(1);
      expect(moves[0].type).toBe(MoveType.JAB);
    });

    it('should apply conflict resolution with all five moves (CHARGE wins)', () => {
      const startTime = Date.now();
      
      // Build position history for duck
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      // Trigger charge preparation
      const prepLandmarks = createMockLandmarks(0, startTime + 50);
      prepLandmarks.points[15] = { x: 0.5, y: 0.5, z: 0, visibility: 1.0 };
      prepLandmarks.points[16] = { x: 0.51, y: 0.5, z: 0, visibility: 1.0 };
      recognizer.detectMoves(prepLandmarks, baseline, 100);
      
      // Create scenario with all moves possible:
      // - CHARGE: wrists separate after being together
      // - BLOCK: wrists near head
      // - DUCK: head and shoulders drop
      // - POWER_PUNCH: right wrist forward
      // - JAB: left wrist forward
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      landmarks2.points[15] = { x: 0.3, y: 0.25, z: -0.2, visibility: 1.0 }; // Near head + forward
      landmarks2.points[16] = { x: 0.7, y: 0.25, z: -0.25, visibility: 1.0 }; // Near head + forward
      
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);
      
      // Should only return CHARGE (highest priority)
      expect(moves).toHaveLength(1);
      expect(moves[0].type).toBe(MoveType.CHARGE);
    });
  });

  describe('edge cases', () => {
    it('should handle missing landmark data gracefully', () => {
      const landmarks = createMockLandmarks(-0.2);
      landmarks.points[15] = null as any; // Simulate missing left wrist

      const moves = recognizer.detectMoves(landmarks, baseline, 100);
      expect(moves).toHaveLength(0);
    });

    it('should handle zero delta movement', () => {
      // Left wrist at exactly baseline position
      const landmarks = createMockLandmarks(0);
      const moves = recognizer.detectMoves(landmarks, baseline, 100);
      expect(moves).toHaveLength(0);
    });

    it('should handle very small cooldown updates', () => {
      const landmarks = createMockLandmarks(-0.2);
      recognizer.detectMoves(landmarks, baseline, 100);

      // Update by 1ms at a time
      for (let i = 0; i < 10; i++) {
        recognizer.updateCooldowns(1);
      }

      expect(recognizer.getCooldowns()[MoveType.JAB]).toBe(
        DEFAULT_THRESHOLD_CONFIG.jabCooldown - 10
      );
    });

    it('should handle stamina parameter (for future charge attack)', () => {
      // Stamina parameter should not affect jab detection
      const landmarks = createMockLandmarks(-0.2);
      
      const movesHighStamina = recognizer.detectMoves(landmarks, baseline, 100);
      recognizer.updateCooldowns(500); // Reset cooldown
      
      const movesLowStamina = recognizer.detectMoves(landmarks, baseline, 0);
      
      // Both should detect jab (stamina only affects charge attack)
      expect(movesHighStamina).toHaveLength(1);
      expect(movesLowStamina).toHaveLength(1);
    });
  });

  describe('duck detection', () => {
    it('should detect duck when head and shoulders drop beyond threshold within time window', () => {
      const startTime = Date.now();
      
      // Build up position history with baseline positions
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      // Wait a small amount of time and drop significantly
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);

      // Duck should be detected (drop = 0.2, threshold = 0.15, within 300ms window)
      expect(moves).toHaveLength(1);
      expect(moves[0].type).toBe(MoveType.DUCK);
      expect(moves[0].intensity).toBeGreaterThan(0);
      expect(moves[0].timestamp).toBe(landmarks2.timestamp);
    });

    it('should not detect duck when drop is below threshold', () => {
      const startTime = Date.now();
      
      // Build up position history
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      // Small drop (0.1, below threshold of 0.15)
      const landmarks2 = createMockLandmarksWithDuck(0.3, 0.3, startTime + 100);
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should not detect duck when movement is too slow (outside time window)', () => {
      const startTime = Date.now();
      
      // Build up position history
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      // Drop after time window expires (default 300ms)
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 400);
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);

      // Should not detect because drop is too slow
      expect(moves).toHaveLength(0);
    });

    it('should detect duck only when both head AND shoulders drop', () => {
      const startTime = Date.now();
      
      // Build up position history
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      // Only head drops, shoulders stay in place
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.2, startTime + 100);
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should calculate intensity based on drop magnitude', () => {
      const startTime = Date.now();
      
      // Build up position history
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      // Drop by 0.2 (threshold = 0.15)
      // Intensity ≈ 0.67 (0.2 / 0.3)
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);

      expect(moves[0].intensity).toBeCloseTo(0.67, 1);
    });

    it('should cap intensity at 1.0 for very large drops', () => {
      const startTime = Date.now();
      
      // Build up position history
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      // Very large drop (0.5)
      const landmarks2 = createMockLandmarksWithDuck(0.7, 0.7, startTime + 100);
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);

      expect(moves[0].intensity).toBe(1.0);
    });

    it('should not detect duck when head landmark visibility is low', () => {
      const startTime = Date.now();
      
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      landmarks2.points[0].visibility = 0.3; // Low head visibility
      
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves).toHaveLength(0);
    });

    it('should not detect duck when shoulder landmark visibility is low', () => {
      const startTime = Date.now();
      
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      landmarks2.points[11].visibility = 0.4; // Low left shoulder visibility
      
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves).toHaveLength(0);
    });

    it('should apply cooldown after duck detection', () => {
      const startTime = Date.now();
      
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      recognizer.detectMoves(landmarks2, baseline, 100);

      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.DUCK]).toBe(DEFAULT_THRESHOLD_CONFIG.duckCooldown);
    });

    it('should block duck detection during cooldown', () => {
      const startTime = Date.now();
      
      // First duck
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      const moves1 = recognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves1).toHaveLength(1);

      // Immediate second attempt - should be blocked
      const landmarks3 = createMockLandmarksWithDuck(0.2, 0.2, startTime + 150);
      recognizer.detectMoves(landmarks3, baseline, 100);
      
      const landmarks4 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 200);
      const moves2 = recognizer.detectMoves(landmarks4, baseline, 100);
      expect(moves2).toHaveLength(0);

      // Cooldown should still be active
      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.DUCK]).toBeGreaterThan(0);
    });

    it('should allow duck detection after cooldown expires', () => {
      const startTime = Date.now();
      
      // First duck
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      recognizer.detectMoves(landmarks2, baseline, 100);

      // Update cooldowns to expire duck cooldown
      recognizer.updateCooldowns(DEFAULT_THRESHOLD_CONFIG.duckCooldown);

      // Cooldown should be zero
      expect(recognizer.getCooldowns()[MoveType.DUCK]).toBe(0);

      // Second duck should work
      const landmarks3 = createMockLandmarksWithDuck(0.2, 0.2, startTime + 1000);
      recognizer.detectMoves(landmarks3, baseline, 100);
      
      const landmarks4 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 1100);
      const moves2 = recognizer.detectMoves(landmarks4, baseline, 100);
      
      expect(moves2).toHaveLength(1);
      expect(moves2[0].type).toBe(MoveType.DUCK);
    });

    it('should respect custom duck threshold configuration', () => {
      const customRecognizer = new MoveRecognizer({ duckThreshold: 0.25 });
      const startTime = Date.now();
      
      // Build position history
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      customRecognizer.detectMoves(landmarks1, baseline, 100);
      
      // Drop by 0.2, which is now below threshold
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      const moves = customRecognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves).toHaveLength(0);

      // Wait for cooldown to clear (there shouldn't be one, but let's be safe)
      customRecognizer.updateCooldowns(1000);

      // Drop by 0.3, which is above threshold
      const landmarks3 = createMockLandmarksWithDuck(0.2, 0.2, startTime + 1200);
      customRecognizer.detectMoves(landmarks3, baseline, 100);
      
      const landmarks4 = createMockLandmarksWithDuck(0.5, 0.5, startTime + 1300);
      const moves2 = customRecognizer.detectMoves(landmarks4, baseline, 100);
      expect(moves2).toHaveLength(1);
      expect(moves2[0].type).toBe(MoveType.DUCK);
    });

    it('should respect custom time window configuration', () => {
      const customRecognizer = new MoveRecognizer({ duckTimeWindow: 150 });
      const startTime = Date.now();
      
      // Build position history
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      customRecognizer.detectMoves(landmarks1, baseline, 100);
      
      // Drop after 200ms (outside 150ms window)
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 200);
      const moves = customRecognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves).toHaveLength(0);
    });

    it('should respect custom cooldown configuration', () => {
      const customRecognizer = new MoveRecognizer({ duckCooldown: 1000 });
      const startTime = Date.now();
      
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      customRecognizer.detectMoves(landmarks1, baseline, 100);
      
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      customRecognizer.detectMoves(landmarks2, baseline, 100);

      expect(customRecognizer.getCooldowns()[MoveType.DUCK]).toBe(1000);
    });

    it('should not interfere with jab or power punch cooldowns', () => {
      const startTime = Date.now();
      
      // Trigger duck
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      recognizer.detectMoves(landmarks2, baseline, 100);

      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.DUCK]).toBe(DEFAULT_THRESHOLD_CONFIG.duckCooldown);
      // Other cooldowns should still be zero
      expect(cooldowns[MoveType.JAB]).toBe(0);
      expect(cooldowns[MoveType.POWER_PUNCH]).toBe(0);
    });

    it('should require at least 2 position history entries to detect duck', () => {
      const startTime = Date.now();
      
      // First frame with drop - should not detect (no history)
      const landmarks1 = createMockLandmarksWithDuck(0.4, 0.4, startTime);
      const moves = recognizer.detectMoves(landmarks1, baseline, 100);
      
      expect(moves).toHaveLength(0);
    });

    it('should clean up old position history entries', () => {
      const startTime = Date.now();
      
      // Add several entries
      for (let i = 0; i < 5; i++) {
        const landmarks = createMockLandmarksWithDuck(0.2, 0.2, startTime + i * 50);
        recognizer.detectMoves(landmarks, baseline, 100);
      }
      
      // Add entry far in the future (should clean up old entries)
      const landmarks = createMockLandmarksWithDuck(0.2, 0.2, startTime + 1000);
      recognizer.detectMoves(landmarks, baseline, 100);
      
      // Position history should only contain recent entries
      // (Testing internal state indirectly through behavior)
      // Old entries should be cleaned up automatically
    });

    it('should handle missing head landmark gracefully', () => {
      const startTime = Date.now();
      
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      landmarks2.points[0] = null as any; // Missing head
      
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves).toHaveLength(0);
    });

    it('should handle missing shoulder landmarks gracefully', () => {
      const startTime = Date.now();
      
      const landmarks1 = createMockLandmarksWithDuck(0.2, 0.2, startTime);
      recognizer.detectMoves(landmarks1, baseline, 100);
      
      const landmarks2 = createMockLandmarksWithDuck(0.4, 0.4, startTime + 100);
      landmarks2.points[11] = null as any; // Missing left shoulder
      
      const moves = recognizer.detectMoves(landmarks2, baseline, 100);
      expect(moves).toHaveLength(0);
    });
  });

  describe('block detection', () => {
    it('should detect block when both wrists are within threshold distance of head', () => {
      const landmarks = createMockLandmarksWithBlock(true);
      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(1);
      expect(moves[0].type).toBe(MoveType.BLOCK);
      expect(moves[0].intensity).toBeGreaterThan(0);
    });

    it('should not detect block when only one wrist is near head', () => {
      // Left wrist near head, right wrist far away
      const landmarks = createMockLandmarksWithBlock(false);
      landmarks.points[15] = { x: 0.5, y: 0.25, z: 0, visibility: 1.0 }; // Left wrist near head
      landmarks.points[16] = { x: 0.8, y: 0.6, z: 0, visibility: 1.0 }; // Right wrist far
      landmarks.points[0] = { x: 0.5, y: 0.2, z: 0, visibility: 1.0 }; // Head

      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should not detect block when both wrists are far from head', () => {
      const landmarks = createMockLandmarks(0, Date.now());
      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should calculate intensity based on wrist proximity to head', () => {
      // Very close hands = higher intensity
      const closeHandsLandmarks = createMockLandmarksWithBlock(true);
      closeHandsLandmarks.points[15] = { x: 0.5, y: 0.21, z: 0, visibility: 1.0 }; // Very close
      closeHandsLandmarks.points[16] = { x: 0.5, y: 0.21, z: 0, visibility: 1.0 }; // Very close
      const closeMoves = recognizer.detectMoves(closeHandsLandmarks, baseline, 100);

      // Further hands = lower intensity
      const farHandsLandmarks = createMockLandmarksWithBlock(true);
      farHandsLandmarks.points[15] = { x: 0.35, y: 0.4, z: 0, visibility: 1.0 }; // Further but within threshold
      farHandsLandmarks.points[16] = { x: 0.65, y: 0.4, z: 0, visibility: 1.0 }; // Further but within threshold
      const farMoves = recognizer.detectMoves(farHandsLandmarks, baseline, 100);

      expect(closeMoves[0].intensity).toBeGreaterThan(farMoves[0].intensity);
    });

    it('should not have cooldown - block is continuous', () => {
      const landmarks = createMockLandmarksWithBlock(true);

      // First detection
      const moves1 = recognizer.detectMoves(landmarks, baseline, 100);
      expect(moves1).toHaveLength(1);
      expect(moves1[0].type).toBe(MoveType.BLOCK);

      // Immediate second detection - should still detect (no cooldown)
      const moves2 = recognizer.detectMoves(landmarks, baseline, 100);
      expect(moves2).toHaveLength(1);
      expect(moves2[0].type).toBe(MoveType.BLOCK);
    });

    it('should stop detecting block when hands move away', () => {
      const handsNearLandmarks = createMockLandmarksWithBlock(true);
      const moves1 = recognizer.detectMoves(handsNearLandmarks, baseline, 100);
      expect(moves1).toHaveLength(1);

      // Hands move away
      const handsAwayLandmarks = createMockLandmarks(0, Date.now());
      const moves2 = recognizer.detectMoves(handsAwayLandmarks, baseline, 100);
      expect(moves2).toHaveLength(0);

      // Hands come back near
      const handsBackLandmarks = createMockLandmarksWithBlock(true);
      const moves3 = recognizer.detectMoves(handsBackLandmarks, baseline, 100);
      expect(moves3).toHaveLength(1);
      expect(moves3[0].type).toBe(MoveType.BLOCK);
    });

    it('should respect custom block proximity threshold', () => {
      // Custom recognizer with very small threshold
      const customRecognizer = new MoveRecognizer({
        blockProximityThreshold: 0.05,
      });

      // Hands at moderate distance (would normally be within default threshold)
      const landmarks = createMockLandmarksWithBlock(true);
      landmarks.points[15] = { x: 0.45, y: 0.3, z: 0, visibility: 1.0 };
      landmarks.points[16] = { x: 0.55, y: 0.3, z: 0, visibility: 1.0 };
      landmarks.points[0] = { x: 0.5, y: 0.2, z: 0, visibility: 1.0 };

      const moves = customRecognizer.detectMoves(landmarks, baseline, 100);

      // Should NOT detect with small threshold
      expect(moves).toHaveLength(0);
    });

    it('should not detect block when left wrist visibility is low', () => {
      const landmarks = createMockLandmarksWithBlock(true);
      landmarks.points[15].visibility = 0.3; // Low visibility

      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should not detect block when right wrist visibility is low', () => {
      const landmarks = createMockLandmarksWithBlock(true);
      landmarks.points[16].visibility = 0.3; // Low visibility

      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should not detect block when head visibility is low', () => {
      const landmarks = createMockLandmarksWithBlock(true);
      landmarks.points[0].visibility = 0.3; // Low visibility

      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should handle missing left wrist landmark gracefully', () => {
      const landmarks = createMockLandmarksWithBlock(true);
      landmarks.points[15] = null as any;

      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should handle missing right wrist landmark gracefully', () => {
      const landmarks = createMockLandmarksWithBlock(true);
      landmarks.points[16] = null as any;

      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });

    it('should handle missing head landmark gracefully', () => {
      const landmarks = createMockLandmarksWithBlock(true);
      landmarks.points[0] = null as any;

      const moves = recognizer.detectMoves(landmarks, baseline, 100);

      expect(moves).toHaveLength(0);
    });
  });

  describe('charge attack detection', () => {
    /**
     * Helper function to create mock landmarks with custom wrist positions
     * Useful for testing charge attack (wrists together/apart)
     */
    function createMockLandmarksWithWristPositions(
      leftWristX: number,
      leftWristY: number,
      rightWristX: number,
      rightWristY: number,
      timestamp: number = Date.now()
    ): Landmarks {
      const points = Array(33).fill(null).map(() => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 1.0,
      }));

      // Set nose/head (index 0) at top of frame
      points[0] = {
        x: 0.5,
        y: 0.2,
        z: 0,
        visibility: 1.0,
      };

      // Set left wrist (index 15)
      points[15] = {
        x: leftWristX,
        y: leftWristY,
        z: 0,
        visibility: 1.0,
      };

      // Set right wrist (index 16)
      points[16] = {
        x: rightWristX,
        y: rightWristY,
        z: 0,
        visibility: 1.0,
      };

      return {
        points,
        timestamp,
      };
    }

    it('should detect charge attack when wrists come together then separate with sufficient stamina', () => {
      const stamina = 100; // High stamina

      // Step 1: IDLE state - wrists apart
      const landmarks1 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves1 = recognizer.detectMoves(landmarks1, baseline, stamina);
      expect(moves1.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);

      // Step 2: Wrists come together (within proximity threshold of 0.15)
      // Distance = sqrt((0.51 - 0.49)^2) = 0.02 < 0.15
      const landmarks2 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      const moves2 = recognizer.detectMoves(landmarks2, baseline, stamina);
      expect(moves2.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0); // Still charging

      // Step 3: Wrists separate (beyond release threshold of 0.4)
      // Distance = sqrt((0.8 - 0.2)^2) = 0.6 > 0.4
      const landmarks3 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves3 = recognizer.detectMoves(landmarks3, baseline, stamina);
      
      const chargeMoves = moves3.filter(m => m.type === MoveType.CHARGE);
      expect(chargeMoves).toHaveLength(1);
      expect(chargeMoves[0].intensity).toBeGreaterThan(0);
    });

    it('should not detect charge attack when stamina is below threshold', () => {
      const lowStamina = 30; // Below default threshold of 50

      // Step 1: Wrists come together
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks1, baseline, lowStamina);

      // Step 2: Wrists separate
      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves = recognizer.detectMoves(landmarks2, baseline, lowStamina);
      
      const chargeMoves = moves.filter(m => m.type === MoveType.CHARGE);
      expect(chargeMoves).toHaveLength(0); // No charge due to low stamina
    });

    it('should detect charge attack when stamina is exactly at threshold', () => {
      const exactStamina = 50; // Exactly at threshold

      // Wrists come together
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks1, baseline, exactStamina);

      // Wrists separate
      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves = recognizer.detectMoves(landmarks2, baseline, exactStamina);
      
      const chargeMoves = moves.filter(m => m.type === MoveType.CHARGE);
      expect(chargeMoves).toHaveLength(1); // Should detect at exact threshold
    });

    it('should not detect charge attack if wrists never come together', () => {
      const stamina = 100;

      // Wrists stay apart the entire time
      const landmarks1 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves1 = recognizer.detectMoves(landmarks1, baseline, stamina);
      
      const landmarks2 = createMockLandmarksWithWristPositions(0.3, 0.5, 0.7, 0.5);
      const moves2 = recognizer.detectMoves(landmarks2, baseline, stamina);

      expect(moves1.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);
      expect(moves2.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);
    });

    it('should not detect charge attack if wrists come together but do not separate enough', () => {
      const stamina = 100;

      // Wrists come together
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks1, baseline, stamina);

      // Wrists separate slightly but not beyond release threshold (0.4)
      // Distance = 0.3 < 0.4
      const landmarks2 = createMockLandmarksWithWristPositions(0.35, 0.5, 0.65, 0.5);
      const moves = recognizer.detectMoves(landmarks2, baseline, stamina);
      
      const chargeMoves = moves.filter(m => m.type === MoveType.CHARGE);
      expect(chargeMoves).toHaveLength(0);
    });

    it('should apply cooldown after charge attack detection', () => {
      const stamina = 100;

      // Execute charge attack
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks1, baseline, stamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      recognizer.detectMoves(landmarks2, baseline, stamina);

      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.CHARGE]).toBe(DEFAULT_THRESHOLD_CONFIG.chargeCooldown);
    });

    it('should block charge attack detection during cooldown', () => {
      const stamina = 100;

      // First charge attack
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks1, baseline, stamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves1 = recognizer.detectMoves(landmarks2, baseline, stamina);
      expect(moves1.filter(m => m.type === MoveType.CHARGE)).toHaveLength(1);

      // Immediate second attempt - should be blocked by cooldown
      const landmarks3 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks3, baseline, stamina);

      const landmarks4 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves2 = recognizer.detectMoves(landmarks4, baseline, stamina);
      expect(moves2.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);

      // Cooldown should still be active
      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.CHARGE]).toBeGreaterThan(0);
    });

    it('should allow charge attack detection after cooldown expires', () => {
      const stamina = 100;

      // First charge attack
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks1, baseline, stamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      recognizer.detectMoves(landmarks2, baseline, stamina);

      // Update cooldowns to expire charge cooldown
      recognizer.updateCooldowns(DEFAULT_THRESHOLD_CONFIG.chargeCooldown);

      // Cooldown should be zero
      expect(recognizer.getCooldowns()[MoveType.CHARGE]).toBe(0);

      // Second charge attack should work
      const landmarks3 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks3, baseline, stamina);

      const landmarks4 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves2 = recognizer.detectMoves(landmarks4, baseline, stamina);
      
      expect(moves2.filter(m => m.type === MoveType.CHARGE)).toHaveLength(1);
    });

    it('should calculate intensity based on separation distance', () => {
      const stamina = 100;

      // Charge preparation
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks1, baseline, stamina);

      // Small separation (just above threshold)
      // Distance = 0.45 (release threshold = 0.4)
      const landmarks2 = createMockLandmarksWithWristPositions(0.3, 0.5, 0.75, 0.5);
      const moves1 = recognizer.detectMoves(landmarks2, baseline, stamina);
      const smallIntensity = moves1.filter(m => m.type === MoveType.CHARGE)[0].intensity;

      // Reset for next test
      recognizer.updateCooldowns(DEFAULT_THRESHOLD_CONFIG.chargeCooldown);

      // Large separation
      // Distance = 0.8
      const landmarks3 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks3, baseline, stamina);

      const landmarks4 = createMockLandmarksWithWristPositions(0.1, 0.5, 0.9, 0.5);
      const moves2 = recognizer.detectMoves(landmarks4, baseline, stamina);
      const largeIntensity = moves2.filter(m => m.type === MoveType.CHARGE)[0].intensity;

      // Larger separation should give higher intensity
      expect(largeIntensity).toBeGreaterThan(smallIntensity);
    });

    it('should cap intensity at 1.0 for very large separations', () => {
      const stamina = 100;

      // Charge preparation
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks1, baseline, stamina);

      // Very large separation
      const landmarks2 = createMockLandmarksWithWristPositions(0, 0.5, 1, 0.5);
      const moves = recognizer.detectMoves(landmarks2, baseline, stamina);
      
      expect(moves.filter(m => m.type === MoveType.CHARGE)[0].intensity).toBe(1.0);
    });

    it('should not detect charge attack when left wrist visibility is low', () => {
      const stamina = 100;

      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      landmarks1.points[15].visibility = 0.3; // Low left wrist visibility
      recognizer.detectMoves(landmarks1, baseline, stamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      landmarks2.points[15].visibility = 0.3;
      const moves = recognizer.detectMoves(landmarks2, baseline, stamina);
      
      expect(moves.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);
    });

    it('should not detect charge attack when right wrist visibility is low', () => {
      const stamina = 100;

      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      landmarks1.points[16].visibility = 0.4; // Low right wrist visibility
      recognizer.detectMoves(landmarks1, baseline, stamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      landmarks2.points[16].visibility = 0.4;
      const moves = recognizer.detectMoves(landmarks2, baseline, stamina);
      
      expect(moves.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);
    });

    it('should respect custom proximity threshold configuration', () => {
      const customRecognizer = new MoveRecognizer({ chargeProximityThreshold: 0.05 });
      const stamina = 100;

      // Wrists at distance 0.1 (above new threshold of 0.05)
      const landmarks1 = createMockLandmarksWithWristPositions(0.45, 0.5, 0.55, 0.5);
      customRecognizer.detectMoves(landmarks1, baseline, stamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves = customRecognizer.detectMoves(landmarks2, baseline, stamina);
      
      // Should not detect because wrists weren't close enough in step 1
      expect(moves.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);

      // Now test with wrists truly close together (distance < 0.05)
      const landmarks3 = createMockLandmarksWithWristPositions(0.495, 0.5, 0.505, 0.5);
      customRecognizer.detectMoves(landmarks3, baseline, stamina);

      const landmarks4 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves2 = customRecognizer.detectMoves(landmarks4, baseline, stamina);
      
      expect(moves2.filter(m => m.type === MoveType.CHARGE)).toHaveLength(1);
    });

    it('should respect custom release threshold configuration', () => {
      const customRecognizer = new MoveRecognizer({ chargeReleaseThreshold: 0.6 });
      const stamina = 100;

      // Charge preparation
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      customRecognizer.detectMoves(landmarks1, baseline, stamina);

      // Separate by 0.5 (below new threshold of 0.6)
      const landmarks2 = createMockLandmarksWithWristPositions(0.25, 0.5, 0.75, 0.5);
      const moves = customRecognizer.detectMoves(landmarks2, baseline, stamina);
      
      expect(moves.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);

      // Separate by 0.7 (above threshold)
      const landmarks3 = createMockLandmarksWithWristPositions(0.15, 0.5, 0.85, 0.5);
      const moves2 = customRecognizer.detectMoves(landmarks3, baseline, stamina);
      
      expect(moves2.filter(m => m.type === MoveType.CHARGE)).toHaveLength(1);
    });

    it('should respect custom stamina threshold configuration', () => {
      const customRecognizer = new MoveRecognizer({ chargeStaminaThreshold: 75 });
      
      // Test with stamina below custom threshold
      const lowStamina = 60;
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      customRecognizer.detectMoves(landmarks1, baseline, lowStamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves1 = customRecognizer.detectMoves(landmarks2, baseline, lowStamina);
      
      expect(moves1.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);

      // Test with stamina at custom threshold
      const enoughStamina = 75;
      const landmarks3 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      customRecognizer.detectMoves(landmarks3, baseline, enoughStamina);

      const landmarks4 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves2 = customRecognizer.detectMoves(landmarks4, baseline, enoughStamina);
      
      expect(moves2.filter(m => m.type === MoveType.CHARGE)).toHaveLength(1);
    });

    it('should respect custom cooldown configuration', () => {
      const customRecognizer = new MoveRecognizer({ chargeCooldown: 3000 });
      const stamina = 100;

      // Execute charge attack
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      customRecognizer.detectMoves(landmarks1, baseline, stamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      customRecognizer.detectMoves(landmarks2, baseline, stamina);

      expect(customRecognizer.getCooldowns()[MoveType.CHARGE]).toBe(3000);
    });

    it('should reset to IDLE state when wrists separate without sufficient stamina', () => {
      const lowStamina = 30;

      // Wrists come together (enter CHARGING state)
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks1, baseline, lowStamina);

      // Wrists separate but stamina too low (should reset to IDLE)
      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves1 = recognizer.detectMoves(landmarks2, baseline, lowStamina);
      expect(moves1.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);

      // Now with high stamina, should be able to charge again immediately
      const highStamina = 100;
      const landmarks3 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks3, baseline, highStamina);

      const landmarks4 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves2 = recognizer.detectMoves(landmarks4, baseline, highStamina);
      expect(moves2.filter(m => m.type === MoveType.CHARGE)).toHaveLength(1);
    });

    it('should reset to IDLE state when wrists separate during cooldown', () => {
      const stamina = 100;

      // First charge attack
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks1, baseline, stamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      recognizer.detectMoves(landmarks2, baseline, stamina);

      // Try to charge again during cooldown
      const landmarks3 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks3, baseline, stamina);

      const landmarks4 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      const moves = recognizer.detectMoves(landmarks4, baseline, stamina);
      
      // Should reset to IDLE without emitting charge
      expect(moves.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);
    });

    it('should not interfere with other move cooldowns', () => {
      const stamina = 100;

      // Execute charge attack
      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      recognizer.detectMoves(landmarks1, baseline, stamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      recognizer.detectMoves(landmarks2, baseline, stamina);

      const cooldowns = recognizer.getCooldowns();
      expect(cooldowns[MoveType.CHARGE]).toBe(DEFAULT_THRESHOLD_CONFIG.chargeCooldown);
      // Other cooldowns should still be zero
      expect(cooldowns[MoveType.JAB]).toBe(0);
      expect(cooldowns[MoveType.POWER_PUNCH]).toBe(0);
      expect(cooldowns[MoveType.DUCK]).toBe(0);
    });

    it('should handle missing left wrist landmark gracefully', () => {
      const stamina = 100;

      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      landmarks1.points[15] = null as any; // Missing left wrist
      recognizer.detectMoves(landmarks1, baseline, stamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      landmarks2.points[15] = null as any;
      const moves = recognizer.detectMoves(landmarks2, baseline, stamina);
      
      expect(moves.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);
    });

    it('should handle missing right wrist landmark gracefully', () => {
      const stamina = 100;

      const landmarks1 = createMockLandmarksWithWristPositions(0.49, 0.5, 0.51, 0.5);
      landmarks1.points[16] = null as any; // Missing right wrist
      recognizer.detectMoves(landmarks1, baseline, stamina);

      const landmarks2 = createMockLandmarksWithWristPositions(0.2, 0.5, 0.8, 0.5);
      landmarks2.points[16] = null as any;
      const moves = recognizer.detectMoves(landmarks2, baseline, stamina);
      
      expect(moves.filter(m => m.type === MoveType.CHARGE)).toHaveLength(0);
    });
  });
});
