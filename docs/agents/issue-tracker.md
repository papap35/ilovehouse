# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues on `papap35/ilovehouse`.

This session type (Claude Code on the web / Claude Code Remote) does **not** have the `gh` CLI available. Use the **GitHub MCP server tools** (`mcp__github__*`) instead — the tool schemas are deferred, load them with `ToolSearch` (e.g. `select:mcp__github__issue_write,mcp__github__issue_read`) before first use in a session.

## Conventions

- **Create an issue**: `mcp__github__issue_write` (`method: "create"`) with `owner: "papap35"`, `repo: "ilovehouse"`, a `title`, and a `body`. Apply labels in the same call where possible.
- **Read an issue**: `mcp__github__issue_read` (`method: "get"` for the issue body/labels; there is no separate `get_comments` — use `mcp__github__list_issues`/search or the issue's comment thread via the same read tool if comments are exposed on it. If unsure of exact method names for this call, run `ToolSearch` first — do not guess a shape.).
- **List issues**: `mcp__github__list_issues` for broad listing (state/label filters), or `mcp__github__search_issues` for keyword/label queries. Check for duplicates before creating a new issue.
- **Comment on an issue**: `mcp__github__add_issue_comment`.
- **Apply / remove labels**: `mcp__github__issue_write` (`method: "update"`, `labels: [...]`). Use `mcp__github__list_issue_fields` / `mcp__github__get_label` to confirm a label exists before applying it — don't invent label names.
- **Close**: `mcp__github__issue_write` (`method: "update"`, `state: "closed"`) and always set `state_reason`.

The repo is inferred from context (`papap35/ilovehouse`) — this is the only repo in scope for this session unless another has been attached via `add_repo`.

## Pull requests as a triage surface

**PRs as a request surface: no.** *(Set to `yes` if this repo starts treating external PRs as feature requests; `/triage` — not currently installed — would read this flag.)*

PR operations (used constantly in this repo's normal workflow, independent of the flag above) use:

- **Read a PR**: `mcp__github__pull_request_read` (`method: "get"`, `"get_diff"`, `"get_files"`, `"get_comments"`, `"get_check_runs"`, etc.)
- **Create a PR**: `mcp__github__create_pull_request`
- **List PRs**: `mcp__github__list_pull_requests`
- **Comment / review a PR**: `mcp__github__pull_request_review_write`, `mcp__github__add_comment_to_pending_review`, `mcp__github__add_reply_to_pull_request_comment`
- **Update / merge a PR**: `mcp__github__update_pull_request`, `mcp__github__merge_pull_request`

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `pull_request_read` and fall back to `issue_read`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue via `mcp__github__issue_write` (`method: "create"`).

## When a skill says "fetch the relevant ticket"

Read the GitHub issue via `mcp__github__issue_read` (or `mcp__github__search_issues` if you only have a title/keyword, not a number).

## Wayfinding operations

Not configured. The `wayfinder` skill isn't installed in this repo's `.claude/skills/` — if it's added later, re-run `/setup-matt-pocock-skills` or extend this file with the wayfinder conventions from the upstream [mattpocock/skills](https://github.com/mattpocock/skills) `issue-tracker-github.md` template.

## Branching and PR workflow (specific to this repo)

This repo's Claude Code sessions develop on a fixed branch name (currently `claude/housing-search-ai-planner-h25p6l`) and open one PR per unit of work against `main`. When a PR merges, the branch is reset from the latest `main` before starting the next piece of work (`git fetch origin main && git checkout -B <branch> origin/main`) rather than stacking new commits on merged history. Skills that say "commit your work to the current branch" (e.g. `/implement`) should follow this convention, then open a PR the same way prior work in this repo has.
