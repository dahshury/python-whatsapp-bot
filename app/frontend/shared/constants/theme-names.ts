export const THEME_NAMES = [
  "theme-default",
  "theme-clerk",
  "theme-amethyst-haze",
  "theme-claude",
  "theme-art-deco",
  "theme-neo-brutalism",
  "theme-perpetuity",
  "theme-retro-arcade",
  "theme-soft-pop",
  "theme-ghibli-studio",
  "theme-valorant",
  "theme-t3chat",
  "theme-perplexity",
  "theme-neomorphism",
  "theme-inline",
] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

export const KNOWN_THEMES = new Set<string>(THEME_NAMES);

export const isSupportedThemeName = (
  themeName: string
): themeName is ThemeName => KNOWN_THEMES.has(themeName);
