/**
 * PoseDetector Component
 * 
 * Responsible for capturing webcam input, processing frames through MediaPipe Pose,
 * and extracting/smoothing body landmarks.
 * 
 * **Validates: Requirements 1.1, 1.4, 1.7**
 */

import { Landmark, Landmarks, PoseDetectorConfig } from '../types';

/**
 * Error types for webcam and MediaPipe initialization
 */
export enum PoseDetectorErrorType {
  PERMISSION_DENIED = 'permission_denied',
  NO_CAMERA = 'no_camera',
  CAMERA_IN_USE = 'camera_in_use',
  INITIALIZATION_FAILED = 'initialization_failed',
  UNKNOWN = 'unknown'
}

/**
 * Custom error class for PoseDetector errors
 */
export class PoseDetectorError extends Error {
  constructor(
    public type: PoseDetectorErrorType,
    message: string
  ) {
    super(message);
    this.name = 'PoseDetectorError';
  }
}

/**
 * Default configuration for PoseDetector
 */
const DEFAULT_CONFIG: PoseDetectorConfig = {
  visibilityThreshold: 0.5,
  smoothingAlpha: 0.3,
  targetFps: 30,
  modelComplexity: 0,  // lite model for mobile performance
  mirrorDisplay: true
};

/**
 * PoseDetector implementation for webcam pose detection
 * 
 * **Validates: Requirements 1.1, 1.4, 1.7**
 */
export class PoseDetector {
  private config: PoseDetectorConfig;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private previousLandmarks: Landmarks | null = null;
  private isInitialized = false;

  constructor(config: Partial<PoseDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize webcam and prepare for pose detection
   * 
   * Requests webcam permission with mobile-appropriate constraints,
   * sets up video element with mirrored display.
   * 
   * **Validates: Requirements 1.1, 1.4, 1.7**
   * 
   * @throws {PoseDetectorError} if webcam access fails
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('PoseDetector already initialized');
      return;
    }

    try {
      // Request webcam access with mobile-appropriate constraints
      // **Validates: Requirement 1.1** - capture webcam input at target fps
      // **Validates: Requirement 1.4** - work in mobile Chrome and Safari
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',  // Front-facing camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create hidden video element for webcam feed
      this.videoElement = document.createElement('video');
      this.videoElement.setAttribute('autoplay', '');
      this.videoElement.setAttribute('muted', '');
      this.videoElement.setAttribute('playsinline', '');  // Required for iOS
      
      // Apply mirroring transform
      // **Validates: Requirement 1.7** - mirror display so left corresponds to on-screen right
      if (this.config.mirrorDisplay) {
        this.videoElement.style.transform = 'scaleX(-1)';
      }
      
      // Hide the video element (we'll process frames but not display it directly)
      this.videoElement.style.position = 'absolute';
      this.videoElement.style.top = '-9999px';
      this.videoElement.style.left = '-9999px';
      
      // Attach stream to video element
      this.videoElement.srcObject = this.stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        if (!this.videoElement) {
          reject(new PoseDetectorError(
            PoseDetectorErrorType.INITIALIZATION_FAILED,
            'Video element was unexpectedly null'
          ));
          return;
        }

        this.videoElement.onloadedmetadata = () => {
          resolve();
        };

        this.videoElement.onerror = () => {
          reject(new PoseDetectorError(
            PoseDetectorErrorType.INITIALIZATION_FAILED,
            'Failed to load video metadata'
          ));
        };
      });

      // Start video playback
      await this.videoElement.play();

      // Append to document (hidden)
      document.body.appendChild(this.videoElement);

      this.isInitialized = true;
      console.log('PoseDetector initialized successfully');

    } catch (error) {
      // Handle specific webcam errors with clear messages
      // **Validates: Requirement 1.4** - handle permission denial with clear error messages
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            throw new PoseDetectorError(
              PoseDetectorErrorType.PERMISSION_DENIED,
              'Camera access was denied. Please allow camera permissions and try again.'
            );

          case 'NotFoundError':
          case 'DevicesNotFoundError':
            throw new PoseDetectorError(
              PoseDetectorErrorType.NO_CAMERA,
              'No camera device found. Please connect a camera and try again.'
            );

          case 'NotReadableError':
          case 'TrackStartError':
            throw new PoseDetectorError(
              PoseDetectorErrorType.CAMERA_IN_USE,
              'Camera is already in use by another application. Please close other applications and try again.'
            );

          default:
            throw new PoseDetectorError(
              PoseDetectorErrorType.UNKNOWN,
              `Camera initialization failed: ${error.message}`
            );
        }
      }

      // Re-throw PoseDetectorError instances
      if (error instanceof PoseDetectorError) {
        throw error;
      }

      // Handle unknown errors
      throw new PoseDetectorError(
        PoseDetectorErrorType.UNKNOWN,
        `Unexpected error during initialization: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Retry webcam initialization after permission denial
   * 
   * Provides a retry mechanism for permission requests.
   * 
   * **Validates: Requirement 1.4** - provide retry option after permission denial
   */
  async retry(): Promise<void> {
    // Clean up any existing resources
    this.dispose();
    
    // Reset initialization flag
    this.isInitialized = false;
    
    // Try to initialize again
    await this.initialize();
  }

  /**
   * Process a single video frame and return landmarks
   * 
   * NOTE: MediaPipe integration will be implemented in task 5.3.
   * This is a stub for now.
   * 
   * @returns Landmarks object or null if no valid pose detected
   */
  async processFrame(): Promise<Landmarks | null> {
    if (!this.isInitialized || !this.videoElement) {
      console.warn('PoseDetector not initialized');
      return null;
    }

    // TODO: Implement MediaPipe Pose processing in task 5.3
    // For now, return null (no landmarks detected)
    return null;
  }

  /**
   * Apply EMA smoothing to landmark positions
   * 
   * Applies Exponential Moving Average filter with configurable alpha
   * to each landmark's x, y, z coordinates for stability.
   * 
   * **Validates: Requirement 1.3** - smooth joint positions over multiple frames
   * 
   * @param raw - Raw landmark data from current frame
   * @param previous - Previously smoothed landmark data
   * @returns Smoothed landmark data
   */
  smoothLandmarks(raw: Landmarks, previous: Landmarks): Landmarks {
    const alpha = this.config.smoothingAlpha;
    
    // Apply EMA: smoothed = alpha * raw + (1 - alpha) * previous
    const smoothedPoints: Landmark[] = raw.points.map((rawPoint, index) => {
      const prevPoint = previous.points[index];
      
      // Skip smoothing if previous landmark doesn't exist
      if (!prevPoint) {
        return rawPoint;
      }

      // Skip smoothing if landmark visibility is below threshold
      if (!this.isLandmarkVisible(rawPoint)) {
        return prevPoint;  // Keep previous value
      }

      return {
        x: alpha * rawPoint.x + (1 - alpha) * prevPoint.x,
        y: alpha * rawPoint.y + (1 - alpha) * prevPoint.y,
        z: alpha * rawPoint.z + (1 - alpha) * prevPoint.z,
        visibility: rawPoint.visibility
      };
    });

    return {
      points: smoothedPoints,
      timestamp: raw.timestamp
    };
  }

  /**
   * Check if a landmark has sufficient visibility
   * 
   * **Validates: Requirement 1.6** - ignore joints below visibility threshold
   * 
   * @param landmark - The landmark to check
   * @returns true if visibility >= configured threshold
   */
  isLandmarkVisible(landmark: Landmark): boolean {
    return landmark.visibility >= this.config.visibilityThreshold;
  }

  /**
   * Get the video element for external rendering/processing
   * 
   * @returns The video element or null if not initialized
   */
  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  /**
   * Get the current configuration
   * 
   * @returns Current PoseDetectorConfig
   */
  getConfig(): PoseDetectorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * 
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<PoseDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if the detector is initialized
   * 
   * @returns true if initialized and ready to process frames
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Release resources and cleanup
   * 
   * Stops webcam stream and removes video element.
   */
  dispose(): void {
    // Stop all media tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Remove video element from DOM
    if (this.videoElement) {
      if (this.videoElement.parentNode) {
        this.videoElement.parentNode.removeChild(this.videoElement);
      }
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    // Clear state
    this.previousLandmarks = null;
    this.isInitialized = false;

    console.log('PoseDetector disposed');
  }
}
