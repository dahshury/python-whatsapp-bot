import { useTheme } from "next-themes";
import React from "react";
import { createPortal } from "react-dom";
import { Z_INDEX } from "@/lib/z-index";
import { useFullscreen } from "../contexts/FullscreenContext";

interface FullscreenWrapperProps {
	theme: Record<string, unknown>;
	darkTheme: Record<string, unknown>;
	children: React.ReactNode;
}

export const FullscreenWrapper: React.FC<FullscreenWrapperProps> = ({
	theme,
	darkTheme,
	children,
}) => {
	const { isFullscreen } = useFullscreen();
	const [mounted, setMounted] = React.useState(false);
	const [portalContainer, setPortalContainer] =
		React.useState<HTMLElement | null>(null);
	const { theme: appTheme } = useTheme();

	// Handle SSR - wait for client mount
	React.useEffect(() => {
		setMounted(true);
	}, []);

	// Determine if we're in dark mode - prioritize next-themes over internal theme
	const isDark = mounted ? appTheme === "dark" : theme === darkTheme;

	React.useEffect(() => {
		if (isFullscreen && mounted) {
			// Create a dedicated portal container
			const container = document.createElement("div");
			container.id = "grid-fullscreen-portal";
			container.style.position = "fixed";
			container.style.top = "0";
			container.style.left = "0";
			container.style.right = "0";
			container.style.bottom = "0";
			container.style.width = "100vw";
			container.style.height = "100vh";
			container.style.zIndex = (
				Number((Z_INDEX as Record<string, number>).GRID_FULLSCREEN_BACKDROP) ||
				Number((Z_INDEX as Record<string, number>).FULLSCREEN_BACKDROP)
			).toString();
			container.style.pointerEvents = "auto";

			// Copy theme classes
			if (document.documentElement.classList.contains("dark")) {
				container.classList.add("dark");
			}

			document.body.appendChild(container);
			setPortalContainer(container);

			// Add a class to body to hide scrollbars
			document.body.classList.add("grid-fullscreen-active");

			return () => {
				document.body.removeChild(container);
				document.body.classList.remove("grid-fullscreen-active");
				setPortalContainer(null);
			};
		}
		return undefined;
	}, [isFullscreen, mounted]);

	if (!isFullscreen) {
		return <>{children}</>;
	}

	const wrapperStyle: React.CSSProperties = {
		position: "fixed",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: "100vw",
		height: "100vh",
		backgroundColor: isDark ? "rgb(0 0 0 / 0.95)" : "rgb(255 255 255 / 0.95)",
		backdropFilter: "blur(10px)",
		display: "flex",
		flexDirection: "column",
		zIndex:
			Number((Z_INDEX as Record<string, number>).GRID_FULLSCREEN_BACKDROP) ||
			Number((Z_INDEX as Record<string, number>).FULLSCREEN_BACKDROP),
	};

	const contentStyle: React.CSSProperties = {
		width: "100%",
		height: "100%",
		display: "flex",
		flexDirection: "column",
		overflow: "auto", // Allow scrolling when content is larger than viewport
		flex: 1,
	};

	const gridContainerStyle: React.CSSProperties = {
		width: "100%",
		height: "100%",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "flex-start",
		paddingTop: "60px", // Space for toolbar
		paddingLeft: "20px",
		paddingRight: "20px",
		paddingBottom: "40px", // Space for ESC message
		boxSizing: "border-box",
		overflow: "auto", // Allow scrolling if content is larger
	};

	const fullscreenContent = (
		<div
			style={wrapperStyle}
			className={`grid-fullscreen-wrapper ${isDark ? "dark" : ""}`}
		>
			<div
				style={{
					...contentStyle,
					position: "relative",
					zIndex:
						Number(
							(Z_INDEX as Record<string, number>).GRID_FULLSCREEN_CONTENT,
						) || Number((Z_INDEX as Record<string, number>).FULLSCREEN_CONTENT),
				}}
			>
				<div
					style={gridContainerStyle}
					className="glide-grid-fullscreen-container"
				>
					{children}
				</div>
				<div
					style={{
						position: "fixed",
						bottom: "20px",
						right: "20px",
						fontSize: "12px",
						fontFamily: "system-ui, -apple-system, sans-serif",
						zIndex:
							Number(
								(Z_INDEX as Record<string, number>).GRID_FULLSCREEN_CONTENT,
							) ||
							Number((Z_INDEX as Record<string, number>).FULLSCREEN_CONTENT),
					}}
					className="text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-md"
				>
					Press ESC to exit fullscreen
				</div>
			</div>
		</div>
	);

	// Always use portal for fullscreen to ensure it renders at body level
	if (mounted && portalContainer) {
		return createPortal(fullscreenContent, portalContainer);
	}

	// Fallback: render children normally if portal is not ready
	return <>{children}</>;
};
