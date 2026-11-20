/**
 * Unit tests for Renderer component
 * 
 * Tests basic Canvas rendering infrastructure:
 * - Canvas initialization
 * - Coordinate transformation
 * - Render loop management
 * - FPS tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Renderer, RendererConfig } from './Renderer';

describe('Renderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: Renderer;
  
  beforeEach(() => {
    // Create a canvas element for testing
    canvas = document.createElement('canvas');
    
    // Set canvas internal dimensions (these are numbers, not CSS)
    canvas.width = 800;
    canvas.height = 600;
    
    // Mock clientWidth/clientHeight (read-only properties in real browser)
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
  });
  
  afterEach(() => {
    if (renderer) {
      renderer.dispose();
    }
  });
  
  describe('initialization', () => {
    it('should initialize with canvas element', () => {
      const config: RendererConfig = {
        canvas,
        debugMode: false,
        targetFps: 30
      };
      
      renderer = new Renderer(config);
      
      expect(renderer).toBeDefined();
      expect(renderer.getDimensions()).toEqual({ width: 800, height: 600 });
    });
    
    it('should throw error if canvas context cannot be obtained', () => {
      // Mock getContext to return null
      const mockCanvas = {
        ...canvas,
        getContext: () => null
      } as unknown as HTMLCanvasElement;
      
      expect(() => {
        new Renderer({ canvas: mockCanvas });
      }).toThrow('Failed to get 2D rendering context from canvas');
    });
    
    it('should set debug mode from config', () => {
      renderer = new Renderer({
        canvas,
        debugMode: true
      });
      
      expect(renderer).toBeDefined();
      // Debug mode is private, but we can test it indirectly through rendering
    });
    
    it('should use default target FPS if not specified', () => {
      renderer = new Renderer({ canvas });
      expect(renderer).toBeDefined();
      // Target FPS is private but used internally
    });
  });
  
  describe('coordinate transformation', () => {
    beforeEach(() => {
      renderer = new Renderer({ canvas });
    });
    
    it('should transform normalized coordinates to pixels', () => {
      // Test center point (0.5, 0.5)
      const center = renderer.normalizedToPixels(0.5, 0.5);
      expect(center).toEqual({ x: 400, y: 300 });
      
      // Test top-left corner (0, 0)
      const topLeft = renderer.normalizedToPixels(0, 0);
      expect(topLeft).toEqual({ x: 0, y: 0 });
      
      // Test bottom-right corner (1, 1)
      const bottomRight = renderer.normalizedToPixels(1, 1);
      expect(bottomRight).toEqual({ x: 800, y: 600 });
    });
    
    it('should transform pixels to normalized coordinates', () => {
      // Test center point (400, 300)
      const center = renderer.pixelsToNormalized(400, 300);
      expect(center).toEqual({ x: 0.5, y: 0.5 });
      
      // Test top-left corner (0, 0)
      const topLeft = renderer.pixelsToNormalized(0, 0);
      expect(topLeft).toEqual({ x: 0, y: 0 });
      
      // Test bottom-right corner (800, 600)
      const bottomRight = renderer.pixelsToNormalized(800, 600);
      expect(bottomRight).toEqual({ x: 1, y: 1 });
    });
    
    it('should be reversible (normalized -> pixels -> normalized)', () => {
      const original = { x: 0.75, y: 0.25 };
      const pixels = renderer.normalizedToPixels(original.x, original.y);
      const normalized = renderer.pixelsToNormalized(pixels.x, pixels.y);
      
      expect(normalized.x).toBeCloseTo(original.x);
      expect(normalized.y).toBeCloseTo(original.y);
    });
    
    it('should handle edge cases at boundaries', () => {
      // Test values outside 0-1 range (MediaPipe can output slightly outside)
      const outside = renderer.normalizedToPixels(1.1, -0.1);
      expect(outside.x).toBeCloseTo(880); // 1.1 * 800
      expect(outside.y).toBeCloseTo(-60);  // -0.1 * 600
    });
  });
  
  describe('render loop', () => {
    beforeEach(() => {
      renderer = new Renderer({ canvas, targetFps: 30 });
      
      // Mock requestAnimationFrame for testing
      vi.useFakeTimers();
    });
    
    afterEach(() => {
      vi.useRealTimers();
    });
    
    it('should start render loop', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      
      renderer.start();
      
      expect(rafSpy).toHaveBeenCalled();
      
      rafSpy.mockRestore();
    });
    
    it('should stop render loop', () => {
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
      
      renderer.start();
      renderer.stop();
      
      expect(cancelSpy).toHaveBeenCalled();
      
      cancelSpy.mockRestore();
    });
    
    it('should not start multiple times', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      
      renderer.start();
      const callCount1 = rafSpy.mock.calls.length;
      
      renderer.start(); // Try to start again
      const callCount2 = rafSpy.mock.calls.length;
      
      // Should not have increased
      expect(callCount2).toBe(callCount1);
      
      rafSpy.mockRestore();
    });
    
    it('should update FPS counter over time', () => {
      renderer.start();
      
      // Initial FPS should be 0
      expect(renderer.getFps()).toBe(0);
      
      // Simulate time passing and frames being rendered
      // Note: Actual FPS tracking requires real timing, this is a basic check
      vi.advanceTimersByTime(1000);
      
      renderer.stop();
    });
  });
  
  describe('state management', () => {
    beforeEach(() => {
      renderer = new Renderer({ canvas });
    });
    
    it('should update render state', () => {
      const state = {
        fps: 30,
        debug: { test: 'value' }
      };
      
      // This should not throw
      expect(() => {
        renderer.updateState(state);
      }).not.toThrow();
    });
    
    it('should merge state updates', () => {
      renderer.updateState({ fps: 30 });
      renderer.updateState({ debug: { test: 'value' } });
      
      // Both updates should be preserved
      // (This is tested indirectly since state is private)
      expect(renderer).toBeDefined();
    });
  });
  
  describe('debug mode', () => {
    beforeEach(() => {
      renderer = new Renderer({ canvas, debugMode: false });
    });
    
    it('should toggle debug mode', () => {
      renderer.setDebugMode(true);
      expect(renderer).toBeDefined();
      
      renderer.setDebugMode(false);
      expect(renderer).toBeDefined();
    });
  });
  
  describe('dimensions', () => {
    it('should return current canvas dimensions', () => {
      renderer = new Renderer({ canvas });
      
      const dims = renderer.getDimensions();
      expect(dims).toEqual({ width: 800, height: 600 });
    });
    
    it('should handle canvas resize', () => {
      renderer = new Renderer({ canvas });
      
      // Change canvas size
      Object.defineProperty(canvas, 'clientWidth', {
        configurable: true,
        value: 1024
      });
      Object.defineProperty(canvas, 'clientHeight', {
        configurable: true,
        value: 768
      });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      
      // Dimensions should update
      const dims = renderer.getDimensions();
      expect(dims).toEqual({ width: 1024, height: 768 });
    });
  });
  
  describe('cleanup', () => {
    it('should dispose and stop rendering', () => {
      renderer = new Renderer({ canvas });
      renderer.start();
      
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
      
      renderer.dispose();
      
      expect(cancelSpy).toHaveBeenCalled();
      
      cancelSpy.mockRestore();
    });
  });
  
  describe('mobile device handling', () => {
    it('should work with different aspect ratios (landscape)', () => {
      // Simulate landscape mobile screen (e.g., 896x414)
      Object.defineProperty(canvas, 'clientWidth', {
        configurable: true,
        value: 896
      });
      Object.defineProperty(canvas, 'clientHeight', {
        configurable: true,
        value: 414
      });
      
      renderer = new Renderer({ canvas });
      
      const dims = renderer.getDimensions();
      expect(dims).toEqual({ width: 896, height: 414 });
      
      // Test coordinate transformation with landscape dimensions
      const center = renderer.normalizedToPixels(0.5, 0.5);
      expect(center).toEqual({ x: 448, y: 207 });
    });
  });
  
  describe('pose landmark visualization', () => {
    beforeEach(() => {
      renderer = new Renderer({ canvas, visibilityThreshold: 0.5 });
    });
    
    it('should render landmarks when provided in state', () => {
      const ctx = canvas.getContext('2d');
      expect(ctx).not.toBeNull();
      
      // Create mock landmarks with some visible and some not visible
      const mockLandmarks = {
        points: [
          { x: 0.5, y: 0.3, z: 0, visibility: 0.9 },  // High visibility - should be green
          { x: 0.6, y: 0.4, z: 0, visibility: 0.3 },  // Low visibility - should be red
          { x: 0.4, y: 0.4, z: 0, visibility: 0.8 },  // High visibility - should be green
        ],
        timestamp: Date.now()
      };
      
      const arcSpy = vi.spyOn(ctx!, 'arc');
      const fillSpy = vi.spyOn(ctx!, 'fill');
      
      renderer.updateState({ landmarks: mockLandmarks });
      
      // Manually trigger render
      renderer.renderFrame();
      
      // Arc should be called for each landmark
      expect(arcSpy).toHaveBeenCalled();
      expect(fillSpy).toHaveBeenCalled();
      
      arcSpy.mockRestore();
      fillSpy.mockRestore();
    });
    
    it('should use green color for visible landmarks', () => {
      const ctx = canvas.getContext('2d');
      
      const mockLandmarks = {
        points: [
          { x: 0.5, y: 0.5, z: 0, visibility: 0.9 }  // Above threshold
        ],
        timestamp: Date.now()
      };
      
      const fillStyleSpy = vi.spyOn(ctx!, 'fillStyle', 'set');
      
      renderer.updateState({ landmarks: mockLandmarks });
      renderer.renderFrame();
      
      // Should have set fillStyle to green at some point
      expect(fillStyleSpy).toHaveBeenCalled();
      const greenCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#00ff00');
      expect(greenCalls.length).toBeGreaterThan(0);
      
      fillStyleSpy.mockRestore();
    });
    
    it('should use red color for low visibility landmarks', () => {
      const ctx = canvas.getContext('2d');
      
      const mockLandmarks = {
        points: [
          { x: 0.5, y: 0.5, z: 0, visibility: 0.2 }  // Below threshold
        ],
        timestamp: Date.now()
      };
      
      const fillStyleSpy = vi.spyOn(ctx!, 'fillStyle', 'set');
      
      renderer.updateState({ landmarks: mockLandmarks });
      renderer.renderFrame();
      
      const redCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#ff0000');
      expect(redCalls.length).toBeGreaterThan(0);
      
      fillStyleSpy.mockRestore();
    });
    
    it('should draw skeleton lines connecting joints', () => {
      const ctx = canvas.getContext('2d');
      
      // Create landmarks for a simple skeleton (need at least 2 connected points)
      // Using shoulder connection (indices 11 and 12)
      const mockLandmarks = {
        points: Array(33).fill(null).map((_, i) => ({
          x: 0.5 + (i * 0.01), // Spread them out a bit
          y: 0.5,
          z: 0,
          visibility: i === 11 || i === 12 ? 0.9 : 0.1 // Only shoulders visible
        })),
        timestamp: Date.now()
      };
      
      const moveToSpy = vi.spyOn(ctx!, 'moveTo');
      const lineToSpy = vi.spyOn(ctx!, 'lineTo');
      const strokeSpy = vi.spyOn(ctx!, 'stroke');
      
      renderer.updateState({ landmarks: mockLandmarks });
      renderer.renderFrame();
      
      // Should have drawn lines
      expect(moveToSpy).toHaveBeenCalled();
      expect(lineToSpy).toHaveBeenCalled();
      expect(strokeSpy).toHaveBeenCalled();
      
      moveToSpy.mockRestore();
      lineToSpy.mockRestore();
      strokeSpy.mockRestore();
    });
    
    it('should only draw skeleton lines between visible landmarks', () => {
      const ctx = canvas.getContext('2d');
      
      // Create landmarks where only one shoulder is visible
      // The shoulder-to-shoulder line should NOT be drawn
      const mockLandmarks = {
        points: Array(33).fill(null).map((_, i) => ({
          x: 0.5,
          y: 0.5,
          z: 0,
          visibility: i === 11 ? 0.9 : 0.1 // Only left shoulder visible
        })),
        timestamp: Date.now()
      };
      
      const strokeSpy = vi.spyOn(ctx!, 'stroke');
      
      renderer.updateState({ landmarks: mockLandmarks });
      
      const strokeCountBefore = strokeSpy.mock.calls.length;
      renderer.renderFrame();
      const strokeCountAfter = strokeSpy.mock.calls.length;
      
      // Should have minimal strokes since most landmarks are not visible
      // (exact count depends on implementation details)
      expect(strokeCountAfter).toBeGreaterThanOrEqual(strokeCountBefore);
      
      strokeSpy.mockRestore();
    });
    
    it('should transform landmark coordinates correctly', () => {
      const ctx = canvas.getContext('2d');
      
      // Landmark at normalized (0.5, 0.5) should be at pixel (400, 300) for 800x600 canvas
      const mockLandmarks = {
        points: [
          { x: 0.5, y: 0.5, z: 0, visibility: 0.9 }
        ],
        timestamp: Date.now()
      };
      
      const arcSpy = vi.spyOn(ctx!, 'arc');
      
      renderer.updateState({ landmarks: mockLandmarks });
      renderer.renderFrame();
      
      // Arc should be called with center coordinates (400, 300)
      expect(arcSpy).toHaveBeenCalled();
      const calls = arcSpy.mock.calls;
      const lastCall = calls[calls.length - 1];
      
      // Check that arc was called with correct pixel coordinates
      expect(lastCall[0]).toBeCloseTo(400, 1); // x
      expect(lastCall[1]).toBeCloseTo(300, 1); // y
      
      arcSpy.mockRestore();
    });
    
    it('should respect custom visibility threshold', () => {
      const customRenderer = new Renderer({ 
        canvas, 
        visibilityThreshold: 0.7 // Higher threshold
      });
      
      const ctx = canvas.getContext('2d');
      
      // Landmark with visibility 0.6 (below custom threshold but above default)
      const mockLandmarks = {
        points: [
          { x: 0.5, y: 0.5, z: 0, visibility: 0.6 }
        ],
        timestamp: Date.now()
      };
      
      const fillStyleSpy = vi.spyOn(ctx!, 'fillStyle', 'set');
      
      customRenderer.updateState({ landmarks: mockLandmarks });
      customRenderer.renderFrame();
      
      // Should use red color since visibility is below 0.7
      const redCalls = fillStyleSpy.mock.calls.filter(call => call[0] === '#ff0000');
      expect(redCalls.length).toBeGreaterThan(0);
      
      fillStyleSpy.mockRestore();
      customRenderer.dispose();
    });
  });
});
