"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { FC } from "react";
import { i18n } from "@/shared/libs/i18n";
import { useLanguage } from "@/shared/libs/state/language-context";

type SaveStatus =
	| { status: "idle" }
	| { status: "dirty" }
	| { status: "saving" }
	| { status: "saved"; at: number }
	| { status: "error"; message?: string };

export const DocumentSavingIndicator: FC<{
	status: SaveStatus;
	loading?: boolean;
}> = ({ status, loading }) => {
	const { isLocalized } = useLanguage();
	if (loading) {
		return (
			<div className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-1 text-xs text-foreground shadow-sm">
				<Loader2 className="size-3 animate-spin" />
				<span>{i18n.getMessage("loading", isLocalized)}</span>
			</div>
		);
	}
	switch (status?.status) {
		case "saving":
			return (
				<div className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-2 py-1 text-xs text-blue-600 dark:text-blue-400">
					<Loader2 className="size-3 animate-spin" />
					<span>{i18n.getMessage("saving", isLocalized)}</span>
				</div>
			);
		case "dirty":
			return (
				<div className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
					<span>{i18n.getMessage("unsaved_changes", isLocalized)}</span>
				</div>
			);
		case "saved": {
			const t = new Date(status.at);
			const hh = `${t.getHours()}`.padStart(2, "0");
			const mm = `${t.getMinutes()}`.padStart(2, "0");
			const ss = `${t.getSeconds()}`.padStart(2, "0");
			const month = `${t.getMonth() + 1}`.padStart(2, "0");
			const day = `${t.getDate()}`.padStart(2, "0");
			const year = t.getFullYear();
			const savedLabel = i18n.getMessage("saved", isLocalized);
			return (
				<div className="group pointer-events-auto inline-flex items-center rounded-md bg-emerald-500/15 px-1.5 py-1 text-xs text-emerald-600 dark:text-emerald-400 overflow-hidden transition-all">
					<CheckCircle2 className="size-3 flex-shrink-0" />
					<span className="ml-0 max-w-0 overflow-hidden opacity-0 transition-all whitespace-nowrap group-hover:opacity-100 group-hover:max-w-[240px] group-hover:ml-1">
						{savedLabel} {year}-{month}-{day} {hh}:{mm}:{ss}
					</span>
				</div>
			);
		}
		case "error":
			return (
				<div className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-1 text-xs text-red-600 dark:text-red-400">
					<AlertCircle className="size-3" />
					<span>Error</span>
				</div>
			);
		default:
			return null;
	}
};
