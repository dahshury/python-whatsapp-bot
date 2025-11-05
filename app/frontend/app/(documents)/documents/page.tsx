"use cache";

import { DocumentsPage } from "@/compositions/documents";

const ensureCacheBoundary = () => Promise.resolve();

export default async function Page() {
  await ensureCacheBoundary();
  return <DocumentsPage />;
}
