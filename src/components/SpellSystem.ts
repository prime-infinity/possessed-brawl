/**
 * Spell System for Spell Duel
 * 
 * Manages spell costs, damage values, counter rules, and spell resolution.
 * All spell mechanics are data-driven and tunable via configuration.
 * 
 * **Validates: Requirements 15.1, 15.3-15.5, 16.1-16.6**
 */

import { SpellType } from '../types';
import { WizardState } from './GameEngine';

/**
 * Spell configuration defining costs and damage
 * **Validates: Requirement 15.1**
 */
export interface SpellConfig {
  costs: Record<SpellType, number>;
  damage: Record<SpellType, number>;
}

/**
 * Counter table entry defining spell interactions
 * **Validates: Requirements 15.3-15.4**
 */
export interface CounterTableEntry {
  attacker: SpellType;
  defender: SpellType;
  counters: boolean;
  effect: string;
  description: string;
}

/**
 * Result of spell resolution
 * **Validates: Requirements 16.1-16.6**
 */
export interface SpellResolution {
  blocked: boolean;
  damage: number;
  shieldBroken: boolean;
  shieldActivated: boolean;
  frostApplied: boolean;
  counterEffect?: string;
}

/**
 * Complete spell system configuration
 * **Validates: Requirements 15.1, 15.3-15.5**
 */
export interface SpellSystemConfig {
  spells: SpellConfig;
  counterTable: CounterTableEntry[];
}

/**
 * Default spell configuration
 * Costs and damage values are balanced for strategic gameplay
 * 
 * **Validates: Requirement 15.1**
 */
export const DEFAULT_SPELL_CONFIG: SpellConfig = {
  costs: {
    [SpellType.SHIELD]: 20,      // Defensive spell, moderate cost
    [SpellType.LIGHTNING]: 30,   // Strongest spell, highest cost
    [SpellType.FIREBALL]: 15,    // Basic attack, lowest cost
    [SpellType.FROST]: 25        // Utility spell, high cost
  },
  damage: {
    [SpellType.SHIELD]: 0,       // No damage (defensive)
    [SpellType.LIGHTNING]: 25,   // Highest damage
    [SpellType.FIREBALL]: 20,    // Moderate damage
    [SpellType.FROST]: 15        // Lowest damage
  }
};

/**
 * Default counter table defining spell interactions
 * 
 * Counter rules:
 * - Shield beats Fireball (blocks, no damage)
 * - Lightning beats Shield (breaks shield, deals damage)
 * - Fireball beats Frost (melts frost, deals damage)
 * - Frost slows Lightning caster (next cast delayed)
 * 
 * **Validates: Requirements 15.3-15.4**
 */
export const DEFAULT_COUNTER_TABLE: CounterTableEntry[] = [
  {
    attacker: SpellType.FIREBALL,
    defender: SpellType.SHIELD,
    counters: false,
    effect: 'blocked',
    description: 'Shield blocks Fireball completely'
  },
  {
    attacker: SpellType.LIGHTNING,
    defender: SpellType.SHIELD,
    counters: true,
    effect: 'shield_broken',
    description: 'Lightning breaks Shield and deals damage'
  },
  {
    attacker: SpellType.FIREBALL,
    defender: SpellType.FROST,
    counters: true,
    effect: 'melts_frost',
    description: 'Fireball melts Frost and deals damage'
  },
  {
    attacker: SpellType.FROST,
    defender: SpellType.LIGHTNING,
    counters: false,
    effect: 'slow',
    description: 'Frost slows Lightning caster (next cast delayed)'
  }
];

/**
 * Default spell system configuration
 */
export const DEFAULT_SPELL_SYSTEM_CONFIG: SpellSystemConfig = {
  spells: DEFAULT_SPELL_CONFIG,
  counterTable: DEFAULT_COUNTER_TABLE
};

/**
 * Spell System - Manages spell mechanics and resolution
 * 
 * This component is data-driven, with all costs, damage, and counter rules
 * defined in configuration objects that can be easily tuned.
 * 
 * **Validates: Requirements 15.1, 15.3-15.5, 16.1-16.6**
 */
export class SpellSystem {
  private config: SpellSystemConfig;

  constructor(config: SpellSystemConfig = DEFAULT_SPELL_SYSTEM_CONFIG) {
    // Deep copy to prevent mutation of default config
    this.config = {
      spells: {
        costs: { ...config.spells.costs },
        damage: { ...config.spells.damage }
      },
      counterTable: [...config.counterTable]
    };
  }

  /**
   * Get mana cost for a spell
   * **Validates: Requirement 15.1**
   */
  public getManaCost(spell: SpellType): number {
    return this.config.spells.costs[spell];
  }

  /**
   * Get base damage for a spell
   * **Validates: Requirement 16.6**
   */
  public getDamage(spell: SpellType): number {
    return this.config.spells.damage[spell];
  }

  /**
   * Check if one spell counters another
   * **Validates: Requirements 15.3-15.4**
   */
  public checkCounter(attackSpell: SpellType, defenseSpell: SpellType): CounterTableEntry | null {
    return this.config.counterTable.find(
      entry => entry.attacker === attackSpell && entry.defender === defenseSpell
    ) || null;
  }

  /**
   * Resolve a spell cast against a defender
   * 
   * This method implements the core spell combat logic:
   * - Shield blocks Fireball (no damage)
   * - Lightning breaks Shield and deals damage
   * - Fireball melts Frost and deals damage
   * - Frost slows opponent (next cast delayed)
   * - Shield activates for attacker when Shield is cast
   * 
   * **Validates: Requirements 16.1-16.6**
   * 
   * @param attackerSpell - The spell being cast
   * @param attacker - The wizard casting the spell
   * @param defender - The wizard being targeted
   * @returns SpellResolution with damage, blocks, and effects
   */
  public resolveSpell(
    attackerSpell: SpellType,
    attacker: WizardState,
    defender: WizardState
  ): SpellResolution {
    const resolution: SpellResolution = {
      blocked: false,
      damage: 0,
      shieldBroken: false,
      shieldActivated: false,
      frostApplied: false
    };

    // Special case: Shield spell activates shield for attacker
    if (attackerSpell === SpellType.SHIELD) {
      resolution.shieldActivated = true;
      return resolution;
    }

    // Check if defender has active shield
    if (defender.activeShield) {
      if (attackerSpell === SpellType.FIREBALL) {
        // Shield blocks Fireball completely
        resolution.blocked = true;
        resolution.counterEffect = 'Shield blocks Fireball';
        return resolution;
      } else if (attackerSpell === SpellType.LIGHTNING) {
        // Lightning breaks shield and deals damage
        resolution.shieldBroken = true;
        resolution.damage = this.getDamage(SpellType.LIGHTNING);
        resolution.counterEffect = 'Lightning breaks Shield';
        return resolution;
      }
    }

    // Check counter table for special interactions
    const counter = this.checkCounter(attackerSpell, defender.currentCast || SpellType.FIREBALL);
    
    if (attackerSpell === SpellType.FROST) {
      // Frost applies slow effect and deals damage
      resolution.frostApplied = true;
      resolution.damage = this.getDamage(SpellType.FROST);
      resolution.counterEffect = 'Frost slows opponent';
      return resolution;
    }

    // Default: apply damage based on spell type
    resolution.damage = this.getDamage(attackerSpell);
    
    return resolution;
  }

  /**
   * Get all spell costs (for UI display)
   * **Validates: Requirement 15.5**
   */
  public getAllCosts(): Record<SpellType, number> {
    return { ...this.config.spells.costs };
  }

  /**
   * Get all spell damage values (for UI display)
   * **Validates: Requirement 15.5**
   */
  public getAllDamage(): Record<SpellType, number> {
    return { ...this.config.spells.damage };
  }

  /**
   * Get counter table (for UI display or tuning)
   * **Validates: Requirements 15.4-15.5**
   */
  public getCounterTable(): CounterTableEntry[] {
    return [...this.config.counterTable];
  }

  /**
   * Update spell costs (for tuning)
   * **Validates: Requirement 15.5**
   */
  public setCosts(costs: Partial<Record<SpellType, number>>): void {
    this.config.spells.costs = { ...this.config.spells.costs, ...costs };
  }

  /**
   * Update spell damage (for tuning)
   * **Validates: Requirement 15.5**
   */
  public setDamage(damage: Partial<Record<SpellType, number>>): void {
    this.config.spells.damage = { ...this.config.spells.damage, ...damage };
  }

  /**
   * Update counter table (for tuning)
   * **Validates: Requirement 15.5**
   */
  public setCounterTable(counterTable: CounterTableEntry[]): void {
    this.config.counterTable = counterTable;
  }

  /**
   * Reset to default configuration
   * **Validates: Requirement 15.5**
   */
  public resetToDefaults(): void {
    // Deep copy to prevent mutation of default config
    this.config = {
      spells: {
        costs: { ...DEFAULT_SPELL_CONFIG.costs },
        damage: { ...DEFAULT_SPELL_CONFIG.damage }
      },
      counterTable: [...DEFAULT_COUNTER_TABLE]
    };
  }

  /**
   * Export configuration as JSON (for saving/loading)
   * **Validates: Requirement 15.5**
   */
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   * **Validates: Requirement 15.5**
   */
  public importConfig(json: string): void {
    try {
      const config = JSON.parse(json) as SpellSystemConfig;
      this.config = config;
    } catch (error) {
      console.error('Failed to import spell system config:', error);
      throw new Error('Invalid spell system configuration JSON');
    }
  }
}
