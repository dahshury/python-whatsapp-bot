import type { ThemeOption } from "@features/navigation/types";
import { i18n } from "@shared/libs/i18n";

export const THEME_OPTIONS: ThemeOption[] = [
	{
		value: "theme-default",
		name: "Default",
		nameKey: "theme_name_default",
		colors: {
			primary: "#171717",
			secondary: "#a1a1aa",
		},
	},
	{
		value: "theme-clerk",
		name: "Clerk",
		nameKey: "theme_name_clerk",
		colors: {
			primary: "#5a34d8",
			secondary: "#1ca0b8",
		},
	},
	{
		value: "theme-amethyst-haze",
		name: "Amethyst Haze",
		nameKey: "theme_name_amethyst_haze",
		colors: {
			primary: "#8a79ab",
			secondary: "#e6a5b8",
		},
	},
	{
		value: "theme-claude",
		name: "Claude",
		nameKey: "theme_name_claude",
		colors: {
			primary: "#e4d4b7",
			secondary: "#c67b5c",
		},
	},
	{
		value: "theme-art-deco",
		name: "Art Deco",
		nameKey: "theme_name_art_deco",
		colors: {
			primary: "#d4af37",
			secondary: "#cc7a00",
		},
	},
	{
		value: "theme-neo-brutalism",
		name: "Neo Brutalism",
		nameKey: "theme_name_neo_brutalism",
		colors: {
			primary: "#ff3333",
			secondary: "#ffff00",
		},
		borderStyle: "2px solid #000",
	},
	{
		value: "theme-perpetuity",
		name: "Perpetuity",
		nameKey: "theme_name_perpetuity",
		colors: {
			primary: "#17a2b8",
			secondary: "#5ddcdc",
		},
	},
	{
		value: "theme-retro-arcade",
		name: "Retro Arcade",
		nameKey: "theme_name_retro_arcade",
		colors: {
			primary: "#e649a7",
			secondary: "#43baba",
		},
	},
	{
		value: "theme-soft-pop",
		name: "Soft Pop",
		nameKey: "theme_name_soft_pop",
		colors: {
			primary: "#5a64f0",
			secondary: "#1fbba6",
		},
	},
	{
		value: "theme-ghibli-studio",
		name: "Ghibli Studio",
		nameKey: "theme_name_ghibli_studio",
		colors: {
			primary: "#99b576",
			secondary: "#d4a576",
		},
	},
	{
		value: "theme-valorant",
		name: "Valorant",
		nameKey: "theme_name_valorant",
		colors: {
			primary: "#ff4655",
			secondary: "#ffd700",
		},
		borderStyle: "0px",
	},
	{
		value: "theme-t3chat",
		name: "T3Chat",
		nameKey: "theme_name_t3chat",
		colors: {
			primary: "#b4539a",
			secondary: "#e9b8d6",
		},
	},
	{
		value: "theme-perplexity",
		name: "Perplexity",
		nameKey: "theme_name_perplexity",
		colors: {
			primary: "#4fb3c7",
			secondary: "#2ba3c7",
		},
	},
	{
		value: "theme-neomorphism",
		name: "Neomorphism",
		nameKey: "theme_name_neomorphism",
		colors: {
			primary: "#ff1493",
			secondary: "#cbd5e1",
		},
		borderStyle: "0px",
	},
];

export const getThemeName = (value: string): string => {
	const theme = THEME_OPTIONS.find((t) => t.value === value);
	return theme?.name || "Unknown Theme";
};

export const getThemeNameLocalized = (
	value: string,
	isLocalized: boolean
): string => {
	const theme = THEME_OPTIONS.find((t) => t.value === value);
	if (!theme) {
		return i18n.getMessage("unknown_theme", isLocalized);
	}
	return i18n.getMessage(theme.nameKey, isLocalized) || theme.name;
};
