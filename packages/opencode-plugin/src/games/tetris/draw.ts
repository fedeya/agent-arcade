import { boardCols, boardRows, type CellKind, type Piece, type TetrisState } from "./model"

export type TetrisSegment = {
  text: string
  fg?: string
  bg?: string
}

export type TetrisLine = TetrisSegment[]

const pieceColors: Record<CellKind, string> = {
  i: "#00d7ff",
  j: "#5f87ff",
  l: "#ffaf00",
  o: "#ffff00",
  s: "#00d75f",
  t: "#af5fff",
  z: "#ff5f5f",
}

const sideWidth = 32

const text = (value: string, fg = "#d0d0d0"): TetrisSegment => ({ text: value, fg })
const block = (kind: CellKind): TetrisSegment => ({ text: "  ", bg: pieceColors[kind] })
const empty = (): TetrisSegment => ({ text: "  " })
const pad = (width: number): TetrisSegment => ({ text: " ".repeat(Math.max(0, width)) })

function sideText(value: string, fg = "#d0d0d0") {
  const trimmed = value.length > sideWidth ? `${value.slice(0, sideWidth - 3)}...` : value
  return text(trimmed.padEnd(sideWidth), fg)
}

function pieceCells(piece: Piece) {
  const map = new Map<string, CellKind>()
  for (const block of piece.blocks) map.set(`${piece.x + block.x}:${piece.y + block.y}`, piece.kind)
  return map
}

function drawNext(piece: Piece) {
  const rows = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => undefined as CellKind | undefined))
  for (const block of piece.blocks) rows[block.y]![block.x] = piece.kind
  return rows.map((row) => row.map((cell) => (cell ? block(cell) : empty())))
}

function noticeFg(kind: TetrisState["notices"][number]["kind"]) {
  if (kind === "bad") return "#ff5f87"
  if (kind === "warn") return "#ffaf00"
  if (kind === "good") return "#87ffaf"
  return "#5fd7ff"
}

export function drawTetris(state: TetrisState, pendingPermission: boolean) {
  const active = pieceCells(state.active)
  const next = drawNext(state.next)
  const lines: TetrisLine[] = []

  lines.push([text(`+${"-".repeat(boardCols * 2)}+   `), sideText("NEXT")])
  for (let y = 0; y < boardRows; y++) {
    const row: TetrisLine = [text("|")]
    for (let x = 0; x < boardCols; x++) {
      const activeCell = active.get(`${x}:${y}`)
      const cell = activeCell ?? state.board[y]?.[x]
      row.push(cell ? block(cell) : empty())
    }
    row.push(text("|"))

    if (y >= 1 && y <= 4) row.push(text("   "), ...next[y - 1]!, pad(sideWidth - 8))
    if (y === 6) row.push(text("   "), sideText(`LINES ${String(state.lines).padStart(3, "0")}`))
    if (y === 7) row.push(text("   "), sideText(`SCORE ${String(state.score).padStart(5, "0")}`))
    if (y === 9) row.push(text("   "), sideText(pendingPermission ? "A approve permission" : "agent arcade", pendingPermission ? "#ffff00" : "#d0d0d0"))
    if (y >= 11 && y < 11 + state.notices.length) {
      const notice = state.notices[y - 11]!
      row.push(text("   "), sideText(notice.text, noticeFg(notice.kind)))
    }
    lines.push(row)
  }
  lines.push([text(`+${"-".repeat(boardCols * 2)}+`)])
  lines.push([text("")])
  lines.push([
    text(
      state.over
        ? "top out. press r to retry or q to quit"
        : pendingPermission
          ? "move arrows/hjkl - up/space rotate - d hard - a approve - m menu - q quit"
          : "move arrows/hjkl - up/space rotate - d hard - r reset - m menu - q quit",
      state.over ? "#ff5f87" : "#d0d0d0",
    ),
  ])
  return lines
}
