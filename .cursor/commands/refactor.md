# Code Refactoring and Modularization Workflow

## Objective

**PLANNING PHASE ONLY** - This command generates a comprehensive refactoring plan as a markdown file.

The output is a detailed, step-by-step refactoring strategy document that the user reviews and approves. Actual code refactoring only begins after the user explicitly says "execute the plan".

Execute this workflow to analyze a target file and create a detailed, actionable refactoring plan aligned with the Domain-Driven Design (DDD) monorepo architecture. The plan improves maintainability, reusability, and separation of concerns.

## Project Context

### Codebase Structure

```markdown
app/frontend/
├── app/ # Next.js App Router with advanced routing
│ ├── (core)/ # Core application routes
│ ├── (public)/ # Public routes
│ └── api/ # API routes with microservice structure
├── entities/ # Domain entities (DDD approach)
│ ├── conversation/ # Conversation domain
│ ├── event/ # Event domain
│ ├── phone/ # Phone domain
│ ├── rsvp/ # RSVP domain
│ ├── user/ # User domain
│ └── vacation/ # Vacation domain
├── features/ # Feature modules (cohesive business features)
│ ├── chat/ # Chat feature
│ ├── dashboard/ # Dashboard feature
│ ├── navigation/ # Navigation feature
│ └── settings/ # Settings feature
├── widgets/ # Complex UI widgets with isolated state
│ ├── {widget-name}/ # Widget-specific folder
│ │ ├── hooks/ # Widget-specific hooks
│ │ └── components/ # Widget-specific components
├── shared/ # Shared infrastructure
│ ├── config/ # Configuration management
│ ├── libs/ # Shared libraries
│ │ ├── data-grid/ # Data grid utilities
│ │ ├── calendar/ # Calendar utilities
│ │ ├── hooks/ # Global hooks
│ │ ├── websocket/ # WebSocket handling
│ │ └── [other]/ # Other shared libraries
│ ├── ui/ # Design system components
│ └── validation/ # Shared validation schemas
├── processes/ # Business process orchestration
├── services/ # External service integrations
└── styles/ # Global styles and themes
```

### Design Principles

- **Domain-Driven Design (DDD)**: Organize code around business domains
- **Uncle Bob Clean Code**: Single Responsibility, DRY, KISS
- **Separation of Concerns**: UI, business logic, utilities, services
- **Dependency Injection**: Make dependencies explicit and testable
- **Type Safety**: Strict TypeScript with no `any` types

## 🚨 Critical Linting Requirements

**Linting validation is MANDATORY throughout the entire refactoring workflow.** This is not optional.

- **After each refactoring step**: Run linting checks immediately
- **Tools to use**:
  - `read_lints` tool - Capture and analyze linting errors
- **Blocking rule**: Do NOT proceed to the next refactoring step if linting fails
- **Error logging**: Document all linting results (PASSED/FAILED with error counts)
- **Immediate action**: Fix all linting errors before continuing
- **Investigation**: If new linting errors appear, stop and investigate immediately

**This ensures code quality, type safety, and accessibility compliance throughout the refactoring process.**

## Pre-Execution Checklist

Before starting the workflow:

1. **Identify the Target File**

   - You will be given a specific file path to analyze
   - This is the ONLY file you should analyze in this planning phase
   - Do NOT refactor anything - just analyze and plan

2. **Understand the Target File**

   - Read the entire file thoroughly
   - Identify all functions, components, hooks, types, and utilities
   - Map dependencies (imports) and dependents (who uses this code)
   - Note code smells: long functions, mixed concerns, duplicated logic

3. **Understand the Architecture**

   - Review the provided codebase structure
   - Understand when to use `entities/`, `features/`, `widgets/`, `shared/libs/`
   - Know the distinction: domain entities vs. UI components vs. utilities

4. **Analyze for Refactoring Opportunities**

   - Large files (>300 lines) are candidates for splitting
   - Custom hooks should move to `shared/libs/hooks/` or `widgets/{name}/hooks/`
   - Domain logic should move to `entities/{domain}/`
   - Reusable utilities should move to `shared/libs/`
   - UI components should move to `features/` or `widgets/` depending on reusability
   - Feature-specific components belong in `features/{feature}/`

5. **Check Existing Patterns**
   - Search for similar refactored examples in the codebase
   - Understand naming conventions and folder organization
   - Follow existing patterns for consistency

## Execution Workflow

### Phase 1: Comprehensive Analysis

**IMPORTANT: This phase is ANALYSIS ONLY. Do NOT make any code changes.**

1. **Read and Understand the File**

   - Document all code sections: components, hooks, types, utilities, constants
   - Identify the main responsibility of each section
   - Note interdependencies between sections

2. **Map the Refactoring Opportunities**

   - Identify sections that violate Single Responsibility Principle
   - Find duplicated logic that should be extracted
   - Spot utilities that are too generic for this file
   - Identify hooks that could be reusable

3. **Capture Analysis Results**

   - Create a detailed inventory of all refactoring candidates
   - For each candidate, note:
     - Current location and line numbers
     - What it does (description)
     - Where it should move to (target location)
     - What else depends on it (dependents)
     - Whether it needs new imports or creates new imports

4. **Do NOT make changes yet** - analysis phase only

### Phase 2: Generate Refactoring Plan Document

## Output: Create a markdown file with the refactoring plan

1. **File Location and Naming**

   - Save the plan as: `/docs/[target-file-name]-refactor.md`
   - Example: `/docs/Grid-refactor.md`

2. **Document Structure**

   - Include: Target file name, file size (lines), analysis date
   - Include: Brief description of current state and issues
   - Include: Overview of proposed refactoring strategy
   - Include: Detailed refactoring plan as a step-by-step table

3. **Refactoring Plan Table Format**

   - Create a markdown table with columns:
     - **Step**: Numbered (1, 2, 3...)
     - **Description**: What's being refactored
     - **Source Lines**: Line numbers from original file (e.g., 45-120)
     - **Target Location**: Where it should move to
     - **Import Updates**: Files/locations that need import changes
     - **Dependencies**: What this extract depends on
   - Each row represents ONE refactoring action
   - Order by dependency: types → constants → utilities → hooks → components

4. **Example Plan Table**

   | Step | Description                | Source Lines | Target Location                                     | Import Updates          | Dependencies             |
   | ---- | -------------------------- | ------------ | --------------------------------------------------- | ----------------------- | ------------------------ |
   | 1    | Extract grid state types   | 12-35        | `shared/libs/data-grid/grid.types.ts`               | Grid.tsx import updated | React                    |
   | 2    | Extract grid constants     | 38-65        | `shared/libs/data-grid/grid.constants.ts`           | Grid.tsx import updated | None                     |
   | 3    | Extract useGridState hook  | 100-200      | `shared/libs/hooks/use-grid-state.ts`               | Grid.tsx import updated | grid.types, React hooks  |
   | 4    | Extract GridCell component | 250-350      | `widgets/data-table-editor/components/GridCell.tsx` | Grid.tsx import updated | grid.types, shared/ui/\* |
   | 5    | Update imports in original | -            | Grid.tsx                                            | Add 4 import statements | Previous steps           |

5. **Include Additional Context**

   - Current file stats: total lines, number of functions/components/hooks
   - Estimated refactored state: total lines after all extractions
   - Expected file size reduction percentage
   - List all new files that will be created
   - List all files that will need import updates
   - Any risks or trade-offs to be aware of
   - Implementation notes and patterns to follow

6. **Add Success Criteria Section**
   - Checklist of what should be true after execution
   - Verification steps to run after each refactoring step

## CRITICAL: Wait for User Approval

### Do Not Proceed to Execution

After generating the markdown plan document:

1. Report that the plan is complete
2. Provide the file path where the plan was saved
3. Ask the user to review the plan
4. **WAIT for the user to explicitly say "execute the plan"**
5. Only when the user confirms should you proceed to actual refactoring

## Phases 3-4: Execution (Conditional - Only After User Says "Execute")

### These Phases Are ONLY Executed If Approved

If and when the user approves, proceed with:

### Phase 3: Iterative Refactoring Execution

Follow the steps in the generated plan:

1. **Use Cursor Todo List**

   - Create a todo for each step in the refactoring plan
   - Order them exactly as in the plan document
   - Set all to `pending` initially

2. **Execute Each Step**

   - Re-read the code section to be extracted
   - Analyze all dependencies
   - Create the target file with proper types and exports
   - Update the original file with new imports
   - Update all dependent files with new imports
   - **🚨 CRITICAL: Verify with linting after EVERY step** (see Linting Validation below)

3. **Linting Validation** (MANDATORY AFTER EACH STEP)

   - After each refactoring step, immediately run linting checks:
     - Run: `pnpm tsc --noEmit` from `app/frontend/` to check TypeScript errors
     - Run: `npx ultracite check app/frontend/` to check Biome linting violations
   - **Do NOT proceed to the next step if linting fails**
   - Fix all errors before moving to the next refactoring step
   - Log linting results for each step in your tracking
   - If new linting errors appear, investigate immediately and fix before continuing

4. **Track Progress**
   - Update todo status as you proceed
   - **Document linting status after each step**: ✅ PASSED or ❌ FAILED with error count
   - Document any deviations from the plan
   - Flag any unexpected issues or linting violations
   - Keep a running log of linting results

### Phase 4: Post-Refactoring Validation

After all todos are completed:

1. **Full Codebase Linting Check** (PRIMARY VALIDATION)

   - **MUST achieve**: Zero TypeScript errors and zero linting violations
   - Use `read_lints` tool to capture any remaining errors for analysis
   - If any linting errors exist, treat as critical blockers and fix immediately

2. **Verify Refactoring Results**

   - Compare original file before/after
   - Verify all new files exist and are importable
   - Check that all imports are correct across the codebase
   - Validate no circular dependencies created
   - Review linting logs to ensure no new violations were introduced

3. **Final Report**
   - Linting status: ✅ PASSED (zero errors/violations)
   - File size reduction metrics
   - Number of new files created
   - Import changes summary
   - Any patterns or lessons learned

## Best Practices During Planning

### Linting Best Practices

- ✅ **ALWAYS run linting checks after EVERY refactoring step** - Do not skip this
- ✅ Fix linting errors immediately before moving to the next step
- ✅ Use the `read_lints` tool to capture detailed error information
- ✅ Document linting status (PASSED/FAILED) for each step in your tracking
- ✅ If linting fails at any point, stop execution and investigate before continuing
- ✅ Treat linting failures as blocking issues - they prevent proceeding
- ✅ Review full linting output to understand all violations before fixing
- ❌ Don't skip linting checks to "speed up" the refactoring
- ❌ Don't proceed to the next step if linting fails
- ❌ Don't ignore new linting errors that appear after refactoring
- ❌ Don't assume linting will pass - verify it every time

### Step-by-Step Linting Workflow (During Refactoring Execution)

1. **Capture Error Details**

   - Use `read_lints` tool on affected files
   - Review specific errors and understand root causes
   - Fix all errors before proceeding to next step

2. **Fix Any Errors**
   - If errors found: analyze and fix immediately
   - Re-run both linting commands to verify fixes
   - Do NOT move to next step until fully resolved

### Analysis Quality

- ✅ Be thorough in the analysis phase
- ✅ Identify ALL refactoring opportunities before planning
- ✅ Consider dependency chains
- ✅ Think about circular dependencies
- ❌ Don't skip hard-to-refactor sections (note them as special cases)
- ❌ Don't assume without verifying imports and usage

### Plan Quality

- ✅ Make the plan specific and actionable
- ✅ Include all necessary file paths and line numbers
- ✅ Document dependencies clearly
- ✅ Explain WHY each extraction improves the code
- ❌ Don't create an overly complex plan with too many steps
- ❌ Don't suggest extractions that create circular dependencies

## Common Refactoring Patterns

| Pattern               | Source Location      | Target Location                                 | Example                                 |
| --------------------- | -------------------- | ----------------------------------------------- | --------------------------------------- |
| Custom React hook     | Large component file | `shared/libs/hooks/` or `widgets/{name}/hooks/` | Extract `useGridState` from Grid.tsx    |
| Domain type/interface | Feature/widget file  | `entities/{domain}/`                            | Move `Event` type to entities/event/    |
| Utility function      | Feature/widget file  | `shared/libs/`                                  | Extract `formatGridValue()`             |
| Constants             | Scattered in file    | `shared/libs/{feature}/constants.ts`            | Create grid.constants.ts                |
| Reusable component    | Feature-specific     | `widgets/` or `shared/ui/`                      | Move GridCell to widgets                |
| Domain logic          | UI component         | `services/` or `processes/`                     | Move business rules to separate service |
| Type definitions      | Component file       | `entities/`                                     | Move domain types to domain folder      |

## Success Criteria for the Plan

✅ Plan is specific with exact line numbers and file paths\
✅ All refactoring steps are ordered by dependency\
✅ No circular dependencies in the proposed structure\
✅ Each step has clear import update instructions\
✅ Plan explains WHY each extraction improves the code\
✅ All new file locations follow DDD architecture\
✅ Plan includes before/after metrics and estimates

## Communication During Planning

- Clearly state the target file being analyzed
- Report the analysis findings at the end of Phase 1
- Provide the markdown file path where the plan was saved
- Ask for user approval before proceeding
- **DO NOT execute any refactoring without explicit user approval**

---

**Ready to begin? Analyze the provided file and generate a comprehensive refactoring plan as a markdown document. Wait for user approval before executing.**
