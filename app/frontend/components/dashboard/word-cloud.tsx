"use client";

import dynamic from "next/dynamic";
import React, { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { i18n } from "@/lib/i18n";

// react-wordcloud uses window; load client-side only
const ReactWordcloud = dynamic(() => import("react-wordcloud"), { ssr: false } as any) as any;

type WordItem = { text: string; value: number };

interface WordCloudProps {
	words: WordItem[];
	isRTL: boolean;
	className?: string;
}

class SafeBoundary extends React.Component<PropsWithChildren<{ fallback: React.ReactNode }>, { hasError: boolean }> {
	constructor(props: any) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() {
		return { hasError: true };
	}
	componentDidCatch() {}
	render() {
		if (this.state.hasError) return this.props.fallback;
		return this.props.children as any;
	}
}

export function WordCloudChart({ words, isRTL, className }: WordCloudProps) {
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
			fontFamily: isRTL ? "IBM Plex Sans Arabic, system-ui, sans-serif" : "Inter, system-ui, sans-serif",
			fontSizes: [14, 56] as [number, number],
			fontStyle: "normal" as const,
			fontWeight: "bold" as const,
			padding: 1,
			rotations: 2,
			rotationAngles: isRTL ? [0, 0] as [number, number] : [0, 0] as [number, number],
			scale: "sqrt" as const,
			spiral: "rectangular" as const,
			transitionDuration: 500,
		};
	}, [isRTL]);

	const callbacks = useMemo(() => ({
		getWordTooltip: (word: any) => `${word.text}: ${word.value}`,
	}), []);

	const sizedWords = useMemo(
		() => (Array.isArray(words) ? words : []).map((w: any) => ({ text: String(w?.text ?? ""), value: Math.max(1, Number(w?.value) || 1) })),
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
		<div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
			{i18n.getMessage("chart_no_data", isRTL)}
		</div>
	);

	return (
		<div className={className} dir={isRTL ? "rtl" : "ltr"} ref={containerRef}>
			{ReactWordcloud ? (
				sizedWords.length > 0 && canRender ? (
					<SafeBoundary fallback={noData}>
						<ReactWordcloud words={sizedWords} options={options} callbacks={callbacks} />
					</SafeBoundary>
				) : (
					noData
				)
			) : (
				<div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
					{i18n.getMessage("chart_loading", isRTL)}
				</div>
			)}
		</div>
	);
}
