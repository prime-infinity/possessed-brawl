/**
 * Tests for Renderer component - Stage 2 features
 * 
 * Task 17: Implement game renderer (replace Stage 1 placeholder effects)
 * 
 * Note: Canvas rendering tests are limited in jsdom environment.
 * These tests verify method existence and basic functionality without
 * actual canvas rendering verification.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Renderer, RendererConfig } from './Renderer';
import { SpellType } from '../types';

// Mock canvas context for testing
const mockContext = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  globalAlpha: 1,
  shadowBlur: 0,
  shadowColor: '',
  font: '',
  textAlign: 'start' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn()
  })),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn()
  })),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  roundRect: vi.fn(),
};

describe('Renderer - Stage 2 Features (Task 17)', () => {
  let canvas: HTMLCanvasElement;
  let renderer: Renderer;

  beforeEach(() => {
    // Create a canvas element for testing
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    // Mock getContext to return our mock context
    canvas.getContext = vi.fn(() => mockContext as any);
    
    document.body.appendChild(canvas);

    const config: RendererConfig = {
      canvas,
      debugMode: false,
      targetFps: 30
    };

    renderer = new Renderer(config);
  });

  afterEach(() => {
    if (renderer) {
      renderer.dispose();
    }
    if (canvas && canvas.parentNode) {
      document.body.removeChild(canvas);
    }
  });

  describe('Task 17.1: Stick figure wizards', () => {
    it('should have drawWizards method', () => {
      expect(renderer.drawWizards).toBeDefined();
      expect(typeof renderer.drawWizards).toBe('function');
    });

    it('should draw wizards without throwing', () => {
      const gameState = {
        roundTimer: '1:30',
        playerScore: 100,
        aiScore: 50,
        playerCombo: 2,
        aiCombo: 0,
        playerHealth: 80,
        aiHealth: 60,
        playerMana: 70,
        aiMana: 50,
        playerCasting: null,
        aiCasting: null,
        playerShield: false,
        aiShield: false
      };

      expect(() => {
        renderer.drawWizards(gameState);
      }).not.toThrow();
    });

    it('should draw wizards with casting state', () => {
      const gameState = {
        roundTimer: '1:30',
        playerScore: 100,
        aiScore: 50,
        playerCombo: 2,
        aiCombo: 0,
        playerHealth: 80,
        aiHealth: 60,
        playerMana: 70,
        aiMana: 50,
        playerCasting: SpellType.FIREBALL,
        aiCasting: SpellType.LIGHTNING,
        playerShield: false,
        aiShield: false
      };

      expect(() => {
        renderer.drawWizards(gameState);
      }).not.toThrow();
      
      // Verify drawing methods were called
      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('should draw wizards with shields', () => {
      const gameState = {
        roundTimer: '1:30',
        playerScore: 100,
        aiScore: 50,
        playerCombo: 2,
        aiCombo: 0,
        playerHealth: 80,
        aiHealth: 60,
        playerMana: 70,
        aiMana: 50,
        playerCasting: null,
        aiCasting: null,
        playerShield: true,
        aiShield: true
      };

      expect(() => {
        renderer.drawWizards(gameState);
      }).not.toThrow();
    });
  });

  describe('Task 17.2: UI bar rendering', () => {
    it('should draw health bars', () => {
      const gameState = {
        roundTimer: '1:30',
        playerScore: 100,
        aiScore: 50,
        playerCombo: 2,
        aiCombo: 0,
        playerHealth: 80,
        aiHealth: 60,
        playerMana: 70,
        aiMana: 50,
        playerCasting: null,
        aiCasting: null,
        playerShield: false,
        aiShield: false
      };

      expect(() => {
        renderer.drawGameUI(gameState);
      }).not.toThrow();
      
      // Verify bars were drawn (fillRect called multiple times)
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should handle different health levels', () => {
      const testHealthLevels = [
        { health: 80, desc: 'high health' },
        { health: 45, desc: 'medium health' },
        { health: 20, desc: 'low health' }
      ];

      testHealthLevels.forEach(({ health, desc }) => {
        const gameState = {
          roundTimer: '1:30',
          playerScore: 100,
          aiScore: 50,
          playerCombo: 0,
          aiCombo: 0,
          playerHealth: health,
          aiHealth: health,
          playerMana: 50,
          aiMana: 50,
          playerCasting: null,
          aiCasting: null,
          playerShield: false,
          aiShield: false
        };
        
        expect(() => renderer.drawGameUI(gameState), desc).not.toThrow();
      });
    });
  });

  describe('Task 17.3: Game UI elements', () => {
    it('should draw round timer', () => {
      const gameState = {
        roundTimer: '1:30',
        playerScore: 100,
        aiScore: 50,
        playerCombo: 2,
        aiCombo: 0,
        playerHealth: 80,
        aiHealth: 60,
        playerMana: 70,
        aiMana: 50,
        playerCasting: null,
        aiCasting: null,
        playerShield: false,
        aiShield: false
      };

      renderer.drawGameUI(gameState);
      
      // Verify text rendering was called
      expect(mockContext.fillText).toHaveBeenCalled();
    });

    it('should draw taunt text bubbles', () => {
      const gameState = {
        roundTimer: '1:30',
        playerScore: 100,
        aiScore: 50,
        playerCombo: 2,
        aiCombo: 0,
        playerHealth: 80,
        aiHealth: 60,
        playerMana: 70,
        aiMana: 50,
        playerCasting: null,
        aiCasting: null,
        playerShield: false,
        aiShield: false,
        tauntText: 'Is that all you got?'
      };

      expect(() => {
        renderer.drawWizards(gameState);
      }).not.toThrow();
    });
  });

  describe('Task 17.4: Full spell effects', () => {
    it('should have drawEnhancedSpellEffect method', () => {
      expect(renderer.drawEnhancedSpellEffect).toBeDefined();
      expect(typeof renderer.drawEnhancedSpellEffect).toBe('function');
    });

    it('should draw all spell effect types', () => {
      const playerX = 160;
      const playerY = 360;
      const aiX = 640;
      const aiY = 360;
      const progress = 0.5;

      const spellTypes = [
        SpellType.SHIELD,
        SpellType.LIGHTNING,
        SpellType.FIREBALL,
        SpellType.FROST
      ];

      spellTypes.forEach(spellType => {
        expect(() => {
          renderer.drawEnhancedSpellEffect(spellType, playerX, playerY, aiX, aiY, progress);
        }, `${spellType} effect`).not.toThrow();
      });
    });

    it('should handle spell animation progress', () => {
      const playerX = 160;
      const playerY = 360;
      const aiX = 640;
      const aiY = 360;

      // Test at different progress values
      for (let progress = 0; progress <= 1; progress += 0.2) {
        expect(() => {
          renderer.drawEnhancedSpellEffect(SpellType.LIGHTNING, playerX, playerY, aiX, aiY, progress);
        }).not.toThrow();
      }
    });
  });

  describe('Task 17.5: Debug overlay with game state', () => {
    it('should show game state in debug mode', () => {
      renderer.setDebugMode(true);

      const gameState = {
        roundTimer: '1:30',
        playerScore: 100,
        aiScore: 50,
        playerCombo: 2,
        aiCombo: 0,
        playerHealth: 80,
        aiHealth: 60,
        playerMana: 70,
        aiMana: 50,
        playerCasting: SpellType.FIREBALL,
        aiCasting: null,
        playerShield: true,
        aiShield: false
      };

      renderer.updateState({ game: gameState });
      renderer.renderFrame();

      // Check that debug overlay was created
      const overlay = document.getElementById('debug-overlay');
      expect(overlay).toBeTruthy();
    });

    it('should include health and mana in debug info', () => {
      renderer.setDebugMode(true);

      const gameState = {
        roundTimer: '1:30',
        playerScore: 100,
        aiScore: 50,
        playerCombo: 2,
        aiCombo: 0,
        playerHealth: 80,
        aiHealth: 60,
        playerMana: 70,
        aiMana: 50,
        playerCasting: null,
        aiCasting: null,
        playerShield: false,
        aiShield: false
      };

      renderer.updateState({ game: gameState });
      renderer.renderFrame();

      const overlay = document.getElementById('debug-overlay');
      const overlayText = overlay?.innerHTML || '';
      expect(overlayText).toContain('Health');
      expect(overlayText).toContain('Mana');
    });
  });

  describe('Integration: Full game rendering', () => {
    it('should render complete game state', () => {
      const gameState = {
        roundTimer: '1:30',
        playerScore: 100,
        aiScore: 50,
        playerCombo: 2,
        aiCombo: 0,
        playerHealth: 80,
        aiHealth: 60,
        playerMana: 70,
        aiMana: 50,
        playerCasting: SpellType.FIREBALL,
        aiCasting: SpellType.SHIELD,
        playerShield: false,
        aiShield: true,
        tauntText: 'Nice try!'
      };

      renderer.updateState({ game: gameState });
      
      expect(() => {
        renderer.renderFrame();
      }).not.toThrow();
    });
  });
});
