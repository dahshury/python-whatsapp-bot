const Z_INDEX = {
	// ========================================
	// BASE & LOW-LEVEL LAYERS (0-100)
	// ========================================
	BASE: 1,
	BACKGROUND: 0,
	STICKY_HEADER: 10,
	FOCUS_RING: 10, // For focus states within components
	SIDEBAR: 1400,
	SIDEBAR_RESIZER: 20, // Sidebar resize handle
	NAVIGATION: 10,

	// ========================================
	// ANIMATED & INTERACTIVE ELEMENTS (40-100)
	// ========================================
	ANIMATED_TRIGGER: 40, // Animated sidebar triggers, floating buttons

	// ========================================
	// POPOVER & DROPDOWN SYSTEM (1200-1400)
	// ========================================
	TOOLTIP: 1100,
	DROPDOWN: 1200,
	POPOVER: 1300,
	HOVER_CARD: 2600,
	CONTEXT_MENU: 1300,
	SELECT: 1300,

	// ========================================
	// SIDEBAR & CHAT (1400-1420)
	// ========================================
	SIDEBAR_CHAT_OVERLAY: 1410,
	SIDEBAR_CHAT_TOOLTIP: 1415,

	// ========================================
	// MODAL SYSTEM (1500-1600)
	// ========================================
	MODAL_BACKDROP: 1500,
	MODAL_CONTENT: 1510,
	CONFIRMATION_BACKDROP: 1520,
	CONFIRMATION_CONTENT: 1530,
	FULLSCREEN_BACKDROP: 8000,
	FULLSCREEN_CONTENT: 8100,
	DEBUG_OVERLAY: 1600,
	SHEET_BACKDROP: 1500, // Same as modal backdrop
	SHEET_CONTENT: 1510, // Same as modal content

	// ========================================
	// DIALOG SYSTEM (1700-1750)
	// ========================================
	DIALOG_BACKDROP: 9999,
	DIALOG_CONTENT: 10000,

	// ========================================
	// SPECIALIZED OVERLAYS (1800-2000)
	// ========================================
	DATE_PICKER: 3700,
	DATE_PICKER_WIDGET: 3810,
	GRID_OVERLAY_EDITOR: 3600,
	GRID_EDITOR_MAX: 3600,
	GRID_OVERLAY: 3500,
	GRID_MENU: 9001,
	GRID_TOOLTIP: 9002,
	GRID_FULLSCREEN: 8200,

	// ========================================
	// ELEVATED CONFIRMATIONS (2000-2200)
	// ========================================
	CONFIRMATION_OVERLAY_BACKDROP: 9000,
	CONFIRMATION_OVERLAY_CONTENT: 9100,
	GRID_FULLSCREEN_BACKDROP: 8000,
	GRID_FULLSCREEN_CONTENT: 9000,
	// Global toast notifications (Sonner) - keep above dialog/backdrops
	TOASTER: 11000,

	// ========================================
	// DIALOG OVERLAYS - HIGHEST UI LAYER (3000)
	// ========================================
	DIALOG_OVERLAYS: 3000,
	// Centralized portal and elevated confirmation z-indices (no hardcoded literals elsewhere)
	DIALOG_OVERLAY_PORTAL: 3000,

	// ========================================
	// COMMAND OVERLAYS - ABOVE GRID EDITORS (4000)
	// ========================================
	COMMAND_OVERLAY: 4000, // For Command components that need to appear above grid editors

	// ========================================
	// ENHANCED OVERLAYS - ABOVE DIALOG WHEN NEEDED (5000)
	// ========================================
	ENHANCED_OVERLAY: 5000, // For components that must appear above everything
	BACKEND_CONNECTION: 5000, // Critical system overlays

	// ========================================
	// EMERGENCY/DEBUG LAYERS (50000+)
	// ========================================
	EMERGENCY_OVERLAY: 50000, // For absolute critical overlays
} as const;

export { Z_INDEX };
export type ZIndexKeys = keyof typeof Z_INDEX;
