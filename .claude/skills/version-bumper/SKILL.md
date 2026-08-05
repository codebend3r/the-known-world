---
name: version-bumper
description: Use when a release version is in question in the-known-world repo — "is it time for a release", "do we have enough for a bump", "cut a patch/minor/major", "bump the version", "run version-bumper", "tag a release", "push the tag", "are the tags in sync", "my local tags don't match origin", or after several PRs have landed on `main` since the last tag.
---

# Version Bumper

## Overview

Decide whether `main` has accumulated enough to deserve a release, pick the increment, and cut it — package.json, commit, annotated tag, push, tag sync. One skill owns the whole chain, so a half-done bump (version raised but never tagged, tag never pushed) cannot happen.

The release mechanism is `bun pm version <increment>`, run **on `main` only**. It rewrites `package.json`, commits with the bare version as the subject, and creates the annotated tag `v<version>`. Nothing else in the repo records the version — no changelog, no lockfile entry, no constant.

**Releases happen on `main`, from `main`, or not at all.** A feature branch never gets a version bump, and unmerged work never counts toward the decision.

Four phases, in order:

1. **Sync tags** — local and remote agree before anything reads "the latest tag".
2. **Decide** — is a bump warranted, and which one.
3. **Preflight** — clean, current, green.
4. **Cut and push** — bump, tag, push both, verify.

## Phase 1 — Tag sync

Always first. Every later phase reads the latest tag, so a stale tag list produces a wrong answer with no error.

```bash
git fetch origin --prune --tags
git tag --sort=v:refname
git ls-remote --tags origin | awk '{print $2}' | grep -v '\^{}$' | sed 's|refs/tags/||' | sort -V
```

Diff the two lists and classify every mismatch:

| Drift                                                    | Meaning                                | Fix                                                                           |
| -------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| Remote has it, local doesn't                             | Fetch refspec skipped it               | `git fetch origin --tags` (a second time is not a mistake — confirm it lands) |
| Local has it, remote doesn't, and it's on `main`         | A previous cut tagged but never pushed | `git push origin <tag>`                                                       |
| Local has it, remote doesn't, and it's **not** on `main` | Orphan from rewritten history          | Report it and ask before `git tag -d <tag>`                                   |
| Both have it, different SHAs                             | A published tag was moved              | 🛑 STOP. Never repoint a published tag. Report and hand to the user.          |

Reachability check for row three:

```bash
git merge-base --is-ancestor "$(git rev-parse <tag>^{commit})" origin/main
```

Only once the lists match does the run continue.

## Phase 2 — Decide

```bash
latest=$(git describe --tags --abbrev=0 origin/main)
git rev-list --count "$latest"..origin/main
git log --oneline "$latest"..origin/main
git diff --shortstat "$latest"..origin/main
git diff --name-only "$latest"..origin/main
```

### Is a bump warranted?

Historical cadence in the `0.2.x` line is 4–11 commits per release, median ~6. Use that as the shape of a normal release, not as a gate to hide behind.

| Commits since latest tag | Call                                                                          |
| ------------------------ | ----------------------------------------------------------------------------- |
| 0                        | No bump. `main` is already the release. Say so and stop.                      |
| 1–2                      | Not yet — **unless** one of them is user-facing, or the user asked for a cut. |
| 3+                       | Bump.                                                                         |

A user-facing change on its own justifies a release at any count: `v0.3.0` was cut two commits after `v0.2.10`.

### Which increment?

The package is `"private": true` — semver here describes the site, not a published API.

| Signal in `$latest..origin/main`                                                         | Increment                                   |
| ---------------------------------------------------------------------------------------- | ------------------------------------------- |
| New route: a `page.tsx` under a new `app/<segment>/`                                     | minor                                       |
| New content type: a new `content/<type>/` directory **and** a schema in `lib/schemas.ts` | minor                                       |
| New top-level nav destination in `components/SiteMenu/`                                  | minor                                       |
| A whole surface redesigned, not adjusted                                                 | minor                                       |
| Route renamed or removed, or a schema field dropped                                      | minor, and call the break out in the report |
| New entries in existing `content/` directories                                           | patch                                       |
| New art in `public/` plus its `SIGIL_SLUGS` registration                                 | patch                                       |
| Dependency bumps in `package.json`                                                       | patch                                       |
| Only `.github/`, `.claude/`, `docs/`, or `*.test.ts`                                     | patch                                       |
| Fixes, refactors, styling, tests                                                         | patch                                       |

**Highest matching signal wins** — one new route among twelve content fills is still a minor.

**`major` is never chosen automatically.** Pre-1.0, breaking changes ride a minor. Cut a major only when the user says the words, or when they are explicitly declaring `1.0.0`.

## Phase 3 — Preflight

All four must hold. Any failure stops the run — report it, do not work around it.

```bash
git rev-parse --abbrev-ref HEAD          # must be main
git status --porcelain                   # must print nothing
git pull --ff-only origin main           # must fast-forward
bun run check                            # typecheck + lint:ts + lint:css + test
```

Then confirm the tree is not mid-bump — `package.json` must still be at the last released version:

```bash
test "v$(bun pm pkg get version | tr -d '"')" = "$(git describe --tags --abbrev=0)"
```

A mismatch means a previous cut bumped `package.json` and never tagged. Stop and report; the recovery is a tag, not a second bump.

## Phase 4 — Cut and push

```bash
bun pm version <patch|minor|major>
```

That single command writes `package.json`, commits, and creates the annotated tag. Then push both refs and verify:

```bash
version=$(bun pm pkg get version | tr -d '"')
git push origin main
git push origin "v$version"
git rev-parse main origin/main           # must match
git ls-remote --tags origin "v$version"  # must exist
```

### The commit subject is the bare version

`0.3.1`, not `TKW: 0.3.1`. This is the **one** exception to the `TKW:` rule in `CLAUDE.md`, and it is deliberate: every release commit in the repo's history reads as a bare version, and it is the `bun pm version` default. Never pass `-m`/`--message`. Never amend the subject afterward. The tag message is the bare version too, for the same reason.

### Flags

| Flag                   | Use                                                                     |
| ---------------------- | ----------------------------------------------------------------------- |
| `--no-git-tag-version` | Never. The tag is the point.                                            |
| `--force` / `-f`       | Never. It bypasses the dirty-tree check that Phase 3 exists to enforce. |
| `--allow-same-version` | Never. A no-op bump is a bug in the decision, not a flag to pass.       |
| `--preid`              | Only if the user explicitly asks for a prerelease.                      |

## Report

Close every run with this, even a no-bump one:

```markdown
## 🔖 Version report — `v0.3.0` → `v0.3.1`

| Field     | Value                                                    |
| --------- | -------------------------------------------------------- |
| Previous  | `v0.3.0` (51e4071)                                       |
| Commits   | 4                                                        |
| Diff      | 53 files, +2034 −164                                     |
| Increment | patch                                                    |
| Rationale | content fills and CI only — no new route or content type |
| Tag sync  | ✅ local and remote matched                              |

- 🚀 `main` pushed
- 🏷️ `v0.3.1` pushed
```

No-bump runs use `⏭️ no bump — <reason>` in place of the last two lines. Tag-drift runs that fixed something say what was pushed or deleted.

## Red flags — STOP

| Thought                                                       | Reality                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| "I'll bump from this feature branch, it's what's checked out" | `main` only. Check it out first.                                                      |
| "The open PR is basically merged, count it"                   | Only what is on `origin/main` counts.                                                 |
| "Tags look fine, skip Phase 1"                                | Phase 1 is what tells you they're fine. Run it.                                       |
| "The local and remote `v0.2.4` differ — I'll force the tag"   | A published tag never moves. Stop and report.                                         |
| "`bun run check` fails but it's unrelated"                    | A release ships `main` as it is. Red `main` is not releasable.                        |
| "Big diff, this feels like a major"                           | Size is not the signal. Pre-1.0, major needs the user to say so.                      |
| "Twelve content files and one new route — patch"              | Highest signal wins. That's a minor.                                                  |
| "`TKW:` is required, I'll prefix the version commit"          | Release commits are bare versions. The one documented exception.                      |
| "Bumped but the push failed — I'll sort the tag out later"    | An untagged bump is the failure state this skill exists to prevent. Finish or revert. |
| "I'll write a changelog entry too"                            | There is no changelog. Don't invent one.                                              |

## Related skills

- `active-rebaser` — run it after a release so in-flight branches sit on the newly tagged `main`
- `tkw-git-commit-and-pr-format` — governs every commit **except** the release commit
