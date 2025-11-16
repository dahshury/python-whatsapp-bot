"use client";

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
import { Button } from "@ui/button";
import { Separator } from "@ui/separator";
import { ArrowUp, Clock, Smile } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/infrastructure/store/app-store";
import { logger } from "@/shared/libs/logger";
import { ButtonGroup } from "@/shared/ui/button-group";
import { EmojiPicker } from "@/shared/ui/emoji-picker";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/shared/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Spinner } from "@/shared/ui/spinner";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";
import { ChatFormatToolbar, type EditorLike } from "./chat-format-toolbar";

const BASE_MIN_HEIGHT_PX = 70;
const WHATSAPP_TEXT_MAX_CHARS = 4096;
const MAX_HEIGHT_VIEWPORT_RATIO = 0.4;
const PERCENTAGE_MULTIPLIER = 100;

const logChatInputWarning = (context: string, error: unknown) => {
  logger.warn(`[BasicChatInput] ${context}`, error);
};

// Character counter utilities (module-level stable)
// WhatsApp counts by UTF-16 code units, not grapheme clusters
function countCharacters(input: string): number {
  // Use length which counts UTF-16 code units
  // This matches WhatsApp's character counting behavior
  return input.length;
}

export const BasicChatInput: React.FC<{
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isSending?: boolean;
  isInactive?: boolean;
  inactiveText?: string;
  isLocalized?: boolean;
  maxCharacters?: number | null;
  actionSlot?: React.ReactNode;
}> = ({
  onSend,
  disabled = false,
  placeholder = "Type message...",
  isSending = false,
  isInactive = false,
  inactiveText,
  isLocalized = false,
  maxCharacters = WHATSAPP_TEXT_MAX_CHARS,
  actionSlot = null,
}) => {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const { sendTypingIndicator } = useSettingsStore();
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [maxHeightPx, setMaxHeightPx] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const characterLimit =
    typeof maxCharacters === "number" ? maxCharacters : WHATSAPP_TEXT_MAX_CHARS;
  const limitEnabled =
    Number.isFinite(characterLimit) && characterLimit > 0;

  const dispatchTypingUpdate = () => {
    if (!sendTypingIndicator) {
      return;
    }
    try {
      const evt = new CustomEvent("chat:editor_event", {
        detail: { type: "chat:editor_update" },
      });
      window.dispatchEvent(evt);
    } catch (error) {
      logChatInputWarning("Dispatching typing update failed", error);
    }
  };

  const focusEditorSafely = () => {
    try {
      editor?.commands.focus();
    } catch (error) {
      logChatInputWarning("Focusing editor failed", error);
    }
  };

  const blurTargetSafely = (
    target: EventTarget | null | undefined,
    context: string
  ) => {
    const element = target as HTMLElement | null;
    if (!element?.blur) {
      return;
    }
    try {
      element.blur();
    } catch (error) {
      logChatInputWarning(context, error);
    }
  };

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
        if (limitEnabled && countCharacters(newText) > characterLimit) {
          return true; // Block the input
        }
        // Notify typing listeners if enabled
        dispatchTypingUpdate();
        return false; // Allow the input
      },
      handlePaste(view, _event, slice) {
        // Extract text from the pasted content
        let pastedText = "";
        const fragment = slice.content;
        for (let index = 0; index < fragment.childCount; index += 1) {
          const node = fragment.child(index);
          if (node?.textContent) {
            pastedText += node.textContent;
          }
        }

        // Check if paste would exceed limit
        const currentText = view.state.doc.textContent;
        const { from, to } = view.state.selection;
        const newText =
          currentText.slice(0, from) + pastedText + currentText.slice(to);
        if (limitEnabled && countCharacters(newText) > characterLimit) {
          // Try to paste truncated version if possible
          const availableSpace =
            characterLimit -
            countCharacters(currentText.slice(0, from) + currentText.slice(to));
          if (availableSpace > 0) {
            // Truncate to fit
            const truncated = pastedText.slice(0, availableSpace);
            // Insert truncated text manually
            const tr = view.state.tr.insertText(truncated, from, to);
            view.dispatch(tr);
          }
          dispatchTypingUpdate();
          return true; // Block default paste behavior
        }
        dispatchTypingUpdate();
        return false; // Allow the paste
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
        if (limitEnabled && count > characterLimit) {
          // Truncate to fit within limit (simple string truncation)
          const truncated = text.slice(0, characterLimit);
          // Set truncated content
          editor.commands.setContent(truncated);
          // Move cursor to end
          editor.commands.focus("end");
          setCharCount(characterLimit);
        }
      } catch (error) {
        logChatInputWarning("Updating character count failed", error);
      }
    };
    setTimeout(updateCount, 0);
    editor.on("update", updateCount);
    return () => {
      try {
        editor.off("update", updateCount);
      } catch (error) {
        logChatInputWarning("Removing update listener failed", error);
      }
    };
  }, [editor, characterLimit, limitEnabled]);

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
        // Store current height to prevent layout shift
        const currentHeight = wrapper.offsetHeight;
        wrapper.style.height = "auto";
        const desired = Math.max(BASE_MIN_HEIGHT_PX, pm.scrollHeight);
        const capped = Math.min(
          desired,
          Math.max(maxHeightPx, BASE_MIN_HEIGHT_PX)
        );
        // Only update if height actually changed to prevent unnecessary reflows
        if (Math.abs(capped - currentHeight) > 1) {
          wrapper.style.height = `${capped}px`;
        } else {
          wrapper.style.height = `${currentHeight}px`;
        }
        // ThemedScrollbar handles overflow
        pm.style.overflowY = "hidden";
      } catch (error) {
        logChatInputWarning("Adjusting editor height failed", error);
      }
    };
    setTimeout(adjust, 0);
    // Only adjust on actual content updates, not selection/focus changes
    editor.on("update", adjust);
    return () => {
      try {
        editor.off("update", adjust);
      } catch (error) {
        logChatInputWarning("Removing adjust listeners failed", error);
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
      if (!editor) {
        return;
      }
      // Check if adding emoji would exceed limit
      const currentText = editor.getText() || "";
      const newText = currentText + emoji;
      if (limitEnabled && countCharacters(newText) > characterLimit) {
        // Don't insert if it would exceed limit
        return;
      }
      // Insert emoji at current cursor position
      editor.chain().focus().insertContent(emoji).run();
    } catch (error) {
      logChatInputWarning("Inserting emoji failed", error);
    } finally {
      setEmojiOpen(false);
    }
  };

  const effectiveDisabled = disabled || isInactive;

  return (
    <div
      className="space-y-2"
      style={{
        backgroundColor: "hsl(var(--card))",
        background: "hsl(var(--card))",
      }}
    >
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
            blurTargetSafely(e.target, "Blurring disabled input target failed");
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
        style={{
          backgroundColor: "hsl(var(--card))",
          background: "hsl(var(--card))",
        }}
      >
        {/* Inactivity message in top bar when messaging is disabled due to inactivity */}
        {isInactive && (
          <InputGroupAddon
            align="block-start"
            className="flex-shrink-0"
            style={{
              backgroundColor: "hsl(var(--card))",
              background: "hsl(var(--card))",
            }}
          >
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
        {/* Toolbar & actions */}
        <InputGroupAddon
          align="block-start"
          className="flex-shrink-0"
          style={{
            backgroundColor: "hsl(var(--card))",
            background: "hsl(var(--card))",
          }}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <ChatFormatToolbar
              className="flex items-center gap-1"
              disabled={effectiveDisabled}
              editor={editor as unknown as EditorLike}
              isLocalized={isLocalized}
            />
            {actionSlot ? (
              <div className="flex flex-shrink-0 items-center">{actionSlot}</div>
            ) : null}
          </div>
        </InputGroupAddon>
        {/* biome-ignore lint/a11y/useSemanticElements: custom rich text editor wrapper */}
        <div
          className={cn(
            "w-full overflow-hidden",
            effectiveDisabled
              ? "!cursor-not-allowed select-none"
              : "cursor-text",
            effectiveDisabled && "opacity-40"
          )}
          data-slot="input-group-control"
          onClick={() => {
            // Focus editor when clicking anywhere in the input area
            if (!effectiveDisabled) {
              focusEditorSafely();
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !effectiveDisabled) {
              focusEditorSafely();
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
              focusEditorSafely();
            }
          }}
          ref={editorWrapperRef}
          role="textbox"
          style={{
            backgroundColor: effectiveDisabled
              ? "hsl(var(--muted) / 0.7)"
              : "hsl(var(--card))",
            background: effectiveDisabled
              ? "hsl(var(--muted) / 0.7)"
              : "hsl(var(--card))",
            height: `${BASE_MIN_HEIGHT_PX}px`,
            maxHeight: "40vh",
          }}
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
            style={{
              height: "100%",
              backgroundColor: "hsl(var(--card))",
              background: "hsl(var(--card))",
            }}
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
                  focusEditorSafely();
                }
              }}
              onKeyDown={(e) => {
                if (
                  (e.key === "Enter" || e.key === " ") &&
                  !effectiveDisabled
                ) {
                  focusEditorSafely();
                }
              }}
              onMouseDown={(e) => {
                if (effectiveDisabled) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              role="button"
              style={{
                backgroundColor: "hsl(var(--card))",
                background: "hsl(var(--card))",
              }}
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
        <InputGroupAddon
          align="block-end"
          className="flex-shrink-0"
          style={{
            backgroundColor: "hsl(var(--card))",
            background: "hsl(var(--card))",
          }}
        >
          <div className="ml-auto flex items-center gap-2">
            {/* Character counter */}
            {limitEnabled && (
              <>
                <InputGroupText
                  className={cn(
                    charCount > characterLimit
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {charCount}/{characterLimit}
                </InputGroupText>
                <Separator className="!h-4" orientation="vertical" />
              </>
            )}
            {/* Emoji and Send buttons in a ButtonGroup */}
            <ButtonGroup>
              {/* Emoji (outline, rounded-full, icon-xs) */}
              <Popover onOpenChange={setEmojiOpen} open={emojiOpen}>
                <PopoverTrigger asChild>
                  <Button
                    className="h-8 w-8 rounded-full p-0"
                    disabled={effectiveDisabled || emojiOpen}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Smile className="h-3.5 w-3.5" />
                    <span className="sr-only">Emoji</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-fit p-0"
                  side="top"
                  sideOffset={8}
                >
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                </PopoverContent>
              </Popover>
              {/* Send (outline variant, fills with primary color as characters are added) */}
              <Button
                className="relative h-8 w-8 overflow-hidden rounded-full p-0 transition-all duration-200"
                disabled={
                  charCount === 0 ||
                  (limitEnabled && charCount > characterLimit) ||
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
                size="icon"
                type="button"
                variant="outline"
              >
                {/* Fill overlay that grows from bottom with primary color */}
                {limitEnabled &&
                  charCount > 0 &&
                  charCount <= characterLimit && (
                    <span
                      className="absolute right-0 bottom-0 left-0 transition-all duration-200"
                      style={{
                        height: `${(charCount / characterLimit) * PERCENTAGE_MULTIPLIER}%`,
                        backgroundColor: "hsl(var(--primary))",
                      }}
                    />
                  )}
                {/* Content layer - icons should be above the fill */}
                <span className="relative z-10 flex items-center justify-center">
                  {isSending ? (
                    <Spinner className="size-3" />
                  ) : (
                    <ArrowUp className="h-3 w-3 transition-transform duration-200" />
                  )}
                </span>
                <span className="sr-only">Send</span>
              </Button>
            </ButtonGroup>
          </div>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
};
