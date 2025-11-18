'use client'

import type { Editor } from 'tldraw'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import '@/styles/tldraw.css'
import { useTheme } from 'next-themes'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { TldrawStoreState } from '@/features/documents/hooks/useTldrawStore'
import {
	useLanguageStore,
	useSettingsStore,
} from '@/infrastructure/store/app-store'
import { cn } from '@/lib/utils'

type DocumentEditorCanvasProps = {
	storeState: TldrawStoreState
	className?: string
	readOnly?: boolean
	focusMode?: boolean
	loadingLabel?: string
	errorMessage?: string
	children?: ReactNode
	onEditorMount?: (editor: Editor) => void
}

/**
 * TLDraw canvas component with loading/error handling.
 * Accepts an external TLDraw store state for flexible data loading workflows.
 */
export const DocumentEditorCanvas = ({
	storeState,
	className,
	readOnly = false,
	focusMode = false,
	errorMessage,
	children,
	onEditorMount,
}: DocumentEditorCanvasProps) => {
	const errorText = errorMessage ?? 'Unable to load canvas'
	const editorRef = useRef<Editor | null>(null)
	const wrapperRef = useRef<HTMLDivElement | null>(null)
	const { resolvedTheme } = useTheme()
	const { editorMinimalMode } = useSettingsStore()
	const { locale } = useLanguageStore()

	const readyStore = useMemo(
		() => (storeState.status === 'ready' ? storeState.store : null),
		[storeState]
	)

	const targetColorScheme = useMemo(() => {
		if (resolvedTheme) {
			return resolvedTheme
		}
		if (typeof window === 'undefined') {
			return 'light'
		}
		return document.documentElement.classList.contains('dark')
			? 'dark'
			: 'light'
	}, [resolvedTheme])

	const applyCanvasPreferences = useCallback(
		(editor: Editor) => {
			const instanceState = editor.getInstanceState()
			const updates: Partial<typeof instanceState> = {}

			// Enable grid by default
			if (!instanceState.isGridMode) {
				updates.isGridMode = true
			}

			// Set read-only state
			if (instanceState.isReadonly !== readOnly) {
				updates.isReadonly = readOnly
			}

			// Apply instance state updates
			if (Object.keys(updates).length > 0) {
				editor.updateInstanceState(updates)
			}

			// Sync theme via user preferences
			const shouldBeDark = targetColorScheme === 'dark'
			if (editor.user.getIsDarkMode() !== shouldBeDark) {
				editor.user.updateUserPreferences({
					colorScheme: shouldBeDark ? 'dark' : 'light',
				})
			}

			// Sync locale via user preferences
			editor.user.updateUserPreferences({
				locale,
			})
		},
		[readOnly, targetColorScheme, locale]
	)

	useEffect(
		() => () => {
			editorRef.current = null
		},
		[]
	)

	useEffect(() => {
		const editor = editorRef.current
		if (!editor) {
			return
		}
		applyCanvasPreferences(editor)
	}, [applyCanvasPreferences])

	useEffect(() => {
		if (!readyStore) {
			return
		}
		const editor = editorRef.current
		if (!editor) {
			return
		}
		applyCanvasPreferences(editor)
	}, [readyStore, applyCanvasPreferences])

	let content: ReactNode

	if (storeState.status === 'loading') {
		// Render transparent container during loading - status indicator shows loading state separately
		// Use transparent background to match theme instead of white
		content = <div className="h-full w-full bg-transparent" />
	} else if (storeState.status === 'error') {
		content = (
			<div className="flex h-full w-full items-center justify-center px-4 text-destructive/80 text-sm">
				{errorText}
			</div>
		)
	} else {
		content = (
			<Tldraw
				hideUi={focusMode}
				inferDarkMode={false}
				onMount={(editor) => {
					editorRef.current = editor
					applyCanvasPreferences(editor)
					if (onEditorMount) {
						onEditorMount(editor)
					}
				}}
				store={storeState.store}
			>
				{children}
			</Tldraw>
		)
	}

	return (
		<div
			className={cn(
				'tldraw-canvas-wrapper relative flex h-full w-full items-stretch',
				className
			)}
			data-editor-minimal-mode={editorMinimalMode}
			ref={wrapperRef}
			suppressHydrationWarning
		>
			{content}
		</div>
	)
}
