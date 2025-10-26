# AI Exam Proctoring System - Technical Implementation

## Overview
Advanced real-time exam monitoring system using computer vision and machine learning, based on peer-reviewed research papers.

## Core Technologies

### 1. **Gaze & Head Pose Estimation** (`gazeEstimator.ts`)
- **Library**: MediaPipe Face Landmarker
- **Method**: 468 facial landmarks for precise tracking
- **Metrics**:
  - Pitch (up/down): ±30° range
  - Yaw (left/right): ±45° range  
  - Roll (tilt): ±20° range
  - Eye Aspect Ratio (EAR): Blink/attention detection
- **Classification**: VFOA (Visual Focus of Attention)
  - `focused`: Looking at screen, eyes open
  - `distracted`: Moderate deviation (20-35°)
  - `away`: Significant deviation (>35°)

### 2. **Object Detection** (`objectDetector.ts`)
- **Model**: DETR (Detection Transformer) - Xenova/detr-resnet-50
- **Modern alternative to YOLO** from research papers
- **Detects**: Mobile phones, books, laptops, notes, tablets
- **Confidence threshold**: 30% (research-based)
- **Real-time processing**: Every 10 frames to optimize performance

### 3. **Face Verification** (`faceVerifier.ts`)
- **Library**: MediaPipe Face Detector (BlazeFace)
- **Purpose**: Continuous authentication
- **Checks**:
  - Single person verification (flags multiple faces)
  - Face presence detection
  - Identity consistency tracking

### 4. **Attention Scoring** (`attentionScorer.ts`)
- **Algorithm**: Weighted multi-factor scoring
- **Weights** (research-based):
  - Gaze focus: 35%
  - Head pose: 25%
  - Face presence: 25%
  - Object detection: 15%
- **History**: 30-frame sliding window (~1 second)
- **Thresholds**: 10 consecutive frames trigger violation
- **Levels**: Excellent (90+), Good (75+), Fair (60+), Poor (40+), Critical (<40)

## Research Papers Used

1. **Paper15937.pdf** - Gaze tracking, facial aspect ratio, YOLO object detection
2. **Intelligent_solution_for_automatic_onlin.pdf** - Continuous authentication approach
3. **JRICST_56.pdf** - CNN/LSTM-based detection, 94% TDR at 2% FAR
4. **eai.16-4-2022.2318165.pdf** - Eye-gaze and head-pose analysis methods
5. **Paper24437.pdf** - Real-time monitoring with YOLO and behavior analytics
6. **Atoum_Chen_Liu_Hsu_Liu_OEP.pdf** - Comprehensive proctoring framework
7. **pkpadmin_47** - Hybrid classifier approach, 96.04% accuracy

## System Architecture

```
WebcamProcessor → Video Stream (30fps)
    ↓
Parallel Processing:
├─ GazeEstimator (MediaPipe) → Focus state
├─ FaceVerifier (BlazeFace) → Person count
└─ ObjectDetector (DETR) → Prohibited items
    ↓
AttentionScorer → Weighted score + violations
    ↓
Dashboard → Real-time visualization
```

## Violation Detection

**Types**:
- `gaze_away`: Extended off-screen viewing
- `multiple_faces`: >1 person detected
- `no_face`: Person left frame
- `prohibited_object`: Phone/book detected
- `prolonged_distraction`: 10+ frames unfocused

**Severity**: Low/Medium/High based on academic integrity impact

## Local Setup

```bash
npm install
npm run dev
```

**Requirements**:
- Webcam access
- Modern browser (Chrome/Edge recommended for WebGPU)
- 4GB+ RAM for ML models

## Performance

- **Initialization**: 5-10 seconds (model loading)
- **Processing**: 30 FPS real-time
- **Model sizes**: ~50MB total
- **Browser inference**: No server required
