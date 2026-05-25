/** @jsxImportSource @opentui/solid */
import { Show, onCleanup, onMount } from "solid-js"
import { RGBA } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { RunnerGame } from "../games/runner"
import { TetrisGame } from "../games/tetris"
import { useArcade } from "./state"

export function ArcadeOverlay() {
  const arcade = useArcade()
  const dim = useTerminalDimensions()

  onMount(() => {
    const focused = arcade.api.renderer.currentFocusedRenderable
    focused?.blur()
    const popMode = arcade.api.mode.push("modal")
    const blurAgain = setTimeout(() => focused?.blur(), 0)

    onCleanup(() => {
      clearTimeout(blurAgain)
      popMode()
      if (!focused?.isDestroyed) focused?.focus()
    })
  })

  return (
    <box
      width={dim().width}
      height={dim().height}
      position="absolute"
      zIndex={5000}
      left={0}
      top={0}
      alignItems="center"
      paddingTop={Math.max(1, Math.floor(dim().height / 5))}
      backgroundColor={RGBA.fromInts(0, 0, 0, 150)}
      onMouseUp={arcade.closeGame}
    >
      <box onMouseUp={(event: { stopPropagation(): void }) => event.stopPropagation()} backgroundColor="#050505">
        <Show when={arcade.selectedGame() === "runner"}>
          <RunnerGame />
        </Show>
        <Show when={arcade.selectedGame() === "tetris"}>
          <TetrisGame />
        </Show>
      </box>
    </box>
  )
}
