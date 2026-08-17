import { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Trash2, 
  Send,
  Loader2,
  Pause
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceNoteRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onSend?: (audioBlob: Blob, duration: number) => void;
  maxDuration?: number;
  compact?: boolean;
}

export default function VoiceNoteRecorder({ 
  onRecordingComplete, 
  onSend,
  maxDuration = 60,
  compact = false
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const finalDuration = Math.round((Date.now() - startTimeRef.current) / 1000);
        
        setAudioBlob(blob);
        setAudioUrl(url);
        setDuration(finalDuration);
        
        stream.getTracks().forEach(track => track.stop());
        onRecordingComplete?.(blob, finalDuration);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [maxDuration, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const playAudio = useCallback(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const discardRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
  }, [audioUrl]);

  const handleSend = useCallback(async () => {
    if (audioBlob && onSend) {
      setIsSending(true);
      try {
        await onSend(audioBlob, duration);
        discardRecording();
      } catch (error) {
        console.error('Failed to send voice note:', error);
      } finally {
        setIsSending(false);
      }
    }
  }, [audioBlob, duration, onSend, discardRecording]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {!audioBlob ? (
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "ghost"}
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              isRecording && "animate-pulse"
            )}
            data-testid="button-record-voice"
          >
            {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        ) : (
          <>
            <audio 
              ref={audioRef} 
              src={audioUrl || undefined}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={isPlaying ? pauseAudio : playAudio}
              data-testid="button-play-voice"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <span className="text-xs text-muted-foreground">{formatDuration(duration)}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={discardRecording}
              data-testid="button-discard-voice"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {onSend && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSend}
                disabled={isSending}
                data-testid="button-send-voice"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            )}
          </>
        )}
        {isRecording && (
          <span className="text-xs text-destructive font-medium animate-pulse">
            {formatDuration(duration)} / {formatDuration(maxDuration)}
          </span>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <audio 
          ref={audioRef} 
          src={audioUrl || undefined}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          {!audioBlob ? (
            <>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                  isRecording 
                    ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                    : "bg-gradient-to-br from-pink-500 to-purple-600 hover:scale-105"
                )}
                data-testid="button-record-voice-main"
              >
                {isRecording ? (
                  <Square className="h-8 w-8 text-white" />
                ) : (
                  <Mic className="h-8 w-8 text-white" />
                )}
              </button>
              
              <div className="text-center">
                {isRecording ? (
                  <>
                    <p className="text-2xl font-bold text-destructive">{formatDuration(duration)}</p>
                    <p className="text-sm text-muted-foreground">Recording... Tap to stop</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Tap to record</p>
                    <p className="text-sm text-muted-foreground">Max {maxDuration} seconds</p>
                  </>
                )}
              </div>
              
              {isRecording && (
                <div className="w-full max-w-xs">
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-red-500 transition-all duration-1000"
                      style={{ width: `${(duration / maxDuration) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <button
                  onClick={isPlaying ? pauseAudio : playAudio}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center hover:scale-105 transition-transform"
                  data-testid="button-play-voice-main"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 text-white" />
                  ) : (
                    <Play className="h-6 w-6 text-white ml-1" />
                  )}
                </button>
                
                <div className="text-center">
                  <p className="text-xl font-bold">{formatDuration(duration)}</p>
                  <p className="text-sm text-muted-foreground">Voice note ready</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={discardRecording}
                  data-testid="button-discard-recording"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Discard
                </Button>
                
                {onSend && (
                  <Button
                    onClick={handleSend}
                    disabled={isSending}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    data-testid="button-send-recording"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
