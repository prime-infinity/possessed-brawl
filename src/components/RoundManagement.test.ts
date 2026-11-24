/**
 * Unit tests for round management and scoring system
 * 
 * **Validates: Requirements 18.1-18.7, 19.1-19.5**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine, MatchState } from './GameEngine';
import { SpellType } from '../types';

describe('Round Management', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine();
    gameEngine.initialize({
      roundDuration: 90,
      startingHealth: 100,
      startingMana: 100,
      manaRegenRate: 5
    });
  });

  describe('Round Timer', () => {
    it('should initialize round timer with configured duration', () => {
      gameEngine.startRound();
      expect(gameEngine.getRoundTimer()).toBe(90);
    });

    it('should countdown timer each frame', () => {
      gameEngine.startRound();
      const initialTimer = gameEngine.getRoundTimer();
      
      // Simulate 1 second (1000ms)
      gameEngine.update(1000);
      
      expect(gameEngine.getRoundTimer()).toBe(initialTimer - 1);
    });

    it('should trigger round end when timer reaches zero', () => {
      gameEngine.startRound();
      
      // Simulate 90 seconds
      gameEngine.update(90000);
      
      expect(gameEngine.getRoundTimer()).toBe(0);
      expect(gameEngine.getMatchState()).toBe(MatchState.ROUND_END);
    });

    it('should format timer as MM:SS', () => {
      gameEngine.startRound();
      expect(gameEngine.getFormattedTimer()).toBe('1:30'); // 90 seconds = 1:30
      
      gameEngine.update(30000); // 30 seconds
      expect(gameEngine.getFormattedTimer()).toBe('1:00'); // 60 seconds = 1:00
      
      gameEngine.update(55000); // 55 more seconds
      expect(gameEngine.getFormattedTimer()).toBe('0:05'); // 5 seconds = 0:05
    });

    it('should not countdown when not in fighting state', () => {
      // Don't start round, stay in SETUP state
      const initialTimer = gameEngine.getRoundTimer();
      
      gameEngine.update(1000);
      
      expect(gameEngine.getRoundTimer()).toBe(initialTimer);
    });
  });

  describe('Round End Conditions', () => {
    beforeEach(() => {
      gameEngine.startRound();
    });

    it('should end round when timer expires', () => {
      gameEngine.update(90000);
      
      expect(gameEngine.getMatchState()).toBe(MatchState.ROUND_END);
      const result = gameEngine.checkRoundEnd();
      expect(result).not.toBeNull();
    });

    it('should end round when player health reaches zero', () => {
      gameEngine.applyDamage('player', 100);
      
      expect(gameEngine.getMatchState()).toBe(MatchState.ROUND_END);
      expect(gameEngine.getPlayerWizard().health).toBe(0);
    });

    it('should end round when AI health reaches zero', () => {
      gameEngine.applyDamage('ai', 100);
      
      expect(gameEngine.getMatchState()).toBe(MatchState.ROUND_END);
      expect(gameEngine.getAIWizard().health).toBe(0);
    });

    it('should determine winner based on higher health when timer expires', () => {
      // Damage AI more than player
      gameEngine.applyDamage('ai', 50);
      gameEngine.applyDamage('player', 20);
      
      // Expire timer
      gameEngine.update(90000);
      
      const result = gameEngine.checkRoundEnd();
      expect(result?.winner).toBe('player'); // Player has 80 health, AI has 50
    });

    it('should determine AI as winner when player health is lower', () => {
      // Damage player more than AI
      gameEngine.applyDamage('player', 70);
      gameEngine.applyDamage('ai', 30);
      
      // Expire timer
      gameEngine.update(90000);
      
      const result = gameEngine.checkRoundEnd();
      expect(result?.winner).toBe('ai'); // Player has 30 health, AI has 70
    });

    it('should determine draw when both wizards have equal health', () => {
      // Apply equal damage
      gameEngine.applyDamage('player', 50);
      gameEngine.applyDamage('ai', 50);
      
      // Expire timer
      gameEngine.update(90000);
      
      const result = gameEngine.checkRoundEnd();
      expect(result?.winner).toBe('draw');
    });

    it('should determine winner as other wizard on knockout', () => {
      // Knockout player
      gameEngine.applyDamage('player', 100);
      
      const result = gameEngine.checkRoundEnd();
      expect(result?.winner).toBe('ai');
    });
  });
});

describe('Scoring System', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine();
    gameEngine.initialize({
      hitPoints: 10,
      comboMultiplier: 0.2,
      roundWinBonus: 100,
      startingMana: 100
    });
    gameEngine.startRound();
  });

  describe('Point Awarding', () => {
    it('should award points for successful spell hit', () => {
      const initialScore = gameEngine.getPlayerScore();
      
      // Cast a damaging spell (requires enough mana)
      gameEngine.castPlayerSpell({ type: SpellType.FIREBALL, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      
      expect(gameEngine.getPlayerScore()).toBeGreaterThan(initialScore);
    });

    it('should award configured hit points per spell', () => {
      const initialScore = gameEngine.getPlayerScore();
      
      gameEngine.castPlayerSpell({ type: SpellType.FIREBALL, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      
      expect(gameEngine.getPlayerScore()).toBe(initialScore + 10); // hitPoints = 10
    });

    it('should not award points for blocked spells', () => {
      const initialScore = gameEngine.getPlayerScore();
      
      // AI activates shield
      gameEngine.castAISpell(SpellType.SHIELD);
      
      // Player casts fireball (should be blocked)
      gameEngine.castPlayerSpell({ type: SpellType.FIREBALL, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      
      // Player should not get points for blocked spell
      expect(gameEngine.getPlayerScore()).toBe(initialScore);
    });

    it('should not award points for failed casts (insufficient mana)', () => {
      // Drain player mana
      for (let i = 0; i < 10; i++) {
        gameEngine.castPlayerSpell({ type: SpellType.LIGHTNING, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      }
      
      const scoreBeforeFail = gameEngine.getPlayerScore();
      
      // Try to cast with insufficient mana
      const result = gameEngine.castPlayerSpell({ type: SpellType.LIGHTNING, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      
      expect(result.success).toBe(false);
      expect(gameEngine.getPlayerScore()).toBe(scoreBeforeFail);
    });
  });

  describe('Combo System', () => {
    it('should track combo count on consecutive hits', () => {
      expect(gameEngine.getPlayerCombo()).toBe(0);
      
      gameEngine.castPlayerSpell({ type: SpellType.FIREBALL, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      expect(gameEngine.getPlayerCombo()).toBe(1);
      
      gameEngine.castPlayerSpell({ type: SpellType.LIGHTNING, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      expect(gameEngine.getPlayerCombo()).toBe(2);
      
      gameEngine.castPlayerSpell({ type: SpellType.FROST, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      expect(gameEngine.getPlayerCombo()).toBe(3);
    });

    it('should apply combo multiplier to points', () => {
      // First hit: 10 points (1x multiplier)
      gameEngine.castPlayerSpell({ type: SpellType.FIREBALL, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      const scoreAfterFirst = gameEngine.getPlayerScore();
      expect(scoreAfterFirst).toBe(10);
      
      // Second hit: 12 points (1.2x multiplier = 1 + 1 * 0.2)
      gameEngine.castPlayerSpell({ type: SpellType.LIGHTNING, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      const scoreAfterSecond = gameEngine.getPlayerScore();
      expect(scoreAfterSecond).toBe(10 + 12);
      
      // Third hit: 14 points (1.4x multiplier = 1 + 2 * 0.2)
      gameEngine.castPlayerSpell({ type: SpellType.FROST, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      const scoreAfterThird = gameEngine.getPlayerScore();
      expect(scoreAfterThird).toBe(10 + 12 + 14);
    });

    it('should reset combo on blocked spell', () => {
      // Build up combo
      gameEngine.castPlayerSpell({ type: SpellType.FIREBALL, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      gameEngine.castPlayerSpell({ type: SpellType.LIGHTNING, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      expect(gameEngine.getPlayerCombo()).toBe(2);
      
      // AI casts shield
      gameEngine.castAISpell(SpellType.SHIELD);
      
      // Player's fireball is blocked
      gameEngine.castPlayerSpell({ type: SpellType.FIREBALL, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      
      expect(gameEngine.getPlayerCombo()).toBe(0);
    });

    it('should track separate combos for player and AI', () => {
      // Player combo
      gameEngine.castPlayerSpell({ type: SpellType.FIREBALL, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      expect(gameEngine.getPlayerCombo()).toBe(1);
      expect(gameEngine.getAICombo()).toBe(0);
      
      // AI combo
      gameEngine.castAISpell(SpellType.LIGHTNING);
      expect(gameEngine.getPlayerCombo()).toBe(0); // Reset when AI hits
      expect(gameEngine.getAICombo()).toBe(1);
      
      // Player starts new combo
      gameEngine.castPlayerSpell({ type: SpellType.FROST, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      expect(gameEngine.getPlayerCombo()).toBe(1);
      expect(gameEngine.getAICombo()).toBe(0); // Reset when player hits
    });
  });

  describe('Round Win Bonus', () => {
    it('should award bonus points to round winner', () => {
      const initialPlayerScore = gameEngine.getPlayerScore();
      
      // Player wins by knockout
      gameEngine.applyDamage('ai', 100);
      
      // Check that bonus was awarded
      expect(gameEngine.getPlayerScore()).toBe(initialPlayerScore + 100); // roundWinBonus = 100
    });

    it('should award bonus to AI winner', () => {
      const initialAIScore = gameEngine.getAIScore();
      
      // AI wins by knockout
      gameEngine.applyDamage('player', 100);
      
      // Check that bonus was awarded
      expect(gameEngine.getAIScore()).toBe(initialAIScore + 100);
    });

    it('should award bonus to winner on timer expiry', () => {
      // Damage AI more so player wins
      gameEngine.applyDamage('ai', 50);
      
      const initialPlayerScore = gameEngine.getPlayerScore();
      
      // Expire timer
      gameEngine.update(90000);
      
      // Check that bonus was awarded to player
      expect(gameEngine.getPlayerScore()).toBe(initialPlayerScore + 100);
    });

    it('should not award bonus on draw', () => {
      // Equal health
      const initialPlayerScore = gameEngine.getPlayerScore();
      const initialAIScore = gameEngine.getAIScore();
      
      // Expire timer
      gameEngine.update(90000);
      
      const result = gameEngine.checkRoundEnd();
      expect(result?.winner).toBe('draw');
      
      // No bonus awarded
      expect(gameEngine.getPlayerScore()).toBe(initialPlayerScore);
      expect(gameEngine.getAIScore()).toBe(initialAIScore);
    });
  });

  describe('Score Persistence Across Rounds', () => {
    it('should maintain cumulative scores across rounds', () => {
      // First round - player scores
      gameEngine.castPlayerSpell({ type: SpellType.FIREBALL, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      gameEngine.castPlayerSpell({ type: SpellType.LIGHTNING, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      const scoreBeforeRoundEnd = gameEngine.getPlayerScore();
      
      // End round (player wins)
      gameEngine.applyDamage('ai', 100);
      
      // Score includes round win bonus
      const scoreAfterRound1 = gameEngine.getPlayerScore();
      expect(scoreAfterRound1).toBe(scoreBeforeRoundEnd + 100); // +100 for round win
      
      // Start new round
      gameEngine.startRound();
      
      // Score should persist from previous round
      expect(gameEngine.getPlayerScore()).toBe(scoreAfterRound1);
      
      // Second round - player scores more
      gameEngine.castPlayerSpell({ type: SpellType.LIGHTNING, confidence: 1.0, matchScore: 0, timestamp: Date.now() });
      
      // Score should accumulate
      expect(gameEngine.getPlayerScore()).toBeGreaterThan(scoreAfterRound1);
    });
  });
});
