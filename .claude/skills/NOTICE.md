# Third-party skills

The skills in this directory (`grill-with-docs`, `to-spec`, `implement`, `improve-codebase-architecture`,
`tdd`, `diagnosing-bugs`, `code-review`, `domain-modeling`, `codebase-design`, `grilling`,
`setup-matt-pocock-skills`, and their companion files) are vendored from
[mattpocock/skills](https://github.com/mattpocock/skills) by Matt Pocock, MIT licensed (see `LICENSE`
in this directory). They are adapted only where this repo's environment requires it — see
`docs/agents/issue-tracker.md` for the one substantive change (GitHub MCP tools instead of the `gh`
CLI, since this session type doesn't have `gh` available).

Only the "engineering" skills relevant to a solo developer working on this repo were vendored — the
following upstream skills were deliberately **not** copied in because they assume infrastructure this
repo doesn't have (a multi-source triage queue, a tickets/wayfinder map, a team handoff flow):
`ask-matt`, `triage`, `to-tickets`, `wayfinder`, `prototype`, `research`, `resolving-merge-conflicts`,
`wizard`, and the rest of the upstream `productivity/` category besides `grilling`. Add them the same
way (fetch the raw `SKILL.md` + companions from the upstream repo, drop them in a new
`.claude/skills/<name>/` folder) if a future need for them shows up.

To pick up upstream changes, re-fetch the files listed above from the `main` branch of
`mattpocock/skills` and diff against what's here.
