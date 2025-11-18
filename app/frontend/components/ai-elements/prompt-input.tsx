'use client'

import type React from 'react'
import { cn } from '@/shared/libs/utils'

type PromptInputProps = React.FormHTMLAttributes<HTMLFormElement>

export const PromptInput: React.FC<PromptInputProps> = ({
	children,
	className,
	...props
}) => (
	<form
		className={cn('space-y-3', className)}
		data-ai-element="prompt-input"
		{...props}
	>
		{children}
	</form>
)

export const PromptInputHeader: React.FC<
	React.HTMLAttributes<HTMLDivElement>
> = ({ children, className, ...props }) => (
	<div
		className={cn('flex items-center justify-between', className)}
		data-ai-element="prompt-input-header"
		{...props}
	>
		{children}
	</div>
)

export const PromptInputBody: React.FC<
	React.HTMLAttributes<HTMLDivElement>
> = ({ children, className, ...props }) => (
	<div
		className={cn('relative', className)}
		data-ai-element="prompt-input-body"
		{...props}
	>
		{children}
	</div>
)

export const PromptInputFooter: React.FC<
	React.HTMLAttributes<HTMLDivElement>
> = ({ children, className, ...props }) => (
	<div
		className={cn(
			'flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-xs',
			className
		)}
		data-ai-element="prompt-input-footer"
		{...props}
	>
		{children}
	</div>
)

type PromptInputTextareaProps =
	React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const PromptInputTextarea = ({
	className: textareaClassName,
	ref,
	...props
}: PromptInputTextareaProps & {
	ref?: React.RefObject<HTMLTextAreaElement | null>
}) => (
	<textarea
		className={cn(
			'w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
			textareaClassName
		)}
		data-ai-element="prompt-input-textarea"
		ref={ref}
		{...props}
	/>
)

type PromptInputSubmitProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	status?: 'idle' | 'submitted' | 'streaming'
}

export const PromptInputSubmit: React.FC<PromptInputSubmitProps> = ({
	children,
	className,
	status,
	...props
}) => (
	<button
		className={cn(
			'inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70',
			className
		)}
		data-ai-element="prompt-input-submit"
		type="submit"
		{...props}
	>
		{status === 'submitted' ? 'Sending...' : children}
	</button>
)

export const PromptInputTools: React.FC<
	React.HTMLAttributes<HTMLDivElement>
> = ({ children, className, ...props }) => (
	<div
		className={cn('flex flex-wrap items-center gap-2', className)}
		data-ai-element="prompt-input-tools"
		{...props}
	>
		{children}
	</div>
)

type PromptInputButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: 'default' | 'ghost'
}

export const PromptInputButton: React.FC<PromptInputButtonProps> = ({
	children,
	className,
	variant = 'default',
	...props
}) => (
	<button
		className={cn(
			'inline-flex items-center gap-1 rounded-full border px-3 py-1 font-medium text-xs transition',
			variant === 'default'
				? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
				: 'border-border bg-transparent text-foreground hover:bg-muted',
			className
		)}
		type="button"
		{...props}
	>
		{children}
	</button>
)
