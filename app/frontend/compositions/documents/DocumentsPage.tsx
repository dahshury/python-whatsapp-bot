"use cache";

import { Suspense } from "react";
import { registerPrefetchModules } from "@/shared/libs/prefetch/registry";
import { DocumentsSection } from "@/widgets/documents/documents-section";

export const preloadDocumentsSection = async () =>
  import("@/widgets/documents/documents-section").then(
    (mod) => mod.DocumentsSection
  );

export const preloadDataGrid = async () =>
  import("@/shared/libs/data-grid/components/Grid");

export const preloadCalendarDrawer = async () =>
  import("@/widgets/calendar/CalendarDrawer").then((mod) => mod.CalendarDrawer);

registerPrefetchModules("/documents", preloadDocumentsSection);
registerPrefetchModules("/documents", preloadDataGrid);
registerPrefetchModules("/documents", preloadCalendarDrawer);

const ensureCacheBoundary = () => Promise.resolve();

export async function DocumentsPage() {
  await ensureCacheBoundary();
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DocumentsSection />
    </Suspense>
  );
}
