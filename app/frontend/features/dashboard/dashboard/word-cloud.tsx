"use client";

import dynamic from "next/dynamic";
import React, {
	type PropsWithChildren,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { i18n } from "@/shared/libs/i18n";

// Word cloud configuration constants
const WORDCLOUD_MIN_FONT_SIZE = 14;
const WORDCLOUD_MAX_FONT_SIZE = 56;
const WORDCLOUD_PADDING = 1;
const WORDCLOUD_ROTATIONS = 2;
const WORDCLOUD_TRANSITION_MS = 500;

// react-wordcloud uses window; load client-side only
const ReactWordcloud = dynamic(() => import("react-wordcloud"), {
	ssr: false,
}) as React.ComponentType<{
	words: WordItem[];
	callbacks?: Record<string, unknown>;
	size?: [number, number];
	options?: Record<string, unknown>;
}>;

type WordItem = { text: string; value: number };

type WordCloudProps = {
	words: WordItem[];
	isLocalized: boolean;
	className?: string;
};

class SafeBoundary extends React.Component<
	PropsWithChildren<{ fallback: React.ReactNode }>,
	{ hasError: boolean }
> {
	constructor(props: PropsWithChildren<{ fallback: React.ReactNode }>) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() {
		return { hasError: true };
	}
	componentDidCatch() {
		// Error logging can be added here if needed
	}
	render() {
		if (this.state.hasError) {
			return this.props.fallback;
		}
		return this.props.children;
	}
}

export function WordCloudChart({
	words,
	isLocalized,
	className,
}: WordCloudProps) {
	const options = useMemo(() => {
		const computed = getComputedStyle(document.documentElement);
		const fg = `hsl(${computed.getPropertyValue("--foreground")})`;
		const c1 = `hsl(${computed.getPropertyValue("--chart-1")})`;
		const c2 = `hsl(${computed.getPropertyValue("--chart-2")})`;
		const c3 = `hsl(${computed.getPropertyValue("--chart-3")})`;
		const c4 = `hsl(${computed.getPropertyValue("--chart-4")})`;
		const c5 = `hsl(${computed.getPropertyValue("--chart-5")})`;
		return {
			colors: [c1, c2, c3, c4, c5, fg],
			fontFamily: isLocalized
				? "IBM Plex Sans Arabic, system-ui, sans-serif"
				: "Inter, system-ui, sans-serif",
			fontSizes: [WORDCLOUD_MIN_FONT_SIZE, WORDCLOUD_MAX_FONT_SIZE] as [
				number,
				number,
			],
			fontStyle: "normal" as const,
			fontWeight: "bold" as const,
			padding: WORDCLOUD_PADDING,
			rotations: WORDCLOUD_ROTATIONS,
			rotationAngles: isLocalized
				? ([0, 0] as [number, number])
				: ([0, 0] as [number, number]),
			scale: "sqrt" as const,
			spiral: "rectangular" as const,
			transitionDuration: WORDCLOUD_TRANSITION_MS,
		};
	}, [isLocalized]);

	const callbacks = useMemo(
		() => ({
			getWordTooltip: (word: WordItem) => `${word.text}: ${word.value}`,
		}),
		[]
	);

	const sizedWords = useMemo(
		() =>
			(Array.isArray(words) ? words : []).map((w: WordItem | undefined) => ({
				text: String(w?.text ?? ""),
				value: Math.max(1, Number(w?.value) || 1),
			})),
		[words]
	);

	// Render only when container has size to avoid internal lib errors
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [canRender, setCanRender] = useState(false);
	useEffect(() => {
		const el = containerRef.current;
		if (!el) {
			return;
		}
		const update = () => {
			const rect = el.getBoundingClientRect();
			setCanRender(rect.width > 10 && rect.height > 10);
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const noData = (
		<div className="flex h-[18.75rem] items-center justify-center text-muted-foreground text-sm">
			{i18n.getMessage("chart_no_data", isLocalized)}
		</div>
	);

	return (
		<div className={className} ref={containerRef}>
			{ReactWordcloud ? (
				sizedWords.length > 0 && canRender ? (
					<SafeBoundary fallback={noData}>
						<ReactWordcloud
							callbacks={callbacks}
							options={options}
							words={sizedWords}
						/>
					</SafeBoundary>
				) : (
					noData
				)
			) : (
				<div className="flex h-[18.75rem] items-center justify-center text-muted-foreground text-sm">
					{i18n.getMessage("chart_loading", isLocalized)}
				</div>
			)}
		</div>
	);
}
