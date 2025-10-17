import type { ToolOptionItem } from "@widgets/document-canvas/types";
import { Brush, Eraser, Scissors, SwatchBook } from "lucide-react";

export const CANVAS_TOOL_ITEMS: ToolOptionItem[] = [
	{ value: "1", label: "Palette", Icon: SwatchBook },
	{ value: "2", label: "Brush", Icon: Brush },
	{ value: "3", label: "Eraser", Icon: Eraser },
	{ value: "4", label: "Cut", Icon: Scissors },
];
