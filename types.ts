export type ValidationTool = "typecheck" | "lint" | "test";

export interface ValidationCommand {
  tool: ValidationTool;
  command: string;
}

export interface CommandExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface ToolValidationResult extends CommandExecutionResult {
  tool: ValidationTool;
  passed: boolean;
  normalizedOutput: string;
}

export interface ValidationExecutionReport {
  allPassed: boolean;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  results: ToolValidationResult[];
}

export interface ValidationFeedbackOutput {
  tool: ValidationTool;
  exitCode: number;
  normalizedOutput: string;
}

export interface ValidationFeedbackPayload {
  attempt: number;
  failedTools: ValidationTool[];
  summary: string;
  toolOutputs: ValidationFeedbackOutput[];
  timestamp: string;
}

export interface ValidationLogArtifact {
  path: string;
  content: string;
}

export type CorrectionLoopExitState = "SUCCESS" | "MAX_RETRIES_REACHED" | "CRITICAL_FAILURE";

export interface CorrectionLoopResult {
  exitState: CorrectionLoopExitState;
  attempts: number;
  reports: ValidationExecutionReport[];
  finalFeedback?: ValidationFeedbackPayload;
  error?: string;
}
