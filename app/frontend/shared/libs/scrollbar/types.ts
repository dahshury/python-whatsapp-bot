import type { ScrollbarProps } from "react-scrollbars-custom";

export type ScrollbarVariant =
	| "default"
	| "thin"
	| "minimal"
	| "macos"
	| "autohide"
	| "permanent";

export type ScrollbarVariantOptions = {
	variant?: ScrollbarVariant;
	autoHide?: boolean;
	thin?: boolean;
	permanent?: boolean;
	minimal?: boolean;
	macos?: boolean;
};

export type ScrollbarVariantResult = {
	className: string;
	props: Partial<ScrollbarProps>;
};
