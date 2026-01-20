# Git Commit Command

Create a well-structured git commit for the current changes.

## Instructions

1. **Analyze the changes** by running:
   - `git status` to see all modified/untracked files (never use -uall flag)
   - `git diff` to see unstaged changes
   - `git diff --staged` to see staged changes
   - `git log --oneline -5` to see recent commit style

2. **Check for changes made outside this session**:

   Files may have been modified outside the current Claude Code session. Compare the changed files against what was worked on in this conversation:
   - **Unrelated files**: If you see changed files that weren't touched in this session, do NOT include them in the commit. Only stage files relevant to the work done in this session.

   - **Mixed changes in a single file**: If a file you worked on also contains changes from outside this session (e.g., unrelated modifications mixed with your changes), ask the user how they want to proceed. Suggest options like:
     - Stage only the hunks related to this session's work using `git add -p`
     - Commit all changes in the file together
     - Skip the file for now and let the user handle it manually

   When in doubt, ask the user to clarify which changes should be included.

3. **Stage appropriate files**:
   - Add files that are logically related to a single change
   - Never commit files containing secrets (.env, credentials, API keys)
   - If changes span multiple unrelated features, suggest splitting into multiple commits

4. **Write the commit message** following this structure:

   ```
   <type>(<scope>): <subject>

   <body>

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   ```

   **Type** (required): Describes the category of change
   - `feat`: New feature
   - `fix`: Bug fix
   - `refactor`: Code restructuring without changing behavior
   - `docs`: Documentation only
   - `style`: Formatting, whitespace (no code change)
   - `test`: Adding or updating tests
   - `chore`: Maintenance tasks, dependencies, config

   **Scope** (optional): Component or area affected (e.g., `auth`, `api`, `ui`)

   **Subject** (required):
   - Use imperative mood ("add" not "added" or "adds")
   - No period at the end
   - Max 50 characters
   - Focus on WHAT and WHY, not HOW

   **Body** (optional, for complex changes):
   - Wrap at 72 characters
   - Explain motivation and contrast with previous behavior
   - Use bullet points for multiple items

5. **Commit using HEREDOC format** for proper formatting:

   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): subject line here

   Optional body explaining the change in more detail.

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```

6. **Verify** the commit succeeded with `git status`

## Examples

**Simple feature:**

```
feat(editor): add keyboard shortcut for block selection
```

**Bug fix with context:**

```
fix(storage): prevent data loss on rapid typing

The 300ms debounce was causing the final keystrokes to be lost
when the user navigated away immediately after typing.
```

**Refactor:**

```
refactor(blocks): extract type detection into utility function
```

## Important Rules

- NEVER use `git commit --amend` unless explicitly requested
- NEVER skip hooks (--no-verify) unless explicitly requested
- NEVER force push to main/master
- If there are no changes to commit, inform the user
- Always ask before committing if the scope of changes is unclear
