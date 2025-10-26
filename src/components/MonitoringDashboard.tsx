import { useEffect, useRef, useState } from 'react';
import { WebcamProcessor } from '@/utils/webcamProcessor';
import { GazeEstimator, GazeData } from '@/utils/gazeEstimator';
import { ObjectDetector, DetectedObject } from '@/utils/objectDetector';
import { FaceVerifier, FaceVerificationResult } from '@/utils/faceVerifier';
import { AttentionScorer, AttentionScore, ViolationEvent } from '@/utils/attentionScorer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Video, 
  VideoOff, 
  Eye, 
  Users, 
  Smartphone, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp
} from 'lucide-react';
import AttentionChart from './AttentionChart';
import ViolationLog from './ViolationLog';

const MonitoringDashboard = () => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  const webcamProcessor = useRef<WebcamProcessor>(new WebcamProcessor());
  const gazeEstimator = useRef<GazeEstimator>(new GazeEstimator());
  const objectDetector = useRef<ObjectDetector>(new ObjectDetector());
  const faceVerifier = useRef<FaceVerifier>(new FaceVerifier());
  const attentionScorer = useRef<AttentionScorer>(new AttentionScorer());
  
  const [attentionScore, setAttentionScore] = useState<AttentionScore>({
    overall: 0,
    gaze: 0,
    headPose: 0,
    facePresence: 0,
    objectsDetected: 0,
    level: 'critical'
  });
  
  const [gazeData, setGazeData] = useState<GazeData | null>(null);
  const [faceData, setFaceData] = useState<FaceVerificationResult | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [violations, setViolations] = useState<ViolationEvent[]>([]);
  const [scoreHistory, setScoreHistory] = useState<{ time: string; score: number }[]>([]);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  const initializeModels = async () => {
    setIsInitializing(true);
    try {
      console.log('🔄 Starting model initialization...');
      toast({
        title: "Initializing AI Models",
        description: "Loading gaze tracking, face detection, and object detection models...",
      });

      console.log('  - Initializing Gaze Estimator...');
      console.log('  - Initializing Object Detector...');
      console.log('  - Initializing Face Verifier...');
      
      await Promise.all([
        gazeEstimator.current.initialize(),
        objectDetector.current.initialize(),
        faceVerifier.current.initialize()
      ]);

      setInitialized(true);
      console.log('✅ All AI models initialized successfully');
      toast({
        title: "✅ Models Initialized",
        description: "All AI models loaded successfully. Ready to start monitoring.",
      });
    } catch (error) {
      console.error('❌ Failed to initialize models:', error);
      toast({
        title: "❌ Initialization Failed",
        description: error instanceof Error ? error.message : "Failed to load AI models",
        variant: "destructive"
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const startMonitoring = async () => {
    console.log('🚀 Starting monitoring...');
    
    if (!initialized) {
      console.log('Models not initialized, initializing now...');
      await initializeModels();
    }

    if (!videoRef.current) {
      console.error('❌ Video element not ready');
      return;
    }

    try {
      console.log('📹 Starting webcam...');
      await webcamProcessor.current.startWebcam(videoRef.current);
      console.log('✅ Webcam started');
      
      // Wait for video to be fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const video = videoRef.current;
      console.log('📺 Video ready state:', video.readyState, 'Dimensions:', video.videoWidth, 'x', video.videoHeight);
      
      setIsMonitoring(true);
      console.log('🎬 Starting frame processing loop...');
      processFrames();
      
      toast({
        title: "🎥 Monitoring Started",
        description: "Exam monitoring is now active",
      });
    } catch (error) {
      console.error('❌ Error starting monitoring:', error);
      toast({
        title: "❌ Camera Error",
        description: error instanceof Error ? error.message : "Failed to start webcam",
        variant: "destructive"
      });
    }
  };

  const stopMonitoring = () => {
    console.log('🛑 Stopping monitoring...');
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    webcamProcessor.current.stopWebcam();
    setIsMonitoring(false);
    console.log('✅ Monitoring stopped');
    
    toast({
      title: "🛑 Monitoring Stopped",
      description: "Exam monitoring has been stopped",
    });
  };

  const processFrames = async () => {
    // Don't check isMonitoring here - causes race condition
    // Loop is controlled by animationFrameRef instead
    if (!videoRef.current || !canvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(processFrames);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(processFrames);
      return;
    }

    // Check if video is ready
    if (video.readyState !== 4) {
      console.log('⏳ Video not ready yet, readyState:', video.readyState);
      animationFrameRef.current = requestAnimationFrame(processFrames);
      return;
    }

    const timestamp = performance.now();
    
    // Capture frame
    const imageData = webcamProcessor.current.captureFrame();
    
    if (!imageData) {
      animationFrameRef.current = requestAnimationFrame(processFrames);
      return;
    }
    
    console.log('📸 Frame captured:', imageData.width, 'x', imageData.height);
    
    if (imageData) {
      // Draw video frame to canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      try {
        // Run all analyses in parallel
        const [gaze, face, objects] = await Promise.all([
          gazeEstimator.current.estimateGaze(video, timestamp),
          faceVerifier.current.verifyFace(video, timestamp),
          // Run object detection on every frame for testing (can optimize later)
          objectDetector.current.detectObjects(imageData)
        ]);

        // Log detections
        if (gaze) {
          console.log('👁️ Gaze:', gaze.focusState, '| Looking at screen:', gaze.lookingAtScreen);
        }
        if (face) {
          console.log('👤 Face:', face.faceCount, 'faces detected | Multiple:', face.multipleFaces);
        }
        if (objects && objects.length > 0) {
          console.log('🔍 Objects detected:', objects.map(o => `${o.label} (${(o.score * 100).toFixed(1)}%)`).join(', '));
          const prohibited = objects.filter(o => o.isProhibited);
          if (prohibited.length > 0) {
            console.warn('🚨 PROHIBITED ITEMS:', prohibited.map(o => o.label).join(', '));
          }
        }

        // Update states
        if (gaze) setGazeData(gaze);
        if (face) setFaceData(face);
        if (objects) setDetectedObjects(objects);

        // Calculate attention score
        const score = attentionScorer.current.updateScore(gaze, face, objects);
        setAttentionScore(score);
        console.log('📊 Attention Score:', score.overall.toFixed(1), '| Level:', score.level);

        // Update score history
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        setScoreHistory(prev => {
          const updated = [...prev, { time: timeStr, score: score.overall }];
          return updated.slice(-60); // Keep last 60 data points
        });

        // Update violations
        const recentViolations = attentionScorer.current.getViolations(20);
        if (recentViolations.length > violations.length) {
          console.log('🚨 NEW VIOLATION DETECTED!');
        }
        setViolations(recentViolations);

        // Draw visualizations
        drawOverlays(ctx, canvas, gaze, face, objects);
      } catch (error) {
        console.error('❌ Frame processing error:', error);
      }
    }

    animationFrameRef.current = requestAnimationFrame(processFrames);
  };

  const drawOverlays = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    gaze: GazeData | null,
    face: FaceVerificationResult | null,
    objects: DetectedObject[]
  ) => {
    // Draw face bounding box
    if (face?.boundingBox) {
      const { x, y, width, height } = face.boundingBox;
      const color = face.multipleFaces ? '#ef4444' : '#10b981';
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(
        x * canvas.width,
        y * canvas.height,
        width * canvas.width,
        height * canvas.height
      );
    }

    // Draw detected objects
    objects.forEach(obj => {
      const { xmin, ymin, xmax, ymax } = obj.box;
      const color = obj.isProhibited ? '#ef4444' : '#3b82f6';
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        xmin * canvas.width,
        ymin * canvas.height,
        (xmax - xmin) * canvas.width,
        (ymax - ymin) * canvas.height
      );

      // Draw label
      ctx.fillStyle = color;
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(
        `${obj.label} ${(obj.score * 100).toFixed(0)}%`,
        xmin * canvas.width,
        ymin * canvas.height - 5
      );
    });

    // Draw gaze indicator
    if (gaze) {
      const centerX = canvas.width / 2;
      const centerY = 50;
      const radius = 20;
      
      const color = {
        'focused': '#10b981',
        'distracted': '#f59e0b',
        'away': '#ef4444'
      }[gaze.focusState];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(gaze.focusState.toUpperCase(), centerX, centerY + 4);
    }
  };

  const getScoreLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              AI Exam Proctoring System
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time monitoring with gaze tracking, head pose estimation, and object detection
            </p>
          </div>
          
          <Button
            size="lg"
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            disabled={isInitializing}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            {isInitializing ? (
              <>Initializing Models...</>
            ) : isMonitoring ? (
              <>
                <VideoOff className="mr-2 h-5 w-5" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Video className="mr-2 h-5 w-5" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                />
                {!isMonitoring && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Click "Start Monitoring" to begin</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Attention Score Chart */}
            <AttentionChart data={scoreHistory} />
          </div>

          {/* Metrics Sidebar */}
          <div className="space-y-4">
            {/* Overall Score */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-primary/20">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Attention Score</div>
                <div className={`text-6xl font-bold ${getScoreLevelColor(attentionScore.level)}`}>
                  {attentionScore.overall}
                </div>
                <Badge 
                  variant="outline" 
                  className={`mt-3 ${getScoreLevelColor(attentionScore.level)}`}
                >
                  {attentionScore.level.toUpperCase()}
                </Badge>
              </div>
            </Card>

            {/* Component Scores */}
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <h3 className="font-semibold mb-4">Component Metrics</h3>
              <div className="space-y-3">
                <MetricBar icon={<Eye className="h-4 w-4" />} label="Gaze Focus" value={attentionScore.gaze} />
                <MetricBar icon={<TrendingUp className="h-4 w-4" />} label="Head Pose" value={attentionScore.headPose} />
                <MetricBar icon={<Users className="h-4 w-4" />} label="Face Presence" value={attentionScore.facePresence} />
                <MetricBar icon={<Smartphone className="h-4 w-4" />} label="Objects Clear" value={attentionScore.objectsDetected} />
              </div>
            </Card>

            {/* Status Indicators */}
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <h3 className="font-semibold mb-4">Live Status</h3>
              <div className="space-y-3">
                <StatusItem
                  icon={gazeData?.focusState === 'focused' ? <CheckCircle2 /> : <XCircle />}
                  label="Gaze Focus"
                  value={gazeData?.focusState || 'N/A'}
                  status={gazeData?.focusState === 'focused' ? 'success' : 'warning'}
                />
                <StatusItem
                  icon={faceData?.multipleFaces ? <XCircle /> : <CheckCircle2 />}
                  label="Face Count"
                  value={faceData?.faceCount.toString() || 'N/A'}
                  status={faceData?.faceCount === 1 ? 'success' : 'error'}
                />
                <StatusItem
                  icon={detectedObjects.some(o => o.isProhibited) ? <XCircle /> : <CheckCircle2 />}
                  label="Prohibited Items"
                  value={detectedObjects.filter(o => o.isProhibited).length.toString()}
                  status={detectedObjects.some(o => o.isProhibited) ? 'error' : 'success'}
                />
              </div>
            </Card>
          </div>
        </div>

        {/* Violation Log */}
        <ViolationLog violations={violations} />
      </div>
    </div>
  );
};

const MetricBar = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-semibold">{value}%</span>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const StatusItem = ({ 
  icon, 
  label, 
  value, 
  status 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  status: 'success' | 'warning' | 'error';
}) => {
  const colors = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500'
  };

  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={colors[status]}>{icon}</span>
        {label}
      </span>
      <span className="font-semibold text-sm">{value}</span>
    </div>
  );
};

export default MonitoringDashboard;
