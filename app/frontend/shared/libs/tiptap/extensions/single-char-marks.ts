import { markInputRule } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";

// Regex patterns for markdown-style mark rules - defined at top level for performance
const BOLD_ASTERISK_REGEX = /(?:^|\s)\*([^*]+)\*$/;
const ITALIC_UNDERSCORE_REGEX = /(?:^|\s)_([^_]+)_$/;
const STRIKE_TILDE_REGEX = /(?:^|\s)~([^~]+)~$/;

export const SingleAsteriskBold = Bold.extend({
  addInputRules() {
    return [markInputRule({ find: BOLD_ASTERISK_REGEX, type: this.type })];
  },
});

export const UnderscoreItalic = Italic.extend({
  addInputRules() {
    return [markInputRule({ find: ITALIC_UNDERSCORE_REGEX, type: this.type })];
  },
});

export const SingleTildeStrike = Strike.extend({
  addInputRules() {
    return [markInputRule({ find: STRIKE_TILDE_REGEX, type: this.type })];
  },
});
