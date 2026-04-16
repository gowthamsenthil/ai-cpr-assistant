# REAL-TIME COMPRESSION DETECTION STRATEGY

## PROBLEM STATEMENT
The system must automatically detect chest compressions in real-time without manual tapping, using only visual input from the camera.

## GOOGLE MEDIAPIPE RESOURCES USED

### 1. MediaPipe Pose (Primary Technology)
**What it provides:**
- 33 body landmarks in 3D space (x, y, z coordinates + visibility)
- Real-time tracking at 30+ FPS
- Works on mobile devices
- Landmarks include:
  * Shoulders (11, 12)
  * Elbows (13, 14)
  * Wrists (15, 16)
  * Hips (23, 24)
  * Full body skeleton

**How we use it:**
```javascript
import { Pose } from '@mediapipe/pose';

const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`
});

// Configure for optimal performance
pose.setOptions({
  modelComplexity: 1,        // Balance between speed and accuracy
  smoothLandmarks: true,      // Temporal smoothing
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

// Process each video frame
pose.onResults((results) => {
  // results.poseLandmarks contains all 33 landmarks
  // Each landmark has: x, y, z, visibility
});
```

### 2. Camera Utils
**What it provides:**
- Video stream management
- Frame-by-frame processing
- Automatic frame rate control

**How we use it:**
```javascript
import { Camera } from '@mediapipe/camera_utils';

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 1280,
  height: 720,
});
```

## DETECTION ALGORITHM - MULTI-LAYER APPROACH

### Layer 1: Landmark Tracking
**Tracks these key points:**
1. **Chest Center** - Calculated from shoulders and hips
2. **Rescuer's Wrists** - Both left (15) and right (16)
3. **Rescuer's Shoulders** - Reference for upper body stability

### Layer 2: Relative Motion Analysis
**Key Insight:** During CPR, the rescuer's hands move DOWN relative to the victim's chest, then UP.

**Measurements:**
```
Hand-to-Chest Distance = Wrist Y - Chest Y

At Rest:        Distance = 0.15 (hands hovering)
Compression:    Distance = 0.10 (hands pressed down)
Release:        Distance = 0.15 (back to rest)
```

### Layer 3: State Machine
```
State: WAITING
  ↓ (distance decreases by > 0.02)
State: COMPRESSING
  ↓ (distance increases back)
State: RELEASING → COUNT COMPRESSION
  ↓
State: WAITING (ready for next)
```

### Layer 4: Quality Metrics
- **Depth**: Measure vertical displacement
- **Rate**: Calculate time between compressions → BPM
- **Consistency**: Track variation in depth and rate

## IMPLEMENTATION PLAN

### Step 1: Enhanced Landmark Processing
```typescript
// Use multiple landmarks for robustness
const leftWrist = landmarks[15];
const rightWrist = landmarks[16];
const leftElbow = landmarks[13];
const rightElbow = landmarks[14];

// Calculate average hand position (more stable)
const avgHandY = (leftWrist.y + rightWrist.y) / 2;

// Use elbow position to verify arm extension
const armExtension = Math.abs(leftElbow.y - leftWrist.y);
```

### Step 2: Adaptive Baseline
```typescript
// Establish baseline over first 10 frames
// This accounts for different camera angles and positions
if (frameCount < 10) {
  baselineDistances.push(handChestDistance);
} else if (frameCount === 10) {
  baseline = average(baselineDistances);
}
```

### Step 3: Hysteresis Thresholds
```typescript
// Prevent false triggers with different thresholds
const COMPRESSION_THRESHOLD = -0.025;  // Start detecting
const RELEASE_THRESHOLD = -0.010;      // Stop detecting

// Compression starts when distance drops significantly
if (!isCompressing && distanceChange < COMPRESSION_THRESHOLD) {
  isCompressing = true;
}

// Compression ends when distance returns
if (isCompressing && distanceChange > RELEASE_THRESHOLD) {
  isCompressing = false;
  COUNT_COMPRESSION();
}
```

### Step 4: Temporal Filtering
```typescript
// Use moving average to reduce noise
const recentDistances = last5Frames.map(f => f.distance);
const smoothedDistance = average(recentDistances);

// Only detect on smoothed values
```

### Step 5: Minimum Displacement Check
```typescript
// Only count if movement is significant enough
const displacement = Math.abs(compressionStartY - compressionEndY);

if (displacement > MIN_DISPLACEMENT) {
  // Valid compression
  countCompression();
} else {
  // Too shallow, ignore
}
```

## WHY THIS WORKS

### 1. Physics-Based
- CPR compressions create predictable motion patterns
- Hands MUST move down and up for effective CPR
- We measure this motion directly

### 2. Relative Measurement
- Don't need to separate hands from chest visually
- Measure distance between tracked points
- Works even with occlusion

### 3. Robust to Variations
- Adaptive baseline handles different setups
- Hysteresis prevents noise
- Temporal filtering smooths jitter

### 4. Real-Time Performance
- MediaPipe runs at 30+ FPS
- Lightweight calculations
- Immediate feedback

## FAILURE MODES & SOLUTIONS

### Problem: Camera shake
**Solution:** Use shoulder landmarks as stable reference

### Problem: Hands not visible
**Solution:** Fall back to chest motion tracking

### Problem: Multiple people in frame
**Solution:** MediaPipe tracks closest/most prominent person

### Problem: Poor lighting
**Solution:** MediaPipe has built-in robustness, but we add confidence checks

### Problem: Sideways angle
**Solution:** Use 3D landmarks (x, y, z) to handle rotation

## TESTING STRATEGY

### Phase 1: Static Testing
- Place hands on chest box
- Verify baseline establishment
- Check distance measurements

### Phase 2: Motion Testing
- Perform slow compressions
- Verify detection triggers
- Check count accuracy

### Phase 3: Real-World Testing
- Test with mannequin
- Test with person lying down
- Test different camera angles
- Test different lighting conditions

## EXPECTED RESULTS

### Accuracy Target
- 95%+ detection rate for proper compressions
- < 5% false positives
- Real-time feedback (< 100ms latency)

### Performance Target
- 30 FPS processing
- Works on mobile devices
- Battery efficient

## NEXT STEPS

1. Implement enhanced detection algorithm
2. Add visual debugging overlay
3. Disable manual tap counting during auto-detection
4. Add calibration phase
5. Improve UI feedback
6. Add voice guidance for quality
