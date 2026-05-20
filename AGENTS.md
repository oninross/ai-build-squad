# AGENTS.md: Multi-Agent Build Squad Instructions

This file defines roles, responsibilities, and implementation guidelines for the AI Build Squad—a multi-agent system orchestrated by Build Squad Coordinator. Each agent brings specialized expertise to the component generation pipeline.

**Agent Roster:**

- **Build Squad Coordinator**: Routes requests, maintains state, delegates to agents, aggregates results
- **Business Analyst Agent**: Intake, requirements analysis, framework discovery, readiness validation
- **React Developer Agent**: Design retrieval, planning, code generation, post-generation formatting
- **Tester Agent**: Validation, quality gates, correction loop, coverage metrics
- **QA Agent**: Release gate, compliance review, approval, report generation

Note: For required developer skills and learning resources, see [SKILLS.md](./SKILLS.md).

---

## 1. Shared Commands (All Agents)

These commands are available to all agents for inspection, validation, and execution:

| Command                 | Purpose                                | Used By                |
| :---------------------- | :------------------------------------- | :--------------------- |
| npm install             | Install all dependencies               | Coordinator, React Dev |
| npm run storybook       | Start Storybook dev server (port 6006) | React Dev, Tester      |
| npm run build-storybook | Build static Storybook                 | React Dev              |
| npm run build           | Build component library with Rollup    | React Dev              |
| npx vitest              | Run unit tests with Vitest             | Tester                 |
| npm run lint            | Lint source files with ESLint          | Tester                 |
| npm run format          | Format code with Prettier              | React Dev              |

**Command sync policy:**

- This command table must stay aligned with SKILLS.md and package.json.
- package.json `scripts` are the canonical source of truth.
- All commands must match package.json scripts exactly.
- Commands not listed here are not used in the pipeline.

---

## 2. Agent Responsibilities & Handoff Protocol

### Business Analyst Agent (INTAKE → DISCOVERY)

**States Owned:** INTAKE, DISCOVERY

**Responsibilities:**

1. Collect component metadata interactively (one question per prompt)
2. Scan workspace for framework configurations (Storybook, Vitest, Jest)
3. Validate design token file existence (`src/app/styles/variables.css`)
4. Check Shadcn/ui configuration if applicable
5. Validate Figma URL format and accessibility
6. Emit DiscoveryPayload to React Developer Agent

**Handoff Output:** `DiscoveryPayload` containing:

- Framework availability status (PROCEED | INSTALL_FRAMEWORK | SKIP)
- Token existence status (FOUND | MISSING)
- Shadcn configuration status (CONFIGURED | NEEDS_INIT | NOT_USED)
- Validated Figma URL

### React Developer Agent (DESIGN_RETRIEVAL → PLANNING → EXECUTION)

**States Owned:** DESIGN_RETRIEVAL, PLANNING, EXECUTION

**Responsibilities:**

1. Fetch design context from Figma via MCP
2. Build generation contract from design + AGENTS.md mandates
3. Scaffold component folder structure
4. Generate all required component files (see Step 3 below)
5. Format code with Prettier
6. Emit ExecutionResult to Tester Agent

**Handoff Output:** `ExecutionResult` containing:

- Generated file paths and sizes
- Generation success status
- Any execution errors or warnings

### Tester Agent (VALIDATION)

**States Owned:** VALIDATION (State 5)

**Responsibilities:**

1. Run TypeScript typecheck on generated files
2. Run ESLint on generated files
3. Run Vitest on generated test files (if testingStatus != "SKIP")
4. Verify 80% minimum code coverage
5. Manage correction loop (max 3 attempts)
6. Return failures to React Developer Agent for re-generation
7. Emit ValidationResult to QA Agent when all checks pass

**Handoff Output:** `ValidationResult` containing:

- Typecheck, lint, test pass/fail status
- Coverage percentage
- Correction attempts count
- Final validation status (PASSED | FAILED)

### QA Agent (OUTPUT)

**States Owned:** OUTPUT (State 6)

**Responsibilities:**

1. Validate component against AGENTS.md pre-submission checklist
2. Review validation results from Tester Agent
3. Approve or reject component release
4. Generate final PipelineRunReport with QA signoff
5. Optionally submit PR or push to Git
6. Emit final report to Build Squad Coordinator

**Handoff Output:** `PipelineRunReport` containing:

- All prior stage results (intake, discovery, execution, validation)
- QA approval status and checklist
- Artifact list and file sizes
- Overall pipeline duration

---

## 3. Component Generation Workflow (React Developer Agent)

When generating a new component, the React Developer Agent always follows this sequence.

### Step 1: Validate Design Tokens (Pre-Generation)

Before generating any component code:

1. **Token File Check**: Business Analyst Agent confirms `src/app/styles/variables.css` exists (via DISCOVERY state).
2. **If Missing**: React Developer Agent creates it immediately with this starter template:

```css
:root {
  /* Colors */
  --color-primary: #0070f3;
  --color-secondary: #7928ca;
  --color-text: #333;
  --color-text-light: #666;
  --color-background: #fff;
  --color-border: #e1e1e1;

  /* Spacing Scale */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Typography */
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
}
```

### Step 2: Scaffold Component Folder

React Developer Agent creates folder structure for component named Button in atoms category:

```text
src/components/atoms/Button/
├── index.ts                    (barrel export)
├── Button.tsx                  (functional component)
├── Button.styles.scss          (BEM styles with tokens)
├── Button.types.ts             (type definitions)
├── Button.test.tsx             (unit tests)
└── Button.stories.tsx          (Storybook stories, if enabled)
```

**Folder Locations:**

- Atoms: `src/components/atoms/`
- Molecules: `src/components/molecules/`
- Organisms: `src/components/organisms/`

### Step 3: Generate Required Files (In Order)

React Developer Agent generates files in this sequence:

1. **Button.types.ts** - Define all interfaces and type exports first
   - No `any` types
   - Explicit prop interfaces
   - Export types for reuse in index.ts

2. **Button.tsx** - Implement functional component
   - Use types from Button.types.ts
   - Import styles: `import "./Button.styles.scss";`
   - Functional component only (no class components)
   - Default export the component

3. **Button.styles.scss** - BEM styles with design tokens
   - Use CSS variables from `src/app/styles/variables.css`
   - No hardcoded values
   - Block naming: `.button`
   - Element naming: `.button__icon`
   - Modifier naming: `.button--primary`

4. **Button.test.tsx** - Vitest unit tests
   - Target minimum 80% coverage
   - Test rendering, props, interactions, accessibility, edge cases
   - Use React Testing Library
   - Save to same folder as component

5. **index.ts** - Barrel export
   - Default export: component
   - Named exports: types from Button.types.ts
   - Example: `export { default } from './Button'; export type { ButtonProps } from './Button.types';`

6. **Button.stories.tsx** - Storybook stories (if storybookStatus != "SKIP")
   - Create stories for primary, secondary, and disabled variants
   - Export one default story per state

### Step 4: Post-Generation (React Developer Agent)

After all files are written:

1. Run `npm run format` to apply Prettier formatting
2. Verify all files are created and non-empty
3. Emit ExecutionResult to Tester Agent
4. Tester Agent runs validation (typecheck, lint, test)

---

## 4. Styling Rules

### BEM Methodology (Mandatory)

Naming convention:

- Block: .button
- Element: .button\_\_icon
- Modifier: .button--primary

### Design Token Usage (Mandatory)

Do not hardcode style values when a token exists. Prefer CSS variables from variables.css.

### Style Import Pattern

Import styles in component files with side-effect imports, for example:

```tsx
import "./Button.styles.scss";
```

---

## 5. TypeScript Standards

### Strict Typing Requirements

- Do not use any.
- Use explicit interfaces for props.
- Use functional components only.

### Type Organization

- Simple types can stay in component file.
- Complex types should move to ComponentName.types.ts.
- Shared types can live under src/types/.

### Export Pattern

- Component file uses default export.
- Barrel file re-exports default plus named types.

---

## 6. Testing Requirements

### Coverage Standards

- Minimum target: 80% coverage.
- Test location: colocated with component.
- Framework: Vitest + React Testing Library.

### What to Test

1. Rendering
2. Props behavior
3. User interactions
4. Basic accessibility behavior
5. Edge cases (disabled, error, empty)

---

## 7. Restrictions and Mandates

### Prohibitions

- No class components.
- No CSS Modules (.module.scss).
- No any type.
- No hardcoded style values where tokens are available.
- No dangerouslySetInnerHTML.

### Requirements

- Must create all required component files.
- Must use BEM class naming.
- Must use design tokens.
- Must target minimum 80% test coverage.
- Must run TypeScript strict checks.
- Must check for variables.css before generating components.

---

## 8. Storybook Integration

Create a story file for every component, for example Button.stories.tsx with primary, secondary, and disabled variants.

---

## 9. Pre-Submission Checklist (QA Gate)

QA Agent validates component against this checklist before approving release:

- [ ] src/app/styles/variables.css exists
- [ ] Required component files created (types, tsx, styles, test, index, stories)
- [ ] BEM methodology used in styles (.block, .block\_\_element, .block--modifier)
- [ ] Styles use design tokens (no hardcoded values)
- [ ] TypeScript strict checks pass (npm run typecheck)
- [ ] Tests are written and passing (npm run test)
- [ ] Test coverage meets 80% minimum
- [ ] Storybook story is created (if storybookStatus != "SKIP")
- [ ] Component exported via barrel file (index.ts)
- [ ] ESLint passes (npm run lint)
- [ ] Prettier formatting applied (npm run format)

**QA Agent Decision:**

- If all items checked ✅: Approve component for release
- If any items unchecked ❌: Reject and route back to React Developer Agent for correction

- [ ] src/app/styles/variables.css exists
- [ ] Required component files created
- [ ] BEM methodology used
- [ ] Styles use design tokens
- [ ] TypeScript strict checks pass
- [ ] Tests are written and passing
- [ ] Storybook story is created
- [ ] Component exported via barrel file
- [ ] ESLint passes
- [ ] Prettier formatting applied
