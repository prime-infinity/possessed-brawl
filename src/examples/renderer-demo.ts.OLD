/**
 * Demo: Basic Renderer Infrastructure
 * 
 * Demonstrates the Renderer component's basic capabilities:
 * - Canvas initialization
 * - Coordinate transformation
 * - Render loop with FPS counter
 * - Debug mode
 * 
 * This demo verifies Task 8.1 implementation.
 */

import { Renderer } from '../components/Renderer';

/**
 * Initialize and test the Renderer component
 */
export function runRendererDemo(): void {
  console.log('=== Renderer Demo: Basic Infrastructure ===\n');
  
  // Get canvas element
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  
  // Make canvas visible
  canvas.classList.add('active');
  
  // Create renderer with debug mode enabled
  const renderer = new Renderer({
    canvas,
    debugMode: true,
    targetFps: 30
  });
  
  console.log('✓ Renderer initialized');
  console.log(`  Canvas dimensions: ${renderer.getDimensions().width}x${renderer.getDimensions().height}`);
  
  // Test coordinate transformation
  console.log('\n=== Testing Coordinate Transformation ===');
  
  // Test center point
  const center = renderer.normalizedToPixels(0.5, 0.5);
  console.log(`✓ Center (0.5, 0.5) -> (${center.x}, ${center.y}) pixels`);
  
  // Test reverse transformation
  const normalized = renderer.pixelsToNormalized(center.x, center.y);
  console.log(`✓ Reverse: (${center.x}, ${center.y}) -> (${normalized.x}, ${normalized.y}) normalized`);
  
  // Test corners
  const topLeft = renderer.normalizedToPixels(0, 0);
  const bottomRight = renderer.normalizedToPixels(1, 1);
  console.log(`✓ Top-left: (0, 0) -> (${topLeft.x}, ${topLeft.y})`);
  console.log(`✓ Bottom-right: (1, 1) -> (${bottomRight.x}, ${bottomRight.y})`);
  
  // Start render loop
  console.log('\n=== Starting Render Loop ===');
  renderer.start();
  console.log('✓ Render loop started (requestAnimationFrame)');
  console.log('  Target FPS: 30');
  console.log('  Debug overlay enabled');
  
  // Update state periodically to show dynamic updates
  let frameCount = 0;
  const interval = setInterval(() => {
    frameCount++;
    
    renderer.updateState({
      fps: renderer.getFps(),
      debug: {
        frameCount,
        timestamp: Date.now(),
        message: 'Renderer infrastructure working!'
      }
    });
    
    // Log FPS every 2 seconds
    if (frameCount % 60 === 0) {
      console.log(`  Current FPS: ${renderer.getFps()}`);
    }
    
    // Stop after 10 seconds
    if (frameCount >= 300) {
      clearInterval(interval);
      renderer.stop();
      console.log('\n✓ Demo complete');
      console.log('  Render loop stopped');
      console.log(`  Total frames rendered: ${frameCount}`);
      console.log(`  Average FPS: ${renderer.getFps()}`);
    }
  }, 33); // ~30 FPS update rate
  
  console.log('\n=== Rendering for 10 seconds... ===');
  console.log('(Watch the canvas for debug overlay with FPS counter)');
}

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runRendererDemo);
  } else {
    // DOM is already ready
    runRendererDemo();
  }
}
