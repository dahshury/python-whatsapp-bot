'use client'

import {
	CheckCircle2,
	ChevronDown,
	Circle,
	Loader2,
	XCircle,
} from 'lucide-react'
import React from 'react'
import { cn } from '@/shared/libs/utils'
import { Badge } from '@/shared/ui/badge'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { CodeBlock, CodeBlockCopyButton } from './code-block'

export type ToolState =
	| 'input-streaming'
	| 'input-available'
	| 'output-available'
	| 'output-error'

type ToolProps = React.ComponentProps<typeof Collapsible>

export const Tool: React.FC<ToolProps> = ({ children, ...props }) => (
	<Collapsible
		className="w-full max-w-full rounded-lg border border-border bg-card"
		defaultOpen={props.defaultOpen ?? true}
		{...props}
	>
		{children}
	</Collapsible>
)

type ToolHeaderProps = Omit<
	React.ComponentProps<typeof CollapsibleTrigger>,
	'type'
> & {
	type: string
	state: ToolState
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({
	type,
	state,
	className,
	children,
	...props
}) => {
	const getStateIcon = () => {
		switch (state) {
			case 'input-streaming':
			case 'input-available':
				return <Loader2 className="size-4 animate-spin text-muted-foreground" />
			case 'output-available':
				return (
					<CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
				)
			case 'output-error':
				return <XCircle className="size-4 text-destructive" />
			default:
				return <Circle className="size-4 text-muted-foreground" />
		}
	}

	const getStateBadge = () => {
		switch (state) {
			case 'input-streaming':
				return <Badge variant="secondary">Streaming</Badge>
			case 'input-available':
				return <Badge variant="secondary">Running</Badge>
			case 'output-available':
				return (
					<Badge className="bg-green-600 dark:bg-green-500" variant="default">
						Completed
					</Badge>
				)
			case 'output-error':
				return <Badge variant="destructive">Error</Badge>
			default:
				return null
		}
	}

	return (
		<CollapsibleTrigger
			className={cn(
				'flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition hover:bg-muted/50 [&[data-state=open]_svg:last-child]:rotate-180',
				className
			)}
			{...props}
		>
			<div className="flex min-w-0 flex-1 items-center gap-3">
				{getStateIcon()}
				<span className="truncate font-medium text-sm" title={type}>
					{type}
				</span>
				{getStateBadge()}
			</div>
			<ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
			{children}
		</CollapsibleTrigger>
	)
}

export const ToolContent: React.FC<
	React.ComponentProps<typeof CollapsibleContent>
> = ({ children, className, ...props }) => (
	<CollapsibleContent
		className={cn(
			'overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
			className
		)}
		{...props}
	>
		<div className="border-t px-4 pt-2 pb-2">{children}</div>
	</CollapsibleContent>
)

type ToolInputProps = React.HTMLAttributes<HTMLDivElement> & {
	input: unknown
}

export const ToolInput: React.FC<ToolInputProps> = ({
	input,
	className,
	...props
}) => {
	const formatInput = (value: unknown): string => {
		if (value === null || value === undefined) {
			return ''
		}
		if (typeof value === 'string') {
			try {
				const parsed = JSON.parse(value)
				return JSON.stringify(parsed, null, 2)
			} catch {
				return value
			}
		}
		return JSON.stringify(value, null, 2)
	}

	const inputText = formatInput(input)
	if (!inputText.trim()) {
		return null
	}

	return (
		<div className={cn('space-y-1.5', className)} {...props}>
			<div className="mb-1.5 flex items-center gap-2 font-medium text-muted-foreground text-xs">
				<span>Input</span>
			</div>
			<CodeBlock code={inputText} language="json" showLineNumbers={false}>
				<CodeBlockCopyButton code={inputText} />
			</CodeBlock>
		</div>
	)
}

type ToolOutputProps = React.HTMLAttributes<HTMLDivElement> & {
	output?: React.ReactNode
	errorText?: string | null
}

export const ToolOutput: React.FC<ToolOutputProps> = ({
	output,
	errorText,
	className,
	...props
}) => {
	const formatOutput = (value: unknown): string => {
		if (value === null || value === undefined) {
			return ''
		}
		if (typeof value === 'string') {
			try {
				const parsed = JSON.parse(value)
				return JSON.stringify(parsed, null, 2)
			} catch {
				return value
			}
		}
		return JSON.stringify(value, null, 2)
	}

	if (errorText) {
		return (
			<div className={cn('space-y-1.5', className)} {...props}>
				<div className="mb-1.5 flex items-center gap-2 font-medium text-destructive text-xs">
					<span>Error</span>
				</div>
				<div className="rounded-md border border-destructive/50 bg-destructive/10 p-2.5 text-destructive text-sm">
					{errorText}
				</div>
			</div>
		)
	}

	if (!output) {
		return (
			<div className={cn('space-y-1.5', className)} {...props}>
				<div className="mb-1.5 flex items-center gap-2 font-medium text-muted-foreground text-xs">
					<span>Output</span>
				</div>
				<div className="text-muted-foreground text-xs opacity-60">
					No output
				</div>
			</div>
		)
	}

	// If output is a React element, render it directly
	if (React.isValidElement(output)) {
		return (
			<div className={cn('space-y-1.5', className)} {...props}>
				<div className="mb-1.5 flex items-center gap-2 font-medium text-muted-foreground text-xs">
					<span>Output</span>
				</div>
				<div>{output}</div>
			</div>
		)
	}

	// Format output (handles strings, objects, arrays, etc.)
	const outputText = formatOutput(output)
	if (!outputText.trim()) {
		return null
	}

	return (
		<div className={cn('space-y-1.5', className)} {...props}>
			<div className="mb-1.5 flex items-center gap-2 font-medium text-muted-foreground text-xs">
				<span>Output</span>
			</div>
			<CodeBlock code={outputText} language="json" showLineNumbers={false}>
				<CodeBlockCopyButton code={outputText} />
			</CodeBlock>
		</div>
	)
}
