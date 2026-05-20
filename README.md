# ai-build-squad

AI Build Squad is a React + TypeScript component generation workspace that combines:

- Multi-agent orchestration (Coordinator, BA, React Dev, Tester, QA)
- Deterministic workflow gates (intake -> output)
- Component quality enforcement (strict typing, linting, tests, coverage)
- Storybook documentation and optional Playwright downstream checks

## Stack

- React 19
- TypeScript
- SCSS
- Vitest + React Testing Library
- Storybook
- Playwright
- Vite

## Project Docs

- `AGENTS.md`: Agent roles, responsibilities, handoffs, generation mandates
- `WORKFLOW.md`: Seven-state pipeline, guards, error handling, contracts
- `SKILLS.md`: Required competencies by agent role
- `PROMPT.md`: Canonical Build Squad Coordinator prompt template

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run local development server:

```bash
npm run dev
```

## Commands

All script commands come from `package.json` and are the source of truth.

```bash
npm run dev
npm run build
npm run preview

npm run typecheck
npm run test
npm run test:watch
npm run test:coverage

npm run lint .
npm run lint:fix .
npm run format

npm run storybook
npm run build-storybook

npm run test:e2e
npm run test:e2e:ui
```

## Build Squad Workflow

The pipeline executes these states in order:

1. `INTAKE` (Business Analyst Agent)
2. `DISCOVERY` (Business Analyst Agent)
3. `DESIGN_RETRIEVAL` (React Developer Agent)
4. `PLANNING` (React Developer Agent)
5. `EXECUTION` (React Developer Agent)
6. `VALIDATION` (Tester Agent)
7. `OUTPUT` (QA Agent)

Coordinator delegates each stage and aggregates a final `PipelineRunReport`.

## Component Standards

- Components are generated under `src/components/[atoms|molecules|organisms]/[ComponentName]/`
- Required files:
  - `ComponentName.types.ts`
  - `ComponentName.tsx`
  - `ComponentName.styles.scss`
  - `ComponentName.test.tsx`
  - `index.ts`
  - `ComponentName.stories.tsx` (when Storybook is enabled)
- Styling rules:
  - BEM naming is required
  - Prefer CSS tokens from `src/styles/variables.css`
- Type rules:
  - No `any`
  - Functional components only
  - No class components

## Validation Gates

Tester Agent enforces:

- `npm run typecheck`
- `npm run lint .`
- `npm run test` (when testing is enabled)

Quality thresholds:

- Minimum test coverage: 80%
- Correction loop max attempts: 3

## QA Gate

QA Agent approves release only when:

- Required files exist
- Token usage and BEM constraints are met
- Typecheck, lint, and tests pass
- Coverage threshold is met
- Story file is present when required
- Formatting is applied

## Notes

- Vitest + React Testing Library are the primary blocking validation layer.
- Playwright is a downstream quality layer and can be run separately.
