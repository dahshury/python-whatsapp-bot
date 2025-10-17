export type {
	ScrollbarVariant,
	ScrollbarVariantOptions,
	ScrollbarVariantResult,
} from "./types";
// biome-ignore lint/performance/noBarrelFile: Module public API exports
export { useScrollbarVariant } from "./use-scrollbar-variant";
export { getVariantConfig, mergeOptionOverrides } from "./variant-config";
