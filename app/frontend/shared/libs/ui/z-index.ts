const Z_INDEX = {
	// ========================================
	// BASE & LOW-LEVEL LAYERS (0-100)
	// ========================================
	BASE: 1,
	BACKGROUND: 0,
	STICKY_HEADER: 10,
	FOCUS_RING: 10, // For focus states within components
	SIDEBAR_RESIZER: 20, // Sidebar resize handle
	NAVIGATION: 10,

	// ========================================
	// ANIMATED & INTERACTIVE ELEMENTS (40-100)
	// ========================================
	ANIMATED_TRIGGER: 40, // Animated sidebar triggers, floating buttons
	EVENT_COUNT_BADGE: 45, // Event count badge in header dock, below everything

	// ========================================
	// POPOVER & DROPDOWN SYSTEM (100-300)
	// ========================================
	TOOLTIP: 100,
	DROPDOWN: 200,
	POPOVER: 250,
	CONTEXT_MENU: 250,
	SELECT: 260,
	HOVER_CARD: 270,

	// ========================================
	// SIDEBAR & CHAT (400-450)
	// ========================================
	SIDEBAR: 400,
	SIDEBAR_CHAT_OVERLAY: 410,
	SIDEBAR_CHAT_TOOLTIP: 415,

	// ========================================
	// MODAL SYSTEM (500-600)
	// ========================================
	MODAL_BACKDROP: 500,
	MODAL_CONTENT: 510,
	CONFIRMATION_BACKDROP: 520,
	CONFIRMATION_CONTENT: 530,
	SHEET_BACKDROP: 500, // Same as modal backdrop
	SHEET_CONTENT: 510, // Same as modal content
	DEBUG_OVERLAY: 600,

	// ========================================
	// DIALOG SYSTEM (700-750)
	// ========================================
	DIALOG_BACKDROP: 700,
	DIALOG_CONTENT: 710,
	DIALOG_OVERLAYS: 720,
	DIALOG_OVERLAY_PORTAL: 720,

	// ========================================
	// SPECIALIZED OVERLAYS (800-900)
	// ========================================
	GRID_OVERLAY: 800,
	GRID_OVERLAY_EDITOR: 810,
	GRID_EDITOR_MAX: 810,
	DATE_PICKER: 820,
	DATE_PICKER_WIDGET: 830,

	// ========================================
	// ELEVATED CONFIRMATIONS (950-1000)
	// ========================================
	CONFIRMATION_OVERLAY_BACKDROP: 950,
	CONFIRMATION_OVERLAY_CONTENT: 960,
	GRID_MENU: 970,
	GRID_TOOLTIP: 680, // Keep tooltips below drawers while remaining above base UI

	// ========================================
	// FULLSCREEN LAYERS (1100-1200)
	// ========================================
	FULLSCREEN_BACKDROP: 1100,
	FULLSCREEN_CONTENT: 1110,
	GRID_FULLSCREEN_BACKDROP: 1100,
	GRID_FULLSCREEN_CONTENT: 1110,
	GRID_FULLSCREEN_OVERLAY: 1450,
	GRID_FULLSCREEN: 1455,

	// ========================================
	// COMMAND OVERLAYS (1300)
	// ========================================
	COMMAND_OVERLAY: 1300, // For Command components that need to appear above grid editors

	// ========================================
	// CRITICAL SYSTEM OVERLAYS (1400-1500)
	// ========================================
	ENHANCED_OVERLAY: 1400, // For components that must appear above most things
	BACKEND_CONNECTION: 1400, // Critical system overlays
	// Global toast notifications (Sonner) - keep above dialog/backdrops
	TOASTER: 1500,

	// ========================================
	// EMERGENCY/DEBUG LAYERS (2000)
	// ========================================
	EMERGENCY_OVERLAY: 2000, // For absolute critical overlays
} as const

export { Z_INDEX }
export type ZIndexKeys = keyof typeof Z_INDEX
