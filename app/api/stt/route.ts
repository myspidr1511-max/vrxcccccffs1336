
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-openai-key')
  if (!key) return new NextResponse('Missing OpenAI key', { status: 400 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return new NextResponse('Missing audio file', { status: 400 })

  const b = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/webm' })
  const upstream = new FormData()
  upstream.append('file', b, file.name || 'audio.webm')
  upstream.append('model', 'whisper-1')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`
    },
    body: upstream as any
  })
  const text = await res.text()
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
