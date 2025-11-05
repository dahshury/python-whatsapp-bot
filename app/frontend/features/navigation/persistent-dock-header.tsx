"use cache";

import { PersistentDockHeaderClient } from "./persistent-dock-header.client";

const ensureCacheBoundary = () => Promise.resolve();

export async function PersistentDockHeader() {
  await ensureCacheBoundary();
  return <PersistentDockHeaderClient />;
}
