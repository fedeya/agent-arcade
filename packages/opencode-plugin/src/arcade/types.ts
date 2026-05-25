export type AgentSignal = {
  id: number
  text: string
  kind: "info" | "good" | "warn" | "bad"
}

export type PendingPermission = {
  id: string
}

export type ArcadeGame = "runner" | "tetris"
