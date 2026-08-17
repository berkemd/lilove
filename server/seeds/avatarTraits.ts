import { db } from '../db';
import { 
  avatarZones, 
  avatarTraits, 
  userAvatarTraits,
  AVATAR_ZONES,
  type TraitRarity
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const ZONE_DESCRIPTIONS: Record<string, { description: string; isRequired: boolean }> = {
  skin: { description: 'Your avatar\'s skin tone and texture', isRequired: true },
  body: { description: 'Body shape and build', isRequired: true },
  face_shape: { description: 'The shape of your avatar\'s face', isRequired: true },
  eyes: { description: 'Eye shape and style', isRequired: true },
  eyebrows: { description: 'Eyebrow style and shape', isRequired: false },
  nose: { description: 'Nose shape and size', isRequired: false },
  mouth: { description: 'Mouth and lip style', isRequired: false },
  ears: { description: 'Ear shape and accessories', isRequired: false },
  hair: { description: 'Hairstyle and length', isRequired: false },
  hair_color: { description: 'Hair color and highlights', isRequired: false },
  facial_hair: { description: 'Beards, mustaches, and stubble', isRequired: false },
  makeup: { description: 'Cosmetics and face paint', isRequired: false },
  glasses: { description: 'Eyewear and eye accessories', isRequired: false },
  clothing_top: { description: 'Shirts, jackets, and upper body wear', isRequired: false },
  clothing_bottom: { description: 'Pants, skirts, and lower body wear', isRequired: false },
  shoes: { description: 'Footwear and leg accessories', isRequired: false },
  hat: { description: 'Hats, helmets, and headwear', isRequired: false },
  jewelry: { description: 'Necklaces, earrings, and accessories', isRequired: false },
  tattoo: { description: 'Body art and tattoo designs', isRequired: false },
  scars: { description: 'Scars, marks, and distinctive features', isRequired: false },
  wings: { description: 'Angelic, demonic, or fantasy wings', isRequired: false },
  aura: { description: 'Magical glows and energy effects', isRequired: false },
  pet: { description: 'Companion creatures and familiars', isRequired: false },
  background: { description: 'Scene backdrop and environment', isRequired: false },
  frame: { description: 'Decorative border around your avatar', isRequired: false },
};

interface TraitDefinition {
  name: string;
  description?: string;
  rarity: TraitRarity;
  coinCost: number;
  isDefault: boolean;
  unlockType: 'purchase' | 'achievement' | 'challenge' | 'event' | 'default';
  unlockRequirement?: {
    type: 'achievement' | 'challenge' | 'purchase' | 'level' | 'event';
    achievementId?: string;
    challengeId?: string;
    coinCost?: number;
    levelRequired?: number;
    eventId?: string;
  };
}

const TRAIT_CATALOG: Record<string, TraitDefinition[]> = {
  skin: [
    { name: 'Light', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Fair', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Medium', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Tan', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Dark', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Deep', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Olive', rarity: 'uncommon', coinCost: 50, isDefault: false, unlockType: 'purchase' },
    { name: 'Crystal', description: 'Translucent crystalline skin', rarity: 'rare', coinCost: 300, isDefault: false, unlockType: 'purchase' },
    { name: 'Shadow', description: 'Dark ethereal skin with smoke effects', rarity: 'rare', coinCost: 400, isDefault: false, unlockType: 'purchase' },
    { name: 'Golden', description: 'Radiant golden skin', rarity: 'epic', coinCost: 1500, isDefault: false, unlockType: 'purchase' },
  ],
  body: [
    { name: 'Standard', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Slim', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Athletic', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Muscular', rarity: 'uncommon', coinCost: 75, isDefault: false, unlockType: 'purchase' },
    { name: 'Curvy', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
  ],
  face_shape: [
    { name: 'Oval', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Round', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Square', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Heart', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Diamond', rarity: 'uncommon', coinCost: 50, isDefault: false, unlockType: 'purchase' },
  ],
  eyes: [
    { name: 'Round', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Almond', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Wide', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Narrow', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Hooded', rarity: 'uncommon', coinCost: 50, isDefault: false, unlockType: 'purchase' },
    { name: 'Glowing Blue', description: 'Eyes with a mystical blue glow', rarity: 'rare', coinCost: 350, isDefault: false, unlockType: 'purchase' },
    { name: 'Glowing Green', description: 'Eyes with an ethereal green glow', rarity: 'rare', coinCost: 350, isDefault: false, unlockType: 'purchase' },
    { name: 'Rainbow', description: 'Prismatic shifting eyes', rarity: 'epic', coinCost: 1200, isDefault: false, unlockType: 'purchase' },
    { name: 'Void', description: 'Deep cosmic void eyes', rarity: 'legendary', coinCost: 5000, isDefault: false, unlockType: 'achievement', unlockRequirement: { type: 'achievement', achievementId: 'streak_100' } },
  ],
  eyebrows: [
    { name: 'Natural', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Arched', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Thick', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Thin', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Fierce', rarity: 'uncommon', coinCost: 75, isDefault: false, unlockType: 'purchase' },
  ],
  nose: [
    { name: 'Standard', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Button', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Pointed', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Wide', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
  ],
  mouth: [
    { name: 'Smile', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Neutral', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Smirk', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Open', rarity: 'uncommon', coinCost: 50, isDefault: false, unlockType: 'purchase' },
    { name: 'Fangs', description: 'Vampiric fangs visible', rarity: 'rare', coinCost: 300, isDefault: false, unlockType: 'purchase' },
  ],
  ears: [
    { name: 'Standard', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Pointed', description: 'Elven pointed ears', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Long Elf', description: 'Long elegant elven ears', rarity: 'rare', coinCost: 300, isDefault: false, unlockType: 'purchase' },
    { name: 'Cat', description: 'Cute cat ears', rarity: 'rare', coinCost: 400, isDefault: false, unlockType: 'purchase' },
    { name: 'Demon', description: 'Sharp demonic ears', rarity: 'epic', coinCost: 1500, isDefault: false, unlockType: 'purchase' },
  ],
  hair: [
    { name: 'Short', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Long', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Curly', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Wavy', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Bald', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Ponytail', rarity: 'uncommon', coinCost: 75, isDefault: false, unlockType: 'purchase' },
    { name: 'Braided', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Mohawk', rarity: 'rare', coinCost: 250, isDefault: false, unlockType: 'purchase' },
    { name: 'Fire', description: 'Hair made of living flames', rarity: 'epic', coinCost: 2000, isDefault: false, unlockType: 'purchase' },
    { name: 'Ice', description: 'Frozen crystalline hair', rarity: 'epic', coinCost: 2000, isDefault: false, unlockType: 'purchase' },
    { name: 'Galaxy', description: 'Hair containing swirling galaxies', rarity: 'legendary', coinCost: 6000, isDefault: false, unlockType: 'achievement', unlockRequirement: { type: 'achievement', achievementId: 'all_goals_master' } },
  ],
  hair_color: [
    { name: 'Black', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Brown', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Blonde', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Red', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Gray', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'White', rarity: 'uncommon', coinCost: 75, isDefault: false, unlockType: 'purchase' },
    { name: 'Pink', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Blue', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Purple', rarity: 'rare', coinCost: 200, isDefault: false, unlockType: 'purchase' },
    { name: 'Rainbow', description: 'Multicolored rainbow hair', rarity: 'epic', coinCost: 1500, isDefault: false, unlockType: 'purchase' },
  ],
  facial_hair: [
    { name: 'None', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Stubble', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Mustache', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Goatee', rarity: 'uncommon', coinCost: 50, isDefault: false, unlockType: 'purchase' },
    { name: 'Full Beard', rarity: 'uncommon', coinCost: 75, isDefault: false, unlockType: 'purchase' },
    { name: 'Wizard Beard', description: 'Long flowing wizard beard', rarity: 'rare', coinCost: 400, isDefault: false, unlockType: 'purchase' },
  ],
  makeup: [
    { name: 'None', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Light', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Bold Lipstick', rarity: 'uncommon', coinCost: 75, isDefault: false, unlockType: 'purchase' },
    { name: 'Smoky Eyes', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'War Paint', description: 'Tribal war paint', rarity: 'rare', coinCost: 300, isDefault: false, unlockType: 'purchase' },
    { name: 'Celestial', description: 'Shimmering star-themed makeup', rarity: 'epic', coinCost: 1200, isDefault: false, unlockType: 'purchase' },
  ],
  glasses: [
    { name: 'None', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Round', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Square', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Aviator', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Monocle', rarity: 'rare', coinCost: 300, isDefault: false, unlockType: 'purchase' },
    { name: 'Cyberpunk Visor', description: 'Futuristic neon visor', rarity: 'epic', coinCost: 1500, isDefault: false, unlockType: 'purchase' },
    { name: 'Ancient Wisdom', description: 'Floating mystical spectacles', rarity: 'legendary', coinCost: 5500, isDefault: false, unlockType: 'achievement', unlockRequirement: { type: 'achievement', achievementId: 'knowledge_seeker' } },
  ],
  clothing_top: [
    { name: 'T-Shirt', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Hoodie', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Button-Up', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Tank Top', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Jacket', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Sweater', rarity: 'uncommon', coinCost: 75, isDefault: false, unlockType: 'purchase' },
    { name: 'Leather Jacket', rarity: 'rare', coinCost: 350, isDefault: false, unlockType: 'purchase' },
    { name: 'Armor', description: 'Shining plate armor', rarity: 'epic', coinCost: 2000, isDefault: false, unlockType: 'purchase' },
    { name: 'Royal Robes', description: 'Elegant royal attire', rarity: 'legendary', coinCost: 5000, isDefault: false, unlockType: 'achievement', unlockRequirement: { type: 'achievement', achievementId: 'streak_30' } },
    { name: 'Cosmic Cloak', description: 'Cloak woven from starlight', rarity: 'mythic', coinCost: 10000, isDefault: false, unlockType: 'event', unlockRequirement: { type: 'event', eventId: 'cosmic_event_2025' } },
  ],
  clothing_bottom: [
    { name: 'Jeans', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Shorts', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Sweatpants', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Skirt', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Cargo Pants', rarity: 'uncommon', coinCost: 75, isDefault: false, unlockType: 'purchase' },
    { name: 'Armor Leggings', rarity: 'rare', coinCost: 400, isDefault: false, unlockType: 'purchase' },
    { name: 'Royal Pants', rarity: 'epic', coinCost: 1500, isDefault: false, unlockType: 'purchase' },
  ],
  shoes: [
    { name: 'Sneakers', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Boots', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Sandals', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Barefoot', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'High Heels', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Combat Boots', rarity: 'rare', coinCost: 300, isDefault: false, unlockType: 'purchase' },
    { name: 'Winged Sandals', description: 'Sandals with magical wings', rarity: 'epic', coinCost: 2000, isDefault: false, unlockType: 'purchase' },
  ],
  hat: [
    { name: 'None', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Baseball Cap', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Beanie', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Fedora', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Crown', description: 'Golden royal crown', rarity: 'rare', coinCost: 500, isDefault: false, unlockType: 'purchase' },
    { name: 'Wizard Hat', rarity: 'rare', coinCost: 400, isDefault: false, unlockType: 'purchase' },
    { name: 'Halo', description: 'Glowing angelic halo', rarity: 'epic', coinCost: 2500, isDefault: false, unlockType: 'purchase' },
    { name: 'Champion Crown', description: 'Crown of the weekly champion', rarity: 'legendary', coinCost: 7500, isDefault: false, unlockType: 'achievement', unlockRequirement: { type: 'achievement', achievementId: 'weekly_champion' } },
  ],
  jewelry: [
    { name: 'None', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Simple Necklace', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Stud Earrings', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Hoop Earrings', rarity: 'uncommon', coinCost: 75, isDefault: false, unlockType: 'purchase' },
    { name: 'Diamond Necklace', rarity: 'rare', coinCost: 400, isDefault: false, unlockType: 'purchase' },
    { name: 'Ancient Amulet', description: 'Mystical glowing amulet', rarity: 'epic', coinCost: 1800, isDefault: false, unlockType: 'purchase' },
  ],
  tattoo: [
    { name: 'None', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Tribal Arm', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Rose', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Dragon', rarity: 'rare', coinCost: 350, isDefault: false, unlockType: 'purchase' },
    { name: 'Full Sleeve', rarity: 'rare', coinCost: 500, isDefault: false, unlockType: 'purchase' },
    { name: 'Glowing Runes', description: 'Magical runes that pulse with power', rarity: 'epic', coinCost: 2000, isDefault: false, unlockType: 'purchase' },
  ],
  scars: [
    { name: 'None', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Cheek Scar', rarity: 'uncommon', coinCost: 75, isDefault: false, unlockType: 'purchase' },
    { name: 'Eye Scar', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Battle Scars', description: 'Multiple battle-worn scars', rarity: 'rare', coinCost: 300, isDefault: false, unlockType: 'purchase' },
    { name: 'Lightning Mark', description: 'Glowing lightning bolt scar', rarity: 'epic', coinCost: 1500, isDefault: false, unlockType: 'achievement', unlockRequirement: { type: 'achievement', achievementId: 'perfect_week' } },
  ],
  wings: [
    { name: 'None', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Fairy Wings', description: 'Delicate translucent fairy wings', rarity: 'rare', coinCost: 500, isDefault: false, unlockType: 'purchase' },
    { name: 'Angel Wings', description: 'Pure white feathered wings', rarity: 'epic', coinCost: 2500, isDefault: false, unlockType: 'purchase' },
    { name: 'Demon Wings', description: 'Dark bat-like demon wings', rarity: 'epic', coinCost: 2500, isDefault: false, unlockType: 'purchase' },
    { name: 'Dragon Wings', description: 'Massive dragon wings', rarity: 'legendary', coinCost: 6000, isDefault: false, unlockType: 'achievement', unlockRequirement: { type: 'achievement', achievementId: 'dragon_slayer' } },
    { name: 'Phoenix Wings', description: 'Blazing phoenix fire wings', rarity: 'mythic', coinCost: 15000, isDefault: false, unlockType: 'challenge', unlockRequirement: { type: 'challenge', challengeId: 'ultimate_challenge' } },
  ],
  aura: [
    { name: 'None', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Gentle Glow', description: 'Soft warm ambient glow', rarity: 'uncommon', coinCost: 100, isDefault: false, unlockType: 'purchase' },
    { name: 'Sparkles', description: 'Floating sparkle particles', rarity: 'uncommon', coinCost: 150, isDefault: false, unlockType: 'purchase' },
    { name: 'Flame Aura', description: 'Surrounding dancing flames', rarity: 'rare', coinCost: 400, isDefault: false, unlockType: 'purchase' },
    { name: 'Frost Aura', description: 'Swirling ice crystals', rarity: 'rare', coinCost: 400, isDefault: false, unlockType: 'purchase' },
    { name: 'Lightning', description: 'Crackling electric aura', rarity: 'epic', coinCost: 1800, isDefault: false, unlockType: 'purchase' },
    { name: 'Divine Light', description: 'Radiant holy light emanation', rarity: 'legendary', coinCost: 5500, isDefault: false, unlockType: 'achievement', unlockRequirement: { type: 'achievement', achievementId: 'enlightened' } },
    { name: 'Void Energy', description: 'Consuming dark void energy', rarity: 'mythic', coinCost: 12000, isDefault: false, unlockType: 'event', unlockRequirement: { type: 'event', eventId: 'void_event' } },
  ],
  pet: [
    { name: 'None', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Cat', description: 'Cute companion cat', rarity: 'rare', coinCost: 500, isDefault: false, unlockType: 'purchase' },
    { name: 'Dog', description: 'Loyal companion dog', rarity: 'rare', coinCost: 500, isDefault: false, unlockType: 'purchase' },
    { name: 'Owl', description: 'Wise owl companion', rarity: 'rare', coinCost: 600, isDefault: false, unlockType: 'purchase' },
    { name: 'Fox', description: 'Clever fox companion', rarity: 'epic', coinCost: 1500, isDefault: false, unlockType: 'purchase' },
    { name: 'Phoenix', description: 'Fiery phoenix companion', rarity: 'legendary', coinCost: 6000, isDefault: false, unlockType: 'achievement', unlockRequirement: { type: 'achievement', achievementId: 'rebirth' } },
    { name: 'Dragon', description: 'Baby dragon companion', rarity: 'legendary', coinCost: 8000, isDefault: false, unlockType: 'purchase' },
    { name: 'Cosmic Wolf', description: 'Wolf made of stars and galaxies', rarity: 'mythic', coinCost: 20000, isDefault: false, unlockType: 'challenge', unlockRequirement: { type: 'challenge', challengeId: 'cosmic_mastery' } },
  ],
  background: [
    { name: 'Solid Light', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Solid Dark', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Gradient Blue', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Gradient Purple', rarity: 'uncommon', coinCost: 75, isDefault: false, unlockType: 'purchase' },
    { name: 'Forest', description: 'Peaceful forest scenery', rarity: 'rare', coinCost: 300, isDefault: false, unlockType: 'purchase' },
    { name: 'Ocean', description: 'Serene ocean view', rarity: 'rare', coinCost: 300, isDefault: false, unlockType: 'purchase' },
    { name: 'Mountain Peak', rarity: 'rare', coinCost: 400, isDefault: false, unlockType: 'purchase' },
    { name: 'Castle', description: 'Majestic castle backdrop', rarity: 'epic', coinCost: 1500, isDefault: false, unlockType: 'purchase' },
    { name: 'Nebula', description: 'Swirling cosmic nebula', rarity: 'legendary', coinCost: 5000, isDefault: false, unlockType: 'achievement', unlockRequirement: { type: 'achievement', achievementId: 'star_collector' } },
    { name: 'Dimensional Rift', description: 'Tear in the fabric of reality', rarity: 'mythic', coinCost: 15000, isDefault: false, unlockType: 'event', unlockRequirement: { type: 'event', eventId: 'dimension_event' } },
  ],
  frame: [
    { name: 'None', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Simple', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Rounded', rarity: 'common', coinCost: 0, isDefault: true, unlockType: 'default' },
    { name: 'Golden', description: 'Elegant golden frame', rarity: 'rare', coinCost: 400, isDefault: false, unlockType: 'purchase' },
    { name: 'Diamond', description: 'Sparkling diamond border', rarity: 'epic', coinCost: 2000, isDefault: false, unlockType: 'purchase' },
    { name: 'Champion', description: 'Animated champion frame', rarity: 'legendary', coinCost: 7000, isDefault: false, unlockType: 'achievement', unlockRequirement: { type: 'achievement', achievementId: 'season_champion' } },
    { name: 'Celestial', description: 'Glowing celestial frame', rarity: 'mythic', coinCost: 12000, isDefault: false, unlockType: 'event', unlockRequirement: { type: 'event', eventId: 'celestial_event' } },
  ],
};

export async function seedAvatarZones(): Promise<void> {
  console.log('Seeding avatar zones...');
  
  const existingZones = await db.select().from(avatarZones);
  if (existingZones.length > 0) {
    console.log(`Found ${existingZones.length} existing zones, skipping zone seeding.`);
    return;
  }
  
  const zonesToInsert = AVATAR_ZONES.map((zone) => {
    const details = ZONE_DESCRIPTIONS[zone.key] || { description: '', isRequired: false };
    return {
      key: zone.key,
      name: zone.name,
      description: details.description,
      layerOrder: zone.layerOrder,
      isRequired: details.isRequired,
      allowMultiple: false,
    };
  });
  
  await db.insert(avatarZones).values(zonesToInsert);
  console.log(`Seeded ${zonesToInsert.length} avatar zones.`);
}

export async function seedAvatarTraits(): Promise<void> {
  console.log('Seeding avatar traits...');
  
  const existingTraits = await db.select().from(avatarTraits);
  if (existingTraits.length > 0) {
    console.log(`Found ${existingTraits.length} existing traits, skipping trait seeding.`);
    return;
  }
  
  const zones = await db.select().from(avatarZones);
  if (zones.length === 0) {
    console.error('No zones found. Please run seedAvatarZones() first.');
    return;
  }
  
  const zoneIdMap = new Map(zones.map(z => [z.key, z.id]));
  
  const traitsToInsert: Array<{
    zoneId: string;
    name: string;
    description?: string;
    rarity: string;
    coinCost: number;
    isDefault: boolean;
    unlockType: string;
    unlockRequirement?: {
      type: 'achievement' | 'challenge' | 'purchase' | 'level' | 'event';
      achievementId?: string;
      challengeId?: string;
      coinCost?: number;
      levelRequired?: number;
      eventId?: string;
    };
    isActive: boolean;
  }> = [];
  
  for (const [zoneKey, traits] of Object.entries(TRAIT_CATALOG)) {
    const zoneId = zoneIdMap.get(zoneKey);
    if (!zoneId) {
      console.warn(`Zone '${zoneKey}' not found in database, skipping its traits.`);
      continue;
    }
    
    for (const trait of traits) {
      traitsToInsert.push({
        zoneId,
        name: trait.name,
        description: trait.description,
        rarity: trait.rarity,
        coinCost: trait.coinCost,
        isDefault: trait.isDefault,
        unlockType: trait.unlockType,
        unlockRequirement: trait.unlockRequirement,
        isActive: true,
      });
    }
  }
  
  if (traitsToInsert.length > 0) {
    await db.insert(avatarTraits).values(traitsToInsert);
  }
  
  console.log(`Seeded ${traitsToInsert.length} avatar traits.`);
}

export async function seedDefaultUserTraits(userId: string): Promise<void> {
  console.log(`Granting default traits to user ${userId}...`);
  
  const defaultTraits = await db.select()
    .from(avatarTraits)
    .where(eq(avatarTraits.isDefault, true));
  
  if (defaultTraits.length === 0) {
    console.warn('No default traits found. Please run seedAvatarTraits() first.');
    return;
  }
  
  const existingUserTraits = await db.select()
    .from(userAvatarTraits)
    .where(eq(userAvatarTraits.userId, userId));
  
  const existingTraitIds = new Set(existingUserTraits.map(ut => ut.traitId));
  
  const traitsToGrant = defaultTraits
    .filter(trait => !existingTraitIds.has(trait.id))
    .map(trait => ({
      userId,
      traitId: trait.id,
      unlockSource: 'default',
      coinsPaid: 0,
    }));
  
  if (traitsToGrant.length > 0) {
    await db.insert(userAvatarTraits).values(traitsToGrant);
    console.log(`Granted ${traitsToGrant.length} default traits to user ${userId}.`);
  } else {
    console.log(`User ${userId} already has all default traits.`);
  }
}

export async function seedAllAvatarData(): Promise<void> {
  await seedAvatarZones();
  await seedAvatarTraits();
}
