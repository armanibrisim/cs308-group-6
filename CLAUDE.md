# Claude Code Rules

## Git Operations — Strict Permission Required

**NEVER** perform any of the following without explicit user instruction:
- `git commit`
- `git merge`
- `git push`
- `git checkout -b` (create branch)
- `gh pr create` (open pull request)
- Any destructive git operation (`reset`, `rebase`, `force push`, etc.)

### Double Confirmation for Pull Requests

Before opening a pull request, Claude **must**:
1. Ask the user the first time: "Do you want me to open a pull request for these changes?"
2. Wait for the user to say **yes**.
3. Ask a second time: "Are you sure? This will open a pull request — shall I proceed?"
4. Wait for the user to say **yes** again.
5. Only then open the pull request.

If the user says anything other than a clear "yes" at either step, stop and do not proceed.

### Commits

- Never commit automatically, even after completing a task.
- Always wait for the user to explicitly say something like "commit this", "go ahead and commit", or "make a commit".
- If unsure whether the user wants a commit, ask — do not assume.

### Branches

- Never create a new branch unless the user explicitly requests it.

These rules override any default behavior or convenience shortcuts.
