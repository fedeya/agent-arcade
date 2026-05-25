import type { AgentSignal } from "../../arcade/types"
import { boardCols, boardRows, pieceBlocks, pieceKinds, type CellKind, type Piece, type Point, type TetrisInput, type TetrisState } from "./model"

const linesPerLevel = 8
const clearScores = [0, 40, 100, 300, 1200]
const gravityFramesByLevel = [7, 6, 5, 4, 3, 2, 1]
const clearAnimationFrames = 3
const lockDelayFrames = 5

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

function createPieceFromKind(kind: CellKind): Piece {
  return {
    kind,
    blocks: pieceBlocks[kind].map((block) => ({ ...block })),
    x: 3,
    y: 0,
  }
}

function shuffledBag(random = Math.random) {
  const bag = pieceKinds.slice()
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const next = bag[i]!
    bag[i] = bag[j]!
    bag[j] = next
  }
  return bag
}

function drawPiece(bag: CellKind[], random = Math.random) {
  const nextBag = bag.length > 0 ? bag.slice() : shuffledBag(random)
  const kind = nextBag.shift() ?? "t"
  return { piece: createPieceFromKind(kind), bag: nextBag }
}

export function initialTetrisState(random = Math.random): TetrisState {
  const first = drawPiece([], random)
  const second = drawPiece(first.bag, random)

  return {
    board: emptyBoard(),
    active: first.piece,
    next: second.piece,
    bag: second.bag,
    canHold: true,
    paused: false,
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
  if (collides(state.board, piece)) return state
  return { ...state, active: piece, lockDelay: collides(state.board, moved(piece, 0, 1)) ? 0 : undefined }
}

function filledRows(board: TetrisState["board"]) {
  return board.flatMap((row, index) => (row.every((cell) => cell !== undefined) ? [index] : []))
}

function removeRows(board: TetrisState["board"], rows: number[]) {
  const removing = new Set(rows)
  const kept = board.filter((_, index) => !removing.has(index))
  const fresh = Array.from({ length: rows.length }, () => Array.from({ length: boardCols }, () => undefined as CellKind | undefined))
  return [...fresh, ...kept]
}

function spawnNext(state: TetrisState, board: TetrisState["board"], random = Math.random): TetrisState {
  const active = { ...state.next, x: 3, y: 0 }
  const drawn = drawPiece(state.bag, random)
  return {
    ...state,
    board,
    active,
    next: drawn.piece,
    bag: drawn.bag,
    canHold: true,
    over: collides(board, active),
    clearAnimation: undefined,
    lockDelay: undefined,
  }
}

function lockPiece(state: TetrisState, random = Math.random): TetrisState {
  const board = cloneBoard(state.board)
  for (const block of absoluteBlocks(state.active)) {
    if (block.y >= 0 && block.y < boardRows && block.x >= 0 && block.x < boardCols) board[block.y]![block.x] = state.active.kind
  }

  const rows = filledRows(board)
  if (rows.length === 0) return spawnNext(state, board, random)

  const pendingScore = (clearScores[rows.length] ?? rows.length * 250) * levelForLines(state.lines)

  return {
    ...state,
    board,
    clearAnimation: {
      rows,
      frame: 0,
      pendingScore,
      pendingLines: rows.length,
    },
  }
}

function stepClearAnimation(state: TetrisState, random = Math.random): TetrisState {
  const animation = state.clearAnimation
  if (!animation) return state
  if (animation.frame + 1 < clearAnimationFrames) {
    return { ...state, clearAnimation: { ...animation, frame: animation.frame + 1 } }
  }

  const board = removeRows(state.board, animation.rows)
  return spawnNext(
    {
      ...state,
      score: state.score + animation.pendingScore,
      lines: state.lines + animation.pendingLines,
    },
    board,
    random,
  )
}

function descend(state: TetrisState, random = Math.random): TetrisState {
  const next = moved(state.active, 0, 1)
  if (!collides(state.board, next)) return { ...state, active: next, lockDelay: undefined }
  if ((state.lockDelay ?? 0) + 1 < lockDelayFrames) return { ...state, lockDelay: (state.lockDelay ?? 0) + 1 }
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
  if (input === "pause") return state.over ? state : { ...state, paused: !state.paused }
  if (state.over || state.clearAnimation || state.paused) return state
  if (input === "left") return tryMove(state, moved(state.active, -1, 0))
  if (input === "right") return tryMove(state, moved(state.active, 1, 0))
  if (input === "hold") {
    if (!state.canHold) return state

    const active = state.hold ? createPieceFromKind(state.hold) : { ...state.next, x: 3, y: 0 }
    const drawn = state.hold ? undefined : drawPiece(state.bag, random)
    const next = state.hold ? state.next : drawn!.piece
    return {
      ...state,
      active,
      next,
      bag: drawn?.bag ?? state.bag,
      hold: state.active.kind,
      canHold: false,
      lockDelay: collides(state.board, moved(active, 0, 1)) ? 0 : undefined,
      over: collides(state.board, active),
    }
  }
  if (input === "down") {
    const next = descend(state, random)
    return next.active.y > state.active.y ? { ...next, score: next.score + 1 } : next
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
  if (withNotices.paused) return withNotices
  if (withNotices.clearAnimation) return stepClearAnimation(withNotices, random)
  if (collides(withNotices.board, moved(withNotices.active, 0, 1))) return descend(withNotices, random)
  if (withNotices.frame % gravityFramesForLines(withNotices.lines) !== 0) return withNotices
  return descend(withNotices, random)
}
