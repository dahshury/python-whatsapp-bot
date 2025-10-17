"use client";

import { cn } from "@shared/libs/utils";
import type React from "react";
import { useEffect, useState } from "react";
import { Scrollbar, type ScrollbarProps } from "react-scrollbars-custom";

export type ThemedScrollbarProps = {
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
};

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

	// Extract remaining props from the spread
	const { elementRef, rtl, ...otherProps } = props;
	const disableX = Boolean((otherProps as { noScrollX?: boolean }).noScrollX);

	return (
		<Scrollbar
			className={cn("ScrollbarsCustom-themed", className)}
			disableTracksWidthCompensation={disableTracksWidthCompensation}
			minimalThumbSize={minimalThumbSize}
			mobileNative={mobileNative}
			momentum={momentum}
			noDefaultStyles={noDefaultStyles}
			removeTracksWhenNotUsed={removeTracksWhenNotUsed}
			style={style}
			{...(elementRef && { elementRef })}
			contentProps={{
				className: "ScrollbarsCustom-Content",
				style: { paddingBottom: 0 },
			}}
			scrollerProps={{
				className: "ScrollbarsCustom-Scroller",
				style: disableX
					? ({ overflowX: "hidden", paddingBottom: 0 } as React.CSSProperties)
					: undefined,
			}}
			thumbXProps={{
				className: cn(
					"ScrollbarsCustom-Thumb ScrollbarsCustom-ThumbX",
					thumbClassName
				),
			}}
			thumbYProps={{
				className: cn(
					"ScrollbarsCustom-Thumb ScrollbarsCustom-ThumbY",
					thumbClassName
				),
			}}
			trackXProps={{
				className: cn(
					"ScrollbarsCustom-Track ScrollbarsCustom-TrackX",
					disableX ? "hidden" : undefined,
					trackClassName
				),
				style: disableX
					? ({ display: "none", height: 0 } as React.CSSProperties)
					: undefined,
			}}
			trackYProps={{
				className: cn(
					"ScrollbarsCustom-Track ScrollbarsCustom-TrackY",
					trackClassName
				),
			}}
			wrapperProps={{
				className: "ScrollbarsCustom-Wrapper",
			}}
			{...(rtl !== undefined && { rtl })}
			{...Object.fromEntries(
				Object.entries(otherProps).filter(([_, value]) => value !== undefined)
			)}
		>
			{children}
		</Scrollbar>
	);
};
