/** @jsxImportSource @opentui/solid */
import { onCleanup, onMount } from "solid-js"
import { RGBA } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import type { GameProps } from "../../arcade/types"
import { TetrisGame } from "../tetris"

export function RunnerOverlay(props: GameProps) {
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
      <box
        onMouseUp={(event: { stopPropagation(): void }) => event.stopPropagation()}
        backgroundColor="#050505"
      >
        <TetrisGame {...props} />
      </box>
    </box>
  )
}
