# Frontend Development Server - Auto-Fix

## Description

Intelligently runs the Next.js frontend development server with automatic problem detection and fixing. Attempts `pnpm dev --turbo` and diagnoses/resolves common issues.

## Rules

- When invoked, always navigate to `app/frontend/` directory
- Attempt to start the dev server with `pnpm dev --turbo`
- Monitor the process for errors and warnings
- Apply fixes automatically for detected issues:
  - **Missing Dependencies**: Run `pnpm install` if node_modules issues detected
  - **Port Conflicts**: Offer to use alternative port or kill process on current port
  - **Build Cache Corruption**: Run `pnpm run dev:clean` (clears .next and restarts)
  - **Type Errors**: Run `pnpm typecheck` to validate TypeScript
  - **Linting Issues**: Run `pnpm lint:fix` to fix biome issues
  - **Next.js Compiler Errors**: Analyze and suggest fixes or run `pnpm build` to test full build
  - **Memory Issues**: Run `pnpm run dev:reset` for full reset
  - **WebSocket/Connection Issues**: Check backend connection settings in environment
- Continue monitoring until the server starts successfully on port 3000 (or alternative)
- Provide clear feedback on fixes applied
- Stop and report if critical unresolvable issues are found

## AutoFix Priority Order

1. Check if pnpm is installed (`pnpm -v`)
2. Verify Node.js version compatibility (>= 20)
3. Check app/frontend/node_modules exists, if not run `pnpm install`
4. Attempt `pnpm dev --turbo`
5. If EADDRINUSE (port in use), suggest alternatives
6. If cache/build issues, run `pnpm run dev:clean`
7. If node_modules corrupted, run `pnpm run dev:reset`
8. If TypeScript errors, check tsconfig and run `pnpm typecheck`
9. If lint issues, run `pnpm lint:fix`
10. Monitor for 30-60 seconds after successful start

## Common Issues & Fixes

- **"pnpm: command not found"** → Run `corepack enable && pnpm`
- **Module not found errors** → Clear cache: `rm -rf app/frontend/.next && pnpm install`
- **Port 3000 in use** → Kill with `lsof -ti:3000 | xargs kill -9` (Unix) or find in Task Manager (Windows)
- **Turbo errors** → Fallback to `pnpm dev:classic`
- **OOM/Memory errors** → Run `pnpm run dev:reset`
- **WebSocket cannot connect** → Verify `NEXT_PUBLIC_BACKEND_URL` and `NEXT_PUBLIC_WS_URL` are set correctly

## Environment Variables Required

- `NEXT_PUBLIC_TIMEZONE` (optional, defaults to "Asia/Riyadh")
- `NEXT_PUBLIC_BACKEND_URL` (optional, defaults to "")
- `NEXT_PUBLIC_WS_URL` (optional, defaults to "")

## Success Criteria

✅ Development server running on http://localhost:3000 or provided port
✅ No critical TypeScript/lint errors in console
✅ WebSocket connection established to backend (if available)
✅ Hot module replacement working
