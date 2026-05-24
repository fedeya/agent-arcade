import type { AgentSignal } from "../../arcade/types"
import type { RunnerState } from "./model"
import { gravity, playerX } from "./model"

const obstacleSpeed = 1.2
const floaterSpeed = 0.75
const gameOverFloaterSpeed = 0.55
const floaterLift = 0.01
const floaterLifetime = 95
const collisionRange = 1.1
const collisionClearance = 0.25
const minObstacleGap = 18
const randomObstacleGap = 18

export const initialRunnerState = (worldWidth: number): RunnerState => ({
  playerY: 0,
  velocity: 0,
  obstacles: [{ id: 1, x: Math.max(0, worldWidth - 4), h: 2 }],
  floaters: [],
  score: 0,
  over: false,
  nextObstacle: worldWidth + 22,
  frame: 0,
})

function signalText(signal: AgentSignal) {
  if (signal.kind === "bad") return `!! ${signal.text}`
  if (signal.kind === "warn") return `?? ${signal.text}`
  return `>> ${signal.text}`
}

export function stepRunnerState(state: RunnerState, incoming: AgentSignal[], worldWidth: number, random = Math.random): RunnerState {
  if (state.over) {
    return {
      ...state,
      floaters: state.floaters
        .map((item) => ({ ...item, x: item.x - gameOverFloaterSpeed, ttl: item.ttl - 1 }))
        .filter((item) => item.ttl > 0),
      frame: state.frame + 1,
    }
  }

  const playerY = Math.max(0, state.playerY + state.velocity)
  const velocity = playerY === 0 ? 0 : state.velocity - gravity
  const nextObstacle = state.nextObstacle - 1
  const spawned = nextObstacle <= worldWidth ? [{ id: state.frame, x: nextObstacle, h: random() > 0.72 ? 3 : 2 }] : []
  const obstacles = [...state.obstacles.map((item) => ({ ...item, x: item.x - obstacleSpeed })), ...spawned].filter((item) => item.x > -2)
  const fresh = incoming.slice(-4).map((item, index) => ({
    id: item.id,
    text: signalText(item),
    x: worldWidth - 2,
    y: 1 + index * 1.4,
    ttl: floaterLifetime,
  }))
  const floaters = [
    ...state.floaters.map((item) => ({ ...item, x: item.x - floaterSpeed, y: item.y - floaterLift, ttl: item.ttl - 1 })),
    ...fresh,
  ].filter((item) => item.ttl > 0 && item.x > -item.text.length)

  const hit = obstacles.some((item) => Math.abs(item.x - playerX) < collisionRange && playerY < item.h - collisionClearance)
  const score = state.score + 1

  return {
    playerY,
    velocity,
    obstacles,
    floaters,
    score,
    over: hit,
    nextObstacle: spawned.length > 0 ? worldWidth + minObstacleGap + Math.floor(random() * randomObstacleGap) : nextObstacle,
    frame: state.frame + 1,
  }
}
