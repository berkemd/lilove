import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

interface EnvironmentState {
  id: string;
  environmentLevel: number;
  environmentXp: number;
  xpToNextLevel: number;
  levelName?: string;
  unlockedElements?: {
    trees: string[];
    animals: string[];
    decorations: string[];
    effects: string[];
  };
  currentTheme?: string;
}

const getLevelName = (level: number): string => {
  if (level <= 2) return "Barren Lands";
  if (level <= 4) return "Awakening Grove";
  if (level <= 6) return "Growing Sanctuary";
  if (level <= 8) return "Flourishing Forest";
  return "Magical Paradise";
};

interface LivingForestProps {
  compact?: boolean;
}

interface LevelConfig {
  skyColors: string[];
  groundColor: string;
  grassColor: string;
  treeCount: number;
  treeType: 'seedling' | 'sapling' | 'tree' | 'mature' | 'ancient';
  levelName: string;
  hasButterflies: boolean;
  hasBirds: boolean;
  hasSparkles: boolean;
}

const getLevelConfig = (level: number): LevelConfig => {
  if (level <= 2) {
    return {
      skyColors: ['#D1D5DB', '#9CA3AF'],
      groundColor: '#92400E',
      grassColor: '#84CC16',
      treeCount: 2,
      treeType: 'seedling',
      levelName: 'Barren Lands',
      hasButterflies: true,
      hasBirds: false,
      hasSparkles: false,
    };
  }
  if (level <= 4) {
    return {
      skyColors: ['#BAE6FD', '#7DD3FC'],
      groundColor: '#65A30D',
      grassColor: '#22C55E',
      treeCount: 4,
      treeType: 'sapling',
      levelName: 'Awakening Grove',
      hasButterflies: true,
      hasBirds: false,
      hasSparkles: false,
    };
  }
  if (level <= 6) {
    return {
      skyColors: ['#7DD3FC', '#38BDF8'],
      groundColor: '#22C55E',
      grassColor: '#16A34A',
      treeCount: 5,
      treeType: 'tree',
      levelName: 'Growing Sanctuary',
      hasButterflies: true,
      hasBirds: true,
      hasSparkles: false,
    };
  }
  if (level <= 8) {
    return {
      skyColors: ['#FDE68A', '#7DD3FC'],
      groundColor: '#10B981',
      grassColor: '#059669',
      treeCount: 6,
      treeType: 'mature',
      levelName: 'Flourishing Forest',
      hasButterflies: true,
      hasBirds: true,
      hasSparkles: true,
    };
  }
  return {
    skyColors: ['#E9D5FF', '#A78BFA'],
    groundColor: '#14B8A6',
    grassColor: '#0D9488',
    treeCount: 7,
    treeType: 'ancient',
    levelName: 'Magical Paradise',
    hasButterflies: true,
    hasBirds: true,
    hasSparkles: true,
  };
};

function AnimatedTree({ index, type, compact }: { index: number; type: string; compact?: boolean }) {
  const swayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 100,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, {
          toValue: 1,
          duration: 2000 + index * 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: 0,
          duration: 2000 + index * 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotate = swayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-3deg', '3deg'],
  });

  const getTreeSize = () => {
    const baseSize = compact ? 0.6 : 1;
    switch (type) {
      case 'seedling': return { width: 8 * baseSize, height: 12 * baseSize, trunkHeight: 6 * baseSize };
      case 'sapling': return { width: 12 * baseSize, height: 20 * baseSize, trunkHeight: 10 * baseSize };
      case 'tree': return { width: 20 * baseSize, height: 28 * baseSize, trunkHeight: 12 * baseSize };
      case 'mature': return { width: 24 * baseSize, height: 36 * baseSize, trunkHeight: 14 * baseSize };
      case 'ancient': return { width: 32 * baseSize, height: 44 * baseSize, trunkHeight: 16 * baseSize };
      default: return { width: 16 * baseSize, height: 24 * baseSize, trunkHeight: 10 * baseSize };
    }
  };

  const size = getTreeSize();
  const leftPosition = 10 + (index * 14);
  const isGlowing = type === 'mature' || type === 'ancient';

  return (
    <Animated.View
      style={[
        styles.tree,
        {
          left: `${leftPosition}%`,
          transform: [{ rotate }, { scale: scaleAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.treeCanopy,
          {
            width: size.width,
            height: size.width,
            backgroundColor: isGlowing ? '#34D399' : '#22C55E',
            borderRadius: size.width / 2,
          },
          isGlowing && styles.glowingCanopy,
        ]}
      />
      <View
        style={[
          styles.treeTrunk,
          {
            width: size.width / 4,
            height: size.trunkHeight,
            backgroundColor: '#92400E',
          },
        ]}
      />
    </Animated.View>
  );
}

function AnimatedButterfly({ index }: { index: number }) {
  const positionAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 500,
      delay: 500 + index * 200,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(positionAnim, {
          toValue: { x: 20 + Math.random() * 20, y: -15 - Math.random() * 10 },
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(positionAnim, {
          toValue: { x: -10 - Math.random() * 20, y: 5 + Math.random() * 10 },
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(positionAnim, {
          toValue: { x: 0, y: 0 },
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.creature,
        {
          left: `${25 + index * 25}%`,
          top: `${35 + index * 10}%`,
          opacity: opacityAnim,
          transform: positionAnim.getTranslateTransform(),
        },
      ]}
    >
      <Ionicons name="bug-outline" size={14} color="#F472B6" />
    </Animated.View>
  );
}

function AnimatedBird({ index }: { index: number }) {
  const positionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(positionAnim, {
        toValue: 1,
        duration: 8000 + index * 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = positionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 200],
  });

  return (
    <Animated.View
      style={[
        styles.creature,
        {
          top: `${15 + index * 8}%`,
          transform: [{ translateX }],
        },
      ]}
    >
      <Ionicons name="airplane-outline" size={12} color="#64748B" />
    </Animated.View>
  );
}

function AnimatedSparkle({ index }: { index: number }) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.5,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1000 + index * 500),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          left: `${20 + index * 25}%`,
          top: `${30 + index * 15}%`,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Ionicons name="sparkles" size={12} color="#FDE047" />
    </Animated.View>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const percentage = Math.min((value / max) * 100, 100);
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: percentage,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const width = animWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.xpBarContainer}>
      <Animated.View style={[styles.xpBarFill, { width }]} />
    </View>
  );
}

export default function LivingForest({ compact = false }: LivingForestProps) {
  const [environment, setEnvironment] = useState<EnvironmentState | null>(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadEnvironment();
  }, []);

  const loadEnvironment = async () => {
    try {
      const data = await api.getEnvironment() as EnvironmentState;
      setEnvironment(data);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error('[LivingForest] Error loading environment:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator size="small" color="#8B5CF6" />
      </View>
    );
  }

  const level = environment?.environmentLevel || 1;
  const xp = environment?.environmentXp || 0;
  const xpToNext = environment?.xpToNextLevel || 100;
  const config = getLevelConfig(level);
  const displayLevelName = environment?.levelName || getLevelName(level);

  return (
    <Animated.View
      style={[
        styles.container,
        compact && styles.containerCompact,
        { opacity: fadeAnim },
      ]}
      data-testid="living-forest-container"
    >
      <View style={[styles.sky, { backgroundColor: config.skyColors[0] }]}>
        <View style={[styles.skyGradient, { backgroundColor: config.skyColors[1] }]} />
      </View>

      <View style={[styles.ground, { backgroundColor: config.groundColor }]}>
        <View style={[styles.grass, { backgroundColor: config.grassColor }]} />
      </View>

      <View style={styles.elementsContainer}>
        {Array.from({ length: config.treeCount }).map((_, i) => (
          <AnimatedTree key={i} index={i} type={config.treeType} compact={compact} />
        ))}
        
        {config.hasButterflies && (
          <>
            <AnimatedButterfly index={0} />
            <AnimatedButterfly index={1} />
          </>
        )}
        
        {config.hasBirds && (
          <>
            <AnimatedBird index={0} />
            <AnimatedBird index={1} />
          </>
        )}
        
        {config.hasSparkles && (
          <>
            <AnimatedSparkle index={0} />
            <AnimatedSparkle index={1} />
            <AnimatedSparkle index={2} />
          </>
        )}
      </View>

      <View style={styles.infoOverlay}>
        <View style={styles.levelInfo}>
          <View style={styles.levelBadge}>
            <Ionicons name="leaf" size={12} color="#10B981" />
            <Text style={styles.levelText}>Lv {level}</Text>
          </View>
          <Text style={styles.levelName}>{displayLevelName}</Text>
        </View>
        
        <View style={styles.xpSection}>
          <ProgressBar value={xp} max={xpToNext} />
          <Text style={styles.xpText}>{xp} / {xpToNext} XP</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  containerCompact: {
    height: 100,
  },
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '40%',
  },
  skyGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    opacity: 0.6,
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  grass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  elementsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tree: {
    position: 'absolute',
    bottom: '35%',
    alignItems: 'center',
  },
  treeCanopy: {
    marginBottom: -2,
  },
  glowingCanopy: {
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  treeTrunk: {
    borderRadius: 2,
  },
  creature: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
  },
  infoOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  levelName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  xpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  xpText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    minWidth: 60,
    textAlign: 'right',
  },
});
