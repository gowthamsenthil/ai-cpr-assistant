import { useRef, useEffect, useState } from 'react';
import { Box, Button, Typography, CircularProgress, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import type { Results as PoseResults } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import * as THREE from 'three';

// Constants for CPR metrics
const TARGET_RATE = 100; // Target compression rate (per minute)
const TARGET_DEPTH = 5; // Target compression depth in cm

const ARCPR = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const pose = useRef<Pose | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const camera3dRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cprMetrics, setCprMetrics] = useState({
    rate: 0,
    depth: 0,
    lastCompressionTime: 0,
    compressionCount: 0,
    lastCompressionDepth: 0,
  });

  // Initialize MediaPipe Pose
  useEffect(() => {
    const initializePose = async () => {
      try {
        const poseInstance = new Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`;
          },
        });

        await poseInstance.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        // @ts-ignore - Type mismatch between our Results and MediaPipe's Results
        poseInstance.onResults(onResults);
        pose.current = poseInstance;
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing MediaPipe Pose:', err);
        setError('Failed to initialize pose detection. Please try again.');
        setIsLoading(false);
      }
    };

    initializePose();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    sceneRef.current = scene;
    camera3dRef.current = camera;
    rendererRef.current = renderer;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Add a simple hand mesh (will be updated based on pose)
    const handGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const handMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const handMesh = new THREE.Mesh(handGeometry, handMaterial);
    scene.add(handMesh);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.dispose();
    };
  }, []);

  const startCamera = async () => {
    try {
      if (!videoRef.current || !pose.current) return;

      const video = videoRef.current;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
          facingMode: 'user'
        },
        audio: false
      });
      
      video.srcObject = stream;
      await video.play();
      
      const camera = new Camera(video, {
        onFrame: async () => {
          if (videoRef.current && pose.current) {
            await pose.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });
      
      await camera.start();
      cameraRef.current = camera;
      setIsCameraActive(true);
      
      // Start the animation loop
      const animate = () => {
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            if (canvasRef.current) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.save();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                ctx.restore();
              }
            }
          }
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animate();
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access the camera. Please ensure you have granted camera permissions.');
    }
  };

  const onResults = (results: PoseResults) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the video frame
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Only draw the video if it's ready
    if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Draw pose landmarks if available
    if (results.poseLandmarks) {
      try {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 2,
        });
        drawLandmarks(ctx, results.poseLandmarks, {
          color: '#FF0000',
          lineWidth: 1,
        });

        // Update CPR metrics based on pose
        updateCprMetrics(results);
      } catch (err) {
        console.error('Error drawing pose landmarks:', err);
      }
    }

    // Draw CPR feedback
    drawFeedback(ctx);
    
    ctx.restore();
  };

  const updateCprMetrics = (results: PoseResults) => {
    if (!results.poseLandmarks) return;

    // This is a simplified example - in a real app, you would analyze
    // the pose landmarks to calculate compression rate and depth
    const now = Date.now();
    const timeSinceLastCompression = now - cprMetrics.lastCompressionTime;
    
    // Simulate compression detection (replace with actual pose analysis)
    if (timeSinceLastCompression > 600) { // 600ms between compressions = ~100/min
      const depth = Math.random() * 2 + 4; // Simulated depth between 4-6cm
      
      setCprMetrics(prev => ({
        rate: 60000 / (timeSinceLastCompression || 1),
        depth,
        lastCompressionTime: now,
        compressionCount: prev.compressionCount + 1,
        lastCompressionDepth: depth,
      }));
    }
  };

  const drawFeedback = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    const centerX = width / 2;
    
    // Draw rate feedback
    const rate = cprMetrics.rate;
    const rateDiff = Math.abs(rate - TARGET_RATE);
    const rateColor = rateDiff < 10 ? '#4CAF50' : rateDiff < 20 ? '#FFC107' : '#F44336';
    
    ctx.font = '24px Arial';
    ctx.fillStyle = rateColor;
    ctx.textAlign = 'center';
    ctx.fillText(`Rate: ${Math.round(rate)}/min (Target: ${TARGET_RATE}/min)`, centerX, 50);
    
    // Draw depth feedback
    const depth = cprMetrics.depth;
    const depthDiff = Math.abs(depth - TARGET_DEPTH);
    const depthColor = depthDiff < 0.5 ? '#4CAF50' : depthDiff < 1 ? '#FFC107' : '#F44336';
    
    ctx.fillStyle = depthColor;
    ctx.fillText(`Depth: ${depth.toFixed(1)}cm (Target: ${TARGET_DEPTH}cm)`, centerX, 90);
    
    // Draw compression count
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Compressions: ${cprMetrics.compressionCount}`, centerX, 130);
    
    // Draw instructions
    ctx.font = '20px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Place your hands on the chest and perform compressions', centerX, height - 40);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
        <Typography variant="h6" ml={2}>Initializing...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/')}
          sx={{ mb: 4 }}
        >
          Back to Home
        </Button>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Error
          </Typography>
          <Typography paragraph>{error}</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/')}
        sx={{ 
          position: 'absolute', 
          top: 16, 
          left: 16, 
          zIndex: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          },
        }}
      >
        Back
      </Button>

      {!isCameraActive && (
        <Box 
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 5,
            color: 'white',
            textAlign: 'center',
            p: 3,
          }}
        >
          <Typography variant="h4" gutterBottom>
            AR CPR Assistant
          </Typography>
          <Typography variant="body1" paragraph>
            This feature uses your device's camera to provide real-time feedback on your CPR technique.
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            onClick={startCamera}
            sx={{ mt: 2 }}
          >
            Start Camera
          </Button>
        </Box>
      )}

      <video 
        ref={videoRef} 
        style={{ 
          display: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }} 
        playsInline
      />
      
      <canvas 
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      
      {/* 3D Overlay Canvas */}
      <canvas 
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
};

export default ARCPR;
