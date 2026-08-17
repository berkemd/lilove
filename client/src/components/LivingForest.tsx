import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TreeDeciduous, Sparkles, Leaf, Bird, Bug, Flower2, Fish, Flame, Star, Moon, Sun, Cloud, Droplets, Mountain, Rabbit, Cat } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnvironmentState {
  id: string;
  environmentLevel: number;
  environmentXp: number;
  xpToNextLevel: number;
  unlockedElements: {
    trees: string[];
    animals: string[];
    decorations: string[];
    effects: string[];
  };
  currentTheme: string;
}

interface LivingForestProps {
  compact?: boolean;
  showProgress?: boolean;
  interactive?: boolean;
}

const getLevelConfig = (level: number) => {
  if (level <= 2) {
    return {
      skyGradient: "from-gray-300 via-gray-400 to-gray-500 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900",
      groundGradient: "from-amber-800 via-amber-700 to-amber-600 dark:from-amber-950 dark:via-amber-900 dark:to-amber-800",
      grassDensity: 3,
      treeCount: 2,
      treeType: "seedling",
      creatures: ["butterfly"],
      decorations: ["rocks"],
      effects: [],
      levelName: "Barren Lands",
    };
  }
  if (level <= 4) {
    return {
      skyGradient: "from-sky-200 via-sky-300 to-sky-400 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900",
      groundGradient: "from-green-700 via-green-600 to-green-500 dark:from-green-950 dark:via-green-900 dark:to-green-800",
      grassDensity: 6,
      treeCount: 4,
      treeType: "sapling",
      creatures: ["butterfly", "butterfly"],
      decorations: ["grass", "mushroom"],
      effects: [],
      levelName: "Awakening Grove",
    };
  }
  if (level <= 6) {
    return {
      skyGradient: "from-sky-300 via-blue-400 to-blue-500 dark:from-indigo-900 dark:via-purple-900 dark:to-slate-900",
      groundGradient: "from-green-600 via-green-500 to-emerald-400 dark:from-green-900 dark:via-green-800 dark:to-emerald-800",
      grassDensity: 10,
      treeCount: 6,
      treeType: "tree",
      creatures: ["butterfly", "bird", "bird"],
      decorations: ["flower", "flower", "mushroom", "pond"],
      effects: ["sunray"],
      levelName: "Growing Sanctuary",
    };
  }
  if (level <= 8) {
    return {
      skyGradient: "from-orange-200 via-amber-300 to-sky-400 dark:from-purple-900 dark:via-indigo-900 dark:to-slate-800",
      groundGradient: "from-emerald-600 via-green-500 to-teal-400 dark:from-emerald-900 dark:via-green-800 dark:to-teal-800",
      grassDensity: 15,
      treeCount: 8,
      treeType: "mature",
      creatures: ["butterfly", "bird", "bird", "deer", "rabbit"],
      decorations: ["flower", "flower", "flower", "mushroom", "waterfall", "crystals"],
      effects: ["sunray", "sunray", "firefly"],
      levelName: "Flourishing Forest",
    };
  }
  return {
    skyGradient: "from-purple-300 via-pink-300 to-indigo-400 dark:from-violet-950 dark:via-purple-900 dark:to-indigo-950",
    groundGradient: "from-emerald-500 via-teal-400 to-cyan-400 dark:from-emerald-800 dark:via-teal-700 dark:to-cyan-800",
    grassDensity: 20,
    treeCount: 10,
    treeType: "ancient",
    creatures: ["butterfly", "bird", "bird", "deer", "phoenix", "phoenix"],
    decorations: ["flower", "flower", "glowingFlower", "crystals", "crystals", "waterfall", "aurora"],
    effects: ["sunray", "firefly", "firefly", "sparkle", "sparkle"],
    levelName: "Magical Paradise",
  };
};

const Seedling = ({ index, interactive }: { index: number; interactive?: boolean }) => (
  <motion.div
    className={cn(
      "absolute bottom-8 w-4 h-6 flex flex-col items-center",
      interactive && "cursor-pointer hover:scale-110"
    )}
    style={{ left: `${15 + index * 20}%` }}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay: index * 0.1 }}
    data-testid={`element-seedling-${index}`}
  >
    <div className="w-0.5 h-3 bg-amber-700 dark:bg-amber-600" />
    <motion.div
      className="w-3 h-2 bg-green-500 dark:bg-green-400 rounded-full"
      animate={{ rotate: [-5, 5, -5] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      style={{ originY: 1 }}
    />
  </motion.div>
);

const SaplingTree = ({ index, interactive }: { index: number; interactive?: boolean }) => (
  <motion.div
    className={cn(
      "absolute bottom-8 flex flex-col items-center",
      interactive && "cursor-pointer hover:scale-105"
    )}
    style={{ left: `${10 + index * 15}%` }}
    initial={{ scale: 0, y: 20 }}
    animate={{ scale: 1, y: 0 }}
    transition={{ delay: index * 0.15 }}
    data-testid={`element-sapling-${index}`}
  >
    <motion.div
      animate={{ rotate: [-2, 2, -2] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      style={{ originY: 1 }}
      className="flex flex-col items-center"
    >
      <div className="w-4 h-8 bg-green-500 dark:bg-green-400 rounded-full" />
      <div className="w-1 h-6 bg-amber-700 dark:bg-amber-600" />
    </motion.div>
  </motion.div>
);

const FullTree = ({ index, glowing, interactive }: { index: number; glowing?: boolean; interactive?: boolean }) => (
  <motion.div
    className={cn(
      "absolute bottom-8 flex flex-col items-center",
      interactive && "cursor-pointer hover:scale-105"
    )}
    style={{ left: `${5 + index * 12}%` }}
    initial={{ scale: 0, y: 30 }}
    animate={{ scale: 1, y: 0 }}
    transition={{ delay: index * 0.1, type: "spring" }}
    data-testid={`element-tree-${index}`}
  >
    <motion.div
      animate={{ rotate: [-1, 1, -1] }}
      transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut" }}
      style={{ originY: 1 }}
      className="flex flex-col items-center"
    >
      <div className={cn(
        "w-8 h-10 rounded-full relative",
        glowing 
          ? "bg-gradient-to-t from-emerald-400 to-cyan-300 dark:from-emerald-500 dark:to-cyan-400 shadow-lg shadow-emerald-400/50 dark:shadow-emerald-500/50" 
          : "bg-gradient-to-t from-green-600 to-green-400 dark:from-green-700 dark:to-green-500"
      )}>
        {glowing && (
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-300/50 dark:bg-emerald-400/30"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
      <div className="w-2 h-8 bg-amber-800 dark:bg-amber-700 rounded-sm" />
    </motion.div>
  </motion.div>
);

const AncientTree = ({ index, interactive }: { index: number; interactive?: boolean }) => (
  <motion.div
    className={cn(
      "absolute bottom-8 flex flex-col items-center",
      interactive && "cursor-pointer hover:scale-105"
    )}
    style={{ left: `${3 + index * 10}%` }}
    initial={{ scale: 0, y: 50 }}
    animate={{ scale: 1, y: 0 }}
    transition={{ delay: index * 0.1, type: "spring" }}
    data-testid={`element-ancient-tree-${index}`}
  >
    <motion.div
      animate={{ rotate: [-0.5, 0.5, -0.5] }}
      transition={{ duration: 6 + index, repeat: Infinity, ease: "easeInOut" }}
      style={{ originY: 1 }}
      className="flex flex-col items-center relative"
    >
      <div className="w-12 h-14 rounded-full bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300 dark:from-emerald-600 dark:via-teal-500 dark:to-cyan-400 shadow-xl shadow-emerald-500/40 relative">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-300"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.3 }}
        />
      </div>
      <div className="w-3 h-10 bg-amber-900 dark:bg-amber-800 rounded-sm" />
    </motion.div>
  </motion.div>
);

const Butterfly = ({ index }: { index: number }) => (
  <motion.div
    className="absolute"
    style={{ left: `${20 + index * 25}%`, bottom: `${40 + index * 10}%` }}
    animate={{
      x: [0, 30, -20, 10, 0],
      y: [0, -20, -10, -30, 0],
    }}
    transition={{ duration: 8 + index * 2, repeat: Infinity, ease: "easeInOut" }}
    data-testid={`creature-butterfly-${index}`}
  >
    <Bug className="w-4 h-4 text-pink-400 dark:text-pink-300" />
  </motion.div>
);

const BirdCreature = ({ index }: { index: number }) => (
  <motion.div
    className="absolute"
    style={{ left: `${10 + index * 30}%`, top: `${15 + index * 5}%` }}
    animate={{
      x: [0, 100, 200, 100, 0],
      y: [0, -10, 0, 10, 0],
    }}
    transition={{ duration: 15 + index * 3, repeat: Infinity, ease: "linear" }}
    data-testid={`creature-bird-${index}`}
  >
    <Bird className="w-5 h-5 text-slate-600 dark:text-slate-300" />
  </motion.div>
);

const DeerCreature = ({ index }: { index: number }) => (
  <motion.div
    className="absolute bottom-12"
    style={{ left: `${30 + index * 20}%` }}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.5 }}
    data-testid={`creature-deer-${index}`}
  >
    <motion.div
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Cat className="w-6 h-6 text-amber-700 dark:text-amber-500" />
    </motion.div>
  </motion.div>
);

const RabbitCreature = ({ index }: { index: number }) => (
  <motion.div
    className="absolute bottom-10"
    style={{ left: `${50 + index * 15}%` }}
    animate={{ y: [0, -5, 0] }}
    transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.5 }}
    data-testid={`creature-rabbit-${index}`}
  >
    <Rabbit className="w-5 h-5 text-gray-500 dark:text-gray-400" />
  </motion.div>
);

const Phoenix = ({ index }: { index: number }) => (
  <motion.div
    className="absolute"
    style={{ left: `${15 + index * 40}%`, top: `${10 + index * 5}%` }}
    animate={{
      x: [0, 50, 100, 50, 0],
      y: [0, -20, 0, -20, 0],
      rotate: [0, 5, 0, -5, 0],
    }}
    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    data-testid={`creature-phoenix-${index}`}
  >
    <motion.div
      animate={{ opacity: [0.8, 1, 0.8] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <Flame className="w-8 h-8 text-orange-500 dark:text-orange-400 drop-shadow-lg" />
    </motion.div>
  </motion.div>
);

const FlowerDecor = ({ index }: { index: number }) => (
  <motion.div
    className="absolute bottom-6"
    style={{ left: `${8 + index * 18}%` }}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay: index * 0.2, type: "spring" }}
    data-testid={`decor-flower-${index}`}
  >
    <motion.div
      animate={{ rotate: [-10, 10, -10] }}
      transition={{ duration: 3, repeat: Infinity }}
    >
      <Flower2 className="w-4 h-4 text-pink-500 dark:text-pink-400" />
    </motion.div>
  </motion.div>
);

const GlowingFlower = ({ index }: { index: number }) => (
  <motion.div
    className="absolute bottom-6"
    style={{ left: `${25 + index * 20}%` }}
    data-testid={`decor-glowing-flower-${index}`}
  >
    <motion.div
      animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="relative"
    >
      <Flower2 className="w-5 h-5 text-purple-400 dark:text-purple-300" />
      <div className="absolute inset-0 blur-md bg-purple-400/50 rounded-full" />
    </motion.div>
  </motion.div>
);

const MushroomDecor = ({ index }: { index: number }) => (
  <motion.div
    className="absolute bottom-6"
    style={{ left: `${35 + index * 25}%` }}
    initial={{ scale: 0, y: 10 }}
    animate={{ scale: 1, y: 0 }}
    data-testid={`decor-mushroom-${index}`}
  >
    <div className="flex flex-col items-center">
      <div className="w-3 h-2 bg-red-500 dark:bg-red-400 rounded-t-full" />
      <div className="w-1 h-2 bg-amber-200 dark:bg-amber-100" />
    </div>
  </motion.div>
);

const CrystalsDecor = ({ index }: { index: number }) => (
  <motion.div
    className="absolute bottom-7"
    style={{ left: `${60 + index * 15}%` }}
    data-testid={`decor-crystals-${index}`}
  >
    <motion.div
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2.5, repeat: Infinity, delay: index * 0.5 }}
      className="flex gap-0.5"
    >
      <div className="w-1 h-4 bg-cyan-400 dark:bg-cyan-300 transform -rotate-12" />
      <div className="w-1 h-6 bg-purple-400 dark:bg-purple-300" />
      <div className="w-1 h-3 bg-pink-400 dark:bg-pink-300 transform rotate-12" />
    </motion.div>
  </motion.div>
);

const Pond = () => (
  <motion.div
    className="absolute bottom-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-gradient-to-b from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 rounded-full opacity-80"
    data-testid="decor-pond"
  >
    <motion.div
      className="absolute inset-0 bg-white/20 rounded-full"
      animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
      transition={{ duration: 3, repeat: Infinity }}
    />
    <Fish className="absolute top-1 left-4 w-3 h-3 text-orange-400" />
  </motion.div>
);

const Waterfall = () => (
  <motion.div
    className="absolute bottom-8 right-[15%] flex flex-col items-center"
    data-testid="decor-waterfall"
  >
    <div className="w-6 h-12 bg-gradient-to-b from-blue-300 to-blue-500 dark:from-blue-400 dark:to-blue-600 rounded-t relative overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-white/40"
        animate={{ y: [-12, 12] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
    <motion.div
      className="w-10 h-4 bg-blue-400/60 dark:bg-blue-500/60 rounded-full"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
    />
  </motion.div>
);

const SunRay = ({ index }: { index: number }) => (
  <motion.div
    className="absolute top-0"
    style={{ left: `${20 + index * 30}%` }}
    data-testid={`effect-sunray-${index}`}
  >
    <motion.div
      className="w-8 h-32 bg-gradient-to-b from-yellow-200/40 to-transparent dark:from-yellow-100/20"
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 4, repeat: Infinity, delay: index * 1.5 }}
      style={{ transform: `rotate(${-15 + index * 10}deg)` }}
    />
  </motion.div>
);

const Firefly = ({ index }: { index: number }) => (
  <motion.div
    className="absolute"
    style={{ left: `${30 + index * 20}%`, top: `${50 + index * 10}%` }}
    data-testid={`effect-firefly-${index}`}
  >
    <motion.div
      className="w-2 h-2 rounded-full bg-yellow-300 dark:bg-yellow-200 shadow-lg shadow-yellow-400"
      animate={{
        x: [0, 15, -10, 20, 0],
        y: [0, -15, -5, -20, 0],
        opacity: [0.4, 1, 0.6, 1, 0.4],
      }}
      transition={{ duration: 6 + index * 2, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

const SparkleEffect = ({ index }: { index: number }) => (
  <motion.div
    className="absolute"
    style={{ left: `${15 + index * 35}%`, top: `${20 + index * 20}%` }}
    data-testid={`effect-sparkle-${index}`}
  >
    <motion.div
      animate={{
        scale: [0, 1, 0],
        opacity: [0, 1, 0],
        rotate: [0, 180],
      }}
      transition={{ duration: 2, repeat: Infinity, delay: index * 0.7 }}
    >
      <Sparkles className="w-4 h-4 text-yellow-300 dark:text-yellow-200" />
    </motion.div>
  </motion.div>
);

const Aurora = () => (
  <motion.div
    className="absolute top-0 left-0 right-0 h-24 overflow-hidden"
    data-testid="effect-aurora"
  >
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-green-400/30 to-pink-400/30 dark:from-purple-500/40 dark:via-green-500/40 dark:to-pink-500/40 blur-xl"
      animate={{
        x: [-100, 100, -100],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

const GrassLayer = ({ density }: { density: number }) => (
  <div className="absolute bottom-0 left-0 right-0 h-8 flex justify-around items-end overflow-hidden">
    {Array.from({ length: density }).map((_, i) => (
      <motion.div
        key={i}
        className="w-1 bg-gradient-to-t from-green-700 to-green-500 dark:from-green-800 dark:to-green-600 rounded-t"
        style={{ height: `${8 + Math.random() * 16}px` }}
        animate={{ rotate: [-5, 5, -5] }}
        transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: i * 0.1 }}
      />
    ))}
  </div>
);

const renderCreatures = (creatures: string[]) => {
  const counts: Record<string, number> = {};
  return creatures.map((creature, i) => {
    counts[creature] = (counts[creature] || 0);
    const index = counts[creature]++;
    switch (creature) {
      case "butterfly": return <Butterfly key={`butterfly-${i}`} index={index} />;
      case "bird": return <BirdCreature key={`bird-${i}`} index={index} />;
      case "deer": return <DeerCreature key={`deer-${i}`} index={index} />;
      case "rabbit": return <RabbitCreature key={`rabbit-${i}`} index={index} />;
      case "phoenix": return <Phoenix key={`phoenix-${i}`} index={index} />;
      default: return null;
    }
  });
};

const renderDecorations = (decorations: string[]) => {
  const counts: Record<string, number> = {};
  return decorations.map((decor, i) => {
    counts[decor] = (counts[decor] || 0);
    const index = counts[decor]++;
    switch (decor) {
      case "flower": return <FlowerDecor key={`flower-${i}`} index={index} />;
      case "glowingFlower": return <GlowingFlower key={`glowingFlower-${i}`} index={index} />;
      case "mushroom": return <MushroomDecor key={`mushroom-${i}`} index={index} />;
      case "crystals": return <CrystalsDecor key={`crystals-${i}`} index={index} />;
      case "pond": return <Pond key="pond" />;
      case "waterfall": return <Waterfall key="waterfall" />;
      case "aurora": return <Aurora key="aurora" />;
      default: return null;
    }
  });
};

const renderEffects = (effects: string[]) => {
  const counts: Record<string, number> = {};
  return effects.map((effect, i) => {
    counts[effect] = (counts[effect] || 0);
    const index = counts[effect]++;
    switch (effect) {
      case "sunray": return <SunRay key={`sunray-${i}`} index={index} />;
      case "firefly": return <Firefly key={`firefly-${i}`} index={index} />;
      case "sparkle": return <SparkleEffect key={`sparkle-${i}`} index={index} />;
      default: return null;
    }
  });
};

const renderTrees = (count: number, type: string, interactive?: boolean) => {
  return Array.from({ length: count }).map((_, i) => {
    switch (type) {
      case "seedling": return <Seedling key={i} index={i} interactive={interactive} />;
      case "sapling": return <SaplingTree key={i} index={i} interactive={interactive} />;
      case "tree": return <FullTree key={i} index={i} interactive={interactive} />;
      case "mature": return <FullTree key={i} index={i} glowing interactive={interactive} />;
      case "ancient": return <AncientTree key={i} index={i} interactive={interactive} />;
      default: return null;
    }
  });
};

export default function LivingForest({ compact = false, showProgress = true, interactive = false }: LivingForestProps) {
  const { data: environment, isLoading } = useQuery<EnvironmentState>({
    queryKey: ['/api/environment'],
  });

  if (isLoading) {
    return (
      <div 
        className={cn(
          "rounded-lg overflow-hidden",
          compact ? "h-32" : "h-64"
        )}
        data-testid="living-forest-loading"
      >
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  const level = environment?.environmentLevel || 1;
  const xp = environment?.environmentXp || 0;
  const xpToNext = environment?.xpToNextLevel || 100;
  const unlockedElements = environment?.unlockedElements || { trees: [], animals: [], decorations: [], effects: [] };
  const totalUnlocked = unlockedElements.trees.length + unlockedElements.animals.length + unlockedElements.decorations.length + unlockedElements.effects.length;

  const config = getLevelConfig(level);
  const xpProgress = Math.min((xp / xpToNext) * 100, 100);

  return (
    <div 
      className={cn(
        "relative rounded-lg overflow-hidden transition-all duration-1000",
        compact ? "h-32" : "h-64"
      )}
      data-testid="living-forest-container"
    >
      <motion.div
        className={cn(
          "absolute inset-0 bg-gradient-to-b transition-colors duration-1000",
          config.skyGradient
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        data-testid="living-forest-sky"
      >
        {level >= 7 && (
          <Sun className="absolute top-4 right-8 w-8 h-8 text-yellow-400 dark:text-yellow-300 opacity-80" />
        )}
        {level <= 4 && (
          <Cloud className="absolute top-6 left-10 w-10 h-6 text-gray-300/60 dark:text-gray-500/40" />
        )}
        {level >= 9 && (
          <>
            <Moon className="absolute top-4 left-8 w-6 h-6 text-purple-200 dark:text-purple-100 opacity-60" />
            <Star className="absolute top-8 left-20 w-3 h-3 text-yellow-200" />
            <Star className="absolute top-6 right-20 w-2 h-2 text-yellow-200" />
          </>
        )}
      </motion.div>

      <motion.div
        className={cn(
          "absolute bottom-0 left-0 right-0 transition-colors duration-1000",
          compact ? "h-12" : "h-20",
          "bg-gradient-to-t",
          config.groundGradient
        )}
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        data-testid="living-forest-ground"
      >
        <GrassLayer density={config.grassDensity} />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`level-${level}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {renderEffects(config.effects)}
          {renderTrees(config.treeCount, config.treeType, interactive)}
          {renderDecorations(config.decorations)}
          {renderCreatures(config.creatures)}
        </motion.div>
      </AnimatePresence>

      <div className="absolute top-2 left-2 flex items-center gap-2" data-testid="living-forest-level-badge">
        <Badge variant="secondary" className="bg-black/30 dark:bg-white/20 text-white backdrop-blur-sm">
          <TreeDeciduous className="w-3 h-3 mr-1" />
          Lv.{level}
        </Badge>
        {!compact && (
          <Badge variant="secondary" className="bg-black/30 dark:bg-white/20 text-white backdrop-blur-sm">
            {config.levelName}
          </Badge>
        )}
      </div>

      {showProgress && (
        <div className={cn(
          "absolute left-2 right-2 flex items-center gap-2",
          compact ? "bottom-1" : "bottom-2"
        )} data-testid="living-forest-progress">
          <Progress value={xpProgress} className="flex-1 h-2 bg-black/20 dark:bg-white/10" />
          <span className="text-xs text-white font-medium backdrop-blur-sm bg-black/20 dark:bg-white/10 px-2 py-0.5 rounded" data-testid="text-xp-progress">
            {xp}/{xpToNext} XP
          </span>
        </div>
      )}

      {!compact && showProgress && (
        <div className="absolute top-2 right-2" data-testid="living-forest-unlocked">
          <Badge variant="secondary" className="bg-black/30 dark:bg-white/20 text-white backdrop-blur-sm">
            <Sparkles className="w-3 h-3 mr-1" />
            {totalUnlocked} Unlocked
          </Badge>
        </div>
      )}

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
