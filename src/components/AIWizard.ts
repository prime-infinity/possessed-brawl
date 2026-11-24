/**
 * AI Wizard Controller for Spell Duel
 * 
 * Controls opponent wizard's spell casting with:
 * - Randomized timer-based spell selection
 * - Weighted spell choice with counter bias
 * - Adaptive difficulty based on player performance
 * - Taunt system for player feedback
 * 
 * **Validates: Requirements 17.1-17.9**
 */

import { SpellType } from '../types';
import { GameState } from './GameEngine';
import { SpellSystem } from './SpellSystem';

/**
 * Spell selection result with timing
 * **Validates: Requirement 17.1**
 */
export interface AISpell {
  type: SpellType;
  castTime: number;  // When AI will cast (timestamp)
}

/**
 * AI configuration for behavior tuning
 * **Validates: Requirement 17.1**
 */
export interface AIConfig {
  baseCastInterval: number;      // ms between casts
  castIntervalVariation: number; // +/- random variation
  counterBias: number;           // 0-1, how much to favor counters
  adaptiveWindow: number;        // Rolling window size (e.g., 10)
  difficultyMin: number;         // Min cast speed multiplier (e.g., 0.5)
  difficultyMax: number;         // Max cast speed multiplier (e.g., 1.5)
  tauntDuration: number;         // How long taunts display (ms)
}

/**
 * Default AI configuration
 * **Validates: Requirement 17.1**
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  baseCastInterval: 4000,        // 4 seconds base
  castIntervalVariation: 1000,   // +/- 1 second
  counterBias: 0.3,              // 30% boost to counter spell
  adaptiveWindow: 10,            // Last 10 casts
  difficultyMin: 0.5,            // 0.5x speed at minimum
  difficultyMax: 1.5,            // 1.5x speed at maximum
  tauntDuration: 2500            // 2.5 seconds
};

/**
 * Player cast history entry for adaptive difficulty
 */
interface CastHistoryEntry {
  success: boolean;
  timestamp: number;
}

/**
 * AI Wizard Controller - Manages opponent behavior
 * 
 * **Validates: Requirements 17.1-17.9**
 */
export class AIWizard {
  private config: AIConfig;
  private spellSystem: SpellSystem;
  
  // Timer-based casting (Requirement 17.1)
  private castTimer: number;
  private nextCastInterval: number;
  
  // Adaptive difficulty (Requirements 17.4-17.6)
  private playerCastHistory: CastHistoryEntry[];
  private difficultyMultiplier: number;
  
  // Taunt system (Requirements 17.7-17.9)
  private currentTaunt: string | null;
  private tauntTimer: number;
  private lastDifficultyLevel: number;

  constructor(config: AIConfig = DEFAULT_AI_CONFIG, spellSystem: SpellSystem) {
    this.config = { ...config };
    this.spellSystem = spellSystem;
    
    // Initialize adaptive difficulty first (needed by getRandomCastInterval)
    this.playerCastHistory = [];
    this.difficultyMultiplier = 1.0;
    this.lastDifficultyLevel = 1.0;
    
    // Initialize timer with random offset (now that difficultyMultiplier is set)
    this.nextCastInterval = this.getRandomCastInterval();
    this.castTimer = this.nextCastInterval;
    
    // Initialize taunt system
    this.currentTaunt = null;
    this.tauntTimer = 0;
  }

  /**
   * Initialize AI wizard with custom configuration
   * **Validates: Requirement 17.1**
   */
  public initialize(config: Partial<AIConfig> = {}): void {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    this.playerCastHistory = [];
    this.difficultyMultiplier = 1.0;
    this.lastDifficultyLevel = 1.0;
    this.nextCastInterval = this.getRandomCastInterval();
    this.castTimer = this.nextCastInterval;
    this.currentTaunt = null;
    this.tauntTimer = 0;
  }

  /**
   * Reset AI state (for new round)
   */
  public reset(): void {
    this.playerCastHistory = [];
    this.difficultyMultiplier = 1.0;
    this.lastDifficultyLevel = 1.0;
    this.nextCastInterval = this.getRandomCastInterval();
    this.castTimer = this.nextCastInterval;
    this.currentTaunt = null;
    this.tauntTimer = 0;
  }

  /**
   * Update AI state each frame
   * **Validates: Requirements 17.1, 17.7-17.9**
   */
  public update(deltaTime: number): void {
    // Update cast timer
    this.castTimer -= deltaTime;
    
    // Update taunt timer
    if (this.currentTaunt !== null) {
      this.tauntTimer -= deltaTime;
      if (this.tauntTimer <= 0) {
        this.currentTaunt = null;
        this.tauntTimer = 0;
      }
    }
  }

  /**
   * Select a spell if timer has reached zero
   * **Validates: Requirements 17.1, 17.2, 17.3**
   * 
   * @param gameState - Current game state for decision-making
   * @returns AISpell if ready to cast, null otherwise
   */
  public selectSpell(gameState: GameState): AISpell | null {
    // Check if timer has reached zero
    if (this.castTimer > 0) {
      return null;
    }

    // Check if AI has enough mana for any spell
    const aiWizard = gameState.aiWizard;
    if (aiWizard.mana < this.getMinimumManaCost()) {
      // Not enough mana for any spell, wait longer
      this.resetCastTimer();
      return null;
    }

    // Select spell using weighted random with counter bias
    const selectedSpell = this.weightedSpellSelection(gameState);
    
    // Check if AI has enough mana for selected spell
    const manaCost = this.spellSystem.getManaCost(selectedSpell);
    if (aiWizard.mana < manaCost) {
      // Not enough mana for this spell, pick cheapest available
      const fallbackSpell = this.getCheapestAffordableSpell(aiWizard.mana);
      if (fallbackSpell === null) {
        this.resetCastTimer();
        return null;
      }
      this.resetCastTimer();
      return {
        type: fallbackSpell,
        castTime: Date.now()
      };
    }

    // Reset timer with new random interval
    this.resetCastTimer();

    return {
      type: selectedSpell,
      castTime: Date.now()
    };
  }

  /**
   * Weighted spell selection with counter bias
   * **Validates: Requirements 17.2, 17.3**
   */
  private weightedSpellSelection(gameState: GameState): SpellType {
    // Default weights: 0.25 for each spell
    const weights: Record<SpellType, number> = {
      [SpellType.SHIELD]: 0.25,
      [SpellType.LIGHTNING]: 0.25,
      [SpellType.FIREBALL]: 0.25,
      [SpellType.FROST]: 0.25
    };

    // If player is casting, bias toward counter spell
    const playerCasting = gameState.playerWizard.currentCast;
    if (playerCasting !== null) {
      const counterSpell = this.getCounterSpell(playerCasting);
      if (counterSpell !== null) {
        weights[counterSpell] += this.config.counterBias;
      }
    }

    // Additional strategic biases
    // If player has shield, favor lightning
    if (gameState.playerWizard.activeShield) {
      weights[SpellType.LIGHTNING] += 0.2;
    }

    // If AI has low health, favor shield
    if (gameState.aiWizard.health < 30) {
      weights[SpellType.SHIELD] += 0.15;
    }

    // Normalize weights
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const normalizedWeights: Record<SpellType, number> = {
      [SpellType.SHIELD]: weights[SpellType.SHIELD] / totalWeight,
      [SpellType.LIGHTNING]: weights[SpellType.LIGHTNING] / totalWeight,
      [SpellType.FIREBALL]: weights[SpellType.FIREBALL] / totalWeight,
      [SpellType.FROST]: weights[SpellType.FROST] / totalWeight
    };

    // Weighted random selection
    return this.weightedRandom(normalizedWeights);
  }

  /**
   * Get counter spell for a given spell
   * **Validates: Requirement 17.3**
   */
  private getCounterSpell(spell: SpellType): SpellType | null {
    // Based on counter table:
    // - Shield beats Fireball -> if player casts Fireball, AI should cast Shield
    // - Lightning beats Shield -> if player casts Shield, AI should cast Lightning
    // - Fireball beats Frost -> if player casts Frost, AI should cast Fireball
    // - Frost slows Lightning -> if player casts Lightning, AI should cast Frost

    switch (spell) {
      case SpellType.FIREBALL:
        return SpellType.SHIELD;
      case SpellType.SHIELD:
        return SpellType.LIGHTNING;
      case SpellType.FROST:
        return SpellType.FIREBALL;
      case SpellType.LIGHTNING:
        return SpellType.FROST;
      default:
        return null;
    }
  }

  /**
   * Weighted random selection from spell weights
   * **Validates: Requirement 17.2**
   */
  private weightedRandom(weights: Record<SpellType, number>): SpellType {
    const random = Math.random();
    let cumulative = 0;

    for (const [spell, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (random <= cumulative) {
        return spell as SpellType;
      }
    }

    // Fallback (should never reach here if weights sum to 1)
    return SpellType.FIREBALL;
  }

  /**
   * Reset cast timer with new random interval
   * **Validates: Requirement 17.1**
   */
  private resetCastTimer(): void {
    this.nextCastInterval = this.getRandomCastInterval();
    this.castTimer = this.nextCastInterval;
  }

  /**
   * Get random cast interval with difficulty adjustment
   * **Validates: Requirements 17.1, 17.4-17.6**
   */
  private getRandomCastInterval(): number {
    const baseInterval = this.config.baseCastInterval;
    const variation = this.config.castIntervalVariation;
    
    // Apply random variation: base +/- variation
    const randomOffset = (Math.random() - 0.5) * 2 * variation;
    const intervalWithVariation = baseInterval + randomOffset;
    
    // Apply difficulty multiplier (higher multiplier = faster casting = shorter interval)
    const adjustedInterval = intervalWithVariation / this.difficultyMultiplier;
    
    return Math.max(1000, adjustedInterval); // Minimum 1 second between casts
  }

  /**
   * Record player cast for adaptive difficulty tracking
   * **Validates: Requirements 17.4-17.6**
   */
  public recordPlayerCast(spell: SpellType, success: boolean): void {
    // Add to history
    this.playerCastHistory.push({
      success,
      timestamp: Date.now()
    });

    // Keep only last N casts (rolling window)
    if (this.playerCastHistory.length > this.config.adaptiveWindow) {
      this.playerCastHistory.shift();
    }

    // Update difficulty based on success rate
    this.updateAdaptiveDifficulty();
  }

  /**
   * Update adaptive difficulty based on player performance
   * **Validates: Requirements 17.4, 17.5, 17.6**
   */
  private updateAdaptiveDifficulty(): void {
    // Need minimum history to adjust difficulty
    if (this.playerCastHistory.length < 5) {
      return;
    }

    // Calculate success rate
    const successCount = this.playerCastHistory.filter(entry => entry.success).length;
    const successRate = successCount / this.playerCastHistory.length;

    const previousMultiplier = this.difficultyMultiplier;

    // Adjust difficulty based on success rate
    if (successRate > 0.7) {
      // Player doing well, increase AI speed (1.0x to 1.5x)
      const scaleFactor = (successRate - 0.7) / 0.3; // 0 to 1
      this.difficultyMultiplier = 1.0 + scaleFactor * (this.config.difficultyMax - 1.0);
    } else if (successRate < 0.3) {
      // Player struggling, decrease AI speed (0.5x to 1.0x)
      const scaleFactor = successRate / 0.3; // 0 to 1
      this.difficultyMultiplier = this.config.difficultyMin + scaleFactor * (1.0 - this.config.difficultyMin);
    } else {
      // Player performing normally, keep at 1.0x
      this.difficultyMultiplier = 1.0;
    }

    // Clamp to configured bounds
    this.difficultyMultiplier = Math.max(
      this.config.difficultyMin,
      Math.min(this.config.difficultyMax, this.difficultyMultiplier)
    );

    // Check for difficulty increase to trigger taunt
    if (this.difficultyMultiplier > previousMultiplier && 
        this.difficultyMultiplier >= 1.2 &&
        previousMultiplier < 1.2) {
      this.setTaunt(this.selectDifficultyIncreaseTaunt());
    }
  }

  /**
   * Set a taunt message
   * **Validates: Requirements 17.7-17.9**
   */
  private setTaunt(taunt: string): void {
    this.currentTaunt = taunt;
    this.tauntTimer = this.config.tauntDuration;
  }

  /**
   * Get current taunt message
   * **Validates: Requirements 17.7-17.9**
   */
  public getCurrentTaunt(): string | null {
    return this.currentTaunt;
  }

  /**
   * Trigger taunt based on game event
   * **Validates: Requirements 17.7-17.9**
   */
  public triggerTaunt(event: string, gameState: GameState): void {
    let taunt: string | null = null;

    switch (event) {
      case 'difficulty_increase':
        taunt = this.selectDifficultyIncreaseTaunt();
        break;
      case 'player_combo':
        if (gameState.playerCombo > 5) {
          taunt = this.selectPlayerComboTaunt();
        }
        break;
      case 'ai_combo':
        if (gameState.aiCombo > 5) {
          taunt = this.selectAIComboTaunt();
        }
        break;
      case 'player_low_health':
        if (gameState.playerWizard.health < 20) {
          taunt = this.selectPlayerLowHealthTaunt();
        }
        break;
    }

    if (taunt !== null) {
      this.setTaunt(taunt);
    }
  }

  /**
   * Select difficulty increase taunt
   * **Validates: Requirement 17.7**
   */
  private selectDifficultyIncreaseTaunt(): string {
    const taunts = [
      "You're getting better!",
      "Time to step it up!",
      "Now we're talking!",
      "Let's make this interesting!"
    ];
    return taunts[Math.floor(Math.random() * taunts.length)];
  }

  /**
   * Select player combo taunt
   * **Validates: Requirement 17.8**
   */
  private selectPlayerComboTaunt(): string {
    const taunts = [
      "Nice combo!",
      "Impressive!",
      "You've been practicing!",
      "Well done!"
    ];
    return taunts[Math.floor(Math.random() * taunts.length)];
  }

  /**
   * Select AI combo taunt
   * **Validates: Requirement 17.8**
   */
  private selectAIComboTaunt(): string {
    const taunts = [
      "Is that all you got?",
      "Too easy!",
      "Can't touch this!",
      "My turn!"
    ];
    return taunts[Math.floor(Math.random() * taunts.length)];
  }

  /**
   * Select player low health taunt
   * **Validates: Requirement 17.9**
   */
  private selectPlayerLowHealthTaunt(): string {
    const taunts = [
      "One more spell!",
      "Almost there!",
      "You can't win now!",
      "It's over!"
    ];
    return taunts[Math.floor(Math.random() * taunts.length)];
  }

  /**
   * Get minimum mana cost across all spells
   */
  private getMinimumManaCost(): number {
    return Math.min(
      this.spellSystem.getManaCost(SpellType.SHIELD),
      this.spellSystem.getManaCost(SpellType.LIGHTNING),
      this.spellSystem.getManaCost(SpellType.FIREBALL),
      this.spellSystem.getManaCost(SpellType.FROST)
    );
  }

  /**
   * Get cheapest spell AI can afford
   */
  private getCheapestAffordableSpell(availableMana: number): SpellType | null {
    const spells = [
      SpellType.SHIELD,
      SpellType.LIGHTNING,
      SpellType.FIREBALL,
      SpellType.FROST
    ];

    // Sort by cost ascending
    spells.sort((a, b) => 
      this.spellSystem.getManaCost(a) - this.spellSystem.getManaCost(b)
    );

    // Return first affordable spell
    for (const spell of spells) {
      if (this.spellSystem.getManaCost(spell) <= availableMana) {
        return spell;
      }
    }

    return null;
  }

  /**
   * Get current difficulty multiplier (for debugging/UI)
   * **Validates: Requirements 17.4-17.6**
   */
  public getDifficultyMultiplier(): number {
    return this.difficultyMultiplier;
  }

  /**
   * Get player success rate (for debugging/UI)
   * **Validates: Requirements 17.4-17.6**
   */
  public getPlayerSuccessRate(): number {
    if (this.playerCastHistory.length === 0) {
      return 0;
    }
    const successCount = this.playerCastHistory.filter(entry => entry.success).length;
    return successCount / this.playerCastHistory.length;
  }

  /**
   * Get time until next cast (for debugging/UI)
   */
  public getTimeUntilNextCast(): number {
    return Math.max(0, this.castTimer);
  }
}
