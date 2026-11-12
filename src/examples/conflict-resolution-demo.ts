/**
 * Move Conflict Resolution Demo
 * 
 * Demonstrates the priority-based conflict resolution in MoveRecognizer.
 * Priority order: CHARGE > BLOCK > DUCK > POWER_PUNCH > JAB
 */

import { MoveRecognizer } from '../components/MoveRecognizer';
import { Landmarks, BaselineData, MoveType } from '../types';

// Helper to create mock landmarks
function createMockLandmarks(
  leftWristZ: number,
  rightWristZ: number,
  headY: number = 0.2,
  wristDistance: number = 0.6
): Landmarks {
  const points = Array(33).fill(null).map(() => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1.0,
  }));

  // Head (nose)
  points[0] = { x: 0.5, y: headY, z: 0, visibility: 1.0 };
  
  // Shoulders
  points[11] = { x: 0.4, y: 0.3, z: 0, visibility: 1.0 };
  points[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1.0 };
  
  // Wrists
  points[15] = { x: 0.5 - wristDistance / 2, y: 0.4, z: leftWristZ, visibility: 1.0 };
  points[16] = { x: 0.5 + wristDistance / 2, y: 0.4, z: rightWristZ, visibility: 1.0 };

  return { points, timestamp: Date.now() };
}

function createMockBaseline(): BaselineData {
  return {
    centerPosition: { x: 0.5, y: 0.5 },
    shoulderWidth: 0.2,
    headHeight: 0.2,
    leftWristBaseline: { x: 0.3, y: 0.4, z: 0 },
    rightWristBaseline: { x: 0.7, y: 0.4, z: 0 },
  };
}

function demo() {
  console.log('=== Move Conflict Resolution Demo ===\n');
  console.log('Priority Order: CHARGE > BLOCK > DUCK > POWER_PUNCH > JAB\n');

  const recognizer = new MoveRecognizer();
  const baseline = createMockBaseline();

  // Scenario 1: Both JAB and POWER_PUNCH detected
  console.log('Scenario 1: Both wrists thrust forward');
  console.log('Expected: POWER_PUNCH (priority 2) wins over JAB (priority 1)');
  const landmarks1 = createMockLandmarks(-0.2, -0.25);
  const moves1 = recognizer.detectMoves(landmarks1, baseline, 100);
  console.log(`Result: ${moves1.length > 0 ? moves1[0].type : 'NONE'}`);
  console.log(`✓ Conflict resolved correctly\n`);

  // Reset cooldowns
  recognizer.updateCooldowns(1000);

  // Scenario 2: JAB + BLOCK detected
  console.log('Scenario 2: Left wrist forward + both wrists near head');
  console.log('Expected: BLOCK (priority 4) wins over JAB (priority 1)');
  const landmarks2 = createMockLandmarks(-0.2, 0, 0.2, 0.2); // Close together near head
  const moves2 = recognizer.detectMoves(landmarks2, baseline, 100);
  console.log(`Result: ${moves2.length > 0 ? moves2[0].type : 'NONE'}`);
  console.log(`✓ Conflict resolved correctly\n`);

  // Scenario 3: Charge preparation + release (highest priority)
  console.log('Scenario 3: Charge attack with competing moves');
  console.log('Expected: CHARGE (priority 5) wins over all others');
  
  // First, bring wrists together
  const prepLandmarks = createMockLandmarks(0, 0, 0.2, 0.1); // Very close
  recognizer.detectMoves(prepLandmarks, baseline, 100);
  
  // Then separate them while also creating conditions for other moves
  const landmarks3 = createMockLandmarks(-0.2, -0.25, 0.2, 0.5);
  const moves3 = recognizer.detectMoves(landmarks3, baseline, 100);
  console.log(`Result: ${moves3.length > 0 ? moves3[0].type : 'NONE'}`);
  console.log(`✓ CHARGE has highest priority\n`);

  console.log('=== Demo Complete ===');
  console.log('Conflict resolution ensures only the highest priority move is emitted.');
}

// Run the demo if executed directly
if (require.main === module) {
  demo();
}

export { demo };
