import type { ScrollbarProps } from "react-scrollbars-custom";
import type { ScrollbarVariant, ScrollbarVariantOptions } from "./types";

type VariantConfig = {
	classes: string[];
	props: Partial<ScrollbarProps>;
};

const VARIANT_CONFIGS: Record<ScrollbarVariant, VariantConfig> = {
	default: {
		classes: [],
		props: {},
	},
	thin: {
		classes: ["scrollbar-thin"],
		props: {},
	},
	minimal: {
		classes: ["scrollbar-minimal"],
		props: {},
	},
	macos: {
		classes: ["scrollbar-macos", "scrollbar-autohide"],
		props: { disableTracksWidthCompensation: true },
	},
	autohide: {
		classes: ["scrollbar-autohide"],
		props: {},
	},
	permanent: {
		classes: ["scrollbar-permanent"],
		props: { permanentTracks: true },
	},
};

export function getVariantConfig(variant: ScrollbarVariant): VariantConfig {
	return VARIANT_CONFIGS[variant];
}

export function mergeOptionOverrides(
	baseConfig: VariantConfig,
	options: ScrollbarVariantOptions
): VariantConfig {
	const { autoHide, thin, permanent, minimal, macos } = options;
	const classes = [...baseConfig.classes];
	const props = { ...baseConfig.props };

	if (autoHide && !classes.includes("scrollbar-autohide")) {
		classes.push("scrollbar-autohide");
	}

	if (thin && !classes.includes("scrollbar-thin")) {
		classes.push("scrollbar-thin");
	}

	if (permanent) {
		classes.push("scrollbar-permanent");
		props.permanentTracks = true;
	}

	if (minimal && !classes.includes("scrollbar-minimal")) {
		classes.push("scrollbar-minimal");
	}

	if (macos) {
		if (!classes.includes("scrollbar-macos")) {
			classes.push("scrollbar-macos");
		}
		if (!classes.includes("scrollbar-autohide")) {
			classes.push("scrollbar-autohide");
		}
		props.disableTracksWidthCompensation = true;
	}

	return { classes, props };
}
