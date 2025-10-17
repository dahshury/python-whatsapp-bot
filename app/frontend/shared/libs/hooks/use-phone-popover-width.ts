import { useElementSize } from "@shared/libs/hooks/use-element-size";
import type { RefObject } from "react";
import { useLayoutEffect, useRef, useState } from "react";

type VisiblePhone = { name?: string; displayNumber?: string; number: string };

// Constants for width calculation
const SECONDARY_PADDING = 30; // padding added to secondary width
const MAX_WIDTH_PERCENTAGE = 0.9; // 90% of window width

export function usePhonePopoverWidth(params: {
	isOpen: boolean;
	triggerRef: RefObject<HTMLButtonElement | null>;
	visiblePhones: VisiblePhone[];
	maxWidth?: number;
}): number | undefined {
	const { isOpen, visiblePhones, maxWidth = 560 } = params;
	const [dropdownWidth, setDropdownWidth] = useState<number | undefined>();
	const measuredOnceRef = useRef(false);

	const triggerSize = useElementSize(
		params.triggerRef as unknown as RefObject<HTMLElement>
	);

	useLayoutEffect(() => {
		if (!isOpen) {
			measuredOnceRef.current = false; // reset on close for next open cycle
			return;
		}
		if (measuredOnceRef.current) {
			return; // compute once per open cycle
		}
		try {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				return;
			}
			const bodyStyle = getComputedStyle(document.body);
			const fontFamily = bodyStyle.fontFamily || "ui-sans-serif, system-ui";
			const primaryFont = `600 14px ${fontFamily}`;
			const secondaryFont = `400 14px ${fontFamily}`;
			const measure = (text: string, font: string): number => {
				ctx.font = font;
				return Math.ceil(ctx.measureText(text || "").width);
			};
			let maxContent = 0;
			for (const opt of visiblePhones) {
				const primary = opt.name || opt.displayNumber || opt.number;
				const secondary = opt.displayNumber || opt.number;
				const primaryW = measure(primary, primaryFont);
				const secondaryW = measure(secondary, secondaryFont);
				const line = Math.max(primaryW, secondaryW + SECONDARY_PADDING);
				maxContent = Math.max(maxContent, line);
			}
			const H_PADDING = 24;
			const CHECK_ICON = 28;
			const SCROLLBAR = 16;
			const INPUT_PADDING = 20;
			let computed =
				maxContent + H_PADDING + CHECK_ICON + SCROLLBAR + INPUT_PADDING;
			const triggerW = triggerSize?.width || 0;
			computed = Math.max(computed, triggerW);
			const MAX = Math.min(
				Math.floor(window.innerWidth * MAX_WIDTH_PERCENTAGE),
				maxWidth
			);
			computed = Math.min(computed, MAX);
			setDropdownWidth(computed);
			measuredOnceRef.current = true;
		} catch {
			// Silently catch any errors during width calculation
			// This prevents the effect from crashing if DOM measurements fail
		}
	}, [isOpen, visiblePhones, maxWidth, triggerSize?.width]);

	return dropdownWidth;
}
