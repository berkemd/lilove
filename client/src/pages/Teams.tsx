import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTeamSocket } from '@/hooks/useSocket';
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
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Trophy, 
  Target, 
  MessageCircle, 
  Plus, 
  UserPlus, 
  Crown, 
  Star, 
  Zap,
  TrendingUp,
  Send,
  Search,
  Settings,
  Share2,
  Lock,
  Globe,
  ChevronRight,
  Award,
  Flame,
  Shield,
  Sword,
  Calendar,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Mail,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  UserMinus,
  ShieldCheck,
  Loader2,
  Medal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { format, formatDistanceToNow } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Types
interface Team {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  maxMembers: number;
  isPublic: boolean;
  requiresApproval: boolean;
  totalXp: number;
  teamLevel: number;
  winStreak: number;
  challengesWon: number;
  createdById: string;
  createdAt: string;
}

interface TeamMember {
  user: {
    id: string;
    email: string;
    displayName?: string;
    username?: string;
    profileImageUrl?: string;
  };
  member: {
    id: string;
    role: 'owner' | 'admin' | 'member';
    contributionXp: number;
    joinedAt: string;
    userId: string;
  };
  profile?: {
    currentLevel: number;
    totalXp: number;
  };
}

// API Response Types
interface MyTeamsResponse {
  team: Team;
  membership: {
    id: string;
    role: 'owner' | 'admin' | 'member';
    contributionXp: number;
    joinedAt: string;
    userId: string;
    teamId: string;
  };
}

interface TeamDetailsResponse {
  team: Team;
  members: TeamMember[];
}

interface InviteResponse {
  inviteCode: string;
}

interface TeamGoal {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  goalType: string;
  deadline?: string;
  status: 'active' | 'completed' | 'failed';
  xpReward: number;
  coinReward: number;
  createdAt: string;
  completedAt?: string;
}

interface TeamChatMessage {
  id: string;
  teamId: string;
  userId: string;
  message: string;
  messageType: 'text' | 'achievement' | 'system';
  createdAt: string;
  user?: {
    displayName?: string;
    username?: string;
    profileImageUrl?: string;
  };
}

// Form schemas - relaxed validation for better UX
const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(50),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
  maxMembers: z.number().min(2).max(20).default(20)
});

const createGoalSchema = z.object({
  title: z.string().min(1, 'Goal title is required'),
  description: z.string().optional(),
  goalType: z.enum(['collective_xp', 'tasks_completed', 'streak_days', 'challenge_wins']),
  targetValue: z.number().min(1),
  deadline: z.string().optional(),
  xpReward: z.number().min(100).default(1000),
  coinReward: z.number().min(10).default(100)
});

// Helper functions
function getTeamLevelTitle(level: number): { title: string; icon: typeof Crown; color: string } {
  if (level < 5) return { title: 'Bronze Team', icon: Shield, color: 'text-orange-600 dark:text-orange-500' };
  if (level < 10) return { title: 'Silver Team', icon: Star, color: 'text-gray-400 dark:text-gray-300' };
  if (level < 20) return { title: 'Gold Team', icon: Trophy, color: 'text-yellow-500 dark:text-yellow-400' };
  if (level < 30) return { title: 'Platinum Team', icon: Crown, color: 'text-cyan-400 dark:text-cyan-300' };
  return { title: 'Diamond Team', icon: Sword, color: 'text-purple-500 dark:text-purple-400' };
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner': return Crown;
    case 'admin': return Shield;
    default: return null;
  }
}

function getGoalTypeLabel(type: string): string {
  switch (type) {
    case 'collective_xp': return 'Collective XP';
    case 'tasks_completed': return 'Tasks Completed';
    case 'streak_days': return 'Streak Days';
    case 'challenge_wins': return 'Challenge Wins';
    default: return type;
  }
}

export default function Teams() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [createGoalOpen, setCreateGoalOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly' | 'all'>('all');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Socket.IO integration for real-time chat
  const { messages: socketMessages, isTyping, sendMessage, sendTypingIndicator } = useTeamSocket(selectedTeam);

  // Queries
  const { data: myTeams, isLoading: teamsLoading } = useQuery<MyTeamsResponse[]>({
    queryKey: ['/api/teams/my']
  });

  const { data: teamDetails } = useQuery<TeamDetailsResponse>({
    queryKey: ['/api/teams', selectedTeam],
    enabled: !!selectedTeam
  });

  const { data: publicTeams, isLoading: publicTeamsLoading } = useQuery<(Team & { memberCount: number })[]>({
    queryKey: ['/api/teams/public'],
    select: (teams: (Team & { memberCount: number })[]) => {
      if (!searchQuery) return teams;
      return teams?.filter(team => 
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  });

  const { data: leaderboardTeams, isLoading: leaderboardLoading } = useQuery<(Team & { memberCount: number })[]>({
    queryKey: ['/api/teams/public', 'leaderboard'],
  });

  const { data: teamGoals, isLoading: teamGoalsLoading } = useQuery<TeamGoal[]>({
    queryKey: ['/api/teams', selectedTeam, 'goals'],
    enabled: !!selectedTeam
  });

  // Chat messages query (initial load)
  const { data: chatMessages, isLoading: chatLoading } = useQuery<TeamChatMessage[]>({
    queryKey: ['/api/teams', selectedTeam, 'chat'],
    enabled: !!selectedTeam
  });

  // Team member leaderboard
  const { data: teamLeaderboard, isLoading: leaderboardMembersLoading } = useQuery<any[]>({
    queryKey: ['/api/teams', selectedTeam, 'leaderboard', leaderboardPeriod],
    enabled: !!selectedTeam
  });

  // Combine initial messages with real-time messages
  const allMessages = [...(chatMessages || []), ...socketMessages.filter(
    sm => !chatMessages?.some(cm => cm.id === sm.id)
  )];

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [allMessages.length]);

  // Mutations
  const createTeamMutation = useMutation({
    mutationFn: (data: z.infer<typeof createTeamSchema>) => 
      apiRequest('/api/teams', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams/public'] });
      createTeamForm.reset();
      setCreateTeamOpen(false);
      toast({
        title: t('teams.teamCreated'),
        description: t('teams.teamCreatedDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create team",
        variant: "destructive",
      });
    }
  });

  const joinTeamMutation = useMutation({
    mutationFn: (teamId: string) => 
      apiRequest(`/api/teams/${teamId}/join`, {
        method: 'POST'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams/public'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: t('teams.joinedTeam'),
        description: t('teams.joinedTeamDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join team",
        variant: "destructive",
      });
    }
  });

  const sendInviteMutation = useMutation<InviteResponse, Error, { teamId: string; inviteEmail?: string }>({
    mutationFn: async (data: { teamId: string; inviteEmail?: string }) => {
      const response = await apiRequest(`/api/teams/${data.teamId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ inviteEmail: data.inviteEmail })
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invite Sent!",
        description: "Team invitation has been sent.",
      });
      setInviteEmail('');
    }
  });

  const createGoalMutation = useMutation({
    mutationFn: (data: z.infer<typeof createGoalSchema> & { teamId: string }) => 
      apiRequest(`/api/teams/${data.teamId}/goals`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', selectedTeam, 'goals'] });
      setCreateGoalOpen(false);
      toast({
        title: t('teams.goalCreated'),
        description: t('teams.goalCreatedDescription'),
      });
    }
  });

  // Member management mutations
  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ teamId, userId, role }: { teamId: string; userId: string; role: string }) =>
      apiRequest(`/api/teams/${teamId}/member/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', selectedTeam] });
      toast({
        title: t('teams.roleUpdated'),
        description: t('teams.roleUpdatedDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member role",
        variant: "destructive",
      });
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      apiRequest(`/api/teams/${teamId}/member/${userId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', selectedTeam] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
      toast({
        title: t('teams.memberRemoved'),
        description: t('teams.memberRemovedDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  });

  // Chat functions
  const handleSendMessage = () => {
    if (chatMessage.trim() && selectedTeam) {
      sendMessage(chatMessage.trim());
      setChatMessage('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      sendTypingIndicator(false);
    }
  };

  const handleTyping = (value: string) => {
    setChatMessage(value);
    
    if (value.trim()) {
      sendTypingIndicator(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 2000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      sendTypingIndicator(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Forms
  const createTeamForm = useForm<z.infer<typeof createTeamSchema>>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: true,
      requiresApproval: false,
      maxMembers: 20
    }
  });

  const createGoalForm = useForm<z.infer<typeof createGoalSchema>>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      title: '',
      description: '',
      goalType: 'collective_xp',
      targetValue: 10000,
      xpReward: 1000,
      coinReward: 100
    }
  });

  const handleCreateTeam = (data: z.infer<typeof createTeamSchema>) => {
    createTeamMutation.mutate(data);
  };

  const handleCreateGoal = (data: z.infer<typeof createGoalSchema>) => {
    if (selectedTeam) {
      createGoalMutation.mutate({ ...data, teamId: selectedTeam });
    }
  };

  const handleCopyInviteLink = async () => {
    if (selectedTeam) {
      const response = await sendInviteMutation.mutateAsync({ teamId: selectedTeam });
      const inviteLink = `${window.location.origin}/teams/invite/${response.inviteCode}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const team = teamDetails?.team;
  const members = teamDetails?.members || [];
  const isOwner = team?.createdById === user?.id;
  const isMember = members?.some((m: TeamMember) => m.user.id === user?.id);
  const teamLevel = getTeamLevelTitle(team?.teamLevel || 1);

  if (teamsLoading) {
    return <TeamsPageSkeleton />;
  }

  return (
    <div className="p-6 space-y-8" data-testid="page-teams">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {t('teams.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('teams.pageDescription')}
          </p>
        </div>
        
        <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-create-team">
              <Plus className="mr-2 h-4 w-4" />
              {t('teams.createTeam')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{t('teams.createNewTeam')}</DialogTitle>
              <DialogDescription>
                {t('teams.createTeamDescription')}
              </DialogDescription>
            </DialogHeader>
            <Form {...createTeamForm}>
              <form onSubmit={createTeamForm.handleSubmit(handleCreateTeam)} className="space-y-4">
                <FormField
                  control={createTeamForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('teams.teamName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('teams.teamNamePlaceholder')} {...field} data-testid="input-team-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createTeamForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('goals.description')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('teams.teamDescriptionPlaceholder')} 
                          {...field} 
                          data-testid="textarea-team-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center space-x-4">
                  <FormField
                    control={createTeamForm.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-team-public"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">{t('teams.publicTeam')}</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createTeamForm.control}
                    name="requiresApproval"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-requires-approval"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">{t('teams.requireApproval')}</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createTeamMutation.isPending}
                    data-testid="button-submit-create-team"
                  >
                    {createTeamMutation.isPending ? t('common.creating') : t('teams.createTeam')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <FeatureErrorBoundary featureName="Teams">
      <Tabs defaultValue="my-teams" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="my-teams" data-testid="tab-my-teams">
            <Users className="mr-2 h-4 w-4" />
            {t('teams.myTeams')}
          </TabsTrigger>
          <TabsTrigger value="discover" data-testid="tab-discover">
            <Search className="mr-2 h-4 w-4" />
            {t('teams.discover')}
          </TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
            <Trophy className="mr-2 h-4 w-4" />
            {t('teams.leaderboard')}
          </TabsTrigger>
        </TabsList>

        {/* My Teams Tab */}
        <TabsContent value="my-teams" className="space-y-6">
          {myTeams?.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('teams.noTeamsYet')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('teams.createOrJoinTeam')}
              </p>
              <Button onClick={() => setCreateTeamOpen(true)} data-testid="button-create-first-team">
                {t('teams.createYourFirstTeam')}
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Team List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('teams.yourTeams')}</h3>
                {myTeams?.map((teamData: any) => {
                  const team = teamData.team;
                  const membership = teamData.membership;
                  const levelInfo = getTeamLevelTitle(team.teamLevel);
                  const RoleIcon = getRoleIcon(membership.role);
                  
                  return (
                    <Card 
                      key={team.id}
                      className={`cursor-pointer transition-all hover-elevate ${
                        selectedTeam === team.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedTeam(team.id)}
                      data-testid={`team-card-${team.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={team.avatarUrl} />
                              <AvatarFallback>
                                {team.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{team.name}</h4>
                                {RoleIcon && (
                                  <RoleIcon className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <levelInfo.icon className={`h-4 w-4 ${levelInfo.color}`} />
                                <span>Level {team.teamLevel}</span>
                                <span>•</span>
                                <span>{team.totalXp.toLocaleString()} XP</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        
                        {team.winStreak > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium">
                              {team.winStreak} win streak!
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Team Details */}
              {selectedTeam && team && (
                <Card className="h-fit">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {team.name}
                        <Badge variant="secondary">
                          <teamLevel.icon className={`h-3 w-3 mr-1 ${teamLevel.color}`} />
                          {teamLevel.title}
                        </Badge>
                      </CardTitle>
                      {isOwner && (
                        <Button variant="ghost" size="icon" data-testid="button-team-settings">
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <CardDescription>{team.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <Tabs defaultValue="members" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="members">Members</TabsTrigger>
                        <TabsTrigger value="goals">Goals</TabsTrigger>
                        <TabsTrigger value="chat">Chat</TabsTrigger>
                        <TabsTrigger value="stats">Stats</TabsTrigger>
                      </TabsList>
                      
                      {/* Members Tab */}
                      <TabsContent value="members" className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {members.length} / {team.maxMembers} members
                          </span>
                          {(isOwner || isMember) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setInviteOpen(true)}
                              data-testid="button-invite-members"
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Invite
                            </Button>
                          )}
                        </div>
                        
                        <ScrollArea className="h-[300px] pr-4">
                          <div className="space-y-2">
                            {members.map((member: TeamMember) => {
                              const RoleIcon = getRoleIcon(member.member.role);
                              const isCurrentUser = member.user.id === user?.id;
                              const canManage = isOwner && member.member.role !== 'owner' && !isCurrentUser;
                              
                              return (
                                <div 
                                  key={member.member.id}
                                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                                  data-testid={`member-${member.user.id}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={member.user.profileImageUrl} />
                                      <AvatarFallback>
                                        {(member.user.displayName || member.user.email)[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                          {member.user.displayName || member.user.username || member.user.email}
                                        </span>
                                        {RoleIcon && (
                                          <RoleIcon className="h-3 w-3 text-primary" />
                                        )}
                                        <Badge variant="outline" className="text-xs py-0">
                                          {member.member.role}
                                        </Badge>
                                        {isCurrentUser && (
                                          <Badge variant="secondary" className="text-xs py-0">You</Badge>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        Level {member.profile?.currentLevel || 1} • {member.member.contributionXp.toLocaleString()} XP contributed
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {canManage && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" data-testid={`button-member-menu-${member.user.id}`}>
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {member.member.role === 'member' && (
                                          <DropdownMenuItem
                                            onClick={() => updateMemberRoleMutation.mutate({
                                              teamId: selectedTeam!,
                                              userId: member.user.id,
                                              role: 'admin'
                                            })}
                                            data-testid={`button-promote-${member.user.id}`}
                                          >
                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                            Promote to Admin
                                          </DropdownMenuItem>
                                        )}
                                        {member.member.role === 'admin' && (
                                          <DropdownMenuItem
                                            onClick={() => updateMemberRoleMutation.mutate({
                                              teamId: selectedTeam!,
                                              userId: member.user.id,
                                              role: 'member'
                                            })}
                                            data-testid={`button-demote-${member.user.id}`}
                                          >
                                            <Shield className="mr-2 h-4 w-4" />
                                            Demote to Member
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => removeMemberMutation.mutate({
                                            teamId: selectedTeam!,
                                            userId: member.user.id
                                          })}
                                          data-testid={`button-remove-${member.user.id}`}
                                        >
                                          <UserMinus className="mr-2 h-4 w-4" />
                                          Remove from Team
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      
                      {/* Goals Tab */}
                      <TabsContent value="goals" className="space-y-4">
                        {isOwner && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setCreateGoalOpen(true)}
                            className="w-full"
                            data-testid="button-create-goal"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Team Goal
                          </Button>
                        )}
                        
                        <div className="space-y-3">
                          {teamGoalsLoading ? (
                            <div className="space-y-3">
                              <Skeleton className="h-32 w-full" />
                              <Skeleton className="h-32 w-full" />
                            </div>
                          ) : teamGoals && teamGoals.length > 0 ? (
                            teamGoals.map((goal) => {
                              const progress = goal.targetValue > 0 
                                ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) 
                                : 0;
                              return (
                                <Card key={goal.id} data-testid={`card-team-goal-${goal.id}`}>
                                  <CardContent className="p-4">
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-start gap-2">
                                        <div>
                                          <h4 className="font-medium">{goal.title}</h4>
                                          {goal.description && (
                                            <p className="text-sm text-muted-foreground">
                                              {goal.description}
                                            </p>
                                          )}
                                        </div>
                                        <Badge variant={goal.status === 'completed' ? 'default' : goal.status === 'failed' ? 'destructive' : 'secondary'}>
                                          {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                                        </Badge>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                          <span>Progress</span>
                                          <span>{goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {getGoalTypeLabel(goal.goalType)}</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <Trophy className="h-3 w-3" />
                                          <span>{goal.xpReward.toLocaleString()} XP reward</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Star className="h-3 w-3" />
                                          <span>{goal.coinReward.toLocaleString()} coins</span>
                                        </div>
                                        {goal.deadline && (
                                          <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>Due {format(new Date(goal.deadline), 'MMM d')}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
                              <p className="font-medium">No team goals yet</p>
                              <p className="text-sm">Create your first team goal to get started</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      {/* Chat Tab */}
                      <TabsContent value="chat" className="space-y-0">
                        <div className="flex flex-col h-[400px]" data-testid="team-chat-container">
                          {/* Chat Messages */}
                          <ScrollArea 
                            className="flex-1 pr-4" 
                            ref={chatContainerRef as any}
                          >
                            <div className="space-y-4 p-2">
                              {chatLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                              ) : allMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                  <MessageCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                                  <h4 className="font-medium">No messages yet</h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Start the conversation with your team!
                                  </p>
                                </div>
                              ) : (
                                allMessages.map((msg) => {
                                  const isOwnMessage = msg.userId === user?.id;
                                  return (
                                    <div 
                                      key={msg.id}
                                      className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                                      data-testid={`chat-message-${msg.id}`}
                                    >
                                      <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarImage src={msg.user?.profileImageUrl} />
                                        <AvatarFallback>
                                          {(msg.user?.displayName || (msg.user as any)?.username || 'U')[0].toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className={`max-w-[70%] ${isOwnMessage ? 'text-right' : ''}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-medium">
                                            {isOwnMessage ? 'You' : (msg.user?.displayName || (msg.user as any)?.username || 'Unknown')}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {format(new Date(msg.createdAt), 'HH:mm')}
                                          </span>
                                        </div>
                                        <div 
                                          className={`rounded-lg px-3 py-2 text-sm ${
                                            isOwnMessage 
                                              ? 'bg-primary text-primary-foreground' 
                                              : 'bg-muted'
                                          }`}
                                        >
                                          {msg.message}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </ScrollArea>
                          
                          {/* Typing Indicator */}
                          {isTyping && (
                            <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-2" data-testid="typing-indicator">
                              <span className="flex space-x-1">
                                <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{animationDelay: '0ms'}} />
                                <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{animationDelay: '150ms'}} />
                                <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{animationDelay: '300ms'}} />
                              </span>
                              <span>{isTyping.userName} is typing...</span>
                            </div>
                          )}
                          
                          {/* Chat Input */}
                          <div className="flex gap-2 pt-3 border-t mt-2">
                            <Input
                              placeholder="Type a message..."
                              value={chatMessage}
                              onChange={(e) => handleTyping(e.target.value)}
                              onKeyDown={handleKeyDown}
                              className="flex-1"
                              data-testid="input-chat-message"
                            />
                            <Button 
                              onClick={handleSendMessage}
                              disabled={!chatMessage.trim()}
                              size="icon"
                              data-testid="button-send-message"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                      
                      {/* Stats Tab */}
                      <TabsContent value="stats" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-2xl font-bold">{team.totalXp.toLocaleString()}</p>
                                  <p className="text-xs text-muted-foreground">Total XP</p>
                                </div>
                                <Zap className="h-8 w-8 text-yellow-500" />
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-2xl font-bold">{team.challengesWon}</p>
                                  <p className="text-xs text-muted-foreground">Wins</p>
                                </div>
                                <Trophy className="h-8 w-8 text-primary" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        {team.winStreak > 0 && (
                          <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-2xl font-bold">{team.winStreak}</p>
                                  <p className="text-sm font-medium">Current Win Streak!</p>
                                </div>
                                <Flame className="h-10 w-10 text-orange-500" />
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Team Member Leaderboard */}
                        <Card data-testid="team-member-leaderboard">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Medal className="h-5 w-5 text-primary" />
                                Member Leaderboard
                              </CardTitle>
                              <Select 
                                value={leaderboardPeriod} 
                                onValueChange={(value: 'weekly' | 'monthly' | 'all') => setLeaderboardPeriod(value)}
                              >
                                <SelectTrigger className="w-28 h-8" data-testid="select-leaderboard-period">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="all">All Time</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {leaderboardMembersLoading ? (
                              <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                  <Skeleton key={i} className="h-12 w-full" />
                                ))}
                              </div>
                            ) : teamLeaderboard && teamLeaderboard.length > 0 ? (
                              <div className="space-y-2">
                                {teamLeaderboard.slice(0, 5).map((member, index) => (
                                  <div 
                                    key={member.id}
                                    className={`flex items-center justify-between p-2 rounded-lg ${
                                      index === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10' :
                                      index === 1 ? 'bg-gradient-to-r from-gray-300/10 to-gray-400/10' :
                                      index === 2 ? 'bg-gradient-to-r from-orange-600/10 to-orange-700/10' :
                                      'bg-muted/30'
                                    }`}
                                    data-testid={`leaderboard-member-${member.id}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`w-6 text-center font-bold ${
                                        index === 0 ? 'text-yellow-500 dark:text-yellow-400' :
                                        index === 1 ? 'text-gray-400 dark:text-gray-300' :
                                        index === 2 ? 'text-orange-600 dark:text-orange-500' :
                                        'text-muted-foreground'
                                      }`}>
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${member.rank}`}
                                      </span>
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.profileImageUrl} />
                                        <AvatarFallback>
                                          {(member.displayName || 'U')[0].toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <span className="font-medium text-sm">
                                          {member.displayName}
                                        </span>
                                        <Badge variant="outline" className="ml-2 text-xs py-0">
                                          {member.role}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-sm">{member.contributionXp.toLocaleString()} XP</p>
                                      <p className="text-xs text-muted-foreground">
                                        {member.goalsCompleted} goals
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground text-sm">
                                No contribution data yet
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-teams"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {publicTeamsLoading ? (
              [1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-5 w-32 mb-2" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : publicTeams && publicTeams.length > 0 ? (
              publicTeams.map((team) => (
                <Card key={team.id} className="hover-elevate" data-testid={`card-team-${team.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={team.avatarUrl} />
                          <AvatarFallback>{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{team.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {team.isPublic ? (
                              <Globe className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {team.isPublic ? 'Public' : 'Private'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">Level {team.teamLevel}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {team.description || 'A team focused on achieving greatness together.'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{team.memberCount}/{team.maxMembers}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          <span>{team.challengesWon} wins</span>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => joinTeamMutation.mutate(team.id)}
                        disabled={joinTeamMutation.isPending}
                        data-testid={`button-join-team-${team.id}`}
                      >
                        {team.requiresApproval ? 'Request' : 'Join'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No teams found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? 'No teams match your search. Try a different term.'
                    : 'Create the first team and start collaborating!'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setCreateTeamOpen(true)} data-testid="button-create-first-team">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Team
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Teams</CardTitle>
              <CardDescription>
                Compete with other teams to climb the rankings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboardLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-5 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-5 w-16 mb-1" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  ))
                ) : leaderboardTeams && leaderboardTeams.length > 0 ? (
                  leaderboardTeams.slice(0, 10).map((team, index) => {
                    const rank = index + 1;
                    const isTop3 = rank <= 3;
                    return (
                      <div 
                        key={team.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isTop3 ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10' : 'bg-muted/50'
                        }`}
                        data-testid={`leaderboard-rank-${rank}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`text-2xl font-bold ${
                            rank === 1 ? 'text-yellow-500 dark:text-yellow-400' :
                            rank === 2 ? 'text-gray-400 dark:text-gray-300' :
                            rank === 3 ? 'text-orange-600 dark:text-orange-500' :
                            'text-muted-foreground'
                          }`}>
                            #{rank}
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={team.avatarUrl} />
                            <AvatarFallback>{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{team.name}</span>
                              {rank === 1 && <Crown className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />}
                              {rank === 2 && <Star className="h-4 w-4 text-gray-400 dark:text-gray-300" />}
                              {rank === 3 && <Award className="h-4 w-4 text-orange-600 dark:text-orange-500" />}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>Level {team.teamLevel}</span>
                              <span>•</span>
                              <span>{team.memberCount} members</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{team.totalXp.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Total XP</p>
                          {team.winStreak > 0 && (
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              <Flame className="h-3 w-3 text-orange-500" />
                              <span className="text-xs text-orange-500">{team.winStreak} streak</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No teams on the leaderboard</h3>
                    <p className="text-muted-foreground mb-4">
                      Be the first to create a team and start earning XP!
                    </p>
                    <Button onClick={() => setCreateTeamOpen(true)} data-testid="button-create-leaderboard-team">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Team
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Goal Dialog */}
      <Dialog open={createGoalOpen} onOpenChange={setCreateGoalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team Goal</DialogTitle>
            <DialogDescription>
              Set a collaborative goal for your team to achieve together
            </DialogDescription>
          </DialogHeader>
          <Form {...createGoalForm}>
            <form onSubmit={createGoalForm.handleSubmit(handleCreateGoal)} className="space-y-4">
              <FormField
                control={createGoalForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Reach 100K collective XP" {...field} data-testid="input-team-goal-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createGoalForm.control}
                name="goalType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Type</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full p-2 border rounded-md" data-testid="select-team-goal-type">
                        <option value="collective_xp">Collective XP</option>
                        <option value="tasks_completed">Tasks Completed</option>
                        <option value="streak_days">Streak Days</option>
                        <option value="challenge_wins">Challenge Wins</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createGoalForm.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Value</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-team-goal-target"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createGoalMutation.isPending}
                  data-testid="button-create-team-goal"
                >
                  {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Members</DialogTitle>
            <DialogDescription>
              Share the invite link or send invitations via email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={`${window.location.origin}/teams/invite/...`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline"
                  onClick={handleCopyInviteLink}
                  data-testid="button-copy-invite"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Invite by Email</Label>
              <div className="flex gap-2">
                <Input 
                  type="email"
                  placeholder="friend@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  data-testid="input-invite-email"
                />
                <Button
                  onClick={() => {
                    if (inviteEmail && selectedTeam) {
                      sendInviteMutation.mutate({ teamId: selectedTeam, inviteEmail });
                    }
                  }}
                  disabled={!inviteEmail || sendInviteMutation.isPending}
                  data-testid="button-send-invite"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </FeatureErrorBoundary>
    </div>
  );
}

// Loading skeleton
function TeamsPageSkeleton() {
  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}