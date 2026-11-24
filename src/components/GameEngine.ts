/**
 * Game Engine for Spell Duel
 * 
 * Manages wizard state, health, mana, spell effects, round timer,
 * win/loss conditions, and scoring.
 * 
 * **Validates: Requirements 13.1-13.4, 14.1-14.10, 15.1-15.2, 18.1-18.7, 19.1-19.5**
 */

import { SpellType, RecognizedSpell } from '../types';

/**
 * Match state progression
 * **Validates: Requirement 18.1**
 */
export enum MatchState {
  SETUP = 'setup',
  CALIBRATING = 'calibrating',
  COUNTDOWN = 'countdown',
  FIGHTING = 'fighting',
  ROUND_END = 'round_end',
  MATCH_END = 'match_end'
}

/**
 * Individual wizard state
 * **Validates: Requirements 13.1-13.4, 14.1-14.2**
 */
export interface WizardState {
  health: number;          // 0-100
  mana: number;            // 0-100
  position: { x: number; y: number };
  activeShield: boolean;
  frostSlowed: boolean;    // Next cast delayed
  currentCast: SpellType | null;
  castAnimation: number;   // Progress 0-1
}

/**
 * Complete game state
 * **Validates: Requirements 14.1-14.2, 18.1, 19.4**
 */
export interface GameState {
  playerWizard: WizardState;
  aiWizard: WizardState;
  roundTimer: number;      // Seconds remaining
  playerScore: number;
  aiScore: number;
  playerCombo: number;
  aiCombo: number;
  matchState: MatchState;
}

/**
 * Result of spell casting attempt
 * **Validates: Requirement 15.2**
 */
export interface CastResult {
  success: boolean;
  spell: SpellType;
  manaCost: number;
  reason?: string;  // If failed: "insufficient mana", "on cooldown", etc.
}

/**
 * Game configuration
 * **Validates: Requirements 14.9, 18.1, 19.5**
 */
export interface GameConfig {
  startingHealth: number;
  startingMana: number;
  manaRegenRate: number;    // Mana per second
  roundDuration: number;    // Seconds
  playerPosition: { x: number; y: number };
  aiPosition: { x: number; y: number };
}

/**
 * Default game configuration
 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  startingHealth: 100,
  startingMana: 100,
  manaRegenRate: 5,  // 5 mana per second
  roundDuration: 90,  // 90 seconds
  playerPosition: { x: 200, y: 300 },
  aiPosition: { x: 600, y: 300 }
};

/**
 * Game Engine - Core system managing wizard duel
 * 
 * **Validates: Requirements 13.1-13.4, 14.1-14.10, 15.1-15.2**
 */
export class GameEngine {
  private state: GameState;
  private config: GameConfig;

  constructor() {
    this.config = DEFAULT_GAME_CONFIG;
    this.state = this.createInitialState();
  }

  /**
   * Initialize game with custom configuration
   * **Validates: Requirements 14.1-14.2**
   */
  public initialize(config: Partial<GameConfig> = {}): void {
    this.config = { ...DEFAULT_GAME_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  /**
   * Create initial game state
   * **Validates: Requirements 13.1-13.2, 14.1-14.2**
   */
  private createInitialState(): GameState {
    return {
      playerWizard: this.createWizard(this.config.playerPosition),
      aiWizard: this.createWizard(this.config.aiPosition),
      roundTimer: this.config.roundDuration,
      playerScore: 0,
      aiScore: 0,
      playerCombo: 0,
      aiCombo: 0,
      matchState: MatchState.SETUP
    };
  }

  /**
   * Create a wizard with starting values
   * **Validates: Requirements 13.1-13.2, 14.1-14.2**
   */
  private createWizard(position: { x: number; y: number }): WizardState {
    return {
      health: this.config.startingHealth,
      mana: this.config.startingMana,
      position,
      activeShield: false,
      frostSlowed: false,
      currentCast: null,
      castAnimation: 0
    };
  }

  /**
   * Update game state each frame
   * **Validates: Requirements 14.9, 18.1-18.2**
   */
  public update(deltaTime: number): void {
    if (this.state.matchState !== MatchState.FIGHTING) {
      return;
    }

    // Update round timer
    this.state.roundTimer -= deltaTime / 1000;
    if (this.state.roundTimer <= 0) {
      this.state.roundTimer = 0;
      this.endRound();
    }

    // Regenerate mana for idle wizards
    this.updateMana(this.state.playerWizard, deltaTime);
    this.updateMana(this.state.aiWizard, deltaTime);

    // Update cast animations
    if (this.state.playerWizard.currentCast !== null) {
      this.state.playerWizard.castAnimation += deltaTime / 1000;
      if (this.state.playerWizard.castAnimation >= 1) {
        this.state.playerWizard.currentCast = null;
        this.state.playerWizard.castAnimation = 0;
      }
    }

    if (this.state.aiWizard.currentCast !== null) {
      this.state.aiWizard.castAnimation += deltaTime / 1000;
      if (this.state.aiWizard.castAnimation >= 1) {
        this.state.aiWizard.currentCast = null;
        this.state.aiWizard.castAnimation = 0;
      }
    }
  }

  /**
   * Regenerate mana for idle wizard
   * **Validates: Requirements 14.9, 14.10**
   */
  private updateMana(wizard: WizardState, deltaTime: number): void {
    if (wizard.currentCast === null) {
      wizard.mana += this.config.manaRegenRate * (deltaTime / 1000);
      wizard.mana = Math.min(wizard.mana, 100);
    }
  }

  /**
   * Cast a spell for the player
   * **Validates: Requirements 15.1-15.2**
   */
  public castPlayerSpell(spell: RecognizedSpell): CastResult {
    return this.castSpell(this.state.playerWizard, spell.type);
  }

  /**
   * Cast a spell for the AI
   * **Validates: Requirements 15.1-15.2**
   */
  public castAISpell(spellType: SpellType): CastResult {
    return this.castSpell(this.state.aiWizard, spellType);
  }

  /**
   * Internal spell casting logic
   * **Validates: Requirements 14.7-14.8, 15.1-15.2**
   */
  private castSpell(wizard: WizardState, spellType: SpellType): CastResult {
    // Get mana cost (placeholder - will be replaced by Spell_System)
    const manaCost = this.getManaCost(spellType);

    // Check if wizard has enough mana
    if (wizard.mana < manaCost) {
      return {
        success: false,
        spell: spellType,
        manaCost,
        reason: 'insufficient mana'
      };
    }

    // Deduct mana
    wizard.mana -= manaCost;
    wizard.mana = Math.max(wizard.mana, 0);

    // Set current cast for animation
    wizard.currentCast = spellType;
    wizard.castAnimation = 0;

    // Apply spell effects (placeholder - will be integrated with Spell_System)
    // For now, just track the cast
    
    return {
      success: true,
      spell: spellType,
      manaCost
    };
  }

  /**
   * Get mana cost for a spell (placeholder)
   * **Validates: Requirement 15.1**
   * TODO: Replace with Spell_System integration
   */
  private getManaCost(spell: SpellType): number {
    const costs: Record<SpellType, number> = {
      [SpellType.SHIELD]: 20,
      [SpellType.LIGHTNING]: 30,
      [SpellType.FIREBALL]: 15,
      [SpellType.FROST]: 25
    };
    return costs[spell];
  }

  /**
   * Apply damage to a wizard
   * **Validates: Requirements 14.7, 14.10**
   */
  public applyDamage(wizard: 'player' | 'ai', damage: number): void {
    const targetWizard = wizard === 'player' ? this.state.playerWizard : this.state.aiWizard;
    
    targetWizard.health -= damage;
    targetWizard.health = Math.max(targetWizard.health, 0);

    // Check for knockout
    if (targetWizard.health <= 0) {
      this.endRound();
    }
  }

  /**
   * End the current round
   * **Validates: Requirements 18.2-18.5**
   */
  private endRound(): void {
    this.state.matchState = MatchState.ROUND_END;
    // Winner determination will be handled by checkRoundEnd()
  }

  /**
   * Check if round has ended and determine winner
   * **Validates: Requirements 18.2-18.5**
   */
  public checkRoundEnd(): { winner: 'player' | 'ai' | 'draw' } | null {
    if (this.state.matchState !== MatchState.ROUND_END) {
      return null;
    }

    const playerHealth = this.state.playerWizard.health;
    const aiHealth = this.state.aiWizard.health;

    if (playerHealth > aiHealth) {
      return { winner: 'player' };
    } else if (aiHealth > playerHealth) {
      return { winner: 'ai' };
    } else {
      return { winner: 'draw' };
    }
  }

  /**
   * Start the round (enter fighting state)
   * **Validates: Requirement 18.1**
   */
  public startRound(): void {
    this.state.matchState = MatchState.FIGHTING;
    this.state.roundTimer = this.config.roundDuration;
  }

  /**
   * Get current game state (read-only copy)
   * **Validates: Requirement 25.1**
   */
  public getState(): Readonly<GameState> {
    return { ...this.state };
  }

  /**
   * Get player wizard state
   */
  public getPlayerWizard(): Readonly<WizardState> {
    return { ...this.state.playerWizard };
  }

  /**
   * Get AI wizard state
   */
  public getAIWizard(): Readonly<WizardState> {
    return { ...this.state.aiWizard };
  }

  /**
   * Get current match state
   */
  public getMatchState(): MatchState {
    return this.state.matchState;
  }

  /**
   * Set match state (for external control)
   */
  public setMatchState(state: MatchState): void {
    this.state.matchState = state;
  }
}
