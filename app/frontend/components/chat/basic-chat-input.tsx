"use client";

import Code from "@tiptap/extension-code";
import Placeholder from "@tiptap/extension-placeholder";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Clock, Smile } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "@/components/ui/emoji-picker";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { i18n } from "@/lib/i18n";
import {
	SingleAsteriskBold,
	SingleTildeStrike,
	UnderscoreItalic,
} from "@/lib/tiptap/extensions/single-char-marks";
import { cn } from "@/lib/utils";
import { serializeHtmlToMarkers } from "@/lib/utils/chat-markdown";
import { ChatFormatToolbar } from "./chat-format-toolbar";

export const BasicChatInput: React.FC<{
	onSend: (text: string) => void;
	disabled?: boolean;
	placeholder?: string;
	isSending?: boolean;
	isInactive?: boolean;
	inactiveText?: string;
	isLocalized?: boolean;
}> = ({
	onSend,
	disabled = false,
	placeholder = "Type message...",
	isSending = false,
	isInactive = false,
	inactiveText,
	isLocalized = false,
}) => {
	const [emojiOpen, setEmojiOpen] = useState(false);
	const editorWrapperRef = useRef<HTMLDivElement>(null);
	const baseMinHeightPx = 70;
	const [maxHeightPx, setMaxHeightPx] = useState(0);
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				bold: false,
				italic: false,
				strike: false,
				code: false,
			}),
			SingleAsteriskBold,
			UnderscoreItalic,
			SingleTildeStrike,
			Code,
			Placeholder.configure({ placeholder }),
		],
		editorProps: {
			attributes: { class: "min-h-[2rem] text-xs leading-6 outline-none" },
		},
		content: "",
		immediatelyRender: false,
	});

	// Compute max height (40vh) and keep it updated
	useEffect(() => {
		const compute = () => setMaxHeightPx(Math.floor(window.innerHeight * 0.4));
		compute();
		window.addEventListener("resize", compute);
		return () => window.removeEventListener("resize", compute);
	}, []);

	// Auto-grow the editor wrapper height based on content up to maxHeightPx
	useEffect(() => {
		if (!editor) return;
		const adjust = () => {
			try {
				const wrapper = editorWrapperRef.current;
				const pm = editor?.view?.dom as HTMLElement | undefined;
				if (!wrapper || !pm) return;
				wrapper.style.height = "auto";
				const desired = Math.max(baseMinHeightPx, pm.scrollHeight);
				const capped = Math.min(
					desired,
					Math.max(maxHeightPx, baseMinHeightPx),
				);
				wrapper.style.height = `${capped}px`;
				pm.style.overflowY =
					capped >= Math.max(maxHeightPx, baseMinHeightPx) ? "auto" : "hidden";
			} catch {}
		};
		setTimeout(adjust, 0);
		editor.on("update", adjust);
		editor.on("selectionUpdate", adjust);
		editor.on("transaction", adjust);
		return () => {
			try {
				editor.off("update", adjust);
				editor.off("selectionUpdate", adjust);
				editor.off("transaction", adjust);
			} catch {}
		};
	}, [editor, maxHeightPx]);

	// Ensure editor editability matches state (inactive handled here)
	useEffect(() => {
		if (!editor) return;
		editor.setEditable(!(disabled || isInactive));
	}, [editor, disabled, isInactive]);

	const handleEmojiSelect = ({ emoji }: { emoji: string }) => {
		try {
			editor?.chain().focus().insertContent(emoji).run();
		} finally {
			setEmojiOpen(false);
		}
	};

	const effectiveDisabled = disabled || isInactive;

	return (
		<div className="space-y-2">
			{isInactive && (
				<div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-muted">
					<Clock className="h-4 w-4 text-muted-foreground" />
					<span className="text-xs text-muted-foreground">{inactiveText}</span>
				</div>
			)}
			{/* Toolbar */}
			{!effectiveDisabled && (
				<ChatFormatToolbar
					editor={editor as unknown as Editor}
					disabled={effectiveDisabled}
					isLocalized={isLocalized}
				/>
			)}

			<div className="flex gap-2 items-start">
				<div
					ref={editorWrapperRef}
					className={cn(
						"flex-1 border border-border rounded-md",
						effectiveDisabled ? "bg-muted/50" : "bg-background",
						"max-h-[40vh] overflow-hidden",
						"focus-within:ring-1 focus-within:ring-ring focus-within:outline-none",
						"px-3 py-0 leading-6 text-xs",
						effectiveDisabled && "opacity-60 cursor-not-allowed",
					)}
					style={{ height: `${baseMinHeightPx}px` }}
				>
					<EditorContent
						editor={editor}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								const html = (editor?.getHTML() || "").trim();
								const textOut = serializeHtmlToMarkers(html);
								if (textOut && !effectiveDisabled && !isSending) {
									onSend(textOut);
									editor?.commands.clearContent(true);
								}
							}
						}}
						className={cn(
							"tiptap h-full w-full",
							"[&_.ProseMirror]:outline-none [&_.ProseMirror]:h-full [&_.ProseMirror]:max-h-full [&_.ProseMirror]:overflow-auto [&_.ProseMirror]:p-0 [&_.ProseMirror_p]:m-0",
							effectiveDisabled ? "[&_.ProseMirror]:opacity-70" : undefined,
						)}
					/>
				</div>

				<div className="flex flex-col items-stretch gap-2">
					{/* Emoji Picker Button */}
					<Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
						<PopoverTrigger asChild>
							<button
								type="button"
								disabled={effectiveDisabled}
								className={cn(
									"inline-flex items-center justify-center rounded-md border border-border bg-background px-2 h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none transition-colors flex-shrink-0",
									"icon-neon",
								)}
							>
								<Smile className="h-3.5 w-3.5" />
							</button>
						</PopoverTrigger>
						<PopoverContent
							className="w-fit p-0"
							side="top"
							align="end"
							sideOffset={8}
						>
							<EmojiPicker
								className="h-[21.375rem] rounded-lg border shadow-md"
								onEmojiSelect={handleEmojiSelect}
							>
								<EmojiPickerSearch
									placeholder={i18n.getMessage("emoji_search", isLocalized)}
								/>
								<EmojiPickerContent />
								<EmojiPickerFooter />
							</EmojiPicker>
						</PopoverContent>
					</Popover>

					{/* Send Button */}
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							const html = (editor?.getHTML() || "").trim();
							const textOut = serializeHtmlToMarkers(html);
							if (textOut && !effectiveDisabled && !isSending) {
								onSend(textOut);
								editor?.commands.clearContent(true);
							}
						}}
						disabled={
							!(editor?.getText().trim().length || 0) ||
							effectiveDisabled ||
							isSending
						}
						className={cn(
							"inline-flex items-center justify-center rounded-md bg-primary px-2 h-8 w-8 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors flex-shrink-0",
							"icon-neon",
						)}
					>
						{isSending ? (
							<div className="animate-spin rounded-full h-3 w-3 border-b border-primary-foreground" />
						) : (
							<svg
								className="h-3 w-3"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-label="Send message"
							>
								<title>Send message</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="m21.854 2.147-10.94 10.939"
								/>
							</svg>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
