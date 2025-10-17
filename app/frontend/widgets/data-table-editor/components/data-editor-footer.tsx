"use client";

import { Button } from "@ui/button";
import {
	KEY_SAVE_CHANGES,
	KEY_SAVING,
} from "@widgets/data-table-editor/utils/i18n-keys";
import { Save } from "lucide-react";
import { i18n } from "@/shared/libs/i18n";
import { Spinner } from "@/shared/ui/spinner";
import { ValidationErrorsPopover } from "../data-table-editor/data-table-editor/validation-errors-popover";

type DataEditorFooterProps = {
	isSaving: boolean;
	canSave: boolean;
	onSave: () => void | Promise<void>;
	errors: Array<{
		row: number;
		col: number;
		message: string;
		fieldName?: string;
	}>;
	isLocalized: boolean;
};

export function DataEditorFooter(props: DataEditorFooterProps) {
	const { isSaving, canSave, onSave, errors, isLocalized } = props;

	return (
		<div className="flex flex-col-reverse gap-2 border-t px-4 py-1.5 sm:flex-row sm:justify-between sm:space-x-2">
			<div className="relative ms-auto flex items-center gap-2">
				<Button
					className="gap-2"
					disabled={!canSave || isSaving}
					onClick={onSave}
				>
					{isSaving ? (
						<>
							<Spinner className="h-4 w-4" />
							{i18n.getMessage(KEY_SAVING, isLocalized)}
						</>
					) : (
						<>
							<Save className="h-4 w-4" />
							{i18n.getMessage(KEY_SAVE_CHANGES, isLocalized)}
						</>
					)}
				</Button>
				{errors?.length > 0 && (
					<div className="-top-1 -left-1 absolute">
						<ValidationErrorsPopover errors={errors} triggerClassName="" />
					</div>
				)}
			</div>
		</div>
	);
}
