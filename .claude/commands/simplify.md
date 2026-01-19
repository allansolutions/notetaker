# Simplify Code

Run the code-simplifier agent on code that has changed since the last simplification.

## Instructions

1. Check if `.claude/.simplify-last-commit` exists and contains a valid commit hash
2. If valid, find files changed between that commit and HEAD using `git diff --name-only <commit>..HEAD`
3. If the file doesn't exist or the commit is invalid, fall back to files changed in the last 5 commits
4. Filter to only include source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.css`, etc.)
5. Use the Task tool with `subagent_type: "code-simplifier:code-simplifier"` to simplify the identified files
6. After the agent completes successfully, write the current HEAD commit hash to `.claude/.simplify-last-commit`

## Argument handling

If an argument is provided (e.g., `/simplify src/components`), limit the scope to that path instead of using the commit-based detection.

If the argument is "all", simplify the entire codebase.
