import RealVisualizationCanvas from '../RealVisualizationCanvas'
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function VisualizationCanvasExample() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [theme, setTheme] = useState<'particles' | 'waveform' | 'spectrum' | 'circular'>('spectrum');

  const themes = ['particles', 'waveform', 'spectrum', 'circular'] as const;

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <Button onClick={() => setIsPlaying(!isPlaying)} variant="outline">
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <div className="flex gap-2">
          {themes.map(t => (
            <Button 
              key={t} 
              onClick={() => setTheme(t)}
              variant={theme === t ? 'default' : 'outline'}
              size="sm"
            >
              {t}
            </Button>
          ))}
        </div>
      </div>
      <RealVisualizationCanvas 
        theme={theme} 
        isPlaying={isPlaying} 
        onPlayStateChange={setIsPlaying}
      />
    </div>
  );
}