"use client";

import React from "react";
import { toast as sonner } from "sonner";
import { i18n } from "@/lib/i18n";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";

export type ReservationToastPayload = {
	id?: string | number;
	customer?: string;
	wa_id?: string;
	date?: string;
	time?: string;
	isLocalized?: boolean;
};

export type MessageToastPayload = {
	title: string;
	description?: string;
	isLocalized?: boolean;
    wa_id?: string;
    waId?: string;
    date?: string;
    time?: string;
    message?: string;
};

// Convert 24-hour "HH:MM" to 12-hour "h:MM AM/PM"; return input if not simple time
function to12HourFormat(time?: string): string {
	try {
		if (!time) return "";
		const trimmed = String(time).trim();
		const m = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
		if (!m) return trimmed;
		const hour = Number.parseInt(m[1] || "0", 10);
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
		const { customer, wa_id, date, time, isLocalized } = payload;
		const title = i18n.getMessage("toast_reservation_created", isLocalized);
		const name = customer || wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, date, displayTime]
			.filter(Boolean)
			.join(isLocalized ? " • " : " • ");
		themed(title, details);
	},
	reservationModified(payload: ReservationToastPayload) {
		const { customer, wa_id, date, time, isLocalized } = payload;
		const title = i18n.getMessage("toast_reservation_modified", isLocalized);
		const name = customer || wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, date, displayTime]
			.filter(Boolean)
			.join(isLocalized ? " • " : " • ");
		themed(title, details);
	},
	reservationCancelled(payload: ReservationToastPayload) {
		const { customer, wa_id, date, time, isLocalized } = payload;
		const title = i18n.getMessage("toast_reservation_cancelled", isLocalized);
		// Show both name (if available) and phone number
		const name = customer || "";
		const phone = wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, phone, date, displayTime]
			.filter(Boolean)
			.join(isLocalized ? " • " : " • ");
		themed(title, details);
	},
	reservationModificationFailed(
		payload: ReservationToastPayload & { error?: string },
	) {
		const { customer, wa_id, date, time, isLocalized, error } = payload;
		const title = i18n.getMessage(
			"toast_reservation_modification_failed",
			isLocalized,
		);
		const name = customer || wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, date, displayTime]
			.filter(Boolean)
			.join(isLocalized ? " • " : " • ");
		const errorPrefix = i18n.getMessage("toast_error_prefix", isLocalized);
		const subtitle = error ? `${errorPrefix}: ${error}` : details;

		// Use themedError for consistent styling with success toasts but error colors
		themedError(title, subtitle);
	},
	success(title: string, description?: string, duration = 3000) {
		// Use themed fancy toast for consistency across the app
		themed(title, description, duration);
	},
	error(title: string, description?: string, duration = 4000) {
		// Use themed error to keep styling and layering consistent
		themedError(title, description, duration);
	},
	// Promise-based toast wrapper to prevent direct Sonner usage outside
	promise<T>(
		promise: Promise<T>,
		messages: {
			loading: string;
			success: string | ((value: T) => string | React.ReactNode);
			error: string | ((error: unknown) => string | React.ReactNode);
			duration?: number;
		},
	) {
		const { loading, success, error, duration } = messages;

		// Ensure functions return valid React nodes
		const successHandler =
			typeof success === "function"
				? (value: T) => {
						const result = success(value);
						return result === undefined ? "" : result;
					}
				: success;

		const errorHandler =
			typeof error === "function"
				? (errorValue: unknown) => {
						const result = error(errorValue);
						return result === undefined ? "" : result;
					}
				: error;

		return sonner.promise(promise, {
			loading,
			success: successHandler,
			error: errorHandler,
			...(typeof duration === "number" ? { duration } : {}),
		});
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
        const waId = String(payload.wa_id || payload.waId || "");
        const date = payload.date;
        const time = payload.time;
        const message = payload.message;

        // Render a clickable custom toast only for message notifications
        sonner.custom(
            (id) =>
                React.createElement(
                    "div",
                    {
                        className: "sonner-description fancy-toast cursor-pointer",
                        role: "button",
                        tabIndex: 0,
                        onClick: () => {
                            try {
                                if (waId) {
                                    useSidebarChatStore.getState().openConversation(waId);
                                    // Stash target globally in case listeners attach later
                                    try {
                                        (globalThis as unknown as { __chatScrollTarget?: unknown }).__chatScrollTarget = {
                                            waId,
                                            date,
                                            time,
                                            message,
                                        };
                                    } catch {}
                                    try {
                                        const evt = new CustomEvent("chat:scrollToMessage", {
                                            detail: { wa_id: waId, date, time, message },
                                        });
                                        window.dispatchEvent(evt);
                                    } catch {}
                                }
                            } finally {
                                try {
                                    sonner.dismiss(id);
                                } catch {}
                            }
                        },
                        onKeyDown: (e: unknown) => {
                            try {
                                const ev = e as KeyboardEvent;
                                if (ev.key === "Enter" || ev.key === " ") {
                                    ev.preventDefault();
                                    (document.activeElement as HTMLElement | null)?.click?.();
                                }
                            } catch {}
                        },
                    },
                    React.createElement("div", { className: "fancy-toast-bg" }),
                    React.createElement(
                        "div",
                        { className: "fancy-toast-content" },
                        React.createElement("div", { className: "fancy-toast-title" }, title),
                        description
                            ? React.createElement(
                                  "div",
                                  { className: "fancy-toast-sub" },
                                  description,
                              )
                            : null,
                    ),
                ),
            { duration: 2500 },
        );
    },
	info(title: string, description?: string, duration = 2500) {
		// Use themed (fancy) variant for informational toasts
		themed(title, description, duration);
	},
};
