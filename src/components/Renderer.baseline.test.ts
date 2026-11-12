/**
 * Unit tests for Renderer baseline reference visualization
 * 
 * Task 8.4: Baseline reference visualization
 * Tests:
 * - Drawing baseline shoulder line
 * - Drawing center position marker
 * - Drawing baseline wrist positions
 * - Showing calibration quality metrics
 * Requirements: 2.7, 9.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Renderer, RendererConfig } from './Renderer';
import { BaselineData } from '../types';

describe('Renderer - Baseline Reference Visualization', () => {
  let canvas: HTMLCanvasElement;
  let renderer: Renderer;
  let ctx: CanvasRenderingContext2D;
  
  beforeEach(() => {
    // Create a canvas element for testing
    canvas = document.createElement('canvas');
    
    // Set canvas internal dimensions
    canvas.width = 800;
    canvas.height = 600;
    
    // Mock clientWidth/clientHeight
    Object.defineProperty(canvas, 'clientWidth', {
      configurable: true,
      writable: true,
      value: 800
    });
    Object.defineProperty(canvas, 'clientHeight', {
      configurable: true,
      writable: true,
      value: 600
    });
    
    // Get context BEFORE creating renderer so we can spy on it
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context');
    }
    ctx = context;
  });
  
  afterEach(() => {
    if (renderer) {
      renderer.dispose();
    }
  });
  
  describe('baseline shoulder line', () => {
    it('should draw a line connecting baseline shoulder positions', () => {
      // Set up spies before creating renderer
      const moveToSpy = vi.spyOn(ctx, 'moveTo');
      const lineToSpy = vi.spyOn(ctx, 'lineTo');
      const strokeSpy = vi.spyOn(ctx, 'stroke');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.3,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Should draw line from left shoulder to right shoulder
      expect(moveToSpy).toHaveBeenCalled();
      expect(lineToSpy).toHaveBeenCalled();
      expect(strokeSpy).toHaveBeenCalled();
      
      // Calculate expected shoulder positions
      // Left shoulder: center.x - shoulderWidth/2 = 0.5 - 0.15 = 0.35
      // Right shoulder: center.x + shoulderWidth/2 = 0.5 + 0.15 = 0.65
      // In pixels: 0.35 * 800 = 280, 0.65 * 800 = 520
      // Y position: 0.4 * 600 = 240
      
      const moveToCall = moveToSpy.mock.calls.find(call => 
        Math.abs(call[0] - 280) < 1 && Math.abs(call[1] - 240) < 1
      );
      expect(moveToCall).toBeDefined();
      
      const lineToCall = lineToSpy.mock.calls.find(call => 
        Math.abs(call[0] - 520) < 1 && Math.abs(call[1] - 240) < 1
      );
      expect(lineToCall).toBeDefined();
    });
    
    it('should use yellow color for baseline shoulder line', () => {
      const strokeStyleSpy = vi.spyOn(ctx, 'strokeStyle', 'set');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.3,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Should set stroke style to yellow (#ffff00)
      const yellowCalls = strokeStyleSpy.mock.calls.filter(call => call[0] === '#ffff00');
      expect(yellowCalls.length).toBeGreaterThan(0);
    });
  });
  
  describe('center position marker', () => {
    it('should draw a cross at the center position', () => {
      const moveToSpy = vi.spyOn(ctx, 'moveTo');
      const lineToSpy = vi.spyOn(ctx, 'lineTo');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.3,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Center pixel: (0.5 * 800, 0.4 * 600) = (400, 240)
      // Cross should have vertical and horizontal lines through center
      
      // Check for lines passing through or near center (400, 240)
      const centerX = 400;
      const centerY = 240;
      const tolerance = 15; // Cross size is 10, so lines extend ±10 from center
      
      const moveToNearCenter = moveToSpy.mock.calls.some(call => 
        Math.abs(call[0] - centerX) < tolerance && Math.abs(call[1] - centerY) < tolerance
      );
      expect(moveToNearCenter).toBe(true);
      
      const lineToNearCenter = lineToSpy.mock.calls.some(call => 
        Math.abs(call[0] - centerX) < tolerance && Math.abs(call[1] - centerY) < tolerance
      );
      expect(lineToNearCenter).toBe(true);
    });
    
    it('should draw a circle around the center position', () => {
      const arcSpy = vi.spyOn(ctx, 'arc');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.3,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Should draw circle at center position (400, 240)
      const centerCircle = arcSpy.mock.calls.find(call => 
        Math.abs(call[0] - 400) < 1 && 
        Math.abs(call[1] - 240) < 1 &&
        call[2] === 8 // Radius for center marker
      );
      expect(centerCircle).toBeDefined();
    });
  });
  
  describe('baseline wrist positions', () => {
    it('should draw circles at baseline wrist positions', () => {
      const arcSpy = vi.spyOn(ctx, 'arc');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.3,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Left wrist: (0.4 * 800, 0.3 * 600) = (320, 180)
      // Right wrist: (0.6 * 800, 0.3 * 600) = (480, 180)
      
      const leftWristCircle = arcSpy.mock.calls.find(call => 
        Math.abs(call[0] - 320) < 1 && 
        Math.abs(call[1] - 180) < 1 &&
        call[2] === 8 // Marker radius
      );
      expect(leftWristCircle).toBeDefined();
      
      const rightWristCircle = arcSpy.mock.calls.find(call => 
        Math.abs(call[0] - 480) < 1 && 
        Math.abs(call[1] - 180) < 1 &&
        call[2] === 8 // Marker radius
      );
      expect(rightWristCircle).toBeDefined();
    });
    
    it('should label wrist markers with L and R', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.3,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Should draw 'L' label at left wrist
      const leftLabel = fillTextSpy.mock.calls.find(call => 
        call[0] === 'L' && Math.abs(call[1] as number - 320) < 1
      );
      expect(leftLabel).toBeDefined();
      
      // Should draw 'R' label at right wrist
      const rightLabel = fillTextSpy.mock.calls.find(call => 
        call[0] === 'R' && Math.abs(call[1] as number - 480) < 1
      );
      expect(rightLabel).toBeDefined();
    });
    
    it('should fill wrist markers', () => {
      const fillSpy = vi.spyOn(ctx, 'fill');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.3,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Should call fill for wrist markers
      expect(fillSpy).toHaveBeenCalled();
      expect(fillSpy.mock.calls.length).toBeGreaterThan(0);
    });
  });
  
  describe('calibration quality metrics', () => {
    it('should display shoulder width metric', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.345,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Should display shoulder width with 3 decimal places
      const shoulderWidthText = fillTextSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('Shoulder Width: 0.345')
      );
      expect(shoulderWidthText).toBeDefined();
    });
    
    it('should display head height metric', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.3,
        headHeight: 0.234,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Should display head height with 3 decimal places
      const headHeightText = fillTextSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('Head Height: 0.234')
      );
      expect(headHeightText).toBeDefined();
    });
    
    it('should display center position metric', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.52, y: 0.43 },
        shoulderWidth: 0.3,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Should display center position with 2 decimal places
      const centerText = fillTextSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && 
        call[0].includes('Center:') &&
        call[0].includes('0.52') &&
        call[0].includes('0.43')
      );
      expect(centerText).toBeDefined();
    });
    
    it('should display calibration frames count if available in debug data', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.3,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ 
        baseline: mockBaseline,
        debug: {
          calibrationFrames: 30
        }
      });
      renderer.renderFrame();
      
      // Should display frames count
      const framesText = fillTextSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('Frames: 30')
      );
      expect(framesText).toBeDefined();
    });
    
    it('should display BASELINE header in bottom-left corner', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.3,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Should display header
      const headerText = fillTextSpy.mock.calls.find(call => 
        call[0] === '=== BASELINE ==='
      );
      expect(headerText).toBeDefined();
      
      // Header should be near bottom-left (y near 600 - 80 = 520)
      if (headerText) {
        const yPos = headerText[2] as number;
        expect(yPos).toBeGreaterThan(500);
        expect(yPos).toBeLessThan(550);
      }
    });
  });
  
  describe('integration with pose landmarks', () => {
    it('should render baseline reference on top of pose landmarks', () => {
      const arcSpy = vi.spyOn(ctx, 'arc');
      const strokeSpy = vi.spyOn(ctx, 'stroke');
      const fillSpy = vi.spyOn(ctx, 'fill');
      
      renderer = new Renderer({ canvas });
      
      const mockLandmarks = {
        points: Array(33).fill(null).map((_, i) => ({
          x: 0.5,
          y: 0.5,
          z: 0,
          visibility: 0.9
        })),
        timestamp: Date.now()
      };
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.5, y: 0.4 },
        shoulderWidth: 0.3,
        headHeight: 0.2,
        leftWristBaseline: { x: 0.4, y: 0.3, z: 0 },
        rightWristBaseline: { x: 0.6, y: 0.3, z: 0 }
      };
      
      renderer.updateState({ 
        landmarks: mockLandmarks,
        baseline: mockBaseline 
      });
      renderer.renderFrame();
      
      // Should draw both landmarks and baseline
      expect(arcSpy.mock.calls.length).toBeGreaterThan(30); // Landmarks + baseline markers
      expect(strokeSpy.mock.calls.length).toBeGreaterThan(0);
      expect(fillSpy.mock.calls.length).toBeGreaterThan(0);
    });
    
    it('should not draw baseline reference if baseline data is not provided', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText');
      
      renderer = new Renderer({ canvas });
      
      const mockLandmarks = {
        points: Array(33).fill(null).map(() => ({
          x: 0.5,
          y: 0.5,
          z: 0,
          visibility: 0.9
        })),
        timestamp: Date.now()
      };
      
      // Only provide landmarks, no baseline
      renderer.updateState({ landmarks: mockLandmarks });
      renderer.renderFrame();
      
      // Should not draw baseline header
      const baselineHeader = fillTextSpy.mock.calls.find(call => 
        call[0] === '=== BASELINE ==='
      );
      expect(baselineHeader).toBeUndefined();
    });
  });
  
  describe('coordinate transformation accuracy', () => {
    it('should correctly transform baseline positions to pixels', () => {
      const arcSpy = vi.spyOn(ctx, 'arc');
      
      renderer = new Renderer({ canvas });
      
      const mockBaseline: BaselineData = {
        centerPosition: { x: 0.25, y: 0.75 },
        shoulderWidth: 0.4,
        headHeight: 0.1,
        leftWristBaseline: { x: 0.2, y: 0.8, z: 0.1 },
        rightWristBaseline: { x: 0.8, y: 0.2, z: -0.1 }
      };
      
      renderer.updateState({ baseline: mockBaseline });
      renderer.renderFrame();
      
      // Center: (0.25 * 800, 0.75 * 600) = (200, 450)
      const centerCircle = arcSpy.mock.calls.find(call => 
        Math.abs(call[0] - 200) < 1 && Math.abs(call[1] - 450) < 1
      );
      expect(centerCircle).toBeDefined();
      
      // Left wrist: (0.2 * 800, 0.8 * 600) = (160, 480)
      const leftWristCircle = arcSpy.mock.calls.find(call => 
        Math.abs(call[0] - 160) < 1 && Math.abs(call[1] - 480) < 1
      );
      expect(leftWristCircle).toBeDefined();
      
      // Right wrist: (0.8 * 800, 0.2 * 600) = (640, 120)
      const rightWristCircle = arcSpy.mock.calls.find(call => 
        Math.abs(call[0] - 640) < 1 && Math.abs(call[1] - 120) < 1
      );
      expect(rightWristCircle).toBeDefined();
    });
  });
});
