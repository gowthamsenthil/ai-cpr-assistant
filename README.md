# AR CPR Assistant

Real-time AR-guided CPR assistance powered by Google Gemini AI and MediaPipe. Built for the Google Gemini Hackathon.

## Features

- **AR Visual Guidance**: Real-time hand placement overlay using MediaPipe Pose detection
- **AI-Powered Coaching**: Google Gemini AI generates personalized encouragement and session feedback
- **Perfect Rhythm**: 110 BPM audio metronome using Web Audio API
- **Voice Guidance**: Real-time voice instructions using Web Speech API
- **Compression Tracking**: Automatic counting and cycle management (30:2 ratio)
- **Session Analytics**: AI-generated performance summary with detailed statistics
- **Mobile-First**: Optimized for smartphone cameras and touch interfaces
- **PWA Support**: Offline-capable progressive web app

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **AR/Computer Vision**: MediaPipe Pose (@mediapipe/pose, @mediapipe/camera_utils)
- **AI/NLP**: Google Gemini API (@google/generative-ai)
- **Audio**: Web Audio API (metronome) + Web Speech API (voice)
- **Deployment**: Firebase Hosting (planned)

## Prerequisites

- Node.js 18+ and npm
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- Modern browser with camera access (Chrome/Safari recommended)

## Setup Instructions

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Gemini API**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Access on mobile** (recommended):
   - Use `--host` flag to expose on network
   - Access via `https://` for camera permissions
   - Or use ngrok/similar for HTTPS tunnel

## Usage

1. Open the app on a mobile device
2. Grant camera permissions when prompted
3. Position camera to see person lying down
4. Wait for AR overlay to detect chest position
5. Press "START CPR" when ready
6. Follow visual and audio guidance
7. Complete session to receive AI-powered feedback

## Important Disclaimer

**FOR TRAINING AND DEMONSTRATION PURPOSES ONLY**

In a real emergency:
1. **CALL 911 FIRST**
2. Then begin CPR if trained
3. This app is a training aid, not a replacement for professional emergency services

## Core Features Implementation

### Feature 1: MediaPipe Pose Detection
- Real-time body landmark detection
- Chest position calculation using shoulder/hip landmarks
- Confidence-based color coding (Green/Yellow/Red)

### Feature 2: AR Visual Overlay
- Dual-circle hand placement guide
- Real-time position tracking
- Pulsing beat indicator synchronized with metronome

### Feature 3: Audio Metronome
- Precise 110 BPM timing using Web Audio API
- 880 Hz (A5) sine wave beeps
- No drift over extended sessions

### Feature 4: Gemini AI Integration
- **Dynamic Encouragement**: Context-aware phrases every 45 seconds
- **Session Summary**: Personalized 50-75 word feedback
- **Real-time Q&A**: Answer CPR questions (stretch goal)
- **Multi-language**: Translation support (stretch goal)

### Feature 5: Compression Tracking
- Auto-increment with metronome sync
- 30:2 compression-to-breath ratio
- Cycle completion tracking
- EMS arrival countdown (7 min estimate)

### Feature 6: Voice Synthesis
- Web Speech API for natural voice
- Calm, clear instructions at 0.9x speed
- Scheduled guidance throughout session

### Feature 7: Emergency Call Simulation
- Visual "CALL 911" button
- Demo-only (no actual call placed)
- Clear disclaimer messaging

### Feature 8: Session Summary
- AI-generated personalized feedback
- Performance statistics grid
- Technique badge for optimal rate (100-120 BPM)

## Project Structure

```
src/
├── components/
│   └── SessionSummary.tsx       # Post-session feedback modal
├── pages/
│   ├── LandingPage.tsx          # Home page
│   └── ARCPRSession.tsx         # Main AR CPR interface
├── services/
│   ├── geminiService.ts         # Google Gemini AI integration
│   ├── metronomeService.ts      # Web Audio metronome
│   └── voiceService.ts          # Web Speech synthesis
├── utils/
│   └── poseUtils.ts             # MediaPipe calculations
└── App.tsx                      # Main app router
```

## Deployment

```bash
npm run build
# Deploy dist/ folder to Firebase Hosting or similar
```
