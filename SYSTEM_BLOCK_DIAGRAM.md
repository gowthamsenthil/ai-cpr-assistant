# CPR AR ASSISTANT v2.0 - SYSTEM BLOCK DIAGRAM

## 🏗️ HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (React)                       │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Header Bar     │  │   Camera View    │  │   Stats Panel    │  │
│  │  - v2.0 Badge    │  │  - Video Feed    │  │  - Compression # │  │
│  │  - Title         │  │  - Pose Overlay  │  │  - BPM Rate      │  │
│  │  - Exit Button   │  │  - Motion Trail  │  │  - Motion Level  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Control Panel   │  │  Debug Console   │  │  Instructions    │  │
│  │  - Start/Stop    │  │  - Motion Data   │  │  - How to Use    │  │
│  │  - Mode Toggle   │  │  - State Info    │  │  - Tips          │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CORE PROCESSING LAYER                           │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    ARCPRSession Component                      │  │
│  │  - State Management (React Hooks)                             │  │
│  │  - Session Control (Start/Stop/Reset)                         │  │
│  │  - Compression Counting Logic                                 │  │
│  │  - Timer & Cycle Management                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                    │                                 │
│                    ┌───────────────┼───────────────┐                │
│                    ▼               ▼               ▼                │
│         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│         │   Camera     │  │   Pose       │  │   Motion     │       │
│         │   Manager    │  │   Processor  │  │   Detector   │       │
│         └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES & APIs                          │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  MediaPipe   │  │   Web Audio  │  │  Web Speech  │              │
│  │  Pose API    │  │   (Metronome)│  │  API (Voice) │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Camera API  │  │  Gemini AI   │  │  Browser     │              │
│  │  (getUserMedia)│ │  (Optional)  │  │  Canvas API  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 DETAILED DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                           VIDEO INPUT                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Camera Stream
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MEDIAPIPE POSE DETECTION                        │
│                                                                       │
│  Input: Video Frame (1280x720)                                      │
│  Process: 33 Body Landmarks Detection                               │
│  Output: Landmark Coordinates (x, y, z, visibility)                 │
│                                                                       │
│  Key Landmarks Used:                                                 │
│  - Shoulders (11, 12) → Chest Position Calculation                  │
│  - Hips (23, 24) → Chest Position Calculation                       │
│  - Wrists (15, 16) → Hand Position Tracking                         │
│  - Elbows (13, 14) → Arm Extension Verification                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│   CHEST POSITION CALCULATOR   │    │     CANVAS RENDERER          │
│                               │    │                               │
│  • Calculate midpoint between │    │  • Draw skeleton overlay     │
│    shoulders and hips         │    │  • Draw chest target box     │
│  • Determine chest center     │    │  • Draw motion indicators    │
│  • Calculate confidence       │    │  • Draw hand placement guide │
│                               │    │                               │
│  Output: {x, y, confidence}   │    │  Output: Visual Feedback     │
└──────────────────────────────┘    └──────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MOTION-BASED COMPRESSION DETECTOR                 │
│                                                                       │
│  Step 1: REGION EXTRACTION                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ • Extract 150x150 pixel region around chest                │    │
│  │ • Convert to ImageData object                               │    │
│  │ • Sample every 4th pixel for performance                    │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                    │                                 │
│                                    ▼                                 │
│  Step 2: PIXEL COMPARISON                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ • Compare with previous frame                               │    │
│  │ • Calculate grayscale difference per pixel                  │    │
│  │ • Average differences → Motion Intensity                    │    │
│  │                                                              │    │
│  │   Motion = Σ|current_pixel - prev_pixel| / pixel_count     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                    │                                 │
│                                    ▼                                 │
│  Step 3: STATE MACHINE                                              │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │   WAITING ──────────────────────────────────────────┐       │    │
│  │      │                                               │       │    │
│  │      │ Motion > 25 (Compression Threshold)          │       │    │
│  │      ▼                                               │       │    │
│  │   COMPRESSING                                        │       │    │
│  │      │                                               │       │    │
│  │      │ Motion < 15 (Release Threshold)              │       │    │
│  │      ▼                                               │       │    │
│  │   RELEASING ──> COUNT COMPRESSION ───────────────────┘       │    │
│  │                                                              │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                    │                                 │
│                                    ▼                                 │
│  Step 4: VALIDATION                                                 │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ • Check minimum cycle time (>400ms)                         │    │
│  │ • Verify motion displacement                                │    │
│  │ • Prevent double-counting                                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                    │                                 │
│                                    ▼                                 │
│  Output: {                                                          │
│    compressionDetected: boolean,                                    │
│    motionIntensity: number,                                         │
│    compressionCount: number,                                        │
│    averageRate: number (BPM),                                       │
│    quality: 'good' | 'slow' | 'fast' | 'shallow'                   │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SESSION MANAGEMENT                              │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Compression Counter                                        │    │
│  │  • Increment on detection                                   │    │
│  │  • Track total compressions                                 │    │
│  │  • Calculate cycles (30 compressions = 1 cycle)            │    │
│  │  • Trigger rescue breath prompt after each cycle           │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                    │                                 │
│                                    ▼                                 │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Timer & Metrics                                            │    │
│  │  • Track elapsed time                                       │    │
│  │  • Calculate real-time BPM                                  │    │
│  │  • Monitor compression quality                              │    │
│  │  • Update UI every second                                   │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   VOICE GUIDANCE     │  │   METRONOME      │  │   UI UPDATES     │
│                      │  │                  │  │                  │
│  • Initial prompt    │  │  • 110 BPM beat  │  │  • Stats display │
│  • Every 30s         │  │  • Visual pulse  │  │  • Debug info    │
│  • EMS updates       │  │  • Audio beep    │  │  • Quality color │
│  • Quality feedback  │  │                  │  │  • Motion trail  │
└──────────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 🔄 COMPRESSION DETECTION ALGORITHM FLOW

```
START
  │
  ▼
┌─────────────────────────────────────┐
│ Capture Video Frame                 │
│ (30 FPS from camera)                │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ MediaPipe Pose Detection            │
│ → Extract 33 landmarks              │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ Calculate Chest Position            │
│ chest_y = (shoulders + hips) / 2    │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ Extract Chest Region (150x150px)   │
│ centered at chest position          │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ Is Previous Frame Available?        │
└─────────────────────────────────────┘
  │         │
  NO        YES
  │         │
  │         ▼
  │    ┌─────────────────────────────────────┐
  │    │ Calculate Pixel Differences         │
  │    │ motion = Σ|curr - prev| / count     │
  │    └─────────────────────────────────────┘
  │         │
  │         ▼
  │    ┌─────────────────────────────────────┐
  │    │ Add to Motion History (last 10)     │
  │    └─────────────────────────────────────┘
  │         │
  │         ▼
  │    ┌─────────────────────────────────────┐
  │    │ Current State?                      │
  │    └─────────────────────────────────────┘
  │         │
  │    ┌────┴────┐
  │    │         │
  │    WAITING   COMPRESSING
  │    │         │
  │    ▼         ▼
  │  ┌─────┐   ┌─────────────────────┐
  │  │Motion│   │Motion < 15?         │
  │  │> 25? │   └─────────────────────┘
  │  └─────┘         │
  │    │            YES
  │   YES            │
  │    │             ▼
  │    │        ┌─────────────────────────────┐
  │    │        │ Time since last > 400ms?    │
  │    │        └─────────────────────────────┘
  │    │             │
  │    │            YES
  │    │             │
  │    │             ▼
  │    │        ┌─────────────────────────────┐
  │    │        │ ✓ COUNT COMPRESSION         │
  │    │        │ • Increment counter         │
  │    │        │ • Log to console            │
  │    │        │ • Update UI                 │
  │    │        │ • Trigger voice feedback    │
  │    │        └─────────────────────────────┘
  │    │             │
  │    ▼             ▼
  │  ┌─────────────────────────────┐
  │  │ State = COMPRESSING         │
  │  └─────────────────────────────┘
  │             │
  ▼             ▼
┌─────────────────────────────────────┐
│ Store Current Frame as Previous     │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ Update UI with Metrics              │
│ • Motion intensity                  │
│ • Compression count                 │
│ • BPM rate                          │
│ • Quality indicator                 │
└─────────────────────────────────────┘
  │
  ▼
WAIT FOR NEXT FRAME (33ms @ 30 FPS)
  │
  └──────────────────────────────────┐
                                     │
                                     ▼
                                   LOOP
```

---

## 🎯 KEY COMPONENTS BREAKDOWN

### 1. **Camera Manager**
```
Input: User permission
Process: 
  - Request camera access
  - Configure resolution (1280x720)
  - Handle front/back camera switching
  - Stream to video element
Output: Video stream
```

### 2. **MediaPipe Pose**
```
Input: Video frames
Process:
  - ML-based landmark detection
  - 33-point body tracking
  - Confidence scoring
Output: Landmark array with x, y, z, visibility
```

### 3. **Motion Detector**
```
Input: Image data from chest region
Process:
  - Pixel-level comparison
  - Motion intensity calculation
  - State machine logic
  - Compression validation
Output: Detection events + metrics
```

### 4. **Voice Service**
```
Input: Text messages
Process:
  - Web Speech API synthesis
  - Queue management
  - Speaking state tracking
Output: Audio output
```

### 5. **Metronome Service**
```
Input: BPM (110)
Process:
  - Web Audio API oscillator
  - Precise timing
  - Beat callbacks
Output: Audio beeps + visual pulses
```

### 6. **Gemini AI (Optional)**
```
Input: Session data
Process:
  - API call to Gemini 2.0 Flash
  - Context-aware generation
  - Response parsing
Output: Personalized messages
```

---

## 📈 PERFORMANCE METRICS

```
┌─────────────────────────────────────────┐
│ Component Performance                   │
├─────────────────────────────────────────┤
│ MediaPipe Pose:      30-60 FPS          │
│ Motion Detection:    30 FPS             │
│ UI Updates:          60 FPS             │
│ Voice Synthesis:     < 100ms latency    │
│ Metronome:           ±1ms accuracy      │
│ Total CPU Usage:     20-40%             │
│ Memory Usage:        ~150MB             │
└─────────────────────────────────────────┘
```

---

## 🔐 SECURITY & PRIVACY

```
┌─────────────────────────────────────────┐
│ Data Flow                               │
├─────────────────────────────────────────┤
│ Camera Feed:    Local only, not stored  │
│ Pose Data:      Processed in browser    │
│ Motion Data:    Temporary, not saved    │
│ Session Stats:  Local state only        │
│ Gemini API:     Optional, user data     │
│                 sent only if enabled    │
└─────────────────────────────────────────┘
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    DEVELOPMENT                          │
│  npm run dev → Vite Dev Server → localhost:5173        │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION BUILD                     │
│  npm run build → Static Files (dist/)                  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    HOSTING OPTIONS                      │
│  • Netlify / Vercel (Static Hosting)                   │
│  • GitHub Pages                                         │
│  • Firebase Hosting                                     │
│  • Custom HTTPS Server (required for camera)           │
└─────────────────────────────────────────────────────────┘
```

This block diagram shows the complete system architecture from video input through compression detection to user feedback!
