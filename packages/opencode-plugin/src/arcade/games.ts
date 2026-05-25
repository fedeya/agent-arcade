export const gameOptions = [
  { title: "Runner", value: "runner", description: "Jump over agent chaos" },
  { title: "Tetris", value: "tetris", description: "Stack blocks while tools run" },
] as const

export type ArcadeGame = (typeof gameOptions)[number]["value"]

export const isArcadeGame = (value: unknown): value is ArcadeGame => gameOptions.some((game) => game.value === value)
