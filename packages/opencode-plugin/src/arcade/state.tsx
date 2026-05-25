/** @jsxImportSource @opentui/solid */
import { createContext, createSignal, useContext, type JSX } from "solid-js"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createSignalFeed } from "./feed"
import { gameOptions, isArcadeGame, type ArcadeGame } from "./games"
import type { PendingPermission } from "./types"
import { formatTool } from "../games/runner/format"
import type { RunnerState } from "../games/runner/model"
import type { TetrisState } from "../games/tetris/model"

export type AgentArcadeOptions = {
  autoStart?: boolean
  autoStartGame?: AutoStartGame
}

type AutoStartGame = "last" | "runner" | "tetris" | "random"

const isAutoStartGame = (value: unknown): value is AutoStartGame => value === "last" || value === "runner" || value === "tetris" || value === "random"

type GameStateMap = {
  runner: RunnerState
  tetris: TetrisState
}

type GameStateUpdate<K extends ArcadeGame> = GameStateMap[K] | ((state: GameStateMap[K] | undefined) => GameStateMap[K])

export type ArcadeController = {
  api: TuiPluginApi
  open: () => boolean
  busy: () => boolean
  done: () => boolean
  pendingPermission: () => PendingPermission | undefined
  selectedGame: () => ArcadeGame
  feed: ReturnType<typeof createSignalFeed>["feed"]
  clearFeed: ReturnType<typeof createSignalFeed>["clearFeed"]
  getGameState: <K extends ArcadeGame>(game: K) => GameStateMap[K] | undefined
  setGameState: <K extends ArcadeGame>(game: K, update: GameStateUpdate<K>) => void
  ensureGameState: <K extends ArcadeGame>(game: K, create: () => GameStateMap[K]) => GameStateMap[K]
  resetGameState: <K extends ArcadeGame>(game: K, create: () => GameStateMap[K]) => void
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
  const [gameStates, setGameStates] = createSignal<Partial<GameStateMap>>({})
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
        options={gameOptions}
        current={selectedGame()}
        onSelect={(item) => {
          api.ui.dialog.clear()
          if (isArcadeGame(item.value)) startGame(item.value)
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

  const getGameState = <K extends ArcadeGame>(game: K) => gameStates()[game] as GameStateMap[K] | undefined

  const setGameState = <K extends ArcadeGame>(game: K, update: GameStateUpdate<K>) => {
    setGameStates((states) => {
      const current = states[game] as GameStateMap[K] | undefined
      const next = typeof update === "function" ? update(current) : update
      return { ...states, [game]: next }
    })
  }

  const ensureGameState = <K extends ArcadeGame>(game: K, create: () => GameStateMap[K]) => {
    const current = getGameState(game)
    if (current) return current
    const next = create()
    setGameState(game, next)
    return next
  }

  const resetGameState = <K extends ArcadeGame>(game: K, create: () => GameStateMap[K]) => {
    setGameState(game, create())
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
    getGameState,
    setGameState,
    ensureGameState,
    resetGameState,
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
