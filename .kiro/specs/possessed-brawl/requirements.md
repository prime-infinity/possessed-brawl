# Requirements Document

## Introduction

Spell Duel is a browser-based wizard duel game where players control their wizard using body poses and hand gestures detected through webcam via MediaPipe Pose. The game is designed for the Kiroween 2026 hackathon and must run on mobile devices (Chrome and Safari) in landscape orientation (HTTP for local development, HTTPS required for mobile device testing), targeting 20-30 fps on mid-range phones.

The player stands waist-up in front of the camera, raises their left hand (off-hand) to ready a spell, draws simple directional gestures in the air with their right hand (wand hand), and lowers the left hand to cast. A custom directional gesture recognizer identifies the drawn shape based on aspect ratio and returns to start point (for circles) and casts the corresponding spell. The opponent is an AI wizard with adaptive difficulty.

**Key Simplifications from Original Design:**
- **No calibration required**: Hardcoded right hand = wand, left hand = off-hand
- **No hand selection**: Skip directly to spell casting after initial pose detection
- **Simple gesture recognition**: Aspect ratio-based detection instead of $1 Unistroke Recognizer
- **Four simple gestures**: Circle (shield), horizontal line (fireball), vertical line (frost), diagonal line (lightning)
- **Practice mode**: Interactive tutorial teaches all 4 spells before first gameplay

The system is built in three stages:
1. Pose input, gesture recognition, practice mode, and spell casting checkpoint
2. Game engine with wizard duel, AI opponent, mana and health, spell effects
3. Visual and audio polish with procedural effects

## Glossary

- **Pose_Detector**: The component that captures webcam input and processes body landmarks using MediaPipe Pose
- **Wand_Hand**: The player's right hand, used to draw spells in the air (hardcoded, no selection)
- **Off_Hand**: The player's left hand, used to ready and cast spells (hardcoded, no selection)
- **Ready_Gesture**: Raising the left hand above shoulder height
- **Cast_Gesture**: Lowering the left hand after drawing, which sends the stroke to the recognizer
- **Wand_Trail**: Visual feedback showing the path drawn by the right wrist in real time (golden trail)
- **Stroke**: The 2D path of the wand wrist from ready to cast, stored as an array of (x, y) points
- **Gesture_Recognizer**: The component that uses aspect ratio and displacement to identify spell gestures
- **Practice_Mode**: Interactive tutorial showing animated demonstrations and requiring player to successfully cast all 4 spells
- **Fizzle**: A failed spell cast, caused by unrecognized gesture or insufficient trail length
- **Game_Engine**: The core system managing wizards, health, mana, spell effects, and round flow
- **Spell_System**: The component managing spell costs, effects, counters, and resolution
- **AI_Wizard**: The component controlling the opponent wizard's spell casting and behavior
- **Renderer**: The component drawing wizards, spell trails, and UI elements on HTML5 Canvas
- **Audio_Manager**: The component playing procedural sound effects via Web Audio API
- **Mana**: A resource that regenerates slowly over time and is consumed by casting spells
- **Health**: Each wizard's life total; round ends when health reaches zero or timer expires
- **Counter_Table**: Data structure defining which spells beat which (shield beats fireball, lightning beats shield, etc.)
- **Adaptive_Difficulty**: AI behavior that adjusts cast speed and spell choice based on player performance
- **Round**: A timed combat session ending when time expires or a wizard's health reaches zero
- **Match**: A complete game consisting of one or more rounds

## Requirements

### Requirement 1: Webcam Pose Detection

**User Story:** As a player, I want the game to detect my body pose through my webcam, so that I can control my wizard with my movements.

#### Acceptance Criteria

1. THE Pose_Detector SHALL capture webcam input at 20-30 fps on mid-range mobile devices
2. THE Pose_Detector SHALL process frames using MediaPipe Pose JavaScript library
3. THE Pose_Detector SHALL extract waist-up body landmarks (wrists, elbows, shoulders, head)
4. THE Pose_Detector SHALL work in mobile Chrome and Safari browsers (HTTP for local development, HTTPS for mobile device testing)
5. THE Pose_Detector SHALL display the webcam feed in landscape orientation
6. WHEN a key joint has visibility below the visibility threshold, THE Pose_Detector SHALL ignore that frame
7. THE Pose_Detector SHALL mirror the display so that the player's left corresponds to on-screen right

### Requirement 2: Initial Pose Detection

**User Story:** As a player, I want clear instructions on how to position myself, so that the game can detect my pose quickly.

#### Acceptance Criteria

1. WHEN the game starts, THE Application SHALL display a stick figure with both hands raised
2. THE Application SHALL instruct the player to "Raise Both Hands"
3. WHEN pose landmarks are detected, THE Application SHALL remove the instruction overlay
4. THE Application SHALL use hardcoded hand assignments (right=wand, left=off-hand)
5. THE Application SHALL skip calibration and proceed directly to gameplay or practice mode

### Requirement 3 (REMOVED): Calibration is skipped in simplified design

### Requirement 3: Joint Position Smoothing

**User Story:** As a player, I want smooth and stable pose detection, so that jittery camera input doesn't cause erratic gesture recognition.

#### Acceptance Criteria

1. THE Pose_Detector SHALL smooth joint positions over multiple consecutive frames
2. FOR ALL key joints (wrists, shoulders, head), applying smoothing then extracting position SHALL produce more stable coordinates than raw landmark data (metamorphic property)
3. WHEN joint visibility drops below threshold, THE Pose_Detector SHALL exclude that joint from smoothing calculations

### Requirement 4: Ready Gesture Detection (Left Hand Raise)

**User Story:** As a player, I want to raise my left hand to ready a spell, so that I can control when spell drawing begins.

#### Acceptance Criteria

1. WHEN the player's left wrist is raised above shoulder height, THE Application SHALL detect the ready state
2. THE Application SHALL immediately arm spell casting (no delay required)
3. WHEN the ready state is armed, THE Renderer SHALL display a blue glowing circle under the left wrist as confirmation
4. THE Application SHALL begin recording the wand trail when armed

### Requirement 5: Wand Trail Capture and Display

**User Story:** As a player, I want to see my wand movement as a glowing trail in real time, so that I have visual feedback while drawing spells.

#### Acceptance Criteria

1. WHILE the off-hand is raised (ready state), THE Stroke_Capture component SHALL record the wand wrist's 2D position each frame
2. THE Stroke_Capture component SHALL store the stroke as an array of (x, y) points in screen space
3. THE Renderer SHALL draw the wand trail with a small visual lag behind the wrist position
4. THE Renderer SHALL fade the wand trail over approximately 500ms
5. THE Gesture_Recognizer SHALL use the raw wrist path (not the lagged trail) for recognition
6. WHEN the stroke ends, THE Stroke_Capture component SHALL pass the raw stroke to the Gesture_Recognizer
7. THE Stroke_Capture component SHALL discard strokes below a minimum length or bounding-box size

### Requirement 6: Cast Gesture Detection (Left Hand Lower)

**User Story:** As a player, I want to lower my left hand to cast the spell I just drew, so that I can control when recognition happens.

#### Acceptance Criteria

1. WHEN the left wrist drops below shoulder height after being armed, THE Application SHALL detect a cast gesture
2. WHEN a cast gesture is detected, THE Application SHALL finalize the stroke and pass it to recognition
3. THE Application SHALL clear the wand trail from the display after cast

### Requirement 7 (REMOVED): Cancel gesture removed in simplified design

### Requirement 8: Simple Directional Gesture Recognition

**User Story:** As a player, I want the game to recognize my drawn spells quickly and accurately, so that the correct spell is cast.

#### Acceptance Criteria

1. THE Gesture_Recognizer SHALL analyze the stroke's bounding box aspect ratio
2. THE Gesture_Recognizer SHALL calculate the displacement ratio (start-to-end distance / total path length)
3. WHEN displacement ratio < 0.25, THE Gesture_Recognizer SHALL recognize a circle (Shield)
4. WHEN aspect ratio > 2.0, THE Gesture_Recognizer SHALL recognize a horizontal line (Fireball)
5. WHEN aspect ratio < 0.5, THE Gesture_Recognizer SHALL recognize a vertical line (Frost)
6. WHEN aspect ratio is between 0.5 and 2.0, THE Gesture_Recognizer SHALL recognize a diagonal line (Lightning)
7. THE Gesture_Recognizer SHALL return confidence score based on how well the gesture matches expected parameters
8. WHEN stroke is too short (< 10 points), THE Gesture_Recognizer SHALL reject it as invalid

### Requirement 9: Four Simple Spell Gestures

**User Story:** As a player, I want to cast four distinct spells by drawing simple, intuitive gestures, so that I have strategic options in combat.

#### Acceptance Criteria

1. THE Gesture_Recognizer SHALL recognize a circle (returns to start) as a Shield spell
2. THE Gesture_Recognizer SHALL recognize a horizontal line as a Fireball spell
3. THE Gesture_Recognizer SHALL recognize a vertical line as a Frost spell
4. THE Gesture_Recognizer SHALL recognize a diagonal line as a Lightning spell
5. WHEN a spell is recognized, THE Renderer SHALL display a perfect green version of the gesture shape alongside the spell result

### Requirement 10: Spell Result Display

**User Story:** As a player, I want to see which spell was recognized with a visual confirmation, so that I understand what the system detected and learn the gesture patterns.

#### Acceptance Criteria

1. WHEN a spell is recognized, THE Renderer SHALL display the spell name and emoji on screen
2. WHEN a spell is recognized, THE Renderer SHALL display the confidence percentage
3. WHEN a spell is recognized, THE Renderer SHALL display a perfect green version of the gesture shape (circle, horizontal line, vertical line, or diagonal line)
4. THE perfect shape SHALL be displayed above the spell result to reinforce learning
5. THE Renderer SHALL keep the spell result on screen for at least 2 seconds before clearing

### Requirement 10.5: Practice Mode Tutorial

**User Story:** As a first-time player, I want to learn all 4 spells through an interactive tutorial, so that I understand how to cast spells before playing.

#### Acceptance Criteria

1. WHEN a first-time user clicks "Start Game", THE Application SHALL enter practice mode instead
2. FOR EACH of the 4 spells (Shield, Fireball, Frost, Lightning), THE Application SHALL show an animated demonstration
3. THE animated demonstration SHALL show a stick figure with left hand raised and right hand drawing the gesture with a golden trail
4. AFTER the demonstration, THE Application SHALL transition to practice phase with a small looping reference animation in bottom-right
5. DURING practice phase, THE Application SHALL display the player's skeleton landmarks and wand trail in real-time
6. THE Application SHALL require the player to successfully cast each spell to proceed to the next
7. WHEN a wrong spell is cast, THE Application SHALL allow retry without penalty
8. AFTER completing all 4 spells, THE Application SHALL display a completion screen with spell summary
9. THE Application SHALL save completion status to localStorage
10. RETURNING users SHALL see both "Start Game" and "Practice Spells" buttons, with "Start Game" going directly to gameplay

### Requirement 11: Stage 1 Placeholder Spell Effects

**User Story:** As a player, I want to see a simple visual effect when I cast each spell, so that I can confirm the spell system works before the duel logic exists.

#### Acceptance Criteria

1. WHEN Shield is cast, THE Renderer SHALL display a glowing shield outline around the player's stick figure
2. WHEN Lightning is cast, THE Renderer SHALL display a lightning flash or bolt visual effect
3. WHEN Fireball is cast, THE Renderer SHALL display a fireball projectile moving across the screen
4. WHEN Frost Wave is cast, THE Renderer SHALL display a frost wave or ice effect
5. THE spell effects in Stage 1 SHALL be simple placeholder visuals (no opponent interaction, no damage, no mana cost)

### Requirement 12: Debug Overlay for Spell Casting

**User Story:** As a developer, I want to see a debug overlay showing landmarks, wrist path, off-hand state, and match scores, so that I can tune and verify gesture recognition.

#### Acceptance Criteria

1. THE Renderer SHALL display the currently detected spell name and confidence on screen
2. THE Renderer SHALL display raw wrist position values for wand and off-hand
3. THE Renderer SHALL display off-hand state (idle, ready armed, ready unarmed, cast, cancel)
4. THE Renderer SHALL display match scores for each spell template
5. THE Renderer SHALL display active thresholds (ready height, cancel distance, rejection threshold)
6. THE Renderer SHALL display the normalized stroke path sent to the recognizer
7. WHERE debug mode is enabled, THE Renderer SHALL show all debug information
8. THE Renderer SHALL provide a toggle (e.g., D key) to enable/disable debug mode

### Requirement 13: Wizard Representation

**User Story:** As a player, I want to see stick-figure wizards on screen, so that I can identify the player and opponent.

#### Acceptance Criteria

1. THE Renderer SHALL draw the player wizard as a stick figure on the left side of the screen
2. THE Renderer SHALL draw the AI wizard as a stick figure on the right side of the screen
3. THE Renderer SHALL draw wizards in a Halloween fantasy style (simple procedural visuals)
4. WHEN the player casts a spell, THE Renderer SHALL update the player wizard's pose to reflect casting

### Requirement 14: Health and Mana Tracking

**User Story:** As a player, I want to see health and mana bars for both wizards, so that I can track combat progress.

#### Acceptance Criteria

1. THE Game_Engine SHALL maintain a health value for each wizard (0-100)
2. THE Game_Engine SHALL maintain a mana value for each wizard (0-100)
3. THE Renderer SHALL display a health bar for the player wizard
4. THE Renderer SHALL display a health bar for the AI wizard
5. THE Renderer SHALL display a mana bar for the player wizard
6. THE Renderer SHALL display a mana bar for the AI wizard
7. WHEN a wizard takes damage, THE Game_Engine SHALL decrease that wizard's health value
8. WHEN a wizard casts a spell, THE Game_Engine SHALL decrease that wizard's mana by the spell's cost
9. WHILE not casting spells, THE Game_Engine SHALL slowly regenerate each wizard's mana over time
10. THE Game_Engine SHALL clamp mana to the range [0, 100]

### Requirement 15: Spell Costs and Counter Rules

**User Story:** As a player, I want spells to have mana costs and counter relationships, so that there is strategy in spell selection.

#### Acceptance Criteria

1. EACH spell SHALL have a mana cost defined in the Spell_System
2. WHEN a wizard does not have enough mana for a spell, THE Game_Engine SHALL reject the cast with a fizzle
3. THE Spell_System SHALL define a counter table with spell matchups (e.g., Shield beats Fireball, Lightning beats Shield)
4. THE Spell_System SHALL store the counter table in a single data file or configuration object for easy tuning
5. THE Spell_System SHALL expose spell costs and counter rules as tunable parameters

### Requirement 16: Spell Resolution and Damage

**User Story:** As a player, I want spells to deal damage or provide protection based on counter rules, so that combat has strategic depth.

#### Acceptance Criteria

1. WHEN Fireball hits an unshielded opponent, THE Game_Engine SHALL reduce opponent health by Fireball damage
2. WHEN Shield is active and Fireball hits, THE Game_Engine SHALL block the Fireball (no damage)
3. WHEN Lightning hits a shielded opponent, THE Game_Engine SHALL break the shield and deal damage
4. WHEN Frost Wave hits an opponent, THE Game_Engine SHALL apply a slow effect (opponent's next cast is delayed)
5. THE Game_Engine SHALL resolve spell collisions according to the counter table
6. THE Game_Engine SHALL expose base damage values for each spell as tunable parameters

### Requirement 17: AI Wizard Behavior

**User Story:** As a player, I want to fight against an AI wizard with varied behavior, so that gameplay remains challenging and unpredictable.

#### Acceptance Criteria

1. THE AI_Wizard SHALL cast spells on randomized timers with variation
2. THE AI_Wizard SHALL choose spells with a weighted random pick
3. THE AI_Wizard SHALL bias spell choice toward counters when it sees the player casting a spell
4. THE AI_Wizard SHALL track successful player casts over a rolling time window (e.g., last 10 casts)
5. WHEN player cast success rate increases, THE AI_Wizard SHALL increase cast speed
6. WHEN player cast success rate increases, THE AI_Wizard SHALL adjust spell mix toward counters
7. THE AI_Wizard SHALL display taunt text bubbles when difficulty increases
8. THE AI_Wizard SHALL display praise text bubbles when player performs well
9. THE AI_Wizard SHALL display mock text bubbles when player performs poorly

### Requirement 18: Round and Match Management

**User Story:** As a player, I want rounds with a timer and win/loss conditions, so that matches have clear structure and outcomes.

#### Acceptance Criteria

1. THE Game_Engine SHALL maintain a round timer counting down from a configurable duration (e.g., 90 seconds)
2. WHEN the round timer reaches zero, THE Game_Engine SHALL end the round
3. WHEN a wizard's health reaches zero, THE Game_Engine SHALL end the round
4. WHEN a round ends due to timer expiration, THE Game_Engine SHALL declare the wizard with higher health as the winner
5. WHEN a round ends due to knockout, THE Game_Engine SHALL declare the wizard with health above zero as the winner
6. THE Renderer SHALL display the round timer during gameplay
7. WHEN a round ends, THE Renderer SHALL display a match result screen showing the winner

### Requirement 19: Scoring System

**User Story:** As a player, I want to earn points for successful actions, so that I can track my performance.

#### Acceptance Criteria

1. WHEN a wizard lands a successful spell hit, THE Game_Engine SHALL award points to that wizard
2. WHEN a wizard lands consecutive hits without being hit, THE Game_Engine SHALL apply a combo multiplier to points
3. WHEN a wizard wins a round, THE Game_Engine SHALL award bonus points to that wizard
4. THE Game_Engine SHALL maintain cumulative scores for both wizards throughout the match
5. THE Game_Engine SHALL expose tunable parameters for hit points, combo multiplier values, and round win bonus

### Requirement 20: Procedural Audio Effects

**User Story:** As a player, I want to hear sound effects during spell casting and combat, so that actions feel more impactful.

#### Acceptance Criteria

1. WHEN a spell is cast, THE Audio_Manager SHALL play a procedural cast sound using Web Audio API
2. WHEN a spell hits, THE Audio_Manager SHALL play a procedural hit sound using Web Audio API
3. WHEN a wizard is knocked out, THE Audio_Manager SHALL play a knockout sound using Web Audio API
4. WHEN a round ends, THE Audio_Manager SHALL play a round end sound using Web Audio API
5. THE Audio_Manager SHALL provide a low ambient drone during gameplay
6. THE Audio_Manager SHALL generate all sounds procedurally (no external audio files)

### Requirement 21: Repository and Licensing

**User Story:** As a hackathon participant, I want the project to meet Kiroween 2026 requirements, so that it qualifies for the event.

#### Acceptance Criteria

1. THE repository SHALL be hosted on GitHub as a public repository
2. THE repository SHALL include an MIT LICENSE file at the repository root
3. THE repository SHALL include a .kiro folder at the repository root
4. THE .kiro folder SHALL NOT be listed in .gitignore
5. THE repository SHALL include a README.md file with setup, run, and test instructions
6. THE repository SHALL include a CREDITS.md file listing third-party libraries and their licenses
7. THE repository SHALL include a notes document for Kiro write-up documenting which Kiro features were used

### Requirement 22: Testing - Gesture Recognition

**User Story:** As a developer, I want unit tests for gesture recognition logic, so that I can verify accuracy with known input.

#### Acceptance Criteria

1. THE test suite SHALL include unit tests for the $1 algorithm using synthetic strokes
2. THE test suite SHALL verify rotation invariance (same shape at different angles produces same result)
3. THE test suite SHALL verify scale invariance (same shape at different sizes produces same result)
4. THE test suite SHALL verify position invariance (same shape at different locations produces same result)
5. THE test suite SHALL include unit tests for ready gesture arming with hysteresis
6. THE test suite SHALL include unit tests for cancel gesture detection
7. THE test suite SHALL verify stroke-end logic with pause and max-length cases

### Requirement 23: Testing - Spell Recognition

**User Story:** As a developer, I want tests for spell template matching, so that I can verify the four spells are distinguishable.

#### Acceptance Criteria

1. THE test suite SHALL include unit tests for circle template matching
2. THE test suite SHALL include unit tests for zigzag template matching
3. THE test suite SHALL include unit tests for straight line template matching
4. THE test suite SHALL include unit tests for V shape template matching
5. THE test suite SHALL verify that each spell's template does not match other spells above the rejection threshold

### Requirement 24: Testing - Mana Bounds and Spell Counter Rules

**User Story:** As a developer, I want property-based tests for mana mechanics and spell rules, so that I can verify correctness across many scenarios.

#### Acceptance Criteria

1. THE test suite SHALL include property-based tests verifying that mana remains in [0, 100] bounds after any sequence of casts and regeneration
2. THE test suite SHALL include property-based tests verifying that spell counter rules are consistent (no spell beats itself)
3. THE test suite SHALL include property-based tests verifying that mana decreases after casting and regenerates over time
4. THE test suite SHALL include property-based tests verifying that casts are rejected when mana is insufficient

### Requirement 25: Rendering Separation

**User Story:** As a developer, I want rendering logic separated from game logic, so that I can replace visual assets later without rewriting game code.

#### Acceptance Criteria

1. THE Renderer SHALL receive wizard state data as input without directly accessing Game_Engine internals
2. THE Renderer SHALL receive UI state data as input without directly accessing Game_Engine internals
3. THE Game_Engine SHALL update state without calling Renderer methods
4. THE Game_Engine SHALL emit state change events that the Renderer subscribes to
5. WHEN visual assets are replaced, THE Game_Engine logic SHALL remain unchanged
