/**
 * Unit tests for Spell System
 * 
 * Tests spell costs, damage values, counter table lookups,
 * and spell resolution logic.
 * 
 * **Validates: Requirements 15.1, 15.3-15.5, 16.1-16.6**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SpellSystem, 
  DEFAULT_SPELL_CONFIG, 
  DEFAULT_COUNTER_TABLE,
  DEFAULT_SPELL_SYSTEM_CONFIG
} from './SpellSystem';
import { SpellType } from '../types';
import { WizardState } from './GameEngine';

describe('SpellSystem', () => {
  let spellSystem: SpellSystem;

  beforeEach(() => {
    spellSystem = new SpellSystem();
  });

  describe('Spell Costs', () => {
    it('should return correct mana cost for Shield', () => {
      expect(spellSystem.getManaCost(SpellType.SHIELD)).toBe(20);
    });

    it('should return correct mana cost for Lightning', () => {
      expect(spellSystem.getManaCost(SpellType.LIGHTNING)).toBe(30);
    });

    it('should return correct mana cost for Fireball', () => {
      expect(spellSystem.getManaCost(SpellType.FIREBALL)).toBe(15);
    });

    it('should return correct mana cost for Frost', () => {
      expect(spellSystem.getManaCost(SpellType.FROST)).toBe(25);
    });

    it('should return all spell costs', () => {
      const costs = spellSystem.getAllCosts();
      expect(costs).toEqual(DEFAULT_SPELL_CONFIG.costs);
    });

    it('should allow updating spell costs', () => {
      spellSystem.setCosts({ [SpellType.SHIELD]: 30 });
      expect(spellSystem.getManaCost(SpellType.SHIELD)).toBe(30);
      expect(spellSystem.getManaCost(SpellType.LIGHTNING)).toBe(30); // unchanged
    });
  });

  describe('Spell Damage', () => {
    it('should return correct damage for Shield (zero)', () => {
      expect(spellSystem.getDamage(SpellType.SHIELD)).toBe(0);
    });

    it('should return correct damage for Lightning', () => {
      expect(spellSystem.getDamage(SpellType.LIGHTNING)).toBe(25);
    });

    it('should return correct damage for Fireball', () => {
      expect(spellSystem.getDamage(SpellType.FIREBALL)).toBe(20);
    });

    it('should return correct damage for Frost', () => {
      expect(spellSystem.getDamage(SpellType.FROST)).toBe(15);
    });

    it('should return all spell damage values', () => {
      const damage = spellSystem.getAllDamage();
      expect(damage).toEqual(DEFAULT_SPELL_CONFIG.damage);
    });

    it('should allow updating spell damage', () => {
      spellSystem.setDamage({ [SpellType.LIGHTNING]: 35 });
      expect(spellSystem.getDamage(SpellType.LIGHTNING)).toBe(35);
      expect(spellSystem.getDamage(SpellType.FIREBALL)).toBe(20); // unchanged
    });
  });

  describe('Counter Table', () => {
    it('should find counter entry for Fireball vs Shield', () => {
      const counter = spellSystem.checkCounter(SpellType.FIREBALL, SpellType.SHIELD);
      expect(counter).not.toBeNull();
      expect(counter?.counters).toBe(false);
      expect(counter?.effect).toBe('blocked');
    });

    it('should find counter entry for Lightning vs Shield', () => {
      const counter = spellSystem.checkCounter(SpellType.LIGHTNING, SpellType.SHIELD);
      expect(counter).not.toBeNull();
      expect(counter?.counters).toBe(true);
      expect(counter?.effect).toBe('shield_broken');
    });

    it('should find counter entry for Fireball vs Frost', () => {
      const counter = spellSystem.checkCounter(SpellType.FIREBALL, SpellType.FROST);
      expect(counter).not.toBeNull();
      expect(counter?.counters).toBe(true);
      expect(counter?.effect).toBe('melts_frost');
    });

    it('should find counter entry for Frost vs Lightning', () => {
      const counter = spellSystem.checkCounter(SpellType.FROST, SpellType.LIGHTNING);
      expect(counter).not.toBeNull();
      expect(counter?.counters).toBe(false);
      expect(counter?.effect).toBe('slow');
    });

    it('should return null for non-existent counter', () => {
      const counter = spellSystem.checkCounter(SpellType.SHIELD, SpellType.FIREBALL);
      expect(counter).toBeNull();
    });

    it('should return complete counter table', () => {
      const table = spellSystem.getCounterTable();
      expect(table).toHaveLength(DEFAULT_COUNTER_TABLE.length);
      expect(table).toEqual(DEFAULT_COUNTER_TABLE);
    });

    it('should allow updating counter table', () => {
      const newTable = [
        {
          attacker: SpellType.SHIELD,
          defender: SpellType.LIGHTNING,
          counters: true,
          effect: 'test',
          description: 'Test counter'
        }
      ];
      spellSystem.setCounterTable(newTable);
      expect(spellSystem.getCounterTable()).toEqual(newTable);
    });
  });

  describe('Spell Resolution', () => {
    let attacker: WizardState;
    let defender: WizardState;

    beforeEach(() => {
      attacker = {
        health: 100,
        mana: 100,
        position: { x: 0, y: 0 },
        activeShield: false,
        frostSlowed: false,
        currentCast: null,
        castAnimation: 0
      };

      defender = {
        health: 100,
        mana: 100,
        position: { x: 100, y: 0 },
        activeShield: false,
        frostSlowed: false,
        currentCast: null,
        castAnimation: 0
      };
    });

    it('should activate shield for attacker when Shield is cast', () => {
      const result = spellSystem.resolveSpell(SpellType.SHIELD, attacker, defender);
      expect(result.shieldActivated).toBe(true);
      expect(result.damage).toBe(0);
      expect(result.blocked).toBe(false);
    });

    it('should block Fireball with active shield', () => {
      defender.activeShield = true;
      const result = spellSystem.resolveSpell(SpellType.FIREBALL, attacker, defender);
      expect(result.blocked).toBe(true);
      expect(result.damage).toBe(0);
      expect(result.shieldBroken).toBe(false);
      expect(result.counterEffect).toBe('Shield blocks Fireball');
    });

    it('should deal damage with Fireball when no shield', () => {
      const result = spellSystem.resolveSpell(SpellType.FIREBALL, attacker, defender);
      expect(result.blocked).toBe(false);
      expect(result.damage).toBe(20);
      expect(result.shieldBroken).toBe(false);
    });

    it('should break shield and deal damage with Lightning', () => {
      defender.activeShield = true;
      const result = spellSystem.resolveSpell(SpellType.LIGHTNING, attacker, defender);
      expect(result.shieldBroken).toBe(true);
      expect(result.damage).toBe(25);
      expect(result.blocked).toBe(false);
      expect(result.counterEffect).toBe('Lightning breaks Shield');
    });

    it('should deal damage with Lightning when no shield', () => {
      const result = spellSystem.resolveSpell(SpellType.LIGHTNING, attacker, defender);
      expect(result.damage).toBe(25);
      expect(result.shieldBroken).toBe(false);
      expect(result.blocked).toBe(false);
    });

    it('should apply frost slow effect and deal damage', () => {
      const result = spellSystem.resolveSpell(SpellType.FROST, attacker, defender);
      expect(result.frostApplied).toBe(true);
      expect(result.damage).toBe(15);
      expect(result.blocked).toBe(false);
      expect(result.counterEffect).toBe('Frost slows opponent');
    });

    it('should not break shield with Fireball', () => {
      defender.activeShield = true;
      const result = spellSystem.resolveSpell(SpellType.FIREBALL, attacker, defender);
      expect(result.shieldBroken).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it('should bypass shield with Frost', () => {
      defender.activeShield = true;
      const result = spellSystem.resolveSpell(SpellType.FROST, attacker, defender);
      expect(result.damage).toBe(15);
      expect(result.frostApplied).toBe(true);
      expect(result.blocked).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should reset to default configuration', () => {
      spellSystem.setCosts({ [SpellType.SHIELD]: 50 });
      spellSystem.setDamage({ [SpellType.LIGHTNING]: 50 });
      
      spellSystem.resetToDefaults();
      
      expect(spellSystem.getManaCost(SpellType.SHIELD)).toBe(20);
      expect(spellSystem.getDamage(SpellType.LIGHTNING)).toBe(25);
    });

    it('should export configuration as JSON', () => {
      const json = spellSystem.exportConfig();
      const config = JSON.parse(json);
      
      expect(config.spells.costs).toEqual(DEFAULT_SPELL_CONFIG.costs);
      expect(config.spells.damage).toEqual(DEFAULT_SPELL_CONFIG.damage);
      expect(config.counterTable).toEqual(DEFAULT_COUNTER_TABLE);
    });

    it('should import configuration from JSON', () => {
      const customConfig = {
        spells: {
          costs: {
            [SpellType.SHIELD]: 10,
            [SpellType.LIGHTNING]: 40,
            [SpellType.FIREBALL]: 20,
            [SpellType.FROST]: 30
          },
          damage: {
            [SpellType.SHIELD]: 0,
            [SpellType.LIGHTNING]: 30,
            [SpellType.FIREBALL]: 25,
            [SpellType.FROST]: 20
          }
        },
        counterTable: []
      };
      
      spellSystem.importConfig(JSON.stringify(customConfig));
      
      expect(spellSystem.getManaCost(SpellType.SHIELD)).toBe(10);
      expect(spellSystem.getManaCost(SpellType.LIGHTNING)).toBe(40);
      expect(spellSystem.getDamage(SpellType.LIGHTNING)).toBe(30);
    });

    it('should throw error on invalid JSON import', () => {
      expect(() => {
        spellSystem.importConfig('invalid json');
      }).toThrow('Invalid spell system configuration JSON');
    });
  });

  describe('Default Configuration Values', () => {
    it('should have correct default spell costs', () => {
      expect(DEFAULT_SPELL_CONFIG.costs).toEqual({
        [SpellType.SHIELD]: 20,
        [SpellType.LIGHTNING]: 30,
        [SpellType.FIREBALL]: 15,
        [SpellType.FROST]: 25
      });
    });

    it('should have correct default spell damage', () => {
      expect(DEFAULT_SPELL_CONFIG.damage).toEqual({
        [SpellType.SHIELD]: 0,
        [SpellType.LIGHTNING]: 25,
        [SpellType.FIREBALL]: 20,
        [SpellType.FROST]: 15
      });
    });

    it('should have all counter rules defined', () => {
      expect(DEFAULT_COUNTER_TABLE).toHaveLength(4);
      
      const effects = DEFAULT_COUNTER_TABLE.map(entry => entry.effect);
      expect(effects).toContain('blocked');
      expect(effects).toContain('shield_broken');
      expect(effects).toContain('melts_frost');
      expect(effects).toContain('slow');
    });
  });

  describe('Custom Configuration', () => {
    it('should accept custom configuration in constructor', () => {
      const customConfig = {
        spells: {
          costs: {
            [SpellType.SHIELD]: 10,
            [SpellType.LIGHTNING]: 50,
            [SpellType.FIREBALL]: 10,
            [SpellType.FROST]: 30
          },
          damage: {
            [SpellType.SHIELD]: 5,
            [SpellType.LIGHTNING]: 40,
            [SpellType.FIREBALL]: 15,
            [SpellType.FROST]: 10
          }
        },
        counterTable: DEFAULT_COUNTER_TABLE
      };
      
      const customSystem = new SpellSystem(customConfig);
      
      expect(customSystem.getManaCost(SpellType.SHIELD)).toBe(10);
      expect(customSystem.getDamage(SpellType.LIGHTNING)).toBe(40);
    });
  });
});
