export type ArcadeGame = "runner" | "tetris"

export const gameOptions: { title: string; value: ArcadeGame; description: string }[] = [
  { title: "Runner", value: "runner", description: "Jump over agent chaos" },
  { title: "Tetris", value: "tetris", description: "Stack blocks while tools run" },
]

export const isArcadeGame = (value: unknown): value is ArcadeGame => gameOptions.some((game) => game.value === value)
