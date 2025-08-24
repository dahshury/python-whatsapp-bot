"use client";

import React from "react";
import { FullscreenProvider } from "../contexts/FullscreenContext";
import { GridPortalProvider } from "../contexts/GridPortalContext";
import { GridToolbar } from "./GridToolbar";

interface GridToolbarTestProps {
	/** Whether to test in dialog mode */
	inDialog?: boolean;
}

export const GridToolbarTest: React.FC<GridToolbarTestProps> = ({
	inDialog = false,
}) => {
	const [hasSelection, setHasSelection] = React.useState(false);
	const [canUndo, setCanUndo] = React.useState(true);
	const [canRedo, _setCanRedo] = React.useState(false);
	const [hasHiddenColumns, _setHasHiddenColumns] = React.useState(true);

	const mockHandlers = {
		onClearSelection: () => setHasSelection(false),
		onDeleteRows: () => console.log("Delete rows"),
		onUndo: () => console.log("Undo"),
		onRedo: () => console.log("Redo"),
		onAddRow: () => console.log("Add row"),
		onToggleColumnVisibility: () => console.log("Toggle column visibility"),
		onDownloadCsv: () => console.log("Download CSV"),
		onToggleSearch: () => console.log("Toggle search"),
		onToggleFullscreen: () => console.log("Toggle fullscreen"),
	};

	const containerRef = React.useRef<HTMLDivElement>(null);

	const toolbarComponent = (
		<GridToolbar
			isFocused={true}
			hasSelection={hasSelection}
			canUndo={canUndo}
			canRedo={canRedo}
			hasHiddenColumns={hasHiddenColumns}
			{...mockHandlers}
		/>
	);

	if (inDialog) {
		return (
			<div className="p-4">
				<h3 className="text-lg font-semibold mb-4">
					Grid Toolbar Test - Dialog Mode
				</h3>

				{/* Simulate dialog structure */}
				<div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 max-w-4xl w-full max-h-[90vh]">
					<div className="bg-background rounded-lg shadow-xl flex flex-col h-full border">
						{/* Header */}
						<div className="px-6 py-4 border-b">
							<h2 className="text-lg font-semibold">Grid Editor Dialog</h2>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-hidden p-6 relative">
							<FullscreenProvider>
								<GridPortalProvider>
									<div
										style={{
											height: "400px",
											backgroundColor: "#f5f5f5",
											position: "relative",
										}}
									>
										<div style={{ padding: "20px", textAlign: "center" }}>
											<p>Simulated Grid Content Area</p>
											<p className="text-sm text-muted-foreground mt-2">
												The toolbar should appear in the top-right corner, above
												this content.
											</p>

											<div className="mt-4 space-x-2">
												<button
													onClick={() => setHasSelection(!hasSelection)}
													className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
												>
													Toggle Selection ({hasSelection ? "Selected" : "None"}
													)
												</button>
												<button
													onClick={() => setCanUndo(!canUndo)}
													className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
												>
													Toggle Undo ({canUndo ? "Can Undo" : "Cannot Undo"})
												</button>
											</div>
										</div>
									</div>

									{/* Portal container for dialog */}
									<div
										id="grid-dialog-portal"
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											right: 0,
											bottom: 0,
											pointerEvents: "auto",
											zIndex: 4200,
										}}
									/>

									{toolbarComponent}
								</GridPortalProvider>
							</FullscreenProvider>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-4">
			<h3 className="text-lg font-semibold mb-4">
				Grid Toolbar Test - Normal Mode
			</h3>

			<div
				className="relative border rounded-lg"
				style={{ height: "400px", width: "600px" }}
			>
				<FullscreenProvider>
					<GridPortalProvider container={containerRef.current}>
						<div
							ref={containerRef}
							style={{
								position: "relative",
								height: "100%",
								backgroundColor: "#f5f5f5",
							}}
						>
							<div style={{ padding: "20px", textAlign: "center" }}>
								<p>Simulated Grid Content Area</p>
								<p className="text-sm text-muted-foreground mt-2">
									The toolbar should appear in the top-right corner.
								</p>

								<div className="mt-4 space-x-2">
									<button
										onClick={() => setHasSelection(!hasSelection)}
										className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
									>
										Toggle Selection ({hasSelection ? "Selected" : "None"})
									</button>
									<button
										onClick={() => setCanUndo(!canUndo)}
										className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
									>
										Toggle Undo ({canUndo ? "Can Undo" : "Cannot Undo"})
									</button>
								</div>
							</div>
						</div>

						{toolbarComponent}
					</GridPortalProvider>
				</FullscreenProvider>
			</div>
		</div>
	);
};
