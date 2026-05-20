import type {
  CommandExecutionResult,
  CorrectionLoopResult,
  ToolValidationResult,
  ValidationCommand,
  ValidationExecutionReport,
  ValidationFeedbackPayload,
  ValidationLogArtifact,
  ValidationTool,
} from "../types";

export const DEFAULT_VALIDATION_COMMANDS: ValidationCommand[] = [
  { tool: "typecheck", command: "npm run typecheck" },
  { tool: "lint", command: "npm run lint" },
  { tool: "test", command: "npm run test" },
];

export type CommandExecutor = (
  command: string,
) => Promise<CommandExecutionResult>;

export type LogPersister = (artifact: ValidationLogArtifact) => Promise<void>;

export type CorrectionApplier = (
  feedback: ValidationFeedbackPayload,
) => Promise<void>;

function normalizeOutput(stdout: string, stderr: string): string {
  const merged = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
  return merged.replace(/\r\n/g, "\n");
}

function toToolResult(
  tool: ValidationTool,
  result: CommandExecutionResult,
): ToolValidationResult {
  return {
    tool,
    command: result.command,
    passed: result.exitCode === 0,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    normalizedOutput: normalizeOutput(result.stdout, result.stderr),
    durationMs: result.durationMs,
  };
}

export async function executeValidationTools(
  executeCommand: CommandExecutor,
  commands: ValidationCommand[] = DEFAULT_VALIDATION_COMMANDS,
): Promise<ValidationExecutionReport> {
  const start = Date.now();
  const startedAt = new Date(start).toISOString();

  const results: ToolValidationResult[] = [];
  for (const commandDef of commands) {
    const commandResult = await executeCommand(commandDef.command);
    results.push(toToolResult(commandDef.tool, commandResult));
  }

  const end = Date.now();
  return {
    allPassed: results.every((result) => result.passed),
    startedAt,
    endedAt: new Date(end).toISOString(),
    durationMs: end - start,
    results,
  };
}

export function buildValidationFeedbackPayload(
  report: ValidationExecutionReport,
  attempt: number,
): ValidationFeedbackPayload {
  const failedResults = report.results.filter((result) => !result.passed);
  const failedTools = failedResults.map((result) => result.tool);
  const summary = failedResults.length
    ? `Attempt ${attempt}: ${failedResults.length} validation step(s) failed (${failedTools.join(", ")}).`
    : `Attempt ${attempt}: all validation steps passed.`;

  return {
    attempt,
    failedTools,
    summary,
    toolOutputs: failedResults.map((result) => ({
      tool: result.tool,
      exitCode: result.exitCode,
      normalizedOutput: result.normalizedOutput,
    })),
    timestamp: new Date().toISOString(),
  };
}

export function buildValidationLogArtifacts(
  report: ValidationExecutionReport,
  runId: string,
  attempt: number,
): ValidationLogArtifact[] {
  const basePath = `.ai-build-squad/runs/${runId}/attempt-${attempt}`;

  const summaryArtifact: ValidationLogArtifact = {
    path: `${basePath}-summary.json`,
    content: JSON.stringify(report, null, 2),
  };

  const toolArtifacts = report.results.map((result) => ({
    path: `${basePath}-${result.tool}.log`,
    content: result.normalizedOutput,
  }));

  return [summaryArtifact, ...toolArtifacts];
}

export async function persistValidationLogs(
  report: ValidationExecutionReport,
  runId: string,
  attempt: number,
  persistLog: LogPersister,
): Promise<void> {
  const artifacts = buildValidationLogArtifacts(report, runId, attempt);
  for (const artifact of artifacts) {
    await persistLog(artifact);
  }
}

export interface CorrectionLoopInput {
  runId: string;
  executeValidation: () => Promise<ValidationExecutionReport>;
  applyCorrection: CorrectionApplier;
  persistLog?: LogPersister;
  maxAttempts?: number;
}

export async function runValidationCorrectionLoop(
  input: CorrectionLoopInput,
): Promise<CorrectionLoopResult> {
  const maxAttempts = input.maxAttempts ?? 3;
  const reports: ValidationExecutionReport[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let report: ValidationExecutionReport;
    try {
      report = await input.executeValidation();
    } catch (error) {
      return {
        exitState: "CRITICAL_FAILURE",
        attempts: attempt,
        reports,
        error: `Validation command execution failed: ${String(error)}`,
      };
    }

    reports.push(report);

    if (input.persistLog) {
      await persistValidationLogs(report, input.runId, attempt, input.persistLog);
    }

    if (report.allPassed) {
      return {
        exitState: "SUCCESS",
        attempts: attempt,
        reports,
      };
    }

    const feedback = buildValidationFeedbackPayload(report, attempt);

    if (attempt >= maxAttempts) {
      return {
        exitState: "MAX_RETRIES_REACHED",
        attempts: attempt,
        reports,
        finalFeedback: feedback,
      };
    }

    try {
      await input.applyCorrection(feedback);
    } catch (error) {
      return {
        exitState: "CRITICAL_FAILURE",
        attempts: attempt,
        reports,
        finalFeedback: feedback,
        error: `Correction application failed: ${String(error)}`,
      };
    }
  }

  return {
    exitState: "MAX_RETRIES_REACHED",
    attempts: maxAttempts,
    reports,
  };
}
