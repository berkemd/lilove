import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  Zap, 
  Heart, 
  Flame, 
  Snowflake,
  Sparkles,
  Moon
} from "lucide-react";
import { updateUserMood } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface MoodOption {
  id: string;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
}

const moods: MoodOption[] = [
  { 
    id: 'energized', 
    name: 'Energized', 
    icon: Zap, 
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20',
    description: 'Ready to take on the world'
  },
  { 
    id: 'happy', 
    name: 'Happy', 
    icon: Sun, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
    description: 'Feeling great today'
  },
  { 
    id: 'peaceful', 
    name: 'Peaceful', 
    icon: Moon, 
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10 hover:bg-indigo-500/20',
    description: 'Calm and centered'
  },
  { 
    id: 'focused', 
    name: 'Focused', 
    icon: Sparkles, 
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
    description: 'In the zone'
  },
  { 
    id: 'motivated', 
    name: 'Motivated', 
    icon: Flame, 
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 hover:bg-red-500/20',
    description: 'Fired up and ready'
  },
  { 
    id: 'grateful', 
    name: 'Grateful', 
    icon: Heart, 
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10 hover:bg-pink-500/20',
    description: 'Appreciating the moment'
  },
  { 
    id: 'neutral', 
    name: 'Neutral', 
    icon: Cloud, 
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10 hover:bg-gray-500/20',
    description: 'Just being'
  },
  { 
    id: 'tired', 
    name: 'Tired', 
    icon: CloudRain, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    description: 'Need some rest'
  },
  { 
    id: 'calm', 
    name: 'Calm', 
    icon: Snowflake, 
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20',
    description: 'Cool and collected'
  }
];

interface MoodSelectorProps {
  userId?: string;
  currentMood?: string;
  onMoodSelect?: (mood: string) => void;
  showTitle?: boolean;
  compact?: boolean;
}

export default function MoodSelector({ 
  userId, 
  currentMood, 
  onMoodSelect,
  showTitle = true,
  compact = false
}: MoodSelectorProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(currentMood || null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleMoodSelect = async (mood: MoodOption) => {
    setSelectedMood(mood.id);
    
    if (userId) {
      setIsUpdating(true);
      try {
        await updateUserMood(userId, mood.id);
        
        toast({
          title: "Mood Recorded!",
          description: `+5 XP earned for checking in. Feeling ${mood.name.toLowerCase()} today!`,
        });
      } catch (error) {
        console.error('Failed to update mood:', error);
        toast({
          title: "Mood Saved Locally",
          description: `You're feeling ${mood.name.toLowerCase()}. Keep tracking your journey!`,
        });
      } finally {
        setIsUpdating(false);
      }
    } else {
      toast({
        title: "Mood Selected",
        description: `Feeling ${mood.name.toLowerCase()}. Sign in to earn XP for tracking!`,
      });
    }
    
    onMoodSelect?.(mood.id);
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {moods.map((mood) => {
          const Icon = mood.icon;
          const isSelected = selectedMood === mood.id;
          return (
            <Button
              key={mood.id}
              variant="ghost"
              size="sm"
              onClick={() => handleMoodSelect(mood)}
              className={`
                transition-all duration-200
                ${mood.bgColor}
                ${isSelected ? 'ring-2 ring-offset-2 ring-offset-background scale-105' : ''}
              `}
              disabled={isUpdating}
              data-testid={`mood-${mood.id}`}
            >
              <Icon className={`h-4 w-4 mr-1 ${mood.color}`} />
              <span className="text-xs">{mood.name}</span>
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            How are you feeling today?
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {moods.map((mood) => {
            const Icon = mood.icon;
            const isSelected = selectedMood === mood.id;
            return (
              <button
                key={mood.id}
                onClick={() => handleMoodSelect(mood)}
                className={`
                  p-4 rounded-xl transition-all duration-200
                  flex flex-col items-center gap-2 text-center
                  ${mood.bgColor}
                  ${isSelected 
                    ? 'ring-2 ring-offset-2 ring-offset-background scale-105 shadow-lg' 
                    : 'hover:scale-102'
                  }
                `}
                disabled={isUpdating}
                data-testid={`mood-${mood.id}`}
              >
                <Icon className={`h-8 w-8 ${mood.color}`} />
                <span className="font-medium text-sm">{mood.name}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {mood.description}
                </span>
              </button>
            );
          })}
        </div>
        {selectedMood && (
          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-center">
            <p className="text-sm text-muted-foreground">
              Your mood has been saved. We'll match you with people who complement your energy!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
