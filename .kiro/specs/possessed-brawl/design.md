# Design Document: Spell Duel

## Overview

Spell Duel is a browser-based wizard duel controlled through webcam pose detection. The system captures player movements via MediaPipe Pose and translates hand gestures into spell casting using the $1 Unistroke Recognizer. The player stands waist-up, raises their off-hand to ready a spell, draws a shape in the air with their wand hand, and lowers the off-hand to cast.

The project targets mobile devices (Chrome v100+, Safari v15+) running in landscape orientation (HTTP for local development, HTTPS for mobile device testing) at 20-30 fps.

The design follows a three-stage implementation plan:
1. **Stage 1 (Initial Implementation)**: Pose input, calibration, wand selection, gesture recognition, spell casting checkpoint with placeholder effects
2. **Stage 2**: Game engine with wizard duel, AI opponent, mana/health, spell effects and counters, round timer
3. **Stage 3**: Visual and audio polish with procedural effects

This document emphasizes Stage 1 architecture since implementation will pause after this stage for user confirmation before proceeding to Stage 2.

### Key Technologies

- **MediaPipe Pose (JavaScript)**: Real-time body landmark detection ([MediaPipe Pose Landmarker](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker))
- **$1 Unistroke Recognizer**: Shape recognition algorithm (implemented from scratch, no dependencies)
- **Web Audio API**: Browser-native procedural sound effect playback
- **HTML5 Canvas**: 2D rendering with requestAnimationFrame
- **Vanilla JavaScript/TypeScript**: No framework dependency to minimize bundle size and maximize mobile performance

### Research Summary

**MediaPipe Pose Performance**: MediaPipe Pose has been successfully deployed in browser-based fitness and pose tracking applications achieving 25-60 FPS on consumer hardware. The library extracts 33 body landmarks including the critical joints needed for this game (wrists, shoulders, head). It runs entirely client-side with no server dependency.

**$1 Unistroke Recognizer**: Published by Jacob O. Wobbrock, Andrew D. Wilson, and Yang Li in 2007. A simple, rotation/scale/position-invariant gesture recognizer requiring only ~100 lines of code. Resample → rotate → scale → translate → compare. Proven effective for single-stroke shape recognition with 97%+ accuracy on standard gesture datasets.

**EMA Filtering**: Exponential Moving Average (EMA) with alpha around 0.3 provides a good balance—small enough to smooth jittery webcam input but large enough to remain responsive to intentional movements.

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application Layer                        │
│  - Initialization and lifecycle management                       │
│  - Component wiring and event flow                               │
│  - Main game loop coordination                                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ Pose_Detector│         │  Calibrator  │         │Stroke_Capture│
│              │────────▶│              │────────▶│              │
│ - Webcam     │         │ - Wand hand  │         │ - Off-hand   │
│   capture    │         │   selection  │         │   ready/cast │
│ - MediaPipe  │         │ - Baseline   │         │ - Wand trail │
│   processing │         │   recording  │         │   recording  │
│ - Landmark   │         │ - Resting    │         │ - Cancel     │
│   extraction │         │   wrist pos  │         │   detection  │
└──────────────┘         └──────────────┘         └──────────────┘
        │                                                  │
        │                                                  │
        └──────────────────┬───────────────────────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │   Gesture    │
                  │  Recognizer  │
                  │              │
                  │ - $1 algo    │
                  │ - Template   │
                  │   matching   │
                  │ - Training   │
                  └──────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │  Game_Engine │
                  │              │
                  │ - Wizard     │
                  │   state      │
                  │ - Health &   │
                  │   mana       │
                  │ - Spell      │
                  │   resolution │
                  │ - Scoring    │
                  └──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Spell_System  │  │ AI_Wizard    │  │Audio_Manager │
│              │  │              │  │              │
│ - Mana costs │  │ - Weighted   │  │ - Procedural │
│ - Damage     │  │   spell pick │  │   sounds     │
│ - Counter    │  │ - Adaptive   │  │ - Web Audio  │
│   table      │  │   difficulty │  │   API        │
│ - Effects    │  │ - Taunts     │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │   Renderer   │
                  │              │
                  │ - Stick      │
                  │   wizards    │
                  │ - Wand trail │
                  │ - Rune glow  │
                  │ - Spell      │
                  │   sigils     │
                  │ - Debug      │
                  │   overlay    │
                  └──────────────┘
```

### Module Interfaces and Data Flow

#### Stage 1 Data Flow (Spell Casting Checkpoint)

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
Calibrator.selectWandHand(landmarks)
    │
    ├─▶ WandHand (LEFT or RIGHT)
    │
    ▼
Calibrator.recordBaseline(landmarks)
    │
    ├─▶ BaselineData (centerPos, shoulderWidth, headHeight, wandWristBaseline)
    │
    ▼
Stroke_Capture.updateOffHandState(landmarks, baseline)
    │
    ├─▶ OffHandState (IDLE, READY_ARMING, READY_ARMED, CAST, CANCEL)
    │
    ▼
Stroke_Capture.recordWandPosition(landmarks, baseline)
    │
    ├─▶ Stroke (array of {x, y} points)
    │
    ▼
Gesture_Recognizer.recognize(stroke)
    │
    ├─▶ RecognizedSpell (type, confidence)
    │
    ▼
Renderer.displaySpellResult(spell)
    │
    ├─▶ Visual output: spell name, confidence, shape overlay, placeholder effect
    │
    └─▶ Stage 1 checkpoint complete
```

#### Stage 2 Data Flow (Wizard Duel)

```
RecognizedSpell
    │
    ▼
Game_Engine.castPlayerSpell(spell)
    │
    ├─▶ Check mana, deduct cost
    │
    ▼
Spell_System.resolveSpell(spell, target)
    │
    ├─▶ Apply damage, check counters, apply effects
    │
    ▼
AI_Wizard.selectSpell(gameState)
    │
    ├─▶ AISpell (weighted pick, counter bias)
    │
    ▼
Game_Engine.castAISpell(spell)
    │
    ├─▶ WizardState updates (health, mana, active effects)
    │
    ▼
Audio_Manager.playSpellSound(spell.type)
    │
    ├─▶ Procedural sound playback
    │
    ▼
Renderer.drawGameState(wizards, UI, effects)
    │
    └─▶ Visual output on Canvas
```

### Technology Stack and Browser Compatibility

**Core Technologies:**
- **MediaPipe Pose v0.5+**: JavaScript library loaded via npm
- **$1 Recognizer**: Implemented from scratch (no dependencies)
- **Web Audio API**: Native browser API, procedural synthesis only
- **HTML5 Canvas**: 2D rendering context with hardware acceleration

**Target Browsers:**
- Chrome v100+ on Android (primary target)
- Safari v15+ on iOS (secondary target)
- HTTP for local development; HTTPS required for webcam access on mobile devices
- Landscape orientation enforced via CSS and viewport meta tags

**Performance Targets:**
- 20-30 fps on mid-range mobile devices (e.g., iPhone 12, Samsung Galaxy A52)
- MediaPipe processing: ~40-50ms per frame
- Rendering: remaining frame budget (~10-15ms)

**Mobile Optimizations:**
- Use MediaPipe "lite" model variant for reduced computational cost
- Minimize canvas redraws (only redraw changed regions in Stage 3)
- Disable high-precision timing and reduce landmark count where possible

## Components and Interfaces

### Pose_Detector

**Responsibility:** Capture webcam input, process frames through MediaPipe Pose, extract and smooth body landmarks.

**Interface:**
```typescript
interface PoseDetector {
  initialize(): Promise<void>;
  processFrame(): Promise<Landmarks | null>;
  smoothLandmarks(raw: Landmarks, previous: Landmarks): Landmarks;
  isLandmarkVisible(landmark: Landmark): boolean;
  dispose(): void;
}

interface Landmarks {
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
- `processFrame()`: Captures current video frame, runs pose estimation, extracts waist-up landmarks, filters by visibility threshold
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

**Responsibility:** Select wand hand, detect ready stance, record baseline pose measurements.

**Interface:**
```typescript
interface Calibrator {
  selectWandHand(): Promise<WandHand>;
  isInReadyStance(landmarks: Landmarks): boolean;
  startCalibration(): void;
  recordFrame(landmarks: Landmarks): void;
  finishCalibration(): BaselineData;
  getProgress(): number;
}

enum WandHand {
  LEFT = 'left',
  RIGHT = 'right'
}

interface BaselineData {
  wandHand: WandHand;
  centerPosition: { x: number; y: number };
  shoulderWidth: number;
  headHeight: number;
  wandWristBaseline: { x: number; y: number; z: number };
  offHandWristBaseline: { x: number; y: number; z: number };
}
```

**Key Methods:**

- `selectWandHand()`: Displays selection screen with left/right buttons, default right
- `isInReadyStance()`: Checks if off-hand is raised to shoulder height, wand hand relaxed
- `startCalibration()`: Resets frame buffer, starts 1-second timer
- `recordFrame()`: Adds landmark data to buffer for averaging
- `finishCalibration()`: Computes mean values across buffered frames for center position, shoulder width, head height, wand wrist baseline

**Dependencies:**
- Pose_Detector (consumes landmarks)

**Error Handling:**
- Incomplete calibration data → Reject and require re-calibration
- Landmark visibility drops during calibration → Exclude bad frames, extend calibration period if needed
- Ready stance not detected → Display coaching prompts with visual guide

### Stroke_Capture

**Responsibility:** Detect off-hand ready/cast/cancel gestures, record wand trail, manage stroke lifecycle.

**Interface:**
```typescript
interface StrokeCapture {
  updateOffHandState(landmarks: Landmarks, baseline: BaselineData): OffHandState;
  recordWandPosition(landmarks: Landmarks, baseline: BaselineData): void;
  getStroke(): Stroke | null;
  clearStroke(): void;
  getWandTrail(): TrailPoint[];
  setThresholds(config: StrokeCaptureConfig): void;
  getThresholds(): StrokeCaptureConfig;
}

enum OffHandState {
  IDLE = 'idle',
  READY_ARMING = 'ready_arming',
  READY_ARMED = 'ready_armed',
  CAST = 'cast',
  CANCEL = 'cancel'
}

interface Stroke {
  points: { x: number; y: number }[];
  timestamp: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;  // milliseconds since added, for fade-out
}

interface StrokeCaptureConfig {
  offHandRaiseThreshold: number;      // Y-position relative to shoulders
  armingDelay: number;                // Milliseconds to hold before arming
  hysteresisMargin: number;           // Threshold hysteresis to prevent flicker
  cancelHorizontalThreshold: number;  // Horizontal movement distance for cancel
  minStrokeLength: number;            // Minimum stroke length (Euclidean)
  minStrokeBoundingBox: number;       // Minimum bounding box size
  trailLagFrames: number;             // Visual lag for wand trail (frames)
  trailFadeDuration: number;          // Trail fade time (milliseconds)
}
```

**Key Algorithms:**

**Off-Hand State Machine:**
```
IDLE:
  - If off-hand wrist.y < shoulder.y - raiseThreshold → READY_ARMING
  - Start arming timer

READY_ARMING:
  - If off-hand drops below (threshold - hysteresis) → IDLE, reset timer
  - If timer reaches armingDelay → READY_ARMED

READY_ARMED:
  - Record wand position each frame
  - If off-hand drops below (threshold - hysteresis) → CAST, finalize stroke
  - If off-hand moves horizontally > cancelThreshold → CANCEL, discard stroke

CAST:
  - Stroke finalized and available via getStroke()
  - Return to IDLE next frame

CANCEL:
  - Stroke discarded
  - Return to IDLE next frame
```

**Wand Trail Recording:**
```
WHILE offHandState == READY_ARMED:
  wandPos = landmarks.points[WAND_WRIST_INDEX]
  stroke.points.push({ x: wandPos.x, y: wandPos.y })
  
  # Visual trail with lag
  trailBuffer.push({ x: wandPos.x, y: wandPos.y, age: 0 })
  
  # Update ages and remove old points
  FOR point IN trailBuffer:
    point.age += deltaTime
    IF point.age > trailFadeDuration:
      trailBuffer.remove(point)
```

**Dependencies:**
- Calibrator (consumes BaselineData)
- Pose_Detector (consumes Landmarks)

**Error Handling:**
- Missing landmarks → Skip frame, maintain last state
- Stroke below min length/size → Reject with fizzle
- State machine stuck → Reset to IDLE on timeout (5 seconds)

### Gesture_Recognizer

**Responsibility:** Implement $1 Unistroke Recognizer, match strokes to spell templates, manage template training.

**Interface:**
```typescript
interface GestureRecognizer {
  recognize(stroke: Stroke): RecognizedSpell;
  loadTemplates(): void;
  saveTemplates(): void;
  trainTemplate(spellType: SpellType, samples: Stroke[]): void;
  resetToDefaults(): void;
  setRejectionThreshold(threshold: number): void;
  getRejectionThreshold(): number;
}

interface RecognizedSpell {
  type: SpellType;
  confidence: number;  // 0-1, computed as (1 - distance/maxDistance)
  matchScore: number;  // Raw distance score from $1 algorithm
}

enum SpellType {
  SHIELD = 'shield',
  LIGHTNING = 'lightning',
  FIREBALL = 'fireball',
  FROST = 'frost',
  FIZZLE = 'fizzle'  // Failed recognition
}

interface SpellTemplate {
  type: SpellType;
  points: { x: number; y: number }[];
}
```

**Key Algorithms:**

**$1 Unistroke Recognizer:**
```
function recognize(stroke, templates, rejectionThreshold):
  # Step 1: Resample stroke to N points (e.g., 64)
  resampled = resample(stroke.points, N)
  
  # Step 2: Rotate to indicative angle
  # (direction from centroid to first point = 0°)
  centroid = computeCentroid(resampled)
  angle = atan2(centroid.y - resampled[0].y, centroid.x - resampled[0].x)
  rotated = rotateBy(resampled, -angle)
  
  # Step 3: Scale to reference square
  boundingBox = computeBoundingBox(rotated)
  scaled = scaleTo(rotated, REFERENCE_SIZE)
  
  # Step 4: Translate to origin
  translated = translateTo(scaled, {x: 0, y: 0})
  
  # Step 5: Compare to all templates
  bestMatch = null
  bestDistance = Infinity
  
  FOR template IN templates:
    distance = pathDistance(translated, template.points)
    IF distance < bestDistance:
      bestDistance = distance
      bestMatch = template
  
  # Step 6: Reject if distance too high
  IF bestDistance > rejectionThreshold:
    RETURN { type: FIZZLE, confidence: 0, matchScore: bestDistance }
  
  # Step 7: Return best match with confidence
  confidence = 1 - (bestDistance / rejectionThreshold)
  RETURN { type: bestMatch.type, confidence: confidence, matchScore: bestDistance }
```

**Path Distance (Average point-to-point distance):**
```
function pathDistance(path1, path2):
  # Both paths already resampled to same N points
  sum = 0
  FOR i FROM 0 TO N-1:
    d = euclideanDistance(path1[i], path2[i])
    sum += d
  RETURN sum / N
```

**Template Training:**
```
function trainTemplate(spellType, samples):
  # Average 3 samples into a single template
  # Each sample is already a stroke
  
  # Step 1: Normalize all samples with $1 preprocessing
  normalized = []
  FOR sample IN samples:
    resampled = resample(sample.points, N)
    rotated = rotateToIndicativeAngle(resampled)
    scaled = scaleTo(rotated, REFERENCE_SIZE)
    translated = translateTo(scaled, {x: 0, y: 0})
    normalized.push(translated)
  
  # Step 2: Average corresponding points
  averaged = []
  FOR i FROM 0 TO N-1:
    avgX = (normalized[0][i].x + normalized[1][i].x + normalized[2][i].x) / 3
    avgY = (normalized[0][i].y + normalized[1][i].y + normalized[2][i].y) / 3
    averaged.push({ x: avgX, y: avgY })
  
  # Step 3: Store template
  templates[spellType] = { type: spellType, points: averaged }
  
  # Step 4: Save to localStorage
  saveTemplates()
```

**Default Templates (shipped with game):**
- **Circle**: 64 points forming a circle (360° / 64 ≈ 5.625° increments)
- **Zigzag**: 64 points forming 3-4 peaks (sin wave with sharp corners)
- **Straight Line**: 64 points forming a horizontal line from left to right
- **V Shape**: 64 points forming a V (45° down, then 45° up)

**Dependencies:**
- Stroke_Capture (consumes Stroke)
- localStorage (for template persistence)

**Error Handling:**
- Invalid stroke (< 2 points) → Return fizzle
- localStorage unavailable → Use default templates only, disable training
- Template load failure → Reset to defaults

### Game_Engine (Stage 2)

**Responsibility:** Manage wizard state, health, mana, spell effects, round timer, win/loss conditions, scoring.

**Interface:**
```typescript
interface GameEngine {
  initialize(config: GameConfig): void;
  update(deltaTime: number): void;
  castPlayerSpell(spell: RecognizedSpell): CastResult;
  castAISpell(spell: AISpell): CastResult;
  checkRoundEnd(): RoundResult | null;
  getState(): GameState;
}

interface GameState {
  playerWizard: WizardState;
  aiWizard: WizardState;
  roundTimer: number;
  playerScore: number;
  aiScore: number;
  playerCombo: number;
  aiCombo: number;
  matchState: MatchState;
}

interface WizardState {
  health: number;          // 0-100
  mana: number;            // 0-100
  position: { x: number; y: number };
  activeShield: boolean;
  frostSlowed: boolean;    // Next cast delayed
  currentCast: SpellType | null;
  castAnimation: number;   // Progress 0-1
}

interface CastResult {
  success: boolean;
  spell: SpellType;
  manaCost: number;
  reason?: string;  // If failed: "insufficient mana", "on cooldown", etc.
}

enum MatchState {
  SETUP = 'setup',
  CALIBRATING = 'calibrating',
  COUNTDOWN = 'countdown',
  FIGHTING = 'fighting',
  ROUND_END = 'round_end',
  MATCH_END = 'match_end'
}
```

**Key Algorithms (Stage 2):**

**Spell Resolution:**
```
function resolveSpell(attacker, defender, spell):
  # Check counter table
  IF spell == FIREBALL AND defender.activeShield:
    # Shield blocks fireball, no damage
    defender.activeShield = false
    RETURN { blocked: true, damage: 0 }
  
  IF spell == LIGHTNING AND defender.activeShield:
    # Lightning breaks shield and deals damage
    defender.activeShield = false
    damage = SPELL_DAMAGE[LIGHTNING]
    defender.health -= damage
    RETURN { blocked: false, damage: damage }
  
  IF spell == SHIELD:
    # Activate shield for attacker
    attacker.activeShield = true
    RETURN { blocked: false, damage: 0 }
  
  IF spell == FROST:
    # Apply slow effect
    defender.frostSlowed = true
    RETURN { blocked: false, damage: SPELL_DAMAGE[FROST] }
  
  # Default: apply damage
  damage = SPELL_DAMAGE[spell]
  defender.health -= damage
  defender.health = clamp(defender.health, 0, 100)
  RETURN { blocked: false, damage: damage }
```

**Mana Management:**
```
function castSpell(wizard, spell):
  cost = SPELL_COST[spell]
  
  IF wizard.mana < cost:
    RETURN { success: false, reason: "insufficient mana" }
  
  wizard.mana -= cost
  wizard.mana = max(wizard.mana, 0)
  
  RETURN { success: true, spell: spell, manaCost: cost }

function updateMana(wizard, deltaTime):
  IF wizard.currentCast == null:
    wizard.mana += MANA_REGEN_RATE * (deltaTime / 1000)
    wizard.mana = min(wizard.mana, 100)
```

**Dependencies (Stage 2):**
- Gesture_Recognizer (consumes RecognizedSpell)
- Spell_System (spell costs, damage, counter table)
- AI_Wizard (generates AI spell choices)

**Error Handling:**
- Invalid spell type → Log warning and treat as fizzle
- Negative health/mana → Clamp to 0
- Timer underflow → End round immediately

### Spell_System (Stage 2)

**Responsibility:** Define spell costs, damage values, counter rules, and effects.

**Interface:**
```typescript
interface SpellSystem {
  getManaCost(spell: SpellType): number;
  getDamage(spell: SpellType): number;
  checkCounter(attackSpell: SpellType, defenseSpell: SpellType): CounterResult;
  loadCounterTable(): void;
}

interface CounterResult {
  counters: boolean;
  effect: string;  // Description of what happens
}

interface CounterTableEntry {
  attacker: SpellType;
  defender: SpellType;
  counters: boolean;
  effect: string;
}
```

**Counter Table (data-driven, stored in JSON):**
```json
{
  "counters": [
    { "attacker": "shield", "defender": "fireball", "counters": true, "effect": "Shield blocks fireball" },
    { "attacker": "lightning", "defender": "shield", "counters": true, "effect": "Lightning breaks shield" },
    { "attacker": "fireball", "defender": "frost", "counters": true, "effect": "Fireball melts frost" },
    { "attacker": "frost", "defender": "lightning", "counters": false, "effect": "Frost slows lightning caster" }
  ],
  "costs": {
    "shield": 20,
    "lightning": 30,
    "fireball": 15,
    "frost": 25
  },
  "damage": {
    "shield": 0,
    "lightning": 25,
    "fireball": 20,
    "frost": 15
  }
}
```

**Dependencies:**
- Game_Engine (provides spell rules)

### AI_Wizard (Stage 2)

**Responsibility:** Control opponent wizard's spell casting, implement adaptive difficulty, display taunts.

**Interface:**
```typescript
interface AIWizard {
  initialize(config: AIConfig): void;
  selectSpell(gameState: GameState): AISpell | null;
  update(deltaTime: number): void;
  recordPlayerCast(spell: SpellType, success: boolean): void;
  getCurrentTaunt(): string | null;
}

interface AISpell {
  type: SpellType;
  castTime: number;  // When AI will cast (timestamp)
}

interface AIConfig {
  baseCastInterval: number;      // ms between casts
  castIntervalVariation: number; // +/- random variation
  counterBias: number;           // 0-1, how much to favor counters
  adaptiveWindow: number;        // Rolling window size (e.g., 10)
  difficultyMin: number;         // Min cast speed multiplier (e.g., 0.5)
  difficultyMax: number;         // Max cast speed multiplier (e.g., 1.5)
}
```

**Key Algorithms (Stage 2):**

**Weighted Spell Selection:**
```
function selectSpell(gameState):
  weights = {
    SHIELD: 0.25,
    LIGHTNING: 0.25,
    FIREBALL: 0.25,
    FROST: 0.25
  }
  
  # Bias toward counters if player is casting
  IF gameState.playerWizard.currentCast != null:
    counter = getCounterSpell(gameState.playerWizard.currentCast)
    weights[counter] += counterBias
  
  # Normalize weights
  totalWeight = sum(weights.values())
  FOR spell IN weights:
    weights[spell] /= totalWeight
  
  # Weighted random pick
  return weightedRandom(weights)
```

**Adaptive Difficulty:**
```
function updateDifficulty():
  # Track player success over rolling window
  successRate = playerCastHistory.countSuccess() / adaptiveWindow
  
  # Adjust cast speed based on player performance
  IF successRate > 0.7:
    speedMultiplier = 1.0 + ((successRate - 0.7) / 0.3) * 0.5
    # AI casts 1.0x to 1.5x faster
  ELIF successRate < 0.3:
    speedMultiplier = 0.5 + (successRate / 0.3) * 0.5
    # AI casts 0.5x to 1.0x speed
  ELSE:
    speedMultiplier = 1.0
  
  adjustedCastInterval = baseCastInterval / speedMultiplier
```

**Taunt System:**
```
function selectTaunt(event):
  IF event == "difficulty_increase":
    RETURN random(["You're getting better!", "Time to step it up!"])
  ELIF event == "player_combo" AND playerCombo > 5:
    RETURN random(["Nice combo!", "Impressive!"])
  ELIF event == "ai_combo" AND aiCombo > 5:
    RETURN random(["Is that all you got?", "Too easy!"])
  ELIF event == "player_low_health" AND playerHealth < 20:
    RETURN random(["One more spell!", "Almost there!"])
  ELSE:
    RETURN null
```

**Dependencies (Stage 2):**
- Game_Engine (consumes GameState)
- Spell_System (counter table lookup)

### Renderer

**Responsibility:** Draw wizards, wand trail, rune glow, spell effects, UI elements, debug overlay on HTML5 Canvas.

**Interface:**
```typescript
interface Renderer {
  initialize(canvas: HTMLCanvasElement): void;
  render(state: RenderState): void;
  drawDebugOverlay(debug: DebugData): void;
  setDebugMode(enabled: boolean): void;
  applyScreenShake(intensity: number, duration: number): void;
}

interface RenderState {
  wizards: {
    player: WizardRenderData;
    ai: WizardRenderData;
  };
  ui: UIData;
  effects: SpellEffect[];
  wandTrail: TrailPoint[];
  offHandRune: RuneGlow | null;
  debug?: DebugData;
}

interface WizardRenderData {
  position: { x: number; y: number };
  pose: StickFigurePose;
  activeShield: boolean;
  castingSpell: SpellType | null;
  health: number;
  mana: number;
}

interface StickFigurePose {
  head: { x: number; y: number };
  torso: { x: number; y: number; rotation: number };
  leftArm: { shoulder: Point; elbow: Point; wrist: Point };
  rightArm: { shoulder: Point; elbow: Point; wrist: Point };
}

interface SpellEffect {
  type: SpellType;
  position: { x: number; y: number };
  progress: number;  // 0-1 animation progress
}

interface RuneGlow {
  position: { x: number; y: number };
  intensity: number;  // 0-1
}

interface UIData {
  playerHealth: number;
  aiHealth: number;
  playerMana: number;
  aiMana: number;
  roundTimer: number;
  playerScore: number;
  aiScore: number;
  spellResult?: { name: string; confidence: number };
  tauntText?: string;
}

interface DebugData {
  landmarks: Landmarks;
  offHandState: OffHandState;
  stroke: Stroke | null;
  wandTrail: TrailPoint[];
  matchScores: { [spell: string]: number };
  thresholds: any;
  fps: number;
}
```

**Key Rendering (Stage 1):**

**Stick Figure Drawing:**
```
function drawWizard(wizard):
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  
  # Head (circle)
  drawCircle(wizard.pose.head.x, wizard.pose.head.y, 20)
  
  # Torso (line)
  torsoEnd = { x: wizard.pose.head.x, y: wizard.pose.head.y + 80 }
  drawLine(wizard.pose.head, torsoEnd)
  
  # Arms
  drawLine(wizard.pose.leftArm.shoulder, wizard.pose.leftArm.elbow)
  drawLine(wizard.pose.leftArm.elbow, wizard.pose.leftArm.wrist)
  drawLine(wizard.pose.rightArm.shoulder, wizard.pose.rightArm.elbow)
  drawLine(wizard.pose.rightArm.elbow, wizard.pose.rightArm.wrist)
```

**Wand Trail Drawing:**
```
function drawWandTrail(trail):
  FOR i FROM 0 TO trail.length - 1:
    point = trail[i]
    alpha = 1.0 - (point.age / trailFadeDuration)
    
    ctx.strokeStyle = `rgba(255, 200, 100, ${alpha})`
    ctx.lineWidth = 3
    
    IF i < trail.length - 1:
      drawLine(point, trail[i + 1])
```

**Rune Glow (Off-Hand Ready Indicator):**
```
function drawRuneGlow(rune):
  # Draw glowing circle under off-hand
  ctx.fillStyle = `rgba(100, 200, 255, ${rune.intensity})`
  ctx.shadowBlur = 20
  ctx.shadowColor = 'rgba(100, 200, 255, 1)'
  drawCircle(rune.position.x, rune.position.y, 30)
  ctx.shadowBlur = 0
```

**Spell Result Overlay:**
```
function drawSpellResult(result):
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(result.name, canvas.width / 2, 100)
  
  ctx.font = '16px Arial'
  ctx.fillText(`Confidence: ${(result.confidence * 100).toFixed(0)}%`, canvas.width / 2, 130)
```

**Placeholder Spell Effects (Stage 1):**
```
function drawPlaceholderEffect(spell):
  SWITCH spell.type:
    CASE SHIELD:
      # Draw glowing circle around player
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)'
      ctx.lineWidth = 4
      drawCircle(playerWizard.position.x, playerWizard.position.y, 60)
    
    CASE LIGHTNING:
      # Draw lightning bolt flash
      ctx.strokeStyle = 'rgba(255, 255, 100, 1.0)'
      ctx.lineWidth = 6
      drawZigzagLine(playerWizard.position, aiWizard.position)
    
    CASE FIREBALL:
      # Draw fireball projectile
      ctx.fillStyle = 'rgba(255, 100, 50, 1.0)'
      drawCircle(spell.position.x, spell.position.y, 15)
    
    CASE FROST:
      # Draw frost wave
      ctx.strokeStyle = 'rgba(150, 220, 255, 0.8)'
      ctx.lineWidth = 8
      drawWaveLine(playerWizard.position, aiWizard.position)
```

**Debug Overlay:**
```
function drawDebugOverlay(debug):
  # Draw landmarks
  FOR landmark IN debug.landmarks.points:
    IF landmark.visibility > 0.5:
      drawCircle(landmark.x, landmark.y, 3, '#00ff00')
    ELSE:
      drawCircle(landmark.x, landmark.y, 3, '#ff0000')
  
  # Draw wand trail
  ctx.strokeStyle = '#ffcc00'
  drawPolyline(debug.wandTrail)
  
  # Draw text info
  textY = 20
  ctx.fillStyle = '#ffffff'
  ctx.font = '12px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`FPS: ${debug.fps}`, 10, textY); textY += 15
  ctx.fillText(`Off-hand: ${debug.offHandState}`, 10, textY); textY += 15
  
  FOR spell IN debug.matchScores:
    ctx.fillText(`${spell}: ${debug.matchScores[spell].toFixed(2)}`, 10, textY)
    textY += 15
```

**Dependencies:**
- HTML5 Canvas API
- Game_Engine (consumes game state in Stage 2)
- Stroke_Capture (consumes wand trail and off-hand state in Stage 1)

**Error Handling:**
- Canvas context loss → Attempt to restore, fall back to error message
- Invalid positions → Skip drawing that element, log warning

### Audio_Manager (Stage 2 and 3)

**Responsibility:** Generate procedural sound effects using Web Audio API.

**Interface:**
```typescript
interface AudioManager {
  initialize(): Promise<void>;
  playSpellCast(spell: SpellType): void;
  playSpellHit(spell: SpellType): void;
  playFizzle(): void;
  playKnockout(): void;
  playRoundEnd(): void;
  playAmbientDrone(): void;
  stopAll(): void;
  setVolume(volume: number): void;
}
```

**Key Methods (Stage 2/3):**

**Procedural Sound Synthesis:**
```
function playSpellCast(spell):
  oscillator = audioContext.createOscillator()
  gainNode = audioContext.createGain()
  
  SWITCH spell:
    CASE SHIELD:
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
    
    CASE LIGHTNING:
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
    
    CASE FIREBALL:
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3)
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    CASE FROST:
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.4)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  oscillator.start()
  oscillator.stop(audioContext.currentTime + 0.5)
```

**Dependencies:**
- Web Audio API (native browser)

**Error Handling:**
- Audio context suspended (mobile autoplay) → Resume on first user interaction
- Playback failure → Silently fail (game continues without audio)

## Data Models

### Pose Data

```typescript
interface Landmarks {
  points: Landmark[];
  timestamp: number;
}

interface Landmark {
  x: number;            // Normalized 0-1
  y: number;            // Normalized 0-1
  z: number;            // Depth estimate
  visibility: number;   // 0-1 confidence
}

// MediaPipe Pose landmark indices
const LANDMARK_INDICES = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
};
```

### Spell Template Data

```typescript
interface SpellTemplate {
  type: SpellType;
  points: { x: number; y: number }[];  // Normalized to unit square
}

// Default templates (shipped with game)
const DEFAULT_TEMPLATES: SpellTemplate[] = [
  {
    type: SpellType.SHIELD,
    points: generateCircle(64)  // 64 points forming a circle
  },
  {
    type: SpellType.LIGHTNING,
    points: generateZigzag(64)  // 64 points forming 3-4 peaks
  },
  {
    type: SpellType.FIREBALL,
    points: generateStraightLine(64)  // 64 points horizontal line
  },
  {
    type: SpellType.FROST,
    points: generateVShape(64)  // 64 points forming a V
  }
];
```

## Correctness Properties

### Property 1: Stroke Normalization Invariance

*For any* two strokes representing the same shape but at different positions, scales, or rotations, the $1 algorithm SHALL produce the same normalized result (within floating-point tolerance).

**Validates: Requirements 22.2, 22.3, 22.4**

### Property 2: Mana Bounds Maintenance

*For any* sequence of spell casts and mana regeneration events, mana SHALL remain within the range [0, 100] at all times.

**Validates: Requirements 24.1, 24.3**

### Property 3: Spell Counter Consistency

*For any* spell type, the spell SHALL NOT counter itself according to the counter table.

**Validates: Requirements 24.2**

### Property 4: Off-Hand State Transitions

*For any* sequence of off-hand position changes, the state machine SHALL transition through states in a valid order (IDLE → READY_ARMING → READY_ARMED → CAST/CANCEL → IDLE).

**Validates: Requirements 4.1, 4.2, 6.1, 7.1**

### Property 5: Template Distinctiveness

*For any* pair of default spell templates, the $1 distance between them SHALL exceed the rejection threshold (templates are distinguishable).

**Validates: Requirements 23.5**

## Testing Strategy

### Unit Testing

**Gesture Recognition:**
- Test $1 algorithm with synthetic strokes (circle, zigzag, line, V)
- Verify rotation invariance (same shape at 0°, 45°, 90°, 180°)
- Verify scale invariance (same shape at 50%, 100%, 200% size)
- Verify position invariance (same shape at different canvas locations)
- Test rejection threshold with non-matching strokes

**Off-Hand State Machine:**
- Test state transitions with synthetic landmark sequences
- Verify arming delay timing
- Verify hysteresis prevents flicker
- Test cancel gesture detection

**Stroke Capture:**
- Test minimum length rejection
- Test minimum bounding box rejection
- Test trail fade timing

### Property-Based Testing

**fast-check generators:**
```typescript
// Arbitrary stroke (random points)
function arbitraryStroke() {
  return fc.array(
    fc.record({ x: fc.double(0, 1), y: fc.double(0, 1) }),
    { minLength: 5, maxLength: 100 }
  );
}

// Arbitrary mana event sequence
function arbitraryManaEvents() {
  return fc.array(
    fc.oneof(
      fc.record({ type: fc.constant('cast'), cost: fc.integer(10, 50) }),
      fc.record({ type: fc.constant('regen'), duration: fc.integer(100, 5000) })
    ),
    { minLength: 1, maxLength: 50 }
  );
}
```

**Property tests:**
- **Property 1**: Stroke normalization invariance
- **Property 2**: Mana bounds maintenance
- **Property 3**: Spell counter consistency (no spell beats itself)
- **Property 4**: Off-hand state transitions validity
- **Property 5**: Template distinctiveness

### Manual Testing

**Stage 1 checkpoint:**
1. Test wand hand selection (left/right)
2. Test calibration with various body sizes
3. Cast each spell 5 times, verify recognition accuracy
4. Test trained templates vs default templates
5. Verify placeholder effects display correctly
6. Test debug overlay completeness

**Stage 2 (after checkpoint):**
1. Test wizard duel flow (health, mana, round timer)
2. Test AI difficulty adaptation
3. Test spell counter mechanics
4. Test round end conditions

## Stage 1 Implementation Focus

Stage 1 delivers a functional spell casting system with recognition checkpoint, stopping before full duel logic to validate the core mechanic.

### Stage 1 Deliverables

**Components Implemented:**
- Pose_Detector (full)
- Calibrator (with wand hand selection)
- Stroke_Capture (full)
- Gesture_Recognizer (full, with training UI)
- Renderer (wand trail, rune glow, spell result overlay, placeholder effects, debug overlay)

**Components Deferred to Stage 2:**
- Game_Engine
- Spell_System
- AI_Wizard
- Audio_Manager (defer to Stage 3)

**Stage 1 Features:**
1. Webcam initialization and permission handling
2. MediaPipe Pose integration
3. Joint smoothing (EMA, alpha=0.3)
4. Wand hand selection screen
5. Calibration with baseline recording
6. Off-hand ready gesture detection (raise, hold, lower, cancel)
7. Wand trail capture and display
8. $1 Unistroke Recognizer implementation
9. Four spell templates (circle, zigzag, line, V)
10. Default templates + training UI ("Train my spells")
11. Spell result display (name, confidence, shape overlay)
12. Placeholder spell effects (shield glow, lightning flash, fireball, frost wave)
13. Debug overlay (landmarks, wand trail, off-hand state, match scores)

**Stage 1 Success Criteria:**
- Pose detection maintains 20-30 fps on target mobile devices
- Spell recognition feels responsive (<300ms from cast gesture to result)
- Recognition accuracy >90% for trained templates, >80% for defaults
- User can complete calibration within 3 attempts
- Placeholder effects display correctly for each spell
- Debug overlay shows all relevant information

**Stage 1 Checkpoint Gate:**
User tests casting all four spells using both default and trained templates, confirms recognition accuracy and responsiveness, approves progression to Stage 2.

---

**Document Version:** 1.0 (Spell Duel Pivot)  
**Last Updated:** 2025-01-XX  
**Status:** Draft - Awaiting Stage 1 Implementation
