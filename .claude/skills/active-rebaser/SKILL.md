---
name: active-rebaser
description: Use when `main` has moved and the local feature branches or worktrees are stale in the-known-world repo — "rebase all branches", "rebase the worktrees", "sync the branches with main", "main was updated", "run active-rebaser", "get the feature branches caught up", or after a PR merge lands on `main` while other branches are still in flight. Rebases worktree-held branches in place, resolves small conflicts, aborts big ones, then pushes with `--force-with-lease` on per-branch approval. Always rebases against `main`, never another base.
---

# Active Rebaser

## Overview

Keep every local feature branch rebased on `main`, resolving merge conflicts in place — but **nothing reaches `origin` until the user has seen the report and approved that branch by name**. Rebasing is automatic; pushing is never automatic.

The run has three phases, in order, with a hard stop between 2 and 3:

1. **Rebase** — every feature branch onto `main`, in place in its worktree, small conflicts resolved and big ones aborted.
2. **Report** — one table covering every branch, shown to the user.
3. **Approve & push** — one branch at a time, each on its own explicit approval.

**Violating the letter of these rules is violating the spirit of these rules.**

## Phase 1 — Rebase every feature branch

### Preconditions

```bash
git rev-parse --abbrev-ref HEAD   # remember; check this branch out again at the end
git fetch origin --prune
git checkout main
git pull --ff-only origin main    # if this fails, STOP — local main has diverged
```

### Build the work list first

Most branches in this repo live in a **worktree**, not in the main checkout. A worktree-held branch cannot be rebased from the main checkout:

```
fatal: 'skill-prose-style' is already used by worktree at '.worktrees/the-known-world/skill-prose-style'
```

So enumerate branches and their worktrees together, before touching anything:

```bash
git worktree list --porcelain     # worktree <path> / HEAD <sha> / branch refs/heads/<name>
git for-each-ref refs/heads --format='%(refname:short)'
```

Pair them into one work list, alphabetical by branch. Every branch except `main` gets exactly one of two treatments:

| Branch is                 | Rebase it with                                  | Notes                                     |
| ------------------------- | ----------------------------------------------- | ----------------------------------------- |
| Checked out in a worktree | `git -C <worktree-path> rebase main`            | The common case here. Never check it out. |
| Not checked out anywhere  | `git rebase main <branch>` in the main checkout | Restore the starting branch afterward.    |

A worktree in **detached HEAD** has no branch to rebase. Record it as `⏭️ detached` and move on.

### Per-worktree preconditions

Each worktree has its own working tree and its own dirty state. Check the one you are about to touch, not just the main checkout:

```bash
git -C <path> status --porcelain                                  # must print nothing
test -d "$(git -C <path> rev-parse --git-path rebase-merge)"      # must NOT exist
```

A dirty worktree is **skipped**, not stashed and not cleaned: record `🛑 dirty, skipped` and move to the next branch. One dirty worktree never stops the whole run. A worktree already mid-rebase from an earlier session is left alone the same way (`🛑 mid-rebase, skipped`); finishing someone else's half-done rebase is not this skill's job.

### The branch loop

For each branch in the work list, in alphabetical order:

```bash
old_tip=$(git rev-parse <branch>)                 # record for the report + recovery
git merge-base --is-ancestor main <branch> \
  && continue-as "already on main"                # record in report, skip rebase
git -C <worktree-path> rebase main                # or plain `git rebase main <branch>` if unheld
```

Every follow-up command for a worktree-held branch carries the same `-C <worktree-path>`. Dropping it silently runs against the main checkout, where `main` itself is checked out, which is how a run corrupts the wrong branch.

When the rebase stops on a conflict:

1. `git -C <path> diff --name-only --diff-filter=U` — record every conflicted file for the report.
2. **Size it before resolving.** The call is small-and-resolve or big-and-abort, made once, up front:

   | Signal                                                                  | Call    |
   | ----------------------------------------------------------------------- | ------- |
   | Both sides added lines in the same region, intent obviously additive    | resolve |
   | One side moved or reformatted, the other edited content                 | resolve |
   | Lockfile, generated file, or an index/barrel both sides appended to     | resolve |
   | Both sides rewrote the same function or block differently               | abort   |
   | The conflict spans many files, or many hunks in one file                | abort   |
   | Resolving needs a judgement call about which behavior is wanted         | abort   |
   | You would be picking the likelier side rather than merging both intents | abort   |

   Uncertain counts as abort. Punting costs the user one manual rebase; a wrong resolution costs them a silent regression.

3. To resolve: read the whole file, look at both sides (`git log`/`git diff` for the commits involved), and write the merged result that preserves the intent of both `main` and the branch. Blanket strategies are banned — no `-X theirs`, no `-X ours`, no `git checkout --theirs/--ours` as a shortcut.
4. `git -C <path> add` the resolved files, then `GIT_EDITOR=true git -C <path> rebase --continue`. Repeat until the rebase finishes.
5. A commit that became empty (patch already on `main`): `git -C <path> rebase --skip` and note it in the report.
6. To abort: `git -C <path> rebase --abort`, mark the branch `🛑 needs manual resolution`, record which files collided, move to the next branch. **Always leave the worktree clean.** A branch left sitting mid-rebase is the one outcome worse than aborting, and the next run will skip it as mid-rebase.

After each successful rebase, collect the stats for the report:

```bash
git rev-list --count main..<branch>       # commits replayed
git diff --shortstat main..<branch>       # the branch's diff on top of new main
```

These read shared refs, so they run from anywhere; `-C` is optional here.

## Phase 2 — The report

After the **last** branch — never mid-loop — print the report. Every branch appears, including clean ones, skipped ones, and failures. Required shape:

```markdown
## 🔀 Rebase report — <n> branches against `main` @ <short-sha>

| Branch | Where     | Old tip | Commits | Conflicts | Diff vs `main`    | Status                         |
| ------ | --------- | ------- | ------- | --------- | ----------------- | ------------------------------ |
| <name> | worktree  | <sha7>  | 3       | none      | 4 files, +120 −16 | ✅ rebased                     |
| <name> | worktree  | <sha7>  | 1       | 2 files   | 2 files, +40 −9   | ⚠️ rebased, conflicts resolved |
| <name> | main repo | <sha7>  | 2       | —         | —                 | ⏭️ already on main             |
| <name> | worktree  | <sha7>  | 5       | aborted   | —                 | 🛑 needs manual resolution     |
| <name> | worktree  | <sha7>  | —       | —         | —                 | 🛑 dirty, skipped              |
```

The status emojis are part of the format, not decoration — ✅ clean rebase, ⚠️ conflicts resolved, ⏭️ nothing to do, 🛑 human needed. `Where` is `worktree` or `main repo`; name the worktree path in the notes for any branch that needs the user's hands.

For every branch with resolved conflicts, add a note under the table — one bullet per conflicted file saying what collided and how it was merged. `Old tip` is the recovery handle: `git reset --hard <old-tip>` restores any branch to its pre-rebase state.

## Phase 3 — Approve & push, one branch at a time

Pushable = the ✅ and ⚠️ rows only. Everything the run skipped, aborted, or left alone (⏭️, 🛑) is not offered; there is nothing new to push.

Walk the report top to bottom. For each pushable branch, ask the user — one branch per question, never a batch: approve, skip, or stop. `AskUserQuestion` with those three options when available; a plain question otherwise.

Pushes run from anywhere. Refs are shared across worktrees, so no `-C` and no checkout is needed to push a worktree-held branch.

- **Approve** → push that one branch, then verify before moving on:

  ```bash
  git push --force-with-lease origin <branch>
  git rev-parse <branch> origin/<branch>    # must match
  ```

  `--force-with-lease` always, bare `--force` never. A rejected lease means the remote moved since the fetch — STOP and report it (`🛑 lease rejected`); do not retry with `--force`.

- **Skip** → no push; the local branch stays rebased. Point at its old tip for undo.
- **Stop** → end the loop; remaining branches stay unpushed.

Branches with no upstream get pushed with `-u origin <branch>` on approval (no lease needed). A branch whose upstream is **gone** (its PR merged and the remote branch was deleted) is not resurrected: report `⏭️ upstream gone` and do not offer it. `main` is never pushed by this skill. After the loop, check out the branch the run started on in the main checkout, and close with one line per branch:

```markdown
- 🚀 `<branch>` pushed
- ⏸️ `<branch>` skipped (old tip `<sha7>`)
- 🛑 `<branch>` needs manual resolution
```

## Red flags — STOP

| Thought                                                        | Reality                                                         |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| "`git rebase main <branch>` works, worktrees are an edge case" | Here it is the common case. It fails outright on a held branch. |
| "I'll `git worktree remove` it, then rebase normally"          | Never. It holds the user's working state. Use `-C <path>`.      |
| "Just this one command without `-C`, it's only a `git add`"    | Then it lands in the main checkout, on `main`. Always `-C`.     |
| "The worktree is dirty, I'll stash it and rebase"              | Skip it, report it. Their uncommitted work is not yours.        |
| "One dirty worktree, I'll abort the whole run"                 | Skip that branch only. The rest still rebase.                   |
| "Push each branch right after its rebase, saves a pass"        | No push before the full report **and** that branch's approval.  |
| "They approved the first three, they obviously want the rest"  | One approval covers exactly one branch. Ask again.              |
| "Conflicts were trivial — no need for the report"              | Every run produces the report, even an all-clean one.           |
| "`-X theirs` will resolve this faster"                         | Banned. Read both sides, merge the intent.                      |
| "The lease was rejected, `--force` will fix it"                | The remote moved. Stop and report.                              |
| "This conflict is ambiguous but I'll pick the likelier side"   | Abort that branch, mark `needs manual resolution`.              |
| "I'll merge `main` into the branch instead, it's safer"        | This skill rebases. No merge commits.                           |
| "The tree is dirty but the changes look unrelated"             | Clean tree first, or stop and ask.                              |
| "Rebase against the branch it forked from"                     | Always `main`. That is the whole premise.                       |

## Related skills

- `tkw-git-commit-and-pr-format` — if a conflict resolution forces a reworded commit, its message still follows house style
- `tkw-git-branch-naming` — naming for any branch the user asks you to create along the way
