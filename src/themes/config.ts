import { ThemeConfig, ThemeId } from './types';

export const THEMES: ThemeConfig[] = [
  {
    id: 'clay',
    name: 'Claymorphism',
    description: 'Soft, puffy, playful. UI elements feel like sculpted clay.',
    descriptionKey: 'theme_clay_desc',
    ownLayout: true,
    swatches: ['#E8E0F0', '#2D2B3D', '#7C6CB0', '#E88FA0'],
    fontUrls: ['https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap'],
  },
  {
    id: 'clarity',
    name: 'Clarity',
    description: 'Swiss precision. Warm, typographic, professional.',
    descriptionKey: 'theme_clarity_desc',
    ownLayout: true,
    swatches: ['#F5F0E8', '#1A1A18', '#C97C2E', '#8A7A6A'],
    fontUrls: ['https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&display=swap'],
  },
  {
    id: 'mountain',
    name: 'Mountain',
    description: 'Earthy terrain. Study as a journey through the landscape.',
    descriptionKey: 'theme_mountain_desc',
    ownLayout: true,
    swatches: ['#E8EEE4', '#2B3428', '#4A5D45', '#B8794F'],
    fontUrls: ['https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500&display=swap'],
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep canopy. Dark, ambient, slow breathing.',
    descriptionKey: 'theme_forest_desc',
    ownLayout: true,
    swatches: ['#0C160B', '#D4E8D0', '#2E6B2F', '#7C5230'],
    fontUrls: ['https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500&display=swap'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep water. Fluid, expansive, unhurried.',
    descriptionKey: 'theme_ocean_desc',
    ownLayout: true,
    swatches: ['#06101E', '#CCE4F5', '#1478A8', '#00B4A8'],
    fontUrls: ['https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap'],
  },
  {
    id: 'night-sky',
    name: 'Night Sky',
    description: 'Astronomical quiet. Constellations form as you focus.',
    descriptionKey: 'theme_nightsky_desc',
    ownLayout: true,
    swatches: ['#06091A', '#D8E4F0', '#5B7DB9', '#E8C54A'],
    fontUrls: ['https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Space+Mono:wght@400&display=swap'],
  },
];

export const THEME_MAP = Object.fromEntries(
  THEMES.map((t) => [t.id, t])
) as Record<ThemeId, ThemeConfig>;

export const DEFAULT_THEME_ID: ThemeId = 'clay';
