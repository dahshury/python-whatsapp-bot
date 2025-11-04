# Ultracite Code Quality and Formatting Fix Workflow

## Objective

Fix all Ultracite linting and formatting issues in the frontend codebase systematically and recursively until the code achieves zero linting violations and follows all accessibility, type safety, and code quality standards.

## Project Context

- **Frontend Location**: `app/frontend/` (TypeScript/React components and services)
- **Linting Tool**: Ultracite (Biome's strict mode) - configured in `biome.json`
- **Key Standards Enforced**:
  - Strict type safety (no `any`, proper generics)
  - Accessibility compliance (a11y standards, semantic HTML)
  - Code complexity and quality (clean, maintainable code)
  - React/JSX best practices
  - Correctness and safety
  - Consistent code style and formatting
- **Package Manager**: pnpm (monorepo workspace)
- **Design Principles**: Uncle Bob (Clean Code), Martin Fowler (Refactoring), Eric Evans (Domain-Driven Design)

## Pre-Execution Checklist

Before starting the workflow:

1. Verify you understand the Ultracite rules and standards in the workspace context
2. Review the accessibility requirements - these are non-negotiable
3. Understand that `--unsafe=true` flag enables automatic fixes for complex issues
4. Familiarize yourself with common issues: unused imports, accessibility violations, type safety
5. Check existing patterns in similar files before making manual changes
6. Remember: automatic fixes should be reviewed, not blindly accepted
7. **Understand architectural refactoring priorities**: Complexity and magic number violations should be refactored according to project architecture (domain-driven design, clean code) rather than quick fixes
8. **CRITICAL: Never use biome ignore comments when a fix is possible**: Suppressing violations with `// biome-ignore` comments is strictly forbidden when a proper fix exists. Always fix the root cause rather than hiding the problem.

## Execution Workflow

### Phase 1: Initial Issue Discovery

**Parameter Check**:

- **If a specific folder/file path is supplied**: Run all ultracite checks scoped to that path
- **If NO folder/file is supplied**: Default to scanning the entire `app/frontend/` directory
- Store this path for consistent use throughout all subsequent ultracite runs

Command method (use pnpm ultracite fix --unsafe=true as primary tool):

- With folder supplied: `pnpm ultracite fix --unsafe=true [supplied-folder]`
- Without folder supplied: `pnpm ultracite fix --unsafe=true app/frontend/`

To check violations before fixing:

- With folder supplied: `pnpm ultracite check [supplied-folder]`
- Without folder supplied: `pnpm ultracite check app/frontend/`

Steps:

1. Determine the scope (use supplied path or default to `app/frontend/`)
2. Run `pnpm ultracite check [scope]` to identify violations WITHOUT making changes
3. Capture ALL error/warning output completely
4. Count total violations and categorize by type (unused imports, accessibility, type safety, formatting, etc.)
5. Do NOT attempt fixes yet - only gather information
6. **This is the ONLY time you should re-run the check before fixing** - subsequent runs happen only after you've addressed visible issues

### Phase 2: Create Structured Todo List

1. **Use the Cursor built-in todo list** (NOT an .md file)
2. Create todos using the `todo_write` tool with these guidelines:
   - **One todo per violation category** initially (e.g., "Fix accessibility violations in components", "Remove unused imports in services")
   - **Break down large categories** into specific file-based todos if the category has 5+ violations
   - **Prioritize by impact**: Fix accessibility (a11y) first, then type safety, then code quality
   - **Include file paths and violation types** in todo titles for clarity
   - Set initial status: `pending` for all
3. Order todos strategically:
   - First: Accessibility violations (`app/frontend/features/`, `app/frontend/shared/ui/`)
   - Second: Type safety issues (`app/frontend/entities/`, `app/frontend/services/`)
   - Third: Unused imports and exports (`app/frontend/`)
   - Fourth: Code complexity and formatting (`app/frontend/`)
   - Fifth: React/JSX best practices (`app/frontend/`)

### Phase 3: Iterative Issue Resolution

#### IMPORTANT: Maintain scope consistency throughout

- Use the SAME folder/file path (supplied or default `app/frontend/`) for all ultracite runs
- All fixes should be made only within the defined scope
- Do not fix issues outside the supplied scope, even if discovered

**For each todo in order:**

1. **Read the Violation Details**
   - Identify specific files, line numbers, and violation messages
   - Verify violations are within the defined scope
   - Understand the rule being violated and why
   - Categorize: automatic fix candidate vs. requires manual intervention
   - Check if violation is in a dependency or the main code

2. **Analyze Before Fixing**
   - For accessibility issues: Ensure semantic alternatives exist before changing
   - For unused imports: Verify they're not exported as part of public API
   - For type safety: Check if violations align with the project's strictness goals
   - **For complexity violations**: Refactor according to project architecture (extract to domain entities, services, or utilities) rather than superficial fixes
   - **For magic numbers**: Extract to named constants in appropriate domain entities or configuration modules per project architecture
   - Review similar patterns in the codebase to maintain consistency

3. **Categorize Fixes**
   - **Automatic (via `pnpm ultracite fix --unsafe=true`)**: Formatting, unused imports, simple removals
   - **Manual**: Accessibility (requires domain knowledge), component logic changes
   - **Architectural Refactoring** (preferred for complexity/magic numbers): Refactor to align with project architecture (domain-driven design, clean code principles) rather than quick fixes
   - **Hybrid**: Some violations need both automatic fixes and manual review
   - **🚫 NEVER**: Use `// biome-ignore` or `/* biome-ignore */` comments to suppress violations when a fix is possible. Suppressions are only acceptable in extremely rare cases where fixing would break legitimate functionality AND no alternative solution exists. Always attempt a proper fix first.

4. **Apply Fixes (Batch Before Re-running Check)**
   - For manual fixes: Correct the issues directly
   - For automatic fixes: Use `pnpm ultracite fix --unsafe=true [scope]` to apply fixes
   - **Fix ALL violations in the current todo batch** before re-running the check
   - Ensure changes maintain code quality and project standards

5. **Verify the Fix (Re-run Check Sparingly)**
   - **ONLY after completing all violations in the current batch**, run `pnpm ultracite check [scope]` to verify fixes
   - Do NOT re-run the check between individual fixes — batch your changes
   - Apply fixes using `pnpm ultracite fix --unsafe=true [scope]` to resolve remaining violations
   - Confirm violations from the completed batch are resolved
   - Check that no NEW violations were introduced elsewhere within the scope
   - Update the todo status to `in_progress`, then `completed` when verified
   - If new violations appear, add them to the todo list but do NOT re-run the command until you've handled them all

6. **Document Learnings**
   - If a fix reveals a pattern or reusable solution, note it internally
   - If similar violations appear elsewhere, apply the same fix proactively before running the next check
   - Note accessibility patterns for future components

### Phase 4: Recursive Validation Loop

**After completing all todos:**

1. **Only then** run `pnpm ultracite check [scope]` one final time (supplied path or `app/frontend/`)
2. **If violations remain**:
   - Run `pnpm ultracite fix --unsafe=true [scope]` to fix remaining violations
   - Create new todos for any remaining violations that require manual intervention (within scope)
   - Repeat Phase 3 until all violations are gone
   - This may involve cascading fixes (fixing one issue reveals another)
   - **Again, batch fixes before re-running the check** - do not run it between each individual fix
3. **If zero violations**:
   - Success! All Ultracite violations are resolved within the defined scope.
   - Run `pnpm ultracite check [scope]` to confirm no violations remain
   - Apply final formatting via `pnpm ultracite fix --unsafe=true [scope]` if needed
   - Verify with `pnpm tsc --noEmit` from `app/frontend/` to ensure no TypeScript issues were introduced

## Critical Optimization Principle

**Re-run `pnpm ultracite check` SPARINGLY and ONLY when necessary:**

- ❌ Do NOT re-run after every single fix
- ❌ Do NOT re-run between related changes
- ❌ Do NOT run on different scopes than defined at the start
- ✅ Batch 3-5 related fixes, then verify
- ✅ Only re-run to confirm a batch resolved violations
- ✅ Minimize total check runs to save time and resources
- ✅ Use `pnpm ultracite fix --unsafe=true [scope]` as the primary tool for applying fixes
- ✅ Always use the SAME scope throughout the entire workflow

Apply the same sparing rules to `pnpm ultracite check [scope]` (for verification) and `pnpm ultracite fix --unsafe=true [scope]` (for applying fixes).

This approach ensures efficiency while maintaining accuracy. Group similar fixes together (e.g., all accessibility fixes in one batch, then all unused imports) before verification. Keep scope consistent across all executions.

## Best Practices During Execution

### Accessibility (Critical Priority)

- ✅ Ensure all interactive elements are keyboard accessible
- ✅ Validate that `aria-hidden="true"` is NEVER on focusable elements
- ✅ Check that form labels are associated with inputs
- ✅ Ensure images have meaningful alt text
- ✅ Use semantic HTML elements instead of role attributes
- ❌ Don't add `accessKey` attributes
- ❌ Don't use distracting elements like `<marquee>`

### Type Safety

- ❌ Never use `any` - use `unknown` with type narrowing or proper generics
- ❌ Never use non-null assertions (`!`) - fix the underlying type issue
- ✅ Use `import type` for type-only imports
- ✅ Use `as const` for literal types
- ✅ Use generics for reusable, type-safe functions

### Code Quality

- **🚫 CRITICAL: Never use biome ignore comments when a fix is possible**: Using `// biome-ignore` or `/* biome-ignore */` to suppress violations is strictly forbidden when a proper fix exists. Always fix the root cause rather than hiding the problem. Suppressions should only be considered in extremely rare edge cases where fixing would genuinely break legitimate functionality AND no alternative solution exists. In 99% of cases, a proper fix is possible and required.
- Prefer removing unused code over leaving it with suppressions
- Keep changes minimal and focused
- Maintain existing code style and patterns
- Fix only what's necessary; don't refactor unrelated code
- **For complexity violations**: Refactor according to project architecture principles (Domain-Driven Design, Clean Code) - extract complex logic to domain entities (`app/frontend/entities/`), services, or utility modules rather than applying superficial fixes
- **For magic numbers**: Extract to named constants in appropriate domain entities or configuration modules (`app/frontend/shared/config/`, domain entities) following architectural patterns - do NOT just assign to local variables

### React/JSX Rules

- ✅ Always include `key` props in iterators and lists (use stable identifiers, NOT array indices)
- ✅ Make sure React hooks dependencies are complete
- ✅ Use semantic HTML elements instead of role attributes
- ❌ Don't use dangerous JSX props without justification
- ❌ Don't use `dangerouslySetInnerHTML` without strong reason

### Import/Export Patterns

- ✅ Use `import type` for type-only imports
- ✅ Centralize type definitions in domain entities (`app/frontend/entities/`)
- ✅ Use barrel exports (index.ts) for logical modules
- ❌ Don't export unused variables
- ❌ Don't leave unused imports

## Violation Categories and Common Solutions

| Category                  | Solution Strategy                                                                                                                                                                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unused imports            | Remove the import unless it's part of public API                                                                                                                                                                                                                                                      |
| Unused variables          | Remove the variable or use it                                                                                                                                                                                                                                                                         |
| Accessibility violations  | Fix semantic HTML, add alt text, ensure keyboard access                                                                                                                                                                                                                                               |
| Type safety (`any` usage) | Replace with proper types or generics                                                                                                                                                                                                                                                                 |
| Missing dependencies      | Add to React hooks' dependency array                                                                                                                                                                                                                                                                  |
| Incorrect ARIA usage      | Use semantic HTML or correct ARIA attributes                                                                                                                                                                                                                                                          |
| Formatting issues         | Use `pnpm ultracite fix --unsafe=true [scope]` to apply formatting                                                                                                                                                                                                                                         |
| Incorrect key in lists    | Replace array index with stable identifier                                                                                                                                                                                                                                                            |
| Dangling refs             | Ensure all forward refs and refs are properly handled                                                                                                                                                                                                                                                 |
| Component naming          | Ensure components are PascalCase, functions are camelCase                                                                                                                                                                                                                                             |
| **Complexity violations** | **Refactor according to project architecture** - extract complex logic to domain entities (`app/frontend/entities/`), services, or utility modules. Follow DDD and Clean Code principles rather than superficial simplification                                                                       |
| **Magic numbers**         | **Extract to named constants in appropriate domain entities or configuration modules** (`app/frontend/shared/config/`, domain entities) per architectural patterns. Do NOT just assign to local variables - ensure proper placement in the architecture                                               |
| **Any violation**         | **🚫 NEVER use `// biome-ignore` when a fix is possible** - Always fix the root cause. Suppressions are forbidden except in extremely rare edge cases where fixing would break legitimate functionality AND no alternative exists. In practice, proper fixes are almost always possible and required. |

## Success Criteria

✅ `pnpm ultracite check` reports zero violations\
✅ `pnpm tsc --noEmit` still passes (no regressions)\
✅ No accessibility violations (a11y standards met)\
✅ No type safety compromises (no `any` types introduced)\
✅ Code is clean, formatted, and maintainable\
✅ All changes are tracked and logical

## Communication During Execution

- Report violation counts and categories at each phase
- Highlight accessibility issues requiring human judgment
- Summarize completed todos and remaining work
- Flag patterns that suggest systemic issues
- Note any trade-offs between automatic fixes and manual intervention

---

**Ready to begin? Execute this workflow methodically, one step at a time. Remember: Accessibility is non-negotiable, and biome ignore comments should NEVER be used when a fix is possible.**
