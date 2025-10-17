import { useEffect } from "react";

export function useDialogBackdrop({
	open,
	isExiting,
}: {
	open: boolean;
	isExiting: boolean;
}) {
	useEffect(() => {
		if (open || isExiting) {
			document.body.classList.add("has-dialog-backdrop");
		} else {
			document.body.classList.remove("has-dialog-backdrop");
		}
	}, [open, isExiting]);

	useEffect(
		() => () => {
			document.body.classList.remove("has-dialog-backdrop");
		},
		[]
	);
}
