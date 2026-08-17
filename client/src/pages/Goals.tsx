import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { trackEvent } from "@/lib/analytics";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { 
  Target, 
  Calendar, 
  TrendingUp,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  Edit,
  Trash2,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  LogIn,
  UserX,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Rocket,
  Star,
  ChevronDown,
  ChevronRight,
  Plus,
  ListChecks,
  X
} from "lucide-react";

import { GoalForm } from "@/components/GoalForm";
import { AIGoalWizard } from "@/components/goals";
import { useAuth } from "@/hooks/useAuth";
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { useReducedMotion } from 'framer-motion';

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  progress: string;
  targetOutcome: string;
  estimatedDuration?: number;
  difficultyLevel?: number;
  originalETA?: string;
  currentETA?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
}

interface SubGoal {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  order: number;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

function GoalCardSkeleton() {
  return (
    <Card className="overflow-hidden" data-testid="skeleton-goal-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card data-testid="skeleton-stat-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-12 mb-1" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="text-center py-16 border-dashed" data-testid="empty-state-goals">
      <CardContent className="space-y-6">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-primary/20 rounded-full flex items-center justify-center">
            <Target className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-xl font-semibold" data-testid="text-empty-title">
            Start Your Journey Today
          </h3>
          <p className="text-muted-foreground" data-testid="text-empty-description">
            Every great achievement begins with a single goal. Set your first goal and let our AI coach guide you toward success.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <AIGoalWizard>
            <Button size="lg" data-testid="button-create-first-goal">
              <Sparkles className="mr-2 h-4 w-4" />
              Create Your First Goal with AI
            </Button>
          </AIGoalWizard>
          <GoalForm>
            <Button variant="outline" size="lg" data-testid="button-manual-goal">
              <Rocket className="mr-2 h-4 w-4" />
              Quick Goal
            </Button>
          </GoalForm>
        </div>

        <div className="pt-6 border-t mt-6">
          <p className="text-sm text-muted-foreground mb-4">Why set goals with us?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">AI-Powered Insights</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">Track Progress</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">Earn Rewards</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <Card className="text-center py-12" data-testid="error-state-goals">
      <CardContent className="space-y-4">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold" data-testid="text-error-title">
            Unable to Load Goals
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto" data-testid="text-error-description">
            We couldn't fetch your goals right now. This might be a temporary issue.
          </p>
        </div>
        <Button 
          onClick={onRetry} 
          disabled={isRetrying}
          data-testid="button-retry-load"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </Button>
      </CardContent>
    </Card>
  );
}

function AuthRequiredState() {
  return (
    <Card className="text-center py-12" data-testid="auth-required-state">
      <CardContent className="space-y-4">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <UserX className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold" data-testid="text-auth-required-title">
            Sign In Required
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto" data-testid="text-auth-required-description">
            Please sign in to view and manage your goals. Your progress will be saved securely.
          </p>
        </div>
        <Button 
          onClick={() => window.location.href = '/auth'}
          data-testid="button-login-redirect"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </CardContent>
    </Card>
  );
}

function SubGoalsSection({ 
  goalId, 
  isExpanded, 
  onToggle,
  newSubGoalInput,
  onNewSubGoalInputChange,
  onAddSubGoal,
  onCompleteSubGoal,
  onDeleteSubGoal,
  isAddingSubGoal,
}: { 
  goalId: string;
  isExpanded: boolean;
  onToggle: () => void;
  newSubGoalInput: string;
  onNewSubGoalInputChange: (value: string) => void;
  onAddSubGoal: () => void;
  onCompleteSubGoal: (subGoalId: string) => void;
  onDeleteSubGoal: (subGoalId: string) => void;
  isAddingSubGoal: boolean;
}) {
  const { data: subGoals = [], isLoading } = useQuery<SubGoal[]>({
    queryKey: ["/api/goals", goalId, "subgoals"],
    enabled: isExpanded,
  });

  const completedCount = subGoals.filter(s => s.status === 'completed').length;
  const totalCount = subGoals.length;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="pt-3 border-t">
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between h-8 px-2"
            aria-expanded={isExpanded}
            aria-controls={`subgoals-content-${goalId}`}
            data-testid={`button-toggle-subgoals-${goalId}`}
          >
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">Sub-goals</span>
              {totalCount > 0 && (
                <Badge variant="secondary" className="text-xs" data-testid={`badge-subgoals-progress-${goalId}`}>
                  {completedCount}/{totalCount} completed
                  <span className="sr-only">sub-goals</span>
                </Badge>
              )}
            </div>
            {isExpanded ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent id={`subgoals-content-${goalId}`} className="pt-2 space-y-2">
          {isLoading ? (
            <div className="space-y-2 pl-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ) : (
            <>
              {subGoals.length === 0 && (
                <p className="text-xs text-muted-foreground pl-2" data-testid={`text-no-subgoals-${goalId}`}>
                  No sub-goals yet. Add some to break down your goal!
                </p>
              )}
              {subGoals.map((subGoal) => (
                <div 
                  key={subGoal.id} 
                  className={`flex items-center gap-2 group pl-2 py-1 rounded-sm ${subGoal.status === 'completed' ? 'opacity-60' : ''}`}
                  data-testid={`subgoal-item-${subGoal.id}`}
                >
                  <Checkbox
                    checked={subGoal.status === 'completed'}
                    onCheckedChange={() => {
                      if (subGoal.status !== 'completed') {
                        onCompleteSubGoal(subGoal.id);
                      }
                    }}
                    disabled={subGoal.status === 'completed'}
                    aria-label={`Mark "${subGoal.title}" as complete`}
                    data-testid={`checkbox-subgoal-${subGoal.id}`}
                  />
                  <span 
                    className={`text-sm flex-1 ${subGoal.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}
                    data-testid={`text-subgoal-title-${subGoal.id}`}
                  >
                    {subGoal.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDeleteSubGoal(subGoal.id)}
                    aria-label={`Delete sub-goal "${subGoal.title}"`}
                    data-testid={`button-delete-subgoal-${subGoal.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              <div className="flex items-center gap-2 pl-2 pt-1">
                <Input
                  placeholder="Add a sub-goal..."
                  value={newSubGoalInput}
                  onChange={(e) => onNewSubGoalInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddSubGoal();
                    }
                  }}
                  className="h-7 text-sm"
                  aria-label="New sub-goal title"
                  data-testid={`input-new-subgoal-${goalId}`}
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 shrink-0"
                  onClick={onAddSubGoal}
                  disabled={isAddingSubGoal || !newSubGoalInput.trim()}
                  aria-label="Add sub-goal"
                  data-testid={`button-add-subgoal-${goalId}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function Goals() {
  const { t } = useTranslation();
  const [progressInput, setProgressInput] = useState<{[key: string]: string}>({});
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [newSubGoalInputs, setNewSubGoalInputs] = useState<{[key: string]: string}>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();

  const { 
    data: goals = [], 
    isLoading, 
    error,
    refetch,
    isRefetching
  } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (error && 'status' in error && error.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  const createSubGoalMutation = useMutation({
    mutationFn: async ({ goalId, title }: { goalId: string; title: string }) => {
      return apiRequest(`/api/goals/${goalId}/subgoals`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
    },
    onSuccess: (_, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals", goalId, "subgoals"] });
      toast({
        title: t('goals.subgoalAdded'),
        description: t('goals.subgoalAddedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sub-goal",
        variant: "destructive",
      });
    },
  });

  const completeSubGoalMutation = useMutation({
    mutationFn: async ({ subGoalId, goalId }: { subGoalId: string; goalId: string }) => {
      return apiRequest(`/api/subgoals/${subGoalId}/complete`, { method: "POST" });
    },
    onSuccess: (_, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals", goalId, "subgoals"] });
      toast({
        title: t('goals.subgoalCompleted'),
        description: t('goals.keepMakingProgress'),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete sub-goal",
        variant: "destructive",
      });
    },
  });

  const deleteSubGoalMutation = useMutation({
    mutationFn: async ({ subGoalId, goalId }: { subGoalId: string; goalId: string }) => {
      return apiRequest(`/api/subgoals/${subGoalId}`, { method: "DELETE" });
    },
    onSuccess: (_, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals", goalId, "subgoals"] });
      toast({
        title: t('goals.subgoalDeleted'),
        description: t('goals.subgoalDeletedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sub-goal",
        variant: "destructive",
      });
    },
  });

  const handleAddSubGoal = (goalId: string) => {
    const title = newSubGoalInputs[goalId]?.trim();
    if (!title) return;
    createSubGoalMutation.mutate({ goalId, title });
    setNewSubGoalInputs(prev => ({ ...prev, [goalId]: "" }));
  };

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      return apiRequest(`/api/goals/${goalId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: t('goals.goalDeleted'),
        description: t('goals.goalDeletedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete goal",
        variant: "destructive",
      });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ goalId, progress }: { goalId: string; progress: number }) => {
      return apiRequest(`/api/goals/${goalId}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ progress }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: t('goals.progressUpdated'),
        description: t('goals.progressUpdatedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update progress",
        variant: "destructive",
      });
    },
  });

  const completeGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      return apiRequest(`/api/goals/${goalId}/complete`, { method: "POST" });
    },
    onSuccess: (data: any, goalId: string) => {
      const goal = goals.find(g => g.id === goalId);
      const timeToComplete = goal?.createdAt ? 
        Math.floor((new Date().getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 
        undefined;
      
      trackEvent('goal_completed', { 
        goalId, 
        timeToComplete,
        category: goal?.category
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: t('goals.goalCompleted'),
        description: t('goals.goalCompletedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete goal",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ goalId, status }: { goalId: string; status: string }) => {
      return apiRequest(`/api/goals/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: t('goals.statusUpdated'),
        description: t('goals.statusUpdatedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleProgressUpdate = (goalId: string) => {
    const progress = parseFloat(progressInput[goalId] || "0");
    if (isNaN(progress) || progress < 0 || progress > 100) {
      toast({
        title: "Invalid Progress",
        description: "Progress must be a number between 0 and 100",
        variant: "destructive",
      });
      return;
    }
    updateProgressMutation.mutate({ goalId, progress });
    setProgressInput(prev => ({ ...prev, [goalId]: "" }));
  };

  const stats = {
    total: goals.length,
    active: goals.filter(g => g.status === 'active').length,
    completed: goals.filter(g => g.status === 'completed').length,
    averageProgress: goals.length > 0 ? 
      goals.reduce((sum, goal) => sum + parseFloat(goal.progress || "0"), 0) / goals.length : 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'active': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'paused': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default: return '';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className={`${isMobile ? 'space-y-4 p-4' : 'space-y-8'}`} data-testid="page-goals-loading">
        <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between gap-4'}`}>
          <div className="space-y-2">
            <Skeleton className={`${isMobile ? 'h-7 w-20' : 'h-9 w-28'}`} />
            <Skeleton className={`h-4 ${isMobile ? 'w-56' : 'w-80'}`} />
          </div>
          <Skeleton className={`${isMobile ? 'h-10 w-full mt-2' : 'h-10 w-36'}`} />
        </div>
        
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'gap-4 md:grid-cols-4'}`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={`stat-${i}`} />
          ))}
        </div>
        
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'gap-6 md:grid-cols-2 lg:grid-cols-3'}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <GoalCardSkeleton key={`goal-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`${isMobile ? 'space-y-4 p-4' : 'space-y-8'}`} data-testid="page-goals">
        <div className={isMobile ? 'text-center' : ''}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`} data-testid="text-page-title">
            Goals
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Nurture your dreams and celebrate your journey
          </p>
        </div>
        <AuthRequiredState />
      </div>
    );
  }

  if (error && !('status' in error && error.status === 401)) {
    return (
      <div className={`${isMobile ? 'space-y-4 p-4' : 'space-y-8'}`} data-testid="page-goals">
        <div className={isMobile ? 'text-center' : ''}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`} data-testid="text-page-title">
            Goals
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Nurture your dreams and celebrate your journey
          </p>
        </div>
        <ErrorState onRetry={() => refetch()} isRetrying={isRefetching} />
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'space-y-4 p-4' : 'space-y-8'}`} data-testid="page-goals">
      <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between gap-4'}`}>
        <div className={isMobile ? 'text-center' : ''}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`} data-testid="text-page-title">
            Goals
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Nurture your dreams and celebrate your journey with AI support
          </p>
        </div>
        <div className={`flex ${isMobile ? 'justify-center' : ''} gap-2`}>
          <FeatureErrorBoundary featureName="AI Goal Wizard">
            <AIGoalWizard />
          </FeatureErrorBoundary>
          <GoalForm>
            <Button variant="outline" data-testid="button-create-goal">
              <Target className="mr-2 h-4 w-4" />
              Quick Goal
            </Button>
          </GoalForm>
        </div>
      </div>

      <FeatureErrorBoundary featureName="Goals">
      {goals.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'gap-4 md:grid-cols-4'}`}>
            <Card data-testid="stat-total-goals">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-total-goals">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Your goal collection</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-active-goals">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-active-goals">{stats.active}</div>
                <p className="text-xs text-muted-foreground">Currently working on</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-completed-goals">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-completed-goals">{stats.completed}</div>
                <p className="text-xs text-muted-foreground">Successfully achieved</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-average-progress">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-avg-progress">{stats.averageProgress.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">Across all goals</p>
              </CardContent>
            </Card>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'gap-6 md:grid-cols-2 lg:grid-cols-3'}`} data-testid="goals-grid">
            {goals.map((goal) => (
              <Card 
                key={goal.id} 
                className={`hover-elevate transition-all ${goal.status === 'completed' ? 'border-green-500/30' : ''}`}
                data-testid={`card-goal-${goal.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <CardTitle className="text-lg leading-tight truncate" data-testid={`text-goal-title-${goal.id}`}>
                        {goal.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant="outline"
                          className={`text-xs ${getStatusColor(goal.status)}`}
                          data-testid={`badge-status-${goal.id}`}
                        >
                          {goal.status === 'completed' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {goal.status === 'active' && <Play className="mr-1 h-3 w-3" />}
                          {goal.status === 'paused' && <Pause className="mr-1 h-3 w-3" />}
                          {goal.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${goal.id}`}>
                          {goal.category}
                        </Badge>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="shrink-0"
                          aria-label={`Options for ${goal.title}`}
                          aria-haspopup="menu"
                          data-testid={`button-goal-menu-${goal.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Goal options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <GoalForm goal={goal}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid={`menuitem-edit-${goal.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Goal
                          </DropdownMenuItem>
                        </GoalForm>
                        
                        {goal.status === 'active' && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => updateStatusMutation.mutate({ goalId: goal.id, status: 'paused' })}
                              data-testid={`menuitem-pause-${goal.id}`}
                            >
                              <Pause className="mr-2 h-4 w-4" />
                              Pause Goal
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => completeGoalMutation.mutate(goal.id)}
                              className="text-green-600"
                              data-testid={`menuitem-complete-${goal.id}`}
                            >
                              <Trophy className="mr-2 h-4 w-4" />
                              Mark Complete
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {goal.status === 'paused' && (
                          <DropdownMenuItem 
                            onClick={() => updateStatusMutation.mutate({ goalId: goal.id, status: 'active' })}
                            data-testid={`menuitem-resume-${goal.id}`}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Resume Goal
                          </DropdownMenuItem>
                        )}
                        
                        {goal.status === 'completed' && (
                          <DropdownMenuItem 
                            onClick={() => updateStatusMutation.mutate({ goalId: goal.id, status: 'active' })}
                            data-testid={`menuitem-reactivate-${goal.id}`}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                              data-testid={`menuitem-delete-${goal.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Goal
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle data-testid="dialog-delete-title">Delete this goal?</AlertDialogTitle>
                              <AlertDialogDescription data-testid="dialog-delete-description">
                                This action cannot be undone. This will permanently delete your goal
                                and all associated progress data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteGoalMutation.mutate(goal.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid="button-confirm-delete"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-goal-description-${goal.id}`}>
                    {goal.description || goal.targetOutcome}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium" data-testid={`text-progress-label-${goal.id}`}>
                        {parseFloat(goal.progress || "0").toFixed(0)}% Complete
                      </span>
                      {goal.status === 'active' && (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            placeholder="%"
                            value={progressInput[goal.id] || ""}
                            onChange={(e) => setProgressInput(prev => ({ ...prev, [goal.id]: e.target.value }))}
                            className="h-7 w-14 text-xs text-center"
                            min="0"
                            max="100"
                            aria-label="Progress percentage"
                            data-testid={`input-progress-${goal.id}`}
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleProgressUpdate(goal.id)}
                            disabled={updateProgressMutation.isPending}
                            aria-label="Update progress"
                            data-testid={`button-update-progress-${goal.id}`}
                          >
                            Set
                          </Button>
                        </div>
                      )}
                    </div>
                    <Progress 
                      value={parseFloat(goal.progress || "0")} 
                      className={`h-2 ${goal.status === 'completed' ? '[&>div]:bg-green-500' : ''}`}
                      aria-label={`Goal progress: ${parseFloat(goal.progress || "0").toFixed(0)}%`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={parseFloat(goal.progress || "0")}
                      data-testid={`progress-bar-${goal.id}`} 
                    />
                  </div>

                  <SubGoalsSection
                    goalId={goal.id}
                    isExpanded={expandedGoals.has(goal.id)}
                    onToggle={() => toggleGoalExpanded(goal.id)}
                    newSubGoalInput={newSubGoalInputs[goal.id] || ""}
                    onNewSubGoalInputChange={(value) => setNewSubGoalInputs(prev => ({ ...prev, [goal.id]: value }))}
                    onAddSubGoal={() => handleAddSubGoal(goal.id)}
                    onCompleteSubGoal={(subGoalId) => completeSubGoalMutation.mutate({ subGoalId, goalId: goal.id })}
                    onDeleteSubGoal={(subGoalId) => deleteSubGoalMutation.mutate({ subGoalId, goalId: goal.id })}
                    isAddingSubGoal={createSubGoalMutation.isPending}
                  />

                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span data-testid={`text-created-date-${goal.id}`}>
                        {format(new Date(goal.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    {goal.completedAt ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                        <Trophy className="h-3 w-3" />
                        <span data-testid={`text-completed-date-${goal.id}`}>
                          {format(new Date(goal.completedAt), "MMM d")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {goal.status === 'active' ? (
                          <Clock className="h-3 w-3" />
                        ) : (
                          <Pause className="h-3 w-3" />
                        )}
                        <span className="capitalize" data-testid={`text-status-${goal.id}`}>{goal.status}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
      </FeatureErrorBoundary>
    </div>
  );
}
