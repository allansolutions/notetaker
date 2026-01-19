# Git Push Command

Push local commits to the remote repository.

## Instructions

1. Run `git push` to push commits to the remote
2. If the push fails due to no upstream branch, run `git push -u origin <branch-name>`
3. Report the result to the user

## Important Rules

- NEVER force push (`--force` or `-f`) unless explicitly requested by the user
- NEVER force push to main/master even if requested - warn the user instead
- If the push is rejected due to remote changes, inform the user they need to pull first
