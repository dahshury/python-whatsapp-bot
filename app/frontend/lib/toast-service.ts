"use client";

import React from "react";
import { toast as sonner } from "sonner";
import { i18n } from "@/lib/i18n";

export type ReservationToastPayload = {
	id?: string | number;
	customer?: string;
	wa_id?: string;
	date?: string;
	time?: string;
	isRTL?: boolean;
};

export type MessageToastPayload = {
	title: string;
	description?: string;
	isRTL?: boolean;
};

// Convert 24-hour "HH:MM" to 12-hour "h:MM AM/PM"; return input if not simple time
function to12HourFormat(time?: string): string {
	try {
		if (!time) return "";
		const trimmed = String(time).trim();
		const m = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
		if (!m) return trimmed;
		let hour = parseInt(m[1] || "0", 10);
		const minutes = m[2];
		const ampm = hour >= 12 ? "PM" : "AM";
		const hour12 = hour % 12 === 0 ? 12 : hour % 12;
		return `${hour12}:${minutes} ${ampm}`;
	} catch {
		return String(time || "");
	}
}

function themed(title: string, subtitle?: string, duration = 3000) {
	sonner.custom(
		() =>
			React.createElement(
				"div",
				{ className: "sonner-description fancy-toast" },
				React.createElement("div", { className: "fancy-toast-bg" }),
				React.createElement(
					"div",
					{ className: "fancy-toast-content" },
					React.createElement("div", { className: "fancy-toast-title" }, title),
					subtitle
						? React.createElement(
								"div",
								{ className: "fancy-toast-sub" },
								subtitle,
							)
						: null,
				),
			),
		{ duration },
	);
}

function themedError(title: string, subtitle?: string, duration = 5000) {
	sonner.custom(
		() =>
			React.createElement(
				"div",
				{ className: "sonner-description fancy-toast fancy-toast-error" },
				React.createElement("div", { className: "fancy-toast-bg" }),
				React.createElement(
					"div",
					{ className: "fancy-toast-content" },
					React.createElement("div", { className: "fancy-toast-title" }, title),
					subtitle
						? React.createElement(
								"div",
								{ className: "fancy-toast-sub" },
								subtitle,
							)
						: null,
				),
			),
		{ duration },
	);
}

function themedUndoable(
	title: string,
	subtitle: string | undefined,
	actionLabel: string,
	onClick: () => void,
	duration = 8000,
) {
	sonner.custom(
		(id) =>
			React.createElement(
				"div",
				{ className: "sonner-description fancy-toast" },
				React.createElement("div", { className: "fancy-toast-bg" }),
				React.createElement(
					"div",
					{ className: "fancy-toast-content" },
					React.createElement("div", { className: "fancy-toast-title" }, title),
					subtitle
						? React.createElement(
								"div",
								{ className: "fancy-toast-sub" },
								subtitle,
							)
						: null,
					React.createElement(
						"button",
						{
							type: "button",
							className:
								"mt-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs",
							onClick: () => {
								try {
									onClick();
								} finally {
									try {
										sonner.dismiss(id);
									} catch {}
								}
							},
						},
						actionLabel,
					),
				),
			),
		{ duration },
	);
}

export const toastService = {
	reservationCreated(payload: ReservationToastPayload) {
		const { customer, wa_id, date, time, isRTL } = payload;
		const title = i18n.getMessage("toast_reservation_created", isRTL);
		const name = customer || wa_id || "";
		const details = [name, date, time]
			.filter(Boolean)
			.join(isRTL ? " • " : " • ");
		themed(title, details);
	},
	reservationModified(payload: ReservationToastPayload) {
		const { customer, wa_id, date, time, isRTL } = payload;
		const title = i18n.getMessage("toast_reservation_modified", isRTL);
		const name = customer || wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, date, displayTime]
			.filter(Boolean)
			.join(isRTL ? " • " : " • ");
		themed(title, details);
	},
	reservationCancelled(payload: ReservationToastPayload) {
		const { customer, wa_id, date, time, isRTL } = payload;
		const title = i18n.getMessage("toast_reservation_cancelled", isRTL);
		// Show both name (if available) and phone number
		const name = customer || "";
		const phone = wa_id || "";
		const details = [name, phone, date, time]
			.filter(Boolean)
			.join(isRTL ? " • " : " • ");
		themed(title, details);
	},
	reservationModificationFailed(
		payload: ReservationToastPayload & { error?: string },
	) {
		const { customer, wa_id, date, time, isRTL, error } = payload;
		const title = i18n.getMessage(
			"toast_reservation_modification_failed",
			isRTL,
		);
		const name = customer || wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, date, displayTime]
			.filter(Boolean)
			.join(isRTL ? " • " : " • ");
		const errorPrefix = i18n.getMessage("toast_error_prefix", isRTL);
		const subtitle = error ? `${errorPrefix}: ${error}` : details;

		// Use themedError for consistent styling with success toasts but error colors
		themedError(title, subtitle);
	},
	success(title: string, description?: string, duration = 3000) {
		// Use themed fancy toast for consistency across the app
		themed(title, description, duration);
	},
	error(title: string, description?: string, duration = 4000) {
		sonner.error(title, description ? { description, duration } : { duration });
	},
	undoable(
		title: string,
		description: string | undefined,
		actionLabel: string,
		onClick: () => void,
		duration = 8000,
	) {
		themedUndoable(title, description, actionLabel, onClick, duration);
	},
	newMessage(payload: MessageToastPayload) {
		const { title, description } = payload;
		themed(title, description, 2500);
	},
	info(title: string, description?: string, duration = 2500) {
		// Use themed (fancy) variant for informational toasts
		themed(title, description, duration);
	},
};
