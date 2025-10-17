"use client";

import { i18n } from "@shared/libs/i18n";
import { useSettings } from "@shared/libs/state/settings-context";
import {
	SingleAsteriskBold,
	SingleTildeStrike,
	UnderscoreItalic,
} from "@shared/libs/tiptap/extensions/single-char-marks";
import { cn } from "@shared/libs/utils";
import { serializeHtmlToMarkers } from "@shared/libs/utils/chat-markdown";
import Code from "@tiptap/extension-code";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Separator } from "@ui/separator";
import { ArrowUp, Clock, Smile } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "@/shared/ui/emoji-picker";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupText,
} from "@/shared/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Spinner } from "@/shared/ui/spinner";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";
import { ChatFormatToolbar, type EditorLike } from "./chat-format-toolbar";

// Character counter utilities (module-level stable)
// WhatsApp counts by UTF-16 code units, not grapheme clusters
function countCharacters(input: string): number {
	// Use length which counts UTF-16 code units
	// This matches WhatsApp's character counting behavior
	return input.length;
}

// Type for editor view in paste handler
type EditorPasteView = {
	state: {
		doc: { textContent: string };
		selection: { from: number; to: number };
		tr: unknown;
	};
	dispatch: (tr: unknown) => void;
};

// Type for pasted content slice
type PastedSlice = {
	content: Array<{ textContent: string }>;
};

// Helper to dispatch typing indicator event
function dispatchTypingIndicatorEvent(): void {
	try {
		const evt = new CustomEvent("chat:editor_event", {
			detail: { type: "chat:editor_update" },
		});
		window.dispatchEvent(evt);
	} catch {
		// Typing indicator event dispatch may fail in some contexts
	}
}

// Helper to notify about typing if enabled
function notifyTypingIfEnabled(sendTypingIndicator: boolean): void {
	if (sendTypingIndicator) {
		dispatchTypingIndicatorEvent();
	}
}

// Helper to insert truncated text
function insertTruncatedText(options: {
	view: EditorPasteView;
	pastedText: string;
	currentText: string;
	from: number;
	to: number;
	maxChars: number;
}): void {
	const availableSpace =
		options.maxChars -
		countCharacters(
			options.currentText.slice(0, options.from) +
				options.currentText.slice(options.to)
		);

	if (availableSpace > 0) {
		const truncated = options.pastedText.slice(0, availableSpace);
		const tr = (
			options.view.state.tr as unknown as {
				insertText: (text: string, from: number, to: number) => unknown;
			}
		).insertText(truncated, options.from, options.to);
		options.view.dispatch(tr);
	}
}

// Helper to extract pasted text from slice
function extractPastedText(slice: PastedSlice): string {
	let pastedText = "";
	for (const node of slice.content) {
		pastedText += node.textContent;
	}
	return pastedText;
}

// Helper to handle paste events in editor
function handleEditorPaste(
	view: EditorPasteView,
	slice: PastedSlice,
	maxChars: number,
	sendTypingIndicator: boolean
): boolean {
	const pastedText = extractPastedText(slice);
	const currentText = view.state.doc.textContent;
	const { from, to } = view.state.selection;
	const newText =
		currentText.slice(0, from) + pastedText + currentText.slice(to);

	if (countCharacters(newText) > maxChars) {
		insertTruncatedText({ view, pastedText, currentText, from, to, maxChars });
		notifyTypingIfEnabled(sendTypingIndicator);
		return true;
	}

	notifyTypingIfEnabled(sendTypingIndicator);
	return false;
}

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
	const { sendTypingIndicator } = useSettings();
	const editorWrapperRef = useRef<HTMLDivElement>(null);
	const baseMinHeightPx = 70;
	const [maxHeightPx, setMaxHeightPx] = useState(0);
	const [charCount, setCharCount] = useState(0);
	const WHATSAPP_TEXT_MAX_CHARS = 4096;
	const MAX_HEIGHT_VIEWPORT_RATIO = 0.4;
	const UPDATE_DELAY_MS = 0;

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				bold: false,
				italic: false,
				strike: false,
				code: false,
			}),
			Youtube.configure({
				inline: false,
				width: 640,
				height: 360,
				controls: true,
				nocookie: true,
				allowFullscreen: true,
			}),
			SingleAsteriskBold,
			UnderscoreItalic,
			SingleTildeStrike,
			Code,
			Placeholder.configure({ placeholder }),
		],
		editorProps: {
			attributes: { class: "min-h-[2rem] text-xs leading-6 outline-none" },
			handleTextInput(view, from, to, text) {
				// Prevent input if adding this text would exceed the limit
				const currentText = view.state.doc.textContent;
				const newText =
					currentText.slice(0, from) + text + currentText.slice(to);
				if (countCharacters(newText) > WHATSAPP_TEXT_MAX_CHARS) {
					return true; // Block the input
				}
				// Notify typing listeners if enabled
				try {
					if (sendTypingIndicator) {
						const evt = new CustomEvent("chat:editor_event", {
							detail: { type: "chat:editor_update" },
						});
						window.dispatchEvent(evt);
					}
				} catch {
					// Keyboard event handling may fail in some contexts
				}
				return false; // Allow the input
			},
			handlePaste(view, _event, slice) {
				return handleEditorPaste(
					view as EditorPasteView,
					slice as unknown as PastedSlice,
					WHATSAPP_TEXT_MAX_CHARS,
					sendTypingIndicator
				);
			},
		},
		content: "",
		immediatelyRender: false,
	});

	// Track grapheme count of current editor content and enforce limit
	useEffect(() => {
		if (!editor) {
			return;
		}
		const updateCount = () => {
			try {
				const text = editor?.getText() || "";
				const count = countCharacters(text);
				setCharCount(count);

				// Enforce limit by truncating if exceeded
				if (count > WHATSAPP_TEXT_MAX_CHARS) {
					// Truncate to fit within limit (simple string truncation)
					const truncated = text.slice(0, WHATSAPP_TEXT_MAX_CHARS);
					// Set truncated content
					editor.commands.setContent(truncated);
					// Move cursor to end
					editor.commands.focus("end");
					setCharCount(WHATSAPP_TEXT_MAX_CHARS);
				}
			} catch {
				// Content truncation may fail in some contexts
			}
		};
		setTimeout(updateCount, UPDATE_DELAY_MS);
		editor.on("update", updateCount);
		return () => {
			try {
				editor.off("update", updateCount);
			} catch {
				// Editor event listener removal may fail
			}
		};
		// countCharacters is a stable function that does not change between renders
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editor]);

	// Compute max height (40vh) and keep it updated
	useEffect(() => {
		const compute = () =>
			setMaxHeightPx(
				Math.floor(window.innerHeight * MAX_HEIGHT_VIEWPORT_RATIO)
			);
		compute();
		window.addEventListener("resize", compute);
		return () => window.removeEventListener("resize", compute);
	}, []);

	// Auto-grow the editor wrapper height based on content up to maxHeightPx
	useEffect(() => {
		if (!editor) {
			return;
		}
		const adjust = () => {
			try {
				const wrapper = editorWrapperRef.current;
				const pm = editor?.view?.dom as HTMLElement | undefined;
				if (!(wrapper && pm)) {
					return;
				}
				wrapper.style.height = "auto";
				const desired = Math.max(baseMinHeightPx, pm.scrollHeight);
				const capped = Math.min(
					desired,
					Math.max(maxHeightPx, baseMinHeightPx)
				);
				wrapper.style.height = `${capped}px`;
				// ThemedScrollbar handles overflow
				pm.style.overflowY = "hidden";
			} catch {
				// DOM measurement may fail in some contexts
			}
		};
		setTimeout(adjust, UPDATE_DELAY_MS);
		editor.on("update", adjust);
		editor.on("selectionUpdate", adjust);
		editor.on("transaction", adjust);
		return () => {
			try {
				editor.off("update", adjust);
				editor.off("selectionUpdate", adjust);
				editor.off("transaction", adjust);
			} catch {
				// Editor event listener cleanup may fail
			}
		};
	}, [editor, maxHeightPx]);

	// Ensure editor editability matches state (inactive handled here)
	useEffect(() => {
		if (!editor) {
			return;
		}
		editor.setEditable(!(disabled || isInactive));
	}, [editor, disabled, isInactive]);

	const handleEmojiSelect = ({ emoji }: { emoji: string }) => {
		try {
			// Check if adding emoji would exceed limit
			const currentText = editor?.getText() || "";
			const newText = currentText + emoji;
			if (countCharacters(newText) > WHATSAPP_TEXT_MAX_CHARS) {
				// Don't insert if it would exceed limit
				return;
			}
			editor?.chain().focus().insertContent(emoji).run();
		} finally {
			setEmojiOpen(false);
		}
	};

	const effectiveDisabled = disabled || isInactive;

	return (
		<div className="space-y-2">
			<InputGroup
				aria-disabled={effectiveDisabled}
				className={cn(
					"!rounded-[8px_8px_21px_21px]",
					effectiveDisabled &&
						"cursor-not-allowed select-none opacity-50 focus-within:border-input focus-within:ring-0"
				)}
				data-inactive={isInactive ? "true" : undefined}
				inert={effectiveDisabled ? (true as unknown as undefined) : undefined}
				onFocusCapture={(e) => {
					if (effectiveDisabled) {
						try {
							(e.target as HTMLElement)?.blur?.();
						} catch {
							// Blur operation may fail in some contexts
						}
						e.preventDefault();
						e.stopPropagation();
					}
				}}
				onMouseDownCapture={(e) => {
					if (effectiveDisabled) {
						e.preventDefault();
						e.stopPropagation();
					}
				}}
			>
				{/* Inactivity message in top bar when messaging is disabled due to inactivity */}
				{isInactive && (
					<InputGroupAddon align="block-start" className="flex-shrink-0">
						<div className="flex w-full items-center justify-center py-1">
							<div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/60 px-3 py-1.5 font-medium text-foreground text-sm shadow-xs">
								<Clock className="h-4 w-4 opacity-70" />
								<span className="whitespace-pre-line text-center">
									{inactiveText}
								</span>
							</div>
						</div>
					</InputGroupAddon>
				)}
				{/* Toolbar */}
				{!effectiveDisabled && (
					<InputGroupAddon align="block-start" className="flex-shrink-0">
						<ChatFormatToolbar
							disabled={effectiveDisabled}
							editor={editor as unknown as EditorLike}
							isLocalized={isLocalized}
						/>
					</InputGroupAddon>
				)}
				{/* biome-ignore lint/a11y/useSemanticElements: custom rich text editor wrapper */}
				<div
					className={cn(
						"w-full overflow-hidden",
						effectiveDisabled
							? "!cursor-not-allowed select-none bg-muted/70"
							: "cursor-text bg-background",
						effectiveDisabled && "opacity-40"
					)}
					data-slot="input-group-control"
					onClick={() => {
						// Focus editor when clicking anywhere in the input area
						if (!effectiveDisabled) {
							try {
								editor?.commands.focus();
							} catch {
								// Editor focus may fail in some contexts
							}
						}
					}}
					onKeyDown={(e) => {
						if ((e.key === "Enter" || e.key === " ") && !effectiveDisabled) {
							editor?.commands.focus();
						}
					}}
					onMouseDown={(e: React.MouseEvent) => {
						if (effectiveDisabled) {
							e.preventDefault();
							e.stopPropagation();
							return;
						}
						// Focus the editor when clicking in the scroll area
						if (e.button === 0) {
							try {
								editor?.commands.focus();
							} catch {
								// Editor focus may fail in some contexts
							}
						}
					}}
					ref={editorWrapperRef}
					role="textbox"
					style={{ height: `${baseMinHeightPx}px`, maxHeight: "40vh" }}
					tabIndex={-1}
				>
					<ThemedScrollbar
						className={cn(
							"h-full w-full",
							effectiveDisabled
								? "cursor-not-allowed select-none"
								: "cursor-text"
						)}
						noScrollX
						style={{ height: "100%" }}
					>
						{/* biome-ignore lint/a11y/useSemanticElements: padding wrapper to make entire area clickable */}
						<div
							className={cn(
								"min-h-full px-3 py-0 text-xs leading-6",
								effectiveDisabled
									? "cursor-not-allowed select-none"
									: "cursor-text"
							)}
							onClick={(e) => {
								// Focus editor when clicking the padding area
								if (!effectiveDisabled) {
									e.stopPropagation();
									try {
										editor?.commands.focus();
									} catch {
										// Editor focus may fail in some contexts
									}
								}
							}}
							onKeyDown={(e) => {
								if (
									(e.key === "Enter" || e.key === " ") &&
									!effectiveDisabled
								) {
									editor?.commands.focus();
								}
							}}
							onMouseDown={(e) => {
								if (effectiveDisabled) {
									e.preventDefault();
									e.stopPropagation();
								}
							}}
							role="button"
							tabIndex={-1}
						>
							<EditorContent
								className={cn(
									"tiptap w-full",
									"[&_.ProseMirror]:min-h-full [&_.ProseMirror]:p-0 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:m-0",
									effectiveDisabled
										? "[&_.ProseMirror]:select-none [&_.ProseMirror]:opacity-70"
										: undefined
								)}
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
								onMouseDown={(e) => {
									if (effectiveDisabled) {
										e.preventDefault();
										e.stopPropagation();
									}
								}}
							/>
						</div>
					</ThemedScrollbar>
				</div>
				<InputGroupAddon align="block-end" className="flex-shrink-0">
					{/* Character counter */}
					<InputGroupText
						className={cn(
							"ml-auto",
							charCount > WHATSAPP_TEXT_MAX_CHARS
								? "text-destructive"
								: "text-muted-foreground"
						)}
					>
						{charCount}/{WHATSAPP_TEXT_MAX_CHARS}
					</InputGroupText>
					<Separator className="!h-4" orientation="vertical" />
					{/* Emoji (outline, rounded-full, icon-xs) */}
					<Popover onOpenChange={setEmojiOpen} open={emojiOpen}>
						<PopoverTrigger asChild>
							<InputGroupButton
								className="rounded-full"
								disabled={effectiveDisabled}
								size="icon-xs"
								type="button"
								variant="outline"
							>
								<Smile className="h-3.5 w-3.5" />
								<span className="sr-only">Emoji</span>
							</InputGroupButton>
						</PopoverTrigger>
						<PopoverContent
							align="start"
							className="w-fit p-0"
							side="top"
							sideOffset={8}
						>
							<EmojiPicker
								className="h-[21.375rem] rounded-lg border"
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
					{/* Send (default, rounded-full, icon-xs) */}
					<InputGroupButton
						className="rounded-full transition-all duration-200"
						disabled={
							charCount === 0 ||
							charCount > WHATSAPP_TEXT_MAX_CHARS ||
							effectiveDisabled ||
							isSending
						}
						onClick={(e) => {
							e.preventDefault();
							const html = (editor?.getHTML() || "").trim();
							const textOut = serializeHtmlToMarkers(html);
							if (textOut && !effectiveDisabled && !isSending) {
								onSend(textOut);
								editor?.commands.clearContent(true);
							}
						}}
						size="icon-xs"
						type="button"
						variant="default"
					>
						{isSending ? (
							<Spinner className="size-3 text-primary-foreground" />
						) : (
							<ArrowUp className="h-3 w-3 transition-transform duration-200" />
						)}
						<span className="sr-only">Send</span>
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
		</div>
	);
};
