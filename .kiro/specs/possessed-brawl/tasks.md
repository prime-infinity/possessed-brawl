# Implementation Plan: Spell Duel

## Overview

This implementation plan follows a **three-stage approach** with explicit gates for user validation:

- **Stage 1**: Pose input, wand selection, gesture recognition, spell casting checkpoint (implement completely, stop for user approval)
- **Stage 2**: Game engine, wizard duel, AI opponent, mana/health, spell effects and counters, round timer (implement after Stage 1 approval)
- **Stage 3**: Visual and audio polish with procedural effects (future enhancement)

The implementation uses **TypeScript** for type safety, **MediaPipe Pose** for body tracking, **$1 Unistroke Recognizer** (implemented from scratch) for gesture recognition, and **fast-check** for property-based testing. The game targets mobile browsers (Chrome v100+, Safari v15+) running in landscape orientation at 20-30 fps.

## Tasks

### Project Setup

- [x] 1. Initialize project structure and configuration
  - Directory structure already created: `src/`, `src/components/`, `src/types/`, `src/utils/`, `src/tests/`, `public/`
  - TypeScript configured with `tsconfig.json` for ES2020 target
  - Vite configured for build tooling
  - Viewport meta tags for landscape orientation
  - `.gitignore` configured (excludes `node_modules/`, `dist/`, but NOT `.kiro/`)
  - _Requirements: 21.1, 21.2, 21.3, 21.4_

- [x] 2. Install Stage 1 dependencies
  - MediaPipe Pose JavaScript SDK installed (`@mediapipe/tasks-vision`)
  - TypeScript and type definitions installed
  - Vitest for unit testing installed
  - fast-check for property-based testing installed
  - ESLint and Prettier for code quality installed
  - _Requirements: 1.2, 22.1, 24.1_

- [x] 3. Create HTML foundation and Canvas setup
  - `index.html` with Canvas element exists
  - Video element (hidden) for webcam feed exists
  - CSS for landscape orientation enforcement
  - Responsive layout for mobile devices
  - Loading screen with "Start Game" and "Practice Spells" buttons
  - _Requirements: 1.4, 1.5_

- [x] 4. Set up testing framework with TypeScript support
  - Vitest configured with TypeScript support
  - fast-check integration configured
  - Test utility functions created
  - Test coverage reporting configured
  - Example test verified
  - _Requirements: 22.1-22.7, 24.1-24.4_

### Stage 1: Spell Casting Checkpoint (Simplified Architecture)

#### Pose Detection and Smoothing

- [x] 5. Pose_Detector component (implemented with simplified flow)
  - [x] 5.1 TypeScript interfaces for Landmarks and PoseDetector exist
  - [x] 5.2 Webcam initialization and permission handling exists
  - [x] 5.3 MediaPipe Pose initialized with lite model
  - [x] 5.4 Frame processing and landmark extraction implemented
  - [x] 5.5 EMA smoothing implemented (alpha=0.3)
  - [x] 5.6 Unit tests for Pose_Detector exist
  - **SIMPLIFIED**: No calibration needed, works directly with raw landmarks
  - _Requirements: 1.1-1.7, 3.1-3.3_

#### Initial Pose Detection (Replaces Calibration)

- [x] 6. Initial pose detection with instruction overlay
  - [x] 6.1 Display stick figure with both hands raised on startup
  - [x] 6.2 Show "Raise Both Hands" instruction
  - [x] 6.3 Automatically remove overlay once landmarks detected
  - [x] 6.4 Hardcoded hand assignment (right=wand, left=off-hand)
  - **REMOVED**: All calibration and hand selection tasks (original 6.2-6.5)
  - _Requirements: 2.1-2.4_

#### Stroke Capture with Simplified Gesture Detection

- [x] 7. Implement simplified Stroke_Capture
  - [x] 7.1 TypeScript interfaces for Stroke and trail points
  - [x] 7.2 Detect left hand raised (no arming delay, no hysteresis)
  - [x] 7.3 Record right wrist trail when left hand is raised
  - [x] 7.4 Detect cast gesture (left hand drops)
  - [x] 7.5 Display blue glow on left wrist when armed
  - [x] 7.6 Display golden trail for right wrist when drawing
  - **REMOVED**: Cancel gesture detection (original 7.5)
  - **REMOVED**: Complex stroke validation (original 7.6)
  - **REMOVED**: Off-hand state machine with arming delay
  - _Requirements: 4.1-4.4, 5.1-5.7, 6.1-6.3_

#### Simple Directional Gesture Recognizer (Replaces $1 Algorithm)

- [x] 8. Implement simplified Gesture_Recognizer
  - [x] 8.1 TypeScript interfaces for RecognizedSpell and SpellType
  - [x] 8.2 Calculate bounding box aspect ratio
  - [x] 8.3 Calculate displacement ratio (start-to-end distance / path length)
  - [x] 8.4 Recognize circle when displacement < 0.25 (Shield)
  - [x] 8.5 Recognize horizontal line when aspect ratio > 2.0 (Fireball)
  - [x] 8.6 Recognize vertical line when aspect ratio < 0.5 (Frost)
  - [x] 8.7 Recognize diagonal line otherwise (Lightning)
  - [x] 8.8 Return confidence based on how well gesture matches expected parameters
  - **REMOVED**: All $1 algorithm tasks (original 8.2-8.7)
  - **REMOVED**: Template system (original 8.5-8.7)
  - _Requirements: 8.1-8.8, 9.1-9.5_

#### Practice Mode (Replaces Template Recording)

- [x] 9. Implement practice mode tutorial
  - [x] 9.1 Create practice mode state and flow
  - [x] 9.2 Animated demonstration for each spell showing:
    - Stick figure with left hand raised
    - Right hand drawing gesture with golden trail
    - 3-step instructions
  - [x] 9.3 Transition to practice phase with:
    - Small looping reference animation in bottom-right
    - Player's skeleton landmarks visible
    - Real-time wand trail rendering
  - [x] 9.4 Require successful cast of each spell to proceed
  - [x] 9.5 Show completion screen after all 4 spells
  - [x] 9.6 Save completion to localStorage
  - [x] 9.7 First-time users see "Practice Spells" button, returning users see "Start Game" and "Practice Spells"
  - **REMOVED**: All template recording UI tasks (original 9.1-9.4)
  - _Requirements: 10.5.1-10.5.10_

#### Rendering for Stage 1

- [x] 10. Implement Renderer for simplified spell casting
  - [x] 10.1 Basic Canvas rendering infrastructure
  - [x] 10.2 Draw skeleton stick figure with landmarks
  - [x] 10.3 Draw wand trail (golden) with fade
  - [x] 10.4 Draw blue glow on left wrist when armed
  - [x] 10.5 Display spell result with:
    - Spell name and emoji
    - Confidence percentage
    - Perfect green gesture shape (circle, line, etc.)
  - [x] 10.6 Placeholder spell effects (emoji-based for Stage 1)
  - [x] 10.7 Wrist status overlay showing armed state
  - **REMOVED**: Complex debug overlay tasks (simplified to basic status)
  - _Requirements: 10.1-10.5, 11.1-11.5_

#### Stage 1 Integration

- [x] 11. Wire Stage 1 components together (simplified)
  - [x] 11.1 Main application flow without calibration
  - [x] 11.2 Direct transition: pose detected → practice mode (first time) or active (returning)
  - [x] 11.3 Practice mode integration with spell recognition
  - [x] 11.4 Spell casting with visual feedback
  - **REMOVED**: Threshold tuning UI (not needed for simple gestures)
  - **REMOVED**: Template training flow
  - _Requirements: 1.1, 2.1-2.4, 10.5.1-10.5.10_

- [x] 12. **CHECKPOINT: Stage 1 Complete - Simplified Implementation Verified**
  - Verify pose detection maintains 20-30 fps
  - Verify spell recognition feels responsive
  - Verify practice mode teaches all 4 gestures effectively
  - Verify gesture recognition accuracy with simple directional approach
  - **User confirmed: Stage 1 simplified architecture working correctly**
  - **DO NOT REVERT TO COMPLEX CALIBRATION OR $1 ALGORITHM**
  - _Requirements: 1.1, 2.1-2.4, 8.1-8.8, 9.1-9.5, 10.1-10.5, 10.5.1-10.5.10_

### Stage 2: Wizard Duel (After User Approval Only)

**Note: Stage 2 tasks should only begin after Stage 1 user approval at checkpoint**

#### Game Engine Foundation

- [x] 13. Implement Game_Engine core
  - [x] 13.1 Create TypeScript interfaces for game state
    - Define GameState, WizardState, GameConfig interfaces
    - Define MatchState enum (SETUP, CALIBRATING, COUNTDOWN, FIGHTING, ROUND_END, MATCH_END)
    - Define CastResult interface
    - _Requirements: 14.1, 14.2, 18.1_

  - [x] 13.2 Implement wizard state management
    - Initialize player and AI wizards with starting health/mana
    - Track wizard positions
    - Track active shield and frost slow status
    - Track current cast and cast animation progress
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 14.1, 14.2_

  - [x] 13.3 Implement health and mana tracking
    - Decrease mana when wizard casts spell (check cost first)
    - Decrease health when wizard takes damage
    - Regenerate mana slowly when idle (configurable rate)
    - Clamp health and mana to [0, 100] bounds
    - _Requirements: 14.1, 14.2, 14.7, 14.8, 14.9, 14.10_

  - [x] 13.4 Implement castPlayerSpell and castAISpell methods
    - Check if wizard has enough mana
    - Deduct mana cost
    - Apply spell via Spell_System
    - Return CastResult (success/failure, reason)
    - _Requirements: 15.1, 15.2_

  - [ ]* 13.5 Write property test for mana bounds maintenance
    - **Property 2: Mana Bounds Maintenance**
    - **Validates: Requirements 24.1, 24.3**
    - Generate arbitrary sequences of casts and mana regen events
    - Verify mana remains in [0, 100] at all times

  - [ ]* 13.6 Write unit tests for Game_Engine
    - Test wizard initialization
    - Test mana deduction on spell cast
    - Test mana regeneration over time
    - Test insufficient mana rejection

#### Spell System

- [x] 14. Implement Spell_System with counter table
  - [x] 14.1 Define spell costs and damage values
    - Create configuration object or JSON file with costs (e.g., Shield: 20, Lightning: 30, Fireball: 15, Frost: 25)
    - Define damage values (e.g., Lightning: 25, Fireball: 20, Frost: 15, Shield: 0)
    - Make tunable via configuration
    - _Requirements: 15.1_

  - [x] 14.2 Create counter table data structure
    - Define counter rules:
      - Shield beats Fireball (blocks, no damage)
      - Lightning beats Shield (breaks shield, deals damage)
      - Fireball beats Frost (melts frost, deals damage)
      - Frost slows Lightning caster (next cast delayed)
    - Store as JSON or TypeScript constant for easy tuning
    - _Requirements: 15.3, 15.4_

  - [x] 14.3 Implement resolveSpell method
    - Check counter table for attacker spell vs defender state
    - Apply damage according to rules
    - Apply effects (shield activation, frost slow)
    - Return result with damage dealt, blocked status, effects applied
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [ ]* 14.4 Write property test for spell counter consistency
    - **Property 3: Spell Counter Consistency**
    - **Validates: Requirements 24.2**
    - For each spell, verify it does not counter itself

  - [ ]* 14.5 Write unit tests for Spell_System
    - Test mana cost retrieval
    - Test damage value retrieval
    - Test counter table lookups
    - Test spell resolution with all counter cases

#### AI Wizard

- [x] 15. Implement AI_Wizard controller
  - [x] 15.1 Create AI configuration interface and initialization
    - Define base cast interval, variation, counter bias, adaptive window
    - Define difficulty multiplier range (min/max)
    - _Requirements: 17.1_

  - [x] 15.2 Implement randomized timer-based spell selection
    - Initialize cast timer with random offset
    - Update timer each frame (deltaTime)
    - When timer reaches zero, select spell and reset timer with new random value
    - _Requirements: 17.1_

  - [x] 15.3 Implement weighted spell selection
    - Default weights: 0.25 for each spell
    - If player is casting, bias toward counter spell (add counter bias to weight)
    - Normalize weights and pick using weighted random
    - _Requirements: 17.2, 17.3_

  - [x] 15.4 Implement adaptive difficulty system
    - Track player cast success over rolling window (e.g., last 10 casts)
    - Calculate success rate
    - If rate > 0.7: increase AI speed (1.0x to 1.5x)
    - If rate < 0.3: decrease AI speed (0.5x to 1.0x)
    - Adjust cast interval accordingly
    - _Requirements: 17.4, 17.5, 17.6_

  - [x] 15.5 Implement taunt system
    - Display taunt text bubbles on events:
      - Difficulty increase: "You're getting better!"
      - Player combo > 5: "Nice combo!"
      - AI combo > 5: "Is that all you got?"
      - Player low health: "One more spell!"
    - Show taunts for 2-3 seconds
    - _Requirements: 17.7, 17.8, 17.9_

  - [ ]* 15.6 Write unit tests for AI_Wizard
    - Test spell selection with various game states
    - Test weighted random with counter bias
    - Test adaptive difficulty calculations
    - Test taunt trigger conditions

#### Round and Match Management

- [x] 16. Implement round and match management
  - [x] 16.1 Implement round timer
    - Initialize countdown from configurable duration (e.g., 90 seconds)
    - Update timer each frame (deltaTime)
    - Display timer on UI
    - Trigger round end when timer reaches zero
    - _Requirements: 18.1, 18.2, 18.6_

  - [x] 16.2 Implement round end conditions
    - End round when timer expires → winner = higher health
    - End round when wizard health reaches zero → winner = other wizard
    - Display round result screen
    - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.7_

  - [x] 16.3 Implement scoring system
    - Award points for successful spell hits
    - Track combos (consecutive hits without being hit)
    - Apply combo multiplier (e.g., +20% per combo hit)
    - Award round win bonus
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ]* 16.4 Write unit tests for round management
    - Test round timer countdown
    - Test round end on timer expiry
    - Test round end on knockout
    - Test winner determination logic

  - [ ]* 16.5 Write unit tests for scoring system
    - Test point awarding for each spell type
    - Test combo multiplier calculation
    - Test round win bonus

#### Game Rendering (Stage 2)

- [ ] 17. Implement game renderer (replace Stage 1 placeholder effects)
  - [ ] 17.1 Implement stick figure wizards
    - Draw player wizard on left side
    - Draw AI wizard on right side
    - Draw as stick figures (head, torso, arms)
    - Update pose to reflect casting (arm raised for wand hand)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ] 17.2 Implement UI bar rendering
    - Draw health bars for both wizards (color gradient: green → yellow → red)
    - Draw mana bars for both wizards (blue gradient)
    - Draw bars with labels and borders
    - _Requirements: 14.3, 14.4, 14.5, 14.6_

  - [ ] 17.3 Implement game UI elements
    - Draw round timer (countdown)
    - Draw score displays for both wizards
    - Draw combo counters
    - Draw taunt text bubbles (speech bubbles above AI wizard)
    - _Requirements: 18.6, 19.4_

  - [ ] 17.4 Implement full spell effects (replace Stage 1 placeholders)
    - Shield: glowing shield outline with particles
    - Lightning: animated lightning bolt with flash
    - Fireball: fireball projectile with trail and impact
    - Frost: frost wave expanding with ice particles
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [ ] 17.5 Maintain debug overlay (toggle with D key)
    - Keep debug mode from Stage 1
    - Add game state info (health, mana, active effects)
    - _Requirements: 12.8_

  - [ ]* 17.6 Write integration tests for game rendering
    - Test wizard rendering with various states
    - Test UI bar rendering with edge values (0, 100)
    - Test spell effect animations

#### Stage 2 Integration

- [ ] 18. Wire Stage 2 components together
  - [ ] 18.1 Connect Gesture_Recognizer output to Game_Engine
    - Pass RecognizedSpell to Game_Engine.castPlayerSpell()
    - Handle success/failure (insufficient mana, etc.)
    - Display result to player
    - _Requirements: 14.8, 15.2_

  - [ ] 18.2 Integrate AI_Wizard with Game_Engine
    - AI selects spells based on game state
    - Pass AI spell to Game_Engine.castAISpell()
    - Update AI wizard state
    - _Requirements: 17.1, 17.2, 17.3_

  - [ ] 18.3 Integrate Spell_System with Game_Engine
    - Game_Engine calls Spell_System.resolveSpell() for each cast
    - Apply damage, check counters, apply effects
    - Update wizard states (health, mana, shield, slow)
    - _Requirements: 15.1, 15.2, 16.1-16.6_

  - [ ] 18.4 Connect Renderer to game state
    - Renderer receives GameState each frame
    - Render wizards, UI, effects based on state
    - Maintain rendering separation (Game_Engine does not call Renderer methods directly)
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

  - [ ]* 18.5 Write end-to-end integration tests for Stage 2
    - Test full game flow: calibration → countdown → fighting → round end
    - Test spell casting → mana deduction → spell resolution → damage → health update
    - Test AI behavior responding to player actions
    - Test round end conditions

- [ ] 19. **CHECKPOINT: Stage 2 Complete - Playable Game**
  - Verify wizard duel feels engaging
  - Verify AI provides appropriate challenge with adaptive difficulty
  - Verify spell counter mechanics are clear and strategic
  - Verify round and match flow works correctly
  - Verify mana and health management feels balanced
  - **User should play full matches and confirm game is fun**
  - _Requirements: 13.1-13.4, 14.1-14.10, 15.1-15.5, 16.1-16.6, 17.1-17.9, 18.1-18.7, 19.1-19.5_

### Stage 3: Visual and Audio Polish (Future Enhancement)

**Note: Stage 3 is future enhancement - implement if time permits after Stage 2**

- [ ] 20. Procedural audio effects
  - [ ] 20.1 Initialize Web Audio API context
    - Create AudioContext
    - Set up master gain node
    - Handle suspended context on mobile (resume on first user interaction)
    - _Requirements: 20.1-20.6_

  - [ ] 20.2 Implement procedural spell sounds
    - Generate cast sounds using oscillators (different waveforms per spell)
    - Generate hit sounds with frequency envelopes
    - Generate knockout sound
    - Generate round end sound
    - Play ambient drone (low frequency, continuous)
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [ ]* 20.3 Write unit tests for Audio_Manager
    - Test audio context initialization
    - Test sound playback method calls (with mocked AudioContext)
    - Test graceful degradation when audio unavailable

- [ ] 21. Enhanced visual effects
  - [ ] 21.1 Add particle systems for spell effects
    - Shield particles (orbiting)
    - Lightning particles (crackling)
    - Fireball trail particles
    - Frost shards

  - [ ] 21.2 Add screen shake on heavy spell impacts
    - Apply camera offset on Lightning and Fireball hits
    - Decay shake over time

  - [ ] 21.3 Optimize canvas rendering
    - Implement dirty rectangle rendering (only redraw changed regions)
    - Profile and optimize draw calls
    - Maintain or improve FPS

  - [ ]* 21.4 Write performance tests for Stage 3
    - Verify FPS maintains 20-30 on target devices
    - Profile rendering performance

### Repository and Hackathon Requirements

- [x] 22. Create MIT LICENSE file
  - MIT license text already exists at repository root
  - _Requirements: 21.2_

- [ ] 23. Update README.md for Spell Duel
  - [x] README.md exists with setup, run, and test instructions
  - [ ] Update title to "Spell Duel"
  - [ ] Update description: wizard duel controlled through webcam pose detection
  - [ ] Update controls section: wand hand selection, off-hand gestures, spell shapes
  - [ ] Update overview to mention Halloween fantasy theme
  - [ ] Keep: setup instructions, test commands, developer features (threshold tuning UI, debug overlay)
  - _Requirements: 21.5_

- [ ] 24. Update CREDITS.md
  - [x] CREDITS.md exists with third-party library attributions
  - [ ] Add $1 Unistroke Recognizer citation:
    - **Title**: $1 Unistroke Recognizer
    - **Authors**: Jacob O. Wobbrock, Andrew D. Wilson, Yang Li
    - **Year**: 2007
    - **Publication**: Proceedings of the ACM Symposium on User Interface Software and Technology (UIST '07)
    - **License**: BSD-style (algorithm is public, implementation is original)
    - **URL**: https://depts.washington.edu/acelab/proj/dollar/index.html
  - [ ] Remove Matter.js (no longer used)
  - [ ] Keep: MediaPipe, Vite, TypeScript, Vitest, fast-check, ESLint, Prettier
  - _Requirements: 21.6_

- [ ] 25. Create Kiro usage notes document
  - [ ] Document which Kiro features were used during development
    - Spec creation (requirements.md, design.md, tasks.md)
    - Pivot from fighting game to wizard duel (full rewrite of specs)
    - Task breakdown and implementation guidance
    - Code generation (components, tests)
  - [ ] Save in `.kiro/` folder as `kiro-usage-notes.md`
  - _Requirements: 21.7_

- [x] 26. Verify .kiro folder is committed to git
  - `.kiro/` is NOT in `.gitignore`
  - Spec documents (requirements.md, design.md, tasks.md) exist in `.kiro/specs/possessed-brawl/`
  - _Requirements: 21.3, 21.4_

- [ ] 27. **FINAL CHECKPOINT: Project Complete and Hackathon Ready**
  - Verify all Kiroween 2026 requirements met
  - Verify project runs on mobile Chrome and Safari
  - Verify repository is public on GitHub
  - Verify all documentation files present and updated
  - Verify game is fun and demonstrates spell casting effectively
  - **Ready for hackathon submission!**
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_

## Notes

- **Tasks marked with `*` are optional property-based tests** and can be skipped for faster MVP delivery. However, completing property tests is highly recommended for correctness guarantees.
- **Stage 1 must be completed first** with user approval at checkpoint before proceeding to Stage 2. This validates the core spell casting mechanic.
- **Stage 2 implements the full wizard duel** with AI opponent, mana/health, spell counters, and round flow. User should play and confirm it's fun before Stage 3 polish.
- **Stage 3 is future enhancement** if time permits - procedural audio and enhanced visual effects.
- Each task references specific requirements for traceability back to requirements.md.
- Property-based tests validate universal correctness properties defined in the design document.
- Checkpoints ensure incremental validation and user feedback at key milestones.
- The implementation uses **TypeScript** for type safety and better developer experience.
- **Existing work from the fighting game project is reused where applicable** (project setup, pose detection, calibration structure, testing framework, debug overlay infrastructure).

## Key Differences from Previous Project

**Removed:**
- Fighting move recognition (jab, power punch, duck, block, charge)
- Depth control (shoulder-width forward/backward movement)
- Matter.js physics engine and ragdoll simulation
- Move cooldowns

**Added:**
- Wand hand selection (left/right)
- Off-hand gesture state machine (ready, cast, cancel)
- Wand trail capture and rendering
- $1 Unistroke Recognizer (implemented from scratch)
- Spell templates (circle, zigzag, line, V)
- Template training UI ("Train my spells")
- Spell counter table (data-driven)
- Mana resource system (replaces stamina)
- Placeholder spell effects (Stage 1)
- Procedural audio (Stage 3)

**Modified:**
- Calibration now includes wand hand selection and wand wrist baseline
- Renderer updated for wand trail, rune glow, spell effects
- Debug overlay updated for spell recognition info
- Threshold tuning UI updated for spell casting parameters
