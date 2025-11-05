"use client";

import type {
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import dynamic from "next/dynamic";
import { memo, useCallback } from "react";

const Excalidraw = dynamic<ExcalidrawProps>(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
  }
);

type BaseDocumentCanvasProps = {
  mountReady: boolean;
  onApiReady: (api: ExcalidrawImperativeAPI) => void;
} & Omit<ExcalidrawProps, "excalidrawAPI">;

function BaseDocumentCanvasComponent(props: BaseDocumentCanvasProps) {
  const { mountReady, onApiReady, ...rest } = props;

  const handleApiReady = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      onApiReady(api);
    },
    [onApiReady]
  );

  if (!mountReady) {
    return null;
  }

  return <Excalidraw {...rest} excalidrawAPI={handleApiReady} />;
}

export const BaseDocumentCanvas = memo(BaseDocumentCanvasComponent);
