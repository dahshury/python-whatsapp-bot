import ReactDOM from "react-dom";
import { GridToolbar } from "./grid-toolbar";

type GridToolbarPortalProps = {
	container: Element | DocumentFragment | null;
	isFocused: boolean;
	hasSelection: boolean;
	canUndo: boolean;
	canRedo: boolean;
	hasHiddenColumns: boolean;
	onClearSelection: () => void;
	onDeleteRows: () => void;
	onUndo: () => void;
	onRedo: () => void;
	onAddRow: () => void;
	onToggleColumnVisibility: () => void;
	onDownloadCsv: () => void;
	onToggleSearch: () => void;
	onToggleFullscreen: () => void;
	overlay?: boolean;
	overlayPosition?: { top: number; left: number } | null;
};

export const GridToolbarPortal: React.FC<GridToolbarPortalProps> = ({
	container,
	...props
}) => {
	if (!container) {
		return null;
	}
	return ReactDOM.createPortal(<GridToolbar {...props} />, container);
};
