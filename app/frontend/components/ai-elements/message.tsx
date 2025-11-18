'use client'

import React, { useMemo } from 'react'
import { Streamdown, type StreamdownProps } from 'streamdown'
import { cn } from '@/shared/libs/utils'

type MessageProps = React.HTMLAttributes<HTMLDivElement> & {
	from?: 'user' | 'assistant' | 'secretary' | 'system' | 'tool' | string
}

export const Message: React.FC<MessageProps> = ({
	children,
	className,
	from,
	...props
}) => (
	<div
		className={cn('message-row', className)}
		data-ai-element="message"
		data-role={from}
		{...props}
	>
		{children}
	</div>
)

export const MessageContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
	children,
	className,
	...props
}) => (
	<div
		className={cn('message-content', className)}
		data-ai-element="message-content"
		{...props}
	>
		{children}
	</div>
)

const toMarkdownString = (children: React.ReactNode): string => {
	if (typeof children === 'string' || typeof children === 'number') {
		return String(children)
	}
	if (Array.isArray(children)) {
		return children.map(toMarkdownString).join('')
	}
	if (React.isValidElement<{ children?: unknown }>(children)) {
		return toMarkdownString(children.props.children as React.ReactNode)
	}
	return ''
}

const resolveUrl = (value: string, defaultOrigin?: string) => {
	try {
		return new URL(value, defaultOrigin).toString()
	} catch {
		return ''
	}
}

const isAllowedUrl = (url: string, prefixes: string[]) =>
	prefixes.includes('*') || prefixes.some((prefix) => url.startsWith(prefix))

type MessageResponseProps = Omit<StreamdownProps, 'children'> & {
	children: React.ReactNode
	allowedImagePrefixes?: string[]
	allowedLinkPrefixes?: string[]
	defaultOrigin?: string
}

export const MessageResponse: React.FC<MessageResponseProps> = ({
	children,
	className,
	allowedImagePrefixes = ['*'],
	allowedLinkPrefixes = ['*'],
	defaultOrigin,
	parseIncompleteMarkdown = true,
	components,
	rehypePlugins,
	remarkPlugins,
	...props
}) => {
	const content = useMemo(() => toMarkdownString(children), [children])

	const urlTransform: StreamdownProps['urlTransform'] = (value, key) => {
		const resolved = resolveUrl(value, defaultOrigin)
		if (!resolved) {
			return ''
		}
		if (key === 'href' && !isAllowedUrl(resolved, allowedLinkPrefixes)) {
			return ''
		}
		if (key === 'src' && !isAllowedUrl(resolved, allowedImagePrefixes)) {
			return ''
		}
		return resolved
	}

	return (
		<div
			className={cn(
				'message-response prose prose-sm dark:prose-invert max-w-none',
				className
			)}
			data-ai-element="message-response"
		>
			<Streamdown
				components={components}
				parseIncompleteMarkdown={parseIncompleteMarkdown}
				rehypePlugins={rehypePlugins}
				remarkPlugins={remarkPlugins}
				urlTransform={urlTransform}
				{...props}
			>
				{content}
			</Streamdown>
		</div>
	)
}

export const MessageActions: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
	children,
	className,
	...props
}) => (
	<div
		className={cn(
			'mt-2 flex flex-wrap items-center gap-2 text-muted-foreground text-xs',
			className
		)}
		data-ai-element="message-actions"
		{...props}
	>
		{children}
	</div>
)

type MessageActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	label?: string
}

export const MessageAction: React.FC<MessageActionProps> = ({
	children,
	className,
	label,
	...props
}) => (
	<button
		className={cn(
			'inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-foreground text-xs transition hover:bg-muted',
			className
		)}
		data-ai-element="message-action"
		type="button"
		{...props}
	>
		{children}
		{label ? <span className="sr-only">{label}</span> : null}
	</button>
)
