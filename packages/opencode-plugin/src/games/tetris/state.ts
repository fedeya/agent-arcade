import type { AgentSignal } from "../../arcade/types"
import { boardCols, boardRows, pieceBlocks, pieceKinds, type CellKind, type Piece, type Point, type TetrisInput, type TetrisState } from "./model"

const linesPerLevel = 10
const clearScores = [0, 40, 100, 300, 1200]
const gravityFramesByLevel = [7, 6, 5, 4, 3, 2, 1]

export function levelForLines(lines: number) {
  return Math.floor(lines / linesPerLevel) + 1
}

function gravityFramesForLines(lines: number) {
  return gravityFramesByLevel[levelForLines(lines) - 1] ?? 1
}

const emptyBoard = () => Array.from({ length: boardRows }, () => Array.from({ length: boardCols }, () => undefined as CellKind | undefined))

function cloneBoard(board: TetrisState["board"]) {
  return board.map((row) => row.slice())
}

function createPiece(random = Math.random): Piece {
  const kind = pieceKinds[Math.floor(random() * pieceKinds.length)] ?? "t"
  return {
    kind,
    blocks: pieceBlocks[kind].map((block) => ({ ...block })),
    x: 3,
    y: 0,
  }
}

export function initialTetrisState(random = Math.random): TetrisState {
  return {
    board: emptyBoard(),
    active: createPiece(random),
    next: createPiece(random),
    score: 0,
    lines: 0,
    over: false,
    frame: 0,
    notices: [],
  }
}

function absoluteBlocks(piece: Piece): Point[] {
  return piece.blocks.map((block) => ({ x: piece.x + block.x, y: piece.y + block.y }))
}

function collides(board: TetrisState["board"], piece: Piece) {
  return absoluteBlocks(piece).some((block) => {
    if (block.x < 0 || block.x >= boardCols || block.y >= boardRows) return true
    if (block.y < 0) return false
    return board[block.y]?.[block.x] !== undefined
  })
}

function moved(piece: Piece, dx: number, dy: number): Piece {
  return { ...piece, x: piece.x + dx, y: piece.y + dy }
}

function rotated(piece: Piece): Piece {
  if (piece.kind === "o") return piece

  return {
    ...piece,
    blocks: piece.blocks.map((block) => ({ x: 3 - block.y, y: block.x })),
  }
}

function tryMove(state: TetrisState, piece: Piece) {
  return collides(state.board, piece) ? state : { ...state, active: piece }
}

function clearRows(board: TetrisState["board"]) {
  const kept = board.filter((row) => row.some((cell) => cell === undefined))
  const cleared = boardRows - kept.length
  const fresh = Array.from({ length: cleared }, () => Array.from({ length: boardCols }, () => undefined as CellKind | undefined))
  return { board: [...fresh, ...kept], cleared }
}

function lockPiece(state: TetrisState, random = Math.random): TetrisState {
  const board = cloneBoard(state.board)
  for (const block of absoluteBlocks(state.active)) {
    if (block.y >= 0 && block.y < boardRows && block.x >= 0 && block.x < boardCols) board[block.y]![block.x] = state.active.kind
  }

  const result = clearRows(board)
  const active = { ...state.next, x: 3, y: 0 }
  const next = createPiece(random)
  const over = collides(result.board, active)
  const lineScore = (clearScores[result.cleared] ?? result.cleared * 250) * levelForLines(state.lines)

  return {
    ...state,
    board: result.board,
    active,
    next,
    score: state.score + lineScore,
    lines: state.lines + result.cleared,
    over,
  }
}

function descend(state: TetrisState, random = Math.random): TetrisState {
  const next = moved(state.active, 0, 1)
  if (!collides(state.board, next)) return { ...state, active: next }
  return lockPiece(state, random)
}

function noticeText(signal: AgentSignal) {
  if (signal.kind === "bad") return `!! ${signal.text}`
  if (signal.kind === "warn") return `?? ${signal.text}`
  return `>> ${signal.text}`
}

function updateNotices(notices: TetrisState["notices"], incoming: AgentSignal[]) {
  return [
    ...incoming.slice(-3).map((signal) => ({ id: signal.id, text: noticeText(signal), kind: signal.kind, ttl: 55 })),
    ...notices.map((notice) => ({ ...notice, ttl: notice.ttl - 1 })),
  ]
    .filter((notice) => notice.ttl > 0)
    .slice(0, 5)
}

export function applyTetrisInput(state: TetrisState, input: TetrisInput, random = Math.random): TetrisState {
  if (state.over) return state
  if (input === "left") return tryMove(state, moved(state.active, -1, 0))
  if (input === "right") return tryMove(state, moved(state.active, 1, 0))
  if (input === "down") {
    const next = descend(state, random)
    return { ...next, score: next.score + 1 }
  }
  if (input === "rotate") {
    const piece = rotated(state.active)
    const kicks = [piece, moved(piece, -1, 0), moved(piece, 1, 0), moved(piece, -2, 0), moved(piece, 2, 0)]
    return tryMove(state, kicks.find((kick) => !collides(state.board, kick)) ?? state.active)
  }

  let dropped = state
  let distance = 0
  while (!dropped.over) {
    const next = moved(dropped.active, 0, 1)
    if (collides(dropped.board, next)) break
    dropped = { ...dropped, active: next }
    distance++
  }
  const locked = lockPiece(dropped, random)
  return { ...locked, score: locked.score + distance * 2 }
}

export function stepTetrisState(state: TetrisState, incoming: AgentSignal[], random = Math.random): TetrisState {
  const withNotices = {
    ...state,
    notices: updateNotices(state.notices, incoming),
    frame: state.frame + 1,
  }
  if (withNotices.over) return withNotices
  if (withNotices.frame % gravityFramesForLines(withNotices.lines) !== 0) return withNotices
  return descend(withNotices, random)
}
