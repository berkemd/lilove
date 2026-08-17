import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Leaf,
  Play,
  Pause,
  Square,
  Clock,
  Wind,
  Moon,
  Brain,
  Heart,
  Sparkles,
  Sun,
  Target,
  BookOpen,
  Send,
  Timer,
  RotateCcw
} from "lucide-react";

interface Meditation {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: 'Stress Relief' | 'Sleep' | 'Focus' | 'Anxiety' | 'Self-Love';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  icon: typeof Leaf;
}

interface BreathingExercise {
  id: string;
  title: string;
  description: string;
  breatheIn: number;
  holdIn: number;
  breatheOut: number;
  holdOut: number;
}

interface JournalEntry {
  id: string;
  content: string;
  createdAt: Date;
}

const meditations: Meditation[] = [
  {
    id: '1',
    title: 'Morning Calm',
    description: 'Start your day with peace and clarity',
    duration: 5,
    category: 'Focus',
    difficulty: 'Beginner',
    icon: Sun
  },
  {
    id: '2',
    title: 'Stress Melter',
    description: 'Release tension and find your center',
    duration: 10,
    category: 'Stress Relief',
    difficulty: 'Beginner',
    icon: Leaf
  },
  {
    id: '3',
    title: 'Deep Sleep',
    description: 'Drift into peaceful slumber',
    duration: 15,
    category: 'Sleep',
    difficulty: 'Beginner',
    icon: Moon
  },
  {
    id: '4',
    title: 'Anxiety Relief',
    description: 'Calm your mind and ease worry',
    duration: 10,
    category: 'Anxiety',
    difficulty: 'Intermediate',
    icon: Heart
  },
  {
    id: '5',
    title: 'Self-Compassion',
    description: 'Embrace yourself with kindness',
    duration: 12,
    category: 'Self-Love',
    difficulty: 'Intermediate',
    icon: Sparkles
  },
  {
    id: '6',
    title: 'Laser Focus',
    description: 'Sharpen your concentration',
    duration: 8,
    category: 'Focus',
    difficulty: 'Intermediate',
    icon: Target
  },
  {
    id: '7',
    title: 'Evening Wind Down',
    description: 'Transition peacefully into rest',
    duration: 20,
    category: 'Sleep',
    difficulty: 'Beginner',
    icon: Moon
  },
  {
    id: '8',
    title: 'Inner Strength',
    description: 'Build resilience and confidence',
    duration: 15,
    category: 'Self-Love',
    difficulty: 'Advanced',
    icon: Sparkles
  },
  {
    id: '9',
    title: 'Quick Reset',
    description: 'A brief moment of calm',
    duration: 5,
    category: 'Stress Relief',
    difficulty: 'Beginner',
    icon: Leaf
  }
];

const breathingExercises: BreathingExercise[] = [
  {
    id: 'box',
    title: 'Box Breathing',
    description: 'Equal timing for calm and focus',
    breatheIn: 4,
    holdIn: 4,
    breatheOut: 4,
    holdOut: 4
  },
  {
    id: '478',
    title: '4-7-8 Relaxation',
    description: 'Natural tranquilizer for the nervous system',
    breatheIn: 4,
    holdIn: 7,
    breatheOut: 8,
    holdOut: 0
  },
  {
    id: 'deep',
    title: 'Deep Calm',
    description: 'Extended exhale for deep relaxation',
    breatheIn: 4,
    holdIn: 2,
    breatheOut: 6,
    holdOut: 2
  }
];

const categoryColors: Record<string, string> = {
  'Stress Relief': 'bg-green-500/10 text-green-600 dark:text-green-400',
  'Sleep': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  'Focus': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'Anxiety': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  'Self-Love': 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
};

const difficultyColors: Record<string, string> = {
  'Beginner': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'Intermediate': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'Advanced': 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
};

function MeditationPlayer({ meditation, onClose }: { meditation: Meditation; onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(meditation.duration * 60);
  const [progress, setProgress] = useState(0);

  const totalTime = meditation.duration * 60;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          setProgress(((totalTime - newTime) / totalTime) * 100);
          return newTime;
        });
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeRemaining, totalTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setIsPlaying(false);
    setTimeRemaining(totalTime);
    setProgress(0);
  };

  const Icon = meditation.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <motion.div
          animate={{
            scale: isPlaying ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 4,
            repeat: isPlaying ? Infinity : 0,
            ease: "easeInOut"
          }}
          className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Icon className="w-12 h-12 text-primary" />
        </motion.div>
        
        <div>
          <h3 className="text-xl font-semibold">{meditation.title}</h3>
          <p className="text-muted-foreground">{meditation.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={categoryColors[meditation.category]}>
            {meditation.category}
          </Badge>
          <Badge className={difficultyColors[meditation.difficulty]}>
            {meditation.difficulty}
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-mono font-bold" data-testid="text-meditation-timer">
            {formatTime(timeRemaining)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isPlaying ? 'Session in progress...' : timeRemaining === 0 ? 'Session complete!' : 'Ready to begin'}
          </p>
        </div>

        <Progress value={progress} className="h-2" data-testid="progress-meditation" />

        <div className="flex justify-center gap-3">
          <Button
            size="lg"
            onClick={() => setIsPlaying(!isPlaying)}
            data-testid={isPlaying ? "button-pause-meditation" : "button-play-meditation"}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                {timeRemaining === totalTime ? 'Start' : 'Resume'}
              </>
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleReset}
            data-testid="button-reset-meditation"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function BreathingAnimation({ exercise, isActive }: { exercise: BreathingExercise; isActive: boolean }) {
  const [phase, setPhase] = useState<'in' | 'holdIn' | 'out' | 'holdOut'>('in');
  const [countdown, setCountdown] = useState(exercise.breatheIn);
  const [sessionTime, setSessionTime] = useState(0);

  const getPhaseInstruction = () => {
    switch (phase) {
      case 'in': return 'Breathe In';
      case 'holdIn': return 'Hold';
      case 'out': return 'Breathe Out';
      case 'holdOut': return 'Hold';
    }
  };

  const getCircleScale = () => {
    switch (phase) {
      case 'in': return 1.5;
      case 'holdIn': return 1.5;
      case 'out': return 1;
      case 'holdOut': return 1;
    }
  };

  useEffect(() => {
    if (!isActive) {
      setPhase('in');
      setCountdown(exercise.breatheIn);
      setSessionTime(0);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev > 1) return prev - 1;
        
        setPhase(currentPhase => {
          switch (currentPhase) {
            case 'in':
              if (exercise.holdIn > 0) {
                setCountdown(exercise.holdIn);
                return 'holdIn';
              }
              setCountdown(exercise.breatheOut);
              return 'out';
            case 'holdIn':
              setCountdown(exercise.breatheOut);
              return 'out';
            case 'out':
              if (exercise.holdOut > 0) {
                setCountdown(exercise.holdOut);
                return 'holdOut';
              }
              setCountdown(exercise.breatheIn);
              return 'in';
            case 'holdOut':
              setCountdown(exercise.breatheIn);
              return 'in';
          }
        });
        return prev;
      });

      setSessionTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, exercise]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative w-48 h-48 flex items-center justify-center">
        <motion.div
          className="absolute w-32 h-32 rounded-full bg-primary/20"
          animate={{
            scale: isActive ? getCircleScale() : 1,
          }}
          transition={{
            duration: phase === 'in' ? exercise.breatheIn : 
                     phase === 'out' ? exercise.breatheOut : 0.3,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-24 h-24 rounded-full bg-primary/40"
          animate={{
            scale: isActive ? getCircleScale() : 1,
          }}
          transition={{
            duration: phase === 'in' ? exercise.breatheIn : 
                     phase === 'out' ? exercise.breatheOut : 0.3,
            ease: "easeInOut",
            delay: 0.1
          }}
        />
        <motion.div
          className="w-16 h-16 rounded-full bg-primary flex items-center justify-center"
          animate={{
            scale: isActive ? getCircleScale() * 0.8 : 1,
          }}
          transition={{
            duration: phase === 'in' ? exercise.breatheIn : 
                     phase === 'out' ? exercise.breatheOut : 0.3,
            ease: "easeInOut",
            delay: 0.2
          }}
        >
          <Wind className="w-8 h-8 text-primary-foreground" />
        </motion.div>
      </div>

      <div className="text-center space-y-2">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold"
          data-testid="text-breathing-instruction"
        >
          {isActive ? getPhaseInstruction() : 'Ready'}
        </motion.div>
        <div className="text-4xl font-mono font-bold text-primary" data-testid="text-breathing-countdown">
          {isActive ? countdown : '--'}
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Session Time</p>
        <p className="text-lg font-mono" data-testid="text-session-timer">{formatTime(sessionTime)}</p>
      </div>

      <div className="text-sm text-muted-foreground text-center max-w-xs">
        <p data-testid="text-breathing-guide">
          Breathe In ({exercise.breatheIn}s) 
          {exercise.holdIn > 0 && ` → Hold (${exercise.holdIn}s)`} 
          → Breathe Out ({exercise.breatheOut}s)
          {exercise.holdOut > 0 && ` → Hold (${exercise.holdOut}s)`}
        </p>
      </div>
    </div>
  );
}

export default function Wellness() {
  const [selectedTab, setSelectedTab] = useState("meditations");
  const [selectedMeditation, setSelectedMeditation] = useState<Meditation | null>(null);
  const [selectedBreathing, setSelectedBreathing] = useState<BreathingExercise | null>(null);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [journalEntry, setJournalEntry] = useState("");
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleSaveJournalEntry = () => {
    if (!journalEntry.trim()) {
      toast({
        title: "Empty Entry",
        description: "Please write something before saving.",
        variant: "destructive"
      });
      return;
    }

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      content: journalEntry,
      createdAt: new Date()
    };

    setJournalEntries(prev => [newEntry, ...prev].slice(0, 3));
    setJournalEntry("");
    toast({
      title: "Entry Saved",
      description: "Your reflection has been saved."
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-6" data-testid="page-wellness">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent" data-testid="text-wellness-title">
              Wellness Center
            </h1>
            <p className="text-muted-foreground">Find your calm, one breath at a time</p>
          </div>
        </div>
      </motion.div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3' : 'max-w-md mx-auto grid-cols-3'}`} data-testid="tabs-wellness">
          <TabsTrigger value="meditations" data-testid="tab-meditations">
            <Brain className="w-4 h-4 mr-2" />
            Meditations
          </TabsTrigger>
          <TabsTrigger value="breathing" data-testid="tab-breathing">
            <Wind className="w-4 h-4 mr-2" />
            Breathing
          </TabsTrigger>
          <TabsTrigger value="journal" data-testid="tab-journal">
            <BookOpen className="w-4 h-4 mr-2" />
            Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meditations" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meditations.map((meditation) => {
              const Icon = meditation.icon;
              return (
                <motion.div
                  key={meditation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: parseInt(meditation.id) * 0.05 }}
                >
                  <Card 
                    className="hover-elevate cursor-pointer h-full"
                    data-testid={`card-meditation-${meditation.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className={categoryColors[meditation.category]}>
                            {meditation.category}
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-2">{meditation.title}</CardTitle>
                      <CardDescription>{meditation.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {meditation.duration} min
                          </span>
                          <Badge variant="secondary" className={difficultyColors[meditation.difficulty]}>
                            {meditation.difficulty}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setSelectedMeditation(meditation)}
                          data-testid={`button-play-${meditation.id}`}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Play
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="breathing" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choose an Exercise</h3>
              {breathingExercises.map((exercise) => (
                <Card
                  key={exercise.id}
                  className={`cursor-pointer transition-all ${
                    selectedBreathing?.id === exercise.id 
                      ? 'ring-2 ring-primary' 
                      : 'hover-elevate'
                  }`}
                  onClick={() => {
                    setSelectedBreathing(exercise);
                    setIsBreathingActive(false);
                  }}
                  data-testid={`card-breathing-${exercise.id}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wind className="w-5 h-5 text-primary" />
                      {exercise.title}
                    </CardTitle>
                    <CardDescription>{exercise.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Timer className="w-4 h-4" />
                      <span>
                        {exercise.breatheIn}s in
                        {exercise.holdIn > 0 && ` → ${exercise.holdIn}s hold`}
                        → {exercise.breatheOut}s out
                        {exercise.holdOut > 0 && ` → ${exercise.holdOut}s hold`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="min-h-[400px]" data-testid="card-breathing-animation">
              <CardHeader>
                <CardTitle>
                  {selectedBreathing ? selectedBreathing.title : 'Select an Exercise'}
                </CardTitle>
                <CardDescription>
                  {selectedBreathing 
                    ? 'Follow the animation and breathe with the circle'
                    : 'Choose a breathing exercise to begin'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedBreathing ? (
                  <div className="space-y-6">
                    <BreathingAnimation 
                      exercise={selectedBreathing} 
                      isActive={isBreathingActive} 
                    />
                    <div className="flex justify-center gap-3">
                      <Button
                        size="lg"
                        onClick={() => setIsBreathingActive(!isBreathingActive)}
                        data-testid={isBreathingActive ? "button-stop-breathing" : "button-start-breathing"}
                      >
                        {isBreathingActive ? (
                          <>
                            <Square className="w-5 h-5 mr-2" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 mr-2" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Wind className="w-12 h-12 mb-4 opacity-50" />
                    <p>Select an exercise from the left to begin</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="journal" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-journal-entry">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Daily Reflection
                </CardTitle>
                <CardDescription>
                  Take a moment to reflect on your thoughts and feelings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="What's on your mind today? How are you feeling? What are you grateful for?"
                  className="min-h-[200px] resize-none"
                  value={journalEntry}
                  onChange={(e) => setJournalEntry(e.target.value)}
                  data-testid="input-journal-entry"
                />
                <Button 
                  onClick={handleSaveJournalEntry}
                  className="w-full"
                  data-testid="button-save-journal"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Save Entry
                </Button>
              </CardContent>
            </Card>

            <Card data-testid="card-recent-entries">
              <CardHeader>
                <CardTitle>Recent Entries</CardTitle>
                <CardDescription>Your last 3 reflections</CardDescription>
              </CardHeader>
              <CardContent>
                {journalEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                    <p>No entries yet</p>
                    <p className="text-sm">Start writing to see your reflections here</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {journalEntries.map((entry) => (
                        <Card 
                          key={entry.id} 
                          className="bg-muted/50"
                          data-testid={`card-entry-${entry.id}`}
                        >
                          <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              {formatDate(entry.createdAt)}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedMeditation} onOpenChange={() => setSelectedMeditation(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-meditation-player">
          <DialogHeader>
            <DialogTitle>Meditation Session</DialogTitle>
            <DialogDescription>
              Find a comfortable position and relax
            </DialogDescription>
          </DialogHeader>
          {selectedMeditation && (
            <MeditationPlayer 
              meditation={selectedMeditation} 
              onClose={() => setSelectedMeditation(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
