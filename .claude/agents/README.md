# Repo agents

Subagents scoped to **the-known-world**. They live here rather than in
`~/.claude/agents/` so they version with the corpus they read and reach anyone
who clones the repo.

An agent is not a skill. Skills load into the current turn and change how the
main session works; agents run in their own context with their own tool grant
and hand back a report. Reach for an agent when the job is a sweep over many
files whose intermediate reading you do not want in the main transcript.

| Agent                                         | Covers                                                                                                                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`spoiler-classifier`](spoiler-classifier.md) | Tagging death reveals in `content/` prose with `\|\|death\|...\|\|`, gated on three dramatized windows so settled history stays visible. Additive edits only, verified byte-identical after a delimiter strip. |

## `spoiler-classifier` in one paragraph

The site ships a Spoilers switch (`lib/spoilers.ts`, `components/SpoilerToggle/`)
that currently drives portrait variants and nothing else. This agent produces the
tagged corpus that lets it also gate prose. It takes a batch of file paths, wraps
death reveals in `||death|...||`, and reports a per-file tally. It never touches
frontmatter and never rewrites a word.

**Fan it out.** The corpus is 1,698 bodies and every span is a judgment call, so
dispatch one agent per batch rather than one agent for a collection.

**The delimiters render literally until the plugin lands.** `lib/content.ts` runs
prose through `remark()` with `remarkProseLinks` and then `remark-html`; until a
sibling `remarkSpoilers` plugin exists, `||death|...||` reaches the page as plain
text. Tag on a branch, or ship the plugin first.
