function short(value: unknown, max = 34) {
  if (typeof value !== "string") return undefined
  const text = value.replace(/\s+/g, " ").trim()
  if (!text) return undefined
  return text.length > max ? `${text.slice(0, max - 3)}...` : text
}

function inputString(input: unknown, keys: string[]) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined
  for (const key of keys) {
    const value = Reflect.get(input, key)
    const text = short(value)
    if (text) return text
  }
  return undefined
}

export function formatTool(part: any) {
  const tool = typeof part?.tool === "string" ? part.tool : "tool"
  const status = typeof part?.state?.status === "string" ? part.state.status : "running"
  const input = part?.state?.input

  if (tool === "bash") {
    const command = inputString(input, ["command", "cmd"])
    return `${status === "completed" ? "shell done" : "shell spell"}${command ? `: ${command}` : ""}`
  }

  if (tool === "edit" || tool === "write") {
    const file = inputString(input, ["filePath", "path", "file"])
    return `${status === "completed" ? "diff landed" : "diff gremlin"}${file ? `: ${file}` : ""}`
  }

  if (tool === "read") {
    const file = inputString(input, ["filePath", "path", "file"])
    return `agent reads${file ? `: ${file}` : ""}`
  }

  if (tool === "grep" || tool === "glob") return `${tool} radar ping`

  if (tool === "task") {
    const desc = inputString(input, ["description", "subagent_type"])
    return `subagent deployed${desc ? `: ${desc}` : ""}`
  }

  return `${status} ${tool}`
}
