"use client";

import dynamic from "next/dynamic";
import React, {
	type PropsWithChildren,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { i18n } from "@/lib/i18n";

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

interface WordCloudProps {
	words: WordItem[];
	isLocalized: boolean;
	className?: string;
}

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
	componentDidCatch() {}
	render() {
		if (this.state.hasError) return this.props.fallback;
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
			fontSizes: [14, 56] as [number, number],
			fontStyle: "normal" as const,
			fontWeight: "bold" as const,
			padding: 1,
			rotations: 2,
			rotationAngles: isLocalized
				? ([0, 0] as [number, number])
				: ([0, 0] as [number, number]),
			scale: "sqrt" as const,
			spiral: "rectangular" as const,
			transitionDuration: 500,
		};
	}, [isLocalized]);

	const callbacks = useMemo(
		() => ({
			getWordTooltip: (word: WordItem) => `${word.text}: ${word.value}`,
		}),
		[],
	);

	const sizedWords = useMemo(
		() =>
			(Array.isArray(words) ? words : []).map((w: WordItem | undefined) => ({
				text: String(w?.text ?? ""),
				value: Math.max(1, Number(w?.value) || 1),
			})),
		[words],
	);

	// Render only when container has size to avoid internal lib errors
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [canRender, setCanRender] = useState(false);
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
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
		<div className="h-[18.75rem] flex items-center justify-center text-muted-foreground text-sm">
			{i18n.getMessage("chart_no_data", isLocalized)}
		</div>
	);

	return (
		<div
			className={className}
			dir={isLocalized ? "rtl" : "ltr"}
			ref={containerRef}
		>
			{ReactWordcloud ? (
				sizedWords.length > 0 && canRender ? (
					<SafeBoundary fallback={noData}>
						<ReactWordcloud
							words={sizedWords}
							options={options}
							callbacks={callbacks}
						/>
					</SafeBoundary>
				) : (
					noData
				)
			) : (
				<div className="h-[18.75rem] flex items-center justify-center text-muted-foreground text-sm">
					{i18n.getMessage("chart_loading", isLocalized)}
				</div>
			)}
		</div>
	);
}
