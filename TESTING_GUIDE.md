# AR CPR Assistant - Testing Guide

## Why the START CPR Button is Disabled

The button requires **pose detection** to work. It needs to detect a person in the camera view before allowing you to start.

## New Features Added

### 1. **Visual Status Indicators**
- Blue box: "Position a person in the camera view" - No person detected yet
- Orange box: "Adjust camera position" - Person detected but confidence is low
- Green box: "Position detected - Ready to start!" - Good to go!

### 2. **Test Mode Button**
If the main START CPR button is grayed out, you'll now see a smaller blue button:
- **"START ANYWAY (Test Mode)"** - Bypasses pose detection requirements
- Use this for testing without needing a person in frame

### 3. **Camera Status Debug Info**
In the top-left stats panel, you can now see:
- Camera Status: ✓ Person detected / ✗ No person detected
- Confidence level when detected

## How to Test

### Option 1: With Pose Detection (Recommended)
1. Grant camera permissions when prompted
2. Point camera at a person lying down (or use a photo/video)
3. Wait for green "Position detected" message
4. Click **START CPR** button

### Option 2: Test Mode (Quick Testing)
1. Grant camera permissions
2. Click the blue **"START ANYWAY (Test Mode)"** button
3. Session starts immediately without pose detection

## Troubleshooting

### Camera Not Working?
- Check browser permissions (camera icon in address bar)
- Try a different browser (Chrome/Safari recommended)
- On mobile: Use HTTPS or localhost

### Person Not Detected?
- Ensure good lighting
- Person should be clearly visible and lying down
- Try moving camera closer/farther
- Check the stats overlay for detection status

### Button Still Not Clickable?
- Use the **Test Mode** button to bypass detection
- Check browser console (F12) for errors
- Refresh the page and try again

## Testing on Mobile

For best results on mobile:
1. Use the network URL shown in terminal (e.g., `http://10.174.114.45:5173`)
2. Or use ngrok for HTTPS:
   ```bash
   ngrok http 5173
   ```
3. Mobile browsers need HTTPS for camera access (except localhost)

## Demo Mode

The app is designed for demo/training purposes:
- Yellow disclaimer always visible
- "CALL 911" button is simulated
- Metronome and voice guidance work without actual CPR

## Next Steps

Once you can start a session:
- Test the metronome (110 BPM)
- Try the compression counter (30 compressions per cycle)
- Check the rescue breath prompt after 30 compressions
- Test the stop button and session summary
