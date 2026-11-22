/**
 * Gesture Recognizer Component for Spell Duel
 * 
 * Uses shape-detector library for reliable $1 Unistroke Recognition.
 * Recognizes spell gestures from wand trail coordinates.
 * 
 * **Validates: Requirements 8.1-8.11**
 */

// @ts-ignore - shape-detector has no type definitions
import ShapeDetector from 'shape-detector';
import { Stroke, RecognizedSpell, SpellType } from '../types';

/**
 * Configuration for gesture recognition
 */
export interface GestureRecognizerConfig {
  rejectionThreshold: number;  // Maximum distance to accept a match (0-1, lower = stricter)
}

export const DEFAULT_GESTURE_RECOGNIZER_CONFIG: GestureRecognizerConfig = {
  rejectionThreshold: 0.2  // Lower threshold - accept weaker matches
};

/**
 * GestureRecognizer using shape-detector library
 * 
 * Handles spell recognition from wand stroke data using the battle-tested
 * shape-detector implementation of the $1 Unistroke Recognizer algorithm.
 */
export class GestureRecognizer {
  private detector: any;  // ShapeDetector instance
  private config: GestureRecognizerConfig;
  private useTrainedTemplates: boolean = false;

  constructor(config: Partial<GestureRecognizerConfig> = {}) {
    this.config = { ...DEFAULT_GESTURE_RECOGNIZER_CONFIG, ...config };
    
    // ShapeDetector requires patterns array in constructor
    // We'll initialize with empty array and add patterns via learn()
    this.detector = new ShapeDetector([]);
    
    // Load templates
    this.loadTemplates();
  }

  /**
   * Load default or trained templates
   */
  private loadTemplates(): void {
    // Try to load trained templates from localStorage
    const trained = localStorage.getItem('trainedTemplates');
    
    if (trained) {
      try {
        const templates = JSON.parse(trained);
        this.useTrainedTemplates = true;
        console.log('Loaded trained templates from localStorage');
        
        // Add each trained template
        for (const [spellType, template] of Object.entries(templates)) {
          if (spellType !== 'fizzle') {
            this.detector.learn(spellType, (template as any).points);
          }
        }
      } catch (error) {
        console.warn('Failed to load trained templates, using defaults', error);
        this.loadDefaultTemplates();
      }
    } else {
      this.loadDefaultTemplates();
    }
  }

  /**
   * Load default templates
   */
  private loadDefaultTemplates(): void {
    console.log('Loading default spell templates');
    
    // Define DEAD SIMPLE templates - just basic directions
    // User gestures are in normalized coordinates (0-1 range)
    // Templates are simple so messy/shaky gestures still match
    
    // SHIELD: Circle (any direction, just a loop)
    const shieldPoints: Array<{x: number, y: number}> = [];
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      shieldPoints.push({
        x: Math.cos(angle) * 0.15 + 0.5,
        y: Math.sin(angle) * 0.15 + 0.5
      });
    }
    this.detector.learn('shield', shieldPoints);
    
    // FIREBALL: Horizontal line (left to right)
    const fireballPoints: Array<{x: number, y: number}> = [];
    for (let i = 0; i <= 20; i++) {
      fireballPoints.push({
        x: 0.2 + (i / 20) * 0.6,
        y: 0.5
      });
    }
    this.detector.learn('fireball', fireballPoints);
    
    // LIGHTNING: Diagonal line (bottom-left to top-right)
    const lightningPoints: Array<{x: number, y: number}> = [];
    for (let i = 0; i <= 20; i++) {
      lightningPoints.push({
        x: 0.2 + (i / 20) * 0.6,  // Left to right
        y: 0.7 - (i / 20) * 0.4   // Bottom to top
      });
    }
    this.detector.learn('lightning', lightningPoints);
    
    // FROST: Vertical line (bottom to top)
    const frostPoints: Array<{x: number, y: number}> = [];
    for (let i = 0; i <= 20; i++) {
      frostPoints.push({
        x: 0.5,
        y: 0.7 - (i / 20) * 0.4  // Bottom to top
      });
    }
    this.detector.learn('frost', frostPoints);
    
    console.log('✅ Loaded 4 simple spell templates:');
    console.log('   - SHIELD: Circle ⭕');
    console.log('   - FIREBALL: Horizontal line ➡️');
    console.log('   - LIGHTNING: Diagonal line ↗️');
    console.log('   - FROST: Vertical line ⬆️');
  }

  /**
   * Recognize a spell from a wand stroke
   * 
   * @param stroke - The wand trail stroke to recognize
   * @returns Recognized spell with confidence, or null if rejected
   */
  recognize(stroke: Stroke): RecognizedSpell | null {
    console.log('═══════════════════════════════════════');
    console.log('✨ SHAPE-DETECTOR RECOGNITION');
    console.log('═══════════════════════════════════════');
    console.log(`📝 Input: ${stroke.points.length} points`);
    
    if (stroke.points.length < 10) {
      console.log('❌ Too few points (need at least 10)');
      console.log('═══════════════════════════════════════');
      return null;
    }

    // Convert to shape-detector format (array of {x, y} points)
    const points = stroke.points.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }));
    
    // Recognize using shape-detector's spot() method
    const result = this.detector.spot(points);
    
    console.log(`🎯 Shape-detector result:`, result);
    
    if (!result || !result.pattern) {
      console.log('❌ No match found');
      console.log('═══════════════════════════════════════');
      return null;
    }
    
    // Shape-detector returns score 0-1 (higher = better match)
    const score = result.score;
    
    console.log(`   Matched: ${result.pattern}`);
    console.log(`   Score: ${score.toFixed(4)}`);
    console.log(`   Rejection threshold: ${this.config.rejectionThreshold}`);
    
    // Check rejection threshold (score should be ABOVE threshold)
    if (score < this.config.rejectionThreshold) {
      console.log(`❌ REJECTED: score ${score.toFixed(3)} < threshold ${this.config.rejectionThreshold}`);
      console.log('═══════════════════════════════════════');
      return null;
    }
    
    // Map gesture name to SpellType
    const spellType = this.mapNameToSpellType(result.pattern);
    
    // Confidence is directly the score (0-1)
    const confidence = score;
    
    console.log(`✅ ACCEPTED: ${spellType} with confidence ${(confidence * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════');
    
    return {
      type: spellType,
      confidence,
      matchScore: score,
      timestamp: Date.now()
    };
  }

  /**
   * Map shape-detector gesture name to SpellType
   */
  private mapNameToSpellType(name: string): SpellType {
    switch (name.toLowerCase()) {
      case 'shield': return SpellType.SHIELD;
      case 'lightning': return SpellType.LIGHTNING;
      case 'fireball': return SpellType.FIREBALL;
      case 'frost': return SpellType.FROST;
      default:
        console.warn(`Unknown spell type: ${name}, defaulting to shield`);
        return SpellType.SHIELD;
    }
  }

  /**
   * Add a custom trained template
   */
  addTemplate(name: string, points: { x: number; y: number }[]): void {
    this.detector.learn(name, points);
  }

  /**
   * Clear all templates
   */
  clearTemplates(): void {
    this.detector = new ShapeDetector([]);
  }
}
