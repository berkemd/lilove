import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fullscreen, Download, Settings, Play, Pause } from "lucide-react";
import { useState, useEffect } from "react";
import { useVisualizationSocket } from "@/hooks/useVisualizationSocket";

interface VisualizationCanvasProps {
  audioFileId: string;
  visualizationId: string;
  audioAnalysis: any;
  visualization: any;
  theme?: 'particles' | 'waveform' | 'fractal' | 'fluid';
}

export default function VisualizationCanvas({ 
  audioFileId, 
  visualizationId, 
  audioAnalysis, 
  visualization,
  theme = 'particles'
}: VisualizationCanvasProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Use WebSocket for real-time visualization data
  const {
    isConnected,
    realtimeData,
    settings,
    currentTheme,
    isPlaying,
    playVisualization,
    pauseVisualization,
    changeTheme
  } = useVisualizationSocket({
    audioFileId,
    visualizationId,
    audioAnalysis,
    visualization
  });
  
  // Use real-time data or fallback to basic animation
  const frameCount = realtimeData?.currentTime || 0;
  const beat = realtimeData?.beat || false;
  const intensity = realtimeData?.intensity || 0.5;
  const frequencyBands = realtimeData?.frequencyBands || Array(8).fill(0.5);
  const visualizationTheme = currentTheme || theme;

  // Handle theme changes from props
  useEffect(() => {
    if (theme !== currentTheme) {
      changeTheme(theme);
    }
  }, [theme, currentTheme, changeTheme]);

  const renderVisualization = () => {
    const baseStyle = "absolute inset-0 transition-all duration-300";
    
    // Apply beat effect with intensity boost
    const beatScale = beat ? 1.0 + (intensity * 0.3) : 1.0;
    const intensityAlpha = Math.max(0.3, intensity);
    
    switch (visualizationTheme) {
      case 'particles':
        return (
          <div className={baseStyle}>
            <div className="relative w-full h-full bg-gradient-to-br from-sidebar-primary/20 to-sidebar-accent/20 overflow-hidden">
              {/* Real-time synchronized particles */}
              {Array.from({ length: Math.floor(30 + (intensity * 40)) }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-sidebar-primary to-sidebar-accent opacity-70"
                  style={{
                    left: `${(i * 7 + frameCount * 0.001) % 100}%`,
                    top: `${(Math.sin(frameCount * 0.0001 + i) * (20 * intensity) + 50)}%`,
                    transform: `scale(${(Math.sin(frameCount * 0.0002 + i) * 0.5 + 1) * beatScale})`,
                    filter: 'blur(1px)',
                    opacity: intensityAlpha,
                  }}
                />
              ))}
            </div>
          </div>
        );
      
      case 'waveform':
        return (
          <div className={baseStyle}>
            <div className="flex items-center justify-center h-full gap-1 px-8">
              {Array.from({ length: Math.min(frequencyBands.length * 12, 96) }, (_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-sidebar-primary to-sidebar-accent rounded-full transition-all duration-75"
                  style={{
                    height: `${(frequencyBands[i % 8] * intensity * beatScale + 0.1) * 90}%`,
                    opacity: 0.6 + (intensity * 0.4),
                  }}
                />
              ))}
            </div>
          </div>
        );
      
      case 'fractal':
        return (
          <div className={baseStyle}>
            <div className="relative w-full h-full bg-gradient-radial from-sidebar-primary/10 to-sidebar-accent/10 overflow-hidden">
              {/* Rotating geometric shapes */}
              <div 
                className="absolute inset-1/4 border-2 border-sidebar-primary/50 rounded-lg"
                style={{ transform: `rotate(${frameCount * 0.5}deg)` }}
              />
              <div 
                className="absolute inset-1/3 border-2 border-sidebar-accent/50 rounded-full"
                style={{ transform: `rotate(${-frameCount * 0.3}deg)` }}
              />
              <div 
                className="absolute inset-2/5 border-2 border-chart-3/50"
                style={{ 
                  transform: `rotate(${frameCount * 0.7}deg)`,
                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
                }}
              />
            </div>
          </div>
        );
      
      case 'fluid':
        return (
          <div className={baseStyle}>
            <div className="relative w-full h-full overflow-hidden">
              <div 
                className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/30 via-sidebar-accent/20 to-chart-3/30 animate-pulse-slow"
                style={{
                  background: `radial-gradient(circle at ${50 + Math.sin(frameCount * 0.01) * 30}% ${50 + Math.cos(frameCount * 0.015) * 30}%, hsl(280, 85%, 65%) 0%, hsl(195, 85%, 55%) 50%, transparent 100%)`,
                }}
              />
              <div 
                className="absolute inset-0 bg-gradient-to-tl from-sidebar-accent/20 via-transparent to-sidebar-primary/20 animate-pulse-slow"
                style={{
                  background: `radial-gradient(circle at ${50 + Math.cos(frameCount * 0.008) * 25}% ${50 + Math.sin(frameCount * 0.012) * 25}%, hsl(195, 85%, 55%) 0%, transparent 70%)`,
                }}
              />
            </div>
          </div>
        );
      
      default:
        return <div className={baseStyle} />;
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    console.log('Fullscreen toggled:', !isFullscreen);
  };

  return (
    <Card className={`relative overflow-hidden hover-elevate ${isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'}`}>
      <CardContent className="p-0 relative h-full">
        {/* Visualization Area */}
        <div className="relative w-full h-96 bg-gradient-to-br from-background to-card overflow-hidden">
          {renderVisualization()}
          
          {/* Playback Controls */}
          <div className="absolute top-4 left-4">
            <Button
              variant="secondary"
              size="icon"
              onClick={isPlaying ? pauseVisualization : playVisualization}
              className="bg-black/20 backdrop-blur-lg border-white/10 hover-elevate"
              data-testid="button-play-pause"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Overlay Controls */}
          <div className="absolute top-4 right-4 flex space-x-2 opacity-0 hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => console.log('Settings opened')}
              className="bg-black/20 backdrop-blur-lg border-white/10 hover-elevate"
              data-testid="button-visualization-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleFullscreen}
              className="bg-black/20 backdrop-blur-lg border-white/10 hover-elevate"
              data-testid="button-fullscreen"
            >
              <Fullscreen className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={() => console.log('Export triggered')}
              className="bg-black/20 backdrop-blur-lg border-white/10 hover-elevate"
              data-testid="button-export"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Info */}
          <div className="absolute bottom-4 left-4">
            <div className="bg-black/20 backdrop-blur-lg rounded-lg px-3 py-1 border border-white/10">
              <div className="text-xs text-white/80 font-mono">
                {visualizationTheme.toUpperCase()} • {isConnected ? (isPlaying ? 'LIVE' : 'READY') : 'CONNECTING'} • {Math.floor(frameCount / 16)}s
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}