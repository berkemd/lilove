export type PreviewZone = 'skin' | 'hair' | 'hair_color' | 'clothing_top';
export type HairStyle = 'Short' | 'Long' | 'Curly' | 'Wavy' | 'Bald';
export type TopStyle = 'T-Shirt' | 'Hoodie';
export interface AvatarPreviewModel {
  skin: string | null;
  hair: HairStyle | null;
  hairColor: string | null;
  top: TopStyle | null;
  shown: { zone: PreviewZone; name: string }[];
  missing: PreviewZone[];
  unsupported: string[];
  empty: boolean;
}

const skinColors: Record<string, string> = {
  Light: '#EBC5A9',
  Fair: '#F6DCCB',
  Medium: '#D3A17D',
  Tan: '#B77C57',
  Dark: '#805039',
  Deep: '#503326',
};
const hairColors: Record<string, string> = {
  Black: '#25272F',
  Brown: '#624432',
  Blonde: '#D9B56B',
  Red: '#A65337',
  Gray: '#92949B',
};
const hairStyles = new Set(['Short', 'Long', 'Curly', 'Wavy', 'Bald']);
const topStyles = new Set(['T-Shirt', 'Hoodie']);
const zones: PreviewZone[] = ['skin', 'hair', 'hair_color', 'clothing_top'];
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const string = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

// Demo IDs are deliberately separate from the server's opaque catalog IDs.
const demoVariants: Record<string, { zone: PreviewZone; name: string; variant: string }> = {
  t_skin_1: { zone: 'skin', name: 'Warm', variant: 'Medium' },
  t_skin_2: { zone: 'skin', name: 'Cool', variant: 'Fair' },
  t_skin_3: { zone: 'skin', name: 'Deep', variant: 'Deep' },
  t_hair_1: { zone: 'hair', name: 'Short', variant: 'Short' },
  t_hair_2: { zone: 'hair', name: 'Waves', variant: 'Wavy' },
  t_clothing_top_1: { zone: 'clothing_top', name: 'Tee', variant: 'T-Shirt' },
};

/** An illustration of explicitly supported selections, never an ownership mutation. */
export function resolveAvatarPreview(
  equipped: readonly unknown[],
  scope: 'account' | 'demo' = 'account'
): AvatarPreviewModel {
  const model: AvatarPreviewModel = {
    skin: null,
    hair: null,
    hairColor: null,
    top: null,
    shown: [],
    missing: [],
    unsupported: [],
    empty: equipped.length === 0,
  };
  const rows = equipped.map(object);
  for (const row of rows) {
    const trait = object(row?.trait);
    const zone = object(row?.zone);
    const name = string(trait?.name) ? trait.name : string(zone?.name) ? zone.name : '—';
    const key = zone?.key;
    const duplicate = rows.filter((other) => other?.zoneId === row?.zoneId).length > 1;
    if (
      !row ||
      !trait ||
      !zone ||
      !string(row.traitId) ||
      !string(row.zoneId) ||
      trait.id !== row.traitId ||
      zone.id !== row.zoneId ||
      trait.zoneId !== row.zoneId ||
      trait.isActive !== true ||
      duplicate ||
      !zones.includes(key as PreviewZone)
    ) {
      model.unsupported.push(name);
      continue;
    }
    const demo = demoVariants[row.traitId];
    const demoMatch =
      scope === 'demo' && demo?.zone === key && demo.name === name && row.zoneId === `z_${key}`;
    const free = trait.coinCost === 0 && trait.isDefault === true && trait.unlockType === 'default';
    const variant = demoMatch ? demo.variant : scope === 'account' && free ? name : '';
    let supported = false;
    if (key === 'skin' && Object.hasOwn(skinColors, variant)) {
      model.skin = skinColors[variant];
      supported = true;
    } else if (key === 'hair' && hairStyles.has(variant)) {
      model.hair = variant as HairStyle;
      supported = true;
    } else if (key === 'hair_color' && Object.hasOwn(hairColors, variant)) {
      model.hairColor = hairColors[variant];
      supported = true;
    } else if (key === 'clothing_top' && topStyles.has(variant)) {
      model.top = variant as TopStyle;
      supported = true;
    }
    if (supported) model.shown.push({ zone: key as PreviewZone, name });
    else model.unsupported.push(name);
  }
  model.missing = zones.filter((zone) => {
    if (zone === 'hair_color') return scope !== 'demo' && model.hair !== 'Bald' && !model.hairColor;
    return !model.shown.some((item) => item.zone === zone);
  });
  return model;
}

const traitLabels = {
  skin: {
    Light: 'avatar_trait_skin_light',
    Fair: 'avatar_trait_skin_fair',
    Medium: 'avatar_trait_skin_medium',
    Tan: 'avatar_trait_skin_tan',
    Dark: 'avatar_trait_skin_dark',
    Deep: 'avatar_trait_skin_deep',
  },
  hair: {
    Short: 'avatar_trait_hair_short',
    Long: 'avatar_trait_hair_long',
    Curly: 'avatar_trait_hair_curly',
    Wavy: 'avatar_trait_hair_wavy',
    Bald: 'avatar_trait_hair_bald',
  },
  hair_color: {
    Black: 'avatar_trait_color_black',
    Brown: 'avatar_trait_color_brown',
    Blonde: 'avatar_trait_color_blonde',
    Red: 'avatar_trait_color_red',
    Gray: 'avatar_trait_color_gray',
  },
  clothing_top: { 'T-Shirt': 'avatar_trait_top_tshirt', Hoodie: 'avatar_trait_top_hoodie' },
} as const;
type TraitLabel = (typeof traitLabels)[keyof typeof traitLabels];
type Values<T> = T extends T ? T[keyof T] : never;
export function avatarTraitLabel(
  zone: string,
  name: string,
  translate: (key: Values<TraitLabel>) => string,
  demo = false
): string {
  if (demo || !Object.hasOwn(traitLabels, zone)) return name;
  const labels = traitLabels[zone as PreviewZone];
  return Object.hasOwn(labels, name) ? translate(labels[name as keyof typeof labels]) : name;
}
