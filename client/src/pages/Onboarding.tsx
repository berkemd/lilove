import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Target, 
  Heart, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  Brain,
  Zap,
  Trophy
} from 'lucide-react';
import logoUrl from '@/assets/logo.svg';

const steps = [
  {
    id: 1,
    title: 'Welcome to LiLove!',
    description: 'Let\'s personalize your growth journey',
    icon: Heart
  },
  {
    id: 2,
    title: 'What\'s Your Goal?',
    description: 'Tell us what you want to achieve',
    icon: Target
  },
  {
    id: 3,
    title: 'Customize Your Avatar',
    description: 'Choose your virtual companion',
    icon: Sparkles
  },
  {
    id: 4,
    title: 'All Set!',
    description: 'Your journey begins now',
    icon: Trophy
  }
];

const avatarPresets = [
  { id: 'warrior', name: 'Warrior', emoji: '⚔️', color: 'from-red-500 to-orange-500' },
  { id: 'sage', name: 'Sage', emoji: '🧙‍♂️', color: 'from-purple-500 to-blue-500' },
  { id: 'explorer', name: 'Explorer', emoji: '🗺️', color: 'from-green-500 to-teal-500' },
  { id: 'innovator', name: 'Innovator', emoji: '💡', color: 'from-yellow-500 to-pink-500' }
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, login } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    displayName: '',
    primaryGoal: '',
    motivation: '',
    avatarPreset: 'warrior'
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Update user profile with onboarding data
      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(onboardingData)
      });

      if (response.ok) {
        toast({
          title: 'Welcome aboard! 🎉',
          description: 'You\'ve earned 1000 welcome coins!'
        });
        
        // Refresh user data
        if (login) {
          await login();
        }
        
        setLocation('/dashboard');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to complete onboarding. Please try again.'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred. Please try again.'
      });
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return onboardingData.displayName && onboardingData.primaryGoal;
      case 2:
        return onboardingData.avatarPreset;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: index === currentStep ? 1.2 : 1,
                    backgroundColor: index <= currentStep 
                      ? 'rgb(147, 51, 234)' 
                      : 'rgb(229, 231, 235)'
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                >
                  {index < currentStep ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </motion.div>
                {index < steps.length - 1 && (
                  <div className="w-12 sm:w-24 h-1 mx-2 bg-gray-200 dark:bg-gray-700 rounded">
                    <motion.div
                      initial={false}
                      animate={{
                        width: index < currentStep ? '100%' : '0%'
                      }}
                      className="h-full bg-purple-600 rounded"
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 shadow-xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  {currentStep === 0 ? (
                    <img src={logoUrl} alt="LiLove" className="h-16 w-16" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      {(() => {
                        const StepIcon = steps[currentStep].icon;
                        return StepIcon ? <StepIcon className="h-8 w-8 text-white" /> : null;
                      })()}
                    </div>
                  )}
                </div>
                <CardTitle className="text-2xl sm:text-3xl">
                  {steps[currentStep].title}
                </CardTitle>
                <CardDescription className="text-base">
                  {steps[currentStep].description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 0: Welcome */}
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <p className="text-center text-gray-600 dark:text-gray-400">
                      We're excited to help you achieve your goals! Let's get started by setting up your profile.
                    </p>
                    <div className="grid grid-cols-3 gap-4 py-4">
                      <div className="text-center">
                        <Brain className="h-10 w-10 mx-auto mb-2 text-purple-600" />
                        <p className="text-sm font-medium">AI Coaching</p>
                      </div>
                      <div className="text-center">
                        <Zap className="h-10 w-10 mx-auto mb-2 text-pink-600" />
                        <p className="text-sm font-medium">Gamification</p>
                      </div>
                      <div className="text-center">
                        <Trophy className="h-10 w-10 mx-auto mb-2 text-blue-600" />
                        <p className="text-sm font-medium">Achievements</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: Goals */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="displayName">What should we call you?</Label>
                      <Input
                        id="displayName"
                        placeholder="Your name"
                        value={onboardingData.displayName}
                        onChange={(e) => setOnboardingData({ ...onboardingData, displayName: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="primaryGoal">What's your primary goal?</Label>
                      <Input
                        id="primaryGoal"
                        placeholder="e.g., Build better habits, Learn new skills"
                        value={onboardingData.primaryGoal}
                        onChange={(e) => setOnboardingData({ ...onboardingData, primaryGoal: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="motivation">What motivates you? (Optional)</Label>
                      <Textarea
                        id="motivation"
                        placeholder="Share what drives you..."
                        value={onboardingData.motivation}
                        onChange={(e) => setOnboardingData({ ...onboardingData, motivation: e.target.value })}
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Avatar */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <p className="text-center text-gray-600 dark:text-gray-400">
                      Choose your avatar archetype. You can customize it later!
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {avatarPresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setOnboardingData({ ...onboardingData, avatarPreset: preset.id })}
                          className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                            onboardingData.avatarPreset === preset.id
                              ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 scale-105'
                              : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                          }`}
                        >
                          <div className={`text-6xl mb-3 bg-gradient-to-br ${preset.color} bg-clip-text`}>
                            {preset.emoji}
                          </div>
                          <p className="font-semibold text-lg">{preset.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Complete */}
                {currentStep === 3 && (
                  <div className="space-y-6 text-center">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity
                      }}
                    >
                      <Trophy className="h-24 w-24 mx-auto text-yellow-500" />
                    </motion.div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">You're All Set, {onboardingData.displayName}!</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        You've earned <span className="font-bold text-yellow-600">1000 welcome coins</span> to start your journey!
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Your goal: <span className="font-semibold">{onboardingData.primaryGoal}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className={currentStep === 0 ? 'invisible' : ''}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  
                  {currentStep < steps.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleComplete}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Start My Journey
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
