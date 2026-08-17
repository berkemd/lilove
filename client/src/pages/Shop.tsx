import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PurchaseCelebration } from '@/components/CelebrationAnimations';
import { 
  Coins, 
  Check, 
  TreeDeciduous, 
  User, 
  Sparkles, 
  Crown,
  Star,
  Gem,
  Flower2,
  Bird,
  Leaf,
  Sun,
  Moon,
  Wand2,
  RefreshCcw,
  AlertCircle,
  Lock,
  ShoppingBag
} from 'lucide-react';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

interface SanctuaryElement {
  id: string;
  name: string;
  type: string;
  category: string;
  rarity: Rarity;
  evolutionStage: number;
  unlockCost: number;
  xpRequirement: number;
  levelRequirement: number;
  description: string;
  animationType: string;
  assetData?: {
    icon?: string;
    colors?: string[];
    size?: { width: number; height: number };
    layerOrder?: number;
  };
  isActive: boolean;
}

interface AvatarTrait {
  id: string;
  zoneId: string;
  name: string;
  description: string;
  rarity: Rarity;
  thumbnailUrl?: string;
  coinCost: number;
  unlockType: string;
  isDefault: boolean;
  isActive: boolean;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  cost: number;
  icon: string;
  category: 'digital-forest' | 'avatar' | 'effects';
  itemType: 'sanctuary' | 'avatar';
  originalItem: SanctuaryElement | AvatarTrait;
  isOwned: boolean;
}

interface UserProfile {
  coinBalance: number;
  level: number;
}

interface UserSanctuary {
  unlockedElements: string[];
}

interface UserAvatarTrait {
  traitId: string;
}

const RARITY_CONFIG: Record<Rarity, { color: string; bgColor: string; glowColor: string; borderColor: string }> = {
  common: {
    color: '#9CA3AF',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    glowColor: 'shadow-gray-400/30',
    borderColor: 'border-gray-300 dark:border-gray-600'
  },
  uncommon: {
    color: '#22C55E',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    glowColor: 'shadow-green-400/40',
    borderColor: 'border-green-400 dark:border-green-600'
  },
  rare: {
    color: '#3B82F6',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    glowColor: 'shadow-blue-400/40',
    borderColor: 'border-blue-400 dark:border-blue-600'
  },
  epic: {
    color: '#A855F7',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    glowColor: 'shadow-purple-400/50',
    borderColor: 'border-purple-400 dark:border-purple-600'
  },
  legendary: {
    color: '#F59E0B',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    glowColor: 'shadow-amber-400/60',
    borderColor: 'border-amber-400 dark:border-amber-600'
  },
  mythic: {
    color: '#EF4444',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    glowColor: 'shadow-red-500/70',
    borderColor: 'border-red-400 dark:border-red-600'
  }
};

const CATEGORY_ICONS: Record<string, typeof TreeDeciduous> = {
  'digital-forest': TreeDeciduous,
  'avatar': User,
  'effects': Sparkles
};

const ITEM_ICONS: Record<string, string> = {
  tree: '🌳',
  creature: '🦋',
  decoration: '🌸',
  effect: '✨',
  flower: '🌺',
  magical: '🔮',
  nature: '🍃',
  seasonal: '❄️',
  legendary: '👑'
};

function getItemIcon(item: ShopItem): string {
  if (item.icon) return item.icon;
  if (item.itemType === 'sanctuary') {
    const sanctuaryItem = item.originalItem as SanctuaryElement;
    return ITEM_ICONS[sanctuaryItem.type] || ITEM_ICONS[sanctuaryItem.category] || '🌿';
  }
  return '👤';
}

function ShopItemSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="w-20 h-6" />
          <Skeleton className="w-24 h-9" />
        </div>
      </CardContent>
    </Card>
  );
}

function CoinBalanceCard({ balance, isLoading }: { balance: number; isLoading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Coins className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300" data-testid="text-coin-balance">
                  {balance.toLocaleString()}
                </p>
              )}
              <p className="text-sm text-amber-600/80 dark:text-amber-400/80">Available Coins</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RarityBadge({ rarity }: { rarity: Rarity }) {
  const config = RARITY_CONFIG[rarity];
  
  return (
    <Badge 
      className="capitalize text-white font-medium"
      style={{ backgroundColor: config.color }}
      data-testid={`badge-rarity-${rarity}`}
    >
      {rarity}
    </Badge>
  );
}

function ShopItemCard({ 
  item, 
  index, 
  userCoins, 
  onPurchase, 
  isPurchasing 
}: { 
  item: ShopItem; 
  index: number;
  userCoins: number;
  onPurchase: (item: ShopItem) => void;
  isPurchasing: boolean;
}) {
  const config = RARITY_CONFIG[item.rarity];
  const canAfford = userCoins >= item.cost;
  const icon = getItemIcon(item);
  
  const glowStyle = item.rarity === 'mythic' ? {
    boxShadow: `0 0 20px ${config.color}40, 0 0 40px ${config.color}20`
  } : item.rarity === 'legendary' ? {
    boxShadow: `0 0 15px ${config.color}30`
  } : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4,
        delay: index * 0.05,
        ease: "easeOut"
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className="h-full"
    >
      <Card 
        className={`h-full overflow-hidden transition-all duration-300 ${config.borderColor} ${
          item.isOwned ? 'opacity-70' : 'hover-elevate'
        } ${item.rarity === 'mythic' ? 'ring-2 ring-red-400/50 animate-pulse' : ''}`}
        style={glowStyle}
        data-testid={`card-shop-item-${item.id}`}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <motion.div 
              className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${config.bgColor}`}
              whileHover={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.5 }}
              style={item.rarity !== 'common' && item.rarity !== 'uncommon' ? {
                boxShadow: `0 0 12px ${config.color}50`
              } : {}}
            >
              {icon}
            </motion.div>
            <RarityBadge rarity={item.rarity} />
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground truncate" data-testid={`text-item-name-${item.id}`}>
              {item.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
              {item.description || 'A unique item for your collection.'}
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-amber-600 dark:text-amber-400" data-testid={`text-item-cost-${item.id}`}>
                {item.cost.toLocaleString()}
              </span>
            </div>
            
            {item.isOwned ? (
              <Button 
                variant="outline" 
                size="sm" 
                disabled 
                className="gap-1"
                data-testid={`button-owned-${item.id}`}
              >
                <Check className="w-4 h-4 text-green-500" />
                Owned
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!canAfford || isPurchasing}
                onClick={() => onPurchase(item)}
                className={`gap-1 ${!canAfford ? 'opacity-50' : ''}`}
                data-testid={`button-purchase-${item.id}`}
              >
                {isPurchasing ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : !canAfford ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <ShoppingBag className="w-4 h-4" />
                )}
                {!canAfford ? 'Not Enough' : 'Purchase'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RarityFilterButton({ 
  rarity, 
  isSelected, 
  onClick 
}: { 
  rarity: Rarity | 'all'; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const config = rarity === 'all' ? null : RARITY_CONFIG[rarity];
  
  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className={`capitalize gap-1.5 ${
        isSelected && config ? '' : ''
      }`}
      style={isSelected && config ? { 
        backgroundColor: config.color,
        borderColor: config.color
      } : {}}
      data-testid={`button-rarity-filter-${rarity}`}
    >
      {config && (
        <span 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: isSelected ? '#fff' : config.color }}
        />
      )}
      {rarity === 'all' ? 'All Rarities' : rarity}
    </Button>
  );
}

function EmptyState({ category }: { category: string }) {
  return (
    <Card className="col-span-full">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles className="w-16 h-16 text-muted-foreground/50 mb-4" />
        </motion.div>
        <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-shop">
          No Items Available
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          {category === 'all' 
            ? 'Check back later for new items in the shop!'
            : `No items available in this category yet. Check back soon!`
          }
        </p>
      </CardContent>
    </Card>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="col-span-full border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
        <p className="text-muted-foreground text-center mb-4">{message}</p>
        <Button onClick={onRetry} variant="outline" data-testid="button-retry">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

interface PurchasedItemState {
  name: string;
  icon: string;
  rarity: Rarity;
  cost: number;
}

export default function ShopPage() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeRarity, setActiveRarity] = useState<Rarity | 'all'>('all');
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [purchasedItem, setPurchasedItem] = useState<PurchasedItemState | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleCloseCelebration = useCallback(() => {
    setShowCelebration(false);
    setPurchasedItem(null);
  }, []);

  const { data: userProfile, isLoading: loadingProfile } = useQuery<UserProfile>({
    queryKey: ['/api/gamification/profile'],
  });

  const { 
    data: sanctuaryElements = [], 
    isLoading: loadingSanctuary,
    isError: sanctuaryError,
    refetch: refetchSanctuary
  } = useQuery<SanctuaryElement[]>({
    queryKey: ['/api/sanctuary-elements'],
  });

  const { 
    data: avatarTraits = [], 
    isLoading: loadingAvatar,
    isError: avatarError,
    refetch: refetchAvatar
  } = useQuery<AvatarTrait[]>({
    queryKey: ['/api/avatar-traits'],
  });

  const { data: userSanctuary } = useQuery<UserSanctuary>({
    queryKey: ['/api/user/sanctuary'],
  });

  const { data: userAvatarTraits = [] } = useQuery<UserAvatarTrait[]>({
    queryKey: ['/api/user/avatar-traits'],
  });

  const purchaseSanctuaryMutation = useMutation({
    mutationFn: async (elementId: string) => {
      return await apiRequest(`/api/purchase-sanctuary-element/${elementId}`, {
        method: 'POST'
      });
    },
    onSuccess: (_data, elementId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/sanctuary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sanctuary-elements'] });
      
      const element = sanctuaryElements.find(e => e.id === elementId);
      if (element) {
        setPurchasedItem({
          name: element.name,
          icon: element.assetData?.icon || ITEM_ICONS[element.type] || '🌿',
          rarity: (element.rarity as Rarity) || 'common',
          cost: element.unlockCost || 100
        });
        setShowCelebration(true);
      }
      
      toast({
        title: "Purchase Successful!",
        description: "The item has been added to your sanctuary!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase item",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPurchasingItemId(null);
    }
  });

  const purchaseAvatarMutation = useMutation({
    mutationFn: async (traitId: string) => {
      return await apiRequest(`/api/purchase-avatar-trait/${traitId}`, {
        method: 'POST'
      });
    },
    onSuccess: (_data, traitId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/avatar-traits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/avatar-traits'] });
      
      const trait = avatarTraits.find(t => t.id === traitId);
      if (trait) {
        setPurchasedItem({
          name: trait.name,
          icon: '👤',
          rarity: (trait.rarity as Rarity) || 'common',
          cost: trait.coinCost || 100
        });
        setShowCelebration(true);
      }
      
      toast({
        title: "Purchase Successful!",
        description: "The trait has been added to your avatar!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase trait",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPurchasingItemId(null);
    }
  });

  const ownedSanctuaryIds = useMemo(() => 
    new Set(userSanctuary?.unlockedElements || []),
    [userSanctuary]
  );

  const ownedAvatarIds = useMemo(() => 
    new Set(userAvatarTraits.map(t => t.traitId)),
    [userAvatarTraits]
  );

  const shopItems: ShopItem[] = useMemo(() => {
    const items: ShopItem[] = [];

    sanctuaryElements.forEach(element => {
      if (!element.isActive) return;
      
      let category: 'digital-forest' | 'avatar' | 'effects' = 'digital-forest';
      if (element.type === 'effect' || element.animationType === 'glow') {
        category = 'effects';
      }
      
      items.push({
        id: `sanctuary-${element.id}`,
        name: element.name,
        description: element.description || '',
        rarity: (element.rarity as Rarity) || 'common',
        cost: element.unlockCost || 100,
        icon: element.assetData?.icon || ITEM_ICONS[element.type] || '🌿',
        category,
        itemType: 'sanctuary',
        originalItem: element,
        isOwned: ownedSanctuaryIds.has(element.id)
      });
    });

    avatarTraits.forEach(trait => {
      if (!trait.isActive || trait.isDefault) return;
      
      items.push({
        id: `avatar-${trait.id}`,
        name: trait.name,
        description: trait.description || '',
        rarity: (trait.rarity as Rarity) || 'common',
        cost: trait.coinCost || 150,
        icon: '👤',
        category: 'avatar',
        itemType: 'avatar',
        originalItem: trait,
        isOwned: ownedAvatarIds.has(trait.id)
      });
    });

    return items;
  }, [sanctuaryElements, avatarTraits, ownedSanctuaryIds, ownedAvatarIds]);

  const filteredItems = useMemo(() => {
    return shopItems.filter(item => {
      const categoryMatch = activeCategory === 'all' || item.category === activeCategory;
      const rarityMatch = activeRarity === 'all' || item.rarity === activeRarity;
      return categoryMatch && rarityMatch;
    });
  }, [shopItems, activeCategory, activeRarity]);

  const handlePurchase = (item: ShopItem) => {
    setPurchasingItemId(item.id);
    
    if (item.itemType === 'sanctuary') {
      const sanctuaryItem = item.originalItem as SanctuaryElement;
      purchaseSanctuaryMutation.mutate(sanctuaryItem.id);
    } else {
      const avatarItem = item.originalItem as AvatarTrait;
      purchaseAvatarMutation.mutate(avatarItem.id);
    }
  };

  const isLoading = loadingSanctuary || loadingAvatar;
  const hasError = sanctuaryError || avatarError;
  const userCoins = userProfile?.coinBalance || 0;

  const categories = [
    { value: 'all', label: 'All', icon: Star },
    { value: 'digital-forest', label: 'Digital Forest', icon: TreeDeciduous },
    { value: 'avatar', label: 'Avatar Items', icon: User },
    { value: 'effects', label: 'Effects', icon: Sparkles }
  ];

  const rarities: (Rarity | 'all')[] = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6" data-testid="page-shop">
      {purchasedItem && (
        <PurchaseCelebration
          isVisible={showCelebration}
          item={purchasedItem}
          onClose={handleCloseCelebration}
        />
      )}
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent" data-testid="text-shop-title">
            Growth Shop
          </h1>
          <p className="text-muted-foreground mt-1">
            Unlock items to nurture your sanctuary and customize your journey
          </p>
        </div>
        
        <CoinBalanceCard balance={userCoins} isLoading={loadingProfile} />
      </motion.div>

      <Tabs 
        value={activeCategory} 
        onValueChange={setActiveCategory}
        className="w-full"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <TabsList className="w-full max-w-lg grid grid-cols-4 mb-4" data-testid="tabs-category">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <TabsTrigger 
                  key={cat.value} 
                  value={cat.value}
                  className="gap-1.5"
                  data-testid={`tab-category-${cat.value}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{cat.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {rarities.map(rarity => (
            <RarityFilterButton
              key={rarity}
              rarity={rarity}
              isSelected={activeRarity === rarity}
              onClick={() => setActiveRarity(rarity)}
            />
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {categories.map(cat => (
            <TabsContent 
              key={cat.value} 
              value={cat.value}
              className="mt-0"
              data-testid={`tab-content-${cat.value}`}
            >
              {hasError ? (
                <ErrorState 
                  message="Failed to load shop items. Please try again."
                  onRetry={() => {
                    refetchSanctuary();
                    refetchAvatar();
                  }}
                />
              ) : isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ShopItemSkeleton key={i} />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <EmptyState category={cat.value} />
              ) : (
                <motion.div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                >
                  {filteredItems.map((item, index) => (
                    <ShopItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      userCoins={userCoins}
                      onPurchase={handlePurchase}
                      isPurchasing={purchasingItemId === item.id}
                    />
                  ))}
                </motion.div>
              )}
            </TabsContent>
          ))}
        </AnimatePresence>
      </Tabs>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center text-sm text-muted-foreground pt-4"
      >
        <p>
          Items marked with <Check className="w-4 h-4 inline text-green-500" /> are already in your collection
        </p>
      </motion.div>
    </div>
  );
}
