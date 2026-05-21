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

function branchExists(repoRoot, branchName) {
  try {
    runGit(repoRoot, ["show-ref", "--verify", `refs/heads/${branchName}`]);
    return true;
  } catch {
    return false;
  }
}

function worktreeExists(repoRoot, worktreePath) {
  const list = runGit(repoRoot, ["worktree", "list", "--porcelain"]);
  return list.split("\n").some((line) => line === `worktree ${worktreePath}`);
}

function printUsage() {
  console.error(
    [
      "Usage: node tools/create-worktree.mjs --agent <name> --component <name> [options]",
      "",
      "Options:",
      "  --agent <name>       Agent identifier used in branch and directory names",
      "  --component <name>   Component identifier used in branch and directory names",
      "  --base <branch>      Base branch or ref to branch from (default: main)",
      "  --branch <name>      Explicit branch name override",
      "  --path <path>        Explicit worktree path override",
    ].join("\n")
  );
}

const args = parseArgs(process.argv.slice(2));
const agentName = args.agent;
const componentName = args.component;

if (!agentName || !componentName) {
  printUsage();
  process.exit(1);
}

const repoRoot = process.cwd();
const agentSlug = slugify(agentName);
const componentSlug = slugify(componentName);
function getCurrentBranch(repoRoot) {
  try {
    return runGit(repoRoot, ["branch", "--show-current"]);
  } catch {
    return "main";
  }
}

const baseRef = args.base || getCurrentBranch(repoRoot) || "main";
const branchName = args.branch || `feature/${agentSlug}-${componentSlug}`;
const worktreePath = path.resolve(
  repoRoot,
  args.path || `../ai-build-squad-${agentSlug}-${componentSlug}`
);

try {
  runGit(repoRoot, ["rev-parse", "--show-toplevel"]);
} catch {
  console.error("Current directory is not inside a git repository.");
  process.exit(1);
}

if (worktreeExists(repoRoot, worktreePath)) {
  console.log(`Worktree already exists at ${worktreePath}`);
  console.log(`branch=${branchName}`);
  console.log(`path=${worktreePath}`);
  process.exit(0);
}

if (branchExists(repoRoot, branchName)) {
  runGit(repoRoot, ["worktree", "add", worktreePath, branchName]);
} else {
  runGit(repoRoot, ["worktree", "add", "-b", branchName, worktreePath, baseRef]);
}

console.log(`branch=${branchName}`);
console.log(`path=${worktreePath}`);
console.log(`base=${baseRef}`);
