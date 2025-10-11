// Utilities for chat markdown normalization and serialization

export function normalizeSimpleFormattingForMarkdown(input: string): string {
	try {
		if (!input) return "";

		// Protect inline code spans so we do not alter content inside them
		const codePlaceholders: string[] = [];
		let protectedText = input.replace(/`[^`]*`/g, (match) => {
			const token = `<<CODE_${codePlaceholders.length}>>`;
			codePlaceholders.push(match);
			return token;
		});

		// Convert single tilde strikethrough to Markdown double tilde
		protectedText = protectedText.replace(/(^|[^~])~([^~\n]+)~(?!~)/g, "$1~~$2~~");

		// Convert single asterisk bold to Markdown double asterisks. Avoid lists and existing ** **
		protectedText = protectedText.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1**$2**");

		// Restore code spans
		const restored = protectedText.replace(/<<CODE_(\d+)>>/g, (_, i) => codePlaceholders[Number(i)] || "");
		return restored;
	} catch {
		return input;
	}
}

export function serializeHtmlToMarkers(html: string): string {
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html || "", "text/html");
		const walk = (node: Node): string => {
			if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
			const children = Array.from(node.childNodes).map(walk).join("");
			if (!(node instanceof HTMLElement)) return children;
			const tag = node.tagName.toLowerCase();
			if (tag === "strong" || tag === "b") return `*${children}*`;
			if (tag === "em" || tag === "i") return `_${children}_`;
			if (tag === "s" || tag === "del" || tag === "strike") return `~${children}~`;
			if (tag === "code") return `\`${children}\``;
			if (tag === "br") return "\n";
			if (tag === "p") return `${children}\n`;
			return children;
		};
		const out = walk(doc.body)
			.replace(/\n{3,}/g, "\n\n")
			.trim();
		return out;
	} catch {
		return html;
	}
}
