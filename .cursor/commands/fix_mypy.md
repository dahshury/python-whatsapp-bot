# mypy Type Checking and Error Resolution Workflow

## Objective

Fix all mypy type errors in the Python backend codebase systematically and recursively until the codebase achieves zero type errors.

## Project Context

- **Backend Location**: `app/` directory (Python/FastAPI backend services)
- **Excluded Directories**: `app/frontend/` (TypeScript/React frontend), `node_modules/`, `tests/e2e/`
- **Type Checker**: mypy (strict mode) - configured in `pyproject.toml`
- **Python Version**: 3.10+
- **Linting Tool**: Ruff (configured in `pyproject.toml`)
- **Code Quality Standards**: Strict type safety, clean code principles (following Uncle Bob, Martin Fowler, Eric Evans patterns)
- **Package Manager**: uv (Python package manager)
- **mypy Configuration**: Strict mode with all `disallow_any_*` flags enabled, `disallow_untyped_defs`, `disallow_incomplete_defs`, `strict_equality`, `extra_checks`, Pydantic plugin enabled

## Pre-Execution Checklist

Before starting the workflow:

1. Verify you understand the project structure and constraints
2. Review the Python backend rules in the workspace context
3. Note that this is a strict type-safety codebase - avoid `Any` types at all costs
4. Familiarize yourself with the domain entities: `app/services/domain/`
5. Check existing patterns in similar files before making changes
6. Understand that mypy strict mode requires explicit type annotations for all functions and variables

## Execution Workflow

### Phase 1: Initial Error Discovery

**Parameter Check**:

- **If a specific folder/file path is supplied**: Run all mypy checks scoped to that path
- **If NO folder/file is supplied**: Default to scanning the entire `app/` directory (respecting exclusions in `pyproject.toml`)
- Store this path for consistent use throughout all subsequent mypy runs

Command method:

- With folder supplied: `uv run mypy [supplied-folder]`
- Without folder supplied: `uv run mypy app/`

Steps:

1. Determine the scope (use supplied path or default to `app/`)
2. Execute: `uv run mypy [scope]` to identify type errors WITHOUT making changes
3. Capture ALL error output completely
4. Count total errors and categorize by type (missing type annotations, type mismatches, incompatible types, etc.)
5. Do NOT attempt fixes yet - only gather information
6. **This is the ONLY time you should run this command before fixing** - subsequent runs happen only after you've addressed visible errors

### Phase 2: Create Structured Todo List

1. **Use the Cursor built-in todo list** (NOT an .md file)
2. Create todos using the `todo_write` tool with these guidelines:
   - **One todo per error category** initially (e.g., "Fix missing type annotations in services", "Resolve type mismatches in domain models")
   - **Break down large categories** into specific file-based todos if the category has 5+ errors
   - **Prioritize by dependency**: Fix foundational errors first (domain models, services, types) before views/routers
   - **Include file paths** in todo titles for clarity
   - Set initial status: `pending` for all
3. Order todos strategically:
   - First: Core types and domain models (`app/services/domain/`)
   - Second: Services and utilities (`app/services/`, `app/utils/`)
   - Third: Database models and schemas (`app/db.py`, `app/auth/models.py`, `app/auth/schemas.py`)
   - Fourth: Routers and views (`app/views.py`, `app/auth/router.py`)
   - Fifth: Configuration and initialization (`app/config.py`, `app/__init__.py`)

### Phase 3: Iterative Error Resolution

#### IMPORTANT: Maintain scope consistency throughout

- Use the SAME folder/file path (supplied or default `app/`) for all mypy runs
- All fixes should be made only within the defined scope
- Do not fix issues outside the supplied scope, even if discovered

**For each todo in order:**

1. **Read the Error Details**

   - Identify specific files, line numbers, and error messages
   - Verify errors are within the defined scope
   - Understand the root cause (missing type annotation, incorrect type, incompatible types, etc.)
   - Check if the error is in a dependency or the main code
   - Note the mypy error code (e.g., `[no-untyped-def]`, `[arg-type]`, `[return]`)

2. **Analyze Before Fixing**

   - Examine the file context and related code
   - Check how similar issues are resolved elsewhere in the codebase
   - Ensure your fix aligns with project patterns and mypy strictness
   - For Pydantic models: Verify they're properly typed (mypy plugin handles this automatically)
   - For async functions: Ensure proper return type annotations
   - For generics: Use proper type parameters

3. **Apply the Fix**

   - Make minimal, focused changes
   - Prefer proper typing over `Any` or type ignores (`# type: ignore`)
   - For missing annotations: Add explicit type hints for function parameters and return types
   - For type mismatches: Understand expected vs. actual type; adjust or convert appropriately
   - For incomplete definitions: Add missing type annotations
   - For Pydantic models: Ensure proper BaseModel usage (plugin handles most cases)
   - Follow Ruff formatting and linting rules automatically
   - **Fix ALL errors in the current todo batch** before re-running the command

4. **Verify the Fix (Run Command Sparingly)**

   - **ONLY after completing all errors in the current batch**, execute: `uv run mypy [scope]`
   - Do NOT run this command between individual fixes - batch your changes
   - Confirm that errors from the completed batch are resolved
   - Check that no NEW errors were introduced elsewhere
   - Update the todo status to `in_progress`, then `completed` when verified
   - If new errors appear, add them to the todo list but do NOT re-run the command until you've handled them all

5. **Document Learnings**
   - If a fix reveals a pattern or reusable solution, note it internally
   - If similar errors appear elsewhere, apply the same fix proactively before running the next check
   - Note type patterns for future code

### Phase 4: Recursive Validation Loop

**After completing all todos:**

1. **Only then** run: `uv run mypy [scope]` one final time (supplied path or `app/`)
2. **If errors remain**:
   - Create new todos for the remaining errors
   - Repeat Phase 3 until all errors are gone
   - This may involve cascading fixes (fixing one error reveals another)
   - **Again, batch fixes before re-running the command** - do not run it between each individual fix
3. **If zero errors**:
   - Success! All mypy type errors are resolved.
   - Run: `uv run ruff check` to ensure linting compliance
   - If ruff finds issues, fix them and rerun `uv run mypy [scope]` to confirm no regressions

## Critical Optimization Principle

**Run `uv run mypy` SPARINGLY and ONLY when necessary:**

- ❌ Do NOT run after every single fix
- ❌ Do NOT run between related changes
- ❌ Do NOT run on different scopes than defined at the start
- ✅ Batch 3-5 related fixes, then verify
- ✅ Only run to confirm a batch resolved errors
- ✅ Minimize total command executions to save time and resources
- ✅ Always use the SAME scope throughout the entire workflow

This approach ensures efficiency while maintaining accuracy. Group similar fixes together (e.g., all missing type annotations in one batch, then all type mismatches) before verification.

## Best Practices During Execution

### Type Safety

- ❌ **Never use `Any`** - use `object` or proper types with type narrowing
- ❌ **Never use `# type: ignore`** without justification - fix the underlying type issue
- ✅ **Use explicit type annotations** for all function signatures (parameters and return types)
- ✅ **Use `typing` module** for complex types (`Optional`, `Union`, `Dict`, `List`, etc.)
- ✅ **Use `from __future__ import annotations`** for forward references if needed
- ✅ **Use generic types** for reusable, type-safe functions and classes
- ✅ **Use Pydantic models** for structured data validation (mypy plugin handles typing)

### Code Quality

- Prefer removing unused code over leaving it with suppressions
- Keep changes minimal and focused
- Maintain existing code style and patterns
- Fix only what's necessary; don't refactor unrelated code
- **For type narrowing**: Use `isinstance()` checks and type guards
- **For Optional types**: Use `Optional[T]` or `T | None` (Python 3.10+)

### Python/FastAPI Best Practices

- ✅ Use `async def` for asynchronous operations with proper return type annotations
- ✅ Use `def` for pure functions with explicit return types
- ✅ Use Pydantic models for request/response validation (mypy plugin handles this)
- ✅ Use type hints for all function parameters and return values
- ✅ Use `typing.Protocol` for structural subtyping when needed
- ✅ Use `Literal` types for string/enum-like values
- ✅ Use `TypedDict` for dictionary structures with known keys
- ❌ Don't use `# type: ignore` to suppress legitimate errors
- ❌ Don't use `Any` as a workaround for complex types

### Import/Type Patterns

- ✅ Use `from typing import` for type hints
- ✅ Use `from __future__ import annotations` to avoid quoting forward references
- ✅ Centralize type definitions in domain entities (`app/services/domain/`)
- ✅ Use `Protocol` for structural typing interfaces
- ✅ Use `Generic` for reusable type parameters
- ❌ Don't use string literals for type hints unless necessary (use `from __future__ import annotations`)

### Error Handling

- ✅ Type exception handlers: `except Exception as e: ...` (mypy understands common exceptions)
- ✅ Use `Optional[T]` or `T | None` for nullable return values
- ✅ Use `Union` types for multiple possible types
- ✅ Use type guards for narrowing types in conditionals

## Error Categories and Common Solutions

| Category                    | Solution Strategy                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------- |
| Missing type annotations    | Add explicit type hints for function parameters and return types                           |
| Type mismatches             | Understand expected vs. actual type; adjust or convert appropriately                       |
| Incomplete type definitions | Add missing type annotations for all function parameters and return types                  |
| Incompatible types          | Check actual vs. expected types; use type conversions or adjust types                      |
| Untyped function calls      | Add type annotations to the called function or use type stubs                              |
| Return type errors          | Ensure function return type matches annotation; use `None` for functions that don't return |
| Argument type errors        | Check parameter types match function signature; convert types if needed                    |
| Missing attributes          | Add missing attributes to class/type definition or use `hasattr()` checks                  |
| Generic type errors         | Use proper generic type parameters (`TypeVar`, `Generic`)                                  |
| Optional type errors        | Use `Optional[T]` or `T                                                                    | None`; handle `None` cases explicitly |
| Pydantic model errors       | Ensure BaseModel inheritance; mypy plugin handles most cases automatically                 |
| Forward reference errors    | Use `from __future__ import annotations` or quote type hints                               |

## Success Criteria

✅ `uv run mypy app/` runs with zero errors\
✅ `uv run ruff check` passes all checks\
✅ No type suppressions (`# type: ignore`) added unnecessarily\
✅ All functions have explicit type annotations\
✅ Code follows the workspace's clean code and architecture standards\
✅ All changes are tracked and logical

## Communication During Execution

- Report error counts and categories at each phase
- Highlight blocking issues that require human judgment
- Summarize completed todos and remaining work
- Flag any patterns that suggest systemic issues to address
- Note any Ruff violations introduced during fixes

---

**Ready to begin? Execute this workflow methodically, one step at a time. Remember: mypy strict mode requires explicit type annotations for all functions, and `Any` types should be avoided at all costs.**





