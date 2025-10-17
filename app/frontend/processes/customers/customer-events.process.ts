export function onCustomerProfile(
	waId: string,
	handler: (detail: {
		wa_id?: string;
		name?: string | null;
		age?: number | null;
	}) => void
): () => void {
	const listener = (e: Event) => {
		try {
			const d = (e as CustomEvent).detail as {
				wa_id?: string;
				name?: string | null;
				age?: number | null;
			};
			if (String(d?.wa_id || "") !== String(waId)) {
				return;
			}
			handler(d);
		} catch (_error) {
			// Silently ignore errors processing customer profile events
		}
	};
	window.addEventListener("customers:profile", listener as EventListener);
	return () =>
		window.removeEventListener("customers:profile", listener as EventListener);
}
