/**
 * Tests for PoseDetector component
 * 
 * Tests webcam initialization, permission handling, and error scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PoseDetector, PoseDetectorError, PoseDetectorErrorType } from './PoseDetector';
import type { Landmarks, Landmark } from '../types';

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

    it('should return null (stub implementation for task 5.2)', async () => {
      setTimeout(() => {
        if (mockVideoElement.onloadedmetadata) {
          mockVideoElement.onloadedmetadata({} as Event);
        }
      }, 0);

      await detector.initialize();
      const result = await detector.processFrame();
      
      // Stub implementation returns null until MediaPipe is integrated in task 5.3
      expect(result).toBeNull();
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
});
