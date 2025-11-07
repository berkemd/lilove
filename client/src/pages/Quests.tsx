import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Map,
  Swords,
  Trophy,
  Coins,
  Zap,
  Star,
  Target,
  CheckCircle2,
  Clock,
  Skull
} from 'lucide-react';

interface Quest {
  id: string;
  title: string;
  description: string;
  story?: string;
  difficulty: string;
  minLevel: number;
  xpReward: number;
  coinReward: number;
  status: string;
  progress: number;
  objectives: Array<{
    id: string;
    type: string;
    target: number;
    current?: number;
    description: string;
  }>;
  bossName?: string;
  bossHealth?: number;
  bossHealthRemaining?: number;
}

const difficultyColors: Record<string, string> = {
  easy: 'from-green-400 to-green-600',
  medium: 'from-blue-400 to-blue-600',
  hard: 'from-orange-400 to-orange-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-red-600'
};

const difficultyIcons: Record<string, any> = {
  easy: Star,
  medium: Target,
  hard: Swords,
  epic: Trophy,
  legendary: Skull
};

export default function Quests() {
  const { toast } = useToast();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingQuest, setStartingQuest] = useState<string | null>(null);

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      const response = await fetch('/api/quests', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setQuests(data);
      } else {
        // Mock data for demo
        setQuests([
          {
            id: '1',
            title: 'The Beginning',
            description: 'Start your journey by completing your first tasks',
            story: 'Every great hero starts somewhere. Your journey begins now!',
            difficulty: 'easy',
            minLevel: 1,
            xpReward: 200,
            coinReward: 100,
            status: 'available',
            progress: 0,
            objectives: [
              { id: '1', type: 'complete_tasks', target: 3, current: 0, description: 'Complete 3 tasks' }
            ]
          },
          {
            id: '2',
            title: 'Building Momentum',
            description: 'Keep the streak alive and earn experience',
            difficulty: 'medium',
            minLevel: 3,
            xpReward: 500,
            coinReward: 300,
            status: 'available',
            progress: 0,
            objectives: [
              { id: '1', type: 'earn_xp', target: 500, current: 0, description: 'Earn 500 XP' },
              { id: '2', type: 'complete_habits', target: 5, current: 0, description: 'Complete 5 habits' }
            ]
          },
          {
            id: '3',
            title: 'The Shadow Dragon',
            description: 'Defeat the mighty Shadow Dragon that guards ancient treasures',
            story: 'Legends speak of a dragon that hoards wisdom and power. Only the bravest can challenge it.',
            difficulty: 'epic',
            minLevel: 10,
            xpReward: 2000,
            coinReward: 1500,
            status: 'locked',
            progress: 0,
            bossName: 'Shadow Dragon',
            bossHealth: 1000,
            bossHealthRemaining: 1000,
            objectives: [
              { id: '1', type: 'defeat_boss', target: 1, current: 0, description: 'Defeat the Shadow Dragon' }
            ]
          },
          {
            id: '4',
            title: 'Master of Time',
            description: 'Prove your dedication through consistency',
            difficulty: 'hard',
            minLevel: 7,
            xpReward: 1200,
            coinReward: 800,
            status: 'available',
            progress: 0,
            objectives: [
              { id: '1', type: 'complete_tasks', target: 20, current: 5, description: 'Complete 20 tasks' },
              { id: '2', type: 'earn_xp', target: 1000, current: 300, description: 'Earn 1000 XP' }
            ]
          },
          {
            id: '5',
            title: 'Legend Reborn',
            description: 'Complete the ultimate challenge and become a legend',
            story: 'The path to greatness is paved with dedication. Are you ready to become legendary?',
            difficulty: 'legendary',
            minLevel: 20,
            xpReward: 10000,
            coinReward: 5000,
            status: 'locked',
            progress: 0,
            objectives: [
              { id: '1', type: 'complete_tasks', target: 100, current: 0, description: 'Complete 100 tasks' },
              { id: '2', type: 'earn_xp', target: 10000, current: 0, description: 'Earn 10,000 XP' }
            ]
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuest = async (questId: string) => {
    setStartingQuest(questId);
    try {
      const response = await fetch(`/api/quests/${questId}/start`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: '⚔️ Quest Started!',
          description: 'Good luck on your adventure!'
        });
        
        // Update quest status locally
        setQuests(quests.map(q => 
          q.id === questId ? { ...q, status: 'active' } : q
        ));
      } else {
        const data = await response.json();
        toast({
          variant: 'destructive',
          title: 'Cannot Start Quest',
          description: data.message || 'Failed to start quest'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to start quest. Please try again.'
      });
    } finally {
      setStartingQuest(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quests...</p>
        </div>
      </div>
    );
  }

  const activeQuests = quests.filter(q => q.status === 'active');
  const availableQuests = quests.filter(q => q.status === 'available');
  const completedQuests = quests.filter(q => q.status === 'completed');
  const lockedQuests = quests.filter(q => q.status === 'locked');

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          <Map className="inline-block mr-2 h-8 w-8 text-purple-600" />
          Quest Board
        </h1>
        <p className="text-muted-foreground">Embark on epic adventures and earn rewards</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-2">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{activeQuests.length}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border-2">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{completedQuests.length}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 border-2">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{availableQuests.length}</div>
            <div className="text-sm text-muted-foreground">Available</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Quests */}
      {activeQuests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Active Quests
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {activeQuests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} onStart={startQuest} isStarting={startingQuest === quest.id} />
            ))}
          </div>
        </div>
      )}

      {/* Available Quests */}
      {availableQuests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Target className="h-6 w-6" />
            Available Quests
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {availableQuests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} onStart={startQuest} isStarting={startingQuest === quest.id} />
            ))}
          </div>
        </div>
      )}

      {/* Locked Quests */}
      {lockedQuests.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 opacity-60">
            <Trophy className="h-6 w-6" />
            Locked Quests
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {lockedQuests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} onStart={startQuest} isStarting={startingQuest === quest.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest, onStart, isStarting }: { quest: Quest; onStart: (id: string) => void; isStarting: boolean }) {
  const DifficultyIcon = difficultyIcons[quest.difficulty] || Target;
  const isLocked = quest.status === 'locked';
  const isActive = quest.status === 'active';
  const isCompleted = quest.status === 'completed';

  const totalProgress = quest.objectives.reduce((sum, obj) => {
    const objProgress = ((obj.current || 0) / obj.target) * 100;
    return sum + objProgress;
  }, 0);
  const averageProgress = totalProgress / quest.objectives.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: isLocked ? 1 : 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className={`border-2 h-full ${isLocked ? 'opacity-60' : ''} ${isActive ? 'border-blue-500' : ''} ${isCompleted ? 'border-green-500' : ''}`}>
        <CardHeader>
          <div className="flex items-start justify-between mb-3">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${difficultyColors[quest.difficulty]} flex items-center justify-center`}>
              <DifficultyIcon className="h-7 w-7 text-white" />
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge 
                variant="secondary" 
                className={`bg-gradient-to-r ${difficultyColors[quest.difficulty]} text-white capitalize`}
              >
                {quest.difficulty}
              </Badge>
              {isActive && <Badge variant="default" className="bg-blue-600">Active</Badge>}
              {isCompleted && <Badge variant="default" className="bg-green-600">Completed</Badge>}
              {isLocked && <Badge variant="outline">Level {quest.minLevel}</Badge>}
            </div>
          </div>
          
          <CardTitle className="text-xl">{quest.title}</CardTitle>
          <CardDescription>{quest.description}</CardDescription>
          {quest.story && (
            <p className="text-sm italic text-muted-foreground mt-2">"{quest.story}"</p>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Objectives */}
            <div>
              <h4 className="font-semibold mb-2 text-sm">Objectives:</h4>
              <div className="space-y-2">
                {quest.objectives.map((obj) => (
                  <div key={obj.id} className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">{obj.description}</span>
                      <span className="font-semibold">{obj.current || 0} / {obj.target}</span>
                    </div>
                    <Progress value={((obj.current || 0) / obj.target) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Boss Health */}
            {quest.bossName && (
              <div>
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <Skull className="h-4 w-4 text-red-600" />
                  {quest.bossName}
                </h4>
                <div className="flex justify-between mb-1 text-sm">
                  <span className="text-muted-foreground">Boss Health</span>
                  <span className="font-semibold">{quest.bossHealthRemaining} / {quest.bossHealth}</span>
                </div>
                <Progress 
                  value={((quest.bossHealthRemaining || quest.bossHealth || 100) / (quest.bossHealth || 100)) * 100} 
                  className="h-3 bg-red-200"
                />
              </div>
            )}

            {/* Rewards */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-1 text-purple-600">
                <Zap className="h-4 w-4" />
                <span className="font-semibold">{quest.xpReward} XP</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-600">
                <Coins className="h-4 w-4" />
                <span className="font-semibold">{quest.coinReward} Coins</span>
              </div>
            </div>

            {/* Action Button */}
            {!isCompleted && !isActive && (
              <Button
                onClick={() => onStart(quest.id)}
                disabled={isLocked || isStarting}
                className={`w-full ${!isLocked ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : ''}`}
              >
                {isStarting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Starting...
                  </>
                ) : isLocked ? (
                  `Reach Level ${quest.minLevel}`
                ) : (
                  <>
                    <Swords className="mr-2 h-4 w-4" />
                    Start Quest
                  </>
                )}
              </Button>
            )}
            
            {isActive && (
              <div className="text-center">
                <Progress value={averageProgress} className="h-3 mb-2" />
                <p className="text-sm font-semibold text-blue-600">Quest In Progress ({Math.round(averageProgress)}%)</p>
              </div>
            )}

            {isCompleted && (
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <p className="text-sm font-semibold text-green-600">Quest Completed!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
