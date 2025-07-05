export interface PhoneInputEditorProps {
	disablePadding: boolean;
	disableStyling: boolean;
	needsEscapeKey: boolean;
	needsTabKey: boolean;
	portalElement?: HTMLElement;
	customWidth?: number;
	maxWidth?: number;
}

export const PHONE_INPUT_EDITOR_CONFIG: PhoneInputEditorProps = {
	disablePadding: true,
	disableStyling: false,
	needsEscapeKey: true,
	needsTabKey: true,
	customWidth: 200,
	maxWidth: 200,
};
