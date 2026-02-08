---
name: ship
description: Automated commit + push in one step. Analyzes changes, generates commit message, commits, and pushes to remote. Use when user says "ship", "on commit", "commit and push", or wants to save and push their work.
user-invocable: true
arguments:
  - name: message
    description: Optional commit message override. If not provided, auto-generates from changes.
    required: false
---

# /ship - Automated Commit + Push

*"Le chien livre"* - κυνικός

## What It Does

Single command to analyze, commit, and push — no manual "push" step needed.

## Execution Steps

### Step 1: Gather State (parallel)

Run these three commands in parallel using Bash:

```bash
git status
```

```bash
git diff --staged && git diff
```

```bash
git log --oneline -5
```

### Step 2: Analyze & Stage

1. Review all changes (staged + unstaged + untracked)
2. Stage relevant files with `git add <specific files>` — NEVER `git add -A`
3. Skip files that look like secrets (.env, credentials, keys)
4. If NO changes exist, report "Nothing to ship" and stop

### Step 3: Generate Commit Message

If no `$message` argument was provided:

1. Analyze the diff to understand what changed
2. Determine the type: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
3. Determine the scope from the changed packages/directories
4. Write a concise message following conventional commits
5. Add `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` trailer

Format:
```
type(scope): brief description

Optional body explaining the "why".

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

If `$message` was provided, use it as-is (still add Co-Authored-By).

### Step 4: Commit + Push (sequential)

```bash
git commit -m "$(cat <<'EOF'
<generated message>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)" && git push
```

IMPORTANT: Commit and push in ONE chained command (`&&`). This is the whole point of `/ship` — atomic delivery.

### Step 5: Report

Show a compact result:

```
*tail wag* Shipped: <short-hash> → <branch>
  <commit message first line>
  <N> files changed, <insertions> insertions(+), <deletions> deletions(-)
```

## Error Handling

- **Pre-commit hook fails**: Fix the issue, re-stage, create NEW commit (never amend), push
- **Push fails**: Report the error, suggest `git pull --rebase` if behind remote
- **No changes**: Report "Nothing to ship" — don't create empty commits
- **Merge conflict**: Report and stop — let the human decide

## Safety Rules

- NEVER use `git add -A` or `git add .` — stage specific files
- NEVER commit .env, credentials, or secret files
- NEVER force push (`--force`)
- NEVER amend previous commits unless explicitly asked
- NEVER skip hooks (`--no-verify`)

## CYNIC Voice

**Success**: `*tail wag* Shipped. φ delivers.`
**Nothing to ship**: `*yawn* Rien à expédier. Le chenil est propre.`
**Error**: `*GROWL* Ship failed: <reason>`

## See Also

- `/status` - Check project status before shipping
- `/health` - System health check
