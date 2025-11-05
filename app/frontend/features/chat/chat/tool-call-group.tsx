"use client";

import { ChevronDownIcon, FileInput, FileOutput, Wrench } from "lucide-react";
import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/animate-ui/components/radix/accordion";
import { CodeBlock } from "@/shared/ui/code-block";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";

export type ToolCallGroupProps = {
  valueKey: string;
  toolName: string;
  argsText: string;
  resultText: string;
};

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
  const decodedArgs = useMemo(
    () => (argsText?.trim() ? formatCode(decodeHtml(argsText)) : ""),
    [argsText]
  );
  const decodedResult = useMemo(
    () => (resultText?.trim() ? formatCode(decodeHtml(resultText)) : ""),
    [resultText]
  );

  const argsLanguage = useMemo(
    () => (decodedArgs ? detectLanguage(decodedArgs) : "json"),
    [decodedArgs]
  );
  const resultLanguage = useMemo(
    () => (decodedResult ? detectLanguage(decodedResult) : "json"),
    [decodedResult]
  );

  return (
    <div className="w-full">
      <Accordion className="w-full" collapsible type="single">
        <AccordionItem className="border-0" value={valueKey}>
          <AccordionTrigger
            className="[&>svg]:-order-1 justify-start gap-2 py-1.5 text-[13px] leading-5 outline-none hover:no-underline"
            showArrow={true}
          >
            <span className="flex items-center gap-2">
              <Wrench
                aria-hidden="true"
                className="shrink-0 opacity-60"
                size={14}
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
                <CollapsibleTrigger className="flex gap-2 font-medium text-[13px] leading-5 [&[data-state=open]>svg]:rotate-180">
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="shrink-0 opacity-60 transition-transform duration-200"
                    size={14}
                  />
                  <span className="flex items-center gap-2">
                    <FileInput
                      aria-hidden="true"
                      className="shrink-0 opacity-60"
                      size={14}
                    />
                    <span>Arguments</span>
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1.5 overflow-hidden ps-4 text-muted-foreground text-xs transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  <CodeBlock
                    code={decodedArgs}
                    language={argsLanguage}
                    showLineNumbers={false}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}
            <Collapsible className="border-t py-2 ps-4 pe-3" defaultOpen={true}>
              <CollapsibleTrigger className="flex gap-2 font-medium text-[13px] leading-5 [&[data-state=open]>svg]:rotate-180">
                <ChevronDownIcon
                  aria-hidden="true"
                  className="shrink-0 opacity-60 transition-transform duration-200"
                  size={14}
                />
                <span className="flex items-center gap-2">
                  <FileOutput
                    aria-hidden="true"
                    className="shrink-0 opacity-60"
                    size={14}
                  />
                  <span>Result</span>
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1.5 overflow-hidden ps-4 text-muted-foreground text-xs transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                {decodedResult?.trim() ? (
                  <CodeBlock
                    code={decodedResult}
                    language={resultLanguage}
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
