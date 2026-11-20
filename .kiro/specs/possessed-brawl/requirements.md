# Requirements Document

## Introduction

Spell Duel is a browser-based wizard duel game where players control their wizard using body poses and hand gestures detected through webcam via MediaPipe Pose. The game is designed for the Kiroween 2026 hackathon and must run on mobile devices (Chrome and Safari) in landscape orientation (HTTP for local development, HTTPS required for mobile device testing), targeting 20-30 fps on mid-range phones.

The player stands waist-up in front of the camera, raises their off-hand to ready a spell, draws shapes in the air with their wand hand, and lowers the off-hand to cast. A $1 Unistroke Recognizer identifies the drawn shape and casts the corresponding spell. The opponent is an AI wizard with adaptive difficulty.

The system is built in three stages:
1. Pose input, wand selection, gesture recognition, and spell casting checkpoint
2. Game engine with wizard duel, AI opponent, mana and health, spell effects
3. Visual and audio polish with procedural effects

## Glossary

- **Pose_Detector**: The component that captures webcam input and processes body landmarks using MediaPipe Pose
- **Calibrator**: The component that establishes the player's baseline pose and wand hand during setup
- **Wand_Hand**: The hand the player uses to draw spells in the air (right or left, selected during setup, default right)
- **Off_Hand**: The hand opposite the wand hand, used to ready and cast spells
- **Ready_Gesture**: Raising the off-hand to shoulder height and holding it for ~300ms with hysteresis
- **Cast_Gesture**: Lowering the off-hand after drawing, which sends the stroke to the recognizer
- **Cancel_Gesture**: Shaking or moving the off-hand across the body, which discards the stroke with a fizzle
- **Wand_Trail**: Visual feedback showing the path drawn by the wand hand's wrist in real time
- **Stroke**: The 2D path of the wand wrist from ready to cast, stored as an array of (x, y) points
- **Gesture_Recognizer**: The component that uses the $1 Unistroke Recognizer to match strokes to spell templates
- **Spell_Template**: A stored reference shape for a spell, recorded by drawing the spell 3 times and averaging
- **Fizzle**: A failed spell cast, caused by low recognition confidence or cancellation
- **Game_Engine**: The core system managing wizards, health, mana, spell effects, and round flow
- **Spell_System**: The component managing spell costs, effects, counters, and resolution
- **AI_Wizard**: The component controlling the opponent wizard's spell casting and behavior
- **Renderer**: The component drawing wizards, spell trails, sigils, and UI elements on HTML5 Canvas
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

### Requirement 2: Pose Calibration and Wand Hand Selection

**User Story:** As a player, I want the game to calibrate to my body and let me choose my wand hand, so that gesture detection works accurately for my physique and handedness.

#### Acceptance Criteria

1. WHEN setup begins, THE Calibrator SHALL display a wand hand selection screen with right hand as default
2. WHEN the player selects a wand hand, THE Calibrator SHALL display a text prompt and stick-figure diagram showing the correct ready stance
3. THE Calibrator SHALL detect when the player is in the ready stance (off-hand raised, wand hand relaxed)
4. WHEN ready stance is detected, THE Calibrator SHALL display on-screen confirmation
5. DURING the calibration period (1 second), THE Calibrator SHALL record the player's center position
6. DURING the calibration period, THE Calibrator SHALL record the player's shoulder width
7. DURING the calibration period, THE Calibrator SHALL record the player's head height
8. DURING the calibration period, THE Calibrator SHALL record the wand wrist's resting baseline position
9. THE Calibrator SHALL store baseline measurements for use by the Gesture_Recognizer

### Requirement 3: Joint Position Smoothing

**User Story:** As a player, I want smooth and stable pose detection, so that jittery camera input doesn't cause erratic gesture recognition.

#### Acceptance Criteria

1. THE Pose_Detector SHALL smooth joint positions over multiple consecutive frames
2. FOR ALL key joints (wrists, shoulders, head), applying smoothing then extracting position SHALL produce more stable coordinates than raw landmark data (metamorphic property)
3. WHEN joint visibility drops below threshold, THE Pose_Detector SHALL exclude that joint from smoothing calculations

### Requirement 4: Ready Gesture Detection (Off-Hand Raise)

**User Story:** As a player, I want to raise my off-hand to ready a spell, so that I can control when spell drawing begins.

#### Acceptance Criteria

1. WHEN the player's off-hand wrist is raised to shoulder height or above, THE Gesture_Recognizer SHALL detect the ready state
2. THE Gesture_Recognizer SHALL require the off-hand to remain raised for approximately 300ms before arming
3. THE Gesture_Recognizer SHALL apply hysteresis to the shoulder-height threshold so the ready state does not flicker
4. WHEN the ready state is armed, THE Renderer SHALL display a glowing rune under the off-hand as confirmation
5. THE Gesture_Recognizer SHALL expose tunable parameters for off-hand raise threshold and arming delay

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

### Requirement 6: Cast Gesture Detection (Off-Hand Lower)

**User Story:** As a player, I want to lower my off-hand to cast the spell I just drew, so that I can control when recognition happens.

#### Acceptance Criteria

1. WHEN the off-hand wrist drops below the shoulder-height threshold after being armed, THE Gesture_Recognizer SHALL detect a cast gesture
2. WHEN a cast gesture is detected, THE Stroke_Capture component SHALL finalize the stroke and pass it to recognition
3. THE Gesture_Recognizer SHALL clear the wand trail from the display after cast
4. THE Gesture_Recognizer SHALL expose a tunable parameter for off-hand lower threshold

### Requirement 7: Cancel Gesture Detection (Off-Hand Shake)

**User Story:** As a player, I want to shake or move my off-hand across my body to cancel a spell in progress, so that I can discard bad strokes without casting.

#### Acceptance Criteria

1. WHILE the off-hand is raised (ready state), IF the off-hand moves horizontally beyond a threshold distance, THE Gesture_Recognizer SHALL detect a cancel gesture
2. WHEN a cancel gesture is detected, THE Stroke_Capture component SHALL discard the current stroke
3. THE Renderer SHALL display a fizzle effect when a stroke is canceled
4. THE Gesture_Recognizer SHALL expose a tunable parameter for cancel horizontal distance threshold

### Requirement 8: $1 Unistroke Recognizer Integration

**User Story:** As a player, I want the game to recognize my drawn spells accurately, so that the correct spell is cast.

#### Acceptance Criteria

1. THE Gesture_Recognizer SHALL implement the $1 Unistroke Recognizer algorithm
2. THE Gesture_Recognizer SHALL resample the input stroke to a fixed number of points (e.g., 64)
3. THE Gesture_Recognizer SHALL rotate the stroke to an indicative angle (direction from centroid to first point = 0°)
4. THE Gesture_Recognizer SHALL scale the stroke to a reference square
5. THE Gesture_Recognizer SHALL translate the stroke to the origin
6. THE Gesture_Recognizer SHALL compare the normalized stroke to all spell templates using the $1 distance metric
7. THE Gesture_Recognizer SHALL return the best match and its confidence score (1 - distance/threshold)
8. WHEN the best match distance exceeds a rejection threshold, THE Gesture_Recognizer SHALL return a fizzle result
9. THE Gesture_Recognizer SHALL expose a tunable parameter for the rejection distance threshold

### Requirement 9: Spell Templates (Four Spells in v1)

**User Story:** As a player, I want to cast four distinct spells by drawing recognizable shapes, so that I have strategic options in combat.

#### Acceptance Criteria

1. THE Gesture_Recognizer SHALL recognize a circle shape as a Shield spell
2. THE Gesture_Recognizer SHALL recognize a zigzag shape as a Lightning spell
3. THE Gesture_Recognizer SHALL recognize a straight horizontal or vertical line as a Fireball spell
4. THE Gesture_Recognizer SHALL recognize a V shape as a Frost Wave spell
5. THE Gesture_Recognizer SHALL ship with default templates for all four spells
6. THE Gesture_Recognizer SHALL provide a "Train my spells" option that records three samples per spell and overwrites defaults
7. THE Gesture_Recognizer SHALL store trained templates in localStorage
8. THE Gesture_Recognizer SHALL provide a "Reset to defaults" button that restores shipped templates

### Requirement 10: Spell Result Display

**User Story:** As a player, I want to see which spell was recognized and its confidence, so that I understand what the system detected.

#### Acceptance Criteria

1. WHEN a spell is recognized, THE Renderer SHALL display the spell name on screen
2. WHEN a spell is recognized, THE Renderer SHALL display the confidence or match score
3. WHEN a spell is recognized, THE Renderer SHALL display the drawn shape overlaid on screen for confirmation
4. WHEN a fizzle occurs, THE Renderer SHALL display a clear "no spell" or "fizzle" result
5. THE Renderer SHALL keep the spell result on screen for at least 1 second before clearing

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
