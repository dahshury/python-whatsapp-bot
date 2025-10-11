"use client";

import { Check, Copy } from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

type CodeBlockProps = {
	language: string;
	filename?: string;
	highlightLines?: number[];
	showLineNumbers?: boolean;
} & (
	| {
			code: string;
			tabs?: never;
	  }
	| {
			code?: never;
			tabs: Array<{
				name: string;
				code: string;
				language?: string;
				highlightLines?: number[];
			}>;
	  }
);

export const CodeBlock = ({
	language,
	filename,
	code,
	highlightLines = [],
	tabs = [],
	showLineNumbers = false,
}: CodeBlockProps) => {
	const [copied, setCopied] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState(0);
	const { resolvedTheme } = useTheme();

	const tabsExist = tabs.length > 0;
	const isDark = resolvedTheme === "dark";

	const copyToClipboard = async () => {
		const textToCopy = tabsExist ? tabs[activeTab]?.code : code;
		if (textToCopy) {
			await navigator.clipboard.writeText(textToCopy);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const activeCode = tabsExist ? tabs[activeTab]?.code : code;
	const activeLanguage = tabsExist ? tabs[activeTab]?.language || language : language;
	const activeHighlightLines = tabsExist ? tabs[activeTab]?.highlightLines || [] : highlightLines;

	// Use theme-aware syntax highlighting
	const syntaxTheme = isDark ? atomDark : oneLight;

	return (
		<div className="relative w-full rounded-md bg-muted border border-border font-mono text-sm">
			<div className="flex flex-col gap-2">
				{tabsExist && (
					<div className="flex overflow-x-auto border-b border-border">
						{tabs.map((tab, index) => (
							<button
								key={`${tab.name}-${index}`}
								type="button"
								onClick={() => setActiveTab(index)}
								className={`px-3 py-2 text-xs transition-colors font-sans border-b-2 ${
									activeTab === index
										? "text-foreground border-primary"
										: "text-muted-foreground border-transparent hover:text-foreground"
								}`}
							>
								{tab.name}
							</button>
						))}
					</div>
				)}
				{!tabsExist && filename && (
					<div className="flex justify-between items-center py-2 px-3 border-b border-border">
						<div className="text-xs text-muted-foreground">{filename}</div>
						<button
							type="button"
							onClick={copyToClipboard}
							className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-sans"
						>
							{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
						</button>
					</div>
				)}
			</div>
			<SyntaxHighlighter
				language={activeLanguage}
				style={syntaxTheme}
				customStyle={{
					margin: 0,
					padding: "0.5rem 0.75rem",
					background: "transparent",
					fontSize: "0.75rem",
					lineHeight: "1.5",
				}}
				wrapLines={true}
				showLineNumbers={showLineNumbers}
				lineProps={(lineNumber) => ({
					style: {
						backgroundColor: activeHighlightLines.includes(lineNumber)
							? "rgba(var(--primary-rgb, 59 130 246) / 0.1)"
							: "transparent",
						display: "block",
						width: "100%",
					},
				})}
				PreTag="div"
			>
				{String(activeCode)}
			</SyntaxHighlighter>
		</div>
	);
};
