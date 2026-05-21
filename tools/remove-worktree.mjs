import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function slugify(value) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "run"
  );
}

function runGit(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function worktreeExists(repoRoot, worktreePath) {
  const list = runGit(repoRoot, ["worktree", "list", "--porcelain"]);
  return list.split("\n").some((line) => line === `worktree ${worktreePath}`);
}

function printUsage() {
  console.error(
    [
      "Usage: node tools/remove-worktree.mjs [options]",
      "",
      "Options:",
      "  --agent <name>       Agent identifier used in default directory naming",
      "  --component <name>   Component identifier used in default directory naming",
      "  --path <path>        Explicit worktree path override",
      "  --force              Force removal even if worktree has uncommitted changes",
      "",
      "Either provide --path, or provide both --agent and --component.",
    ].join("\n")
  );
}

const args = parseArgs(process.argv.slice(2));
const repoRoot = process.cwd();

try {
  runGit(repoRoot, ["rev-parse", "--show-toplevel"]);
} catch {
  console.error("Current directory is not inside a git repository.");
  process.exit(1);
}

let worktreePath = args.path;

if (!worktreePath) {
  const agentName = args.agent;
  const componentName = args.component;

  if (!agentName || !componentName) {
    printUsage();
    process.exit(1);
  }

  const agentSlug = slugify(agentName);
  const componentSlug = slugify(componentName);
  worktreePath = `../ai-build-squad-${agentSlug}-${componentSlug}`;
}

const resolvedWorktreePath = path.resolve(repoRoot, worktreePath);

if (!worktreeExists(repoRoot, resolvedWorktreePath)) {
  console.log(`Worktree not found at ${resolvedWorktreePath}`);
  process.exit(0);
}

const removeArgs = ["worktree", "remove"];
if (args.force === "true") {
  removeArgs.push("--force");
}
removeArgs.push(resolvedWorktreePath);

runGit(repoRoot, removeArgs);
runGit(repoRoot, ["worktree", "prune"]);

console.log(`removed=${resolvedWorktreePath}`);
