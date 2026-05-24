/** @jsxImportSource @opentui/solid */
import { createMemo, createSignal, onCleanup } from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"
import { useBindings } from "@opentui/keymap/solid"
import type { GameProps } from "../../arcade/types"
import { drawRunner } from "./draw"
import { gravity, jumpVelocity, playerX, tickMs, width } from "./model"
import { initialRunnerState } from "./state"

export function RunnerGame(props: GameProps) {
  const dim = useTerminalDimensions()
  const [game, setGame] = createSignal(initialRunnerState())
  const [high, setHigh] = createSignal(props.api.kv.get("wait_game_high_score", 0))
  let nextID = 100

  const jump = () => {
    setGame((state) => {
      if (state.over) return state
      if (state.playerY > 0) return state
      return { ...state, velocity: jumpVelocity }
    })
  }

  const reset = () => {
    setGame(initialRunnerState())
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
      if (state.over) {
        return {
          ...state,
          floaters: state.floaters.map((item) => ({ ...item, x: item.x - 0.55, ttl: item.ttl - 1 })).filter((item) => item.ttl > 0),
          frame: state.frame + 1,
        }
      }

      const playerY = Math.max(0, state.playerY + state.velocity)
      const velocity = playerY === 0 ? 0 : state.velocity - gravity
      const nextObstacle = state.nextObstacle - 1
      const spawned = nextObstacle <= width ? [{ id: nextID++, x: nextObstacle, h: Math.random() > 0.72 ? 3 : 2 }] : []
      const obstacles = [...state.obstacles.map((item) => ({ ...item, x: item.x - 1.2 })), ...spawned].filter((item) => item.x > -2)
      const fresh = incoming.slice(-4).map((item, index) => ({
        id: item.id,
        text: item.kind === "bad" ? `!! ${item.text}` : item.kind === "warn" ? `?? ${item.text}` : `>> ${item.text}`,
        x: width - 2,
        y: 1 + index * 1.4,
        ttl: 95,
      }))
      const floaters = [
        ...state.floaters.map((item) => ({ ...item, x: item.x - 0.75, y: item.y - 0.01, ttl: item.ttl - 1 })),
        ...fresh,
      ].filter((item) => item.ttl > 0 && item.x > -item.text.length)

      const hit = obstacles.some((item) => Math.abs(item.x - playerX) < 1.1 && playerY < item.h - 0.25)
      const score = state.score + 1
      if (score > high()) {
        setHigh(score)
        props.api.kv.set("wait_game_high_score", score)
      }

      return {
        playerY,
        velocity,
        obstacles,
        floaters,
        score,
        over: hit,
        nextObstacle: spawned.length > 0 ? width + 18 + Math.floor(Math.random() * 18) : nextObstacle,
        frame: state.frame + 1,
      }
    })
  }, tickMs)

  onCleanup(() => clearInterval(timer))

  const panelWidth = createMemo(() => Math.min(Math.max(62, dim().width - 8), 82))
  const lines = createMemo(() => drawRunner(game(), props.busy(), props.done(), high(), panelWidth()))

  return (
    <box
      width={panelWidth()}
      maxWidth={dim().width - 2}
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
