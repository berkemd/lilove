import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Heart, Sparkles, User, Lock, Check, Coins, RotateCcw, TreeDeciduous,
  Eye, Smile, Palette, Shirt, Crown, Wand2, Award, Filter, Star
} from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCelebration } from "@/components/CelebrationAnimations";

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

interface EnvironmentState {
  id: string;
  userId: string;
  environmentLevel: number;
  environmentXp: number;
  xpToNextLevel: number;
}

interface UserProfile {
  currentLevel: number;
  totalXp: number;
  streakCount: number;
}

interface Avatar {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
}

interface UserData {
  id: string;
  coinBalance: number;
}

interface CollectionStats {
  totalTraits: number;
  ownedTraits: number;
  byRarity: {
    common: { total: number; owned: number };
    uncommon: { total: number; owned: number };
    rare: { total: number; owned: number };
    epic: { total: number; owned: number };
    legendary: { total: number; owned: number };
    mythic: { total: number; owned: number };
  };
}

type RarityFilter = 'all' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

const RARITY_OPTIONS: { value: RarityFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Rarities', color: '' },
  { value: 'common', label: 'Common', color: 'text-gray-500' },
  { value: 'uncommon', label: 'Uncommon', color: 'text-green-500' },
  { value: 'rare', label: 'Rare', color: 'text-blue-500' },
  { value: 'epic', label: 'Epic', color: 'text-purple-500' },
  { value: 'legendary', label: 'Legendary', color: 'text-amber-500' },
  { value: 'mythic', label: 'Mythic', color: 'text-pink-500' },
];

const ZONE_CATEGORIES = [
  { 
    id: 'appearance', 
    name: 'Appearance', 
    icon: User,
    zones: ['skin', 'body', 'face_shape', 'eyes', 'eyebrows', 'nose', 'mouth', 'ears']
  },
  { 
    id: 'hair_face', 
    name: 'Hair & Face', 
    icon: Smile,
    zones: ['hair', 'hair_color', 'facial_hair', 'makeup', 'glasses']
  },
  { 
    id: 'clothing', 
    name: 'Clothing', 
    icon: Shirt,
    zones: ['clothing_top', 'clothing_bottom', 'shoes']
  },
  { 
    id: 'accessories', 
    name: 'Accessories', 
    icon: Crown,
    zones: ['hat', 'jewelry', 'tattoo', 'scars']
  },
  { 
    id: 'effects', 
    name: 'Effects', 
    icon: Wand2,
    zones: ['wings', 'aura', 'pet', 'background', 'frame']
  },
];

function getRarityClasses(rarity: string): { text: string; bg: string } {
  const classes: Record<string, { text: string; bg: string }> = {
    common: { 
      text: 'text-muted-foreground', 
      bg: 'bg-muted' 
    },
    uncommon: { 
      text: 'text-green-600 dark:text-green-400', 
      bg: 'bg-green-100 dark:bg-green-900/30' 
    },
    rare: { 
      text: 'text-blue-600 dark:text-blue-400', 
      bg: 'bg-blue-100 dark:bg-blue-900/30' 
    },
    epic: { 
      text: 'text-purple-600 dark:text-purple-400', 
      bg: 'bg-purple-100 dark:bg-purple-900/30' 
    },
    legendary: { 
      text: 'text-amber-600 dark:text-amber-400', 
      bg: 'bg-amber-100 dark:bg-amber-900/30' 
    },
    mythic: { 
      text: 'text-pink-600 dark:text-pink-400', 
      bg: 'bg-pink-100 dark:bg-pink-900/30' 
    },
  };
  return classes[rarity] || classes.common;
}

const RARITY_BORDER_COLORS: Record<string, string> = {
  common: 'border-gray-300 dark:border-gray-600',
  uncommon: 'border-green-400 dark:border-green-600',
  rare: 'border-blue-400 dark:border-blue-600',
  epic: 'border-purple-400 dark:border-purple-600',
  legendary: 'border-amber-400 dark:border-amber-600',
  mythic: 'border-pink-400 dark:border-pink-600',
};

function getRarityIcon(rarity: string) {
  switch (rarity) {
    case 'mythic': return <Wand2 className="w-3 h-3" />;
    case 'legendary': return <Award className="w-3 h-3" />;
    case 'epic': return <Sparkles className="w-3 h-3" />;
    default: return null;
  }
}

export default function AvatarPage() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('appearance');
  const [selectedTrait, setSelectedTrait] = useState<AvatarTrait | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  // Celebration animation for trait unlock
  const { trigger: triggerTraitUnlock, CelebrationOverlay: TraitOverlay } = useCelebration('traitUnlock');
  
  const { data: zones, isLoading: zonesLoading } = useQuery<AvatarZone[]>({
    queryKey: ['/api/avatar-system/zones'],
  });
  
  const { data: collectionStats } = useQuery<CollectionStats>({
    queryKey: ['/api/avatar-system/collection-stats'],
  });
  
  const { data: user } = useQuery<UserData>({
    queryKey: ['/api/user'],
  });
  
  const { data: avatar } = useQuery<Avatar>({
    queryKey: ['/api/avatar'],
  });
  
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ['/api/user/stats'],
    select: (data: any) => ({
      currentLevel: data?.profile?.currentLevel || 1,
      totalXp: data?.profile?.totalXp || 0,
      streakCount: data?.profile?.streakCount || 0,
    })
  });
  
  const { data: environmentState } = useQuery<EnvironmentState>({
    queryKey: ['/api/environment'],
  });
  
  const { data: userTraits, isLoading: userTraitsLoading } = useQuery<UserAvatarTrait[]>({
    queryKey: ['/api/avatar-system/my-traits'],
  });
  
  const { data: equippedTraits, isLoading: equippedLoading } = useQuery<EquippedTrait[]>({
    queryKey: ['/api/avatar-system/my-equipped'],
  });
  
  const ownedTraitIds = useMemo(() => {
    const owned = new Set<string>();
    userTraits?.forEach(ut => owned.add(ut.traitId));
    return owned;
  }, [userTraits]);
  
  const equippedTraitMap = useMemo(() => {
    const map = new Map<string, string>();
    equippedTraits?.forEach(eq => map.set(eq.zoneId, eq.traitId));
    return map;
  }, [equippedTraits]);
  
  const zonesByKey = useMemo(() => {
    const map = new Map<string, AvatarZone>();
    zones?.forEach(z => map.set(z.key, z));
    return map;
  }, [zones]);
  
  const currentCategoryZones = useMemo(() => {
    const category = ZONE_CATEGORIES.find(c => c.id === activeCategory);
    if (!category || !zones) return [];
    return category.zones
      .map(key => zonesByKey.get(key))
      .filter((z): z is AvatarZone => !!z);
  }, [activeCategory, zones, zonesByKey]);
  
  const equipMutation = useMutation({
    mutationFn: async ({ zoneId, traitId }: { zoneId: string; traitId: string }) => {
      return await apiRequest('/api/avatar-system/equip', {
        method: 'POST',
        body: JSON.stringify({ zoneId, traitId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/avatar-system/my-equipped'] });
      toast({
        title: "Trait Equipped",
        description: "Your avatar has been updated!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to equip trait. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const purchaseMutation = useMutation({
    mutationFn: async (traitId: string) => {
      return await apiRequest(`/api/avatar-system/unlock/${traitId}`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/avatar-system/my-traits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      // Trigger celebration animation with current trait data
      if (selectedTrait) {
        triggerTraitUnlock({ traitName: selectedTrait.name, rarity: selectedTrait.rarity });
      }
      setPurchaseModalOpen(false);
      setSelectedTrait(null);
      toast({
        title: "Trait Unlocked!",
        description: "You can now equip this trait to your avatar.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error?.message || "Insufficient coins or trait unavailable.",
        variant: "destructive",
      });
    }
  });
  
  const resetToDefaultsMutation = useMutation({
    mutationFn: async () => {
      const zoneIds = equippedTraits?.map(eq => eq.zoneId) || [];
      await Promise.all(
        zoneIds.map(zoneId =>
          apiRequest(`/api/avatar-system/unequip/${zoneId}`, { method: 'DELETE' })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/avatar-system/my-equipped'] });
      toast({
        title: "Reset Complete",
        description: "Your avatar has been reset to defaults.",
      });
    }
  });
  
  const handleTraitClick = (trait: AvatarTrait, zone: AvatarZone) => {
    const isOwned = ownedTraitIds.has(trait.id) || trait.isDefault;
    const isEquipped = equippedTraitMap.get(zone.id) === trait.id;
    
    if (isEquipped) {
      return;
    }
    
    if (isOwned) {
      equipMutation.mutate({ zoneId: zone.id, traitId: trait.id });
    } else {
      setSelectedTrait(trait);
      setPurchaseModalOpen(true);
    }
  };
  
  const canPurchase = selectedTrait && user && 
    (selectedTrait.unlockType === 'purchase' || selectedTrait.isDefault) &&
    (user.coinBalance >= selectedTrait.coinCost);
  
  const isLoading = zonesLoading || userTraitsLoading || equippedLoading;
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-2/5">
            <Skeleton className="h-96 rounded-lg" />
          </div>
          <div className="w-full lg:w-3/5">
            <Skeleton className="h-12 w-full mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold" data-testid="text-avatar-title">Avatar Customization</h1>
          <p className="text-muted-foreground text-sm lg:text-base">Customize your character with unique traits</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1" data-testid="text-coin-balance">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span>{user?.coinBalance?.toLocaleString() || 0}</span>
          </Badge>
        </div>
      </div>
      
      {collectionStats && (
        <Card data-testid="card-collection-stats">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                <span className="font-medium">Collection Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {collectionStats.ownedTraits}/{collectionStats.totalTraits} items ({Math.round((collectionStats.ownedTraits / collectionStats.totalTraits) * 100)}%)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {Object.entries(collectionStats.byRarity).map(([rarity, stats]) => {
                const rarityClasses = getRarityClasses(rarity);
                const percentage = stats.total > 0 ? Math.round((stats.owned / stats.total) * 100) : 0;
                return (
                  <div 
                    key={rarity} 
                    className={`p-2 rounded-lg border ${RARITY_BORDER_COLORS[rarity]} text-center`}
                    data-testid={`stat-rarity-${rarity}`}
                  >
                    <div className={`text-xs font-medium capitalize ${rarityClasses.text}`}>{rarity}</div>
                    <div className="text-sm font-bold">{stats.owned}/{stats.total}</div>
                    <Progress value={percentage} className="h-1 mt-1" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-2/5 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Preview</span>
                {environmentState && (
                  <Badge variant="outline" className="gap-1" data-testid="badge-environment-level">
                    <TreeDeciduous className="w-4 h-4 text-green-500" />
                    Level {environmentState.environmentLevel}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="relative w-full aspect-square max-w-sm mx-auto bg-gradient-to-b from-primary/10 to-primary/5 rounded-lg flex flex-col items-center justify-center overflow-hidden"
                data-testid="container-avatar-preview"
              >
                {equippedTraits && equippedTraits.length > 0 ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <User className="w-24 h-24 lg:w-32 lg:h-32 text-primary" />
                    <div className="absolute bottom-4 left-4 right-4 space-y-1 bg-background/80 backdrop-blur-sm rounded-lg p-2 text-xs">
                      {equippedTraits.slice(0, 5).map((eq) => (
                        <div key={eq.id} className="flex items-center justify-between gap-1">
                          <span className="truncate">{eq.zone?.name}:</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${RARITY_BORDER_COLORS[eq.trait?.rarity || 'common']}`}
                          >
                            {eq.trait?.name}
                          </Badge>
                        </div>
                      ))}
                      {equippedTraits.length > 5 && (
                        <div className="text-muted-foreground text-center">
                          +{equippedTraits.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <User className="w-24 h-24 lg:w-32 lg:h-32 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Select traits to customize</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 space-y-3">
                {avatar && (
                  <>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-1 text-sm mb-1">
                          <span>Health</span>
                          <span data-testid="text-avatar-health">{avatar.health}/{avatar.maxHealth}</span>
                        </div>
                        <Progress value={(avatar.health / avatar.maxHealth) * 100} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-1 text-sm mb-1">
                          <span>Mana</span>
                          <span data-testid="text-avatar-mana">{avatar.mana}/{avatar.maxMana}</span>
                        </div>
                        <Progress value={(avatar.mana / avatar.maxMana) * 100} className="h-2" />
                      </div>
                    </div>
                  </>
                )}
                
                {userProfile && (
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1 text-sm">
                        <span>Level {userProfile.currentLevel}</span>
                        <span data-testid="text-avatar-xp">{userProfile.totalXp.toLocaleString()} XP</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-2 mt-4">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => resetToDefaultsMutation.mutate()}
                  disabled={resetToDefaultsMutation.isPending || !equippedTraits?.length}
                  data-testid="button-reset-defaults"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Defaults
                </Button>
                <Button
                  className="w-full gap-2"
                  disabled={!equippedTraits?.length}
                  data-testid="button-save-avatar"
                >
                  <Check className="w-4 h-4" />
                  Save Avatar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="w-full lg:w-3/5">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Trait Selection</CardTitle>
                  <CardDescription>Choose traits for each customization zone</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={rarityFilter} onValueChange={(v) => setRarityFilter(v as RarityFilter)}>
                    <SelectTrigger className="w-[140px]" data-testid="select-rarity-filter">
                      <SelectValue placeholder="Filter by rarity" />
                    </SelectTrigger>
                    <SelectContent>
                      {RARITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} data-testid={`option-rarity-${option.value}`}>
                          <span className={option.color}>{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <ScrollArea className="w-full">
                  <TabsList className="inline-flex w-full min-w-max mb-4" data-testid="tabs-zone-categories">
                    {ZONE_CATEGORIES.map((category) => {
                      const Icon = category.icon;
                      return (
                        <TabsTrigger 
                          key={category.id} 
                          value={category.id}
                          className="gap-1.5 flex-1"
                          data-testid={`tab-zone-${category.id}`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{category.name}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </ScrollArea>
                
                {ZONE_CATEGORIES.map((category) => (
                  <TabsContent key={category.id} value={category.id} className="mt-0">
                    <ScrollArea className="h-[400px] lg:h-[500px]">
                      <div className="space-y-6 pr-4">
                        {currentCategoryZones.map((zone) => (
                          <ZoneSection
                            key={zone.id}
                            zone={zone}
                            ownedTraitIds={ownedTraitIds}
                            equippedTraitId={equippedTraitMap.get(zone.id)}
                            onTraitClick={handleTraitClick}
                            isEquipping={equipMutation.isPending}
                            rarityFilter={rarityFilter}
                          />
                        ))}
                        {currentCategoryZones.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            No zones available in this category
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Dialog open={purchaseModalOpen} onOpenChange={setPurchaseModalOpen}>
        <DialogContent data-testid="dialog-purchase-trait">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selectedTrait?.name}
              {selectedTrait && (
                <Badge className={`${getRarityClasses(selectedTrait.rarity).bg} ${getRarityClasses(selectedTrait.rarity).text}`}>
                  {selectedTrait.rarity}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTrait?.description || "Unlock this trait to customize your avatar."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedTrait?.unlockType === 'achievement' ? (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-amber-500 mb-2">
                  <Lock className="w-5 h-5" />
                  <span className="font-medium">Achievement Required</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Complete the required achievement to unlock this trait.
                  {selectedTrait.unlockRequirement?.achievementId && (
                    <span className="block mt-1">
                      Achievement ID: {selectedTrait.unlockRequirement.achievementId}
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Cost</div>
                  <div className="flex items-center gap-1 text-lg font-bold">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    {selectedTrait?.coinCost.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Your Balance</div>
                  <div className={`text-lg font-bold ${(user?.coinBalance || 0) >= (selectedTrait?.coinCost || 0) ? 'text-green-500' : 'text-red-500'}`}>
                    {user?.coinBalance?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPurchaseModalOpen(false)}
              data-testid="button-close-modal"
            >
              Cancel
            </Button>
            {selectedTrait?.unlockType !== 'achievement' && (
              <Button
                onClick={() => selectedTrait && purchaseMutation.mutate(selectedTrait.id)}
                disabled={!canPurchase || purchaseMutation.isPending}
                data-testid="button-purchase-trait"
              >
                {purchaseMutation.isPending ? 'Purchasing...' : 'Purchase'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TraitOverlay />
    </div>
  );
}

function ZoneSection({
  zone,
  ownedTraitIds,
  equippedTraitId,
  onTraitClick,
  isEquipping,
  rarityFilter
}: {
  zone: AvatarZone;
  ownedTraitIds: Set<string>;
  equippedTraitId?: string;
  onTraitClick: (trait: AvatarTrait, zone: AvatarZone) => void;
  isEquipping: boolean;
  rarityFilter: RarityFilter;
}) {
  const { data: traits, isLoading } = useQuery<AvatarTrait[]>({
    queryKey: ['/api/avatar-system/zones', zone.id, 'traits'],
  });
  
  const filteredTraits = useMemo(() => {
    if (!traits) return [];
    if (rarityFilter === 'all') return traits;
    return traits.filter(t => t.rarity === rarityFilter);
  }, [traits, rarityFilter]);
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium flex items-center gap-2">
          <Palette className="w-4 h-4" />
          {zone.name}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!filteredTraits || filteredTraits.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-2">
      <h4 className="font-medium flex items-center gap-2" data-testid={`text-zone-${zone.key}`}>
        <Palette className="w-4 h-4" />
        {zone.name}
        <Badge variant="outline" className="text-xs">{filteredTraits.length}</Badge>
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {filteredTraits.map((trait) => (
          <TraitCard
            key={trait.id}
            trait={trait}
            zone={zone}
            isOwned={ownedTraitIds.has(trait.id) || trait.isDefault}
            isEquipped={equippedTraitId === trait.id}
            onClick={() => onTraitClick(trait, zone)}
            isEquipping={isEquipping}
          />
        ))}
      </div>
    </div>
  );
}

function getGlowClasses(rarity: string): string {
  switch (rarity) {
    case 'legendary':
      return 'shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-pulse';
    case 'mythic':
      return 'shadow-[0_0_20px_rgba(236,72,153,0.6)] animate-pulse';
    case 'epic':
      return 'shadow-[0_0_10px_rgba(168,85,247,0.4)]';
    default:
      return '';
  }
}

function TraitCard({
  trait,
  isOwned,
  isEquipped,
  onClick,
  isEquipping
}: {
  trait: AvatarTrait;
  zone: AvatarZone;
  isOwned: boolean;
  isEquipped: boolean;
  onClick: () => void;
  isEquipping: boolean;
}) {
  const isLocked = !isOwned;
  const rarityClasses = getRarityClasses(trait.rarity);
  const rarityBorder = RARITY_BORDER_COLORS[trait.rarity] || RARITY_BORDER_COLORS.common;
  const glowClasses = isOwned ? getGlowClasses(trait.rarity) : '';
  
  return (
    <button
      onClick={onClick}
      disabled={isEquipped || isEquipping}
      className={`
        relative p-2 rounded-lg border-2 transition-all text-left w-full
        ${isEquipped ? 'ring-2 ring-primary bg-primary/10' : 'hover-elevate'}
        ${rarityBorder}
        ${isLocked ? 'opacity-75' : ''}
        ${glowClasses}
        disabled:cursor-default
      `}
      data-testid={`card-trait-${trait.id}`}
      data-action-testid={isOwned && !isEquipped ? 'button-equip-trait' : undefined}
    >
      <div className="flex flex-col items-center gap-1">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLocked ? 'bg-muted' : 'bg-gradient-to-br from-primary/20 to-primary/5'}`}>
          {trait.thumbnailUrl ? (
            <img src={trait.thumbnailUrl} alt={trait.name} className="w-10 h-10 object-contain" />
          ) : (
            <Eye className={`w-6 h-6 ${isLocked ? 'text-muted-foreground' : 'text-primary'}`} />
          )}
        </div>
        
        <div className="w-full text-center">
          <div className="text-xs font-medium truncate" title={trait.name}>
            {trait.name}
          </div>
          <Badge 
            variant="secondary" 
            className={`text-[10px] px-1 py-0 mt-0.5 ${rarityClasses.bg} ${rarityClasses.text}`}
          >
            {getRarityIcon(trait.rarity)}
            <span className="ml-0.5">{trait.rarity}</span>
          </Badge>
        </div>
        
        {isLocked && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {trait.unlockType === 'achievement' ? (
              <>
                <Lock className="w-3 h-3" />
                <span>Locked</span>
              </>
            ) : (
              <>
                <Coins className="w-3 h-3 text-yellow-500" />
                <span>{trait.coinCost}</span>
              </>
            )}
          </div>
        )}
        
        {isEquipped && (
          <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
        
        {isLocked && (
          <div className="absolute top-1 right-1 w-5 h-5 bg-muted rounded-full flex items-center justify-center">
            <Lock className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </div>
    </button>
  );
}
