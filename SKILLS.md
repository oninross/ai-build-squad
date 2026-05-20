# SKILLS.md: AI Build Squad Skills and Learning Resources

This file tracks the capabilities needed to build and operate the AI Build Squad multi-agent component generation pipeline.

## Multi-Agent Architecture Skills

All agents in the Build Squad must understand:

- **Agent Orchestration**: Build Squad Coordinator routes requests, maintains state, delegates tasks
- **State Machines**: Seven sequential states with guards and conditional branching (see WORKFLOW.md)
- **Hand-off Protocols**: Contract-based communication between agents (DiscoveryPayload → ExecutionResult → ValidationResult → PipelineRunReport)
- **Error Escalation**: Failure handling, correction loops, rollback procedures
- **Tool Integration**: Using MCP (Figma), terminal commands, file I/O in agent context

## Agent-Specific Core Skills

### Business Analyst Agent (INTAKE, DISCOVERY)

- Requirement collection and analysis
- Workspace scanning and framework detection
- Design readiness validation
- Interactive question flow design (one-at-a-time prompts)
- Figma URL validation and parsing

### React Developer Agent (DESIGN_RETRIEVAL, PLANNING, EXECUTION)

- **TypeScript fundamentals and strict typing** (no `any`, explicit interfaces)
- **React component architecture** (atoms, molecules, organisms)
- **SCSS with BEM naming** (Block, Element, Modifier conventions)
- **Design token systems** using CSS variables
- **MCP Figma integration** (design context retrieval, screenshot parsing)
- **Component scaffolding** (folder structure, file generation)
- **Code generation** with standard templates
- **ESLint and Prettier** configuration and usage

### Tester Agent (VALIDATION)

- **Vitest fundamentals** (unit test execution, output parsing)
- **React Testing Library** (user-centric test assertions)
- **Code coverage analysis** (80% minimum enforcement)
- **Error log normalization** (stdout/stderr parsing)
- **Correction loop management** (max 3 attempts, feedback routing)
- **Quality gate orchestration** (typecheck, lint, test sequencing)

### QA Agent (OUTPUT)

- **Compliance checklist validation** (AGENTS.md pre-submission items)
- **Risk assessment** (architecture review, edge cases)
- **Approval decision-making** (yes/no gates)
- **Report generation** (JSON output with timestamps, artifacts, signoff)
- **Git integration** (PR submission, branch pushing)

## Shared Pipeline-Specific Competencies

All agents must master:

- **Intake gate design** (user prompts, validation, critical stops)
- **Sequential generation strategy** (component → tests → stories in correct order)
- **Validation loop implementation** (lint → typecheck → test execution)
- **Error-log normalization and feedback** (capture stderr, emit actionable feedback)
- **Retry controls and safe termination** (max 3 attempts, graceful failure)
- **State transition guards** (ensure preconditions before state change)
- **Artifact persistence** (file writes, backups, rollback triggers)

## Command Proficiency (All Agents)

All agents must know how to execute and interpret these commands:

- `npm install` — Install dependencies (Business Analyst, React Developer, QA)
- `npm run lint` — Lint source files (Tester Agent)
- `npm run format` — Format code with Prettier (React Developer)
- `npx vitest` — Run unit tests (Tester Agent)
- `npm run storybook` — Start Storybook dev server (React Developer, Tester)
- `npm run build-storybook` — Build static Storybook (React Developer)
- `npm run build` — Build component library (React Developer)
- `npm run typecheck` — Run TypeScript strict checks (Tester Agent)

**Command sync policy:**

- This command list must stay aligned with AGENTS.md.
- package.json `scripts` are the canonical source of truth.
- AGENTS.md and SKILLS.md must match package.json scripts exactly.
- Commands not listed here are not used in the pipeline.

## Suggested Learning Resources

### Core Technologies

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **React Docs**: https://react.dev/
- **Vitest Docs**: https://vitest.dev/
- **Testing Library Docs**: https://testing-library.com/docs/react-testing-library/intro/
- **Storybook Docs**: https://storybook.js.org/docs
- **ESLint Docs**: https://eslint.org/docs/latest/
- **Prettier Docs**: https://prettier.io/docs/en/

### Agent-Specific Resources

- **Build Squad Coordinator**: WORKFLOW.md (state machine), error handling patterns
- **Business Analyst Agent**: WORKFLOW.md (INTAKE, DISCOVERY), requirement gathering best practices
- **React Developer Agent**: AGENTS.md Sections 2-7 (component workflow), BEM CSS methodology, design token patterns
- **Tester Agent**: AGENTS.md Section 5 (testing requirements), Vitest correction loop patterns
- **QA Agent**: AGENTS.md Section 8 (pre-submission checklist), release gate governance

## Skill Validation Checklist

### All Agents Must Demonstrate

- [ ] Understand the seven-state workflow and guard transitions
- [ ] Know when to invoke each other agent
- [ ] Parse and emit hand-off contracts correctly
- [ ] Handle errors with escalation to Build Squad Coordinator
- [ ] Read and interpret stderr from failed commands

### Business Analyst Agent Must Demonstrate

- [ ] Can collect component metadata one question at a time
- [ ] Can detect Storybook, Vitest, design tokens in a workspace
- [ ] Can validate Figma URL format and MCP accessibility
- [ ] Can emit correct DiscoveryPayload with all required fields

### React Developer Agent Must Demonstrate

- [ ] Can implement a fully typed component without `any`
- [ ] Can create BEM-based SCSS using only token values
- [ ] Can scaffold required component file structure
- [ ] Can emit ExecutionResult with generated file list
- [ ] Can run `npm run format` and verify output

### Tester Agent Must Demonstrate

- [ ] Can run and interpret `npm run typecheck` output
- [ ] Can run and interpret `npm run lint` output
- [ ] Can run and interpret `npm run test` output with coverage %
- [ ] Can capture and normalize error logs for feedback
- [ ] Can implement max 3-attempt correction loop
- [ ] Can emit ValidationResult with pass/fail status

### QA Agent Must Demonstrate

- [ ] Can validate all 11 pre-submission checklist items
- [ ] Can make approve/reject decisions based on validation results
- [ ] Can generate PipelineRunReport with timestamps and signoff
- [ ] Can integrate with Git (if configured)
