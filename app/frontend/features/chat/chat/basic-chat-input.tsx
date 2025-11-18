'use client'

import { cn } from '@shared/libs/utils'
import Code from '@tiptap/extension-code'
import Placeholder from '@tiptap/extension-placeholder'
import type { AnyExtension } from '@tiptap/react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Button } from '@ui/button'
import { Separator } from '@ui/separator'
import { ArrowUp, Clock, Smile, Square } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	PromptInputHeader,
} from '@/components/ai-elements/prompt-input'
import { logger } from '@/shared/libs/logger'
import {
	SingleAsteriskBold,
	SingleTildeStrike,
	UnderscoreItalic,
} from '@/shared/libs/tiptap-extensions'
import { ButtonGroup } from '@/shared/ui/button-group'
import { EmojiPicker } from '@/shared/ui/emoji-picker'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupText,
} from '@/shared/ui/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Spinner } from '@/shared/ui/spinner'
import { ThemedScrollbar } from '@/shared/ui/themed-scrollbar'
import type { EditorLike } from './chat-format-toolbar'
import { ChatFormatToolbar } from './chat-format-toolbar'

const BASE_MIN_HEIGHT_PX = 70
const WHATSAPP_TEXT_MAX_CHARS = 4096
const MAX_HEIGHT_VIEWPORT_RATIO = 0.4
const PERCENTAGE_MULTIPLIER = 100

const logChatInputWarning = (context: string, error: unknown) => {
	logger.warn(`[BasicChatInput] ${context}`, error)
}

const countCharacters = (input: string): number => input.length

const getSendButtonIcon = (
	showStopAgentButton: boolean,
	isSending: boolean
): React.ReactNode => {
	if (showStopAgentButton) {
		return <Square className="h-3 w-3" />
	}
	if (isSending) {
		return <Spinner className="size-3" />
	}
	return <ArrowUp className="h-3 w-3 transition-transform duration-200" />
}

export const BasicChatInput: React.FC<{
	onSend: (text: string) => void
	onStopAgentResponse?: () => void
	disabled?: boolean
	placeholder?: string
	isSending?: boolean
	canStopAgentResponse?: boolean
	isInactive?: boolean
	inactiveText?: string | undefined
	isLocalized?: boolean
	maxCharacters?: number | null
	actionSlot?: React.ReactNode
	onTyping?: () => void
}> = ({
	onSend,
	onStopAgentResponse,
	disabled = false,
	placeholder = 'Type message...',
	isSending = false,
	canStopAgentResponse = false,
	isInactive = false,
	inactiveText,
	isLocalized = false,
	maxCharacters = WHATSAPP_TEXT_MAX_CHARS,
	actionSlot = null,
	onTyping,
}) => {
	const [emojiOpen, setEmojiOpen] = useState(false)
	const [wrapperHeight, setWrapperHeight] = useState(BASE_MIN_HEIGHT_PX)
	const contentWrapperRef = useRef<HTMLDivElement>(null)
	const [maxHeightPx, setMaxHeightPx] = useState(0)

	const onTypingRef = useRef(onTyping)
	const submitMessageRef = useRef<(() => void) | null>(null)
	const handleEmojiSelectRef = useRef<
		((params: { emoji: string }) => void) | null
	>(null)

	// Update refs when props change
	useEffect(() => {
		onTypingRef.current = onTyping
	}, [onTyping])

	const editor = useEditor({
		immediatelyRender: false,
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
			Placeholder.configure({
				placeholder,
			}),
		] as AnyExtension[],
		editorProps: {
			attributes: {
				class: 'chat-editor-content',
				style: 'min-height: 70px;',
				'data-gramm': 'false',
				'data-gramm_editor': 'false',
				'data-enable-grammarly': 'false',
				spellcheck: 'true',
			},
			handleKeyDown: (_view: unknown, event: KeyboardEvent) => {
				if (event.key === 'Enter' && !event.shiftKey) {
					event.preventDefault()
					submitMessageRef.current?.()
					return true
				}
				return false
			},
		},
		editable: !(disabled || isInactive),
		onUpdate: () => {
			onTypingRef.current?.()
		},
	})

	const characterLimit =
		typeof maxCharacters === 'number' ? maxCharacters : WHATSAPP_TEXT_MAX_CHARS
	const limitEnabled = Number.isFinite(characterLimit) && characterLimit > 0

	const editorText = useMemo(() => {
		if (!editor) {
			return ''
		}
		return editor.getText()
	}, [editor?.state.doc, editor])

	const charCount = countCharacters(editorText)
	const trimmedValue = useMemo(() => editorText.trim(), [editorText])

	const dispatchTypingUpdate = useCallback(() => {
		try {
			onTyping?.()
		} catch (error) {
			logChatInputWarning('Dispatching typing update failed', error)
		}
	}, [onTyping])

	const blurTargetSafely = useCallback(
		(target: EventTarget | null | undefined) => {
			const element = target as HTMLElement | null
			if (!element?.blur) {
				return
			}
			try {
				element.blur()
			} catch (error) {
				logChatInputWarning('Blurring input target failed', error)
			}
		},
		[]
	)

	useEffect(() => {
		const compute = () =>
			setMaxHeightPx(Math.floor(window.innerHeight * MAX_HEIGHT_VIEWPORT_RATIO))
		compute()
		window.addEventListener('resize', compute)
		return () => window.removeEventListener('resize', compute)
	}, [])

	const adjustHeight = useCallback(() => {
		const contentWrapper = contentWrapperRef.current
		if (!(editor && contentWrapper)) {
			return
		}

		try {
			// Get the Tiptap editor's content element
			const editorElement = contentWrapper.querySelector(
				'.ProseMirror'
			) as HTMLElement
			if (!editorElement) {
				return
			}

			// Measure the editor content's scrollHeight (actual content height)
			const desired = Math.max(BASE_MIN_HEIGHT_PX, editorElement.scrollHeight)
			const maxAllowed = Math.max(maxHeightPx, BASE_MIN_HEIGHT_PX)
			const capped = Math.min(desired, maxAllowed)

			// Set wrapper height immediately to allow expansion
			setWrapperHeight(capped)

			// Use requestAnimationFrame to fine-tune after render
			requestAnimationFrame(() => {
				if (!(contentWrapper && editor)) {
					return
				}

				// Re-measure after render to ensure accuracy
				const editorElementAfterRender = contentWrapper.querySelector(
					'.ProseMirror'
				) as HTMLElement
				if (editorElementAfterRender) {
					const finalDesired = Math.max(
						BASE_MIN_HEIGHT_PX,
						editorElementAfterRender.scrollHeight
					)
					const finalCapped = Math.min(finalDesired, maxAllowed)
					setWrapperHeight(finalCapped)
				}
			})
		} catch (error) {
			logChatInputWarning('Adjusting editor height failed', error)
		}
	}, [editor, maxHeightPx])

	// Listen to editor updates to adjust height dynamically
	useEffect(() => {
		if (!editor) {
			return
		}

		// Initial adjustment
		adjustHeight()

		// Listen to all editor updates (content changes, selection changes, etc.)
		const handleUpdate = () => {
			adjustHeight()
		}

		editor.on('update', handleUpdate)
		editor.on('selectionUpdate', handleUpdate)

		return () => {
			try {
				editor.off('update', handleUpdate)
				editor.off('selectionUpdate', handleUpdate)
			} catch (error) {
				logChatInputWarning('Removing editor update listeners failed', error)
			}
		}
	}, [editor, adjustHeight])

	// Update editor editable state when props change
	useEffect(() => {
		if (!editor) {
			return
		}
		editor.setEditable(!(disabled || isInactive))
	}, [editor, disabled, isInactive])

	// Create stable callback that doesn't change reference
	const handleEmojiSelectInternal = useCallback(
		({ emoji }: { emoji: string }) => {
			if (!editor || editor.isDestroyed || !emoji) {
				return
			}

			const currentText = editor.getText() || ''

			if (
				limitEnabled &&
				countCharacters(currentText + emoji) > characterLimit
			) {
				return
			}

			try {
				const result = editor.chain().focus().insertContent(emoji).run()

				if (result) {
					setEmojiOpen(false)
				}
			} catch (error) {
				logChatInputWarning('Inserting emoji failed', error)
			}
		},
		[characterLimit, editor, limitEnabled]
	)

	// Update ref when callback changes
	useEffect(() => {
		handleEmojiSelectRef.current = handleEmojiSelectInternal
	}, [handleEmojiSelectInternal])

	// Stable callback that never changes reference - this is what we pass to EmojiPicker
	const handleEmojiSelect = useCallback((params: { emoji: string }) => {
		handleEmojiSelectRef.current?.(params)
	}, [])

	const editorReadOnly = disabled || isInactive
	const composerLocked = disabled
	const showStopAgentButton =
		Boolean(onStopAgentResponse) && canStopAgentResponse
	const sendButtonDisabled = showStopAgentButton
		? false
		: trimmedValue.length === 0 ||
			(limitEnabled && charCount > characterLimit) ||
			editorReadOnly ||
			isSending
	const sendButtonVariant = showStopAgentButton ? 'destructive' : 'outline'
	const sendButtonLabel = showStopAgentButton ? 'Stop agent response' : 'Send'

	const submitMessage = useCallback(() => {
		if (showStopAgentButton) {
			onStopAgentResponse?.()
			return
		}
		if (editorReadOnly || isSending || !editor) {
			return
		}
		const outgoing = trimmedValue
		if (!outgoing) {
			return
		}
		// Get text content from editor (maintains compatibility with existing backend)
		// The formatting marks (*bold*, _italic_, etc.) are preserved in the text
		const text = editor.getText()
		onSend(text.trim())
		// Clear editor content
		editor.commands.clearContent()
		dispatchTypingUpdate()
		requestAnimationFrame(() => {
			editor.commands.focus()
		})
	}, [
		dispatchTypingUpdate,
		editor,
		editorReadOnly,
		isSending,
		onSend,
		onStopAgentResponse,
		showStopAgentButton,
		trimmedValue,
	])

	// Store submitMessage in ref for use in editor handleKeyDown
	useEffect(() => {
		submitMessageRef.current = submitMessage
	}, [submitMessage])

	return (
		<PromptInput
			className="space-y-2"
			onSubmit={(event) => {
				event.preventDefault()
				submitMessage()
			}}
			style={{
				backgroundColor: 'hsl(var(--card))',
				background: 'hsl(var(--card))',
			}}
		>
			<PromptInputHeader className="sr-only">
				System Agent Chat
			</PromptInputHeader>
			<PromptInputBody>
				<InputGroup
					aria-disabled={editorReadOnly}
					className={cn(
						'!rounded-[8px_8px_21px_21px]',
						editorReadOnly &&
							'cursor-not-allowed select-none opacity-50 focus-within:border-input focus-within:ring-0'
					)}
					data-inactive={isInactive ? 'true' : undefined}
					inert={composerLocked ? (true as unknown as undefined) : undefined}
					onFocusCapture={(event) => {
						if (composerLocked) {
							blurTargetSafely(event.target)
							event.preventDefault()
							event.stopPropagation()
						}
					}}
					onMouseDownCapture={(event) => {
						if (composerLocked) {
							event.preventDefault()
							event.stopPropagation()
						}
					}}
					style={{
						backgroundColor: 'hsl(var(--card))',
						background: 'hsl(var(--card))',
					}}
				>
					{isInactive && (
						<InputGroupAddon
							align="block-start"
							className="flex-shrink-0"
							style={{
								backgroundColor: 'hsl(var(--card))',
								background: 'hsl(var(--card))',
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
					<InputGroupAddon
						align="block-start"
						className="flex-shrink-0"
						style={{
							backgroundColor: 'hsl(var(--card))',
							background: 'hsl(var(--card))',
						}}
					>
						<div className="flex w-full items-center justify-between gap-2">
							<ChatFormatToolbar
								className="flex items-center gap-1"
								disabled={editorReadOnly}
								editor={editor as EditorLike | null}
								isLocalized={isLocalized}
							/>
							{actionSlot ? (
								<div className="flex flex-shrink-0 items-center">
									{actionSlot}
								</div>
							) : null}
						</div>
					</InputGroupAddon>
					<div
						className={cn(
							'w-full',
							editorReadOnly
								? '!cursor-not-allowed select-none'
								: 'cursor-text',
							editorReadOnly && 'opacity-40'
						)}
						data-slot="input-group-control"
						style={{
							backgroundColor: editorReadOnly
								? 'hsl(var(--muted) / 0.7)'
								: 'hsl(var(--card))',
							background: editorReadOnly
								? 'hsl(var(--muted) / 0.7)'
								: 'hsl(var(--card))',
							maxHeight: '40vh',
						}}
						tabIndex={editorReadOnly ? -1 : 0}
					>
						<ThemedScrollbar
							className={cn(
								'w-full',
								editorReadOnly
									? 'cursor-not-allowed select-none'
									: 'cursor-text'
							)}
							noScrollX
							permanentTrackY={false}
							removeTrackYWhenNotUsed={true}
							style={{
								height: `${wrapperHeight}px`,
								maxHeight: '40vh',
							}}
						>
							<div
								className="px-3 py-0"
								ref={contentWrapperRef}
								style={{
									backgroundColor: 'hsl(var(--card))',
									background: 'hsl(var(--card))',
								}}
							>
								<EditorContent
									className={cn(
										editorReadOnly
											? 'cursor-not-allowed select-none opacity-70'
											: 'cursor-text'
									)}
									editor={editor}
								/>
							</div>
						</ThemedScrollbar>
					</div>
					<InputGroupAddon
						align="block-end"
						className="flex-shrink-0"
						style={{
							backgroundColor: 'hsl(var(--card))',
							background: 'hsl(var(--card))',
						}}
					>
						<div className="ml-auto flex items-center gap-2">
							{limitEnabled && (
								<>
									<InputGroupText
										className={cn(
											charCount > characterLimit
												? 'text-destructive'
												: 'text-muted-foreground'
										)}
									>
										{charCount}/{characterLimit}
									</InputGroupText>
									<Separator className="!h-4" orientation="vertical" />
								</>
							)}
							<ButtonGroup>
								<Popover onOpenChange={setEmojiOpen} open={emojiOpen}>
									<PopoverTrigger asChild>
										<Button
											className="h-8 w-8 rounded-full p-0"
											disabled={editorReadOnly || emojiOpen}
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
								<Button
									className="relative h-8 w-8 overflow-hidden rounded-full p-0 transition-all duration-200"
									disabled={sendButtonDisabled}
									onClick={(event) => {
										event.preventDefault()
										submitMessage()
									}}
									size="icon"
									type="button"
									variant={sendButtonVariant}
								>
									{limitEnabled &&
										charCount > 0 &&
										charCount <= characterLimit &&
										!showStopAgentButton && (
											<span
												className="absolute right-0 bottom-0 left-0 transition-all duration-200"
												style={{
													height: `${(charCount / characterLimit) * PERCENTAGE_MULTIPLIER}%`,
													backgroundColor: 'hsl(var(--primary))',
												}}
											/>
										)}
									<span className="relative z-10 flex items-center justify-center">
										{getSendButtonIcon(showStopAgentButton, isSending ?? false)}
									</span>
									<span className="sr-only">{sendButtonLabel}</span>
								</Button>
							</ButtonGroup>
						</div>
					</InputGroupAddon>
				</InputGroup>
			</PromptInputBody>
			<PromptInputFooter className="sr-only">
				Character limit {characterLimit}
			</PromptInputFooter>
		</PromptInput>
	)
}
