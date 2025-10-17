// Utilities for chat markdown normalization and serialization

const CODE_PLACEHOLDER_PATTERN = /`[^`]*`/g;
const MULTIPLE_NEWLINES_PATTERN = /\n{3,}/g;
const SINGLE_TILDE_PATTERN = /(^|[^~])~([^~\n]+)~(?!~)/g;
const SINGLE_ASTERISK_PATTERN = /(^|[^*])\*([^*\n]+)\*(?!\*)/g;
const CODE_PLACEHOLDER_RESTORE_PATTERN = /<<CODE_(\d+)>>/g;

function formatHtmlElement(element: HTMLElement, childrenText: string): string {
	const tag = element.tagName.toLowerCase();

	if (tag === "strong" || tag === "b") {
		return `*${childrenText}*`;
	}
	if (tag === "em" || tag === "i") {
		return `_${childrenText}_`;
	}
	if (tag === "s" || tag === "del" || tag === "strike") {
		return `~${childrenText}~`;
	}
	if (tag === "code") {
		return `\`${childrenText}\``;
	}
	if (tag === "br") {
		return "\n";
	}
	if (tag === "p") {
		return `${childrenText}\n`;
	}
	return childrenText;
}

function walkHtmlNode(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) {
		return node.textContent || "";
	}

	const children = Array.from(node.childNodes).map(walkHtmlNode).join("");
	if (!(node instanceof HTMLElement)) {
		return children;
	}

	return formatHtmlElement(node, children);
}

export function normalizeSimpleFormattingForMarkdown(input: string): string {
	try {
		if (!input) {
			return "";
		}

		// Protect inline code spans so we do not alter content inside them
		const codePlaceholders: string[] = [];
		let protectedText = input.replace(CODE_PLACEHOLDER_PATTERN, (match) => {
			const token = `<<CODE_${codePlaceholders.length}>>`;
			codePlaceholders.push(match);
			return token;
		});

		// Convert single tilde strikethrough to Markdown double tilde
		protectedText = protectedText.replace(SINGLE_TILDE_PATTERN, "$1~~$2~~");

		// Convert single asterisk bold to Markdown double asterisks. Avoid lists and existing ** **
		protectedText = protectedText.replace(SINGLE_ASTERISK_PATTERN, "$1**$2**");

		// Restore code spans
		const restored = protectedText.replace(
			CODE_PLACEHOLDER_RESTORE_PATTERN,
			(_, i) => codePlaceholders[Number(i)] || ""
		);
		return restored;
	} catch {
		return input;
	}
}

export function serializeHtmlToMarkers(html: string): string {
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html || "", "text/html");
		const out = walkHtmlNode(doc.body)
			.replace(MULTIPLE_NEWLINES_PATTERN, "\n\n")
			.trim();
		return out;
	} catch {
		return html;
	}
}
