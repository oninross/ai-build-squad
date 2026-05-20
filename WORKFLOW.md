# WORKFLOW.md: AI Build Squad Component Generation Pipeline

This document defines the executable workflow schema for the AI Build Squad component generation pipeline using multi-agent orchestration.

---

## Overview

The pipeline orchestrates component generation through seven sequential states via a **Build Squad Coordinator** that delegates to specialized agents (Business Analyst, React Developer, Tester, QA). Each agent contributes domain expertise while maintaining deterministic workflows with guardrails and conditional branching. The workflow accepts both interactive and batch inputs.

## Testing Strategy

**Primary (Validation Gate):** Vitest + React Testing Library

- Unit tests for generated components
- Validates props, rendering, interactions, accessibility
- Runs as part of correction loop (State 5: VALIDATION)
- Provides coverage metrics (80% minimum gate)
- Fast feedback (milliseconds to seconds)
- Deterministic results for reliable correction feedback

**Secondary (Downstream Quality Layer):** Playwright

- Visual regression testing via Storybook snapshots
- E2E and integration tests across multiple components
- Real browser testing (Chrome, Safari, Firefox)
- Runs in Phase 6 (Deployment and Delivery) after component validation
- Optional quality assurance layer, not part of core generation loop

---

## Agent Orchestration Model

The **Build Squad Coordinator** routes component requests through specialized agents at each workflow stage:

| Agent                       | Role                 | States                                | Responsibility                                                                        |
| :-------------------------- | :------------------- | :------------------------------------ | :------------------------------------------------------------------------------------ |
| **Build Squad Coordinator** | Orchestrator         | ALL                                   | Routes requests, maintains state, delegates to agents, aggregates results             |
| **Business Analyst Agent**  | Intake & Discovery   | INTAKE, DISCOVERY                     | Collects requirements, scans workspace, validates design readiness                    |
| **React Developer Agent**   | Planning & Execution | DESIGN_RETRIEVAL, PLANNING, EXECUTION | Fetches design, builds contracts, generates component code with strict typing and BEM |
| **Tester Agent**            | Validation           | VALIDATION                            | Runs quality gates (typecheck, lint, test), manages correction loop (max 3 attempts)  |
| **QA Agent**                | Release Gate         | OUTPUT                                | Approves artifacts, evaluates risk, signs off on component readiness                  |

**Coordination Flow:**

```
User Request
    ↓
Build Squad Coordinator
    ├→ Delegate to Business Analyst (INTAKE, DISCOVERY)
    ├→ Delegate to React Developer (DESIGN_RETRIEVAL, PLANNING, EXECUTION)
    ├→ Delegate to Tester (VALIDATION, Correction Loop)
    ├→ Delegate to QA (OUTPUT, Approval)
    ↓
Final Report & Artifacts
```

---

## Workflow State Machine

```
[INTAKE]
  ↓
[DISCOVERY]
  ↓
[DESIGN_RETRIEVAL]
  ↓
[PLANNING]
  ↓
[EXECUTION]
  ↓
[VALIDATION]
  ↓
[OUTPUT]
```

---

## State Definitions

### State 0: INTAKE

**Owned By:** Business Analyst Agent

**Purpose:** Collect component metadata and framework preferences.

**Input Mode:**

- **Interactive:** Ask user one question at a time; wait for response after each.
- **Batch:** Accept pre-filled IntakePayload from CI/external source.

**Questions (Interactive Only):**

1. Component Name (string, required)
2. Category (enum: "atom" | "molecule" | "organism")
3. Use Shadcn UI? (boolean, optional)
4. Figma Link (URL, required)

**Output Type:**

```typescript
interface IntakePayload {
  componentName: string;
  category: "atom" | "molecule" | "organism";
  useShadcn: boolean;
  figmaLink: string;
  storybook?: { desired: boolean };
  testing?: { desired: boolean };
}
```

**Guard:** All required fields must be non-empty; Figma URL must be valid.

**Next State:** DISCOVERY

---

### State 1: DISCOVERY

**Owned By:** Business Analyst Agent

**Purpose:** Scan workspace for required frameworks, design tokens, and compute installation decisions. Validate design readiness.

**Tasks:**

1. Check for Storybook:
   - Scan for `.storybook/main.ts` or `.storybook/main.js`
   - If found: `storybookStatus = "PROCEED"`
   - If not found and user wants stories: Ask to install; if yes, `status = "INSTALL_FRAMEWORK"`; if no, `status = "SKIP"`
   - If user does not want stories: `status = "SKIP"`

2. Check for Testing Framework:
   - Scan for `vitest.config.ts` or `jest.config.js`
   - If found: `testingStatus = "PROCEED"`
   - If not found and user wants tests: Ask to install; if yes, `status = "INSTALL_FRAMEWORK"`; if no, `status = "SKIP"`
   - If user does not want tests: `status = "SKIP"`

3. Check for Design Tokens:
   - Scan for `src/app/styles/variables.css`
   - If found: `tokensStatus = "FOUND"`
   - If not found: `tokensStatus = "MISSING"` (warn; will be created during execution per AGENTS.md requirements)

4. Check for Shadcn (if useShadcn = true):
   - Scan for `components.json`
   - If found: `shadcnStatus = "CONFIGURED"`
   - If not found: `shadcnStatus = "NEEDS_INIT"` (will run init)

5. Validate Figma URL & Design Link:
   - Confirm URL format is valid
   - Test Figma access (MCP will validate in DESIGN_RETRIEVAL)
   - Document any design warnings or constraints

**Output Type:**

```typescript
interface DiscoveryPayload extends IntakePayload {
  storybookStatus: "PROCEED" | "INSTALL_FRAMEWORK" | "SKIP";
  testingStatus: "PROCEED" | "INSTALL_FRAMEWORK" | "SKIP";
  tokensStatus: "FOUND" | "MISSING";
  shadcnStatus: "CONFIGURED" | "NEEDS_INIT" | "NOT_USED";
  timestamp: ISO8601;
}
```

**Guard:** If any required framework is set to INSTALL_FRAMEWORK, user must confirm before proceeding.

**Next State:** DESIGN_RETRIEVAL

---

### State 2: DESIGN_RETRIEVAL

**Owned By:** React Developer Agent

**Purpose:** Fetch and validate design context from Figma via MCP. Extract design tokens, layout constraints, component hints, and screenshots.

**Tasks:**

1. Parse Figma URL and extract fileKey and nodeId.
2. Call MCP Figma design context tool (`get_design_context`) to retrieve:
   - Reference code (React/Tailwind with hints)
   - Design screenshot for visual validation
   - Component metadata (layout, interactions)
3. Normalize response: extract design tokens, layout, component type hints, screenshots.
4. Detect if design matches a Shadcn primitive (Badge, Button, Input, Select, Checkbox) and store hint for PLANNING.
5. Validate alignment with BEM naming conventions (see AGENTS.md Styling Rules).
6. Fail fast if Figma URL is invalid or MCP returns error.

**Output Type:**

```typescript
interface DesignContext {
  figmaLink: string;
  fileKey: string;
  nodeId: string;
  componentName: string;
  screenshot: Buffer;
  tokens: {
    colors?: Record<string, string>;
    spacing?: Record<string, string>;
    typography?: Record<string, string>;
  };
  layout: {
    width: number;
    height: number;
    hasInteractivity: boolean;
  };
  shadcnHint?: "Badge" | "Button" | "Input" | "Select" | "Checkbox" | null;
}

interface PlanningInput extends DiscoveryPayload {
  designContext: DesignContext;
}
```

**Guard:** If Figma retrieval fails, emit error and halt.

**Next State:** PLANNING

---

### State 3: PLANNING

**Owned By:** React Developer Agent

**Purpose:** Build the generation contract from validated design context. Ensure component structure aligns with AGENTS.md mandates: BEM styling, design tokens, strict typing, and 80% test coverage targets.

**Tasks:**

1. Determine component structure per AGENTS.md Section 2:
   - Folder path = `src/components/[Category]/[ComponentName]/` (atoms/molecules/organisms)

2. Determine required file bundle:
   - `index.ts` (barrel export with named types)
   - `ComponentName.tsx` (functional component, no class components)
   - `ComponentName.styles.scss` (BEM methodology)
   - `ComponentName.types.ts` (explicit interfaces, no `any`)
   - `ComponentName.test.tsx` (target 80% coverage, React Testing Library)
   - `ComponentName.stories.tsx` (Storybook story if storybookStatus != "SKIP")

3. Design token validation:
   - If tokensStatus = "MISSING": include design token file creation step (use AGENTS.md template)
   - Map design tokens from Figma to CSS variable names
   - Validate BEM selector naming convention

4. Framework prerequisites:
   - If useShadcn and shadcnHint exists: include Shadcn primitive installation
   - If storybookStatus = "INSTALL_FRAMEWORK": include Storybook init step
   - If testingStatus = "INSTALL_FRAMEWORK": include Vitest init step

5. Build single execution order (install, scaffold, generate, validate, format)

**Output Type:**

```typescript
interface GenerationContract {
  intake: IntakePayload;
  discovery: DiscoveryPayload;
  designContext: DesignContext;
  executionPlan: {
    preGeneration: Array<{
      step: string;
      command?: string;
      condition: boolean;
    }>;
    generation: {
      folderPath: string;
      files: Array<{
        name: string;
        type: "tsx" | "scss" | "ts" | "json";
        template: string; // or reference to template
      }>;
    };
    postGeneration: Array<{
      step: string;
      command: string;
      condition: boolean;
    }>;
  };
  validationGates: {
    typecheck: boolean;
    lint: boolean;
    test: boolean;
  };
}
```

**Guard:** Validate that all file paths are deterministic and do not conflict with existing components.

**Next State:** EXECUTION

---

### State 4: EXECUTION

**Owned By:** React Developer Agent

**Purpose:** Install frameworks, scaffold folders, generate component artifacts, and apply formatting per AGENTS.md standards.

**Tasks:**

1. **Pre-Generation Phase:**
   - If shadcnStatus = "NEEDS_INIT": run `npx shadcn@latest init`
   - If shadcnHint exists: run `npx shadcn@latest add [primitive]`
   - If storybookStatus = "INSTALL_FRAMEWORK": run `npm install -D storybook`
   - If testingStatus = "INSTALL_FRAMEWORK": run `npm install -D vitest`
   - If tokensStatus = "MISSING": create `src/app/styles/variables.css` with starter template per AGENTS.md Step 1

2. **Folder Scaffolding Phase:**
   - Create directory: `src/components/[Category]/[ComponentName]/`
   - Confirm folder creation success before proceeding

3. **Code Generation Phase:**
   - Generate all required files per AGENTS.md Section 3 (component generation workflow):
     - **ComponentName.types.ts**: Define explicit interfaces; no `any` (AGENTS.md Section 4: Strict Typing)
     - **ComponentName.tsx**: Functional component with React hooks, proper prop typing (no class components)
     - **ComponentName.styles.scss**: BEM methodology with design tokens from variables.css
     - **ComponentName.test.tsx**: Minimum 80% coverage target (rendering, props, interactions, accessibility, edge cases)
     - **index.ts**: Barrel export with named types re-export
     - **ComponentName.stories.tsx**: Primary, secondary, and disabled variants (if Storybook enabled)

4. **Post-Generation Phase:**
   - Format all generated files: `npm run format` (Prettier)
   - Verify no lint errors (files should follow ESLint standards)
   - Confirm all files exist and are non-empty

**Code Standards (AGENTS.md Mandates):**

- No class components, no CSS Modules, no `any` types
- No hardcoded style values where design tokens exist
- No `dangerouslySetInnerHTML`
- Must use BEM class naming
- Must use design tokens from variables.css
- TypeScript strict mode enabled

**Output Type:**

```typescript
interface ExecutionResult {
  contract: GenerationContract;
  generatedFiles: Array<{
    path: string;
    size: number;
    hash: string;
  }>;
  executionTime: number; // ms
  success: boolean;
  errors?: string[];
}
```

**Guard:** If any write fails or CGA returns invalid output, emit error and trigger rollback.

**Next State:** VALIDATION

---

### State 5: VALIDATION

**Owned By:** Tester Agent

**Purpose:** Run quality gates and enter correction loop if needed. All components must pass validation before OUTPUT.

**Validation Framework:** Vitest + React Testing Library (deterministic, sub-second feedback)

**Tasks:**

1. **Typecheck:** Run `npm run typecheck` on generated files
   - Enforces TypeScript strict mode
   - Validates no `any` types used (AGENTS.md Section 4)

2. **Lint:** Run `npm run lint` on generated files
   - ESLint validates BEM naming, no prohibited patterns
   - Checks for hardcoded values vs. design tokens

3. **Vitest Unit Tests:** Run `npm run test` (Vitest) on generated files (if testingStatus != "SKIP")
   - Tests per AGENTS.md Section 5 (Testing Requirements):
     - Rendering (component mounts correctly)
     - Props behavior (component responds to prop changes)
     - User interactions (click, keyboard, focus events)
     - Basic accessibility (ARIA, semantic HTML)
     - Edge cases (disabled state, error state, empty state)
   - Uses React Testing Library for user-centric assertions
   - Minimum target: 80% code coverage

4. **Coverage Check:** If tests run, verify 80% minimum code coverage
   - Blocks OUTPUT if coverage < 80%

**Correction Loop (Max 3 Attempts):**

- If any check fails, capture stderr and failure context
- Return feedback to React Developer Agent for re-generation
- Re-run all validation gates
- If all checks pass, proceed to OUTPUT
- If 3 attempts exhausted, halt with comprehensive error report

**Output Type:**

```typescript
interface ValidationResult {
  typecheck: { passed: boolean; output: string };
  lint: { passed: boolean; output: string };
  test: { passed: boolean; output: string; coverage?: number };
  correctionAttempts: number;
  finalStatus: "PASSED" | "FAILED";
  timestamp: ISO8601;
}
```

**Guard:** Halt if any gate fails after max retries.

**Next State:** OUTPUT (if PASSED) or EXIT (if FAILED)

---

### State 6: OUTPUT

**Owned By:** QA Agent

**Purpose:** Approve validated artifacts, persist results, generate comprehensive report, and sign off on component readiness.

**Tasks:**

1. **QA Review & Approval:**
   - Review validation results from Tester Agent
   - Evaluate risk assessment (all checks passed, no exceptions)
   - Confirm artifact compliance with AGENTS.md pre-submission checklist:
     - [ ] `src/app/styles/variables.css` exists
     - [ ] Required component files created
     - [ ] BEM methodology used in styles
     - [ ] Styles use design tokens (no hardcoded values)
     - [ ] TypeScript strict checks pass
     - [ ] Tests written and passing (80% coverage)
     - [ ] Storybook story created (if enabled)
     - [ ] Component exported via barrel file
     - [ ] ESLint passes
     - [ ] Prettier formatting applied

2. **Create Comprehensive Run Report (JSON):**
   - Intake payload & metadata
   - Discovery results (framework status, token status)
   - Design context reference & Figma link
   - Execution result (files generated, execution time)
   - Validation result (typecheck, lint, test results, coverage %)
   - Artifact file list with sizes & hashes
   - QA signoff status & timestamp
   - Duration summary

3. **Persist Artifacts:**
   - Save report to `.ai-build-squad/runs/[timestamp]-[componentName].json`
   - Confirm all generated files are on disk & accessible

4. **Emit Success & Signoff:**
   - QA Agent approves component as "READY_FOR_RELEASE"
   - Emit success message with artifact locations
   - Provide component usage instructions

5. **Optional CI Integration:**
   - If configured: push to Git or submit PR
   - Link to Design (Code Connect mapping if applicable)

**Output Type:**

```typescript
interface PipelineRunReport {
  id: string;
  timestamp: ISO8601;
  intake: IntakePayload;
  discovery: DiscoveryPayload;
  execution: ExecutionResult;
  validation: ValidationResult;
  artifacts: Array<{
    path: string;
    type: string;
    size: number;
  }>;
  qaApproval: {
    status: "APPROVED" | "REJECTED";
    checklist: Record<string, boolean>;
    reviewer: string; // QA Agent
    timestamp: ISO8601;
  };
  status: "SUCCESS" | "FAILURE";
  duration: number; // seconds
}
```

---

## Tool Integration Points

| Tool                         | Agent            | State            | Purpose                                                 |
| :--------------------------- | :--------------- | :--------------- | :------------------------------------------------------ |
| vscode_askQuestions          | Business Analyst | INTAKE           | Collect component metadata interactively                |
| read_file, grep_search       | Business Analyst | DISCOVERY        | Scan for framework configs & design tokens              |
| mcp_figma_get_design_context | React Developer  | DESIGN_RETRIEVAL | Fetch design tokens, layout, screenshots                |
| create_file                  | React Developer  | EXECUTION        | Write generated component files                         |
| run_in_terminal              | React Developer  | EXECUTION        | Run `npm install`, `npm run format`                     |
| run_in_terminal              | Tester           | VALIDATION       | Run `npm run typecheck`, `npm run lint`, `npm run test` |
| run_in_terminal              | QA               | OUTPUT           | Optional Git push or PR submission                      |

---

## Error Handling & Rollback

**Build Squad Coordinator** manages all error states and escalation:

1. **DISCOVERY Failure:** Business Analyst halts; emit "Framework scan failed" error; ask user to resolve manually.
2. **DESIGN_RETRIEVAL Failure:** React Developer halts; emit "Figma retrieval failed" error; provide Figma URL validation steps.
3. **EXECUTION Failure:** React Developer rolls back created folder; emit error with cleanup status.
4. **VALIDATION Failure (after 3 attempts):** Tester reports all attempt logs and failures; Coordinator escalates to QA for review.
5. **QA Rejection:** QA Agent rejects component; returns checklist failures to React Developer for correction; re-enters EXECUTION.
6. **Framework Install Failure:** Business Analyst halts; ask user to install manually or verify npm connectivity.

**Escalation Path:**

```
Error Detected
    ↓
Agent Captures Context & Logs
    ↓
Build Squad Coordinator Routes Escalation
    ↓
QA Agent Reviews (if applicable)
    ↓
User Gets Actionable Feedback
```

---

## Entry Points

### Mode 1: Interactive (Manual)

1. User runs: `npm run generate` or similar
2. Build Squad Coordinator starts in INTAKE
3. Delegates to Business Analyst Agent for interactive questions
4. Proceeds through all states sequentially with agent delegation
5. Returns final report from QA Agent

### Mode 2: Batch (CI/Automated)

1. External system calls Mastra workflow with IntakePayload
2. Build Squad Coordinator starts in DISCOVERY (skips INTAKE)
3. Delegates to Business Analyst for framework discovery
4. Proceeds through all states with agent delegation
5. Returns final report + optionally submits PR (QA Agent)

---

## Configuration & Versioning

**Config File:** `.ai-build-squad/workflow.config.json`

```json
{
  "maxCorrectionAttempts": 3,
  "defaultCategory": "atom",
  "componentsRoot": "src/components",
  "designTokensPath": "src/app/styles/variables.css",
  "interactiveMode": true
}
```

---

## Testing Hierarchy

### Tier 1: Core Validation (Blocks Generation)

- **Framework:** Vitest + React Testing Library
- **Trigger:** State 5 (VALIDATION)
- **Gate:** Must pass all checks before OUTPUT
- **Correction Loop:** Failures trigger CGA re-generation (max 3 attempts)
- **Feedback:** Deterministic, sub-second feedback for fast iteration

### Tier 2: Downstream Quality (Optional)

- **Framework:** Playwright (when implemented in Phase 6)
- **Trigger:** After component validation passes
- **Gate:** Optional; does not block component generation
- **Use Cases:** Visual regression, E2E, real browser testing

---

## Next Steps for Implementation

### Agent Implementation

1. **Build Squad Coordinator**: Route requests to agents; maintain state; aggregate results
   - Implement request dispatcher based on current state
   - Store execution context (contract, results) as workflow state
   - Add comprehensive logging at state transitions

2. **Business Analyst Agent**: INTAKE & DISCOVERY
   - Implement interactive question flow (one per prompt)
   - Scan workspace for frameworks and design tokens
   - Validate Figma URL format and accessibility

3. **React Developer Agent**: DESIGN_RETRIEVAL, PLANNING, EXECUTION
   - Call MCP Figma design context tool
   - Build generation contract from design + AGENTS.md mandates
   - Generate all component files with strict standards
   - Call `npm run format` for post-generation

4. **Tester Agent**: VALIDATION (State 5)
   - Run typecheck, lint, and Vitest
   - Implement correction loop (max 3 attempts)
   - Collect coverage metrics and validation reports

5. **QA Agent**: OUTPUT (State 6)
   - Validate component against AGENTS.md pre-submission checklist
   - Generate final report with QA signoff
   - Optionally submit PR or push to Git

### Infrastructure Setup

1. Create Mastra workflow orchestrator with guard-based state machine
2. Implement structured logging & telemetry at each state boundary
3. Create CLI entry point for interactive mode
4. Create API endpoint for batch mode (CI integration)
5. Set up `.ai-build-squad/workflow.config.json` for configuration
6. Configure Vitest with strict TypeScript mode in package.json
7. Document agent responsibilities and hand-off protocols

---

## Agent Hand-off Protocol

Each agent passes execution context to the next via a standardized contract:

| From             | To              | Contract          | Fields                                                       |
| :--------------- | :-------------- | :---------------- | :----------------------------------------------------------- |
| Business Analyst | React Developer | DiscoveryPayload  | framework status, token status, Figma URL validation         |
| React Developer  | Tester          | ExecutionResult   | files generated, paths, sizes, generation success            |
| Tester           | QA              | ValidationResult  | typecheck/lint/test results, coverage %, correction attempts |
| QA               | User            | PipelineRunReport | final approval, checklist status, artifact list, signoff     |

**Communication Protocol:**

- Agents log errors to stderr with context
- Contract violations trigger rollback & escalation
- All timestamps use ISO8601 format
- File paths are absolute or workspace-relative (consistent)

---

## Compliance Checklist

All generated components must satisfy:

- ✅ **AGENTS.md Component Generation Workflow** (Steps 1-8)
- ✅ **BEM Naming Convention** (Block, Element, Modifier)
- ✅ **Design Token Usage** (CSS variables, no hardcoded values)
- ✅ **TypeScript Strict Mode** (no `any`, explicit interfaces)
- ✅ **Test Coverage** (minimum 80%, Vitest + React Testing Library)
- ✅ **Storybook Stories** (if enabled; primary, secondary, disabled variants)
- ✅ **ESLint & Prettier** (passing checks, formatted code)
- ✅ **Pre-Submission Checklist** (per AGENTS.md Section 8)
