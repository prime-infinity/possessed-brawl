/**
 * Possessed Brawl - Main Entry Point
 * 
 * Browser-based stick-figure fighting game controlled through webcam pose detection.
 * For the Kiroween 2026 hackathon.
 */

// Placeholder main entry point
// This will be populated in Stage 1 with pose detection initialization

console.log('Possessed Brawl - Initializing...');

// Get DOM elements
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const loadingScreen = document.getElementById('loading-screen') as HTMLDivElement;
const calibrationScreen = document.getElementById('calibration-screen') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const video = document.getElementById('video') as HTMLVideoElement;

// Basic setup
startBtn.addEventListener('click', async () => {
  console.log('Start button clicked');
  
  // Hide loading screen
  loadingScreen.classList.remove('active');
  
  // Show calibration screen
  calibrationScreen.classList.add('active');
  
  // TODO: Initialize webcam and MediaPipe Pose
  // TODO: Start calibration process
  
  console.log('Ready for Stage 1 implementation');
});

// Set canvas size
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
