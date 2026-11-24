/**
 * Integration Example: AI_Wizard with GameEngine
 * 
 * This example demonstrates how to integrate the AI_Wizard controller
 * with the GameEngine for a complete wizard duel.
 * 
 * This is NOT a test file - it's documentation showing integration patterns.
 */

import { GameEngine } from './GameEngine';
import { SpellSystem } from './SpellSystem';
import { AIWizard, DEFAULT_AI_CONFIG } from './AIWizard';
import { SpellType } from '../types';

/**
 * Example: Basic AI Integration
 * 
 * Shows how to create and initialize the AI wizard controller
 * alongside the game engine.
 */
export function exampleBasicSetup() {
  // 1. Create game engine
  const gameEngine = new GameEngine();
  gameEngine.initialize();

  // 2. Create AI wizard controller
  const spellSystem = gameEngine.getSpellSystem();
  const aiWizard = new AIWizard(DEFAULT_AI_CONFIG, spellSystem);

  return { gameEngine, aiWizard };
}

/**
 * Example: Game Loop with AI
 * 
 * Shows how to integrate AI wizard into the main game loop.
 */
export function exampleGameLoop() {
  const { gameEngine, aiWizard } = exampleBasicSetup();
  
  // Start the round
  gameEngine.startRound();

  // Game loop (called each frame, e.g., 60fps = ~16.67ms)
  function update(deltaTime: number) {
    // 1. Update game engine
    gameEngine.update(deltaTime);

    // 2. Update AI wizard timer
    aiWizard.update(deltaTime);

    // 3. Check if AI wants to cast a spell
    const gameState = gameEngine.getState();
    const aiSpell = aiWizard.selectSpell(gameState);

    if (aiSpell !== null) {
      // AI selected a spell, cast it through the game engine
      const castResult = gameEngine.castAISpell(aiSpell.type);
      
      // Handle cast result (success/failure)
      if (castResult.success) {
        console.log(`AI cast ${aiSpell.type}!`);
        
        // Check for combo taunts
        if (gameState.aiCombo > 5) {
          aiWizard.triggerTaunt('ai_combo', gameState);
        }
      }
    }

    // 4. Display current taunt if any
    const taunt = aiWizard.getCurrentTaunt();
    if (taunt !== null) {
      console.log(`AI: "${taunt}"`);
    }

    // 5. Check for round end
    const roundResult = gameEngine.checkRoundEnd();
    if (roundResult !== null) {
      console.log(`Round ended! Winner: ${roundResult.winner}`);
    }
  }

  // Simulate 60fps game loop
  const frameTime = 1000 / 60; // ~16.67ms
  return { update, frameTime };
}

/**
 * Example: Handling Player Spell Casting
 * 
 * Shows how to record player casts for adaptive difficulty.
 */
export function examplePlayerCast() {
  const { gameEngine, aiWizard } = exampleBasicSetup();
  gameEngine.startRound();

  // Player detected a spell gesture and cast it
  const playerSpell = {
    type: SpellType.FIREBALL,
    confidence: 0.85,
    matchScore: 0.15,
    timestamp: Date.now()
  };

  // Cast through game engine
  const castResult = gameEngine.castPlayerSpell(playerSpell);

  // Record for AI adaptive difficulty
  aiWizard.recordPlayerCast(playerSpell.type, castResult.success);

  // Check if difficulty changed
  const difficultyMultiplier = aiWizard.getDifficultyMultiplier();
  console.log(`Current AI difficulty: ${difficultyMultiplier.toFixed(2)}x`);

  // Check for player combo taunt
  const gameState = gameEngine.getState();
  if (gameState.playerCombo > 5) {
    aiWizard.triggerTaunt('player_combo', gameState);
  }

  return { castResult, difficultyMultiplier };
}

/**
 * Example: Custom AI Configuration
 * 
 * Shows how to create AI with custom behavior settings.
 */
export function exampleCustomAIConfig() {
  const gameEngine = new GameEngine();
  gameEngine.initialize();

  const spellSystem = gameEngine.getSpellSystem();

  // Create AI with custom settings
  const aiWizard = new AIWizard(
    {
      baseCastInterval: 3000,        // 3 seconds between casts
      castIntervalVariation: 500,    // +/- 0.5 seconds variation
      counterBias: 0.4,              // 40% boost to counter spells
      adaptiveWindow: 15,            // Track last 15 player casts
      difficultyMin: 0.6,            // 0.6x minimum speed
      difficultyMax: 1.8,            // 1.8x maximum speed
      tauntDuration: 3000            // 3 second taunts
    },
    spellSystem
  );

  return { gameEngine, aiWizard };
}

/**
 * Example: Triggering Specific Taunts
 * 
 * Shows how to manually trigger taunts based on game events.
 */
export function exampleTaunts() {
  const { gameEngine, aiWizard } = exampleBasicSetup();
  gameEngine.startRound();

  const gameState = gameEngine.getState();

  // Player doing well
  aiWizard.triggerTaunt('player_combo', {
    ...gameState,
    playerCombo: 6
  });
  console.log(`Taunt: ${aiWizard.getCurrentTaunt()}`);

  // AI dominating
  aiWizard.triggerTaunt('ai_combo', {
    ...gameState,
    aiCombo: 8
  });
  console.log(`Taunt: ${aiWizard.getCurrentTaunt()}`);

  // Player low on health
  aiWizard.triggerTaunt('player_low_health', {
    ...gameState,
    playerWizard: {
      ...gameState.playerWizard,
      health: 15
    }
  });
  console.log(`Taunt: ${aiWizard.getCurrentTaunt()}`);
}

/**
 * Example: Resetting AI for New Round
 * 
 * Shows how to reset AI state between rounds.
 */
export function exampleRoundReset() {
  const { gameEngine, aiWizard } = exampleBasicSetup();

  // Play first round
  gameEngine.startRound();
  // ... game plays ...
  
  // Round ends
  const roundResult = gameEngine.checkRoundEnd();
  console.log(`Round ended: ${roundResult?.winner}`);

  // Reset for next round
  aiWizard.reset();
  gameEngine.startRound();

  console.log('Ready for new round!');
  console.log(`AI difficulty reset to: ${aiWizard.getDifficultyMultiplier()}x`);
  console.log(`Player success rate reset: ${aiWizard.getPlayerSuccessRate()}`);
}

/**
 * Example: Debugging AI Behavior
 * 
 * Shows how to access AI internal state for debugging.
 */
export function exampleDebugging() {
  const { gameEngine, aiWizard } = exampleBasicSetup();
  gameEngine.startRound();

  // Simulate some gameplay
  aiWizard.recordPlayerCast(SpellType.FIREBALL, true);
  aiWizard.recordPlayerCast(SpellType.LIGHTNING, true);
  aiWizard.recordPlayerCast(SpellType.FROST, false);

  // Debug output
  console.log('=== AI Debug Info ===');
  console.log(`Difficulty Multiplier: ${aiWizard.getDifficultyMultiplier().toFixed(2)}x`);
  console.log(`Player Success Rate: ${(aiWizard.getPlayerSuccessRate() * 100).toFixed(1)}%`);
  console.log(`Time Until Next Cast: ${aiWizard.getTimeUntilNextCast().toFixed(0)}ms`);
  console.log(`Current Taunt: ${aiWizard.getCurrentTaunt() || 'None'}`);
}
