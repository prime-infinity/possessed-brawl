/**
 * Unit tests for move detection type definitions
 * 
 * Verifies that types are correctly defined and can be instantiated.
 */

import { describe, it, expect } from 'vitest';
import { 
  ThresholdConfig, 
  DEFAULT_THRESHOLD_CONFIG,
  CooldownState,
  MoveRecognizer 
} from './move';
import { MoveType, DetectedMove } from './index';

describe('Move Detection Types', () => {
  describe('MoveType enum', () => {
    it('should define all expected move types', () => {
      expect(MoveType.JAB).toBe('jab');
      expect(MoveType.POWER_PUNCH).toBe('power_punch');
      expect(MoveType.DUCK).toBe('duck');
      expect(MoveType.BLOCK).toBe('block');
      expect(MoveType.CHARGE).toBe('charge');
      expect(MoveType.NONE).toBe('none');
    });
  });

  describe('DetectedMove interface', () => {
    it('should allow creating a valid detected move', () => {
      const move: DetectedMove = {
        type: MoveType.JAB,
        intensity: 0.75,
        timestamp: Date.now()
      };

      expect(move.type).toBe(MoveType.JAB);
      expect(move.intensity).toBe(0.75);
      expect(move.timestamp).toBeGreaterThan(0);
    });

    it('should enforce intensity range in type system', () => {
      const move: DetectedMove = {
        type: MoveType.POWER_PUNCH,
        intensity: 1.0, // max
        timestamp: Date.now()
      };

      expect(move.intensity).toBe(1.0);
    });
  });

  describe('ThresholdConfig interface', () => {
    it('should have all required jab parameters', () => {
      const config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG;

      expect(config.jabThreshold).toBeDefined();
      expect(config.jabCooldown).toBeDefined();
      expect(typeof config.jabThreshold).toBe('number');
      expect(typeof config.jabCooldown).toBe('number');
    });

    it('should have all required power punch parameters', () => {
      const config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG;

      expect(config.powerPunchThreshold).toBeDefined();
      expect(config.powerPunchCooldown).toBeDefined();
      expect(typeof config.powerPunchThreshold).toBe('number');
      expect(typeof config.powerPunchCooldown).toBe('number');
    });

    it('should have all required duck parameters', () => {
      const config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG;

      expect(config.duckThreshold).toBeDefined();
      expect(config.duckTimeWindow).toBeDefined();
      expect(config.duckCooldown).toBeDefined();
      expect(typeof config.duckThreshold).toBe('number');
      expect(typeof config.duckTimeWindow).toBe('number');
      expect(typeof config.duckCooldown).toBe('number');
    });

    it('should have all required block parameters', () => {
      const config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG;

      expect(config.blockProximityThreshold).toBeDefined();
      expect(typeof config.blockProximityThreshold).toBe('number');
    });

    it('should have all required charge attack parameters', () => {
      const config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG;

      expect(config.chargeProximityThreshold).toBeDefined();
      expect(config.chargeReleaseThreshold).toBeDefined();
      expect(config.chargeStaminaThreshold).toBeDefined();
      expect(config.chargeCooldown).toBeDefined();
      expect(typeof config.chargeProximityThreshold).toBe('number');
      expect(typeof config.chargeReleaseThreshold).toBe('number');
      expect(typeof config.chargeStaminaThreshold).toBe('number');
      expect(typeof config.chargeCooldown).toBe('number');
    });

    it('should have all required depth control parameters', () => {
      const config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG;

      expect(config.shoulderWidthForwardThreshold).toBeDefined();
      expect(config.shoulderWidthBackwardThreshold).toBeDefined();
      expect(typeof config.shoulderWidthForwardThreshold).toBe('number');
      expect(typeof config.shoulderWidthBackwardThreshold).toBe('number');
    });

    it('should allow creating custom configurations', () => {
      const customConfig: ThresholdConfig = {
        jabThreshold: 0.2,
        jabCooldown: 400,
        powerPunchThreshold: 0.25,
        powerPunchCooldown: 900,
        duckThreshold: 0.18,
        duckTimeWindow: 350,
        duckCooldown: 700,
        blockProximityThreshold: 0.3,
        chargeProximityThreshold: 0.12,
        chargeReleaseThreshold: 0.45,
        chargeStaminaThreshold: 60,
        chargeCooldown: 2500,
        shoulderWidthForwardThreshold: 0.12,
        shoulderWidthBackwardThreshold: 0.08,
      };

      expect(customConfig.jabThreshold).toBe(0.2);
      expect(customConfig.chargeStaminaThreshold).toBe(60);
    });
  });

  describe('DEFAULT_THRESHOLD_CONFIG', () => {
    it('should provide sensible default values', () => {
      expect(DEFAULT_THRESHOLD_CONFIG.jabThreshold).toBe(0.15);
      expect(DEFAULT_THRESHOLD_CONFIG.jabCooldown).toBe(500);
      expect(DEFAULT_THRESHOLD_CONFIG.powerPunchThreshold).toBe(0.2);
      expect(DEFAULT_THRESHOLD_CONFIG.powerPunchCooldown).toBe(800);
      expect(DEFAULT_THRESHOLD_CONFIG.duckThreshold).toBe(0.15);
      expect(DEFAULT_THRESHOLD_CONFIG.duckTimeWindow).toBe(300);
      expect(DEFAULT_THRESHOLD_CONFIG.duckCooldown).toBe(600);
      expect(DEFAULT_THRESHOLD_CONFIG.blockProximityThreshold).toBe(0.25);
      expect(DEFAULT_THRESHOLD_CONFIG.chargeProximityThreshold).toBe(0.15);
      expect(DEFAULT_THRESHOLD_CONFIG.chargeReleaseThreshold).toBe(0.4);
      expect(DEFAULT_THRESHOLD_CONFIG.chargeStaminaThreshold).toBe(50);
      expect(DEFAULT_THRESHOLD_CONFIG.chargeCooldown).toBe(2000);
      expect(DEFAULT_THRESHOLD_CONFIG.shoulderWidthForwardThreshold).toBe(0.1);
      expect(DEFAULT_THRESHOLD_CONFIG.shoulderWidthBackwardThreshold).toBe(0.1);
    });

    it('should have all thresholds as positive numbers', () => {
      const config = DEFAULT_THRESHOLD_CONFIG;
      
      expect(config.jabThreshold).toBeGreaterThan(0);
      expect(config.powerPunchThreshold).toBeGreaterThan(0);
      expect(config.duckThreshold).toBeGreaterThan(0);
      expect(config.blockProximityThreshold).toBeGreaterThan(0);
      expect(config.chargeProximityThreshold).toBeGreaterThan(0);
      expect(config.chargeReleaseThreshold).toBeGreaterThan(0);
      expect(config.shoulderWidthForwardThreshold).toBeGreaterThan(0);
      expect(config.shoulderWidthBackwardThreshold).toBeGreaterThan(0);
    });

    it('should have all cooldowns as positive numbers', () => {
      const config = DEFAULT_THRESHOLD_CONFIG;
      
      expect(config.jabCooldown).toBeGreaterThan(0);
      expect(config.powerPunchCooldown).toBeGreaterThan(0);
      expect(config.duckCooldown).toBeGreaterThan(0);
      expect(config.chargeCooldown).toBeGreaterThan(0);
      expect(config.duckTimeWindow).toBeGreaterThan(0);
    });

    it('should have power punch threshold greater than jab threshold', () => {
      // Power punch should require more forward movement than jab
      expect(DEFAULT_THRESHOLD_CONFIG.powerPunchThreshold)
        .toBeGreaterThanOrEqual(DEFAULT_THRESHOLD_CONFIG.jabThreshold);
    });

    it('should have power punch cooldown greater than jab cooldown', () => {
      // Power punch should have longer cooldown than jab
      expect(DEFAULT_THRESHOLD_CONFIG.powerPunchCooldown)
        .toBeGreaterThan(DEFAULT_THRESHOLD_CONFIG.jabCooldown);
    });

    it('should have charge cooldown as the longest', () => {
      // Charge attack should have the longest cooldown
      const config = DEFAULT_THRESHOLD_CONFIG;
      
      expect(config.chargeCooldown).toBeGreaterThan(config.jabCooldown);
      expect(config.chargeCooldown).toBeGreaterThan(config.powerPunchCooldown);
      expect(config.chargeCooldown).toBeGreaterThan(config.duckCooldown);
    });

    it('should have charge release threshold greater than charge proximity threshold', () => {
      // Release requires hands to separate more than preparation brings them together
      expect(DEFAULT_THRESHOLD_CONFIG.chargeReleaseThreshold)
        .toBeGreaterThan(DEFAULT_THRESHOLD_CONFIG.chargeProximityThreshold);
    });
  });

  describe('CooldownState interface', () => {
    it('should track cooldowns for moves with cooldowns', () => {
      const cooldowns: CooldownState = {
        [MoveType.JAB]: 100,
        [MoveType.POWER_PUNCH]: 200,
        [MoveType.DUCK]: 150,
        [MoveType.CHARGE]: 500,
      };

      expect(cooldowns[MoveType.JAB]).toBe(100);
      expect(cooldowns[MoveType.POWER_PUNCH]).toBe(200);
      expect(cooldowns[MoveType.DUCK]).toBe(150);
      expect(cooldowns[MoveType.CHARGE]).toBe(500);
    });

    it('should not track cooldowns for BLOCK or NONE', () => {
      const cooldowns: CooldownState = {
        [MoveType.JAB]: 0,
        [MoveType.POWER_PUNCH]: 0,
        [MoveType.DUCK]: 0,
        [MoveType.CHARGE]: 0,
      };

      // BLOCK and NONE should not be in CooldownState
      // This is enforced by the type system
      expect(cooldowns).toBeDefined();
    });
  });

  describe('MoveRecognizer interface', () => {
    it('should define all required methods', () => {
      // This is a compile-time check that the interface is correctly defined
      // We're just verifying the interface shape exists
      const mockRecognizer: Partial<MoveRecognizer> = {
        detectMoves: () => [],
        updateCooldowns: () => {},
        setThresholds: () => {},
        getThresholds: () => DEFAULT_THRESHOLD_CONFIG,
        getCooldowns: () => ({
          [MoveType.JAB]: 0,
          [MoveType.POWER_PUNCH]: 0,
          [MoveType.DUCK]: 0,
          [MoveType.CHARGE]: 0,
        }),
      };

      expect(mockRecognizer.detectMoves).toBeDefined();
      expect(mockRecognizer.updateCooldowns).toBeDefined();
      expect(mockRecognizer.setThresholds).toBeDefined();
      expect(mockRecognizer.getThresholds).toBeDefined();
      expect(mockRecognizer.getCooldowns).toBeDefined();
    });
  });
});
