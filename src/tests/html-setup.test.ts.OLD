import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('HTML Foundation and Canvas Setup - Task 3', () => {
  let htmlContent: string;

  beforeAll(() => {
    const htmlPath = resolve(__dirname, '../../index.html');
    htmlContent = readFileSync(htmlPath, 'utf-8');
  });

  describe('Requirements 1.4 and 1.5: Mobile Browser Support', () => {
    it('should have proper DOCTYPE and HTML5 structure', () => {
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="en">');
    });

    it('should have viewport meta tag for mobile', () => {
      expect(htmlContent).toContain('name="viewport"');
      expect(htmlContent).toContain('width=device-width');
      expect(htmlContent).toContain('initial-scale=1.0');
      expect(htmlContent).toContain('user-scalable=no');
    });

    it('should have mobile web app meta tags', () => {
      expect(htmlContent).toContain('name="mobile-web-app-capable"');
      expect(htmlContent).toContain('name="apple-mobile-web-app-capable"');
    });

    it('should have theme color meta tag', () => {
      expect(htmlContent).toContain('name="theme-color"');
    });
  });

  describe('Canvas Element for Rendering', () => {
    it('should have a canvas element with id="canvas"', () => {
      expect(htmlContent).toContain('<canvas id="canvas"');
    });

    it('should have canvas styled for full viewport', () => {
      expect(htmlContent).toContain('#canvas');
      expect(htmlContent).toMatch(/width:\s*100%/);
      expect(htmlContent).toMatch(/height:\s*100%/);
    });
  });

  describe('Video Element for Webcam Feed', () => {
    it('should have a video element with id="video"', () => {
      expect(htmlContent).toContain('<video id="video"');
    });

    it('should have video element with autoplay and playsinline attributes', () => {
      expect(htmlContent).toContain('autoplay');
      expect(htmlContent).toContain('playsinline');
    });

    it('should have video element hidden', () => {
      expect(htmlContent).toMatch(/#video\s*{[^}]*display:\s*none/);
    });
  });

  describe('Requirement 1.5: Landscape Orientation Enforcement', () => {
    it('should have rotate prompt element', () => {
      expect(htmlContent).toContain('id="rotate-prompt"');
    });

    it('should have CSS media query for portrait orientation', () => {
      expect(htmlContent).toContain('@media (orientation: portrait)');
    });

    it('should show rotate prompt in portrait mode', () => {
      const portraitSection = htmlContent.match(
        /@media \(orientation: portrait\)\s*{[^}]*}/s
      );
      expect(portraitSection).toBeTruthy();
      if (portraitSection) {
        expect(portraitSection[0]).toContain('#rotate-prompt');
        expect(portraitSection[0]).toContain('display: flex');
      }
    });

    it('should hide app in portrait mode', () => {
      const portraitSection = htmlContent.match(
        /@media \(orientation: portrait\)\s*{[^}]*#app[^}]*}/s
      );
      expect(portraitSection).toBeTruthy();
    });

    it('should have user-friendly rotation message', () => {
      expect(htmlContent).toContain('Please rotate your device');
      expect(htmlContent).toContain('landscape');
    });
  });

  describe('Loading Screen and Permission Request UI', () => {
    it('should have loading screen element', () => {
      expect(htmlContent).toContain('id="loading-screen"');
    });

    it('should have start button for permission request', () => {
      expect(htmlContent).toContain('id="start-btn"');
      expect(htmlContent).toContain('Start Game');
    });

    it('should have game title and description', () => {
      expect(htmlContent).toContain('Possessed Brawl');
      expect(htmlContent).toContain('Control your fighter');
    });

    it('should have error message container', () => {
      expect(htmlContent).toContain('id="error-message"');
    });
  });

  describe('Calibration Screen UI', () => {
    it('should have calibration screen element', () => {
      expect(htmlContent).toContain('id="calibration-screen"');
    });

    it('should have calibration instructions', () => {
      expect(htmlContent).toContain('id="calibration-instructions"');
      expect(htmlContent).toContain('boxing guard position');
    });

    it('should have calibration progress indicator', () => {
      expect(htmlContent).toContain('id="calibration-progress"');
      expect(htmlContent).toContain('id="calibration-percentage"');
    });

    it('should have retry calibration button', () => {
      expect(htmlContent).toContain('id="retry-calibration-btn"');
    });
  });

  describe('Responsive Layout for Mobile Devices', () => {
    it('should have responsive font sizes using clamp()', () => {
      expect(htmlContent).toMatch(/font-size:\s*clamp\(/);
    });

    it('should have mobile-optimized touch targets (min 48px)', () => {
      const buttonStyles = htmlContent.match(/button\s*{[^}]*}/s);
      expect(buttonStyles).toBeTruthy();
      if (buttonStyles) {
        expect(buttonStyles[0]).toContain('min-height: 48px');
      }
    });

    it('should prevent default mobile interactions', () => {
      expect(htmlContent).toContain('touch-action');
      expect(htmlContent).toContain('overscroll-behavior');
      expect(htmlContent).toContain('-webkit-tap-highlight-color');
    });

    it('should have responsive media queries for small screens', () => {
      expect(htmlContent).toContain('@media (max-height: 400px)');
    });
  });

  describe('Performance Considerations', () => {
    it('should have performance warning element', () => {
      expect(htmlContent).toContain('id="performance-warning"');
    });

    it('should optimize canvas rendering', () => {
      const canvasStyles = htmlContent.match(/#canvas\s*{[^}]*}/s);
      expect(canvasStyles).toBeTruthy();
      if (canvasStyles) {
        expect(canvasStyles[0]).toContain('image-rendering');
      }
    });
  });

  describe('Screen State Management', () => {
    it('should have screen class for overlay management', () => {
      expect(htmlContent).toContain('class="screen');
    });

    it('should have active state for screens', () => {
      expect(htmlContent).toMatch(/\.screen\.active/);
    });

    it('should have loading screen active by default', () => {
      expect(htmlContent).toMatch(/id="loading-screen"[^>]*class="[^"]*active/);
    });
  });

  describe('TypeScript Module Integration', () => {
    it('should load main TypeScript file as module', () => {
      expect(htmlContent).toContain('<script type="module"');
      expect(htmlContent).toContain('src="/src/main.ts"');
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper button styling with hover and active states', () => {
      expect(htmlContent).toMatch(/button:hover/);
      expect(htmlContent).toMatch(/button:active/);
      expect(htmlContent).toMatch(/button:disabled/);
    });

    it('should have loading spinner for visual feedback', () => {
      expect(htmlContent).toContain('class="spinner"');
      expect(htmlContent).toMatch(/@keyframes spin/);
    });

    it('should have proper color contrast for text', () => {
      // Check that text colors are defined
      expect(htmlContent).toContain('color: #fff');
      expect(htmlContent).toContain('color: #aaa');
    });
  });
});
