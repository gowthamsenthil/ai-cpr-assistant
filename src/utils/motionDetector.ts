/**
 * NEW APPROACH: Region-based Motion Detection
 * Instead of tracking landmarks, we analyze pixel-level motion in the chest region
 * This is more reliable for detecting actual compression movement
 */

export interface MotionMetrics {
  motionIntensity: number;
  compressionDetected: boolean;
  compressionCount: number;
  averageRate: number;
  quality: 'good' | 'shallow' | 'fast' | 'slow';
}

export class MotionBasedCompressionDetector {
  private previousFrameData: ImageData | null = null;
  private motionHistory: number[] = [];
  private compressionTimestamps: number[] = [];
  private isInCompression: boolean = false;
  private lastCompressionTime: number = 0;
  
  // Thresholds
  private readonly MOTION_THRESHOLD = 15; // Pixel difference threshold
  private readonly COMPRESSION_MOTION_THRESHOLD = 25; // Higher motion = compression
  private readonly MIN_COMPRESSION_INTERVAL = 400; // Min 400ms between compressions (150 BPM max)
  private readonly HISTORY_SIZE = 10;
  private readonly IDEAL_RATE_MIN = 100;
  private readonly IDEAL_RATE_MAX = 120;

  /**
   * Analyze motion in a specific region of the video frame
   */
  analyzeRegion(
    currentFrame: ImageData,
    regionX: number,
    regionY: number,
    regionWidth: number,
    regionHeight: number,
    timestamp: number
  ): MotionMetrics {
    let motionIntensity = 0;
    let compressionDetected = false;

    if (this.previousFrameData) {
      // Calculate pixel differences in the region
      motionIntensity = this.calculateMotionIntensity(
        this.previousFrameData,
        currentFrame,
        regionX,
        regionY,
        regionWidth,
        regionHeight
      );

      // Add to history
      this.motionHistory.push(motionIntensity);
      if (this.motionHistory.length > this.HISTORY_SIZE) {
        this.motionHistory.shift();
      }

      // Detect compression based on motion spikes
      compressionDetected = this.detectCompression(motionIntensity, timestamp);
    }

    this.previousFrameData = currentFrame;

    // Calculate metrics
    const averageRate = this.calculateRate();
    const quality = this.assessQuality(averageRate);

    return {
      motionIntensity,
      compressionDetected,
      compressionCount: this.compressionTimestamps.length,
      averageRate,
      quality,
    };
  }

  /**
   * Calculate motion intensity between two frames in a specific region
   */
  private calculateMotionIntensity(
    prevFrame: ImageData,
    currFrame: ImageData,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    let totalDifference = 0;
    let pixelCount = 0;

    const frameWidth = prevFrame.width;

    // Sample every 4th pixel for performance
    for (let py = y; py < y + height; py += 4) {
      for (let px = x; px < x + width; px += 4) {
        const index = (py * frameWidth + px) * 4;

        // Calculate grayscale difference
        const prevGray = (prevFrame.data[index] + prevFrame.data[index + 1] + prevFrame.data[index + 2]) / 3;
        const currGray = (currFrame.data[index] + currFrame.data[index + 1] + currFrame.data[index + 2]) / 3;

        totalDifference += Math.abs(currGray - prevGray);
        pixelCount++;
      }
    }

    return pixelCount > 0 ? totalDifference / pixelCount : 0;
  }

  /**
   * Detect compression based on motion patterns
   */
  private detectCompression(motionIntensity: number, timestamp: number): boolean {
    // Need enough history
    if (this.motionHistory.length < 3) return false;

    const avgMotion = this.motionHistory.reduce((sum, m) => sum + m, 0) / this.motionHistory.length;

    // Detect significant motion spike (compression happening)
    if (!this.isInCompression && motionIntensity > this.COMPRESSION_MOTION_THRESHOLD && motionIntensity > avgMotion * 1.5) {
      this.isInCompression = true;
      return false;
    }

    // Detect motion drop (compression released)
    if (this.isInCompression && motionIntensity < this.MOTION_THRESHOLD) {
      this.isInCompression = false;

      // Check minimum interval
      const timeSinceLastCompression = timestamp - this.lastCompressionTime;
      if (timeSinceLastCompression >= this.MIN_COMPRESSION_INTERVAL) {
        this.lastCompressionTime = timestamp;
        this.compressionTimestamps.push(timestamp);

        // Keep only recent compressions (last 10)
        if (this.compressionTimestamps.length > 10) {
          this.compressionTimestamps.shift();
        }

        console.log('✓ COMPRESSION DETECTED! Motion:', motionIntensity.toFixed(2), 'Total:', this.compressionTimestamps.length);
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate compression rate in BPM
   */
  private calculateRate(): number {
    if (this.compressionTimestamps.length < 2) return 0;

    // Calculate average time between compressions
    const intervals: number[] = [];
    for (let i = 1; i < this.compressionTimestamps.length; i++) {
      intervals.push(this.compressionTimestamps[i] - this.compressionTimestamps[i - 1]);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    return avgInterval > 0 ? Math.round((60000 / avgInterval)) : 0;
  }

  /**
   * Assess compression quality
   */
  private assessQuality(rate: number): 'good' | 'shallow' | 'fast' | 'slow' {
    if (rate >= this.IDEAL_RATE_MIN && rate <= this.IDEAL_RATE_MAX) {
      return 'good';
    } else if (rate < this.IDEAL_RATE_MIN && rate > 0) {
      return 'slow';
    } else if (rate > this.IDEAL_RATE_MAX) {
      return 'fast';
    }
    return 'shallow';
  }

  /**
   * Reset detector
   */
  reset(): void {
    this.previousFrameData = null;
    this.motionHistory = [];
    this.compressionTimestamps = [];
    this.isInCompression = false;
    this.lastCompressionTime = 0;
    console.log('Motion detector reset');
  }

  /**
   * Get debug info
   */
  getDebugInfo(): string {
    const avgMotion = this.motionHistory.length > 0
      ? (this.motionHistory.reduce((sum, m) => sum + m, 0) / this.motionHistory.length).toFixed(2)
      : '0';
    return `Motion: ${avgMotion} | State: ${this.isInCompression ? 'COMPRESSING' : 'waiting'} | Count: ${this.compressionTimestamps.length}`;
  }
}
