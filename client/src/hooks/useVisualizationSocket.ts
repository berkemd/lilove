import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RealtimeVisualizationData {
  timestamp: number;
  currentTime: number;
  beat: boolean;
  intensity: number;
  frequencyBands: number[]; // 8-band frequency analysis
  bpm: number;
  energy: number;
  dominant_frequency: number;
}

interface VisualizationSettings {
  particleDensity: number;
  motionSpeed: number;
  colorIntensity: number;
  colors: string[];
  enableSync: boolean;
  enableGlow: boolean;
}

interface UseVisualizationSocketProps {
  audioFileId: string;
  visualizationId: string;
  audioAnalysis: any;
  visualization: any;
}

export function useVisualizationSocket({
  audioFileId,
  visualizationId, 
  audioAnalysis,
  visualization
}: UseVisualizationSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeData, setRealtimeData] = useState<RealtimeVisualizationData | null>(null);
  const [settings, setSettings] = useState<VisualizationSettings | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>('particles');
  const [isPlaying, setIsPlaying] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('/', {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to visualization engine:', socket.id);
      setIsConnected(true);

      // Start visualization session
      socket.emit('start-visualization', {
        audioFileId,
        visualizationId,
        audioAnalysis,
        visualization
      });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from visualization engine');
      setIsConnected(false);
    });

    // Handle visualization session events
    socket.on('visualization-started', (data: any) => {
      console.log('Visualization session started:', data);
    });

    socket.on('visualization-error', (error: any) => {
      console.error('Visualization error:', error);
    });

    // Handle real-time visualization frames
    socket.on('visualization-frame', (data: RealtimeVisualizationData) => {
      setRealtimeData(data);
    });

    // Handle settings updates
    socket.on('settings-updated', (data: { settings: VisualizationSettings }) => {
      setSettings(data.settings);
    });

    // Handle theme changes
    socket.on('theme-changed', (data: { theme: string }) => {
      setCurrentTheme(data.theme);
    });

    return () => {
      socket.disconnect();
    };
  }, [audioFileId, visualizationId, audioAnalysis, visualization]);

  const playVisualization = () => {
    if (socketRef.current) {
      socketRef.current.emit('playback-control', { action: 'play' });
      setIsPlaying(true);
    }
  };

  const pauseVisualization = () => {
    if (socketRef.current) {
      socketRef.current.emit('playback-control', { action: 'pause' });
      setIsPlaying(false);
    }
  };

  const seekVisualization = (currentTime: number) => {
    if (socketRef.current) {
      socketRef.current.emit('playback-control', { action: 'seek', currentTime });
    }
  };

  const updateSettings = (newSettings: Partial<VisualizationSettings>) => {
    if (socketRef.current) {
      socketRef.current.emit('update-settings', { settings: newSettings });
    }
  };

  const changeTheme = (theme: string) => {
    if (socketRef.current) {
      socketRef.current.emit('change-theme', { theme });
    }
  };

  return {
    isConnected,
    realtimeData,
    settings,
    currentTheme,
    isPlaying,
    playVisualization,
    pauseVisualization,
    seekVisualization,
    updateSettings,
    changeTheme
  };
}