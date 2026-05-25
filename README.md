# Agent Arcade for OpenCode

Agent Arcade is an experimental OpenCode TUI plugin that turns agent wait time into a tiny runner game.

Open it while the agent works, jump over terminal gremlins, watch tool events fly through the game, and approve pending permissions without leaving the overlay.

![Agent Arcade screenshot](docs/image.png)

## Install

Add the plugin to your OpenCode TUI config at `.opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-agent-arcade"]
}
```

Then restart OpenCode. TUI plugins are loaded when OpenCode starts.

To auto-open the game when an agent becomes busy:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [["opencode-agent-arcade", { "autoStart": true }]]
}
```

## Usage

- `/agent-arcade`: open or close the arcade overlay.
- `/agent-arcade-auto`: toggle auto-start and persist it locally.
- `ctrl+shift+g`: open or close the overlay.
- `space`, `up`, or `k`: jump.
- `r`: reset after game over.
- `q` or `esc`: quit the overlay.
- `a`: approve the currently pending OpenCode permission once.

The `a` binding only replies to an active OpenCode permission prompt with `once`. Review what the agent is asking for before approving.

## Local Development

This repo uses Bun and publishes the TUI plugin source directly.

```sh
bun install
bun run typecheck
```

For local OpenCode usage from this repo, `.opencode/tui.json` points at `packages/opencode-plugin/src/tui.tsx`.

## Package Entry

The npm package exports the TUI plugin through `./tui`:

```json
{
  "exports": {
    ".": "./src/tui.tsx",
    "./tui": "./src/tui.tsx"
  }
}
```

OpenCode resolves npm TUI plugins through that `./tui` export.

## Status

This is an alpha plugin. It is ready for people to try, but expect rough edges while OpenCode's TUI plugin surface keeps evolving.

Random cabinet signal: the runner flashes a rainbow permission border while Tetris keeps its next piece glowing in the side panel.
