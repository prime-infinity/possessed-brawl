/**
 * Unit tests for Game Engine
 * 
 * Tests wizard state management, health/mana tracking, spell casting,
 * and round management.
 * 
 * **Validates: Requirements 13.1-13.4, 14.1-14.10, 15.1-15.2, 18.1-18.5**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine, MatchState, DEFAULT_GAME_CONFIG } from './GameEngine';
import { SpellType } from '../types';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
    engine.initialize();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const state = engine.getState();
      
      expect(state.playerWizard.health).toBe(DEFAULT_GAME_CONFIG.startingHealth);
      expect(state.playerWizard.mana).toBe(DEFAULT_GAME_CONFIG.startingMana);
      expect(state.aiWizard.health).toBe(DEFAULT_GAME_CONFIG.startingHealth);
      expect(state.aiWizard.mana).toBe(DEFAULT_GAME_CONFIG.startingMana);
      expect(state.matchState).toBe(MatchState.SETUP);
    });

    it('should initialize with custom configuration', () => {
      engine.initialize({
        startingHealth: 80,
        startingMana: 50,
        manaRegenRate: 10
      });

      const state = engine.getState();
      expect(state.playerWizard.health).toBe(80);
      expect(state.playerWizard.mana).toBe(50);
    });

    it('should initialize wizards at correct positions', () => {
      const state = engine.getState();
      
      expect(state.playerWizard.position).toEqual(DEFAULT_GAME_CONFIG.playerPosition);
      expect(state.aiWizard.position).toEqual(DEFAULT_GAME_CONFIG.aiPosition);
    });

    it('should initialize wizards with no active effects', () => {
      const state = engine.getState();
      
      expect(state.playerWizard.activeShield).toBe(false);
      expect(state.playerWizard.frostSlowed).toBe(false);
      expect(state.playerWizard.currentCast).toBe(null);
      expect(state.playerWizard.castAnimation).toBe(0);
    });

    it('should initialize with round timer set to round duration', () => {
      const state = engine.getState();
      expect(state.roundTimer).toBe(DEFAULT_GAME_CONFIG.roundDuration);
    });

    it('should initialize with zero scores and combos', () => {
      const state = engine.getState();
      
      expect(state.playerScore).toBe(0);
      expect(state.aiScore).toBe(0);
      expect(state.playerCombo).toBe(0);
      expect(state.aiCombo).toBe(0);
    });
  });

  describe('Mana Management', () => {
    it('should deduct mana when casting shield', () => {
      engine.startRound();
      const initialMana = engine.getPlayerWizard().mana;
      
      const result = engine.castPlayerSpell({
        type: SpellType.SHIELD,
        confidence: 1.0,
        matchScore: 0.1,
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(result.manaCost).toBe(20);
      expect(engine.getPlayerWizard().mana).toBe(initialMana - 20);
    });

    it('should deduct mana when casting lightning', () => {
      engine.startRound();
      const initialMana = engine.getPlayerWizard().mana;
      
      const result = engine.castPlayerSpell({
        type: SpellType.LIGHTNING,
        confidence: 1.0,
        matchScore: 0.1,
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(result.manaCost).toBe(30);
      expect(engine.getPlayerWizard().mana).toBe(initialMana - 30);
    });

    it('should deduct mana when casting fireball', () => {
      engine.startRound();
      const initialMana = engine.getPlayerWizard().mana;
      
      const result = engine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 1.0,
        matchScore: 0.1,
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(result.manaCost).toBe(15);
      expect(engine.getPlayerWizard().mana).toBe(initialMana - 15);
    });

    it('should deduct mana when casting frost', () => {
      engine.startRound();
      const initialMana = engine.getPlayerWizard().mana;
      
      const result = engine.castPlayerSpell({
        type: SpellType.FROST,
        confidence: 1.0,
        matchScore: 0.1,
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(result.manaCost).toBe(25);
      expect(engine.getPlayerWizard().mana).toBe(initialMana - 25);
    });

    it('should reject cast when mana is insufficient', () => {
      // Initialize with low mana
      engine.initialize({ startingMana: 10 });
      engine.startRound();
      
      const result = engine.castPlayerSpell({
        type: SpellType.LIGHTNING,
        confidence: 1.0,
        matchScore: 0.1,
        timestamp: Date.now()
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('insufficient mana');
      expect(engine.getPlayerWizard().mana).toBe(10); // Mana unchanged
    });

    it('should not go below zero mana', () => {
      engine.initialize({ startingMana: 10 });
      engine.startRound();
      
      engine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 1.0,
        matchScore: 0.1,
        timestamp: Date.now()
      });

      const mana = engine.getPlayerWizard().mana;
      expect(mana).toBeGreaterThanOrEqual(0);
    });

    it('should regenerate mana over time when idle', () => {
      engine.initialize({ startingMana: 50, manaRegenRate: 10 });
      engine.startRound();
      
      const initialMana = engine.getPlayerWizard().mana;
      
      // Update for 1 second (1000ms)
      engine.update(1000);
      
      const finalMana = engine.getPlayerWizard().mana;
      expect(finalMana).toBeGreaterThan(initialMana);
      expect(finalMana).toBeCloseTo(60, 1); // 50 + (10 * 1 second)
    });

    it('should not regenerate mana above maximum', () => {
      engine.initialize({ startingMana: 95, manaRegenRate: 10 });
      engine.startRound();
      
      // Update for 1 second
      engine.update(1000);
      
      const mana = engine.getPlayerWizard().mana;
      expect(mana).toBeLessThanOrEqual(100);
      expect(mana).toBe(100);
    });

    it('should not regenerate mana while casting', () => {
      engine.initialize({ startingMana: 100, manaRegenRate: 10 });
      engine.startRound();
      
      // Cast a spell
      engine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 1.0,
        matchScore: 0.1,
        timestamp: Date.now()
      });
      
      const manaAfterCast = engine.getPlayerWizard().mana;
      
      // Update for 0.5 seconds (spell still animating)
      engine.update(500);
      
      const manaAfterUpdate = engine.getPlayerWizard().mana;
      
      // Mana should not regenerate during cast animation
      expect(manaAfterUpdate).toBe(manaAfterCast);
    });
  });

  describe('Health Management', () => {
    it('should decrease health when taking damage', () => {
      engine.startRound();
      const initialHealth = engine.getPlayerWizard().health;
      
      engine.applyDamage('player', 20);
      
      expect(engine.getPlayerWizard().health).toBe(initialHealth - 20);
    });

    it('should not go below zero health', () => {
      engine.startRound();
      
      engine.applyDamage('player', 150);
      
      expect(engine.getPlayerWizard().health).toBe(0);
    });

    it('should end round when health reaches zero', () => {
      engine.startRound();
      
      engine.applyDamage('player', 100);
      
      expect(engine.getMatchState()).toBe(MatchState.ROUND_END);
    });
  });

  describe('Spell Casting', () => {
    it('should set currentCast when spell is cast', () => {
      engine.startRound();
      
      engine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 1.0,
        matchScore: 0.1,
        timestamp: Date.now()
      });
      
      expect(engine.getPlayerWizard().currentCast).toBe(SpellType.FIREBALL);
      expect(engine.getPlayerWizard().castAnimation).toBe(0);
    });

    it('should clear currentCast after animation completes', () => {
      engine.startRound();
      
      engine.castPlayerSpell({
        type: SpellType.FIREBALL,
        confidence: 1.0,
        matchScore: 0.1,
        timestamp: Date.now()
      });
      
      // Update for 1 second to complete animation
      engine.update(1000);
      
      expect(engine.getPlayerWizard().currentCast).toBe(null);
      expect(engine.getPlayerWizard().castAnimation).toBe(0);
    });

    it('should allow AI wizard to cast spells', () => {
      engine.startRound();
      const initialMana = engine.getAIWizard().mana;
      
      const result = engine.castAISpell(SpellType.LIGHTNING);
      
      expect(result.success).toBe(true);
      expect(engine.getAIWizard().mana).toBe(initialMana - 30);
      expect(engine.getAIWizard().currentCast).toBe(SpellType.LIGHTNING);
    });

    it('should reject AI cast when mana is insufficient', () => {
      engine.initialize({ startingMana: 10 });
      engine.startRound();
      
      const result = engine.castAISpell(SpellType.LIGHTNING);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('insufficient mana');
    });
  });

  describe('Round Management', () => {
    it('should start round in fighting state', () => {
      engine.startRound();
      
      expect(engine.getMatchState()).toBe(MatchState.FIGHTING);
    });

    it('should countdown round timer', () => {
      engine.initialize({ roundDuration: 90 });
      engine.startRound();
      
      const initialTimer = engine.getState().roundTimer;
      
      // Update for 1 second
      engine.update(1000);
      
      const updatedTimer = engine.getState().roundTimer;
      expect(updatedTimer).toBeLessThan(initialTimer);
      expect(updatedTimer).toBeCloseTo(89, 1);
    });

    it('should end round when timer reaches zero', () => {
      engine.initialize({ roundDuration: 2 });
      engine.startRound();
      
      // Update for 2 seconds
      engine.update(2000);
      
      expect(engine.getMatchState()).toBe(MatchState.ROUND_END);
      expect(engine.getState().roundTimer).toBe(0);
    });

    it('should determine winner based on health when timer expires', () => {
      engine.initialize({ roundDuration: 1 });
      engine.startRound();
      
      // Damage AI wizard
      engine.applyDamage('ai', 30);
      
      // Wait for timer to expire
      engine.update(1000);
      
      const result = engine.checkRoundEnd();
      expect(result).not.toBe(null);
      expect(result?.winner).toBe('player');
    });

    it('should determine AI winner when player health is lower', () => {
      engine.initialize({ roundDuration: 1 });
      engine.startRound();
      
      // Damage player wizard
      engine.applyDamage('player', 30);
      
      // Wait for timer to expire
      engine.update(1000);
      
      const result = engine.checkRoundEnd();
      expect(result).not.toBe(null);
      expect(result?.winner).toBe('ai');
    });

    it('should declare draw when health is equal', () => {
      engine.initialize({ roundDuration: 1 });
      engine.startRound();
      
      // Wait for timer to expire with equal health
      engine.update(1000);
      
      const result = engine.checkRoundEnd();
      expect(result).not.toBe(null);
      expect(result?.winner).toBe('draw');
    });

    it('should not update game when not in fighting state', () => {
      const initialTimer = engine.getState().roundTimer;
      
      // Update while in SETUP state
      engine.update(1000);
      
      expect(engine.getState().roundTimer).toBe(initialTimer);
    });
  });

  describe('State Access', () => {
    it('should return read-only state copy', () => {
      const state1 = engine.getState();
      const state2 = engine.getState();
      
      // Should be different object instances
      expect(state1).not.toBe(state2);
      
      // But with same values
      expect(state1.playerWizard.health).toBe(state2.playerWizard.health);
    });

    it('should allow setting match state', () => {
      engine.setMatchState(MatchState.COUNTDOWN);
      expect(engine.getMatchState()).toBe(MatchState.COUNTDOWN);
    });
  });

  describe('Mana Bounds Property', () => {
    it('should maintain mana in [0, 100] bounds after multiple operations', () => {
      engine.initialize({ startingMana: 100, manaRegenRate: 5 });
      engine.startRound();
      
      // Cast multiple spells and regenerate
      for (let i = 0; i < 10; i++) {
        const spell = i % 2 === 0 ? SpellType.FIREBALL : SpellType.LIGHTNING;
        engine.castPlayerSpell({
          type: spell,
          confidence: 1.0,
          matchScore: 0.1,
          timestamp: Date.now()
        });
        
        // Wait for animation to complete
        engine.update(1100);
        
        const mana = engine.getPlayerWizard().mana;
        expect(mana).toBeGreaterThanOrEqual(0);
        expect(mana).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Health Bounds Property', () => {
    it('should maintain health in [0, 100] bounds', () => {
      engine.startRound();
      
      // Apply various amounts of damage
      engine.applyDamage('player', 20);
      expect(engine.getPlayerWizard().health).toBeGreaterThanOrEqual(0);
      expect(engine.getPlayerWizard().health).toBeLessThanOrEqual(100);
      
      engine.applyDamage('player', 50);
      expect(engine.getPlayerWizard().health).toBeGreaterThanOrEqual(0);
      expect(engine.getPlayerWizard().health).toBeLessThanOrEqual(100);
      
      engine.applyDamage('player', 100);
      expect(engine.getPlayerWizard().health).toBe(0);
    });
  });
});
