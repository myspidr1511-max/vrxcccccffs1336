
export type ChatReq = {
  model: string
  messages: Array<{ role: 'user'|'assistant'|'system', content: any }>
}

export async function chat(req: ChatReq, key: string) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-openrouter-key': key,
    },
    body: JSON.stringify(req)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
