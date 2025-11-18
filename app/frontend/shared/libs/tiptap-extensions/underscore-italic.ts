import { markInputRule, markPasteRule } from '@tiptap/core'
import Italic from '@tiptap/extension-italic'

const ITALIC_INPUT_PATTERN = /(?:^|\s)(_([^_\s](?:[^_]*[^_\s])?)_)$/
const ITALIC_PASTE_PATTERN = /(?:^|\s)(_([^_\s](?:[^_]*[^_\s])?)_)/g

/**
 * Custom Italic extension that uses single underscores (_) for WhatsApp-style formatting.
 * @ts-expect-error - Tiptap dependency conflict: @tiptap/extension-italic v3.10.7 has both v2.27.1 and v3.10.7 of @tiptap/core in dependency tree
 */
export const UnderscoreItalic = Italic.extend({
	name: 'italic',

	// @ts-expect-error - Tiptap dependency conflict: @tiptap/extension-italic v3.10.7 has both v2.27.1 and v3.10.7 of @tiptap/core in dependency tree
	addInputRules() {
		return [
			markInputRule({
				find: ITALIC_INPUT_PATTERN,
				type: this.type,
			}),
		]
	},

	// @ts-expect-error - Tiptap dependency conflict: @tiptap/extension-italic v3.10.7 has both v2.27.1 and v3.10.7 of @tiptap/core in dependency tree
	addPasteRules() {
		return [
			markPasteRule({
				find: ITALIC_PASTE_PATTERN,
				type: this.type,
			}),
		]
	},
})
