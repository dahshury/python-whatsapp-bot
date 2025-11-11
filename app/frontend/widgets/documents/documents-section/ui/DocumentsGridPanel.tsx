"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import { FullscreenProvider } from "@/shared/libs/data-grid";

const ClientGrid = dynamic(
  () => import("@/shared/libs/data-grid/components/Grid"),
  { ssr: false }
);

type ClientGridProps = ComponentProps<typeof ClientGrid>;

type DocumentsGridPanelProps = {
  isFullscreen: boolean;
  gridProps: ClientGridProps;
};

export function DocumentsGridPanel({
  isFullscreen,
  gridProps,
}: DocumentsGridPanelProps) {
  return (
    <div
      className={`documents-grid-wrapper overflow-hidden rounded-lg border border-border/50 bg-card/50 ${isFullscreen ? "rounded-none border-0" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "0 0 auto",
        position: "relative",
      }}
    >
      <FullscreenProvider>
        <ClientGrid key="documents-grid" {...gridProps} />
      </FullscreenProvider>
    </div>
  );
}
