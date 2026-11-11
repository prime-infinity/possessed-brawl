# Design Document: Possessed Brawl

## Overview

Possessed Brawl is a browser-based stick-figure fighting game controlled through webcam pose detection. The system captures player movements via MediaPipe Pose and translates them into fighting moves (jab, power punch, duck, block, charge attack) for real-time combat gameplay. The project targets mobile devices (Chrome v100+, Safari v15+) running over HTTPS in landscape orientation at 20-30 fps.

The design follows a three-stage implementation plan:
1. **Stage 1 (Initial Implementation)**: Pose input, calibration, and move detection with debug overlay
2. **Stage 2**: Game engine with physics, AI opponent, and combat mechanics
3. **Stage 3**: Enhanced graphics and audio polish

This document emphasizes Stage 1 architecture since implementation will pause after this stage for user confirmation before proceeding to Stage 2.

### Key Technologies

- **MediaPipe Pose (JavaScript)**: Real-time body landmark detection ([MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker))
- **Matter.js**: 2D physics engine with 17.8k GitHub stars, excellent browser compatibility and performance
- **Web Audio API**: Browser-native sound effect playback
- **HTML5 Canvas**: 2D rendering with requestAnimationFrame
- **Vanilla JavaScript/TypeScript**: No framework dependency to minimize bundle size and maximize mobile performance

### Research Summary

**MediaPipe Pose Performance**: MediaPipe Pose has been successfully deployed in browser-based fitness and pose tracking applications achieving 25-60 FPS on consumer hardware. The library extracts 33 body landmarks including the critical joints needed for this game (wrists, elbows, shoulders, head). It runs entirely client-side with no server dependency, which aligns with privacy goals and eliminates network latency.

**Physics Engine Selection**: Matter.js emerges as the recommended choice over planck.js due to broader adoption, better documentation, and native JavaScript implementation optimized for browser environments. While planck.js is a faithful Box2D port, Matter.js offers simpler APIs and better performance for 2D browser games.

**EMA Filtering**: Exponential Moving Average (EMA) is widely used for smoothing noisy sensor data in real-time systems. An alpha value around 0.3 provides a good balance—small enough to smooth jittery webcam input but large enough to remain responsive to intentional movements. Lower alpha values increase smoothing but add latency; higher values track faster but preserve noise.

## Architecture

### Component Structure

The system follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application Layer                        │
│  - Initialization and lifecycle management                       │
│  - Component wiring and dependency injection                     │
│  - Main game loop coordination                                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ Pose_Detector│         │  Calibrator  │         │Move_Recognizer│
│              │────────▶│              │────────▶│              │
│ - Webcam     │         │ - Baseline   │         │ - Move       │
│   capture    │         │   recording  │         │   detection  │
│ - MediaPipe  │         │ - Guard      │         │ - Cooldowns  │
│   processing │         │   position   │         │ - Thresholds │
│ - Landmark   │         │   detection  │         │              │
│   extraction │         │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
        │                                                  │
        │                                                  │
        └──────────────────┬───────────────────────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │  Game_Engine │
                  │              │
                  │ - Fighter    │
                  │   state      │
                  │ - Health &   │
                  │   stamina    │
                  │ - Combat     │
                  │   logic      │
                  │ - Scoring    │
                  └──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Physics_Engine│  │AI_Controller │  │ Audio_Manager│
│              │  │              │  │              │
│ - Ragdoll    │  │ - Behavior   │  │ - Sound      │
│   physics    │  │   patterns   │  │   effects    │
│ - Collision  │  │ - Adaptive   │  │ - Web Audio  │
│   detection  │  │   difficulty │  │   API        │
│ - Matter.js  │  │ - Taunt      │  │              │
│   wrapper    │  │   system     │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │   Renderer   │
                  │              │
                  │ - Stick      │
                  │   figures    │
                  │ - UI bars    │
                  │ - Debug      │
                  │   overlay    │
                  │ - Canvas     │
                  │   drawing    │
                  └──────────────┘
```

### Module Interfaces and Data Flow

#### Stage 1 Data Flow (Pose Detection and Move Recognition)

```
Webcam Feed
    │
    ▼
Pose_Detector.processFrame()
    │
    ├─▶ Raw landmarks (33 points with x, y, z, visibility)
    │
    ▼
Pose_Detector.smoothLandmarks()
    │
    ├─▶ Smoothed landmarks
    │
    ▼
Calibrator.isInGuardPosition(landmarks)
    │
    ├─▶ boolean (guard position detected)
    │
    ▼
Calibrator.recordBaseline(landmarks)
    │
    ├─▶ BaselineData (centerPos, shoulderWidth, headHeight)
    │
    ▼
Move_Recognizer.detectMoves(landmarks, baseline)
    │
    ├─▶ DetectedMove[] (jab, power_punch, duck, block, charge)
    │
    ▼
Renderer.drawDebugOverlay(landmarks, moves, baseline)
    │
    └─▶ Visual output on Canvas
```

#### Stage 2 Data Flow (Game Engine and Combat)

```
DetectedMove[]
    │
    ▼
Game_Engine.applyPlayerMove(move)
    │
    ├─▶ FighterState update (position, animation, stamina)
    │
    ▼
AI_Controller.selectMove(gameState)
    │
    ├─▶ AIMove
    │
    ▼
Game_Engine.applyAIMove(move)
    │
    ├─▶ FighterState update
    │
    ▼
Game_Engine.detectCollisions(playerFighter, aiFighter)
    │
    ├─▶ CollisionEvent[] (hit, block, miss)
    │
    ▼
Game_Engine.applyDamage(collision)
    │
    ├─▶ Health/Stamina updates, Score changes
    │
    ▼
Physics_Engine.applyForces(collision)
    │
    ├─▶ Ragdoll reactions, screen shake
    │
    ▼
Audio_Manager.playSound(collision.type)
    │
    ├─▶ Sound effect playback
    │
    ▼
Renderer.drawGameState(fighters, UI, effects)
    │
    └─▶ Visual output on Canvas
```

### Technology Stack and Browser Compatibility

**Core Technologies:**
- **MediaPipe Pose v0.5+**: JavaScript library loaded via CDN or bundled via npm
- **Matter.js v0.18+**: 2D physics engine with optimization improvements
- **Web Audio API**: Native browser API, no polyfills needed
- **HTML5 Canvas**: 2D rendering context with hardware acceleration

**Target Browsers:**
- Chrome v100+ on Android (primary target)
- Safari v15+ on iOS (secondary target)
- Requires HTTPS for webcam access
- Landscape orientation enforced via CSS and viewport meta tags

**Performance Targets:**
- 20-30 fps on mid-range mobile devices (e.g., iPhone 12, Samsung Galaxy A52)
- MediaPipe processing: ~40-50ms per frame
- Physics simulation: 16ms timestep (60Hz)
- Rendering: remaining frame budget (~10-15ms)

**Mobile Optimizations:**
- Use MediaPipe "lite" model variant for reduced computational cost
- Limit physics body count (<20 rigid bodies)
- Minimize canvas redraws (only redraw changed regions in Stage 3)
- Disable high-precision timing and reduce landmark count where possible

## Components and Interfaces

### Pose_Detector

**Responsibility:** Capture webcam input, process frames through MediaPipe Pose, extract and smooth body landmarks.

**Interface:**
```typescript
interface PoseDetector {
  // Initialize webcam and MediaPipe Pose
  initialize(): Promise<void>;
  
  // Process a single video frame and return landmarks
  processFrame(): Promise<Landmarks | null>;
  
  // Apply EMA smoothing to landmark positions
  smoothLandmarks(raw: Landmarks, previous: Landmarks): Landmarks;
  
  // Check if visibility is above threshold
  isLandmarkVisible(landmark: Landmark): boolean;
  
  // Release resources
  dispose(): void;
}

interface Landmarks {
  // Array of 33 body landmarks from MediaPipe
  points: Landmark[];
  timestamp: number;
}

interface Landmark {
  x: number;           // Normalized 0-1 (horizontal)
  y: number;           // Normalized 0-1 (vertical)
  z: number;           // Depth estimate (relative to hips)
  visibility: number;  // Confidence score 0-1
}
```

**Key Methods:**

- `initialize()`: Requests webcam permission, initializes MediaPipe Pose with lite model, sets up video element with mirrored display
- `processFrame()`: Captures current video frame, runs pose estimation, extracts waist-up landmarks (indices 0-16 from MediaPipe's 33-point model), filters by visibility threshold
- `smoothLandmarks()`: Applies EMA filter with alpha=0.3 to each landmark's x, y, z coordinates
- `isLandmarkVisible()`: Returns true if `landmark.visibility >= VISIBILITY_THRESHOLD` (default 0.5)

**Dependencies:**
- MediaPipe Pose library (external)
- Browser WebRTC API for webcam access

**Error Handling:**
- Webcam access denied → Show permission prompt with retry option
- MediaPipe initialization failure → Fall back to mock data mode for development
- Low visibility frames → Skip frame and continue with previous smoothed values

### Calibrator

**Responsibility:** Detect guard position, record baseline pose measurements during calibration period.

**Interface:**
```typescript
interface Calibrator {
  // Check if landmarks represent guard position
  isInGuardPosition(landmarks: Landmarks): boolean;
  
  // Start recording baseline data
  startCalibration(): void;
  
  // Record a frame of baseline data
  recordFrame(landmarks: Landmarks): void;
  
  // Finish calibration and compute baseline
  finishCalibration(): BaselineData;
  
  // Get calibration progress (0-1)
  getProgress(): number;
}

interface BaselineData {
  centerPosition: { x: number; y: number };
  shoulderWidth: number;
  headHeight: number;
  leftWristBaseline: { x: number; y: number; z: number };
  rightWristBaseline: { x: number; y: number; z: number };
}
```

**Key Methods:**

- `isInGuardPosition()`: Checks if both wrists are within threshold distance of head (typical boxing guard), shoulders are level (vertical difference < threshold), head is upright
- `startCalibration()`: Resets frame buffer, starts 1-second timer
- `recordFrame()`: Adds landmark data to buffer for averaging
- `finishCalibration()`: Computes mean values across buffered frames for center position (average of shoulders), shoulder width (distance between left and right shoulders), head height (vertical position), wrist baselines (mean wrist positions in guard stance)

**Dependencies:**
- Pose_Detector (consumes landmarks)

**Error Handling:**
- Incomplete calibration data → Reject and require re-calibration
- Landmark visibility drops during calibration → Exclude bad frames, extend calibration period if needed
- Guard position not detected → Display coaching prompts with visual guide

### Move_Recognizer

**Responsibility:** Detect player moves from calibrated pose data, enforce cooldowns and thresholds.

**Interface:**
```typescript
interface MoveRecognizer {
  // Detect moves from current landmarks relative to baseline
  detectMoves(
    landmarks: Landmarks, 
    baseline: BaselineData
  ): DetectedMove[];
  
  // Update cooldown timers
  updateCooldowns(deltaTime: number): void;
  
  // Configure tunable thresholds
  setThresholds(config: ThresholdConfig): void;
  
  // Get current configuration
  getThresholds(): ThresholdConfig;
}

interface DetectedMove {
  type: MoveType;
  intensity: number;    // 0-1 scale for visualization
  timestamp: number;
}

enum MoveType {
  JAB = 'jab',
  POWER_PUNCH = 'power_punch',
  DUCK = 'duck',
  BLOCK = 'block',
  CHARGE = 'charge',
  NONE = 'none'
}

interface ThresholdConfig {
  // Jab detection
  jabThreshold: number;          // Distance threshold (normalized)
  jabCooldown: number;           // Milliseconds
  
  // Power punch detection
  powerPunchThreshold: number;
  powerPunchCooldown: number;
  
  // Duck detection
  duckThreshold: number;
  duckTimeWindow: number;        // Max time for drop (ms)
  duckCooldown: number;
  
  // Block detection
  blockProximityThreshold: number;
  
  // Charge attack detection
  chargeProximityThreshold: number;
  chargeReleaseThreshold: number;
  chargeStaminaThreshold: number;
  chargeCooldown: number;
  
  // Depth control
  shoulderWidthForwardThreshold: number;
  shoulderWidthBackwardThreshold: number;
}
```

**Key Algorithms:**

**Jab Detection:**
```
1. Get left wrist current position
2. Compute z-axis delta from baseline: delta_z = wrist.z - baseline.leftWrist.z
3. If delta_z > jabThreshold AND jabCooldownRemaining == 0:
     - Emit JAB move
     - Start cooldown timer
```

**Power Punch Detection:**
```
1. Get right wrist current position
2. Compute z-axis delta from baseline: delta_z = wrist.z - baseline.rightWrist.z
3. If delta_z > powerPunchThreshold AND powerPunchCooldownRemaining == 0:
     - Emit POWER_PUNCH move
     - Start cooldown timer
```

**Duck Detection:**
```
1. Get head and shoulder current positions
2. Compute vertical delta from baseline:
     delta_head = baseline.headHeight - head.y
     delta_shoulders = baseline.shoulderHeight - shoulders.y
3. Compute drop speed: speed = delta / timeElapsed
4. If delta_head > duckThreshold 
   AND delta_shoulders > duckThreshold
   AND speed > minDropSpeed
   AND duckCooldownRemaining == 0:
     - Emit DUCK move
     - Start cooldown timer
```

**Block Detection:**
```
1. Get both wrist positions and head position
2. Compute distances:
     dist_left = euclideanDistance(leftWrist, head)
     dist_right = euclideanDistance(rightWrist, head)
3. If dist_left < blockProximityThreshold 
   AND dist_right < blockProximityThreshold:
     - Emit BLOCK move (continuous, no cooldown)
   Else:
     - Stop emitting BLOCK
```

**Charge Attack Detection:**
```
1. Compute distance between wrists: wrist_dist = euclideanDistance(leftWrist, rightWrist)
2. State machine:
     - IDLE: If wrist_dist < chargeProximityThreshold → CHARGING
     - CHARGING: If wrist_dist > chargeReleaseThreshold → Check stamina
         - If stamina >= chargeStaminaThreshold AND chargeCooldownRemaining == 0:
             - Emit CHARGE move
             - Start cooldown timer
             - Return to IDLE
3. Reset to IDLE if charging held too long (timeout)
```

**Dependencies:**
- Calibrator (consumes BaselineData)
- Pose_Detector (consumes Landmarks)

**Error Handling:**
- Missing landmarks → Skip move detection for that frame
- Invalid baseline data → Disable move detection until re-calibration
- Conflicting moves (e.g., jab + duck simultaneously) → Prioritize by precedence order: CHARGE > BLOCK > DUCK > POWER_PUNCH > JAB

### Game_Engine

**Responsibility:** Manage fighter state, health, stamina, combat logic, round timers, scoring.

**Interface:**
```typescript
interface GameEngine {
  // Initialize game state
  initialize(config: GameConfig): void;
  
  // Update game state (called each frame)
  update(deltaTime: number): void;
  
  // Apply player move to player fighter
  applyPlayerMove(move: DetectedMove): void;
  
  // Apply AI move to opponent fighter
  applyAIMove(move: DetectedMove): void;
  
  // Check for collisions and hits
  detectCollisions(): CollisionEvent[];
  
  // Apply damage from collision
  applyDamage(collision: CollisionEvent): void;
  
  // Update scores and combos
  updateScoring(event: GameEvent): void;
  
  // Check win/loss conditions
  checkRoundEnd(): RoundResult | null;
  
  // Get current game state
  getState(): GameState;
}

interface GameState {
  playerFighter: FighterState;
  aiFighter: FighterState;
  roundTimer: number;
  playerScore: number;
  aiScore: number;
  playerCombo: number;
  aiCombo: number;
  matchState: MatchState;
}

interface FighterState {
  health: number;          // 0-100
  stamina: number;         // 0-100
  position: { x: number; y: number; depth: number };
  velocity: { x: number; y: number };
  currentMove: MoveType;
  animationState: AnimationState;
  isBlocking: boolean;
  isKnockedOut: boolean;
}

interface CollisionEvent {
  attacker: 'player' | 'ai';
  defender: 'player' | 'ai';
  moveType: MoveType;
  damageAmount: number;
  wasBlocked: boolean;
  hitPosition: { x: number; y: number };
}

enum MatchState {
  CALIBRATING = 'calibrating',
  COUNTDOWN = 'countdown',
  FIGHTING = 'fighting',
  ROUND_END = 'round_end',
  MATCH_END = 'match_end'
}
```

**Key Algorithms:**

**Damage Calculation:**
```
baseDamage = {
  JAB: 5,
  POWER_PUNCH: 12,
  CHARGE: 25
}

actualDamage = baseDamage[moveType]
if defender.isBlocking:
  actualDamage *= BLOCK_REDUCTION_FACTOR  // e.g., 0.3 (70% reduction)

defender.health -= actualDamage
defender.health = max(0, defender.health)
```

**Stamina Management:**
```
# Stamina gain on hit
if move.landed:
  attacker.stamina += STAMINA_GAIN_PER_HIT  // e.g., 10

# Stamina cost per move
moveCost = {
  JAB: 5,
  POWER_PUNCH: 15,
  DUCK: 10,
  BLOCK: 2 per second,
  CHARGE: 50
}

attacker.stamina -= moveCost[moveType]
attacker.stamina = max(0, attacker.stamina)

# Passive regeneration
if fighter.currentMove == NONE:
  fighter.stamina += STAMINA_REGEN_RATE * deltaTime  // e.g., 5 per second
  fighter.stamina = min(100, fighter.stamina)
```

**Scoring System:**
```
# Base points
points = {
  JAB_HIT: 10,
  POWER_PUNCH_HIT: 25,
  CHARGE_HIT: 50
}

# Combo multiplier
if consecutiveHits > 0:
  multiplier = 1 + (consecutiveHits * 0.2)  // +20% per combo hit
  points *= multiplier

fighter.score += points

# Round win bonus
if roundWon:
  winner.score += ROUND_WIN_BONUS  // e.g., 200
```

**Dependencies:**
- Move_Recognizer (consumes DetectedMove)
- AI_Controller (generates AI moves)
- Physics_Engine (collision detection and ragdoll reactions)
- Audio_Manager (triggers sound effects)

**Error Handling:**
- Invalid move type → Log warning and ignore
- Negative health/stamina → Clamp to 0
- Timer underflow → End round immediately

### Physics_Engine

**Responsibility:** Simulate ragdoll physics, apply forces from hits, handle collisions with walls.

**Interface:**
```typescript
interface PhysicsEngine {
  // Initialize Matter.js world
  initialize(config: PhysicsConfig): void;
  
  // Create a fighter ragdoll
  createFighterBody(position: { x: number; y: number }): FighterBody;
  
  // Apply force from a hit
  applyHitForce(
    body: FighterBody, 
    force: Vector, 
    point: Vector
  ): void;
  
  // Step physics simulation
  step(deltaTime: number): void;
  
  // Get current body positions
  getFighterPositions(): { player: Transform; ai: Transform };
  
  // Check for collision with boundaries
  checkBoundaryCollisions(): BoundaryCollision[];
}

interface FighterBody {
  // Matter.js composite body (head, torso, arms, legs)
  bodyParts: {
    head: Matter.Body;
    torso: Matter.Body;
    leftArm: Matter.Body;
    rightArm: Matter.Body;
    leftLeg: Matter.Body;
    rightLeg: Matter.Body;
  };
  
  // Constraints connecting body parts
  joints: Matter.Constraint[];
}

interface PhysicsConfig {
  gravity: { x: number; y: number };
  timeStep: number;           // Fixed timestep (e.g., 16ms)
  iterations: number;         // Solver iterations (e.g., 6)
  wallRestitution: number;    // Bounciness (e.g., 0.8)
}
```

**Key Algorithms:**

**Ragdoll Construction:**
```
1. Create rigid bodies for each body part (circles/rectangles)
2. Position parts relative to fighter center
3. Create revolute joints at connection points:
     - Head-torso: limited rotation ±30°
     - Torso-arms: shoulder joints ±120°
     - Torso-legs: hip joints ±90°
4. Set body properties:
     - Density for realistic mass distribution
     - Friction for ground contact
     - Restitution for bounce
5. Group bodies into composite for easy manipulation
```

**Hit Force Application:**
```
forceMultiplier = {
  JAB: 0.003,
  POWER_PUNCH: 0.008,
  CHARGE: 0.020
}

force = moveDirection * forceMultiplier[moveType]
applicationPoint = hitPosition  // Where contact occurred

Matter.Body.applyForce(targetBody, applicationPoint, force)

# Additional effects for heavy hits
if moveType == CHARGE or moveType == POWER_PUNCH:
  - Trigger hit-stop (pause simulation for 80ms)
  - Trigger screen shake
  - Apply torque for spinning effect
```

**Wall Collision Response:**
```
1. Detect collision between fighter body and arena boundary
2. If collision.speed > SQUASH_THRESHOLD:
     - Calculate squash direction (perpendicular to wall)
     - Apply squash-and-stretch deformation
     - Increase restitution multiplier for bounce
3. Apply impact particles/effects at collision point
```

**Dependencies:**
- Matter.js library
- Game_Engine (receives collision events)

**Error Handling:**
- Body position NaN → Reset to safe position (center of arena)
- Excessive velocity → Clamp to maximum speed
- Joint breakage → Reconnect joint or disable ragdoll temporarily

### AI_Controller

**Responsibility:** Control opponent fighter behavior, implement adaptive difficulty, manage taunts.

**Interface:**
```typescript
interface AIController {
  // Initialize AI with difficulty settings
  initialize(config: AIConfig): void;
  
  // Select next move based on game state
  selectMove(gameState: GameState): DetectedMove | null;
  
  // Update AI timers and difficulty
  update(deltaTime: number): void;
  
  // Track player performance for difficulty adjustment
  recordPlayerHit(move: DetectedMove): void;
  
  // Get current taunt/message
  getCurrentTaunt(): string | null;
}

interface AIConfig {
  baseAttackInterval: number;      // ms between attacks
  baseBlockChance: number;         // 0-1 probability
  baseDuckChance: number;          // 0-1 probability
  adaptiveWindow: number;          // Rolling window size (e.g., 10 hits)
  difficultyMultiplierMin: number; // e.g., 0.5
  difficultyMultiplierMax: number; // e.g., 2.0
}
```

**Key Algorithms:**

**Randomized Timer System:**
```
# Initialize timers with random offsets
attackTimer = randomRange(
  baseAttackInterval * 0.8, 
  baseAttackInterval * 1.2
)

blockTimer = randomRange(
  baseBlockInterval * 0.7,
  baseBlockInterval * 1.3
)

# Each frame
attackTimer -= deltaTime
if attackTimer <= 0:
  executeRandomAttack()
  attackTimer = randomRange(...)  // Reset with new random value
```

**Adaptive Difficulty:**
```
# Track player hits in rolling window
playerHits = CircularBuffer(size: adaptiveWindow)

# Calculate player success rate
playerHitRate = playerHits.count(true) / adaptiveWindow

# Adjust AI speed based on player performance
if playerHitRate > 0.7:  // Player doing well
  speedMultiplier = 1 + ((playerHitRate - 0.7) / 0.3) * 0.5
  # AI attacks 1.0x to 1.5x faster
elif playerHitRate < 0.3:  // Player struggling
  speedMultiplier = 0.5 + (playerHitRate / 0.3) * 0.5
  # AI attacks 0.5x to 1.0x speed
else:
  speedMultiplier = 1.0

adjustedAttackInterval = baseAttackInterval / speedMultiplier
adjustedReactionTime = baseReactionTime / speedMultiplier
```

**Taunt System:**
```
# Trigger conditions
if difficultyIncreased:
  showTaunt("You're getting better! Time to step it up!")
elif playerCombo > 5:
  showTaunt("Nice combo! But can you keep it up?")
elif aiCombo > 5:
  showTaunt("Is that all you got?")
elif playerHealth < 20:
  showTaunt("One more hit should do it!")

# Display for 2-3 seconds in speech bubble
tauntTimer = 2500 + random(500)
```

**Dependencies:**
- Game_Engine (consumes GameState, emits AI moves)

**Error Handling:**
- Invalid move selection → Fall back to JAB
- Timer overflow → Reset to baseline interval

### Renderer

**Responsibility:** Draw stick figures, UI elements, debug overlay on HTML5 Canvas.

**Interface:**
```typescript
interface Renderer {
  // Initialize canvas and rendering context
  initialize(canvas: HTMLCanvasElement): void;
  
  // Draw complete frame
  render(state: RenderState): void;
  
  // Draw debug overlay with landmarks and thresholds
  drawDebugOverlay(debug: DebugData): void;
  
  // Draw fighter stick figure
  drawFighter(fighter: FighterRenderData): void;
  
  // Draw UI elements (health bars, stamina bars, timer, score)
  drawUI(ui: UIData): void;
  
  // Apply screen shake effect
  applyScreenShake(intensity: number, duration: number): void;
  
  // Enable/disable debug mode
  setDebugMode(enabled: boolean): void;
}

interface RenderState {
  fighters: {
    player: FighterRenderData;
    ai: FighterRenderData;
  };
  ui: UIData;
  effects: EffectData[];
  debug?: DebugData;
}

interface FighterRenderData {
  bodyParts: {
    head: { x: number; y: number; rotation: number };
    torso: { x: number; y: number; rotation: number };
    leftArm: { x: number; y: number; rotation: number };
    rightArm: { x: number; y: number; rotation: number };
    leftLeg: { x: number; y: number; rotation: number };
    rightLeg: { x: number; y: number; rotation: number };
  };
  color: string;
  currentMove: MoveType;
}

interface UIData {
  playerHealth: number;
  aiHealth: number;
  playerStamina: number;
  aiStamina: number;
  roundTimer: number;
  playerScore: number;
  aiScore: number;
  playerCombo: number;
  aiCombo: number;
  tauntText?: string;
}

interface DebugData {
  landmarks: Landmarks;
  detectedMoves: DetectedMove[];
  baseline: BaselineData;
  thresholds: ThresholdConfig;
  cooldowns: { [key in MoveType]: number };
  fps: number;
}
```

**Key Rendering:**

**Stick Figure Drawing:**
```
# Draw each body part as line segments
function drawFighter(fighter):
  ctx.strokeStyle = fighter.color
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  
  # Head (circle)
  drawCircle(fighter.head.x, fighter.head.y, HEAD_RADIUS)
  
  # Torso (line from shoulders to hips)
  drawLine(shoulderCenter, hipCenter)
  
  # Arms (two segments: shoulder-elbow, elbow-wrist)
  drawLine(leftShoulder, leftElbow)
  drawLine(leftElbow, leftWrist)
  drawLine(rightShoulder, rightElbow)
  drawLine(rightElbow, rightWrist)
  
  # Legs (two segments: hip-knee, knee-ankle)
  drawLine(leftHip, leftKnee)
  drawLine(leftKnee, leftAnkle)
  drawLine(rightHip, rightKnee)
  drawLine(rightKnee, rightAnkle)
  
  # Highlight active move with glow effect
  if fighter.currentMove != NONE:
    applyGlowEffect(fighter.currentMove)
```

**UI Bar Drawing:**
```
function drawHealthBar(x, y, width, height, healthPercent, label):
  # Background
  ctx.fillStyle = '#333'
  ctx.fillRect(x, y, width, height)
  
  # Health fill (color gradient: green → yellow → red)
  fillWidth = width * healthPercent
  ctx.fillStyle = getHealthColor(healthPercent)
  ctx.fillRect(x, y, fillWidth, height)
  
  # Border
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, width, height)
  
  # Label
  ctx.fillStyle = '#fff'
  ctx.font = '14px Arial'
  ctx.fillText(label, x, y - 5)
```

**Debug Overlay:**
```
function drawDebugOverlay(debug):
  # Draw pose landmarks
  for landmark in debug.landmarks.points:
    if landmark.visibility > VISIBILITY_THRESHOLD:
      drawCircle(landmark.x, landmark.y, 3, '#0f0')
    else:
      drawCircle(landmark.x, landmark.y, 3, '#f00')
  
  # Draw skeleton lines connecting joints
  drawSkeletonLines(debug.landmarks)
  
  # Draw text overlay with values
  textY = 20
  ctx.fillStyle = '#fff'
  ctx.font = '12px monospace'
  ctx.fillText(`FPS: ${debug.fps}`, 10, textY); textY += 15
  ctx.fillText(`Detected: ${debug.detectedMoves}`, 10, textY); textY += 15
  
  for move in MoveType:
    cooldownRemaining = debug.cooldowns[move]
    ctx.fillText(`${move}: ${cooldownRemaining}ms`, 10, textY)
    textY += 15
  
  # Draw baseline reference lines
  drawLine(baseline.leftShoulder, baseline.rightShoulder, '#ff0')
  drawCircle(baseline.centerPosition.x, baseline.centerPosition.y, 5, '#ff0')
```

**Screen Shake:**
```
function applyScreenShake(intensity, duration):
  shakeOffset.x = random(-intensity, intensity)
  shakeOffset.y = random(-intensity, intensity)
  
  ctx.translate(shakeOffset.x, shakeOffset.y)
  
  # Decay shake over duration
  intensity *= 0.9
  if duration <= 0:
    shakeOffset = {x: 0, y: 0}
```

**Dependencies:**
- HTML5 Canvas API
- Game_Engine (consumes game state)
- Pose_Detector (consumes landmarks for debug overlay)

**Error Handling:**
- Canvas context loss → Attempt to restore, fall back to error message
- Invalid body part positions → Skip drawing that part, log warning
- Text rendering overflow → Truncate or wrap text

### Audio_Manager

**Responsibility:** Play sound effects using Web Audio API.

**Interface:**
```typescript
interface AudioManager {
  // Initialize Web Audio context
  initialize(): Promise<void>;
  
  // Load sound effect files
  loadSounds(soundUrls: { [key: string]: string }): Promise<void>;
  
  // Play sound effect
  playSound(soundName: string, volume?: number): void;
  
  // Stop all sounds
  stopAll(): void;
  
  // Set master volume
  setVolume(volume: number): void;
}
```

**Key Methods:**

- `initialize()`: Creates AudioContext, sets up master gain node
- `loadSounds()`: Fetches audio files, decodes to audio buffers, stores in cache
- `playSound()`: Creates buffer source node, connects to master gain, plays immediately

**Dependencies:**
- Web Audio API (native browser)
- Audio files (sourced from free libraries like freesound.org)

**Error Handling:**
- Audio context suspended (mobile autoplay policy) → Resume on first user interaction
- Sound file load failure → Silently fail (game continues without audio)
- Decode error → Log warning, skip that sound

## Data Models

### Pose Data

```typescript
interface Landmarks {
  points: Landmark[];    // Array of 33 landmarks from MediaPipe
  timestamp: number;     // Frame timestamp
}

interface Landmark {
  x: number;            // Normalized 0-1 (0=left edge, 1=right edge)
  y: number;            // Normalized 0-1 (0=top edge, 1=bottom edge)
  z: number;            // Depth estimate (negative=toward camera)
  visibility: number;   // Confidence 0-1
}

// Key landmark indices (MediaPipe Pose)
const LANDMARK_INDICES = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};
```

### Fighter State

```typescript
interface FighterState {
  // Vital stats
  health: number;            // 0-100
  stamina: number;           // 0-100
  
  // Position and movement
  position: {
    x: number;               // Arena x-coordinate
    y: number;               // Arena y-coordinate (ground level)
    depth: number;           // Z-depth for 2.5D positioning
  };
  
  velocity: {
    x: number;               // Horizontal speed
    y: number;               // Vertical speed (for knockback)
  };
  
  // Animation and state
  currentMove: MoveType;
  animationState: AnimationState;
  animationFrame: number;    // Current frame in animation
  
  // Combat status
  isBlocking: boolean;
  isKnockedOut: boolean;
  isStunned: boolean;
  stunDuration: number;      // Milliseconds remaining
  
  // Physics body reference
  physicsBody: FighterBody;
}

enum AnimationState {
  IDLE = 'idle',
  JAB = 'jab',
  POWER_PUNCH = 'power_punch',
  DUCK = 'duck',
  BLOCK = 'block',
  CHARGE_PREP = 'charge_prep',
  CHARGE_RELEASE = 'charge_release',
  HIT_REACT = 'hit_react',
  KNOCKED_DOWN = 'knocked_down',
}
```

### Game State

```typescript
interface GameState {
  // Fighters
  playerFighter: FighterState;
  aiFighter: FighterState;
  
  // Round management
  roundNumber: number;
  roundTimer: number;        // Milliseconds remaining
  roundDuration: number;     // Total round length (ms)
  matchState: MatchState;
  
  // Scoring
  playerScore: number;
  aiScore: number;
  playerCombo: number;       // Current combo count
  aiCombo: number;
  playerMaxCombo: number;    // Best combo this match
  aiMaxCombo: number;
  
  // Match history
  roundsWon: {
    player: number;
    ai: number;
  };
  
  // Configuration
  config: GameConfig;
}

interface GameConfig {
  roundDuration: number;     // e.g., 90000 (90 seconds)
  roundsToWin: number;       // e.g., 2 (best of 3)
  
  // Damage values
  jabDamage: number;
  powerPunchDamage: number;
  chargeDamage: number;
  blockReduction: number;    // e.g., 0.3 (70% reduction)
  
  // Stamina values
  staminaGainPerHit: number;
  staminaCostJab: number;
  staminaCostPowerPunch: number;
  staminaCostDuck: number;
  staminaCostBlockPerSec: number;
  staminaCostCharge: number;
  staminaRegenRate: number;  // Per second
  
  // Scoring
  pointsJabHit: number;
  pointsPowerPunchHit: number;
  pointsChargeHit: number;
  comboMultiplier: number;   // e.g., 0.2 (+20% per combo)
  roundWinBonus: number;
}
```

### Baseline Calibration Data

```typescript
interface BaselineData {
  // Center reference point (average of shoulders)
  centerPosition: {
    x: number;
    y: number;
  };
  
  // Body measurements
  shoulderWidth: number;        // Distance between shoulders
  headHeight: number;           // Vertical position of head
  armLength: number;            // Average reach
  
  // Baseline joint positions (for delta calculations)
  leftWristBaseline: {
    x: number;
    y: number;
    z: number;
  };
  
  rightWristBaseline: {
    x: number;
    y: number;
    z: number;
  };
  
  shoulderHeightBaseline: number;
  
  // Calibration quality metrics
  frameCount: number;           // Number of frames averaged
  confidence: number;           // 0-1 quality score
  timestamp: number;            // When calibration completed
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Joint Distance Non-Negativity

*For any* two joint landmarks from the same frame, the Euclidean distance between them SHALL be non-negative.

**Validates: Requirements 21.1**

### Property 2: Joint Angle Validity

*For any* three joint landmarks forming an angle (e.g., shoulder-elbow-wrist), the calculated angle SHALL be within the range [0°, 180°] for external angles.

**Validates: Requirements 21.2**

### Property 3: Baseline-Relative Position Directionality

*For any* joint landmark, when moved in a direction relative to baseline, the computed delta vector SHALL point in the same direction as the movement.

**Validates: Requirements 21.3**

### Property 4: Stamina Bounds Maintenance

*For any* sequence of moves, hits, and regeneration events, the stamina value SHALL remain within the range [0, 100] at all times.

**Validates: Requirements 22.1, 22.2, 22.3, 22.6**

### Property 5: Charge Attack Gating

*For any* charge attack gesture, the Move_Recognizer SHALL detect a charge attack if and only if stamina is greater than or equal to the charge stamina threshold.

**Validates: Requirements 22.4, 22.5**

### Property 6: Cooldown Enforcement

*For any* move type with a cooldown, once detected, the Move_Recognizer SHALL NOT detect another instance of that move type until the cooldown period has elapsed.

**Validates: Requirements 4.2, 4.3, 5.2, 5.3, 6.3, 6.4, 8.4, 8.5, 20.6**

### Property 7: Smoothing Increases Stability

*For any* sequence of raw landmark positions with jitter, applying smoothing SHALL produce output positions with lower variance than the input (metamorphic property).

**Validates: Requirements 3.2**

### Property 8: Damage Monotonicity

*For any* two move types A and B where A has higher base damage than B, a successful unblocked hit with A SHALL reduce defender health by at least as much as an unblocked hit with B.

**Validates: Requirements 15.4, 15.5**

### Property 9: Block Reduces Damage

*For any* incoming attack, if the defender is blocking, the damage received SHALL be less than the damage that would be received without blocking.

**Validates: Requirements 15.6**

### Property 10: Health Monotonicity

*For any* fighter, health SHALL never increase during a round (only decrease from damage or remain constant).

**Validates: Requirements 11.1, 11.7**

## Error Handling

### Webcam Access Denial

**Scenario:** User denies camera permission or camera is unavailable.

**Handling:**
1. Display clear error message: "Camera access is required to play. Please allow camera access and reload."
2. Show retry button that re-requests permission
3. Provide fallback option: "Test with Keyboard Controls" (development mode only)

**Recovery:** Require page reload after permission granted due to MediaPipe initialization requirements.

### MediaPipe Initialization Failure

**Scenario:** MediaPipe library fails to load or initialize (network error, incompatible browser).

**Handling:**
1. Log error details to console
2. Display user-friendly error: "Failed to load pose detection. Please check your internet connection and try again."
3. In development: Offer mock data mode that generates synthetic landmarks for testing

**Recovery:** Retry initialization with exponential backoff (1s, 2s, 4s delays).

### Low Visibility Frame Filtering

**Scenario:** Camera quality degrades or user moves out of frame, causing landmark visibility to drop below threshold.

**Handling:**
1. Skip move detection for frames where key joints have visibility < 0.5
2. Continue using last known good smoothed positions for rendering
3. If low visibility persists > 2 seconds:
   - Pause game if in active round
   - Display warning: "Can't see you clearly. Please adjust lighting or camera position."
   - Show silhouette outline indicating where user should be positioned

**Recovery:** Resume automatically when visibility returns above threshold.

### Missing Landmark During Calibration

**Scenario:** User is not in proper guard position or key landmarks are occluded during calibration.

**Handling:**
1. Display real-time feedback on which joints are missing/low visibility
2. Show visual guide with stick figure demonstrating correct guard position
3. Exclude frames with missing landmarks from baseline averaging
4. If < 15 frames collected after 2 seconds:
   - Extend calibration period to 3 seconds
   - Display encouraging message: "Hold steady... almost there!"
5. If still insufficient after 3 seconds:
   - Abort calibration
   - Display error: "Calibration failed. Make sure your upper body is fully visible."
   - Provide retry button

**Recovery:** Allow unlimited calibration retries.

### Tracking Loss During Moves

**Scenario:** Rapid movements cause pose estimation to fail mid-move.

**Handling:**
1. Detect tracking loss: no valid landmarks for 3+ consecutive frames
2. Immediately stop move detection
3. Clear active move state (no partial moves credited)
4. Continue attempting to re-acquire pose
5. If tracking lost > 1 second during active round:
   - Pause round timer
   - Display: "Lost tracking. Get back in position."
6. Resume when tracking restored for 5 consecutive frames

**Recovery:** Automatic resume on tracking restoration; no calibration reset required unless tracking lost > 10 seconds.

### Physics Body Position NaN

**Scenario:** Matter.js simulation produces invalid positions (NaN/Infinity) due to extreme forces.

**Handling:**
1. Detect invalid positions in Physics_Engine update loop
2. Log error with physics state snapshot
3. Reset affected fighter to safe position:
   - Player: left side, standing pose
   - AI: right side, standing pose
4. Zero out velocities and angular momentum
5. Briefly pause physics simulation (100ms) to stabilize

**Recovery:** Automatic recovery with position reset; no game state loss.

### Audio Context Suspended (Mobile Autoplay Policy)

**Scenario:** Browser blocks audio playback due to autoplay restrictions.

**Handling:**
1. Detect suspended audio context on initialization
2. Register touch/click listener on entire document
3. On first user interaction:
   - Resume audio context
   - Play silent buffer to "unlock" audio
4. Silently continue if audio remains unavailable (game playable without sound)

**Recovery:** Automatic on first user interaction; graceful degradation if audio unavailable.

### Frame Rate Drop Below Threshold

**Scenario:** Device cannot maintain target 20-30 fps.

**Handling:**
1. Monitor rolling average FPS over 2-second window
2. If FPS < 15 sustained:
   - Reduce physics solver iterations: 6 → 4 → 2
   - Disable non-critical visual effects (particles, glow)
   - Reduce MediaPipe model complexity (lite → ultra-lite if available)
3. Display performance warning: "Performance issues detected. Try closing other apps."
4. Log device info for debugging

**Recovery:** Restore full quality if FPS recovers above 20 for 5+ seconds.

### Arena Boundary Violation

**Scenario:** Fighter position exceeds arena boundaries due to extreme knockback.

**Handling:**
1. Clamp position to arena bounds + small margin
2. Apply bounce-back force proportional to boundary violation
3. If violation exceeds 2x margin (catastrophic physics failure):
   - Perform full physics reset for that fighter
   - Reset to safe position with zero velocity

**Recovery:** Automatic clamping and physics correction.

## Testing Strategy

### Unit Testing Approach

Unit tests focus on specific examples, edge cases, and integration points between components:

**Move Detector Unit Tests** (Requirements 20.1-20.7):
- Test each move type (jab, power punch, duck, block, charge) with recorded landmark sequences
- Verify threshold enforcement: moves trigger only when delta exceeds threshold
- Verify cooldown behavior: moves cannot re-trigger during cooldown period
- Test edge cases: incomplete gestures, conflicting moves, missing landmarks

**Calibrator Unit Tests**:
- Test guard position detection with valid and invalid poses
- Verify baseline averaging with synthetic landmark data
- Test incomplete calibration rejection

**Joint Geometry Unit Tests**:
- Test distance calculation between known joint positions
- Test angle calculation for specific joint triplets
- Verify normalization of screen coordinates to world coordinates

**Stamina Unit Tests**:
- Test stamina increase after landing hits (various move types)
- Test stamina decrease after performing moves
- Test passive regeneration over time
- Test charge attack blocking when stamina below threshold
- Verify stamina clamping to [0, 100] range

**Damage Calculation Unit Tests**:
- Test base damage amounts for each move type
- Test damage reduction when blocking
- Verify damage monotonicity: charge > power > jab
- Test health clamping to [0, 100] range

**Scoring Unit Tests**:
- Test point awarding for successful hits
- Test combo multiplier calculation
- Test round win bonus application

**Integration Tests**:
- End-to-end calibration → move detection flow
- Full round simulation: moves → damage → health → round end
- AI behavior responding to game state changes

### Property-Based Testing Approach

**Testing Library:** fast-check (JavaScript property-based testing library)

**Property Test Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with reference to design property

**Property 1: Joint Distance Non-Negativity**
```typescript
// Feature: possessed-brawl, Property 1: Joint Distance Non-Negativity
test('joint distances are always non-negative', () => {
  fc.assert(
    fc.property(
      arbitraryLandmarkPair(),
      (pair) => {
        const distance = euclideanDistance(pair.landmark1, pair.landmark2);
        return distance >= 0;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 2: Joint Angle Validity**
```typescript
// Feature: possessed-brawl, Property 2: Joint Angle Validity
test('joint angles remain in valid range', () => {
  fc.assert(
    fc.property(
      arbitraryJointTriplet(),
      (triplet) => {
        const angle = calculateAngle(triplet.joint1, triplet.joint2, triplet.joint3);
        return angle >= 0 && angle <= 180;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 3: Baseline-Relative Position Directionality**
```typescript
// Feature: possessed-brawl, Property 3: Baseline-Relative Position Directionality
test('delta vectors preserve movement direction', () => {
  fc.assert(
    fc.property(
      arbitraryBaselineAndMovement(),
      (data) => {
        const delta = computeDelta(data.currentPos, data.baseline);
        const dotProduct = delta.x * data.movementDir.x + delta.y * data.movementDir.y;
        return dotProduct >= 0; // Same direction
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 4: Stamina Bounds Maintenance**
```typescript
// Feature: possessed-brawl, Property 4: Stamina Bounds Maintenance
test('stamina remains in [0, 100] range', () => {
  fc.assert(
    fc.property(
      arbitraryGameEventSequence(),
      (events) => {
        const fighter = createFighter();
        for (const event of events) {
          applyEvent(fighter, event);
        }
        return fighter.stamina >= 0 && fighter.stamina <= 100;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 5: Charge Attack Gating**
```typescript
// Feature: possessed-brawl, Property 5: Charge Attack Gating
test('charge attack only detected when stamina sufficient', () => {
  fc.assert(
    fc.property(
      arbitraryChargeGestureAndStamina(),
      (data) => {
        const moveDetected = moveRecognizer.detectMoves(
          data.landmarks,
          data.baseline,
          data.stamina
        ).includes(MoveType.CHARGE);
        
        if (data.stamina >= CHARGE_STAMINA_THRESHOLD) {
          // Should detect if gesture valid
          return moveDetected === data.gestureIsValid;
        } else {
          // Should never detect regardless of gesture
          return !moveDetected;
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 6: Cooldown Enforcement**
```typescript
// Feature: possessed-brawl, Property 6: Cooldown Enforcement
test('moves respect cooldown periods', () => {
  fc.assert(
    fc.property(
      arbitraryMoveTypeAndTimingSequence(),
      (data) => {
        const detector = createMoveRecognizer();
        let lastDetectionTime = -Infinity;
        
        for (const event of data.events) {
          detector.updateCooldowns(event.deltaTime);
          const moves = detector.detectMoves(event.landmarks, data.baseline);
          
          if (moves.includes(data.targetMoveType)) {
            const timeSinceLastDetection = event.timestamp - lastDetectionTime;
            // Must respect cooldown
            if (lastDetectionTime !== -Infinity) {
              expect(timeSinceLastDetection).toBeGreaterThanOrEqual(
                COOLDOWNS[data.targetMoveType]
              );
            }
            lastDetectionTime = event.timestamp;
          }
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 7: Smoothing Increases Stability**
```typescript
// Feature: possessed-brawl, Property 7: Smoothing Increases Stability
test('smoothing reduces landmark variance', () => {
  fc.assert(
    fc.property(
      arbitraryJitteryLandmarkSequence(),
      (sequence) => {
        const rawVariance = calculateVariance(sequence);
        const smoothed = applySmoothingSequence(sequence, ALPHA);
        const smoothedVariance = calculateVariance(smoothed);
        
        return smoothedVariance < rawVariance;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 8: Damage Monotonicity**
```typescript
// Feature: possessed-brawl, Property 8: Damage Monotonicity
test('higher tier moves deal more damage', () => {
  fc.assert(
    fc.property(
      arbitraryFighterState(),
      (defender) => {
        const jabDamage = calculateDamage(MoveType.JAB, false, defender);
        const powerDamage = calculateDamage(MoveType.POWER_PUNCH, false, defender);
        const chargeDamage = calculateDamage(MoveType.CHARGE, false, defender);
        
        return chargeDamage >= powerDamage && powerDamage >= jabDamage;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 9: Block Reduces Damage**
```typescript
// Feature: possessed-brawl, Property 9: Block Reduces Damage
test('blocking reduces incoming damage', () => {
  fc.assert(
    fc.property(
      arbitraryMoveTypeAndDefender(),
      (data) => {
        const unblockedDamage = calculateDamage(data.moveType, false, data.defender);
        const blockedDamage = calculateDamage(data.moveType, true, data.defender);
        
        return blockedDamage < unblockedDamage;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 10: Health Monotonicity**
```typescript
// Feature: possessed-brawl, Property 10: Health Monotonicity
test('health never increases during round', () => {
  fc.assert(
    fc.property(
      arbitraryCombatEventSequence(),
      (events) => {
        const fighter = createFighter();
        const healthHistory = [fighter.health];
        
        for (const event of events) {
          applyEvent(fighter, event);
          healthHistory.push(fighter.health);
        }
        
        // Check monotonicity: each health value <= previous
        for (let i = 1; i < healthHistory.length; i++) {
          if (healthHistory[i] > healthHistory[i - 1]) {
            return false;
          }
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Arbitrary Generators:**

The property tests rely on custom generators that produce valid test inputs:

```typescript
// Generate random landmark with valid ranges
function arbitraryLandmark() {
  return fc.record({
    x: fc.double({ min: 0, max: 1 }),
    y: fc.double({ min: 0, max: 1 }),
    z: fc.double({ min: -1, max: 1 }),
    visibility: fc.double({ min: 0, max: 1 })
  });
}

// Generate pair of landmarks
function arbitraryLandmarkPair() {
  return fc.record({
    landmark1: arbitraryLandmark(),
    landmark2: arbitraryLandmark()
  });
}

// Generate triplet for angle calculations
function arbitraryJointTriplet() {
  return fc.record({
    joint1: arbitraryLandmark(),
    joint2: arbitraryLandmark(),
    joint3: arbitraryLandmark()
  });
}

// Generate sequence of game events (hits, moves, time passing)
function arbitraryGameEventSequence() {
  return fc.array(
    fc.oneof(
      fc.record({ type: fc.constant('hit'), moveType: arbitraryMoveType() }),
      fc.record({ type: fc.constant('move'), moveType: arbitraryMoveType() }),
      fc.record({ type: fc.constant('idle'), duration: fc.integer({ min: 0, max: 5000 }) })
    ),
    { minLength: 1, maxLength: 50 }
  );
}

// Generate jittery landmark sequence (for smoothing test)
function arbitraryJitteryLandmarkSequence() {
  return fc.array(arbitraryLandmark(), { minLength: 10, maxLength: 100 })
    .map(landmarks => 
      landmarks.map(lm => ({
        ...lm,
        x: lm.x + fc.sample(fc.double({ min: -0.02, max: 0.02 }), 1)[0],
        y: lm.y + fc.sample(fc.double({ min: -0.02, max: 0.02 }), 1)[0]
      }))
    );
}
```

### Manual Testing

**Stage 1 Manual Test Cases:**
1. Camera permission flow on mobile Safari and Chrome
2. Calibration with various body sizes and camera angles
3. Move detection accuracy in different lighting conditions
4. Debug overlay readability on mobile screen sizes
5. Threshold tuning for different player heights
6. Landscape orientation enforcement
7. Performance profiling at target frame rate

**Stage 2 Manual Test Cases:**
1. Combat feel and hit detection responsiveness
2. AI difficulty progression feeling fair
3. Stamina management and charge attack timing
4. Health bar visibility and clarity
5. Round end conditions and scoring accuracy
6. Screen shake and hit-stop impact

**Stage 3 Manual Test Cases:**
1. Audio synchronization with hits
2. Visual polish and particle effects
3. Overall game flow and pacing
4. Taunt text readability and timing

### Testing Tools and Infrastructure

- **Unit Testing:** Vitest or Jest
- **Property Testing:** fast-check
- **Browser Testing:** Playwright for cross-browser compatibility
- **Performance Testing:** Chrome DevTools Performance panel, Lighthouse
- **Coverage:** Aim for 80%+ coverage on business logic (move detection, game engine, scoring)

## Stage 1 Implementation Focus

Stage 1 delivers a functional pose input system with visual feedback, stopping before full game implementation to validate the core mechanic.

### Stage 1 Deliverables

**Components Implemented:**
- Pose_Detector (full implementation)
- Calibrator (full implementation)
- Move_Recognizer (full implementation with all 5 move types)
- Renderer (debug overlay only)

**Components Deferred to Stage 2:**
- Game_Engine
- Physics_Engine
- AI_Controller
- Audio_Manager
- Renderer (game graphics)

**Stage 1 Features:**
1. Webcam initialization with permission handling
2. MediaPipe Pose integration and landmark extraction
3. Joint position smoothing with EMA filter (alpha=0.3)
4. Calibration flow with visual guide
5. Move detection for all 5 move types (jab, power punch, duck, block, charge)
6. Debug overlay showing:
   - Live pose landmarks
   - Detected move names
   - Raw joint positions
   - Threshold values
   - Cooldown timers
   - Stamina meter (simulated, not yet game-integrated)

**Stage 1 User Experience:**
1. User loads page in mobile browser (landscape)
2. Camera permission prompt appears
3. Calibration screen shows with instructions and stick figure guide
4. User assumes guard position
5. System detects guard position and shows confirmation
6. 1-second calibration period records baseline
7. Debug overlay appears showing live pose and move detection
8. User performs gestures and sees moves detected in real-time
9. Threshold sliders allow tuning sensitivity

**Stage 1 Success Criteria:**
- Pose detection maintains 20-30 fps on target mobile devices
- Move detection feels responsive (<200ms latency from gesture to detection)
- False positive rate <5% (moves don't trigger unintentionally)
- False negative rate <10% (intentional moves are detected)
- User can complete calibration successfully within 3 attempts
- Debug overlay clearly shows all relevant information

**Stage 1 Testing:**
- Unit tests for move detection algorithms (Requirements 20.1-20.7)
- Property tests for joint geometry (Properties 1-3, 7)
- Property tests for stamina bounds (Properties 4-5)
- Property test for cooldown enforcement (Property 6)
- Manual testing on target mobile devices

### Stage 1 to Stage 2 Transition

After Stage 1 completion, implementation pauses for user review and approval. The user will:
1. Test pose detection and move recognition on their mobile device
2. Verify move detection accuracy and responsiveness
3. Tune thresholds if needed
4. Approve progression to Stage 2 (game engine and combat)

This gate ensures the core mechanic is solid before investing in game logic, physics, and visual polish.

## Additional Design Decisions and Rationales

### Why MediaPipe Pose Over Alternatives?

- **TensorFlow.js PoseNet**: Less accurate, older model, limited to 17 landmarks
- **BlazePose (MediaPipe Pose)**: 33 landmarks, better accuracy, optimized for mobile, active Google support
- **Custom ML Model**: Would require training data, expertise, and time—impractical for hackathon timeline

**Decision:** Use MediaPipe Pose for proven mobile performance and rich landmark data.

### Why Matter.js Over Planck.js?

- **Planck.js**: Faithful Box2D port, more complex API, TypeScript focus
- **Matter.js**: Native JavaScript, simpler API, broader adoption (17.8k stars vs 4.8k), better documentation

**Decision:** Use Matter.js for ease of integration and community support. The simpler API will accelerate Stage 2 development.

### Why EMA with Alpha=0.3?

- Alpha too low (e.g., 0.1): Over-smoothed, laggy response, frustrating gameplay
- Alpha too high (e.g., 0.7): Under-smoothed, jittery, false positives
- Alpha=0.3: Balances responsiveness with noise reduction based on similar real-time tracking applications

**Decision:** Default alpha=0.3, but expose as tunable parameter for Stage 1 testing.

### Why Stop After Stage 1?

- **Risk Mitigation**: Pose detection is the highest-risk component (hardware variance, lighting, performance). Validating it first reduces wasted effort if it doesn't work.
- **Threshold Tuning**: Real-world testing will reveal necessary threshold adjustments that impact game design.
- **User Feedback**: Early validation ensures the control scheme feels good before building complex game systems on top of it.

**Decision:** Implement in stages with explicit user approval gates to de-risk the project.

### Why Stick Figures Instead of Sprites?

- **Performance**: Rendering simple lines and circles is much faster than sprite animation, critical for 20-30 fps target on mobile
- **Development Speed**: No sprite creation or animation needed for hackathon timeline
- **Aesthetic**: Stick figures create a minimalist, arcade-style aesthetic that fits the "Kiroween hackathon" vibe

**Decision:** Use stick figures for Stage 2, potentially upgrade to simple sprites in Stage 3 if performance budget allows.

### Why Web Audio API Instead of HTML5 Audio?

- **HTML5 Audio**: Simple but limited, higher latency, no processing capabilities
- **Web Audio API**: Low latency, precise timing, spatial audio, effects processing, better mobile support

**Decision:** Use Web Audio API for professional-quality audio and low latency hit sounds.

### Why Landscape Orientation?

- **Webcam Coverage**: Landscape orientation captures more horizontal space, allowing players to move arms side-to-side without going out of frame
- **UI Layout**: More space for side-by-side fighter display with health/stamina bars
- **Mobile Gaming Norm**: Fighting games traditionally use landscape orientation

**Decision:** Enforce landscape with CSS and viewport meta tags, block portrait mode with user message.

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Draft - Pending Stage 1 Implementation
