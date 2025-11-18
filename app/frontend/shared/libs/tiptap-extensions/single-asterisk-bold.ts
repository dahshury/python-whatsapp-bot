import { markInputRule, markPasteRule } from '@tiptap/core'
import Bold from '@tiptap/extension-bold'

const BOLD_INPUT_PATTERN = /(?:^|\s)(\*([^*\s](?:[^*]*[^*\s])?)\*)$/
const BOLD_PASTE_PATTERN = /(?:^|\s)(\*([^*\s](?:[^*]*[^*\s])?)\*)/g

/**
 * Custom Bold extension that uses single asterisks (*) instead of double (**) for WhatsApp-style formatting.
 * @ts-expect-error - Tiptap dependency conflict: @tiptap/extension-bold v3.10.7 has both v2.27.1 and v3.10.7 of @tiptap/core in dependency tree
 */
export const SingleAsteriskBold = Bold.extend({
	name: 'bold',

	// @ts-expect-error - Tiptap dependency conflict: @tiptap/extension-bold v3.10.7 has both v2.27.1 and v3.10.7 of @tiptap/core in dependency tree
	addInputRules() {
		return [
			markInputRule({
				find: BOLD_INPUT_PATTERN,
				type: this.type,
			}),
		]
	},

	// @ts-expect-error - Tiptap dependency conflict: @tiptap/extension-bold v3.10.7 has both v2.27.1 and v3.10.7 of @tiptap/core in dependency tree
	addPasteRules() {
		return [
			markPasteRule({
				find: BOLD_PASTE_PATTERN,
				type: this.type,
			}),
		]
	},
})
