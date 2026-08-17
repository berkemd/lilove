import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

import {
  Heart,
  Sparkles,
  Brain,
  Target,
  Briefcase,
  Dumbbell,
  Users,
  Flower2,
  BookOpen,
  Palette,
  Clock,
  ArrowRight,
  ArrowLeft,
  Check,
  Star,
  Trophy,
  Rocket,
  PartyPopper,
  Wand2,
  Loader2,
  ChevronRight,
  Sun,
  Moon,
  Sunrise,
  Sunset
} from 'lucide-react';
import appIconUrl from '@/assets/app-icon.png';

const ONBOARDING_STORAGE_KEY = 'lilove_onboarding_completed';

interface OnboardingData {
  name: string;
  growthAreas: string[];
  dailyTimeCommitment: number;
  firstGoalTitle: string;
  firstGoalDescription: string;
}

const GROWTH_AREAS = [
  { id: 'health', label: 'Health & Fitness', labelTr: 'Sağlık & Fitness', icon: Dumbbell, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  { id: 'career', label: 'Career Growth', labelTr: 'Kariyer Gelişimi', icon: Briefcase, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  { id: 'relationships', label: 'Relationships', labelTr: 'İlişkiler', icon: Heart, color: 'text-rose-500', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/30' },
  { id: 'mindfulness', label: 'Mindfulness', labelTr: 'Farkındalık', icon: Flower2, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  { id: 'creativity', label: 'Creativity', labelTr: 'Yaratıcılık', icon: Palette, color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { id: 'learning', label: 'Learning & Skills', labelTr: 'Öğrenme & Beceriler', icon: BookOpen, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
];

const AI_MESSAGES = {
  welcome: [
    "Hi there! I'm Lila, your growth companion. Let's start this beautiful journey together.",
    "Welcome! Every great transformation begins with a single step. I'm here to guide you.",
    "Hello, lovely soul! I'm so excited to help you bloom into your best self."
  ],
  welcomeTr: [
    "Merhaba! Ben Lila, büyüme arkadaşın. Bu güzel yolculuğa birlikte başlayalım.",
    "Hoş geldin! Her büyük dönüşüm tek bir adımla başlar. Sana rehberlik etmek için buradayım.",
    "Merhaba, güzel ruh! En iyi haline dönüşmene yardımcı olmak için çok heyecanlıyım."
  ],
  growthAreas: [
    "These choices will help me personalize your journey. There are no wrong answers!",
    "I love that you're focusing on growth. Select what resonates with your heart.",
    "Your growth areas reflect your beautiful aspirations. Choose what calls to you."
  ],
  growthAreasTr: [
    "Bu seçimler yolculuğunu kişiselleştirmeme yardımcı olacak. Yanlış cevap yok!",
    "Büyümeye odaklanmanı seviyorum. Kalbinle örtüşenleri seç.",
    "Büyüme alanların güzel hedeflerini yansıtıyor. Seni çağıranı seç."
  ],
  timeCommitment: [
    "Even small daily moments create profound change over time. Choose what feels sustainable.",
    "Consistency matters more than intensity. Find your sweet spot!",
    "Your time is precious. Let's make every minute count."
  ],
  timeCommitmentTr: [
    "Küçük günlük anlar bile zamanla derin değişimler yaratır. Sürdürülebilir olanı seç.",
    "Tutarlılık yoğunluktan daha önemlidir. Tatlı noktanı bul!",
    "Zamanın değerli. Her dakikayı değerli kılalım."
  ],
  firstGoal: [
    "Your first goal is special! Let's craft something meaningful together.",
    "This is where dreams become plans. What's calling to your heart right now?",
    "I'll help you break this down into achievable steps. Just share your vision!"
  ],
  firstGoalTr: [
    "İlk hedefin özel! Birlikte anlamlı bir şey yaratalım.",
    "Burası hayallerin planlara dönüştüğü yer. Şu an kalbini ne çağırıyor?",
    "Bunu başarılabilir adımlara ayırmana yardımcı olacağım. Sadece vizyonunu paylaş!"
  ],
  celebration: [
    "You're all set! I'm so proud of you for taking this step. Let's grow together!",
    "Amazing! Your growth journey officially begins now. I'll be with you every step.",
    "Congratulations! You've planted the seeds of transformation. Let's watch them bloom!"
  ],
  celebrationTr: [
    "Hazırsın! Bu adımı attığın için seninle gurur duyuyorum. Birlikte büyüyelim!",
    "Harika! Büyüme yolculuğun resmi olarak şimdi başlıyor. Her adımda yanında olacağım.",
    "Tebrikler! Dönüşümün tohumlarını ektin. Çiçek açmalarını izleyelim!"
  ]
};

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

interface FloatingParticlesProps {
  color?: string;
}

function FloatingParticles({ color = 'text-rose-400/40' }: FloatingParticlesProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
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
            rotate: [0, 360],
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
          <Sparkles className={`h-3 w-3 ${color}`} />
        </motion.div>
      ))}
    </div>
  );
}

function CelebrationConfetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            x: '50%',
            y: '50%',
            scale: 0,
            opacity: 1,
          }}
          animate={{
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            scale: [0, 1, 0.5],
            opacity: [1, 1, 0],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: i * 0.05,
            ease: 'easeOut',
          }}
        >
          {i % 3 === 0 ? (
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          ) : i % 3 === 1 ? (
            <Heart className="h-4 w-4 text-rose-400 fill-rose-400" />
          ) : (
            <Sparkles className="h-3 w-3 text-purple-400" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function AIMessage({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-coral-50 dark:from-rose-900/20 dark:to-orange-900/20 border border-rose-200/50 dark:border-rose-800/30"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center flex-shrink-0 shadow-lg">
        <Brain className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-rose-700 dark:text-rose-300 mb-1">Lila</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      </div>
    </motion.div>
  );
}

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <motion.div
          key={index}
          className={`h-2 rounded-full transition-all duration-300 ${
            index === currentStep
              ? 'w-8 bg-gradient-to-r from-rose-400 to-orange-400'
              : index < currentStep
              ? 'w-2 bg-rose-400'
              : 'w-2 bg-muted'
          }`}
          initial={false}
          animate={{
            scale: index === currentStep ? 1.1 : 1,
          }}
        />
      ))}
    </div>
  );
}

function WelcomeStep({
  data,
  setData,
  language
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  language: string;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!data.name && user?.displayName) {
      setData({ ...data, name: user.displayName });
    }
  }, [user, data.name]);

  const aiMessage = language === 'tr' 
    ? getRandomMessage(AI_MESSAGES.welcomeTr)
    : getRandomMessage(AI_MESSAGES.welcome);

  return (
    <div className="space-y-6 text-center">
      <FloatingParticles color="text-rose-400/40" />
      
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="relative mx-auto w-28 h-28"
      >
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-rose-400 via-orange-400 to-amber-400 flex items-center justify-center shadow-xl shadow-rose-500/30">
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
          <Heart className="h-10 w-10 text-rose-500 fill-rose-500" />
        </motion.div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-2"
      >
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
          {t('aiOnboarding.welcome')}
        </h2>
        <p className="text-muted-foreground">
          {t('aiOnboarding.welcomeSubtitle')}
        </p>
      </motion.div>
      
      <AIMessage message={aiMessage} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3 pt-4"
      >
        <Label htmlFor="name" className="text-left block font-medium">
          {t('aiOnboarding.whatShouldWeCallYou')}
        </Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          placeholder={t('aiOnboarding.enterYourName')}
          className="text-lg h-12 border-rose-200 focus:border-rose-400 dark:border-rose-800 dark:focus:border-rose-600"
          data-testid="input-onboarding-name"
        />
      </motion.div>
    </div>
  );
}

function GrowthAreasStep({
  data,
  setData,
  language
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  language: string;
}) {
  const { t } = useTranslation();
  
  const toggleArea = (id: string) => {
    const areas = data.growthAreas.includes(id)
      ? data.growthAreas.filter(a => a !== id)
      : [...data.growthAreas, id];
    setData({ ...data, growthAreas: areas });
  };

  const aiMessage = language === 'tr'
    ? getRandomMessage(AI_MESSAGES.growthAreasTr)
    : getRandomMessage(AI_MESSAGES.growthAreas);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
          <Target className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">{t('aiOnboarding.growthAreasTitle')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('aiOnboarding.growthAreasSubtitle')}
        </p>
      </motion.div>
      
      <AIMessage message={aiMessage} />
      
      <div className="grid grid-cols-2 gap-3">
        {GROWTH_AREAS.map((area, index) => {
          const Icon = area.icon;
          const isSelected = data.growthAreas.includes(area.id);
          const label = language === 'tr' ? area.labelTr : area.label;
          
          return (
            <motion.button
              key={area.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleArea(area.id)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                isSelected 
                  ? `border-rose-400 ${area.bgColor} shadow-sm` 
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
              data-testid={`button-growth-area-${area.id}`}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2"
                >
                  <Check className="h-4 w-4 text-rose-500" />
                </motion.div>
              )}
              <div className={`w-10 h-10 rounded-lg ${area.bgColor} flex items-center justify-center mb-2`}>
                <Icon className={`h-5 w-5 ${area.color}`} />
              </div>
              <p className="font-medium text-sm">{label}</p>
            </motion.button>
          );
        })}
      </div>
      
      {data.growthAreas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap gap-2 justify-center pt-2"
        >
          {data.growthAreas.map(id => {
            const area = GROWTH_AREAS.find(a => a.id === id);
            const label = area ? (language === 'tr' ? area.labelTr : area.label) : id;
            return (
              <Badge key={id} variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                {label}
              </Badge>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function TimeCommitmentStep({
  data,
  setData,
  language
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  language: string;
}) {
  const { t } = useTranslation();
  
  const getTimeDescription = () => {
    if (data.dailyTimeCommitment <= 15) return t('aiOnboarding.timeQuickCheckIn');
    if (data.dailyTimeCommitment <= 30) return t('aiOnboarding.timeFocusedSession');
    if (data.dailyTimeCommitment <= 60) return t('aiOnboarding.timeDeepPractice');
    return t('aiOnboarding.timeComprehensive');
  };
  
  const getTimeIcon = () => {
    if (data.dailyTimeCommitment <= 30) return Sunrise;
    if (data.dailyTimeCommitment <= 60) return Sun;
    if (data.dailyTimeCommitment <= 90) return Sunset;
    return Moon;
  };
  
  const TimeIcon = getTimeIcon();
  
  const aiMessage = language === 'tr'
    ? getRandomMessage(AI_MESSAGES.timeCommitmentTr)
    : getRandomMessage(AI_MESSAGES.timeCommitment);

  const timePresets = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
  ];

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
          className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20"
        >
          <TimeIcon className="h-8 w-8 text-white" />
        </motion.div>
        <h2 className="text-xl sm:text-2xl font-bold">{t('aiOnboarding.timeTitle')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('aiOnboarding.timeSubtitle')}
        </p>
      </motion.div>
      
      <AIMessage message={aiMessage} />
      
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
            className="text-4xl font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent"
          >
            {data.dailyTimeCommitment} {t('common.minutes')}
          </motion.div>
          <p className="text-sm text-muted-foreground mt-1">
            {getTimeDescription()}
          </p>
        </div>
        
        <div className="px-4">
          <Slider
            value={[data.dailyTimeCommitment]}
            onValueChange={([value]) => setData({ ...data, dailyTimeCommitment: value })}
            min={15}
            max={120}
            step={5}
            className="w-full"
            data-testid="slider-time-commitment"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>15 min</span>
            <span>2 hours</span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 pt-4">
          {timePresets.map((time, index) => (
            <motion.button
              key={time.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              onClick={() => setData({ ...data, dailyTimeCommitment: time.value })}
              className={`p-3 rounded-lg text-center transition-all ${
                data.dailyTimeCommitment === time.value
                  ? 'bg-gradient-to-r from-rose-400 to-orange-400 text-white shadow-md'
                  : 'bg-muted/50 hover:bg-muted'
              }`}
              data-testid={`button-time-${time.value}`}
            >
              <span className="text-sm font-medium">{time.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function FirstGoalStep({
  data,
  setData,
  language,
  isGenerating,
  onGenerate
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  language: string;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const { t } = useTranslation();
  
  const aiMessage = language === 'tr'
    ? getRandomMessage(AI_MESSAGES.firstGoalTr)
    : getRandomMessage(AI_MESSAGES.firstGoal);

  const suggestedGoals = [
    { title: 'Start a daily meditation practice', titleTr: 'Günlük meditasyon pratiği başlat' },
    { title: 'Exercise 3 times a week', titleTr: 'Haftada 3 kez egzersiz yap' },
    { title: 'Read 20 pages every day', titleTr: 'Her gün 20 sayfa oku' },
    { title: 'Learn a new skill', titleTr: 'Yeni bir beceri öğren' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <motion.div 
          className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20"
          animate={{
            boxShadow: [
              '0 10px 40px -10px rgba(168, 85, 247, 0.4)',
              '0 20px 60px -10px rgba(168, 85, 247, 0.6)',
              '0 10px 40px -10px rgba(168, 85, 247, 0.4)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Wand2 className="h-8 w-8 text-white" />
        </motion.div>
        <h2 className="text-xl sm:text-2xl font-bold">{t('aiOnboarding.firstGoalTitle')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('aiOnboarding.firstGoalSubtitle')}
        </p>
      </motion.div>
      
      <AIMessage message={aiMessage} />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="goal-title" className="font-medium">
            {t('aiOnboarding.goalTitleLabel')}
          </Label>
          <Input
            id="goal-title"
            value={data.firstGoalTitle}
            onChange={(e) => setData({ ...data, firstGoalTitle: e.target.value })}
            placeholder={t('aiOnboarding.goalTitlePlaceholder')}
            className="border-rose-200 focus:border-rose-400 dark:border-rose-800 dark:focus:border-rose-600"
            data-testid="input-first-goal-title"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="goal-description" className="font-medium">
            {t('aiOnboarding.goalDescriptionLabel')}
          </Label>
          <Textarea
            id="goal-description"
            value={data.firstGoalDescription}
            onChange={(e) => setData({ ...data, firstGoalDescription: e.target.value })}
            placeholder={t('aiOnboarding.goalDescriptionPlaceholder')}
            className="min-h-[80px] border-rose-200 focus:border-rose-400 dark:border-rose-800 dark:focus:border-rose-600"
            data-testid="input-first-goal-description"
          />
        </div>
        
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('aiOnboarding.orTrySuggestion')}</p>
          <div className="flex flex-wrap gap-2">
            {suggestedGoals.map((goal, index) => {
              const title = language === 'tr' ? goal.titleTr : goal.title;
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setData({ ...data, firstGoalTitle: title })}
                  className="text-xs border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20"
                  data-testid={`button-suggested-goal-${index}`}
                >
                  {title}
                </Button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CelebrationStep({
  data,
  language
}: {
  data: OnboardingData;
  language: string;
}) {
  const { t } = useTranslation();
  const [showConfetti, setShowConfetti] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const aiMessage = language === 'tr'
    ? getRandomMessage(AI_MESSAGES.celebrationTr)
    : getRandomMessage(AI_MESSAGES.celebration);

  const appFeatures = [
    { icon: Target, label: t('aiOnboarding.featureGoals'), labelTr: 'Akıllı Hedefler' },
    { icon: Brain, label: t('aiOnboarding.featureCoach'), labelTr: 'AI Koç' },
    { icon: Trophy, label: t('aiOnboarding.featureAchievements'), labelTr: 'Başarılar' },
    { icon: Users, label: t('aiOnboarding.featureCommunity'), labelTr: 'Topluluk' },
  ];

  return (
    <div className="space-y-6 text-center relative">
      {showConfetti && <CelebrationConfetti />}
      
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative mx-auto w-24 h-24"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-400 via-orange-400 to-amber-400 flex items-center justify-center shadow-xl shadow-rose-500/30">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 3, delay: 0.5 }}
          >
            <PartyPopper className="h-12 w-12 text-white" />
          </motion.div>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
          {t('aiOnboarding.celebrationTitle')}
        </h2>
        <p className="text-muted-foreground">
          {t('aiOnboarding.celebrationSubtitle', { name: data.name || t('aiOnboarding.friend') })}
        </p>
      </motion.div>
      
      <AIMessage message={aiMessage} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-4 rounded-xl bg-gradient-to-r from-rose-100 to-orange-100 dark:from-rose-900/30 dark:to-orange-900/30 border border-rose-200 dark:border-rose-800/30"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <span className="font-bold text-lg">+100 XP</span>
          <Sparkles className="h-5 w-5 text-amber-500" />
        </div>
        <p className="text-sm text-muted-foreground">{t('aiOnboarding.welcomeBonus')}</p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="space-y-3"
      >
        <p className="text-sm font-medium">{t('aiOnboarding.discoverFeatures')}</p>
        <div className="grid grid-cols-2 gap-3">
          {appFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="p-3 rounded-lg bg-muted/50 flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400/20 to-orange-400/20 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-rose-500" />
                </div>
                <span className="text-sm font-medium">{feature.label}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

interface AIOnboardingFlowProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function AIOnboardingFlow({ onComplete, onSkip }: AIOnboardingFlowProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    growthAreas: [],
    dailyTimeCommitment: 30,
    firstGoalTitle: '',
    firstGoalDescription: '',
  });

  const language = i18n.language || 'en';
  const totalSteps = 5;

  const completeMutation = useMutation({
    mutationFn: async (onboardingData: OnboardingData) => {
      const response = await apiRequest('/api/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({
          name: onboardingData.name,
          growthAreas: onboardingData.growthAreas,
          dailyTimeCommitment: onboardingData.dailyTimeCommitment,
          firstGoalTitle: onboardingData.firstGoalTitle,
          firstGoalDescription: onboardingData.firstGoalDescription,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      toast({
        title: t('aiOnboarding.successTitle'),
        description: t('aiOnboarding.successMessage'),
      });
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('aiOnboarding.errorMessage'),
        variant: 'destructive',
      });
    },
  });

  const canProceed = () => {
    switch (currentStep) {
      case 0: return data.name.length >= 2;
      case 1: return data.growthAreas.length >= 1;
      case 2: return data.dailyTimeCommitment >= 15;
      case 3: return true;
      case 4: return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeMutation.mutate(data);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    onSkip?.();
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 1500);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep data={data} setData={setData} language={language} />;
      case 1:
        return <GrowthAreasStep data={data} setData={setData} language={language} />;
      case 2:
        return <TimeCommitmentStep data={data} setData={setData} language={language} />;
      case 3:
        return (
          <FirstGoalStep 
            data={data} 
            setData={setData} 
            language={language}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        );
      case 4:
        return <CelebrationStep data={data} language={language} />;
      default:
        return null;
    }
  };

  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:from-rose-950/20 dark:via-background dark:to-amber-950/20">
      <Card className="w-full max-w-lg border-rose-200/50 dark:border-rose-800/30 shadow-xl shadow-rose-500/10">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
              {currentStep < totalSteps - 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-skip-onboarding"
                >
                  {t('common.skip')}
                </Button>
              )}
            </div>
            
            <Progress 
              value={progressPercent} 
              className="h-1 bg-rose-100 dark:bg-rose-900/30"
            />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
            
            <div className="flex gap-3 pt-4">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20"
                  data-testid="button-onboarding-back"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('common.back')}
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed() || completeMutation.isPending}
                className={`flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/30 ${
                  currentStep === 0 ? 'w-full' : ''
                }`}
                data-testid="button-onboarding-next"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : currentStep === totalSteps - 1 ? (
                  <>
                    {t('aiOnboarding.startJourney')}
                    <Rocket className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    {t('common.next')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function useOnboardingCheck() {
  const { user, isAuthenticated } = useAuth();
  
  const { data: goals } = useQuery({
    queryKey: ['/api/goals'],
    enabled: isAuthenticated,
  });
  
  const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  const hasNoGoals = !goals || (Array.isArray(goals) && goals.length === 0);
  const shouldShowOnboarding = isAuthenticated && !hasCompletedOnboarding && hasNoGoals;
  
  return {
    shouldShowOnboarding,
    markOnboardingComplete: () => {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    },
  };
}
