/**
 * Integration tests for Stage 2 component wiring
 * 
 * **Validates: Requirements 18.1-18.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine';
import { SpellSystem } from './SpellSystem';
import { AIWizard } from './AIWizard';
import { SpellType } from '../types';

describe('Stage 2 Integration', () => {
  let gameEngine: GameEngine;
  let spellSystem: SpellSystem;
  let aiWizard: AIWizard;

  beforeEach(() => {
    spellSystem = new SpellSystem();
    gameEngine = new GameEngine();
    gameEngine.initialize({
      roundDuration: 90,
      manaRegenRate: 5,
      startingHealth: 100,
      startingMana: 100
    });
    aiWizard = new AIWizard(undefined, spellSystem);
    aiWizard.initialize();
    gameEngine.startRound();
  });

  describe('Task 18.1: Connect GestureRecognizer to GameEngine', () => {
    it('should allow player to cast spell through GameEngine', () => {
      const recognizedSpell = {
        type: SpellType.FIREBALL,
        confidence: 0.9,
        matchScore: 0.1,
        timestamp: Date.now()
      };

      const result = gameEngine.castPlayerSpell(recognizedSpell);

      expect(result.success).toBe(true);
      expect(result.spell).toBe(SpellType.FIREBALL);
      expect(result.manaCost).toBe(spellSystem.getManaCost(SpellType.FIREBALL));
    });

    it('should reject spell cast when insufficient mana', () => {
      // Drain player mana by casting expensive spells
      for (let i = 0; i < 5; i++) {
        gameEngine.castPlayerSpell({
          type: SpellType.LIGHTNING,
          confidence: 0.9,
          matchScore: 0.1,
          timestamp: Date.now()
        });
      }

      // Try to cast another expensive spell
      const result = gameEngine.castPlayerSpell({
        type: SpellType.LIGHTNING,
        confidence: 0.9,
        matchScore: 0.1,
        timestamp: Date.now()
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('mana');
    });
  });

  describe('Task 18.2: Integrate AIWizard with GameEngine', () => {
    it('should allow AI to select and cast spells', () => {
      aiWizard.update(3000); // Wait for cast timer

      const aiSpell = aiWizard.selectSpell(gameEngine.getState());

      if (aiSpell) {
        const result = gameEngine.castAISpell(aiSpell.type);
        expect(result.success).toBe(true);
        expect(result.spell).toBe(aiSpell.type);
      }
    });

    it('should track player casts for adaptive difficulty', () => {
      // Record multiple successful player casts
      for (let i = 0; i < 5; i++) {
        aiWizard.recordPlayerCast(SpellType.FIREBALL, true);
      }

      const successRate = aiWizard.getPlayerSuccessRate();
      expect(successRate).toBeGreaterThan(0);
    });
  });

  describe('Task 18.3: Integrate SpellSystem with GameEngine', () => {
    it('should resolve spell effects through SpellSystem', () => {
      const initialAIHealth = gameEngine.getState().aiWizard.health;

      // Player casts fireball
      gameEngine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 0.9,
        matchScore: 0.1,
        timestamp: Date.now()
      });

      const newAIHealth = gameEngine.getState().aiWizard.health;
      const expectedDamage = spellSystem.getDamage(SpellType.FIREBALL);

      expect(newAIHealth).toBe(initialAIHealth - expectedDamage);
    });

    it('should apply shield protection', () => {
      // Player casts shield
      gameEngine.castPlayerSpell({
        type: SpellType.SHIELD,
        confidence: 0.9,
        matchScore: 0.1,
        timestamp: Date.now()
      });

      expect(gameEngine.getState().playerWizard.activeShield).toBe(true);

      const initialPlayerHealth = gameEngine.getState().playerWizard.health;

      // AI casts fireball (should be blocked)
      gameEngine.castAISpell(SpellType.FIREBALL);

      const newPlayerHealth = gameEngine.getState().playerWizard.health;

      // Health should be unchanged (fireball blocked)
      expect(newPlayerHealth).toBe(initialPlayerHealth);
      // Shield should be consumed
      expect(gameEngine.getState().playerWizard.activeShield).toBe(false);
    });
  });

  describe('Task 18.4: Connect Renderer to game state', () => {
    it('should provide complete game state for rendering', () => {
      const state = gameEngine.getState();

      // Verify all required state properties exist
      expect(state.playerWizard).toBeDefined();
      expect(state.aiWizard).toBeDefined();
      expect(state.playerWizard.health).toBeGreaterThanOrEqual(0);
      expect(state.playerWizard.health).toBeLessThanOrEqual(100);
      expect(state.playerWizard.mana).toBeGreaterThanOrEqual(0);
      expect(state.playerWizard.mana).toBeLessThanOrEqual(100);
      expect(state.roundTimer).toBeGreaterThanOrEqual(0);
      expect(state.playerScore).toBeGreaterThanOrEqual(0);
      expect(state.aiScore).toBeGreaterThanOrEqual(0);
    });

    it('should update game state over time', () => {
      const initialMana = gameEngine.getState().playerWizard.mana;

      // Cast a spell to decrease mana
      gameEngine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 0.9,
        matchScore: 0.1,
        timestamp: Date.now()
      });

      const afterCastMana = gameEngine.getState().playerWizard.mana;
      expect(afterCastMana).toBeLessThan(initialMana);

      // Update game multiple times (should regenerate mana over time)
      for (let i = 0; i < 5; i++) {
        gameEngine.update(1000); // 5 seconds total
      }

      const afterRegenMana = gameEngine.getState().playerWizard.mana;
      expect(afterRegenMana).toBeGreaterThan(afterCastMana);
    });
  });

  describe('Complete Integration Flow', () => {
    it('should handle complete spell casting flow', () => {
      // 1. Player draws and casts spell (simulated by RecognizedSpell)
      const recognizedSpell = {
        type: SpellType.LIGHTNING,
        confidence: 0.9,
        matchScore: 0.1,
        timestamp: Date.now()
      };

      // 2. GameEngine processes player spell
      const playerCastResult = gameEngine.castPlayerSpell(recognizedSpell);
      expect(playerCastResult.success).toBe(true);

      // 3. Record cast for AI adaptive difficulty
      aiWizard.recordPlayerCast(recognizedSpell.type, true);

      // 4. Update AI
      aiWizard.update(3000);

      // 5. AI selects and casts spell
      const aiSpell = aiWizard.selectSpell(gameEngine.getState());
      if (aiSpell) {
        const aiCastResult = gameEngine.castAISpell(aiSpell.type);
        expect(aiCastResult.success).toBe(true);
      }

      // 6. Update game state
      gameEngine.update(1000);

      // 7. Verify state is valid for rendering
      const state = gameEngine.getState();
      expect(state.playerWizard.health).toBeGreaterThanOrEqual(0);
      expect(state.aiWizard.health).toBeGreaterThanOrEqual(0);
      expect(state.roundTimer).toBeGreaterThan(0);
    });
  });
});
