import { db } from '../db';
import { sanctuaryElements, avatarZones, avatarTraits } from '@shared/schema';
import { eq } from 'drizzle-orm';

const RARITY_TIERS = {
  common: { priceMultiplier: 1, color: '#9CA3AF' },
  uncommon: { priceMultiplier: 2, color: '#22C55E' },
  rare: { priceMultiplier: 4, color: '#3B82F6' },
  epic: { priceMultiplier: 8, color: '#A855F7' },
  legendary: { priceMultiplier: 16, color: '#F59E0B' },
  mythic: { priceMultiplier: 32, color: '#EF4444' }
};

const SANCTUARY_ELEMENTS_DATA = [
  { name: 'Baby Oak', type: 'tree', category: 'nature', rarity: 'common', evolutionStage: 1, unlockCost: 50, description: 'A tiny oak seedling starting its journey', animationType: 'sway', assetData: { icon: '🌱', colors: ['#4ADE80', '#22C55E'], size: { width: 40, height: 40 }, layerOrder: 1 } },
  { name: 'Young Birch', type: 'tree', category: 'nature', rarity: 'common', evolutionStage: 1, unlockCost: 75, description: 'A graceful birch sapling with white bark', animationType: 'sway', assetData: { icon: '🌿', colors: ['#F5F5F5', '#86EFAC'], size: { width: 50, height: 60 }, layerOrder: 2 } },
  { name: 'Meadow Daisy', type: 'decoration', category: 'nature', rarity: 'common', evolutionStage: 1, unlockCost: 30, description: 'Cheerful daisies swaying in the breeze', animationType: 'sway', assetData: { icon: '🌼', colors: ['#FBBF24', '#FEF3C7'], size: { width: 30, height: 25 }, layerOrder: 0 } },
  { name: 'Forest Mushroom', type: 'decoration', category: 'nature', rarity: 'common', evolutionStage: 1, unlockCost: 40, description: 'A friendly mushroom cluster', animationType: 'idle', assetData: { icon: '🍄', colors: ['#EF4444', '#FCA5A5'], size: { width: 35, height: 30 }, layerOrder: 0 } },
  { name: 'Busy Bee', type: 'creature', category: 'nature', rarity: 'common', evolutionStage: 1, unlockCost: 60, description: 'A hardworking bee collecting nectar', animationType: 'fly', assetData: { icon: '🐝', colors: ['#FBBF24', '#1F2937'], size: { width: 25, height: 25 }, layerOrder: 5 } },
  { name: 'Blue Butterfly', type: 'creature', category: 'nature', rarity: 'common', evolutionStage: 1, unlockCost: 55, description: 'A delicate blue butterfly', animationType: 'fly', assetData: { icon: '🦋', colors: ['#3B82F6', '#93C5FD'], size: { width: 30, height: 28 }, layerOrder: 5 } },
  { name: 'Garden Snail', type: 'creature', category: 'nature', rarity: 'common', evolutionStage: 1, unlockCost: 45, description: 'A slow but steady friend', animationType: 'walk', assetData: { icon: '🐌', colors: ['#D97706', '#FDE68A'], size: { width: 28, height: 22 }, layerOrder: 1 } },
  { name: 'Pebble Path', type: 'decoration', category: 'nature', rarity: 'common', evolutionStage: 1, unlockCost: 35, description: 'A winding stone path', animationType: 'idle', assetData: { icon: '🪨', colors: ['#6B7280', '#9CA3AF'], size: { width: 60, height: 20 }, layerOrder: 0 } },
  { name: 'Wild Grass', type: 'decoration', category: 'nature', rarity: 'common', evolutionStage: 1, unlockCost: 25, description: 'Tall grass swaying gently', animationType: 'sway', assetData: { icon: '🌾', colors: ['#84CC16', '#BEF264'], size: { width: 40, height: 35 }, layerOrder: 0 } },
  { name: 'Little Pond', type: 'decoration', category: 'nature', rarity: 'common', evolutionStage: 1, unlockCost: 80, description: 'A peaceful mini pond', animationType: 'idle', assetData: { icon: '💧', colors: ['#0EA5E9', '#7DD3FC'], size: { width: 50, height: 40 }, layerOrder: 0 } },

  { name: 'Flowering Cherry', type: 'tree', category: 'nature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 150, description: 'Beautiful pink cherry blossoms', animationType: 'sway', assetData: { icon: '🌸', colors: ['#F472B6', '#FBCFE8'], size: { width: 70, height: 80 }, layerOrder: 3 } },
  { name: 'Maple Tree', type: 'tree', category: 'nature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 180, description: 'A vibrant maple with colorful leaves', animationType: 'sway', assetData: { icon: '🍁', colors: ['#EF4444', '#F97316'], size: { width: 75, height: 85 }, layerOrder: 3 } },
  { name: 'Wise Owl', type: 'creature', category: 'nature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 200, description: 'A wise owl watching over your sanctuary', animationType: 'idle', assetData: { icon: '🦉', colors: ['#78350F', '#D97706'], size: { width: 35, height: 40 }, layerOrder: 4 } },
  { name: 'Playful Squirrel', type: 'creature', category: 'nature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 175, description: 'An energetic squirrel gathering acorns', animationType: 'walk', assetData: { icon: '🐿️', colors: ['#92400E', '#FDE68A'], size: { width: 30, height: 32 }, layerOrder: 2 } },
  { name: 'Rose Bush', type: 'decoration', category: 'nature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 120, description: 'Elegant roses in full bloom', animationType: 'idle', assetData: { icon: '🌹', colors: ['#DC2626', '#22C55E'], size: { width: 45, height: 50 }, layerOrder: 1 } },
  { name: 'Sunflower Field', type: 'decoration', category: 'nature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 140, description: 'Cheerful sunflowers reaching for the sky', animationType: 'sway', assetData: { icon: '🌻', colors: ['#FBBF24', '#84CC16'], size: { width: 55, height: 65 }, layerOrder: 2 } },
  { name: 'Koi Pond', type: 'decoration', category: 'nature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 250, description: 'A serene pond with colorful koi fish', animationType: 'idle', assetData: { icon: '🐟', colors: ['#0EA5E9', '#F97316'], size: { width: 70, height: 50 }, layerOrder: 0 } },
  { name: 'Garden Hedgehog', type: 'creature', category: 'nature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 165, description: 'A cute hedgehog exploring', animationType: 'walk', assetData: { icon: '🦔', colors: ['#78350F', '#FDE68A'], size: { width: 32, height: 28 }, layerOrder: 1 } },
  { name: 'Willow Tree', type: 'tree', category: 'nature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 200, description: 'A graceful weeping willow', animationType: 'sway', assetData: { icon: '🌳', colors: ['#22C55E', '#BBF7D0'], size: { width: 80, height: 90 }, layerOrder: 3 } },
  { name: 'Lavender Patch', type: 'decoration', category: 'nature', rarity: 'uncommon', evolutionStage: 2, unlockCost: 130, description: 'Fragrant lavender flowers', animationType: 'sway', assetData: { icon: '💜', colors: ['#A855F7', '#E9D5FF'], size: { width: 45, height: 40 }, layerOrder: 1 } },

  { name: 'Ancient Oak', type: 'tree', category: 'nature', rarity: 'rare', evolutionStage: 3, unlockCost: 400, description: 'A majestic centuries-old oak', animationType: 'sway', assetData: { icon: '🌳', colors: ['#166534', '#14532D'], size: { width: 100, height: 120 }, layerOrder: 4 } },
  { name: 'Crystal Deer', type: 'creature', category: 'magical', rarity: 'rare', evolutionStage: 3, unlockCost: 500, description: 'A mystical deer with crystalline antlers', animationType: 'walk', assetData: { icon: '🦌', colors: ['#E0F2FE', '#0EA5E9'], size: { width: 50, height: 55 }, layerOrder: 3 } },
  { name: 'Glowing Mushrooms', type: 'decoration', category: 'magical', rarity: 'rare', evolutionStage: 3, unlockCost: 350, description: 'Bioluminescent fungi', animationType: 'glow', assetData: { icon: '✨', colors: ['#22D3EE', '#06B6D4'], size: { width: 40, height: 35 }, layerOrder: 1 } },
  { name: 'Spirit Fox', type: 'creature', category: 'magical', rarity: 'rare', evolutionStage: 3, unlockCost: 550, description: 'A ethereal fox guardian', animationType: 'walk', assetData: { icon: '🦊', colors: ['#F97316', '#F8FAFC'], size: { width: 45, height: 40 }, layerOrder: 3 } },
  { name: 'Rainbow Waterfall', type: 'decoration', category: 'magical', rarity: 'rare', evolutionStage: 3, unlockCost: 600, description: 'A magical waterfall with rainbow mist', animationType: 'idle', assetData: { icon: '🌈', colors: ['#0EA5E9', '#EF4444', '#FBBF24', '#22C55E'], size: { width: 60, height: 80 }, layerOrder: 2 } },
  { name: 'Wisteria Grove', type: 'tree', category: 'nature', rarity: 'rare', evolutionStage: 3, unlockCost: 450, description: 'Cascading purple wisteria flowers', animationType: 'sway', assetData: { icon: '💜', colors: ['#A855F7', '#C084FC'], size: { width: 90, height: 100 }, layerOrder: 4 } },
  { name: 'Fairy Lights', type: 'effect', category: 'magical', rarity: 'rare', evolutionStage: 3, unlockCost: 380, description: 'Twinkling magical lights', animationType: 'glow', assetData: { icon: '✨', colors: ['#FBBF24', '#F8FAFC'], size: { width: 80, height: 60 }, layerOrder: 6 } },
  { name: 'Moon Rabbit', type: 'creature', category: 'magical', rarity: 'rare', evolutionStage: 3, unlockCost: 520, description: 'A gentle rabbit from the moon', animationType: 'walk', assetData: { icon: '🐰', colors: ['#F8FAFC', '#E0E7FF'], size: { width: 35, height: 38 }, layerOrder: 2 } },
  { name: 'Bonsai Master', type: 'tree', category: 'nature', rarity: 'rare', evolutionStage: 3, unlockCost: 480, description: 'A perfectly shaped bonsai tree', animationType: 'idle', assetData: { icon: '🌲', colors: ['#166534', '#78350F'], size: { width: 50, height: 45 }, layerOrder: 2 } },
  { name: 'Crystal Cave', type: 'decoration', category: 'magical', rarity: 'rare', evolutionStage: 3, unlockCost: 650, description: 'A cave filled with glowing crystals', animationType: 'glow', assetData: { icon: '💎', colors: ['#A855F7', '#3B82F6', '#22D3EE'], size: { width: 70, height: 55 }, layerOrder: 1 } },

  { name: 'Phoenix Tree', type: 'tree', category: 'legendary', rarity: 'epic', evolutionStage: 4, unlockCost: 1200, description: 'A tree with leaves of living flame', animationType: 'glow', assetData: { icon: '🔥', colors: ['#F97316', '#EF4444', '#FBBF24'], size: { width: 110, height: 130 }, layerOrder: 5 } },
  { name: 'Aurora Spirit', type: 'creature', category: 'legendary', rarity: 'epic', evolutionStage: 4, unlockCost: 1500, description: 'A being made of northern lights', animationType: 'fly', assetData: { icon: '🌌', colors: ['#22D3EE', '#A855F7', '#22C55E'], size: { width: 60, height: 70 }, layerOrder: 6 } },
  { name: 'Starlight Pool', type: 'decoration', category: 'legendary', rarity: 'epic', evolutionStage: 4, unlockCost: 1100, description: 'A pool reflecting the cosmos', animationType: 'glow', assetData: { icon: '🌟', colors: ['#312E81', '#6366F1', '#F8FAFC'], size: { width: 75, height: 55 }, layerOrder: 0 } },
  { name: 'Guardian Dragon', type: 'creature', category: 'legendary', rarity: 'epic', evolutionStage: 4, unlockCost: 2000, description: 'A majestic dragon protector', animationType: 'fly', assetData: { icon: '🐉', colors: ['#22C55E', '#166534'], size: { width: 80, height: 75 }, layerOrder: 6 } },
  { name: 'Moonstone Arch', type: 'decoration', category: 'legendary', rarity: 'epic', evolutionStage: 4, unlockCost: 1300, description: 'An ancient moonstone gateway', animationType: 'glow', assetData: { icon: '🌙', colors: ['#E0E7FF', '#6366F1'], size: { width: 65, height: 80 }, layerOrder: 3 } },
  { name: 'Cosmic Owl', type: 'creature', category: 'legendary', rarity: 'epic', evolutionStage: 4, unlockCost: 1600, description: 'An owl with galaxy feathers', animationType: 'fly', assetData: { icon: '🦉', colors: ['#312E81', '#A855F7', '#F8FAFC'], size: { width: 45, height: 50 }, layerOrder: 5 } },
  { name: 'Sakura Eternal', type: 'tree', category: 'legendary', rarity: 'epic', evolutionStage: 4, unlockCost: 1400, description: 'A cherry tree that never stops blooming', animationType: 'sway', assetData: { icon: '🌸', colors: ['#F472B6', '#FDF2F8'], size: { width: 100, height: 115 }, layerOrder: 4 } },
  { name: 'Time Crystal', type: 'decoration', category: 'legendary', rarity: 'epic', evolutionStage: 4, unlockCost: 1800, description: 'A crystal that bends time around it', animationType: 'glow', assetData: { icon: '💠', colors: ['#22D3EE', '#0EA5E9', '#312E81'], size: { width: 40, height: 55 }, layerOrder: 2 } },
  { name: 'Dream Weaver', type: 'creature', category: 'legendary', rarity: 'epic', evolutionStage: 4, unlockCost: 1700, description: 'A mystical spider weaving starlight', animationType: 'idle', assetData: { icon: '🕸️', colors: ['#F8FAFC', '#A855F7'], size: { width: 50, height: 45 }, layerOrder: 4 } },
  { name: 'Void Blossom', type: 'tree', category: 'legendary', rarity: 'epic', evolutionStage: 4, unlockCost: 1550, description: 'Flowers that bloom in darkness', animationType: 'glow', assetData: { icon: '🌺', colors: ['#312E81', '#6366F1', '#E0E7FF'], size: { width: 85, height: 95 }, layerOrder: 4 } },

  { name: 'World Tree Yggdrasil', type: 'tree', category: 'mythic', rarity: 'legendary', evolutionStage: 5, unlockCost: 5000, description: 'The legendary tree connecting all realms', animationType: 'glow', assetData: { icon: '🌳', colors: ['#166534', '#FBBF24', '#F8FAFC'], size: { width: 150, height: 180 }, layerOrder: 6 } },
  { name: 'Celestial Phoenix', type: 'creature', category: 'mythic', rarity: 'legendary', evolutionStage: 5, unlockCost: 6000, description: 'An immortal bird of pure light', animationType: 'fly', assetData: { icon: '🔥', colors: ['#FBBF24', '#EF4444', '#F8FAFC'], size: { width: 90, height: 85 }, layerOrder: 7 } },
  { name: 'Nebula Garden', type: 'decoration', category: 'mythic', rarity: 'legendary', evolutionStage: 5, unlockCost: 4500, description: 'A garden made of stardust', animationType: 'glow', assetData: { icon: '🌌', colors: ['#A855F7', '#3B82F6', '#EC4899'], size: { width: 100, height: 80 }, layerOrder: 5 } },
  { name: 'Eternal Kirin', type: 'creature', category: 'mythic', rarity: 'legendary', evolutionStage: 5, unlockCost: 5500, description: 'A divine beast of prosperity', animationType: 'walk', assetData: { icon: '🦄', colors: ['#FBBF24', '#F8FAFC', '#22C55E'], size: { width: 70, height: 80 }, layerOrder: 6 } },
  { name: 'Origin Spring', type: 'decoration', category: 'mythic', rarity: 'legendary', evolutionStage: 5, unlockCost: 4800, description: 'The source of all creation', animationType: 'glow', assetData: { icon: '💫', colors: ['#F8FAFC', '#FBBF24', '#22D3EE'], size: { width: 80, height: 70 }, layerOrder: 4 } },

  { name: 'Void Leviathan', type: 'creature', category: 'cosmic', rarity: 'mythic', evolutionStage: 5, unlockCost: 10000, description: 'A creature from beyond the stars', animationType: 'fly', assetData: { icon: '🐋', colors: ['#312E81', '#6366F1', '#A855F7'], size: { width: 120, height: 100 }, layerOrder: 8 } },
  { name: 'Genesis Bloom', type: 'tree', category: 'cosmic', rarity: 'mythic', evolutionStage: 5, unlockCost: 8000, description: 'The first flower of the universe', animationType: 'glow', assetData: { icon: '🌺', colors: ['#F8FAFC', '#FBBF24', '#A855F7', '#22D3EE'], size: { width: 130, height: 145 }, layerOrder: 7 } },
  { name: 'Infinity Lotus', type: 'decoration', category: 'cosmic', rarity: 'mythic', evolutionStage: 5, unlockCost: 7500, description: 'A lotus blooming for eternity', animationType: 'glow', assetData: { icon: '🪷', colors: ['#EC4899', '#F472B6', '#F8FAFC'], size: { width: 70, height: 60 }, layerOrder: 5 } },
  { name: 'Cosmic Serpent', type: 'creature', category: 'cosmic', rarity: 'mythic', evolutionStage: 5, unlockCost: 9000, description: 'A serpent that encircles worlds', animationType: 'fly', assetData: { icon: '🐍', colors: ['#22C55E', '#FBBF24', '#312E81'], size: { width: 100, height: 90 }, layerOrder: 7 } },
  { name: 'Reality Crystal', type: 'decoration', category: 'cosmic', rarity: 'mythic', evolutionStage: 5, unlockCost: 12000, description: 'A crystal containing infinite realities', animationType: 'glow', assetData: { icon: '💎', colors: ['#F8FAFC', '#A855F7', '#22D3EE', '#F97316'], size: { width: 60, height: 75 }, layerOrder: 6 } },

  { name: 'Autumn Maple', type: 'tree', category: 'seasonal', rarity: 'uncommon', evolutionStage: 2, unlockCost: 200, description: 'A maple tree in fall colors', animationType: 'sway', assetData: { icon: '🍂', colors: ['#F97316', '#EF4444', '#FBBF24'], size: { width: 75, height: 85 }, layerOrder: 3 } },
  { name: 'Winter Pine', type: 'tree', category: 'seasonal', rarity: 'uncommon', evolutionStage: 2, unlockCost: 220, description: 'A snow-covered evergreen', animationType: 'idle', assetData: { icon: '🌲', colors: ['#166534', '#F8FAFC'], size: { width: 65, height: 80 }, layerOrder: 3 } },
  { name: 'Spring Blossoms', type: 'decoration', category: 'seasonal', rarity: 'rare', evolutionStage: 3, unlockCost: 380, description: 'Fresh spring flowers', animationType: 'sway', assetData: { icon: '🌷', colors: ['#F472B6', '#FBBF24', '#A855F7'], size: { width: 50, height: 45 }, layerOrder: 1 } },
  { name: 'Summer Fireflies', type: 'effect', category: 'seasonal', rarity: 'rare', evolutionStage: 3, unlockCost: 420, description: 'Warm summer fireflies', animationType: 'fly', assetData: { icon: '✨', colors: ['#FBBF24', '#84CC16'], size: { width: 70, height: 60 }, layerOrder: 6 } },
  { name: 'Falling Leaves', type: 'effect', category: 'seasonal', rarity: 'uncommon', evolutionStage: 2, unlockCost: 180, description: 'Gently falling autumn leaves', animationType: 'fly', assetData: { icon: '🍁', colors: ['#F97316', '#EF4444'], size: { width: 60, height: 50 }, layerOrder: 5 } },
  { name: 'Snowfall', type: 'effect', category: 'seasonal', rarity: 'rare', evolutionStage: 3, unlockCost: 350, description: 'Peaceful falling snow', animationType: 'fly', assetData: { icon: '❄️', colors: ['#F8FAFC', '#E0F2FE'], size: { width: 80, height: 70 }, layerOrder: 7 } },
];

const AVATAR_ZONES = [
  { key: 'skin_tone', name: 'Skin Tone', layerOrder: 1, description: 'Choose your avatar\'s skin color' },
  { key: 'face_shape', name: 'Face Shape', layerOrder: 2, description: 'Select your face shape' },
  { key: 'eyes', name: 'Eyes', layerOrder: 3, description: 'Choose eye style and color' },
  { key: 'eyebrows', name: 'Eyebrows', layerOrder: 4, description: 'Select eyebrow style' },
  { key: 'nose', name: 'Nose', layerOrder: 5, description: 'Choose nose style' },
  { key: 'mouth', name: 'Mouth', layerOrder: 6, description: 'Select mouth expression' },
  { key: 'hair', name: 'Hair Style', layerOrder: 9, description: 'Choose your hairstyle' },
  { key: 'hair_color', name: 'Hair Color', layerOrder: 10, description: 'Select hair color' },
  { key: 'facial_hair', name: 'Facial Hair', layerOrder: 11, description: 'Add facial hair' },
  { key: 'clothing_top', name: 'Top/Shirt', layerOrder: 14, description: 'Choose your top' },
  { key: 'clothing_bottom', name: 'Bottom/Pants', layerOrder: 15, description: 'Select your bottom' },
  { key: 'shoes', name: 'Shoes', layerOrder: 16, description: 'Choose footwear' },
  { key: 'hat', name: 'Hat/Headwear', layerOrder: 17, description: 'Add a hat or headwear' },
  { key: 'glasses', name: 'Glasses', layerOrder: 13, description: 'Add glasses or eyewear' },
  { key: 'accessory', name: 'Accessory', layerOrder: 18, description: 'Add accessories' },
  { key: 'aura', name: 'Aura Effect', layerOrder: 19, description: 'Special aura effects' },
];

const generateTraitsForZone = (zoneKey: string): Array<{name: string; description: string; rarity: string; coinCost: number}> => {
  const traitsByZone: Record<string, Array<{name: string; description: string; rarity: string; coinCost: number}>> = {
    skin_tone: [
      { name: 'Fair', description: 'Light fair skin tone', rarity: 'common', coinCost: 0 },
      { name: 'Light', description: 'Light warm skin tone', rarity: 'common', coinCost: 0 },
      { name: 'Medium', description: 'Medium natural skin tone', rarity: 'common', coinCost: 0 },
      { name: 'Tan', description: 'Sun-kissed tan', rarity: 'common', coinCost: 0 },
      { name: 'Brown', description: 'Rich brown skin tone', rarity: 'common', coinCost: 0 },
      { name: 'Dark', description: 'Deep dark skin tone', rarity: 'common', coinCost: 0 },
    ],
    eyes: [
      { name: 'Round Eyes', description: 'Classic round eyes', rarity: 'common', coinCost: 0 },
      { name: 'Almond Eyes', description: 'Elegant almond shape', rarity: 'common', coinCost: 0 },
      { name: 'Hooded Eyes', description: 'Mysterious hooded eyes', rarity: 'common', coinCost: 25 },
      { name: 'Cat Eyes', description: 'Sharp cat-like eyes', rarity: 'uncommon', coinCost: 75 },
      { name: 'Starry Eyes', description: 'Eyes that sparkle like stars', rarity: 'rare', coinCost: 200 },
      { name: 'Galaxy Eyes', description: 'Eyes containing galaxies', rarity: 'epic', coinCost: 500 },
      { name: 'Void Eyes', description: 'Eyes of infinite darkness', rarity: 'legendary', coinCost: 1500 },
    ],
    hair: [
      { name: 'Short Classic', description: 'Simple short haircut', rarity: 'common', coinCost: 0 },
      { name: 'Medium Wave', description: 'Medium length wavy hair', rarity: 'common', coinCost: 0 },
      { name: 'Long Straight', description: 'Long flowing straight hair', rarity: 'common', coinCost: 25 },
      { name: 'Curly Bob', description: 'Bouncy curly bob', rarity: 'common', coinCost: 30 },
      { name: 'Pixie Cut', description: 'Stylish pixie cut', rarity: 'uncommon', coinCost: 50 },
      { name: 'Undercut', description: 'Trendy undercut style', rarity: 'uncommon', coinCost: 75 },
      { name: 'Braided Crown', description: 'Elegant braided crown', rarity: 'rare', coinCost: 150 },
      { name: 'Twin Tails', description: 'Cute twin tail style', rarity: 'uncommon', coinCost: 60 },
      { name: 'Messy Bun', description: 'Casual messy bun', rarity: 'common', coinCost: 40 },
      { name: 'Flowing Locks', description: 'Majestic flowing hair', rarity: 'rare', coinCost: 200 },
      { name: 'Starlight Strands', description: 'Hair woven with starlight', rarity: 'epic', coinCost: 600 },
      { name: 'Flame Hair', description: 'Hair made of living fire', rarity: 'legendary', coinCost: 2000 },
      { name: 'Cosmic Nebula', description: 'Hair like a cosmic nebula', rarity: 'mythic', coinCost: 5000 },
    ],
    hair_color: [
      { name: 'Black', description: 'Classic black', rarity: 'common', coinCost: 0 },
      { name: 'Brown', description: 'Natural brown', rarity: 'common', coinCost: 0 },
      { name: 'Blonde', description: 'Golden blonde', rarity: 'common', coinCost: 0 },
      { name: 'Auburn', description: 'Warm auburn', rarity: 'common', coinCost: 20 },
      { name: 'Red', description: 'Vibrant red', rarity: 'uncommon', coinCost: 50 },
      { name: 'White', description: 'Pure white', rarity: 'uncommon', coinCost: 75 },
      { name: 'Pink', description: 'Soft pink', rarity: 'rare', coinCost: 120 },
      { name: 'Blue', description: 'Ocean blue', rarity: 'rare', coinCost: 150 },
      { name: 'Purple', description: 'Royal purple', rarity: 'rare', coinCost: 175 },
      { name: 'Rainbow', description: 'All colors of the rainbow', rarity: 'epic', coinCost: 400 },
      { name: 'Galaxy Gradient', description: 'Colors of the cosmos', rarity: 'legendary', coinCost: 1200 },
    ],
    clothing_top: [
      { name: 'Basic Tee', description: 'Simple t-shirt', rarity: 'common', coinCost: 0 },
      { name: 'Button Down', description: 'Classic button-down shirt', rarity: 'common', coinCost: 25 },
      { name: 'Hoodie', description: 'Comfortable hoodie', rarity: 'common', coinCost: 40 },
      { name: 'Tank Top', description: 'Casual tank top', rarity: 'common', coinCost: 20 },
      { name: 'Sweater', description: 'Cozy knit sweater', rarity: 'common', coinCost: 50 },
      { name: 'Blazer', description: 'Sharp blazer', rarity: 'uncommon', coinCost: 100 },
      { name: 'Leather Jacket', description: 'Cool leather jacket', rarity: 'uncommon', coinCost: 150 },
      { name: 'Kimono', description: 'Traditional kimono', rarity: 'rare', coinCost: 250 },
      { name: 'Royal Robe', description: 'Majestic royal robe', rarity: 'epic', coinCost: 600 },
      { name: 'Warrior Armor', description: 'Battle-ready armor', rarity: 'epic', coinCost: 800 },
      { name: 'Celestial Garb', description: 'Clothes woven from light', rarity: 'legendary', coinCost: 2000 },
      { name: 'Void Cloak', description: 'A cloak of pure darkness', rarity: 'mythic', coinCost: 5000 },
    ],
    clothing_bottom: [
      { name: 'Jeans', description: 'Classic blue jeans', rarity: 'common', coinCost: 0 },
      { name: 'Shorts', description: 'Casual shorts', rarity: 'common', coinCost: 20 },
      { name: 'Skirt', description: 'Simple skirt', rarity: 'common', coinCost: 30 },
      { name: 'Sweatpants', description: 'Comfortable sweats', rarity: 'common', coinCost: 25 },
      { name: 'Dress Pants', description: 'Formal dress pants', rarity: 'uncommon', coinCost: 75 },
      { name: 'Cargo Pants', description: 'Utility cargo pants', rarity: 'uncommon', coinCost: 60 },
      { name: 'Hakama', description: 'Traditional hakama', rarity: 'rare', coinCost: 200 },
      { name: 'Starlight Leggings', description: 'Leggings made of starlight', rarity: 'epic', coinCost: 500 },
    ],
    shoes: [
      { name: 'Sneakers', description: 'Classic sneakers', rarity: 'common', coinCost: 0 },
      { name: 'Sandals', description: 'Casual sandals', rarity: 'common', coinCost: 15 },
      { name: 'Boots', description: 'Sturdy boots', rarity: 'common', coinCost: 40 },
      { name: 'Loafers', description: 'Comfortable loafers', rarity: 'uncommon', coinCost: 60 },
      { name: 'High Heels', description: 'Elegant high heels', rarity: 'uncommon', coinCost: 80 },
      { name: 'Combat Boots', description: 'Heavy combat boots', rarity: 'rare', coinCost: 150 },
      { name: 'Crystal Slippers', description: 'Magical crystal shoes', rarity: 'epic', coinCost: 400 },
      { name: 'Cloud Walkers', description: 'Walk on clouds', rarity: 'legendary', coinCost: 1000 },
    ],
    hat: [
      { name: 'Baseball Cap', description: 'Classic cap', rarity: 'common', coinCost: 25 },
      { name: 'Beanie', description: 'Cozy beanie', rarity: 'common', coinCost: 30 },
      { name: 'Sun Hat', description: 'Wide brim sun hat', rarity: 'common', coinCost: 40 },
      { name: 'Fedora', description: 'Stylish fedora', rarity: 'uncommon', coinCost: 75 },
      { name: 'Crown', description: 'A regal crown', rarity: 'rare', coinCost: 300 },
      { name: 'Wizard Hat', description: 'Magical wizard hat', rarity: 'rare', coinCost: 250 },
      { name: 'Halo', description: 'Angelic halo', rarity: 'epic', coinCost: 700 },
      { name: 'Horns', description: 'Mystical horns', rarity: 'epic', coinCost: 600 },
      { name: 'Celestial Crown', description: 'Crown of stars', rarity: 'legendary', coinCost: 1500 },
      { name: 'Void Crown', description: 'Crown of darkness', rarity: 'mythic', coinCost: 4000 },
    ],
    glasses: [
      { name: 'Reading Glasses', description: 'Simple reading glasses', rarity: 'common', coinCost: 20 },
      { name: 'Sunglasses', description: 'Cool shades', rarity: 'common', coinCost: 35 },
      { name: 'Round Frames', description: 'Vintage round frames', rarity: 'uncommon', coinCost: 50 },
      { name: 'Cat Eye Glasses', description: 'Stylish cat eye', rarity: 'uncommon', coinCost: 65 },
      { name: 'Monocle', description: 'Distinguished monocle', rarity: 'rare', coinCost: 150 },
      { name: 'VR Visor', description: 'Futuristic VR visor', rarity: 'epic', coinCost: 400 },
      { name: 'Third Eye', description: 'Mystical third eye', rarity: 'legendary', coinCost: 1000 },
    ],
    accessory: [
      { name: 'Simple Necklace', description: 'Delicate chain necklace', rarity: 'common', coinCost: 30 },
      { name: 'Watch', description: 'Classic wristwatch', rarity: 'common', coinCost: 45 },
      { name: 'Earrings', description: 'Subtle earrings', rarity: 'common', coinCost: 35 },
      { name: 'Scarf', description: 'Stylish scarf', rarity: 'uncommon', coinCost: 60 },
      { name: 'Pendant', description: 'Ornate pendant', rarity: 'uncommon', coinCost: 85 },
      { name: 'Wings', description: 'Beautiful wings', rarity: 'rare', coinCost: 300 },
      { name: 'Floating Crystals', description: 'Orbiting crystals', rarity: 'epic', coinCost: 500 },
      { name: 'Spirit Companion', description: 'A spirit follows you', rarity: 'legendary', coinCost: 1200 },
      { name: 'Cosmic Butterfly', description: 'A butterfly of pure light', rarity: 'mythic', coinCost: 3500 },
    ],
    aura: [
      { name: 'Gentle Glow', description: 'Soft ambient glow', rarity: 'uncommon', coinCost: 100 },
      { name: 'Sparkle Trail', description: 'Sparkling particles', rarity: 'rare', coinCost: 250 },
      { name: 'Flame Aura', description: 'Burning flame effect', rarity: 'epic', coinCost: 600 },
      { name: 'Ice Aura', description: 'Frozen crystal effect', rarity: 'epic', coinCost: 600 },
      { name: 'Electric Aura', description: 'Lightning crackling', rarity: 'epic', coinCost: 650 },
      { name: 'Galaxy Aura', description: 'Swirling galaxies', rarity: 'legendary', coinCost: 1500 },
      { name: 'Void Aura', description: 'Reality bends around you', rarity: 'mythic', coinCost: 4000 },
      { name: 'Rainbow Aura', description: 'All colors flowing', rarity: 'legendary', coinCost: 1800 },
    ],
    face_shape: [
      { name: 'Oval', description: 'Classic oval shape', rarity: 'common', coinCost: 0 },
      { name: 'Round', description: 'Soft round shape', rarity: 'common', coinCost: 0 },
      { name: 'Square', description: 'Strong square jaw', rarity: 'common', coinCost: 0 },
      { name: 'Heart', description: 'Heart-shaped face', rarity: 'common', coinCost: 0 },
    ],
    eyebrows: [
      { name: 'Natural', description: 'Natural eyebrows', rarity: 'common', coinCost: 0 },
      { name: 'Thick', description: 'Bold thick brows', rarity: 'common', coinCost: 15 },
      { name: 'Arched', description: 'Elegantly arched', rarity: 'common', coinCost: 20 },
      { name: 'Straight', description: 'Straight across', rarity: 'common', coinCost: 15 },
    ],
    nose: [
      { name: 'Button', description: 'Cute button nose', rarity: 'common', coinCost: 0 },
      { name: 'Straight', description: 'Classic straight nose', rarity: 'common', coinCost: 0 },
      { name: 'Pointed', description: 'Delicate pointed nose', rarity: 'common', coinCost: 0 },
    ],
    mouth: [
      { name: 'Smile', description: 'Friendly smile', rarity: 'common', coinCost: 0 },
      { name: 'Neutral', description: 'Calm neutral', rarity: 'common', coinCost: 0 },
      { name: 'Smirk', description: 'Confident smirk', rarity: 'common', coinCost: 20 },
      { name: 'Grin', description: 'Wide happy grin', rarity: 'uncommon', coinCost: 40 },
    ],
    facial_hair: [
      { name: 'Clean Shaven', description: 'No facial hair', rarity: 'common', coinCost: 0 },
      { name: 'Stubble', description: 'Light stubble', rarity: 'common', coinCost: 15 },
      { name: 'Goatee', description: 'Classic goatee', rarity: 'common', coinCost: 25 },
      { name: 'Full Beard', description: 'Full beard', rarity: 'uncommon', coinCost: 50 },
      { name: 'Mustache', description: 'Distinguished mustache', rarity: 'uncommon', coinCost: 40 },
    ],
  };

  return traitsByZone[zoneKey] || [];
};

export async function seedShopItems() {
  console.log('Seeding sanctuary elements...');
  
  for (const element of SANCTUARY_ELEMENTS_DATA) {
    try {
      await db.insert(sanctuaryElements).values({
        name: element.name,
        type: element.type,
        category: element.category,
        rarity: element.rarity,
        evolutionStage: element.evolutionStage,
        unlockCost: element.unlockCost,
        description: element.description,
        animationType: element.animationType,
        assetData: element.assetData,
        isActive: true,
      }).onConflictDoNothing();
    } catch (e) {
      console.log(`Skipping duplicate: ${element.name}`);
    }
  }
  
  console.log(`Seeded ${SANCTUARY_ELEMENTS_DATA.length} sanctuary elements`);
  return { sanctuaryCount: SANCTUARY_ELEMENTS_DATA.length };
}

export async function seedAvatarItems() {
  console.log('Seeding avatar zones and traits...');
  
  const zoneIdMap: Record<string, string> = {};
  let traitCount = 0;
  
  for (const zone of AVATAR_ZONES) {
    try {
      const [inserted] = await db.insert(avatarZones).values({
        key: zone.key,
        name: zone.name,
        layerOrder: zone.layerOrder,
        description: zone.description,
      }).onConflictDoNothing().returning();
      
      if (inserted) {
        zoneIdMap[zone.key] = inserted.id;
      } else {
        const [existing] = await db.select().from(avatarZones).where(eq(avatarZones.key, zone.key));
        if (existing) zoneIdMap[zone.key] = existing.id;
      }
    } catch (e) {
      console.log(`Zone exists: ${zone.key}`);
    }
  }
  
  for (const zoneKey of Object.keys(zoneIdMap)) {
    const traits = generateTraitsForZone(zoneKey);
    const zoneId = zoneIdMap[zoneKey];
    
    for (const trait of traits) {
      try {
        await db.insert(avatarTraits).values({
          zoneId,
          name: trait.name,
          description: trait.description,
          rarity: trait.rarity,
          coinCost: trait.coinCost,
          isDefault: trait.coinCost === 0,
          isActive: true,
        }).onConflictDoNothing();
        traitCount++;
      } catch (e) {
        console.log(`Skipping duplicate trait: ${trait.name}`);
      }
    }
  }
  
  console.log(`Seeded ${AVATAR_ZONES.length} zones and ${traitCount} traits`);
  return { zonesCount: AVATAR_ZONES.length, traitsCount: traitCount };
}

export async function seedAllShopData() {
  const sanctuary = await seedShopItems();
  const avatar = await seedAvatarItems();
  
  return {
    message: 'Shop data seeded successfully',
    sanctuary,
    avatar,
    total: sanctuary.sanctuaryCount + avatar.traitsCount
  };
}
