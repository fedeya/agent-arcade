import { ground, playerX, width, type RunnerState } from "./model"

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function drawRunner(state: RunnerState, busy: boolean, done: boolean, high: number, cols: number) {
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
