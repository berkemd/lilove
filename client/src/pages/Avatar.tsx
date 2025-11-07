import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Palette, 
  Shirt, 
  Crown, 
  Shield, 
  Sword,
  Sparkles,
  Coins,
  Heart,
  Zap,
  Lock
} from 'lucide-react';

interface AvatarData {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  faceType: string;
  outfit: string;
  accessory: string;
  weapon: string;
  armor: string;
  helmet: string;
  shield: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
}

const skinTones = [
  { id: 'light', name: 'Light', color: '#FFE0BD' },
  { id: 'medium', name: 'Medium', color: '#E6B98D' },
  { id: 'tan', name: 'Tan', color: '#D4A574' },
  { id: 'dark', name: 'Dark', color: '#8D5524' },
  { id: 'deep', name: 'Deep', color: '#5C3317' }
];

const hairStyles = [
  { id: 'short', name: 'Short', emoji: '👦' },
  { id: 'long', name: 'Long', emoji: '👩' },
  { id: 'curly', name: 'Curly', emoji: '🦱' },
  { id: 'bald', name: 'Bald', emoji: '👨‍🦲' },
  { id: 'spiky', name: 'Spiky', emoji: '🦝' }
];

const hairColors = [
  { id: 'black', name: 'Black', color: '#1A1A1A' },
  { id: 'brown', name: 'Brown', color: '#8B4513' },
  { id: 'blonde', name: 'Blonde', color: '#FFD700' },
  { id: 'red', name: 'Red', color: '#FF4500' },
  { id: 'blue', name: 'Blue', color: '#4169E1' },
  { id: 'purple', name: 'Purple', color: '#9370DB' }
];

const outfits = [
  { id: 'casual', name: 'Casual', emoji: '👕', cost: 0 },
  { id: 'formal', name: 'Formal', emoji: '🤵', cost: 500 },
  { id: 'sporty', name: 'Sporty', emoji: '🏃', cost: 300 },
  { id: 'wizard', name: 'Wizard', emoji: '🧙', cost: 1000 },
  { id: 'knight', name: 'Knight', emoji: '🛡️', cost: 1500 }
];

const accessories = [
  { id: 'none', name: 'None', emoji: '⭕', cost: 0 },
  { id: 'glasses', name: 'Glasses', emoji: '👓', cost: 200 },
  { id: 'crown', name: 'Crown', emoji: '👑', cost: 2000 },
  { id: 'mask', name: 'Mask', emoji: '🎭', cost: 800 },
  { id: 'headphones', name: 'Headphones', emoji: '🎧', cost: 600 }
];

export default function Avatar() {
  const { toast } = useToast();
  const [avatar, setAvatar] = useState<AvatarData | null>(null);
  const [coins, setCoins] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAvatar();
  }, []);

  const fetchAvatar = async () => {
    try {
      const response = await fetch('/api/avatar', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvatar(data.avatar);
        setCoins(data.coins || 1000);
      } else {
        // Initialize default avatar
        setAvatar({
          skinTone: 'light',
          hairStyle: 'short',
          hairColor: 'brown',
          faceType: 'happy',
          outfit: 'casual',
          accessory: 'none',
          weapon: 'none',
          armor: 'none',
          helmet: 'none',
          shield: 'none',
          health: 100,
          maxHealth: 100,
          mana: 50,
          maxMana: 50
        });
      }
    } catch (error) {
      console.error('Failed to fetch avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAvatar = async () => {
    if (!avatar) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(avatar)
      });

      if (response.ok) {
        toast({
          title: 'Avatar Updated! ✨',
          description: 'Your character has been customized successfully.'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save avatar. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateAvatar = (key: keyof AvatarData, value: any) => {
    if (!avatar) return;
    setAvatar({ ...avatar, [key]: value });
  };

  const purchaseItem = (itemCost: number, updateFn: () => void) => {
    if (coins >= itemCost) {
      setCoins(coins - itemCost);
      updateFn();
      if (itemCost > 0) {
        toast({
          title: '🎉 Purchase Successful!',
          description: `Spent ${itemCost} coins`
        });
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Not Enough Coins',
        description: `You need ${itemCost - coins} more coins.`
      });
    }
  };

  if (loading || !avatar) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your avatar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Avatar Customization
            </h1>
            <p className="text-muted-foreground">Create your unique character and stand out!</p>
          </div>
          <div className="flex items-center gap-4">
            <Card className="px-4 py-2 bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 border-yellow-300">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <span className="font-bold text-lg">{coins}</span>
              </div>
            </Card>
            <Button 
              onClick={saveAvatar} 
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Avatar Preview */}
        <Card className="lg:col-span-1 h-fit sticky top-4">
          <CardHeader className="text-center">
            <CardTitle>Your Avatar</CardTitle>
            <CardDescription>Live Preview</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 mb-4"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Animated character representation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <motion.div 
                    className="text-8xl mb-4"
                    animate={{ 
                      y: [0, -10, 0],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity 
                    }}
                  >
                    {outfits.find(o => o.id === avatar.outfit)?.emoji || '👤'}
                  </motion.div>
                  {avatar.accessory !== 'none' && (
                    <div className="text-5xl -mt-8">
                      {accessories.find(a => a.id === avatar.accessory)?.emoji}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm flex items-center gap-1">
                    <Heart className="h-4 w-4 text-red-500" />
                    Health
                  </span>
                  <span className="text-sm font-semibold">{avatar.health}/{avatar.maxHealth}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-pink-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${(avatar.health / avatar.maxHealth) * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm flex items-center gap-1">
                    <Zap className="h-4 w-4 text-blue-500" />
                    Mana
                  </span>
                  <span className="text-sm font-semibold">{avatar.mana}/{avatar.maxMana}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${(avatar.mana / avatar.maxMana) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customization Options */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="appearance" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="appearance">
                <User className="mr-2 h-4 w-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="outfits">
                <Shirt className="mr-2 h-4 w-4" />
                Outfits
              </TabsTrigger>
              <TabsTrigger value="equipment">
                <Shield className="mr-2 h-4 w-4" />
                Equipment
              </TabsTrigger>
            </TabsList>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Skin Tone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-3">
                    {skinTones.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => updateAvatar('skinTone', tone.id)}
                        className={`aspect-square rounded-xl border-4 transition-all ${
                          avatar.skinTone === tone.id
                            ? 'border-purple-600 scale-110'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                        style={{ backgroundColor: tone.color }}
                        title={tone.name}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hair Style</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-3">
                    {hairStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => updateAvatar('hairStyle', style.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-4xl ${
                          avatar.hairStyle === style.id
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 scale-105'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                        title={style.name}
                      >
                        {style.emoji}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hair Color</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-6 gap-3">
                    {hairColors.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => updateAvatar('hairColor', color.id)}
                        className={`aspect-square rounded-xl border-4 transition-all ${
                          avatar.hairColor === color.id
                            ? 'border-purple-600 scale-110'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                        style={{ backgroundColor: color.color }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Outfits Tab */}
            <TabsContent value="outfits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shirt className="h-5 w-5" />
                    Outfits
                  </CardTitle>
                  <CardDescription>Choose your style</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {outfits.map((outfit) => (
                      <motion.button
                        key={outfit.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => purchaseItem(outfit.cost, () => updateAvatar('outfit', outfit.id))}
                        className={`p-6 rounded-xl border-2 transition-all ${
                          avatar.outfit === outfit.id
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-5xl mb-3">{outfit.emoji}</div>
                        <div className="font-semibold mb-2">{outfit.name}</div>
                        {outfit.cost > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Coins className="h-3 w-3" />
                            {outfit.cost}
                          </Badge>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    Accessories
                  </CardTitle>
                  <CardDescription>Add some flair</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {accessories.map((accessory) => (
                      <motion.button
                        key={accessory.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => purchaseItem(accessory.cost, () => updateAvatar('accessory', accessory.id))}
                        className={`p-6 rounded-xl border-2 transition-all ${
                          avatar.accessory === accessory.id
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-5xl mb-3">{accessory.emoji}</div>
                        <div className="font-semibold mb-2">{accessory.name}</div>
                        {accessory.cost > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Coins className="h-3 w-3" />
                            {accessory.cost}
                          </Badge>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Equipment Tab */}
            <TabsContent value="equipment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sword className="h-5 w-5" />
                    Battle Equipment
                  </CardTitle>
                  <CardDescription>Coming soon! Complete quests to unlock powerful gear.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { name: 'Legendary Sword', emoji: '⚔️', locked: true },
                      { name: 'Dragon Armor', emoji: '🛡️', locked: true },
                      { name: 'Magic Staff', emoji: '🪄', locked: true },
                      { name: 'Phoenix Shield', emoji: '🔥', locked: true }
                    ].map((item, index) => (
                      <Card key={index} className="p-4 opacity-60">
                        <div className="text-4xl mb-2">{item.emoji}</div>
                        <div className="font-semibold mb-1">{item.name}</div>
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
