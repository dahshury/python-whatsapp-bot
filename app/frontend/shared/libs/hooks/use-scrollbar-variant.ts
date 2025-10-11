import { useMemo } from "react";
import type { ScrollbarProps } from "react-scrollbars-custom";

export type ScrollbarVariant = "default" | "thin" | "minimal" | "macos" | "autohide" | "permanent";

interface ScrollbarVariantOptions {
	variant?: ScrollbarVariant;
	autoHide?: boolean;
	thin?: boolean;
	permanent?: boolean;
	minimal?: boolean;
	macos?: boolean;
}

export function useScrollbarVariant(options: ScrollbarVariantOptions = {}): {
	className: string;
	props: Partial<ScrollbarProps>;
} {
	const { variant = "default", autoHide, thin, permanent, minimal, macos } = options;

	return useMemo(() => {
		const classNames: string[] = [];
		const props: Partial<ScrollbarProps> = {};

		// Handle variant
		switch (variant) {
			case "thin":
				classNames.push("scrollbar-thin");
				break;
			case "minimal":
				classNames.push("scrollbar-minimal");
				break;
			case "macos":
				classNames.push("scrollbar-macos", "scrollbar-autohide");
				props.disableTracksWidthCompensation = true;
				break;
			case "autohide":
				classNames.push("scrollbar-autohide");
				break;
			case "permanent":
				classNames.push("scrollbar-permanent");
				props.permanentTracks = true;
				break;
		}

		// Handle individual options (override variant if specified)
		if (autoHide !== undefined && autoHide) {
			classNames.push("scrollbar-autohide");
		}
		if (thin !== undefined && thin) {
			classNames.push("scrollbar-thin");
		}
		if (permanent !== undefined && permanent) {
			classNames.push("scrollbar-permanent");
			props.permanentTracks = true;
		}
		if (minimal !== undefined && minimal) {
			classNames.push("scrollbar-minimal");
		}
		if (macos !== undefined && macos) {
			classNames.push("scrollbar-macos");
			if (!classNames.includes("scrollbar-autohide")) {
				classNames.push("scrollbar-autohide");
			}
			props.disableTracksWidthCompensation = true;
		}

		return {
			className: classNames.join(" "),
			props,
		};
	}, [variant, autoHide, thin, permanent, minimal, macos]);
}
