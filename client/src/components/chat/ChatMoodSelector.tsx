import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, Moon, Waves, Sparkles, Heart, LucideIcon } from 'lucide-react';

export type ChatMood = 'motivated' | 'reflective' | 'stressed' | 'curious' | 'grateful';

interface MoodOption {
  id: ChatMood;
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

const moodOptions: MoodOption[] = [
  { 
    id: 'motivated', 
    label: 'Motivated', 
    icon: Zap, 
    color: 'from-orange-400 to-amber-500',
    description: 'Ready to take action'
  },
  { 
    id: 'reflective', 
    label: 'Reflective', 
    icon: Moon, 
    color: 'from-indigo-400 to-purple-500',
    description: 'Looking inward'
  },
  { 
    id: 'stressed', 
    label: 'Overwhelmed', 
    icon: Waves, 
    color: 'from-slate-400 to-slate-600',
    description: 'Need some calm'
  },
  { 
    id: 'curious', 
    label: 'Curious', 
    icon: Sparkles, 
    color: 'from-cyan-400 to-teal-500',
    description: 'Open to explore'
  },
  { 
    id: 'grateful', 
    label: 'Grateful', 
    icon: Heart, 
    color: 'from-rose-400 to-pink-500',
    description: 'Feeling blessed'
  },
];

interface ChatMoodSelectorProps {
  selectedMood: ChatMood | null;
  onMoodSelect: (mood: ChatMood) => void;
  className?: string;
}

export function ChatMoodSelector({ 
  selectedMood, 
  onMoodSelect, 
  className 
}: ChatMoodSelectorProps) {
  return (
    <motion.div 
      className={cn("space-y-4", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">How are you feeling today?</h3>
        <p className="text-sm text-muted-foreground">
          This helps me personalize our conversation
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {moodOptions.map((mood, index) => (
          <motion.button
            key={mood.id}
            onClick={() => onMoodSelect(mood.id)}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
              selectedMood === mood.id
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid={`button-mood-${mood.id}`}
          >
            <motion.div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                "bg-gradient-to-br text-white",
                mood.color
              )}
              animate={selectedMood === mood.id ? {
                scale: [1, 1.1, 1],
              } : {}}
              transition={{ duration: 0.5, repeat: selectedMood === mood.id ? Infinity : 0, repeatDelay: 2 }}
            >
              <mood.icon className="w-6 h-6" aria-label={mood.label} />
            </motion.div>
            
            <div className="text-center">
              <span className="text-sm font-medium block">{mood.label}</span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {mood.description}
              </span>
            </div>

            {selectedMood === mood.id && (
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-primary"
                layoutId="selectedMood"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export function getMoodPrompt(mood: ChatMood): string {
  const prompts: Record<ChatMood, string> = {
    motivated: "I'm feeling motivated and ready to make progress on my goals!",
    reflective: "I'm in a reflective mood and would like to explore my thoughts.",
    stressed: "I'm feeling a bit overwhelmed and could use some calming support.",
    curious: "I'm curious and open to exploring new ideas or perspectives.",
    grateful: "I'm feeling grateful and want to celebrate the good things in my life.",
  };
  return prompts[mood];
}

export default ChatMoodSelector;
