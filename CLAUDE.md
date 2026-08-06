# 好宅選 iLoveHouse

實價登錄查詢 + AI 選屋規劃網站。Next.js 14（App Router）+ TypeScript + Tailwind CSS，前後端同一個專案。完整說明見 [README.md](./README.md)。

## Commands

```bash
npm install
npm run dev       # http://localhost:3000
npm test           # vitest
npm run lint        # next lint
npm run build         # 型別檢查 + 正式建置，push 前務必跑過
```

## Architecture at a glance

- `lib/govData.ts` + `lib/sampleData.ts` — 實價登錄資料層：即時抓政府開放資料，失敗時退回內建示範資料。
- `lib/propertyQuery.ts` — 篩選／統計／區域彙總，純函式，測試集中在這裡。
- `lib/claude.ts` + `lib/recommend.ts` — AI 選屋規劃：呼叫 Claude API，失敗時退回規則式評分。
- `lib/geo.ts` + `lib/districtGeo.ts` + `components/PropertyMap.tsx` — 地圖顯示與地圖畫圈範圍搜尋（行政區中心點聚合，非逐筆地理編碼）。
- `app/api/*/route.ts` — API routes；`app/*/page.tsx` — 頁面；`components/` — UI 元件。

## Git workflow for this repo

Claude Code sessions develop on a fixed branch (see the session's task description for the current name) and open one PR per unit of work against `main`. Once a PR merges, reset the branch from the latest `main` before starting the next piece of work — don't stack new commits on already-merged history:

```bash
git fetch origin main && git checkout -B <branch-name> origin/main
```

Before every push: `npm run lint && npm test && npm run build` must all pass.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues on `papap35/ilovehouse`, read/written via the GitHub MCP tools (`mcp__github__*`) — this session type doesn't have the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout: `CONTEXT.md` (glossary) and `docs/adr/` (architecture decision records) at the repo root, created lazily by `/domain-modeling` the first time a term or decision needs recording — neither exists yet, and that's expected until then. See `docs/agents/domain.md`.

### Engineering workflow — follow this strictly for new work

This repo's engineering skills are vendored from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT licensed — see `.claude/skills/NOTICE.md` and `.claude/skills/LICENSE`) into `.claude/skills/`. For any non-trivial feature or fix, follow this pipeline rather than freelancing:

1. **`/grill-with-docs`** — for a new feature or design decision, interview the user to reach a shared understanding before writing a spec. Updates `CONTEXT.md` / `docs/adr/` as terms and decisions crystallize (via `/domain-modeling`).
2. **`/to-spec`** — synthesize the conversation into a spec (problem statement, user stories, implementation decisions, testing decisions, scope) and publish it as a GitHub issue via `docs/agents/issue-tracker.md`.
3. **`/implement`** — build against the spec/issue. Use `/tdd` at pre-agreed seams (red before green, one seam/test/implementation per cycle), typecheck and run the affected test file(s) regularly, run the full suite once at the end.
4. **`/code-review`** — review the diff since a fixed point on two independent axes (Standards, Spec) before considering the work done.
5. **`/diagnosing-bugs`** — for bug reports: build a tight, red-capable feedback loop first (failing test / curl / repro script), reproduce and minimise, rank hypotheses, instrument, then fix with a regression test at a correct seam.
6. **`/improve-codebase-architecture`** — periodically (or when a bug's post-mortem points at architecture), scan for shallow modules and propose deepening opportunities as a visual report.

`/codebase-design` and `/grilling` are shared reference/mechanic skills the above call into (module/interface/depth/seam/adapter vocabulary, and the round-based interview mechanic, respectively) — not entry points on their own.

**Deliberately not installed** (would need infra this repo doesn't have): `triage`, `to-tickets`, `wayfinder`, `ask-matt`, `prototype`, `research`, `resolving-merge-conflicts`, `wizard`, and most of the upstream `productivity/` skills. See `.claude/skills/NOTICE.md` for how to add one later.

Re-run `/setup-matt-pocock-skills` only if the issue tracker or domain-doc layout needs to change.
