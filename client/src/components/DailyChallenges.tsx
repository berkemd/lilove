import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Clock, 
  CheckCircle2,
  Zap,
  Trophy,
  Flame,
  Gift,
  Star,
  Timer,
  Calendar,
  TrendingUp,
  Coins,
  Sparkles,
  RotateCw,
  Lock
} from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  challengeType: string;
  targetValue: number;
  xpReward: number;
  coinReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  progress: number;
  completed: boolean;
  claimedReward: boolean;
}

interface SpinWheelReward {
  id: string;
  rewardType: string;
  rewardValue: number;
  probability: string;
  rarity: string;
  displayName: string;
  iconName?: string;
}

// Spin wheel segments with colors
const WHEEL_COLORS = [
  'bg-gradient-to-br from-yellow-400 to-amber-500',
  'bg-gradient-to-br from-blue-400 to-blue-600',
  'bg-gradient-to-br from-purple-400 to-purple-600',
  'bg-gradient-to-br from-green-400 to-green-600',
  'bg-gradient-to-br from-pink-400 to-pink-600',
  'bg-gradient-to-br from-indigo-400 to-indigo-600',
  'bg-gradient-to-br from-red-400 to-red-600',
  'bg-gradient-to-br from-gray-400 to-gray-600',
];

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case 'easy': return 'text-green-500';
    case 'medium': return 'text-yellow-500';
    case 'hard': return 'text-red-500';
    default: return 'text-gray-500';
  }
}

function getDifficultyBadge(difficulty: string) {
  switch (difficulty) {
    case 'easy': return { variant: 'outline' as const, className: 'border-green-500 text-green-500' };
    case 'medium': return { variant: 'outline' as const, className: 'border-yellow-500 text-yellow-500' };
    case 'hard': return { variant: 'outline' as const, className: 'border-red-500 text-red-500' };
    default: return { variant: 'outline' as const };
  }
}

export default function DailyChallenges() {
  const { toast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [lastReward, setLastReward] = useState<SpinWheelReward | null>(null);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);

  // Fetch daily challenges
  const { data: challenges = [], isLoading: challengesLoading } = useQuery<Challenge[]>({
    queryKey: ['/api/gamification/challenges/daily'],
  });

  // Fetch spin wheel configuration
  const { data: wheelRewards = [] } = useQuery<SpinWheelReward[]>({
    queryKey: ['/api/gamification/spin-wheel/config'],
  });

  // Fetch user's streak info
  const { data: streakInfo } = useQuery({
    queryKey: ['/api/gamification/profile'],
    select: (data: any) => ({
      currentStreak: data?.currentStreak || 0,
      longestStreak: data?.longestStreak || 0,
    }),
  });

  // Claim daily login reward
  const claimLoginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/gamification/daily-login', {
        method: 'POST',
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/profile'] });
      if (data.rewardClaimed) {
        toast({
          title: `Day ${data.streakDays} Login Reward!`,
          description: `You've earned XP and coins for your ${data.streakDays}-day streak!`,
        });
      }
    },
  });

  // Update challenge progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ challengeId, increment }: { challengeId: string; increment: number }) => {
      const response = await apiRequest(`/api/gamification/challenges/${challengeId}/progress`, {
        method: 'POST',
        body: JSON.stringify({ increment }),
      });
      return await response.json();
    },
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/challenges/daily'] });
      if (data.completed && !data.claimedReward) {
        toast({
          title: '🎉 Challenge Completed!',
          description: 'You\'ve earned XP and coins!',
        });
      }
    },
  });

  // Spin the wheel
  const spinWheelMutation = useMutation<SpinWheelReward, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest('/api/gamification/spin-wheel', {
        method: 'POST',
      });
      return await response.json();
    },
    onSuccess: (reward: SpinWheelReward) => {
      // Calculate spin animation
      const baseRotation = 720 + Math.random() * 360;
      const segmentAngle = 360 / wheelRewards.length;
      const rewardIndex = wheelRewards.findIndex(r => r.id === reward.id);
      const targetRotation = baseRotation + (rewardIndex * segmentAngle);
      
      setSpinRotation(prev => prev + targetRotation);
      setLastReward(reward);
      
      setTimeout(() => {
        setIsSpinning(false);
        setShowRewardAnimation(true);
        toast({
          title: '🎊 Spin Reward!',
          description: `You won ${reward.displayName}!`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/gamification/profile'] });
      }, 3000);
    },
    onError: (error: any) => {
      setIsSpinning(false);
      toast({
        title: 'Spin Failed',
        description: error.message || 'Not enough coins or spins available',
        variant: 'destructive',
      });
    },
  });

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowRewardAnimation(false);
    spinWheelMutation.mutate();
  };

  // Auto-claim daily login on mount
  useEffect(() => {
    claimLoginMutation.mutate();
  }, []);

  // Calculate total progress
  const completedChallenges = challenges.filter(c => c.completed).length;
  const totalChallenges = challenges.length;
  const overallProgress = totalChallenges > 0 
    ? (completedChallenges / totalChallenges) * 100 
    : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Daily Challenges Card */}
      <Card className="col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Daily Challenges
          </CardTitle>
          <Badge variant="secondary">
            {completedChallenges}/{totalChallenges}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Challenges List */}
          {challengesLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading challenges...
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No challenges available today. Check back tomorrow!
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {challenges.map((challenge, index) => (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg border ${
                      challenge.completed 
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                        : 'bg-background'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{challenge.title}</h4>
                          <Badge {...getDifficultyBadge(challenge.difficulty)}>
                            {challenge.difficulty}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {challenge.description}
                        </p>
                      </div>
                      {challenge.completed && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <Progress 
                        value={(challenge.progress / challenge.targetValue) * 100} 
                        className="h-1.5"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {challenge.progress}/{challenge.targetValue}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs font-medium">{challenge.xpReward}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-yellow-600" />
                            <span className="text-xs font-medium">{challenge.coinReward}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Claim Button (for testing) */}
                    {!challenge.completed && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() => updateProgressMutation.mutate({ 
                          challengeId: challenge.id, 
                          increment: challenge.targetValue - challenge.progress 
                        })}
                      >
                        Complete Challenge
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewards & Spin Wheel Card */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Daily Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Streak Info */}
          <div className="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-950/30 dark:to-red-950/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-semibold">Login Streak</span>
              </div>
              <Badge variant="secondary" className="bg-orange-500 text-white">
                {streakInfo?.currentStreak || 0} Days
              </Badge>
            </div>
            <div className="grid grid-cols-7 gap-1 mt-3">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`h-8 rounded flex items-center justify-center text-xs font-medium ${
                    i < (streakInfo?.currentStreak || 0) % 7
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Login daily to earn increasing rewards!
            </p>
          </div>

          {/* Spin Wheel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <RotateCw className="w-4 h-4" />
                Lucky Spin Wheel
              </h3>
              <Badge variant="outline">
                1 Free Spin Daily
              </Badge>
            </div>

            {/* Wheel Container */}
            <div className="relative h-48 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="w-40 h-40 rounded-full shadow-xl relative overflow-hidden"
                  animate={{ rotate: spinRotation }}
                  transition={{ duration: 3, ease: "easeOut" }}
                >
                  {wheelRewards.map((reward, index) => {
                    const angle = (360 / wheelRewards.length) * index;
                    const nextAngle = (360 / wheelRewards.length) * (index + 1);
                    
                    return (
                      <div
                        key={reward.id}
                        className={`absolute inset-0 ${WHEEL_COLORS[index % WHEEL_COLORS.length]}`}
                        style={{
                          clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((angle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((angle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((nextAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((nextAngle - 90) * Math.PI / 180)}%)`,
                        }}
                      />
                    );
                  })}
                  <div className="absolute inset-4 bg-background rounded-full shadow-inner flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                </motion.div>

                {/* Pointer */}
                <div className="absolute top-2">
                  <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-primary" />
                </div>
              </div>
            </div>

            {/* Spin Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleSpin}
              disabled={isSpinning}
            >
              {isSpinning ? (
                <>
                  <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                  Spinning...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Spin the Wheel
                </>
              )}
            </Button>

            {/* Last Reward */}
            {showRewardAnimation && lastReward && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center p-4 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg"
              >
                <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="font-semibold">You Won!</p>
                <p className="text-lg font-bold text-primary">
                  {lastReward.displayName}
                </p>
              </motion.div>
            )}

            {/* Available Rewards */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Possible Rewards:</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {wheelRewards.slice(0, 6).map((reward) => (
                  <div
                    key={reward.id}
                    className="p-2 rounded border text-center"
                  >
                    <Star className={`w-4 h-4 mx-auto mb-1 ${
                      reward.rarity === 'epic' ? 'text-purple-500' :
                      reward.rarity === 'rare' ? 'text-blue-500' :
                      reward.rarity === 'uncommon' ? 'text-green-500' :
                      'text-gray-500'
                    }`} />
                    <p className="font-medium">{reward.displayName}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}