"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Scrollbar, type ScrollbarProps } from "react-scrollbars-custom";
import { cn } from "@/lib/utils";

export interface ThemedScrollbarProps {
	className?: string;
	thumbClassName?: string;
	trackClassName?: string;
	children?: React.ReactNode;
	style?: React.CSSProperties;
	elementRef?: ScrollbarProps["elementRef"];
	native?: ScrollbarProps["native"];
	mobileNative?: ScrollbarProps["mobileNative"];
	noDefaultStyles?: ScrollbarProps["noDefaultStyles"];
	noScroll?: ScrollbarProps["noScroll"];
	noScrollX?: ScrollbarProps["noScrollX"];
	noScrollY?: ScrollbarProps["noScrollY"];
	permanentTracks?: ScrollbarProps["permanentTracks"];
	permanentTrackX?: ScrollbarProps["permanentTrackX"];
	permanentTrackY?: ScrollbarProps["permanentTrackY"];
	removeTracksWhenNotUsed?: ScrollbarProps["removeTracksWhenNotUsed"];
	removeTrackXWhenNotUsed?: ScrollbarProps["removeTrackXWhenNotUsed"];
	removeTrackYWhenNotUsed?: ScrollbarProps["removeTrackYWhenNotUsed"];
	disableTracksWidthCompensation?: ScrollbarProps["disableTracksWidthCompensation"];
	disableTrackXWidthCompensation?: ScrollbarProps["disableTrackXWidthCompensation"];
	disableTrackYWidthCompensation?: ScrollbarProps["disableTrackYWidthCompensation"];
	onUpdate?: ScrollbarProps["onUpdate"];
	onScroll?: ScrollbarProps["onScroll"];
	onScrollStart?: ScrollbarProps["onScrollStart"];
	onScrollStop?: ScrollbarProps["onScrollStop"];
	scrollTop?: ScrollbarProps["scrollTop"];
	scrollLeft?: ScrollbarProps["scrollLeft"];
	momentum?: ScrollbarProps["momentum"];
	trackClickBehavior?: ScrollbarProps["trackClickBehavior"];
	minimalThumbSize?: ScrollbarProps["minimalThumbSize"];
	maximalThumbSize?: ScrollbarProps["maximalThumbSize"];
	rtl?: ScrollbarProps["rtl"];
}

export const ThemedScrollbar: React.FC<ThemedScrollbarProps> = ({
	className,
	thumbClassName,
	trackClassName,
	children,
	style,
	noDefaultStyles = true, // Use our own styles
	mobileNative = true, // Use native scrollbars on mobile
	momentum = true, // Enable momentum scrolling on iOS
	minimalThumbSize = 30,
	disableTracksWidthCompensation = true, // We handle spacing in CSS
	removeTracksWhenNotUsed = true, // Remove tracks when not needed
	...props
}) => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// During SSR and initial render, show a simple scrollable div
	// This prevents hydration mismatch
	if (!mounted) {
		return (
			<div className={cn("overflow-auto", className)} style={style}>
				{children}
			</div>
		);
	}

	return (
		<Scrollbar
			style={style}
			className={cn("ScrollbarsCustom-themed", className)}
			noDefaultStyles={noDefaultStyles}
			mobileNative={mobileNative}
			momentum={momentum}
			minimalThumbSize={minimalThumbSize}
			disableTracksWidthCompensation={disableTracksWidthCompensation}
			removeTracksWhenNotUsed={removeTracksWhenNotUsed}
			thumbXProps={{
				className: cn(
					"ScrollbarsCustom-Thumb ScrollbarsCustom-ThumbX",
					thumbClassName,
				),
			}}
			thumbYProps={{
				className: cn(
					"ScrollbarsCustom-Thumb ScrollbarsCustom-ThumbY",
					thumbClassName,
				),
			}}
			trackXProps={{
				className: cn(
					"ScrollbarsCustom-Track ScrollbarsCustom-TrackX",
					trackClassName,
				),
			}}
			trackYProps={{
				className: cn(
					"ScrollbarsCustom-Track ScrollbarsCustom-TrackY",
					trackClassName,
				),
			}}
			wrapperProps={{
				className: "ScrollbarsCustom-Wrapper",
			}}
			contentProps={{
				className: "ScrollbarsCustom-Content",
			}}
			scrollerProps={{
				className: "ScrollbarsCustom-Scroller",
			}}
			{...props}
		>
			{children}
		</Scrollbar>
	);
};
