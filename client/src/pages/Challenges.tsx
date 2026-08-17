import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Users, 
  Target, 
  Plus, 
  Crown, 
  Zap,
  Timer,
  Calendar,
  Award,
  Flame,
  Clock,
  Lock,
  Globe,
  Play,
  CheckCircle,
  Medal,
  Coins,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Zap as Lightning,
  Filter,
  SortDesc,
  AlertCircle,
  Rocket,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface Challenge {
  id: string;
  title: string;
  description?: string;
  challengeType: 'xp_gain' | 'tasks_completed' | 'streak_length' | 'team_xp' | 'custom';
  visibility: 'public' | 'private' | 'friends_only';
  entryFee?: number;
  prizePool: number;
  prizeDistribution: any;
  maxParticipants?: number;
  participantCount?: number;
  minLevel?: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
  creatorId: string;
  createdAt: string;
}

interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId?: string;
  teamId?: string;
  score: number;
  rank?: number;
  lastUpdateAt: string;
  joinedAt: string;
  user?: {
    id: string;
    displayName?: string;
    username?: string;
    profileImageUrl?: string;
  };
  team?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

interface LeaderboardEntry {
  participant: ChallengeParticipant;
  previousRank?: number;
  prizeAmount?: number;
  user?: any;
  team?: any;
}

interface CompletedChallengeResult {
  id: string;
  challengeId: string;
  title: string;
  rank: number;
  totalParticipants: number;
  prizeWon: number;
  completedAt: string;
}

const createChallengeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  challengeType: z.enum(['xp_gain', 'tasks_completed', 'streak_length', 'team_xp', 'custom']),
  visibility: z.enum(['public', 'private', 'friends_only']),
  entryFee: z.coerce.number().min(0).optional(),
  maxParticipants: z.coerce.number().min(2).max(1000).optional(),
  minLevel: z.coerce.number().min(1).optional(),
  duration: z.enum(['1_day', '3_days', '1_week', '2_weeks', '1_month']),
  prizeType: z.enum(['coins', 'xp', 'premium', 'mixed']),
  prizeAmount: z.coerce.number().min(0)
});

function getChallengeIcon(type: string) {
  switch (type) {
    case 'xp_gain': return Zap;
    case 'tasks_completed': return Target;
    case 'streak_length': return Flame;
    case 'team_xp': return Users;
    default: return Trophy;
  }
}

function getChallengeTypeLabel(type: string): string {
  switch (type) {
    case 'xp_gain': return 'XP Race';
    case 'tasks_completed': return 'Task Master';
    case 'streak_length': return 'Streak Champion';
    case 'team_xp': return 'Team Battle';
    case 'custom': return 'Custom Challenge';
    default: return type;
  }
}

function getChallengeTypeDescription(type: string): string {
  switch (type) {
    case 'xp_gain': return 'Earn the most XP during the challenge period';
    case 'tasks_completed': return 'Complete the most tasks to win';
    case 'streak_length': return 'Maintain the longest daily streak';
    case 'team_xp': return 'Team up to earn collective XP';
    case 'custom': return 'Custom rules set by the creator';
    default: return '';
  }
}

function getTimeRemaining(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  
  const days = differenceInDays(end, now);
  const hours = differenceInHours(end, now) % 24;
  const minutes = differenceInMinutes(end, now) % 60;
  
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  if (minutes > 0) return `${minutes}m remaining`;
  return 'Ending soon';
}

function getRankChange(current?: number, previous?: number) {
  if (!current || !previous) return null;
  const change = previous - current;
  if (change > 0) return { direction: 'up', value: change };
  if (change < 0) return { direction: 'down', value: Math.abs(change) };
  return { direction: 'same', value: 0 };
}

function getPrizeForRank(rank: number, prizePool: number) {
  if (rank === 1) return Math.floor(prizePool * 0.5);
  if (rank === 2) return Math.floor(prizePool * 0.3);
  if (rank === 3) return Math.floor(prizePool * 0.2);
  return 0;
}

function ChallengeCardSkeleton() {
  return (
    <Card data-testid="skeleton-challenge-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-6 w-20 ml-auto" />
            <Skeleton className="h-5 w-16 ml-auto" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

function LeaderboardSkeleton() {
  return (
    <Card className="h-fit" data-testid="skeleton-leaderboard">
      <CardHeader>
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState({ 
  title, 
  description, 
  onRetry, 
  isRetrying 
}: { 
  title: string; 
  description: string; 
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  return (
    <Card className="p-8" data-testid="error-state">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 bg-destructive/10 rounded-full">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold" data-testid="text-error-title">{title}</h3>
          <p className="text-muted-foreground max-w-sm" data-testid="text-error-description">{description}</p>
        </div>
        <Button 
          onClick={onRetry} 
          disabled={isRetrying}
          data-testid="button-retry"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function EmptyActiveChallenges({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <Card className="p-12" data-testid="empty-active-challenges">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="relative">
          <div className="p-6 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full">
            <Trophy className="h-16 w-16 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 p-2 bg-yellow-500/20 rounded-full animate-bounce">
            <Sparkles className="h-5 w-5 text-yellow-500" />
          </div>
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-2xl font-bold" data-testid="text-empty-title">No Active Challenges Yet</h3>
          <p className="text-muted-foreground text-lg">
            Be the trailblazer! Create the first challenge and invite others to compete for glory and prizes.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button size="lg" onClick={onCreateClick} data-testid="button-create-first-challenge">
            <Plus className="mr-2 h-5 w-5" />
            Create a Challenge
          </Button>
          <Button size="lg" variant="outline" onClick={onCreateClick} data-testid="button-browse-templates">
            <Rocket className="mr-2 h-5 w-5" />
            Quick Start
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EmptyUpcomingChallenges({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <Card className="p-12" data-testid="empty-upcoming-challenges">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full">
          <Calendar className="h-12 w-12 text-blue-500" />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-bold" data-testid="text-empty-upcoming-title">No Upcoming Challenges</h3>
          <p className="text-muted-foreground">
            Schedule a future challenge to keep the excitement going. Plan ahead and give participants time to prepare!
          </p>
        </div>
        <Button onClick={onCreateClick} data-testid="button-schedule-challenge">
          <Calendar className="mr-2 h-4 w-4" />
          Schedule a Challenge
        </Button>
      </div>
    </Card>
  );
}

function EmptyCompletedChallenges() {
  return (
    <Card className="p-12" data-testid="empty-completed-challenges">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full">
          <Award className="h-12 w-12 text-green-500" />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-bold" data-testid="text-empty-completed-title">No Challenge History</h3>
          <p className="text-muted-foreground">
            Your victories will be displayed here. Join an active challenge to start building your legacy!
          </p>
        </div>
        <Button variant="outline" data-testid="button-view-active-challenges">
          <Play className="mr-2 h-4 w-4" />
          View Active Challenges
        </Button>
      </div>
    </Card>
  );
}

function LiveTickerContent({ challenges }: { challenges: Challenge[] }) {
  if (!challenges || challenges.length === 0) return null;
  
  const topChallenges = challenges.slice(0, 3);
  
  return (
    <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10" data-testid="live-ticker">
      <CardContent className="p-4">
        <div className="flex items-center gap-4 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <Lightning className="h-5 w-5 text-yellow-500" />
            <span className="font-bold">LIVE NOW:</span>
          </div>
          <div className="flex gap-6">
            {topChallenges.map((c) => {
              const Icon = getChallengeIcon(c.challengeType);
              return (
                <div key={c.id} className="flex items-center gap-2 shrink-0" data-testid={`ticker-item-${c.id}`}>
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    "{c.title}" - {c.participantCount || 0} competing for {c.prizePool.toLocaleString()} coins!
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Challenges() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [createChallengeOpen, setCreateChallengeOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'prize' | 'participants' | 'ending'>('ending');
  const [showOnlyJoined, setShowOnlyJoined] = useState(false);

  const { 
    data: activeChallenges, 
    isLoading: activeChallengesLoading,
    error: activeChallengesError,
    refetch: refetchActiveChallenges,
    isRefetching: isRefetchingActive
  } = useQuery<Challenge[]>({
    queryKey: ['/api/challenges/active']
  });

  const { 
    data: upcomingChallenges,
    isLoading: upcomingChallengesLoading,
    error: upcomingChallengesError,
    refetch: refetchUpcomingChallenges,
    isRefetching: isRefetchingUpcoming
  } = useQuery<Challenge[]>({
    queryKey: ['/api/challenges/upcoming']
  });

  const {
    data: completedChallenges,
    isLoading: completedChallengesLoading,
    error: completedChallengesError,
    refetch: refetchCompletedChallenges,
    isRefetching: isRefetchingCompleted
  } = useQuery<CompletedChallengeResult[]>({
    queryKey: ['/api/challenges/completed'],
    enabled: !!user
  });

  const { 
    data: challengeDetails,
    isLoading: challengeDetailsLoading 
  } = useQuery<{ challenge: Challenge; leaderboard: LeaderboardEntry[] }>({
    queryKey: ['/api/challenges', selectedChallenge],
    enabled: !!selectedChallenge
  });

  const { data: myParticipation } = useQuery<ChallengeParticipant[]>({
    queryKey: ['/api/challenges/my-participation'],
    enabled: !!user
  });

  const createChallengeMutation = useMutation({
    mutationFn: (data: z.infer<typeof createChallengeSchema>) => {
      const startDate = new Date();
      const endDate = new Date();
      switch (data.duration) {
        case '1_day': endDate.setDate(endDate.getDate() + 1); break;
        case '3_days': endDate.setDate(endDate.getDate() + 3); break;
        case '1_week': endDate.setDate(endDate.getDate() + 7); break;
        case '2_weeks': endDate.setDate(endDate.getDate() + 14); break;
        case '1_month': endDate.setMonth(endDate.getMonth() + 1); break;
      }
      
      const payload = {
        title: data.title,
        description: data.description,
        challengeType: data.challengeType,
        visibility: data.visibility,
        entryFee: data.entryFee,
        maxParticipants: data.maxParticipants,
        minLevel: data.minLevel,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        prizePool: data.prizeAmount,
        prizeDistribution: {
          type: data.prizeType,
          amount: data.prizeAmount
        }
      };
      
      return apiRequest('/api/challenges', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/upcoming'] });
      createChallengeForm.reset();
      setCreateChallengeOpen(false);
      toast({
        title: "Challenge Created!",
        description: "Your challenge is now live. Good luck!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create challenge",
        variant: "destructive",
      });
    }
  });

  const joinChallengeMutation = useMutation({
    mutationFn: ({ challengeId, teamId }: { challengeId: string; teamId?: string }) => 
      apiRequest(`/api/challenges/${challengeId}/join`, {
        method: 'POST',
        body: JSON.stringify({ teamId })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      toast({
        title: "Joined Challenge!",
        description: "You're now competing. Give it your best!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join challenge",
        variant: "destructive",
      });
    }
  });

  const createChallengeForm = useForm<z.infer<typeof createChallengeSchema>>({
    resolver: zodResolver(createChallengeSchema),
    defaultValues: {
      title: '',
      description: '',
      challengeType: 'xp_gain',
      visibility: 'public',
      entryFee: 0,
      duration: '1_week',
      prizeType: 'coins',
      prizeAmount: 1000
    }
  });

  const handleCreateChallenge = (data: z.infer<typeof createChallengeSchema>) => {
    createChallengeMutation.mutate(data);
  };

  const challenge = challengeDetails?.challenge;
  const leaderboard = challengeDetails?.leaderboard || [];
  
  const filteredActiveChallenges = (Array.isArray(activeChallenges) ? activeChallenges : []).filter((c: Challenge) => {
    if (filterType !== 'all' && c.challengeType !== filterType) return false;
    if (showOnlyJoined && !myParticipation?.some((p: any) => p.challengeId === c.id)) return false;
    return true;
  }).sort((a: Challenge, b: Challenge) => {
    switch (sortBy) {
      case 'prize': return b.prizePool - a.prizePool;
      case 'participants': return (b.participantCount || 0) - (a.participantCount || 0);
      case 'ending': return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      default: return 0;
    }
  });

  return (
    <div className="p-6 space-y-8" data-testid="page-challenges">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent" data-testid="text-page-title">
            Challenges & Competitions
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-page-subtitle">
            Compete, win prizes, and prove you're the best!
          </p>
        </div>
        
        <Dialog open={createChallengeOpen} onOpenChange={setCreateChallengeOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-create-challenge">
              <Plus className="mr-2 h-4 w-4" />
              Create Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create a New Challenge</DialogTitle>
              <DialogDescription>
                Set up a competition and invite others to compete
              </DialogDescription>
            </DialogHeader>
            <Form {...createChallengeForm}>
              <form onSubmit={createChallengeForm.handleSubmit(handleCreateChallenge)} className="space-y-4">
                <FormField
                  control={createChallengeForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Challenge Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Epic XP Battle" {...field} data-testid="input-challenge-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createChallengeForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your challenge and rules..." 
                          {...field} 
                          data-testid="textarea-challenge-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createChallengeForm.control}
                    name="challengeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Challenge Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-challenge-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="xp_gain">XP Race</SelectItem>
                            <SelectItem value="tasks_completed">Task Master</SelectItem>
                            <SelectItem value="streak_length">Streak Champion</SelectItem>
                            <SelectItem value="team_xp">Team Battle</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createChallengeForm.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-visibility">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="friends_only">Friends Only</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createChallengeForm.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-duration">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1_day">1 Day</SelectItem>
                            <SelectItem value="3_days">3 Days</SelectItem>
                            <SelectItem value="1_week">1 Week</SelectItem>
                            <SelectItem value="2_weeks">2 Weeks</SelectItem>
                            <SelectItem value="1_month">1 Month</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createChallengeForm.control}
                    name="entryFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entry Fee (Coins)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-entry-fee"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Prize Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createChallengeForm.control}
                      name="prizeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prize Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-prize-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="coins">Coins</SelectItem>
                              <SelectItem value="xp">XP Points</SelectItem>
                              <SelectItem value="premium">Premium Time</SelectItem>
                              <SelectItem value="mixed">Mixed Rewards</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createChallengeForm.control}
                      name="prizeAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prize Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1000" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-prize-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createChallengeMutation.isPending}
                    data-testid="button-submit-create-challenge"
                  >
                    {createChallengeMutation.isPending ? "Creating..." : "Create Challenge"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {activeChallenges && activeChallenges.length > 0 && (
        <LiveTickerContent challenges={activeChallenges} />
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]" data-testid="select-filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="xp_gain">XP Race</SelectItem>
              <SelectItem value="tasks_completed">Task Master</SelectItem>
              <SelectItem value="streak_length">Streak</SelectItem>
              <SelectItem value="team_xp">Team Battle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <SortDesc className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[150px]" data-testid="select-sort-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ending">Ending Soon</SelectItem>
              <SelectItem value="prize">Highest Prize</SelectItem>
              <SelectItem value="participants">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            checked={showOnlyJoined}
            onCheckedChange={setShowOnlyJoined}
            data-testid="switch-show-joined"
          />
          <Label className="cursor-pointer" data-testid="label-my-challenges">My Challenges</Label>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="active" data-testid="tab-active">
            <Play className="mr-2 h-4 w-4" />
            Active
          </TabsTrigger>
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">
            <Calendar className="mr-2 h-4 w-4" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            <CheckCircle className="mr-2 h-4 w-4" />
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {activeChallengesError ? (
            <ErrorState
              title="Unable to Load Challenges"
              description="We couldn't fetch active challenges. Please check your connection and try again."
              onRetry={() => refetchActiveChallenges()}
              isRetrying={isRefetchingActive}
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {activeChallengesLoading ? (
                  <>
                    <ChallengeCardSkeleton />
                    <ChallengeCardSkeleton />
                    <ChallengeCardSkeleton />
                  </>
                ) : filteredActiveChallenges?.length === 0 ? (
                  <EmptyActiveChallenges onCreateClick={() => setCreateChallengeOpen(true)} />
                ) : (
                  filteredActiveChallenges?.map((challengeItem: Challenge) => {
                    const Icon = getChallengeIcon(challengeItem.challengeType);
                    const isJoined = myParticipation?.some((p: any) => p.challengeId === challengeItem.id);
                    const participantCount = challengeItem.participantCount || 0;
                    const maxParticipants = challengeItem.maxParticipants || 100;
                    const progressValue = Math.min((participantCount / maxParticipants) * 100, 100);
                    
                    return (
                      <Card 
                        key={challengeItem.id}
                        className={`cursor-pointer transition-all hover-elevate ${
                          selectedChallenge === challengeItem.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedChallenge(challengeItem.id)}
                        data-testid={`challenge-card-${challengeItem.id}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="p-1.5 bg-primary/10 rounded">
                                  <Icon className="h-4 w-4 text-primary" />
                                </div>
                                <CardTitle className="text-lg truncate" data-testid={`text-challenge-title-${challengeItem.id}`}>
                                  {challengeItem.title}
                                </CardTitle>
                                {isJoined && (
                                  <Badge variant="secondary" data-testid={`badge-joined-${challengeItem.id}`}>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Joined
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="line-clamp-2" data-testid={`text-challenge-description-${challengeItem.id}`}>
                                {challengeItem.description || getChallengeTypeDescription(challengeItem.challengeType)}
                              </CardDescription>
                            </div>
                            
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-1 justify-end mb-1">
                                <Coins className="h-4 w-4 text-yellow-500" />
                                <span className="text-lg font-bold" data-testid={`text-prize-pool-${challengeItem.id}`}>
                                  {challengeItem.prizePool.toLocaleString()}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs" data-testid={`badge-type-${challengeItem.id}`}>
                                {getChallengeTypeLabel(challengeItem.challengeType)}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5" data-testid={`text-participants-${challengeItem.id}`}>
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">{participantCount}</span>
                                <span className="text-muted-foreground">/ {challengeItem.maxParticipants || '∞'}</span>
                              </div>
                              <div className="flex items-center gap-1.5" data-testid={`text-visibility-${challengeItem.id}`}>
                                {challengeItem.visibility === 'public' ? (
                                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                                <span className="capitalize">{challengeItem.visibility.replace('_', ' ')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground" data-testid={`text-time-remaining-${challengeItem.id}`}>
                              <Timer className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">{getTimeRemaining(challengeItem.endDate)}</span>
                            </div>
                          </div>
                          
                          <Progress value={progressValue} className="h-2" data-testid={`progress-participants-${challengeItem.id}`} />
                          
                          {!isJoined && (
                            <Button 
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                joinChallengeMutation.mutate({ challengeId: challengeItem.id });
                              }}
                              disabled={joinChallengeMutation.isPending}
                              data-testid={`button-join-challenge-${challengeItem.id}`}
                            >
                              {joinChallengeMutation.isPending ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Joining...
                                </>
                              ) : challengeItem.entryFee ? (
                                <>
                                  <Coins className="mr-2 h-4 w-4" />
                                  Join ({challengeItem.entryFee} coins)
                                </>
                              ) : (
                                <>
                                  <Rocket className="mr-2 h-4 w-4" />
                                  Join Free
                                </>
                              )}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {selectedChallenge && (
                challengeDetailsLoading ? (
                  <LeaderboardSkeleton />
                ) : (
                  <Card className="h-fit" data-testid="leaderboard-panel">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <span data-testid="text-leaderboard-title">Live Leaderboard</span>
                      </CardTitle>
                      <CardDescription data-testid="text-leaderboard-subtitle">
                        Updates in real-time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-2">
                          {leaderboard.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-leaderboard">
                              <div className="p-4 bg-muted/50 rounded-full mb-4">
                                <Users className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <p className="text-muted-foreground font-medium">No participants yet</p>
                              <p className="text-sm text-muted-foreground mt-1">Be the first to join!</p>
                            </div>
                          ) : (
                            leaderboard.map((entry: LeaderboardEntry, index: number) => {
                              const rankChange = getRankChange(index + 1, entry.previousRank);
                              const prize = getPrizeForRank(index + 1, challenge?.prizePool || 0);
                              const isCurrentUser = entry.participant.userId === user?.id;
                              
                              return (
                                <motion.div
                                  key={entry.participant.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className={`flex items-center justify-between p-3 rounded-lg ${
                                    isCurrentUser ? 'bg-primary/10 ring-1 ring-primary' : 
                                    index < 3 ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10' : 
                                    'bg-muted/50'
                                  }`}
                                  data-testid={`leaderboard-entry-${entry.participant.id}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`text-lg font-bold w-8 ${
                                      index === 0 ? 'text-yellow-500' :
                                      index === 1 ? 'text-gray-400' :
                                      index === 2 ? 'text-orange-600' :
                                      'text-muted-foreground'
                                    }`} data-testid={`text-rank-${entry.participant.id}`}>
                                      #{index + 1}
                                    </div>
                                    
                                    {rankChange && rankChange.value > 0 && (
                                      <div className="flex items-center" data-testid={`rank-change-${entry.participant.id}`}>
                                        {rankChange.direction === 'up' ? (
                                          <ArrowUp className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <ArrowDown className="h-3 w-3 text-red-500" />
                                        )}
                                        <span className="text-xs">{rankChange.value}</span>
                                      </div>
                                    )}
                                    
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={entry.user?.profileImageUrl} />
                                      <AvatarFallback>
                                        {(entry.user?.displayName || 'U')[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    
                                    <div>
                                      <p className="text-sm font-medium" data-testid={`text-participant-name-${entry.participant.id}`}>
                                        {entry.user?.displayName || entry.user?.username || 'Anonymous'}
                                        {isCurrentUser && <span className="text-primary ml-1">(You)</span>}
                                      </p>
                                      <p className="text-xs text-muted-foreground" data-testid={`text-participant-score-${entry.participant.id}`}>
                                        {entry.participant.score.toLocaleString()} points
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {prize > 0 && (
                                    <div className="flex items-center gap-1" data-testid={`text-prize-${entry.participant.id}`}>
                                      <Coins className="h-4 w-4 text-yellow-500" />
                                      <span className="text-sm font-bold">{prize.toLocaleString()}</span>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                      
                      {challenge && (
                        <div className="mt-4 pt-4 border-t" data-testid="prize-distribution-panel">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Prize Distribution</span>
                              <span className="font-medium" data-testid="text-total-prize">{challenge.prizePool.toLocaleString()} coins</span>
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex justify-between" data-testid="text-prize-1st">
                                <span className="flex items-center gap-1"><Medal className="h-3 w-3 text-yellow-500" /> 1st Place</span>
                                <span>50% ({Math.floor(challenge.prizePool * 0.5).toLocaleString()} coins)</span>
                              </div>
                              <div className="flex justify-between" data-testid="text-prize-2nd">
                                <span className="flex items-center gap-1"><Medal className="h-3 w-3 text-gray-400" /> 2nd Place</span>
                                <span>30% ({Math.floor(challenge.prizePool * 0.3).toLocaleString()} coins)</span>
                              </div>
                              <div className="flex justify-between" data-testid="text-prize-3rd">
                                <span className="flex items-center gap-1"><Medal className="h-3 w-3 text-orange-600" /> 3rd Place</span>
                                <span>20% ({Math.floor(challenge.prizePool * 0.2).toLocaleString()} coins)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          {upcomingChallengesError ? (
            <ErrorState
              title="Unable to Load Upcoming Challenges"
              description="We couldn't fetch upcoming challenges. Please check your connection and try again."
              onRetry={() => refetchUpcomingChallenges()}
              isRetrying={isRefetchingUpcoming}
            />
          ) : upcomingChallengesLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} data-testid={`skeleton-upcoming-${i}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !upcomingChallenges || !Array.isArray(upcomingChallenges) || upcomingChallenges.length === 0 ? (
            <EmptyUpcomingChallenges onCreateClick={() => setCreateChallengeOpen(true)} />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(upcomingChallenges as Challenge[]).map((upcomingChallenge: Challenge) => {
                const Icon = getChallengeIcon(upcomingChallenge.challengeType);
                return (
                  <Card key={upcomingChallenge.id} className="hover-elevate" data-testid={`upcoming-challenge-card-${upcomingChallenge.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base" data-testid={`text-upcoming-title-${upcomingChallenge.id}`}>
                              {upcomingChallenge.title}
                            </CardTitle>
                          </div>
                          <CardDescription className="text-xs" data-testid={`text-upcoming-start-${upcomingChallenge.id}`}>
                            Starts {formatDistanceToNow(new Date(upcomingChallenge.startDate), { addSuffix: true })}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" data-testid={`badge-upcoming-${upcomingChallenge.id}`}>
                          <Clock className="h-3 w-3 mr-1" />
                          Upcoming
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-upcoming-description-${upcomingChallenge.id}`}>
                          {upcomingChallenge.description || getChallengeTypeDescription(upcomingChallenge.challengeType)}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1" data-testid={`text-upcoming-prize-${upcomingChallenge.id}`}>
                            <Coins className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold">{upcomingChallenge.prizePool.toLocaleString()}</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            data-testid={`button-notify-${upcomingChallenge.id}`}
                          >
                            Notify Me
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          {completedChallengesError ? (
            <ErrorState
              title="Unable to Load Challenge History"
              description="We couldn't fetch your completed challenges. Please check your connection and try again."
              onRetry={() => refetchCompletedChallenges()}
              isRetrying={isRefetchingCompleted}
            />
          ) : completedChallengesLoading ? (
            <Card data-testid="skeleton-completed">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-4 w-20 ml-auto" />
                      <Skeleton className="h-8 w-24 ml-auto" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : !completedChallenges || !Array.isArray(completedChallenges) || completedChallenges.length === 0 ? (
            <EmptyCompletedChallenges />
          ) : (
            <Card data-testid="completed-challenges-list">
              <CardHeader>
                <CardTitle data-testid="text-completed-title">Your Challenge History</CardTitle>
                <CardDescription data-testid="text-completed-subtitle">
                  View your past victories and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(completedChallenges as CompletedChallengeResult[]).map((result: CompletedChallengeResult) => {
                    const isWinner = result.rank <= 3;
                    return (
                      <div 
                        key={result.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover-elevate"
                        data-testid={`completed-challenge-${result.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${
                            result.rank === 1 ? 'bg-yellow-500/20' :
                            result.rank === 2 ? 'bg-gray-400/20' :
                            result.rank === 3 ? 'bg-orange-600/20' :
                            'bg-muted'
                          }`}>
                            {result.rank === 1 ? <Crown className="h-5 w-5 text-yellow-500" /> :
                             result.rank === 2 ? <Medal className="h-5 w-5 text-gray-400" /> :
                             result.rank === 3 ? <Award className="h-5 w-5 text-orange-600" /> :
                             <Trophy className="h-5 w-5 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className="font-medium" data-testid={`text-completed-challenge-title-${result.id}`}>
                              {result.title}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-completed-result-${result.id}`}>
                              Finished #{result.rank} of {result.totalParticipants}
                              {result.prizeWon > 0 && ` • Won ${result.prizeWon.toLocaleString()} coins`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground" data-testid={`text-completed-date-${result.id}`}>
                            {formatDistanceToNow(new Date(result.completedAt), { addSuffix: true })}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-1"
                            data-testid={`button-view-details-${result.id}`}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
