import { ground, notificationRows, playerX, type RunnerState } from "./model"

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function drawRunner(state: RunnerState, pendingPermission: boolean, cols: number) {
  const inner = Math.max(1, Math.floor(cols))
  const floorRow = notificationRows + ground
  const rows = Array.from({ length: floorRow + 1 }, () => Array.from({ length: inner }, () => " "))
  const playerRow = notificationRows + ground - 1 - Math.round(state.playerY)
  const player = state.over ? "x" : state.frame % 8 < 4 ? "@" : "o"

  if (playerX < inner && playerRow >= notificationRows && playerRow < floorRow) rows[playerRow][playerX] = player
  if (playerX < inner && playerRow + 1 >= notificationRows && playerRow + 1 < floorRow) rows[playerRow + 1][playerX] = "|"

  for (const obstacle of state.obstacles) {
    const x = Math.round(obstacle.x)
    if (x < 0 || x >= inner) continue
    for (let i = 0; i < obstacle.h; i++) rows[notificationRows + ground - 1 - i][x] = "#"
  }

  for (const floater of state.floaters) {
    const y = clamp(Math.round(floater.y), 0, notificationRows - 1)
    const rawX = Math.round(floater.x)
    const x = Math.max(0, rawX)
    const textStart = Math.max(0, -rawX)
    const text = floater.text.slice(textStart, textStart + Math.max(0, inner - x))
    for (let i = 0; i < text.length; i++) rows[y][x + i] = text[i]
  }

  rows[floorRow] = Array.from({ length: inner }, (_, i) => (i % 4 === state.frame % 4 ? "_" : "-"))

  const help = pendingPermission
    ? "a approve once - space/up/k jump - r reset - m menu - q/esc quit"
    : "space/up/k jump - r reset - m menu - q/esc quit"
  return [
    ...rows.map((line) => line.join("")),
    "",
    (state.over ? "you got paged by reality. press r to retry or q to quit" : help).slice(0, inner),
  ]
}
