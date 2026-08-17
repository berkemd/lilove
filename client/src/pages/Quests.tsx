import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sword, Trophy, Zap, Heart, CheckCircle2, Skull } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Quest {
  id: string;
  title: string;
  description: string;
  story: string;
  difficulty: string;
  minLevel: number;
  objectives: {
    id: string;
    type: string;
    target: number;
    description: string;
  }[];
  bossName?: string;
  bossHealth?: number;
  xpReward: number;
  coinReward: number;
  itemRewards: string[];
  isActive: boolean;
}

interface UserQuest {
  id: string;
  userId: string;
  questId: string;
  status: string;
  progress: Record<string, number>;
  bossHealthRemaining?: number;
  startedAt: string;
  completedAt?: string;
  quest: Quest;
}

export default function QuestsPage() {
  const { toast } = useToast();
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [selectedUserQuest, setSelectedUserQuest] = useState<UserQuest | null>(null);
  const [showQuestDetails, setShowQuestDetails] = useState(false);
  
  const { data: availableQuests = [], isLoading: loadingAvailable } = useQuery<Quest[]>({
    queryKey: ['/api/quests'],
  });
  
  const { data: activeQuests = [], isLoading: loadingActive } = useQuery<UserQuest[]>({
    queryKey: ['/api/quests/active'],
  });
  
  const startQuestMutation = useMutation({
    mutationFn: async (questId: string) => {
      return await apiRequest(`/api/quests/${questId}/start`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quests/active'] });
      toast({
        title: "Quest Started!",
        description: "Your new quest has begun. Good luck!",
      });
      setShowQuestDetails(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start quest",
        variant: "destructive",
      });
    },
  });
  
  const attackBossMutation = useMutation({
    mutationFn: async ({ questId, damage }: { questId: string; damage: number }) => {
      return await apiRequest(`/api/quests/${questId}/attack-boss`, {
        method: 'POST',
        body: JSON.stringify({ damage })
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/quests/active'] });
      if (data.defeated) {
        toast({
          title: "Boss Defeated!",
          description: "You have defeated the boss and completed the quest!",
        });
        setShowQuestDetails(false);
      } else {
        toast({
          title: "Attack Successful",
          description: `You dealt damage! Boss health: ${data.remaining}`,
        });
      }
    },
  });
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-orange-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  const calculateProgress = (userQuest: UserQuest) => {
    const objectives = userQuest.quest.objectives;
    const progress = userQuest.progress || {};
    
    const completed = objectives.filter(obj => (progress[obj.id] || 0) >= obj.target).length;
    return (completed / objectives.length) * 100;
  };
  
  const isQuestStarted = (questId: string) => {
    return activeQuests.some(uq => uq.questId === questId);
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-quests-title">Quests</h1>
        <p className="text-muted-foreground">Embark on epic adventures and earn rewards</p>
      </div>
      
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active" data-testid="tab-active-quests">
            Active Quests ({activeQuests.length})
          </TabsTrigger>
          <TabsTrigger value="available" data-testid="tab-available-quests">
            Available Quests ({availableQuests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {loadingActive ? (
            <div className="text-center py-12">Loading active quests...</div>
          ) : activeQuests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Quests</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start a new quest from the Available Quests tab!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeQuests.map((userQuest) => (
                <Card key={userQuest.id} className="hover-elevate cursor-pointer" data-testid={`card-active-quest-${userQuest.questId}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{userQuest.quest.title}</CardTitle>
                        <CardDescription>{userQuest.quest.description}</CardDescription>
                      </div>
                      <Badge className={getDifficultyColor(userQuest.quest.difficulty)}>
                        {userQuest.quest.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span data-testid={`text-quest-progress-${userQuest.questId}`}>
                          {Math.round(calculateProgress(userQuest))}%
                        </span>
                      </div>
                      <Progress value={calculateProgress(userQuest)} />
                    </div>
                    
                    {userQuest.quest.bossName && userQuest.bossHealthRemaining !== undefined && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="flex items-center gap-2">
                            <Skull className="w-4 h-4 text-red-500" />
                            {userQuest.quest.bossName}
                          </span>
                          <span data-testid={`text-boss-health-${userQuest.questId}`}>
                            {userQuest.bossHealthRemaining}/{userQuest.quest.bossHealth}
                          </span>
                        </div>
                        <Progress 
                          value={(userQuest.bossHealthRemaining / (userQuest.quest.bossHealth || 1)) * 100} 
                          className="bg-red-200"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span>{userQuest.quest.xpReward} XP</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span>{userQuest.quest.coinReward} Coins</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedUserQuest(userQuest);
                        setSelectedQuest(userQuest.quest);
                        setShowQuestDetails(true);
                      }}
                      data-testid={`button-view-quest-${userQuest.questId}`}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="available" className="space-y-4">
          {loadingAvailable ? (
            <div className="text-center py-12">Loading available quests...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableQuests.map((quest) => (
                <Card 
                  key={quest.id} 
                  className={`hover-elevate ${isQuestStarted(quest.id) ? 'opacity-50' : 'cursor-pointer'}`}
                  data-testid={`card-quest-${quest.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{quest.title}</CardTitle>
                        <CardDescription>{quest.description}</CardDescription>
                      </div>
                      <Badge className={getDifficultyColor(quest.difficulty)}>
                        {quest.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {quest.bossName && (
                      <div className="flex items-center gap-2 text-sm font-medium text-red-500">
                        <Skull className="w-4 h-4" />
                        Boss Quest: {quest.bossName}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span>{quest.xpReward} XP</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span>{quest.coinReward} Coins</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {quest.objectives.length} Objectives
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedQuest(quest);
                        setSelectedUserQuest(null);
                        setShowQuestDetails(true);
                      }}
                      disabled={isQuestStarted(quest.id)}
                      data-testid={`button-start-quest-${quest.id}`}
                    >
                      {isQuestStarted(quest.id) ? 'Already Started' : 'View Quest'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <Dialog open={showQuestDetails} onOpenChange={setShowQuestDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedQuest && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl">{selectedQuest.title}</DialogTitle>
                    <DialogDescription className="text-base mt-2">
                      {selectedQuest.description}
                    </DialogDescription>
                  </div>
                  <Badge className={getDifficultyColor(selectedQuest.difficulty)}>
                    {selectedQuest.difficulty}
                  </Badge>
                </div>
              </DialogHeader>
              
              <div className="space-y-6">
                {selectedQuest.story && (
                  <div>
                    <h3 className="font-semibold mb-2">Story</h3>
                    <p className="text-sm text-muted-foreground">{selectedQuest.story}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold mb-3">Objectives</h3>
                  <div className="space-y-2">
                    {selectedQuest.objectives.map((objective) => {
                      const isCompleted = selectedUserQuest 
                        ? (selectedUserQuest.progress[objective.id] || 0) >= objective.target
                        : false;
                      const currentProgress = selectedUserQuest?.progress[objective.id] || 0;
                      
                      return (
                        <div 
                          key={objective.id} 
                          className={`flex items-start gap-3 p-3 rounded-lg border ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-background'}`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{objective.description}</p>
                            {selectedUserQuest && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Progress: {currentProgress}/{objective.target}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {selectedQuest.bossName && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Skull className="w-5 h-5 text-red-500" />
                        Boss Battle: {selectedQuest.bossName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedUserQuest && selectedUserQuest.bossHealthRemaining !== undefined ? (
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span>Boss Health</span>
                              <span data-testid="text-boss-health-modal">
                                {selectedUserQuest.bossHealthRemaining}/{selectedQuest.bossHealth}
                              </span>
                            </div>
                            <Progress 
                              value={(selectedUserQuest.bossHealthRemaining / (selectedQuest.bossHealth || 1)) * 100} 
                              className="bg-red-200"
                            />
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => attackBossMutation.mutate({ 
                              questId: selectedQuest.id, 
                              damage: 10 
                            })}
                            disabled={attackBossMutation.isPending || selectedUserQuest.bossHealthRemaining === 0}
                            data-testid="button-attack-boss"
                          >
                            <Sword className="w-4 h-4 mr-2" />
                            {attackBossMutation.isPending ? 'Attacking...' : 'Attack Boss (10 DMG)'}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Boss Health: {selectedQuest.bossHealth}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                <div>
                  <h3 className="font-semibold mb-3">Rewards</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <Zap className="w-8 h-8 text-yellow-500" />
                          <div>
                            <p className="text-2xl font-bold">{selectedQuest.xpReward}</p>
                            <p className="text-sm text-muted-foreground">Experience Points</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-8 h-8 text-amber-500" />
                          <div>
                            <p className="text-2xl font-bold">{selectedQuest.coinReward}</p>
                            <p className="text-sm text-muted-foreground">Coins</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                {!selectedUserQuest ? (
                  <Button
                    className="w-full"
                    onClick={() => startQuestMutation.mutate(selectedQuest.id)}
                    disabled={startQuestMutation.isPending || isQuestStarted(selectedQuest.id)}
                    data-testid="button-start-quest-modal"
                  >
                    {startQuestMutation.isPending ? 'Starting Quest...' : 'Start Quest'}
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => setShowQuestDetails(false)}>
                    Close
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
