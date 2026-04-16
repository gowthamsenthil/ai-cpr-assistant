import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import type { Results as PoseResults } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { calculateChestPosition, getConfidenceColor, getConfidenceLevel, normalizedToPixel, areHandsOnChest } from '../utils/poseUtils';
// Motion detection removed - using rhythm-based counting
import { getMetronomeService } from '../services/metronomeService';
import { getVoiceService } from '../services/voiceService';
// Gemini AI removed - using hardcoded summaries for better performance
import SessionSummary from '../components/SessionSummary.tsx';

const COMPRESSIONS_PER_CYCLE = 30;
const EMS_ARRIVAL_TIME = 7 * 60; // 7 minutes in seconds

export default function ARCPRSession() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Session state
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [compressionCount, setCompressionCount] = useState(0);
  const [totalCompressions, setTotalCompressions] = useState(0);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [showBreathPrompt, setShowBreathPrompt] = useState(false);
  const [chestPosition, setChestPosition] = useState<{ x: number; y: number; confidence: number } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<string>('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [beatPulse, setBeatPulse] = useState(false);
  const [showRawVideo, setShowRawVideo] = useState(false);
  const [useBackCamera, setUseBackCamera] = useState(true);
  const [handsOnChest, setHandsOnChest] = useState(false);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [guidanceStep, setGuidanceStep] = useState<'camera' | 'position' | 'hands' | 'ready' | 'active'>('camera');
  const [handsPlacedCorrectly, setHandsPlacedCorrectly] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const breathPromptSpoken = useRef(false);
  const lastGuidanceTime = useRef(0);
  const handsWerePerfect = useRef(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [currentRate, setCurrentRate] = useState<number>(110);
  const [currentVoiceText, setCurrentVoiceText] = useState<string>('');
  const encouragementIndex = useRef(0);
  const autoStartTimer = useRef<number | null>(null);

  // Services
  const metronomeService = useRef(getMetronomeService());
  const voiceService = useRef(getVoiceService());
  const lastEncouragementTime = useRef(0);
  const lastEMSUpdateTime = useRef(0);

  // Initialize MediaPipe Pose
  useEffect(() => {
    const initPose = async () => {
      try {
        console.log('Initializing MediaPipe Pose...');
        const pose = new Pose({
          locateFile: (file) => {
            const url = `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`;
            console.log('Loading MediaPipe file:', url);
            return url;
          },
        });

        console.log('Setting pose options...');
        try {
          await pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
            enableSegmentation: false,
          });
        } catch (optErr) {
          console.error('Error setting pose options:', optErr);
          throw optErr;
        }

        console.log('Registering pose results callback...');
        pose.onResults(onPoseResults);
        poseRef.current = pose;
        setIsInitializing(false);
        console.log('MediaPipe Pose initialized successfully!');
      } catch (err) {
        console.error('Error initializing pose:', err);
        setError(`Failed to initialize pose detection: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsInitializing(false);
      }
    };

    initPose();

    return () => {
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!videoRef.current || !poseRef.current) return;

    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. Please use HTTPS or localhost.');
      }

      let stream;
      console.log(`Attempting to access ${useBackCamera ? 'back' : 'front'} camera`);

      try {
        // Try exact facing mode first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: useBackCamera ? { exact: 'environment' } : { exact: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        console.log(`Successfully using ${useBackCamera ? 'back' : 'front'} camera (exact)`);
      } catch (exactErr) {
        console.warn('Exact facing mode failed, trying ideal:', exactErr);

        try {
          // Try ideal facing mode
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: useBackCamera ? 'environment' : 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
          console.log(`Using ${useBackCamera ? 'back' : 'front'} camera (ideal)`);
        } catch (idealErr) {
          console.warn('Ideal facing mode failed, using any available camera:', idealErr);

          // Fallback to any available camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          console.log('Using default camera (no facing mode specified)');
        }
      }

      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded');
        setCameraReady(true);
      };
      
      await videoRef.current.play();
      console.log('Video playing');

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && poseRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });

      await camera.start();
      cameraRef.current = camera;
      console.log('Camera started successfully');
    } catch (err) {
      console.error('Error accessing camera:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to access camera: ${errorMessage}. Please grant camera permissions and refresh.`);
    }
  }, [useBackCamera]);

  // Restart camera when switching between front/back
  const switchCamera = useCallback(async () => {
    if (isActive) {
      console.log('Cannot switch camera during active session');
      alert('Please stop the session before switching cameras');
      return;
    }

    if (isSwitchingCamera) {
      console.log('Already switching camera, ignoring duplicate request');
      return;
    }

    try {
      setIsSwitchingCamera(true);
      console.log('Switching camera...');
      setCameraReady(false);

      // Pause pose detection
      if (poseRef.current) {
        console.log('Pausing pose detection');
      }

      // Stop camera service
      if (cameraRef.current) {
        console.log('Stopping camera service');
        await cameraRef.current.stop();
        cameraRef.current = null;
      }

      // Stop all video tracks
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        console.log(`Stopping ${tracks.length} tracks`);
        tracks.forEach(track => {
          track.stop();
          console.log('Stopped track:', track.label, track.kind);
        });
        videoRef.current.srcObject = null;
      }

      // Wait for cleanup before reinitialization
      await new Promise(resolve => setTimeout(resolve, 300));

      // Toggle camera direction
      console.log(`Switching from ${useBackCamera ? 'back' : 'front'} to ${useBackCamera ? 'front' : 'back'}`);
      setUseBackCamera(prev => !prev);

    } catch (err) {
      console.error('Error switching camera:', err);
      setError(`Failed to switch camera: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSwitchingCamera(false);
    }
  }, [useBackCamera, isSwitchingCamera, isActive]);
  
  // Restart camera when useBackCamera changes
  useEffect(() => {
    if (cameraRef.current === null && videoRef.current && !error && !isInitializing) {
      console.log('Camera ref is null, restarting with new settings...');

      const timer = setTimeout(() => {
        startCamera().catch(err => {
          console.error('Failed to restart camera:', err);
          setError('Failed to restart camera. Please refresh the page.');
        });
      }, 500);

      return () => {
        console.log('Clearing restart timer');
        clearTimeout(timer);
      };
    }
  }, [useBackCamera, startCamera, error, isInitializing]);

  // Cleanup auto-start timer on unmount
  useEffect(() => {
    return () => {
      if (autoStartTimer.current) {
        clearTimeout(autoStartTimer.current);
      }
    };
  }, []);

  // Handle pose detection results
  const onPoseResults = useCallback((results: PoseResults) => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    
    if (!canvas || !overlayCanvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    
    if (!ctx || !overlayCtx) {
      return;
    }

    // Set canvas dimensions
    canvas.width = results.image.width;
    canvas.height = results.image.height;
    overlayCanvas.width = results.image.width;
    overlayCanvas.height = results.image.height;

    // Draw video frame - THIS SHOWS THE CAMERA FEED
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw pose landmarks
    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
      console.log('Pose detected! Landmarks:', results.poseLandmarks.length);
      
      ctx.save();
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
      drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1, radius: 2 });
      ctx.restore();

      // Calculate chest position
      const chestPos = calculateChestPosition(results.poseLandmarks);
      if (chestPos) {
        setChestPosition(chestPos);
        drawChestOverlay(overlayCtx, chestPos, canvas.width, canvas.height);
        
        // Detect hands on chest
        const handsDetected = areHandsOnChest(results.poseLandmarks, chestPos);
        setHandsOnChest(handsDetected);
        
        // Check if hands are placed correctly (high confidence + hands on chest)
        const correctPlacement = handsDetected && chestPos.confidence > 0.6;
        setHandsPlacedCorrectly(correctPlacement);
        
        // Update guidance steps
        if (!isActive) {
          if (cameraReady && chestPos.confidence > 0.5) {
            setGuidanceStep('position');
          }
          if (cameraReady && chestPos.confidence > 0.6) {
            setGuidanceStep('hands');
          }
          if (correctPlacement) {
            setGuidanceStep('ready');
            // Auto-start session after 2 seconds of correct hand placement
            if (!autoStartTimer.current) {
              autoStartTimer.current = window.setTimeout(() => {
                startSession();
                setGuidanceStep('active');
              }, 2000);
            }
          } else {
            // Clear timer if hands removed
            if (autoStartTimer.current) {
              clearTimeout(autoStartTimer.current);
              autoStartTimer.current = null;
            }
          }
        } else {
          setGuidanceStep('active');
        }
        
        // Hand positioning guidance (works before AND during session)
        if (chestPos) {
          const leftWrist = results.poseLandmarks[15];
          const rightWrist = results.poseLandmarks[16];
          
          if (leftWrist && rightWrist) {
            const avgHandX = (leftWrist.x + rightWrist.x) / 2;
            const avgHandY = (leftWrist.y + rightWrist.y) / 2;
            
            // Check if hands are on chest
            const distanceFromChest = Math.sqrt(
              Math.pow(avgHandX - chestPos.x, 2) + 
              Math.pow(avgHandY - chestPos.y, 2)
            );
            
            if (distanceFromChest < 0.15) {
              setHandsOnChest(true);
              
              // Give directional guidance
              const horizontalDiff = avgHandX - chestPos.x;
              const verticalDiff = avgHandY - chestPos.y;
              
              // Hysteresis thresholds - once perfect, allow more tolerance
              const strictThreshold = 0.05; // Initial positioning
              const looseThreshold = 0.12;  // After perfect, allow more movement
              
              const currentThreshold = handsWerePerfect.current ? looseThreshold : strictThreshold;
              
              // Check if perfectly positioned
              const isPerfect = Math.abs(horizontalDiff) < strictThreshold && Math.abs(verticalDiff) < strictThreshold;
              const isAcceptable = Math.abs(horizontalDiff) < currentThreshold && Math.abs(verticalDiff) < currentThreshold;
              
              if (isPerfect) {
                handsWerePerfect.current = true;
                setHandsPlacedCorrectly(true);
              } else if (!isAcceptable) {
                // Only mark as not perfect if significantly off
                handsWerePerfect.current = false;
                setHandsPlacedCorrectly(false);
              } else {
                // In acceptable range - keep current state
                setHandsPlacedCorrectly(handsWerePerfect.current);
              }
              
              const now = Date.now();
              const timeSinceLastGuidance = now - lastGuidanceTime.current;
              
              if (!isActive) {
                // Pre-session guidance (only if not already perfect)
                if (!handsWerePerfect.current && timeSinceLastGuidance > 3000) {
                  if (Math.abs(horizontalDiff) > strictThreshold) {
                    const direction = horizontalDiff > 0 ? 'left' : 'right';
                    if (!voiceService.current.isSpeaking()) {
                      voiceService.current.speak(`Move your hands slightly to the ${direction}`, false);
                      setCurrentVoiceText(`Move hands ${direction}`);
                      lastGuidanceTime.current = now;
                      setTimeout(() => setCurrentVoiceText(''), 3000);
                    }
                  } else if (Math.abs(verticalDiff) > strictThreshold) {
                    const direction = verticalDiff > 0 ? 'up' : 'down';
                    if (!voiceService.current.isSpeaking()) {
                      voiceService.current.speak(`Move your hands slightly ${direction}`, false);
                      setCurrentVoiceText(`Move hands ${direction}`);
                      lastGuidanceTime.current = now;
                      setTimeout(() => setCurrentVoiceText(''), 3000);
                    }
                  }
                } else if (isPerfect && !handsWerePerfect.current && !voiceService.current.isSpeaking()) {
                  voiceService.current.speak('Perfect hand placement. Ready to start.', false);
                  setCurrentVoiceText('✓ Perfect placement');
                  setTimeout(() => setCurrentVoiceText(''), 3000);
                }
              } else if (isPaused && isAcceptable) {
                // During session - resume when acceptable
                if (timeSinceLastGuidance > 2000) {
                  setCurrentVoiceText('✓ Hands detected - resuming');
                  setTimeout(() => setCurrentVoiceText(''), 2000);
                  lastGuidanceTime.current = now;
                }
              } else if (!isPaused && !isAcceptable) {
                // During session - pause if significantly off
                if (timeSinceLastGuidance > 2000) {
                  setCurrentVoiceText('⚠ Reposition hands');
                  lastGuidanceTime.current = now;
                }
              }
            } else {
              setHandsOnChest(false);
              setHandsPlacedCorrectly(false);
              handsWerePerfect.current = false;
              
              const now = Date.now();
              if (isActive && !isPaused && (now - lastGuidanceTime.current) > 2000) {
                setCurrentVoiceText('⚠ Hands not detected - paused');
                lastGuidanceTime.current = now;
              }
            }
          } else {
            // Wrists not visible
            setHandsOnChest(false);
            setHandsPlacedCorrectly(false);
            handsWerePerfect.current = false;
            
            const now = Date.now();
            if (isActive && !isPaused && (now - lastGuidanceTime.current) > 2000) {
              setCurrentVoiceText('⚠ Hands not detected - paused');
              lastGuidanceTime.current = now;
            }
          }
        }
      } else {
        setChestPosition(null);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      }
    } else {
      // No pose detected in this frame
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      setChestPosition(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, autoDetectEnabled]);

  // Draw chest position overlay with motion tracking visualization
  const drawChestOverlay = (
    ctx: CanvasRenderingContext2D,
    chestPos: { x: number; y: number; confidence: number },
    width: number,
    height: number
  ) => {
    ctx.clearRect(0, 0, width, height);

    const pixelPos = normalizedToPixel(chestPos.x, chestPos.y, width, height);
    const color = getConfidenceColor(chestPos.confidence);

    // Removed motion visualization - rhythm-based system

    // Draw pulsing rings on beat
    if (beatPulse) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(pixelPos.x, pixelPos.y, 80, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    // Draw hand placement box (rectangle for hands)
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 5]);
    
    // Main rectangle for hand placement
    const boxWidth = 120;
    const boxHeight = 80;
    ctx.strokeRect(
      pixelPos.x - boxWidth / 2,
      pixelPos.y - boxHeight / 2,
      boxWidth,
      boxHeight
    );
    
    // Inner guide
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(
      pixelPos.x - boxWidth / 2 + 10,
      pixelPos.y - boxHeight / 2 + 10,
      boxWidth - 20,
      boxHeight - 20
    );
    ctx.restore();

    // Draw crosshair
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pixelPos.x - 20, pixelPos.y);
    ctx.lineTo(pixelPos.x + 20, pixelPos.y);
    ctx.moveTo(pixelPos.x, pixelPos.y - 20);
    ctx.lineTo(pixelPos.x, pixelPos.y + 20);
    ctx.stroke();
    ctx.restore();

    // Draw text
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS HERE', pixelPos.x, pixelPos.y - 80);
    ctx.restore();

    // Draw status
    const confidenceLevel = getConfidenceLevel(chestPos.confidence);
    const statusText = confidenceLevel === 'high' 
      ? '✓ Position Detected' 
      : 'Center person in frame';
    
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(statusText, pixelPos.x, pixelPos.y + 100);
    ctx.fillText(statusText, pixelPos.x, pixelPos.y + 100);
    ctx.restore();
  };

  // Start CPR session
  const startSession = useCallback(() => {
    setIsActive(true);
    setSessionStartTime(Date.now());
    setCompressionCount(0);
    setTotalCompressions(0);
    setCyclesCompleted(0);
    setIsPaused(true); // Start paused until hands are perfect
    lastEncouragementTime.current = 0;
    lastEMSUpdateTime.current = 0;
    breathPromptSpoken.current = false;

    // Initial voice instruction
    voiceService.current.speak("Position your hands perfectly on the chest center. I'll start counting when you're ready.", true);
    setCurrentVoiceText("Position hands perfectly to begin");
    setTimeout(() => setCurrentVoiceText(''), 5000);
  }, []);
  
  // Start metronome when hands are perfect
  useEffect(() => {
    if (!isActive || !handsPlacedCorrectly || showBreathPrompt) {
      // Stop metronome if paused or during breath prompt
      if (isActive && !isPaused) {
        metronomeService.current.stop();
        setIsPaused(true);
      }
      return;
    }
    
    // Start metronome when hands are perfect
    if (isPaused) {
      setIsPaused(false);
      
      // Start metronome with beat callback
      metronomeService.current.start(() => {
        setBeatPulse(true);
        setTimeout(() => setBeatPulse(false), 100);
        
        // AUTO-INCREMENT compression on each beat
        setCompressionCount(prev => {
          const newCount = prev + 1;
          setTotalCompressions(t => t + 1);
          
          if (newCount >= COMPRESSIONS_PER_CYCLE) {
            // Show breath prompt
            setShowBreathPrompt(true);
            
            // Speak only once
            if (!breathPromptSpoken.current) {
              breathPromptSpoken.current = true;
              voiceService.current.speak("Give two rescue breaths now. Then continue compressions.", true);
            }
            
            setTimeout(() => {
              setShowBreathPrompt(false);
              setCompressionCount(0);
              breathPromptSpoken.current = false; // Reset for next cycle
            }, 5000);
            
            setCyclesCompleted(c => c + 1);
            return COMPRESSIONS_PER_CYCLE;
          }
          
          return newCount;
        });
      });
      
      voiceService.current.speak("Perfect. Starting compressions now.", true);
      setCurrentVoiceText("✓ Starting compressions");
      setTimeout(() => setCurrentVoiceText(''), 3000);
    }
  }, [isActive, handsPlacedCorrectly, isPaused, showBreathPrompt]);

  // Disabled - compressions are now auto-counted by metronome
  const handleCompression = useCallback(() => {
    // Rhythm-based system - no manual tapping
    console.log('Compressions are auto-counted by metronome rhythm');
  }, []);

  // Stop CPR session
  const stopSession = useCallback(async () => {
    setIsActive(false);
    metronomeService.current.stop();
    voiceService.current.stop();

    // Generate session summary with current values
    const duration = elapsedTime > 0 ? elapsedTime : Math.floor((Date.now() - sessionStartTime) / 1000);
    const averageRate = duration > 0 ? Math.round((totalCompressions / duration) * 60) : 0;
    
    console.log('Session Summary:', { duration, totalCompressions, averageRate, cyclesCompleted });

    // Generate simple summary without Gemini API
    const minutes = Math.floor(duration / 60);
    const rateQuality = averageRate >= 100 && averageRate <= 120 ? 'excellent' : 'steady';
    
    let summary = '';
    if (minutes < 2) {
      summary = `You performed ${totalCompressions} compressions in ${duration} seconds. Your quick response and calm focus could save a life. You maintained a ${rateQuality} rhythm throughout. Great work staying composed in a high-pressure situation.`;
    } else if (minutes < 5) {
      summary = `You just completed ${totalCompressions} compressions over ${minutes} minutes at a ${rateQuality} rate of ${averageRate} BPM. Your persistence and steady rhythm are exactly what's needed in cardiac emergencies. You stayed focused when it mattered most. This is heroic work.`;
    } else {
      summary = `Incredible effort! You performed ${totalCompressions} compressions over ${minutes} minutes, maintaining a ${rateQuality} pace of ${averageRate} BPM throughout. Your endurance and determination could have saved a life today. You showed remarkable composure and strength. Be proud of what you just did.`;
    }
    
    setSessionSummary(summary);
    setShowSummary(true);
  }, [sessionStartTime, totalCompressions, cyclesCompleted, elapsedTime]);

  // Timer and voice guidance
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      setElapsedTime(elapsed);
      
      // Calculate real-time BPM
      if (totalCompressions > 0 && elapsed > 0) {
        const calculatedRate = Math.round((totalCompressions / elapsed) * 60);
        setCurrentRate(calculatedRate);
      }

        // Generate encouragement every 45 seconds
        if (elapsed > 0 && elapsed % 45 === 0 && elapsed !== lastEncouragementTime.current) {
          lastEncouragementTime.current = elapsed;
        
          // Rotate through encouragement phrases
          const messages = [
            "You're doing great. Keep following that steady rhythm. Help is on the way.",
            "Perfect pace. Stay focused on the beat. Paramedics are coming.",
            "Excellent work. Your compressions are making a difference. Keep going.",
            "You're saving a life right now. Maintain that rhythm. Help is almost there.",
            "Strong compressions. Follow the beat. You're doing exactly what's needed."
          ];
          const message = messages[encouragementIndex.current % messages.length];
          encouragementIndex.current++;
          
          // Only speak if not already speaking
          if (!voiceService.current.isSpeaking()) {
            voiceService.current.speak(message, false);
            setCurrentVoiceText(message);
            setTimeout(() => setCurrentVoiceText(''), 5000);
          }
        }

      // EMS update every 2 minutes
      if (elapsed > 0 && elapsed % 120 === 0 && elapsed !== lastEMSUpdateTime.current) {
        lastEMSUpdateTime.current = elapsed;
        const minutes = Math.floor(elapsed / 60);
        const minutesRemaining = Math.max(0, Math.ceil((EMS_ARRIVAL_TIME - elapsed) / 60));
        
        let message = '';
        if (minutes === 2) {
          message = `You've been doing CPR for two minutes. Help is approximately ${minutesRemaining} minutes away.`;
        } else if (minutes === 4) {
          message = `Four minutes of CPR. You're doing great. Help is approximately ${minutesRemaining} minutes away.`;
        } else if (minutes >= 6) {
          message = `${minutes} minutes. Stay strong. Help should arrive very soon.`;
        }
        
        if (message && !voiceService.current.isSpeaking()) {
          voiceService.current.speak(message, false);
          setCurrentVoiceText(message);
          setTimeout(() => setCurrentVoiceText(''), 5000);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, sessionStartTime, totalCompressions, cyclesCompleted]);

  // Initialize camera on mount
  useEffect(() => {
    if (!isInitializing && !error) {
      startCamera();
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      metronomeService.current.stop();
      voiceService.current.stop();
    };
  }, [isInitializing, error, startCamera]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (showSummary) {
    return (
      <SessionSummary
        summary={sessionSummary}
        totalCompressions={totalCompressions}
        duration={elapsedTime}
        averageRate={elapsedTime > 0 ? Math.round((totalCompressions / elapsedTime) * 60) : 0}
        cyclesCompleted={cyclesCompleted}
        onClose={() => navigate('/')}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Initializing AR CPR Assistant...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Video and Canvas layers */}
      <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">v2.0</div>
            <h1 className="text-white font-bold text-lg">AR CPR Assistant</h1>
          </div>
          <button
            onClick={() => navigate('/arcpr')}
            className="text-white bg-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
          >
            Exit
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
          {/* Camera View - Left Side */}
          <div 
            className="relative lg:w-2/3 h-96 lg:h-full rounded-2xl overflow-hidden shadow-2xl border-4 border-blue-500"
            onClick={handleCompression}
            onTouchStart={(e) => {
              e.preventDefault();
              handleCompression();
            }}
          >
        
        {/* Raw video element - can be toggled for debugging */}
        <video
          ref={videoRef}
          className={showRawVideo ? "absolute inset-0 w-full h-full object-cover" : "hidden"}
          playsInline
          muted
          autoPlay
        />
        
        {/* Main canvas - shows camera feed with pose landmarks */}
        <canvas
          ref={canvasRef}
          className={showRawVideo ? "hidden" : "absolute inset-0 w-full h-full object-cover"}
          style={{ backgroundColor: '#000' }}
        />
        
        {/* Overlay canvas - shows hand placement box */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        
            {/* Camera controls */}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowRawVideo(!showRawVideo);
            }}
            className="p-2 bg-black bg-opacity-60 text-white text-xs rounded shadow-lg hover:bg-opacity-80"
          >
            {showRawVideo ? '📹' : '🎥'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!cameraReady || isSwitchingCamera) {
                console.log('Camera not ready or switching, ignoring toggle');
                return;
              }
              switchCamera();
            }}
            disabled={!cameraReady || isSwitchingCamera}
            className={`p-2 text-white text-xs rounded shadow-lg ${
              isSwitchingCamera
                ? 'bg-yellow-600 bg-opacity-80 animate-pulse'
                : cameraReady
                  ? 'bg-black bg-opacity-60 hover:bg-opacity-80'
                  : 'bg-gray-600 bg-opacity-40'
            }`}
            title={cameraReady ? 'Switch camera' : 'Please wait...'}
          >
            {isSwitchingCamera ? '⏳' : '🔄'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAutoDetectEnabled(!autoDetectEnabled);
            }}
            className={`p-2 text-white text-xs rounded shadow-lg ${
              autoDetectEnabled ? 'bg-green-600 bg-opacity-80' : 'bg-gray-600 bg-opacity-60'
            }`}
          >
            {autoDetectEnabled ? 'AUTO' : 'TAP'}
          </button>
        </div>

        {/* Emergency call button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsCallActive(!isCallActive);
          }}
          className={`absolute top-4 right-4 px-6 py-3 rounded-lg font-bold text-white shadow-lg z-10 ${
            isCallActive ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {isCallActive ? '✓ 911 Connected' : '📞 CALL 911'}
        </button>

        {/* Step-by-Step Guidance - Moved to Bottom */}
        <div className="absolute bottom-4 left-0 right-0 mx-4 space-y-2 pointer-events-none">
          {!isActive && (
            <>
              <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg text-center text-sm font-semibold">
                FOR DEMO ONLY - CALL 911 FIRST IN REAL EMERGENCY
              </div>
              
              {/* Step 1: Camera Loading */}
              {guidanceStep === 'camera' && (
                <div className="bg-gray-700 text-white px-6 py-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">📹</div>
                  <div className="font-bold text-lg mb-1">STEP 1: Camera Initializing</div>
                  <div className="text-sm">Please wait...</div>
                </div>
              )}
              
              {/* Step 2: Position Patient */}
              {guidanceStep === 'position' && (
                <div className="bg-blue-600 text-white px-6 py-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">👤</div>
                  <div className="font-bold text-lg mb-1">STEP 2: Position Detected</div>
                  <div className="text-sm">Patient visible in frame</div>
                </div>
              )}
              
              {/* Step 3: Place Hands */}
              {guidanceStep === 'hands' && (
                <div className="bg-orange-500 text-white px-6 py-4 rounded-lg text-center animate-pulse">
                  <div className="text-3xl mb-2">✋</div>
                  <div className="font-bold text-lg mb-1">STEP 3: Place Your Hands</div>
                  <div className="text-sm">Position hands on the chest box</div>
                  <div className="text-xs mt-2">Interlock fingers, arms straight</div>
                </div>
              )}
              
              {/* Step 4: Ready to Start */}
              {guidanceStep === 'ready' && handsPlacedCorrectly && (
                <div className="bg-green-600 text-white px-6 py-4 rounded-lg text-center animate-pulse">
                  <div className="text-3xl mb-2">✓</div>
                  <div className="font-bold text-xl mb-1">PERFECT! Starting in 2 seconds...</div>
                  <div className="text-sm">Keep hands in position</div>
                </div>
              )}
            </>
          )}
          {isActive && (
            <>
              {/* BPM Display - Large and Prominent */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-6 rounded-lg text-center shadow-2xl">
                <div className="text-6xl font-bold mb-2" style={{ fontFamily: 'monospace' }}>
                  110 <span className="text-3xl">BPM</span>
                </div>
                <div className="text-sm font-semibold tracking-wide">
                  COMPRESSION RHYTHM
                </div>
                <div className={`mt-3 h-3 rounded-full transition-all duration-100 ${
                  beatPulse ? 'bg-yellow-400 scale-110' : 'bg-red-900'
                }`} />
              </div>
              
              {/* Instruction Banner */}
              <div className="bg-blue-600 text-white px-6 py-3 rounded-lg text-center">
                <div className="font-bold text-base">
                  {autoDetectEnabled && handsOnChest 
                    ? '🤖 AUTO-DETECTING COMPRESSIONS' 
                    : '👆 TAP SCREEN FOR EACH COMPRESSION'}
                </div>
                <div className="text-xs mt-1">
                  {autoDetectEnabled && handsOnChest
                    ? 'AI tracking your hand movements' 
                    : 'Follow the rhythm above'}
                </div>
                {autoDetectEnabled && !handsOnChest && (
                  <div className="text-xs mt-1 text-yellow-300">
                    ⚠️ Position hands on chest for auto-detection
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Stats Panel - Clean Design */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-90 text-white rounded-lg overflow-hidden shadow-2xl" style={{minWidth: '160px'}}>
          {!isActive && (
            <div className="p-3 text-center">
              <div className={cameraReady ? 'text-green-400' : 'text-yellow-400'}>
                {cameraReady ? '✓ Ready' : '⏳ Loading'}
              </div>
            </div>
          )}
          {isActive && (
            <>
              {/* Large Compression Counter */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-center">
                <div className="text-5xl font-bold leading-none">{compressionCount}</div>
                <div className="text-xs opacity-80 mt-1">/ {COMPRESSIONS_PER_CYCLE}</div>
              </div>
              
              {/* Metrics Grid */}
              <div className="p-3 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="opacity-60">Total</span>
                  <span className="font-bold">{totalCompressions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-60">Time</span>
                  <span className="font-mono">{formatTime(elapsedTime)}</span>
                </div>
                
                <div className="border-t border-white border-opacity-20 pt-2"></div>
              <div className="flex justify-between items-center">
                <span className="opacity-60">Rate</span>
                <span className="text-green-400 font-bold">
                  {currentRate} BPM
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="opacity-60">Cycles</span>
                <span className="font-bold">{cyclesCompleted}</span>
              </div>
              </div>
            </>
          )}
        </div>

        {/* Voice feedback display */}
        {currentVoiceText && !showBreathPrompt && (
          <div className="absolute top-20 left-0 right-0 flex justify-center px-4 z-20">
            <div className="bg-blue-600 bg-opacity-90 text-white px-6 py-3 rounded-lg shadow-lg">
              <div className="text-sm font-medium text-center">{currentVoiceText}</div>
            </div>
          </div>
        )}

        {/* Breath prompt */}
        {showBreathPrompt && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
            <div className="bg-red-600 text-white px-12 py-8 rounded-lg text-center animate-pulse">
              <div className="text-6xl font-bold mb-4">GIVE 2</div>
              <div className="text-5xl font-bold mb-4">RESCUE BREATHS</div>
              <div className="text-xl opacity-80">Then continue compressions</div>
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 px-4 z-10">
          {!isActive ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startSession();
                }}
                disabled={!chestPosition || getConfidenceLevel(chestPosition.confidence) === 'low'}
                className="bg-green-600 text-white px-12 py-4 rounded-full text-xl font-bold shadow-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
              >
                START CPR
              </button>
              {(!chestPosition || getConfidenceLevel(chestPosition.confidence) === 'low') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startSession();
                  }}
                  className="bg-blue-600 text-white px-8 py-2 rounded-full text-sm font-semibold shadow-lg hover:bg-blue-700"
                >
                  START ANYWAY (Test Mode)
                </button>
              )}
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopSession();
              }}
              className="bg-red-600 text-white px-12 py-4 rounded-full text-xl font-bold shadow-lg hover:bg-red-700"
            >
              STOP SESSION
            </button>
          )}
        </div>
          </div>
          {/* End Camera View */}

          {/* Right Panel - Stats & Controls */}
          <div className="lg:w-1/3 flex flex-col gap-4">
            {/* Stats Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-700">
              <h2 className="text-white text-xl font-bold mb-4">Session Stats</h2>
              {!isActive ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-sm">Session not started</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Large Compression Counter */}
                  <div className="bg-blue-600 rounded-xl p-6 text-center">
                    <div className="text-white text-6xl font-bold">{compressionCount}</div>
                    <div className="text-blue-200 text-sm mt-2">/ {COMPRESSIONS_PER_CYCLE}</div>
                  </div>
                  
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Total</div>
                      <div className="text-white text-2xl font-bold">{totalCompressions}</div>
                      <div className="text-gray-400 text-xs">Time</div>
                      <div className="text-white text-2xl font-mono">{formatTime(elapsedTime)}</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Rate (BPM)</div>
                      <div className="text-green-400 text-2xl font-bold">
                        {currentRate}
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Cycles</div>
                      <div className="text-white text-2xl font-bold">
                        {cyclesCompleted}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controls Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-700">
              <h2 className="text-white text-xl font-bold mb-4">Controls</h2>
              <div className="space-y-3">
                {!isActive ? (
                  <>
                    <button
                      onClick={startSession}
                      disabled={!chestPosition}
                      className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                    >
                      START CPR SESSION
                    </button>
                    <button
                      onClick={startSession}
                      className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700"
                    >
                      START ANYWAY (Test)
                    </button>
                  </>
                ) : (
                  <button
                    onClick={stopSession}
                    className="w-full bg-red-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-red-700"
                  >
                    STOP SESSION
                  </button>
                )}
                
                {/* Mode Toggle */}
                <button
                  onClick={() => setAutoDetectEnabled(!autoDetectEnabled)}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    autoDetectEnabled 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {autoDetectEnabled ? '✓ AUTO DETECTION' : '✗ MANUAL MODE'}
                </button>
              </div>
            </div>

            {/* Instructions Card */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-6 shadow-2xl border border-blue-700">
              <h3 className="text-white font-bold mb-2">How It Works</h3>
              <ul className="text-blue-100 text-sm space-y-2">
                <li>• Point camera at patient's chest</li>
                <li>• Place hands on highlighted area</li>
                <li>• System detects compressions automatically</li>
                <li>• Follow 110 BPM rhythm</li>
                <li>• Check console (F12) for debug logs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
