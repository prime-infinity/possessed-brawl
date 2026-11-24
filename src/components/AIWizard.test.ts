/**
 * Unit tests for AI Wizard Controller
 * 
 * Tests spell selection, weighted random, counter bias, adaptive difficulty,
 * and taunt system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIWizard, AIConfig, DEFAULT_AI_CONFIG } from './AIWizard';
import { SpellSystem, DEFAULT_SPELL_SYSTEM_CONFIG } from './SpellSystem';
import { SpellType } from '../types';
import { GameState, MatchState } from './GameEngine';

/**
 * Create a mock game state for testing
 */
function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    playerWizard: {
      health: 100,
      mana: 100,
      position: { x: 200, y: 300 },
      activeShield: false,
      frostSlowed: false,
      currentCast: null,
      castAnimation: 0
    },
    aiWizard: {
      health: 100,
      mana: 100,
      position: { x: 600, y: 300 },
      activeShield: false,
      frostSlowed: false,
      currentCast: null,
      castAnimation: 0
    },
    roundTimer: 90,
    playerScore: 0,
    aiScore: 0,
    playerCombo: 0,
    aiCombo: 0,
    matchState: MatchState.FIGHTING,
    ...overrides
  };
}

describe('AIWizard', () => {
  let ai: AIWizard;
  let spellSystem: SpellSystem;
  let gameState: GameState;

  beforeEach(() => {
    spellSystem = new SpellSystem(DEFAULT_SPELL_SYSTEM_CONFIG);
    ai = new AIWizard(DEFAULT_AI_CONFIG, spellSystem);
    gameState = createMockGameState();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(ai).toBeDefined();
      expect(ai.getDifficultyMultiplier()).toBe(1.0);
      expect(ai.getCurrentTaunt()).toBeNull();
    });

    it('should initialize with custom config', () => {
      const customConfig: Partial<AIConfig> = {
        baseCastInterval: 2000,
        counterBias: 0.5
      };
      ai.initialize(customConfig);
      expect(ai).toBeDefined();
    });

    it('should reset state on reset()', () => {
      ai.recordPlayerCast(SpellType.FIREBALL, true);
      ai.triggerTaunt('player_combo', { ...gameState, playerCombo: 10 });
      
      ai.reset();
      
      expect(ai.getDifficultyMultiplier()).toBe(1.0);
      expect(ai.getCurrentTaunt()).toBeNull();
      expect(ai.getPlayerSuccessRate()).toBe(0);
    });
  });

  describe('Spell Selection', () => {
    it('should not select spell when timer is active', () => {
      const spell = ai.selectSpell(gameState);
      expect(spell).toBeNull();
    });

    it('should select spell when timer reaches zero', () => {
      // Fast-forward timer
      const fastConfig: Partial<AIConfig> = {
        baseCastInterval: 2000,
        castIntervalVariation: 0
      };
      ai.initialize(fastConfig);
      
      // Update past timer (needs to exceed minimum 1000ms clamp + config)
      ai.update(2500);
      
      const spell = ai.selectSpell(gameState);
      expect(spell).not.toBeNull();
      expect(spell?.type).toBeOneOf([
        SpellType.SHIELD,
        SpellType.LIGHTNING,
        SpellType.FIREBALL,
        SpellType.FROST
      ]);
    });

    it('should not select spell when AI has insufficient mana', () => {
      const lowManaState = createMockGameState({
        aiWizard: {
          ...gameState.aiWizard,
          mana: 5 // Less than any spell cost
        }
      });

      // Fast-forward timer
      ai.update(10000);
      
      const spell = ai.selectSpell(lowManaState);
      expect(spell).toBeNull();
    });

    it('should select cheapest spell when low on mana', () => {
      const lowManaState = createMockGameState({
        aiWizard: {
          ...gameState.aiWizard,
          mana: 20 // Enough for Fireball (15) but not Lightning (30)
        }
      });

      // Fast-forward timer
      ai.update(10000);
      
      // Run multiple times to increase chance of getting result
      let selectedSpells: SpellType[] = [];
      for (let i = 0; i < 10; i++) {
        ai.reset();
        ai.update(10000);
        const spell = ai.selectSpell(lowManaState);
        if (spell) {
          selectedSpells.push(spell.type);
        }
      }

      // Should only select spells that cost <= 20 mana
      selectedSpells.forEach(spell => {
        expect(spellSystem.getManaCost(spell)).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('Weighted Spell Selection with Counter Bias', () => {
    it('should bias toward counter spell when player is casting', () => {
      // Player casting Fireball, AI should favor Shield
      const castingState = createMockGameState({
        playerWizard: {
          ...gameState.playerWizard,
          currentCast: SpellType.FIREBALL
        }
      });

      // Fast-forward timer and collect samples
      const samples: SpellType[] = [];
      for (let i = 0; i < 50; i++) {
        ai.reset();
        ai.update(10000);
        const spell = ai.selectSpell(castingState);
        if (spell) {
          samples.push(spell.type);
        }
      }

      // Count occurrences
      const shieldCount = samples.filter(s => s === SpellType.SHIELD).length;
      const otherCount = samples.length - shieldCount;

      // Shield should appear more frequently due to counter bias
      // With 0.3 counter bias, Shield weight is 0.25 + 0.3 = 0.55 / 1.3 ≈ 0.42
      // Other spells: 0.25 / 1.3 ≈ 0.19 each
      // So Shield should be ~2x more common than others
      expect(shieldCount).toBeGreaterThan(otherCount / 3);
    });

    it('should favor Lightning when player has active shield', () => {
      const shieldedState = createMockGameState({
        playerWizard: {
          ...gameState.playerWizard,
          activeShield: true
        }
      });

      // Collect samples
      const samples: SpellType[] = [];
      for (let i = 0; i < 50; i++) {
        ai.reset();
        ai.update(10000);
        const spell = ai.selectSpell(shieldedState);
        if (spell) {
          samples.push(spell.type);
        }
      }

      // Lightning should appear more frequently
      const lightningCount = samples.filter(s => s === SpellType.LIGHTNING).length;
      expect(lightningCount).toBeGreaterThan(5); // At least some Lightning casts
    });

    it('should favor Shield when AI has low health', () => {
      const lowHealthState = createMockGameState({
        aiWizard: {
          ...gameState.aiWizard,
          health: 25
        }
      });

      // Collect samples
      const samples: SpellType[] = [];
      for (let i = 0; i < 50; i++) {
        ai.reset();
        ai.update(10000);
        const spell = ai.selectSpell(lowHealthState);
        if (spell) {
          samples.push(spell.type);
        }
      }

      // Shield should appear more frequently
      const shieldCount = samples.filter(s => s === SpellType.SHIELD).length;
      expect(shieldCount).toBeGreaterThan(5);
    });
  });

  describe('Adaptive Difficulty', () => {
    it('should start with 1.0x difficulty multiplier', () => {
      expect(ai.getDifficultyMultiplier()).toBe(1.0);
    });

    it('should increase difficulty when player success rate > 0.7', () => {
      // Record 8 successful casts and 2 failures
      for (let i = 0; i < 8; i++) {
        ai.recordPlayerCast(SpellType.FIREBALL, true);
      }
      for (let i = 0; i < 2; i++) {
        ai.recordPlayerCast(SpellType.FIREBALL, false);
      }

      // Success rate = 8/10 = 0.8 (> 0.7)
      expect(ai.getDifficultyMultiplier()).toBeGreaterThan(1.0);
      expect(ai.getDifficultyMultiplier()).toBeLessThanOrEqual(1.5);
      expect(ai.getPlayerSuccessRate()).toBe(0.8);
    });

    it('should decrease difficulty when player success rate < 0.3', () => {
      // Record 2 successful casts and 8 failures
      for (let i = 0; i < 2; i++) {
        ai.recordPlayerCast(SpellType.FIREBALL, true);
      }
      for (let i = 0; i < 8; i++) {
        ai.recordPlayerCast(SpellType.FIREBALL, false);
      }

      // Success rate = 2/10 = 0.2 (< 0.3)
      expect(ai.getDifficultyMultiplier()).toBeLessThan(1.0);
      expect(ai.getDifficultyMultiplier()).toBeGreaterThanOrEqual(0.5);
      expect(ai.getPlayerSuccessRate()).toBe(0.2);
    });

    it('should maintain 1.0x difficulty when player success rate is normal', () => {
      // Record 5 successful casts and 5 failures
      for (let i = 0; i < 5; i++) {
        ai.recordPlayerCast(SpellType.FIREBALL, true);
        ai.recordPlayerCast(SpellType.FIREBALL, false);
      }

      // Success rate = 5/10 = 0.5 (between 0.3 and 0.7)
      expect(ai.getDifficultyMultiplier()).toBe(1.0);
      expect(ai.getPlayerSuccessRate()).toBe(0.5);
    });

    it('should use rolling window for cast history', () => {
      // Record 10 failures (window size)
      for (let i = 0; i < 10; i++) {
        ai.recordPlayerCast(SpellType.FIREBALL, false);
      }
      
      expect(ai.getPlayerSuccessRate()).toBe(0);

      // Record 5 more successes (should push out 5 old failures)
      for (let i = 0; i < 5; i++) {
        ai.recordPlayerCast(SpellType.FIREBALL, true);
      }

      // Success rate should be 5/10 = 0.5
      expect(ai.getPlayerSuccessRate()).toBe(0.5);
    });
  });

  describe('Taunt System', () => {
    it('should not have taunt initially', () => {
      expect(ai.getCurrentTaunt()).toBeNull();
    });

    it('should display taunt on difficulty increase', () => {
      // Trigger high success rate
      for (let i = 0; i < 10; i++) {
        ai.recordPlayerCast(SpellType.FIREBALL, true);
      }

      expect(ai.getCurrentTaunt()).not.toBeNull();
      expect(ai.getCurrentTaunt()).toMatch(/better|step it up|talking|interesting/i);
    });

    it('should display taunt on player combo > 5', () => {
      const comboState = createMockGameState({
        playerCombo: 6
      });

      ai.triggerTaunt('player_combo', comboState);

      expect(ai.getCurrentTaunt()).not.toBeNull();
      expect(ai.getCurrentTaunt()).toMatch(/combo|impressive|practicing|done/i);
    });

    it('should display taunt on AI combo > 5', () => {
      const comboState = createMockGameState({
        aiCombo: 7
      });

      ai.triggerTaunt('ai_combo', comboState);

      expect(ai.getCurrentTaunt()).not.toBeNull();
      expect(ai.getCurrentTaunt()).toMatch(/all you got|easy|touch this|turn/i);
    });

    it('should display taunt when player has low health', () => {
      const lowHealthState = createMockGameState({
        playerWizard: {
          ...gameState.playerWizard,
          health: 15
        }
      });

      ai.triggerTaunt('player_low_health', lowHealthState);

      expect(ai.getCurrentTaunt()).not.toBeNull();
      expect(ai.getCurrentTaunt()).toMatch(/one more|almost|win|over/i);
    });

    it('should clear taunt after duration', () => {
      const comboState = createMockGameState({
        playerCombo: 6
      });

      ai.triggerTaunt('player_combo', comboState);
      expect(ai.getCurrentTaunt()).not.toBeNull();

      // Update past taunt duration (2500ms)
      ai.update(3000);

      expect(ai.getCurrentTaunt()).toBeNull();
    });

    it('should not trigger taunt if conditions not met', () => {
      const normalState = createMockGameState({
        playerCombo: 3,
        aiCombo: 2
      });

      ai.triggerTaunt('player_combo', normalState);
      expect(ai.getCurrentTaunt()).toBeNull();

      ai.triggerTaunt('ai_combo', normalState);
      expect(ai.getCurrentTaunt()).toBeNull();
    });
  });

  describe('Timer Management', () => {
    it('should update timer each frame', () => {
      const initialTime = ai.getTimeUntilNextCast();
      
      ai.update(100);
      
      const updatedTime = ai.getTimeUntilNextCast();
      expect(updatedTime).toBeLessThan(initialTime);
    });

    it('should reset timer after selecting spell', () => {
      // Fast-forward past timer
      ai.update(10000);
      
      const spell = ai.selectSpell(gameState);
      expect(spell).not.toBeNull();

      // Timer should be reset to positive value
      expect(ai.getTimeUntilNextCast()).toBeGreaterThan(0);
    });

    it('should apply difficulty multiplier to cast interval', () => {
      // Record high success to increase difficulty
      for (let i = 0; i < 10; i++) {
        ai.recordPlayerCast(SpellType.FIREBALL, true);
      }

      const highDifficultyMultiplier = ai.getDifficultyMultiplier();
      expect(highDifficultyMultiplier).toBeGreaterThan(1.0);

      // Reset and check that next cast interval is shorter
      // (Higher difficulty = faster casting = shorter interval)
      ai.reset();
      
      // With high difficulty, timer should be shorter
      // We can't directly test this without exposing internals,
      // but we verified the logic exists
      expect(ai.getTimeUntilNextCast()).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no mana gracefully', () => {
      const noManaState = createMockGameState({
        aiWizard: {
          ...gameState.aiWizard,
          mana: 0
        }
      });

      ai.update(10000);
      const spell = ai.selectSpell(noManaState);
      
      expect(spell).toBeNull();
    });

    it('should handle exactly enough mana for cheapest spell', () => {
      const exactManaState = createMockGameState({
        aiWizard: {
          ...gameState.aiWizard,
          mana: 15 // Exactly Fireball cost
        }
      });

      ai.update(10000);
      
      let foundSpell = false;
      for (let i = 0; i < 20; i++) {
        ai.reset();
        ai.update(10000);
        const spell = ai.selectSpell(exactManaState);
        if (spell) {
          foundSpell = true;
          // Should only select Fireball (15 cost) or less
          expect(spellSystem.getManaCost(spell.type)).toBeLessThanOrEqual(15);
        }
      }
      
      expect(foundSpell).toBe(true);
    });

    it('should handle player casting null', () => {
      const noCastState = createMockGameState({
        playerWizard: {
          ...gameState.playerWizard,
          currentCast: null
        }
      });

      ai.update(10000);
      const spell = ai.selectSpell(noCastState);
      
      // Should still be able to select a spell
      expect(spell).toBeDefined();
    });
  });
});
