"use client";

import {
	Bold as BoldIcon,
	Code as CodeIcon,
	Italic as ItalicIcon,
	Strikethrough as StrikethroughIcon,
} from "lucide-react";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface EditorLike {
	isActive: (name: string) => boolean;
	can: () => {
		chain: () => {
			focus: () => {
				toggleBold: () => { run: () => boolean };
				toggleItalic: () => { run: () => boolean };
				toggleStrike: () => { run: () => boolean };
				toggleCode: () => { run: () => boolean };
			};
		};
	};
	chain: () => {
		focus: () => {
			toggleBold: () => { run: () => void };
			toggleItalic: () => { run: () => void };
			toggleStrike: () => { run: () => void };
			toggleCode: () => { run: () => void };
		};
	};
}

export function ChatFormatToolbar({
	editor,
	disabled,
	isLocalized,
}: {
	editor: EditorLike | null | undefined;
	disabled: boolean;
	isLocalized?: boolean;
}) {
	const applyWrap = (marker: "*" | "_" | "~" | "`") => {
		if (!editor) return;
		const chain = editor.chain().focus();
		if (marker === "*") chain.toggleBold().run();
		else if (marker === "_") chain.toggleItalic().run();
		else if (marker === "~") chain.toggleStrike().run();
		else if (marker === "`") chain.toggleCode().run();
	};

	const isDisabled = (canRun: boolean) => disabled || !canRun;

	return (
		<div className="flex items-center gap-1 px-2 py-0.5 bg-muted/40 rounded-md border border-muted">
			{(() => {
				const isActive = !!editor?.isActive("bold");
				const canRun = !!editor?.can().chain().focus().toggleBold().run();
				return (
					<button
						type="button"
						title={i18n.getMessage("chat_toolbar_bold", !!isLocalized)}
						disabled={isDisabled(canRun)}
						onMouseDown={(e) => {
							e.preventDefault();
							applyWrap("*");
						}}
						aria-pressed={isActive}
						className={cn(
							"inline-flex items-center justify-center h-5 w-5 rounded transition-colors disabled:opacity-50",
							isActive
								? "bg-accent text-accent-foreground"
								: "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
							"icon-neon",
						)}
					>
						<BoldIcon className="h-3 w-3" />
					</button>
				);
			})()}
			{(() => {
				const isActive = !!editor?.isActive("italic");
				const canRun = !!editor?.can().chain().focus().toggleItalic().run();
				return (
					<button
						type="button"
						title={i18n.getMessage("chat_toolbar_italic", !!isLocalized)}
						disabled={isDisabled(canRun)}
						onMouseDown={(e) => {
							e.preventDefault();
							applyWrap("_");
						}}
						aria-pressed={isActive}
						className={cn(
							"inline-flex items-center justify-center h-5 w-5 rounded transition-colors disabled:opacity-50",
							isActive
								? "bg-accent text-accent-foreground"
								: "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
							"icon-neon",
						)}
					>
						<ItalicIcon className="h-3 w-3" />
					</button>
				);
			})()}
			{(() => {
				const isActive = !!editor?.isActive("strike");
				const canRun = !!editor?.can().chain().focus().toggleStrike().run();
				return (
					<button
						type="button"
						title={i18n.getMessage("chat_toolbar_strike", !!isLocalized)}
						disabled={isDisabled(canRun)}
						onMouseDown={(e) => {
							e.preventDefault();
							applyWrap("~");
						}}
						aria-pressed={isActive}
						className={cn(
							"inline-flex items-center justify-center h-5 w-5 rounded transition-colors disabled:opacity-50",
							isActive
								? "bg-accent text-accent-foreground"
								: "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
							"icon-neon",
						)}
					>
						<StrikethroughIcon className="h-3 w-3" />
					</button>
				);
			})()}
			{(() => {
				const isActive = !!editor?.isActive("code");
				const canRun = !!editor?.can().chain().focus().toggleCode().run();
				return (
					<button
						type="button"
						title={i18n.getMessage("chat_toolbar_code", !!isLocalized)}
						disabled={isDisabled(canRun)}
						onMouseDown={(e) => {
							e.preventDefault();
							applyWrap("`");
						}}
						aria-pressed={isActive}
						className={cn(
							"inline-flex items-center justify-center h-5 w-5 rounded transition-colors disabled:opacity-50",
							isActive
								? "bg-accent text-accent-foreground"
								: "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
							"icon-neon",
						)}
					>
						<CodeIcon className="h-3 w-3" />
					</button>
				);
			})()}
		</div>
	);
}
