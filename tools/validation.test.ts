import { describe, expect, it, vi } from "vitest";

import {
  buildValidationLogArtifacts,
  buildValidationFeedbackPayload,
  executeValidationTools,
  persistValidationLogs,
  runValidationCorrectionLoop,
} from "./validation";

describe("Phase 3 validation tooling", () => {
  it("executes typecheck/lint/test commands and reports success", async () => {
    const executeCommand = vi.fn().mockImplementation(async (command: string) => ({
      command,
      exitCode: 0,
      stdout: "ok",
      stderr: "",
      durationMs: 10,
    }));

    const report = await executeValidationTools(executeCommand);

    expect(executeCommand).toHaveBeenCalledTimes(3);
    expect(report.allPassed).toBe(true);
    expect(report.results.map((result) => result.tool)).toEqual(["typecheck", "lint", "test"]);
  });

  it("builds feedback payload from failed validation tools", () => {
    const payload = buildValidationFeedbackPayload(
      {
        allPassed: false,
        startedAt: "2026-01-01T00:00:00.000Z",
        endedAt: "2026-01-01T00:00:01.000Z",
        durationMs: 1000,
        results: [
          {
            tool: "typecheck",
            command: "npm run typecheck",
            passed: true,
            exitCode: 0,
            stdout: "",
            stderr: "",
            normalizedOutput: "",
            durationMs: 10,
          },
          {
            tool: "lint",
            command: "npm run lint",
            passed: false,
            exitCode: 1,
            stdout: "",
            stderr: "lint failed",
            normalizedOutput: "lint failed",
            durationMs: 10,
          },
          {
            tool: "test",
            command: "npm run test",
            passed: false,
            exitCode: 1,
            stdout: "",
            stderr: "test failed",
            normalizedOutput: "test failed",
            durationMs: 10,
          },
        ],
      },
      2
    );

    expect(payload.attempt).toBe(2);
    expect(payload.failedTools).toEqual(["lint", "test"]);
    expect(payload.summary).toContain("Attempt 2");
  });

  it("builds and persists validation log artifacts", async () => {
    const report = {
      allPassed: false,
      startedAt: "2026-01-01T00:00:00.000Z",
      endedAt: "2026-01-01T00:00:01.000Z",
      durationMs: 1000,
      results: [
        {
          tool: "lint" as const,
          command: "npm run lint",
          passed: false,
          exitCode: 1,
          stdout: "",
          stderr: "lint failed",
          normalizedOutput: "lint failed",
          durationMs: 10,
        },
      ],
    };

    const artifacts = buildValidationLogArtifacts(report, "run-log", 2);

    expect(artifacts).toHaveLength(2);
    expect(artifacts[0]?.path).toContain(".ai-build-squad/runs/run-log/attempt-2-summary.json");
    expect(artifacts[1]?.path).toContain(".ai-build-squad/runs/run-log/attempt-2-lint.log");

    const persistLog = vi.fn().mockResolvedValue(undefined);

    await persistValidationLogs(report, "run-log", 2, persistLog);

    expect(persistLog).toHaveBeenCalledTimes(2);
  });
});

describe("Phase 3 correction loop", () => {
  it("exits SUCCESS when validation passes on first attempt", async () => {
    const executeValidation = vi.fn().mockResolvedValue({
      allPassed: true,
      startedAt: "2026-01-01T00:00:00.000Z",
      endedAt: "2026-01-01T00:00:01.000Z",
      durationMs: 1000,
      results: [],
    });
    const applyCorrection = vi.fn();

    const result = await runValidationCorrectionLoop({
      runId: "run-1",
      executeValidation,
      applyCorrection,
    });

    expect(result.exitState).toBe("SUCCESS");
    expect(result.attempts).toBe(1);
    expect(applyCorrection).not.toHaveBeenCalled();
  });

  it("exits MAX_RETRIES_REACHED after 3 failed attempts", async () => {
    const executeValidation = vi.fn().mockResolvedValue({
      allPassed: false,
      startedAt: "2026-01-01T00:00:00.000Z",
      endedAt: "2026-01-01T00:00:01.000Z",
      durationMs: 1000,
      results: [
        {
          tool: "lint",
          command: "npm run lint",
          passed: false,
          exitCode: 1,
          stdout: "",
          stderr: "lint failed",
          normalizedOutput: "lint failed",
          durationMs: 10,
        },
      ],
    });
    const applyCorrection = vi.fn().mockResolvedValue(undefined);

    const result = await runValidationCorrectionLoop({
      runId: "run-2",
      executeValidation,
      applyCorrection,
      maxAttempts: 3,
    });

    expect(result.exitState).toBe("MAX_RETRIES_REACHED");
    expect(result.attempts).toBe(3);
    expect(executeValidation).toHaveBeenCalledTimes(3);
    expect(applyCorrection).toHaveBeenCalledTimes(2);
    expect(result.finalFeedback?.failedTools).toEqual(["lint"]);
  });

  it("exits CRITICAL_FAILURE when correction callback throws", async () => {
    const executeValidation = vi.fn().mockResolvedValue({
      allPassed: false,
      startedAt: "2026-01-01T00:00:00.000Z",
      endedAt: "2026-01-01T00:00:01.000Z",
      durationMs: 1000,
      results: [
        {
          tool: "typecheck",
          command: "npm run typecheck",
          passed: false,
          exitCode: 1,
          stdout: "",
          stderr: "typecheck failed",
          normalizedOutput: "typecheck failed",
          durationMs: 10,
        },
      ],
    });

    const applyCorrection = vi.fn().mockRejectedValue(new Error("patch generation failed"));

    const result = await runValidationCorrectionLoop({
      runId: "run-3",
      executeValidation,
      applyCorrection,
      maxAttempts: 3,
    });

    expect(result.exitState).toBe("CRITICAL_FAILURE");
    expect(result.error).toContain("Correction application failed");
    expect(result.attempts).toBe(1);
  });

  it("exits CRITICAL_FAILURE when validation execution throws", async () => {
    const executeValidation = vi.fn().mockRejectedValue(new Error("spawn failed"));
    const applyCorrection = vi.fn();

    const result = await runValidationCorrectionLoop({
      runId: "run-4",
      executeValidation,
      applyCorrection,
      maxAttempts: 3,
    });

    expect(result.exitState).toBe("CRITICAL_FAILURE");
    expect(result.error).toContain("Validation command execution failed");
    expect(applyCorrection).not.toHaveBeenCalled();
  });

  it("persists logs during retries when persistLog is provided", async () => {
    const executeValidation = vi
      .fn()
      .mockResolvedValueOnce({
        allPassed: false,
        startedAt: "2026-01-01T00:00:00.000Z",
        endedAt: "2026-01-01T00:00:01.000Z",
        durationMs: 1000,
        results: [
          {
            tool: "lint",
            command: "npm run lint",
            passed: false,
            exitCode: 1,
            stdout: "",
            stderr: "lint failed",
            normalizedOutput: "lint failed",
            durationMs: 10,
          },
        ],
      })
      .mockResolvedValueOnce({
        allPassed: true,
        startedAt: "2026-01-01T00:00:02.000Z",
        endedAt: "2026-01-01T00:00:03.000Z",
        durationMs: 1000,
        results: [],
      });

    const applyCorrection = vi.fn().mockResolvedValue(undefined);
    const persistLog = vi.fn().mockResolvedValue(undefined);

    const result = await runValidationCorrectionLoop({
      runId: "run-5",
      executeValidation,
      applyCorrection,
      persistLog,
      maxAttempts: 3,
    });

    expect(result.exitState).toBe("SUCCESS");
    expect(persistLog).toHaveBeenCalled();
    expect(applyCorrection).toHaveBeenCalledTimes(1);
  });
});
