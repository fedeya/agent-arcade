/** @jsxImportSource @opentui/solid */
import { createMemo, createSignal, onCleanup } from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"
import { useBindings } from "@opentui/keymap/solid"
import type { GameProps } from "../../arcade/types"
import { drawRunner } from "./draw"
import { jumpVelocity, tickMs } from "./model"
import { initialRunnerState, stepRunnerState } from "./state"

const maxPanelWidth = 120
const permissionBadge = " PERMISSION: PRESS A "
const permissionBorderColors = ["#ff005f", "#ffaf00", "#ffff00", "#00ff87", "#00afff", "#af5fff"]

export function RunnerGame(props: GameProps) {
  const dim = useTerminalDimensions()
  const panelWidth = createMemo(() => Math.min(Math.max(1, Math.floor(dim().width)), maxPanelWidth))
  const worldWidth = createMemo(() => Math.max(1, panelWidth() - 6))
  const [game, setGame] = createSignal(initialRunnerState(worldWidth()))
  const [high, setHigh] = createSignal(props.api.kv.get("agent_arcade_high_score", props.api.kv.get("wait_game_high_score", 0)))

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
      { name: "agent-arcade.jump", run: jump },
      { name: "agent-arcade.reset", run: reset },
      { name: "agent-arcade.quit", run: props.close },
      { name: "agent-arcade.approve-permission", run: props.approvePermission },
    ],
    bindings: [
      { key: "space,up,k", cmd: "agent-arcade.jump" },
      { key: "a", cmd: "agent-arcade.approve-permission" },
      { key: "r", cmd: "agent-arcade.reset" },
      { key: "escape,q", cmd: "agent-arcade.quit" },
    ],
  }))

  const timer = setInterval(() => {
    const incoming = props.feed()
    if (incoming.length > 0) props.clearFeed()

    setGame((state) => {
      const next = stepRunnerState(state, incoming, worldWidth())
      if (next.score > high()) {
        setHigh(next.score)
        props.api.kv.set("agent_arcade_high_score", next.score)
      }
      return next
    })
  }, tickMs)

  onCleanup(() => clearInterval(timer))

  const pendingPermission = createMemo(() => props.pendingPermission() !== undefined)
  const status = createMemo(() => (props.done() ? "AGENT DONE. GO PRETEND YOU WERE WORKING." : props.busy() ? "agent is cooking..." : "no active agent, practice mode"))
  const header = createMemo(() => `score ${String(game().score).padStart(4, "0")}  high ${String(high()).padStart(4, "0")}  ${status()}`)
  const headerLeftWidth = createMemo(() => Math.max(0, worldWidth() - (pendingPermission() ? permissionBadge.length : 0)))
  const lines = createMemo(() => drawRunner(game(), pendingPermission(), worldWidth()))
  const borderColor = createMemo(() => {
    if (!pendingPermission()) return "#ff5f87"
    return permissionBorderColors[Math.floor(game().frame / 2) % permissionBorderColors.length]
  })

  return (
    <box
      width={panelWidth()}
      maxWidth={dim().width}
      border
      borderColor={borderColor()}
      backgroundColor="#050505"
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      flexDirection="column"
    >
      <box flexDirection="row">
        <text fg="#87ffaf">{header().slice(0, headerLeftWidth()).padEnd(headerLeftWidth())}</text>
        {pendingPermission() ? <text fg="#050505" bg="#ffff00">{permissionBadge}</text> : null}
      </box>
      {lines().map((line) => (
        <text fg={line.startsWith(">>") ? "#5fd7ff" : "#d0d0d0"}>{line}</text>
      ))}
    </box>
  )
}
