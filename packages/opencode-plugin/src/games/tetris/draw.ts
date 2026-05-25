import { boardCols, boardRows, pieceBlocks, type CellKind, type Piece, type TetrisState } from "./model"
import { levelForLines } from "./state"

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
const miniCols = 6
const miniRows = 4
const miniInnerWidth = miniCols * 2
const miniBoxWidth = miniInnerWidth + 2

const text = (value: string, fg = "#d0d0d0"): TetrisSegment => ({ text: value, fg })
const block = (kind: CellKind): TetrisSegment => ({ text: "  ", bg: pieceColors[kind] })
const clearBlock = (): TetrisSegment => ({ text: "  ", bg: "#f8f8f2" })
const ghostBlock = (): TetrisSegment => ({ text: "  ", bg: "#262626" })
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

function collides(board: TetrisState["board"], piece: Piece) {
  return piece.blocks.some((block) => {
    const x = piece.x + block.x
    const y = piece.y + block.y
    if (x < 0 || x >= boardCols || y >= boardRows) return true
    if (y < 0) return false
    return board[y]?.[x] !== undefined
  })
}

function ghostPiece(board: TetrisState["board"], piece: Piece) {
  let ghost = piece
  while (!collides(board, { ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 }
  return ghost
}

function drawMiniPiece(piece?: Pick<Piece, "kind" | "blocks">) {
  const rows = Array.from({ length: miniRows }, () => Array.from({ length: miniCols }, () => undefined as CellKind | undefined))
  if (piece) {
    const minX = Math.min(...piece.blocks.map((item) => item.x))
    const maxX = Math.max(...piece.blocks.map((item) => item.x))
    const minY = Math.min(...piece.blocks.map((item) => item.y))
    const maxY = Math.max(...piece.blocks.map((item) => item.y))
    const offsetX = Math.floor((miniCols - (maxX - minX + 1)) / 2) - minX
    const offsetY = Math.ceil((miniRows - (maxY - minY + 1)) / 2) - minY

    for (const block of piece.blocks) rows[block.y + offsetY]![block.x + offsetX] = piece.kind
  }
  return rows.map((row) => row.map((cell) => (cell ? block(cell) : empty())))
}

function drawMiniBox(piece?: Pick<Piece, "kind" | "blocks">) {
  const pieceRows = drawMiniPiece(piece)
  return [
    [text(`+${"-".repeat(miniInnerWidth)}+`)],
    ...pieceRows.map((row) => [text("|"), ...row, text("|")]),
    [text(`+${"-".repeat(miniInnerWidth)}+`)],
  ]
}

function joinMiniBoxes(left: TetrisLine[], right: TetrisLine[]) {
  return left.map((line, index) => [...line, text("  "), ...right[index]!, pad(sideWidth - (miniBoxWidth * 2 + 2))])
}

function noticeFg(kind: TetrisState["notices"][number]["kind"]) {
  if (kind === "bad") return "#ff5f87"
  if (kind === "warn") return "#ffaf00"
  if (kind === "good") return "#87ffaf"
  return "#5fd7ff"
}

export function drawTetris(state: TetrisState, pendingPermission: boolean) {
  const active = pieceCells(state.active)
  const ghost = state.over || state.clearAnimation ? undefined : pieceCells(ghostPiece(state.board, state.active))
  const preview = joinMiniBoxes(drawMiniBox(state.next), drawMiniBox(state.hold ? { kind: state.hold, blocks: pieceBlocks[state.hold] } : undefined))
  const clearing = new Set(state.clearAnimation?.rows ?? [])
  const showClear = state.clearAnimation ? state.clearAnimation.frame % 2 === 0 : false
  const lines: TetrisLine[] = []

  lines.push([text(`+${"-".repeat(boardCols * 2)}+   `), sideText("NEXT        HOLD")])
  for (let y = 0; y < boardRows; y++) {
    const row: TetrisLine = [text("|")]
    for (let x = 0; x < boardCols; x++) {
      if (clearing.has(y)) {
        row.push(showClear ? clearBlock() : empty())
        continue
      }

      const activeCell = active.get(`${x}:${y}`)
      const cell = activeCell ?? state.board[y]?.[x]
      row.push(cell ? block(cell) : empty())
      if (!cell && ghost?.has(`${x}:${y}`)) row[row.length - 1] = ghostBlock()
    }
    row.push(text("|"))

    if (y >= 0 && y < preview.length) row.push(text("   "), ...preview[y]!)
    if (y === 7) row.push(text("   "), sideText(`LINES ${String(state.lines).padStart(3, "0")}   LEVEL ${String(levelForLines(state.lines)).padStart(3, "0")}`))
    if (y === 9) row.push(text("   "), sideText(pendingPermission ? "A approve permission" : "agent arcade", pendingPermission ? "#ffff00" : "#d0d0d0"))
    if (y >= 10 && y < 10 + state.notices.length) {
      const notice = state.notices[y - 10]!
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
          ? "move arrows/hjkl - up/space rotate - c hold - d drop - a approve - m menu - q quit"
          : "move arrows/hjkl - up/space rotate - c hold - d drop - r reset - m menu - q quit",
      state.over ? "#ff5f87" : "#d0d0d0",
    ),
  ])
  return lines
}
