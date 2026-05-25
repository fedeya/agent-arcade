/** @jsxImportSource @opentui/solid */
import { createSignal } from "solid-js"
import type { TuiPluginModule } from "@opencode-ai/plugin/tui"
import { ArcadeOverlay } from "./arcade/ArcadeOverlay"
import { createSignalFeed } from "./arcade/feed"
import type { ArcadeGame, PendingPermission } from "./arcade/types"
import { formatTool } from "./games/runner"

type AgentArcadeOptions = {
  autoStart?: boolean
}

const isArcadeGame = (value: unknown): value is ArcadeGame => value === "runner" || value === "tetris"

const plugin: TuiPluginModule & { id: string } = {
  id: "agent-arcade",
  tui: async (api, options) => {
    const pluginOptions = options as AgentArcadeOptions | undefined
    const defaultAutoStart = pluginOptions?.autoStart === true
    const [open, setOpen] = createSignal(false)
    const [busy, setBusy] = createSignal(false)
    const [done, setDone] = createSignal(false)
    const [pendingPermission, setPendingPermission] = createSignal<PendingPermission | undefined>()
    const [autoStart, setAutoStart] = createSignal(api.kv.get("agent_arcade_auto_start", api.kv.get("wait_game_auto_start", defaultAutoStart)) === true)
    const [selectedGame, setSelectedGame] = createSignal<ArcadeGame>(isArcadeGame(api.kv.get("agent_arcade_game", undefined)) ? api.kv.get("agent_arcade_game", "tetris") : "tetris")
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
      setPendingPermission({ id: event.properties.id })
      feed.pushOnce(`permission:${event.properties.id}`, "permission boss appeared", "warn", 30_000)
    })
    api.event.on("permission.replied", (event) => {
      if (pendingPermission()?.id === event.properties.requestID) setPendingPermission(undefined)
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

    const startGame = (game: ArcadeGame) => {
      setSelectedGame(game)
      api.kv.set("agent_arcade_game", game)
      if (!busy()) feed.clearFeed()
      setOpen(true)
    }

    const showGamePicker = () => {
      const DialogSelect = api.ui.DialogSelect
      api.ui.dialog.setSize("medium")
      api.ui.dialog.replace(() => (
        <DialogSelect
          title="Agent Arcade"
          options={[
            { title: "Runner", value: "runner", description: "Jump over agent chaos" },
            { title: "Tetris", value: "tetris", description: "Stack blocks while tools run" },
          ]}
          current={selectedGame()}
          onSelect={(item) => {
            api.ui.dialog.clear()
            startGame(item.value as ArcadeGame)
          }}
        />
      ))
    }

    const backToMenu = () => {
      closeGame()
      setTimeout(showGamePicker, 0)
    }

    const openGame = () => {
      if (open()) {
        closeGame()
        return
      }
      showGamePicker()
    }

    const approvePermission = async () => {
      const permission = pendingPermission()
      if (!permission) return

      try {
        await api.client.permission.reply({ requestID: permission.id, reply: "once" })
        setPendingPermission(undefined)
        feed.push("permission accepted", "good")
      } catch (error) {
        api.ui.toast({
          variant: "error",
          message: error instanceof Error ? error.message : "Failed to approve permission",
        })
      }
    }

    const toggleAutoStart = () => {
      setAutoStart((value) => {
        const next = !value
        api.kv.set("agent_arcade_auto_start", next)
        api.ui.toast({
          variant: next ? "success" : "info",
          message: `Agent Arcade auto-start ${next ? "enabled" : "disabled"}`,
        })
        return next
      })
    }

    api.slots.register({
      slots: {
        app() {
          return open() ? (
            <ArcadeOverlay
              api={api}
              feed={feed.feed}
              clearFeed={feed.clearFeed}
              close={closeGame}
              backToMenu={backToMenu}
              game={selectedGame()}
              busy={busy}
              done={done}
              pendingPermission={pendingPermission}
              approvePermission={approvePermission}
            />
          ) : null
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
          run: openGame,
        },
        {
          name: "agent-arcade.auto-start",
          title: "Toggle Auto-start",
          category: "Agent Arcade",
          namespace: "palette",
          slashName: "agent-arcade-auto",
          run: toggleAutoStart,
        },
      ],
      bindings: [{ key: "ctrl+shift+g", cmd: "agent-arcade.open" }],
    })
  },
}

export default plugin
