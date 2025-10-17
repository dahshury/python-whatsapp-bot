/**
 * Import i18n messages for grid components
 * Direct import to avoid barrel file performance issues
 */

// biome-ignore lint/performance/noBarrelFile: Required re-export for backward compatibility with grid components
export { messages } from "@/shared/libs/i18n";
