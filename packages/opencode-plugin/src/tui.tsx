/** @jsxImportSource @opentui/solid */
import type { TuiPluginModule } from "@opencode-ai/plugin/tui"
import { ArcadeOverlay } from "./arcade/ArcadeOverlay"
import { ArcadeProvider, createArcadeController, type AgentArcadeOptions } from "./arcade/state"

const plugin: TuiPluginModule & { id: string } = {
  id: "agent-arcade",
  tui: async (api, options) => {
    const arcade = createArcadeController(api, options as AgentArcadeOptions | undefined)

    api.slots.register({
      slots: {
        app() {
          return <ArcadeProvider controller={arcade}>{arcade.open() ? <ArcadeOverlay /> : null}</ArcadeProvider>
        },
      },
    })

    api.keymap.registerLayer({
      commands: [
        {
          name: "agent-arcade.open",
          title: "Open Arcade",
          category: "Agent Arcade",
          namespace: "palette",
          slashName: "agent-arcade",
          run: arcade.openGame,
        },
        {
          name: "agent-arcade.auto-start",
          title: "Toggle Auto-start",
          category: "Agent Arcade",
          namespace: "palette",
          slashName: "agent-arcade-auto",
          run: arcade.toggleAutoStart,
        },
      ],
      bindings: [{ key: "ctrl+shift+g", cmd: "agent-arcade.open" }],
    })
  },
}

export default plugin
