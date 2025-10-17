"use client";

import { useHandleLibrary } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect, useRef } from "react";
import type { LibraryItems } from "@/shared/libs/documents/library-utils";
import {
	getGlobalLibraryItems,
	saveGlobalLibraryItems,
} from "@/shared/libs/documents/library-utils";

export function LibraryManager({ api }: { api: ExcalidrawImperativeAPI }) {
	// Handle #addLibrary imports automatically
	useHandleLibrary({
		excalidrawAPI: api,
	});

	// Seed global library items on first mount
	const seededRef = useRef(false);
	useEffect(() => {
		if (seededRef.current) {
			return;
		}
		try {
			const items = getGlobalLibraryItems();
			if (items && items.length > 0) {
				(
					api as unknown as {
						updateLibrary: (opts: {
							libraryItems: unknown;
							merge?: boolean;
							openLibraryMenu?: boolean;
						}) => void;
					}
				).updateLibrary({
					libraryItems: items as unknown,
					merge: true,
					openLibraryMenu: false,
				});
			}
		} catch {
			// Intentional: library seeding may fail
		}
		seededRef.current = true;
	}, [api]);

	// Expose onLibraryChange helper via imperative API consumer
	useEffect(() => {
		try {
			(
				api as unknown as {
					onLibraryChange?: (cb: (items: unknown) => void) => void;
				}
			).onLibraryChange?.((items: unknown) => {
				try {
					saveGlobalLibraryItems(items as LibraryItems);
				} catch {
					// Intentional: library save may fail
				}
			});
		} catch {
			// Intentional: onLibraryChange may fail
		}
	}, [api]);

	return null;
}
