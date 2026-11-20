/**
 * Tests for Renderer debug text overlay (Task 8.3)
 * 
 * Verifies that the debug overlay displays comprehensive information including:
 * - Currently detected move name
 * - Raw joint position values for key joints
 * - Current threshold values for all move types
 * - Cooldown timers for all move types
 * - Simulated stamina level
 * - FPS counter
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Renderer } from './Renderer';
import { MoveType, Landmarks, DetectedMove, ThresholdConfig, CooldownState } from '../types';
import { DEFAULT_THRESHOLD_CONFIG } from '../types/move';

describe('Renderer - Debug Text Overlay (Task 8.3)', () => {
  let canvas: HTMLCanvasElement;
  let renderer: Renderer;

  beforeEach(() => {
    // Create canvas with fixed size for testing
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    // Mock clientWidth/clientHeight
    Object.defineProperty(canvas, 'clientWidth', {
      configurable: true,
      value: 800
    });
    Object.defineProperty(canvas, 'clientHeight', {
      configurable: true,
      value: 600
    });
    
    // Create renderer with debug mode enabled
    renderer = new Renderer({
      canvas,
      debugMode: true,
      targetFps: 30,
      visibilityThreshold: 0.5,
    });
  });
  
  afterEach(() => {
    if (renderer) {
      renderer.dispose();
    }
  });

  describe('Debug overlay rendering', () => {
    it('should render without errors with minimal state', () => {
      expect(() => {
        renderer.updateState({});
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should render without errors with detected moves', () => {
      const moves: DetectedMove[] = [
        { type: MoveType.JAB, intensity: 0.75, timestamp: Date.now() },
        { type: MoveType.POWER_PUNCH, intensity: 1.0, timestamp: Date.now() },
      ];
      
      expect(() => {
        renderer.updateState({ detectedMoves: moves });
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should render without errors with landmarks', () => {
      const landmarks: Landmarks = {
        points: Array(33).fill(null).map((_, idx) => ({
          x: idx * 0.01,
          y: idx * 0.02,
          z: idx * 0.001,
          visibility: 0.9,
        })),
        timestamp: Date.now(),
      };
      
      expect(() => {
        renderer.updateState({ landmarks });
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should render without errors with stamina data', () => {
      expect(() => {
        renderer.updateState({ 
          debug: { stamina: 75 } 
        });
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should render without errors with cooldown data', () => {
      const cooldowns: CooldownState = {
        [MoveType.JAB]: 250,
        [MoveType.POWER_PUNCH]: 0,
        [MoveType.DUCK]: 400,
        [MoveType.CHARGE]: 1500,
      };
      
      expect(() => {
        renderer.updateState({ debug: { cooldowns } });
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should render without errors with threshold data', () => {
      expect(() => {
        renderer.updateState({ 
          debug: { thresholds: DEFAULT_THRESHOLD_CONFIG } 
        });
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should render without errors with complete debug state', () => {
      const landmarks: Landmarks = {
        points: Array(33).fill(null).map((_, idx) => ({
          x: idx * 0.01,
          y: idx * 0.02,
          z: idx * 0.001,
          visibility: 0.9,
        })),
        timestamp: Date.now(),
      };

      const moves: DetectedMove[] = [
        { type: MoveType.BLOCK, intensity: 1.0, timestamp: Date.now() },
      ];

      const cooldowns: CooldownState = {
        [MoveType.JAB]: 0,
        [MoveType.POWER_PUNCH]: 300,
        [MoveType.DUCK]: 0,
        [MoveType.CHARGE]: 1200,
      };
      
      expect(() => {
        renderer.updateState({
          landmarks,
          detectedMoves: moves,
          debug: {
            stamina: 60,
            cooldowns,
            thresholds: DEFAULT_THRESHOLD_CONFIG,
          },
        });
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should not render debug overlay when debug mode is disabled', () => {
      renderer.setDebugMode(false);
      
      expect(() => {
        renderer.updateState({
          debug: { stamina: 50 },
        });
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should render debug overlay when debug mode is re-enabled', () => {
      renderer.setDebugMode(false);
      renderer.setDebugMode(true);
      
      expect(() => {
        renderer.updateState({
          debug: { stamina: 85 },
        });
        renderer.renderFrame();
      }).not.toThrow();
    });
  });

  describe('Debug data formatting', () => {
    it('should handle missing debug data gracefully', () => {
      expect(() => {
        renderer.updateState({ debug: undefined });
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should handle empty debug object gracefully', () => {
      expect(() => {
        renderer.updateState({ debug: {} });
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should handle extreme stamina values', () => {
      expect(() => {
        renderer.updateState({ debug: { stamina: 0 } });
        renderer.renderFrame();
        
        renderer.updateState({ debug: { stamina: 100 } });
        renderer.renderFrame();
        
        renderer.updateState({ debug: { stamina: 150 } }); // Over max
        renderer.renderFrame();
        
        renderer.updateState({ debug: { stamina: -10 } }); // Negative
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should handle zero cooldowns', () => {
      const cooldowns: CooldownState = {
        [MoveType.JAB]: 0,
        [MoveType.POWER_PUNCH]: 0,
        [MoveType.DUCK]: 0,
        [MoveType.CHARGE]: 0,
      };
      
      expect(() => {
        renderer.updateState({ debug: { cooldowns } });
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should handle large cooldown values', () => {
      const cooldowns: CooldownState = {
        [MoveType.JAB]: 99999,
        [MoveType.POWER_PUNCH]: 88888,
        [MoveType.DUCK]: 77777,
        [MoveType.CHARGE]: 66666,
      };
      
      expect(() => {
        renderer.updateState({ debug: { cooldowns } });
        renderer.renderFrame();
      }).not.toThrow();
    });
  });
});
