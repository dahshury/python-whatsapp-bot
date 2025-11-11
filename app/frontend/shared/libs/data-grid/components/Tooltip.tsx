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
      style={
        {
          "--gdg-tooltip-left": `${x}px`,
          "--gdg-tooltip-top": `${y}px`,
        } as React.CSSProperties
      }
    >
      <div className="gdg-tooltip-content relative max-w-[16.25rem] rounded-md border bg-popover px-3 py-3 text-popover-foreground text-xs shadow-md">
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
