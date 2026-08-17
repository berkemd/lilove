import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Palette, Sliders, Sparkles, Lock } from "lucide-react";
import { useState } from "react";

interface ControlPanelProps {
  isPremium?: boolean;
}

export default function ControlPanel({ isPremium = false }: ControlPanelProps) {
  const [particleDensity, setParticleDensity] = useState([75]);
  const [motionSpeed, setMotionSpeed] = useState([50]);
  const [colorIntensity, setColorIntensity] = useState([80]);
  const [enableSync, setEnableSync] = useState(true);
  const [enableGlow, setEnableGlow] = useState(true);

  const handleSliderChange = (name: string, value: number[]) => {
    console.log(`${name} changed to:`, value[0]);
    switch (name) {
      case 'particleDensity':
        setParticleDensity(value);
        break;
      case 'motionSpeed':
        setMotionSpeed(value);
        break;
      case 'colorIntensity':
        setColorIntensity(value);
        break;
    }
  };

  const presets = [
    { name: 'Ambient', description: 'Calm and flowing', locked: false },
    { name: 'Energetic', description: 'High-energy beats', locked: false },
    { name: 'Retro Wave', description: '80s synthwave vibes', locked: !isPremium },
    { name: 'Cosmic', description: 'Space-age visuals', locked: !isPremium },
    { name: 'Neon Dreams', description: 'Cyberpunk aesthetics', locked: !isPremium },
  ];

  return (
    <div className="space-y-6">
      {/* Visual Controls */}
      <Card className="hover-elevate">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-sidebar-primary" />
            Visual Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Particle Density */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Particle Density</Label>
              <Badge variant="secondary" className="font-mono">
                {particleDensity[0]}%
              </Badge>
            </div>
            <Slider
              value={particleDensity}
              onValueChange={(value) => handleSliderChange('particleDensity', value)}
              max={100}
              step={5}
              className="w-full"
              data-testid="slider-particle-density"
            />
          </div>

          {/* Motion Speed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Motion Speed</Label>
              <Badge variant="secondary" className="font-mono">
                {motionSpeed[0]}%
              </Badge>
            </div>
            <Slider
              value={motionSpeed}
              onValueChange={(value) => handleSliderChange('motionSpeed', value)}
              max={100}
              step={5}
              className="w-full"
              data-testid="slider-motion-speed"
            />
          </div>

          {/* Color Intensity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Color Intensity</Label>
              <Badge variant="secondary" className="font-mono">
                {colorIntensity[0]}%
              </Badge>
            </div>
            <Slider
              value={colorIntensity}
              onValueChange={(value) => handleSliderChange('colorIntensity', value)}
              max={100}
              step={5}
              className="w-full"
              data-testid="slider-color-intensity"
            />
          </div>

          {/* Toggle Options */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Beat Synchronization</Label>
              <Switch
                checked={enableSync}
                onCheckedChange={setEnableSync}
                data-testid="switch-beat-sync"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Glow Effects</Label>
              <Switch
                checked={enableGlow}
                onCheckedChange={setEnableGlow}
                data-testid="switch-glow-effects"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Theme Presets */}
      <Card className="hover-elevate">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sidebar-accent" />
            AI Theme Presets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                className={`h-auto p-4 justify-start hover-elevate relative ${
                  preset.locked ? 'opacity-60' : ''
                }`}
                onClick={() => console.log('Preset selected:', preset.name)}
                disabled={preset.locked}
                data-testid={`button-preset-${preset.name.toLowerCase().replace(' ', '-')}`}
              >
                <div className="flex items-center w-full">
                  <div className="flex-1 text-left">
                    <div className="font-medium flex items-center gap-2">
                      {preset.name}
                      {preset.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {preset.description}
                    </div>
                  </div>
                  {preset.locked && (
                    <Badge variant="outline" className="text-xs">
                      PRO
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card className="hover-elevate">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-chart-3" />
            Color Palette
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {[
              'hsl(280, 85%, 65%)', // Purple
              'hsl(195, 85%, 55%)', // Cyan
              'hsl(45, 90%, 60%)',  // Gold
              'hsl(315, 75%, 60%)', // Pink
              'hsl(160, 80%, 55%)', // Green
              'hsl(15, 85%, 60%)',  // Orange
            ].map((color, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-12 w-full p-0 hover-elevate"
                style={{ backgroundColor: color }}
                onClick={() => console.log('Color selected:', color)}
                data-testid={`button-color-${index}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}