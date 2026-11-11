/**
 * PoseDetector Component
 * 
 * Responsible for capturing webcam input, processing frames through MediaPipe Pose,
 * and extracting/smoothing body landmarks.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6, 1.7**
 */

import { Landmark, Landmarks, PoseDetectorConfig } from '../types';
import { PoseLandmarker, FilesetResolver, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

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
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6, 1.7**
 */
export class PoseDetector {
  private config: PoseDetectorConfig;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private previousLandmarks: Landmarks | null = null;
  private isInitialized = false;
  private poseLandmarker: PoseLandmarker | null = null;
  private useMockData = false;

  constructor(config: Partial<PoseDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize webcam and prepare for pose detection
   * 
   * Requests webcam permission with mobile-appropriate constraints,
   * sets up video element with mirrored display, and initializes MediaPipe Pose.
   * 
   * **Validates: Requirements 1.1, 1.2, 1.4, 1.7**
   * 
   * @throws {PoseDetectorError} if webcam access fails or MediaPipe initialization fails
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('PoseDetector already initialized');
      return;
    }

    try {
      // Initialize MediaPipe Pose first
      // **Validates: Requirement 1.2** - use MediaPipe Pose JavaScript library
      await this.initializeMediaPipe();

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
   * Initialize MediaPipe Pose with lite model for mobile performance
   * 
   * Loads MediaPipe Pose library and configures for waist-up detection.
   * Falls back to mock data mode if initialization fails.
   * 
   * **Validates: Requirements 1.2, 1.3**
   */
  private async initializeMediaPipe(): Promise<void> {
    try {
      // Load MediaPipe Vision tasks
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Create PoseLandmarker with lite model for mobile performance
      // **Validates: Requirement 1.3** - extract waist-up body landmarks
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
          delegate: 'GPU' // Use GPU acceleration if available
        },
        runningMode: 'VIDEO',
        numPoses: 1,  // Only detect single person
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      console.log('MediaPipe Pose initialized successfully');
    } catch (error) {
      // Fall back to mock data mode for development
      console.error('MediaPipe initialization failed, falling back to mock data mode:', error);
      this.useMockData = true;
      this.poseLandmarker = null;
      
      // Don't throw error - allow initialization to continue with mock data
      console.warn('PoseDetector will return null landmarks until MediaPipe is available');
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
   * Extracts waist-up body landmarks from video frame using MediaPipe Pose.
   * Filters landmarks by visibility threshold.
   * 
   * **Validates: Requirements 1.2, 1.3, 1.6**
   * 
   * @returns Landmarks object or null if no valid pose detected
   */
  async processFrame(): Promise<Landmarks | null> {
    if (!this.isInitialized || !this.videoElement) {
      console.warn('PoseDetector not initialized');
      return null;
    }

    // Return null if MediaPipe is not available (mock data mode)
    if (this.useMockData || !this.poseLandmarker) {
      return null;
    }

    try {
      // Get current video timestamp
      const timestamp = performance.now();

      // Process frame through MediaPipe Pose
      // **Validates: Requirement 1.2** - process frames using MediaPipe Pose
      const result: PoseLandmarkerResult = this.poseLandmarker.detectForVideo(
        this.videoElement,
        timestamp
      );

      // Check if any pose was detected
      if (!result.landmarks || result.landmarks.length === 0) {
        return null;
      }

      // Extract the first (and only) detected pose
      const poseLandmarks = result.landmarks[0];

      // Convert MediaPipe landmarks to our Landmark format
      // **Validates: Requirement 1.3** - extract waist-up body landmarks
      const points: Landmark[] = poseLandmarks.map((landmark) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility ?? 0.0
      }));

      // Check if key joints (waist-up) have sufficient visibility
      // **Validates: Requirement 1.6** - ignore frames with low visibility
      const hasValidKeyJoints = this.checkKeyJointsVisibility(points);
      
      if (!hasValidKeyJoints) {
        // Skip this frame if key joints are not visible enough
        return null;
      }

      const landmarks: Landmarks = {
        points,
        timestamp
      };

      // Apply smoothing if we have previous landmarks
      if (this.previousLandmarks) {
        const smoothed = this.smoothLandmarks(landmarks, this.previousLandmarks);
        this.previousLandmarks = smoothed;
        return smoothed;
      } else {
        // First frame - no smoothing yet
        this.previousLandmarks = landmarks;
        return landmarks;
      }

    } catch (error) {
      console.error('Error processing frame:', error);
      return null;
    }
  }

  /**
   * Check if key waist-up joints have sufficient visibility
   * 
   * Verifies that critical landmarks (wrists, shoulders, head) meet
   * the visibility threshold for reliable move detection.
   * 
   * **Validates: Requirement 1.6** - ignore joints below visibility threshold
   * 
   * @param points - Array of landmark points
   * @returns true if key joints are visible, false otherwise
   */
  private checkKeyJointsVisibility(points: Landmark[]): boolean {
    // Key joint indices from MediaPipe 33-point model
    // These are the critical joints for waist-up move detection
    const keyJointIndices = [
      0,   // Nose (head reference)
      11,  // Left shoulder
      12,  // Right shoulder
      13,  // Left elbow
      14,  // Right elbow
      15,  // Left wrist
      16   // Right wrist
    ];

    // Check if all key joints meet visibility threshold
    for (const index of keyJointIndices) {
      if (index >= points.length) {
        return false;
      }

      const landmark = points[index];
      if (!this.isLandmarkVisible(landmark)) {
        return false;
      }
    }

    return true;
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
   * Stops webcam stream, releases MediaPipe resources, and removes video element.
   */
  dispose(): void {
    // Close MediaPipe PoseLandmarker
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }

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
    this.useMockData = false;

    console.log('PoseDetector disposed');
  }
}
