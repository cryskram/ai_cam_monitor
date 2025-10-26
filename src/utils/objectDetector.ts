/**
 * Object Detection using Hugging Face Transformers
 * Detects prohibited items: mobile phones, books, notes, laptops
 * Based on YOLO approach from research papers
 */

import { pipeline } from '@huggingface/transformers';

export interface DetectedObject {
  label: string;
  score: number;
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  isProhibited: boolean;
}

export class ObjectDetector {
  private detector: any = null;
  private initialized = false;

  // Prohibited items based on research papers
  private readonly PROHIBITED_ITEMS = [
    'cell phone',
    'mobile phone',
    'book',
    'laptop',
    'notebook',
    'paper',
    'keyboard',
    'mouse',
    'tablet',
    'remote'
  ];

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔄 Initializing object detector (YOLO-based)...');
      
      // Using DETR (Detection Transformer) - modern alternative to YOLO
      this.detector = await pipeline(
        'object-detection',
        'Xenova/detr-resnet-50'
      );

      this.initialized = true;
      console.log('✅ Object detector initialized');
    } catch (error) {
      console.error('❌ Failed to initialize object detector:', error);
      throw error;
    }
  }

  async detectObjects(imageData: ImageData): Promise<DetectedObject[]> {
    if (!this.detector || !this.initialized) {
      console.warn('⚠️ Object detector not initialized');
      return [];
    }

    try {
      // Convert ImageData to format expected by transformers.js
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imageData, 0, 0);

      // Run object detection
      const results = await this.detector(canvas, {
        threshold: 0.3, // Research-based confidence threshold
        percentage: true
      });

      // Map results to our format and identify prohibited items
      const detectedObjects: DetectedObject[] = results.map((result: any) => {
        const label = result.label.toLowerCase();
        const isProhibited = this.PROHIBITED_ITEMS.some(item => 
          label.includes(item) || item.includes(label)
        );

        return {
          label: result.label,
          score: result.score,
          box: result.box,
          isProhibited
        };
      });

      // Log prohibited items
      const prohibitedDetections = detectedObjects.filter(obj => obj.isProhibited);
      if (prohibitedDetections.length > 0) {
        console.warn('🚨 Prohibited items detected:', 
          prohibitedDetections.map(obj => `${obj.label} (${(obj.score * 100).toFixed(1)}%)`).join(', ')
        );
      }

      return detectedObjects;
    } catch (error) {
      console.error('❌ Error in object detection:', error);
      return [];
    }
  }

  isProhibitedItem(label: string): boolean {
    const normalizedLabel = label.toLowerCase();
    return this.PROHIBITED_ITEMS.some(item => 
      normalizedLabel.includes(item) || item.includes(normalizedLabel)
    );
  }

  async close(): Promise<void> {
    // Transformers.js doesn't require explicit cleanup
    this.detector = null;
    this.initialized = false;
    console.log('🔒 Object detector closed');
  }
}
