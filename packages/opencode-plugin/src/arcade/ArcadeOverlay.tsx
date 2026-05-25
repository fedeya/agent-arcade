/** @jsxImportSource @opentui/solid */
import { onCleanup, onMount } from "solid-js"
import { RGBA } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { RunnerGame } from "../games/runner"
import { TetrisGame } from "../games/tetris"
import type { ArcadeGame, GameProps } from "./types"

type ArcadeOverlayProps = GameProps & {
  game: ArcadeGame
}

export function ArcadeOverlay(props: ArcadeOverlayProps) {
  const dim = useTerminalDimensions()

  onMount(() => {
    const focused = props.api.renderer.currentFocusedRenderable
    focused?.blur()
    const popMode = props.api.mode.push("modal")
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
      onMouseUp={props.close}
    >
      <box onMouseUp={(event: { stopPropagation(): void }) => event.stopPropagation()} backgroundColor="#050505">
        {props.game === "runner" ? <RunnerGame {...props} /> : null}
        {props.game === "tetris" ? <TetrisGame {...props} /> : null}
      </box>
    </box>
  )
}
