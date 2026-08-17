import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Minus, Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AIAvatar, type AvatarExpression } from './AIAvatar';
import { AIChatBubble, analyzeSentimentForDisplay, type SentimentType } from './AIChatBubble';
import { ChatMoodSelector, type ChatMood, getMoodPrompt } from './ChatMoodSelector';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  sentiment?: SentimentType;
  suggestions?: string[];
}

interface FloatingChatContainerProps {
  onSendMessage?: (message: string) => Promise<{ response: string; suggestions?: string[] }>;
  coachName?: string;
  className?: string;
}

export function FloatingChatContainer({
  onSendMessage,
  coachName = "Lila",
  className,
}: FloatingChatContainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMood, setSelectedMood] = useState<ChatMood | null>(null);
  const [avatarExpression, setAvatarExpression] = useState<AvatarExpression>('neutral');
  const [conversationMood, setConversationMood] = useState<SentimentType>('neutral');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleMoodSelect = async (mood: ChatMood) => {
    setSelectedMood(mood);
    const prompt = getMoodPrompt(mood);
    await handleSend(prompt);
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setAvatarExpression('thinking');

    try {
      if (onSendMessage) {
        const response = await onSendMessage(text);
        const sentiment = analyzeSentimentForDisplay(response.response);
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.response,
          isUser: false,
          timestamp: new Date(),
          sentiment,
          suggestions: response.suggestions,
        };

        setMessages(prev => [...prev, aiMessage]);
        setConversationMood(sentiment);
        
        if (sentiment === 'celebrating' || sentiment === 'positive') {
          setAvatarExpression('happy');
        } else if (sentiment === 'empathetic') {
          setAvatarExpression('empathetic');
        } else if (sentiment === 'calm') {
          setAvatarExpression('neutral');
        } else {
          setAvatarExpression('neutral');
        }
      } else {
        const mockResponse = getMockResponse(text);
        const sentiment = analyzeSentimentForDisplay(mockResponse.response);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: mockResponse.response,
          isUser: false,
          timestamp: new Date(),
          sentiment,
          suggestions: mockResponse.suggestions,
        };

        setMessages(prev => [...prev, aiMessage]);
        setConversationMood(sentiment);
        setAvatarExpression('happy');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setAvatarExpression('empathetic');
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const getMoodBackground = (): string => {
    switch (conversationMood) {
      case 'positive':
        return 'bg-gradient-to-b from-rose-50/50 to-transparent dark:from-rose-950/20';
      case 'calm':
        return 'bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20';
      case 'celebrating':
        return 'bg-gradient-to-b from-yellow-50/50 to-transparent dark:from-yellow-950/20';
      case 'empathetic':
        return 'bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-950/20';
      default:
        return '';
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              "fixed bottom-6 right-6 z-50",
              "w-14 h-14 rounded-full shadow-lg",
              "bg-primary text-primary-foreground",
              "flex items-center justify-center",
              className
            )}
            data-testid="button-open-chat"
          >
            <MessageCircle className="w-6 h-6" />
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : '600px'
            }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed bottom-6 right-6 z-50",
              "w-[380px] max-w-[calc(100vw-3rem)]",
              "bg-card border rounded-2xl shadow-2xl overflow-hidden",
              "flex flex-col"
            )}
            data-testid="floating-chat-container"
          >
            <motion.div 
              className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10"
              layout
            >
              <div className="flex items-center gap-3">
                <AIAvatar 
                  expression={avatarExpression} 
                  isTyping={isTyping}
                  size="sm" 
                />
                <div>
                  <h3 className="font-semibold text-sm">{coachName}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-muted-foreground">
                      {isTyping ? 'typing...' : 'online'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsMinimized(!isMinimized)}
                  data-testid="button-minimize-chat"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-close-chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {!isMinimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <ScrollArea 
                    ref={scrollRef} 
                    className={cn("flex-1 p-4", getMoodBackground())}
                  >
                    {messages.length === 0 && !selectedMood ? (
                      <ChatMoodSelector
                        selectedMood={selectedMood}
                        onMoodSelect={handleMoodSelect}
                      />
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message, index) => (
                          <AIChatBubble
                            key={message.id}
                            message={message.content}
                            isUser={message.isUser}
                            sentiment={message.sentiment}
                            suggestions={message.suggestions}
                            timestamp={message.timestamp}
                            animationDelay={index === messages.length - 1 ? 0 : 0}
                            showReactions={!message.isUser && index === messages.length - 1}
                            onSuggestionClick={(suggestion) => handleSend(suggestion)}
                          />
                        ))}
                        
                        {isTyping && (
                          <AIChatBubble
                            message=""
                            isUser={false}
                            isTyping={true}
                          />
                        )}
                      </div>
                    )}
                  </ScrollArea>

                  <div className="p-4 border-t bg-card">
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant={isRecording ? "destructive" : "ghost"}
                        onClick={toggleRecording}
                        disabled={isTyping}
                        data-testid="button-voice-record"
                      >
                        {isRecording ? (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <MicOff className="w-4 h-4" />
                          </motion.div>
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message..."
                        disabled={isTyping}
                        className="flex-1"
                        data-testid="input-chat-message"
                      />
                      
                      <Button
                        size="icon"
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim() || isTyping}
                        data-testid="button-send-message"
                      >
                        {isTyping ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function getMockResponse(message: string): { response: string; suggestions?: string[] } {
  const lowercaseMessage = message.toLowerCase();
  
  if (lowercaseMessage.includes('motivated') || lowercaseMessage.includes('action')) {
    return {
      response: "I love that energy! When we're motivated, we can move mountains. What's one specific goal you'd like to focus that energy on today? Sometimes channeling motivation into one clear target creates amazing results!",
      suggestions: ["Work on my top priority", "Start a new habit", "Review my goals"]
    };
  }
  
  if (lowercaseMessage.includes('overwhelmed') || lowercaseMessage.includes('stressed')) {
    return {
      response: "I hear you, and I want you to know it's completely okay to feel this way. Let's take a gentle breath together. Sometimes the path forward is just one small step. What feels like the most manageable thing you could do right now?",
      suggestions: ["Help me prioritize", "I need a break", "Let's simplify my day"]
    };
  }
  
  if (lowercaseMessage.includes('grateful') || lowercaseMessage.includes('blessed')) {
    return {
      response: "How wonderful! Gratitude is such a powerful state of being. Research shows it actually rewires our brain for more positivity. What are three specific things making you feel grateful right now? I'd love to celebrate them with you!",
      suggestions: ["Share what I'm grateful for", "Start a gratitude practice", "Celebrate a win"]
    };
  }
  
  return {
    response: "Thank you for sharing that with me. I'm here to support you on your journey. What would feel most helpful to explore together right now?",
    suggestions: ["Set a new goal", "Reflect on my progress", "Get some encouragement"]
  };
}

export default FloatingChatContainer;
