import { CircleAlert } from "lucide-react";
import type React from "react";
import { createPortal } from "react-dom";
import { Z_INDEX } from "@/lib/z-index";

interface TooltipProps {
	content: string;
	x: number;
	y: number;
	visible: boolean;
	fieldLabel?: string;
	message?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
	content,
	x,
	y,
	visible,
	fieldLabel,
	message,
}) => {
	if (!visible || !content) return null;

	return createPortal(
		<div
			style={{
				position: "fixed",
				left: x,
				top: y,
				pointerEvents: "none",
				zIndex: Z_INDEX.GRID_TOOLTIP,
			}}
			className="gdg-tooltip"
		>
			<div
				className="relative max-w-[260px] rounded-md border bg-popover px-3 py-3 text-xs text-popover-foreground shadow-md"
				style={{
					transform: "translate(-50%, calc(-100% - 8px))",
					transformOrigin: "50% 100%",
					animation: "tooltipFadeOnly 150ms ease-out",
				}}
			>
				<div className="flex gap-3">
					<CircleAlert
						className="mt-0.5 shrink-0 opacity-70"
						size={16}
						aria-hidden="true"
					/>
					<div className="space-y-1">
						{fieldLabel && (
							<p className="text-[13px] font-medium">{fieldLabel}</p>
						)}
						<p className="text-muted-foreground text-xs">
							{message ?? content}
						</p>
					</div>
				</div>
				<div className="absolute left-1/2 top-full -translate-x-1/2 -mt-1 h-2 w-2 rotate-45 border-l border-t bg-popover" />
			</div>
		</div>,
		document.body,
	);
};

export default Tooltip;
