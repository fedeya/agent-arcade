# Agent Arcade for OpenCode

Agent Arcade is an experimental OpenCode TUI plugin that turns agent wait time into a tiny terminal arcade game.

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

## Controls

- `/agent-arcade`: open or close the overlay.
- `/agent-arcade-auto`: toggle auto-start.
- `ctrl+shift+g`: open or close the overlay.
- `left` or `h`: move left.
- `right` or `l`: move right.
- `down` or `j`: soft drop.
- `up`, `k`, or `space`: rotate.
- `d`: hard drop.
- `r`: reset.
- `q` or `esc`: quit.
- `a`: approve the currently pending OpenCode permission once.

The `a` binding only replies to an active OpenCode permission prompt with `once`. Review what the agent is asking for before approving.

The package exports its TUI entrypoint as `./tui` and is intended for OpenCode's TUI plugin loader.
