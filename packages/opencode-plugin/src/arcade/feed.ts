import type { AgentSignal } from "./types"

export function createSignalFeed() {
  let signalID = 1
  const queue: AgentSignal[] = []
  const seen = new Map<string, number>()

  const push = (text: string, kind: AgentSignal["kind"] = "info") => {
    queue.push({ id: signalID++, text, kind })
    while (queue.length > 12) queue.shift()
  }

  const pushOnce = (key: string, text: string, kind: AgentSignal["kind"] = "info", ttl = 2500) => {
    const now = Date.now()
    const prev = seen.get(key)
    if (prev && now - prev < ttl) return

    seen.set(key, now)
    for (const [item, time] of seen) {
      if (now - time > 60_000) seen.delete(item)
    }
    push(text, kind)
  }

  const pushUnique = (key: string, text: string, kind: AgentSignal["kind"] = "info") => {
    if (seen.has(key)) return
    seen.set(key, Date.now())
    push(text, kind)
  }

  const clearFeed = () => queue.splice(0)

  return {
    feed: () => queue.slice(),
    clearFeed,
    push,
    pushOnce,
    pushUnique,
  }
}
