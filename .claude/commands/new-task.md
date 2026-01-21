# New Task Command

Sync with remote changes and clear context to start fresh on a new task. Designed for workflows using multiple Git worktrees with separate Claude Code sessions.

## Instructions

1. **Fetch all remotes** to get the latest state:

   ```bash
   git fetch --all
   ```

2. **Check current branch status**:

   ```bash
   git status
   git log HEAD..@{u} --oneline 2>/dev/null || echo "No upstream or no new commits"
   ```

   This shows if there are incoming changes from the remote.

3. **Pull from current branch**:

   ```bash
   git pull
   ```

4. **Handle the result**:
   - **If clean (no conflicts)**: Inform the user that the pull succeeded and instruct them to run `/clear` to complete the fresh start. Say something like: "Repository is up to date. Run `/clear` to start your new task with fresh context."

   - **If there are conflicts**: Stop and help the user resolve them. List the conflicting files and offer to help work through each one. Do NOT suggest clearing context until conflicts are resolved.

   - **If pull failed for other reasons** (e.g., uncommitted changes that would be overwritten): Explain the issue and help the user decide how to proceed (stash, commit, or discard changes).

## Example Output

**Success case:**

```
Fetched all remotes.
Pulled latest changes from origin/main (3 new commits).
Repository is up to date with no conflicts.

Run `/clear` to start your new task with fresh context.
```

**Conflict case:**

```
Fetched all remotes.
Pull resulted in merge conflicts in:
  - src/components/Editor.tsx
  - src/utils/storage.ts

Let's resolve these before starting your new task. Would you like me to help work through each conflict?
```

## Important Notes

- This command does NOT automatically clear context - you must run `/clear` after a successful pull
- Always fetch before pulling to ensure you see all remote changes
- If working across multiple worktrees, make sure changes from other sessions have been pushed before running this command
