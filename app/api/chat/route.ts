
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-openrouter-key')
  if (!key) return new NextResponse('Missing OpenRouter key', { status: 400 })
  const body = await req.json()

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://example.com',
      'X-Title': 'AI VRM Voice Chat'
    },
    body: JSON.stringify({
      model: body.model || 'openai/gpt-4o-mini',
      messages: body.messages
    })
  })
  const text = await res.text()
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
