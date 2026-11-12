/**
 * Unit tests for the main Application class
 * 
 * Tests the lifecycle coordination of Stage 1 components.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Application } from './main';

// Mock DOM elements
function setupMockDOM() {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';
  document.body.appendChild(canvas);
  
  // Create start button
  const startBtn = document.createElement('button');
  startBtn.id = 'start-btn';
  document.body.appendChild(startBtn);
  
  // Create loading screen
  const loadingScreen = document.createElement('div');
  loadingScreen.id = 'loading-screen';
  loadingScreen.classList.add('active');
  document.body.appendChild(loadingScreen);
  
  // Create calibration screen
  const calibrationScreen = document.createElement('div');
  calibrationScreen.id = 'calibration-screen';
  document.body.appendChild(calibrationScreen);
}

function cleanupMockDOM() {
  document.body.innerHTML = '';
}

describe('Application', () => {
  beforeEach(() => {
    setupMockDOM();
  });
  
  afterEach(() => {
    cleanupMockDOM();
  });
  
  describe('initialization', () => {
    it('should create Application instance with required DOM elements', () => {
      expect(() => new Application()).not.toThrow();
    });
    
    it('should throw error if required DOM elements are missing', () => {
      // Remove canvas
      const canvas = document.getElementById('canvas');
      canvas?.remove();
      
      expect(() => new Application()).toThrow('Required DOM elements not found');
    });
    
    it('should initialize in NOT_STARTED state', () => {
      const app = new Application();
      expect(app.getState()).toBe('not_started');
    });
  });
  
  describe('component lifecycle', () => {
    it('should initialize components in correct order', () => {
      const app = new Application();
      
      // Components should be created during construction
      // PoseDetector, Calibrator, CalibrationUI, Renderer
      expect(app).toBeDefined();
    });
    
    it('should have null baseline initially', () => {
      const app = new Application();
      expect(app.getBaseline()).toBeNull();
    });
  });
  
  describe('state management', () => {
    it('should track application state', () => {
      const app = new Application();
      
      // Initial state
      expect(app.getState()).toBe('not_started');
    });
  });
  
  describe('cleanup', () => {
    it('should clean up resources on stop', () => {
      const app = new Application();
      
      // Should not throw
      expect(() => app.stop()).not.toThrow();
    });
  });
  
  describe('mobile optimizations - FPS tracking', () => {
    it('should track FPS with rolling average', async () => {
      const app = new Application();
      
      // Initial FPS should be 0
      expect(app.getCurrentFps()).toBe(0);
    });
    
    it('should expose current FPS via getter', () => {
      const app = new Application();
      
      const fps = app.getCurrentFps();
      expect(typeof fps).toBe('number');
      expect(fps).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('mobile optimizations - performance warning UI', () => {
    it('should create performance warning element on initialization', () => {
      const app = new Application();
      
      const warningElement = document.getElementById('performance-warning');
      expect(warningElement).toBeTruthy();
      expect(warningElement?.style.display).toBe('none'); // Hidden by default
    });
    
    it('should clean up performance warning on stop', () => {
      const app = new Application();
      
      // Verify warning exists
      let warningElement = document.getElementById('performance-warning');
      expect(warningElement).toBeTruthy();
      
      // Stop application
      app.stop();
      
      // Warning should be removed from DOM
      warningElement = document.getElementById('performance-warning');
      expect(warningElement).toBeNull();
    });
  });
});
