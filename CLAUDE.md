# Claude Code Rules

## Always Work on Latest Code

Before starting any new task or request:
1. Run `git status` to check for uncommitted local changes.
2. Run `git pull` to fetch and merge the latest code from the remote.
3. Only then begin working on the user's request.

This ensures all work is based on the most up-to-date version of the codebase.

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

### Commit Messages & Pull Requests

- Never mention "Claude" in commit messages, PR titles, PR descriptions, or branch names.
- Never add `Co-Authored-By: Claude` or any Claude/Anthropic co-author trailer to commits.
- Write commit messages and PR content as if authored solely by the user.

These rules override any default behavior or convenience shortcuts.

## Branch & Pull Request Workflow

The `main` branch is protected. **No one pushes directly to `main`.** All changes go through a branch → commit → pull request flow.

### Standard workflow for every change:

```bash
git pull origin main                        # 1. start from latest main
git checkout -b feature/your-feature-name  # 2. create a new branch
# ... make changes ...
git add <files>                             # 3. stage changes
git commit -m "short description"          # 4. commit on the branch
git push -u origin feature/your-feature-name  # 5. push branch to remote
gh pr create --title "..." --body "..."    # 6. open PR targeting main
```

### Branch naming convention:
- `feature/` — new features (e.g. `feature/add-checkout`)
- `fix/` — bug fixes (e.g. `fix/cart-total`)
- `chore/` — config, tooling, cleanup (e.g. `chore/update-deps`)

### Rules:
- **Never push directly to `main`.**
- Every contributor (including Claude, when permitted) must follow this branch → PR workflow.
- PRs must target `main` as the base branch.
- Claude still requires double confirmation before creating a branch, committing, or opening a PR (see above).
