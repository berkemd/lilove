import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LiLoveTheme, useThemedColors } from '../theme/LiLoveTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EvolutionStage {
  stage: number;
  name: string;
  xpRequired: number;
  description: string;
}

interface SanctuaryElement {
  id: string;
  name: string;
  type: 'tree' | 'creature' | 'decoration' | 'effect';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  evolutionStage: number;
  unlockCost: number;
  icon: string;
}

interface SanctuaryState {
  evolutionStage: number;
  sanctuaryXp: number;
  xpToNextStage: number;
  weatherType: string;
  timeOfDay: string;
  unlockedElements: string[];
  totalElementsUnlocked: number;
}

const EVOLUTION_STAGES: EvolutionStage[] = [
  { stage: 1, name: 'Seedling', xpRequired: 0, description: 'Your journey begins with a single seed of hope' },
  { stage: 2, name: 'Sapling', xpRequired: 500, description: 'Young growth stretches toward the light' },
  { stage: 3, name: 'Young Forest', xpRequired: 1500, description: 'A vibrant ecosystem begins to form' },
  { stage: 4, name: 'Mature Forest', xpRequired: 4000, description: 'Life flourishes in abundance' },
  { stage: 5, name: 'Ancient Grove', xpRequired: 10000, description: 'A magical sanctuary of wisdom and wonder' },
];

const WEATHER_CONFIGS = {
  sunny: { icon: 'sunny', gradient: ['#87CEEB', '#4A90D9', '#2E6DB4'] },
  cloudy: { icon: 'cloudy', gradient: ['#9CA3AF', '#6B7280', '#4B5563'] },
  rainy: { icon: 'rainy', gradient: ['#64748B', '#475569', '#334155'] },
  aurora: { icon: 'sparkles', gradient: ['#8B5CF6', '#EC4899', '#14B8A6'] },
  starry: { icon: 'moon', gradient: ['#1E1B4B', '#312E81', '#0F172A'] },
};

const RARITY_COLORS = {
  common: '#9CA3AF',
  uncommon: '#22C55E',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

const getStageGradients = (stage: number, isDark: boolean) => {
  const gradients = {
    1: {
      sky: isDark ? ['#374151', '#1F2937', '#111827'] : ['#D1D5DB', '#9CA3AF', '#6B7280'],
      ground: isDark ? ['#451A03', '#78350F', '#92400E'] : ['#92400E', '#B45309', '#D97706'],
    },
    2: {
      sky: isDark ? ['#1E3A5F', '#1E293B', '#0F172A'] : ['#BAE6FD', '#7DD3FC', '#38BDF8'],
      ground: isDark ? ['#14532D', '#166534', '#15803D'] : ['#166534', '#22C55E', '#4ADE80'],
    },
    3: {
      sky: isDark ? ['#312E81', '#1E1B4B', '#0F172A'] : ['#7DD3FC', '#60A5FA', '#3B82F6'],
      ground: isDark ? ['#064E3B', '#047857', '#059669'] : ['#059669', '#10B981', '#34D399'],
    },
    4: {
      sky: isDark ? ['#581C87', '#312E81', '#1E1B4B'] : ['#FED7AA', '#FDBA74', '#7DD3FC'],
      ground: isDark ? ['#047857', '#059669', '#0D9488'] : ['#10B981', '#14B8A6', '#2DD4BF'],
    },
    5: {
      sky: isDark ? ['#4C1D95', '#581C87', '#312E81'] : ['#E9D5FF', '#F9A8D4', '#C4B5FD'],
      ground: isDark ? ['#0D9488', '#14B8A6', '#06B6D4'] : ['#14B8A6', '#2DD4BF', '#67E8F9'],
    },
  };
  return gradients[stage as keyof typeof gradients] || gradients[1];
};

interface TreeProps {
  index: number;
  stage: number;
  animValue: Animated.Value;
}

const AnimatedTree = ({ index, stage, animValue }: TreeProps) => {
  const treeHeight = 40 + stage * 15 + (index % 3) * 8;
  const canopySize = 30 + stage * 12 + (index % 2) * 8;
  const trunkWidth = 6 + Math.floor(stage / 2) * 2;
  
  const swayAnim = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2deg', '2deg'],
  });

  return (
    <Animated.View
      style={[
        styles.tree,
        { 
          left: `${8 + index * (75 / (stage + 2))}%`,
          transform: [{ rotate: swayAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.canopy,
          {
            width: canopySize,
            height: canopySize * 1.2,
            backgroundColor: stage >= 4 ? '#10B981' : '#22C55E',
          },
        ]}
      >
        {stage >= 4 && (
          <View style={styles.sparkleContainer}>
            <Ionicons name="sparkles" size={8} color="#FDE047" />
          </View>
        )}
      </View>
      <View
        style={[
          styles.trunk,
          {
            width: trunkWidth,
            height: treeHeight,
            backgroundColor: '#92400E',
          },
        ]}
      />
    </Animated.View>
  );
};

interface CreatureProps {
  type: string;
  index: number;
  animValue: Animated.Value;
}

const AnimatedCreature = ({ type, index, animValue }: CreatureProps) => {
  const translateX = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 20, 0],
  });
  
  const translateY = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -15, 0],
  });

  const getCreatureConfig = () => {
    switch (type) {
      case 'butterfly':
        return { icon: 'flower-outline' as const, color: '#EC4899', size: 16 };
      case 'bird':
        return { icon: 'airplane' as const, color: '#64748B', size: 18 };
      case 'rabbit':
        return { icon: 'paw' as const, color: '#9CA3AF', size: 14 };
      case 'phoenix':
        return { icon: 'flame' as const, color: '#F97316', size: 24 };
      default:
        return { icon: 'bug' as const, color: '#A3E635', size: 12 };
    }
  };

  const config = getCreatureConfig();

  return (
    <Animated.View
      style={[
        styles.creature,
        {
          left: `${15 + index * 22}%`,
          bottom: type === 'bird' || type === 'phoenix' ? '60%' : '20%',
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      <Ionicons name={config.icon} size={config.size} color={config.color} />
    </Animated.View>
  );
};

interface ParticleProps {
  index: number;
  animValue: Animated.Value;
}

const FireflyParticle = ({ index, animValue }: ParticleProps) => {
  const opacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });
  
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <Animated.View
      style={[
        styles.firefly,
        {
          left: `${Math.random() * 80 + 10}%`,
          bottom: `${30 + Math.random() * 40}%`,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

interface WeatherEffectProps {
  type: string;
  animValue: Animated.Value;
}

const WeatherEffect = ({ type, animValue }: WeatherEffectProps) => {
  if (type === 'rainy') {
    return (
      <View style={styles.weatherContainer}>
        {Array.from({ length: 30 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.raindrop,
              {
                left: `${Math.random() * 100}%`,
                opacity: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 0.8],
                }),
              },
            ]}
          />
        ))}
      </View>
    );
  }

  if (type === 'aurora') {
    return (
      <Animated.View
        style={[
          styles.aurora,
          {
            opacity: animValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.3, 0.6, 0.3],
            }),
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.4)', 'rgba(34, 197, 94, 0.3)', 'rgba(236, 72, 153, 0.3)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    );
  }

  if (type === 'starry') {
    return (
      <View style={styles.weatherContainer}>
        {Array.from({ length: 20 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                left: `${Math.random() * 90}%`,
                top: `${Math.random() * 40}%`,
                opacity: animValue.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1, 0.3],
                }),
              },
            ]}
          />
        ))}
        <View style={styles.moon}>
          <Ionicons name="moon" size={32} color="#FEF3C7" />
        </View>
      </View>
    );
  }

  if (type === 'sunny') {
    return (
      <Animated.View
        style={[
          styles.sun,
          {
            transform: [
              {
                rotate: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="sunny" size={48} color="#FDE047" />
      </Animated.View>
    );
  }

  return null;
};

interface GrowthSanctuaryMobileProps {
  navigation: any;
}

export default function GrowthSanctuaryMobile({ navigation }: GrowthSanctuaryMobileProps) {
  const isDark = false;
  const colors = useThemedColors(isDark);
  
  const [sanctuary, setSanctuary] = useState<SanctuaryState>({
    evolutionStage: 3,
    sanctuaryXp: 2500,
    xpToNextStage: 4000,
    weatherType: 'sunny',
    timeOfDay: 'day',
    unlockedElements: ['tree-oak', 'tree-pine', 'creature-butterfly', 'creature-bird'],
    totalElementsUnlocked: 4,
  });

  const [selectedTab, setSelectedTab] = useState<'view' | 'elements' | 'settings'>('view');
  
  const treeAnimValue = useRef(new Animated.Value(0)).current;
  const creatureAnimValue = useRef(new Animated.Value(0)).current;
  const particleAnimValue = useRef(new Animated.Value(0)).current;
  const weatherAnimValue = useRef(new Animated.Value(0)).current;
  
  const panX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const treeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(treeAnimValue, {
          toValue: 1,
          duration: LiLoveTheme.animation.duration.slowest * 4,
          useNativeDriver: true,
        }),
        Animated.timing(treeAnimValue, {
          toValue: 0,
          duration: LiLoveTheme.animation.duration.slowest * 4,
          useNativeDriver: true,
        }),
      ])
    );

    const creatureLoop = Animated.loop(
      Animated.timing(creatureAnimValue, {
        toValue: 1,
        duration: LiLoveTheme.animation.duration.slowest * 6,
        useNativeDriver: true,
      })
    );

    const particleLoop = Animated.loop(
      Animated.timing(particleAnimValue, {
        toValue: 1,
        duration: LiLoveTheme.animation.duration.slowest * 3,
        useNativeDriver: true,
      })
    );

    const weatherLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(weatherAnimValue, {
          toValue: 1,
          duration: LiLoveTheme.animation.duration.slowest * 8,
          useNativeDriver: true,
        }),
        Animated.timing(weatherAnimValue, {
          toValue: 0,
          duration: LiLoveTheme.animation.duration.slowest * 8,
          useNativeDriver: true,
        }),
      ])
    );

    treeLoop.start();
    creatureLoop.start();
    particleLoop.start();
    weatherLoop.start();

    return () => {
      treeLoop.stop();
      creatureLoop.stop();
      particleLoop.stop();
      weatherLoop.stop();
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: Animated.event([null, { dx: panX }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > LiLoveTheme.animation.gesture.swipeDistanceThreshold) {
          if (gestureState.dx > 0 && selectedTab !== 'view') {
            setSelectedTab(selectedTab === 'settings' ? 'elements' : 'view');
          } else if (gestureState.dx < 0 && selectedTab !== 'settings') {
            setSelectedTab(selectedTab === 'view' ? 'elements' : 'settings');
          }
        }
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: false,
          ...LiLoveTheme.animation.spring.gentle,
        }).start();
      },
    })
  ).current;

  const currentStage = EVOLUTION_STAGES.find(s => s.stage === sanctuary.evolutionStage) || EVOLUTION_STAGES[0];
  const nextStage = EVOLUTION_STAGES.find(s => s.stage === sanctuary.evolutionStage + 1);
  const xpProgress = nextStage ? (sanctuary.sanctuaryXp / sanctuary.xpToNextStage) * 100 : 100;
  const gradients = getStageGradients(sanctuary.evolutionStage, isDark);

  const creatureTypes = ['butterfly', 'bird'];
  if (sanctuary.evolutionStage >= 2) creatureTypes.push('rabbit');
  if (sanctuary.evolutionStage >= 5) creatureTypes.push('phoenix');

  const renderSanctuaryView = () => (
    <View style={styles.sanctuaryContainer} {...panResponder.panHandlers}>
      <LinearGradient
        colors={gradients.sky as [string, string, ...string[]]}
        style={styles.sky}
      >
        <WeatherEffect type={sanctuary.weatherType} animValue={weatherAnimValue} />
      </LinearGradient>

      <LinearGradient
        colors={gradients.ground as [string, string, ...string[]]}
        style={styles.ground}
      >
        <View style={styles.grassLayer}>
          {Array.from({ length: 15 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.grass,
                { 
                  height: 8 + Math.random() * 16,
                  marginHorizontal: Math.random() * 4,
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>

      <View style={styles.elementsLayer}>
        {Array.from({ length: Math.min(sanctuary.evolutionStage + 2, 6) }).map((_, i) => (
          <AnimatedTree key={i} index={i} stage={sanctuary.evolutionStage} animValue={treeAnimValue} />
        ))}

        {creatureTypes.map((type, i) => (
          <AnimatedCreature key={type} type={type} index={i} animValue={creatureAnimValue} />
        ))}

        {sanctuary.evolutionStage >= 2 &&
          Array.from({ length: Math.min(sanctuary.evolutionStage * 3, 12) }).map((_, i) => (
            <FireflyParticle key={i} index={i} animValue={particleAnimValue} />
          ))}
      </View>

      <View style={styles.stageOverlay}>
        <View style={styles.stageBadge}>
          <Ionicons name="leaf" size={16} color={LiLoveTheme.colors.primary[500]} />
          <Text style={styles.stageName}>{currentStage.name}</Text>
        </View>
      </View>
    </View>
  );

  const renderElementsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Unlocked Elements</Text>
      
      <View style={styles.elementsGrid}>
        {sanctuary.unlockedElements.map((elementId) => (
          <TouchableOpacity
            key={elementId}
            style={[styles.elementCard, { backgroundColor: colors.surfaceElevated }]}
            activeOpacity={0.7}
          >
            <View style={[styles.elementIcon, { backgroundColor: LiLoveTheme.colors.primary[100] }]}>
              <Ionicons 
                name={elementId.includes('tree') ? 'leaf' : elementId.includes('creature') ? 'paw' : 'flower'} 
                size={20} 
                color={LiLoveTheme.colors.primary[500]} 
              />
            </View>
            <Text style={[styles.elementName, { color: colors.text }]}>
              {elementId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: LiLoveTheme.spacing.xl }]}>
        Available to Unlock
      </Text>
      
      <View style={styles.unlockList}>
        {[
          { id: 'tree-cherry', name: 'Cherry Blossom', cost: 150, rarity: 'uncommon' as const },
          { id: 'creature-rabbit', name: 'Forest Rabbit', cost: 100, rarity: 'uncommon' as const },
          { id: 'decor-pond', name: 'Peaceful Pond', cost: 120, rarity: 'uncommon' as const },
        ].map((element) => (
          <TouchableOpacity
            key={element.id}
            style={[styles.unlockCard, { backgroundColor: colors.surfaceElevated }]}
            activeOpacity={0.7}
          >
            <View style={styles.unlockInfo}>
              <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[element.rarity] }]} />
              <Text style={[styles.unlockName, { color: colors.text }]}>{element.name}</Text>
            </View>
            <View style={styles.unlockCost}>
              <Ionicons name="cash-outline" size={14} color={LiLoveTheme.colors.accent[500]} />
              <Text style={styles.costText}>{element.cost}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Weather</Text>
      
      <View style={styles.weatherGrid}>
        {Object.entries(WEATHER_CONFIGS).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.weatherOption,
              { backgroundColor: colors.surfaceElevated },
              sanctuary.weatherType === key && styles.weatherOptionActive,
            ]}
            onPress={() => setSanctuary(prev => ({ ...prev, weatherType: key }))}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={config.icon as any} 
              size={24} 
              color={sanctuary.weatherType === key ? LiLoveTheme.colors.primary[500] : colors.textSecondary} 
            />
            <Text style={[
              styles.weatherLabel,
              { color: sanctuary.weatherType === key ? LiLoveTheme.colors.primary[500] : colors.textSecondary }
            ]}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: LiLoveTheme.spacing.xl }]}>
        Time of Day
      </Text>
      
      <View style={styles.timeGrid}>
        {['dawn', 'day', 'dusk', 'night'].map((time) => (
          <TouchableOpacity
            key={time}
            style={[
              styles.timeOption,
              { backgroundColor: colors.surfaceElevated },
              sanctuary.timeOfDay === time && styles.timeOptionActive,
            ]}
            onPress={() => setSanctuary(prev => ({ ...prev, timeOfDay: time }))}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={time === 'night' ? 'moon' : time === 'dawn' || time === 'dusk' ? 'partly-sunny' : 'sunny'} 
              size={20} 
              color={sanctuary.timeOfDay === time ? LiLoveTheme.colors.primary[500] : colors.textSecondary} 
            />
            <Text style={[
              styles.timeLabel,
              { color: sanctuary.timeOfDay === time ? LiLoveTheme.colors.primary[500] : colors.textSecondary }
            ]}>
              {time.charAt(0).toUpperCase() + time.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Ionicons name="leaf" size={20} color={LiLoveTheme.colors.primary[500]} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Growth Sanctuary</Text>
        </View>
        
        <TouchableOpacity
          style={styles.infoButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.progressCard, { backgroundColor: colors.surfaceElevated }]}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={[styles.stageBadgeText, { color: LiLoveTheme.colors.primary[500] }]}>
              Stage {sanctuary.evolutionStage}
            </Text>
            <Text style={[styles.stageDescription, { color: colors.textSecondary }]}>
              {currentStage.description}
            </Text>
          </View>
          <View style={styles.xpBadge}>
            <Ionicons name="flash" size={14} color={LiLoveTheme.colors.accent[500]} />
            <Text style={styles.xpText}>{sanctuary.sanctuaryXp} XP</Text>
          </View>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${xpProgress}%` }]} />
          </View>
          {nextStage && (
            <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
              {sanctuary.xpToNextStage - sanctuary.sanctuaryXp} XP to {nextStage.name}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.tabBar}>
        {[
          { key: 'view', icon: 'eye', label: 'View' },
          { key: 'elements', icon: 'grid', label: 'Elements' },
          { key: 'settings', icon: 'settings', label: 'Settings' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              selectedTab === tab.key && styles.tabButtonActive,
            ]}
            onPress={() => setSelectedTab(tab.key as any)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={selectedTab === tab.key ? LiLoveTheme.colors.primary[500] : colors.textSecondary} 
            />
            <Text style={[
              styles.tabLabel,
              { color: selectedTab === tab.key ? LiLoveTheme.colors.primary[500] : colors.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {selectedTab === 'view' && renderSanctuaryView()}
        {selectedTab === 'elements' && renderElementsTab()}
        {selectedTab === 'settings' && renderSettingsTab()}
      </View>

      <View style={styles.gestureHint}>
        <Ionicons name="swap-horizontal" size={16} color={colors.textTertiary} />
        <Text style={[styles.gestureHintText, { color: colors.textTertiary }]}>
          Swipe to switch tabs
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LiLoveTheme.spacing.md,
    paddingVertical: LiLoveTheme.spacing.sm,
    height: LiLoveTheme.layout.headerHeight,
  },
  backButton: {
    width: LiLoveTheme.layout.touchTargetMin,
    height: LiLoveTheme.layout.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LiLoveTheme.spacing.xs,
  },
  headerTitle: {
    ...LiLoveTheme.typography.h5,
  },
  infoButton: {
    width: LiLoveTheme.layout.touchTargetMin,
    height: LiLoveTheme.layout.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    marginHorizontal: LiLoveTheme.spacing.md,
    padding: LiLoveTheme.spacing.md,
    borderRadius: LiLoveTheme.layout.cardBorderRadius,
    ...LiLoveTheme.shadows.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: LiLoveTheme.spacing.sm,
  },
  stageBadgeText: {
    ...LiLoveTheme.typography.label,
    marginBottom: 2,
  },
  stageDescription: {
    ...LiLoveTheme.typography.caption,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: LiLoveTheme.colors.accent[50],
    paddingHorizontal: LiLoveTheme.spacing.sm,
    paddingVertical: LiLoveTheme.spacing.xxs,
    borderRadius: LiLoveTheme.layout.chipBorderRadius,
  },
  xpText: {
    ...LiLoveTheme.typography.labelSmall,
    color: LiLoveTheme.colors.accent[600],
  },
  progressBarContainer: {
    gap: LiLoveTheme.spacing.xxs,
  },
  progressBar: {
    height: 6,
    backgroundColor: LiLoveTheme.colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: LiLoveTheme.colors.primary[500],
    borderRadius: 3,
  },
  progressLabel: {
    ...LiLoveTheme.typography.captionSmall,
    textAlign: 'right',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: LiLoveTheme.spacing.md,
    marginTop: LiLoveTheme.spacing.md,
    gap: LiLoveTheme.spacing.xs,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LiLoveTheme.spacing.xxs,
    paddingVertical: LiLoveTheme.spacing.sm,
    borderRadius: LiLoveTheme.layout.buttonBorderRadius,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: LiLoveTheme.colors.primary[50],
  },
  tabLabel: {
    ...LiLoveTheme.typography.labelSmall,
  },
  content: {
    flex: 1,
    marginTop: LiLoveTheme.spacing.md,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: LiLoveTheme.spacing.md,
  },
  sanctuaryContainer: {
    flex: 1,
    marginHorizontal: LiLoveTheme.spacing.md,
    borderRadius: LiLoveTheme.layout.cardBorderRadius,
    overflow: 'hidden',
    ...LiLoveTheme.shadows.lg,
  },
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  grassLayer: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: LiLoveTheme.spacing.xs,
  },
  grass: {
    width: 3,
    backgroundColor: '#22C55E',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  elementsLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  tree: {
    position: 'absolute',
    bottom: '30%',
    alignItems: 'center',
  },
  canopy: {
    borderRadius: 100,
  },
  sparkleContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  trunk: {
    borderRadius: 2,
  },
  creature: {
    position: 'absolute',
  },
  firefly: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FDE047',
    shadowColor: '#FDE047',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  weatherContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  raindrop: {
    position: 'absolute',
    width: 2,
    height: 12,
    backgroundColor: 'rgba(147, 197, 253, 0.6)',
    borderRadius: 1,
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  moon: {
    position: 'absolute',
    top: 20,
    right: 30,
  },
  sun: {
    position: 'absolute',
    top: 16,
    right: 24,
  },
  aurora: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  stageOverlay: {
    position: 'absolute',
    top: LiLoveTheme.spacing.md,
    left: LiLoveTheme.spacing.md,
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LiLoveTheme.spacing.xxs,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: LiLoveTheme.spacing.sm,
    paddingVertical: LiLoveTheme.spacing.xxs,
    borderRadius: LiLoveTheme.layout.chipBorderRadius,
  },
  stageName: {
    ...LiLoveTheme.typography.labelSmall,
    color: LiLoveTheme.colors.primary[600],
  },
  sectionTitle: {
    ...LiLoveTheme.typography.h6,
    marginBottom: LiLoveTheme.spacing.sm,
  },
  elementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LiLoveTheme.spacing.sm,
  },
  elementCard: {
    width: (SCREEN_WIDTH - LiLoveTheme.spacing.md * 2 - LiLoveTheme.spacing.sm * 2) / 3,
    padding: LiLoveTheme.spacing.sm,
    borderRadius: LiLoveTheme.layout.cardBorderRadius,
    alignItems: 'center',
    ...LiLoveTheme.shadows.sm,
  },
  elementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LiLoveTheme.spacing.xxs,
  },
  elementName: {
    ...LiLoveTheme.typography.captionSmall,
    textAlign: 'center',
  },
  unlockList: {
    gap: LiLoveTheme.spacing.sm,
  },
  unlockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: LiLoveTheme.spacing.md,
    borderRadius: LiLoveTheme.layout.cardBorderRadius,
    ...LiLoveTheme.shadows.sm,
  },
  unlockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LiLoveTheme.spacing.sm,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unlockName: {
    ...LiLoveTheme.typography.body,
  },
  unlockCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: LiLoveTheme.colors.accent[50],
    paddingHorizontal: LiLoveTheme.spacing.sm,
    paddingVertical: LiLoveTheme.spacing.xxs,
    borderRadius: LiLoveTheme.layout.chipBorderRadius,
  },
  costText: {
    ...LiLoveTheme.typography.labelSmall,
    color: LiLoveTheme.colors.accent[600],
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LiLoveTheme.spacing.sm,
  },
  weatherOption: {
    width: (SCREEN_WIDTH - LiLoveTheme.spacing.md * 2 - LiLoveTheme.spacing.sm * 2) / 3,
    paddingVertical: LiLoveTheme.spacing.md,
    alignItems: 'center',
    gap: LiLoveTheme.spacing.xxs,
    borderRadius: LiLoveTheme.layout.cardBorderRadius,
    ...LiLoveTheme.shadows.sm,
  },
  weatherOptionActive: {
    borderWidth: 2,
    borderColor: LiLoveTheme.colors.primary[500],
  },
  weatherLabel: {
    ...LiLoveTheme.typography.captionSmall,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: LiLoveTheme.spacing.sm,
  },
  timeOption: {
    flex: 1,
    paddingVertical: LiLoveTheme.spacing.md,
    alignItems: 'center',
    gap: LiLoveTheme.spacing.xxs,
    borderRadius: LiLoveTheme.layout.cardBorderRadius,
    ...LiLoveTheme.shadows.sm,
  },
  timeOptionActive: {
    borderWidth: 2,
    borderColor: LiLoveTheme.colors.primary[500],
  },
  timeLabel: {
    ...LiLoveTheme.typography.captionSmall,
  },
  gestureHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LiLoveTheme.spacing.xxs,
    paddingVertical: LiLoveTheme.spacing.sm,
  },
  gestureHintText: {
    ...LiLoveTheme.typography.captionSmall,
  },
});
