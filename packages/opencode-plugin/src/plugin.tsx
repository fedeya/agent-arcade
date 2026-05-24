/** @jsxImportSource @opentui/solid */
import { createSignal } from "solid-js"
import type { TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createSignalFeed } from "./arcade/feed"
import { RunnerOverlay, formatTool } from "./games/runner"

const plugin: TuiPluginModule & { id: string } = {
  id: "wait-game",
  tui: async (api) => {
    const [open, setOpen] = createSignal(false)
    const [busy, setBusy] = createSignal(false)
    const [done, setDone] = createSignal(false)
    const feed = createSignalFeed()

    api.event.on("session.status", (event) => {
      const sessionID = event.properties.sessionID
      const status = event.properties.status.type
      if (status === "busy") {
        setBusy(true)
        setDone(false)
        feed.pushOnce(`session:${sessionID}:busy`, "agent started cooking", "good", 5000)
      }
      if (status === "retry") {
        setBusy(true)
        setDone(false)
        feed.pushOnce(`session:${sessionID}:retry`, "agent hit retry lore", "warn", 5000)
      }
      if (status === "idle") {
        setBusy(false)
        setDone(true)
        feed.pushOnce(`session:${sessionID}:idle`, "agent done. allegedly.", "good", 5000)
      }
    })

    api.event.on("message.part.updated", (event) => {
      const part = event.properties.part
      if (part.type === "tool") {
        feed.pushOnce(
          `tool:${part.id}:${part.state.status}`,
          formatTool(part),
          part.state.status === "error" ? "bad" : "info",
          part.state.status === "running" ? 4000 : 30_000,
        )
      }
      if (part.type === "reasoning" && part.time?.end) {
        feed.pushOnce(`reasoning:${part.id}:end`, "thinking finished. no refunds.", "info", 30_000)
      }
    })

    api.event.on("permission.asked", (event) => {
      feed.pushOnce(`permission:${event.properties.id}`, "permission boss appeared", "warn", 30_000)
    })
    api.event.on("question.asked", (event) => {
      feed.pushOnce(`question:${event.properties.id}`, "agent needs a human", "warn", 30_000)
    })
    api.event.on("session.error", (event) => {
      feed.pushOnce(`session:${event.properties.sessionID}:error`, "agent exploded", "bad", 30_000)
    })

    const closeGame = () => {
      setOpen(false)
    }

    const openGame = () => {
      setOpen((value) => !value)
    }

    api.slots.register({
      slots: {
        app() {
          return open() ? (
            <RunnerOverlay
              api={api}
              feed={feed.feed}
              clearFeed={feed.clearFeed}
              close={closeGame}
              busy={busy}
              done={done}
            />
          ) : null
        },
      },
    })

    api.keymap.registerLayer({
      commands: [
        {
          name: "wait-game.open",
          title: "Wait Game",
          category: "Plugin",
          namespace: "palette",
          slashName: "wait-game",
          run: openGame,
        },
      ],
      bindings: [{ key: "ctrl+shift+g", cmd: "wait-game.open" }],
    })
  },
}

export default plugin
