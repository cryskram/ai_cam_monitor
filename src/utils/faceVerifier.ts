/**
 * Face Detection and Verification
 * Ensures single person in frame and tracks face presence
 * Based on continuous authentication approach from research
 */

import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

export interface FaceVerificationResult {
  faceCount: number;
  faceDetected: boolean;
  multipleFaces: boolean;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class FaceVerifier {
  private faceDetector: FaceDetector | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔄 Initializing face detector...');
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      this.faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: "GPU"
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5
      });

      this.initialized = true;
      console.log('✅ Face verifier initialized');
    } catch (error) {
      console.error('❌ Failed to initialize face verifier:', error);
      throw error;
    }
  }

  async verifyFace(video: HTMLVideoElement, timestamp: number): Promise<FaceVerificationResult> {
    if (!this.faceDetector || !this.initialized) {
      console.warn('⚠️ Face verifier not initialized');
      return {
        faceCount: 0,
        faceDetected: false,
        multipleFaces: false,
        confidence: 0
      };
    }

    try {
      const results = this.faceDetector.detectForVideo(video, timestamp);
      const faceCount = results.detections.length;
      
      if (faceCount === 0) {
        console.warn('⚠️ No face detected');
        return {
          faceCount: 0,
          faceDetected: false,
          multipleFaces: false,
          confidence: 0
        };
      }

      if (faceCount > 1) {
        console.warn('🚨 Multiple faces detected:', faceCount);
        return {
          faceCount,
          faceDetected: true,
          multipleFaces: true,
          confidence: results.detections[0].categories[0].score
        };
      }

      // Single face detected - ideal state
      const detection = results.detections[0];
      const boundingBox = detection.boundingBox;

      return {
        faceCount: 1,
        faceDetected: true,
        multipleFaces: false,
        confidence: detection.categories[0].score,
        boundingBox: boundingBox ? {
          x: boundingBox.originX,
          y: boundingBox.originY,
          width: boundingBox.width,
          height: boundingBox.height
        } : undefined
      };
    } catch (error) {
      console.error('❌ Error in face verification:', error);
      return {
        faceCount: 0,
        faceDetected: false,
        multipleFaces: false,
        confidence: 0
      };
    }
  }

  async close(): Promise<void> {
    if (this.faceDetector) {
      this.faceDetector.close();
      this.faceDetector = null;
    }
    this.initialized = false;
    console.log('🔒 Face verifier closed');
  }
}
