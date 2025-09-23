"use client";

import type {
	ExcalidrawImperativeAPI,
	ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import dynamic from "next/dynamic";

type ExcalidrawAPI = ExcalidrawImperativeAPI;

const Excalidraw = dynamic(
	async () => (await import("@excalidraw/excalidraw")).Excalidraw,
	{
		ssr: false,
	},
);

export function DocumentCanvas({
	theme,
	langCode,
	onChange,
	onApiReady,
}: {
	theme: "light" | "dark";
	langCode: string;
	onChange: NonNullable<ExcalidrawProps["onChange"]>;
	onApiReady: (api: ExcalidrawAPI) => void;
}) {
	return (
		<div className="excali-theme-scope w-full h-full">
			<Excalidraw
				theme={theme}
				langCode={langCode as unknown as string}
				onChange={onChange}
				excalidrawAPI={(api: ExcalidrawImperativeAPI) => onApiReady(api)}
			/>
		</div>
	);
}
