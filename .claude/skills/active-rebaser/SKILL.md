---
name: active-rebaser
description: Use when `main` has moved and the local feature branches are stale in the-known-world repo — "rebase all branches", "sync the branches with main", "main was updated", "run active-rebaser", "get the feature branches caught up", or after a PR merge lands on `main` while other branches are still in flight. Always rebases against `main`, never another base.
---

# Active Rebaser

## Overview

Keep every local feature branch rebased on `main`, resolving merge conflicts in place — but **nothing reaches `origin` until the user has seen the report and approved that branch by name**. Rebasing is automatic; pushing is never automatic.

The run has three phases, in order, with a hard stop between 2 and 3:

1. **Rebase** — every feature branch onto `main`, conflicts resolved.
2. **Report** — one table covering every branch, shown to the user.
3. **Approve & push** — one branch at a time, each on its own explicit approval.

**Violating the letter of these rules is violating the spirit of these rules.**

## Phase 1 — Rebase every feature branch

### Preconditions

```bash
git status --porcelain        # must print nothing — if dirty, STOP and ask
git rev-parse --abbrev-ref HEAD   # remember; check this branch out again at the end
git fetch origin --prune
git checkout main
git pull --ff-only origin main    # if this fails, STOP — local main has diverged
```

### The branch loop

Feature branches = every local branch except `main`:

```bash
git for-each-ref refs/heads --format='%(refname:short)' | grep -vx main
```

For each branch, in alphabetical order:

```bash
old_tip=$(git rev-parse <branch>)                 # record for the report + recovery
git merge-base --is-ancestor main <branch> \
  && continue-as "already on main"                # record in report, skip rebase
git rebase main <branch>
```

When the rebase stops on a conflict:

1. `git status` and `git diff --name-only --diff-filter=U` — record every conflicted file for the report.
2. Resolve **each file semantically**: read the whole file, look at both sides (`git log`/`git diff` for the commits involved), and write the merged result that preserves the intent of both `main` and the branch. Blanket strategies are banned — no `-X theirs`, no `-X ours`, no `git checkout --theirs/--ours` as a shortcut.
3. `git add` the resolved files, then `GIT_EDITOR=true git rebase --continue`. Repeat until the rebase finishes.
4. A commit that became empty (patch already on `main`): `git rebase --skip` and note it in the report.
5. **Cannot resolve confidently** — both sides rewrote the same logic and the correct merge is genuinely ambiguous: `git rebase --abort`, mark the branch `needs manual resolution`, move on to the next branch. Guessing is worse than punting.

After each successful rebase, collect the stats for the report:

```bash
git rev-list --count main..<branch>       # commits replayed
git diff --shortstat main..<branch>       # the branch's diff on top of new main
```

## Phase 2 — The report

After the **last** branch — never mid-loop — print the report. Every branch appears, including clean ones, skipped ones, and failures. Required shape:

```markdown
## 🔀 Rebase report — <n> branches against `main` @ <short-sha>

| Branch | Old tip | Commits | Conflicts | Diff vs `main`    | Status                         |
| ------ | ------- | ------- | --------- | ----------------- | ------------------------------ |
| <name> | <sha7>  | 3       | none      | 4 files, +120 −16 | ✅ rebased                     |
| <name> | <sha7>  | 1       | 2 files   | 2 files, +40 −9   | ⚠️ rebased, conflicts resolved |
| <name> | <sha7>  | 2       | —         | —                 | ⏭️ already on main             |
| <name> | <sha7>  | 5       | aborted   | —                 | 🛑 needs manual resolution     |
```

The status emojis are part of the format, not decoration — ✅ clean rebase, ⚠️ conflicts resolved, ⏭️ nothing to do, 🛑 human needed.

For every branch with resolved conflicts, add a note under the table — one bullet per conflicted file saying what collided and how it was merged. `Old tip` is the recovery handle: `git reset --hard <old-tip>` restores any branch to its pre-rebase state.

## Phase 3 — Approve & push, one branch at a time

Walk the report top to bottom. For each pushable branch, ask the user — one branch per question, never a batch: approve, skip, or stop. `AskUserQuestion` with those three options when available; a plain question otherwise.

- **Approve** → push that one branch, then verify before moving on:

  ```bash
  git push --force-with-lease origin <branch>
  git rev-parse <branch> origin/<branch>    # must match
  ```

  `--force-with-lease` always, bare `--force` never. A rejected lease means the remote moved since the fetch — STOP and report it (`🛑 lease rejected`); do not retry with `--force`.

- **Skip** → no push; the local branch stays rebased. Point at its old tip for undo.
- **Stop** → end the loop; remaining branches stay unpushed.

Branches with no upstream get pushed with `-u origin <branch>` on approval (no lease needed). `main` is never pushed by this skill. After the loop, check out the branch the run started on and close with one line per branch:

```markdown
- 🚀 `<branch>` pushed
- ⏸️ `<branch>` skipped (old tip `<sha7>`)
- 🛑 `<branch>` needs manual resolution
```

## Red flags — STOP

| Thought                                                       | Reality                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------- |
| "Push each branch right after its rebase, saves a pass"       | No push before the full report **and** that branch's approval. |
| "They approved the first three, they obviously want the rest" | One approval covers exactly one branch. Ask again.             |
| "Conflicts were trivial — no need for the report"             | Every run produces the report, even an all-clean one.          |
| "`-X theirs` will resolve this faster"                        | Banned. Read both sides, merge the intent.                     |
| "The lease was rejected, `--force` will fix it"               | The remote moved. Stop and report.                             |
| "This conflict is ambiguous but I'll pick the likelier side"  | Abort that branch, mark `needs manual resolution`.             |
| "I'll merge `main` into the branch instead, it's safer"       | This skill rebases. No merge commits.                          |
| "The tree is dirty but the changes look unrelated"            | Clean tree first, or stop and ask.                             |
| "Rebase against the branch it forked from"                    | Always `main`. That is the whole premise.                      |

## Related skills

- `tkw-git-commit-and-pr-format` — if a conflict resolution forces a reworded commit, its message still follows house style
- `tkw-git-branch-naming` — naming for any branch the user asks you to create along the way
