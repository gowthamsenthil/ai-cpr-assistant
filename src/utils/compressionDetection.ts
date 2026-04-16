/**
 * Advanced compression detection using multiple techniques:
 * 1. Optical flow for motion tracking
 * 2. Landmark velocity analysis
 * 3. Chest area displacement tracking
 * 4. Temporal filtering for noise reduction
 */

import type { Landmark } from './poseUtils';

export interface CompressionMetrics {
  depth: number; // Estimated depth in normalized units
  rate: number; // Compressions per minute
  quality: 'good' | 'shallow' | 'deep' | 'slow' | 'fast';
  verticalDisplacement: number;
}

export interface MotionFrame {
  timestamp: number;
  chestY: number;
  shoulderY: number;
  wristY: number;
  velocity: number;
}

export class CompressionDetector {
  private motionHistory: MotionFrame[] = [];
  private compressionCycles: number[] = [];
  private lastPeakTime: number = 0;
  private lastTroughTime: number = 0;
  private isCompressing: boolean = false;
  private baselineHandY: number | null = null;
  private compressionStartY: number | null = null;
  private baselineFrames: number[] = [];
  private frameCount: number = 0;
  private readonly HISTORY_SIZE = 30; // Keep last 30 frames (~1 second at 30fps)
  private readonly BASELINE_FRAMES = 15; // Frames to establish baseline
  private readonly MIN_DISPLACEMENT = 0.025; // Minimum vertical movement to count
  private readonly COMPRESSION_THRESHOLD = -0.025; // Distance decrease to start compression
  private readonly RELEASE_THRESHOLD = -0.008; // Distance increase to end compression
  private readonly IDEAL_DEPTH = 0.05; // ~5cm in normalized coordinates
  private readonly IDEAL_RATE = 110; // BPM
  private readonly MIN_CYCLE_TIME = 300; // Minimum 300ms between compressions (200 BPM max)

  /**
   * Process new pose landmarks and detect compression
   */
  processFrame(
    landmarks: Landmark[],
    chestPosition: { x: number; y: number },
    timestamp: number
  ): { compressionDetected: boolean; metrics: CompressionMetrics | null } {
    // Calculate key positions
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];

    if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
      return { compressionDetected: false, metrics: null };
    }

    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const wristY = (leftWrist.y + rightWrist.y) / 2;

    // Calculate velocity (change in position)
    let velocity = 0;
    if (this.motionHistory.length > 0) {
      const lastFrame = this.motionHistory[this.motionHistory.length - 1];
      const timeDelta = (timestamp - lastFrame.timestamp) / 1000; // seconds
      if (timeDelta > 0) {
        velocity = (chestPosition.y - lastFrame.chestY) / timeDelta;
      }
    }

    // Add to motion history
    const frame: MotionFrame = {
      timestamp,
      chestY: chestPosition.y,
      shoulderY,
      wristY,
      velocity,
    };

    this.motionHistory.push(frame);
    if (this.motionHistory.length > this.HISTORY_SIZE) {
      this.motionHistory.shift();
    }

    // Detect compression cycle using velocity analysis
    const compressionDetected = this.detectCompressionCycle(frame);

    // Calculate metrics
    const metrics = this.calculateMetrics();

    return { compressionDetected, metrics };
  }

  /**
   * Detect compression cycle using enhanced hand-to-chest distance method
   */
  private detectCompressionCycle(frame: MotionFrame): boolean {
    this.frameCount++;
    
    if (this.motionHistory.length < 3) return false;

    // Calculate hand-to-chest distance (wrist Y - chest Y)
    const handChestDistance = frame.wristY - frame.chestY;
    
    // Phase 1: Establish adaptive baseline (first 15 frames)
    if (this.frameCount <= this.BASELINE_FRAMES) {
      this.baselineFrames.push(handChestDistance);
      
      if (this.frameCount === this.BASELINE_FRAMES) {
        // Calculate baseline as median (more robust than mean)
        const sorted = [...this.baselineFrames].sort((a, b) => a - b);
        this.baselineHandY = sorted[Math.floor(sorted.length / 2)];
        console.log('Baseline established:', this.baselineHandY);
      }
      return false;
    }
    
    if (this.baselineHandY === null) return false;

    // Phase 2: Smooth the distance using moving average (reduce noise)
    const recentFrames = this.motionHistory.slice(-5);
    const smoothedDistance = recentFrames.reduce((sum, f) => sum + (f.wristY - f.chestY), 0) / recentFrames.length;
    
    // Calculate distance change from baseline
    const distanceChange = smoothedDistance - this.baselineHandY;
    
    // Phase 3: Detect compression with hysteresis thresholds
    // Compression start: hands moving significantly closer to chest
    if (!this.isCompressing && distanceChange < this.COMPRESSION_THRESHOLD) {
      this.isCompressing = true;
      this.compressionStartY = frame.wristY;
      this.lastPeakTime = frame.timestamp;
      console.log('Compression started, distance change:', distanceChange);
      return false;
    }

    // Compression release: hands moving back away from chest
    if (this.isCompressing && distanceChange > this.RELEASE_THRESHOLD) {
      const cycleTime = frame.timestamp - this.lastPeakTime;
      
      // Check minimum cycle time (prevent double-counting)
      if (cycleTime < this.MIN_CYCLE_TIME) {
        console.log('Cycle too fast, ignoring:', cycleTime);
        this.isCompressing = false;
        return false;
      }
      
      this.isCompressing = false;
      this.lastTroughTime = frame.timestamp;

      // Calculate actual displacement
      const displacement = this.compressionStartY !== null 
        ? Math.abs(frame.wristY - this.compressionStartY)
        : 0;
      
      console.log('Compression ended, displacement:', displacement, 'cycle time:', cycleTime);
      
      // Only count if displacement is significant
      if (displacement > this.MIN_DISPLACEMENT) {
        this.compressionCycles.push(cycleTime);
        
        // Keep only recent cycles
        if (this.compressionCycles.length > 10) {
          this.compressionCycles.shift();
        }
        
        // Gradually update baseline (adaptive to changing conditions)
        this.baselineHandY = this.baselineHandY * 0.9 + smoothedDistance * 0.1;
        
        console.log('✓ COMPRESSION COUNTED! Total:', this.compressionCycles.length);
        return true;
      } else {
        console.log('Displacement too small, not counting');
      }
    }

    return false;
  }

  /**
   * Calculate vertical displacement during compression
   */
  private calculateDisplacement(): number {
    if (this.motionHistory.length < 2) return 0;

    // Find peak (highest position) and trough (lowest position) in recent history
    const recentFrames = this.motionHistory.slice(-15);
    const chestYValues = recentFrames.map(f => f.chestY);
    const maxY = Math.max(...chestYValues);
    const minY = Math.min(...chestYValues);

    return Math.abs(maxY - minY);
  }

  /**
   * Calculate compression metrics
   */
  private calculateMetrics(): CompressionMetrics | null {
    if (this.compressionCycles.length < 2) return null;

    // Calculate average cycle time
    const avgCycleTime = this.compressionCycles.reduce((sum, t) => sum + t, 0) / this.compressionCycles.length;
    const rate = avgCycleTime > 0 ? (60000 / avgCycleTime) : 0; // Convert to BPM

    // Calculate depth
    const depth = this.calculateDisplacement();

    // Assess quality
    let quality: 'good' | 'shallow' | 'deep' | 'slow' | 'fast' = 'good';
    
    if (depth < this.IDEAL_DEPTH * 0.8) {
      quality = 'shallow';
    } else if (depth > this.IDEAL_DEPTH * 1.3) {
      quality = 'deep';
    } else if (rate < this.IDEAL_RATE * 0.9) {
      quality = 'slow';
    } else if (rate > this.IDEAL_RATE * 1.1) {
      quality = 'fast';
    }

    return {
      depth,
      rate,
      quality,
      verticalDisplacement: depth,
    };
  }

  /**
   * Get current compression rate (BPM)
   */
  getCurrentRate(): number {
    const metrics = this.calculateMetrics();
    return metrics ? metrics.rate : 0;
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.motionHistory = [];
    this.compressionCycles = [];
    this.lastPeakTime = 0;
    this.lastTroughTime = 0;
    this.isCompressing = false;
    this.baselineHandY = null;
    this.compressionStartY = null;
    this.baselineFrames = [];
    this.frameCount = 0;
    console.log('Compression detector reset');
  }
}

/**
 * Alternative: Optical flow-based detection
 * This tracks motion vectors between frames
 */
export class OpticalFlowDetector {
  private previousFrame: ImageData | null = null;
  private chestRegionMotion: number[] = [];

  /**
   * Analyze motion in chest region using simplified optical flow
   */
  analyzeChestMotion(
    currentFrame: ImageData,
    chestPosition: { x: number; y: number },
    width: number,
    height: number
  ): number {
    if (!this.previousFrame) {
      this.previousFrame = currentFrame;
      return 0;
    }

    // Define chest region (box around chest position)
    const boxSize = 100; // pixels
    const startX = Math.max(0, Math.floor(chestPosition.x * width) - boxSize / 2);
    const startY = Math.max(0, Math.floor(chestPosition.y * height) - boxSize / 2);
    const endX = Math.min(width, startX + boxSize);
    const endY = Math.min(height, startY + boxSize);

    // Calculate pixel differences in chest region
    let totalMotion = 0;
    let pixelCount = 0;

    for (let y = startY; y < endY; y += 4) { // Sample every 4 pixels for performance
      for (let x = startX; x < endX; x += 4) {
        const idx = (y * width + x) * 4;
        
        // Calculate grayscale difference
        const prevGray = (this.previousFrame.data[idx] + this.previousFrame.data[idx + 1] + this.previousFrame.data[idx + 2]) / 3;
        const currGray = (currentFrame.data[idx] + currentFrame.data[idx + 1] + currentFrame.data[idx + 2]) / 3;
        
        totalMotion += Math.abs(currGray - prevGray);
        pixelCount++;
      }
    }

    this.previousFrame = currentFrame;
    
    const avgMotion = pixelCount > 0 ? totalMotion / pixelCount : 0;
    this.chestRegionMotion.push(avgMotion);
    
    // Keep only recent motion data
    if (this.chestRegionMotion.length > 30) {
      this.chestRegionMotion.shift();
    }

    return avgMotion;
  }

  /**
   * Detect compression from motion patterns
   */
  detectCompressionFromMotion(): boolean {
    if (this.chestRegionMotion.length < 10) return false;

    const recent = this.chestRegionMotion.slice(-10);
    const avg = recent.reduce((sum, m) => sum + m, 0) / recent.length;
    const latest = this.chestRegionMotion[this.chestRegionMotion.length - 1];

    // Significant motion spike indicates compression
    return latest > avg * 1.5 && latest > 10;
  }

  reset(): void {
    this.previousFrame = null;
    this.chestRegionMotion = [];
  }
}
