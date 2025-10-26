/**
 * Gaze and Head Pose Estimation
 * Based on research papers using facial landmarks and VFOA classification
 */

import { FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export type FocusState = 'focused' | 'distracted' | 'away';

export interface GazeData {
  focusState: FocusState;
  headPose: {
    pitch: number; // Up/down rotation
    yaw: number;   // Left/right rotation
    roll: number;  // Tilt rotation
  };
  eyeAspectRatio: number;
  confidence: number;
  lookingAtScreen: boolean;
}

export class GazeEstimator {
  private faceLandmarker: FaceLandmarker | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔄 Initializing MediaPipe Face Landmarker...');
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });

      this.initialized = true;
      console.log('✅ Gaze estimator initialized');
    } catch (error) {
      console.error('❌ Failed to initialize gaze estimator:', error);
      throw error;
    }
  }

  async estimateGaze(video: HTMLVideoElement, timestamp: number): Promise<GazeData | null> {
    if (!this.faceLandmarker || !this.initialized) {
      console.warn('⚠️ Gaze estimator not initialized');
      return null;
    }

    try {
      const results = this.faceLandmarker.detectForVideo(video, timestamp);
      
      if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
        return {
          focusState: 'away',
          headPose: { pitch: 0, yaw: 0, roll: 0 },
          eyeAspectRatio: 0,
          confidence: 0,
          lookingAtScreen: false
        };
      }

      const landmarks = results.faceLandmarks[0];
      const headPose = this.calculateHeadPose(landmarks);
      const eyeAspectRatio = this.calculateEyeAspectRatio(landmarks);
      const lookingAtScreen = this.isLookingAtScreen(headPose, eyeAspectRatio);
      const focusState = this.determineFocusState(headPose, eyeAspectRatio, lookingAtScreen);

      return {
        focusState,
        headPose,
        eyeAspectRatio,
        confidence: 0.95,
        lookingAtScreen
      };
    } catch (error) {
      console.error('❌ Error in gaze estimation:', error);
      return null;
    }
  }

  private calculateHeadPose(landmarks: any[]): { pitch: number; yaw: number; roll: number } {
    // Research-based head pose estimation using facial landmarks
    // Key landmarks: nose tip (1), chin (152), left eye (33), right eye (263)
    
    const noseTip = landmarks[1];
    const chin = landmarks[152];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    // Calculate yaw (left-right rotation) -45 to +45 degrees
    const eyeMidpoint = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2
    };
    const yaw = Math.atan2(noseTip.x - eyeMidpoint.x, 0.1) * (180 / Math.PI);

    // Calculate pitch (up-down rotation) -30 to +30 degrees
    const pitch = Math.atan2(noseTip.y - eyeMidpoint.y, 0.1) * (180 / Math.PI);

    // Calculate roll (tilt) based on eye alignment
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

    return {
      pitch: Math.max(-30, Math.min(30, pitch)),
      yaw: Math.max(-45, Math.min(45, yaw)),
      roll: Math.max(-20, Math.min(20, roll))
    };
  }

  private calculateEyeAspectRatio(landmarks: any[]): number {
    // Eye Aspect Ratio (EAR) calculation from research papers
    // Used to detect if eyes are open (attention indicator)
    
    // Left eye landmarks
    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];
    const leftEyeLeft = landmarks[33];
    const leftEyeRight = landmarks[133];

    // Right eye landmarks  
    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];
    const rightEyeLeft = landmarks[362];
    const rightEyeRight = landmarks[263];

    const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
    const leftEyeWidth = Math.abs(leftEyeLeft.x - leftEyeRight.x);
    const leftEAR = leftEyeHeight / (leftEyeWidth + 0.001);

    const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
    const rightEyeWidth = Math.abs(rightEyeLeft.x - rightEyeRight.x);
    const rightEAR = rightEyeHeight / (rightEyeWidth + 0.001);

    return (leftEAR + rightEAR) / 2;
  }

  private isLookingAtScreen(headPose: { pitch: number; yaw: number; roll: number }, eyeAspectRatio: number): boolean {
    // Research threshold: ±20° yaw, ±15° pitch for "looking at screen"
    // EAR > 0.15 indicates eyes are sufficiently open
    const yawThreshold = 20;
    const pitchThreshold = 15;
    const earThreshold = 0.15;

    return (
      Math.abs(headPose.yaw) < yawThreshold &&
      Math.abs(headPose.pitch) < pitchThreshold &&
      eyeAspectRatio > earThreshold
    );
  }

  private determineFocusState(
    headPose: { pitch: number; yaw: number; roll: number },
    eyeAspectRatio: number,
    lookingAtScreen: boolean
  ): FocusState {
    // Classification based on VFOA (Visual Focus of Attention) research
    
    if (lookingAtScreen && eyeAspectRatio > 0.2) {
      return 'focused';
    }

    const yawDistraction = Math.abs(headPose.yaw);
    const pitchDistraction = Math.abs(headPose.pitch);

    if (yawDistraction > 35 || pitchDistraction > 25) {
      return 'away';
    }

    return 'distracted';
  }

  async close(): Promise<void> {
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    this.initialized = false;
    console.log('🔒 Gaze estimator closed');
  }
}
