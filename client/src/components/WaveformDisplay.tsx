import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useState, useEffect } from "react";

interface WaveformDisplayProps {
  fileName?: string;
  duration?: number;
}

export default function WaveformDisplay({ fileName = "example-track.mp3", duration = 240 }: WaveformDisplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Generate mock waveform data
  useEffect(() => {
    const data = Array.from({ length: 200 }, (_, i) => {
      const baseHeight = Math.sin(i * 0.1) * 0.5 + 0.5;
      const noise = Math.random() * 0.3;
      return Math.max(0.1, Math.min(1, baseHeight + noise));
    });
    setWaveformData(data);
  }, []);

  // Simulate playback
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, duration]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    console.log('Playback toggled:', !isPlaying ? 'playing' : 'paused');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = (currentTime / duration) * 100;

  return (
    <Card className="hover-elevate">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>{fileName}</span>
          <span className="text-sm text-muted-foreground font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Waveform Display */}
        <div className="relative h-32 bg-gradient-to-r from-sidebar-primary/10 to-sidebar-accent/10 rounded-lg p-4 overflow-hidden">
          <div className="flex items-center justify-center h-full gap-1">
            {waveformData.map((height, index) => {
              const isActive = (index / waveformData.length) * 100 <= progressPercent;
              return (
                <div
                  key={index}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isActive 
                      ? 'bg-gradient-to-t from-sidebar-primary to-sidebar-accent' 
                      : 'bg-muted-foreground/30'
                  }`}
                  style={{ 
                    height: `${height * 100}%`,
                    opacity: isActive ? 1 : 0.6 
                  }}
                />
              );
            })}
          </div>
          
          {/* Progress Line */}
          <div 
            className="absolute top-0 w-0.5 h-full bg-gradient-to-b from-sidebar-primary to-sidebar-accent opacity-80 transition-all duration-100"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover-elevate"
            data-testid="button-skip-back"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button 
            size="icon" 
            onClick={togglePlayback}
            className="bg-gradient-to-r from-sidebar-primary to-sidebar-accent hover-elevate"
            data-testid="button-play-pause"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover-elevate"
            data-testid="button-skip-forward"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Audio Stats */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">BPM</div>
            <div className="font-mono font-semibold text-sidebar-primary">128</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Key</div>
            <div className="font-mono font-semibold text-sidebar-accent">C Major</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Energy</div>
            <div className="font-mono font-semibold text-chart-3">High</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}