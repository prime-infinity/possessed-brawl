/**
 * Property-Based Tests for Game Engine
 * 
 * Uses fast-check to verify universal properties hold across many scenarios.
 * 
 * **Validates: Requirements 24.1, 24.3**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { GameEngine, MatchState } from './GameEngine';
import { SpellType } from '../types';

describe('GameEngine - Property Based Tests', () => {
  describe('Property 2: Mana Bounds Maintenance', () => {
    /**
     * **Validates: Requirements 24.1, 24.3**
     * 
     * Property: Mana remains in [0, 100] bounds after any sequence of casts and regen events
     * 
     * This test generates arbitrary sequences of:
     * - Spell casts (various types)
     * - Time updates (mana regeneration)
     * 
     * And verifies that mana never goes below 0 or above 100
     */
    it('should maintain mana in [0, 100] after arbitrary cast and regen sequences', () => {
      // Generator for spell types
      const spellGen = fc.constantFrom(
        SpellType.SHIELD,
        SpellType.LIGHTNING,
        SpellType.FIREBALL,
        SpellType.FROST
      );

      // Generator for time deltas (0 to 5000ms)
      const timeDeltaGen = fc.integer({ min: 0, max: 5000 });

      // Generator for action sequences
      type Action = { type: 'cast'; spell: SpellType } | { type: 'update'; deltaTime: number };
      
      const actionGen = fc.oneof(
        fc.record({ type: fc.constant('cast' as const), spell: spellGen }),
        fc.record({ type: fc.constant('update' as const), deltaTime: timeDeltaGen })
      );

      const actionsGen = fc.array(actionGen, { minLength: 1, maxLength: 50 });

      fc.assert(
        fc.property(actionsGen, (actions) => {
          const engine = new GameEngine();
          engine.initialize();
          engine.startRound();

          for (const action of actions) {
            if (action.type === 'cast') {
              // Try to cast spell (may fail due to insufficient mana)
              engine.castPlayerSpell({
                type: action.spell,
                confidence: 1.0,
                matchScore: 0.1,
                timestamp: Date.now()
              });
            } else if (action.type === 'update') {
              // Update time (mana regeneration)
              engine.update(action.deltaTime);
            }

            // Check mana bounds after each action
            const playerMana = engine.getPlayerWizard().mana;
            const aiMana = engine.getAIWizard().mana;

            expect(playerMana).toBeGreaterThanOrEqual(0);
            expect(playerMana).toBeLessThanOrEqual(100);
            expect(aiMana).toBeGreaterThanOrEqual(0);
            expect(aiMana).toBeLessThanOrEqual(100);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain mana bounds with varying starting values', () => {
      // Generator for starting mana (0 to 100)
      const startingManaGen = fc.integer({ min: 0, max: 100 });

      // Generator for mana regen rate (1 to 20)
      const manaRegenGen = fc.integer({ min: 1, max: 20 });

      // Generator for spell casts
      const spellGen = fc.constantFrom(
        SpellType.SHIELD,
        SpellType.LIGHTNING,
        SpellType.FIREBALL,
        SpellType.FROST
      );

      fc.assert(
        fc.property(
          startingManaGen,
          manaRegenGen,
          fc.array(spellGen, { minLength: 1, maxLength: 20 }),
          (startingMana, manaRegen, spells) => {
            const engine = new GameEngine();
            engine.initialize({ startingMana, manaRegenRate: manaRegen });
            engine.startRound();

            for (const spell of spells) {
              // Cast spell
              engine.castPlayerSpell({
                type: spell,
                confidence: 1.0,
                matchScore: 0.1,
                timestamp: Date.now()
              });

              // Check bounds
              const mana = engine.getPlayerWizard().mana;
              expect(mana).toBeGreaterThanOrEqual(0);
              expect(mana).toBeLessThanOrEqual(100);

              // Update for random time to regenerate
              engine.update(Math.random() * 2000);

              // Check bounds again
              const manaAfterRegen = engine.getPlayerWizard().mana;
              expect(manaAfterRegen).toBeGreaterThanOrEqual(0);
              expect(manaAfterRegen).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain mana bounds during continuous regeneration', () => {
      // Test that mana caps at 100 and doesn't overflow
      const timeDeltaGen = fc.array(fc.integer({ min: 100, max: 1000 }), {
        minLength: 5,
        maxLength: 20
      });

      fc.assert(
        fc.property(timeDeltaGen, (timeDeltas) => {
          const engine = new GameEngine();
          engine.initialize({ startingMana: 90, manaRegenRate: 10 });
          engine.startRound();

          for (const delta of timeDeltas) {
            engine.update(delta);

            const mana = engine.getPlayerWizard().mana;
            expect(mana).toBeLessThanOrEqual(100);
            expect(mana).toBeGreaterThanOrEqual(0);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should maintain mana bounds during rapid casting', () => {
      // Test rapid fire spell casting
      const spellSequenceGen = fc.array(
        fc.constantFrom(
          SpellType.SHIELD,
          SpellType.LIGHTNING,
          SpellType.FIREBALL,
          SpellType.FROST
        ),
        { minLength: 10, maxLength: 30 }
      );

      fc.assert(
        fc.property(spellSequenceGen, (spells) => {
          const engine = new GameEngine();
          engine.initialize({ startingMana: 100 });
          engine.startRound();

          for (const spell of spells) {
            engine.castPlayerSpell({
              type: spell,
              confidence: 1.0,
              matchScore: 0.1,
              timestamp: Date.now()
            });

            const mana = engine.getPlayerWizard().mana;
            expect(mana).toBeGreaterThanOrEqual(0);
            expect(mana).toBeLessThanOrEqual(100);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Mana Regeneration Property', () => {
    /**
     * Property: Mana regenerates over time when not casting
     * **Validates: Requirement 24.3**
     */
    it('should increase mana over time when idle', () => {
      const startingManaGen = fc.integer({ min: 0, max: 90 });
      const timeDeltaGen = fc.integer({ min: 1000, max: 5000 });

      fc.assert(
        fc.property(startingManaGen, timeDeltaGen, (startingMana, timeDelta) => {
          const engine = new GameEngine();
          engine.initialize({ startingMana, manaRegenRate: 5 });
          engine.startRound();

          const initialMana = engine.getPlayerWizard().mana;

          // Update without casting
          engine.update(timeDelta);

          const finalMana = engine.getPlayerWizard().mana;

          // Mana should increase (but cap at 100)
          if (initialMana < 100) {
            expect(finalMana).toBeGreaterThan(initialMana);
          }
          expect(finalMana).toBeLessThanOrEqual(100);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Insufficient Mana Rejection Property', () => {
    /**
     * Property: Casts are rejected when mana is insufficient
     * **Validates: Requirement 24.4**
     */
    it('should reject casts when mana is below spell cost', () => {
      const spellGen = fc.constantFrom(
        SpellType.SHIELD,
        SpellType.LIGHTNING,
        SpellType.FIREBALL,
        SpellType.FROST
      );

      // Map spells to their costs
      const spellCosts: Record<SpellType, number> = {
        [SpellType.SHIELD]: 20,
        [SpellType.LIGHTNING]: 30,
        [SpellType.FIREBALL]: 15,
        [SpellType.FROST]: 25
      };

      fc.assert(
        fc.property(spellGen, (spell) => {
          const cost = spellCosts[spell];
          
          // Start with mana below spell cost
          const insufficientMana = fc.sample(fc.integer({ min: 0, max: cost - 1 }), 1)[0];
          
          const engine = new GameEngine();
          engine.initialize({ startingMana: insufficientMana });
          engine.startRound();

          const result = engine.castPlayerSpell({
            type: spell,
            confidence: 1.0,
            matchScore: 0.1,
            timestamp: Date.now()
          });

          expect(result.success).toBe(false);
          expect(result.reason).toBe('insufficient mana');
          
          // Mana should not change
          expect(engine.getPlayerWizard().mana).toBe(insufficientMana);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Health Bounds Property', () => {
    /**
     * Property: Health remains in [0, 100] bounds after any damage sequence
     */
    it('should maintain health in [0, 100] after arbitrary damage', () => {
      const damageGen = fc.array(fc.integer({ min: 0, max: 50 }), {
        minLength: 1,
        maxLength: 10
      });

      fc.assert(
        fc.property(damageGen, (damages) => {
          const engine = new GameEngine();
          engine.initialize();
          engine.startRound();

          for (const damage of damages) {
            engine.applyDamage('player', damage);

            const health = engine.getPlayerWizard().health;
            expect(health).toBeGreaterThanOrEqual(0);
            expect(health).toBeLessThanOrEqual(100);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
