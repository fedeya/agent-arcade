export const ground = 8
export const notificationRows = 3
export const playerX = 8
export const jumpVelocity = 3.2
export const gravity = 0.42
export const tickMs = 60

export type Obstacle = {
  id: number
  x: number
  h: number
}

export type Floater = {
  id: number
  text: string
  x: number
  y: number
  ttl: number
}

export type RunnerState = {
  playerY: number
  velocity: number
  obstacles: Obstacle[]
  floaters: Floater[]
  score: number
  over: boolean
  nextObstacle: number
  frame: number
}
