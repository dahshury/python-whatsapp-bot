import type { DataEditorRef } from "@glideapps/glide-data-grid";

type Bounds = { x: number; y: number; width: number; height: number };

type HoverArgs = {
  kind: "header" | "cell";
  location?: [number, number];
  bounds?: Bounds;
};

export function createHandleItemHovered(args: {
  setHoverRow: (row: number | undefined) => void;
  dataEditorRef: React.RefObject<DataEditorRef | null>;
  onTooltipHover: (payload: HoverArgs) => void;
}) {
  const { setHoverRow, dataEditorRef, onTooltipHover } = args;
  return (payload: HoverArgs) => {
    if (payload.kind !== "cell") {
      setHoverRow(undefined);
    } else {
      const loc = payload.location;
      if (!loc) {
        return;
      }
      const [, r] = loc;
      setHoverRow(r >= 0 ? r : undefined);
    }
    let bounds = payload.bounds;
    try {
      const loc = payload.location;
      if (!bounds && loc && dataEditorRef.current) {
        const api = dataEditorRef.current as unknown as {
          getBounds?: (
            col: number,
            row: number
          ) => { x: number; y: number; width: number; height: number };
        };
        bounds = api.getBounds ? api.getBounds(loc[0], loc[1]) : undefined;
      }
    } catch {
      /* ignore bounds compute error */
    }
    onTooltipHover({
      kind: payload.kind,
      ...(payload.location && { location: payload.location }),
      ...(bounds && { bounds }),
    });
  };
}
