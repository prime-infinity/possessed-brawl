/**
 * ThresholdTuningUI component implementation
 * 
 * Provides a developer-focused UI for tuning move detection thresholds
 * and cooldown parameters. Includes sliders for all configurable values
 * and persists settings to localStorage.
 * 
 * **Validates: Requirements 4.4, 5.4, 6.5, 7.4, 8.6, 12.5**
 */

import { ThresholdConfig, DEFAULT_THRESHOLD_CONFIG } from '../types/move';

const STORAGE_KEY = 'possessed-brawl-thresholds';

/**
 * Configuration for a single slider control
 */
interface SliderConfig {
  key: keyof ThresholdConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

/**
 * Slider configurations for all threshold parameters
 */
const SLIDER_CONFIGS: SliderConfig[] = [
  // Jab
  {
    key: 'jabThreshold',
    label: 'Jab Threshold',
    min: 0.05,
    max: 0.5,
    step: 0.01,
    unit: '',
  },
  {
    key: 'jabCooldown',
    label: 'Jab Cooldown',
    min: 100,
    max: 2000,
    step: 50,
    unit: 'ms',
  },
  // Power Punch
  {
    key: 'powerPunchThreshold',
    label: 'Power Punch Threshold',
    min: 0.05,
    max: 0.5,
    step: 0.01,
    unit: '',
  },
  {
    key: 'powerPunchCooldown',
    label: 'Power Punch Cooldown',
    min: 200,
    max: 3000,
    step: 100,
    unit: 'ms',
  },
  // Duck
  {
    key: 'duckThreshold',
    label: 'Duck Threshold',
    min: 0.05,
    max: 0.5,
    step: 0.01,
    unit: '',
  },
  {
    key: 'duckTimeWindow',
    label: 'Duck Time Window',
    min: 100,
    max: 1000,
    step: 50,
    unit: 'ms',
  },
  {
    key: 'duckCooldown',
    label: 'Duck Cooldown',
    min: 200,
    max: 2000,
    step: 50,
    unit: 'ms',
  },
  // Block
  {
    key: 'blockProximityThreshold',
    label: 'Block Proximity',
    min: 0.1,
    max: 0.5,
    step: 0.01,
    unit: '',
  },
  // Charge
  {
    key: 'chargeProximityThreshold',
    label: 'Charge Proximity',
    min: 0.05,
    max: 0.3,
    step: 0.01,
    unit: '',
  },
  {
    key: 'chargeReleaseThreshold',
    label: 'Charge Release',
    min: 0.2,
    max: 0.6,
    step: 0.01,
    unit: '',
  },
  {
    key: 'chargeStaminaThreshold',
    label: 'Charge Stamina',
    min: 0,
    max: 100,
    step: 5,
    unit: '',
  },
  {
    key: 'chargeCooldown',
    label: 'Charge Cooldown',
    min: 500,
    max: 5000,
    step: 250,
    unit: 'ms',
  },
  // Depth Control
  {
    key: 'shoulderWidthForwardThreshold',
    label: 'Forward Threshold',
    min: 0.05,
    max: 0.3,
    step: 0.01,
    unit: '',
  },
  {
    key: 'shoulderWidthBackwardThreshold',
    label: 'Backward Threshold',
    min: 0.05,
    max: 0.3,
    step: 0.01,
    unit: '',
  },
];

/**
 * ThresholdTuningUI class
 * 
 * Creates and manages a UI panel with sliders for all threshold parameters.
 * Automatically saves changes to localStorage and triggers callbacks on update.
 */
export class ThresholdTuningUI {
  private container: HTMLElement;
  private currentConfig: ThresholdConfig;
  private onChangeCallback?: (config: ThresholdConfig) => void;
  private isVisible: boolean;

  /**
   * Create a new ThresholdTuningUI
   * 
   * @param parentElement - Parent element to attach the UI to
   * @param onChange - Optional callback triggered when any threshold changes
   */
  constructor(
    parentElement: HTMLElement,
    onChange?: (config: ThresholdConfig) => void
  ) {
    this.onChangeCallback = onChange;
    this.isVisible = false;

    // Load saved config or use defaults
    this.currentConfig = this.loadConfig();

    // Create UI container
    this.container = this.createContainer();
    parentElement.appendChild(this.container);

    // Build slider controls
    this.buildUI();

    // Initial visibility (hidden by default)
    this.hide();
  }

  /**
   * Load configuration from localStorage or use defaults
   */
  private loadConfig(): ThresholdConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_THRESHOLD_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load threshold config from localStorage:', e);
    }
    return { ...DEFAULT_THRESHOLD_CONFIG };
  }

  /**
   * Save current configuration to localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentConfig));
    } catch (e) {
      console.warn('Failed to save threshold config to localStorage:', e);
    }
  }

  /**
   * Create the main container element
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'threshold-tuning-ui';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 350px;
      max-height: 90vh;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      padding: 15px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 1000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `;
    return container;
  }

  /**
   * Build the complete UI with all sliders
   */
  private buildUI(): void {
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #444;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Threshold Tuning';
    title.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: bold;
    `;

    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Defaults';
    resetButton.style.cssText = `
      padding: 5px 10px;
      background: #444;
      color: #fff;
      border: 1px solid #666;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    `;
    resetButton.addEventListener('click', () => this.resetToDefaults());
    resetButton.addEventListener('mouseenter', () => {
      resetButton.style.background = '#555';
    });
    resetButton.addEventListener('mouseleave', () => {
      resetButton.style.background = '#444';
    });

    header.appendChild(title);
    header.appendChild(resetButton);
    this.container.appendChild(header);

    // Create sections for different move types
    this.createSection('Jab', ['jabThreshold', 'jabCooldown']);
    this.createSection('Power Punch', [
      'powerPunchThreshold',
      'powerPunchCooldown',
    ]);
    this.createSection('Duck', [
      'duckThreshold',
      'duckTimeWindow',
      'duckCooldown',
    ]);
    this.createSection('Block', ['blockProximityThreshold']);
    this.createSection('Charge Attack', [
      'chargeProximityThreshold',
      'chargeReleaseThreshold',
      'chargeStaminaThreshold',
      'chargeCooldown',
    ]);
    this.createSection('Depth Control', [
      'shoulderWidthForwardThreshold',
      'shoulderWidthBackwardThreshold',
    ]);

    // Instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #444;
      font-size: 10px;
      color: #aaa;
    `;
    instructions.innerHTML = `
      <p style="margin: 5px 0;">Press 'T' to toggle this panel</p>
      <p style="margin: 5px 0;">Values are saved automatically to localStorage</p>
    `;
    this.container.appendChild(instructions);
  }

  /**
   * Create a section with grouped sliders
   */
  private createSection(
    title: string,
    keys: Array<keyof ThresholdConfig>
  ): void {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 15px;
    `;

    const sectionTitle = document.createElement('h4');
    sectionTitle.textContent = title;
    sectionTitle.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 13px;
      font-weight: bold;
      color: #4a9eff;
    `;
    section.appendChild(sectionTitle);

    // Create sliders for each key in this section
    keys.forEach((key) => {
      const config = SLIDER_CONFIGS.find((c) => c.key === key);
      if (config) {
        const slider = this.createSlider(config);
        section.appendChild(slider);
      }
    });

    this.container.appendChild(section);
  }

  /**
   * Create a single slider control with label and value display
   */
  private createSlider(config: SliderConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 12px;
    `;

    // Label and current value display
    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    `;

    const label = document.createElement('label');
    label.textContent = config.label;
    label.style.cssText = `
      font-size: 11px;
      color: #ddd;
    `;

    const valueDisplay = document.createElement('span');
    valueDisplay.style.cssText = `
      font-size: 11px;
      color: #4a9eff;
      font-weight: bold;
    `;
    valueDisplay.id = `value-${config.key}`;
    this.updateValueDisplay(valueDisplay, config);

    labelRow.appendChild(label);
    labelRow.appendChild(valueDisplay);
    wrapper.appendChild(labelRow);

    // Slider input
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = config.min.toString();
    slider.max = config.max.toString();
    slider.step = config.step.toString();
    slider.value = this.currentConfig[config.key].toString();
    slider.style.cssText = `
      width: 100%;
      cursor: pointer;
    `;

    // Update on change
    slider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      this.currentConfig[config.key] = value as any;
      this.updateValueDisplay(valueDisplay, config);
      this.saveConfig();
      if (this.onChangeCallback) {
        this.onChangeCallback(this.currentConfig);
      }
    });

    wrapper.appendChild(slider);
    return wrapper;
  }

  /**
   * Update the value display for a slider
   */
  private updateValueDisplay(
    element: HTMLElement,
    config: SliderConfig
  ): void {
    const value = this.currentConfig[config.key];
    const formatted =
      typeof value === 'number' && !Number.isInteger(value)
        ? value.toFixed(2)
        : value.toString();
    element.textContent = `${formatted}${config.unit}`;
  }

  /**
   * Reset all thresholds to default values
   */
  private resetToDefaults(): void {
    this.currentConfig = { ...DEFAULT_THRESHOLD_CONFIG };
    this.saveConfig();

    // Update all slider values and displays
    SLIDER_CONFIGS.forEach((config) => {
      const slider = this.container.querySelector(
        `input[value]`
      ) as HTMLInputElement;
      if (slider) {
        slider.value = this.currentConfig[config.key].toString();
      }

      const valueDisplay = this.container.querySelector(
        `#value-${config.key}`
      ) as HTMLElement;
      if (valueDisplay) {
        this.updateValueDisplay(valueDisplay, config);
      }
    });

    // Rebuild UI to ensure all values are updated
    this.container.innerHTML = '';
    this.buildUI();

    if (this.onChangeCallback) {
      this.onChangeCallback(this.currentConfig);
    }
  }

  /**
   * Show the tuning UI
   */
  show(): void {
    this.isVisible = true;
    this.container.style.display = 'block';
  }

  /**
   * Hide the tuning UI
   */
  hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  /**
   * Toggle visibility of the tuning UI
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Get current visibility state
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get current threshold configuration
   */
  getConfig(): ThresholdConfig {
    return { ...this.currentConfig };
  }

  /**
   * Set threshold configuration programmatically
   */
  setConfig(config: Partial<ThresholdConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
    this.saveConfig();

    // Update UI
    this.container.innerHTML = '';
    this.buildUI();

    if (this.onChangeCallback) {
      this.onChangeCallback(this.currentConfig);
    }
  }

  /**
   * Clean up and remove the UI
   */
  dispose(): void {
    this.container.remove();
  }
}
