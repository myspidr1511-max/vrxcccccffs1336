
export async function tts(text: string, voiceId: string, key: string): Promise<ArrayBuffer> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-elevenlabs-key': key,
    },
    body: JSON.stringify({ text, voiceId })
  })
  if (!res.ok) throw new Error(await res.text())
  return await res.arrayBuffer()
}
