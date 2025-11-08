"use client";

import { Check, Copy } from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  atomDark,
  oneLight,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import { writeClipboardText } from "@/shared/libs/clipboard";

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
    if (!textToCopy) {
      return;
    }

    try {
      await writeClipboardText(textToCopy);
      setCopied(true);
      const COPY_RESET_DELAY_MS = 2000;
      setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
    } catch (_error) {
      // Clipboard write failed - user may need to copy manually
    }
  };

  const activeCode = tabsExist ? tabs[activeTab]?.code : code;
  const activeLanguage = tabsExist
    ? tabs[activeTab]?.language || language
    : language;
  const activeHighlightLines = tabsExist
    ? tabs[activeTab]?.highlightLines || []
    : highlightLines;

  // Use theme-aware syntax highlighting
  const syntaxTheme = isDark ? atomDark : oneLight;

  return (
    <div className="relative w-full rounded-md border border-border bg-muted font-mono text-sm">
      <div className="flex flex-col gap-2">
        {tabsExist && (
          <div className="flex overflow-x-auto border-border border-b">
            {tabs.map((tab, index) => (
              <button
                className={`border-b-2 px-3 py-2 font-sans text-xs transition-colors ${
                  activeTab === index
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                key={`${tab.name}-${index}`}
                onClick={() => setActiveTab(index)}
                type="button"
              >
                {tab.name}
              </button>
            ))}
          </div>
        )}
        {!tabsExist && filename && (
          <div className="flex items-center justify-between border-border border-b px-3 py-2">
            <div className="text-muted-foreground text-xs">{filename}</div>
            <button
              className="flex items-center gap-1 font-sans text-muted-foreground text-xs transition-colors hover:text-foreground"
              onClick={copyToClipboard}
              type="button"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
      <SyntaxHighlighter
        customStyle={{
          margin: 0,
          padding: "0.5rem 0.75rem",
          background: "transparent",
          fontSize: "0.75rem",
          lineHeight: "1.5",
        }}
        language={activeLanguage}
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
        showLineNumbers={showLineNumbers}
        style={syntaxTheme}
        wrapLines={true}
      >
        {String(activeCode)}
      </SyntaxHighlighter>
    </div>
  );
};
