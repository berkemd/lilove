import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Fullscreen, Download, Settings, Volume2 } from "lucide-react";

interface RealVisualizationCanvasProps {
  audioFile?: File;
  theme?: 'particles' | 'waveform' | 'spectrum' | 'circular';
  isPlaying?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
}

export default function RealVisualizationCanvas({ 
  audioFile, 
  theme = 'spectrum',
  isPlaying = false,
  onPlayStateChange 
}: RealVisualizationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBufferLike> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(0.7);

  // Initialize audio context and analyzer
  const initializeAudio = async () => {
    if (!audioFile || !audioRef.current || isInitialized) return;

    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioContext = audioContextRef.current;

      // Create analyzer
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 512; // Higher resolution for better visuals
      analyserRef.current.smoothingTimeConstant = 0.8;

      // Create data array
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Create audio source
      sourceRef.current = audioContext.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContext.destination);

      // Set audio file
      const audioUrl = URL.createObjectURL(audioFile);
      audioRef.current.src = audioUrl;
      audioRef.current.volume = volume;

      setIsInitialized(true);
      console.log('Audio visualization initialized');
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  };

  // Visualization drawing functions
  const drawSpectrum = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dataArray: Uint8Array<ArrayBufferLike>) => {
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(138, 92, 246, 0.1)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / dataArray.length * 2.5;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * height * 0.8;
      
      // Create bar gradient
      const barGradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      barGradient.addColorStop(0, `hsl(${240 + (i / dataArray.length) * 120}, 85%, 65%)`);
      barGradient.addColorStop(1, `hsl(${240 + (i / dataArray.length) * 120}, 85%, 85%)`);
      
      ctx.fillStyle = barGradient;
      ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
      
      x += barWidth;
    }
  };

  const drawWaveform = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dataArray: Uint8Array<ArrayBufferLike>) => {
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8B5CF6';
    ctx.beginPath();

    const sliceWidth = width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * height / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  };

  const drawParticles = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dataArray: Uint8Array<ArrayBufferLike>) => {
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, 0, width, height);

    const particles = 50;
    for (let i = 0; i < particles; i++) {
      const intensity = dataArray[Math.floor(i * dataArray.length / particles)] / 255;
      const x = (i / particles) * width + Math.sin(Date.now() * 0.001 + i) * 20;
      const y = height / 2 + Math.cos(Date.now() * 0.0015 + i) * intensity * height * 0.3;
      const size = 2 + intensity * 8;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${270 + intensity * 90}, 85%, 65%, ${0.6 + intensity * 0.4})`;
      ctx.fill();
    }
  };

  const drawCircular = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dataArray: Uint8Array<ArrayBufferLike>) => {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;
    
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < dataArray.length; i++) {
      const angle = (i / dataArray.length) * Math.PI * 2;
      const intensity = dataArray[i] / 255;
      const lineLength = intensity * radius;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + lineLength);
      const y2 = centerY + Math.sin(angle) * (radius + lineLength);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `hsl(${200 + intensity * 100}, 85%, 65%)`;
      ctx.lineWidth = 2 + intensity * 3;
      ctx.stroke();
    }
  };

  // Animation loop
  const animate = () => {
    if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get frequency data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Draw based on theme
    switch (theme) {
      case 'spectrum':
        drawSpectrum(canvas, ctx, dataArrayRef.current);
        break;
      case 'waveform':
        drawWaveform(canvas, ctx, dataArrayRef.current);
        break;
      case 'particles':
        drawParticles(canvas, ctx, dataArrayRef.current);
        break;
      case 'circular':
        drawCircular(canvas, ctx, dataArrayRef.current);
        break;
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Handle play/pause
  const togglePlayback = async () => {
    if (!audioRef.current || !isInitialized) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      } else {
        // Resume audio context if suspended
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        await audioRef.current.play();
        animate();
      }
      
      onPlayStateChange?.(!isPlaying);
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Setup canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Initialize audio when file changes
  useEffect(() => {
    if (audioFile && !isInitialized) {
      initializeAudio();
    }
  }, [audioFile, isInitialized]);

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <Card className={`relative overflow-hidden hover-elevate ${isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'}`}>
      <CardContent className="p-0 relative h-full">
        {/* Audio Element */}
        <audio
          ref={audioRef}
          onPlay={() => onPlayStateChange?.(true)}
          onPause={() => onPlayStateChange?.(false)}
          onEnded={() => onPlayStateChange?.(false)}
          className="hidden"
        />

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full bg-gradient-to-br from-background to-card"
          style={{ display: 'block' }}
        />

        {/* Controls Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={togglePlayback}
              disabled={!isInitialized}
              className="bg-black/40 backdrop-blur-lg border-white/20 hover-elevate"
              data-testid="button-play-pause"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Top Controls */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleFullscreen}
            className="bg-black/40 backdrop-blur-lg border-white/20 hover-elevate"
            data-testid="button-fullscreen"
          >
            <Fullscreen className="h-4 w-4" />
          </Button>
          
          <Button
            variant="secondary"
            size="icon"
            onClick={() => console.log('Download visualization')}
            className="bg-black/40 backdrop-blur-lg border-white/20 hover-elevate"
            data-testid="button-download"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Bottom Status */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-black/40 backdrop-blur-lg rounded-lg px-3 py-1 border border-white/20">
            <div className="text-xs text-white/90 font-mono flex items-center gap-2">
              <Volume2 className="h-3 w-3" />
              {theme.toUpperCase()} • {isPlaying ? 'LIVE' : isInitialized ? 'READY' : 'LOADING'}
            </div>
          </div>
        </div>

        {/* Volume Control */}
        <div className="absolute bottom-4 right-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 opacity-0 hover:opacity-100 transition-opacity"
          />
        </div>
      </CardContent>
    </Card>
  );
}