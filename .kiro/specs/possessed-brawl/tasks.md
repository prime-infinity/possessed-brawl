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
  - Loading screen and permission request UI
  - _Requirements: 1.4, 1.5_

- [x] 4. Set up testing framework with TypeScript support
  - Vitest configured with TypeScript support
  - fast-check integration configured
  - Test utility functions created
  - Test coverage reporting configured
  - Example test verified
  - _Requirements: 22.1-22.7, 24.1-24.4_

### Stage 1: Spell Casting Checkpoint

#### Pose Detection and Smoothing (Reuse Existing)

- [x] 5. Pose_Detector component (already implemented from previous project)
  - [x] 5.1 TypeScript interfaces for Landmarks and PoseDetector exist
  - [x] 5.2 Webcam initialization and permission handling exists
  - [x] 5.3 MediaPipe Pose initialized with lite model
  - [x] 5.4 Frame processing and landmark extraction implemented
  - [x] 5.5 EMA smoothing implemented (alpha=0.3)
  - [x] 5.6 Unit tests for Pose_Detector exist
  - [x] 5.7 Property test for smoothing stability exists
  - **Minor updates needed**: Update terminology in comments from "fighter" to "wizard"
  - _Requirements: 1.1-1.7, 3.1-3.3_

#### Calibration System (Adapt Existing)

- [ ] 6. Update Calibrator component for Spell Duel
  - [x] 6.1 Calibrator component structure exists
  - [x] 6.2 Add wand hand selection screen
    - Create WandHand enum (LEFT, RIGHT)
    - Display selection UI with left/right buttons, default right
    - Store selected wand hand in BaselineData
    - _Requirements: 2.1_

  - [x] 6.3 Update ready stance detection
    - Replace "guard position" with "ready stance" terminology
    - Detect off-hand raised to shoulder height, wand hand relaxed
    - Update visual guide diagram to show wizard casting stance
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 6.4 Update baseline recording to include wand wrist position
    - Record wand wrist's resting baseline position during calibration
    - Record off-hand wrist's resting baseline position
    - Update BaselineData interface with wandWristBaseline and offHandWristBaseline
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ] 6.5 Update unit tests for Calibrator
    - Test wand hand selection flow
    - Test ready stance detection (updated from guard position)
    - Test baseline recording with wand/off-hand wrist positions

#### Stroke Capture and Off-Hand Gesture Detection

- [x] 7. Implement Stroke_Capture component
  - [x] 7.1 Create TypeScript interfaces
    - Define OffHandState enum (IDLE, READY_ARMING, READY_ARMED, CAST, CANCEL)
    - Define Stroke interface (array of {x, y} points, timestamp)
    - Define TrailPoint interface (x, y, age for fade)
    - Define StrokeCaptureConfig interface (all tunable thresholds)
    - _Requirements: 4.5, 5.6, 6.4, 7.4_

  - [x] 7.2 Implement off-hand ready gesture detection
    - Detect off-hand wrist raised to shoulder height or above
    - Implement 300ms arming delay with timer
    - Apply hysteresis to threshold (e.g., +/- 10% margin)
    - Transition from IDLE → READY_ARMING → READY_ARMED
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.3 Implement wand trail recording
    - WHILE off-hand is READY_ARMED, record wand wrist position each frame
    - Store as array of {x, y} points (screen coordinates)
    - Maintain separate visual trail buffer with lag (configurable lag frames)
    - Update trail point ages and remove points older than fade duration
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.4 Implement cast gesture detection (off-hand lower)
    - Detect off-hand wrist drops below shoulder height (with hysteresis)
    - Transition from READY_ARMED → CAST
    - Finalize stroke (make available via getStroke())
    - Clear wand trail from display
    - Return to IDLE state
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.5 Implement cancel gesture detection (off-hand shake/move)
    - Detect off-hand horizontal movement beyond threshold while READY_ARMED
    - Transition to CANCEL state
    - Discard current stroke
    - Clear wand trail
    - Return to IDLE state
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.6 Implement stroke validation
    - Calculate stroke length (total Euclidean distance)
    - Calculate bounding box size (max x/y - min x/y)
    - Reject strokes below minimum length threshold
    - Reject strokes below minimum bounding box threshold
    - _Requirements: 5.7_

  - [ ] 7.7 Write unit tests for Stroke_Capture
    - Test off-hand state machine transitions with synthetic landmarks
    - Test arming delay timing (should not arm before 300ms)
    - Test hysteresis (should not flicker at threshold boundary)
    - Test cancel gesture detection with horizontal movement
    - Test stroke validation (min length, min bounding box)
    - _Requirements: 22.5, 22.6_

  - [ ]* 7.8 Write property test for off-hand state transitions
    - **Property 4: Off-Hand State Transitions**
    - **Validates: Requirements 4.1, 4.2, 6.1, 7.1**
    - Generate arbitrary sequences of off-hand positions
    - Verify state machine transitions are valid (no invalid jumps)

#### $1 Unistroke Recognizer

- [x] 8. Implement Gesture_Recognizer component with $1 algorithm
  - [x] 8.1 Create TypeScript interfaces
    - Define RecognizedSpell interface (type, confidence, matchScore)
    - Define SpellType enum (SHIELD, LIGHTNING, FIREBALL, FROST, FIZZLE)
    - Define SpellTemplate interface (type, array of normalized points)
    - Define GestureRecognizer interface
    - _Requirements: 8.1-8.9, 9.1-9.4_

  - [x] 8.2 Implement $1 preprocessing steps
    - Implement resample(stroke, N) → resample to 64 points
    - Implement rotateToIndicativeAngle(points) → rotate to 0°
    - Implement scaleToReferenceSquare(points) → scale to unit square
    - Implement translateToOrigin(points) → translate centroid to (0, 0)
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [x] 8.3 Implement $1 distance calculation
    - Implement pathDistance(path1, path2) → average point-to-point distance
    - Both paths must be same length (N points)
    - Use Euclidean distance for each point pair
    - _Requirements: 8.6_

  - [x] 8.4 Implement recognize(stroke) method
    - Preprocess stroke (resample, rotate, scale, translate)
    - Compare to all templates using pathDistance
    - Find best match (minimum distance)
    - Reject if distance > rejection threshold → return FIZZLE
    - Calculate confidence: 1 - (distance / threshold)
    - Return RecognizedSpell with type, confidence, matchScore
    - _Requirements: 8.1, 8.6, 8.7, 8.8_

  - [x] 8.5 Implement default spell templates
    - Generate circle template (64 points, 360° / 64 per point)
    - Generate zigzag template (64 points, 3-4 peaks, sin wave with sharp corners)
    - Generate straight line template (64 points, horizontal line)
    - Generate V shape template (64 points, 45° down then 45° up)
    - Store as DEFAULT_TEMPLATES constant
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.6 Implement template training system
    - Create trainTemplate(spellType, samples[3]) method
    - Preprocess all 3 samples with $1 normalization
    - Average corresponding points across samples
    - Store averaged template in memory
    - _Requirements: 9.6_

  - [x] 8.7 Implement template persistence
    - Save trained templates to localStorage as JSON
    - Load templates from localStorage on initialization
    - Fall back to default templates if localStorage unavailable
    - Provide resetToDefaults() method to restore shipped templates
    - _Requirements: 9.7, 9.8_

  - [x] 8.8 Write unit tests for $1 algorithm
    - Test resample with known point counts
    - Test rotation invariance: same shape at 0°, 45°, 90°, 180° matches same template
    - Test scale invariance: same shape at 50%, 100%, 200% size matches same template
    - Test position invariance: same shape at different canvas positions matches same template
    - Test rejection threshold: non-matching strokes return FIZZLE
    - _Requirements: 22.1, 22.2, 22.3, 22.4_

  - [x] 8.9 Write unit tests for spell template matching
    - Test circle template matches circles
    - Test zigzag template matches zigzags
    - Test straight line template matches straight lines
    - Test V shape template matches V shapes
    - Test template training with 3 samples
    - _Requirements: 23.1, 23.2, 23.3, 23.4_

  - [ ]* 8.10 Write property test for stroke normalization invariance
    - **Property 1: Stroke Normalization Invariance**
    - **Validates: Requirements 22.2, 22.3, 22.4**
    - Generate arbitrary strokes with transformations (translate, rotate, scale)
    - Verify normalized output is equivalent (within tolerance)

  - [ ]* 8.11 Write property test for template distinctiveness
    - **Property 5: Template Distinctiveness**
    - **Validates: Requirements 23.5**
    - For each pair of default templates, verify distance > rejection threshold

#### Template Recording UI

- [ ] 9. Implement template training UI
  - [x] 9.1 Create "Train my spells" screen
    - Display instructions: "Draw each spell 3 times"
    - Show current spell being trained (SHIELD, LIGHTNING, FIREBALL, FROST)
    - Show sample count (1/3, 2/3, 3/3)
    - Provide visual feedback when each sample is recorded
    - _Requirements: 9.6_

  - [x] 9.2 Implement training flow
    - User raises off-hand, draws spell, lowers off-hand (same as normal casting)
    - Record stroke as training sample
    - Repeat 3 times per spell
    - After 3 samples, train template and move to next spell
    - After all 4 spells trained, save to localStorage and return to game
    - _Requirements: 9.6, 9.7_

  - [x] 9.3 Add "Reset to defaults" button
    - Clear trained templates from localStorage
    - Load default templates
    - Display confirmation message
    - _Requirements: 9.8_

  - [x] 9.4 Add "Train my spells" option to main menu
    - Make accessible from main menu or setup screen
    - Allow re-training at any time (overwrites previous training)
    - _Requirements: 9.6_

#### Rendering for Stage 1

- [ ] 10. Update Renderer for Spell Duel (Stage 1 features)
  - [x] 10.1 Basic Canvas rendering infrastructure exists from previous project

  - [x] 10.2 Implement wand trail rendering
    - Draw polyline connecting trail points
    - Apply gradient alpha based on age (fade over 500ms)
    - Use warm color (gold/orange) for visual appeal
    - Draw with smooth line joins
    - _Requirements: 5.3, 5.4_

  - [x] 10.3 Implement off-hand rune glow rendering
    - Draw glowing circle under off-hand when READY_ARMED
    - Apply shadow/blur effect for glow
    - Pulse intensity (optional: animate between 0.7-1.0 alpha)
    - Use cool color (blue/cyan) to contrast with wand trail
    - _Requirements: 4.4_

  - [x] 10.4 Implement spell result overlay
    - Display spell name in large text (center screen)
    - Display confidence percentage below name
    - Display "FIZZLE" in red if recognition failed
    - Draw recognized stroke path as overlay (semi-transparent)
    - Clear after 1-2 seconds
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 10.5 Implement placeholder spell effects
    - Shield: glowing circle outline around player stick figure
    - Lightning: zigzag lightning bolt flash across screen
    - Fireball: orange/red circle projectile moving horizontally
    - Frost: blue wave effect expanding outward
    - Simple procedural drawing (no sprites)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 10.6 Update debug overlay for Spell Duel
    - Display off-hand state (IDLE, READY_ARMING, READY_ARMED, CAST, CANCEL)
    - Display wand trail points count
    - Display match scores for all 4 spell templates
    - Display active thresholds (off-hand raise, cancel distance, rejection threshold)
    - Display current stroke length and bounding box size
    - Keep existing landmark visualization
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [x] 10.7 Debug mode toggle (D key) already exists

  - [ ]* 10.8 Write visual regression tests for rendering
    - Test wand trail rendering with various trail lengths
    - Test rune glow rendering
    - Test spell result overlay formatting

#### Stage 1 Integration and Testing

- [ ] 11. Wire Stage 1 components together
  - [x] 11.1 Update main application class
    - Remove fighting move logic
    - Initialize Pose_Detector (reuse existing)
    - Initialize Calibrator (updated with wand selection)
    - Initialize Stroke_Capture (new)
    - Initialize Gesture_Recognizer (new)
    - Initialize Renderer (updated)
    - Implement main loop: pose → stroke capture → recognition → display
    - _Requirements: 1.1, 2.1, 4.1, 8.1, 10.1_

  - [x] 11.2 Implement Stage 1 flow
    - Show wand hand selection screen
    - Transition to calibration screen with visual guide
    - Display calibration progress
    - Transition to spell casting mode after successful calibration
    - Display wand trail, rune glow, and spell results
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 11.3 Add threshold tuning UI for Stage 1
    - Update existing tuning UI to remove fighting move thresholds
    - Add sliders for off-hand raise threshold
    - Add slider for arming delay (milliseconds)
    - Add slider for hysteresis margin
    - Add slider for cancel horizontal threshold
    - Add slider for min stroke length
    - Add slider for min bounding box size
    - Add slider for recognition rejection threshold
    - Display current values, save to localStorage
    - _Requirements: 4.5, 5.6, 6.4, 7.4, 8.9_

  - [x] 11.4 Add "Train my spells" flow integration
    - Add button/menu item to access training mode
    - Integrate template recording UI
    - Test both default and trained template paths
    - _Requirements: 9.6, 9.7, 9.8_

  - [x] 11.5 Mobile optimizations already implemented (MediaPipe lite, frame skipping)

  - [ ]* 11.6 Write integration tests for Stage 1 flow
    - Test full pipeline: webcam → pose → calibration → stroke capture → recognition → display
    - Test wand hand selection flow
    - Test calibration retry
    - Test template training flow (record 3 samples per spell)
    - Test error handling for webcam denial

- [ ] 12. **CHECKPOINT: Stage 1 Complete - User Testing and Approval Required**
  - Verify pose detection maintains 20-30 fps on target mobile devices
  - Verify spell recognition feels responsive (<300ms from cast to result)
  - Verify recognition accuracy >90% for trained templates, >80% for defaults
  - Verify user can complete calibration within 3 attempts
  - Verify placeholder spell effects display correctly
  - Verify debug overlay shows all relevant information
  - **User should test casting all four spells using both default and trained templates**
  - **User should confirm recognition accuracy and responsiveness**
  - **DO NOT PROCEED TO STAGE 2 WITHOUT USER APPROVAL**
  - _Requirements: 1.1, 2.1, 3.2, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1_

### Stage 2: Wizard Duel (After User Approval Only)

**Note: Stage 2 tasks should only begin after Stage 1 user approval at checkpoint**

#### Game Engine Foundation

- [ ] 13. Implement Game_Engine core
  - [ ] 13.1 Create TypeScript interfaces for game state
    - Define GameState, WizardState, GameConfig interfaces
    - Define MatchState enum (SETUP, CALIBRATING, COUNTDOWN, FIGHTING, ROUND_END, MATCH_END)
    - Define CastResult interface
    - _Requirements: 14.1, 14.2, 18.1_

  - [ ] 13.2 Implement wizard state management
    - Initialize player and AI wizards with starting health/mana
    - Track wizard positions
    - Track active shield and frost slow status
    - Track current cast and cast animation progress
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 14.1, 14.2_

  - [ ] 13.3 Implement health and mana tracking
    - Decrease mana when wizard casts spell (check cost first)
    - Decrease health when wizard takes damage
    - Regenerate mana slowly when idle (configurable rate)
    - Clamp health and mana to [0, 100] bounds
    - _Requirements: 14.1, 14.2, 14.7, 14.8, 14.9, 14.10_

  - [ ] 13.4 Implement castPlayerSpell and castAISpell methods
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

- [ ] 14. Implement Spell_System with counter table
  - [ ] 14.1 Define spell costs and damage values
    - Create configuration object or JSON file with costs (e.g., Shield: 20, Lightning: 30, Fireball: 15, Frost: 25)
    - Define damage values (e.g., Lightning: 25, Fireball: 20, Frost: 15, Shield: 0)
    - Make tunable via configuration
    - _Requirements: 15.1_

  - [ ] 14.2 Create counter table data structure
    - Define counter rules:
      - Shield beats Fireball (blocks, no damage)
      - Lightning beats Shield (breaks shield, deals damage)
      - Fireball beats Frost (melts frost, deals damage)
      - Frost slows Lightning caster (next cast delayed)
    - Store as JSON or TypeScript constant for easy tuning
    - _Requirements: 15.3, 15.4_

  - [ ] 14.3 Implement resolveSpell method
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

- [ ] 15. Implement AI_Wizard controller
  - [ ] 15.1 Create AI configuration interface and initialization
    - Define base cast interval, variation, counter bias, adaptive window
    - Define difficulty multiplier range (min/max)
    - _Requirements: 17.1_

  - [ ] 15.2 Implement randomized timer-based spell selection
    - Initialize cast timer with random offset
    - Update timer each frame (deltaTime)
    - When timer reaches zero, select spell and reset timer with new random value
    - _Requirements: 17.1_

  - [ ] 15.3 Implement weighted spell selection
    - Default weights: 0.25 for each spell
    - If player is casting, bias toward counter spell (add counter bias to weight)
    - Normalize weights and pick using weighted random
    - _Requirements: 17.2, 17.3_

  - [ ] 15.4 Implement adaptive difficulty system
    - Track player cast success over rolling window (e.g., last 10 casts)
    - Calculate success rate
    - If rate > 0.7: increase AI speed (1.0x to 1.5x)
    - If rate < 0.3: decrease AI speed (0.5x to 1.0x)
    - Adjust cast interval accordingly
    - _Requirements: 17.4, 17.5, 17.6_

  - [ ] 15.5 Implement taunt system
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

- [ ] 16. Implement round and match management
  - [ ] 16.1 Implement round timer
    - Initialize countdown from configurable duration (e.g., 90 seconds)
    - Update timer each frame (deltaTime)
    - Display timer on UI
    - Trigger round end when timer reaches zero
    - _Requirements: 18.1, 18.2, 18.6_

  - [ ] 16.2 Implement round end conditions
    - End round when timer expires → winner = higher health
    - End round when wizard health reaches zero → winner = other wizard
    - Display round result screen
    - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.7_

  - [ ] 16.3 Implement scoring system
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
