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
  }

  /**
   * Recognize a spell from a wand stroke
   * 
   * @param stroke - The wand trail stroke to recognize
   * @returns Recognized spell with confidence, or null if rejected
   */
  recognize(stroke: Stroke): RecognizedSpell | null {
    if (stroke.points.length < 10) {
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
    const aspectRatio = width / Math.max(height, 0.001);
    
    // Calculate total path length
    let pathLength = 0;
    for (let i = 1; i < stroke.points.length; i++) {
      const dx = stroke.points[i].x - stroke.points[i - 1].x;
      const dy = stroke.points[i].y - stroke.points[i - 1].y;
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }
    
    // Check minimum path length
    if (pathLength < this.config.minPathLength) {
      return null;
    }
    
    // Calculate start-to-end displacement
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const displacement = Math.sqrt(dx * dx + dy * dy);
    const displacementRatio = displacement / pathLength;
    
    // Determine spell type
    let spellType: SpellType;
    let confidence: number;
    
    if (displacementRatio < this.config.circleDisplacementThreshold) {
      // Circle - returns near start
      spellType = SpellType.SHIELD;
      confidence = 1 - (displacementRatio / this.config.circleDisplacementThreshold);
    }
    else if (aspectRatio > 2.0) {
      // Wide - horizontal line
      spellType = SpellType.FIREBALL;
      confidence = Math.min(aspectRatio / 3, 1.0);
    }
    else if (aspectRatio < 0.5) {
      // Tall - vertical line
      spellType = SpellType.FROST;
      confidence = Math.min((1 / aspectRatio) / 3, 1.0);
    }
    else {
      // Medium - diagonal
      spellType = SpellType.LIGHTNING;
      confidence = 1 - Math.abs(aspectRatio - 1.0);
    }
    
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
    // Custom recognizer does not use templates
  }

  /**
   * Clear all templates (not used in simple recognizer)
   */
  clearTemplates(): void {
    // Custom recognizer does not use templates
  }
}
