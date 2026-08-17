import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

import { 
  Target, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  Calendar,
  Zap,
  Brain,
  ListTodo,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Plus,
  Leaf
} from 'lucide-react';

import { GoalPlanTimeline, type GeneratedPlan } from './GoalPlanTimeline';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'goal', title: 'Your Goal', description: 'What do you want to achieve?', icon: <Target className="w-5 h-5" /> },
  { id: 'outcome', title: 'Desired Outcome', description: 'What does success look like?', icon: <CheckCircle2 className="w-5 h-5" /> },
  { id: 'timeframe', title: 'Timeframe', description: 'When do you want to achieve this?', icon: <Calendar className="w-5 h-5" /> },
  { id: 'availability', title: 'Availability', description: 'How much time can you dedicate?', icon: <Clock className="w-5 h-5" /> },
  { id: 'style', title: 'Working Style', description: 'How do you prefer to work?', icon: <Brain className="w-5 h-5" /> },
  { id: 'review', title: 'AI Plan', description: 'Review your personalized plan', icon: <Sparkles className="w-5 h-5" /> },
];

interface GoalWizardData {
  title: string;
  description: string;
  category: string;
  desiredOutcome: string;
  timeframeDays: number;
  hoursPerWeek: number;
  workingStyle: 'daily_small' | 'weekly_large' | 'mixed';
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'flexible';
  dependencies: string;
}

interface AIGoalWizardProps {
  children?: React.ReactNode;
  onSuccess?: () => void;
}

export function AIGoalWizard({ children, onSuccess }: AIGoalWizardProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const { toast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [wizardData, setWizardData] = useState<GoalWizardData>({
    title: '',
    description: '',
    category: 'personal',
    desiredOutcome: '',
    timeframeDays: 30,
    hoursPerWeek: 5,
    workingStyle: 'mixed',
    preferredTime: 'flexible',
    dependencies: '',
  });

  const updateData = useCallback((field: keyof GoalWizardData, value: any) => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  }, []);

  const generatePlanMutation = useMutation({
    mutationFn: async (data: GoalWizardData): Promise<GeneratedPlan> => {
      const response = await fetch('/api/ai-goals/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to generate plan');
      }
      return response.json();
    },
    onSuccess: (plan) => {
      setGeneratedPlan(plan);
      setIsGenerating(false);
      trackEvent('ai_goal_plan_generated', {
        category: wizardData.category,
        timeframe_days: wizardData.timeframeDays,
        hours_per_week: wizardData.hoursPerWeek,
        milestones_count: plan.milestones.length,
        tasks_count: plan.tasks.length,
      });
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast({
        title: 'Plan Generation Failed',
        description: error.message || 'Failed to generate your personalized plan. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (plan: GeneratedPlan) => {
      const response = await fetch('/api/ai-goals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          goalData: wizardData,
          plan,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save goal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: 'Goal Created Successfully',
        description: 'Your personalized action plan is ready. Start making progress today!',
      });
      trackEvent('ai_goal_created', {
        category: wizardData.category,
        milestones_count: generatedPlan?.milestones.length || 0,
        tasks_count: generatedPlan?.tasks.length || 0,
      });
      handleClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error Saving Goal',
        description: error.message || 'Failed to save your goal. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setOpen(false);
    setCurrentStep(0);
    setGeneratedPlan(null);
    setIsGenerating(false);
    setWizardData({
      title: '',
      description: '',
      category: 'personal',
      desiredOutcome: '',
      timeframeDays: 30,
      hoursPerWeek: 5,
      workingStyle: 'mixed',
      preferredTime: 'flexible',
      dependencies: '',
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return wizardData.title.length >= 3;
      case 1: return wizardData.desiredOutcome.length >= 10;
      case 2: return wizardData.timeframeDays >= 7;
      case 3: return wizardData.hoursPerWeek >= 1;
      case 4: return true;
      default: return true;
    }
  };

  const handleNext = async () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      if (currentStep === 4) {
        setIsGenerating(true);
        setCurrentStep(5);
        generatePlanMutation.mutate(wizardData);
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      if (currentStep === 5) {
        setGeneratedPlan(null);
      }
      setCurrentStep(prev => prev - 1);
    }
  };

  const handlePlanUpdate = (updatedPlan: GeneratedPlan) => {
    setGeneratedPlan(updatedPlan);
  };

  const handleSavePlan = () => {
    if (generatedPlan) {
      savePlanMutation.mutate(generatedPlan);
    }
  };

  const progressPercent = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {children || (
          <Button data-testid="button-ai-goal-wizard">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Goal Wizard
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>AI Goal Wizard</DialogTitle>
              <DialogDescription>
                Let me help you create a personalized action plan
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-shrink-0 py-4">
          <nav aria-label="Goal wizard progress" className="flex items-center gap-2 mb-2">
            {WIZARD_STEPS.map((step, index) => (
              <div 
                key={step.id}
                className={cn(
                  "flex items-center gap-1",
                  index <= currentStep ? "text-primary" : "text-muted-foreground"
                )}
                role="listitem"
              >
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    index < currentStep && "bg-primary text-primary-foreground",
                    index === currentStep && "bg-primary/20 text-primary border-2 border-primary",
                    index > currentStep && "bg-muted text-muted-foreground"
                  )}
                  aria-current={index === currentStep ? "step" : undefined}
                  aria-label={`Step ${index + 1}: ${step.title}${index < currentStep ? ' (completed)' : index === currentStep ? ' (current)' : ''}`}
                >
                  {index < currentStep ? <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> : index + 1}
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-8 transition-colors hidden sm:block",
                    index < currentStep ? "bg-primary" : "bg-muted"
                  )} aria-hidden="true" />
                )}
              </div>
            ))}
          </nav>
          <Progress 
            value={progressPercent} 
            className="h-1" 
            aria-label={`Step ${currentStep + 1} of ${WIZARD_STEPS.length}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          />
        </div>

        <ScrollArea className="flex-1 px-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
              className="space-y-6 pb-4"
            >
              {currentStep === 0 && (
                <StepGoal data={wizardData} updateData={updateData} />
              )}
              {currentStep === 1 && (
                <StepOutcome data={wizardData} updateData={updateData} />
              )}
              {currentStep === 2 && (
                <StepTimeframe data={wizardData} updateData={updateData} />
              )}
              {currentStep === 3 && (
                <StepAvailability data={wizardData} updateData={updateData} />
              )}
              {currentStep === 4 && (
                <StepStyle data={wizardData} updateData={updateData} />
              )}
              {currentStep === 5 && (
                <StepPlanReview 
                  isGenerating={isGenerating}
                  plan={generatedPlan}
                  onPlanUpdate={handlePlanUpdate}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </ScrollArea>

        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0 || isGenerating}
            data-testid="button-wizard-back"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 5 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isGenerating}
                data-testid="button-wizard-next"
              >
                {currentStep === 4 ? (
                  <>
                    Generate Plan
                    <Sparkles className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSavePlan}
                disabled={!generatedPlan || savePlanMutation.isPending}
                data-testid="button-save-plan"
              >
                {savePlanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Start This Journey
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StepProps {
  data: GoalWizardData;
  updateData: (field: keyof GoalWizardData, value: any) => void;
}

function StepGoal({ data, updateData }: StepProps) {
  const categories = [
    { value: 'health', label: 'Health & Fitness', icon: <Zap className="w-4 h-4" /> },
    { value: 'career', label: 'Career & Skills', icon: <Target className="w-4 h-4" /> },
    { value: 'personal', label: 'Personal Growth', icon: <Leaf className="w-4 h-4" /> },
    { value: 'creative', label: 'Creative Projects', icon: <Sparkles className="w-4 h-4" /> },
    { value: 'financial', label: 'Financial Goals', icon: <ListTodo className="w-4 h-4" /> },
    { value: 'relationships', label: 'Relationships', icon: <Brain className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">What's your goal?</h3>
        <p className="text-muted-foreground">
          Start with a clear, specific goal you want to achieve
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="goal-title" className="text-sm font-medium">Goal Title</label>
          <Input
            id="goal-title"
            placeholder="e.g., Learn to play guitar, Run a marathon, Launch my side project"
            value={data.title}
            onChange={(e) => updateData('title', e.target.value)}
            aria-describedby="goal-title-hint"
            data-testid="input-goal-title"
          />
          <span id="goal-title-hint" className="sr-only">Enter a specific goal you want to achieve</span>
        </div>

        <div className="space-y-2">
          <label id="category-label" className="text-sm font-medium">Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="radiogroup" aria-labelledby="category-label">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => updateData('category', cat.value)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                  data.category === cat.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
                role="radio"
                aria-checked={data.category === cat.value}
                data-testid={`button-category-${cat.value}`}
              >
                <span aria-hidden="true">{cat.icon}</span>
                <span className="text-sm font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="goal-description" className="text-sm font-medium">Description (Optional)</label>
          <Textarea
            id="goal-description"
            placeholder="Add more details about your goal..."
            value={data.description}
            onChange={(e) => updateData('description', e.target.value)}
            rows={3}
            aria-describedby="goal-desc-hint"
            data-testid="input-goal-description"
          />
          <span id="goal-desc-hint" className="sr-only">Optional additional details about your goal</span>
        </div>
      </div>
    </div>
  );
}

function StepOutcome({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">What does success look like?</h3>
        <p className="text-muted-foreground">
          Describe the specific outcome you want to achieve
        </p>
      </div>

      <div className="space-y-4">
        <Textarea
          placeholder="Be specific! e.g., 'I want to be able to play 5 complete songs on guitar, including chord transitions and basic fingerpicking patterns. I should be comfortable playing in front of friends.'"
          value={data.desiredOutcome}
          onChange={(e) => updateData('desiredOutcome', e.target.value)}
          rows={5}
          aria-label="Describe your desired outcome"
          aria-describedby="outcome-tips"
          data-testid="input-desired-outcome"
        />

        <Card className="bg-muted/50" id="outcome-tips">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
              Tips for a great outcome
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Be specific and measurable</li>
              <li>Include how you'll know you've succeeded</li>
              <li>Think about how achieving this will feel</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <label htmlFor="dependencies-input" className="text-sm font-medium">Dependencies or Resources (Optional)</label>
        <Textarea
          id="dependencies-input"
          placeholder="Any tools, resources, or prerequisites you need? e.g., 'I already have an acoustic guitar. I can practice at home after work.'"
          value={data.dependencies}
          onChange={(e) => updateData('dependencies', e.target.value)}
          rows={2}
          data-testid="input-dependencies"
        />
      </div>
    </div>
  );
}

function StepTimeframe({ data, updateData }: StepProps) {
  const timeframeOptions = [
    { days: 14, label: '2 weeks', description: 'Quick sprint' },
    { days: 30, label: '1 month', description: 'Focused effort' },
    { days: 60, label: '2 months', description: 'Steady progress' },
    { days: 90, label: '3 months', description: 'Quarter goal' },
    { days: 180, label: '6 months', description: 'Major achievement' },
    { days: 365, label: '1 year', description: 'Long-term vision' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">When do you want to achieve this?</h3>
        <p className="text-muted-foreground">
          Choose a realistic timeframe for your goal
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Select timeframe">
        {timeframeOptions.map((option) => (
          <button
            key={option.days}
            onClick={() => updateData('timeframeDays', option.days)}
            className={cn(
              "flex flex-col items-center gap-1 p-4 rounded-lg border transition-all",
              data.timeframeDays === option.days
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
            role="radio"
            aria-checked={data.timeframeDays === option.days}
            data-testid={`button-timeframe-${option.days}`}
          >
            <Calendar className="w-5 h-5 mb-1" aria-hidden="true" />
            <span className="font-semibold">{option.label}</span>
            <span className="text-xs text-muted-foreground">{option.description}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label id="timeframe-slider-label" className="text-sm font-medium">Or set a custom duration: {data.timeframeDays} days</label>
        <Slider
          value={[data.timeframeDays]}
          onValueChange={([value]) => updateData('timeframeDays', value)}
          min={7}
          max={365}
          step={1}
          className="py-4"
          aria-labelledby="timeframe-slider-label"
          aria-valuemin={7}
          aria-valuemax={365}
          aria-valuenow={data.timeframeDays}
          data-testid="slider-timeframe"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 week</span>
          <span>1 year</span>
        </div>
      </div>
    </div>
  );
}

function StepAvailability({ data, updateData }: StepProps) {
  const preferredTimes = [
    { value: 'morning', label: 'Morning', description: 'Before noon' },
    { value: 'afternoon', label: 'Afternoon', description: '12pm - 6pm' },
    { value: 'evening', label: 'Evening', description: 'After 6pm' },
    { value: 'flexible', label: 'Flexible', description: 'Any time' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">How much time can you dedicate?</h3>
        <p className="text-muted-foreground">
          Be realistic - consistency matters more than intensity
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label id="hours-slider-label" className="text-sm font-medium">
            Hours per week: <span className="text-primary font-bold">{data.hoursPerWeek} hours</span>
          </label>
          <Slider
            value={[data.hoursPerWeek]}
            onValueChange={([value]) => updateData('hoursPerWeek', value)}
            min={1}
            max={40}
            step={1}
            className="py-4"
            aria-labelledby="hours-slider-label"
            aria-valuemin={1}
            aria-valuemax={40}
            aria-valuenow={data.hoursPerWeek}
            data-testid="slider-hours"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 hour</span>
            <span>40 hours</span>
          </div>
        </div>

        <div className="space-y-2">
          <label id="preferred-time-label" className="text-sm font-medium">Preferred time to work on this</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="radiogroup" aria-labelledby="preferred-time-label">
            {preferredTimes.map((time) => (
              <button
                key={time.value}
                onClick={() => updateData('preferredTime', time.value)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                  data.preferredTime === time.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
                role="radio"
                aria-checked={data.preferredTime === time.value}
                data-testid={`button-time-${time.value}`}
              >
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm font-medium">{time.label}</span>
                <span className="text-xs text-muted-foreground">{time.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepStyle({ data, updateData }: StepProps) {
  const workingStyles = [
    { 
      value: 'daily_small', 
      label: 'Daily Small Tasks', 
      description: 'Short, focused sessions every day. Great for building habits.',
      example: '15-30 min daily tasks'
    },
    { 
      value: 'weekly_large', 
      label: 'Weekly Deep Work', 
      description: 'Fewer but longer sessions. Ideal for complex projects.',
      example: '2-3 hour weekly blocks'
    },
    { 
      value: 'mixed', 
      label: 'Mixed Approach', 
      description: 'Combination of daily practice and weekly deep work.',
      example: 'Daily habits + weekly milestones'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">How do you prefer to work?</h3>
        <p className="text-muted-foreground">
          Choose a working style that fits your lifestyle
        </p>
      </div>

      <div className="space-y-3" role="radiogroup" aria-label="Select working style">
        {workingStyles.map((style) => (
          <button
            key={style.value}
            onClick={() => updateData('workingStyle', style.value)}
            className={cn(
              "w-full text-left p-4 rounded-lg border transition-all",
              data.workingStyle === style.value
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
            role="radio"
            aria-checked={data.workingStyle === style.value}
            data-testid={`button-style-${style.value}`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-semibold">{style.label}</h4>
                <p className="text-sm text-muted-foreground">{style.description}</p>
                <Badge variant="secondary" className="mt-2">{style.example}</Badge>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                data.workingStyle === style.value
                  ? "border-primary bg-primary"
                  : "border-muted-foreground"
              )}>
                {data.workingStyle === style.value && (
                  <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface StepPlanReviewProps {
  isGenerating: boolean;
  plan: GeneratedPlan | null;
  onPlanUpdate: (plan: GeneratedPlan) => void;
}

function StepPlanReview({ isGenerating, plan, onPlanUpdate }: StepPlanReviewProps) {
  const shouldReduceMotion = useReducedMotion();
  
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <motion.div
          className="relative"
          animate={shouldReduceMotion ? undefined : { rotate: 360 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary" />
        </motion.div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Creating Your Personalized Plan</h3>
          <p className="text-muted-foreground">
            Our AI is analyzing your goals and crafting the perfect action plan...
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>This usually takes a few seconds</span>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No plan generated yet.</p>
      </div>
    );
  }

  return <GoalPlanTimeline plan={plan} onPlanUpdate={onPlanUpdate} />;
}
