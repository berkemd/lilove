import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import appIconUrl from '@/assets/app-icon.png';
import { 
  ArrowLeft,
  ArrowRight,
  Heart,
  Sparkles,
  Brain,
  Target,
  Briefcase,
  Dumbbell,
  Users,
  Flower2,
  Eye,
  BookOpen,
  Gamepad2,
  MessageCircle,
  Clock,
  Zap,
  Sun,
  Moon,
  Coffee,
  Rocket,
  TreeDeciduous,
  Leaf,
  TreePine,
  Sprout,
  Check,
  Star
} from 'lucide-react';

interface OnboardingData {
  displayName: string;
  goalCategories: string[];
  learningStyle: string;
  dailyTimeCommitment: number;
  preferredCoachingStyle: string;
  preferredPace: string;
  difficultyPreference: string;
}

const GOAL_CATEGORIES = [
  { id: 'career', label: 'Career Growth', icon: Briefcase, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'health', label: 'Health & Fitness', icon: Dumbbell, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { id: 'relationships', label: 'Relationships', icon: Heart, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  { id: 'mindfulness', label: 'Mindfulness', icon: Flower2, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'learning', label: 'Learning & Skills', icon: BookOpen, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { id: 'social', label: 'Social & Community', icon: Users, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
];

const LEARNING_STYLES = [
  { id: 'visual', label: 'Visual', description: 'Charts, diagrams & illustrations', icon: Eye, color: 'text-violet-500' },
  { id: 'reading', label: 'Reading', description: 'Articles, guides & written content', icon: BookOpen, color: 'text-blue-500' },
  { id: 'challenges', label: 'Challenges', description: 'Gamified tasks & achievements', icon: Gamepad2, color: 'text-orange-500' },
  { id: 'community', label: 'Community', description: 'Group activities & discussions', icon: MessageCircle, color: 'text-green-500' },
];

const TIME_COMMITMENTS = [
  { value: 5, label: '5 min', description: 'Quick daily check-in' },
  { value: 15, label: '15 min', description: 'Focused growth time' },
  { value: 30, label: '30 min', description: 'Deep practice session' },
  { value: 60, label: '1 hour', description: 'Comprehensive growth' },
];

const COACHING_STYLES = [
  { id: 'supportive', label: 'Warm & Supportive', description: 'Gentle encouragement and positive affirmations', icon: Heart, color: 'text-pink-500' },
  { id: 'challenging', label: 'Direct & Challenging', description: 'Push your limits with honest feedback', icon: Zap, color: 'text-yellow-500' },
  { id: 'balanced', label: 'Balanced Approach', description: 'Adaptive coaching that meets you where you are', icon: Target, color: 'text-primary' },
];

const AI_TRAITS = [
  { trait: 'Empathetic', description: 'Understands your emotions' },
  { trait: 'Insightful', description: 'Provides deep wisdom' },
  { trait: 'Adaptive', description: 'Learns your style' },
  { trait: 'Encouraging', description: 'Celebrates your wins' },
];

function GrowingPlantProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = currentStep / (totalSteps - 1);
  
  const getPlantStage = () => {
    if (progress === 0) return { icon: Sprout, label: 'Seed', color: 'text-green-400' };
    if (progress < 0.33) return { icon: Leaf, label: 'Seedling', color: 'text-green-500' };
    if (progress < 0.66) return { icon: TreePine, label: 'Sapling', color: 'text-green-600' };
    if (progress < 1) return { icon: TreeDeciduous, label: 'Growing', color: 'text-green-700' };
    return { icon: TreeDeciduous, label: 'Flourishing', color: 'text-green-700' };
  };
  
  const stage = getPlantStage();
  const PlantIcon = stage.icon;
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <motion.div
          key={currentStep}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative"
        >
          <PlantIcon className={`h-8 w-8 ${stage.color}`} />
          {progress === 1 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="h-4 w-4 text-yellow-400" />
            </motion.div>
          )}
        </motion.div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{stage.label}</span>
          <span>Step {currentStep + 1} of {totalSteps}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            x: Math.random() * 400 - 200,
            y: Math.random() * 400,
            opacity: 0.3,
          }}
          animate={{
            y: [null, -100],
            opacity: [0.3, 0.6, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeOut',
          }}
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${60 + Math.random() * 30}%`,
          }}
        >
          <Sparkles className="h-3 w-3 text-primary/40" />
        </motion.div>
      ))}
    </div>
  );
}

function WelcomeStep({ 
  data, 
  setData 
}: { 
  data: OnboardingData; 
  setData: (data: OnboardingData) => void;
}) {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!data.displayName && user?.displayName) {
      setData({ ...data, displayName: user.displayName });
    }
  }, [user, data.displayName]);
  
  return (
    <div className="space-y-6 text-center">
      <FloatingParticles />
      
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="relative mx-auto w-24 h-24"
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-xl">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            <img src={appIconUrl} alt="LiLove" className="w-16 h-16 object-contain" />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute -bottom-2 -right-2"
        >
          <Heart className="h-8 w-8 text-pink-500 fill-pink-500" />
        </motion.div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-2"
      >
        <h2 className="text-2xl sm:text-3xl font-bold">Welcome to LiLove</h2>
        <p className="text-muted-foreground">
          Your journey of love, growth, and self-discovery begins here.
        </p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3 pt-4"
      >
        <Label htmlFor="name" className="text-left block">What should we call you?</Label>
        <Input
          id="name"
          value={data.displayName}
          onChange={(e) => setData({ ...data, displayName: e.target.value })}
          placeholder="Enter your name"
          className="text-lg h-12"
          data-testid="input-onboarding-name"
        />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-3 gap-3 pt-4"
      >
        {[
          { icon: Target, label: 'Set Goals' },
          { icon: Brain, label: 'AI Coaching' },
          { icon: Sparkles, label: 'Grow Together' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            className="flex flex-col items-center p-3 rounded-lg bg-muted/50"
          >
            <item.icon className="h-6 w-6 text-primary mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function GoalsStep({ 
  data, 
  setData 
}: { 
  data: OnboardingData; 
  setData: (data: OnboardingData) => void;
}) {
  const toggleCategory = (id: string) => {
    const categories = data.goalCategories.includes(id)
      ? data.goalCategories.filter(c => c !== id)
      : [...data.goalCategories, id];
    setData({ ...data, goalCategories: categories });
  };
  
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
          <Target className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">What brings you here?</h2>
        <p className="text-muted-foreground text-sm">
          Select all the areas you'd like to focus on
        </p>
      </motion.div>
      
      <div className="grid grid-cols-2 gap-3">
        {GOAL_CATEGORIES.map((category, index) => {
          const Icon = category.icon;
          const isSelected = data.goalCategories.includes(category.id);
          
          return (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleCategory(category.id)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
              data-testid={`category-${category.id}`}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2"
                >
                  <Check className="h-4 w-4 text-primary" />
                </motion.div>
              )}
              <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center mb-2`}>
                <Icon className={`h-5 w-5 ${category.color}`} />
              </div>
              <p className="font-medium text-sm">{category.label}</p>
            </motion.button>
          );
        })}
      </div>
      
      {data.goalCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap gap-2 justify-center pt-2"
        >
          {data.goalCategories.map(id => {
            const cat = GOAL_CATEGORIES.find(c => c.id === id);
            return cat ? (
              <Badge key={id} variant="secondary" className="text-xs">
                {cat.label}
              </Badge>
            ) : null;
          })}
        </motion.div>
      )}
    </div>
  );
}

function LearningStyleStep({ 
  data, 
  setData 
}: { 
  data: OnboardingData; 
  setData: (data: OnboardingData) => void;
}) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mb-4">
          <Eye className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">How do you prefer to grow?</h2>
        <p className="text-muted-foreground text-sm">
          We'll customize your experience based on your learning style
        </p>
      </motion.div>
      
      <div className="space-y-3">
        {LEARNING_STYLES.map((style, index) => {
          const Icon = style.icon;
          const isSelected = data.learningStyle === style.id;
          
          return (
            <motion.button
              key={style.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setData({ ...data, learningStyle: style.id })}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
              data-testid={`learning-style-${style.id}`}
            >
              <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${
                isSelected ? 'bg-primary/10' : ''
              }`}>
                <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : style.color}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium">{style.label}</p>
                <p className="text-sm text-muted-foreground">{style.description}</p>
              </div>
              {isSelected && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="h-5 w-5 text-primary" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function PaceStep({ 
  data, 
  setData 
}: { 
  data: OnboardingData; 
  setData: (data: OnboardingData) => void;
}) {
  const getTimeIcon = () => {
    if (data.dailyTimeCommitment <= 5) return Coffee;
    if (data.dailyTimeCommitment <= 15) return Sun;
    if (data.dailyTimeCommitment <= 30) return Moon;
    return Rocket;
  };
  
  const TimeIcon = getTimeIcon();
  
  const getClosestTime = () => {
    return TIME_COMMITMENTS.reduce((prev, curr) => 
      Math.abs(curr.value - data.dailyTimeCommitment) < Math.abs(prev.value - data.dailyTimeCommitment) 
        ? curr 
        : prev
    );
  };
  
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <motion.div 
          key={data.dailyTimeCommitment}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center mb-4"
        >
          <TimeIcon className="h-8 w-8 text-white" />
        </motion.div>
        <h2 className="text-xl sm:text-2xl font-bold">Set your pace</h2>
        <p className="text-muted-foreground text-sm">
          How much time can you dedicate to growth each day?
        </p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-6"
      >
        <div className="text-center">
          <motion.div
            key={data.dailyTimeCommitment}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold text-primary"
          >
            {data.dailyTimeCommitment} min
          </motion.div>
          <p className="text-sm text-muted-foreground mt-1">
            {getClosestTime().description}
          </p>
        </div>
        
        <div className="px-4">
          <Slider
            value={[data.dailyTimeCommitment]}
            onValueChange={([value]) => setData({ ...data, dailyTimeCommitment: value })}
            min={5}
            max={60}
            step={5}
            className="w-full"
            data-testid="slider-time-commitment"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>5 min</span>
            <span>1 hour</span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 pt-4">
          {TIME_COMMITMENTS.map((time, index) => (
            <motion.button
              key={time.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              onClick={() => setData({ ...data, dailyTimeCommitment: time.value })}
              className={`p-3 rounded-lg text-center transition-all ${
                data.dailyTimeCommitment === time.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 hover:bg-muted'
              }`}
              data-testid={`time-${time.value}`}
            >
              <span className="text-sm font-medium">{time.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function CoachStep({ 
  data, 
  setData 
}: { 
  data: OnboardingData; 
  setData: (data: OnboardingData) => void;
}) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <motion.div 
          className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg"
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(139, 92, 246, 0.3)',
              '0 0 40px rgba(139, 92, 246, 0.5)',
              '0 0 20px rgba(139, 92, 246, 0.3)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Brain className="h-10 w-10 text-white" />
        </motion.div>
        <h2 className="text-xl sm:text-2xl font-bold">Meet Lila, Your AI Coach</h2>
        <p className="text-muted-foreground text-sm">
          I'm here to guide and support your growth journey
        </p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3"
      >
        {AI_TRAITS.map((item, index) => (
          <motion.div
            key={item.trait}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/10"
          >
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{item.trait}</span>
            </div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </motion.div>
        ))}
      </motion.div>
      
      <div className="space-y-3">
        <p className="text-sm font-medium text-center">How would you like me to coach you?</p>
        {COACHING_STYLES.map((style, index) => {
          const Icon = style.icon;
          const isSelected = data.preferredCoachingStyle === style.id;
          
          return (
            <motion.button
              key={style.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              onClick={() => setData({ ...data, preferredCoachingStyle: style.id })}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
              data-testid={`coaching-style-${style.id}`}
            >
              <Icon className={`h-6 w-6 ${style.color}`} />
              <div className="flex-1">
                <p className="font-medium text-sm">{style.label}</p>
                <p className="text-xs text-muted-foreground">{style.description}</p>
              </div>
              {isSelected && <Check className="h-5 w-5 text-primary" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function SanctuaryStep({ data }: { data: OnboardingData }) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <motion.div 
          className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg overflow-hidden relative"
        >
          <TreeDeciduous className="h-10 w-10 text-white" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20"
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </motion.div>
        <h2 className="text-xl sm:text-2xl font-bold">Your Sanctuary Awaits</h2>
        <p className="text-muted-foreground text-sm">
          A peaceful space that grows with you
        </p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 p-6 border border-green-500/20"
      >
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}
              style={{
                left: `${20 + i * 15}%`,
                bottom: 0,
              }}
            >
              <Leaf className="h-6 w-6 text-green-500/30" />
            </motion.div>
          ))}
        </div>
        
        <div className="relative text-center space-y-4">
          <div className="flex justify-center gap-3">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Sprout className="h-8 w-8 text-green-400" />
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <TreePine className="h-10 w-10 text-green-500" />
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <TreeDeciduous className="h-12 w-12 text-green-600" />
            </motion.div>
          </div>
          
          <div>
            <p className="font-medium">Your Growth Garden</p>
            <p className="text-sm text-muted-foreground">
              Watch your forest flourish as you complete goals
            </p>
          </div>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        <p className="text-sm font-medium text-center">Your personalized setup:</p>
        <div className="space-y-2">
          {data.displayName && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Heart className="h-4 w-4 text-pink-500" />
              <span className="text-sm">Welcome, {data.displayName}!</span>
            </div>
          )}
          {data.goalCategories.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm">{data.goalCategories.length} focus areas selected</span>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-sm">{data.dailyTimeCommitment} min daily commitment</span>
          </div>
          {data.learningStyle && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Eye className="h-4 w-4 text-violet-500" />
              <span className="text-sm capitalize">{data.learningStyle} learning style</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function OnboardingFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [currentStep, setCurrentStep] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(0);
  
  const [data, setData] = useState<OnboardingData>({
    displayName: user?.displayName || '',
    goalCategories: [],
    learningStyle: 'visual',
    dailyTimeCommitment: 15,
    preferredCoachingStyle: 'balanced',
    preferredPace: 'medium',
    difficultyPreference: 'incremental',
  });
  
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/auth/user/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: data.displayName,
          onboardingCompleted: true,
        }),
      });
      
      await apiRequest('/api/auth/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          goalCategories: data.goalCategories,
          dailyTimeCommitment: data.dailyTimeCommitment,
          learningStyle: data.learningStyle,
          preferredPace: data.preferredPace,
          difficultyPreference: data.difficultyPreference,
          preferredCoachingStyle: data.preferredCoachingStyle,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Welcome to LiLove!',
        description: 'Your personalized growth journey begins now.',
      });
    },
    onError: () => {
      toast({
        title: 'Something went wrong',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  const steps = [
    { component: <WelcomeStep data={data} setData={setData} /> },
    { component: <GoalsStep data={data} setData={setData} /> },
    { component: <LearningStyleStep data={data} setData={setData} /> },
    { component: <PaceStep data={data} setData={setData} /> },
    { component: <CoachStep data={data} setData={setData} /> },
    { component: <SanctuaryStep data={data} /> },
  ];
  
  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return data.displayName.trim().length > 0;
      case 1:
        return data.goalCategories.length > 0;
      default:
        return true;
    }
  };
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setSwipeDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboardingMutation.mutate();
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setSwipeDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSkip = () => {
    const defaultData = {
      ...data,
      displayName: data.displayName || user?.displayName || user?.email?.split('@')[0] || 'Friend',
    };
    setData(defaultData);
    completeOnboardingMutation.mutate();
  };
  
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const threshold = 50;
    const velocity = 0.5;
    
    if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      if (currentStep < steps.length - 1 && canProceed()) {
        handleNext();
      }
    } else if (info.offset.x > threshold || info.velocity.x > velocity) {
      if (currentStep > 0) {
        handleBack();
      }
    }
  }, [currentStep, canProceed]);
  
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-4 sm:p-6">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src={appIconUrl} alt="LiLove" className="w-8 h-8 rounded-lg" />
            <span className="font-bold">LiLove</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={completeOnboardingMutation.isPending}
            data-testid="button-skip-onboarding"
          >
            Skip
          </Button>
        </header>
        
        <div className="mb-6">
          <GrowingPlantProgress currentStep={currentStep} totalSteps={steps.length} />
        </div>
        
        <Card className="flex-1 border-0 shadow-xl bg-card/80 backdrop-blur overflow-hidden">
          <CardContent className="p-4 sm:p-6 h-full">
            <AnimatePresence mode="wait" custom={swipeDirection}>
              <motion.div
                key={currentStep}
                custom={swipeDirection}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                drag={isMobile ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className="touch-pan-y"
              >
                {steps[currentStep].component}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
        
        <footer className="mt-6 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0 || completeOnboardingMutation.isPending}
            className="min-w-[100px]"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {isMobile && (
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStep 
                      ? 'w-4 bg-primary' 
                      : i < currentStep 
                        ? 'w-1.5 bg-primary/50' 
                        : 'w-1.5 bg-muted'
                  }`}
                />
              ))}
            </div>
          )}
          
          <Button
            onClick={handleNext}
            disabled={!canProceed() || completeOnboardingMutation.isPending}
            className="min-w-[100px]"
            data-testid="button-next"
          >
            {currentStep === steps.length - 1 ? (
              <>
                {completeOnboardingMutation.isPending ? 'Starting...' : 'Get Started'}
                <Rocket className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </footer>
      </div>
    </div>
  );
}
