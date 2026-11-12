/**
 * Test suite for Renderer debug mode toggle feature (Task 8.5)
 * 
 * Tests:
 * - Keyboard shortcut toggle
 * - localStorage persistence
 * - Graceful degradation when localStorage unavailable
 * 
 * Requirements: 9.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Renderer } from './Renderer';

describe('Renderer - Debug Mode Toggle (Task 8.5)', () => {
  let canvas: HTMLCanvasElement;
  let renderer: Renderer;
  
  beforeEach(() => {
    // Create a test canvas element
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    // Clear localStorage before each test
    localStorage.clear();
  });
  
  afterEach(() => {
    // Clean up renderer
    if (renderer) {
      renderer.dispose();
    }
    
    // Clear localStorage after each test
    localStorage.clear();
  });
  
  describe('Basic Toggle Functionality', () => {
    it('should initialize with debug mode OFF by default when no preference stored', () => {
      renderer = new Renderer({ canvas });
      
      // Debug mode should be off by default
      expect(renderer['debugMode']).toBe(false);
    });
    
    it('should initialize with debug mode ON when config specifies it', () => {
      renderer = new Renderer({ canvas, debugMode: true });
      
      expect(renderer['debugMode']).toBe(true);
    });
    
    it('should toggle debug mode ON when calling toggleDebugMode()', () => {
      renderer = new Renderer({ canvas });
      
      const newState = renderer.toggleDebugMode();
      
      expect(newState).toBe(true);
      expect(renderer['debugMode']).toBe(true);
    });
    
    it('should toggle debug mode OFF when calling toggleDebugMode() twice', () => {
      renderer = new Renderer({ canvas });
      
      renderer.toggleDebugMode(); // ON
      const newState = renderer.toggleDebugMode(); // OFF
      
      expect(newState).toBe(false);
      expect(renderer['debugMode']).toBe(false);
    });
    
    it('should update debug mode when calling setDebugMode()', () => {
      renderer = new Renderer({ canvas });
      
      renderer.setDebugMode(true);
      expect(renderer['debugMode']).toBe(true);
      
      renderer.setDebugMode(false);
      expect(renderer['debugMode']).toBe(false);
    });
  });
  
  describe('Keyboard Shortcut', () => {
    it('should toggle debug mode when D key is pressed', () => {
      renderer = new Renderer({ canvas });
      
      expect(renderer['debugMode']).toBe(false);
      
      // Simulate pressing 'D' key
      const event = new KeyboardEvent('keydown', { key: 'd' });
      window.dispatchEvent(event);
      
      expect(renderer['debugMode']).toBe(true);
    });
    
    it('should toggle debug mode when Shift+D (uppercase D) is pressed', () => {
      renderer = new Renderer({ canvas });
      
      expect(renderer['debugMode']).toBe(false);
      
      // Simulate pressing 'D' key (uppercase)
      const event = new KeyboardEvent('keydown', { key: 'D' });
      window.dispatchEvent(event);
      
      expect(renderer['debugMode']).toBe(true);
    });
    
    it('should NOT toggle debug mode when D is pressed in an input field', () => {
      renderer = new Renderer({ canvas });
      
      // Create an input element and focus it
      const input = document.createElement('input');
      document.body.appendChild(input);
      
      expect(renderer['debugMode']).toBe(false);
      
      // Simulate pressing 'D' key in input field
      const event = new KeyboardEvent('keydown', { key: 'd' });
      Object.defineProperty(event, 'target', { value: input, enumerable: true });
      window.dispatchEvent(event);
      
      // Debug mode should remain off
      expect(renderer['debugMode']).toBe(false);
      
      // Clean up
      document.body.removeChild(input);
    });
    
    it('should NOT toggle debug mode when D is pressed in a textarea', () => {
      renderer = new Renderer({ canvas });
      
      // Create a textarea element
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      
      expect(renderer['debugMode']).toBe(false);
      
      // Simulate pressing 'D' key in textarea
      const event = new KeyboardEvent('keydown', { key: 'd' });
      Object.defineProperty(event, 'target', { value: textarea, enumerable: true });
      window.dispatchEvent(event);
      
      // Debug mode should remain off
      expect(renderer['debugMode']).toBe(false);
      
      // Clean up
      document.body.removeChild(textarea);
    });
  });
  
  describe('localStorage Persistence', () => {
    it('should save debug mode preference to localStorage when toggled ON', () => {
      renderer = new Renderer({ canvas });
      
      renderer.toggleDebugMode();
      
      const stored = localStorage.getItem('possessedBrawl_debugMode');
      expect(stored).toBe('true');
    });
    
    it('should save debug mode preference to localStorage when toggled OFF', () => {
      renderer = new Renderer({ canvas, debugMode: true });
      
      renderer.toggleDebugMode();
      
      const stored = localStorage.getItem('possessedBrawl_debugMode');
      expect(stored).toBe('false');
    });
    
    it('should load debug mode preference from localStorage on initialization', () => {
      // Set preference in localStorage before creating renderer
      localStorage.setItem('possessedBrawl_debugMode', 'true');
      
      renderer = new Renderer({ canvas });
      
      // Should load the stored preference
      expect(renderer['debugMode']).toBe(true);
    });
    
    it('should prefer localStorage preference over config default', () => {
      // Set preference in localStorage to OFF
      localStorage.setItem('possessedBrawl_debugMode', 'false');
      
      // Create renderer with config specifying ON
      renderer = new Renderer({ canvas, debugMode: true });
      
      // Should use localStorage preference (OFF) over config (ON)
      expect(renderer['debugMode']).toBe(false);
    });
    
    it('should use config default when no localStorage preference exists', () => {
      // Ensure localStorage is empty
      localStorage.clear();
      
      renderer = new Renderer({ canvas, debugMode: true });
      
      // Should use config default since no preference stored
      expect(renderer['debugMode']).toBe(true);
    });
    
    it('should persist preference across page reloads (simulated)', () => {
      // First instance: turn debug mode ON
      renderer = new Renderer({ canvas });
      renderer.toggleDebugMode();
      renderer.dispose();
      
      // Second instance: should load preference
      renderer = new Renderer({ canvas });
      expect(renderer['debugMode']).toBe(true);
    });
  });
  
  describe('Graceful Degradation', () => {
    it('should handle localStorage being unavailable gracefully', () => {
      // Mock localStorage to throw errors
      const originalSetItem = Storage.prototype.setItem;
      const originalGetItem = Storage.prototype.getItem;
      
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });
      
      // Should not throw when localStorage is unavailable
      expect(() => {
        renderer = new Renderer({ canvas, debugMode: true });
      }).not.toThrow();
      
      // Should still be able to toggle debug mode
      expect(() => {
        renderer.toggleDebugMode();
      }).not.toThrow();
      
      // Debug mode should work even without localStorage
      expect(renderer['debugMode']).toBe(false); // toggled from true to false
      
      // Restore original methods
      Storage.prototype.setItem = originalSetItem;
      Storage.prototype.getItem = originalGetItem;
    });
    
    it('should use config default when localStorage throws error', () => {
      // Mock localStorage.getItem to throw error
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });
      
      renderer = new Renderer({ canvas, debugMode: true });
      
      // Should fall back to config default
      expect(renderer['debugMode']).toBe(true);
      
      // Restore original method
      Storage.prototype.getItem = originalGetItem;
    });
    
    it('should continue working when localStorage.setItem throws error', () => {
      // Mock localStorage.setItem to throw error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('localStorage quota exceeded');
      });
      
      renderer = new Renderer({ canvas });
      
      // Should not throw when toggling
      expect(() => {
        renderer.toggleDebugMode();
      }).not.toThrow();
      
      // Debug mode should still work locally
      expect(renderer['debugMode']).toBe(true);
      
      // Restore original method
      Storage.prototype.setItem = originalSetItem;
    });
  });
  
  describe('Notification Display', () => {
    it('should add notification to state when debug mode is toggled', () => {
      renderer = new Renderer({ canvas });
      
      renderer.toggleDebugMode();
      
      // Check that notification was added to state
      const notification = renderer['currentState'].debug?.notification;
      expect(notification).toBeDefined();
      expect(notification?.message).toBe('Debug Mode: ON');
      expect(notification?.color).toBe('#00ff00');
    });
    
    it('should show different messages for ON and OFF states', () => {
      renderer = new Renderer({ canvas, debugMode: true });
      
      renderer.toggleDebugMode(); // Toggle to OFF
      
      const notification = renderer['currentState'].debug?.notification;
      expect(notification?.message).toBe('Debug Mode: OFF');
      expect(notification?.color).toBe('#ff0000');
    });
  });
});
