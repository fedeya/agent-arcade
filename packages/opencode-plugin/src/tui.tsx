/** @jsxImportSource @opentui/solid */
import { Show } from "solid-js"
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
          return (
            <ArcadeProvider controller={arcade}>
              <Show when={arcade.open()}>
                <ArcadeOverlay />
              </Show>
            </ArcadeProvider>
          )
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
