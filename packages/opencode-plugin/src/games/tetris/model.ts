import type { AgentSignal } from "../../arcade/types"

export const boardCols = 10
export const boardRows = 20
export const tickMs = 90

export type CellKind = "i" | "j" | "l" | "o" | "s" | "t" | "z"

export type Point = {
  x: number
  y: number
}

export type Piece = {
  kind: CellKind
  blocks: Point[]
  x: number
  y: number
}

export type Notice = {
  id: number
  text: string
  kind: AgentSignal["kind"]
  ttl: number
}

export type ClearAnimation = {
  rows: number[]
  frame: number
  pendingScore: number
  pendingLines: number
}

export type TetrisInput = "left" | "right" | "down" | "rotate" | "drop" | "hold" | "pause"

export type TetrisState = {
  board: (CellKind | undefined)[][]
  active: Piece
  next: Piece
  bag: CellKind[]
  hold?: CellKind
  canHold: boolean
  paused: boolean
  lockDelay?: number
  score: number
  lines: number
  over: boolean
  frame: number
  notices: Notice[]
  clearAnimation?: ClearAnimation
}

export const pieceKinds: CellKind[] = ["i", "j", "l", "o", "s", "t", "z"]

export const pieceBlocks: Record<CellKind, Point[]> = {
  i: [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
  ],
  j: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  l: [
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  o: [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  s: [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  t: [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  z: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
}
