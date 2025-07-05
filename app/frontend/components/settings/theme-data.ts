import type { ThemeOption } from "@/types/navigation";

export const THEME_OPTIONS: ThemeOption[] = [
	{
		value: "theme-default",
		name: "Default",
		nameRTL: "افتراضي",
		colors: {
			primary: "#171717",
			secondary: "#a1a1aa",
		},
	},
	{
		value: "theme-amethyst-haze",
		name: "Amethyst Haze",
		nameRTL: "ضباب الجمشت",
		colors: {
			primary: "#8a79ab",
			secondary: "#e6a5b8",
		},
	},
	{
		value: "theme-claude",
		name: "Claude",
		nameRTL: "كلود",
		colors: {
			primary: "#e4d4b7",
			secondary: "#c67b5c",
		},
	},
	{
		value: "theme-art-deco",
		name: "Art Deco",
		nameRTL: "آرت ديكو",
		colors: {
			primary: "#d4af37",
			secondary: "#cc7a00",
		},
	},
	{
		value: "theme-neo-brutalism",
		name: "Neo Brutalism",
		nameRTL: "الوحشية الجديدة",
		colors: {
			primary: "#ff3333",
			secondary: "#ffff00",
		},
		borderStyle: "2px solid #000",
	},
	{
		value: "theme-perpetuity",
		name: "Perpetuity",
		nameRTL: "الخلود",
		colors: {
			primary: "#17a2b8",
			secondary: "#5ddcdc",
		},
	},
	{
		value: "theme-retro-arcade",
		name: "Retro Arcade",
		nameRTL: "أركيد ريترو",
		colors: {
			primary: "#e649a7",
			secondary: "#43baba",
		},
	},
	{
		value: "theme-starry-night",
		name: "Starry Night",
		nameRTL: "ليلة مليئة بالنجوم",
		colors: {
			primary: "#4775a3",
			secondary: "#e6c962",
		},
	},
	{
		value: "theme-ghibli-studio",
		name: "Ghibli Studio",
		nameRTL: "استوديو جيبلي",
		colors: {
			primary: "#99b576",
			secondary: "#d4a576",
		},
	},
	{
		value: "theme-valorant",
		name: "Valorant",
		nameRTL: "فالورانت",
		colors: {
			primary: "#ff4655",
			secondary: "#ffd700",
		},
		borderStyle: "0px",
	},
	{
		value: "theme-t3chat",
		name: "T3Chat",
		nameRTL: "تي ثري تشات",
		colors: {
			primary: "#b4539a",
			secondary: "#e9b8d6",
		},
	},
	{
		value: "theme-perplexity",
		name: "Perplexity",
		nameRTL: "بيربليكسيتي",
		colors: {
			primary: "#4fb3c7",
			secondary: "#2ba3c7",
		},
	},
];

export const getThemeName = (value: string): string => {
	const theme = THEME_OPTIONS.find((t) => t.value === value);
	return theme?.name || "Unknown Theme";
};
