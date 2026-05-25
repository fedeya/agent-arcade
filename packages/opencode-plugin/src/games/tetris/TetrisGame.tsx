/** @jsxImportSource @opentui/solid */
import { For, createMemo, createSignal, onCleanup } from "solid-js"
import { useBindings } from "@opentui/keymap/solid"
import { useTerminalDimensions } from "@opentui/solid"
import { useArcade } from "../../arcade/state"
import { drawTetris } from "./draw"
import { tickMs, type TetrisInput } from "./model"
import { applyTetrisInput, initialTetrisState, stepTetrisState } from "./state"

const permissionBadge = " PERMISSION: PRESS A "
const permissionBorderColors = ["#ff005f", "#ffaf00", "#ffff00", "#00ff87", "#00afff", "#af5fff"]

export function TetrisGame() {
  const arcade = useArcade()
  const dim = useTerminalDimensions()
  const game = () => arcade.ensureGameState("tetris", initialTetrisState)
  const [high, setHigh] = createSignal(arcade.api.kv.get("agent_arcade_tetris_high_score", 0))
  const pendingPermission = createMemo(() => arcade.pendingPermission() !== undefined)

  const reset = () => arcade.resetGameState("tetris", initialTetrisState)
  const move = (input: TetrisInput) => {
    arcade.setGameState("tetris", (state) => applyTetrisInput(state ?? initialTetrisState(), input))
  }

  useBindings(() => ({
    enabled: () => true,
    commands: [
      { name: "agent-arcade.tetris-left", run: () => move("left") },
      { name: "agent-arcade.tetris-right", run: () => move("right") },
      { name: "agent-arcade.tetris-down", run: () => move("down") },
      { name: "agent-arcade.tetris-rotate", run: () => move("rotate") },
      { name: "agent-arcade.tetris-drop", run: () => move("drop") },
      { name: "agent-arcade.tetris-hold", run: () => move("hold") },
      { name: "agent-arcade.reset", run: reset },
      { name: "agent-arcade.quit", run: arcade.closeGame },
      { name: "agent-arcade.menu", run: arcade.backToMenu },
      { name: "agent-arcade.approve-permission", run: arcade.approvePermission },
    ],
    bindings: [
      { key: "left,h", cmd: "agent-arcade.tetris-left" },
      { key: "right,l", cmd: "agent-arcade.tetris-right" },
      { key: "down,j", cmd: "agent-arcade.tetris-down" },
      { key: "up,k,space", cmd: "agent-arcade.tetris-rotate" },
      { key: "d", cmd: "agent-arcade.tetris-drop" },
      { key: "c", cmd: "agent-arcade.tetris-hold" },
      { key: "a", cmd: "agent-arcade.approve-permission" },
      { key: "m", cmd: "agent-arcade.menu" },
      { key: "r", cmd: "agent-arcade.reset" },
      { key: "escape,q", cmd: "agent-arcade.quit" },
    ],
  }))

  const timer = setInterval(() => {
    const incoming = arcade.feed()
    if (incoming.length > 0) arcade.clearFeed()

    arcade.setGameState("tetris", (state) => {
      state = state ?? initialTetrisState()
      const next = stepTetrisState(state, incoming)
      if (next.score > high()) {
        setHigh(next.score)
        arcade.api.kv.set("agent_arcade_tetris_high_score", next.score)
      }
      return next
    })
  }, tickMs)

  onCleanup(() => clearInterval(timer))

  const status = createMemo(() => (arcade.done() ? "AGENT DONE" : arcade.busy() ? "agent is cooking" : "practice mode"))
  const header = createMemo(() => `TETRIS  score ${String(game().score).padStart(5, "0")}  high ${String(high()).padStart(5, "0")}  ${status()}`)
  const headerLeftWidth = createMemo(() => Math.max(0, 72 - (pendingPermission() ? permissionBadge.length : 0)))
  const lines = createMemo(() => drawTetris(game(), pendingPermission()))
  const borderColor = createMemo(() => {
    if (!pendingPermission()) return "#00d7ff"
    return permissionBorderColors[Math.floor(game().frame / 2) % permissionBorderColors.length]
  })

  return (
    <box
      width={Math.min(dim().width, 96)}
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
      <box flexDirection="column" paddingTop={1}>
        <For each={lines()}>
          {(line) => (
            <box flexDirection="row">
              <For each={line}>
                {(segment) => <text fg={segment.fg} bg={segment.bg}>{segment.text}</text>}
              </For>
            </box>
          )}
        </For>
      </box>
    </box>
  )
}
