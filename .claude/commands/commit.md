# Git Commit Command

Create a well-structured git commit for the current changes.

## Instructions

1. **Analyze the changes** by running:
   - `git status` to see all modified/untracked files (never use -uall flag)
   - `git diff` to see unstaged changes
   - `git diff --staged` to see staged changes
   - `git log --oneline -5` to see recent commit style

2. **Stage appropriate files**:
   - Add files that are logically related to a single change
   - Never commit files containing secrets (.env, credentials, API keys)
   - If changes span multiple unrelated features, suggest splitting into multiple commits

3. **Write the commit message** following this structure:

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

4. **Commit using HEREDOC format** for proper formatting:
   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): subject line here

   Optional body explaining the change in more detail.

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```

5. **Verify** the commit succeeded with `git status`

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
