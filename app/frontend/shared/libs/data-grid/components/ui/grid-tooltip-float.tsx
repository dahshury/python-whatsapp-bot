import type React from "react";
import Tooltip from "../tooltip";

type GridTooltipFloatProps = {
	content: string;
	x: number;
	y: number;
	visible: boolean;
	fieldLabel?: string;
	message?: string;
};

export const GridTooltipFloat: React.FC<GridTooltipFloatProps> = (props) => (
	<Tooltip {...props} />
);
