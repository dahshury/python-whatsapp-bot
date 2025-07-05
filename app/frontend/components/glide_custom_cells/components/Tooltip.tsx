import type React from "react";
import { createPortal } from "react-dom";
import { Z_INDEX } from "@/lib/z-index";

interface TooltipProps {
	content: string;
	x: number;
	y: number;
	visible: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({ content, x, y, visible }) => {
	if (!visible || !content) return null;

	// Get theme colors from CSS variables
	const isDarkMode = document.documentElement.classList.contains("dark");

	// Adjust position to prevent tooltip from going off-screen
	const adjustedX = Math.min(x - 50, window.innerWidth - 200); // Center the tooltip
	const adjustedY = Math.max(y - 35, 10); // Position above the cell

	return createPortal(
		<div
			style={{
				position: "fixed",
				left: adjustedX,
				top: adjustedY,
				pointerEvents: "none",
				zIndex: Z_INDEX.TOOLTIP,
				maxWidth: "200px",
				wordWrap: "break-word",
				animation: "tooltipFadeIn 150ms ease-out",
			}}
			className="gdg-tooltip"
		>
			<div
				style={{
					backgroundColor: isDarkMode
						? "hsl(var(--popover))"
						: "hsl(var(--popover))",
					color: "hsl(var(--popover-foreground))",
					border: "1px solid hsl(var(--border))",
					borderRadius: "var(--radius)",
					padding: "6px 10px",
					fontSize: "12px",
					fontFamily: "var(--font-sans)",
					boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
					backdropFilter: "blur(8px)",
				}}
			>
				{content}
			</div>
			{/* Arrow pointing down */}
			<div
				style={{
					position: "absolute",
					bottom: "-5px",
					left: "50%",
					transform: "translateX(-50%)",
					width: 0,
					height: 0,
					borderLeft: "5px solid transparent",
					borderRight: "5px solid transparent",
					borderTop: "5px solid hsl(var(--border))",
				}}
			/>
			<div
				style={{
					position: "absolute",
					bottom: "-4px",
					left: "50%",
					transform: "translateX(-50%)",
					width: 0,
					height: 0,
					borderLeft: "5px solid transparent",
					borderRight: "5px solid transparent",
					borderTop: isDarkMode
						? "5px solid hsl(var(--popover))"
						: "5px solid hsl(var(--popover))",
				}}
			/>
		</div>,
		document.body,
	);
};

export default Tooltip;
