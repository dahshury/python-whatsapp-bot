import { markInputRule } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";

const SINGLE_ASTERISK_BOLD_PATTERN = /(?:^|\s)\*([^*]+)\*$/;
const UNDERSCORE_ITALIC_PATTERN = /(?:^|\s)_([^_]+)_$/;
const SINGLE_TILDE_STRIKE_PATTERN = /(?:^|\s)~([^~]+)~$/;

export const SingleAsteriskBold = Bold.extend({
	addInputRules() {
		return [
			markInputRule({ find: SINGLE_ASTERISK_BOLD_PATTERN, type: this.type }),
		];
	},
});

export const UnderscoreItalic = Italic.extend({
	addInputRules() {
		return [
			markInputRule({ find: UNDERSCORE_ITALIC_PATTERN, type: this.type }),
		];
	},
});

export const SingleTildeStrike = Strike.extend({
	addInputRules() {
		return [
			markInputRule({ find: SINGLE_TILDE_STRIKE_PATTERN, type: this.type }),
		];
	},
});
