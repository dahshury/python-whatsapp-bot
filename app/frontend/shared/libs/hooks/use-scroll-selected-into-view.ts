import * as React from "react";

export function useScrollSelectedIntoView<T extends HTMLElement>() {
	const selectedRef = React.useRef<T | null>(null);
	const [isOpen, setIsOpen] = React.useState(false);

	React.useEffect(() => {
		if (!isOpen) return;
		queueMicrotask(() => {
			try {
				selectedRef.current?.scrollIntoView({
					block: "nearest",
					inline: "nearest",
					behavior: "auto",
				});
			} catch {}
		});
	}, [isOpen]);

	return { selectedRef, isOpen, setIsOpen } as const;
}
