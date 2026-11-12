/**
 * Visual Regression Tests for Renderer Debug Overlay (Task 8.6)
 * 
 * Comprehensive tests for visual rendering of debug overlay features:
 * - Landmark rendering with various visibility levels
 * - Text overlay formatting and positioning
 * - Baseline visualization
 * 
 * These tests verify that Canvas 2D context methods are called correctly
 * with proper coordinates, colors, and styling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Renderer } from './Renderer';
import { MoveType, Landmarks, DetectedMove, BaselineData, CooldownState } from '../types';
import { PoseLandmark } from '../types/pose';
import { DEFAULT_THRESHOLD_CONFIG } from '../types/move';

describe('Renderer - Visual Regression Tests (Task 8.6)', () => {
  let canvas: HTMLCanvasElement;
  let renderer: Renderer;
  let ctx: CanvasRenderingContext2D;
  
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
    
    // Get 2D context for inspection
    ctx = canvas.getContext('2d')!;
  });
  
  afterEach(() => {
    if (renderer) {
      renderer.dispose();
    }
  });

  describe('Landmark Rendering Visual Tests', () => {
    it('should render all landmarks with high visibility using green color', () => {
      renderer = new Renderer({ canvas, debugMode: false, visibilityThreshold: 0.5 });
      
      // Create landmarks with all high visibility
      const landmarks: Landmarks = {
        points: Array(33).fill(null).map((_, idx) => ({
          x: 0.3 + (idx * 0.01),
          y: 0.3 + (idx * 0.01),
          z: 0,
          visibility: 1.0,
        })),
        timestamp: Date.now(),
      };
      
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      const arcSpy = vi.spyOn(ctx, 'arc');
      
      renderer.updateState({ landmarks });
      renderer.renderFrame();
      
      // Verify green color was used for visible landmarks
      const greenCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#00ff00');
      expect(greenCalls.length).toBeGreaterThan(0);
      
      // Verify arcs were drawn for all landmarks
      expect(arcSpy).toHaveBeenCalled();
      expect(arcSpy.mock.calls.length).toBeGreaterThanOrEqual(33);
      
      fillStyleSpy.mockRestore();
      arcSpy.mockRestore();
    });

    it('should render landmarks at visibility threshold correctly', () => {
      renderer = new Renderer({ canvas, debugMode: false, visibilityThreshold: 0.5 });
      
      // Create landmarks exactly at threshold (should be green - visible)
      const landmarks: Landmarks = {
        points: [
          { x: 0.5, y: 0.3, z: 0, visibility: 0.5 },  // At threshold
          { x: 0.6, y: 0.4, z: 0, visibility: 0.49 }, // Just below threshold
        ],
        timestamp: Date.now(),
      };
      
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.updateState({ landmarks });
      renderer.renderFrame();
      
      // Should have both green and red colors
      const greenCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#00ff00');
      const redCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#ff0000');
      
      expect(greenCalls.length).toBeGreaterThan(0); // At least one visible
      expect(redCalls.length).toBeGreaterThan(0);   // At least one not visible
      
      fillStyleSpy.mockRestore();
    });

    it('should render low visibility landmarks with red color and smaller circles', () => {
      renderer = new Renderer({ canvas, debugMode: false, visibilityThreshold: 0.5 });
      
      // Create landmarks with low visibility
      const landmarks: Landmarks = {
        points: [
          { x: 0.5, y: 0.5, z: 0, visibility: 0.1 },
          { x: 0.6, y: 0.6, z: 0, visibility: 0.3 },
        ],
        timestamp: Date.now(),
      };
      
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.updateState({ landmarks });
      renderer.renderFrame();
      
      // Verify red color was used
      const redCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#ff0000');
      expect(redCalls.length).toBeGreaterThan(0);
      
      fillStyleSpy.mockRestore();
    });

    it('should render skeleton lines only between visible landmarks', () => {
      renderer = new Renderer({ canvas, debugMode: false, visibilityThreshold: 0.5 });
      
      // Create landmarks with shoulders visible but other joints not
      const landmarks: Landmarks = {
        points: Array(33).fill(null).map((_, idx) => ({
          x: 0.5,
          y: 0.5,
          z: 0,
          visibility: idx === PoseLandmark.LEFT_SHOULDER || idx === PoseLandmark.RIGHT_SHOULDER ? 0.9 : 0.1,
        })),
        timestamp: Date.now(),
      };
      
      const strokeStyleSpy = vi.spyOn(ctx, 'strokeStyle', 'set');
      const moveToSpy = vi.spyOn(ctx, 'moveTo');
      const lineToSpy = vi.spyOn(ctx, 'lineTo');
      const strokeSpy = vi.spyOn(ctx, 'stroke');
      
      renderer.updateState({ landmarks });
      renderer.renderFrame();
      
      // Verify cyan color for skeleton lines
      const cyanCalls = strokeStyleSpy.mock.calls.filter(call => call[0] === '#00ffff');
      expect(cyanCalls.length).toBeGreaterThan(0);
      
      // Verify lines were drawn (moveTo + lineTo + stroke)
      expect(moveToSpy).toHaveBeenCalled();
      expect(lineToSpy).toHaveBeenCalled();
      expect(strokeSpy).toHaveBeenCalled();
      
      strokeStyleSpy.mockRestore();
      moveToSpy.mockRestore();
      lineToSpy.mockRestore();
      strokeSpy.mockRestore();
    });

    it('should transform landmark coordinates correctly to pixel space', () => {
      renderer = new Renderer({ canvas, debugMode: false, visibilityThreshold: 0.5 });
      
      // Test specific coordinate transformations
      const landmarks: Landmarks = {
        points: [
          { x: 0.0, y: 0.0, z: 0, visibility: 0.9 },   // Top-left
          { x: 0.5, y: 0.5, z: 0, visibility: 0.9 },   // Center
          { x: 1.0, y: 1.0, z: 0, visibility: 0.9 },   // Bottom-right
        ],
        timestamp: Date.now(),
      };
      
      const arcSpy = vi.spyOn(ctx, 'arc');
      
      renderer.updateState({ landmarks });
      renderer.renderFrame();
      
      const arcCalls = arcSpy.mock.calls;
      
      // Verify coordinate transformations (x * 800, y * 600)
      const coordinates = arcCalls.map(call => ({ x: call[0], y: call[1] }));
      
      // Should have coordinates near (0, 0), (400, 300), (800, 600)
      const hasTopLeft = coordinates.some(c => c.x === 0 && c.y === 0);
      const hasCenter = coordinates.some(c => c.x === 400 && c.y === 300);
      const hasBottomRight = coordinates.some(c => c.x === 800 && c.y === 600);
      
      expect(hasTopLeft).toBe(true);
      expect(hasCenter).toBe(true);
      expect(hasBottomRight).toBe(true);
      
      arcSpy.mockRestore();
    });

    it('should render skeleton with correct line width and style', () => {
      renderer = new Renderer({ canvas, debugMode: false, visibilityThreshold: 0.5 });
      
      // Create landmarks for full body visibility
      const landmarks: Landmarks = {
        points: Array(33).fill(null).map((_, idx) => ({
          x: 0.5,
          y: 0.5,
          z: 0,
          visibility: 0.9,
        })),
        timestamp: Date.now(),
      };
      
      const lineWidthSpy = vi.spyOn(ctx, 'lineWidth', 'set');
      const lineCapSpy = vi.spyOn(ctx, 'lineCap', 'set');
      
      renderer.updateState({ landmarks });
      renderer.renderFrame();
      
      // Verify line width 2 was set for skeleton
      const lineWidthCalls = lineWidthSpy.mock.calls.filter(call => call[0] === 2);
      expect(lineWidthCalls.length).toBeGreaterThan(0);
      
      // Verify round line cap
      const lineCapCalls = lineCapSpy.mock.calls.filter(call => call[0] === 'round');
      expect(lineCapCalls.length).toBeGreaterThan(0);
      
      lineWidthSpy.mockRestore();
      lineCapSpy.mockRestore();
    });
  });

  describe('Text Overlay Visual Tests', () => {
    beforeEach(() => {
      renderer = new Renderer({ canvas, debugMode: true, targetFps: 30, visibilityThreshold: 0.5 });
    });

    it('should render performance stats section with correct formatting', () => {
      const fontSpy = vi.spyOn(ctx, 'font', 'set');
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.updateState({ fps: 30 });
      renderer.renderFrame();
      
      // Verify monospace font was used
      const fontCalls = fontSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('monospace')
      );
      expect(fontCalls.length).toBeGreaterThan(0);
      
      // Verify yellow color for headers
      const yellowCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#ffff00');
      expect(yellowCalls.length).toBeGreaterThan(0);
      
      // Verify performance section header was drawn
      const perfHeaderCalls = fillTextSpy.mock.calls.filter(call => 
        call[0] === '=== PERFORMANCE ==='
      );
      expect(perfHeaderCalls.length).toBe(1);
      
      // Verify FPS text was drawn
      const fpsCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('FPS')
      );
      expect(fpsCalls.length).toBeGreaterThan(0);
      
      fontSpy.mockRestore();
      fillTextSpy.mockRestore();
      fillStyleSpy.mockRestore();
    });

    it('should render detected moves section with move names and intensities', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      const moves: DetectedMove[] = [
        { type: MoveType.JAB, intensity: 0.75, timestamp: Date.now() },
        { type: MoveType.POWER_PUNCH, intensity: 1.0, timestamp: Date.now() },
      ];
      
      renderer.updateState({ detectedMoves: moves });
      renderer.renderFrame();
      
      // Verify section header
      const moveHeaderCalls = fillTextSpy.mock.calls.filter(call => 
        call[0] === '=== DETECTED MOVES ==='
      );
      expect(moveHeaderCalls.length).toBe(1);
      
      // Verify move names were drawn with intensities
      const jabCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('JAB') && call[0].includes('75%')
      );
      expect(jabCalls.length).toBe(1);
      
      const powerPunchCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('POWER_PUNCH') && call[0].includes('100%')
      );
      expect(powerPunchCalls.length).toBe(1);
      
      fillTextSpy.mockRestore();
      fillStyleSpy.mockRestore();
    });

    it('should display "No moves detected" when no moves present', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.updateState({ detectedMoves: [] });
      renderer.renderFrame();
      
      // Verify "No moves detected" message with gray color
      const noMovesCalls = fillTextSpy.mock.calls.filter(call => 
        call[0] === 'No moves detected'
      );
      expect(noMovesCalls.length).toBe(1);
      
      // Verify gray color was set
      const grayCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#888');
      expect(grayCalls.length).toBeGreaterThan(0);
      
      fillTextSpy.mockRestore();
      fillStyleSpy.mockRestore();
    });

    it('should render key joints section with position values and visibility colors', () => {
      const landmarks: Landmarks = {
        points: Array(33).fill(null).map((_, idx) => ({
          x: 0.5 + (idx * 0.001),
          y: 0.3 + (idx * 0.001),
          z: -0.1 + (idx * 0.001),
          visibility: idx === PoseLandmark.NOSE ? 0.9 : 0.2, // Nose visible, others not
        })),
        timestamp: Date.now(),
      };
      
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.updateState({ landmarks });
      renderer.renderFrame();
      
      // Verify section header
      const jointHeaderCalls = fillTextSpy.mock.calls.filter(call => 
        call[0] === '=== KEY JOINTS ==='
      );
      expect(jointHeaderCalls.length).toBe(1);
      
      // Verify nose joint was drawn
      const noseCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('Nose')
      );
      expect(noseCalls.length).toBeGreaterThan(0);
      
      // Verify green color used for visible joint
      const greenCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#0f0');
      expect(greenCalls.length).toBeGreaterThan(0);
      
      // Verify red color used for low visibility joints
      const redCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#f00');
      expect(redCalls.length).toBeGreaterThan(0);
      
      fillTextSpy.mockRestore();
      fillStyleSpy.mockRestore();
    });

    it('should format joint coordinates with 3 decimal places', () => {
      const landmarks: Landmarks = {
        points: Array(33).fill(null).map((_, idx) => ({
          x: 0.123456,
          y: 0.789012,
          z: -0.345678,
          visibility: 0.9,
        })),
        timestamp: Date.now(),
      };
      
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer.updateState({ landmarks });
      renderer.renderFrame();
      
      // Check for formatted coordinates (3 decimal places)
      const coordinateCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && 
        (call[0].includes('0.123') || call[0].includes('0.789') || call[0].includes('-0.346'))
      );
      expect(coordinateCalls.length).toBeGreaterThan(0);
      
      fillTextSpy.mockRestore();
    });

    it('should render stamina section with value and progress bar', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      const strokeRectSpy = vi.spyOn(ctx, 'strokeRect');
      const fillRectSpy = vi.spyOn(ctx, 'fillRect');
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.updateState({ debug: { stamina: 75 } });
      renderer.renderFrame();
      
      // Verify section header
      const staminaHeaderCalls = fillTextSpy.mock.calls.filter(call => 
        call[0] === '=== STAMINA ==='
      );
      expect(staminaHeaderCalls.length).toBe(1);
      
      // Verify stamina value text
      const staminaValueCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('Stamina: 75')
      );
      expect(staminaValueCalls.length).toBe(1);
      
      // Verify progress bar outline was drawn
      expect(strokeRectSpy).toHaveBeenCalled();
      
      // Verify progress bar fill was drawn
      expect(fillRectSpy).toHaveBeenCalled();
      
      // Verify green color for high stamina (> 50%)
      const greenCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#0f0');
      expect(greenCalls.length).toBeGreaterThan(0);
      
      fillTextSpy.mockRestore();
      strokeRectSpy.mockRestore();
      fillRectSpy.mockRestore();
      fillStyleSpy.mockRestore();
    });

    it('should use yellow color for medium stamina (25-50%)', () => {
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.updateState({ debug: { stamina: 40 } });
      renderer.renderFrame();
      
      // Verify yellow color for medium stamina
      const yellowCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#ff0');
      expect(yellowCalls.length).toBeGreaterThan(0);
      
      fillStyleSpy.mockRestore();
    });

    it('should use red color for low stamina (< 25%)', () => {
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.updateState({ debug: { stamina: 20 } });
      renderer.renderFrame();
      
      // Verify red color for low stamina
      const redCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#f00');
      expect(redCalls.length).toBeGreaterThan(0);
      
      fillStyleSpy.mockRestore();
    });

    it('should render cooldowns section with correct formatting', () => {
      const cooldowns: CooldownState = {
        [MoveType.JAB]: 150,
        [MoveType.POWER_PUNCH]: 0,
        [MoveType.DUCK]: 400,
        [MoveType.CHARGE]: 1200,
      };
      
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.updateState({ debug: { cooldowns } });
      renderer.renderFrame();
      
      // Verify section header
      const cooldownHeaderCalls = fillTextSpy.mock.calls.filter(call => 
        call[0] === '=== COOLDOWNS (ms) ==='
      );
      expect(cooldownHeaderCalls.length).toBe(1);
      
      // Verify cooldown values were drawn
      const jabCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('JAB') && call[0].includes('150')
      );
      expect(jabCalls.length).toBe(1);
      
      const powerPunchCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('POWER_PUNCH') && call[0].includes('0')
      );
      expect(powerPunchCalls.length).toBe(1);
      
      fillTextSpy.mockRestore();
      fillStyleSpy.mockRestore();
    });

    it('should color-code cooldowns: red for active, green for ready', () => {
      const cooldowns: CooldownState = {
        [MoveType.JAB]: 150,    // Active - should be red
        [MoveType.POWER_PUNCH]: 0, // Ready - should be green
        [MoveType.DUCK]: 0,     // Ready - should be green
        [MoveType.CHARGE]: 1200, // Active - should be red
      };
      
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.updateState({ debug: { cooldowns } });
      renderer.renderFrame();
      
      // Verify both red and green colors were used
      const redCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#f00');
      const greenCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#0f0');
      
      expect(redCalls.length).toBeGreaterThan(0);
      expect(greenCalls.length).toBeGreaterThan(0);
      
      fillStyleSpy.mockRestore();
    });

    it('should render thresholds section with correct values', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer.updateState({ debug: { thresholds: DEFAULT_THRESHOLD_CONFIG } });
      renderer.renderFrame();
      
      // Verify section header
      const thresholdHeaderCalls = fillTextSpy.mock.calls.filter(call => 
        call[0] === '=== THRESHOLDS ==='
      );
      expect(thresholdHeaderCalls.length).toBe(1);
      
      // Verify specific threshold values were drawn
      const jabThresholdCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('Jab:')
      );
      expect(jabThresholdCalls.length).toBe(1);
      
      const blockThresholdCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('Block:')
      );
      expect(blockThresholdCalls.length).toBe(1);
      
      fillTextSpy.mockRestore();
    });

    it('should format threshold values with 2 decimal places', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer.updateState({ debug: { thresholds: DEFAULT_THRESHOLD_CONFIG } });
      renderer.renderFrame();
      
      // Check for formatted threshold values (2 decimal places)
      const formattedCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && /\d+\.\d{2}/.test(call[0])
      );
      expect(formattedCalls.length).toBeGreaterThan(0);
      
      fillTextSpy.mockRestore();
    });

    it('should position text within canvas bounds (left column)', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer.updateState({ 
        detectedMoves: [{ type: MoveType.JAB, intensity: 0.8, timestamp: Date.now() }] 
      });
      renderer.renderFrame();
      
      // Check that all text x coordinates are within bounds
      const textCalls = fillTextSpy.mock.calls;
      const xCoordinates = textCalls.map(call => call[1] as number);
      
      // All x coordinates should be >= 10 (left margin)
      const allWithinBounds = xCoordinates.every(x => x >= 10 && x <= 800);
      expect(allWithinBounds).toBe(true);
      
      fillTextSpy.mockRestore();
    });

    it('should position text within canvas bounds (right column)', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      const cooldowns: CooldownState = {
        [MoveType.JAB]: 150,
        [MoveType.POWER_PUNCH]: 0,
        [MoveType.DUCK]: 400,
        [MoveType.CHARGE]: 1200,
      };
      
      renderer.updateState({ debug: { cooldowns, stamina: 75 } });
      renderer.renderFrame();
      
      // Check that right column text is positioned correctly
      const textCalls = fillTextSpy.mock.calls;
      const rightColumnCalls = textCalls.filter(call => 
        (call[1] as number) > 400 // Right side of canvas
      );
      
      // Should have right column text
      expect(rightColumnCalls.length).toBeGreaterThan(0);
      
      // All right column x coordinates should be < 800
      const xCoordinates = rightColumnCalls.map(call => call[1] as number);
      const allWithinBounds = xCoordinates.every(x => x < 800);
      expect(allWithinBounds).toBe(true);
      
      fillTextSpy.mockRestore();
    });

    it('should use consistent line height spacing', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      const moves: DetectedMove[] = [
        { type: MoveType.JAB, intensity: 0.7, timestamp: Date.now() },
        { type: MoveType.POWER_PUNCH, intensity: 0.9, timestamp: Date.now() },
        { type: MoveType.BLOCK, intensity: 1.0, timestamp: Date.now() },
      ];
      
      renderer.updateState({ detectedMoves: moves });
      renderer.renderFrame();
      
      // Get y coordinates of moves section
      const movesCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && Object.values(MoveType).some(type => 
          call[0].toUpperCase().includes(type.toUpperCase())
        )
      );
      
      const yCoordinates = movesCalls.map(call => call[2] as number);
      
      // Calculate spacing between consecutive lines
      const spacings = yCoordinates.slice(1).map((y, i) => y - yCoordinates[i]);
      
      // All spacings should be consistent (14px line height)
      const allConsistent = spacings.every(spacing => spacing === 14);
      expect(allConsistent).toBe(true);
      
      fillTextSpy.mockRestore();
    });
  });

  describe('Baseline Visualization Visual Tests', () => {
    beforeEach(() => {
      renderer = new Renderer({ canvas, debugMode: false, visibilityThreshold: 0.5 });
    });

    it('should render shoulder line with correct color and width', () => {
      const baseline: BaselineData = {
        shoulderWidth: 0.3,
        headHeight: 0.25,
        centerPosition: { x: 0.5, y: 0.4, z: 0 },
        leftWristBaseline: { x: 0.3, y: 0.6, z: 0 },
        rightWristBaseline: { x: 0.7, y: 0.6, z: 0 },
      };
      
      const strokeStyleSpy = vi.spyOn(ctx, 'strokeStyle', 'set');
      const lineWidthSpy = vi.spyOn(ctx, 'lineWidth', 'set');
      const moveToSpy = vi.spyOn(ctx, 'moveTo');
      const lineToSpy = vi.spyOn(ctx, 'lineTo');
      const strokeSpy = vi.spyOn(ctx, 'stroke');
      
      renderer.updateState({ baseline });
      renderer.renderFrame();
      
      // Verify yellow color for baseline
      const yellowCalls = strokeStyleSpy.mock.calls.filter(call => call[0] === '#ffff00');
      expect(yellowCalls.length).toBeGreaterThan(0);
      
      // Verify line width 3 for shoulder line
      const lineWidthCalls = lineWidthSpy.mock.calls.filter(call => call[0] === 3);
      expect(lineWidthCalls.length).toBeGreaterThan(0);
      
      // Verify line was drawn
      expect(moveToSpy).toHaveBeenCalled();
      expect(lineToSpy).toHaveBeenCalled();
      expect(strokeSpy).toHaveBeenCalled();
      
      strokeStyleSpy.mockRestore();
      lineWidthSpy.mockRestore();
      moveToSpy.mockRestore();
      lineToSpy.mockRestore();
      strokeSpy.mockRestore();
    });

    it('should calculate and render shoulder positions correctly', () => {
      const baseline: BaselineData = {
        shoulderWidth: 0.4,
        headHeight: 0.25,
        centerPosition: { x: 0.5, y: 0.5, z: 0 },
        leftWristBaseline: { x: 0.3, y: 0.6, z: 0 },
        rightWristBaseline: { x: 0.7, y: 0.6, z: 0 },
      };
      
      const moveToSpy = vi.spyOn(ctx, 'moveTo');
      const lineToSpy = vi.spyOn(ctx, 'lineTo');
      
      renderer.updateState({ baseline });
      renderer.renderFrame();
      
      // Calculate expected shoulder positions
      const halfWidth = baseline.shoulderWidth / 2;
      const leftShoulderX = (baseline.centerPosition.x - halfWidth) * 800;
      const rightShoulderX = (baseline.centerPosition.x + halfWidth) * 800;
      const shoulderY = baseline.centerPosition.y * 600;
      
      // Verify shoulder line coordinates
      const moveToCall = moveToSpy.mock.calls.find(call => 
        Math.abs(call[0] - leftShoulderX) < 1 && Math.abs(call[1] - shoulderY) < 1
      );
      expect(moveToCall).toBeDefined();
      
      const lineToCall = lineToSpy.mock.calls.find(call => 
        Math.abs(call[0] - rightShoulderX) < 1 && Math.abs(call[1] - shoulderY) < 1
      );
      expect(lineToCall).toBeDefined();
      
      moveToSpy.mockRestore();
      lineToSpy.mockRestore();
    });

    it('should render center position marker with cross and circle', () => {
      const baseline: BaselineData = {
        shoulderWidth: 0.3,
        headHeight: 0.25,
        centerPosition: { x: 0.5, y: 0.5, z: 0 },
        leftWristBaseline: { x: 0.3, y: 0.6, z: 0 },
        rightWristBaseline: { x: 0.7, y: 0.6, z: 0 },
      };
      
      const arcSpy = vi.spyOn(ctx, 'arc');
      const moveToSpy = vi.spyOn(ctx, 'moveTo');
      const lineToSpy = vi.spyOn(ctx, 'lineTo');
      const strokeSpy = vi.spyOn(ctx, 'stroke');
      
      renderer.updateState({ baseline });
      renderer.renderFrame();
      
      // Verify circles were drawn (should include center marker)
      expect(arcSpy).toHaveBeenCalled();
      
      // Verify cross lines were drawn (moveTo + lineTo)
      expect(moveToSpy).toHaveBeenCalled();
      expect(lineToSpy).toHaveBeenCalled();
      expect(strokeSpy).toHaveBeenCalled();
      
      arcSpy.mockRestore();
      moveToSpy.mockRestore();
      lineToSpy.mockRestore();
      strokeSpy.mockRestore();
    });

    it('should render wrist baseline markers with circles and labels', () => {
      const baseline: BaselineData = {
        shoulderWidth: 0.3,
        headHeight: 0.25,
        centerPosition: { x: 0.5, y: 0.5, z: 0 },
        leftWristBaseline: { x: 0.3, y: 0.6, z: 0 },
        rightWristBaseline: { x: 0.7, y: 0.6, z: 0 },
      };
      
      const arcSpy = vi.spyOn(ctx, 'arc');
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      const fillSpy = vi.spyOn(ctx, 'fill');
      const strokeSpy = vi.spyOn(ctx, 'stroke');
      
      renderer.updateState({ baseline });
      renderer.renderFrame();
      
      // Verify wrist circles were drawn
      const leftWristX = baseline.leftWristBaseline.x * 800;
      const leftWristY = baseline.leftWristBaseline.y * 600;
      const rightWristX = baseline.rightWristBaseline.x * 800;
      const rightWristY = baseline.rightWristBaseline.y * 600;
      
      const leftWristArc = arcSpy.mock.calls.find(call => 
        Math.abs(call[0] - leftWristX) < 1 && Math.abs(call[1] - leftWristY) < 1
      );
      expect(leftWristArc).toBeDefined();
      
      const rightWristArc = arcSpy.mock.calls.find(call => 
        Math.abs(call[0] - rightWristX) < 1 && Math.abs(call[1] - rightWristY) < 1
      );
      expect(rightWristArc).toBeDefined();
      
      // Verify labels 'L' and 'R' were drawn
      const leftLabelCall = fillTextSpy.mock.calls.find(call => call[0] === 'L');
      expect(leftLabelCall).toBeDefined();
      
      const rightLabelCall = fillTextSpy.mock.calls.find(call => call[0] === 'R');
      expect(rightLabelCall).toBeDefined();
      
      // Verify filled and stroked circles
      expect(fillSpy).toHaveBeenCalled();
      expect(strokeSpy).toHaveBeenCalled();
      
      arcSpy.mockRestore();
      fillTextSpy.mockRestore();
      fillSpy.mockRestore();
      strokeSpy.mockRestore();
    });

    it('should render calibration metrics text overlay', () => {
      const baseline: BaselineData = {
        shoulderWidth: 0.345,
        headHeight: 0.267,
        centerPosition: { x: 0.512, y: 0.498, z: 0 },
        leftWristBaseline: { x: 0.3, y: 0.6, z: 0 },
        rightWristBaseline: { x: 0.7, y: 0.6, z: 0 },
      };
      
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.updateState({ baseline });
      renderer.renderFrame();
      
      // Verify baseline header
      const headerCalls = fillTextSpy.mock.calls.filter(call => 
        call[0] === '=== BASELINE ==='
      );
      expect(headerCalls.length).toBe(1);
      
      // Verify shoulder width was displayed
      const shoulderWidthCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('Shoulder Width:') && call[0].includes('0.345')
      );
      expect(shoulderWidthCalls.length).toBe(1);
      
      // Verify head height was displayed
      const headHeightCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('Head Height:') && call[0].includes('0.267')
      );
      expect(headHeightCalls.length).toBe(1);
      
      // Verify center position was displayed
      const centerCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('Center:')
      );
      expect(centerCalls.length).toBe(1);
      
      // Verify yellow color for header
      const yellowCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#ffff00');
      expect(yellowCalls.length).toBeGreaterThan(0);
      
      fillTextSpy.mockRestore();
      fillStyleSpy.mockRestore();
    });

    it('should position calibration metrics in bottom-left corner', () => {
      const baseline: BaselineData = {
        shoulderWidth: 0.3,
        headHeight: 0.25,
        centerPosition: { x: 0.5, y: 0.5, z: 0 },
        leftWristBaseline: { x: 0.3, y: 0.6, z: 0 },
        rightWristBaseline: { x: 0.7, y: 0.6, z: 0 },
      };
      
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer.updateState({ baseline });
      renderer.renderFrame();
      
      // Get baseline metrics text calls
      const metricsCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && 
        (call[0].includes('BASELINE') || call[0].includes('Shoulder Width') || call[0].includes('Head Height'))
      );
      
      // Verify they are in bottom-left (x near 10, y > 500 for 600px canvas)
      const allInBottomLeft = metricsCalls.every(call => {
        const x = call[1] as number;
        const y = call[2] as number;
        return x < 300 && y > 500;
      });
      expect(allInBottomLeft).toBe(true);
      
      fillTextSpy.mockRestore();
    });

    it('should use semi-transparent fill for wrist markers', () => {
      const baseline: BaselineData = {
        shoulderWidth: 0.3,
        headHeight: 0.25,
        centerPosition: { x: 0.5, y: 0.5, z: 0 },
        leftWristBaseline: { x: 0.3, y: 0.6, z: 0 },
        rightWristBaseline: { x: 0.7, y: 0.6, z: 0 },
      };
      
      // Track globalAlpha assignments by monitoring the property setter
      let alphaValues: number[] = [];
      const originalAlphaDescriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(ctx),
        'globalAlpha'
      );
      
      Object.defineProperty(ctx, 'globalAlpha', {
        configurable: true,
        get() {
          return originalAlphaDescriptor?.get?.call(this) ?? 1.0;
        },
        set(value: number) {
          alphaValues.push(value);
          originalAlphaDescriptor?.set?.call(this, value);
        }
      });
      
      renderer.updateState({ baseline });
      renderer.renderFrame();
      
      // Verify 0.5 alpha was used (for semi-transparent fill)
      expect(alphaValues).toContain(0.5);
      
      // Verify alpha was reset to 1.0
      expect(alphaValues).toContain(1.0);
      
      // Restore original property
      if (originalAlphaDescriptor) {
        Object.defineProperty(ctx, 'globalAlpha', originalAlphaDescriptor);
      }
    });

    it('should display calibration frame count when available in debug data', () => {
      const baseline: BaselineData = {
        shoulderWidth: 0.3,
        headHeight: 0.25,
        centerPosition: { x: 0.5, y: 0.5, z: 0 },
        leftWristBaseline: { x: 0.3, y: 0.6, z: 0 },
        rightWristBaseline: { x: 0.7, y: 0.6, z: 0 },
      };
      
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer.updateState({ 
        baseline,
        debug: { calibrationFrames: 45 }
      });
      renderer.renderFrame();
      
      // Verify frame count was displayed
      const framesCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('Frames:') && call[0].includes('45')
      );
      expect(framesCalls.length).toBe(1);
      
      fillTextSpy.mockRestore();
    });
  });

  describe('Debug Mode Toggle Visual Tests', () => {
    it('should not render debug overlay when debug mode is disabled', () => {
      renderer = new Renderer({ canvas, debugMode: false });
      
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer.updateState({ 
        fps: 30,
        debug: { stamina: 75 }
      });
      renderer.renderFrame();
      
      // Should not render any debug text
      const debugTextCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && 
        (call[0].includes('===') || call[0].includes('FPS') || call[0].includes('Stamina'))
      );
      expect(debugTextCalls.length).toBe(0);
      
      fillTextSpy.mockRestore();
    });

    it('should render debug overlay when debug mode is enabled', () => {
      renderer = new Renderer({ canvas, debugMode: true });
      
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer.updateState({ fps: 30 });
      renderer.renderFrame();
      
      // Should render debug text
      const debugTextCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && (call[0].includes('===') || call[0].includes('FPS'))
      );
      expect(debugTextCalls.length).toBeGreaterThan(0);
      
      fillTextSpy.mockRestore();
    });

    it('should clear canvas before rendering each frame', () => {
      renderer = new Renderer({ canvas, debugMode: true });
      
      const fillRectSpy = vi.spyOn(ctx, 'fillRect');
      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');
      
      renderer.renderFrame();
      
      // Verify background clear (dark gray #1a1a1a filling entire canvas)
      const backgroundCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#1a1a1a');
      expect(backgroundCalls.length).toBeGreaterThan(0);
      
      const fullCanvasClear = fillRectSpy.mock.calls.find(call => 
        call[0] === 0 && call[1] === 0 && call[2] === 800 && call[3] === 600
      );
      expect(fullCanvasClear).toBeDefined();
      
      fillRectSpy.mockRestore();
      fillStyleSpy.mockRestore();
    });
  });

  describe('Combined Rendering Tests', () => {
    it('should render landmarks, baseline, and debug overlay together', () => {
      renderer = new Renderer({ canvas, debugMode: true, visibilityThreshold: 0.5 });
      
      const landmarks: Landmarks = {
        points: Array(33).fill(null).map((_, idx) => ({
          x: 0.5,
          y: 0.5,
          z: 0,
          visibility: 0.9,
        })),
        timestamp: Date.now(),
      };
      
      const baseline: BaselineData = {
        shoulderWidth: 0.3,
        headHeight: 0.25,
        centerPosition: { x: 0.5, y: 0.5, z: 0 },
        leftWristBaseline: { x: 0.3, y: 0.6, z: 0 },
        rightWristBaseline: { x: 0.7, y: 0.6, z: 0 },
      };
      
      const moves: DetectedMove[] = [
        { type: MoveType.JAB, intensity: 0.8, timestamp: Date.now() },
      ];
      
      const arcSpy = vi.spyOn(ctx, 'arc');
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      const strokeSpy = vi.spyOn(ctx, 'stroke');
      
      renderer.updateState({ 
        landmarks, 
        baseline,
        detectedMoves: moves,
        debug: { stamina: 75 }
      });
      renderer.renderFrame();
      
      // Verify all components were rendered
      expect(arcSpy).toHaveBeenCalled(); // Landmarks and baseline markers
      expect(fillTextSpy).toHaveBeenCalled(); // Debug text
      expect(strokeSpy).toHaveBeenCalled(); // Skeleton and baseline lines
      
      arcSpy.mockRestore();
      fillTextSpy.mockRestore();
      strokeSpy.mockRestore();
    });

    it('should handle empty state gracefully without errors', () => {
      renderer = new Renderer({ canvas, debugMode: true });
      
      expect(() => {
        renderer.updateState({});
        renderer.renderFrame();
      }).not.toThrow();
    });

    it('should handle partial state updates without affecting other state', () => {
      renderer = new Renderer({ canvas, debugMode: true });
      
      // First update
      renderer.updateState({ fps: 30 });
      
      // Second update should not clear first
      renderer.updateState({ debug: { stamina: 75 } });
      
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer.renderFrame();
      
      // Both FPS and stamina should be rendered
      const fpsCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('FPS')
      );
      const staminaCalls = fillTextSpy.mock.calls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('Stamina')
      );
      
      expect(fpsCalls.length).toBeGreaterThan(0);
      expect(staminaCalls.length).toBeGreaterThan(0);
      
      fillTextSpy.mockRestore();
    });
  });
});
