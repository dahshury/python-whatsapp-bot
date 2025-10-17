# TypeScript Type Checking and Error Resolution Workflow

## Objective

Fix all TypeScript type errors in this monorepo (Python backend + TypeScript/React frontend) systematically and recursively until the codebase achieves zero type errors.

## Project Context

* **Monorepo Structure**: Backend (Python/FastAPI) + Frontend (Next.js with TypeScript)
* **Frontend Location**: `app/frontend/` (TypeScript/React components and services)
* **TypeScript Config**: `app/frontend/tsconfig.json` and root `tsconfig.json`
* **Linting Tool**: Biome (configured in `biome.json`)
* **Code Quality Standards**: Strict type safety, accessibility, clean code principles (following Uncle Bob, Martin Fowler, Eric Evans patterns)
* **Package Manager**: pnpm (monorepo workspace)

## Pre-Execution Checklist

Before starting the workflow:

1. Verify you understand the project structure and constraints
2. Review the workspace rules in the project context for TypeScript best practices
3. Note that this is a strict type-safety codebase - avoid `any` types at all costs
4. Familiarize yourself with the domain entities: conversation, event, phone, rsvp, user, vacation
5. Check existing patterns in similar files before making changes

## Execution Workflow

### Phase 1: Initial Error Discovery

1. Execute: `pnpm tsc --noEmit` from the `app/frontend/` directory
2. Capture ALL error output completely
3. Count total errors and categorize by type (missing imports, type mismatches, unused variables, etc.)
4. Do NOT attempt fixes yet - only gather information
5. **This is the ONLY time you should run this command before fixing** - subsequent runs happen only after you've addressed visible errors

### Phase 2: Create Structured Todo List

1. **Use the Cursor built-in todo list** (NOT an .md file)
2. Create todos using the `todo_write` tool with these guidelines:
   * **One todo per error category** initially (e.g., "Fix missing imports in services", "Resolve type mismatches in components")
   * **Break down large categories** into specific file-based todos if the category has 5+ errors
   * **Prioritize by dependency**: Fix foundational errors first (domain models, services, types) before components
   * **Include file paths** in todo titles for clarity
   * Set initial status: `pending` for all
3. Order todos strategically:
   * First: Core types and domain models (`app/services/domain/`, `app/frontend/entities/`)
   * Second: Services and utilities (`app/services/`, `app/frontend/services/`)
   * Third: Components and features (`app/frontend/features/`, `app/frontend/widgets/`)
   * Fourth: Pages and public-facing code (`app/frontend/app/`)

### Phase 3: Iterative Error Resolution

**For each todo in order:**

1. **Read the Error Details**

   * Identify specific files, line numbers, and error messages
   * Understand the root cause (missing type, incorrect import, unused declaration, etc.)
   * Check if the error is in a dependency or the main code

2. **Analyze Before Fixing**

   * Examine the file context and related code
   * Check how similar issues are resolved elsewhere in the codebase
   * Ensure your fix aligns with project patterns and TypeScript strictness

3. **Apply the Fix**

   * Make minimal, focused changes
   * Prefer proper typing over `any` or type assertions (`as`)
   * For imports: use `import type` for type-only imports
   * For unused items: remove them unless they're exported API
   * Follow Biome formatting and linting rules automatically
   * Ensure accessibility standards are maintained in components
   * **Fix ALL errors in the current todo batch** before re-running the command

4. **Verify the Fix (Run Command Sparingly)**

   * **ONLY after completing all errors in the current batch**, execute: `pnpm tsc --noEmit` from the `app/frontend/` directory
   * Do NOT run this command between individual fixes - batch your changes
   * Confirm that errors from the completed batch are resolved
   * Check that no NEW errors were introduced elsewhere
   * Update the todo status to `in_progress`, then `completed` when verified
   * If new errors appear, add them to the todo list but do NOT re-run the command until you've handled them all

5. **Document Learnings**
   * If a fix reveals a pattern or reusable solution, note it internally
   * If similar errors appear elsewhere, apply the same fix proactively before running the next check

### Phase 4: Recursive Validation Loop

**After completing all todos:**

1. **Only then** run: `pnpm tsc --noEmit` from the `app/frontend/` directory one final time
2. **If errors remain**:
   * Create new todos for the remaining errors
   * Repeat Phase 3 until all errors are gone
   * This may involve cascading fixes (fixing one error reveals another)
   * **Again, batch fixes before re-running the command** - do not run it between each individual fix
3. **If zero errors**:
   * Success! All TypeScript type errors are resolved.
   * Run: `pnpm biome check` to ensure linting compliance
   * If biome finds issues, fix them and rerun `pnpm tsc --noEmit` to confirm no regressions

## Critical Optimization Principle

**Run `pnpm tsc --noEmit` SPARINGLY and ONLY when necessary:**

* ❌ Do NOT run after every single fix
* ❌ Do NOT run between related changes
* ✅ Batch 3-5 related fixes, then verify
* ✅ Only run to confirm a batch resolved errors
* ✅ Minimize total command executions to save time and resources

This approach ensures efficiency while maintaining accuracy. Group similar fixes together (e.g., all import fixes in one batch, then all type definition fixes) before verification.

## Best Practices During Execution

### Type Safety

* ❌ **Never use `any`** - use `unknown` with type narrowing or proper generics
* ❌ **Never use non-null assertions (`!`)** - fix the underlying type issue
* ✅ **Use `import type`** for type-only imports
* ✅ **Use `as const`** for literal types
* ✅ **Use generics** for reusable, type-safe functions

### Code Quality

* Prefer removing unused code over leaving it with suppressions
* Keep changes minimal and focused
* Maintain existing code style and patterns
* Fix only what's necessary; don't refactor unrelated code

### Component-Specific Rules

* Ensure all props are properly typed
* Make sure React hooks dependencies are complete
* Validate accessibility attributes (no `aria-hidden` on focusable elements, proper `alt` text, etc.)
* Use semantic HTML elements; avoid `role` attributes when semantic alternatives exist

### Import/Export Patterns

* Centralize type definitions in domain entities (`app/frontend/entities/`)
* Use barrel exports (index.ts) for logical modules
* Avoid circular dependencies
* Keep service layer imports separate from UI layer

## Error Categories and Common Solutions

| Category                 | Solution Strategy                                                |
| ------------------------ | ---------------------------------------------------------------- |
| Missing type definitions | Check if type exists in `app/frontend/entities/` or create it    |
| Unused imports           | Remove the import unless it's a public API                       |
| Type mismatches          | Understand expected vs. actual type; adjust or convert           |
| Missing properties       | Add to interface/type or make them optional (`?`) if appropriate |
| Import path errors       | Verify correct path; use absolute imports if configured          |
| Implicit `any`           | Add explicit type annotation or let TS infer from context        |
| Circular dependencies    | Restructure imports or create separate type file                 |

## Success Criteria

✅ `pnpm tsc --noEmit` runs with zero errors\
✅ `pnpm biome check` passes all checks\
✅ No type suppressions (`@ts-ignore`, `@ts-expect-error`) added unnecessarily\
✅ Code follows the workspace's clean code and accessibility standards\
✅ All changes are tracked and logical

## Communication During Execution

* Report error counts and categories at each phase
* Highlight blocking issues that require human judgment
* Summarize completed todos and remaining work
* Flag any patterns that suggest systemic issues to address

***

**Ready to begin? Execute this workflow methodically, one step at a time.**
