"use client";

import { Lock } from "lucide-react";
import type { FC } from "react";
import { cn } from "@/shared/libs/utils";
import { Spinner } from "@/shared/ui/spinner";

type DocumentLockOverlayProps = {
  active: boolean;
  loading?: boolean;
  message?: string;
};

export const DocumentLockOverlay: FC<DocumentLockOverlayProps> = ({
  active,
  loading = false,
  message,
}) => {
  let overlayMessage: string;
  if (message === undefined) {
    overlayMessage = loading ? "Loading document…" : "Locked";
  } else {
    overlayMessage = message;
  }
  const IconComponent = loading ? Spinner : Lock;

  return (
    <div
      aria-hidden={!active}
      className={cn(
        "absolute inset-0 z-[4] flex items-center justify-center bg-background/85 backdrop-blur-sm transition-opacity",
        active
          ? "pointer-events-auto opacity-100 duration-100"
          : "pointer-events-none opacity-0 duration-300"
      )}
    >
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-border/40 bg-card/95 px-3 py-2 text-muted-foreground text-sm shadow transition-all",
          active ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        )}
      >
        <IconComponent
          className={cn(
            "size-4 opacity-80",
            loading ? "text-muted-foreground" : ""
          )}
          focusable={false}
        />
        {overlayMessage ? <span>{overlayMessage}</span> : null}
      </div>
    </div>
  );
};
