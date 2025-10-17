export const getCalendarClassNames = (currentView: string) => {
	if (currentView?.includes("timeGrid")) {
		return "week-view-container";
	}
	return "";
};
