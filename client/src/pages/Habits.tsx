import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Target,
  Check,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  Flame,
  Calendar,
  BarChart3,
  Grid3x3,
  List,
  Search,
  Filter,
  Clock,
  Heart,
  Brain,
  Dumbbell,
  Book,
  Sparkles,
  LogIn,
  UserX,
  AlertCircle,
  RefreshCw,
  Rocket,
  Star,
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  Circle,
  Zap
} from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Habit {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  frequency: string;
  targetDays: number[];
  targetCount: number;
  reminderTime?: string;
  reminderEnabled: boolean;
  category: string;
  tags: string[];
  difficulty: string;
  xpReward: number;
  isActive: boolean;
  isPaused: boolean;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  rhythmScore: string;
  createdAt: string;
  updatedAt: string;
  completedToday?: boolean;
}

interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number;
  rhythmScore: string;
  last30DaysCompletions: number;
  recentCompletions: any[];
}

const habitFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  icon: z.string().default("Target"),
  color: z.string().default("#3B82F6"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  frequency: z.string().default("daily"),
  reminderTime: z.string().optional(),
  reminderEnabled: z.boolean().default(false),
});

type HabitFormValues = z.infer<typeof habitFormSchema>;

const categories = [
  { value: "health", label: "Health", icon: Heart, color: "#EF4444" },
  { value: "productivity", label: "Productivity", icon: Target, color: "#3B82F6" },
  { value: "learning", label: "Learning", icon: Book, color: "#8B5CF6" },
  { value: "mindfulness", label: "Mindfulness", icon: Brain, color: "#10B981" },
  { value: "fitness", label: "Fitness", icon: Dumbbell, color: "#F59E0B" },
];

const habitTemplates = [
  { title: "Morning Meditation", category: "mindfulness", icon: "Brain", difficulty: "easy", xpReward: 10 },
  { title: "Daily Exercise", category: "fitness", icon: "Dumbbell", difficulty: "medium", xpReward: 15 },
  { title: "Read 30 Minutes", category: "learning", icon: "Book", difficulty: "easy", xpReward: 10 },
  { title: "Drink 8 Glasses of Water", category: "health", icon: "Heart", difficulty: "easy", xpReward: 10 },
  { title: "Practice Coding", category: "productivity", icon: "Target", difficulty: "medium", xpReward: 15 },
];

function CircularProgress({ 
  value, 
  size = 48, 
  strokeWidth = 4,
  showCheck = false,
  color = "hsl(var(--primary))"
}: { 
  value: number; 
  size?: number; 
  strokeWidth?: number;
  showCheck?: boolean;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div 
      className="relative" 
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${value}% complete`}
    >
      <svg width={size} height={size} className="transform -rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {showCheck && value >= 100 && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.3 }}
        >
          <Check className="h-5 w-5 text-primary" aria-hidden="true" />
        </motion.div>
      )}
    </div>
  );
}

function AnimatedStreakCounter({ streak, isAnimating }: { streak: number; isAnimating?: boolean }) {
  return (
    <motion.div 
      className="flex items-center gap-1.5"
      animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        animate={streak > 0 ? { 
          scale: [1, 1.1, 1],
          rotate: [0, -5, 5, 0]
        } : {}}
        transition={{ 
          duration: 0.5, 
          repeat: streak > 0 ? Infinity : 0, 
          repeatDelay: 2 
        }}
      >
        <Flame className={cn(
          "h-4 w-4 transition-colors",
          streak > 0 ? "text-orange-500" : "text-muted-foreground"
        )} />
      </motion.div>
      <span className="font-bold tabular-nums">{streak}</span>
      <span className="text-muted-foreground text-xs">day{streak !== 1 ? "s" : ""}</span>
    </motion.div>
  );
}

function TimeOfDayIndicator({ reminderTime }: { reminderTime?: string }) {
  const getTimeOfDay = () => {
    if (!reminderTime) return null;
    const hour = parseInt(reminderTime.split(":")[0], 10);
    if (hour >= 5 && hour < 12) return { icon: Sun, label: "Morning", color: "text-amber-500" };
    if (hour >= 12 && hour < 17) return { icon: Sunset, label: "Afternoon", color: "text-orange-500" };
    return { icon: Moon, label: "Evening", color: "text-indigo-500" };
  };

  const timeInfo = getTimeOfDay();
  if (!timeInfo) return null;

  const Icon = timeInfo.icon;
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="indicator-time-of-day">
      <Icon className={cn("h-3 w-3", timeInfo.color)} />
      <span>{timeInfo.label}</span>
    </div>
  );
}

function HabitCard({ 
  habit, 
  onCheck, 
  onEdit, 
  onDelete, 
  onViewStats,
  isChecking,
  isCompact = false
}: { 
  habit: Habit;
  onCheck: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewStats: () => void;
  isChecking: boolean;
  isCompact?: boolean;
}) {
  const [justCompleted, setJustCompleted] = useState(false);
  const categoryInfo = categories.find(c => c.value === habit.category);
  const CategoryIcon = categoryInfo?.icon || Sparkles;
  
  const handleCheck = () => {
    if (!habit.completedToday && !isChecking) {
      setJustCompleted(true);
      onCheck();
      setTimeout(() => setJustCompleted(false), 1000);
    }
  };

  const completionProgress = habit.completedToday ? 100 : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={cn(
          "relative overflow-visible transition-all duration-300",
          habit.completedToday && "ring-2 ring-primary/20 bg-primary/5",
          isCompact && "py-2"
        )}
        data-testid={`card-habit-${habit.id}`}
      >
        <div 
          className="absolute top-0 left-0 h-full w-1 rounded-l-lg transition-colors"
          style={{ backgroundColor: categoryInfo?.color || habit.color }}
        />
        
        <CardHeader className={cn(
          "flex flex-row items-center justify-between gap-4 pb-2",
          isCompact && "py-2"
        )}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <motion.button
              onClick={handleCheck}
              disabled={habit.completedToday || isChecking}
              className={cn(
                "relative flex-shrink-0 rounded-full p-1 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center",
                habit.completedToday 
                  ? "bg-primary/10 cursor-default" 
                  : "hover:bg-muted cursor-pointer active:scale-95"
              )}
              whileTap={!habit.completedToday ? { scale: 0.9 } : {}}
              aria-label={habit.completedToday ? `${habit.title} completed` : `Mark ${habit.title} as complete`}
              aria-pressed={habit.completedToday}
              data-testid={`button-circle-check-${habit.id}`}
            >
              <CircularProgress 
                value={completionProgress} 
                size={40}
                strokeWidth={3}
                showCheck={habit.completedToday}
                color={categoryInfo?.color || habit.color}
              />
              {!habit.completedToday && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg">{habit.icon}</span>
                </div>
              )}
            </motion.button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn(
                  "font-semibold truncate transition-all",
                  habit.completedToday && "line-through text-muted-foreground"
                )}>
                  {habit.title}
                </h3>
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: `${categoryInfo?.color}20`,
                    color: categoryInfo?.color
                  }}
                >
                  {categoryInfo?.label}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <AnimatedStreakCounter streak={habit.currentStreak} isAnimating={justCompleted} />
                <TimeOfDayIndicator reminderTime={habit.reminderTime} />
                {habit.reminderTime && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="indicator-next-due">
                    <Clock className="h-3 w-3" />
                    <span>{habit.reminderTime}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge 
              variant={habit.difficulty === "easy" ? "secondary" : habit.difficulty === "hard" ? "destructive" : "default"}
              className="hidden sm:flex"
            >
              <Zap className="h-3 w-3 mr-1" />
              {habit.xpReward} XP
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="min-h-[44px] min-w-[44px]" 
                  aria-label={`Options for ${habit.title}`}
                  aria-haspopup="menu"
                  data-testid={`button-menu-${habit.id}`}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit} data-testid={`menu-edit-${habit.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewStats} data-testid={`menu-stats-${habit.id}`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Stats
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive"
                  data-testid={`menu-delete-${habit.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {!isCompact && habit.description && (
          <CardContent className="pt-0 pb-3">
            <p className="text-sm text-muted-foreground line-clamp-2">{habit.description}</p>
          </CardContent>
        )}

        {!isCompact && (
          <CardContent className="pt-0">
            <motion.div
              initial={false}
              animate={justCompleted ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Button
                className={cn(
                  "w-full transition-all min-h-[44px]",
                  habit.completedToday && "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                variant={habit.completedToday ? "ghost" : "default"}
                onClick={handleCheck}
                disabled={habit.completedToday || isChecking}
                data-testid={`button-check-${habit.id}`}
              >
                <AnimatePresence mode="wait">
                  {habit.completedToday ? (
                    <motion.div
                      key="completed"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Completed Today
                    </motion.div>
                  ) : (
                    <motion.div
                      key="mark"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2"
                    >
                      <Circle className="h-4 w-4" />
                      Mark Complete
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}

function CompletionSummary({ completed, total }: { completed: number; total: number }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return (
    <motion.div 
      className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      data-testid="summary-daily-completion"
    >
      <CircularProgress value={percentage} size={36} strokeWidth={3} />
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums" data-testid="text-completion-count">
            {completed}/{total}
          </span>
          <span className="text-muted-foreground text-sm">completed today</span>
        </div>
        <motion.div 
          className="h-1.5 bg-muted rounded-full overflow-hidden mt-1"
          style={{ width: 120 }}
        >
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function Habits() {
  const { t } = useTranslation();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [statsHabit, setStatsHabit] = useState<Habit | null>(null);
  const [deleteHabitId, setDeleteHabitId] = useState<string | null>(null);
  const [isCompactMode, setIsCompactMode] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isMobile) {
      setView("list");
    }
  }, [isMobile]);

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "productivity",
      icon: "Target",
      color: "#3B82F6",
      difficulty: "medium",
      frequency: "daily",
      reminderEnabled: false,
    },
  });

  const { data: habits = [], isLoading, error: habitsError, refetch, isRefetching } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (error && 'status' in error && error.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: rhythmData } = useQuery<{ rhythmScore: number }>({
    queryKey: ["/api/habits/rhythm-score"],
    enabled: isAuthenticated,
  });

  const { data: habitStats } = useQuery<HabitStats>({
    queryKey: ["/api/habits", statsHabit?.id, "stats"],
    enabled: !!statsHabit,
  });

  const createHabitMutation = useMutation({
    mutationFn: async (data: HabitFormValues) => {
      return apiRequest("/api/habits", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          xpReward: data.difficulty === "easy" ? 10 : data.difficulty === "medium" ? 15 : 20,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setShowAddDialog(false);
      form.reset();
      toast({
        title: t('habits.habitCreated'),
        description: t('habits.habitCreatedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create habit",
        variant: "destructive",
      });
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Habit> }) => {
      return apiRequest(`/api/habits/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setEditingHabit(null);
      toast({
        title: t('habits.habitUpdated'),
        description: t('habits.habitUpdatedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update habit",
        variant: "destructive",
      });
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/habits/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setDeleteHabitId(null);
      toast({
        title: t('habits.habitDeleted'),
        description: t('habits.habitDeletedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete habit",
        variant: "destructive",
      });
    },
  });

  const checkHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      return apiRequest(`/api/habits/${habitId}/check`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    onSuccess: (_, habitId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      const habit = habits.find(h => h.id === habitId);
      toast({
        title: t('habits.habitCompleted'),
        description: t('habits.xpEarned', { xp: habit?.xpReward || 10 }),
      });
    },
    onError: (error: any) => {
      if (error.message?.includes("already completed")) {
        toast({
          title: "Already Completed",
          description: "You've already completed this habit today!",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to check habit",
          variant: "destructive",
        });
      }
    },
  });

  const handleCreateHabit = (data: HabitFormValues) => {
    createHabitMutation.mutate(data);
  };

  const handleFormSubmit = () => {
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0) {
      toast({
        title: "Please fix form errors",
        description: Object.values(errors).map((e: any) => e?.message).join(', '),
        variant: "destructive",
      });
      return;
    }
    form.handleSubmit(editingHabit ? handleUpdateHabit : handleCreateHabit)();
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    form.reset({
      title: habit.title,
      description: habit.description || "",
      category: habit.category,
      icon: habit.icon,
      color: habit.color,
      difficulty: habit.difficulty as "easy" | "medium" | "hard",
      frequency: habit.frequency,
      reminderTime: habit.reminderTime,
      reminderEnabled: habit.reminderEnabled,
    });
    setShowAddDialog(true);
  };

  const handleUpdateHabit = (data: HabitFormValues) => {
    if (editingHabit) {
      updateHabitMutation.mutate({ id: editingHabit.id, data });
    }
  };

  const filteredHabits = habits.filter(habit => {
    const matchesCategory = selectedCategory === "all" || habit.category === selectedCategory;
    const matchesSearch = habit.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && habit.isActive;
  });

  const todaysHabits = filteredHabits;

  const stats = {
    total: habits.filter(h => h.isActive).length,
    completedToday: habits.filter(h => h.completedToday).length,
    totalStreak: habits.reduce((sum, h) => sum + h.currentStreak, 0),
    rhythmScore: rhythmData?.rhythmScore || 0,
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6" data-testid="page-habits">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6 p-4 md:p-6" data-testid="page-habits">
        <div>
          <h1 className="text-3xl font-bold">Habits</h1>
          <p className="text-muted-foreground">Build better habits, one day at a time</p>
        </div>
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
                Please sign in to view and manage your habits. Your progress will be saved securely.
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
      </div>
    );
  }

  if (habitsError && !('status' in habitsError && habitsError.status === 401)) {
    return (
      <div className="space-y-6 p-4 md:p-6" data-testid="page-habits">
        <div>
          <h1 className="text-3xl font-bold">Habits</h1>
          <p className="text-muted-foreground">Build better habits, one day at a time</p>
        </div>
        <Card className="text-center py-12" data-testid="error-state-habits">
          <CardContent className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold" data-testid="text-error-title">
                Unable to Load Habits
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto" data-testid="text-error-description">
                We couldn't fetch your habits right now. This might be a temporary issue.
              </p>
            </div>
            <Button 
              onClick={() => refetch()} 
              disabled={isRefetching}
              data-testid="button-retry-load"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              {isRefetching ? 'Retrying...' : 'Try Again'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="page-habits">
      <FeatureErrorBoundary featureName="Habits Tracking">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Habits</h1>
            <p className="text-muted-foreground">Build better habits, one day at a time</p>
          </div>
          <div className="flex items-center gap-3">
            <CompletionSummary completed={stats.completedToday} total={stats.total} />
            <Button 
              onClick={() => {
                setEditingHabit(null);
                form.reset();
                setShowAddDialog(true);
              }}
              className="min-h-[44px]"
              data-testid="button-add-habit"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Habit</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.1 }}
          >
            <Card data-testid="stat-active-habits">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Habits</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold" 
                  data-testid="text-active-habits"
                  key={stats.total}
                  initial={shouldReduceMotion ? false : { scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {stats.total}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.15 }}
          >
            <Card data-testid="stat-completed-habits">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold" 
                  data-testid="text-completed-today"
                  key={stats.completedToday}
                  initial={shouldReduceMotion ? false : { scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {stats.completedToday}
                </motion.div>
                <motion.div 
                  className="mt-2 h-2 bg-muted rounded-full overflow-hidden"
                  initial={shouldReduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={shouldReduceMotion ? false : { width: 0 }}
                    animate={{ width: `${(stats.completedToday / Math.max(stats.total, 1)) * 100}%` }}
                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
                  />
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2 }}
          >
            <Card data-testid="stat-total-streak">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Streak</CardTitle>
                <Flame className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold flex items-center gap-1" 
                  data-testid="text-total-streak"
                  key={stats.totalStreak}
                  initial={shouldReduceMotion ? false : { scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {stats.totalStreak}
                  <span className="text-sm font-normal text-muted-foreground">days</span>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.25 }}
          >
            <Card data-testid="stat-rhythm-score">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rhythm Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold" 
                  data-testid="text-rhythm-score"
                  key={stats.rhythmScore}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {stats.rhythmScore}%
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-[280px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search habits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 min-h-[44px]"
                aria-label="Search habits"
                data-testid="input-search-habits"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px] sm:w-[160px] min-h-[44px]" data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            {filteredHabits.length > 5 && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm text-muted-foreground" id="compact-mode-label">Compact</span>
                <Switch
                  checked={isCompactMode}
                  onCheckedChange={setIsCompactMode}
                  aria-labelledby="compact-mode-label"
                  data-testid="switch-compact-mode"
                />
              </div>
            )}
            <Button
              variant={view === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setView("grid")}
              className="min-h-[44px] min-w-[44px]"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              data-testid="button-view-grid"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setView("list")}
              className="min-h-[44px] min-w-[44px]"
              aria-label="List view"
              aria-pressed={view === "list"}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {habits.length === 0 && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : undefined}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Get Started with Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {habitTemplates.map((template, idx) => {
                  const cat = categories.find(c => c.value === template.category);
                  return (
                    <motion.div
                      key={idx}
                      whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-auto py-3 min-h-[56px]"
                        onClick={() => {
                          form.reset({
                            title: template.title,
                            category: template.category,
                            icon: template.icon,
                            difficulty: template.difficulty as "easy" | "medium" | "hard",
                            color: cat?.color || "#3B82F6",
                            frequency: "daily",
                            reminderEnabled: false,
                          });
                          setShowAddDialog(true);
                        }}
                        data-testid={`button-template-${idx}`}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${cat?.color}20` }}
                        >
                          {template.icon}
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{template.title}</div>
                          <div className="text-xs text-muted-foreground">{cat?.label}</div>
                        </div>
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {filteredHabits.length === 0 && habits.length > 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No habits found matching your filters.</p>
            <Button 
              variant="ghost" 
              onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
              className="mt-2"
              data-testid="button-clear-filters"
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div 
          className={cn(
            view === "grid" 
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" 
              : "flex flex-col gap-3"
          )}
          layout={!shouldReduceMotion}
        >
          <AnimatePresence mode="popLayout">
            {filteredHabits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onCheck={() => checkHabitMutation.mutate(habit.id)}
                onEdit={() => handleEditHabit(habit)}
                onDelete={() => setDeleteHabitId(habit.id)}
                onViewStats={() => setStatsHabit(habit)}
                isChecking={checkHabitMutation.isPending}
                isCompact={isCompactMode}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      </FeatureErrorBoundary>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setEditingHabit(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-habit-form">
          <DialogHeader>
            <DialogTitle>{editingHabit ? "Edit Habit" : "Create New Habit"}</DialogTitle>
            <DialogDescription>
              {editingHabit ? "Update your habit details" : "Set up a new habit to track"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(editingHabit ? handleUpdateHabit : handleCreateHabit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Morning Meditation" {...field} className="min-h-[44px]" data-testid="input-habit-title" />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add any notes or details..." {...field} data-testid="input-habit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="min-h-[44px]" data-testid="select-habit-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                {cat.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="min-h-[44px]" data-testid="select-habit-difficulty">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="easy">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3 w-3 text-green-500" />
                              Easy (10 XP)
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3 w-3 text-yellow-500" />
                              Medium (15 XP)
                            </div>
                          </SelectItem>
                          <SelectItem value="hard">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3 w-3 text-red-500" />
                              Hard (20 XP)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon (Emoji)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Target" {...field} className="min-h-[44px]" data-testid="input-habit-icon" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2 items-center">
                          <Input type="color" {...field} className="w-12 h-[44px] p-1 cursor-pointer" data-testid="input-habit-color" />
                          <Input 
                            value={field.value} 
                            onChange={field.onChange}
                            className="flex-1 min-h-[44px]"
                            placeholder="#3B82F6"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Enable Reminder</FormLabel>
                  <p className="text-sm text-muted-foreground">Get notified to complete this habit</p>
                </div>
                <FormField
                  control={form.control}
                  name="reminderEnabled"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-reminder-enabled"
                      />
                    </FormControl>
                  )}
                />
              </div>

              {form.watch("reminderEnabled") && (
                <FormField
                  control={form.control}
                  name="reminderTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="min-h-[44px]" data-testid="input-reminder-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="min-h-[44px]"
                  data-testid="button-cancel-habit"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  disabled={createHabitMutation.isPending || updateHabitMutation.isPending}
                  onClick={handleFormSubmit}
                  className="min-h-[44px]"
                  data-testid="button-save-habit"
                >
                  {createHabitMutation.isPending || updateHabitMutation.isPending ? "Saving..." : (editingHabit ? "Update Habit" : "Create Habit")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statsHabit} onOpenChange={(open) => !open && setStatsHabit(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-habit-stats">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{statsHabit?.icon}</span>
              {statsHabit?.title} Stats
            </DialogTitle>
          </DialogHeader>
          {habitStats && (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-2xl font-bold flex items-center gap-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <Flame className="h-5 w-5 text-orange-500" />
                      {habitStats.currentStreak}
                    </motion.div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-2xl font-bold flex items-center gap-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
                    >
                      <Star className="h-5 w-5 text-yellow-500" />
                      {habitStats.longestStreak}
                    </motion.div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Completions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-2xl font-bold flex items-center gap-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      {habitStats.totalCompletions}
                    </motion.div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">30-Day Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Completion Rate</span>
                      <span className="font-semibold">{habitStats.completionRate}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${habitStats.completionRate}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {habitStats.last30DaysCompletions} completions in the last 30 days
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteHabitId} onOpenChange={(open) => !open && setDeleteHabitId(null)}>
        <AlertDialogContent data-testid="dialog-delete-habit">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habit?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your habit and all its completion history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]" data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteHabitId && deleteHabitMutation.mutate(deleteHabitId)}
              className="bg-destructive hover:bg-destructive/90 min-h-[44px]"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
