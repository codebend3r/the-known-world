---
name: tkw-git-branch-naming
description: Use when naming, creating, or renaming a git branch in the-known-world repo — "new branch called X", "make a branch for Y", "start a branch", "rename this branch", or any `git checkout -b` / `git switch -c` / `git branch -m`. Enforces flat kebab-case names of 1 to 5 words with no folder prefix (`feature/`, `fix/`, `bug/`, `chore/`) and no slashes. Pass the requested branch topic or name as the skill argument.
argument-hint: <branch topic or proposed name>
model: haiku
context: fork
background: false
allowed-tools: Bash, Read
---

# the-known-world Branch Naming

## Your job

You are a forked agent. The caller hands you a branch topic (or a proposed name) as your argument. Normalize it to this repo's branch convention, create or rename the branch, and return the final branch name.

If the argument is empty or you cannot tell what the branch is for, **stop and return a one-line question** prefixed with ❓ instead of guessing a name.

## The rules

### 1. No folders. Ever.

A branch name contains **zero** `/` characters. There is no `feature/`, no `fix/`, no `bug/`, no `chore/`, no `docs/`, no `release/`, no personal namespace like `cj/`. Not one level deep, not any levels deep.

```
sigil-integrity          ✅
broken-house-links       ✅
skills-cleanup           ✅

feature/sigil-integrity  ❌ folder
fix/broken-house-links   ❌ folder
cj/skills-cleanup        ❌ folder
```

This rule overrides any general git convention you know and any older wording in `CLAUDE.md`. If the caller literally asks for `feature/x`, create `x` and say why.

### 2. Kebab-case

Lowercase ASCII letters, digits, and single hyphens between words. Nothing else — no underscores, spaces, dots, camelCase, uppercase, or issue numbers glued on.

```
house-plate-search       ✅
House_Plate_Search       ❌
housePlateSearch         ❌
house.plate.search       ❌
house--plate             ❌ doubled hyphen
-house-plate-            ❌ leading/trailing hyphen
```

### 3. One to five words

Count the hyphen-separated segments. Fewer than one is impossible; more than five is too long — cut filler until it fits.

```
timeline                             ✅ 1
sigil-integrity                      ✅ 2
dark-heraldic-iron-throne            ✅ 4
add-a-new-search-input-to-the-house-plate-component   ❌ 10 → house-plate-search
```

### 4. Describe what the branch is for

The name says what the work is, not who is doing it, when, or what type of change it is. Drop articles (`the`, `a`), drop verbs that add nothing (`add`, `update`, `make`), drop the type prefix the folder rule already banned.

| Request                                                | Branch                 |
| ------------------------------------------------------ | ---------------------- |
| "add a search input to the house plate"                | `house-plate-search`   |
| "fix the broken links on house pages"                  | `broken-house-links`   |
| "redesign the Iron Throne page in dark heraldic style" | `iron-throne-redesign` |
| "clean up the skills"                                  | `skills-cleanup`       |
| "bump next to 16.2.10"                                 | `bump-next`            |

## Procedure

1. **Read the argument.** If it is already a valid name under all four rules, use it verbatim.
2. **Normalize.** Strip any folder prefix, lowercase, replace separators with single hyphens, drop filler words until 1–5 segments remain, trim leading/trailing hyphens.
3. **Check it is not taken:**
   ```bash
   git branch --list <name>
   git ls-remote --exit-code --heads origin <name>
   ```
   If taken, return that fact — do not silently append `-2`.
4. **Create or rename** from the repo's current state:
   ```bash
   git checkout -b <name>          # new branch
   git branch -m <name>            # rename the current branch
   ```
   Never create the branch from a different base than the caller implied; if unsure, branch off the current `HEAD` and say so.
5. **Verify and return:**
   ```bash
   git status -sb
   ```
   Return the final branch name prefixed with 🌿 — e.g. `🌿 house-plate-search` — plus one line on anything you changed about the requested name. The emoji lives in the message only; the branch name itself stays pure `[a-z0-9-]`.

## Verification checklist

- [ ] Zero `/` characters
- [ ] Only `[a-z0-9-]`, no doubled hyphens, no leading/trailing hyphen
- [ ] 1 to 5 hyphen-separated words
- [ ] Describes the work, not the change type or the author
- [ ] `git status -sb` shows the branch actually exists under that name

## Red flags — STOP

| Thought                                                         | Reality                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| "`feature/` is the standard, I'll keep it"                      | Flat names only. Strip the folder.                          |
| "The caller typed `fix/broken-links`, so that's what they want" | Create `broken-links` and tell them the folder was dropped. |
| "`CLAUDE.md` used to say `feature/` or `fix/`"                  | It doesn't any more. This skill is the current rule.        |
| "Six words is basically five"                                   | Cut a word.                                                 |
| "I'll add the issue number for traceability"                    | No. The name describes the work only.                       |
| "Name is taken, I'll use `-v2`"                                 | Stop and report it. The caller decides.                     |
| "I don't know what this branch is for, I'll name it `updates`"  | Ask. One line, then stop.                                   |
