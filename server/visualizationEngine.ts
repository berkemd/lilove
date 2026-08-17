// Real-time Visualization Engine with Audio Synchronization
import { Server as SocketIOServer } from "socket.io";

export interface AudioAnalysis {
  bpm?: number;
  beats?: number[];
  segments?: Array<{
    start: number;
    end: number;
    energy?: number;
  }>;
}

export interface Visualization {
  theme?: string;
  settings?: Record<string, any>;
}

export interface VisualizationState {
  audioFileId: string;
  visualizationId: string;
  currentTime: number;
  isPlaying: boolean;
  theme: 'particles' | 'waveform' | 'fractal' | 'fluid';
  settings: {
    particleDensity: number;
    motionSpeed: number;
    colorIntensity: number;
    colors: string[];
    enableSync: boolean;
    enableGlow: boolean;
  };
}

export interface RealtimeVisualizationData {
  timestamp: number;
  currentTime: number;
  beat: boolean;
  intensity: number;
  frequencyBands: number[]; // 8-band frequency analysis
  bpm: number;
  energy: number;
  dominant_frequency: number;
}

export class VisualizationEngine {
  private io: SocketIOServer;
  private activeVisualizations: Map<string, VisualizationState> = new Map();
  private audioAnalysisCache: Map<string, AudioAnalysis> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`Client connected to visualization engine: ${socket.id}`);

      // Handle visualization session start
      socket.on("start-visualization", async (data: { 
        audioFileId: string; 
        visualizationId: string; 
        audioAnalysis: AudioAnalysis;
        visualization: Visualization;
      }) => {
        try {
          await this.startVisualizationSession(socket.id, data);
          socket.emit("visualization-started", { success: true });
        } catch (error) {
          console.error('Failed to start visualization:', error);
          socket.emit("visualization-error", { error: "Failed to start visualization session" });
        }
      });

      // Handle playback control
      socket.on("playback-control", (data: { action: 'play' | 'pause' | 'seek'; currentTime?: number }) => {
        this.handlePlaybackControl(socket.id, data);
      });

      // Handle theme/settings changes
      socket.on("update-settings", (data: { settings: Partial<VisualizationState['settings']> }) => {
        this.updateVisualizationSettings(socket.id, data.settings);
      });

      // Handle theme change
      socket.on("change-theme", (data: { theme: VisualizationState['theme'] }) => {
        this.changeVisualizationTheme(socket.id, data.theme);
      });

      // Handle client disconnect
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.stopVisualizationSession(socket.id);
      });
    });
  }

  /**
   * Start a real-time visualization session for a client
   */
  private async startVisualizationSession(
    socketId: string,
    data: { 
      audioFileId: string; 
      visualizationId: string; 
      audioAnalysis: AudioAnalysis;
      visualization: Visualization;
    }
  ) {
    // Cache audio analysis data
    this.audioAnalysisCache.set(data.audioFileId, data.audioAnalysis);

    // Create visualization state with fallback values
    const visualizationState: VisualizationState = {
      audioFileId: data.audioFileId,
      visualizationId: data.visualizationId,
      currentTime: 0,
      isPlaying: false,
      theme: (data.visualization?.theme || 'particles') as VisualizationState['theme'],
      settings: (data.visualization?.settings as VisualizationState['settings']) || {
        particleDensity: 75,
        motionSpeed: 50,
        colorIntensity: 80,
        colors: ['#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#10B981'],
        enableSync: true,
        enableGlow: true
      }
    };

    this.activeVisualizations.set(socketId, visualizationState);

    console.log(`Visualization session started for ${socketId}: ${data.visualizationId}`);
  }

  /**
   * Handle playback control commands
   */
  private handlePlaybackControl(
    socketId: string, 
    data: { action: 'play' | 'pause' | 'seek'; currentTime?: number }
  ) {
    const visualizationState = this.activeVisualizations.get(socketId);
    if (!visualizationState) return;

    switch (data.action) {
      case 'play':
        visualizationState.isPlaying = true;
        this.startRealtimeStream(socketId);
        break;
      
      case 'pause':
        visualizationState.isPlaying = false;
        this.stopRealtimeStream(socketId);
        break;
      
      case 'seek':
        if (data.currentTime !== undefined) {
          visualizationState.currentTime = data.currentTime;
        }
        break;
    }

    this.activeVisualizations.set(socketId, visualizationState);
  }

  /**
   * Start real-time data streaming for active visualization
   */
  private startRealtimeStream(socketId: string) {
    // Stop existing stream if any
    this.stopRealtimeStream(socketId);

    const visualizationState = this.activeVisualizations.get(socketId);
    if (!visualizationState) return;

    const audioAnalysis = this.audioAnalysisCache.get(visualizationState.audioFileId);
    if (!audioAnalysis) return;

    // Stream at 30fps for better performance
    const interval = setInterval(() => {
      const realtimeData = this.generateRealtimeData(visualizationState, audioAnalysis);
      
      this.io.to(socketId).emit("visualization-frame", realtimeData);
      
      // Update current time (assuming 33ms per frame = ~30fps)
      visualizationState.currentTime += 33;
      this.activeVisualizations.set(socketId, visualizationState);
      
    }, 33); // 30fps for better scalability

    this.intervals.set(socketId, interval);
  }

  /**
   * Stop real-time data streaming
   */
  private stopRealtimeStream(socketId: string) {
    const interval = this.intervals.get(socketId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(socketId);
    }
  }

  /**
   * Generate real-time visualization data based on audio analysis and current time
   */
  private generateRealtimeData(
    state: VisualizationState,
    audioAnalysis: AudioAnalysis
  ): RealtimeVisualizationData {
    const currentTimeSeconds = state.currentTime / 1000;
    
    // Detect if we're on a beat based on pre-analyzed beat data
    const beats = Array.isArray(audioAnalysis.beats) ? audioAnalysis.beats : [];
    const beat = beats.some((beatTime: number) => 
      Math.abs(beatTime - currentTimeSeconds) < 0.1 // 100ms tolerance
    );

    // Calculate intensity based on audio segments and current time
    const segments = Array.isArray(audioAnalysis.segments) ? audioAnalysis.segments : [];
    let intensity = 0.5; // Default intensity
    
    for (const segment of segments) {
      if (currentTimeSeconds >= segment.start && currentTimeSeconds <= segment.end) {
        intensity = segment.energy || 0.5;
        break;
      }
    }

    // Generate frequency bands (simulate 8-band EQ)
    const frequencyBands = this.generateFrequencyBands(currentTimeSeconds, state, beat);

    // Calculate dominant frequency
    const maxIndex = frequencyBands.indexOf(Math.max(...frequencyBands));
    const dominant_frequency = 60 + (maxIndex * 500); // Map to Hz range

    return {
      timestamp: Date.now(),
      currentTime: state.currentTime,
      beat,
      intensity,
      frequencyBands,
      bpm: audioAnalysis.bpm || 120,
      energy: intensity,
      dominant_frequency
    };
  }

  /**
   * Generate 8-band frequency analysis simulation
   */
  private generateFrequencyBands(
    currentTime: number,
    state: VisualizationState,
    beat: boolean
  ): number[] {
    const bands = [];
    const beatMultiplier = beat ? 1.5 : 1.0;

    for (let i = 0; i < 8; i++) {
      // Each frequency band has its own characteristics
      const baseFreq = Math.sin(currentTime * (0.5 + i * 0.2)) * 0.3 + 0.4;
      const randomness = (Math.random() - 0.5) * 0.2;
      const beatInfluence = beat ? Math.random() * 0.3 : 0;
      
      bands.push(Math.max(0, Math.min(1, baseFreq + randomness + beatInfluence)));
    }

    return bands;
  }

  /**
   * Update visualization settings in real-time
   */
  private updateVisualizationSettings(
    socketId: string,
    newSettings: Partial<VisualizationState['settings']>
  ) {
    const visualizationState = this.activeVisualizations.get(socketId);
    if (!visualizationState) return;

    visualizationState.settings = { ...visualizationState.settings, ...newSettings };
    this.activeVisualizations.set(socketId, visualizationState);

    // Broadcast updated settings
    this.io.to(socketId).emit("settings-updated", { settings: visualizationState.settings });
  }

  /**
   * Change visualization theme in real-time
   */
  private changeVisualizationTheme(socketId: string, theme: VisualizationState['theme']) {
    const visualizationState = this.activeVisualizations.get(socketId);
    if (!visualizationState) return;

    visualizationState.theme = theme;
    this.activeVisualizations.set(socketId, visualizationState);

    // Broadcast theme change
    this.io.to(socketId).emit("theme-changed", { theme });
  }

  /**
   * Stop visualization session and cleanup
   */
  private stopVisualizationSession(socketId: string) {
    this.stopRealtimeStream(socketId);
    this.activeVisualizations.delete(socketId);
    
    console.log(`Visualization session ended for ${socketId}`);
  }

  /**
   * Get current active visualizations count
   */
  public getActiveVisualizationsCount(): number {
    return this.activeVisualizations.size;
  }

  /**
   * Get active visualization state for debugging
   */
  public getVisualizationState(socketId: string): VisualizationState | undefined {
    return this.activeVisualizations.get(socketId);
  }
}