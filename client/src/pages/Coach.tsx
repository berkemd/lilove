import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Brain, 
  Send, 
  Sparkles, 
  Target,
  TrendingUp,
  Lightbulb,
  MessageCircle,
  Clock,
  Zap,
  Trophy,
  Heart,
  Star,
  Rocket,
  RefreshCw,
  ChevronRight,
  User,
  Bot,
  BookOpen,
  History,
  Settings,
  BarChart3,
  Calendar,
  CheckCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCsrfToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { getAuth } from 'firebase/auth';
import { Link } from 'wouter';
import { detectCrisisLevel } from '@/lib/crisisResources';
import { CrisisBanner } from '@/components/CrisisSupport';

async function getFirebaseToken(): Promise<string | null> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Failed to get Firebase token:', error);
    return null;
  }
}

interface SentimentData {
  mood: 'positive' | 'neutral' | 'negative' | 'concerned';
  sentimentScore: number;
  emotions: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
  confidence: number;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  sentiment?: SentimentData;
}

interface DailyInsight {
  insight: string;
  motivation: string;
  focusArea: string;
  challenge?: string;
}

interface PerformanceAnalysis {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  nextSteps: string[];
  patterns?: {
    completionPatterns: any;
    timeEfficiency: any;
    goalAchievementProbability: number;
    performanceTrends: any;
    bottlenecks: string[];
    successFactors: string[];
  };
  timestamp?: string;
}

interface Recommendations {
  goalRecommendations: Array<{ 
    title: string; 
    description: string; 
    priority: string; 
    category: string; 
  }>;
  skillDevelopment: string[];
  habitSuggestions: string[];
  timeOptimization: string[];
  resourceSuggestions: string[];
}

interface ConversationHistory {
  conversations: Array<{
    id: string;
    title: string;
    category: string;
    goalId?: string;
    lastMessage: string;
    messageCount: number;
    lastActiveAt: Date;
    createdAt: Date;
  }>;
  totalConversations: number;
  recentSessions: Array<{
    sessionType: string;
    query: string;
    response: string;
    timestamp: Date;
    confidence?: string;
  }>;
}

export default function Coach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Voice playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voiceSettings, setVoiceSettings] = useState({
    model: 'alloy',
    autoPlay: false,
    speed: 1.0
  });

  // Crisis detection state
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const [crisisLevel, setCrisisLevel] = useState<'concern' | 'urgent'>('concern');

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch daily insight
  const { data: dailyInsight, isLoading: insightLoading, refetch: refetchInsight, error: insightError } = useQuery<DailyInsight>({
    queryKey: ['/api/ai-coach/daily-insight'],
    retry: 1,
    staleTime: 1000 * 60 * 60 * 6, // Cache for 6 hours
  });

  // Fetch performance analysis
  const { data: performanceAnalysis, isLoading: performanceLoading, refetch: refetchPerformance, error: performanceError } = useQuery<PerformanceAnalysis>({
    queryKey: ['/api/ai-coach/performance-analysis'],
    retry: 1,
    enabled: activeTab === 'performance',
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  // Fetch recommendations
  const { data: recommendations, isLoading: recommendationsLoading, refetch: refetchRecommendations, error: recommendationsError } = useQuery<Recommendations>({
    queryKey: ['/api/ai-coach/recommendations'],
    retry: 1,
    enabled: activeTab === 'recommendations',
    staleTime: 1000 * 60 * 60 * 2, // Cache for 2 hours
  });

  // Fetch conversation history
  const { data: conversationHistory, isLoading: historyLoading, refetch: refetchHistory, error: historyError } = useQuery<ConversationHistory>({
    queryKey: ['/api/ai-coach/conversation-history'],
    retry: 1,
    enabled: activeTab === 'history',
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });

  // Retry helper function
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  };

  // Non-streaming chat API call (used as fallback)
  const sendNonStreamingChat = async (message: string): Promise<{ response: string; suggestions?: string[] }> => {
    const csrfToken = getCsrfToken();
    const firebaseToken = await getFirebaseToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || '',
    };
    if (firebaseToken) {
      headers['Authorization'] = `Bearer ${firebaseToken}`;
    }
    const res = await fetch('/api/ai-coach/chat', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ message }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
    }
    
    return await res.json();
  };

  // Analyze sentiment for a message (non-blocking)
  const analyzeSentiment = async (text: string, messageId: string) => {
    try {
      const csrfToken = getCsrfToken();
      const firebaseToken = await getFirebaseToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      };
      if (firebaseToken) {
        headers['Authorization'] = `Bearer ${firebaseToken}`;
      }
      const res = await fetch('/api/ai/sentiment', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ text }),
      });
      
      if (res.ok) {
        const sentiment: SentimentData = await res.json();
        
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, sentiment }
            : msg
        ));
        
        if (sentiment.urgencyLevel === 'high') {
          setCrisisLevel('urgent');
          setShowCrisisBanner(true);
        } else if (sentiment.mood === 'concerned' || sentiment.urgencyLevel === 'medium') {
          setCrisisLevel('concern');
          setShowCrisisBanner(true);
        }
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    }
  };

  // Streaming chat function
  const handleStreamingChat = async (message: string) => {
    setIsTyping(true);
    
    // Check for crisis keywords locally first (fast, no API call)
    const localCrisisLevel = detectCrisisLevel(message);
    if (localCrisisLevel === 'urgent') {
      setCrisisLevel('urgent');
      setShowCrisisBanner(true);
    } else if (localCrisisLevel === 'concern') {
      setCrisisLevel('concern');
      setShowCrisisBanner(true);
    }
    
    // Add user message immediately
    const userMessageId = Date.now().toString();
    const userMessage: Message = {
      id: userMessageId,
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Analyze sentiment in background (non-blocking)
    analyzeSentiment(message, userMessageId);
    
    // Create AI message placeholder
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      type: 'ai',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMessage]);
    
    try {
      const csrfToken = getCsrfToken();
      const firebaseToken = await getFirebaseToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      };
      if (firebaseToken) {
        headers['Authorization'] = `Bearer ${firebaseToken}`;
      }
      const response = await fetch('/api/ai-mentor/chat-stream', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Streaming failed: ${response.status} ${errorText}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('No response stream available');
      
      let accumulatedContent = '';
      let hasReceivedContent = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.chunk) {
                hasReceivedContent = true;
                accumulatedContent += data.chunk;
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ));
              }
              
              if (data.done) {
                setIsTyping(false);
                trackEvent('ai_prompt_used', {
                  prompt_type: 'chat_stream',
                  message_length: message.length,
                });
                return;
              }
              
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError: any) {
              if (parseError.message.includes('JSON')) {
                console.warn('SSE parse warning:', parseError);
              } else {
                throw parseError;
              }
            }
          }
        }
      }
      
      if (!hasReceivedContent) {
        throw new Error('No content received from streaming');
      }
      
    } catch (error: any) {
      console.error('Streaming chat error:', error);
      
      // Fallback to non-streaming chat with retry logic
      try {
        const result = await retryWithBackoff(() => sendNonStreamingChat(message), 2, 500);
        
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: result.response, suggestions: result.suggestions }
            : msg
        ));
        
        trackEvent('ai_prompt_used', {
          prompt_type: 'chat_fallback',
          message_length: message.length,
        });
        
      } catch (fallbackError: any) {
        console.error('Fallback chat error:', fallbackError);
        
        // Provide a helpful fallback message instead of just removing
        const errorMessage = fallbackError.message?.includes('401') || fallbackError.message?.includes('403')
          ? "Please log in to use the AI coach."
          : fallbackError.message?.includes('429')
          ? "Too many requests. Please wait a moment before trying again."
          : "I'm temporarily unavailable. Please try again in a few moments.";
        
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { 
                ...msg, 
                content: errorMessage,
                suggestions: ["Try again", "Refresh the page", "Check your connection"]
              }
            : msg
        ));
        
        toast({
          title: "Connection Issue",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsTyping(false);
    }
  };

  // Welcome message on load
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        type: 'ai',
        content: "Hello, beautiful soul! I'm your LiLove AI Coach, your loving growth companion. I've been following your journey with joy, and I'm here to support you with warmth and encouragement. What would you like to explore together today?",
        timestamp: new Date(),
        suggestions: [
          "Help me nurture my goals",
          "What would bring me joy today?",
          "Celebrate my progress with me",
          "I need some loving encouragement"
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const message = inputMessage.trim();
    setInputMessage('');

    // Use streaming chat
    await handleStreamingChat(message);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Voice Recording Functions
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak your message...",
      });
    } catch (error: any) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive"
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const firebaseToken = await getFirebaseToken();
      const headers: Record<string, string> = {};
      if (firebaseToken) {
        headers['Authorization'] = `Bearer ${firebaseToken}`;
      }
      
      const response = await fetch('/api/coach/voice/transcribe', {
        method: 'POST',
        headers,
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const data = await response.json();
      setInputMessage(data.transcript);
      
      toast({
        title: "Transcription complete",
        description: "Your message has been transcribed. Click send to deliver it.",
      });
    } catch (error: any) {
      console.error("Transcription error:", error);
      toast({
        title: "Transcription failed",
        description: "Could not transcribe your audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  // Voice Playback Functions
  const speakMessage = async (messageId: string, text: string) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      if (playingMessageId === messageId) {
        setPlayingMessageId(null);
        return; // Toggle off if same message
      }
    }
    
    setIsLoadingAudio(true);
    setPlayingMessageId(messageId);
    
    try {
      const firebaseToken = await getFirebaseToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (firebaseToken) {
        headers['Authorization'] = `Bearer ${firebaseToken}`;
      }
      
      const response = await fetch('/api/coach/voice/speak', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          text, 
          voice: voiceSettings.model,
          speed: voiceSettings.speed
        })
      });
      
      if (!response.ok) {
        throw new Error('Text-to-speech failed');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setPlayingMessageId(null);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setPlayingMessageId(null);
        audioRef.current = null;
        toast({
          title: "Playback error",
          description: "Could not play audio. Please try again.",
          variant: "destructive"
        });
      };
      
      audioRef.current = audio;
      await audio.play();
      
      setIsLoadingAudio(false);
    } catch (error: any) {
      console.error("Text-to-speech error:", error);
      setPlayingMessageId(null);
      setIsLoadingAudio(false);
      toast({
        title: "Voice playback failed",
        description: "Could not generate speech. Please try again.",
        variant: "destructive"
      });
    }
  };

  const quickActions = [
    { label: "Today's Joy", icon: Target, action: "What would bring me joy today?" },
    { label: "Nurture Goals", icon: Rocket, action: "Help me lovingly plan my next goal" },
    { label: "Celebrate Progress", icon: TrendingUp, action: "Let's celebrate how far I've come!" },
    { label: "Loving Support", icon: Heart, action: "I need some loving encouragement" },
  ];

  const handleCrisisHelp = () => {
    window.open('/safety-resources', '_blank');
  };

  return (
    <>
      <CrisisBanner 
        show={showCrisisBanner} 
        level={crisisLevel}
        onClose={() => setShowCrisisBanner(false)}
        onGetHelp={handleCrisisHelp}
      />
      
    <div className={`p-6 space-y-6 ${showCrisisBanner ? 'pt-24' : ''}`} data-testid="page-coach">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Brain className="w-10 h-10 text-primary" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">LiLove AI Coach</h1>
            <p className="text-muted-foreground">Your personal companion for meaningful growth and deep connections</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Sparkles className="w-3 h-3 mr-1" />
            GPT-5 Powered
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Zap className="w-3 h-3 mr-1" />
            Always Learning
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="chat">
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Lightbulb className="w-4 h-4 mr-2" />
            Daily Insights
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <BookOpen className="w-4 h-4 mr-2" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Trophy className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Chat */}
            <Card className="lg:col-span-2" data-testid="section-chat">
              <CardContent className="p-0">
                <ScrollArea className="h-[500px] p-6">
                  <div className="space-y-4 pb-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${message.type}-${message.id}`}
                      >
                        {message.type === 'ai' && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-primary-foreground" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          } ${message.sentiment?.mood === 'concerned' ? 'ring-2 ring-red-400' : ''}`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs opacity-70">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                              {message.type === 'user' && message.sentiment && (
                                <span 
                                  className="text-xs"
                                  title={`Mood: ${message.sentiment.mood} | Emotions: ${message.sentiment.emotions.join(', ')}`}
                                  data-testid={`mood-indicator-${message.id}`}
                                >
                                  {message.sentiment.mood === 'positive' && <Heart className="w-3 h-3 inline text-green-400" />}
                                  {message.sentiment.mood === 'neutral' && <span className="opacity-60">-</span>}
                                  {message.sentiment.mood === 'negative' && <span className="text-amber-400">!</span>}
                                  {message.sentiment.mood === 'concerned' && <span className="text-red-400 font-bold">!!</span>}
                                </span>
                              )}
                            </div>
                            {message.type === 'ai' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => speakMessage(message.id, message.content)}
                                disabled={isLoadingAudio && playingMessageId === message.id}
                                data-testid={`button-listen-${message.id}`}
                              >
                                {isLoadingAudio && playingMessageId === message.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                ) : playingMessageId === message.id ? (
                                  <Pause className="w-3 h-3 mr-1" />
                                ) : (
                                  <Volume2 className="w-3 h-3 mr-1" />
                                )}
                                {playingMessageId === message.id ? 'Stop' : 'Listen'}
                              </Button>
                            )}
                          </div>
                          {message.suggestions && message.suggestions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-medium opacity-80">Quick replies:</p>
                              <div className="flex flex-wrap gap-2">
                                {message.suggestions.map((suggestion, index) => (
                                  <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    className={`text-xs ${message.type === 'ai' ? 'hover-elevate' : ''}`}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    data-testid={`suggestion-${index}`}
                                  >
                                    {suggestion}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {message.type === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <Bot className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="bg-muted rounded-lg p-4 max-w-[80%]">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                            </div>
                            <span className="text-sm text-muted-foreground ml-2">LiLove is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="border-t p-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask me anything about your goals, performance, or strategy..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isTyping || isRecording || isTranscribing}
                      className="flex-1"
                      data-testid="input-chat-message"
                    />
                    <Button 
                      size="icon"
                      variant={isRecording ? "destructive" : "outline"}
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      disabled={isTyping || isTranscribing}
                      data-testid="button-voice-record"
                      className={isRecording ? "animate-pulse" : ""}
                    >
                      {isTranscribing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isRecording ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={isTyping || !inputMessage.trim() || isRecording || isTranscribing}
                      data-testid="button-send-message"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  {isRecording && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex gap-1">
                        <div className="w-1 h-3 bg-destructive rounded-full animate-pulse" style={{animationDelay: '0ms'}} />
                        <div className="w-1 h-4 bg-destructive rounded-full animate-pulse" style={{animationDelay: '100ms'}} />
                        <div className="w-1 h-5 bg-destructive rounded-full animate-pulse" style={{animationDelay: '200ms'}} />
                        <div className="w-1 h-4 bg-destructive rounded-full animate-pulse" style={{animationDelay: '300ms'}} />
                        <div className="w-1 h-3 bg-destructive rounded-full animate-pulse" style={{animationDelay: '400ms'}} />
                      </div>
                      <span>Recording... Click stop when finished</span>
                    </div>
                  )}
                  {isTranscribing && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transcribing your voice...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Sidebar */}
            <div className="space-y-4">
              <Card data-testid="section-quick-actions">
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start hover-elevate"
                      onClick={() => handleSuggestionClick(action.action)}
                      data-testid={`quick-action-${index}`}
                    >
                      <action.icon className="w-4 h-4 mr-2" />
                      {action.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Coach Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 mt-0.5 text-yellow-500" />
                    I learn from every conversation to give you better advice
                  </p>
                  <p className="flex items-start gap-2">
                    <Target className="w-4 h-4 mt-0.5 text-primary" />
                    Ask specific questions for actionable guidance
                  </p>
                  <p className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 mt-0.5 text-green-500" />
                    Check your performance tab regularly for insights
                  </p>
                  <p className="flex items-start gap-2">
                    <Zap className="w-4 h-4 mt-0.5 text-orange-500" />
                    I'm here 24/7 to support your journey
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Daily Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <Card data-testid="section-daily-insight">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Today's Personalized Insights
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchInsight()}
                  disabled={insightLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${insightLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {insightLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : dailyInsight ? (
                <>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      Key Insight
                    </h3>
                    <p className="text-sm">{dailyInsight?.insight}</p>
                  </div>

                  <div className="p-4 border rounded-lg bg-primary/5">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      Motivation Boost
                    </h3>
                    <p className="text-sm">{dailyInsight?.motivation}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Today's Focus
                    </h3>
                    <p className="text-sm">{dailyInsight?.focusArea}</p>
                  </div>

                  {dailyInsight?.challenge && (
                    <div className="p-4 border rounded-lg border-primary/50 bg-primary/5">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Daily Challenge
                      </h3>
                      <p className="text-sm">{dailyInsight?.challenge}</p>
                      <Button size="sm" className="mt-3" onClick={() => {
                        handleSuggestionClick(`I accept the challenge: ${dailyInsight?.challenge}`);
                        setActiveTab('chat');
                      }}>
                        Accept Challenge
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Unable to load insights. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card data-testid="section-performance">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Performance Analysis
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchPerformance()}
                  disabled={performanceLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${performanceLoading ? 'animate-spin' : ''}`} />
                  Analyze
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {performanceLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : performanceAnalysis ? (
                <>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-semibold mb-3">Overall Summary</h3>
                    <p className="text-sm text-muted-foreground">{performanceAnalysis?.summary}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-green-500" />
                        Your Strengths
                      </h3>
                      <ul className="space-y-2">
                        {performanceAnalysis?.strengths?.map((strength: string, index: number) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        Areas to Improve
                      </h3>
                      <ul className="space-y-2">
                        {performanceAnalysis?.improvements?.map((improvement: string, index: number) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg border-primary/50 bg-primary/5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-primary" />
                      Recommendations
                    </h3>
                    <div className="space-y-2">
                      {performanceAnalysis?.recommendations?.map((rec: string, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5">{index + 1}</Badge>
                          <p className="text-sm flex-1">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      Next Steps
                    </h3>
                    <div className="space-y-3">
                      {performanceAnalysis?.nextSteps?.map((step: string, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start hover-elevate"
                          onClick={() => {
                            handleSuggestionClick(`Help me with: ${step}`);
                            setActiveTab('chat');
                          }}
                        >
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center mr-3">
                            {index + 1}
                          </span>
                          {step}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Enhanced Pattern Analysis */}
                  {performanceAnalysis?.patterns && (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Completion Patterns */}
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-green-500" />
                            Task Completion Patterns
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Total Tasks:</span>
                              <span className="font-medium">{performanceAnalysis?.patterns?.completionPatterns?.totalTasks}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Completed:</span>
                              <span className="font-medium text-green-500">{performanceAnalysis?.patterns?.completionPatterns?.completedTasks}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Success Rate:</span>
                              <span className="font-medium">{performanceAnalysis?.patterns?.completionPatterns?.completionRate}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Avg Time/Task:</span>
                              <span className="font-medium">{performanceAnalysis?.patterns?.completionPatterns?.avgTimePerTask}min</span>
                            </div>
                          </div>
                        </div>

                        {/* Goal Achievement Probability */}
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            Goal Achievement Forecast
                          </h3>
                          <div className="text-center space-y-3">
                            <div className="text-3xl font-bold text-primary">
                              {performanceAnalysis?.patterns?.goalAchievementProbability}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Probability of achieving current goals
                            </div>
                            <div className={`text-sm font-medium ${
                              (performanceAnalysis?.patterns?.goalAchievementProbability || 0) > 70 ? 'text-green-500' :
                              (performanceAnalysis?.patterns?.goalAchievementProbability || 0) > 40 ? 'text-yellow-500' : 'text-red-500'
                            }`}>
                              {(performanceAnalysis?.patterns?.goalAchievementProbability || 0) > 70 ? 'Excellent trajectory!' :
                               (performanceAnalysis?.patterns?.goalAchievementProbability || 0) > 40 ? 'Good progress' : 'Needs attention'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottlenecks and Success Factors */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Bottlenecks */}
                        <div className="p-4 border rounded-lg border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-red-500" />
                            Current Bottlenecks
                          </h3>
                          {(performanceAnalysis?.patterns?.bottlenecks?.length || 0) > 0 ? (
                            <ul className="space-y-2">
                              {performanceAnalysis?.patterns?.bottlenecks?.map((bottleneck: string, index: number) => (
                                <li key={index} className="text-sm flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                  {bottleneck}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">No significant bottlenecks detected</p>
                          )}
                        </div>

                        {/* Success Factors */}
                        <div className="p-4 border rounded-lg border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Star className="w-4 h-4 text-green-500" />
                            Success Factors
                          </h3>
                          {(performanceAnalysis?.patterns?.successFactors?.length || 0) > 0 ? (
                            <ul className="space-y-2">
                              {performanceAnalysis?.patterns?.successFactors?.map((factor: string, index: number) => (
                                <li key={index} className="text-sm flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                  {factor}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">Building success patterns...</p>
                          )}
                        </div>
                      </div>

                      {/* Performance Trends */}
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          Performance Trends
                        </h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 border rounded">
                            <div className="text-lg font-bold">{performanceAnalysis?.patterns?.performanceTrends?.currentStreak}</div>
                            <div className="text-sm text-muted-foreground">Day Streak</div>
                          </div>
                          <div className="p-3 border rounded">
                            <div className="text-lg font-bold">{performanceAnalysis?.patterns?.timeEfficiency?.productiveHours}</div>
                            <div className="text-sm text-muted-foreground">Productive Hours</div>
                          </div>
                          <div className="p-3 border rounded">
                            <div className={`text-lg font-bold ${
                              performanceAnalysis?.patterns?.performanceTrends?.overallTrend === 'positive' ? 'text-green-500' :
                              performanceAnalysis?.patterns?.performanceTrends?.overallTrend === 'stable' ? 'text-yellow-500' : 'text-red-500'
                            }`}>
                              {performanceAnalysis?.patterns?.performanceTrends?.overallTrend === 'positive' ? '↗️' :
                               performanceAnalysis?.patterns?.performanceTrends?.overallTrend === 'stable' ? '→' : '↘️'}
                            </div>
                            <div className="text-sm text-muted-foreground">Overall Trend</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Click Analyze to get your personalized performance insights.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card data-testid="section-recommendations">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  Personalized Recommendations
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchRecommendations()}
                  disabled={recommendationsLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${recommendationsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {recommendationsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : recommendations ? (
                <>
                  {/* Goal Recommendations */}
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      New Goal Suggestions
                    </h3>
                    <div className="space-y-3">
                      {recommendations?.goalRecommendations?.map((goal: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg hover-elevate">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{goal.title}</h4>
                                <Badge variant={goal.priority === 'high' ? 'default' : 'outline'} className="text-xs">
                                  {goal.priority}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {goal.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{goal.description}</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                handleSuggestionClick(`Help me plan this goal: ${goal.title} - ${goal.description}`);
                                setActiveTab('chat');
                              }}
                            >
                              Explore
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Skill Development */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        Skill Development
                      </h3>
                      <ul className="space-y-2">
                        {recommendations?.skillDevelopment?.map((skill: string, index: number) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                            {skill}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Habit Suggestions */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        Habit Suggestions
                      </h3>
                      <ul className="space-y-2">
                        {recommendations?.habitSuggestions?.map((habit: string, index: number) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                            {habit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Time Optimization */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        Time Optimization
                      </h3>
                      <ul className="space-y-2">
                        {recommendations?.timeOptimization?.map((tip: string, index: number) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-orange-500 mt-1 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Resource Suggestions */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-purple-500" />
                        Recommended Resources
                      </h3>
                      <ul className="space-y-2">
                        {recommendations?.resourceSuggestions?.map((resource: string, index: number) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-purple-500 mt-1 flex-shrink-0" />
                            {resource}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Click Refresh to get your personalized recommendations.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversation History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card data-testid="section-history">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-500" />
                  Coaching History
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchHistory()}
                  disabled={historyLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${historyLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {historyLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : conversationHistory ? (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{conversationHistory?.totalConversations}</div>
                      <div className="text-sm text-muted-foreground">Total Conversations</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-500">{conversationHistory?.recentSessions?.length}</div>
                      <div className="text-sm text-muted-foreground">Recent Sessions</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-500">
                        {conversationHistory?.conversations?.reduce((sum: number, conv: any) => sum + conv.messageCount, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Messages</div>
                    </div>
                  </div>

                  {/* Recent Conversations */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Recent Conversations
                    </h3>
                    {(conversationHistory?.conversations?.length || 0) > 0 ? (
                      <div className="space-y-3">
                        {conversationHistory?.conversations?.map((conv: any) => (
                          <div key={conv.id} className="p-4 border rounded-lg hover-elevate">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium">{conv.title}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {conv.category}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {conv.messageCount} messages
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{conv.lastMessage}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>Last active: {new Date(conv.lastActiveAt).toLocaleDateString()}</span>
                                  <span>Created: {new Date(conv.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  handleSuggestionClick(`Continue our conversation about ${conv.category}`);
                                  setActiveTab('chat');
                                }}
                              >
                                Continue
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No conversations yet</p>
                    )}
                  </div>

                  {/* Recent Sessions */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Recent Coaching Sessions
                    </h3>
                    {(conversationHistory?.recentSessions?.length || 0) > 0 ? (
                      <div className="space-y-3">
                        {conversationHistory?.recentSessions?.map((session: any, index: number) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs capitalize">
                                {session.sessionType.replace('-', ' ')}
                              </Badge>
                              {session.confidence && (
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round(parseFloat(session.confidence) * 100)}% confidence
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(session.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm font-medium mb-1">{session.query}</p>
                            <p className="text-sm text-muted-foreground">{session.response}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No recent sessions</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Click Refresh to load your coaching history.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Safety Resources Footer */}
      <div className="mt-8 pt-6 border-t" data-testid="footer-safety-resources">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
          <Heart className="h-4 w-4 text-primary" />
          <span>If you're struggling, help is available.</span>
          <Link href="/safety-resources" className="text-primary hover:underline font-medium" data-testid="link-safety-resources-footer">
            Safety Resources
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}