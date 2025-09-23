"use client";

import { useEffect } from "react";
import { Z_INDEX } from "@/lib/z-index";

export function PortalBootstrap(): null {
	useEffect(() => {
		try {
			const body = document.body;
			if (!body) return;

			// Ensure dialog overlay portal exists
			let dialog = document.getElementById(
				"dialog-overlay-portal",
			) as HTMLDivElement | null;
			if (!dialog) {
				dialog = document.createElement("div");
				dialog.id = "dialog-overlay-portal";
			}
			Object.assign(dialog.style, {
				position: "fixed",
				top: "0px",
				left: "0px",
				pointerEvents: "none",
				zIndex: String(Z_INDEX.DIALOG_OVERLAY_PORTAL ?? 1000),
				width: "0px",
				height: "0px",
			} as Partial<CSSStyleDeclaration>);
			if (!dialog.isConnected) body.appendChild(dialog);

			// Ensure Glide overlay editor portal exists and is the last child of body
			let portal = document.getElementById("portal") as HTMLDivElement | null;
			if (!portal) {
				portal = document.createElement("div");
				portal.id = "portal";
			}
			// Append (or move) as last child
			body.appendChild(portal);
		} catch {}
	}, []);

	return null;
}
