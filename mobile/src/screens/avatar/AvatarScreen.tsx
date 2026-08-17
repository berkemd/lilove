import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import LivingForest from '../../components/LivingForest';

interface AvatarZone {
  id: string;
  key: string;
  name: string;
  description?: string;
  layerOrder: number;
  isRequired: boolean;
  allowMultiple: boolean;
}

interface AvatarTrait {
  id: string;
  zoneId: string;
  name: string;
  description?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  assetUrlFront?: string;
  thumbnailUrl?: string;
  layerOrder: number;
  unlockType: string;
  unlockRequirement?: {
    type: 'achievement' | 'challenge' | 'purchase' | 'level' | 'event';
    achievementId?: string;
    challengeId?: string;
    coinCost?: number;
    levelRequired?: number;
    eventId?: string;
  };
  coinCost: number;
  isDefault: boolean;
  isActive: boolean;
}

interface UserAvatarTrait {
  id: string;
  userId: string;
  traitId: string;
  unlockedAt: string;
  unlockSource: string;
  trait?: AvatarTrait;
}

interface EquippedTrait {
  id: string;
  userId: string;
  zoneId: string;
  traitId: string;
  trait?: AvatarTrait;
  zone?: AvatarZone;
}

interface Avatar {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
}

interface UserStats {
  profile?: {
    currentLevel: number;
    totalXp: number;
    streakCount: number;
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ZONE_CATEGORIES = [
  { id: 'appearance', name: 'Appearance', icon: 'person-outline', zones: ['skin', 'body', 'face_shape', 'eyes', 'eyebrows', 'nose', 'mouth', 'ears'] },
  { id: 'hair_face', name: 'Hair & Face', icon: 'happy-outline', zones: ['hair', 'hair_color', 'facial_hair', 'makeup', 'glasses'] },
  { id: 'clothing', name: 'Clothing', icon: 'shirt-outline', zones: ['clothing_top', 'clothing_bottom', 'shoes'] },
  { id: 'accessories', name: 'Accessories', icon: 'diamond-outline', zones: ['hat', 'jewelry', 'tattoo', 'scars'] },
  { id: 'effects', name: 'Effects', icon: 'sparkles-outline', zones: ['wings', 'aura', 'pet', 'background', 'frame'] },
];

const RARITY_COLORS: Record<string, string> = {
  common: '#6B7280',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
  mythic: '#EC4899',
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
    </View>
  );
}

export default function AvatarScreen() {
  const { userProfile } = useAuthStore();
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState('appearance');
  const [zones, setZones] = useState<AvatarZone[]>([]);
  const [userTraits, setUserTraits] = useState<UserAvatarTrait[]>([]);
  const [equippedTraits, setEquippedTraits] = useState<EquippedTrait[]>([]);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedTrait, setSelectedTrait] = useState<AvatarTrait | null>(null);
  const [selectedZone, setSelectedZone] = useState<AvatarZone | null>(null);
  const [isEquipping, setIsEquipping] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [zoneTraits, setZoneTraits] = useState<Record<string, AvatarTrait[]>>({});
  const [loadingZones, setLoadingZones] = useState<Set<string>>(new Set());

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const ownedTraitIds = useMemo(() => {
    const owned = new Set<string>();
    userTraits.forEach(ut => owned.add(ut.traitId));
    return owned;
  }, [userTraits]);

  const equippedTraitMap = useMemo(() => {
    const map = new Map<string, string>();
    equippedTraits.forEach(eq => map.set(eq.zoneId, eq.traitId));
    return map;
  }, [equippedTraits]);

  const zonesByKey = useMemo(() => {
    const map = new Map<string, AvatarZone>();
    zones.forEach(z => map.set(z.key, z));
    return map;
  }, [zones]);

  const currentCategoryZones = useMemo(() => {
    const category = ZONE_CATEGORIES.find(c => c.id === activeCategory);
    if (!category) return [];
    return category.zones
      .map(key => zonesByKey.get(key))
      .filter((z): z is AvatarZone => !!z);
  }, [activeCategory, zonesByKey]);

  const loadData = async () => {
    setError(null);
    try {
      const [zonesData, userTraitsData, equippedData, avatarData, statsData] = await Promise.all([
        api.getAvatarZones().catch((err) => {
          console.warn('[AvatarScreen] Failed to load zones:', err);
          return [];
        }) as Promise<AvatarZone[]>,
        api.getMyTraits().catch((err) => {
          console.warn('[AvatarScreen] Failed to load user traits:', err);
          return [];
        }) as Promise<UserAvatarTrait[]>,
        api.getMyEquipped().catch((err) => {
          console.warn('[AvatarScreen] Failed to load equipped traits:', err);
          return [];
        }) as Promise<EquippedTrait[]>,
        api.getAvatar().catch((err) => {
          console.warn('[AvatarScreen] Failed to load avatar:', err);
          return null;
        }) as Promise<Avatar | null>,
        api.getUserStats().catch((err) => {
          console.warn('[AvatarScreen] Failed to load user stats, using fallback:', err);
          return { profile: { currentLevel: 1, totalXp: 0, streakCount: 0 } };
        }) as Promise<UserStats>,
      ]);
      
      setZones(Array.isArray(zonesData) ? zonesData : []);
      setUserTraits(Array.isArray(userTraitsData) ? userTraitsData : []);
      setEquippedTraits(Array.isArray(equippedData) ? equippedData : []);
      setAvatar(avatarData || null);
      setUserStats(statsData || { profile: { currentLevel: 1, totalXp: 0, streakCount: 0 } });
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      console.error('[AvatarScreen] Error loading data:', err);
      setError(err?.message || 'Failed to load avatar data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadZoneTraits = async (zone: AvatarZone) => {
    if (zoneTraits[zone.id] || loadingZones.has(zone.id)) return;
    
    setLoadingZones(prev => new Set(prev).add(zone.id));
    try {
      const traits = await api.getTraitsByZone(zone.id) as AvatarTrait[];
      setZoneTraits(prev => ({ ...prev, [zone.id]: Array.isArray(traits) ? traits : [] }));
    } catch (err) {
      console.error(`[AvatarScreen] Error loading traits for zone ${zone.id}:`, err);
    } finally {
      setLoadingZones(prev => {
        const next = new Set(prev);
        next.delete(zone.id);
        return next;
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    currentCategoryZones.forEach(zone => {
      loadZoneTraits(zone);
    });
  }, [currentCategoryZones]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setZoneTraits({});
    loadData();
  }, []);

  const handleTraitPress = (trait: AvatarTrait, zone: AvatarZone) => {
    const isOwned = ownedTraitIds.has(trait.id) || trait.isDefault;
    const isEquipped = equippedTraitMap.get(zone.id) === trait.id;

    if (isEquipped) return;

    if (isOwned) {
      equipTrait(zone.id, trait.id);
    } else {
      setSelectedTrait(trait);
      setSelectedZone(zone);
      setPurchaseModalOpen(true);
    }
  };

  const equipTrait = async (zoneId: string, traitId: string) => {
    setIsEquipping(true);
    try {
      await api.equipTrait(zoneId, traitId);
      const equippedData = await api.getMyEquipped() as EquippedTrait[];
      setEquippedTraits(Array.isArray(equippedData) ? equippedData : []);
    } catch (err: any) {
      console.error('[AvatarScreen] Error equipping trait:', err);
    } finally {
      setIsEquipping(false);
    }
  };

  const purchaseTrait = async () => {
    if (!selectedTrait) return;
    
    setIsPurchasing(true);
    try {
      await api.unlockTrait(selectedTrait.id);
      const userTraitsData = await api.getMyTraits() as UserAvatarTrait[];
      setUserTraits(Array.isArray(userTraitsData) ? userTraitsData : []);
      setPurchaseModalOpen(false);
      setSelectedTrait(null);
    } catch (err: any) {
      console.error('[AvatarScreen] Error purchasing trait:', err);
    } finally {
      setIsPurchasing(false);
    }
  };

  const coinBalance = userProfile?.coinBalance || 0;
  const canPurchase = selectedTrait && 
    (selectedTrait.unlockType === 'purchase' || selectedTrait.isDefault) &&
    (coinBalance >= selectedTrait.coinCost);
  const currentLevel = userStats?.profile?.currentLevel || 1;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading avatar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData} data-testid="button-retry">
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} data-testid="text-avatar-title">My Avatar</Text>
          {/* Rozet artık bir yol: jeton harcanan ekranda jetonun nereden
              alınacağı görünmüyordu. Uygulama jeton istiyor ama satın
              alma yolu hiç yoktu. */}
          <TouchableOpacity
            style={styles.coinBadge}
            onPress={() => (navigation as any).navigate('Coins')}
            accessibilityRole="button"
            accessibilityLabel={`${coinBalance} coins. Get more coins.`}
            data-testid="button-get-coins"
          >
            <Ionicons name="wallet" size={16} color="#92400E" />
            <Text style={styles.coinText} data-testid="text-coin-balance">{coinBalance}</Text>
            <Ionicons name="add-circle" size={14} color="#92400E" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Preview</Text>
              <View style={styles.levelBadge}>
                <Ionicons name="leaf" size={14} color="#10B981" />
                <Text style={styles.levelText}>Level {currentLevel}</Text>
              </View>
            </View>

            <View style={styles.avatarPreview}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={64} color="#8B5CF6" />
              </View>
              
              {equippedTraits.length > 0 && (
                <View style={styles.equippedList}>
                  {equippedTraits.slice(0, 3).map((eq) => (
                    <View key={eq.id} style={styles.equippedItem}>
                      <Text style={styles.equippedZone}>{eq.zone?.name}:</Text>
                      <View style={[styles.equippedBadge, { borderColor: RARITY_COLORS[eq.trait?.rarity || 'common'] }]}>
                        <Text style={styles.equippedTrait}>{eq.trait?.name}</Text>
                      </View>
                    </View>
                  ))}
                  {equippedTraits.length > 3 && (
                    <Text style={styles.equippedMore}>+{equippedTraits.length - 3} more</Text>
                  )}
                </View>
              )}
            </View>

            {avatar && (
              <View style={styles.statsContainer}>
                <View style={styles.statRow}>
                  <View style={styles.statLabel}>
                    <Ionicons name="heart" size={16} color="#EF4444" />
                    <Text style={styles.statText}>Health</Text>
                  </View>
                  <Text style={styles.statValue} data-testid="text-health">{avatar.health}/{avatar.maxHealth}</Text>
                </View>
                <ProgressBar value={avatar.health} max={avatar.maxHealth} color="#EF4444" />

                <View style={styles.statRow}>
                  <View style={styles.statLabel}>
                    <Ionicons name="sparkles" size={16} color="#3B82F6" />
                    <Text style={styles.statText}>Mana</Text>
                  </View>
                  <Text style={styles.statValue} data-testid="text-mana">{avatar.mana}/{avatar.maxMana}</Text>
                </View>
                <ProgressBar value={avatar.mana} max={avatar.maxMana} color="#3B82F6" />
              </View>
            )}

            <LivingForest compact />
          </View>

          <View style={styles.traitSection}>
            <Text style={styles.sectionTitle}>Trait Selection</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryTabs}
              contentContainerStyle={styles.categoryTabsContent}
            >
              {ZONE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryTab, activeCategory === category.id && styles.categoryTabActive]}
                  onPress={() => setActiveCategory(category.id)}
                  data-testid={`tab-category-${category.id}`}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={18}
                    color={activeCategory === category.id ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text style={[styles.categoryTabText, activeCategory === category.id && styles.categoryTabTextActive]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {currentCategoryZones.map((zone) => (
              <View key={zone.id} style={styles.zoneSection}>
                <Text style={styles.zoneName} data-testid={`text-zone-${zone.key}`}>{zone.name}</Text>
                
                {loadingZones.has(zone.id) ? (
                  <View style={styles.zoneLoading}>
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  </View>
                ) : zoneTraits[zone.id]?.length ? (
                  <View style={styles.traitGrid}>
                    {zoneTraits[zone.id].map((trait) => {
                      const isOwned = ownedTraitIds.has(trait.id) || trait.isDefault;
                      const isEquipped = equippedTraitMap.get(zone.id) === trait.id;
                      
                      return (
                        <TouchableOpacity
                          key={trait.id}
                          style={[
                            styles.traitCard,
                            isEquipped && styles.traitCardEquipped,
                            { borderColor: RARITY_COLORS[trait.rarity] }
                          ]}
                          onPress={() => handleTraitPress(trait, zone)}
                          disabled={isEquipping}
                          data-testid={`trait-card-${trait.id}`}
                        >
                          <View style={styles.traitIconContainer}>
                            <Ionicons name="cube-outline" size={24} color={RARITY_COLORS[trait.rarity]} />
                            {!isOwned && (
                              <View style={styles.lockOverlay}>
                                <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
                              </View>
                            )}
                            {isEquipped && (
                              <View style={styles.equippedOverlay}>
                                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                              </View>
                            )}
                          </View>
                          <Text style={styles.traitName} numberOfLines={1}>{trait.name}</Text>
                          <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[trait.rarity] }]}>
                            <Text style={styles.rarityText}>{trait.rarity}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noTraitsText}>No traits available</Text>
                )}
              </View>
            ))}

            {currentCategoryZones.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>No zones in this category</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      <Modal
        visible={purchaseModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPurchaseModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} data-testid="modal-purchase">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTrait?.name}</Text>
              <View style={[styles.modalRarityBadge, { backgroundColor: RARITY_COLORS[selectedTrait?.rarity || 'common'] }]}>
                <Text style={styles.modalRarityText}>{selectedTrait?.rarity}</Text>
              </View>
            </View>

            <Text style={styles.modalDescription}>
              {selectedTrait?.description || 'Unlock this trait to customize your avatar.'}
            </Text>

            {selectedTrait?.unlockType === 'achievement' ? (
              <View style={styles.achievementRequired}>
                <Ionicons name="lock-closed" size={24} color="#F59E0B" />
                <Text style={styles.achievementText}>Achievement Required</Text>
              </View>
            ) : (
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Cost</Text>
                  <View style={styles.priceValue}>
                    <Ionicons name="wallet" size={20} color="#F59E0B" />
                    <Text style={styles.priceText}>{selectedTrait?.coinCost?.toLocaleString()}</Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.priceLabel}>Your Balance</Text>
                  <Text style={[styles.balanceText, coinBalance >= (selectedTrait?.coinCost || 0) ? styles.balanceGreen : styles.balanceRed]}>
                    {coinBalance.toLocaleString()}
                  </Text>
                  {/* Bakiye yetmiyorsa çıkmaz sokak değil, bir kapı. */}
                  {coinBalance < (selectedTrait?.coinCost || 0) && (
                    <TouchableOpacity
                      onPress={() => {
                        setPurchaseModalOpen(false);
                        (navigation as any).navigate('Coins');
                      }}
                      accessibilityRole="button"
                      data-testid="button-need-coins"
                    >
                      <Text style={styles.getCoinsLink}>Get coins</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setPurchaseModalOpen(false)}
                data-testid="button-cancel-purchase"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              {selectedTrait?.unlockType !== 'achievement' && (
                <TouchableOpacity
                  style={[styles.purchaseButton, !canPurchase && styles.purchaseButtonDisabled]}
                  onPress={purchaseTrait}
                  disabled={!canPurchase || isPurchasing}
                  data-testid="button-confirm-purchase"
                >
                  {isPurchasing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.purchaseButtonText}>Purchase</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  getCoinsLink: {
    marginTop: 4,
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 13,
  },
  coinText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  previewCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  avatarPreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E9D5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  equippedList: {
    width: '100%',
    gap: 6,
  },
  equippedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  equippedZone: {
    fontSize: 12,
    color: '#6B7280',
  },
  equippedBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  equippedTrait: {
    fontSize: 12,
    color: '#1F2937',
  },
  equippedMore: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#4B5563',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  traitSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  categoryTabs: {
    marginBottom: 20,
  },
  categoryTabsContent: {
    paddingRight: 16,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: '#8B5CF6',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  zoneSection: {
    marginBottom: 24,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  zoneLoading: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  traitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  traitCard: {
    width: (SCREEN_WIDTH - 32 - 20) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  traitCardEquipped: {
    backgroundColor: '#F0FDF4',
  },
  traitIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#6B7280',
    borderRadius: 10,
    padding: 2,
  },
  equippedOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  traitName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  rarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  noTraitsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalRarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalRarityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  achievementRequired: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  achievementText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  balanceText: {
    fontSize: 18,
    fontWeight: '700',
  },
  balanceGreen: {
    color: '#10B981',
  },
  balanceRed: {
    color: '#EF4444',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  purchaseButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
