import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingBag,
  Coins,
  Sparkles,
  Crown,
  Shirt,
  Palette,
  Lock,
  Check,
  Zap,
  Star
} from 'lucide-react';

interface ShopItem {
  id: string;
  name: string;
  category: string;
  rarity: string;
  coinCost: number;
  minLevel: number;
  imageUrl?: string;
  owned: boolean;
  equipped: boolean;
}

const rarityColors: Record<string, string> = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-yellow-600'
};

const categoryIcons: Record<string, any> = {
  hair: Palette,
  outfit: Shirt,
  accessory: Crown,
  weapon: Zap,
  armor: Star
};

export default function Shop() {
  const { toast } = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [coins, setCoins] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchShopData();
  }, []);

  const fetchShopData = async () => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        fetch('/api/shop/items', { credentials: 'include' }),
        fetch('/api/gamification/stats', { credentials: 'include' })
      ]);

      if (itemsRes.ok && statsRes.ok) {
        const itemsData = await itemsRes.json();
        const statsData = await statsRes.json();
        
        setItems(itemsData);
        setCoins(statsData.coins || 0);
        setUserLevel(statsData.level || 1);
      } else {
        // Mock data for demo
        setCoins(2500);
        setUserLevel(5);
        setItems([
          // Hair items
          { id: '1', name: 'Spiky Hair', category: 'hair', rarity: 'common', coinCost: 200, minLevel: 1, owned: false, equipped: false },
          { id: '2', name: 'Long Flowing Hair', category: 'hair', rarity: 'rare', coinCost: 500, minLevel: 3, owned: false, equipped: false },
          { id: '3', name: 'Mystical Aura Hair', category: 'hair', rarity: 'epic', coinCost: 1500, minLevel: 10, owned: false, equipped: false },
          
          // Outfits
          { id: '4', name: 'Casual Outfit', category: 'outfit', rarity: 'common', coinCost: 0, minLevel: 1, owned: true, equipped: true },
          { id: '5', name: 'Business Suit', category: 'outfit', rarity: 'rare', coinCost: 800, minLevel: 5, owned: false, equipped: false },
          { id: '6', name: 'Wizard Robes', category: 'outfit', rarity: 'epic', coinCost: 2000, minLevel: 8, owned: false, equipped: false },
          { id: '7', name: 'Dragon Armor', category: 'outfit', rarity: 'legendary', coinCost: 5000, minLevel: 15, owned: false, equipped: false },
          
          // Accessories
          { id: '8', name: 'Cool Sunglasses', category: 'accessory', rarity: 'common', coinCost: 300, minLevel: 1, owned: false, equipped: false },
          { id: '9', name: 'Golden Crown', category: 'accessory', rarity: 'rare', coinCost: 1200, minLevel: 7, owned: false, equipped: false },
          { id: '10', name: 'Mystic Halo', category: 'accessory', rarity: 'epic', coinCost: 2500, minLevel: 12, owned: false, equipped: false },
          { id: '11', name: 'Legendary Diadem', category: 'accessory', rarity: 'legendary', coinCost: 8000, minLevel: 20, owned: false, equipped: false },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseItem = async (item: ShopItem) => {
    if (item.owned) {
      toast({
        variant: 'destructive',
        title: 'Already Owned',
        description: 'You already own this item!'
      });
      return;
    }

    if (coins < item.coinCost) {
      toast({
        variant: 'destructive',
        title: 'Not Enough Coins',
        description: `You need ${item.coinCost - coins} more coins.`
      });
      return;
    }

    if (userLevel < item.minLevel) {
      toast({
        variant: 'destructive',
        title: 'Level Too Low',
        description: `Reach level ${item.minLevel} to purchase this item.`
      });
      return;
    }

    setPurchasing(item.id);
    try {
      const response = await fetch(`/api/shop/purchase/${item.id}`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        setCoins(coins - item.coinCost);
        setItems(items.map(i => i.id === item.id ? { ...i, owned: true } : i));
        
        toast({
          title: '🎉 Purchase Successful!',
          description: `You bought ${item.name} for ${item.coinCost} coins!`
        });
      } else {
        const data = await response.json();
        toast({
          variant: 'destructive',
          title: 'Purchase Failed',
          description: data.message || 'Failed to purchase item'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to purchase item. Please try again.'
      });
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading shop...</p>
        </div>
      </div>
    );
  }

  const categories = ['all', 'hair', 'outfit', 'accessory', 'weapon', 'armor'];
  const filteredByCategory = (category: string) => 
    category === 'all' ? items : items.filter(item => item.category === category);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              <ShoppingBag className="inline-block mr-2 h-8 w-8 text-yellow-600" />
              Item Shop
            </h1>
            <p className="text-muted-foreground">Customize your avatar with exclusive items</p>
          </div>
          <Card className="px-6 py-3 bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 border-yellow-300">
            <div className="flex items-center gap-3">
              <Coins className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              <div>
                <div className="text-sm text-muted-foreground">Your Balance</div>
                <div className="text-2xl font-bold">{coins}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat === 'all' ? 'All Items' : cat}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredByCategory(category).map((item, index) => {
                const CategoryIcon = categoryIcons[item.category] || ShoppingBag;
                const canPurchase = !item.owned && coins >= item.coinCost && userLevel >= item.minLevel;
                const isPurchasing = purchasing === item.id;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`border-2 h-full flex flex-col ${
                      item.owned 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10' 
                        : ''
                    }`}>
                      <CardHeader className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${rarityColors[item.rarity]} flex items-center justify-center`}>
                            <CategoryIcon className="h-8 w-8 text-white" />
                          </div>
                          {item.owned && (
                            <Badge variant="default" className="bg-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Owned
                            </Badge>
                          )}
                        </div>
                        
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={`bg-gradient-to-r ${rarityColors[item.rarity]} text-white`}
                          >
                            {item.rarity}
                          </Badge>
                          <span className="text-xs capitalize">{item.category}</span>
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Min. Level</span>
                            <Badge variant="outline">{item.minLevel}</Badge>
                          </div>

                          <div className="flex items-center justify-between font-semibold text-lg">
                            <span className="flex items-center gap-1">
                              <Coins className="h-5 w-5 text-yellow-600" />
                              {item.coinCost === 0 ? 'Free' : item.coinCost}
                            </span>
                          </div>

                          <Button
                            onClick={() => purchaseItem(item)}
                            disabled={item.owned || !canPurchase || isPurchasing}
                            className={`w-full ${
                              item.owned 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : canPurchase
                                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700'
                                  : ''
                            }`}
                          >
                            {isPurchasing ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Purchasing...
                              </>
                            ) : item.owned ? (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Owned
                              </>
                            ) : userLevel < item.minLevel ? (
                              <>
                                <Lock className="mr-2 h-4 w-4" />
                                Level {item.minLevel} Required
                              </>
                            ) : coins < item.coinCost ? (
                              <>
                                <Lock className="mr-2 h-4 w-4" />
                                Not Enough Coins
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Purchase
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
