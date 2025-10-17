type EditorOptions = {
	start: string;
	end?: string;
};

export type CallbackFactoryInput = {
	isLocalized: boolean;
	currentView: string;
	isVacationDate: (d: string) => boolean;
	openEditor: (opts?: EditorOptions) => void;
	handleOpenConversation: (id: string) => void;
	handleEventChange: (
		info: import("@fullcalendar/core").EventChangeArg
	) => Promise<void>;
};

export type CallbackHandlers = CallbackFactoryInput;

export function createCallbackHandlers(
	input: CallbackFactoryInput
): CallbackHandlers {
	return input;
}
