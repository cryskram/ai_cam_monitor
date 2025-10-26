/**
 * Webcam Processing Utility
 * Handles video stream capture and frame processing
 */

export class WebcamProcessor {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async startWebcam(videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.videoElement = videoElement;
      
      // Request high-quality video stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      videoElement.srcObject = this.stream;
      await videoElement.play();
      
      console.log('✅ Webcam started successfully');
    } catch (error) {
      console.error('❌ Error starting webcam:', error);
      throw new Error('Failed to access webcam. Please ensure camera permissions are granted.');
    }
  }

  stopWebcam(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    console.log('🛑 Webcam stopped');
  }

  captureFrame(): ImageData | null {
    if (!this.videoElement || this.videoElement.readyState !== 4) {
      return null;
    }

    const { videoWidth, videoHeight } = this.videoElement;
    this.canvas.width = videoWidth;
    this.canvas.height = videoHeight;
    
    this.ctx.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);
    return this.ctx.getImageData(0, 0, videoWidth, videoHeight);
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  isActive(): boolean {
    return this.stream !== null && this.stream.active;
  }
}
