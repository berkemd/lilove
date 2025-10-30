import VisualizationCanvas from '../VisualizationCanvas'
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function VisualizationCanvasExample() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [theme, setTheme] = useState<'particles' | 'waveform' | 'fractal' | 'fluid'>('particles');

  const themes = ['particles', 'waveform', 'fractal', 'fluid'] as const;

  // Mock data for the example
  const mockAudioAnalysis = {
    tempo: 120,
    key: 'C',
    energy: 0.7,
  };

  const mockVisualization = {
    name: 'Example Visualization',
    status: 'ready',
  };

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
      <VisualizationCanvas 
        audioFileId="example-audio-id" 
        visualizationId="example-viz-id"
        audioAnalysis={mockAudioAnalysis}
        visualization={mockVisualization}
        theme={theme} 
      />
    </div>
  );
}