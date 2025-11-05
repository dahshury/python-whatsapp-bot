"use client";

// Excalidraw exports named component `Excalidraw`
// We intentionally keep props as unknown to avoid strict type coupling here
// and forward all props through to the underlying component.
// Consumers can pass supported props such as initialData, onChange, viewModeEnabled, etc.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Excalidraw as ExcalidrawComponent } from "@excalidraw/excalidraw";
import { createElement, type FC } from "react";

// Thin wrapper to provide a default export component for dynamic import convenience
// and to keep our local typing simple.
const ExcalidrawWrapper: FC<Record<string, unknown>> = (props) => {
  // We trust the caller to pass valid Excalidraw props at runtime
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return createElement(
    ExcalidrawComponent as unknown as FC<Record<string, unknown>>,
    props
  );
};

export default ExcalidrawWrapper;
