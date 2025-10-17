import type { Theme } from "@glideapps/glide-data-grid";
import type React from "react";

export function buildContainerStyle(
	isFullscreen: boolean,
	fullWidth: boolean | undefined
): React.CSSProperties {
	return {
		width: isFullscreen || fullWidth ? "100%" : "fit-content",
		maxWidth: "100%",
		height: "auto",
		position: "relative",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "flex-start",
		margin: "0 auto",
	};
}

export function getContainerClasses(
	isFullscreen: boolean,
	fullWidth: boolean | undefined
): { containerClass: string; fullscreenClass: string } {
	const containerClass = fullWidth
		? "glide-grid-fullwidth glide-grid-inner-full"
		: "";
	const fullscreenClass = isFullscreen ? "glide-grid-fullscreen-editor" : "";
	return { containerClass, fullscreenClass };
}

export function buildResizableStyle(
	borderWidth: number,
	theme: Theme,
	hideOuterFrame: boolean | undefined,
	isFullscreen: boolean
): React.CSSProperties {
	// Calculate border radius based on frame visibility and fullscreen state
	let borderRadius: number | string;
	if (hideOuterFrame) {
		borderRadius = 0;
	} else if (isFullscreen) {
		borderRadius = "calc(var(--radius) + 4px)";
	} else {
		borderRadius = "var(--radius)";
	}

	return {
		border: borderWidth
			? `${borderWidth}px solid ${String((theme as Theme & { borderColor?: string }).borderColor)}`
			: "none",
		borderRadius,
		overflow: "hidden",
		backgroundColor: hideOuterFrame ? "transparent" : (theme as Theme).bgCell,
	};
}
