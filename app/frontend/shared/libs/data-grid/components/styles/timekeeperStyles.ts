import type * as React from "react";

// CSS class names for timekeeper components
export const timekeeperClassNames = {
	wrapper: "timekeeper-cell-wrapper",
	editor: "timekeeper-cell-editor",
	iconButton: "timekeeper-cell-icon-button",
	portal: "timekeeper-portal",
	doneButton: "timekeeper-done-button",
	errorContainer: "timekeeper-error-container",
	retryButton: "timekeeper-retry-button",
	clickOutsideIgnore: "click-outside-ignore",
} as const;

// Legacy support - keeping these for any components that might still use them
// These are now empty or minimal since styles are handled by CSS
export const editorStyle: React.CSSProperties = {};
export const wrapperStyle: React.CSSProperties = {};
export const iconButtonStyle: React.CSSProperties = {};
export const doneButtonStyle: React.CSSProperties = {};
export const errorContainerStyle: React.CSSProperties = {};
export const retryButtonStyle: React.CSSProperties = {};

// Dynamic portal positioning - this still needs to be inline since it's calculated
export const getTimePickerPortalStyle = (_isDarkTheme?: boolean): React.CSSProperties => ({
	// Position will be calculated dynamically, other styles come from CSS
});

// Remove animation injection since it's now in CSS
export const ensureFadeInAnimation = (): void => {
	// Animation is now handled by CSS - no need to inject styles
};
