// Re-export from the scrollbar module for backward compatibility
export type {
	ScrollbarVariant,
	ScrollbarVariantOptions,
	ScrollbarVariantResult,
} from "../scrollbar/types";
// biome-ignore lint/performance/noBarrelFile: Backward compatibility re-export
export { useScrollbarVariant } from "../scrollbar/use-scrollbar-variant";
