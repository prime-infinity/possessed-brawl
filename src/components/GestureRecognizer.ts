/**
 * Gesture Recognizer Component for Spell Duel
 * 
 * Custom simple recognizer for directional gestures.
 * Recognizes spells based on aspect ratio and path characteristics.
 * 
 * **Validates: Requirements 8.1-8.11**
 */

import { Stroke, RecognizedSpell, SpellType } from '../types';

/**
 * Configuration for gesture recognition
 */
export interface GestureRecognizerConfig {
  circleDisplacementThreshold: number;  // Max start-to-end distance for circles (relative to path length)
  minPathLength: number;  // Minimum total path length to be valid
}

export const DEFAULT_GESTURE_RECOGNIZER_CONFIG: GestureRecognizerConfig = {
  circleDisplacementThreshold: 0.25,  // Circle must return within 25% of path length
  minPathLength: 0.15  // At least 15% of screen
};

/**
 * GestureRecognizer using custom directional logic
 * 
 * Recognizes 4 simple gestures:
 * - Circle: loops back to start (low displacement/length ratio)
 * - Horizontal line: wide aspect ratio
 * - Vertical line: tall aspect ratio  
 * - Diagonal line: medium aspect ratio
 */
export class GestureRecognizer {
  private config: GestureRecognizerConfig;

  constructor(config: Partial<GestureRecognizerConfig> = {}) {
    this.config = { ...DEFAULT_GESTURE_RECOGNIZER_CONFIG, ...config };
    console.log('✅ Custom gesture recognizer initialized');
  }

  /**
   * Recognize a spell from a wand stroke
   * 
   * @param stroke - The wand trail stroke to recognize
   * @returns Recognized spell with confidence, or null if rejected
   */
  recognize(stroke: Stroke): RecognizedSpell | null {
    console.log('═══════════════════════════════════════');
    console.log('✨ CUSTOM GESTURE RECOGNITION');
    console.log('═══════════════════════════════════════');
    console.log(`📝 Input: ${stroke.points.length} points`);
    
    if (stroke.points.length < 10) {
      console.log('❌ Too few points (need at least 10)');
      console.log('═══════════════════════════════════════');
      return null;
    }

    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const p of stroke.points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    
    const width = maxX - minX;
    const height = maxY - minY;
    const aspectRatio = width / Math.max(height, 0.001); // Avoid division by zero
    
    console.log(`📏 Bounding box: ${width.toFixed(3)} x ${height.toFixed(3)}`);
    console.log(`   Aspect ratio: ${aspectRatio.toFixed(3)}`);
    
    // Calculate total path length
    let pathLength = 0;
    for (let i = 1; i < stroke.points.length; i++) {
      const dx = stroke.points[i].x - stroke.points[i - 1].x;
      const dy = stroke.points[i].y - stroke.points[i - 1].y;
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }
    
    console.log(`📏 Path length: ${pathLength.toFixed(3)}`);
    
    // Check minimum path length
    if (pathLength < this.config.minPathLength) {
      console.log(`❌ Path too short: ${pathLength.toFixed(3)} < ${this.config.minPathLength}`);
      console.log('═══════════════════════════════════════');
      return null;
    }
    
    // Calculate start-to-end displacement (straight line distance)
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const displacement = Math.sqrt(dx * dx + dy * dy);
    const displacementRatio = displacement / pathLength;
    
    console.log(`📏 Displacement: ${displacement.toFixed(3)}`);
    console.log(`   Displacement/Length ratio: ${displacementRatio.toFixed(3)}`);
    
    // Determine spell type based on characteristics
    let spellType: SpellType;
    let confidence: number;
    
    // SHIELD: Circle - low displacement ratio (returns near start)
    if (displacementRatio < this.config.circleDisplacementThreshold) {
      spellType = SpellType.SHIELD;
      confidence = 1 - (displacementRatio / this.config.circleDisplacementThreshold);
      console.log(`🎯 Detected: CIRCLE (displacement ratio ${displacementRatio.toFixed(3)} < ${this.config.circleDisplacementThreshold})`);
    }
    // High displacement = straight line, classify by aspect ratio
    else if (aspectRatio > 2.0) {
      // Wide = horizontal line
      spellType = SpellType.FIREBALL;
      confidence = Math.min(aspectRatio / 3, 1.0);
      console.log(`🎯 Detected: HORIZONTAL LINE (aspect ratio ${aspectRatio.toFixed(3)} > 2.0)`);
    }
    else if (aspectRatio < 0.5) {
      // Tall = vertical line
      spellType = SpellType.FROST;
      confidence = Math.min((1 / aspectRatio) / 3, 1.0);
      console.log(`🎯 Detected: VERTICAL LINE (aspect ratio ${aspectRatio.toFixed(3)} < 0.5)`);
    }
    else {
      // Medium aspect ratio = diagonal
      spellType = SpellType.LIGHTNING;
      // Confidence higher when closer to 1:1 diagonal
      confidence = 1 - Math.abs(aspectRatio - 1.0);
      console.log(`🎯 Detected: DIAGONAL LINE (aspect ratio ${aspectRatio.toFixed(3)} between 0.5-2.0)`);
    }
    
    console.log(`✅ RECOGNIZED: ${spellType} with confidence ${(confidence * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════');
    
    return {
      type: spellType,
      confidence: Math.max(0, Math.min(1, confidence)),
      matchScore: displacementRatio,
      timestamp: Date.now()
    };
  }

  /**
   * Add a custom trained template (not used in simple recognizer)
   */
  addTemplate(name: string, points: { x: number; y: number }[]): void {
    console.log('Custom recognizer does not use templates');
  }

  /**
   * Clear all templates (not used in simple recognizer)
   */
  clearTemplates(): void {
    console.log('Custom recognizer does not use templates');
  }
}
