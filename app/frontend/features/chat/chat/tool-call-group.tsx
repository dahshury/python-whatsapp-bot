'use client'

import { useMemo } from 'react'
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
	type ToolState,
} from '@/components/ai-elements/tool'

export type ToolCallGroupProps = {
	valueKey: string
	toolName: string
	argsText: string
	resultText: string
}

// Decode HTML entities
function decodeHtml(html: string): string {
	if (typeof window === 'undefined') {
		return html
	}
	try {
		const txt = document.createElement('textarea')
		txt.innerHTML = html
		return txt.value
	} catch {
		return html
	}
}

// Parse JSON if possible, otherwise return as-is
function parseJson(text: string): unknown {
	try {
		return JSON.parse(text)
	} catch {
		return text
	}
}

export function ToolCallGroup({
	valueKey,
	toolName,
	argsText,
	resultText,
}: ToolCallGroupProps) {
	const decodedArgs = useMemo(
		() => (argsText?.trim() ? decodeHtml(argsText) : ''),
		[argsText]
	)
	const decodedResult = useMemo(
		() => (resultText?.trim() ? decodeHtml(resultText) : ''),
		[resultText]
	)

	const parsedArgs = useMemo(
		() => (decodedArgs ? parseJson(decodedArgs) : null),
		[decodedArgs]
	)
	const parsedResult = useMemo(
		() => (decodedResult ? parseJson(decodedResult) : null),
		[decodedResult]
	)

	// Determine tool state based on available data
	const toolState: ToolState = useMemo(() => {
		if (decodedResult) {
			// Check if result looks like an error
			if (
				typeof decodedResult === 'string' &&
				(decodedResult.toLowerCase().includes('error') ||
					decodedResult.toLowerCase().includes('failed') ||
					decodedResult.toLowerCase().includes('exception'))
			) {
				return 'output-error'
			}
			return 'output-available'
		}
		if (decodedArgs) {
			return 'input-available'
		}
		return 'input-streaming'
	}, [decodedArgs, decodedResult])

	// Extract error text if state is error
	const errorText = useMemo(() => {
		if (toolState === 'output-error' && decodedResult) {
			return typeof decodedResult === 'string'
				? decodedResult
				: JSON.stringify(decodedResult, null, 2)
		}
		return null
	}, [toolState, decodedResult])

	// Convert result to ReactNode for output display
	const outputNode = useMemo<React.ReactNode>(() => {
		if (toolState === 'output-available' && parsedResult) {
			if (typeof parsedResult === 'string') {
				return parsedResult
			}
			return JSON.stringify(parsedResult, null, 2)
		}
		return
	}, [toolState, parsedResult])

	// Only show ToolInput if parsedArgs is not null or undefined
	const showToolInput = parsedArgs !== null && parsedArgs !== undefined

	return (
		<Tool defaultOpen={false} key={valueKey}>
			<ToolHeader state={toolState} type={toolName} />
			<ToolContent>
				{showToolInput && <ToolInput input={parsedArgs} />}
				<ToolOutput errorText={errorText} output={outputNode} />
			</ToolContent>
		</Tool>
	)
}
