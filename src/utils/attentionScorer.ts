/**
 * Attention and Focus Scoring System
 * Calculates real-time focus score based on research methodologies
 */

import { FocusState, GazeData } from './gazeEstimator';
import { DetectedObject } from './objectDetector';
import { FaceVerificationResult } from './faceVerifier';

export interface AttentionScore {
  overall: number; // 0-100
  gaze: number;
  headPose: number;
  facePresence: number;
  objectsDetected: number;
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

export interface ViolationEvent {
  id: string;
  timestamp: Date;
  type: 'gaze_away' | 'multiple_faces' | 'no_face' | 'prohibited_object' | 'prolonged_distraction';
  severity: 'low' | 'medium' | 'high';
  description: string;
  metadata?: any;
}

export class AttentionScorer {
  private gazeHistory: FocusState[] = [];
  private violations: ViolationEvent[] = [];
  private readonly HISTORY_SIZE = 30; // 30 frames of history (~1 second at 30fps)
  private readonly DISTRACTION_THRESHOLD = 10; // Frames before alerting
  private consecutiveDistractions = 0;

  updateScore(
    gazeData: GazeData | null,
    faceData: FaceVerificationResult,
    objects: DetectedObject[]
  ): AttentionScore {
    // Update gaze history
    if (gazeData) {
      this.gazeHistory.push(gazeData.focusState);
      if (this.gazeHistory.length > this.HISTORY_SIZE) {
        this.gazeHistory.shift();
      }

      // Track consecutive distractions
      if (gazeData.focusState !== 'focused') {
        this.consecutiveDistractions++;
        if (this.consecutiveDistractions >= this.DISTRACTION_THRESHOLD) {
          this.addViolation({
            type: 'prolonged_distraction',
            severity: 'medium',
            description: `Student distracted for ${this.consecutiveDistractions} frames`,
            metadata: { focusState: gazeData.focusState, duration: this.consecutiveDistractions }
          });
        }
      } else {
        this.consecutiveDistractions = 0;
      }
    }

    // Calculate component scores
    const gazeScore = this.calculateGazeScore(gazeData);
    const headPoseScore = this.calculateHeadPoseScore(gazeData);
    const facePresenceScore = this.calculateFacePresenceScore(faceData);
    const objectScore = this.calculateObjectScore(objects);

    // Weighted overall score (research-based weights)
    const overall = Math.round(
      gazeScore * 0.35 +
      headPoseScore * 0.25 +
      facePresenceScore * 0.25 +
      objectScore * 0.15
    );

    // Determine attention level
    const level = this.determineLevel(overall);

    return {
      overall,
      gaze: gazeScore,
      headPose: headPoseScore,
      facePresence: facePresenceScore,
      objectsDetected: objectScore,
      level
    };
  }

  private calculateGazeScore(gazeData: GazeData | null): number {
    if (!gazeData) return 0;

    const recentHistory = this.gazeHistory.slice(-10); // Last 10 frames
    if (recentHistory.length === 0) return 50;

    const focusedCount = recentHistory.filter(state => state === 'focused').length;
    const distractedCount = recentHistory.filter(state => state === 'distracted').length;
    const awayCount = recentHistory.filter(state => state === 'away').length;

    // Research-based scoring: focused = 100%, distracted = 50%, away = 0%
    const score = (focusedCount * 100 + distractedCount * 50) / recentHistory.length;
    
    return Math.round(score);
  }

  private calculateHeadPoseScore(gazeData: GazeData | null): number {
    if (!gazeData) return 0;

    const { pitch, yaw, roll } = gazeData.headPose;

    // Research thresholds: ±20° yaw, ±15° pitch is ideal
    const yawScore = Math.max(0, 100 - (Math.abs(yaw) * 2.5)); // 0 at ±40°
    const pitchScore = Math.max(0, 100 - (Math.abs(pitch) * 3.33)); // 0 at ±30°
    const rollScore = Math.max(0, 100 - (Math.abs(roll) * 5)); // 0 at ±20°

    return Math.round((yawScore + pitchScore + rollScore) / 3);
  }

  private calculateFacePresenceScore(faceData: FaceVerificationResult): number {
    if (!faceData.faceDetected) {
      this.addViolation({
        type: 'no_face',
        severity: 'high',
        description: 'No face detected in frame'
      });
      return 0;
    }

    if (faceData.multipleFaces) {
      this.addViolation({
        type: 'multiple_faces',
        severity: 'high',
        description: `${faceData.faceCount} faces detected (expected 1)`,
        metadata: { faceCount: faceData.faceCount }
      });
      return 30; // Severe penalty but not zero
    }

    // Single face with good confidence
    return Math.round(faceData.confidence * 100);
  }

  private calculateObjectScore(objects: DetectedObject[]): number {
    const prohibitedObjects = objects.filter(obj => obj.isProhibited);
    
    if (prohibitedObjects.length > 0) {
      prohibitedObjects.forEach(obj => {
        this.addViolation({
          type: 'prohibited_object',
          severity: 'high',
          description: `Prohibited object detected: ${obj.label}`,
          metadata: { object: obj.label, confidence: obj.score }
        });
      });
      
      // Severe penalty for prohibited objects
      return Math.max(0, 100 - (prohibitedObjects.length * 30));
    }

    return 100;
  }

  private determineLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  private addViolation(violation: Omit<ViolationEvent, 'id' | 'timestamp'>): void {
    // Prevent duplicate violations in quick succession
    const now = new Date();
    const recentViolation = this.violations
      .slice(-5)
      .find(v => v.type === violation.type && 
                 (now.getTime() - v.timestamp.getTime()) < 2000);
    
    if (recentViolation) return;

    const event: ViolationEvent = {
      ...violation,
      id: `${violation.type}_${Date.now()}`,
      timestamp: now
    };

    this.violations.push(event);
    console.warn('🚨 Violation recorded:', event);
  }

  getViolations(limit?: number): ViolationEvent[] {
    const sorted = [...this.violations].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  clearViolations(): void {
    this.violations = [];
    this.gazeHistory = [];
    this.consecutiveDistractions = 0;
  }

  getStats() {
    return {
      totalViolations: this.violations.length,
      byType: this.violations.reduce((acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: this.violations.reduce((acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}
