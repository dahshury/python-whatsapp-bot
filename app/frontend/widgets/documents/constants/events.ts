export const DOC_EVENTS = {
	UserSelect: "doc:user-select",
	CustomerLoaded: "doc:customer-loaded",
	Persist: "doc:persist",
} as const;

export type DocEventName = (typeof DOC_EVENTS)[keyof typeof DOC_EVENTS];
