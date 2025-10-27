import { useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Music, FileAudio, X, Check } from "lucide-react";

interface ModernAudioUploaderProps {
  onFileSelect: (file: File) => void;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
}

export default function ModernAudioUploader({ 
  onFileSelect, 
  maxSize = 100,
  acceptedFormats = ['mp3', 'wav', 'mp4', 'm4a', 'ogg', 'flac']
}: ModernAudioUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `Dosya boyutu ${maxSize}MB'den büyük olamaz`;
    }

    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !acceptedFormats.includes(extension)) {
      return `Desteklenen formatlar: ${acceptedFormats.join(', ')}`;
    }

    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Simulate upload delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setUploadedFile(file);
      onFileSelect(file);
      console.log('File selected:', file.name, `(${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    } catch (err) {
      setError('Dosya yüklenirken hata oluştu');
    } finally {
      setUploading(false);
    }
  }, [onFileSelect, maxSize, acceptedFormats]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setError(null);
  };

  if (uploadedFile) {
    return (
      <Card className="border-2 border-dashed border-green-400/50 bg-green-50/50 dark:bg-green-950/20 hover-elevate">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-300">
                  Dosya Hazır!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400 max-w-md truncate">
                  {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(1)}MB)
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFile}
              className="text-green-600 hover:text-green-800 dark:text-green-400"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`border-2 border-dashed transition-all duration-300 hover-elevate ${
        dragActive 
          ? 'border-sidebar-primary bg-sidebar-primary/5' 
          : error
          ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20'
          : 'border-border hover:border-sidebar-primary/50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-sidebar-primary/10 to-sidebar-accent/10 flex items-center justify-center">
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sidebar-primary border-t-transparent" />
            ) : error ? (
              <X className="h-8 w-8 text-red-500" />
            ) : (
              <Upload className="h-8 w-8 text-sidebar-primary" />
            )}
          </div>

          {/* Main Text */}
          <div>
            <h3 className="text-xl font-semibold mb-2">
              {uploading ? 'Dosya Yükleniyor...' : 'Ses Dosyanızı Yükleyin'}
            </h3>
            <p className="text-muted-foreground">
              {error ? (
                <span className="text-red-500">{error}</span>
              ) : (
                'Sürükle bırak veya dosya seç'
              )}
            </p>
          </div>

          {/* Upload Button */}
          {!uploading && (
            <div>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept={acceptedFormats.map(format => `.${format}`).join(',')}
                onChange={handleFileInput}
              />
              <label htmlFor="file-upload">
                <Button asChild className="cursor-pointer hover-elevate">
                  <span>
                    <FileAudio className="mr-2 h-4 w-4" />
                    Dosya Seç
                  </span>
                </Button>
              </label>
            </div>
          )}

          {/* Format Info */}
          <div className="text-xs text-muted-foreground">
            <p>Desteklenen formatlar: {acceptedFormats.join(', ').toUpperCase()}</p>
            <p>Maksimum dosya boyutu: {maxSize}MB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}