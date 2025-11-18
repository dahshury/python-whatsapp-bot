import { markInputRule, markPasteRule } from '@tiptap/core'
import Strike from '@tiptap/extension-strike'

const STRIKE_INPUT_PATTERN = /(?:^|\s)(~([^~\s](?:[^~]*[^~\s])?)~)$/
const STRIKE_PASTE_PATTERN = /(?:^|\s)(~([^~\s](?:[^~]*[^~\s])?)~)/g

/**
 * Custom Strike extension that uses single tildes (~) instead of double (~~) for WhatsApp-style formatting.
 * @ts-expect-error - Tiptap dependency conflict: @tiptap/extension-strike v3.10.7 has both v2.27.1 and v3.10.7 of @tiptap/core in dependency tree
 */
export const SingleTildeStrike = Strike.extend({
	name: 'strike',

	// @ts-expect-error - Tiptap dependency conflict: @tiptap/extension-strike v3.10.7 has both v2.27.1 and v3.10.7 of @tiptap/core in dependency tree
	addInputRules() {
		return [
			markInputRule({
				find: STRIKE_INPUT_PATTERN,
				type: this.type,
			}),
		]
	},

	// @ts-expect-error - Tiptap dependency conflict: @tiptap/extension-strike v3.10.7 has both v2.27.1 and v3.10.7 of @tiptap/core in dependency tree
	addPasteRules() {
		return [
			markPasteRule({
				find: STRIKE_PASTE_PATTERN,
				type: this.type,
			}),
		]
	},
})
