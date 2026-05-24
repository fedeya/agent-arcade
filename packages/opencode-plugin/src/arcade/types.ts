import type { TuiPluginApi } from "@opencode-ai/plugin/tui"

export type AgentSignal = {
  id: number
  text: string
  kind: "info" | "good" | "warn" | "bad"
}

export type PendingPermission = {
  id: string
}

export type GameProps = {
  api: TuiPluginApi
  feed: () => AgentSignal[]
  clearFeed: () => void
  close: () => void
  busy: () => boolean
  done: () => boolean
  pendingPermission: () => PendingPermission | undefined
  approvePermission: () => Promise<void>
}
