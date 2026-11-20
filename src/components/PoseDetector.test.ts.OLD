/**
 * Tests for PoseDetector component
 * 
 * Tests webcam initialization, permission handling, and error scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PoseDetector, PoseDetectorError, PoseDetectorErrorType } from './PoseDetector';
import type { Landmarks, Landmark } from '../types';

// Mock MediaPipe tasks-vision module
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({})
  },
  PoseLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: vi.fn().mockReturnValue({
        landmarks: []
      }),
      close: vi.fn()
    })
  }
}));

describe('PoseDetector', () => {
  let detector: PoseDetector;
  let mockStream: MediaStream;
  let mockVideoElement: HTMLVideoElement;

  beforeEach(() => {
    // Create mock MediaStream
    const mockTrack = {
      stop: vi.fn(),
      kind: 'video',
      enabled: true,
      readyState: 'live'
    } as unknown as MediaStreamTrack;

    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
      getVideoTracks: vi.fn(() => [mockTrack])
    } as unknown as MediaStream;

    // Mock navigator.mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream)
      }
    });

    // Mock document.createElement for video element
    mockVideoElement = {
      setAttribute: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      style: {},
      srcObject: null,
      onloadedmetadata: null,
      onerror: null,
      parentNode: null
    } as unknown as HTMLVideoElement;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') {
        return mockVideoElement;
      }
      return originalCreateElement(tagName);
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockVideoElement);

    detector = new PoseDetector();
  });

  afterEach(() => {
    detector.dispose();
    vi.restoreAllMocks();
  });

  describe('initialize()', () => {
    it('should request webcam access with mobile-appropriate constraints', async () => {
      // Trigger onloadedmetadata callback
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
    });

    it('should create a hidden video element with autoplay and muted attributes', async () => {
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();

      expect(mockVideoElement.setAttribute).toHaveBeenCalledWith('autoplay', '');
      expect(mockVideoElement.setAttribute).toHaveBeenCalledWith('muted', '');
      expect(mockVideoElement.setAttribute).toHaveBeenCalledWith('playsinline', '');
    });

    it('should apply mirror transform when mirrorDisplay is true', async () => {
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();

      expect(mockVideoElement.style.transform).toBe('scaleX(-1)');
    });

    it('should not apply mirror transform when mirrorDisplay is false', async () => {
      detector = new PoseDetector({ mirrorDisplay: false });
      
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();

      expect(mockVideoElement.style.transform).toBeUndefined();
    });

    it('should hide the video element off-screen', async () => {
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();

      expect(mockVideoElement.style.position).toBe('absolute');
      expect(mockVideoElement.style.top).toBe('-9999px');
      expect(mockVideoElement.style.left).toBe('-9999px');
    });

    it('should attach stream to video element and play', async () => {
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();

      expect(mockVideoElement.srcObject).toBe(mockStream);
      expect(mockVideoElement.play).toHaveBeenCalled();
    });

    it('should append video element to document body', async () => {
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();

      expect(document.body.appendChild).toHaveBeenCalledWith(mockVideoElement);
    });

    it('should throw PERMISSION_DENIED error when access is denied', async () => {
      const mockError = new DOMException('Permission denied', 'NotAllowedError');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(mockError);

      await expect(detector.initialize()).rejects.toThrow(PoseDetectorError);
      await expect(detector.initialize()).rejects.toThrow('Camera access was denied');
      
      try {
        await detector.initialize();
      } catch (error) {
        expect((error as PoseDetectorError).type).toBe(PoseDetectorErrorType.PERMISSION_DENIED);
      }
    });

    it('should throw NO_CAMERA error when no camera is found', async () => {
      const mockError = new DOMException('No camera found', 'NotFoundError');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(mockError);

      await expect(detector.initialize()).rejects.toThrow(PoseDetectorError);
      await expect(detector.initialize()).rejects.toThrow('No camera device found');
      
      try {
        await detector.initialize();
      } catch (error) {
        expect((error as PoseDetectorError).type).toBe(PoseDetectorErrorType.NO_CAMERA);
      }
    });

    it('should throw CAMERA_IN_USE error when camera is already in use', async () => {
      const mockError = new DOMException('Camera in use', 'NotReadableError');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(mockError);

      await expect(detector.initialize()).rejects.toThrow(PoseDetectorError);
      await expect(detector.initialize()).rejects.toThrow('Camera is already in use');
      
      try {
        await detector.initialize();
      } catch (error) {
        expect((error as PoseDetectorError).type).toBe(PoseDetectorErrorType.CAMERA_IN_USE);
      }
    });

    it('should throw UNKNOWN error for unhandled DOMException types', async () => {
      const mockError = new DOMException('Unknown error', 'UnknownError');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(mockError);

      await expect(detector.initialize()).rejects.toThrow(PoseDetectorError);
      
      try {
        await detector.initialize();
      } catch (error) {
        expect((error as PoseDetectorError).type).toBe(PoseDetectorErrorType.UNKNOWN);
      }
    });

    it('should not re-initialize if already initialized', async () => {
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      const callCount = vi.mocked(navigator.mediaDevices.getUserMedia).mock.calls.length;

      await detector.initialize();

      // Should not call getUserMedia again
      expect(vi.mocked(navigator.mediaDevices.getUserMedia).mock.calls.length).toBe(callCount);
    });
  });

  describe('retry()', () => {
    it('should clean up resources and re-initialize', async () => {
      // First initialization
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      expect(detector.isReady()).toBe(true);

      // Mock track for disposal check
      const stopSpy = vi.spyOn(mockStream.getTracks()[0], 'stop');

      // Retry
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.retry();

      expect(stopSpy).toHaveBeenCalled();
      expect(detector.isReady()).toBe(true);
    });
  });

  describe('smoothLandmarks()', () => {
    it('should apply EMA smoothing to landmark positions', () => {
      const rawLandmarks: Landmarks = {
        points: [
          { x: 1.0, y: 1.0, z: 0.0, visibility: 0.9 },
          { x: 0.5, y: 0.5, z: 0.0, visibility: 0.8 }
        ],
        timestamp: Date.now()
      };

      const previousLandmarks: Landmarks = {
        points: [
          { x: 0.0, y: 0.0, z: 0.0, visibility: 0.9 },
          { x: 0.0, y: 0.0, z: 0.0, visibility: 0.8 }
        ],
        timestamp: Date.now() - 33
      };

      const smoothed = detector.smoothLandmarks(rawLandmarks, previousLandmarks);

      // With alpha=0.3: smoothed = 0.3 * raw + 0.7 * previous
      expect(smoothed.points[0].x).toBeCloseTo(0.3 * 1.0 + 0.7 * 0.0, 5);
      expect(smoothed.points[0].y).toBeCloseTo(0.3 * 1.0 + 0.7 * 0.0, 5);
      expect(smoothed.points[1].x).toBeCloseTo(0.3 * 0.5 + 0.7 * 0.0, 5);
      expect(smoothed.points[1].y).toBeCloseTo(0.3 * 0.5 + 0.7 * 0.0, 5);
    });

    it('should skip smoothing for landmarks below visibility threshold', () => {
      const rawLandmarks: Landmarks = {
        points: [
          { x: 1.0, y: 1.0, z: 0.0, visibility: 0.3 }  // Below threshold
        ],
        timestamp: Date.now()
      };

      const previousLandmarks: Landmarks = {
        points: [
          { x: 0.5, y: 0.5, z: 0.0, visibility: 0.9 }
        ],
        timestamp: Date.now() - 33
      };

      const smoothed = detector.smoothLandmarks(rawLandmarks, previousLandmarks);

      // Should keep previous value since visibility is low
      expect(smoothed.points[0].x).toBe(0.5);
      expect(smoothed.points[0].y).toBe(0.5);
    });

    it('should return raw landmarks if no previous landmarks exist', () => {
      const rawLandmarks: Landmarks = {
        points: [
          { x: 1.0, y: 1.0, z: 0.0, visibility: 0.9 }
        ],
        timestamp: Date.now()
      };

      const previousLandmarks: Landmarks = {
        points: [],
        timestamp: Date.now() - 33
      };

      const smoothed = detector.smoothLandmarks(rawLandmarks, previousLandmarks);

      expect(smoothed.points[0]).toEqual(rawLandmarks.points[0]);
    });

    it('should respect custom smoothing alpha configuration', () => {
      detector = new PoseDetector({ smoothingAlpha: 0.7 });

      const rawLandmarks: Landmarks = {
        points: [
          { x: 1.0, y: 1.0, z: 0.0, visibility: 0.9 }
        ],
        timestamp: Date.now()
      };

      const previousLandmarks: Landmarks = {
        points: [
          { x: 0.0, y: 0.0, z: 0.0, visibility: 0.9 }
        ],
        timestamp: Date.now() - 33
      };

      const smoothed = detector.smoothLandmarks(rawLandmarks, previousLandmarks);

      // With alpha=0.7: smoothed = 0.7 * raw + 0.3 * previous
      expect(smoothed.points[0].x).toBeCloseTo(0.7 * 1.0 + 0.3 * 0.0, 5);
      expect(smoothed.points[0].y).toBeCloseTo(0.7 * 1.0 + 0.3 * 0.0, 5);
    });
  });

  describe('isLandmarkVisible()', () => {
    it('should return true when visibility is above threshold', () => {
      const landmark: Landmark = { x: 0, y: 0, z: 0, visibility: 0.7 };
      expect(detector.isLandmarkVisible(landmark)).toBe(true);
    });

    it('should return true when visibility equals threshold', () => {
      const landmark: Landmark = { x: 0, y: 0, z: 0, visibility: 0.5 };
      expect(detector.isLandmarkVisible(landmark)).toBe(true);
    });

    it('should return false when visibility is below threshold', () => {
      const landmark: Landmark = { x: 0, y: 0, z: 0, visibility: 0.3 };
      expect(detector.isLandmarkVisible(landmark)).toBe(false);
    });

    it('should respect custom visibility threshold configuration', () => {
      detector = new PoseDetector({ visibilityThreshold: 0.8 });

      const landmark: Landmark = { x: 0, y: 0, z: 0, visibility: 0.7 };
      expect(detector.isLandmarkVisible(landmark)).toBe(false);

      const visibleLandmark: Landmark = { x: 0, y: 0, z: 0, visibility: 0.9 };
      expect(detector.isLandmarkVisible(visibleLandmark)).toBe(true);
    });
  });

  describe('processFrame()', () => {
    it('should return null if not initialized', async () => {
      const result = await detector.processFrame();
      expect(result).toBeNull();
    });

    it('should return null when no landmarks are detected', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // Mock detectForVideo to return empty landmarks
      const mockDetectForVideo = vi.fn().mockReturnValue({
        landmarks: []
      });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      const result = await detector.processFrame();
      
      expect(result).toBeNull();
    });

    it('should extract and return landmarks when pose is detected with high visibility', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // Mock landmarks with sufficient visibility for key joints
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0.0,
        visibility: 0.9
      }));
      
      const mockDetectForVideo = vi.fn().mockReturnValue({
        landmarks: [mockLandmarks]
      });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      const result = await detector.processFrame();
      
      expect(result).not.toBeNull();
      expect(result?.points).toHaveLength(33);
      expect(result?.points[0].visibility).toBe(0.9);
    });

    it('should return null when key joints have low visibility', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // Mock landmarks with low visibility for key joints
      const mockLandmarks = Array(33).fill(null).map((_, i) => {
        // Key joint indices: 0, 11, 12, 13, 14, 15, 16
        const isKeyJoint = [0, 11, 12, 13, 14, 15, 16].includes(i);
        return {
          x: 0.5,
          y: 0.5,
          z: 0.0,
          visibility: isKeyJoint ? 0.3 : 0.9  // Low visibility for key joints
        };
      });
      
      const mockDetectForVideo = vi.fn().mockReturnValue({
        landmarks: [mockLandmarks]
      });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      const result = await detector.processFrame();
      
      // Should return null because key joints don't meet visibility threshold
      expect(result).toBeNull();
    });

    it('should apply smoothing to consecutive frames', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // First frame landmarks
      const mockLandmarks1 = Array(33).fill(null).map(() => ({
        x: 0.0,
        y: 0.0,
        z: 0.0,
        visibility: 0.9
      }));
      
      // Second frame landmarks (different position)
      const mockLandmarks2 = Array(33).fill(null).map(() => ({
        x: 1.0,
        y: 1.0,
        z: 0.0,
        visibility: 0.9
      }));
      
      const mockDetectForVideo = vi.fn()
        .mockReturnValueOnce({ landmarks: [mockLandmarks1] })
        .mockReturnValueOnce({ landmarks: [mockLandmarks2] });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      
      // Process first frame
      const result1 = await detector.processFrame();
      expect(result1?.points[0].x).toBe(0.0);
      
      // Process second frame
      const result2 = await detector.processFrame();
      
      // Second frame should be smoothed (alpha=0.3)
      // smoothed = 0.3 * raw + 0.7 * previous = 0.3 * 1.0 + 0.7 * 0.0 = 0.3
      expect(result2?.points[0].x).toBeCloseTo(0.3, 5);
      expect(result2?.points[0].y).toBeCloseTo(0.3, 5);
    });
  });

  describe('dispose()', () => {
    it('should stop all media tracks', async () => {
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();

      const tracks = mockStream.getTracks();
      const stopSpy = vi.spyOn(tracks[0], 'stop');

      detector.dispose();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should remove video element from DOM', async () => {
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();

      // Mock parentNode with removeChild
      const removeChildSpy = vi.fn();
      Object.defineProperty(mockVideoElement, 'parentNode', {
        writable: true,
        value: {
          removeChild: removeChildSpy
        }
      });

      detector.dispose();

      expect(removeChildSpy).toHaveBeenCalledWith(mockVideoElement);
    });

    it('should reset initialization state', async () => {
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      expect(detector.isReady()).toBe(true);

      detector.dispose();
      expect(detector.isReady()).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should return video element when initialized', async () => {
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();

      expect(detector.getVideoElement()).toBe(mockVideoElement);
    });

    it('should return null video element when not initialized', () => {
      expect(detector.getVideoElement()).toBeNull();
    });

    it('should return current configuration', () => {
      const config = detector.getConfig();
      expect(config.visibilityThreshold).toBe(0.5);
      expect(config.smoothingAlpha).toBe(0.3);
      expect(config.mirrorDisplay).toBe(true);
    });

    it('should update configuration', () => {
      detector.updateConfig({ visibilityThreshold: 0.8 });
      
      const config = detector.getConfig();
      expect(config.visibilityThreshold).toBe(0.8);
      expect(config.smoothingAlpha).toBe(0.3); // Unchanged
    });
  });

  describe('Error handling for missing and malformed landmarks', () => {
    it('should handle landmarks with undefined visibility gracefully', () => {
      const landmarkWithUndefinedVisibility: Landmark = { 
        x: 0.5, 
        y: 0.5, 
        z: 0.0, 
        visibility: undefined as any 
      };

      // Should treat undefined visibility as 0 and return false
      const result = detector.isLandmarkVisible(landmarkWithUndefinedVisibility);
      expect(result).toBe(false);
    });

    it('should handle landmarks with NaN coordinates in smoothing', () => {
      const rawLandmarks: Landmarks = {
        points: [
          { x: NaN, y: NaN, z: NaN, visibility: 0.9 }
        ],
        timestamp: Date.now()
      };

      const previousLandmarks: Landmarks = {
        points: [
          { x: 0.5, y: 0.5, z: 0.0, visibility: 0.9 }
        ],
        timestamp: Date.now() - 33
      };

      const smoothed = detector.smoothLandmarks(rawLandmarks, previousLandmarks);

      // Should result in NaN values after applying EMA (NaN propagates through math)
      expect(isNaN(smoothed.points[0].x)).toBe(true);
      expect(isNaN(smoothed.points[0].y)).toBe(true);
      expect(isNaN(smoothed.points[0].z)).toBe(true);
    });

    it('should handle mismatched landmark array lengths in smoothing', () => {
      const rawLandmarks: Landmarks = {
        points: [
          { x: 1.0, y: 1.0, z: 0.0, visibility: 0.9 },
          { x: 0.8, y: 0.8, z: 0.0, visibility: 0.9 },
          { x: 0.6, y: 0.6, z: 0.0, visibility: 0.9 }
        ],
        timestamp: Date.now()
      };

      const previousLandmarks: Landmarks = {
        points: [
          { x: 0.0, y: 0.0, z: 0.0, visibility: 0.9 }
          // Only 1 landmark in previous, 3 in raw
        ],
        timestamp: Date.now() - 33
      };

      const smoothed = detector.smoothLandmarks(rawLandmarks, previousLandmarks);

      // First landmark should be smoothed
      expect(smoothed.points[0].x).toBeCloseTo(0.3, 5);
      
      // Second and third landmarks should use raw values (no previous data)
      expect(smoothed.points[1].x).toBe(0.8);
      expect(smoothed.points[2].x).toBe(0.6);
    });

    it('should handle empty previous landmarks array', () => {
      const rawLandmarks: Landmarks = {
        points: [
          { x: 1.0, y: 1.0, z: 0.0, visibility: 0.9 }
        ],
        timestamp: Date.now()
      };

      const previousLandmarks: Landmarks = {
        points: [],
        timestamp: Date.now() - 33
      };

      const smoothed = detector.smoothLandmarks(rawLandmarks, previousLandmarks);

      // Should return raw values when no previous data exists
      expect(smoothed.points[0].x).toBe(1.0);
      expect(smoothed.points[0].y).toBe(1.0);
    });

    it('should handle processFrame when MediaPipe returns null result', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // Mock detectForVideo to return null
      const mockDetectForVideo = vi.fn().mockReturnValue(null);
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      const result = await detector.processFrame();
      
      // Should handle gracefully and return null
      expect(result).toBeNull();
    });

    it('should handle processFrame when landmarks array is shorter than expected', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // Mock landmarks with only 10 landmarks instead of expected 33
      const incompleteLandmarks = Array(10).fill(null).map(() => ({
        x: 0.5,
        y: 0.5,
        z: 0.0,
        visibility: 0.9
      }));
      
      const mockDetectForVideo = vi.fn().mockReturnValue({
        landmarks: [incompleteLandmarks]
      });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      const result = await detector.processFrame();
      
      // Should return null because key joints (indices 11-16) are missing
      expect(result).toBeNull();
    });

    it('should handle processFrame when some landmarks are missing required properties', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // Mock landmarks where some have missing properties
      const malformedLandmarks = Array(33).fill(null).map((_, i) => {
        if (i === 15) {
          // Left wrist missing visibility property
          return { x: 0.5, y: 0.5, z: 0.0 } as any;
        }
        return { x: 0.5, y: 0.5, z: 0.0, visibility: 0.9 };
      });
      
      const mockDetectForVideo = vi.fn().mockReturnValue({
        landmarks: [malformedLandmarks]
      });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      const result = await detector.processFrame();
      
      // Should handle missing visibility (defaults to 0.0) and return null
      // because left wrist (key joint) will have visibility 0.0 < threshold 0.5
      expect(result).toBeNull();
    });

    it('should handle processFrame when detectForVideo throws an exception', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // Mock detectForVideo to throw an error
      const mockDetectForVideo = vi.fn().mockImplementation(() => {
        throw new Error('MediaPipe processing error');
      });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      
      // Should catch the error and return null
      const result = await detector.processFrame();
      expect(result).toBeNull();
    });

    it('should handle landmarks with negative visibility values', () => {
      const landmarkWithNegativeVisibility: Landmark = { 
        x: 0.5, 
        y: 0.5, 
        z: 0.0, 
        visibility: -0.5
      };

      // Should treat negative visibility as below threshold
      const result = detector.isLandmarkVisible(landmarkWithNegativeVisibility);
      expect(result).toBe(false);
    });

    it('should handle landmarks with visibility greater than 1.0', () => {
      const landmarkWithHighVisibility: Landmark = { 
        x: 0.5, 
        y: 0.5, 
        z: 0.0, 
        visibility: 1.5
      };

      // Should accept visibility > 1.0 (MediaPipe sometimes returns values slightly above 1.0)
      const result = detector.isLandmarkVisible(landmarkWithHighVisibility);
      expect(result).toBe(true);
    });
  });

  describe('Task 5.4: Frame processing and landmark extraction', () => {
    it('should extract waist-up landmarks (indices 0-16)', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // Create all 33 landmarks with high visibility
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5 + (i * 0.01),  // Unique positions
        y: 0.5 + (i * 0.01),
        z: 0.0,
        visibility: 0.9
      }));
      
      const mockDetectForVideo = vi.fn().mockReturnValue({
        landmarks: [mockLandmarks]
      });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      const result = await detector.processFrame();
      
      // Should return all 33 landmarks (MediaPipe full set)
      // The implementation extracts all landmarks but only checks visibility on waist-up indices
      expect(result).not.toBeNull();
      expect(result?.points).toHaveLength(33);
      
      // Verify waist-up landmarks (indices 0-16) are present
      // Key waist-up indices include: nose(0), shoulders(11-12), elbows(13-14), wrists(15-16)
      expect(result?.points[0]).toBeDefined(); // Nose
      expect(result?.points[11]).toBeDefined(); // Left shoulder
      expect(result?.points[12]).toBeDefined(); // Right shoulder
      expect(result?.points[13]).toBeDefined(); // Left elbow
      expect(result?.points[14]).toBeDefined(); // Right elbow
      expect(result?.points[15]).toBeDefined(); // Left wrist
      expect(result?.points[16]).toBeDefined(); // Right wrist
    });

    it('should filter landmarks by visibility threshold (default 0.5)', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // Create landmarks with mixed visibility
      const mockLandmarks = Array(33).fill(null).map((_, i) => {
        // Key joints (0, 11-16) have varying visibility
        const keyJointIndices = [0, 11, 12, 13, 14, 15, 16];
        const isKeyJoint = keyJointIndices.includes(i);
        
        return {
          x: 0.5,
          y: 0.5,
          z: 0.0,
          visibility: isKeyJoint && i === 15 ? 0.3 : 0.9  // Left wrist has low visibility
        };
      });
      
      const mockDetectForVideo = vi.fn().mockReturnValue({
        landmarks: [mockLandmarks]
      });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      const result = await detector.processFrame();
      
      // Should return null because left wrist (key joint at index 15) has visibility < 0.5
      expect(result).toBeNull();
    });

    it('should only process frames when all key waist-up joints are visible', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // Create landmarks where all key joints meet visibility threshold
      const mockLandmarksGood = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0.0,
        visibility: 0.9  // All above threshold
      }));

      // Create landmarks where one key joint is below threshold
      const mockLandmarksBad = Array(33).fill(null).map((_, i) => {
        const isNose = i === 0;
        return {
          x: 0.5,
          y: 0.5,
          z: 0.0,
          visibility: isNose ? 0.4 : 0.9  // Nose below threshold
        };
      });
      
      const mockDetectForVideo = vi.fn()
        .mockReturnValueOnce({ landmarks: [mockLandmarksGood] })
        .mockReturnValueOnce({ landmarks: [mockLandmarksBad] });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      
      // First frame with good visibility should succeed
      const result1 = await detector.processFrame();
      expect(result1).not.toBeNull();
      expect(result1?.points).toHaveLength(33);
      
      // Second frame with bad visibility should return null
      const result2 = await detector.processFrame();
      expect(result2).toBeNull();
    });

    it('should respect custom visibility threshold', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      // Create detector with higher threshold
      detector = new PoseDetector({ visibilityThreshold: 0.8 });
      
      // Create landmarks with visibility = 0.7 (above default 0.5, below custom 0.8)
      const mockLandmarks = Array(33).fill(null).map(() => ({
        x: 0.5,
        y: 0.5,
        z: 0.0,
        visibility: 0.7
      }));
      
      const mockDetectForVideo = vi.fn().mockReturnValue({
        landmarks: [mockLandmarks]
      });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      const result = await detector.processFrame();
      
      // Should return null because visibility (0.7) < threshold (0.8)
      expect(result).toBeNull();
    });

    it('should process frames with appropriate timing for 20-30 fps target', async () => {
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      const mockLandmarks = Array(33).fill(null).map(() => ({
        x: 0.5,
        y: 0.5,
        z: 0.0,
        visibility: 0.9
      }));
      
      const mockDetectForVideo = vi.fn().mockReturnValue({
        landmarks: [mockLandmarks]
      });
      
      vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
        detectForVideo: mockDetectForVideo,
        close: vi.fn()
      } as any);

      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      
      // Process multiple frames and measure timing
      const timestamps: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await detector.processFrame();
        const end = performance.now();
        timestamps.push(end - start);
      }
      
      // Each frame should process quickly (target: 33-50ms for 20-30 fps)
      // In test environment with mocks, should be very fast
      const avgTime = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;
      
      // In mocked environment, processing should be nearly instant (< 10ms)
      expect(avgTime).toBeLessThan(50);
    });
  });
});
