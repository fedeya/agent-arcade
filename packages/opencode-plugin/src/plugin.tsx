/** @jsxImportSource @opentui/solid */
import { createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"
import { useBindings } from "@opentui/keymap/solid"
import { RGBA } from "@opentui/core"
import type { TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"

const width = 54
const ground = 8
const playerX = 8
const jumpVelocity = 3.2
const gravity = 0.42
const tickMs = 60

type Obstacle = {
  id: number
  x: number
  h: number
}

type Floater = {
  id: number
  text: string
  x: number
  y: number
  ttl: number
}

type AgentSignal = {
  id: number
  text: string
  kind: "info" | "good" | "warn" | "bad"
}

type GameState = {
  playerY: number
  velocity: number
  obstacles: Obstacle[]
  floaters: Floater[]
  score: number
  over: boolean
  nextObstacle: number
  frame: number
}

const initialGame = (): GameState => ({
  playerY: 0,
  velocity: 0,
  obstacles: [{ id: 1, x: width - 4, h: 2 }],
  floaters: [],
  score: 0,
  over: false,
  nextObstacle: width + 22,
  frame: 0,
})

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function short(value: unknown, max = 34) {
  if (typeof value !== "string") return undefined
  const text = value.replace(/\s+/g, " ").trim()
  if (!text) return undefined
  return text.length > max ? `${text.slice(0, max - 3)}...` : text
}

function inputString(input: unknown, keys: string[]) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined
  for (const key of keys) {
    const value = Reflect.get(input, key)
    const text = short(value)
    if (text) return text
  }
  return undefined
}

function formatTool(part: any) {
  const tool = typeof part?.tool === "string" ? part.tool : "tool"
  const status = typeof part?.state?.status === "string" ? part.state.status : "running"
  const input = part?.state?.input

  if (tool === "bash") {
    const command = inputString(input, ["command", "cmd"])
    return `${status === "completed" ? "shell done" : "shell goblin"}${command ? `: ${command}` : ""}`
  }

  if (tool === "edit" || tool === "write") {
    const file = inputString(input, ["filePath", "path", "file"])
    return `${status === "completed" ? "diff landed" : "diff gremlin"}${file ? `: ${file}` : ""}`
  }

  if (tool === "read") {
    const file = inputString(input, ["filePath", "path", "file"])
    return `agent reads${file ? `: ${file}` : ""}`
  }

  if (tool === "grep" || tool === "glob") return `${tool} radar ping`

  if (tool === "task") {
    const desc = inputString(input, ["description", "subagent_type"])
    return `subagent deployed${desc ? `: ${desc}` : ""}`
  }

  return `${status} ${tool}`
}

function draw(state: GameState, busy: boolean, done: boolean, high: number, cols: number) {
  const inner = Math.max(24, Math.min(width, cols - 4))
  const rows = Array.from({ length: ground + 1 }, () => Array.from({ length: inner }, () => " "))
  const playerRow = ground - 1 - Math.round(state.playerY)
  const player = state.over ? "x" : state.frame % 8 < 4 ? "@" : "o"

  if (playerRow >= 0 && playerRow < ground) rows[playerRow][playerX] = player
  if (playerRow + 1 >= 0 && playerRow + 1 < ground) rows[playerRow + 1][playerX] = "|"

  for (const obstacle of state.obstacles) {
    const x = Math.round(obstacle.x)
    if (x < 0 || x >= inner) continue
    for (let i = 0; i < obstacle.h; i++) rows[ground - 1 - i][x] = "#"
  }

  for (const floater of state.floaters) {
    const y = clamp(Math.round(floater.y), 0, ground - 2)
    const x = clamp(Math.round(floater.x), 0, inner - 1)
    const text = floater.text.slice(0, Math.max(0, inner - x))
    for (let i = 0; i < text.length; i++) rows[y][x + i] = text[i]
  }

  rows[ground] = Array.from({ length: inner }, (_, i) => (i % 4 === state.frame % 4 ? "_" : "-"))

  const status = done ? "AGENT DONE. GO PRETEND YOU WERE WORKING." : busy ? "agent is cooking..." : "no active agent, practice mode"
  return [
    `score ${String(state.score).padStart(4, "0")}  high ${String(high).padStart(4, "0")}  ${status}`.slice(0, inner),
    "",
    ...rows.map((line) => line.join("")),
    "",
    state.over ? "you got paged by reality. press r to retry or q to quit" : "space/up/k jump - r reset - q/esc quit - /wait-game",
  ]
}

function WaitGame(props: {
  api: TuiPluginApi
  feed: () => AgentSignal[]
  clearFeed: () => void
  close: () => void
  busy: () => boolean
  done: () => boolean
}) {
  const dim = useTerminalDimensions()
  const [game, setGame] = createSignal(initialGame())
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
    setGame(initialGame())
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
  const lines = createMemo(() => draw(game(), props.busy(), props.done(), high(), panelWidth()))

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
      <text fg="#ff5f87"><b>wait-game</b> <span style={{ fg: "#777777" }}>overlay mode: pretending to monitor the agent</span></text>
      <text fg="#777777">agent tool calls become airborne nonsense while the real UI stays behind the backdrop</text>
      <box height={1} />
      {lines().map((line, index) => (
        <text fg={index === 0 ? "#87ffaf" : line.startsWith(">>") ? "#5fd7ff" : "#d0d0d0"}>{line}</text>
      ))}
    </box>
  )
}

function WaitGameOverlay(props: {
  api: TuiPluginApi
  feed: () => AgentSignal[]
  clearFeed: () => void
  close: () => void
  busy: () => boolean
  done: () => boolean
}) {
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
        <WaitGame {...props} />
      </box>
    </box>
  )
}

const plugin: TuiPluginModule & { id: string } = {
  id: "wait-game",
  tui: async (api) => {
    const [open, setOpen] = createSignal(false)
    const [busy, setBusy] = createSignal(false)
    const [done, setDone] = createSignal(false)
    let signalID = 1
    const queue: AgentSignal[] = []
    const seen = new Map<string, number>()
    const push = (text: string, kind: AgentSignal["kind"] = "info") => {
      queue.push({ id: signalID++, text, kind })
      while (queue.length > 12) queue.shift()
    }
    const pushOnce = (key: string, text: string, kind: AgentSignal["kind"] = "info", ttl = 2500) => {
      const now = Date.now()
      const prev = seen.get(key)
      if (prev && now - prev < ttl) return

      seen.set(key, now)
      for (const [item, time] of seen) {
        if (now - time > 60_000) seen.delete(item)
      }
      push(text, kind)
    }

    api.event.on("session.status", (event) => {
      const sessionID = event.properties.sessionID
      const status = event.properties.status.type
      if (status === "busy") {
        setBusy(true)
        setDone(false)
        pushOnce(`session:${sessionID}:busy`, "agent started cooking", "good", 5000)
      }
      if (status === "retry") {
        setBusy(true)
        setDone(false)
        pushOnce(`session:${sessionID}:retry`, "agent hit retry lore", "warn", 5000)
      }
      if (status === "idle") {
        setBusy(false)
        setDone(true)
        pushOnce(`session:${sessionID}:idle`, "agent done. allegedly.", "good", 5000)
      }
    })

    api.event.on("message.part.updated", (event) => {
      const part = event.properties.part
      if (part.type === "tool") {
        pushOnce(
          `tool:${part.id}:${part.state.status}`,
          formatTool(part),
          part.state.status === "error" ? "bad" : "info",
          part.state.status === "running" ? 4000 : 30_000,
        )
      }
      if (part.type === "reasoning" && part.time?.end) {
        pushOnce(`reasoning:${part.id}:end`, "thinking finished. no refunds.", "info", 30_000)
      }
    })

    api.event.on("permission.asked", (event) => {
      pushOnce(`permission:${event.properties.id}`, "permission boss appeared", "warn", 30_000)
    })
    api.event.on("question.asked", (event) => {
      pushOnce(`question:${event.properties.id}`, "agent needs a human", "warn", 30_000)
    })
    api.event.on("session.error", (event) => {
      pushOnce(`session:${event.properties.sessionID}:error`, "agent exploded", "bad", 30_000)
    })

    const closeGame = () => {
      setOpen(false)
    }

    const openGame = () => {
      setOpen((value) => !value)
    }

    api.slots.register({
      slots: {
        app() {
          return open() ? (
            <WaitGameOverlay
              api={api}
              feed={() => queue.slice()}
              clearFeed={() => queue.splice(0)}
              close={closeGame}
              busy={busy}
              done={done}
            />
          ) : null
        },
      },
    })

    api.keymap.registerLayer({
      commands: [
        {
          name: "wait-game.open",
          title: "Wait Game",
          category: "Plugin",
          namespace: "palette",
          slashName: "wait-game",
          run: openGame,
        },
      ],
      bindings: [{ key: "ctrl+shift+g", cmd: "wait-game.open" }],
    })
  },
}

export default plugin
