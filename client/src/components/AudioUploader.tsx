import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Music, FileAudio, Loader2 } from "lucide-react";
import { useState, useRef } from "react";

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
}

export default function AudioUploader({ onFileSelect }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    
    if (audioFile) {
      setSelectedFile(audioFile);
      setIsAnalyzing(true);
      onFileSelect(audioFile);
      
      // Simulate analysis
      setTimeout(() => setIsAnalyzing(false), 2000);
      console.log('Audio file dropped:', audioFile.name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsAnalyzing(true);
      onFileSelect(file);
      
      // Simulate analysis
      setTimeout(() => setIsAnalyzing(false), 2000);
      console.log('Audio file selected:', file.name);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className={`transition-all duration-300 border-2 border-dashed hover-elevate ${
      isDragging 
        ? 'border-sidebar-primary bg-sidebar-primary/5 scale-105' 
        : 'border-border'
    }`}>
      <CardContent 
        className="p-12 text-center"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="audio-upload-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-audio-file"
        />

        {isAnalyzing ? (
          <div className="space-y-4">
            <Loader2 className="h-16 w-16 mx-auto text-sidebar-primary animate-spin" />
            <h3 className="text-xl font-semibold">Analyzing Your Music...</h3>
            <p className="text-muted-foreground">
              Detecting beats, tempo, and energy patterns
            </p>
          </div>
        ) : selectedFile ? (
          <div className="space-y-4">
            <FileAudio className="h-16 w-16 mx-auto text-sidebar-accent" />
            <h3 className="text-xl font-semibold">{selectedFile.name}</h3>
            <p className="text-muted-foreground">
              Ready to visualize • {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <Button 
              onClick={openFileDialog}
              variant="outline"
              className="hover-elevate"
              data-testid="button-change-file"
            >
              Change File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-xl font-semibold">Drop your music here</h3>
            <p className="text-muted-foreground">
              Or click to browse • Supports MP3, WAV, FLAC
            </p>
            <Button 
              onClick={openFileDialog}
              className="bg-gradient-to-r from-sidebar-primary to-sidebar-accent hover-elevate"
              data-testid="button-browse-files"
            >
              <Music className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}