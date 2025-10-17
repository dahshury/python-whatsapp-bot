import { useCallback, useState } from "react";

type CloseAction = () => void;

type UseUnsavedCloseGuardArgs = {
	hasUnsavedChanges: () => boolean;
	performSave: () => Promise<unknown> | unknown;
};

type UseUnsavedCloseGuardResult = {
	showUnsavedChangesDialog: boolean;
	setShowUnsavedChangesDialog: (open: boolean) => void;
	handleCloseAttempt: (closeAction: CloseAction) => void;
	handleDiscardChanges: () => void;
	handleSaveAndClose: () => Promise<void>;
};

export function useUnsavedCloseGuard(
	args: UseUnsavedCloseGuardArgs
): UseUnsavedCloseGuardResult {
	const { hasUnsavedChanges, performSave } = args;

	const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
		useState(false);
	const [pendingCloseAction, setPendingCloseAction] =
		useState<CloseAction | null>(null);

	const handleCloseAttempt = useCallback(
		(closeAction: CloseAction) => {
			if (hasUnsavedChanges()) {
				setPendingCloseAction(() => closeAction);
				setShowUnsavedChangesDialog(true);
				return;
			}
			closeAction();
		},
		[hasUnsavedChanges]
	);

	const handleDiscardChanges = useCallback(() => {
		setShowUnsavedChangesDialog(false);
		if (pendingCloseAction) {
			pendingCloseAction();
			setPendingCloseAction(null);
		}
	}, [pendingCloseAction]);

	const handleSaveAndClose = useCallback(async () => {
		setShowUnsavedChangesDialog(false);
		try {
			await Promise.resolve(performSave());
		} finally {
			if (pendingCloseAction) {
				pendingCloseAction();
				setPendingCloseAction(null);
			}
		}
	}, [performSave, pendingCloseAction]);

	return {
		showUnsavedChangesDialog,
		setShowUnsavedChangesDialog,
		handleCloseAttempt,
		handleDiscardChanges,
		handleSaveAndClose,
	};
}
