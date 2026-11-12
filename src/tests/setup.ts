/**
 * Test setup for Vitest
 * 
 * Mocks Canvas and other browser APIs not available in JSDOM
 */

import { vi } from 'vitest';

// Mock Canvas 2D Context
class MockCanvasRenderingContext2D {
  canvas: HTMLCanvasElement;
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  lineCap = 'butt';
  font = '';
  textAlign = 'start';
  textBaseline = 'alphabetic';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  fillRect() {}
  strokeRect() {}
  clearRect() {}
  fillText() {}
  strokeText() {}
  measureText() {
    return { width: 0 };
  }
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  arcTo() {}
  quadraticCurveTo() {}
  bezierCurveTo() {}
  rect() {}
  fill() {}
  stroke() {}
  clip() {}
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  scale() {}
  transform() {}
  setTransform() {}
  resetTransform() {}
  drawImage() {}
  createLinearGradient() {
    return {
      addColorStop: () => {}
    };
  }
  createRadialGradient() {
    return {
      addColorStop: () => {}
    };
  }
  createPattern() {
    return null;
  }
  getImageData() {
    return {
      data: new Uint8ClampedArray(),
      width: 0,
      height: 0
    };
  }
  putImageData() {}
  setLineDash() {}
  getLineDash() {
    return [];
  }
}

// Mock HTMLCanvasElement.getContext
const canvasContextMap = new WeakMap<HTMLCanvasElement, MockCanvasRenderingContext2D>();

HTMLCanvasElement.prototype.getContext = vi.fn(function(this: HTMLCanvasElement, contextType: string) {
  if (contextType === '2d') {
    // Return cached context if it exists, otherwise create and cache a new one
    let context = canvasContextMap.get(this);
    if (!context) {
      context = new MockCanvasRenderingContext2D(this);
      canvasContextMap.set(this, context);
    }
    return context as any;
  }
  return null;
});

// Mock requestAnimationFrame and cancelAnimationFrame for testing
let rafId = 0;
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  rafId++;
  setTimeout(() => callback(performance.now()), 16);
  return rafId;
});

global.cancelAnimationFrame = vi.fn((id: number) => {
  // Mock implementation
});

