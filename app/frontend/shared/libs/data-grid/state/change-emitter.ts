export class ChangeEmitter {
	private readonly listeners: Set<() => void> = new Set();

	on(callback: () => void): () => void {
		this.listeners.add(callback);
		return () => this.listeners.delete(callback);
	}

	emit(): void {
		for (const cb of this.listeners) {
			try {
				cb();
			} catch {
				// Ignore listener errors to prevent cascade failures
			}
		}
	}
}
