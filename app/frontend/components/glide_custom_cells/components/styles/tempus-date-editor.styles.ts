import type * as React from "react";

export const editorStyle: React.CSSProperties = {
	width: "100%",
	height: "100%",
	border: "none",
	outline: "none",
	padding: "8px",
	paddingRight: "36px",
	fontSize: "13px",
	fontFamily: "inherit",
	backgroundColor: "transparent",
	color: "inherit",
};

export const wrapperStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	width: "100%",
	height: "100%",
	position: "relative",
};

export const iconButtonStyle: React.CSSProperties = {
	position: "absolute",
	right: "8px",
	top: "50%",
	transform: "translateY(-50%)",
	background: "none",
	border: "none",
	cursor: "pointer",
	padding: "4px",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	color: "inherit",
	opacity: 0.7,
	transition: "opacity 0.2s",
	width: "24px",
	height: "24px",
	borderRadius: "4px",
};

export const hideNativeDatePickerCSS = `
  /* Chrome, Safari, Edge, Opera */
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator,
  input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    display: none;
    -webkit-appearance: none;
  }
  
  /* Firefox */
  input[type="date"]::-moz-calendar-picker-indicator,
  input[type="time"]::-moz-calendar-picker-indicator,
  input[type="datetime-local"]::-moz-calendar-picker-indicator {
    display: none;
  }
  
  /* Remove the clear button in Edge */
  input[type="date"]::-ms-clear,
  input[type="time"]::-ms-clear,
  input[type="datetime-local"]::-ms-clear {
    display: none;
  }
`;
