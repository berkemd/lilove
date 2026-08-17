import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Share2, Film, Clock, HardDrive, CheckCircle } from "lucide-react";
import { useState } from "react";

interface ExportPanelProps {
  isPremium?: boolean;
}

export default function ExportPanel({ isPremium = false }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [quality, setQuality] = useState("720p");
  const [format, setFormat] = useState("mp4");
  const [duration, setDuration] = useState("full");

  const startExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    console.log('Export started with settings:', { quality, format, duration });

    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 300);
  };

  const shareExport = () => {
    console.log('Share triggered');
    // In a real app, this would open the native share dialog
  };

  const estimatedSize = () => {
    const baseSize = duration === "30s" ? 15 : duration === "60s" ? 30 : 90;
    const qualityMultiplier = quality === "1080p" ? 2 : quality === "720p" ? 1 : 0.5;
    return Math.round(baseSize * qualityMultiplier);
  };

  const estimatedTime = () => {
    const baseTime = duration === "30s" ? 1 : duration === "60s" ? 2 : 5;
    return `${baseTime}-${baseTime + 2} min`;
  };

  return (
    <Card className="hover-elevate">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="h-5 w-5 text-sidebar-primary" />
          Export Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Video Quality</Label>
          <Select value={quality} onValueChange={setQuality} data-testid="select-quality">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="480p">480p (Basic)</SelectItem>
              <SelectItem value="720p">720p (HD)</SelectItem>
              <SelectItem value="1080p" disabled={!isPremium}>
                1080p (Full HD)
                {!isPremium && <Badge variant="outline" className="ml-2 text-xs">PRO</Badge>}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Format Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Format</Label>
          <Select value={format} onValueChange={setFormat} data-testid="select-format">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mp4">MP4 (Recommended)</SelectItem>
              <SelectItem value="mov">MOV (Apple)</SelectItem>
              <SelectItem value="webm" disabled={!isPremium}>
                WebM
                {!isPremium && <Badge variant="outline" className="ml-2 text-xs">PRO</Badge>}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Duration Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Duration</Label>
          <Select value={duration} onValueChange={setDuration} data-testid="select-duration">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30s">
                30 seconds {!isPremium && "(Free limit)"}
              </SelectItem>
              <SelectItem value="60s" disabled={!isPremium}>
                60 seconds
                {!isPremium && <Badge variant="outline" className="ml-2 text-xs">PRO</Badge>}
              </SelectItem>
              <SelectItem value="full" disabled={!isPremium}>
                Full track
                {!isPremium && <Badge variant="outline" className="ml-2 text-xs">PRO</Badge>}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-card border rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Size:</span>
            <span className="font-mono">{estimatedSize()} MB</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Time:</span>
            <span className="font-mono">{estimatedTime()}</span>
          </div>
        </div>

        {/* Watermark Notice */}
        {!isPremium && (
          <div className="p-3 bg-sidebar-primary/10 border border-sidebar-primary/20 rounded-lg">
            <p className="text-sm text-sidebar-primary">
              Free exports include a small watermark. Upgrade to Pro to remove it.
            </p>
          </div>
        )}

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Exporting video...</span>
              <span className="font-mono">{Math.round(exportProgress)}%</span>
            </div>
            <Progress value={exportProgress} className="w-full" data-testid="progress-export" />
          </div>
        )}

        {/* Export Actions */}
        <div className="space-y-3">
          {exportProgress === 100 && !isExporting ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Export completed!</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={shareExport}
                  className="flex-1 hover-elevate"
                  data-testid="button-share"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button 
                  onClick={() => console.log('Download triggered')}
                  variant="outline"
                  className="flex-1 hover-elevate"
                  data-testid="button-download"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={startExport}
              disabled={isExporting}
              className="w-full bg-gradient-to-r from-sidebar-primary to-sidebar-accent hover-elevate"
              data-testid="button-start-export"
            >
              {isExporting ? (
                <>Processing...</>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Video
                </>
              )}
            </Button>
          )}
        </div>

        {/* Quick Share Options */}
        {exportProgress === 100 && !isExporting && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-3 block">Quick Share</Label>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => console.log('Share to Instagram')}
                className="hover-elevate"
                data-testid="button-share-instagram"
              >
                Instagram
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => console.log('Share to TikTok')}
                className="hover-elevate"
                data-testid="button-share-tiktok"
              >
                TikTok
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => console.log('Share to YouTube')}
                className="hover-elevate"
                data-testid="button-share-youtube"
              >
                YouTube
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}