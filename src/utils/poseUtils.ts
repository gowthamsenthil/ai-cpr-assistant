/**
 * Utility functions for MediaPipe Pose landmark calculations
 */

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface ChestPosition {
  x: number;
  y: number;
  confidence: number;
}

// MediaPipe Pose landmark indices
export const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
};

/**
 * Calculate chest center position for CPR compression point
 * @param landmarks Array of pose landmarks from MediaPipe
 * @returns Chest position with confidence score
 */
export function calculateChestPosition(landmarks: Landmark[]): ChestPosition | null {
  if (!landmarks || landmarks.length < 25) {
    return null;
  }

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];

  // Check if all required landmarks are visible
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return null;
  }

  // Calculate midpoints
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipMidY = (leftHip.y + rightHip.y) / 2;

  // Chest position: horizontal center of shoulders, 30% down from shoulders to hips
  // This places it on the sternum (center of chest) instead of abdomen
  const chestX = shoulderMidX;
  const chestY = shoulderMidY + (hipMidY - shoulderMidY) * 0.3;

  // Calculate confidence as average visibility of key landmarks
  const visibilities = [
    leftShoulder.visibility || 0,
    rightShoulder.visibility || 0,
    leftHip.visibility || 0,
    rightHip.visibility || 0,
  ];
  const confidence = visibilities.reduce((sum, v) => sum + v, 0) / visibilities.length;

  return {
    x: chestX,
    y: chestY,
    confidence,
  };
}

/**
 * Get confidence level category
 * @param confidence Confidence score (0-1)
 * @returns Confidence level: 'high', 'medium', or 'low'
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence > 0.7) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

/**
 * Get color for confidence level
 * @param confidence Confidence score (0-1)
 * @returns CSS color string
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence > 0.7) return '#16A34A'; // Green
  if (confidence >= 0.5) return '#EAB308'; // Yellow
  return '#DC2626'; // Red
}

/**
 * Check if person is in proper position (lying down)
 * @param landmarks Array of pose landmarks
 * @returns True if person appears to be lying down
 */
export function isPersonLyingDown(landmarks: Landmark[]): boolean {
  if (!landmarks || landmarks.length < 25) {
    return false;
  }

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return false;
  }

  // Calculate shoulder width and torso height
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  const torsoHeight = Math.abs(
    ((leftShoulder.y + rightShoulder.y) / 2) - ((leftHip.y + rightHip.y) / 2)
  );

  // Person is likely lying down if shoulder width > torso height
  // (horizontal orientation)
  return shoulderWidth > torsoHeight * 0.8;
}

/**
 * Detect if hands are positioned on chest for CPR
 * @param landmarks Array of pose landmarks
 * @param chestPosition Calculated chest position
 * @returns True if hands are on chest
 */
export function areHandsOnChest(landmarks: Landmark[], chestPosition: ChestPosition | null): boolean {
  if (!landmarks || !chestPosition || landmarks.length < 21) {
    return false;
  }

  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

  if (!leftWrist || !rightWrist) {
    return false;
  }

  // Check if either wrist is near the chest position
  const threshold = 0.15; // Distance threshold (normalized coordinates)
  
  const leftDistance = Math.sqrt(
    Math.pow(leftWrist.x - chestPosition.x, 2) + 
    Math.pow(leftWrist.y - chestPosition.y, 2)
  );
  
  const rightDistance = Math.sqrt(
    Math.pow(rightWrist.x - chestPosition.x, 2) + 
    Math.pow(rightWrist.y - chestPosition.y, 2)
  );

  return leftDistance < threshold || rightDistance < threshold;
}

/**
 * Detect compression motion (hands moving down on chest)
 * @param currentY Current hand Y position
 * @param previousY Previous hand Y position
 * @param threshold Movement threshold
 * @returns True if compression motion detected
 */
export function detectCompressionMotion(
  currentY: number,
  previousY: number | null,
  threshold: number = 0.02
): boolean {
  if (previousY === null) return false;
  // Downward motion (Y increases in screen coordinates)
  return currentY > previousY && (currentY - previousY) > threshold;
}

/**
 * Convert normalized coordinates to canvas pixels
 * @param normalizedX Normalized x coordinate (0-1)
 * @param normalizedY Normalized y coordinate (0-1)
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @returns Pixel coordinates
 */
export function normalizedToPixel(
  normalizedX: number,
  normalizedY: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  return {
    x: normalizedX * canvasWidth,
    y: normalizedY * canvasHeight,
  };
}
