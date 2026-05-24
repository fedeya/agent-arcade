import { width, type RunnerState } from "./model"

export const initialRunnerState = (): RunnerState => ({
  playerY: 0,
  velocity: 0,
  obstacles: [{ id: 1, x: width - 4, h: 2 }],
  floaters: [],
  score: 0,
  over: false,
  nextObstacle: width + 22,
  frame: 0,
})
