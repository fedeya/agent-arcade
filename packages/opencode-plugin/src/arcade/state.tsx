/** @jsxImportSource @opentui/solid */
import { createContext, createSignal, useContext, type JSX, type Setter } from "solid-js"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createSignalFeed } from "./feed"
import type { ArcadeGame, PendingPermission } from "./types"
import { formatTool } from "../games/runner/format"
import type { RunnerState } from "../games/runner/model"
import { initialRunnerState } from "../games/runner/state"
import type { TetrisState } from "../games/tetris/model"
import { initialTetrisState } from "../games/tetris/state"

export type AgentArcadeOptions = {
  autoStart?: boolean
  autoStartGame?: AutoStartGame
}

type AutoStartGame = "last" | "runner" | "tetris" | "random"

const isArcadeGame = (value: unknown): value is ArcadeGame => value === "runner" || value === "tetris"
const isAutoStartGame = (value: unknown): value is AutoStartGame => value === "last" || value === "runner" || value === "tetris" || value === "random"

export type ArcadeController = {
  api: TuiPluginApi
  open: () => boolean
  busy: () => boolean
  done: () => boolean
  pendingPermission: () => PendingPermission | undefined
  selectedGame: () => ArcadeGame
  feed: ReturnType<typeof createSignalFeed>["feed"]
  clearFeed: ReturnType<typeof createSignalFeed>["clearFeed"]
  runnerGame: () => RunnerState | undefined
  setRunnerGame: Setter<RunnerState | undefined>
  tetrisGame: () => TetrisState | undefined
  setTetrisGame: Setter<TetrisState | undefined>
  ensureRunnerGame: (worldWidth: number) => RunnerState
  ensureTetrisGame: () => TetrisState
  resetRunner: (worldWidth: number) => void
  resetTetris: () => void
  closeGame: () => void
  openGame: () => void
  backToMenu: () => void
  approvePermission: () => Promise<void>
  toggleAutoStart: () => void
}

const ArcadeContext = createContext<ArcadeController>()

export function createArcadeController(api: TuiPluginApi, options?: AgentArcadeOptions): ArcadeController {
  const defaultAutoStart = options?.autoStart === true
  const autoStartGame = isAutoStartGame(options?.autoStartGame) ? options.autoStartGame : "last"
  const storedGame = api.kv.get("agent_arcade_game", undefined)
  const [open, setOpen] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const [done, setDone] = createSignal(false)
  const [pendingPermission, setPendingPermission] = createSignal<PendingPermission | undefined>()
  const [autoStart, setAutoStart] = createSignal(api.kv.get("agent_arcade_auto_start", api.kv.get("wait_game_auto_start", defaultAutoStart)) === true)
  const [selectedGame, setSelectedGame] = createSignal<ArcadeGame>(isArcadeGame(storedGame) ? storedGame : "tetris")
  const [runnerGame, setRunnerGame] = createSignal<RunnerState>()
  const [tetrisGame, setTetrisGame] = createSignal<TetrisState>()
  const feed = createSignalFeed()

  const chooseAutoStartGame = (): ArcadeGame => {
    if (autoStartGame === "runner" || autoStartGame === "tetris") return autoStartGame
    if (autoStartGame === "random") return Math.random() < 0.5 ? "runner" : "tetris"
    return selectedGame()
  }

  const openAutoStartGame = () => {
    setSelectedGame(chooseAutoStartGame())
    setOpen(true)
  }

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

  const ensureRunnerGame = (worldWidth: number) => {
    const current = runnerGame()
    if (current) return current
    const next = initialRunnerState(worldWidth)
    setRunnerGame(next)
    return next
  }

  const ensureTetrisGame = () => {
    const current = tetrisGame()
    if (current) return current
    const next = initialTetrisState()
    setTetrisGame(next)
    return next
  }

  api.event.on("session.status", (event) => {
    const sessionID = event.properties.sessionID
    const status = event.properties.status.type
    if (status === "busy") {
      const wasBusy = busy()
      setBusy(true)
      setDone(false)
      if (!wasBusy) {
        feed.clearFeed()
        if (autoStart()) openAutoStartGame()
        feed.push("agent started cooking", "good")
      }
    }
    if (status === "retry") {
      const wasBusy = busy()
      setBusy(true)
      setDone(false)
      if (autoStart() && !wasBusy) openAutoStartGame()
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

  return {
    api,
    open,
    busy,
    done,
    pendingPermission,
    selectedGame,
    feed: feed.feed,
    clearFeed: feed.clearFeed,
    runnerGame,
    setRunnerGame,
    tetrisGame,
    setTetrisGame,
    ensureRunnerGame,
    ensureTetrisGame,
    resetRunner: (worldWidth) => setRunnerGame(initialRunnerState(worldWidth)),
    resetTetris: () => setTetrisGame(initialTetrisState()),
    closeGame,
    openGame,
    backToMenu,
    approvePermission,
    toggleAutoStart,
  }
}

export function ArcadeProvider(props: { controller: ArcadeController; children: JSX.Element }) {
  return <ArcadeContext.Provider value={props.controller}>{props.children}</ArcadeContext.Provider>
}

export function useArcade() {
  const arcade = useContext(ArcadeContext)
  if (!arcade) throw new Error("useArcade must be used inside ArcadeProvider")
  return arcade
}
