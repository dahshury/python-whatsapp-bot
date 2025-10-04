"use client";

import { ChevronDownIcon, FileInput, FileOutput, Wrench } from "lucide-react";
import * as React from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/animate-ui/components/radix/accordion";
import { CodeBlock } from "@/components/ui/code-block";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface ToolCallGroupProps {
	valueKey: string;
	toolName: string;
	argsText: string;
	resultText: string;
}

// Decode HTML entities
function decodeHtml(html: string): string {
	try {
		const txt = document.createElement("textarea");
		txt.innerHTML = html;
		return txt.value;
	} catch {
		return html;
	}
}

// Pretty-print JSON if possible
function formatCode(text: string): string {
	try {
		const parsed = JSON.parse(text);
		return JSON.stringify(parsed, null, 2);
	} catch {
		return text;
	}
}

// Detect language from content
function detectLanguage(text: string): string {
	try {
		JSON.parse(text);
		return "json";
	} catch {
		return "javascript";
	}
}

export function ToolCallGroup({
	valueKey,
	toolName,
	argsText,
	resultText,
}: ToolCallGroupProps) {
	const decodedArgs = React.useMemo(
		() => (argsText?.trim() ? formatCode(decodeHtml(argsText)) : ""),
		[argsText],
	);
	const decodedResult = React.useMemo(
		() => (resultText?.trim() ? formatCode(decodeHtml(resultText)) : ""),
		[resultText],
	);

	const argsLanguage = React.useMemo(
		() => (decodedArgs ? detectLanguage(decodedArgs) : "json"),
		[decodedArgs],
	);
	const resultLanguage = React.useMemo(
		() => (decodedResult ? detectLanguage(decodedResult) : "json"),
		[decodedResult],
	);

	return (
		<div className="w-full">
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem value={valueKey} className="border-0">
					<AccordionTrigger
						showArrow={true}
						className="justify-start gap-2 py-1.5 text-[13px] leading-5 outline-none hover:no-underline [&>svg]:-order-1"
					>
						<span className="flex items-center gap-2">
							<Wrench
								size={14}
								className="shrink-0 opacity-60"
								aria-hidden="true"
							/>
							<span className="font-medium">{`Tool: ${toolName}`}</span>
						</span>
					</AccordionTrigger>
					<AccordionContent className="p-0 pb-0">
						{decodedArgs?.trim() && (
							<Collapsible
								className="border-t py-2 ps-4 pe-3"
								defaultOpen={true}
							>
								<CollapsibleTrigger className="flex gap-2 text-[13px] leading-5 font-medium [&[data-state=open]>svg]:rotate-180">
									<ChevronDownIcon
										size={14}
										className="shrink-0 opacity-60 transition-transform duration-200"
										aria-hidden="true"
									/>
									<span className="flex items-center gap-2">
										<FileInput
											size={14}
											className="shrink-0 opacity-60"
											aria-hidden="true"
										/>
										<span>Arguments</span>
									</span>
								</CollapsibleTrigger>
								<CollapsibleContent className="text-muted-foreground data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden ps-4 text-xs transition-all mt-1.5">
									<CodeBlock
										language={argsLanguage}
										code={decodedArgs}
										showLineNumbers={false}
									/>
								</CollapsibleContent>
							</Collapsible>
						)}
						<Collapsible className="border-t py-2 ps-4 pe-3" defaultOpen={true}>
							<CollapsibleTrigger className="flex gap-2 text-[13px] leading-5 font-medium [&[data-state=open]>svg]:rotate-180">
								<ChevronDownIcon
									size={14}
									className="shrink-0 opacity-60 transition-transform duration-200"
									aria-hidden="true"
								/>
								<span className="flex items-center gap-2">
									<FileOutput
										size={14}
										className="shrink-0 opacity-60"
										aria-hidden="true"
									/>
									<span>Result</span>
								</span>
							</CollapsibleTrigger>
							<CollapsibleContent className="text-muted-foreground data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden ps-4 text-xs transition-all mt-1.5">
								{decodedResult?.trim() ? (
									<CodeBlock
										language={resultLanguage}
										code={decodedResult}
										showLineNumbers={false}
									/>
								) : (
									<div className="text-[11px] opacity-60">No result</div>
								)}
							</CollapsibleContent>
						</Collapsible>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
