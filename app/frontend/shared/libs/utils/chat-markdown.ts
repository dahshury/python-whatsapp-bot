// Utilities for chat markdown normalization and serialization

export function normalizeSimpleFormattingForMarkdown(input: string): string {
	try {
		if (!input) {
			return ''
		}

		// Protect inline code spans so we do not alter content inside them
		const codePlaceholders: string[] = []
		let protectedText = input.replace(/`[^`]*`/g, (match) => {
			const token = `<<CODE_${codePlaceholders.length}>>`
			codePlaceholders.push(match)
			return token
		})

		// Convert single tilde strikethrough to Markdown double tilde
		protectedText = protectedText.replace(
			/(^|[^~])~([^~\n]+)~(?!~)/g,
			'$1~~$2~~'
		)

		// Convert single asterisk bold to Markdown double asterisks. Avoid lists and existing ** **
		protectedText = protectedText.replace(
			/(^|[^*])\*([^*\n]+)\*(?!\*)/g,
			'$1**$2**'
		)

		// Restore code spans
		const restored = protectedText.replace(
			/<<CODE_(\d+)>>/g,
			(_, i) => codePlaceholders[Number(i)] || ''
		)
		return restored
	} catch {
		return input
	}
}
