# Requirements Document

## Introduction

Possessed Brawl is a browser-based stick-figure fighting game where players control their fighter using body poses detected through webcam via MediaPipe Pose. The game is designed for the Kiroween 2026 hackathon and must run on mobile devices (Chrome and Safari) in landscape orientation (HTTP for local development, HTTPS required for mobile device testing), targeting 20-30 fps on mid-range phones.

The system is built in three stages:
1. Pose input and setup with move detection
2. Game engine with physics and AI opponent
3. Enhanced graphics and visual polish

## Glossary

- **Pose_Detector**: The component that captures webcam input and processes body landmarks using MediaPipe Pose
- **Move_Recognizer**: The component that identifies player moves (jab, power punch, duck, block, charge) from pose data
- **Calibrator**: The component that establishes the player's baseline pose during setup
- **Game_Engine**: The core system managing fighters, combat, health, stamina, and match flow
- **Physics_Engine**: The component handling ragdoll physics, collisions, and reactions using Matter.js or planck.js
- **AI_Controller**: The component controlling the opponent fighter's behavior
- **Renderer**: The component drawing stick figures and UI elements on HTML5 Canvas
- **Audio_Manager**: The component playing sound effects via Web Audio API
- **Stamina**: A resource that increases on landed hits and is consumed by moves, enabling charge attacks
- **Calibration_Period**: The first second of gameplay where the system records baseline pose data
- **Guard_Position**: A boxing guard stance with hands raised near face, used as the starting position
- **Visibility_Threshold**: The confidence level below which joint landmarks are ignored
- **Key_Joints**: Wrists, head, and shoulders - the critical landmarks for move detection
- **Depth_Control**: Forward/backward movement controlled by shoulder width changes
- **Charge_Attack**: A powerful move requiring both hands pulled close then released, consuming stamina
- **Hit_Stop**: A brief pause in animation when a heavy hit connects
- **Adaptive_Difficulty**: AI behavior that adjusts based on player performance over a rolling window
- **Round**: A timed combat session ending when time expires or a fighter is knocked out
- **Match**: A complete game consisting of one or more rounds

## Requirements

### Requirement 1: Webcam Pose Detection

**User Story:** As a player, I want the game to detect my body pose through my webcam, so that I can control my fighter with my movements.

#### Acceptance Criteria

1. THE Pose_Detector SHALL capture webcam input at 20-30 fps on mid-range mobile devices
2. THE Pose_Detector SHALL process frames using MediaPipe Pose JavaScript library
3. THE Pose_Detector SHALL extract waist-up body landmarks (wrists, elbows, shoulders, head)
4. THE Pose_Detector SHALL work in mobile Chrome and Safari browsers (HTTP for local development, HTTPS for mobile device testing)
5. THE Pose_Detector SHALL display the webcam feed in landscape orientation
6. WHEN a key joint has visibility below the Visibility_Threshold, THE Pose_Detector SHALL ignore that frame
7. THE Pose_Detector SHALL mirror the display so that the player's left corresponds to on-screen right

### Requirement 2: Pose Calibration

**User Story:** As a player, I want the game to calibrate to my body dimensions, so that move detection works accurately for my physique.

#### Acceptance Criteria

1. WHEN calibration begins, THE Calibrator SHALL display a text prompt and stick-figure diagram showing the correct Guard_Position
2. THE Calibrator SHALL detect when the player is in Guard_Position
3. WHEN Guard_Position is detected, THE Calibrator SHALL display on-screen confirmation
4. DURING the Calibration_Period, THE Calibrator SHALL record the player's center position
5. DURING the Calibration_Period, THE Calibrator SHALL record the player's shoulder width
6. DURING the Calibration_Period, THE Calibrator SHALL record the player's head height
7. THE Calibrator SHALL store baseline measurements for use by the Move_Recognizer

### Requirement 3: Joint Position Smoothing

**User Story:** As a player, I want smooth and stable pose detection, so that jittery camera input doesn't cause erratic fighter behavior.

#### Acceptance Criteria

1. THE Pose_Detector SHALL smooth joint positions over multiple consecutive frames
2. FOR ALL Key_Joints, applying smoothing then extracting position SHALL produce more stable coordinates than raw landmark data (metamorphic property)
3. WHEN joint visibility drops below threshold, THE Pose_Detector SHALL exclude that joint from smoothing calculations

### Requirement 4: Move Detection - Jab

**User Story:** As a player, I want to throw a jab by thrusting my left hand forward, so that I can perform quick attacks.

#### Acceptance Criteria

1. WHEN the player's left wrist moves forward beyond a tunable threshold distance from baseline, THE Move_Recognizer SHALL detect a jab move
2. THE Move_Recognizer SHALL apply a cooldown period after detecting a jab
3. DURING the cooldown period for jab, THE Move_Recognizer SHALL NOT detect another jab
4. THE Move_Recognizer SHALL expose tunable parameters for jab threshold distance and cooldown duration

### Requirement 5: Move Detection - Power Punch

**User Story:** As a player, I want to throw a power punch by thrusting my right hand forward, so that I can deal more damage than a jab.

#### Acceptance Criteria

1. WHEN the player's right wrist moves forward beyond a tunable threshold distance from baseline, THE Move_Recognizer SHALL detect a power punch move
2. THE Move_Recognizer SHALL apply a cooldown period after detecting a power punch
3. DURING the cooldown period for power punch, THE Move_Recognizer SHALL NOT detect another power punch
4. THE Move_Recognizer SHALL expose tunable parameters for power punch threshold distance and cooldown duration

### Requirement 6: Move Detection - Duck

**User Story:** As a player, I want to duck by dropping my head and shoulders quickly, so that I can avoid incoming attacks.

#### Acceptance Criteria

1. WHEN the player's head and shoulders drop below a tunable threshold distance from baseline, THE Move_Recognizer SHALL detect a duck move
2. WHEN the head and shoulders drop, THE Move_Recognizer SHALL require the drop to occur within a tunable time window
3. THE Move_Recognizer SHALL apply a cooldown period after detecting a duck
4. DURING the cooldown period for duck, THE Move_Recognizer SHALL NOT detect another duck
5. THE Move_Recognizer SHALL expose tunable parameters for duck threshold distance, time window, and cooldown duration

### Requirement 7: Move Detection - Block

**User Story:** As a player, I want to block by bringing both hands close to my face, so that I can reduce incoming damage.

#### Acceptance Criteria

1. WHEN both the player's wrists are within a tunable threshold distance of the head, THE Move_Recognizer SHALL detect a block move
2. THE Move_Recognizer SHALL maintain block detection while both hands remain near the face
3. WHEN either hand moves away from the face beyond the threshold, THE Move_Recognizer SHALL stop detecting the block
4. THE Move_Recognizer SHALL expose a tunable parameter for block proximity threshold

### Requirement 8: Move Detection - Charge Attack

**User Story:** As a player, I want to perform a charge attack by pulling both hands close then releasing them, so that I can execute a powerful special move.

#### Acceptance Criteria

1. WHEN both the player's wrists move within a tunable threshold distance of each other, THE Move_Recognizer SHALL detect the charge preparation phase
2. WHEN both wrists separate beyond a tunable threshold distance after charge preparation, THE Move_Recognizer SHALL detect a charge attack
3. IF the player's stamina is below a tunable threshold, THEN THE Move_Recognizer SHALL NOT detect a charge attack
4. THE Move_Recognizer SHALL apply a cooldown period after detecting a charge attack
5. DURING the cooldown period for charge attack, THE Move_Recognizer SHALL NOT detect another charge attack
6. THE Move_Recognizer SHALL expose tunable parameters for charge proximity threshold, release threshold, stamina threshold, and cooldown duration

### Requirement 9: Move Detection Debug Overlay

**User Story:** As a developer, I want to see a debug overlay showing detected moves and raw joint values, so that I can tune and verify move detection.

#### Acceptance Criteria

1. THE Renderer SHALL display the currently detected move name on screen
2. THE Renderer SHALL display raw joint position values for Key_Joints
3. THE Renderer SHALL display current threshold values for each move
4. THE Renderer SHALL display cooldown status for each move
5. THE Renderer SHALL display the player's current stamina level
6. WHERE debug mode is enabled, THE Renderer SHALL show all debug information

### Requirement 10: Fighter Representation

**User Story:** As a player, I want to see two stick-figure fighters on screen, so that I can understand the combat state.

#### Acceptance Criteria

1. THE Renderer SHALL draw two stick-figure fighters facing each other in 2D space
2. THE Renderer SHALL draw the player-controlled fighter on the left side
3. THE Renderer SHALL draw the AI-controlled fighter on the right side
4. WHEN the player performs a move, THE Renderer SHALL update the player fighter's pose to reflect that move
5. WHEN the AI performs a move, THE Renderer SHALL update the AI fighter's pose to reflect that move

### Requirement 11: Health and Stamina Tracking

**User Story:** As a player, I want to see health and stamina bars for both fighters, so that I can track combat progress.

#### Acceptance Criteria

1. THE Game_Engine SHALL maintain a health value for each fighter
2. THE Game_Engine SHALL maintain a stamina value for each fighter
3. THE Renderer SHALL display a health bar for the player fighter
4. THE Renderer SHALL display a health bar for the AI fighter
5. THE Renderer SHALL display a stamina bar for the player fighter
6. THE Renderer SHALL display a stamina bar for the AI fighter
7. WHEN a fighter takes damage, THE Game_Engine SHALL decrease that fighter's health value
8. WHEN a fighter lands a hit, THE Game_Engine SHALL increase that fighter's stamina value
9. WHEN a fighter performs a move, THE Game_Engine SHALL decrease that fighter's stamina value
10. WHILE not performing moves or taking damage, THE Game_Engine SHALL slowly regenerate each fighter's stamina

### Requirement 12: Depth Control

**User Story:** As a player, I want to move forward and backward by changing my shoulder width, so that I can control my fighter's position in the arena.

#### Acceptance Criteria

1. WHEN the player's shoulder width increases beyond a tunable threshold from baseline, THE Game_Engine SHALL move the player fighter forward
2. WHEN the player's shoulder width decreases below a tunable threshold from baseline, THE Game_Engine SHALL move the player fighter backward
3. THE Game_Engine SHALL limit forward movement to prevent fighters from overlapping
4. THE Game_Engine SHALL limit backward movement to arena boundaries
5. THE Game_Engine SHALL expose tunable parameters for shoulder width forward and backward thresholds

### Requirement 13: Ragdoll Physics

**User Story:** As a player, I want fighters to react with exaggerated physics when hit, so that combat feels impactful and entertaining.

#### Acceptance Criteria

1. THE Physics_Engine SHALL simulate ragdoll physics for both fighters using Matter.js or planck.js
2. WHEN a fighter is hit by a jab, THE Physics_Engine SHALL apply a force knocking the head backward
3. WHEN a fighter is hit by a power punch, THE Physics_Engine SHALL apply a force causing the entire body to stagger
4. WHEN a fighter is hit by a charge attack, THE Physics_Engine SHALL apply a force launching the fighter backward
5. WHEN a fighter collides with arena walls, THE Physics_Engine SHALL apply bounce forces
6. WHEN a fighter collides with arena walls, THE Renderer SHALL display squash-and-stretch deformation
7. WHEN a heavy hit connects, THE Renderer SHALL pause rendering briefly (hit-stop)
8. WHEN a heavy hit connects, THE Renderer SHALL shake the screen

### Requirement 14: AI Opponent Behavior

**User Story:** As a player, I want to fight against an AI opponent with varied behavior, so that gameplay remains challenging and unpredictable.

#### Acceptance Criteria

1. THE AI_Controller SHALL make the opponent fighter perform attack moves on randomized timers
2. THE AI_Controller SHALL make the opponent fighter perform block moves on randomized timers
3. THE AI_Controller SHALL make the opponent fighter perform duck moves on randomized timers
4. THE AI_Controller SHALL add random variation to timer intervals
5. THE AI_Controller SHALL track successful player hits over a rolling time window
6. WHEN player hit rate increases, THE AI_Controller SHALL increase opponent attack speed
7. WHEN player hit rate increases, THE AI_Controller SHALL increase opponent attack frequency
8. THE AI_Controller SHALL display taunt text bubbles when difficulty increases
9. THE AI_Controller SHALL display praise text bubbles when player performs well
10. THE AI_Controller SHALL display mock text bubbles when player performs poorly

### Requirement 15: Combat Damage System

**User Story:** As a player, I want different moves to deal different amounts of damage, so that I can develop strategy around which moves to use.

#### Acceptance Criteria

1. WHEN a jab hits an opponent, THE Game_Engine SHALL reduce opponent health by a base jab damage amount
2. WHEN a power punch hits an opponent, THE Game_Engine SHALL reduce opponent health by a base power punch damage amount
3. WHEN a charge attack hits an opponent, THE Game_Engine SHALL reduce opponent health by a base charge attack damage amount
4. THE base power punch damage amount SHALL be greater than the base jab damage amount
5. THE base charge attack damage amount SHALL be greater than the base power punch damage amount
6. WHEN a fighter is blocking and takes a hit, THE Game_Engine SHALL reduce damage by a tunable blocking reduction percentage
7. THE Game_Engine SHALL expose tunable parameters for each move's base damage and blocking reduction percentage

### Requirement 16: Round and Match Management

**User Story:** As a player, I want rounds with a timer and win/loss conditions, so that matches have clear structure and outcomes.

#### Acceptance Criteria

1. THE Game_Engine SHALL maintain a round timer counting down from a configurable duration
2. WHEN the round timer reaches zero, THE Game_Engine SHALL end the round
3. WHEN a fighter's health reaches zero, THE Game_Engine SHALL end the round
4. WHEN a round ends due to timer expiration, THE Game_Engine SHALL declare the fighter with higher health as the round winner
5. WHEN a round ends due to knockout, THE Game_Engine SHALL declare the fighter with health above zero as the round winner
6. THE Renderer SHALL display the round timer during gameplay
7. WHEN a round ends, THE Renderer SHALL display a match result screen showing the winner
8. THE Renderer SHALL display accumulated scores for both fighters on the match result screen

### Requirement 17: Scoring System

**User Story:** As a player, I want to earn points for successful actions, so that I can track my performance.

#### Acceptance Criteria

1. WHEN a fighter lands a hit, THE Game_Engine SHALL award points to that fighter
2. WHEN a fighter lands consecutive hits without being hit, THE Game_Engine SHALL apply a combo multiplier to points
3. WHEN a fighter wins a round, THE Game_Engine SHALL award bonus points to that fighter
4. THE Game_Engine SHALL maintain cumulative scores for both fighters throughout the match
5. THE Game_Engine SHALL expose tunable parameters for hit points, combo multiplier values, and round win bonus

### Requirement 18: Sound Effects

**User Story:** As a player, I want to hear sound effects during combat, so that actions feel more impactful.

#### Acceptance Criteria

1. WHEN a jab connects, THE Audio_Manager SHALL play a jab impact sound effect using Web Audio API
2. WHEN a power punch connects, THE Audio_Manager SHALL play a power punch impact sound effect using Web Audio API
3. WHEN a charge attack connects, THE Audio_Manager SHALL play a charge attack impact sound effect using Web Audio API
4. WHEN a fighter blocks an attack, THE Audio_Manager SHALL play a block sound effect using Web Audio API
5. WHEN a fighter is knocked out, THE Audio_Manager SHALL play a knockout sound effect using Web Audio API
6. WHEN a round ends, THE Audio_Manager SHALL play a round end sound effect using Web Audio API

### Requirement 19: Repository and Licensing

**User Story:** As a hackathon participant, I want the project to meet Kiroween 2026 requirements, so that it qualifies for the event.

#### Acceptance Criteria

1. THE repository SHALL be hosted on GitHub as a public repository
2. THE repository SHALL include an MIT LICENSE file at the repository root
3. THE repository SHALL include a .kiro folder at the repository root
4. THE .kiro folder SHALL NOT be listed in .gitignore
5. THE repository SHALL include a README.md file with setup, run, and test instructions
6. THE repository SHALL include a CREDITS.md file listing third-party libraries and their licenses
7. THE repository SHALL include a notes document for Kiro write-up documenting which Kiro features were used

### Requirement 20: Testing - Move Detectors

**User Story:** As a developer, I want unit tests for move detection logic, so that I can verify accuracy with known input.

#### Acceptance Criteria

1. THE test suite SHALL include unit tests for jab detection using recorded joint position data
2. THE test suite SHALL include unit tests for power punch detection using recorded joint position data
3. THE test suite SHALL include unit tests for duck detection using recorded joint position data
4. THE test suite SHALL include unit tests for block detection using recorded joint position data
5. THE test suite SHALL include unit tests for charge attack detection using recorded joint position data
6. THE test suite SHALL verify cooldown behavior for each move type
7. THE test suite SHALL verify threshold parameter enforcement for each move type

### Requirement 21: Testing - Joint Geometry

**User Story:** As a developer, I want property-based tests for joint geometry calculations, so that I can verify correctness across many input variations.

#### Acceptance Criteria

1. THE test suite SHALL include property-based tests verifying that distance calculations between joints remain non-negative
2. THE test suite SHALL include property-based tests verifying that angle calculations between joints remain within valid ranges
3. THE test suite SHALL include property-based tests verifying that baseline-relative position calculations maintain correct directionality
4. THE test suite SHALL generate varied joint position inputs for property-based tests
5. FOR ALL valid joint position inputs, geometric calculations SHALL satisfy invariant properties

### Requirement 22: Testing - Stamina and Charge Gating

**User Story:** As a developer, I want property-based tests for stamina mechanics, so that I can verify charge attack gating works correctly.

#### Acceptance Criteria

1. THE test suite SHALL include property-based tests verifying that stamina increases after landing hits
2. THE test suite SHALL include property-based tests verifying that stamina decreases after performing moves
3. THE test suite SHALL include property-based tests verifying that stamina regenerates slowly over time when idle
4. THE test suite SHALL include property-based tests verifying that charge attacks are blocked when stamina is below threshold
5. THE test suite SHALL include property-based tests verifying that charge attacks are allowed when stamina meets threshold
6. FOR ALL sequences of moves and hits, stamina values SHALL remain within valid bounds (0 to maximum)

### Requirement 23: Rendering Separation

**User Story:** As a developer, I want rendering logic separated from game logic, so that I can replace art assets later without rewriting game code.

#### Acceptance Criteria

1. THE Renderer SHALL receive fighter state data as input without directly accessing Game_Engine internals
2. THE Renderer SHALL receive UI state data as input without directly accessing Game_Engine internals
3. THE Game_Engine SHALL update state without calling Renderer methods
4. THE Game_Engine SHALL emit state change events that the Renderer subscribes to
5. WHEN art assets are replaced, THE Game_Engine logic SHALL remain unchanged
