export type ThemeId = 'clarity' | 'mountain' | 'forest' | 'ocean' | 'paper' | 'night-sky';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  /** Whether this theme renders its own full-page layout (hides global Sidebar + Navbar) */
  ownLayout: boolean;
  /** Preview swatch colors for the theme picker */
  swatches: string[];
  /** Font import URL(s) to inject */
  fontUrls: string[];
}
