## Code Refactoring Command (FSCA + DDD + Clean Architecture)

### Objective

PLANNING PHASE ONLY — Generate a comprehensive refactoring plan aligned with Feature-Sliced Clean Architecture, Domain-Driven Design, and Clean Architecture principles. Execution happens ONLY after explicit user approval.

**CRITICAL PRINCIPLES:**

- **Preserve functionality**: The refactoring MUST maintain identical behavior — no changes to business logic, edge cases, or output
- **Move as-is when possible**: Extract code blocks verbatim when they fit architecture without modification
- **Architectural adaptations allowed**: When architecture patterns require structural changes (wrappers, adapters, interface implementations, call signature changes), make ONLY those changes — preserve all business logic inside
- **Strict structure adherence**: All code must be placed in correct layers per `@frontend_structure.mdc`, adapting structure as needed while keeping functionality identical

### Architecture Source of Truth

- All architecture details (FSD layers, DDD patterns, Clean Architecture mapping, dependency rules, public API rules, file size limits, testing structure, error handling) are defined in `@frontend_structure.mdc` (located at `.cursor/rules/frontend_structure.mdc`).
- Do not restate architecture in this prompt. Always reference and follow `@frontend_structure.mdc`.

---

## Refactoring Workflow

### Phase 1: Analysis (PLANNING ONLY)

1. **Read target file**
   - Identify components, hooks, business logic, types, utilities
   - Map dependencies and imports
   - Note code smells: large files, mixed concerns, SRP violations
   - **Preserve all logic**: Document what each section does to ensure identical behavior after refactoring

2. **Identify refactoring opportunities**
   - Map code to layers/patterns defined in `@frontend_structure.mdc`
   - Plan extractions to entities/features/widgets/pages/shared as appropriate
   - Plan DTOs, repositories, adapters, mappers, factories, and value objects as needed
   - **Move vs adapt**: Determine if code can be moved as-is or needs architectural wrapping/adaptation (e.g., wrap existing function in repository interface, create adapter for external API call)
   - **Preserve logic**: Even when adapting structure, keep all business logic, calculations, conditionals, and error handling exactly as-is

3. **Check import boundaries**
   - Enforce inward dependency flow per `@frontend_structure.mdc`
   - No cross-feature imports or upward dependencies
   - Use public API `index.ts` exports only (no deep imports)
   - **Functionality unchanged**: Changing import paths does not change what the code does

### Phase 2: Generate Refactoring Plan

**Output**: Create markdown file at `/docs/[filename]-refactor.md`

**Structure**:

```markdown
# Refactoring Plan: [Filename]

## Current State

- File: `[path]`
- Size: [X] lines
- Issues: [list code smells]

## Proposed Changes

**Refactoring Constraints:**

- **Move as-is when possible**: Extract exact code blocks verbatim when they fit architecture structure
- **Architectural adaptations allowed**: When architecture requires structural changes, wrap/adapt code while preserving all business logic:
  - Create repository interfaces and implement them with existing logic
  - Wrap functions in adapters to match architectural patterns
  - Change call signatures to match interfaces (but keep implementation identical)
  - Split code across layers as required by `@frontend_structure.mdc`
- **No logic changes**: Preserve all conditionals, calculations, data transformations, error handling, and business rules exactly
- **Update imports**: Change import paths to use public APIs and maintain correct dependency flow

| Step | Description                  | Source Lines | Target Location                     | Dependencies         | Change Type                    |
| ---- | ---------------------------- | ------------ | ----------------------------------- | -------------------- | ------------------------------ |
| 1    | Extract domain types         | 10-50        | `entities/{entity}/types/`          | None                 | Move as-is                     |
| 2    | Extract value objects        | 51-100       | `entities/{entity}/value-objects/`  | types                | Move as-is                     |
| 3    | Extract domain entity        | 101-200      | `entities/{entity}/core/`           | types, value-objects | Move as-is or adapt to pattern |
| 4    | Extract factory              | 201-240      | `entities/{entity}/core/`           | domain               | Move as-is or wrap in factory  |
| 5    | Extract repository interface | 241-280      | `entities/{entity}/core/`           | domain               | Create interface (new)         |
| 6    | Extract repository impl      | 281-320      | `entities/{entity}/infrastructure/` | repository interface | Adapt to interface, keep logic |
| 7    | Extract service              | 321-400      | `features/{feature}/services/`      | repositories         | Move as-is or adapt signature  |
| 8    | Extract hooks                | 401-480      | `features/{feature}/hooks/`         | services             | Move as-is                     |
| 9    | Extract UI components        | 481-600      | `features/{feature}/ui/`            | hooks                | Move as-is                     |
| 10   | Update public APIs           | -            | Various `index.ts` files            | All above            | Export only                    |

## Expected Outcomes

- Files created: [X]
- Original file size: [X] → [Y] lines
- Improved maintainability: [reasoning]

## Verification Steps

- [ ] TypeScript compiles
- [ ] All tests pass
- [ ] Import boundaries respected (see `@frontend_structure.mdc`)
- [ ] No circular dependencies
```

### Phase 3: Execution (ONLY AFTER USER APPROVAL)

#### Wait for User Approval

Do not proceed until user explicitly says "execute the plan"

1. **Create todo list**
   - One todo per plan step
   - Set all to `pending`

2. **Execute each step**
   - Create target file
   - **Move or adapt as needed**:
     - If code fits architecture: Move verbatim — copy code blocks exactly as-is
     - If architecture requires adaptation: Wrap/adapt structure (interfaces, adapters, signatures) while preserving all business logic inside
   - **Preserve all logic**: Never modify conditionals, calculations, data transformations, error handling, or business rules — only structural/wrapper changes
   - Update imports to use public APIs (change import paths, maintain dependency flow)
   - **Verify behavior preserved**: Ensure refactored code performs identically to original — same inputs produce same outputs
   - Verify immediately: `pnpm tsc --noEmit`, `npx biome check .`
   - Mark todo complete

3. **Final validation**
   - Run all linters and type checks
   - Run tests
   - Verify import boundaries and no circular dependencies

---

## Success Criteria

✅ Specific line numbers and file paths
✅ Ordered by dependencies (no circular refs)
✅ Import boundaries respected per `@frontend_structure.mdc`
✅ Explains WHY each extraction improves architecture
✅ Includes before/after metrics
✅ Plans for comprehensive testing
✅ **Functionality identical**: Refactored code produces same outputs, handles same edge cases, preserves all behavior
✅ **Move as-is or adapt structure**: Code moved verbatim when possible; when architecture requires it, wrap/adapt structure (interfaces, adapters) while keeping all business logic identical
✅ **No logic modifications**: All conditionals, calculations, transformations, error handling preserved exactly — only structural changes for architecture compliance
✅ **Architectural compliance**: Code properly placed in correct layers per `@frontend_structure.mdc` with proper dependency flow and public APIs

---

Ready to begin? Provide the target file path to analyze.
