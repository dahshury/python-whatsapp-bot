"use client";

import React from "react";
import { toast as sonner } from "sonner";

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
						? React.createElement("div", { className: "fancy-toast-sub" }, subtitle)
						: null,
				),
			),
		{ duration },
	);
}

function themedUndoable(title: string, subtitle: string | undefined, actionLabel: string, onClick: () => void, duration = 8000) {
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
							className: "mt-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs",
							onClick: () => {
								try { onClick(); } finally { try { sonner.dismiss(id); } catch {} }
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
		const title = isRTL ? "تم إنشاء الحجز" : "Reservation created";
		const name = customer || wa_id || "";
		const details = [name, date, time].filter(Boolean).join(isRTL ? " • " : " • ");
		themed(title, details);
	},
	reservationModified(payload: ReservationToastPayload) {
		const { customer, wa_id, date, time, isRTL } = payload;
		const title = isRTL ? "تم تعديل الحجز" : "Reservation modified";
		const name = customer || wa_id || "";
		const details = [name, date, time].filter(Boolean).join(isRTL ? " • " : " • ");
		themed(title, details);
	},
	reservationCancelled(payload: ReservationToastPayload) {
		const { customer, wa_id, date, time, isRTL } = payload;
		const title = isRTL ? "تم إلغاء الحجز" : "Reservation cancelled";
		const name = customer || wa_id || "";
		const details = [name, date, time].filter(Boolean).join(isRTL ? " • " : " • ");
		themed(title, details);
	},
	success(title: string, description?: string, duration = 3000) {
		// Use themed fancy toast for consistency across the app
		themed(title, description, duration);
	},
	error(title: string, description?: string, duration = 4000) {
		sonner.error(title, description ? { description, duration } : { duration });
	},
	undoable(title: string, description: string | undefined, actionLabel: string, onClick: () => void, duration = 8000) {
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
