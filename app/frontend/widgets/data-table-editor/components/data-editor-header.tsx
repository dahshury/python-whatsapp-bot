"use client";

import {
	KEY_DATA_EDITOR_DESC,
	KEY_DATA_EDITOR_TITLE,
} from "@widgets/data-table-editor/utils/i18n-keys";
import { i18n } from "@/shared/libs/i18n";

type DataEditorHeaderProps = {
	isLocalized: boolean;
	formattedDateRange: string;
};

export function DataEditorHeader(props: DataEditorHeaderProps) {
	const { isLocalized, formattedDateRange } = props;

	return (
		<div className="flex flex-row items-center justify-between border-b px-4 py-1.5">
			<div className="flex flex-col space-y-1.5">
				<h2
					className={
						"py-2 text-left font-semibold text-xl leading-none tracking-tight"
					}
				>
					{i18n.getMessage(KEY_DATA_EDITOR_TITLE, isLocalized)} -{" "}
					{formattedDateRange}
				</h2>
				<p
					className="sr-only"
					id={`data-editor-description-${typeof window !== "undefined" ? "client" : "ssr"}`}
				>
					{i18n.getMessage(KEY_DATA_EDITOR_DESC, isLocalized)}
				</p>
			</div>
		</div>
	);
}
