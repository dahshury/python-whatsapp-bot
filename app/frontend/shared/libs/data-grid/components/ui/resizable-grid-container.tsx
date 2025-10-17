import type { Theme } from "@glideapps/glide-data-grid";
import { Resizable, type Size as ResizableSize } from "re-resizable";
import type React from "react";
import { buildResizableStyle } from "./grid-styles";

type ResizableGridContainerProps = {
	children: React.ReactNode;
	size: ResizableSize;
	minHeight: number | string;
	maxHeight: number | string | undefined;
	minWidth: number | string;
	maxWidth: number | string | undefined;
	borderWidth: number;
	theme: Theme;
	hideOuterFrame: boolean;
	isFullscreen: boolean;
	onResizeStop: (size: ResizableSize) => void;
};

export const ResizableGridContainer: React.FC<ResizableGridContainerProps> = ({
	children,
	size,
	minHeight,
	maxHeight,
	minWidth,
	maxWidth,
	borderWidth,
	theme,
	hideOuterFrame = false,
	isFullscreen,
	onResizeStop,
}) => (
	<Resizable
		minHeight={minHeight}
		size={size}
		{...(maxHeight !== undefined ? { maxHeight } : {})}
		minWidth={minWidth}
		{...(maxWidth !== undefined ? { maxWidth } : {})}
		enable={{
			top: false,
			right: false,
			bottom: false,
			left: false,
			topRight: false,
			bottomRight: hideOuterFrame ? false : !isFullscreen,
			bottomLeft: false,
			topLeft: false,
		}}
		onResizeStop={(_event, _direction, _ref, _delta) => {
			if (_ref) {
				onResizeStop({
					width: _ref.offsetWidth,
					height: _ref.offsetHeight,
				});
			}
		}}
		style={buildResizableStyle(
			borderWidth,
			theme,
			hideOuterFrame,
			isFullscreen
		)}
	>
		{children}
	</Resizable>
);
