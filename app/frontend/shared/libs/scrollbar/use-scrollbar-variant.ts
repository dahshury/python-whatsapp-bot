import { useMemo } from "react";
import type { ScrollbarVariantOptions, ScrollbarVariantResult } from "./types";
import { getVariantConfig, mergeOptionOverrides } from "./variant-config";

export function useScrollbarVariant(
	options: ScrollbarVariantOptions = {}
): ScrollbarVariantResult {
	const variant = options.variant ?? ("default" as const);

	return useMemo(() => {
		const baseConfig = getVariantConfig(variant);
		const config = mergeOptionOverrides(baseConfig, options);

		return {
			className: config.classes.join(" "),
			props: config.props,
		};
	}, [
		variant,
		options.autoHide,
		options.thin,
		options.permanent,
		options.minimal,
		options.macos,
		options,
	]);
}
