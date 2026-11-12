# Implementation Plan: Possessed Brawl

## Overview

This implementation plan follows a **three-stage approach** with explicit gates for user validation:

- **Stage 1**: Pose input, calibration, and move detection with debug overlay (implement completely)
- **Stage 2**: Game engine, physics, AI opponent, and combat mechanics (implement after Stage 1 approval)
- **Stage 3**: Enhanced graphics and visual polish (future enhancement)

The implementation uses **TypeScript** for type safety, **MediaPipe Pose** for body tracking, **Matter.js** for physics, and **fast-check** for property-based testing. The game targets mobile browsers (Chrome v100+, Safari v15+) running in landscape orientation at 20-30 fps.

## Tasks

### Project Setup

- [x] 1. Initialize project structure and configuration
  - Create directory structure: `src/`, `src/components/`, `src/types/`, `src/utils/`, `src/tests/`, `public/`
  - Initialize TypeScript with `tsconfig.json` configured for ES2020 target
  - Set up build tooling (Vite or similar) for fast development and optimized production builds
  - Configure viewport meta tags for landscape orientation enforcement
  - Create `.gitignore` excluding `node_modules/`, `dist/`, build artifacts (but NOT `.kiro/`)
  - _Requirements: 19.1, 19.2, 19.3, 19.4_

- [x] 2. Install Stage 1 dependencies
  - Install MediaPipe Pose JavaScript SDK (`@mediapipe/tasks-vision` or CDN)
  - Install TypeScript and type definitions
  - Install Vitest for unit testing
  - Install fast-check for property-based testing
  - Install ESLint and Prettier for code quality
  - _Requirements: 1.2, 20.1-20.7, 21.1-21.5_

- [x] 3. Create HTML foundation and Canvas setup
  - Create `index.html` with Canvas element for rendering
  - Create video element (hidden) for webcam feed
  - Add CSS for landscape orientation enforcement with user prompt
  - Implement responsive layout for mobile devices
  - Add loading screen and permission request UI
  - _Requirements: 1.4, 1.5_

- [x] 4. Set up testing framework with TypeScript support
  - Configure Vitest with TypeScript support
  - Configure fast-check integration
  - Create test utility functions for generating arbitrary pose data
  - Set up test coverage reporting
  - Create example test to verify setup
  - _Requirements: 20.1-20.7, 21.1-21.5_

### Stage 1: Pose Detection and Move Recognition

#### Pose Detection and Smoothing

- [x] 5. Implement Pose_Detector component
  - [x] 5.1 Create TypeScript interfaces for Landmarks, Landmark, and PoseDetector
    - Define types matching MediaPipe Pose output format (33 landmarks with x, y, z, visibility)
    - Define landmark index constants (NOSE, LEFT_WRIST, RIGHT_WRIST, etc.)
    - _Requirements: 1.3_

  - [x] 5.2 Implement webcam initialization and permission handling
    - Request user media access with appropriate constraints for mobile
    - Handle permission denial with clear error messages and retry option
    - Mirror video display so left corresponds to on-screen right
    - _Requirements: 1.1, 1.4, 1.7_

  - [x] 5.3 Initialize MediaPipe Pose with lite model for mobile performance
    - Load MediaPipe Pose library (CDN or npm)
    - Configure for waist-up detection with visibility threshold
    - Implement error handling for initialization failures with fallback
    - _Requirements: 1.2, 1.3_

  - [x] 5.4 Implement frame processing and landmark extraction
    - Process video frames at 20-30 fps
    - Extract waist-up landmarks (indices 0-16)
    - Filter landmarks by visibility threshold (default 0.5)
    - _Requirements: 1.1, 1.3, 1.6_

  - [x] 5.5 Implement EMA smoothing for joint positions
    - Apply exponential moving average with alpha=0.3
    - Smooth x, y, z coordinates independently
    - Skip frames with low visibility in smoothing calculations
    - Expose alpha as tunable parameter
    - _Requirements: 3.1, 3.3_

  - [x] 5.6 Write unit tests for Pose_Detector
    - Test webcam initialization flow
    - Test landmark visibility filtering
    - Test EMA smoothing with known input sequences
    - Test error handling for missing landmarks

  - [x] 5.7 Write property test for smoothing stability
    - **Property 7: Smoothing Increases Stability**
    - **Validates: Requirements 3.2**
    - Generate jittery landmark sequences
    - Verify smoothed output has lower variance than input

#### Calibration System

- [x] 6. Implement Calibrator component
  - [x] 6.1 Create TypeScript interfaces for BaselineData and Calibrator
    - Define baseline data structure (centerPosition, shoulderWidth, headHeight, wrist baselines)
    - Define calibration progress tracking
    - _Requirements: 2.4, 2.5, 2.6, 2.7_

  - [x] 6.2 Implement guard position detection
    - Detect both wrists within threshold distance of head
    - Verify shoulders are level (vertical difference < threshold)
    - Verify head is upright
    - _Requirements: 2.2_

  - [x] 6.3 Implement calibration UI with visual guide
    - Display text prompt explaining guard position
    - Show stick-figure diagram demonstrating correct stance
    - Display real-time confirmation when guard position detected
    - _Requirements: 2.1, 2.3_

  - [x] 6.4 Implement baseline recording during calibration period
    - Record 1 second (20-30 frames) of landmark data
    - Calculate mean values for center position, shoulder width, head height
    - Calculate baseline wrist positions in guard stance
    - Store baseline measurements for move detection
    - _Requirements: 2.4, 2.5, 2.6, 2.7_

  - [x] 6.5 Implement calibration quality checks and retry logic
    - Validate minimum frame count collected
    - Handle low visibility frames during calibration (exclude from averaging)
    - Extend calibration period if insufficient good frames
    - Provide retry option if calibration fails
    - _Requirements: 2.2, 2.3_

  - [x] 6.6 Write unit tests for Calibrator
    - Test guard position detection with valid/invalid poses
    - Test baseline averaging with synthetic landmark data
    - Test incomplete calibration rejection
    - Test calibration retry flow

#### Move Detection System

- [x] 7. Implement Move_Recognizer component
  - [x] 7.1 Create TypeScript interfaces for move detection
    - Define DetectedMove interface (type, intensity, timestamp)
    - Define MoveType enum (JAB, POWER_PUNCH, DUCK, BLOCK, CHARGE, NONE)
    - Define ThresholdConfig interface with all tunable parameters
    - _Requirements: 4.4, 5.4, 6.5, 7.4, 8.6, 12.5_

  - [x] 7.2 Implement jab detection with cooldown
    - Detect left wrist forward movement beyond threshold (z-axis delta)
    - Apply cooldown timer after detection
    - Block detection during cooldown period
    - Expose tunable threshold and cooldown parameters
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.3 Implement power punch detection with cooldown
    - Detect right wrist forward movement beyond threshold (z-axis delta)
    - Apply cooldown timer after detection
    - Block detection during cooldown period
    - Expose tunable threshold and cooldown parameters
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.4 Implement duck detection with time window
    - Detect head and shoulder drop below threshold
    - Verify drop occurs within time window (speed check)
    - Apply cooldown timer after detection
    - Block detection during cooldown period
    - Expose tunable threshold, time window, and cooldown parameters
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.5 Implement block detection (continuous, no cooldown)
    - Detect both wrists within threshold distance of head
    - Maintain block state while hands remain near face
    - Stop block when hands move away beyond threshold
    - Expose tunable proximity threshold parameter
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.6 Implement charge attack detection with stamina gating
    - Detect charge preparation: both wrists within threshold distance of each other
    - Detect charge release: wrists separate beyond release threshold
    - Check stamina level (simulated for Stage 1, integrated in Stage 2)
    - Block charge if stamina below threshold
    - Apply cooldown timer after detection
    - Expose tunable proximity, release, stamina threshold, and cooldown parameters
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 7.7 Implement cooldown timer management
    - Track cooldown remaining for each move type independently
    - Update cooldowns each frame based on deltaTime
    - Provide method to query cooldown status for debug display
    - _Requirements: 4.2, 4.3, 5.2, 5.3, 6.3, 6.4, 8.4, 8.5_

  - [x] 7.8 Implement move conflict resolution
    - Define move priority order: CHARGE > BLOCK > DUCK > POWER_PUNCH > JAB
    - When multiple moves detected simultaneously, emit highest priority only
    - _Requirements: 4.1, 5.1, 6.1, 7.1, 8.1_

  - [ ]* 7.9 Write unit tests for each move detector
    - Test jab detection with recorded forward wrist movement
    - Test power punch detection with recorded forward wrist movement
    - Test duck detection with recorded drop movement and speed
    - Test block detection with hands-to-face positioning
    - Test charge attack detection with preparation and release gestures
    - Verify cooldown enforcement for each move type
    - Verify threshold parameter enforcement
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_

  - [ ]* 7.10 Write property test for cooldown enforcement
    - **Property 6: Cooldown Enforcement**
    - **Validates: Requirements 4.2, 4.3, 5.2, 5.3, 6.3, 6.4, 8.4, 8.5, 20.6**
    - Generate arbitrary sequences of move gestures with timestamps
    - Verify no move type detected twice within cooldown period

  - [ ]* 7.11 Write property tests for joint geometry calculations
    - **Property 1: Joint Distance Non-Negativity**
    - **Validates: Requirements 21.1**
    - Generate arbitrary landmark pairs
    - Verify Euclidean distance is always non-negative
  
  - [ ]* 7.12 Write property test for joint angles
    - **Property 2: Joint Angle Validity**
    - **Validates: Requirements 21.2**
    - Generate arbitrary joint triplets
    - Verify calculated angles remain in [0°, 180°] range
  
  - [ ]* 7.13 Write property test for baseline-relative positioning
    - **Property 3: Baseline-Relative Position Directionality**
    - **Validates: Requirements 21.3**
    - Generate arbitrary baseline and movement data
    - Verify delta vectors point in same direction as movement

  - [ ]* 7.14 Write property tests for stamina gating
    - **Property 4: Stamina Bounds Maintenance**
    - **Validates: Requirements 22.1, 22.2, 22.3, 22.6**
    - Generate arbitrary sequences of moves and stamina events
    - Verify stamina remains in [0, 100] range
    
  - [ ]* 7.15 Write property test for charge attack gating
    - **Property 5: Charge Attack Gating**
    - **Validates: Requirements 22.4, 22.5**
    - Generate charge gestures with varied stamina levels
    - Verify charge only detected when stamina >= threshold

#### Debug Overlay and Rendering

- [x] 8. Implement Debug Renderer for Stage 1
  - [x] 8.1 Create basic Canvas rendering infrastructure
    - Initialize Canvas 2D context
    - Set up requestAnimationFrame render loop
    - Implement coordinate transformation (normalized to canvas pixels)
    - _Requirements: 9.1_

  - [x] 8.2 Implement pose landmark visualization
    - Draw circles for each visible landmark (green if visible, red if low visibility)
    - Draw skeleton lines connecting anatomical joints
    - Display real-time landmark positions on screen
    - _Requirements: 9.1, 9.2_

  - [x] 8.3 Implement debug text overlay
    - Display currently detected move name
    - Display raw joint position values for key joints (wrists, head, shoulders)
    - Display current threshold values for all move types
    - Display cooldown timers for all move types
    - Display simulated stamina level (for Stage 1 testing)
    - Display FPS counter
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.4 Implement baseline reference visualization
    - Draw baseline shoulder line
    - Draw center position marker
    - Draw baseline wrist positions
    - Show calibration quality metrics
    - _Requirements: 2.7, 9.3_

  - [x] 8.5 Implement debug mode toggle
    - Add keyboard shortcut (e.g., 'D' key) to toggle debug overlay
    - Store debug mode preference in localStorage
    - _Requirements: 9.6_

  - [x] 8.6 Write visual regression tests for debug overlay
    - Test landmark rendering with various visibility levels
    - Test text overlay formatting and positioning
    - Test baseline visualization

#### Stage 1 Integration and Testing

- [ ] 9. Wire Stage 1 components together
  - [x] 9.1 Create main application class coordinating component lifecycle
    - Initialize Pose_Detector
    - Initialize Calibrator
    - Initialize Move_Recognizer after calibration completes
    - Initialize Debug Renderer
    - Implement main loop processing frames through pipeline
    - _Requirements: 1.1, 2.1, 4.1, 9.1_

  - [x] 9.2 Implement calibration flow with UI transitions
    - Show permission request screen
    - Transition to calibration screen with visual guide
    - Display calibration progress
    - Transition to move detection mode after successful calibration
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 9.3 Implement threshold tuning UI for development
    - Add sliders for each move type's threshold values
    - Add sliders for cooldown durations
    - Display current values alongside sliders
    - Save tuned values to localStorage
    - _Requirements: 4.4, 5.4, 6.5, 7.4, 8.6, 12.5_

  - [ ] 9.4 Add mobile-specific optimizations
    - Use MediaPipe lite model variant
    - Implement frame skipping if FPS drops below threshold
    - Add performance warning if sustained low FPS
    - _Requirements: 1.1_

  - [ ]* 9.5 Write integration tests for Stage 1 flow
    - Test full pipeline: webcam → pose detection → calibration → move detection
    - Test calibration retry flow
    - Test error handling for webcam denial
    - Test error handling for tracking loss

- [ ] 10. **CHECKPOINT: Stage 1 Complete - User Testing and Approval Required**
  - Verify pose detection maintains 20-30 fps on target mobile devices
  - Verify move detection feels responsive (<200ms latency)
  - Verify false positive rate <5% and false negative rate <10%
  - Verify calibration succeeds within 3 attempts
  - Verify debug overlay clearly shows all relevant information
  - **User should test on mobile device and approve before proceeding to Stage 2**
  - _Requirements: 1.1, 2.2, 3.2, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1_

### Stage 2: Game Engine and Combat System

**Note: Stage 2 tasks should only begin after Stage 1 user approval**

#### Game Engine Foundation

- [ ] 11. Install Stage 2 dependencies
  - Install Matter.js physics engine (`matter-js`)
  - Install type definitions for Matter.js
  - Install Web Audio API polyfills if needed
  - _Requirements: 13.1_

- [ ] 12. Implement Game_Engine core
  - [ ] 12.1 Create TypeScript interfaces for game state
    - Define GameState, FighterState, GameConfig interfaces
    - Define MatchState enum (CALIBRATING, COUNTDOWN, FIGHTING, ROUND_END, MATCH_END)
    - Define CollisionEvent interface
    - _Requirements: 11.1, 11.2, 16.1_

  - [ ] 12.2 Implement fighter state management
    - Initialize player and AI fighters with starting health/stamina
    - Track fighter positions and velocities
    - Track current move and animation state
    - Track blocking, knockout, and stun status
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2_

  - [ ] 12.3 Implement health and stamina tracking
    - Decrease health when fighter takes damage
    - Increase stamina when fighter lands hits
    - Decrease stamina when fighter performs moves
    - Regenerate stamina slowly when idle
    - Clamp health and stamina to [0, 100] bounds
    - _Requirements: 11.1, 11.2, 11.7, 11.8, 11.9, 11.10_

  - [ ] 12.4 Implement depth control via shoulder width
    - Detect shoulder width increase → move fighter forward
    - Detect shoulder width decrease → move fighter backward
    - Limit forward movement to prevent fighter overlap
    - Limit backward movement to arena boundaries
    - Expose tunable threshold parameters
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 12.5 Write property test for health monotonicity
    - **Property 10: Health Monotonicity**
    - **Validates: Requirements 11.1, 11.7**
    - Generate arbitrary combat event sequences
    - Verify health never increases during a round

  - [ ]* 12.6 Write unit tests for Game_Engine
    - Test fighter initialization
    - Test health decrease on damage
    - Test stamina gain/loss mechanics
    - Test stamina regeneration over time
    - Test depth control movement

#### Combat System

- [ ] 13. Implement combat damage system
  - [ ] 13.1 Define base damage values for each move type
    - Set jab base damage
    - Set power punch base damage (greater than jab)
    - Set charge attack base damage (greatest)
    - Expose as tunable parameters in GameConfig
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 13.2 Implement damage calculation with blocking
    - Calculate actual damage based on move type
    - Apply damage reduction if defender is blocking
    - Apply damage to defender health
    - Trigger hit reaction animation
    - _Requirements: 15.1, 15.2, 15.3, 15.6, 15.7_

  - [ ] 13.3 Implement collision detection
    - Detect when attack hitbox overlaps defender
    - Check if defender is blocking
    - Generate CollisionEvent with attacker, defender, move type, damage
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ]* 13.4 Write property test for damage monotonicity
    - **Property 8: Damage Monotonicity**
    - **Validates: Requirements 15.4, 15.5**
    - Generate arbitrary fighter states
    - Verify charge > power punch > jab damage ordering

  - [ ]* 13.5 Write property test for block damage reduction
    - **Property 9: Block Reduces Damage**
    - **Validates: Requirements 15.6**
    - Generate arbitrary move types and defender states
    - Verify blocked damage < unblocked damage

  - [ ]* 13.6 Write unit tests for combat system
    - Test damage calculation for each move type
    - Test damage reduction when blocking
    - Test health clamping at zero
    - Test collision detection with various positions

#### Physics and Ragdoll System

- [ ] 14. Implement Physics_Engine with Matter.js
  - [ ] 14.1 Initialize Matter.js world with configuration
    - Create physics world with gravity
    - Set fixed timestep (16ms) for deterministic simulation
    - Configure solver iterations for stability
    - _Requirements: 13.1_

  - [ ] 14.2 Create fighter ragdoll bodies
    - Create rigid bodies for each body part (head, torso, arms, legs)
    - Position parts relative to fighter center
    - Create revolute joints at connection points with angle limits
    - Set body properties (density, friction, restitution)
    - Group bodies into composite for easy manipulation
    - _Requirements: 13.1, 13.2_

  - [ ] 14.3 Implement hit force application
    - Calculate force magnitude based on move type (jab < power punch < charge)
    - Apply force at hit position on target body
    - Trigger hit-stop pause for heavy hits (power punch, charge)
    - Apply torque for spinning effects on heavy hits
    - _Requirements: 13.2, 13.3, 13.4, 13.7_

  - [ ] 14.4 Implement arena boundary collisions
    - Detect collisions between fighters and arena walls
    - Apply bounce forces proportional to impact speed
    - Apply squash-and-stretch deformation on wall impact
    - Trigger screen shake on heavy wall impacts
    - _Requirements: 13.5, 13.6, 13.8_

  - [ ] 14.5 Implement physics position synchronization with game state
    - Update fighter positions from Matter.js body positions each frame
    - Handle physics body position errors (NaN/Infinity) with reset
    - Clamp velocities to maximum speeds
    - _Requirements: 13.1_

  - [ ]* 14.6 Write unit tests for Physics_Engine
    - Test ragdoll body creation and joint setup
    - Test force application for different move types
    - Test boundary collision detection
    - Test position synchronization
    - Test error recovery from invalid positions

#### AI Opponent

- [ ] 15. Implement AI_Controller
  - [ ] 15.1 Create AI configuration interface and initialization
    - Define base attack/block/duck intervals
    - Define adaptive difficulty parameters
    - Define taunt trigger conditions
    - _Requirements: 14.1, 14.2, 14.3_

  - [ ] 15.2 Implement randomized timer-based move selection
    - Initialize timers with random offsets
    - Update timers each frame
    - Trigger attacks at randomized intervals
    - Trigger blocks at randomized intervals
    - Trigger ducks at randomized intervals
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ] 15.3 Implement adaptive difficulty system
    - Track player hit success in rolling window (last 10 hits)
    - Calculate player hit rate
    - Adjust AI speed based on player performance (0.5x to 1.5x)
    - Increase AI speed when player doing well (>70% hit rate)
    - Decrease AI speed when player struggling (<30% hit rate)
    - _Requirements: 14.5, 14.6, 14.7_

  - [ ] 15.4 Implement taunt system
    - Display taunt text bubbles when difficulty increases
    - Display praise when player combos >5
    - Display mock when AI combos >5
    - Display finishing taunt when player health <20
    - Show taunts for 2-3 seconds
    - _Requirements: 14.8, 14.9, 14.10_

  - [ ]* 15.5 Write unit tests for AI_Controller
    - Test move selection with various game states
    - Test randomized timer behavior
    - Test adaptive difficulty calculations
    - Test taunt trigger conditions

#### Scoring and Match Management

- [ ] 16. Implement scoring system
  - [ ] 16.1 Define point values for actions
    - Set points for jab hit
    - Set points for power punch hit
    - Set points for charge hit
    - Set combo multiplier percentage
    - Set round win bonus
    - _Requirements: 17.1, 17.2, 17.3, 17.5_

  - [ ] 16.2 Implement point awarding and combo tracking
    - Award points when hits land
    - Track consecutive hits without being hit
    - Apply combo multiplier to points (1 + 0.2 × combo count)
    - Reset combo when hit or miss
    - Track maximum combo for match
    - _Requirements: 17.1, 17.2, 17.4_

  - [ ] 16.3 Implement score display
    - Update cumulative score throughout match
    - Display combo counter during active combos
    - Display max combo on match end screen
    - _Requirements: 17.4_

  - [ ]* 16.4 Write unit tests for scoring system
    - Test point awarding for each move type
    - Test combo multiplier calculation
    - Test combo reset logic
    - Test round win bonus

- [ ] 17. Implement round and match management
  - [ ] 17.1 Implement round timer
    - Initialize countdown from configurable duration (default 90 seconds)
    - Update timer each frame
    - Display timer on UI
    - Trigger round end when timer reaches zero
    - _Requirements: 16.1, 16.2, 16.6_

  - [ ] 17.2 Implement round end conditions
    - End round when timer expires
    - End round when fighter health reaches zero (knockout)
    - Determine winner based on health (timer expiry) or knockout
    - Award round win bonus to winner
    - _Requirements: 16.2, 16.3, 16.4, 16.5_

  - [ ] 17.3 Implement match result screen
    - Display winner announcement
    - Display final scores for both fighters
    - Display match statistics (combos, hits landed, etc.)
    - Provide restart option
    - _Requirements: 16.7, 16.8_

  - [ ]* 17.4 Write unit tests for match management
    - Test round timer countdown
    - Test round end on timer expiry
    - Test round end on knockout
    - Test winner determination logic

#### Game Rendering

- [ ] 18. Implement game Renderer (replace Stage 1 debug renderer)
  - [ ] 18.1 Implement stick figure drawing
    - Draw head as circle
    - Draw torso as line from shoulders to hips
    - Draw arms as two-segment lines (shoulder-elbow-wrist)
    - Draw legs as two-segment lines (hip-knee-ankle)
    - Apply glow effect to highlight active moves
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 23.1, 23.2_

  - [ ] 18.2 Implement UI bar rendering
    - Draw health bars for both fighters with color gradient (green → yellow → red)
    - Draw stamina bars for both fighters
    - Draw bars with labels and borders
    - _Requirements: 11.3, 11.4, 11.5, 11.6_

  - [ ] 18.3 Implement game UI elements
    - Draw round timer
    - Draw score displays for both fighters
    - Draw combo counters
    - Draw taunt text bubbles
    - _Requirements: 16.6, 17.4, 14.8_

  - [ ] 18.4 Implement visual effects
    - Implement screen shake on heavy hits
    - Implement hit-stop pause on heavy hits
    - Implement squash-and-stretch deformation on wall collisions
    - _Requirements: 13.6, 13.7, 13.8_

  - [ ] 18.5 Maintain rendering separation from game logic
    - Renderer receives state data as input via events
    - Game_Engine updates state without calling Renderer methods
    - Renderer subscribes to state change events
    - Art assets replaceable without changing Game_Engine
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

  - [ ]* 18.6 Write integration tests for rendering
    - Test stick figure rendering with various body positions
    - Test UI bar rendering with various health/stamina values
    - Test screen shake effects
    - Test rendering separation (state changes don't directly call render)

#### Audio System

- [ ] 19. Implement Audio_Manager
  - [ ] 19.1 Initialize Web Audio API context
    - Create AudioContext
    - Set up master gain node
    - Handle suspended context on mobile (resume on first user interaction)
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [ ] 19.2 Load sound effect files
    - Source free sound effects from freesound.org or similar
    - Load audio files via fetch
    - Decode audio files to buffers
    - Cache decoded buffers
    - Handle load failures gracefully (game continues without audio)
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [ ] 19.3 Implement sound effect playback
    - Play jab impact sound when jab connects
    - Play power punch impact sound when power punch connects
    - Play charge attack impact sound when charge connects
    - Play block sound when attack blocked
    - Play knockout sound when fighter knocked out
    - Play round end sound when round ends
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [ ]* 19.4 Write unit tests for Audio_Manager
    - Test audio context initialization
    - Test sound loading (with mocked fetch)
    - Test playback method calls
    - Test graceful degradation when audio unavailable

#### Stage 2 Integration

- [ ] 20. Wire Stage 2 components together and integrate with Stage 1
  - [ ] 20.1 Connect Move_Recognizer output to Game_Engine
    - Pass detected moves to Game_Engine.applyPlayerMove()
    - Update player fighter state based on moves
    - Trigger animations and state transitions
    - _Requirements: 10.4, 10.5_

  - [ ] 20.2 Integrate Physics_Engine with Game_Engine
    - Create fighter ragdoll bodies at game start
    - Apply hit forces on collision events
    - Synchronize fighter positions from physics bodies
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ] 20.3 Connect AI_Controller to Game_Engine
    - AI selects moves based on game state
    - Pass AI moves to Game_Engine.applyAIMove()
    - Update AI fighter state based on moves
    - _Requirements: 14.1, 14.2, 14.3_

  - [ ] 20.4 Connect Audio_Manager to game events
    - Trigger sound effects on collision events
    - Trigger sound effects on round end
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [ ] 20.5 Replace Stage 1 debug renderer with game renderer
    - Keep debug mode as optional toggle
    - Default to game view with UI bars and fighters
    - _Requirements: 10.1, 10.2, 10.3, 11.3, 11.4, 11.5, 11.6_

  - [ ]* 20.6 Write end-to-end integration tests for Stage 2
    - Test full combat flow: move → hit → damage → health → physics reaction
    - Test AI behavior responding to game state
    - Test round end conditions and match flow
    - Test audio playback on events

- [ ] 21. **CHECKPOINT: Stage 2 Complete - Playable Game**
  - Verify combat feels impactful and responsive
  - Verify AI provides appropriate challenge with adaptive difficulty
  - Verify physics reactions look entertaining
  - Verify round and match flow works correctly
  - Verify audio enhances gameplay
  - **User should play full matches and confirm game is fun before Stage 3**
  - _Requirements: 10.1-10.5, 11.1-11.10, 13.1-13.8, 14.1-14.10, 15.1-15.7, 16.1-16.8, 17.1-17.5, 18.1-18.6_

### Stage 3: Visual Polish and Enhancement

**Note: Stage 3 is future enhancement - implement if time permits after Stage 2**

- [ ] 22. Enhanced graphics and visual effects
  - [ ] 22.1 Replace stick figures with simple sprite animations
    - Design or source sprite sheets for fighters
    - Implement sprite animation system
    - Maintain performance targets (20-30 fps)
    - _Requirements: 10.1, 23.5_

  - [ ] 22.2 Add particle effects
    - Impact particles on hits
    - Dust particles on wall collisions
    - Charge attack power-up effect
    - _Requirements: 13.2, 13.3, 13.4_

  - [ ] 22.3 Optimize canvas rendering
    - Implement dirty rectangle rendering (only redraw changed regions)
    - Profile and optimize draw calls
    - Maintain or improve FPS
    - _Requirements: 1.1_

  - [ ]* 22.4 Write performance tests for Stage 3
    - Verify FPS maintains 20-30 on target devices
    - Verify memory usage remains stable
    - Profile rendering performance

### Repository and Hackathon Requirements

- [ ] 23. Create documentation and licensing files
  - [ ] 23.1 Create MIT LICENSE file
    - Add MIT license text to repository root
    - _Requirements: 19.2_

  - [ ] 23.2 Create README.md with comprehensive setup instructions
    - Document project overview and features
    - Provide setup instructions (npm install, build commands)
    - Provide run instructions (npm run dev, npm run build)
    - Provide test instructions (npm test)
    - Document mobile device testing setup (HTTPS via ngrok or similar for webcam access on mobile)
    - Include troubleshooting section
    - _Requirements: 19.5_

  - [ ] 23.3 Create CREDITS.md listing third-party libraries
    - List MediaPipe Pose with license (Apache 2.0)
    - List Matter.js with license (MIT)
    - List fast-check with license (MIT)
    - List any other dependencies with licenses
    - Credit sound effect sources from freesound.org
    - _Requirements: 19.6_

  - [ ] 23.4 Create Kiro usage notes document
    - Document which Kiro features were used during development
    - Document how Kiro assisted with spec creation, task breakdown, implementation
    - Save in `.kiro/` folder as `kiro-usage-notes.md`
    - _Requirements: 19.7_

  - [ ] 23.5 Verify .kiro folder is committed to git
    - Ensure `.kiro/` is NOT in `.gitignore`
    - Commit spec documents (requirements.md, design.md, tasks.md)
    - Commit Kiro usage notes
    - _Requirements: 19.3, 19.4_

- [ ] 24. **FINAL CHECKPOINT: Project Complete and Hackathon Ready**
  - Verify all Kiroween 2026 requirements met
  - Verify project runs on mobile Chrome and Safari
  - Verify repository is public on GitHub
  - Verify all documentation files present
  - Verify game is fun and demonstrates pose control effectively
  - **Ready for hackathon submission!**
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

## Notes

- **Tasks marked with `*` are optional** and can be skipped for faster MVP delivery. However, completing tests is highly recommended for code quality and confidence.
- **Stage 1 must be completed first** with user approval before proceeding to Stage 2. This validates the core pose control mechanic before investing in full game implementation.
- **Stage 2 implements the full playable game** with combat, AI, physics, and audio. User should play and confirm it's fun before Stage 3 polish.
- **Stage 3 is future enhancement** if time permits - visual polish and effects.
- Each task references specific requirements for traceability back to requirements.md.
- Property-based tests validate universal correctness properties defined in the design document.
- Checkpoints ensure incremental validation and user feedback at key milestones.
- The implementation uses **TypeScript** as specified in the design document for type safety and better developer experience.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1", "2", "3", "4"]
    },
    {
      "id": 1,
      "tasks": ["5.1", "23.1", "23.2", "23.3"]
    },
    {
      "id": 2,
      "tasks": ["5.2", "5.3", "6.1"]
    },
    {
      "id": 3,
      "tasks": ["5.4", "5.5", "6.2", "7.1"]
    },
    {
      "id": 4,
      "tasks": ["5.6", "5.7", "6.3", "6.4", "7.2", "7.3"]
    },
    {
      "id": 5,
      "tasks": ["6.5", "6.6", "7.4", "7.5", "7.6", "8.1"]
    },
    {
      "id": 6,
      "tasks": ["7.7", "7.8", "7.9", "7.10", "7.11", "7.12", "7.13", "7.14", "7.15", "8.2", "8.3"]
    },
    {
      "id": 7,
      "tasks": ["8.4", "8.5", "8.6", "9.1", "9.2"]
    },
    {
      "id": 8,
      "tasks": ["9.3", "9.4", "9.5"]
    },
    {
      "id": 9,
      "tasks": ["10"]
    },
    {
      "id": 10,
      "tasks": ["11", "23.4", "23.5"]
    },
    {
      "id": 11,
      "tasks": ["12.1", "13.1"]
    },
    {
      "id": 12,
      "tasks": ["12.2", "14.1"]
    },
    {
      "id": 13,
      "tasks": ["12.3", "12.4", "12.5", "12.6", "14.2", "15.1", "16.1"]
    },
    {
      "id": 14,
      "tasks": ["13.2", "13.3", "13.4", "13.5", "13.6", "14.3", "15.2", "16.2"]
    },
    {
      "id": 15,
      "tasks": ["14.4", "14.5", "14.6", "15.3", "15.4", "15.5", "16.3", "16.4", "17.1"]
    },
    {
      "id": 16,
      "tasks": ["17.2", "17.3", "17.4", "18.1", "19.1"]
    },
    {
      "id": 17,
      "tasks": ["18.2", "18.3", "18.4", "19.2"]
    },
    {
      "id": 18,
      "tasks": ["18.5", "18.6", "19.3", "19.4"]
    },
    {
      "id": 19,
      "tasks": ["20.1", "20.2", "20.3", "20.4"]
    },
    {
      "id": 20,
      "tasks": ["20.5", "20.6"]
    },
    {
      "id": 21,
      "tasks": ["21"]
    },
    {
      "id": 22,
      "tasks": ["22.1", "22.2"]
    },
    {
      "id": 23,
      "tasks": ["22.3", "22.4"]
    },
    {
      "id": 24,
      "tasks": ["24"]
    }
  ]
}
```
