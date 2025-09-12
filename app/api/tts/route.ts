
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-elevenlabs-key')
  if (!key) return new NextResponse('Missing ElevenLabs key', { status: 400 })
  const { text, voiceId } = await req.json()
  const vId = voiceId || 'Adam'

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vId)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true }
    })
  })
  const buf = await res.arrayBuffer()
  return new NextResponse(buf, {
    status: res.status,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store'
    }
  })
}
