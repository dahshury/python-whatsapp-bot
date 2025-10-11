"use client";

import { i18n } from "@shared/libs/i18n";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import React from "react";
import { toast as sonner } from "sonner";

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
					subtitle ? React.createElement("div", { className: "fancy-toast-sub" }, subtitle) : null
				)
			),
		{ duration }
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
					subtitle ? React.createElement("div", { className: "fancy-toast-sub" }, subtitle) : null
				)
			),
		{ duration }
	);
}

function themedUndoable(
	title: string,
	subtitle: string | undefined,
	actionLabel: string,
	onClick: () => void,
	duration = 8000
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
					subtitle ? React.createElement("div", { className: "fancy-toast-sub" }, subtitle) : null,
					React.createElement(
						"button",
						{
							type: "button",
							className: "mt-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs",
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
						actionLabel
					)
				)
			),
		{ duration }
	);
}

export const toastService = {
	reservationCreated(payload: ReservationToastPayload) {
		const { customer, wa_id, date, time, isLocalized } = payload;
		const title = i18n.getMessage("toast_reservation_created", isLocalized);
		const name = customer || wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, date, displayTime].filter(Boolean).join(isLocalized ? " • " : " • ");
		themed(title, details);
	},
	reservationModified(payload: ReservationToastPayload) {
		const { customer, wa_id, date, time, isLocalized } = payload;
		const title = i18n.getMessage("toast_reservation_modified", isLocalized);
		const name = customer || wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, date, displayTime].filter(Boolean).join(isLocalized ? " • " : " • ");
		themed(title, details);
	},
	reservationCancelled(payload: ReservationToastPayload) {
		const { customer, wa_id, date, time, isLocalized } = payload;
		const title = i18n.getMessage("toast_reservation_cancelled", isLocalized);
		const name = customer || "";
		const phone = wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, phone, date, displayTime].filter(Boolean).join(isLocalized ? " • " : " • ");
		themed(title, details);
	},
	reservationModificationFailed(payload: ReservationToastPayload & { error?: string }) {
		const { customer, wa_id, date, time, isLocalized, error } = payload;
		const title = i18n.getMessage("toast_reservation_modification_failed", isLocalized);
		const name = customer || wa_id || "";
		const displayTime = to12HourFormat(time);
		const details = [name, date, displayTime].filter(Boolean).join(isLocalized ? " • " : " • ");
		const errorPrefix = i18n.getMessage("toast_error_prefix", isLocalized);
		const subtitle = error ? `${errorPrefix}: ${error}` : details;
		themedError(title, subtitle);
	},
	success(title: string, description?: string, duration = 3000) {
		themed(title, description, duration);
	},
	error(title: string, description?: string, duration = 4000) {
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
						React.createElement("div", { className: "fancy-toast-title" }, loading)
					)
				),
			{ duration: 100000 }
		);

		// When the promise resolves/rejects, update the same toast using the same id
		promise
			.then((value) => {
				const successText = typeof success === "function" ? (success as (v: T) => React.ReactNode)(value) : success;
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
									React.createElement("div", { className: "fancy-toast-title" }, successText as React.ReactNode)
								)
							),
						{
							id: loadingId,
							duration: typeof duration === "number" ? duration : 3000,
						}
					);
				} catch {
					try {
						sonner.dismiss(loadingId);
					} catch {}
					themed(String(successText));
				}
				return value;
			})
			.catch((err) => {
				const errorText = typeof error === "function" ? (error as (e: unknown) => React.ReactNode)(err) : error;
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
									React.createElement("div", { className: "fancy-toast-title" }, errorText as React.ReactNode)
								)
							),
						{
							id: loadingId,
							duration: typeof duration === "number" ? duration : 4000,
						}
					);
				} catch {
					try {
						sonner.dismiss(loadingId);
					} catch {}
					themedError(String(errorText));
				}
				// Re-throw to preserve promise semantics if caller awaits
				throw err;
			});

		return promise;
	},
	undoable(title: string, description: string | undefined, actionLabel: string, onClick: () => void, duration = 8000) {
		themedUndoable(title, description, actionLabel, onClick, duration);
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
						description ? React.createElement("div", { className: "fancy-toast-sub" }, description) : null
					)
				),
			{ duration: 2500 }
		);
	},
	info(title: string, description?: string, duration = 2500) {
		themed(title, description, duration);
	},
};
