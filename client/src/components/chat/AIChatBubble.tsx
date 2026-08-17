import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ThumbsUp, Lightbulb, Heart, Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SentimentType = 'positive' | 'calm' | 'celebrating' | 'empathetic' | 'neutral';

interface Reaction {
  id: string;
  icon: 'helpful' | 'insightful' | 'encouraging' | 'brilliant';
  count: number;
  selected: boolean;
}

interface AIChatBubbleProps {
  message: string;
  isUser: boolean;
  sentiment?: SentimentType;
  suggestions?: string[];
  isTyping?: boolean;
  showReactions?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  onReaction?: (reaction: string) => void;
  timestamp?: Date;
  animationDelay?: number;
}

const sentimentGradients: Record<SentimentType, string> = {
  positive: 'from-rose-100/90 via-amber-50/80 to-orange-100/70 dark:from-rose-900/40 dark:via-amber-900/30 dark:to-orange-900/30',
  calm: 'from-blue-100/90 via-cyan-50/80 to-emerald-100/70 dark:from-blue-900/40 dark:via-cyan-900/30 dark:to-emerald-900/30',
  celebrating: 'from-yellow-100/90 via-amber-100/80 to-orange-100/70 dark:from-yellow-900/40 dark:via-amber-900/30 dark:to-orange-900/30',
  empathetic: 'from-purple-100/90 via-violet-50/80 to-fuchsia-100/70 dark:from-purple-900/40 dark:via-violet-900/30 dark:to-fuchsia-900/30',
  neutral: 'from-slate-100/90 via-gray-50/80 to-slate-100/70 dark:from-slate-800/40 dark:via-gray-800/30 dark:to-slate-800/30',
};

const sentimentBorders: Record<SentimentType, string> = {
  positive: 'border-rose-200/50 dark:border-rose-700/30',
  calm: 'border-blue-200/50 dark:border-blue-700/30',
  celebrating: 'border-yellow-300/60 dark:border-yellow-600/40',
  empathetic: 'border-purple-200/50 dark:border-purple-700/30',
  neutral: 'border-slate-200/50 dark:border-slate-600/30',
};

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <motion.div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.15 }}
          >
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-primary/80 to-primary"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/30"
              animate={{
                scale: [1, 2, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeOut",
              }}
            />
          </motion.div>
        ))}
      </motion.div>
      <motion.span
        className="text-sm text-muted-foreground ml-2 italic"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        contemplating...
      </motion.span>
    </div>
  );
}

function CelebrationSparkles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${15 + i * 15}%`,
            top: `${10 + (i % 3) * 25}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            y: [-5, -15, -25],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeOut",
          }}
        >
          <Sparkles className="w-3 h-3 text-yellow-400" />
        </motion.div>
      ))}
    </div>
  );
}

function ReactionButton({ 
  icon, 
  label, 
  selected, 
  onClick 
}: { 
  icon: 'helpful' | 'insightful' | 'encouraging' | 'brilliant';
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const icons = {
    helpful: ThumbsUp,
    insightful: Lightbulb,
    encouraging: Heart,
    brilliant: Star,
  };
  const Icon = icons[icon];

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors",
        selected 
          ? "bg-primary/20 text-primary border border-primary/30" 
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      data-testid={`button-reaction-${icon}`}
    >
      <Icon className="w-3 h-3" />
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}

export function AIChatBubble({
  message,
  isUser,
  sentiment = 'neutral',
  suggestions = [],
  isTyping = false,
  showReactions = true,
  onSuggestionClick,
  onReaction,
  timestamp,
  animationDelay = 0,
}: AIChatBubbleProps) {
  const [reactions, setReactions] = useState<Record<string, boolean>>({
    helpful: false,
    insightful: false,
    encouraging: false,
    brilliant: false,
  });

  const handleReaction = (type: string) => {
    setReactions(prev => ({ ...prev, [type]: !prev[type] }));
    onReaction?.(type);
  };

  if (isTyping) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex justify-start"
      >
        <div className={cn(
          "max-w-[85%] md:max-w-[75%] rounded-2xl rounded-bl-sm",
          "bg-gradient-to-br",
          sentimentGradients.neutral,
          "border",
          sentimentBorders.neutral,
          "shadow-sm"
        )}>
          <ThinkingIndicator />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: isUser ? 20 : -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay: animationDelay,
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div className="flex flex-col gap-2 max-w-[85%] md:max-w-[75%]">
        <div
          className={cn(
            "relative px-4 py-3 shadow-sm",
            isUser 
              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm" 
              : cn(
                  "bg-gradient-to-br rounded-2xl rounded-bl-sm border",
                  sentimentGradients[sentiment],
                  sentimentBorders[sentiment]
                )
          )}
          data-testid={isUser ? "chat-bubble-user" : "chat-bubble-ai"}
        >
          {!isUser && sentiment === 'celebrating' && <CelebrationSparkles />}
          
          <motion.p 
            className={cn(
              "text-sm md:text-base leading-relaxed whitespace-pre-wrap",
              !isUser && "text-foreground"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: animationDelay + 0.1, duration: 0.3 }}
          >
            {message}
          </motion.p>

          {timestamp && (
            <motion.span 
              className={cn(
                "block text-[10px] mt-2 opacity-60",
                isUser ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: animationDelay + 0.2 }}
            >
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </motion.span>
          )}
        </div>

        {!isUser && showReactions && (
          <motion.div 
            className="flex gap-1.5 flex-wrap pl-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animationDelay + 0.3 }}
          >
            <ReactionButton 
              icon="helpful" 
              label="Helpful" 
              selected={reactions.helpful}
              onClick={() => handleReaction('helpful')}
            />
            <ReactionButton 
              icon="insightful" 
              label="Insightful" 
              selected={reactions.insightful}
              onClick={() => handleReaction('insightful')}
            />
            <ReactionButton 
              icon="encouraging" 
              label="Encouraging" 
              selected={reactions.encouraging}
              onClick={() => handleReaction('encouraging')}
            />
            <ReactionButton 
              icon="brilliant" 
              label="Brilliant" 
              selected={reactions.brilliant}
              onClick={() => handleReaction('brilliant')}
            />
          </motion.div>
        )}

        <AnimatePresence>
          {!isUser && suggestions.length > 0 && (
            <motion.div 
              className="flex flex-wrap gap-2 mt-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ delay: animationDelay + 0.4 }}
            >
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  onClick={() => onSuggestionClick?.(suggestion)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs md:text-sm",
                    "bg-primary/10 text-primary border border-primary/20",
                    "hover:bg-primary/20 transition-colors"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: animationDelay + 0.4 + index * 0.1 }}
                  data-testid={`button-suggestion-${index}`}
                >
                  {suggestion}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function analyzeSentimentForDisplay(
  text: string,
  sentimentData?: { mood?: string; urgencyLevel?: string }
): SentimentType {
  const lowercaseText = text.toLowerCase();
  
  if (sentimentData?.mood) {
    switch (sentimentData.mood) {
      case 'positive': return 'positive';
      case 'concerned': return 'empathetic';
      case 'negative': return 'empathetic';
      default: break;
    }
  }

  const celebratingWords = ['congratulations', 'amazing', 'fantastic', 'incredible', 'proud', 'celebrate', 'achievement', 'accomplished', 'well done', 'bravo'];
  const positiveWords = ['great', 'good', 'wonderful', 'excellent', 'love', 'happy', 'excited', 'motivated', 'inspired', 'encouraged'];
  const calmWords = ['relax', 'calm', 'peace', 'breathe', 'mindful', 'gentle', 'patience', 'steady', 'balance', 'support'];
  const empatheticWords = ['understand', 'hear you', 'difficult', 'challenging', 'sorry', 'tough', 'struggle', 'here for you', 'compassion'];

  if (celebratingWords.some(word => lowercaseText.includes(word))) {
    return 'celebrating';
  }
  if (positiveWords.some(word => lowercaseText.includes(word))) {
    return 'positive';
  }
  if (calmWords.some(word => lowercaseText.includes(word))) {
    return 'calm';
  }
  if (empatheticWords.some(word => lowercaseText.includes(word))) {
    return 'empathetic';
  }

  return 'neutral';
}

export default AIChatBubble;
