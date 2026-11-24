/**
 * Integration tests for Spell System with Game Engine
 * 
 * Tests spell resolution in the context of actual gameplay,
 * including spell counters, damage application, and state updates.
 * 
 * **Validates: Requirements 15.1-15.5, 16.1-16.6**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine, MatchState } from './GameEngine';
import { SpellType, RecognizedSpell } from '../types';

describe('SpellSystem Integration with GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
    engine.initialize();
    engine.setMatchState(MatchState.FIGHTING);
  });

  describe('Shield Mechanics', () => {
    it('should activate shield when player casts Shield', () => {
      const spell: RecognizedSpell = {
        type: SpellType.SHIELD,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      };

      const result = engine.castPlayerSpell(spell);
      
      expect(result.success).toBe(true);
      expect(result.resolution?.shieldActivated).toBe(true);
      
      const playerState = engine.getPlayerWizard();
      expect(playerState.activeShield).toBe(true);
    });

    it('should block Fireball with active shield', () => {
      // Player casts Shield first
      engine.castPlayerSpell({
        type: SpellType.SHIELD,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      const playerHealthBefore = engine.getPlayerWizard().health;

      // AI casts Fireball
      const result = engine.castAISpell(SpellType.FIREBALL);

      expect(result.success).toBe(true);
      expect(result.resolution?.blocked).toBe(true);
      expect(result.resolution?.damage).toBe(0);

      const playerHealthAfter = engine.getPlayerWizard().health;
      expect(playerHealthAfter).toBe(playerHealthBefore); // No damage taken
    });

    it('should break shield with Lightning and deal damage', () => {
      // Player casts Shield first
      engine.castPlayerSpell({
        type: SpellType.SHIELD,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      const playerHealthBefore = engine.getPlayerWizard().health;

      // AI casts Lightning
      const result = engine.castAISpell(SpellType.LIGHTNING);

      expect(result.success).toBe(true);
      expect(result.resolution?.shieldBroken).toBe(true);
      expect(result.resolution?.damage).toBe(25);

      const playerHealthAfter = engine.getPlayerWizard().health;
      expect(playerHealthAfter).toBe(playerHealthBefore - 25);
      
      const playerState = engine.getPlayerWizard();
      expect(playerState.activeShield).toBe(false); // Shield broken
    });
  });

  describe('Damage Application', () => {
    it('should deal Fireball damage when no shield', () => {
      const aiHealthBefore = engine.getAIWizard().health;

      const result = engine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(result.resolution?.damage).toBe(20);

      const aiHealthAfter = engine.getAIWizard().health;
      expect(aiHealthAfter).toBe(aiHealthBefore - 20);
    });

    it('should deal Lightning damage when no shield', () => {
      const aiHealthBefore = engine.getAIWizard().health;

      const result = engine.castPlayerSpell({
        type: SpellType.LIGHTNING,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(result.resolution?.damage).toBe(25);

      const aiHealthAfter = engine.getAIWizard().health;
      expect(aiHealthAfter).toBe(aiHealthBefore - 25);
    });

    it('should deal Frost damage and apply slow', () => {
      const aiHealthBefore = engine.getAIWizard().health;

      const result = engine.castPlayerSpell({
        type: SpellType.FROST,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(result.resolution?.damage).toBe(15);
      expect(result.resolution?.frostApplied).toBe(true);

      const aiHealthAfter = engine.getAIWizard().health;
      expect(aiHealthAfter).toBe(aiHealthBefore - 15);
      
      const aiState = engine.getAIWizard();
      expect(aiState.frostSlowed).toBe(true);
    });
  });

  describe('Mana Costs', () => {
    it('should deduct correct mana for Shield (20)', () => {
      const manaBefore = engine.getPlayerWizard().mana;

      engine.castPlayerSpell({
        type: SpellType.SHIELD,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      const manaAfter = engine.getPlayerWizard().mana;
      expect(manaAfter).toBe(manaBefore - 20);
    });

    it('should deduct correct mana for Lightning (30)', () => {
      const manaBefore = engine.getPlayerWizard().mana;

      engine.castPlayerSpell({
        type: SpellType.LIGHTNING,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      const manaAfter = engine.getPlayerWizard().mana;
      expect(manaAfter).toBe(manaBefore - 30);
    });

    it('should deduct correct mana for Fireball (15)', () => {
      const manaBefore = engine.getPlayerWizard().mana;

      engine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      const manaAfter = engine.getPlayerWizard().mana;
      expect(manaAfter).toBe(manaBefore - 15);
    });

    it('should deduct correct mana for Frost (25)', () => {
      const manaBefore = engine.getPlayerWizard().mana;

      engine.castPlayerSpell({
        type: SpellType.FROST,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      const manaAfter = engine.getPlayerWizard().mana;
      expect(manaAfter).toBe(manaBefore - 25);
    });
  });

  describe('Combo Tracking', () => {
    it('should increment player combo on successful damage', () => {
      engine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      const state = engine.getState();
      expect(state.playerCombo).toBe(1);
      expect(state.aiCombo).toBe(0);
    });

    it('should break player combo when attack is blocked', () => {
      // Player hits once
      engine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      expect(engine.getState().playerCombo).toBe(1);

      // AI casts Shield
      engine.castAISpell(SpellType.SHIELD);

      // Player's Fireball is blocked
      engine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      const state = engine.getState();
      expect(state.playerCombo).toBe(0);
      expect(state.aiCombo).toBe(1); // AI blocked successfully
    });
  });

  describe('Round End on Knockout', () => {
    it('should end round when health reaches zero from spell damage', () => {
      // Drain AI health to near zero
      const aiState = engine.getAIWizard();
      engine.applyDamage('ai', 95); // Leave 5 health

      // Cast Lightning (25 damage) to knock out
      engine.castPlayerSpell({
        type: SpellType.LIGHTNING,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      expect(engine.getMatchState()).toBe(MatchState.ROUND_END);
      expect(engine.getAIWizard().health).toBe(0);
    });
  });

  describe('Spell System Configuration Access', () => {
    it('should provide access to spell system through game engine', () => {
      const spellSystem = engine.getSpellSystem();
      
      expect(spellSystem).toBeDefined();
      expect(spellSystem.getManaCost(SpellType.SHIELD)).toBe(20);
      expect(spellSystem.getDamage(SpellType.LIGHTNING)).toBe(25);
    });

    it('should allow tuning spell costs through spell system', () => {
      const spellSystem = engine.getSpellSystem();
      spellSystem.setCosts({ [SpellType.SHIELD]: 30 });

      const manaBefore = engine.getPlayerWizard().mana;
      
      engine.castPlayerSpell({
        type: SpellType.SHIELD,
        confidence: 1.0,
        matchScore: 0.0,
        timestamp: Date.now()
      });

      const manaAfter = engine.getPlayerWizard().mana;
      expect(manaAfter).toBe(manaBefore - 30); // New cost applied
    });
  });
});
