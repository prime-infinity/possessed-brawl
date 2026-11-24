/**
 * Game Engine for Spell Duel
 * 
 * Manages wizard state, health, mana, spell effects, round timer,
 * win/loss conditions, and scoring.
 * 
 * **Validates: Requirements 13.1-13.4, 14.1-14.10, 15.1-15.2, 18.1-18.7, 19.1-19.5**
 */

import { SpellType, RecognizedSpell } from '../types';
import { SpellSystem, SpellResolution } from './SpellSystem';

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
 * **Validates: Requirement 15.2, 16.1-16.6**
 */
export interface CastResult {
  success: boolean;
  spell: SpellType;
  manaCost: number;
  reason?: string;  // If failed: "insufficient mana", "on cooldown", etc.
  resolution?: SpellResolution;  // Spell resolution details (if successful)
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
  private spellSystem: SpellSystem;

  constructor() {
    this.config = DEFAULT_GAME_CONFIG;
    this.state = this.createInitialState();
    this.spellSystem = new SpellSystem();
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
   * **Validates: Requirements 15.1-15.2, 16.1-16.6**
   */
  public castPlayerSpell(spell: RecognizedSpell): CastResult {
    const result = this.castSpell(this.state.playerWizard, this.state.aiWizard, spell.type);
    
    // Update combo tracking
    if (result.success && result.resolution && result.resolution.damage > 0) {
      this.state.playerCombo++;
      this.state.aiCombo = 0;
    } else if (!result.success || (result.resolution && result.resolution.blocked)) {
      this.state.aiCombo++;
      this.state.playerCombo = 0;
    }
    
    return result;
  }

  /**
   * Cast a spell for the AI
   * **Validates: Requirements 15.1-15.2, 16.1-16.6**
   */
  public castAISpell(spellType: SpellType): CastResult {
    const result = this.castSpell(this.state.aiWizard, this.state.playerWizard, spellType);
    
    // Update combo tracking
    if (result.success && result.resolution && result.resolution.damage > 0) {
      this.state.aiCombo++;
      this.state.playerCombo = 0;
    } else if (!result.success || (result.resolution && result.resolution.blocked)) {
      this.state.playerCombo++;
      this.state.aiCombo = 0;
    }
    
    return result;
  }

  /**
   * Internal spell casting logic with spell resolution
   * **Validates: Requirements 14.7-14.8, 15.1-15.2, 16.1-16.6**
   */
  private castSpell(attacker: WizardState, defender: WizardState, spellType: SpellType): CastResult {
    // Get mana cost from spell system
    const manaCost = this.spellSystem.getManaCost(spellType);

    // Check if wizard has enough mana
    if (attacker.mana < manaCost) {
      return {
        success: false,
        spell: spellType,
        manaCost,
        reason: 'insufficient mana'
      };
    }

    // Deduct mana
    attacker.mana -= manaCost;
    attacker.mana = Math.max(attacker.mana, 0);

    // Set current cast for animation
    attacker.currentCast = spellType;
    attacker.castAnimation = 0;

    // Resolve spell effects using spell system
    const resolution = this.spellSystem.resolveSpell(spellType, attacker, defender);
    
    // Apply resolution effects
    if (resolution.shieldActivated) {
      attacker.activeShield = true;
    }
    
    if (resolution.blocked) {
      // Shield blocked the attack, deactivate shield
      defender.activeShield = false;
    }
    
    if (resolution.shieldBroken) {
      // Shield was broken
      defender.activeShield = false;
    }
    
    if (resolution.frostApplied) {
      // Apply frost slow
      defender.frostSlowed = true;
    }
    
    if (resolution.damage > 0) {
      // Apply damage
      defender.health -= resolution.damage;
      defender.health = Math.max(defender.health, 0);
      
      // Check for knockout
      if (defender.health <= 0) {
        this.endRound();
      }
    }
    
    return {
      success: true,
      spell: spellType,
      manaCost,
      resolution
    };
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

  /**
   * Get spell system (for configuration or UI access)
   */
  public getSpellSystem(): SpellSystem {
    return this.spellSystem;
  }
}
