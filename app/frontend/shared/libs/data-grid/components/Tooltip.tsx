import { Z_INDEX } from "@shared/libs/ui/z-index";
import { CircleAlert } from "lucide-react";
import type React from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  content: string;
  x: number;
  y: number;
  visible: boolean;
  fieldLabel?: string;
  message?: string;
};

const Tooltip: React.FC<TooltipProps> = ({
  content,
  x,
  y,
  visible,
  fieldLabel,
  message,
}) => {
  if (!(visible && content)) {
    return null;
  }

  return createPortal(
    <div
      className="gdg-tooltip"
      style={{
        position: "fixed",
        left: x,
        top: y,
        pointerEvents: "none",
        zIndex: Z_INDEX.GRID_TOOLTIP,
      }}
    >
      <div
        className="relative max-w-[16.25rem] rounded-md border bg-popover px-3 py-3 text-popover-foreground text-xs shadow-md"
        style={{
          transform: "translate(-50%, calc(-100% - 8px))",
          transformOrigin: "50% 100%",
          animation: "tooltipFadeOnly 150ms ease-out",
        }}
      >
        <div className="flex gap-3">
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 shrink-0 opacity-70"
            size={16}
          />
          <div className="space-y-1">
            {fieldLabel && (
              <p className="font-medium text-[0.8125rem]">{fieldLabel}</p>
            )}
            <p className="text-muted-foreground text-xs">
              {message ?? content}
            </p>
          </div>
        </div>
        <div className="-translate-x-1/2 -mt-1 absolute top-full left-1/2 h-2 w-2 rotate-45 border-t border-l bg-popover" />
      </div>
    </div>,
    document.body
  );
};

export default Tooltip;
