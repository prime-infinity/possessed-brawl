/**
 * Unit tests for ThresholdTuningUI component
 * 
 * Tests the developer-focused threshold tuning UI, including slider creation,
 * value updates, localStorage persistence, and reset functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThresholdTuningUI } from './ThresholdTuningUI';
import { ThresholdConfig, DEFAULT_THRESHOLD_CONFIG } from '../types/move';

describe('ThresholdTuningUI', () => {
  let container: HTMLElement;
  let ui: ThresholdTuningUI;

  beforeEach(() => {
    // Create a test container
    container = document.createElement('div');
    document.body.appendChild(container);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up
    if (ui) {
      ui.dispose();
    }
    document.body.removeChild(container);
  });

  describe('Initialization', () => {
    it('should create UI with default configuration', () => {
      ui = new ThresholdTuningUI(container);

      const tuningPanel = document.getElementById('threshold-tuning-ui');
      expect(tuningPanel).toBeTruthy();
      expect(tuningPanel?.style.display).toBe('none'); // Hidden by default
    });

    it('should load configuration from localStorage if available', () => {
      const customConfig: Partial<ThresholdConfig> = {
        jabThreshold: 0.25,
        powerPunchCooldown: 1500,
      };
      localStorage.setItem(
        'possessed-brawl-thresholds',
        JSON.stringify(customConfig)
      );

      ui = new ThresholdTuningUI(container);
      const config = ui.getConfig();

      expect(config.jabThreshold).toBe(0.25);
      expect(config.powerPunchCooldown).toBe(1500);
      // Other values should be defaults
      expect(config.duckThreshold).toBe(DEFAULT_THRESHOLD_CONFIG.duckThreshold);
    });

    it('should use defaults if localStorage is empty', () => {
      ui = new ThresholdTuningUI(container);
      const config = ui.getConfig();

      expect(config).toEqual(DEFAULT_THRESHOLD_CONFIG);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('possessed-brawl-thresholds', 'invalid json{');

      ui = new ThresholdTuningUI(container);
      const config = ui.getConfig();

      expect(config).toEqual(DEFAULT_THRESHOLD_CONFIG);
    });
  });

  describe('Slider Controls', () => {
    beforeEach(() => {
      ui = new ThresholdTuningUI(container);
      ui.show();
    });

    it('should create sliders for all threshold parameters', () => {
      const sliders = container.querySelectorAll('input[type="range"]');
      // Should have 14 sliders (all threshold parameters)
      expect(sliders.length).toBe(14);
    });

    it('should display current values next to sliders', () => {
      const valueDisplays = container.querySelectorAll('[id^="value-"]');
      expect(valueDisplays.length).toBeGreaterThan(0);

      // Check a specific value display
      const jabThresholdDisplay = container.querySelector('#value-jabThreshold');
      expect(jabThresholdDisplay?.textContent).toBe(
        DEFAULT_THRESHOLD_CONFIG.jabThreshold.toFixed(2)
      );
    });

    it('should update value display when slider changes', () => {
      const jabSlider = Array.from(
        container.querySelectorAll('input[type="range"]')
      ).find((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.value === DEFAULT_THRESHOLD_CONFIG.jabThreshold.toString();
      }) as HTMLInputElement;

      expect(jabSlider).toBeTruthy();

      // Change slider value
      jabSlider.value = '0.30';
      jabSlider.dispatchEvent(new Event('input', { bubbles: true }));

      // Check that value display updated
      const jabThresholdDisplay = container.querySelector('#value-jabThreshold');
      expect(jabThresholdDisplay?.textContent).toBe('0.30');
    });

    it('should trigger onChange callback when slider changes', () => {
      const onChange = vi.fn();
      ui.dispose();
      ui = new ThresholdTuningUI(container, onChange);
      ui.show();

      const slider = container.querySelector(
        'input[type="range"]'
      ) as HTMLInputElement;
      slider.value = '0.25';
      slider.dispatchEvent(new Event('input', { bubbles: true }));

      expect(onChange).toHaveBeenCalled();
      const calledConfig = onChange.mock.calls[0][0] as ThresholdConfig;
      expect(calledConfig).toBeTruthy();
    });

    it('should display units for cooldown parameters', () => {
      const jabCooldownDisplay = container.querySelector('#value-jabCooldown');
      expect(jabCooldownDisplay?.textContent).toContain('ms');
    });

    it('should not display units for normalized threshold parameters', () => {
      const jabThresholdDisplay = container.querySelector('#value-jabThreshold');
      expect(jabThresholdDisplay?.textContent).not.toContain('ms');
      expect(jabThresholdDisplay?.textContent).not.toContain('%');
    });
  });

  describe('Sections and Organization', () => {
    beforeEach(() => {
      ui = new ThresholdTuningUI(container);
      ui.show();
    });

    it('should organize sliders into labeled sections', () => {
      const sectionTitles = Array.from(container.querySelectorAll('h4')).map(
        (h4) => h4.textContent
      );

      expect(sectionTitles).toContain('Jab');
      expect(sectionTitles).toContain('Power Punch');
      expect(sectionTitles).toContain('Duck');
      expect(sectionTitles).toContain('Block');
      expect(sectionTitles).toContain('Charge Attack');
      expect(sectionTitles).toContain('Depth Control');
    });

    it('should have a title and reset button in header', () => {
      const title = container.querySelector('h3');
      expect(title?.textContent).toBe('Threshold Tuning');

      const resetButton = Array.from(
        container.querySelectorAll('button')
      ).find((btn) => btn.textContent === 'Reset Defaults');
      expect(resetButton).toBeTruthy();
    });
  });

  describe('localStorage Persistence', () => {
    beforeEach(() => {
      ui = new ThresholdTuningUI(container);
      ui.show();
    });

    it('should save configuration to localStorage on slider change', () => {
      const slider = container.querySelector(
        'input[type="range"]'
      ) as HTMLInputElement;
      slider.value = '0.25';
      slider.dispatchEvent(new Event('input', { bubbles: true }));

      const saved = localStorage.getItem('possessed-brawl-thresholds');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed).toBeTruthy();
    });

    it('should persist values across UI instances', () => {
      // Change a value
      const slider = container.querySelector(
        'input[type="range"]'
      ) as HTMLInputElement;
      slider.value = '0.30';
      slider.dispatchEvent(new Event('input', { bubbles: true }));

      // Dispose and recreate
      ui.dispose();
      ui = new ThresholdTuningUI(container);

      // Check that value persisted
      const config = ui.getConfig();
      expect(Object.values(config)).toContain(0.30);
    });
  });

  describe('Reset Functionality', () => {
    beforeEach(() => {
      ui = new ThresholdTuningUI(container);
      ui.show();
    });

    it('should reset all values to defaults when reset button clicked', () => {
      // Change some values
      ui.setConfig({
        jabThreshold: 0.5,
        powerPunchCooldown: 3000,
        duckThreshold: 0.4,
      });

      // Click reset button
      const resetButton = Array.from(
        container.querySelectorAll('button')
      ).find((btn) => btn.textContent === 'Reset Defaults') as HTMLButtonElement;
      resetButton.click();

      // Check that values reset
      const config = ui.getConfig();
      expect(config).toEqual(DEFAULT_THRESHOLD_CONFIG);
    });

    it('should update localStorage when reset', () => {
      // Change some values
      ui.setConfig({ jabThreshold: 0.5 });

      // Reset
      const resetButton = Array.from(
        container.querySelectorAll('button')
      ).find((btn) => btn.textContent === 'Reset Defaults') as HTMLButtonElement;
      resetButton.click();

      // Check localStorage
      const saved = localStorage.getItem('possessed-brawl-thresholds');
      const parsed = JSON.parse(saved!);
      expect(parsed.jabThreshold).toBe(DEFAULT_THRESHOLD_CONFIG.jabThreshold);
    });

    it('should trigger onChange callback when reset', () => {
      const onChange = vi.fn();
      ui.dispose();
      ui = new ThresholdTuningUI(container, onChange);
      ui.show();

      const resetButton = Array.from(
        container.querySelectorAll('button')
      ).find((btn) => btn.textContent === 'Reset Defaults') as HTMLButtonElement;
      resetButton.click();

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Visibility Control', () => {
    beforeEach(() => {
      ui = new ThresholdTuningUI(container);
    });

    it('should be hidden by default', () => {
      expect(ui.getIsVisible()).toBe(false);
      const panel = document.getElementById('threshold-tuning-ui');
      expect(panel?.style.display).toBe('none');
    });

    it('should show when show() called', () => {
      ui.show();
      expect(ui.getIsVisible()).toBe(true);
      const panel = document.getElementById('threshold-tuning-ui');
      expect(panel?.style.display).toBe('block');
    });

    it('should hide when hide() called', () => {
      ui.show();
      ui.hide();
      expect(ui.getIsVisible()).toBe(false);
      const panel = document.getElementById('threshold-tuning-ui');
      expect(panel?.style.display).toBe('none');
    });

    it('should toggle visibility', () => {
      expect(ui.getIsVisible()).toBe(false);
      ui.toggle();
      expect(ui.getIsVisible()).toBe(true);
      ui.toggle();
      expect(ui.getIsVisible()).toBe(false);
    });
  });

  describe('Programmatic Configuration', () => {
    beforeEach(() => {
      ui = new ThresholdTuningUI(container);
    });

    it('should allow getting current config', () => {
      const config = ui.getConfig();
      expect(config).toEqual(DEFAULT_THRESHOLD_CONFIG);
    });

    it('should allow setting config programmatically', () => {
      const newConfig: Partial<ThresholdConfig> = {
        jabThreshold: 0.35,
        duckCooldown: 1200,
      };

      ui.setConfig(newConfig);
      const config = ui.getConfig();

      expect(config.jabThreshold).toBe(0.35);
      expect(config.duckCooldown).toBe(1200);
      // Other values should remain default
      expect(config.blockProximityThreshold).toBe(
        DEFAULT_THRESHOLD_CONFIG.blockProximityThreshold
      );
    });

    it('should save to localStorage when set programmatically', () => {
      ui.setConfig({ jabThreshold: 0.35 });

      const saved = localStorage.getItem('possessed-brawl-thresholds');
      const parsed = JSON.parse(saved!);
      expect(parsed.jabThreshold).toBe(0.35);
    });

    it('should trigger onChange when set programmatically', () => {
      const onChange = vi.fn();
      ui.dispose();
      ui = new ThresholdTuningUI(container, onChange);

      ui.setConfig({ jabThreshold: 0.35 });
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Value Ranges and Steps', () => {
    beforeEach(() => {
      ui = new ThresholdTuningUI(container);
      ui.show();
    });

    it('should enforce minimum and maximum values for sliders', () => {
      const sliders = Array.from(
        container.querySelectorAll('input[type="range"]')
      ) as HTMLInputElement[];

      sliders.forEach((slider) => {
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        expect(min).toBeGreaterThanOrEqual(0); // Allow 0 for stamina threshold
        expect(max).toBeGreaterThan(min);
      });
    });

    it('should use appropriate step values for precision', () => {
      const sliders = Array.from(
        container.querySelectorAll('input[type="range"]')
      ) as HTMLInputElement[];

      sliders.forEach((slider) => {
        const step = parseFloat(slider.step);
        expect(step).toBeGreaterThan(0);
      });
    });
  });

  describe('UI Styling', () => {
    beforeEach(() => {
      ui = new ThresholdTuningUI(container);
      ui.show();
    });

    it('should position panel in top-right corner', () => {
      const panel = document.getElementById('threshold-tuning-ui');
      expect(panel?.style.position).toBe('fixed');
      expect(panel?.style.right).toBe('10px');
      expect(panel?.style.top).toBe('10px');
    });

    it('should be scrollable if content overflows', () => {
      const panel = document.getElementById('threshold-tuning-ui');
      expect(panel?.style.overflowY).toBe('auto');
      expect(panel?.style.maxHeight).toBe('90vh');
    });

    it('should have high z-index to appear above game content', () => {
      const panel = document.getElementById('threshold-tuning-ui');
      const zIndex = parseInt(panel?.style.zIndex || '0');
      expect(zIndex).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Cleanup', () => {
    it('should remove UI from DOM when disposed', () => {
      ui = new ThresholdTuningUI(container);
      const panel = document.getElementById('threshold-tuning-ui');
      expect(panel).toBeTruthy();

      ui.dispose();
      const panelAfterDispose = document.getElementById('threshold-tuning-ui');
      expect(panelAfterDispose).toBeNull();
    });
  });
});
