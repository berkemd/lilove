import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackEvent } from "@/lib/analytics";
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  Clock,
  Target,
  TrendingUp,
  Filter,
  Search,
  Play,
  Pause,
  Square,
  CheckCircle2,
  Edit,
  Trash2,
  Timer,
  AlertCircle,
  LogIn,
  UserX,
  RefreshCw,
  Rocket,
  Sparkles,
  Star
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

// Task form validation schema
const taskFormSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  goalId: z.string().min(1, 'Please select a goal'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  estimatedDuration: z.coerce.number().min(5, 'Minimum 5 minutes').max(480, 'Maximum 8 hours'),
  dueDate: z.string().optional(),
  type: z.enum(['learning', 'practice', 'project', 'assessment', 'milestone'])
});

type TaskFormData = z.infer<typeof taskFormSchema>;

// Timer component
function TaskTimer({ task, onUpdate }: { task: any; onUpdate: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer state mutations
  const startTimer = useMutation({
    mutationFn: (taskId: string) => 
      apiRequest(`/api/tasks/${taskId}/timer/start`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/timer/active'] });
      toast({ title: t('tasks.timerStarted') });
      onUpdate();
    },
    onError: () => {
      toast({ title: t('tasks.failedToStartTimer'), variant: 'destructive' });
    }
  });

  const pauseTimer = useMutation({
    mutationFn: (taskId: string) => 
      apiRequest(`/api/tasks/${taskId}/timer/pause`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/timer/active'] });
      toast({ title: t('tasks.timerPaused') });
      onUpdate();
    }
  });

  const resumeTimer = useMutation({
    mutationFn: (taskId: string) => 
      apiRequest(`/api/tasks/${taskId}/timer/resume`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/timer/active'] });
      toast({ title: t('tasks.timerResumed') });
      onUpdate();
    }
  });

  const stopTimer = useMutation({
    mutationFn: (taskId: string) => 
      apiRequest(`/api/tasks/${taskId}/timer/stop`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/timer/active'] });
      toast({ title: t('tasks.timerStopped') });
      onUpdate();
    }
  });

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (task.isTimerRunning && task.startedAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const startTime = new Date(task.startedAt).getTime();
        const elapsed = Math.floor((now - startTime) / 1000 / 60); // minutes
        setElapsedTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [task.isTimerRunning, task.startedAt]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const totalTime = (task.timeSpent || 0) + (task.isTimerRunning ? elapsedTime : 0);

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-muted-foreground min-w-[60px]">
        {formatTime(totalTime)}
      </div>
      
      {task.isTimerRunning ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => pauseTimer.mutate(task.id)}
            disabled={pauseTimer.isPending}
            aria-label="Pause timer"
            data-testid={`button-pause-timer-${task.id}`}
          >
            <Pause className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => stopTimer.mutate(task.id)}
            disabled={stopTimer.isPending}
            aria-label="Stop timer"
            data-testid={`button-stop-timer-${task.id}`}
          >
            <Square className="w-4 h-4" />
          </Button>
        </>
      ) : task.pausedAt ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => resumeTimer.mutate(task.id)}
          disabled={resumeTimer.isPending}
          aria-label="Resume timer"
          data-testid={`button-resume-timer-${task.id}`}
        >
          <Play className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => startTimer.mutate(task.id)}
          disabled={startTimer.isPending}
          aria-label="Start timer"
          data-testid={`button-start-timer-${task.id}`}
        >
          <Play className="w-4 h-4" />
        </Button>
      )}
      
      {task.isTimerRunning && (
        <div className="flex items-center text-sm text-green-600" role="status" aria-live="polite">
          <Timer className="w-3 h-3 mr-1" aria-hidden="true" />
          <span>{t('tasks.running')}</span>
          <span className="sr-only">{t('tasks.timerRunning')}</span>
        </div>
      )}
    </div>
  );
}

// Task creation/editing form
function TaskForm({ task, onClose, onSuccess }: { task?: any; onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch goals for selection
  const { data: goals = [] } = useQuery<any[]>({
    queryKey: ['/api/goals'],
  });
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      goalId: task?.goalId || '',
      priority: task?.priority || 'medium',
      estimatedDuration: task?.estimatedDuration || 60,
      dueDate: task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      type: task?.type || 'project'
    }
  });

  const createTask = useMutation({
    mutationFn: (data: TaskFormData) => 
      apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: t('tasks.taskCreated') });
      onClose();
      onSuccess();
    },
    onError: () => {
      toast({ title: t('tasks.failedToCreateTask'), variant: 'destructive' });
    }
  });

  const updateTask = useMutation({
    mutationFn: (data: TaskFormData) => 
      apiRequest(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: t('tasks.taskUpdated') });
      onClose();
      onSuccess();
    },
    onError: () => {
      toast({ title: t('tasks.failedToUpdateTask'), variant: 'destructive' });
    }
  });

  const onSubmit = (data: TaskFormData) => {
    const taskData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined
    };
    
    if (task) {
      updateTask.mutate(taskData);
    } else {
      createTask.mutate(taskData);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('tasks.taskTitle')}</FormLabel>
              <FormControl>
                <Input placeholder={t('tasks.enterTaskTitle')} {...field} data-testid="input-task-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('goals.description')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('tasks.taskDescription')} {...field} data-testid="input-task-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="goalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('tasks.linkedGoal')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-task-goal">
                    <SelectValue placeholder={t('tasks.selectGoal')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {goals.map((goal: any) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('tasks.priority')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-task-priority">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">{t('goals.low')}</SelectItem>
                    <SelectItem value="medium">{t('goals.medium')}</SelectItem>
                    <SelectItem value="high">{t('goals.high')}</SelectItem>
                    <SelectItem value="urgent">{t('tasks.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estimatedDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('tasks.estimatedDuration')}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="5" 
                    max="480" 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value)} 
                    data-testid="input-task-duration"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('tasks.type')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-task-type">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="learning">{t('tasks.learning')}</SelectItem>
                    <SelectItem value="practice">{t('tasks.practice')}</SelectItem>
                    <SelectItem value="project">{t('tasks.project')}</SelectItem>
                    <SelectItem value="assessment">{t('tasks.assessment')}</SelectItem>
                    <SelectItem value="milestone">{t('tasks.milestone')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('tasks.dueDate')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-task-due-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-task">
            {t('common.cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={createTask.isPending || updateTask.isPending}
            data-testid="button-save-task"
          >
            {task ? t('tasks.updateTask') : t('tasks.createTask')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AuthRequiredState() {
  const { t } = useTranslation();
  return (
    <Card className="text-center py-12" data-testid="auth-required-state">
      <CardContent className="space-y-4">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <UserX className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold" data-testid="text-auth-required-title">
            {t('tasks.signInRequired')}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto" data-testid="text-auth-required-description">
            {t('tasks.signInToViewTasks')}
          </p>
        </div>
        <Button 
          onClick={() => window.location.href = '/auth'}
          data-testid="button-login-redirect"
        >
          <LogIn className="mr-2 h-4 w-4" />
          {t('auth.signIn')}
        </Button>
      </CardContent>
    </Card>
  );
}

function TasksErrorState({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  const { t } = useTranslation();
  return (
    <Card className="text-center py-12" data-testid="error-state-tasks">
      <CardContent className="space-y-4">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold" data-testid="text-error-title">
            {t('tasks.unableToLoadTasks')}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto" data-testid="text-error-description">
            {t('tasks.couldNotFetchTasks')}
          </p>
        </div>
        <Button 
          onClick={onRetry} 
          disabled={isRetrying}
          data-testid="button-retry-load"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? t('tasks.retrying') : t('common.retry')}
        </Button>
      </CardContent>
    </Card>
  );
}

function TasksEmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="text-center py-16 border-dashed" data-testid="empty-state-tasks">
      <CardContent className="space-y-6">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-primary/20 rounded-full flex items-center justify-center">
            <CheckSquare className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-xl font-semibold" data-testid="text-empty-title">
            {t('tasks.readyToGetThingsDone')}
          </h3>
          <p className="text-muted-foreground" data-testid="text-empty-description">
            {t('tasks.createFirstTaskDescription')}
          </p>
        </div>

        <Button size="lg" onClick={onCreateClick} data-testid="button-create-first-task">
          <Rocket className="mr-2 h-4 w-4" />
          {t('tasks.createYourFirstTask')}
        </Button>

        <div className="pt-6 border-t mt-6">
          <p className="text-sm text-muted-foreground mb-4">{t('tasks.whyTrackTasks')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Timer className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">{t('tasks.timeTracking')}</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">{t('tasks.progressInsights')}</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">{t('tasks.goalAlignment')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Tasks() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  // Fetch tasks with current filters
  const { data: tasksData, isLoading: isLoadingTasks, error: tasksError, refetch, isRefetching } = useQuery<{ tasks: any[]; totalCount: number }>({
    queryKey: ['/api/tasks', { status: statusFilter, priority: priorityFilter, limit: 100 }],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (error && 'status' in error && error.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Fetch active timer
  const { data: activeTimer, refetch: refetchActiveTimer } = useQuery<any>({
    queryKey: ['/api/tasks/timer/active'],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Fetch goals for display
  const { data: goals = [] } = useQuery<any[]>({
    queryKey: ['/api/goals'],
    enabled: isAuthenticated,
  });

  const tasks = tasksData?.tasks || [];
  const totalTasks = tasksData?.totalCount || 0;

  // Delete task mutation
  const deleteTask = useMutation({
    mutationFn: (taskId: string) => 
      apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: t('tasks.taskDeleted') });
    },
    onError: () => {
      toast({ title: t('tasks.failedToDeleteTask'), variant: 'destructive' });
    }
  });

  // Complete task mutation
  const completeTask = useMutation({
    mutationFn: (taskId: string) => 
      apiRequest(`/api/tasks/${taskId}/complete`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: t('tasks.taskCompleted') });
    },
    onError: () => {
      toast({ title: t('tasks.failedToCompleteTask'), variant: 'destructive' });
    }
  });

  // Filter tasks based on active tab and search
  const getFilteredTasks = () => {
    let filtered = tasks;

    // Filter by tab
    if (activeTab === 'today') {
      const today = new Date();
      filtered = tasks.filter((task: any) => 
        task.dueDate && new Date(task.dueDate).toDateString() === today.toDateString()
      );
    } else if (activeTab === 'upcoming') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = tasks.filter((task: any) => 
        task.dueDate && new Date(task.dueDate) > new Date()
      );
    } else if (activeTab === 'completed') {
      filtered = tasks.filter((task: any) => task.status === 'completed');
    } else if (activeTab === 'active') {
      filtered = tasks.filter((task: any) => task.status === 'active');
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((task: any) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  // Get task statistics
  const getTaskStats = () => {
    const tasksToStats = tasks || [];
    const totalTasks = tasksToStats.length;
    const completedTasks = tasksToStats.filter((task: any) => task.status === 'completed').length;
    const activeTasks = tasksToStats.filter((task: any) => task.status === 'active').length;
    const pendingTasks = tasksToStats.filter((task: any) => task.status === 'pending').length;
    
    const totalTimeSpent = tasksToStats.reduce((acc: number, task: any) => acc + (task.timeSpent || 0), 0);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
      totalTasks,
      completedTasks,
      activeTasks,
      pendingTasks,
      totalTimeSpent,
      completionRate
    };
  };

  const stats = getTaskStats();

  // Priority color mapping
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 border-green-600';
      case 'active':
        return 'text-blue-600 border-blue-600';
      case 'pending':
        return 'text-yellow-600 border-yellow-600';
      case 'cancelled':
        return 'text-red-600 border-red-600';
      default:
        return 'text-gray-600 border-gray-600';
    }
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Get goal title for a task
  const getGoalTitle = (goalId: string) => {
    const goal = goals.find((g: any) => g.id === goalId);
    return goal?.title || 'Unknown Goal';
  };

  if (authLoading || isLoadingTasks) {
    return (
      <div className="p-6 space-y-8" data-testid="page-tasks-loading">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={`stat-skel-${i}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`task-skel-${i}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 space-y-8" data-testid="page-tasks">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('tasks.title')}</h1>
          <p className="text-muted-foreground">
            {t('tasks.pageDescription')}
          </p>
        </div>
        <AuthRequiredState />
      </div>
    );
  }

  if (tasksError && !('status' in tasksError && tasksError.status === 401)) {
    return (
      <div className="p-6 space-y-8" data-testid="page-tasks">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('tasks.title')}</h1>
          <p className="text-muted-foreground">
            {t('tasks.pageDescription')}
          </p>
        </div>
        <TasksErrorState onRetry={() => refetch()} isRetrying={isRefetching} />
      </div>
    );
  }

  if (tasks.length === 0 && !searchQuery && !statusFilter && !priorityFilter) {
    return (
      <div className="p-6 space-y-8" data-testid="page-tasks">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('tasks.title')}</h1>
            <p className="text-muted-foreground">
              {t('tasks.pageDescription')}
            </p>
          </div>
        </div>
        <TasksEmptyState onCreateClick={() => setIsCreateDialogOpen(true)} />
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('tasks.createNewTask')}</DialogTitle>
            </DialogHeader>
            <TaskForm 
              onClose={() => setIsCreateDialogOpen(false)}
              onSuccess={() => {
                refetch();
                refetchActiveTimer();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8" data-testid="page-tasks">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('tasks.title')}</h1>
          <p className="text-muted-foreground">
            {t('tasks.pageDescription')}
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-task">
              <Plus className="mr-2 h-4 w-4" />
              {t('tasks.addTask')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('tasks.createNewTask')}</DialogTitle>
            </DialogHeader>
            <TaskForm 
              onClose={() => setIsCreateDialogOpen(false)}
              onSuccess={() => {
                refetch();
                refetchActiveTimer();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Timer Alert */}
      {activeTimer && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Timer className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {t('tasks.timerRunningLabel')}: {activeTimer.title}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t('tasks.goal')}: {getGoalTitle(activeTimer.goalId)}
                  </p>
                </div>
              </div>
              <TaskTimer task={activeTimer} onUpdate={refetchActiveTimer} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <FeatureErrorBoundary featureName="Tasks">
      <div className="grid gap-6 md:grid-cols-4">
        <Card data-testid="stat-total-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('tasks.totalTasks')}</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeTasks} {t('common.active').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-completion-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('tasks.completionRate')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} {t('common.completed').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-total-time">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('tasks.totalTime')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.totalTimeSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {t('tasks.timeLogged')}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-pending-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('tasks.pendingTasks')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">
              {t('tasks.readyToStart')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder={t('tasks.searchTasks')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label={t('tasks.searchTasks')}
            data-testid="input-search-tasks"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
            <SelectValue placeholder={t('tasks.allStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('tasks.allStatus')}</SelectItem>
            <SelectItem value="pending">{t('common.pending')}</SelectItem>
            <SelectItem value="active">{t('common.active')}</SelectItem>
            <SelectItem value="completed">{t('common.completed')}</SelectItem>
            <SelectItem value="cancelled">{t('tasks.cancelled')}</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px]" data-testid="select-priority-filter">
            <SelectValue placeholder={t('tasks.allPriority')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('tasks.allPriority')}</SelectItem>
            <SelectItem value="low">{t('goals.low')}</SelectItem>
            <SelectItem value="medium">{t('goals.medium')}</SelectItem>
            <SelectItem value="high">{t('goals.high')}</SelectItem>
            <SelectItem value="urgent">{t('tasks.urgent')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList aria-label={t('tasks.taskFilters')}>
          <TabsTrigger value="today" aria-controls="panel-today" data-testid="tab-today">{t('common.today')}</TabsTrigger>
          <TabsTrigger value="upcoming" aria-controls="panel-upcoming" data-testid="tab-upcoming">{t('tasks.upcoming')}</TabsTrigger>
          <TabsTrigger value="active" aria-controls="panel-active" data-testid="tab-active">{t('common.active')}</TabsTrigger>
          <TabsTrigger value="completed" aria-controls="panel-completed" data-testid="tab-completed">{t('common.completed')}</TabsTrigger>
          <TabsTrigger value="all" aria-controls="panel-all" data-testid="tab-all">{t('common.all')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} id={`panel-${activeTab}`} className="space-y-4">
          {isLoadingTasks ? (
            // Loading skeleton
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            // Empty state
            <Card>
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <CheckSquare className="w-12 h-12 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium text-lg">{t('tasks.noTasksFound')}</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || statusFilter || priorityFilter
                        ? t('tasks.tryAdjustingFilters')
                        : t('tasks.createFirstTaskToStart')
                      }
                    </p>
                  </div>
                  {!searchQuery && !statusFilter && !priorityFilter && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('tasks.createTask')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            // Task list
            filteredTasks.map((task: any) => (
              <Card key={task.id} className="hover-elevate" data-testid={`task-card-${task.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <Badge 
                          variant={getPriorityColor(task.priority) as any}
                          data-testid={`priority-${task.priority}`}
                        >
                          {task.priority}
                        </Badge>
                        {task.status === 'completed' && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t('common.done')}
                          </Badge>
                        )}
                        {task.isTimerRunning && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            <Timer className="w-3 h-3 mr-1" />
                            {t('tasks.running')}
                          </Badge>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className="text-muted-foreground text-sm">{task.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{t('tasks.goal')}: {getGoalTitle(task.goalId)}</span>
                        {task.estimatedDuration && (
                          <span>{t('tasks.est')}: {formatDuration(task.estimatedDuration)}</span>
                        )}
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(task.status)}>
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TaskTimer task={task} onUpdate={refetch} />
                      
                      {task.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => completeTask.mutate(task.id)}
                          disabled={completeTask.isPending}
                          aria-label="Mark task as complete"
                          data-testid={`button-complete-${task.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label="Edit task"
                            data-testid={`button-edit-${task.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>{t('tasks.editTask')}</DialogTitle>
                          </DialogHeader>
                          <TaskForm 
                            task={task}
                            onClose={() => setEditingTask(null)}
                            onSuccess={() => {
                              setEditingTask(null);
                              refetch();
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this task?')) {
                            deleteTask.mutate(task.id);
                          }
                        }}
                        disabled={deleteTask.isPending}
                        aria-label="Delete task"
                        data-testid={`button-delete-${task.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress bar for non-completed tasks */}
                  {task.status !== 'completed' && task.estimatedDuration && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span id={`progress-label-${task.id}`}>{t('goals.progress')}</span>
                        <span aria-hidden="true">
                          {formatDuration(task.timeSpent || 0)} / {formatDuration(task.estimatedDuration)}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(((task.timeSpent || 0) / task.estimatedDuration) * 100, 100)} 
                        className="h-2"
                        aria-labelledby={`progress-label-${task.id}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(((task.timeSpent || 0) / task.estimatedDuration) * 100, 100)}
                      />
                      <span className="sr-only">
                        {formatDuration(task.timeSpent || 0)} of {formatDuration(task.estimatedDuration)} completed
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
      </FeatureErrorBoundary>
    </div>
  );
}