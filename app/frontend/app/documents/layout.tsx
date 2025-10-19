import type React from "react";
import { DocumentsShell } from "../providers-shell";

export default function DocsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <DocumentsShell>{children}</DocumentsShell>;
}
