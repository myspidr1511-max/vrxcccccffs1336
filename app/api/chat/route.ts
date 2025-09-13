import { NextRequest } from 'next/server'

export const runtime = 'edge' // أسرع على Vercel

export async function POST(req: NextRequest) {
  try {
    const { prompt, keys, model = 'gpt-4o-mini', voiceId = 'pNInz6obpgDQGcFmaJgB' } = await req.json()

    if (!keys?.openrouter || !keys?.eleven) {
      return new Response(JSON.stringify({ error: 'missing keys' }), { status: 400 })
    }

    // 1) LLM via OpenRouter (BYOK)
    const chat = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keys.openrouter}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'أجب باختصار وباللغة العربية عندما تكون رسالة المستخدم بالعربية.' },
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!chat.ok) {
      const err = await chat.text()
      return new Response(JSON.stringify({ error: 'openrouter_failed', detail: err }), { status: 500 })
    }

    const completion = await chat.json()
    const text: string = completion?.choices?.[0]?.message?.content || '...'

    // 2) TTS via ElevenLabs (BYOK)
    const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': keys.eleven,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.4, similarity_boost: 0.8 }
      })
    })

    if (!tts.ok) {
      const err = await tts.text()
      // رجّع النص حتى لو فشل الصوت
      return new Response(JSON.stringify({ text, audioBase64: null, ttsError: err }), { status: 200 })
    }

    const audioArrayBuf = await tts.arrayBuffer()
    // base64
    const b64 = Buffer.from(audioArrayBuf).toString('base64')

    return new Response(JSON.stringify({ text, audioBase64: b64 }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e:any) {
    return new Response(JSON.stringify({ error: 'server_error', detail: String(e?.message || e) }), { status: 500 })
  }
}
