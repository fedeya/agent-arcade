/** @jsxImportSource @opentui/solid */
import { createSignal } from "solid-js"
import type { TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createSignalFeed } from "./arcade/feed"
import { RunnerOverlay, formatTool } from "./games/runner"

type WaitGameOptions = {
  autoStart?: boolean
}

const plugin: TuiPluginModule & { id: string } = {
  id: "wait-game",
  tui: async (api, options) => {
    const pluginOptions = options as WaitGameOptions | undefined
    const defaultAutoStart = pluginOptions?.autoStart === true
    const [open, setOpen] = createSignal(false)
    const [busy, setBusy] = createSignal(false)
    const [done, setDone] = createSignal(false)
    const [autoStart, setAutoStart] = createSignal(api.kv.get("wait_game_auto_start", defaultAutoStart) === true)
    const feed = createSignalFeed()

    api.event.on("session.status", (event) => {
      const sessionID = event.properties.sessionID
      const status = event.properties.status.type
      if (status === "busy") {
        const wasBusy = busy()
        setBusy(true)
        setDone(false)
        if (!wasBusy) {
          feed.clearFeed()
          if (autoStart()) setOpen(true)
          feed.push("agent started cooking", "good")
        }
      }
      if (status === "retry") {
        const wasBusy = busy()
        setBusy(true)
        setDone(false)
        if (autoStart() && !wasBusy) setOpen(true)
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
        feed.pushUnique(`reasoning:${part.id}:end`, "thinking finished. no refunds.", "info")
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
      feed.clearFeed()
      setOpen(false)
    }

    const openGame = () => {
      setOpen((value) => {
        const next = !value
        if (next && !busy()) feed.clearFeed()
        return next
      })
    }

    const toggleAutoStart = () => {
      setAutoStart((value) => {
        const next = !value
        api.kv.set("wait_game_auto_start", next)
        api.ui.toast({
          variant: next ? "success" : "info",
          message: `Wait game auto-start ${next ? "enabled" : "disabled"}`,
        })
        return next
      })
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
        {
          name: "wait-game.auto-start",
          title: "Toggle Wait Game Auto-start",
          category: "Plugin",
          namespace: "palette",
          slashName: "wait-game-auto",
          run: toggleAutoStart,
        },
      ],
      bindings: [{ key: "ctrl+shift+g", cmd: "wait-game.open" }],
    })
  },
}

export default plugin
