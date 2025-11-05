"use client";

import type React from "react";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";

type MainContentWrapperProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
};

export function MainContentWrapper({
  header,
  children,
}: MainContentWrapperProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {header}
      <ThemedScrollbar
        className="scrollbar-autohide main-content-scrollbar flex-1"
        disableTracksWidthCompensation={true}
        noScrollX={true}
        removeTrackXWhenNotUsed={true}
        rtl={false}
        style={{ height: "100%" }}
      >
        {children}
      </ThemedScrollbar>
    </div>
  );
}
