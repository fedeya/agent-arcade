# AGENTS.md

- This repo is an OpenCode TUI plugin that adds a small runner minigame overlay for waiting while the agent works; it is not a standalone web app or CLI.
- Use Bun from the repo root; `package.json` pins `packageManager` to `bun@1.3.14` and the lockfile is `bun.lock`.
- Run the full verified check with `bun run typecheck`; this delegates to all workspace packages via `bun run --filter '*' typecheck`.
- Run only the plugin package check with `bun run --filter @agent-arcade/opencode typecheck`.
- There are no configured test, lint, format, build, or CI workflows in this repo right now; do not invent those commands.
- The only workspace package is `packages/opencode-plugin`, named `@agent-arcade/opencode`.
- Plugin entrypoint is `packages/opencode-plugin/src/plugin.tsx`; `.opencode/tui.json` loads that TSX source directly for local OpenCode TUI usage.
- `.opencode/package.json`, `.opencode/package-lock.json`, `.opencode/node_modules`, and related local files are ignored support files, not workspace source.
- This is a Solid/OpenTUI TSX plugin: keep the `/** @jsxImportSource @opentui/solid */` pragma on TSX files that use OpenTUI JSX.
- The runner game is wired as `plugin.tsx -> games/runner/index.ts -> RunnerOverlay -> RunnerGame`; OpenCode agent/session events become in-game floaters through `arcade/feed.ts`.
- The overlay opens via the command palette slash command `/wait-game` or `ctrl+shift+g`; in-game bindings are `space/up/k` jump, `r` reset, and `q/esc` quit.
