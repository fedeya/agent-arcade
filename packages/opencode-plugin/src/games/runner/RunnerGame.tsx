/** @jsxImportSource @opentui/solid */
import { createMemo, createSignal, onCleanup } from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"
import { useBindings } from "@opentui/keymap/solid"
import type { GameProps } from "../../arcade/types"
import { drawRunner } from "./draw"
import { jumpVelocity, tickMs } from "./model"
import { initialRunnerState, stepRunnerState } from "./state"

const maxPanelWidth = 120

export function RunnerGame(props: GameProps) {
  const dim = useTerminalDimensions()
  const panelWidth = createMemo(() => Math.min(Math.max(1, Math.floor(dim().width)), maxPanelWidth))
  const worldWidth = createMemo(() => Math.max(1, panelWidth() - 6))
  const [game, setGame] = createSignal(initialRunnerState(worldWidth()))
  const [high, setHigh] = createSignal(props.api.kv.get("wait_game_high_score", 0))

  const jump = () => {
    setGame((state) => {
      if (state.over) return state
      if (state.playerY > 0) return state
      return { ...state, velocity: jumpVelocity }
    })
  }

  const reset = () => {
    setGame(initialRunnerState(worldWidth()))
  }

  useBindings(() => ({
    enabled: () => true,
    commands: [
      { name: "wait-game.jump", run: jump },
      { name: "wait-game.reset", run: reset },
      { name: "wait-game.quit", run: props.close },
    ],
    bindings: [
      { key: "space,up,k", cmd: "wait-game.jump" },
      { key: "r", cmd: "wait-game.reset" },
      { key: "escape,q", cmd: "wait-game.quit" },
    ],
  }))

  const timer = setInterval(() => {
    const incoming = props.feed()
    if (incoming.length > 0) props.clearFeed()

    setGame((state) => {
      const next = stepRunnerState(state, incoming, worldWidth())
      if (next.score > high()) {
        setHigh(next.score)
        props.api.kv.set("wait_game_high_score", next.score)
      }
      return next
    })
  }, tickMs)

  onCleanup(() => clearInterval(timer))

  const lines = createMemo(() => drawRunner(game(), props.busy(), props.done(), high(), worldWidth()))

  return (
    <box
      width={panelWidth()}
      maxWidth={dim().width}
      border
      borderColor="#ff5f87"
      backgroundColor="#050505"
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      flexDirection="column"
    >
      <text fg="#ff5f87"><b>runner</b> <span style={{ fg: "#777777" }}>overlay mode: pretending to monitor the agent</span></text>
      <text fg="#777777">agent tool calls become airborne nonsense while the real UI stays behind the backdrop</text>
      <box height={1} />
      {lines().map((line, index) => (
        <text fg={index === 0 ? "#87ffaf" : line.startsWith(">>") ? "#5fd7ff" : "#d0d0d0"}>{line}</text>
      ))}
    </box>
  )
}
