# Repo skills

Agent skills scoped to **the-known-world**. They live here rather than in `~/.claude/skills/` so they version with the code they describe and reach anyone who clones the repo.

Skill directories are flat — Claude Code discovers `.claude/skills/<name>/SKILL.md` only — so grouping is carried by the `tkw-<group>-` name prefix.

## `tkw-git-*` — git conventions

| Skill                                                                   | Covers                                                                                                                                                   |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tkw-git-branch-naming`](tkw-git-branch-naming/SKILL.md)               | Flat kebab-case branch names, 1–5 words, no `feature/`/`fix/` folders. Runs as a forked `haiku` agent — pass the branch topic as the argument.           |
| [`tkw-git-commit-and-pr-format`](tkw-git-commit-and-pr-format/SKILL.md) | The `TKW:` prefix on commit subjects **and** PR titles, bullet bodies, backticking, zero agent attribution, keeping the PR body in sync with the branch. |

## Standalone

| Skill                                       | Covers                                                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`active-rebaser`](active-rebaser/SKILL.md) | Rebasing every local feature branch onto `main` when it moves, in place in its worktree, resolving small conflicts and aborting big ones, reporting per-branch stats, and pushing one branch at a time on approval. |
| [`style-critic`](style-critic/SKILL.md)     | Enforcing the CSS section of `CLAUDE.md` across every stylesheet: a verified check command per rule, verdict discipline (new-in-diff blocks, pre-existing debt is counted not fixed), and the ❌/✅ report format.  |
| [`version-bumper`](version-bumper/SKILL.md) | Deciding whether `main` has earned a release and which increment, recommending it for a yes/no, then cutting it — `bun pm version`, the bare-version commit, the `v*` tag, the push, and local/remote tag sync.     |

## `tkw-content-*` — populating `content/`

| Skill                                                   | Covers                                                                                                                                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tkw-content-populate`](tkw-content-populate/SKILL.md) | Turning a `content/houses/` or `content/characters/` stub into a full entry from AWOIAF. Shared workflow in `SKILL.md`; field specs in `references/house-fields.md` and `references/character-fields.md`. |

## `tkw-sigil-*` — sigil resolution

| Skill                                           | Covers                                                                                                                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tkw-sigil-wiring`](tkw-sigil-wiring/SKILL.md) | The `SIGIL_SLUGS` resolution order, registering a `public/sigils/<slug>.png` so a house stops rendering its regional fallback, and auditing the six drift classes via `lib/sigil-integrity.ts`. |
