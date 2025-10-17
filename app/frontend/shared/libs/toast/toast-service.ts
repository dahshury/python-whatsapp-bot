"use client";

import { i18n } from "@shared/libs/i18n";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import React from "react";
import { toast as sonner } from "sonner";

// ============= Constants =============
const TIME_FORMAT_REGEX = /^(\d{1,2}):(\d{2})$/;
const HOUR_12_CONVERSION = 12;
const HOUR_NOON_THRESHOLD = 12;
const DEFAULT_DURATION_SHORT = 2500;
const DEFAULT_DURATION_MEDIUM = 3000;
const DEFAULT_DURATION_LONG = 4000;
const DEFAULT_DURATION_EXTRA_LONG = 5000;
const DEFAULT_DURATION_UNDO = 8000;
const LOADING_TOAST_DURATION = 100_000;

// ============= Type Definitions =============
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

type ThemedUndoableOptions = {
	title: string;
	subtitle?: string;
	actionLabel: string;
	onClick: () => void;
	duration?: number;
};

// ============= Utility Functions =============
function to12HourFormat(time?: string): string {
	try {
		if (!time) {
			return "";
		}
		const trimmed = String(time).trim();
		const m = TIME_FORMAT_REGEX.exec(trimmed);
		if (!m) {
			return trimmed;
		}
		const hour = Number.parseInt(m[1] || "0", 10);
		const minutes = m[2];
		const ampm = hour >= HOUR_NOON_THRESHOLD ? "PM" : "AM";
		const hour12 =
			hour % HOUR_12_CONVERSION === 0
				? HOUR_12_CONVERSION
				: hour % HOUR_12_CONVERSION;
		return `${hour12}:${minutes} ${ampm}`;
	} catch {
		return String(time || "");
	}
}

function themed(
	title: string,
	subtitle?: string,
	duration = DEFAULT_DURATION_MEDIUM
) {
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
								subtitle
							)
						: null
				)
			),
		{ duration }
	);
}

function themedError(
	title: string,
	subtitle?: string,
	duration = DEFAULT_DURATION_EXTRA_LONG
) {
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
								subtitle
							)
						: null
				)
			),
		{ duration }
	);
}

function themedUndoable(options: ThemedUndoableOptions) {
	const {
		title,
		subtitle,
		actionLabel,
		onClick,
		duration = DEFAULT_DURATION_UNDO,
	} = options;
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
								subtitle
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
									} catch {
										// Silent: error dismissing toast after action
									}
								}
							},
						},
						actionLabel
					)
				)
			),
		{ duration }
	);
}

// ============= Toast Service =============
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
		const name = customer || "";
		const phone = wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, phone, date, displayTime]
			.filter(Boolean)
			.join(isLocalized ? " • " : " • ");
		themed(title, details);
	},
	reservationModificationFailed(
		payload: ReservationToastPayload & { error?: string }
	) {
		const { customer, wa_id, date, time, isLocalized, error } = payload;
		const title = i18n.getMessage(
			"toast_reservation_modification_failed",
			isLocalized
		);
		const name = customer || wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, date, displayTime]
			.filter(Boolean)
			.join(isLocalized ? " • " : " • ");
		const errorPrefix = i18n.getMessage("toast_error_prefix", isLocalized);
		const subtitle = error ? `${errorPrefix}: ${error}` : details;
		themedError(title, subtitle);
	},
	success(
		title: string,
		description?: string,
		duration = DEFAULT_DURATION_MEDIUM
	) {
		themed(title, description, duration);
	},
	error(title: string, description?: string, duration = DEFAULT_DURATION_LONG) {
		themedError(title, description, duration);
	},
	promise<T>(
		promise: Promise<T>,
		messages: {
			loading: string;
			success: string | ((value: T) => string | React.ReactNode);
			error: string | ((error: unknown) => string | React.ReactNode);
			duration?: number;
		}
	) {
		const { loading, success, error, duration } = messages;
		// Show a themed loading toast first, then update it with success/error
		const loadingId = sonner.custom(
			() =>
				React.createElement(
					"div",
					{ className: "sonner-description fancy-toast" },
					React.createElement("div", { className: "fancy-toast-bg" }),
					React.createElement(
						"div",
						{ className: "fancy-toast-content" },
						React.createElement(
							"div",
							{ className: "fancy-toast-title" },
							loading
						)
					)
				),
			{ duration: LOADING_TOAST_DURATION }
		);

		// When the promise resolves/rejects, update the same toast using the same id
		promise
			.then((value) => {
				const successText =
					typeof success === "function"
						? (success as (v: T) => React.ReactNode)(value)
						: success;
				try {
					sonner.custom(
						() =>
							React.createElement(
								"div",
								{ className: "sonner-description fancy-toast" },
								React.createElement("div", { className: "fancy-toast-bg" }),
								React.createElement(
									"div",
									{ className: "fancy-toast-content" },
									React.createElement(
										"div",
										{ className: "fancy-toast-title" },
										successText as React.ReactNode
									)
								)
							),
						{
							id: loadingId,
							duration:
								typeof duration === "number"
									? duration
									: DEFAULT_DURATION_MEDIUM,
						}
					);
				} catch {
					try {
						sonner.dismiss(loadingId);
					} catch {
						// Silent: error dismissing loading toast before showing success
					}
					themed(String(successText));
				}
				return value;
			})
			.catch((err) => {
				const errorText =
					typeof error === "function"
						? (error as (e: unknown) => React.ReactNode)(err)
						: error;
				try {
					sonner.custom(
						() =>
							React.createElement(
								"div",
								{
									className: "sonner-description fancy-toast fancy-toast-error",
								},
								React.createElement("div", { className: "fancy-toast-bg" }),
								React.createElement(
									"div",
									{ className: "fancy-toast-content" },
									React.createElement(
										"div",
										{ className: "fancy-toast-title" },
										errorText as React.ReactNode
									)
								)
							),
						{
							id: loadingId,
							duration:
								typeof duration === "number" ? duration : DEFAULT_DURATION_LONG,
						}
					);
				} catch {
					try {
						sonner.dismiss(loadingId);
					} catch {
						// Silent: error dismissing loading toast before showing error
					}
					themedError(String(errorText));
				}
				// Re-throw to preserve promise semantics if caller awaits
				throw err;
			});

		return promise;
	},
	undoable(options: {
		title: string;
		description?: string;
		actionLabel: string;
		onClick: () => void;
		duration?: number;
	}) {
		const undoArgs = {
			title: options.title,
			actionLabel: options.actionLabel,
			onClick: options.onClick,
			...(options.duration !== undefined && { duration: options.duration }),
		} as const;

		themedUndoable(
			options.description !== undefined
				? { ...undoArgs, subtitle: options.description }
				: undoArgs
		);
	},
	newMessage(payload: MessageToastPayload) {
		const { title, description } = payload;
		const waId = String(payload.wa_id || payload.waId || "");
		const date = payload.date;
		const time = payload.time;
		const message = payload.message;
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
									try {
										(
											globalThis as unknown as { __chatScrollTarget?: unknown }
										).__chatScrollTarget = {
											waId,
											date,
											time,
											message,
										};
									} catch {
										// Silent: error setting chat scroll target
									}
									try {
										const evt = new CustomEvent("chat:scrollToMessage", {
											detail: { wa_id: waId, date, time, message },
										});
										window.dispatchEvent(evt);
									} catch {
										// Silent: error dispatching scroll message event
									}
								}
							} finally {
								try {
									sonner.dismiss(id);
								} catch {
									// Silent: error dismissing toast after click
								}
							}
						},
						onKeyDown: (e: unknown) => {
							try {
								const ev = e as KeyboardEvent;
								if (ev.key === "Enter" || ev.key === " ") {
									ev.preventDefault();
									(document.activeElement as HTMLElement | null)?.click?.();
								}
							} catch {
								// Silent: error handling keyboard event
							}
						},
					},
					React.createElement("div", { className: "fancy-toast-bg" }),
					React.createElement(
						"div",
						{ className: "fancy-toast-content" },
						React.createElement(
							"div",
							{ className: "fancy-toast-title" },
							title
						),
						description
							? React.createElement(
									"div",
									{ className: "fancy-toast-sub" },
									description
								)
							: null
					)
				),
			{ duration: DEFAULT_DURATION_SHORT }
		);
	},
	info(title: string, description?: string, duration = DEFAULT_DURATION_SHORT) {
		themed(title, description, duration);
	},
};
