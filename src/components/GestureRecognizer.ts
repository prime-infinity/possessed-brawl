/**
 * $1 Unistroke Recognizer for Spell Duel
 * 
 * Implements the $1 Unistroke Recognizer algorithm by Wobbrock, Wilson, and Li (2007).
 * Provides rotation, scale, and position-invariant gesture recognition for spell casting.
 * 
 * **Validates: Requirements 8.1-8.9, 9.1-9.8**
 * 
 * Algorithm: Resample → Rotate → Scale → Translate → Compare
 * 
 * @see https://depts.washington.edu/acelab/proj/dollar/index.html
 */

import { Stroke, RecognizedSpell, SpellType, SpellTemplate } from '../types';
import {
  GestureRecognizerConfig,
  DEFAULT_GESTURE_RECOGNIZER_CONFIG
} from '../types/spell';

/**
 * Gesture recognizer using $1 Unistroke algorithm
 */
export class GestureRecognizer {
  private config: GestureRecognizerConfig;
  private templates: Map<SpellType, SpellTemplate>;
  private readonly STORAGE_KEY = 'spell_duel_templates';

  constructor(config: Partial<GestureRecognizerConfig> = {}) {
    this.config = { ...DEFAULT_GESTURE_RECOGNIZER_CONFIG, ...config };
    this.templates = new Map();
    this.loadTemplates();
  }

  /**
   * Recognize a stroke and return the best matching spell
   * 
   * **Validates: Requirements 8.1, 8.6, 8.7, 8.8**
   */
  recognize(stroke: Stroke): RecognizedSpell {
    // Validate stroke
    if (!stroke || stroke.points.length < 2) {
      return this.createFizzleResult();
    }

    // Step 1: Resample to N points
    let points = this.resample(stroke.points, this.config.resamplePoints);

    // Step 2: Rotate to indicative angle (0°)
    points = this.rotateToZero(points);

    // Step 3: Scale to reference square
    points = this.scaleToSquare(points, this.config.referenceSize);

    // Step 4: Translate to origin
    points = this.translateToOrigin(points);

    // Step 5: Compare to all templates
    let bestMatch: SpellType | null = null;
    let bestDistance = Infinity;

    for (const [spellType, template] of this.templates) {
      if (spellType === SpellType.FIZZLE) continue;

      const distance = this.pathDistance(points, template.points);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = spellType;
      }
    }

    // Step 6: Reject if distance too high
    if (bestDistance > this.config.rejectionThreshold || bestMatch === null) {
      return this.createFizzleResult();
    }

    // Step 7: Calculate confidence
    const confidence = Math.max(0, 1 - bestDistance / this.config.rejectionThreshold);

    return {
      type: bestMatch,
      confidence,
      matchScore: bestDistance,
      timestamp: Date.now()
    };
  }

  /**
   * Resample stroke to N evenly-spaced points
   * 
   * **Validates: Requirement 8.2**
   */
  private resample(points: { x: number; y: number }[], n: number): { x: number; y: number }[] {
    const pathLength = this.calculatePathLength(points);
    const interval = pathLength / (n - 1);
    let distanceSoFar = 0;

    const resampled: { x: number; y: number }[] = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const d = this.distance(prev, curr);

      if (distanceSoFar + d >= interval) {
        const qx = prev.x + ((interval - distanceSoFar) / d) * (curr.x - prev.x);
        const qy = prev.y + ((interval - distanceSoFar) / d) * (curr.y - prev.y);
        const q = { x: qx, y: qy };
        resampled.push(q);
        points.splice(i, 0, q); // Insert q for next iteration
        distanceSoFar = 0;
      } else {
        distanceSoFar += d;
      }
    }

    // Sometimes we fall short due to rounding errors
    while (resampled.length < n) {
      resampled.push(points[points.length - 1]);
    }

    return resampled.slice(0, n);
  }

  /**
   * Rotate points so that the indicative angle is 0°
   * Indicative angle = angle from centroid to first point
   * 
   * **Validates: Requirement 8.3**
   */
  private rotateToZero(points: { x: number; y: number }[]): { x: number; y: number }[] {
    const centroid = this.centroid(points);
    const indicativeAngle = Math.atan2(
      centroid.y - points[0].y,
      centroid.x - points[0].x
    );
    return this.rotateBy(points, -indicativeAngle);
  }

  /**
   * Rotate points by a given angle (radians) around centroid
   */
  private rotateBy(points: { x: number; y: number }[], angle: number): { x: number; y: number }[] {
    const centroid = this.centroid(points);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return points.map(p => {
      const dx = p.x - centroid.x;
      const dy = p.y - centroid.y;
      return {
        x: dx * cos - dy * sin + centroid.x,
        y: dx * sin + dy * cos + centroid.y
      };
    });
  }

  /**
   * Scale points to fit in a reference square
   * 
   * **Validates: Requirement 8.4**
   */
  private scaleToSquare(points: { x: number; y: number }[], size: number): { x: number; y: number }[] {
    const box = this.boundingBox(points);
    const scaleX = size / box.width;
    const scaleY = size / box.height;

    return points.map(p => ({
      x: p.x * scaleX,
      y: p.y * scaleY
    }));
  }

  /**
   * Translate points so centroid is at origin
   * 
   * **Validates: Requirement 8.5**
   */
  private translateToOrigin(points: { x: number; y: number }[]): { x: number; y: number }[] {
    const centroid = this.centroid(points);
    return points.map(p => ({
      x: p.x - centroid.x,
      y: p.y - centroid.y
    }));
  }

  /**
   * Calculate average distance between corresponding points in two paths
   * 
   * **Validates: Requirement 8.6**
   */
  private pathDistance(path1: { x: number; y: number }[], path2: { x: number; y: number }[]): number {
    if (path1.length !== path2.length) {
      console.warn('Path lengths differ in pathDistance');
      return Infinity;
    }

    let sum = 0;
    for (let i = 0; i < path1.length; i++) {
      sum += this.distance(path1[i], path2[i]);
    }
    return sum / path1.length;
  }

  /**
   * Euclidean distance between two points
   */
  private distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate total path length
   */
  private calculatePathLength(points: { x: number; y: number }[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += this.distance(points[i - 1], points[i]);
    }
    return length;
  }

  /**
   * Calculate centroid of points
   */
  private centroid(points: { x: number; y: number }[]): { x: number; y: number } {
    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }

  /**
   * Calculate bounding box of points
   */
  private boundingBox(points: { x: number; y: number }[]): { minX: number; minY: number; width: number; height: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Create a fizzle result (failed recognition)
   */
  private createFizzleResult(): RecognizedSpell {
    return {
      type: SpellType.FIZZLE,
      confidence: 0,
      matchScore: Infinity,
      timestamp: Date.now()
    };
  }

  /**
   * Train a template with multiple samples
   * Averages 3 samples into a single template
   * 
   * **Validates: Requirement 9.6**
   */
  trainTemplate(spellType: SpellType, samples: Stroke[]): void {
    if (samples.length !== 3) {
      console.warn(`Expected 3 samples for training, got ${samples.length}`);
      return;
    }

    // Normalize all samples
    const normalized = samples.map(sample => {
      let points = this.resample(sample.points, this.config.resamplePoints);
      points = this.rotateToZero(points);
      points = this.scaleToSquare(points, this.config.referenceSize);
      points = this.translateToOrigin(points);
      return points;
    });

    // Average corresponding points
    const averaged: { x: number; y: number }[] = [];
    for (let i = 0; i < this.config.resamplePoints; i++) {
      const avgX = (normalized[0][i].x + normalized[1][i].x + normalized[2][i].x) / 3;
      const avgY = (normalized[0][i].y + normalized[1][i].y + normalized[2][i].y) / 3;
      averaged.push({ x: avgX, y: avgY });
    }

    // Store template
    this.templates.set(spellType, {
      type: spellType,
      points: averaged
    });

    // Save to localStorage
    this.saveTemplates();

    console.log(`Trained template for ${spellType}`);
  }

  /**
   * Load templates from localStorage or use defaults
   * 
   * **Validates: Requirements 9.5, 9.7**
   */
  loadTemplates(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const [type, template] of Object.entries(parsed)) {
          this.templates.set(type as SpellType, template as SpellTemplate);
        }
        console.log('Loaded trained templates from localStorage');
        return;
      }
    } catch (e) {
      console.warn('Failed to load templates from localStorage:', e);
    }

    // Fall back to default templates
    this.resetToDefaults();
  }

  /**
   * Save templates to localStorage
   * 
   * **Validates: Requirement 9.7**
   */
  saveTemplates(): void {
    try {
      const obj: Record<string, SpellTemplate> = {};
      for (const [type, template] of this.templates) {
        obj[type] = template;
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
      console.log('Templates saved to localStorage');
    } catch (e) {
      console.warn('Failed to save templates to localStorage:', e);
    }
  }

  /**
   * Reset to default templates
   * 
   * **Validates: Requirements 9.5, 9.8**
   */
  resetToDefaults(): void {
    this.templates.clear();

    // Generate default templates
    this.templates.set(SpellType.SHIELD, {
      type: SpellType.SHIELD,
      points: this.generateCircle(this.config.resamplePoints)
    });

    this.templates.set(SpellType.LIGHTNING, {
      type: SpellType.LIGHTNING,
      points: this.generateZigzag(this.config.resamplePoints)
    });

    this.templates.set(SpellType.FIREBALL, {
      type: SpellType.FIREBALL,
      points: this.generateStraightLine(this.config.resamplePoints)
    });

    this.templates.set(SpellType.FROST, {
      type: SpellType.FROST,
      points: this.generateVShape(this.config.resamplePoints)
    });

    console.log('Reset to default templates');
    this.saveTemplates();
  }

  /**
   * Generate circle template (64 points)
   */
  private generateCircle(n: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const radius = 0.5;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI;
      points.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      });
    }
    return points;
  }

  /**
   * Generate zigzag template (64 points, 4 peaks)
   */
  private generateZigzag(n: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const peaks = 4;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = t - 0.5; // Center horizontally
      const y = 0.5 * Math.sin(t * peaks * 2 * Math.PI);
      points.push({ x, y });
    }
    return points;
  }

  /**
   * Generate straight horizontal line template (64 points)
   */
  private generateStraightLine(n: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      points.push({
        x: t - 0.5, // Center horizontally
        y: 0
      });
    }
    return points;
  }

  /**
   * Generate V shape template (64 points)
   */
  private generateVShape(n: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const midpoint = Math.floor(n / 2);

    // First half: descending line (45° down)
    for (let i = 0; i < midpoint; i++) {
      const t = i / midpoint;
      points.push({
        x: -0.5 + t * 0.5, // -0.5 to 0
        y: -t * 0.5         // 0 to -0.5
      });
    }

    // Second half: ascending line (45° up)
    for (let i = 0; i < n - midpoint; i++) {
      const t = i / (n - midpoint);
      points.push({
        x: t * 0.5,         // 0 to 0.5
        y: -0.5 + t * 0.5   // -0.5 to 0
      });
    }

    return points;
  }

  /**
   * Get current rejection threshold
   */
  getRejectionThreshold(): number {
    return this.config.rejectionThreshold;
  }

  /**
   * Set rejection threshold
   */
  setRejectionThreshold(threshold: number): void {
    this.config.rejectionThreshold = threshold;
  }

  /**
   * Get all templates (for debugging)
   */
  getTemplates(): Map<SpellType, SpellTemplate> {
    return new Map(this.templates);
  }
}
