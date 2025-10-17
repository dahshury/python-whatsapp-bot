export function getGridContainerProps(
	isFullscreen: boolean,
	_fullWidth: boolean,
	className?: string
) {
	const wrapperClass = `glide-grid-wrapper ${
		isFullscreen
			? "glide-grid-wrapper-fullscreen"
			: "glide-grid-wrapper-centered"
	} ${className || ""}`;
	return { wrapperClass };
}
