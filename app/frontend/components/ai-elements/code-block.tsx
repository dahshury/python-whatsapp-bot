'use client'

import { Check, Copy } from 'lucide-react'
import { useTheme } from 'next-themes'
import React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
	atomDark,
	oneLight,
} from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { writeClipboardText } from '@/shared/libs/clipboard'
import { cn } from '@/shared/libs/utils'
import { Button } from '@/shared/ui/button'

type CodeBlockProps = React.HTMLAttributes<HTMLDivElement> & {
	code: string
	language: string
	showLineNumbers?: boolean
	children?: React.ReactNode
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
	code,
	language,
	showLineNumbers = false,
	children,
	className,
	...props
}) => {
	const { resolvedTheme } = useTheme()
	const isDark = resolvedTheme === 'dark'
	const syntaxTheme = isDark ? atomDark : oneLight

	return (
		<div
			className={cn(
				'relative w-full rounded-md border border-border bg-muted font-mono text-sm',
				className
			)}
			{...props}
		>
			{children && (
				<div className="absolute top-2 right-2 z-10">{children}</div>
			)}
			<SyntaxHighlighter
				customStyle={{
					margin: 0,
					padding: '0.5rem 0.75rem',
					background: 'transparent',
					fontSize: '0.75rem',
					lineHeight: '1.5',
				}}
				language={language}
				PreTag="div"
				showLineNumbers={showLineNumbers}
				style={syntaxTheme}
				wrapLines={true}
			>
				{code}
			</SyntaxHighlighter>
		</div>
	)
}

type CodeBlockCopyButtonProps = React.ComponentProps<typeof Button> & {
	code?: string
	onCopy?: () => void
	onError?: (error: Error) => void
	timeout?: number
}

export const CodeBlockCopyButton: React.FC<CodeBlockCopyButtonProps> = ({
	code,
	onCopy,
	onError,
	timeout = 2000,
	className,
	children,
	...props
}) => {
	const [copied, setCopied] = React.useState(false)

	const handleCopy = async () => {
		if (!code) {
			return
		}

		try {
			await writeClipboardText(code)
			setCopied(true)
			onCopy?.()
			setTimeout(() => {
				setCopied(false)
			}, timeout)
		} catch (error) {
			onError?.(error instanceof Error ? error : new Error(String(error)))
		}
	}

	return (
		<Button
			aria-label={copied ? 'Copied!' : 'Copy code'}
			className={cn('h-8 w-8 p-0', className)}
			onClick={handleCopy}
			size="icon"
			variant="ghost"
			{...props}
		>
			{children ||
				(copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />)}
		</Button>
	)
}
