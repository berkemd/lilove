import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flame, Star, Sparkles, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);
  
  return reducedMotion;
};

interface ConfettiCelebrationProps {
  duration?: number;
  particleCount?: number;
  onComplete?: () => void;
}

export function ConfettiCelebration({
  duration = 3000,
  particleCount = 50,
  onComplete,
}: ConfettiCelebrationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  const particles = useMemo(() => {
    const colors = [
      "hsl(var(--primary))",
      "hsl(var(--secondary))",
      "hsl(var(--accent))",
      "#FFD700",
      "#FF69B4",
      "#00CED1",
    ];
    
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      x: Math.random() * 100,
      delay: Math.random() * 0.3,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
  }, [particleCount]);

  if (!isVisible) return null;

  if (reducedMotion) {
    return (
      <div
        data-testid="celebration-confetti"
        className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="text-4xl"
        >
          <Sparkles className="w-16 h-16 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div
      data-testid="celebration-confetti"
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            x: `${particle.x}vw`,
            y: "-10%",
            rotate: particle.rotation,
            opacity: 1,
          }}
          animate={{
            y: "110vh",
            rotate: particle.rotation + 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: duration / 1000,
            delay: particle.delay,
            ease: "easeIn",
          }}
          style={{
            position: "absolute",
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

interface LevelUpAnimationProps {
  newLevel: number;
  onComplete?: () => void;
}

export function LevelUpAnimation({ newLevel, onComplete }: LevelUpAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      data-testid="celebration-level-up"
      className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
      onClick={() => {
        setIsVisible(false);
        onComplete?.();
      }}
    >
      <div className="pointer-events-auto">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.5, ease: "backOut" }}
          className="relative flex flex-col items-center"
        >
          <motion.div
            className="absolute w-48 h-48 rounded-full border-4 border-primary"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: reducedMotion ? 1.2 : [0.5, 1.5, 1.2],
              opacity: reducedMotion ? 0.6 : [0, 1, 0.6],
            }}
            transition={{ duration: reducedMotion ? 0.3 : 0.8 }}
            style={{
              boxShadow: "0 0 40px hsl(var(--primary) / 0.5), inset 0 0 40px hsl(var(--primary) / 0.3)",
            }}
          />
          
          {!reducedMotion && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-accent rounded-full"
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos((i * Math.PI) / 4) * 100,
                    y: Math.sin((i * Math.PI) / 4) * 100,
                  }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              ))}
            </>
          )}
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: reducedMotion ? 1 : [0, 1.2, 1] }}
            transition={{ duration: reducedMotion ? 0.2 : 0.6, delay: 0.2 }}
            className="relative z-10 flex flex-col items-center gap-2 bg-card/95 backdrop-blur-sm rounded-xl p-8 border border-border shadow-xl"
          >
            <Star className="w-12 h-12 text-accent fill-accent" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Level Up!
            </span>
            <motion.span
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="text-5xl font-bold text-primary"
              data-testid="text-new-level"
            >
              {newLevel}
            </motion.span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

interface StreakCelebrationProps {
  streakDays: number;
  onComplete?: () => void;
}

export function StreakCelebration({ streakDays, onComplete }: StreakCelebrationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      data-testid="celebration-streak"
      className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
      onClick={() => {
        setIsVisible(false);
        onComplete?.();
      }}
    >
      <div className="pointer-events-auto">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.5, ease: "backOut" }}
          className="relative flex flex-col items-center"
        >
          {!reducedMotion && (
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{ y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    y: [-20, -60],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.15,
                    repeat: 1,
                    repeatDelay: 0.2,
                  }}
                  style={{
                    left: `${30 + i * 8}%`,
                  }}
                >
                  <Flame className="w-8 h-8 text-orange-500 fill-orange-400" />
                </motion.div>
              ))}
            </div>
          )}
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: reducedMotion ? 1 : [0, 1.1, 1] }}
            transition={{ duration: reducedMotion ? 0.2 : 0.5, delay: 0.1 }}
            className="relative z-10 flex flex-col items-center gap-3 bg-gradient-to-b from-orange-500/20 to-red-500/20 backdrop-blur-sm rounded-xl p-8 border border-orange-500/30 shadow-xl"
            style={{
              boxShadow: "0 0 30px rgba(249, 115, 22, 0.3)",
            }}
          >
            <motion.div
              animate={reducedMotion ? {} : { scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
            >
              <Flame className="w-14 h-14 text-orange-500 fill-orange-400" />
            </motion.div>
            <span className="text-sm font-medium text-orange-200 uppercase tracking-wider">
              Streak!
            </span>
            <div className="flex items-baseline gap-1">
              <motion.span
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="text-5xl font-bold text-orange-500"
                data-testid="text-streak-days"
              >
                {streakDays}
              </motion.span>
              <span className="text-lg text-orange-400">days</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

interface AchievementUnlockProps {
  achievementName: string;
  rarity: string;
  onComplete?: () => void;
}

const rarityColors: Record<string, { glow: string; border: string; text: string }> = {
  common: { glow: "rgba(156, 163, 175, 0.4)", border: "border-gray-400", text: "text-gray-400" },
  uncommon: { glow: "rgba(34, 197, 94, 0.4)", border: "border-green-500", text: "text-green-500" },
  rare: { glow: "rgba(59, 130, 246, 0.4)", border: "border-blue-500", text: "text-blue-500" },
  epic: { glow: "rgba(168, 85, 247, 0.4)", border: "border-purple-500", text: "text-purple-500" },
  legendary: { glow: "rgba(234, 179, 8, 0.4)", border: "border-yellow-500", text: "text-yellow-500" },
};

export function AchievementUnlock({ achievementName, rarity, onComplete }: AchievementUnlockProps) {
  const [isVisible, setIsVisible] = useState(true);
  const reducedMotion = useReducedMotion();
  const colors = rarityColors[rarity.toLowerCase()] || rarityColors.common;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      data-testid="celebration-achievement"
      className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
      onClick={() => {
        setIsVisible(false);
        onComplete?.();
      }}
    >
      <div className="pointer-events-auto">
        <motion.div
          initial={{ scale: 0, opacity: 0, rotateY: -180 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.7, ease: "backOut" }}
          className="relative"
        >
          <motion.div
            className={cn(
              "relative flex flex-col items-center gap-4 bg-card/95 backdrop-blur-sm rounded-xl p-8 border-2",
              colors.border
            )}
            style={{
              boxShadow: `0 0 40px ${colors.glow}`,
            }}
          >
            {!reducedMotion && (
              <motion.div
                className="absolute inset-0 rounded-xl overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 1.5, delay: 0.3 }}
              >
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  style={{
                    transform: "skewX(-20deg) translateX(-100%)",
                    animation: "shine 1.5s ease-in-out 0.3s forwards",
                  }}
                />
              </motion.div>
            )}
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: reducedMotion ? 1 : [0, 1.2, 1] }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Trophy className={cn("w-16 h-16", colors.text)} />
            </motion.div>
            
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Achievement Unlocked
              </span>
              <span
                className="text-xl font-bold text-foreground text-center max-w-[200px]"
                data-testid="text-achievement-name"
              >
                {achievementName}
              </span>
              <span className={cn("text-sm font-medium capitalize", colors.text)} data-testid="text-achievement-rarity">
                {rarity}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
      
      <style>{`
        @keyframes shine {
          to {
            transform: skewX(-20deg) translateX(200%);
          }
        }
      `}</style>
    </div>
  );
}

interface TraitUnlockProps {
  traitName: string;
  rarity: string;
  onComplete?: () => void;
}

export function TraitUnlock({ traitName, rarity, onComplete }: TraitUnlockProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isOpened, setIsOpened] = useState(false);
  const reducedMotion = useReducedMotion();
  const colors = rarityColors[rarity.toLowerCase()] || rarityColors.common;

  useEffect(() => {
    const openTimer = setTimeout(() => setIsOpened(true), reducedMotion ? 100 : 500);
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 3000);
    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
    };
  }, [onComplete, reducedMotion]);

  if (!isVisible) return null;

  return (
    <div
      data-testid="celebration-trait-unlock"
      className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
      onClick={() => {
        setIsVisible(false);
        onComplete?.();
      }}
    >
      <div className="pointer-events-auto">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.5 }}
          className="relative flex flex-col items-center"
        >
          <motion.div
            className="relative w-32 h-32 flex items-center justify-center"
            animate={isOpened && !reducedMotion ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
              }}
              animate={isOpened ? { scale: [1, 1.5], opacity: [0.8, 0] } : { scale: 1, opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
            
            <motion.div
              className={cn(
                "relative w-24 h-24 rounded-xl border-2 flex items-center justify-center bg-card",
                colors.border
              )}
              animate={isOpened ? { rotateY: [0, 180, 360] } : { rotateY: 0 }}
              transition={{ duration: reducedMotion ? 0.2 : 0.8 }}
              style={{
                boxShadow: isOpened ? `0 0 30px ${colors.glow}` : "none",
              }}
            >
              <AnimatePresence mode="wait">
                {!isOpened ? (
                  <motion.div
                    key="chest"
                    exit={{ opacity: 0, scale: 0 }}
                  >
                    <Gift className="w-12 h-12 text-muted-foreground" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sparkle"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Sparkles className={cn("w-12 h-12", colors.text)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
          
          <AnimatePresence>
            {isOpened && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reducedMotion ? 0.1 : 0.5 }}
                className="flex flex-col items-center gap-1 mt-4"
              >
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  New Trait Unlocked
                </span>
                <span
                  className="text-xl font-bold text-foreground text-center"
                  data-testid="text-trait-name"
                >
                  {traitName}
                </span>
                <span className={cn("text-sm font-medium capitalize", colors.text)} data-testid="text-trait-rarity">
                  {rarity}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

// ===== PURCHASE CELEBRATION OVERLAY =====
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

interface PurchaseCelebrationProps {
  isVisible: boolean;
  item: {
    name: string;
    icon: string;
    rarity: Rarity;
    cost: number;
  };
  onClose: () => void;
}

const RARITY_COLORS: Record<Rarity, { primary: string; glow: string; text: string }> = {
  common: { primary: '#9CA3AF', glow: 'rgba(156, 163, 175, 0.4)', text: 'text-gray-500' },
  uncommon: { primary: '#22C55E', glow: 'rgba(34, 197, 94, 0.4)', text: 'text-green-500' },
  rare: { primary: '#3B82F6', glow: 'rgba(59, 130, 246, 0.4)', text: 'text-blue-500' },
  epic: { primary: '#A855F7', glow: 'rgba(168, 85, 247, 0.4)', text: 'text-purple-500' },
  legendary: { primary: '#F59E0B', glow: 'rgba(245, 158, 11, 0.5)', text: 'text-amber-500' },
  mythic: { primary: '#EF4444', glow: 'rgba(239, 68, 68, 0.6)', text: 'text-red-500' },
};

export function PurchaseCelebration({ isVisible, item, onClose }: PurchaseCelebrationProps) {
  const reducedMotion = useReducedMotion();
  const colors = RARITY_COLORS[item.rarity];
  
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isVisible, onClose]);

  const particles = useMemo(() => {
    const particleColors = ['#F59E0B', '#EF4444', '#FBBF24', '#EC4899', '#8B5CF6', '#22C55E'];
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: particleColors[i % particleColors.length],
      x: 50 + (Math.random() - 0.5) * 20,
      angle: (i / 60) * 360,
      distance: 100 + Math.random() * 150,
      delay: Math.random() * 0.3,
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 720,
    }));
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          data-testid="purchase-celebration-overlay"
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Purchased ${item.name}`}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {!reducedMotion && particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute pointer-events-none"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                x: Math.cos(particle.angle * Math.PI / 180) * particle.distance,
                y: Math.sin(particle.angle * Math.PI / 180) * particle.distance + 100,
                opacity: [1, 1, 0],
                rotate: particle.rotation,
              }}
              transition={{
                duration: 1.5,
                delay: 0.3 + particle.delay,
                ease: 'easeOut',
              }}
            />
          ))}
          
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: 0.1,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="relative"
              animate={item.rarity === 'mythic' || item.rarity === 'legendary' ? {
                boxShadow: [
                  `0 0 20px ${colors.glow}`,
                  `0 0 40px ${colors.glow}`,
                  `0 0 20px ${colors.glow}`,
                ],
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div
                className="w-32 h-32 rounded-2xl bg-card flex items-center justify-center text-6xl border-2"
                style={{
                  borderColor: colors.primary,
                  boxShadow: `0 0 30px ${colors.glow}`,
                }}
              >
                {item.icon}
              </div>
            </motion.div>
            
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
                Item Acquired
              </p>
              <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-purchased-item-name">
                {item.name}
              </h2>
              <p className={cn('text-sm font-semibold capitalize', colors.text)} data-testid="text-purchased-item-rarity">
                {item.rarity}
              </p>
              <motion.div
                className="flex items-center justify-center gap-1 mt-3 text-amber-400"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
              >
                <span className="text-lg">🪙</span>
                <span className="font-bold">-{item.cost}</span>
              </motion.div>
            </motion.div>
            
            <motion.button
              className="mt-6 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={onClose}
              data-testid="button-close-celebration"
            >
              Continue
            </motion.button>
          </motion.div>
          
          <div className="sr-only" role="status" aria-live="polite">
            Successfully purchased {item.name}, a {item.rarity} item for {item.cost} coins
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type CelebrationType = "confetti" | "levelUp" | "streak" | "achievement" | "traitUnlock" | "purchase";

interface CelebrationOptions {
  duration?: number;
  particleCount?: number;
  newLevel?: number;
  streakDays?: number;
  achievementName?: string;
  traitName?: string;
  rarity?: string;
}

interface UseCelebrationReturn {
  trigger: (dynamicOptions?: CelebrationOptions) => void;
  isPlaying: boolean;
  CelebrationOverlay: () => JSX.Element | null;
}

export function useCelebration(
  type: CelebrationType,
  defaultOptions: CelebrationOptions = {}
): UseCelebrationReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeOptions, setActiveOptions] = useState<CelebrationOptions>(defaultOptions);

  const trigger = useCallback((dynamicOptions?: CelebrationOptions) => {
    if (dynamicOptions) {
      setActiveOptions({ ...defaultOptions, ...dynamicOptions });
    }
    setIsPlaying(true);
  }, [defaultOptions]);

  const handleComplete = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const CelebrationOverlay = useCallback(() => {
    if (!isPlaying) return null;

    switch (type) {
      case "confetti":
        return (
          <ConfettiCelebration
            duration={activeOptions.duration}
            particleCount={activeOptions.particleCount}
            onComplete={handleComplete}
          />
        );
      case "levelUp":
        return (
          <LevelUpAnimation
            newLevel={activeOptions.newLevel ?? 1}
            onComplete={handleComplete}
          />
        );
      case "streak":
        return (
          <StreakCelebration
            streakDays={activeOptions.streakDays ?? 1}
            onComplete={handleComplete}
          />
        );
      case "achievement":
        return (
          <AchievementUnlock
            achievementName={activeOptions.achievementName ?? "Achievement"}
            rarity={activeOptions.rarity ?? "common"}
            onComplete={handleComplete}
          />
        );
      case "traitUnlock":
        return (
          <TraitUnlock
            traitName={activeOptions.traitName ?? "Trait"}
            rarity={activeOptions.rarity ?? "common"}
            onComplete={handleComplete}
          />
        );
      case "purchase":
        return (
          <PurchaseCelebration
            isVisible={true}
            item={{
              name: activeOptions.traitName ?? "Item",
              icon: "🎁",
              rarity: (activeOptions.rarity ?? "common") as Rarity,
              cost: 0,
            }}
            onClose={handleComplete}
          />
        );
      default:
        return null;
    }
  }, [isPlaying, type, activeOptions, handleComplete]);

  return { trigger, isPlaying, CelebrationOverlay };
}
