// Dev-only lightweight profiler helpers
// Logs every Nth call to avoid flooding the console

export const devProfilerEnabled: boolean = false;

export function count(_label: string, _every = 50): void {
  // Profiling disabled in production builds.
}

export function mark(_label: string): void {
  // Profiling disabled in production builds.
}

export function reportTop(_limit = 10): void {
  // Profiling disabled in production builds.
}
export function startReporter(_intervalMs = 3000, _topN = 10): void {
  // Profiling disabled in production builds.
}

export function stopReporter(): void {
  // Profiling disabled in production builds.
}

// Dev profiler disabled: no global debug bindings
