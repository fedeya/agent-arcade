# Agent Arcade for OpenCode

[![npm](https://img.shields.io/npm/v/opencode-agent-arcade)](https://www.npmjs.com/package/opencode-agent-arcade)
[![license](https://img.shields.io/npm/l/opencode-agent-arcade)](./LICENSE)
[![OpenCode TUI plugin](https://img.shields.io/badge/OpenCode-TUI%20plugin-blue)](https://opencode.ai)

Agent Arcade is an experimental OpenCode TUI plugin that turns agent wait time into tiny terminal arcade games.

Open it while the agent works, play Runner or Tetris, watch tool events fly through the overlay, and approve pending permissions without leaving the game.

## Games

- Runner: jump over terminal gremlins while agent events become in-game floaters.
- Tetris: stack pieces while waiting for the agent to finish.

## Install

Add the plugin to `.opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-agent-arcade"]
}
```

Then restart OpenCode.

Optional auto-start:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [["opencode-agent-arcade", { "autoStart": true }]]
}
```

Auto-start opens the last selected game by default. You can choose a specific game or randomize it:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [["opencode-agent-arcade", { "autoStart": true, "autoStartGame": "random" }]]
}
```

`autoStartGame` accepts `last`, `runner`, `tetris`, or `random`.

## Controls

- `/agent-arcade`: open the native game selector, or close the active game overlay.
- `/agent-arcade-auto`: toggle auto-start.
- `ctrl+shift+g`: open the native game selector, or close the active game overlay.
- Game selector: use arrows to navigate, `enter` to select, and `esc` to close.

Runner controls:

- `space`, `up`, or `k`: jump.
- `r`: reset.
- `m`: return to the game selector.
- `q` or `esc`: quit.
- `a`: approve the currently pending OpenCode permission once.

Tetris controls:

- `left` or `h`: move left.
- `right` or `l`: move right.
- `down` or `j`: soft drop.
- `up`, `k`, or `space`: rotate.
- `c`: hold the current piece.
- `d`: hard drop.
- `p`: pause or resume.
- `r`: reset.
- `m`: return to the game selector.
- `q` or `esc`: quit.
- `a`: approve the currently pending OpenCode permission once.

The `a` binding only replies to an active OpenCode permission prompt with `once`. Review what the agent is asking for before approving.

The package exports its TUI entrypoint as `./tui` and is intended for OpenCode's TUI plugin loader.

## Links

- npm: https://www.npmjs.com/package/opencode-agent-arcade
- GitHub: https://github.com/fedeya/agent-arcade
