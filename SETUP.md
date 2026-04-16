# Quick Setup Guide

## 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

## 2. Configure the App

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and paste your API key:

```
VITE_GEMINI_API_KEY=AIzaSy...your_actual_key_here
```

## 3. Run the App

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 4. Test on Mobile (Recommended)

For the best experience, test on a mobile device:

### Option A: Local Network
```bash
npm run dev -- --host
```
Then access via your phone's browser using your computer's IP address (e.g., `http://192.168.1.100:5173`)

### Option B: HTTPS Tunnel (for camera permissions)
```bash
# Install ngrok
npm install -g ngrok

# In one terminal, run the dev server
npm run dev

# In another terminal, create tunnel
ngrok http 5173
```
Use the HTTPS URL provided by ngrok on your mobile device.

## 5. Grant Permissions

When you first access the AR session:
- Allow camera access when prompted
- Allow microphone access for voice guidance (optional)

## 6. Test the Features

1. **Landing Page**: Should load with gradient background
2. **AR Session**: Click "Start AR CPR Session"
3. **Camera**: Point at a person lying down (or yourself in a mirror)
4. **Detection**: Green circles should appear when body is detected
5. **Start**: Press "START CPR" button
6. **Metronome**: Listen for 110 BPM beeps
7. **Voice**: Hear initial instructions
8. **Compressions**: Counter should increment with each beat
9. **Breath Prompt**: After 30 compressions, see "GIVE 2 RESCUE BREATHS"
10. **Stop**: Press "STOP SESSION" to see AI-generated summary

## Troubleshooting

### Camera Not Working
- Ensure HTTPS connection (required for camera access)
- Check browser permissions
- Try a different browser (Chrome/Safari recommended)

### No Audio
- Check device volume
- Unmute the browser tab
- Try tapping the screen to activate audio context

### Gemini API Errors
- Verify API key is correct in `.env`
- Check API key has Gemini API enabled
- Ensure you have API quota remaining

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (18+ required)

## Development Tips

- Use browser DevTools console to see debug logs
- MediaPipe pose detection works best with good lighting
- Person should be centered in frame and lying down
- Test with different body positions and camera angles

## Next Steps

- Customize encouragement phrases in `src/services/geminiService.ts`
- Adjust metronome BPM in `src/services/metronomeService.ts`
- Modify AR overlay colors in `src/utils/poseUtils.ts`
- Add more features from the stretch goals!

Happy hacking! 🚀
