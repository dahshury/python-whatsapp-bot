# Ruff Code Quality and Formatting Fix Workflow

## Objective

Fix all Ruff linting and formatting issues in the Python backend codebase systematically and recursively until the code achieves zero linting violations and follows all Python code quality, type safety, and best practice standards.

## Project Context

- **Backend Location**: `app/` directory (Python/FastAPI backend services)
- **Excluded Directories**: `app/frontend/` (TypeScript/React frontend), `data/`, `__pycache__/`, `.venv/`, `venv/`, `node_modules/`, `.pytest_cache/`, `.mypy_cache/`, `.git/`, `build/`, `dist/`
- **Linting Tool**: Ruff (configured in `pyproject.toml`)
- **Type Checking**: mypy (strict mode) - configured in `pyproject.toml`
- **Key Standards Enforced**:
  - PEP 8 compliance (pycodestyle errors and warnings)
  - Code quality (flake8-bugbear, flake8-simplify)
  - Import organization (isort)
  - Modern Python syntax (pyupgrade)
  - Unused code detection (pyflakes, unused arguments)
  - Code complexity and comprehensions (flake8-comprehensions)
- **Package Manager**: uv (Python package manager)
- **Design Principles**: Uncle Bob (Clean Code), Martin Fowler (Refactoring), Eric Evans (Domain-Driven Design)
- **Ruff Configuration**: `pyproject.toml` with target Python 3.10+, line length 120, specific rule sets enabled

## Pre-Execution Checklist

Before starting the workflow:

1. Verify you understand the Ruff rules and standards in `pyproject.toml`
2. Review the Python backend rules in the workspace context
3. Understand that `--unsafe-fixes` flag enables automatic fixes for potentially unsafe changes
4. Familiarize yourself with common issues: unused imports, type safety, PEP 8 violations, import organization
5. Check existing patterns in similar files before making manual changes
6. Remember: automatic fixes should be reviewed, not blindly accepted
7. **Understand architectural refactoring priorities**: Complexity violations should be refactored according to project architecture (domain-driven design, clean code) rather than quick fixes
8. **CRITICAL: Never use Ruff ignore comments when a fix is possible**: Suppressing violations with `# noqa` or `# ruff: noqa` comments is strictly forbidden when a proper fix exists. Always fix the root cause rather than hiding the problem.
9. Note that mypy type checking is separate - this workflow focuses on Ruff linting, but fixes should not introduce mypy errors

## Execution Workflow

### Phase 1: Initial Issue Discovery

**Parameter Check**:

- **If a specific folder/file path is supplied**: Run all Ruff checks scoped to that path
- **If NO folder/file is supplied**: Default to scanning the entire `app/` directory (respecting exclusions in `pyproject.toml`)
- Store this path for consistent use throughout all subsequent Ruff runs

Command method (use `uv run ruff check --fix --unsafe-fixes` as primary tool):

- With folder supplied: `uv run ruff check --fix --unsafe-fixes [supplied-folder]`
- Without folder supplied: `uv run ruff check --fix --unsafe-fixes app/`

To check violations before fixing:

- With folder supplied: `uv run ruff check [supplied-folder]`
- Without folder supplied: `uv run ruff check app/`

Steps:

1. Determine the scope (use supplied path or default to `app/`)
2. Run `uv run ruff check [scope]` to identify violations WITHOUT making changes
3. Capture ALL error/warning output completely
4. Count total violations and categorize by type (unused imports, PEP 8 violations, import organization, type safety, formatting, etc.)
5. Do NOT attempt fixes yet - only gather information
6. **This is the ONLY time you should re-run the check before fixing** - subsequent runs happen only after you've addressed visible issues

### Phase 2: Create Structured Todo List

1. **Use the Cursor built-in todo list** (NOT an .md file)
2. Create todos using the `todo_write` tool with these guidelines:
   - **One todo per violation category** initially (e.g., "Fix PEP 8 violations in services", "Remove unused imports in domain")
   - **Break down large categories** into specific file-based todos if the category has 5+ violations
   - **Prioritize by impact**: Fix critical errors first (syntax errors, import errors), then code quality (unused code, PEP 8), then formatting
   - **Include file paths and violation types** in todo titles for clarity
   - Set initial status: `pending` for all
3. Order todos strategically:
   - First: Syntax and import errors (`app/services/`, `app/domain/`)
   - Second: Unused code and variables (`app/`)
   - Third: PEP 8 violations (`app/`)
   - Fourth: Code quality improvements (`app/`)
   - Fifth: Import organization (`app/`)
   - Sixth: Formatting (`app/`)

### Phase 3: Iterative Issue Resolution

#### IMPORTANT: Maintain scope consistency throughout

- Use the SAME folder/file path (supplied or default `app/`) for all Ruff runs
- All fixes should be made only within the defined scope
- Do not fix issues outside the supplied scope, even if discovered

**For each todo in order:**

1. **Read the Violation Details**

   - Identify specific files, line numbers, and violation messages
   - Verify violations are within the defined scope
   - Understand the rule being violated and why (check Ruff rule codes: E, W, F, I, B, C4, UP, ARG, SIM)
   - Categorize: automatic fix candidate vs. requires manual intervention
   - Check if violation is in a dependency or the main code

2. **Analyze Before Fixing**

   - For unused imports: Verify they're not exported as part of public API (`__all__`)
   - For PEP 8 violations: Ensure fixes align with project style (line length 120, double quotes)
   - For import organization: Verify isort configuration matches project structure
   - For type safety: Check if violations align with the project's strictness goals
   - **For complexity violations**: Refactor according to project architecture (extract to domain entities, services, or utilities) rather than superficial fixes
   - **For code quality issues**: Apply domain-driven design principles - extract logic to appropriate layers
   - Review similar patterns in the codebase to maintain consistency
   - Ensure fixes won't break mypy type checking

3. **Categorize Fixes**

   - **Automatic (via `uv run ruff check --fix --unsafe-fixes`)**: Formatting, unused imports, simple removals, import organization
   - **Manual**: Complex refactoring, logic changes, architectural improvements
   - **Architectural Refactoring** (preferred for complexity): Refactor to align with project architecture (domain-driven design, clean code principles) rather than quick fixes
   - **Hybrid**: Some violations need both automatic fixes and manual review
   - **🚫 NEVER**: Use `# noqa` or `# ruff: noqa` comments to suppress violations when a fix is possible. Suppressions are only acceptable in extremely rare cases where fixing would break legitimate functionality AND no alternative solution exists. Always attempt a proper fix first.

4. **Apply Fixes (Batch Before Re-running Check)**

   - For manual fixes: Correct the issues directly following Python best practices
   - For automatic fixes: Use `uv run ruff check --fix --unsafe-fixes [scope]` to apply fixes
   - For formatting: Use `uv run ruff format [scope]` after lint fixes
   - **Fix ALL violations in the current todo batch** before re-running the check
   - Ensure changes maintain code quality and project standards
   - Verify fixes don't introduce mypy errors

5. **Verify the Fix (Re-run Check Sparingly)**

   - **ONLY after completing all violations in the current batch**, run `uv run ruff check [scope]` to verify fixes
   - Do NOT re-run the check between individual fixes — batch your changes
   - Apply fixes using `uv run ruff check --fix --unsafe-fixes [scope]` to resolve remaining violations
   - Run `uv run ruff format [scope]` to ensure consistent formatting
   - Confirm violations from the completed batch are resolved
   - Check that no NEW violations were introduced elsewhere within the scope
   - Update the todo status to `in_progress`, then `completed` when verified
   - If new violations appear, add them to the todo list but do NOT re-run the command until you've handled them all
   - Optionally run `uv run mypy app/` to ensure no type errors were introduced

6. **Document Learnings**
   - If a fix reveals a pattern or reusable solution, note it internally
   - If similar violations appear elsewhere, apply the same fix proactively before running the next check
   - Note architectural patterns for future code

### Phase 4: Recursive Validation Loop

**After completing all todos:**

1. **Only then** run `uv run ruff check [scope]` one final time (supplied path or `app/`)
2. **If violations remain**:
   - Run `uv run ruff check --fix --unsafe-fixes [scope]` to fix remaining violations
   - Run `uv run ruff format [scope]` to ensure formatting is consistent
   - Create new todos for any remaining violations that require manual intervention (within scope)
   - Repeat Phase 3 until all violations are gone
   - This may involve cascading fixes (fixing one issue reveals another)
   - **Again, batch fixes before re-running the check** - do not run it between each individual fix
3. **If zero violations**:
   - Success! All Ruff violations are resolved within the defined scope.
   - Run `uv run ruff check [scope]` to confirm no violations remain
   - Run `uv run ruff format [scope]` to ensure consistent formatting
   - Verify with `uv run mypy app/` to ensure no type errors were introduced
   - Optionally run `uv run ruff check --fix --unsafe-fixes [scope]` one final time to catch any edge cases

## Critical Optimization Principle

**Re-run `uv run ruff check` SPARINGLY and ONLY when necessary:**

- ❌ Do NOT re-run after every single fix
- ❌ Do NOT re-run between related changes
- ❌ Do NOT run on different scopes than defined at the start
- ✅ Batch 3-5 related fixes, then verify
- ✅ Only re-run to confirm a batch resolved violations
- ✅ Minimize total check runs to save time and resources
- ✅ Use `uv run ruff check --fix --unsafe-fixes [scope]` as the primary tool for applying fixes
- ✅ Always use the SAME scope throughout the entire workflow
- ✅ Run `uv run ruff format [scope]` after lint fixes to ensure consistent formatting

Apply the same sparing rules to `uv run ruff check [scope]` (for verification), `uv run ruff check --fix --unsafe-fixes [scope]` (for applying fixes), and `uv run ruff format [scope]` (for formatting).

This approach ensures efficiency while maintaining accuracy. Group similar fixes together (e.g., all unused imports in one batch, then all PEP 8 violations) before verification. Keep scope consistent across all executions.

## Best Practices During Execution

### Type Safety

- ✅ Use type hints for all function signatures (enforced by mypy)
- ✅ Prefer Pydantic models over raw dictionaries for input validation
- ✅ Use explicit types for function parameters and return values
- ❌ Never use `Any` without justification - use proper types or `object`
- ❌ Never ignore type errors with `# type: ignore` when a proper fix exists

### Code Quality

- **🚫 CRITICAL: Never use Ruff ignore comments when a fix is possible**: Using `# noqa` or `# ruff: noqa` to suppress violations is strictly forbidden when a proper fix exists. Always fix the root cause rather than hiding the problem. Suppressions should only be considered in extremely rare edge cases where fixing would genuinely break legitimate functionality AND no alternative solution exists. In 99% of cases, a proper fix is possible and required.
- Prefer removing unused code over leaving it with suppressions
- Keep changes minimal and focused
- Maintain existing code style and patterns
- Fix only what's necessary; don't refactor unrelated code
- **For complexity violations**: Refactor according to project architecture principles (Domain-Driven Design, Clean Code) - extract complex logic to domain entities (`app/services/domain/`), services, or utility modules rather than applying superficial fixes
- **For magic numbers**: Extract to named constants in appropriate domain entities or configuration modules (`app/config.py`, domain entities) following architectural patterns - do NOT just assign to local variables

### Python/FastAPI Best Practices

- ✅ Use `async def` for asynchronous operations
- ✅ Use `def` for pure functions
- ✅ Follow PEP 8 for formatting (line length 120, double quotes)
- ✅ Use descriptive variable names with auxiliary verbs (e.g., `is_active`, `has_permission`)
- ✅ Use lowercase with underscores for directories and files
- ✅ Favor explicit exports (`__all__`) for public APIs
- ✅ Use Receive an Object, Return an Object (RORO) pattern
- ✅ Handle errors and edge cases at the beginning of functions
- ✅ Use early returns for error conditions
- ✅ Use guard clauses to handle preconditions
- ✅ Catch narrow exceptions with try/except; avoid blanket except clauses
- ❌ Don't use global variables; use dependency injection instead
- ❌ Don't ignore import organization (isort)

### Import/Export Patterns

- ✅ Use `import type` for type-only imports (when applicable)
- ✅ Organize imports: standard library, third-party, local (isort)
- ✅ Use explicit `__all__` exports for public APIs
- ✅ Centralize type definitions in domain entities (`app/services/domain/`)
- ❌ Don't export unused variables
- ❌ Don't leave unused imports
- ❌ Don't use wildcard imports (`from module import *`)

### Error Handling

- ✅ Prioritize error handling and edge cases
- ✅ Handle errors at the beginning of functions
- ✅ Use early returns for error conditions
- ✅ Place the happy path last in the function
- ✅ Avoid unnecessary else statements; use if-return pattern
- ✅ Use guard clauses for preconditions
- ✅ Implement proper error logging
- ✅ Catch narrow exceptions; avoid blanket except clauses
- ✅ Validate inputs at system boundaries

## Violation Categories and Common Solutions

| Category                  | Solution Strategy                                                                                                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unused imports            | Remove the import unless it's part of public API (`__all__`)                                                                                                                                                                                                                                 |
| Unused variables          | Remove the variable or use it                                                                                                                                                                                                                                                                |
| PEP 8 violations          | Fix formatting, line length (120), spacing, naming conventions                                                                                                                                                                                                                               |
| Import organization       | Use `uv run ruff check --fix` to auto-organize imports (isort)                                                                                                                                                                                                                               |
| Type safety issues        | Add proper type hints, use Pydantic models                                                                                                                                                                                                                                                   |
| Missing dependencies      | Ensure all imports are available and correct                                                                                                                                                                                                                                                 |
| Code complexity           | Refactor according to project architecture - extract to domain entities, services, or utilities                                                                                                                                                                                              |
| Magic numbers             | Extract to named constants in appropriate domain entities or configuration modules                                                                                                                                                                                                           |
| Formatting issues         | Use `uv run ruff format [scope]` to apply formatting                                                                                                                                                                                                                                         |
| Unused function arguments | Remove the argument or prefix with underscore (`_arg`) if intentionally unused                                                                                                                                                                                                               |
| Syntax errors             | Fix Python syntax errors immediately                                                                                                                                                                                                                                                         |
| **Any violation**         | **🚫 NEVER use `# noqa` when a fix is possible** - Always fix the root cause. Suppressions are forbidden except in extremely rare edge cases where fixing would break legitimate functionality AND no alternative exists. In practice, proper fixes are almost always possible and required. |

## Success Criteria

✅ `uv run ruff check` reports zero violations\
✅ `uv run ruff format --check` passes (or `uv run ruff format` applied)\
✅ `uv run mypy app/` still passes (no regressions)\
✅ No unused code or imports (unless exported as public API)\
✅ Code follows PEP 8 and project style guidelines\
✅ All changes are tracked and logical\
✅ Code follows the workspace's clean code and architecture standards

## Communication During Execution

- Report violation counts and categories at each phase
- Highlight critical issues requiring human judgment
- Summarize completed todos and remaining work
- Flag patterns that suggest systemic issues
- Note any trade-offs between automatic fixes and manual intervention
- Report any mypy regressions introduced during fixes

---

**Ready to begin? Execute this workflow methodically, one step at a time. Remember: Ruff ignore comments should NEVER be used when a fix is possible, and fixes should maintain compatibility with mypy type checking.**



