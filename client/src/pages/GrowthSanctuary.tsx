import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useCelebration } from "@/components/CelebrationAnimations";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import ParticleSystem, { 
  HeartParticles, 
  SparkleEffect, 
  SeasonalParticles, 
  FireflyParticles,
  RainRipples,
  VolumetricSunRays,
  MagicDust
} from "@/components/sanctuary/ParticleSystem";
import {
  TreeDeciduous, Sparkles, Leaf, Bird, Bug, Flower2, Fish, Flame, Star, Moon, Sun, Cloud, 
  Droplets, Mountain, Rabbit, Cat, Coins, Lock, Unlock, Crown, Gem, Wand2, Heart, 
  CloudRain, Wind, Snowflake, Zap, ArrowLeft, Settings, Info, Gift
} from "lucide-react";
import { Link } from 'wouter';

const EVOLUTION_STAGES = [
  { stage: 1, name: "Seedling", xpRequired: 0, description: "Your journey begins with a single seed of hope" },
  { stage: 2, name: "Sapling", xpRequired: 500, description: "Young growth stretches toward the light" },
  { stage: 3, name: "Young Forest", xpRequired: 1500, description: "A vibrant ecosystem begins to form" },
  { stage: 4, name: "Mature Forest", xpRequired: 4000, description: "Life flourishes in abundance" },
  { stage: 5, name: "Ancient Grove", xpRequired: 10000, description: "A magical sanctuary of wisdom and wonder" },
];

const WEATHER_TYPES = [
  { id: 'sunny', name: 'Sunny', icon: Sun },
  { id: 'cloudy', name: 'Cloudy', icon: Cloud },
  { id: 'rainy', name: 'Rainy', icon: CloudRain },
  { id: 'aurora', name: 'Aurora', icon: Sparkles },
  { id: 'starry', name: 'Starry Night', icon: Star },
];

const TIME_OF_DAY = [
  { id: 'dawn', name: 'Dawn', color: 'from-orange-200 via-pink-200 to-purple-300' },
  { id: 'day', name: 'Day', color: 'from-sky-300 via-blue-400 to-blue-500' },
  { id: 'dusk', name: 'Dusk', color: 'from-orange-400 via-purple-400 to-indigo-500' },
  { id: 'night', name: 'Night', color: 'from-indigo-900 via-purple-900 to-slate-900' },
];

const DEFAULT_ELEMENTS = [
  { id: 'tree-oak', name: 'Oak Tree', type: 'tree', rarity: 'common', evolutionStage: 1, unlockCost: 0, icon: 'TreeDeciduous', colors: ['green-600', 'amber-700'] },
  { id: 'tree-pine', name: 'Pine Tree', type: 'tree', rarity: 'common', evolutionStage: 1, unlockCost: 50, icon: 'Mountain', colors: ['emerald-700', 'amber-800'] },
  { id: 'tree-cherry', name: 'Cherry Blossom', type: 'tree', rarity: 'uncommon', evolutionStage: 2, unlockCost: 150, icon: 'Flower2', colors: ['pink-400', 'amber-600'] },
  { id: 'tree-willow', name: 'Weeping Willow', type: 'tree', rarity: 'rare', evolutionStage: 3, unlockCost: 300, icon: 'Leaf', colors: ['green-400', 'amber-700'] },
  { id: 'tree-ancient', name: 'Ancient Oak', type: 'tree', rarity: 'epic', evolutionStage: 4, unlockCost: 500, icon: 'Crown', colors: ['emerald-500', 'amber-900'] },
  { id: 'tree-world', name: 'World Tree', type: 'tree', rarity: 'legendary', evolutionStage: 5, unlockCost: 1000, icon: 'Sparkles', colors: ['cyan-400', 'purple-600'] },
  { id: 'creature-butterfly', name: 'Butterfly', type: 'creature', rarity: 'common', evolutionStage: 1, unlockCost: 25, icon: 'Bug', colors: ['pink-400', 'purple-400'] },
  { id: 'creature-bird', name: 'Songbird', type: 'creature', rarity: 'common', evolutionStage: 1, unlockCost: 50, icon: 'Bird', colors: ['blue-400', 'slate-600'] },
  { id: 'creature-rabbit', name: 'Forest Rabbit', type: 'creature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 100, icon: 'Rabbit', colors: ['gray-400', 'white'] },
  { id: 'creature-deer', name: 'Gentle Deer', type: 'creature', rarity: 'rare', evolutionStage: 3, unlockCost: 250, icon: 'Cat', colors: ['amber-600', 'amber-200'] },
  { id: 'creature-phoenix', name: 'Phoenix', type: 'creature', rarity: 'legendary', evolutionStage: 5, unlockCost: 800, icon: 'Flame', colors: ['orange-500', 'red-500'] },
  { id: 'decor-flower', name: 'Wild Flowers', type: 'decoration', rarity: 'common', evolutionStage: 1, unlockCost: 15, icon: 'Flower2', colors: ['pink-500', 'yellow-500'] },
  { id: 'decor-mushroom', name: 'Mushrooms', type: 'decoration', rarity: 'common', evolutionStage: 1, unlockCost: 20, icon: 'Circle', colors: ['red-500', 'amber-100'] },
  { id: 'decor-pond', name: 'Peaceful Pond', type: 'decoration', rarity: 'uncommon', evolutionStage: 2, unlockCost: 120, icon: 'Fish', colors: ['blue-400', 'blue-600'] },
  { id: 'decor-waterfall', name: 'Waterfall', type: 'decoration', rarity: 'rare', evolutionStage: 3, unlockCost: 200, icon: 'Droplets', colors: ['blue-300', 'white'] },
  { id: 'decor-crystals', name: 'Crystal Cluster', type: 'decoration', rarity: 'epic', evolutionStage: 4, unlockCost: 400, icon: 'Gem', colors: ['purple-400', 'cyan-400'] },
  { id: 'effect-fireflies', name: 'Fireflies', type: 'effect', rarity: 'uncommon', evolutionStage: 2, unlockCost: 75, icon: 'Sparkles', colors: ['yellow-300'] },
  { id: 'effect-sunrays', name: 'Sun Rays', type: 'effect', rarity: 'rare', evolutionStage: 3, unlockCost: 150, icon: 'Sun', colors: ['yellow-200', 'orange-200'] },
  { id: 'effect-aurora', name: 'Aurora Borealis', type: 'effect', rarity: 'legendary', evolutionStage: 5, unlockCost: 600, icon: 'Wand2', colors: ['green-400', 'purple-400', 'pink-400'] },
];

const RARITY_COLORS: Record<string, string> = {
  common: 'text-gray-500 border-gray-300 dark:border-gray-600',
  uncommon: 'text-green-500 border-green-400 dark:border-green-600',
  rare: 'text-blue-500 border-blue-400 dark:border-blue-600',
  epic: 'text-purple-500 border-purple-400 dark:border-purple-600',
  legendary: 'text-amber-500 border-amber-400 dark:border-amber-600',
};

const RARITY_BG: Record<string, string> = {
  common: 'bg-gray-100 dark:bg-gray-800',
  uncommon: 'bg-green-50 dark:bg-green-900/30',
  rare: 'bg-blue-50 dark:bg-blue-900/30',
  epic: 'bg-purple-50 dark:bg-purple-900/30',
  legendary: 'bg-amber-50 dark:bg-amber-900/30',
};

interface SanctuaryState {
  evolutionStage: number;
  sanctuaryXp: number;
  xpToNextStage: number;
  weatherType: string;
  timeOfDay: string;
  unlockedElements: string[];
  placedElements: { elementId: string; x: number; y: number; layer: number }[];
  totalElementsUnlocked: number;
}

interface UserData {
  coinBalance: number;
  id: string;
}

type Season = 'spring' | 'summer' | 'fall' | 'winter';

const getCurrentSeason = (): Season => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
};

const getStageConfig = (stage: number) => {
  switch (stage) {
    case 1:
      return {
        skyGradient: 'from-gray-300 via-gray-400 to-gray-500 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900',
        groundGradient: 'from-amber-800 via-amber-700 to-amber-600 dark:from-amber-950 dark:via-amber-900 dark:to-amber-800',
        grassDensity: 5,
        treeCount: 2,
        creatureCount: 1,
        ambientParticles: 0,
        parallaxIntensity: 0.5,
      };
    case 2:
      return {
        skyGradient: 'from-sky-200 via-sky-300 to-sky-400 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900',
        groundGradient: 'from-green-700 via-green-600 to-green-500 dark:from-green-950 dark:via-green-900 dark:to-green-800',
        grassDensity: 10,
        treeCount: 4,
        creatureCount: 3,
        ambientParticles: 5,
        parallaxIntensity: 0.7,
      };
    case 3:
      return {
        skyGradient: 'from-sky-300 via-blue-400 to-blue-500 dark:from-indigo-900 dark:via-purple-900 dark:to-slate-900',
        groundGradient: 'from-green-600 via-green-500 to-emerald-400 dark:from-green-900 dark:via-green-800 dark:to-emerald-800',
        grassDensity: 15,
        treeCount: 6,
        creatureCount: 5,
        ambientParticles: 10,
        parallaxIntensity: 0.85,
      };
    case 4:
      return {
        skyGradient: 'from-orange-200 via-amber-300 to-sky-400 dark:from-purple-900 dark:via-indigo-900 dark:to-slate-800',
        groundGradient: 'from-emerald-600 via-green-500 to-teal-400 dark:from-emerald-900 dark:via-green-800 dark:to-teal-800',
        grassDensity: 20,
        treeCount: 8,
        creatureCount: 8,
        ambientParticles: 15,
        parallaxIntensity: 1,
      };
    case 5:
    default:
      return {
        skyGradient: 'from-purple-300 via-pink-300 to-indigo-400 dark:from-violet-950 dark:via-purple-900 dark:to-indigo-950',
        groundGradient: 'from-emerald-500 via-teal-400 to-cyan-400 dark:from-emerald-800 dark:via-teal-700 dark:to-cyan-800',
        grassDensity: 25,
        treeCount: 10,
        creatureCount: 12,
        ambientParticles: 25,
        parallaxIntensity: 1.2,
      };
  }
};

const Circle = ({ className }: { className?: string }) => (
  <div className={cn("rounded-full", className)} />
);

interface ParallaxLayerProps {
  children: React.ReactNode;
  depth: number;
  mousePosition: { x: number; y: number };
  className?: string;
  enableMouseFollow?: boolean;
}

function EnhancedParallaxLayer({ 
  children, 
  depth, 
  mousePosition,
  className,
  enableMouseFollow = true
}: ParallaxLayerProps) {
  const mouseX = useSpring(mousePosition.x, { stiffness: 100, damping: 30 });
  const mouseY = useSpring(mousePosition.y, { stiffness: 100, damping: 30 });
  
  const translateX = useTransform(mouseX, [0, 100], [-8 * depth, 8 * depth]);
  const translateY = useTransform(mouseY, [0, 100], [-5 * depth, 5 * depth]);

  return (
    <motion.div
      className={cn("absolute inset-0", className)}
      style={enableMouseFollow ? { x: translateX, y: translateY } : undefined}
      animate={!enableMouseFollow ? { y: [-5 * depth, 5 * depth, -5 * depth] } : undefined}
      transition={!enableMouseFollow ? { duration: 10 + depth * 2, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      {children}
    </motion.div>
  );
}

interface WeatherEffectProps {
  type: string;
  mousePosition: { x: number; y: number };
  timeOfDay: string;
}

function EnhancedWeatherEffect({ type, mousePosition, timeOfDay }: WeatherEffectProps) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'dusk';

  if (type === 'rainy') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 80 }).map((_, i) => {
          const windOffset = (mousePosition.x - 50) * 0.3;
          return (
            <motion.div
              key={i}
              className="absolute w-0.5 bg-gradient-to-b from-blue-300/80 to-blue-400/40"
              style={{ 
                left: `${Math.random() * 100}%`, 
                top: -30,
                height: `${15 + Math.random() * 15}px`,
                transform: `rotate(${5 + windOffset * 0.2}deg)`,
              }}
              animate={{ 
                y: [0, 500],
                x: [0, windOffset],
                opacity: [0.7, 0] 
              }}
              transition={{
                duration: 0.6 + Math.random() * 0.3,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "linear"
              }}
            />
          );
        })}
        <RainRipples count={12} active={true} />
      </div>
    );
  }

  if (type === 'aurora') {
    return (
      <motion.div
        className="absolute top-0 left-0 right-0 h-48 overflow-hidden pointer-events-none"
        data-testid="effect-aurora"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-x-0 top-0 blur-2xl"
            style={{
              height: `${60 + i * 20}px`,
              background: `linear-gradient(90deg, 
                transparent 0%,
                ${i % 2 === 0 ? 'rgba(134, 239, 172, 0.4)' : 'rgba(192, 132, 252, 0.4)'} 25%,
                ${i % 2 === 0 ? 'rgba(192, 132, 252, 0.5)' : 'rgba(236, 72, 153, 0.4)'} 50%,
                ${i % 2 === 0 ? 'rgba(236, 72, 153, 0.4)' : 'rgba(134, 239, 172, 0.4)'} 75%,
                transparent 100%
              )`,
            }}
            animate={{
              x: ['-20%', '20%', '-20%'],
              opacity: [0.3, 0.7, 0.3],
              scaleY: [1, 1.3, 1],
            }}
            transition={{ 
              duration: 8 + i * 2, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </motion.div>
    );
  }

  if (type === 'starry') {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ 
              left: `${Math.random() * 100}%`, 
              top: `${Math.random() * 60}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
            }}
            animate={{ 
              opacity: [0.2, 1, 0.2], 
              scale: [0.8, 1.3, 0.8],
              boxShadow: ['0 0 2px white', '0 0 8px white', '0 0 2px white'],
            }}
            transition={{
              duration: 1.5 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={`shooting-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{ 
              left: `${20 + i * 30}%`, 
              top: `${10 + i * 15}%`,
              boxShadow: '0 0 4px white, -20px 0 8px white, -40px 0 4px transparent',
            }}
            animate={{
              x: [0, 150],
              y: [0, 100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 5 + i * 8,
              repeatDelay: 10 + i * 5,
            }}
          />
        ))}
        <motion.div
          className="absolute top-6 right-10"
          animate={{ 
            scale: [1, 1.05, 1],
            filter: ['drop-shadow(0 0 10px rgba(255,255,200,0.5))', 'drop-shadow(0 0 20px rgba(255,255,200,0.8))', 'drop-shadow(0 0 10px rgba(255,255,200,0.5))'],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <Moon className="w-14 h-14 text-yellow-100" />
        </motion.div>
      </div>
    );
  }

  if (type === 'sunny') {
    return (
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-2 right-6"
          animate={{ rotate: 360, scale: [1, 1.05, 1] }}
          transition={{ rotate: { duration: 120, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity } }}
        >
          <Sun className="w-20 h-20 text-yellow-400 drop-shadow-2xl" />
          <motion.div
            className="absolute inset-0 rounded-full bg-yellow-300/30 blur-xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </motion.div>
        <VolumetricSunRays intensity={1.2} mousePosition={mousePosition} />
      </div>
    );
  }

  if (type === 'cloudy') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute flex items-center"
            style={{ top: `${5 + i * 10}%`, left: `-30%` }}
            animate={{ x: ['0%', '160%'] }}
            transition={{
              duration: 40 + i * 15,
              repeat: Infinity,
              ease: "linear",
              delay: i * 4,
            }}
          >
            <div className="relative">
              <Cloud className={cn(
                "text-gray-200/70 dark:text-gray-400/50",
                i % 3 === 0 ? "w-24 h-16" : i % 3 === 1 ? "w-20 h-12" : "w-16 h-10"
              )} />
              <Cloud className={cn(
                "absolute -top-2 -left-4 text-gray-100/50 dark:text-gray-500/30",
                i % 2 === 0 ? "w-16 h-10" : "w-12 h-8"
              )} />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return null;
}

interface InteractiveTreeProps {
  index: number;
  stage: number;
  glowing?: boolean;
  mousePosition: { x: number; y: number };
  onClick?: () => void;
}

function InteractiveTree({ index, stage, glowing = false, mousePosition, onClick }: InteractiveTreeProps) {
  const [isSwaying, setIsSwaying] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  
  const treeHeight = 12 + stage * 6 + (index % 3) * 3;
  const canopySize = 8 + stage * 4 + (index % 2) * 3;
  const trunkWidth = 2 + Math.floor(stage / 2);
  
  const treeX = 5 + index * (85 / (stage + 3));
  const lookAngle = useMemo(() => {
    const dx = mousePosition.x - treeX;
    return Math.max(-3, Math.min(3, dx * 0.03));
  }, [mousePosition.x, treeX]);

  const handleClick = () => {
    setIsSwaying(true);
    setShowSparkle(true);
    setTimeout(() => setIsSwaying(false), 2000);
    onClick?.();
  };
  
  return (
    <motion.div
      className="absolute bottom-12 flex flex-col items-center cursor-pointer select-none"
      style={{ left: `${treeX}%` }}
      initial={{ scale: 0, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ delay: index * 0.12, type: "spring", stiffness: 120, damping: 12 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      data-testid={`sanctuary-tree-${index}`}
    >
      <SparkleEffect 
        active={showSparkle} 
        position={{ x: 50, y: 30 }}
        onComplete={() => setShowSparkle(false)}
      />
      
      <motion.div
        animate={isSwaying ? {
          rotate: [-8, 8, -6, 6, -4, 4, -2, 2, 0],
        } : {
          rotate: [-1 + lookAngle, 1 + lookAngle, -1 + lookAngle],
        }}
        transition={isSwaying ? {
          duration: 2,
          ease: "easeOut",
        } : {
          duration: 3 + index * 0.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ originY: 1 }}
        className="flex flex-col items-center"
      >
        <motion.div 
          className={cn(
            "rounded-full relative overflow-visible",
            glowing 
              ? "bg-gradient-to-t from-emerald-400 to-cyan-300 dark:from-emerald-500 dark:to-cyan-400"
              : "bg-gradient-to-t from-green-600 to-green-400 dark:from-green-700 dark:to-green-500"
          )}
          style={{ width: `${canopySize * 5}px`, height: `${canopySize * 6}px` }}
          whileHover={{ filter: 'brightness(1.1)' }}
        >
          {glowing && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-emerald-300/50 dark:bg-emerald-400/30"
                animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute -inset-2 rounded-full bg-emerald-200/20 blur-lg"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </>
          )}
          {stage >= 3 && (
            <>
              <motion.div
                className="absolute -top-1 right-2 w-3 h-3 rounded-full bg-yellow-300 shadow-lg shadow-yellow-400/50"
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2 }}
              />
              <motion.div
                className="absolute top-3 -left-1 w-2 h-2 rounded-full bg-pink-300 shadow-lg shadow-pink-400/30"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
              />
              <motion.div
                className="absolute bottom-4 right-1 w-2.5 h-2.5 rounded-full bg-purple-300"
                animate={{ opacity: [0, 0.8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 1.2 }}
              />
            </>
          )}
          {stage >= 4 && (
            <motion.div
              className="absolute -top-3 left-1/2 -translate-x-1/2"
              animate={{ y: [-2, 2, -2], rotate: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-yellow-300 drop-shadow-lg" />
            </motion.div>
          )}
        </motion.div>
        <div
          className="bg-gradient-to-b from-amber-700 to-amber-900 dark:from-amber-600 dark:to-amber-800 rounded-sm"
          style={{ width: `${trunkWidth * 5}px`, height: `${treeHeight}px` }}
        />
      </motion.div>
    </motion.div>
  );
}

interface CreatureProps {
  type: string;
  index: number;
  mousePosition: { x: number; y: number };
}

function EnhancedCreature({ type, index, mousePosition }: CreatureProps) {
  const creatureRef = useRef<HTMLDivElement>(null);
  const [lookDirection, setLookDirection] = useState(0);
  
  const basePosition = useMemo(() => ({
    x: type === 'butterfly' ? 15 + index * 25 : 
       type === 'bird' ? 5 + index * 30 : 
       type === 'rabbit' ? 35 + index * 20 :
       type === 'deer' ? 20 + index * 25 :
       10 + index * 40,
    y: type === 'butterfly' ? 45 + index * 10 :
       type === 'bird' ? 15 + index * 8 :
       type === 'rabbit' ? 88 :
       type === 'deer' ? 82 :
       12 + index * 5,
  }), [type, index]);

  useEffect(() => {
    const dx = mousePosition.x - basePosition.x;
    setLookDirection(Math.max(-1, Math.min(1, dx / 30)));
  }, [mousePosition.x, basePosition.x]);

  if (type === 'butterfly') {
    return (
      <motion.div
        ref={creatureRef}
        className="absolute"
        style={{ left: `${basePosition.x}%`, top: `${basePosition.y}%` }}
        animate={{
          x: [0, 60, -40, 30, 0],
          y: [0, -35, -20, -45, 0],
        }}
        transition={{ duration: 12 + index * 3, repeat: Infinity, ease: "easeInOut" }}
        data-testid={`creature-butterfly-${index}`}
      >
        <motion.div
          animate={{ rotateY: lookDirection * 30 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ 
              scaleX: [1, 0.3, 1],
              rotateZ: [0, 5, -5, 0],
            }}
            transition={{ duration: 0.15, repeat: Infinity }}
          >
            <Bug className="w-5 h-5 text-pink-400 dark:text-pink-300 drop-shadow-md" />
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  if (type === 'bird') {
    return (
      <motion.div
        ref={creatureRef}
        className="absolute"
        style={{ left: `${basePosition.x}%`, top: `${basePosition.y}%` }}
        animate={{
          x: [0, 180, 280, 180, 0],
          y: [0, -25, 10, -15, 0],
        }}
        transition={{ duration: 20 + index * 5, repeat: Infinity, ease: "easeInOut" }}
        data-testid={`creature-bird-${index}`}
      >
        <motion.div
          animate={{ rotateY: lookDirection * 20, rotateZ: [0, 3, -3, 0] }}
          transition={{ rotateZ: { duration: 0.4, repeat: Infinity } }}
        >
          <Bird className="w-6 h-6 text-slate-600 dark:text-slate-300 drop-shadow-sm" />
        </motion.div>
      </motion.div>
    );
  }

  if (type === 'rabbit') {
    return (
      <motion.div
        ref={creatureRef}
        className="absolute"
        style={{ left: `${basePosition.x}%`, bottom: '12%' }}
        animate={{ 
          x: [0, 30, 50, 30, 0],
        }}
        transition={{ duration: 8 + index * 2, repeat: Infinity, ease: "easeInOut" }}
        data-testid={`creature-rabbit-${index}`}
      >
        <motion.div
          animate={{ 
            y: [0, -12, 0],
            scaleY: [1, 1.1, 1],
          }}
          transition={{ duration: 0.6, repeat: Infinity, delay: index * 0.3 }}
        >
          <motion.div
            animate={{ rotateY: lookDirection * 25 }}
            transition={{ duration: 0.2 }}
          >
            <Rabbit className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  if (type === 'deer') {
    return (
      <motion.div
        ref={creatureRef}
        className="absolute"
        style={{ left: `${basePosition.x}%`, bottom: '15%' }}
        animate={{ 
          x: [0, 40, 80, 40, 0],
        }}
        transition={{ duration: 15 + index * 3, repeat: Infinity, ease: "easeInOut" }}
        data-testid={`creature-deer-${index}`}
      >
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            animate={{ rotateY: lookDirection * 15 }}
            transition={{ duration: 0.3 }}
          >
            <Cat className="w-8 h-8 text-amber-700 dark:text-amber-500" />
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  if (type === 'phoenix') {
    return (
      <motion.div
        ref={creatureRef}
        className="absolute"
        style={{ left: `${basePosition.x}%`, top: `${10 + index * 5}%` }}
        animate={{
          x: [0, 100, 160, 100, 0],
          y: [0, -40, 0, -40, 0],
          rotate: [0, 5, 0, -5, 0],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        data-testid={`creature-phoenix-${index}`}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            filter: ['drop-shadow(0 0 10px orange)', 'drop-shadow(0 0 20px orange)', 'drop-shadow(0 0 10px orange)'],
          }} 
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <motion.div
            animate={{ rotateY: lookDirection * 10 }}
            transition={{ duration: 0.3 }}
          >
            <Flame className="w-12 h-12 text-orange-500 dark:text-orange-400" />
          </motion.div>
        </motion.div>
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-orange-400"
            style={{ 
              left: `${-10 - i * 8}px`,
              top: '50%',
            }}
            animate={{
              opacity: [0.8, 0],
              scale: [1, 0.3],
              x: [-5, -20 - i * 5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </motion.div>
    );
  }

  return null;
}

interface InteractiveFlowerProps {
  position: { x: number; y: number };
  color: string;
  size: number;
  delay?: number;
}

function InteractiveFlower({ position, color, size, delay = 0 }: InteractiveFlowerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isBlooming, setIsBlooming] = useState(false);

  const handleHover = () => {
    if (!isBlooming) {
      setIsHovered(true);
      setIsBlooming(true);
      setTimeout(() => {
        setIsBlooming(false);
        setIsHovered(false);
      }, 2000);
    }
  };

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{ left: `${position.x}%`, bottom: `${position.y}%` }}
      onMouseEnter={handleHover}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: "spring" }}
    >
      <motion.div
        animate={isBlooming ? {
          scale: [1, 1.5, 1.3],
          rotate: [0, 10, -10, 0],
        } : {
          scale: [1, 1.05, 1],
          rotate: [-2, 2, -2],
        }}
        transition={isBlooming ? {
          duration: 0.8,
          ease: "easeOut",
        } : {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Flower2 
          className={cn(
            `text-${color}`,
            "drop-shadow-md transition-all duration-300",
            isHovered && "drop-shadow-lg"
          )} 
          style={{ width: `${size}px`, height: `${size}px` }}
        />
        {isBlooming && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-1.5 h-1.5 rounded-full bg-${color}`}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: Math.cos(i * 60 * Math.PI / 180) * 25,
                  y: Math.sin(i * 60 * Math.PI / 180) * 25,
                  opacity: 0,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

interface InteractivePondProps {
  position: { x: number; y: number };
  width: number;
  height: number;
  mousePosition: { x: number; y: number };
}

function InteractivePond({ position, width, height, mousePosition }: InteractivePondProps) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setRipples(prev => [...prev, { id: Date.now(), x, y }]);
    setTimeout(() => {
      setRipples(prev => prev.slice(1));
    }, 1500);
  };

  return (
    <motion.div
      className="absolute cursor-pointer overflow-hidden rounded-full"
      style={{ 
        left: `${position.x}%`, 
        bottom: `${position.y}%`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      data-testid="interactive-pond"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-blue-400/80 to-blue-600/80 dark:from-blue-500/70 dark:to-blue-700/70">
        <motion.div
          className="absolute inset-0 bg-white/20"
          animate={{ 
            scale: [1, 1.02, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-full h-1/3 top-0 bg-gradient-to-b from-white/30 to-transparent"
          animate={{
            x: [(mousePosition.x - 50) * 0.1, (mousePosition.x - 50) * 0.15],
          }}
          transition={{ duration: 1 }}
        />
      </div>
      
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            className="absolute rounded-full border-2 border-white/40"
            style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
            initial={{ width: 0, height: 0, x: '-50%', y: '-50%', opacity: 1 }}
            animate={{ width: 80, height: 40, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
      
      <motion.div
        className="absolute"
        style={{ top: '30%', left: '25%' }}
        animate={{
          x: [0, 15, 0, -10, 0],
          y: [0, -5, 5, 0, 0],
        }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        <Fish className="w-4 h-4 text-orange-400" />
      </motion.div>
      <motion.div
        className="absolute"
        style={{ top: '50%', left: '60%' }}
        animate={{
          x: [0, -20, 0, 15, 0],
          y: [0, 5, -5, 0, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, delay: 1 }}
      >
        <Fish className="w-3 h-3 text-orange-300 -scale-x-100" />
      </motion.div>
    </motion.div>
  );
}

function GrassLayer({ density, mousePosition }: { density: number; mousePosition: { x: number; y: number } }) {
  const windOffset = (mousePosition.x - 50) * 0.05;
  
  return (
    <div className="absolute bottom-0 left-0 right-0 h-12 flex justify-around items-end overflow-hidden">
      {Array.from({ length: density * 2 }).map((_, i) => (
        <motion.div
          key={i}
          className="bg-gradient-to-t from-green-700 to-green-500 dark:from-green-800 dark:to-green-600 rounded-t"
          style={{ 
            width: `${1 + Math.random()}px`,
            height: `${8 + Math.random() * 25}px`,
          }}
          animate={{ rotate: [-4 + windOffset, 4 + windOffset, -4 + windOffset] }}
          transition={{ duration: 1.5 + Math.random() * 1.5, repeat: Infinity, delay: i * 0.02 }}
        />
      ))}
    </div>
  );
}

function ElementCard({ element, isUnlocked, userCoins, onUnlock }: { 
  element: typeof DEFAULT_ELEMENTS[0]; 
  isUnlocked: boolean; 
  userCoins: number;
  onUnlock: (elementId: string, cost: number) => void;
}) {
  const canAfford = userCoins >= element.unlockCost;
  const IconComponent = {
    TreeDeciduous, Mountain, Flower2, Leaf, Crown, Sparkles, Bug, Bird, Rabbit, Cat, Flame, Fish, Droplets, Gem, Sun, Wand2, Circle
  }[element.icon] || TreeDeciduous;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "p-3 rounded-lg border-2 transition-colors",
        RARITY_COLORS[element.rarity],
        RARITY_BG[element.rarity],
        isUnlocked ? "opacity-100" : "opacity-80"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          isUnlocked ? "bg-primary/10" : "bg-muted"
        )}>
          {isUnlocked ? (
            <IconComponent className="w-5 h-5 text-primary" />
          ) : (
            <Lock className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{element.name}</p>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs capitalize">{element.type}</Badge>
            <Badge variant="outline" className={cn("text-xs capitalize", RARITY_COLORS[element.rarity])}>
              {element.rarity}
            </Badge>
          </div>
        </div>
        {!isUnlocked && element.unlockCost > 0 && (
          <Button
            size="sm"
            variant={canAfford ? "default" : "outline"}
            disabled={!canAfford}
            onClick={() => onUnlock(element.id, element.unlockCost)}
            data-testid={`unlock-element-${element.id}`}
          >
            <Coins className="w-3 h-3 mr-1" />
            {element.unlockCost}
          </Button>
        )}
        {isUnlocked && (
          <Unlock className="w-4 h-4 text-green-500" />
        )}
      </div>
    </motion.div>
  );
}

export default function GrowthSanctuary() {
  const { toast } = useToast();
  const { trigger: triggerConfetti, CelebrationOverlay: ConfettiOverlay } = useCelebration('confetti');
  const [selectedTab, setSelectedTab] = useState('sanctuary');
  const [showUnlockSparkle, setShowUnlockSparkle] = useState(false);
  const [sparklePosition, setSparklePosition] = useState({ x: 50, y: 50 });
  const sanctuaryRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const season = getCurrentSeason();

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!sanctuaryRef.current) return;
    const rect = sanctuaryRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  }, []);

  const { data: sanctuary, isLoading: sanctuaryLoading } = useQuery<SanctuaryState>({
    queryKey: ['/api/sanctuary/state'],
    staleTime: 1000 * 60 * 2,
  });

  const { data: user } = useQuery<UserData>({
    queryKey: ['/api/user'],
  });
  
  interface SanctuaryElementFromAPI {
    id: string;
    name: string;
    type: string;
    rarity: string;
    evolutionStage: number;
    unlockCost: number;
    description: string;
    assetData: { icon?: string; colors?: string[] } | null;
  }
  
  const { data: elementsFromAPI } = useQuery<SanctuaryElementFromAPI[]>({
    queryKey: ['/api/sanctuary/elements'],
    staleTime: 1000 * 60 * 5,
  });

  const defaultSanctuary: SanctuaryState = {
    evolutionStage: 1,
    sanctuaryXp: 0,
    xpToNextStage: 500,
    weatherType: 'sunny',
    timeOfDay: 'day',
    unlockedElements: ['tree-oak'],
    placedElements: [],
    totalElementsUnlocked: 1,
  };

  const currentSanctuary = sanctuary || defaultSanctuary;
  const currentStage = EVOLUTION_STAGES.find(s => s.stage === currentSanctuary.evolutionStage) || EVOLUTION_STAGES[0];
  const nextStage = EVOLUTION_STAGES.find(s => s.stage === currentSanctuary.evolutionStage + 1);
  const stageConfig = getStageConfig(currentSanctuary.evolutionStage);
  const xpProgress = nextStage 
    ? Math.min((currentSanctuary.sanctuaryXp / currentSanctuary.xpToNextStage) * 100, 100) 
    : 100;

  const unlockedElementsList = useMemo(() => 
    currentSanctuary.unlockedElements || ['tree-oak'],
    [currentSanctuary.unlockedElements]
  );

  const availableElements = useMemo(() => {
    if (elementsFromAPI && elementsFromAPI.length > 0) {
      return elementsFromAPI
        .filter(e => e.evolutionStage <= currentSanctuary.evolutionStage)
        .map(e => ({
          id: e.id,
          name: e.name,
          type: e.type,
          rarity: e.rarity || 'common',
          evolutionStage: e.evolutionStage || 1,
          unlockCost: e.unlockCost || 0,
          icon: e.assetData?.icon || 'TreeDeciduous',
          colors: e.assetData?.colors || ['green-600'],
        }));
    }
    return DEFAULT_ELEMENTS.filter(e => e.evolutionStage <= currentSanctuary.evolutionStage);
  }, [currentSanctuary.evolutionStage, elementsFromAPI]);

  const creatureTypes = useMemo(() => {
    const types = ['butterfly', 'bird'];
    if (currentSanctuary.evolutionStage >= 2) types.push('rabbit');
    if (currentSanctuary.evolutionStage >= 3) types.push('deer');
    if (currentSanctuary.evolutionStage >= 5) types.push('phoenix');
    return types;
  }, [currentSanctuary.evolutionStage]);

  const flowerPositions = useMemo(() => {
    const flowers: Array<{ x: number; y: number; color: string; size: number }> = [];
    if (currentSanctuary.evolutionStage >= 2) {
      flowers.push(
        { x: 15, y: 18, color: 'pink-400', size: 24 },
        { x: 35, y: 15, color: 'purple-400', size: 20 },
        { x: 75, y: 17, color: 'yellow-400', size: 22 },
      );
    }
    if (currentSanctuary.evolutionStage >= 3) {
      flowers.push(
        { x: 55, y: 16, color: 'rose-400', size: 26 },
        { x: 25, y: 20, color: 'violet-400', size: 18 },
        { x: 85, y: 19, color: 'orange-400', size: 20 },
      );
    }
    if (currentSanctuary.evolutionStage >= 4) {
      flowers.push(
        { x: 8, y: 22, color: 'cyan-400', size: 28 },
        { x: 45, y: 14, color: 'emerald-400', size: 24 },
      );
    }
    return flowers;
  }, [currentSanctuary.evolutionStage]);

  const unlockMutation = useMutation({
    mutationFn: async ({ elementId, cost }: { elementId: string; cost: number }) => {
      return apiRequest('/api/sanctuary/unlock', {
        method: 'POST',
        body: JSON.stringify({ elementId, cost }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sanctuary/state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setShowUnlockSparkle(true);
      setSparklePosition({ x: 50, y: 50 });
      triggerConfetti();
      toast({
        title: "Element Unlocked!",
        description: "A new element has been added to your sanctuary.",
      });
    },
    onError: () => {
      toast({
        title: "Unlock Failed",
        description: "Could not unlock this element. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUnlockElement = (elementId: string, cost: number) => {
    if (!user || user.coinBalance < cost) {
      toast({
        title: "Not Enough Coins",
        description: `You need ${cost} coins to unlock this element.`,
        variant: "destructive",
      });
      return;
    }
    unlockMutation.mutate({ elementId, cost });
  };

  const isNight = currentSanctuary.timeOfDay === 'night' || currentSanctuary.timeOfDay === 'dusk';

  if (sanctuaryLoading) {
    return (
      <div className="space-y-6" data-testid="sanctuary-loading">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="growth-sanctuary-page">
      <ConfettiOverlay />
      <SparkleEffect 
        active={showUnlockSparkle} 
        position={sparklePosition}
        onComplete={() => setShowUnlockSparkle(false)}
      />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" data-testid="back-to-dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <TreeDeciduous className="w-7 h-7 text-green-500" />
              Growth Sanctuary
            </h1>
            <p className="text-muted-foreground text-sm">
              {currentStage.name}: {currentStage.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Coins className="w-4 h-4 mr-1 text-yellow-500" />
            {user?.coinBalance || 0} coins
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Stage {currentSanctuary.evolutionStage}/5
          </Badge>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sanctuary" data-testid="tab-sanctuary">Sanctuary</TabsTrigger>
          <TabsTrigger value="elements" data-testid="tab-elements">Elements</TabsTrigger>
          <TabsTrigger value="progress" data-testid="tab-progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="sanctuary" className="space-y-4">
          <Card className="overflow-hidden">
            <div
              ref={sanctuaryRef}
              className="relative h-[350px] sm:h-[450px] lg:h-[550px] rounded-lg overflow-hidden cursor-crosshair"
              onMouseMove={handleMouseMove}
              data-testid="sanctuary-canvas"
            >
              <EnhancedParallaxLayer depth={0.2} mousePosition={mousePosition}>
                <motion.div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-b transition-colors duration-1000",
                    currentSanctuary.timeOfDay === 'night' 
                      ? 'from-indigo-900 via-purple-900 to-slate-900'
                      : currentSanctuary.timeOfDay === 'dawn'
                      ? 'from-orange-200 via-pink-200 to-purple-300'
                      : currentSanctuary.timeOfDay === 'dusk'
                      ? 'from-orange-400 via-purple-400 to-indigo-500'
                      : stageConfig.skyGradient
                  )}
                />
              </EnhancedParallaxLayer>

              <EnhancedParallaxLayer depth={0.3} mousePosition={mousePosition}>
                <EnhancedWeatherEffect 
                  type={currentSanctuary.weatherType} 
                  mousePosition={mousePosition}
                  timeOfDay={currentSanctuary.timeOfDay}
                />
              </EnhancedParallaxLayer>

              <EnhancedParallaxLayer depth={0.5} mousePosition={mousePosition}>
                <div className="absolute inset-0 pointer-events-none">
                  {currentSanctuary.evolutionStage >= 2 && (
                    <div className="absolute inset-0 opacity-60">
                      <div className="absolute top-1/4 left-1/4 w-48 h-32 bg-gradient-to-r from-transparent via-blue-200/20 to-transparent blur-3xl" />
                      <div className="absolute top-1/3 right-1/4 w-64 h-48 bg-gradient-to-r from-transparent via-purple-200/15 to-transparent blur-3xl" />
                    </div>
                  )}
                </div>
              </EnhancedParallaxLayer>

              <EnhancedParallaxLayer depth={0.7} mousePosition={mousePosition}>
                <SeasonalParticles 
                  season={season}
                  count={15 + currentSanctuary.evolutionStage * 5}
                  mousePosition={mousePosition}
                  weather={currentSanctuary.weatherType as any}
                />
              </EnhancedParallaxLayer>

              <EnhancedParallaxLayer depth={1.0} mousePosition={mousePosition}>
                <HeartParticles 
                  count={8 + currentSanctuary.evolutionStage * 2}
                  mousePosition={mousePosition}
                />
              </EnhancedParallaxLayer>

              <EnhancedParallaxLayer depth={2.5} mousePosition={mousePosition}>
                <motion.div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-28 sm:h-36 bg-gradient-to-t",
                    stageConfig.groundGradient
                  )}
                >
                  <GrassLayer density={stageConfig.grassDensity} mousePosition={mousePosition} />
                </motion.div>
              </EnhancedParallaxLayer>

              <EnhancedParallaxLayer depth={1.8} mousePosition={mousePosition}>
                <div className="absolute inset-0">
                  {Array.from({ length: stageConfig.treeCount }).map((_, i) => (
                    <InteractiveTree
                      key={i}
                      index={i}
                      stage={currentSanctuary.evolutionStage}
                      glowing={currentSanctuary.evolutionStage >= 4 && i % 3 === 0}
                      mousePosition={mousePosition}
                    />
                  ))}
                </div>
              </EnhancedParallaxLayer>

              <EnhancedParallaxLayer depth={1.2} mousePosition={mousePosition}>
                <div className="absolute inset-0">
                  {creatureTypes.slice(0, stageConfig.creatureCount).map((type, i) => (
                    <EnhancedCreature 
                      key={`${type}-${i}`} 
                      type={type} 
                      index={i % 3}
                      mousePosition={mousePosition}
                    />
                  ))}
                </div>
              </EnhancedParallaxLayer>

              <EnhancedParallaxLayer depth={0.6} mousePosition={mousePosition}>
                <div className="absolute inset-0">
                  {flowerPositions.map((flower, i) => (
                    <InteractiveFlower
                      key={i}
                      position={{ x: flower.x, y: flower.y }}
                      color={flower.color}
                      size={flower.size}
                      delay={i * 0.1}
                    />
                  ))}
                </div>
              </EnhancedParallaxLayer>

              {currentSanctuary.evolutionStage >= 3 && (
                <EnhancedParallaxLayer depth={1.5} mousePosition={mousePosition}>
                  <InteractivePond
                    position={{ x: 45, y: 12 }}
                    width={120}
                    height={50}
                    mousePosition={mousePosition}
                  />
                </EnhancedParallaxLayer>
              )}

              {isNight && (
                <EnhancedParallaxLayer depth={0.4} mousePosition={mousePosition} enableMouseFollow={false}>
                  <FireflyParticles 
                    count={20 + currentSanctuary.evolutionStage * 5}
                    mousePosition={mousePosition}
                    active={true}
                  />
                </EnhancedParallaxLayer>
              )}

              <EnhancedParallaxLayer depth={0.8} mousePosition={mousePosition}>
                <MagicDust 
                  count={25 + currentSanctuary.evolutionStage * 8}
                  mousePosition={mousePosition}
                  color={isNight ? 'silver' : 'gold'}
                />
              </EnhancedParallaxLayer>

              <div className="absolute bottom-4 left-4 right-4 z-10">
                <Card className="bg-background/85 backdrop-blur-md border-primary/20">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Crown className="w-4 h-4 text-primary" />
                        {currentStage.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {currentSanctuary.sanctuaryXp.toLocaleString()} / {currentSanctuary.xpToNextStage.toLocaleString()} XP
                      </span>
                    </div>
                    <Progress value={xpProgress} className="h-2.5" />
                    {nextStage && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {(currentSanctuary.xpToNextStage - currentSanctuary.sanctuaryXp).toLocaleString()} XP to {nextStage.name}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="hover-elevate">
              <CardContent className="p-4 text-center">
                <TreeDeciduous className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{stageConfig.treeCount}</p>
                <p className="text-xs text-muted-foreground">Trees</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4 text-center">
                <Bird className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{stageConfig.creatureCount}</p>
                <p className="text-xs text-muted-foreground">Creatures</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4 text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold">{unlockedElementsList.length}</p>
                <p className="text-xs text-muted-foreground">Unlocked</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4 text-center">
                <Crown className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold">{currentSanctuary.evolutionStage}</p>
                <p className="text-xs text-muted-foreground">Stage</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="elements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Available Elements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {availableElements.map(element => (
                    <ElementCard
                      key={element.id}
                      element={element}
                      isUnlocked={unlockedElementsList.includes(element.id)}
                      userCoins={user?.coinBalance || 0}
                      onUnlock={handleUnlockElement}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Locked Elements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEFAULT_ELEMENTS
                  .filter(e => e.evolutionStage > currentSanctuary.evolutionStage)
                  .slice(0, 4)
                  .map(element => (
                    <div
                      key={element.id}
                      className="p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-muted-foreground">{element.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Unlocks at Stage {element.evolutionStage}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolution Journey</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {EVOLUTION_STAGES.map((stage, index) => {
                  const isCompleted = currentSanctuary.evolutionStage > stage.stage;
                  const isCurrent = currentSanctuary.evolutionStage === stage.stage;
                  const isLocked = currentSanctuary.evolutionStage < stage.stage;

                  return (
                    <motion.div
                      key={stage.stage}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border-2 transition-colors",
                        isCompleted && "border-green-400 bg-green-50 dark:bg-green-900/20",
                        isCurrent && "border-primary bg-primary/5",
                        isLocked && "border-muted bg-muted/30 opacity-60"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold",
                        isCompleted && "bg-green-500 text-white",
                        isCurrent && "bg-primary text-primary-foreground",
                        isLocked && "bg-muted text-muted-foreground"
                      )}>
                        {isCompleted ? <Sparkles className="w-5 h-5" /> : stage.stage}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{stage.name}</h3>
                        <p className="text-sm text-muted-foreground">{stage.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stage.xpRequired.toLocaleString()} XP required
                        </p>
                      </div>
                      {isCurrent && (
                        <Badge variant="default">Current</Badge>
                      )}
                      {isCompleted && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          Completed
                        </Badge>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                How to Grow Your Sanctuary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">Complete Goals</h4>
                    <p className="text-sm text-muted-foreground">+50 XP per goal completed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">Finish Tasks</h4>
                    <p className="text-sm text-muted-foreground">+10 XP per task completed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">Maintain Streaks</h4>
                    <p className="text-sm text-muted-foreground">+25 XP per day streak bonus</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Star className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">Earn Achievements</h4>
                    <p className="text-sm text-muted-foreground">Bonus XP from unlocking achievements</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Target = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const CheckSquare = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <polyline points="9 11 12 14 22 4" />
  </svg>
);
