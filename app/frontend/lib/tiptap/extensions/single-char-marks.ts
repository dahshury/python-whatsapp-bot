import { markInputRule } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";

export const SingleAsteriskBold = Bold.extend({
	addInputRules() {
		return [markInputRule({ find: /(?:^|\s)\*([^*]+)\*$/, type: this.type })];
	},
});

export const UnderscoreItalic = Italic.extend({
	addInputRules() {
		return [markInputRule({ find: /(?:^|\s)_([^_]+)_$/, type: this.type })];
	},
});

export const SingleTildeStrike = Strike.extend({
	addInputRules() {
		return [markInputRule({ find: /(?:^|\s)~([^~]+)~$/, type: this.type })];
	},
});


