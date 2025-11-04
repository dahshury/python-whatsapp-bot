export const getLocalOpsSet = (): Set<string> => {
  const g = globalThis as unknown as { __localOps?: Set<string> }
  if (!g.__localOps) g.__localOps = new Set<string>()
  return g.__localOps
}

export const markLocalOperation = (key: string): void => {
  try {
    getLocalOpsSet().add(key)
  } catch {
    // Silently ignore errors when marking local operations (defensive coding)
  }
}

export const clearLocalOperation = (key: string): void => {
  try {
    getLocalOpsSet().delete(key)
  } catch {
    // Silently ignore errors when clearing local operations (defensive coding)
  }
}

export const isLocalOperation = (key: string): boolean => {
  try {
    return getLocalOpsSet().has(key)
  } catch {
    return false
  }
}


