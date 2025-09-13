'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store'

export default function ChatPanel() {
  const { keys, setAnalyser, setVrmFile, pushMsg } = useApp()
  const [input, setInput] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // إنشاء AudioContext + Analyser لمزامنة الفم والحركات
  const ensureAnalyser = async () => {
    if (typeof window === 'undefined') return null
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioCtx()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    setAnalyser(analyser)
    return { ctx, analyser }
  }

  const playAudioBase64 = async (b64: string) => {
    const { ctx, analyser } = (await ensureAnalyser())!
    const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const buf = await ctx.decodeAudioData(data.buffer)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(analyser)
    analyser.connect(ctx.destination)
    src.start(0)
  }

  const send = async () => {
    if (!keys.openrouter || !keys.eleven) {
      alert('أدخل مفاتيح OpenRouter و ElevenLabs أولاً.')
      return
    }
    const user = input.trim()
    if (!user) return
    pushMsg({ role: 'user', content: user })
    setInput('')

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: user,
        keys: { openrouter: keys.openrouter, eleven: keys.eleven },
        voiceId: keys.voiceId || 'pNInz6obpgDQGcFmaJgB', // افتراضي
        model: keys.model || 'gpt-4o-mini'
      })
    })
    if (!res.ok) {
      pushMsg({ role: 'assistant', content: 'فشل الطلب' })
      return
    }
    const { text, audioBase64 } = await res.json()
    pushMsg({ role: 'assistant', content: text })
    if (audioBase64) await playAudioBase64(audioBase64)
  }

  const onPickVRM = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setVrmFile(f)
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* يسار: الدردشة */}
      <div className="flex flex-col h-[420px] border border-white/10 rounded-2xl p-3">
        <div id="chat" className="flex-1 overflow-auto space-y-2">
          {/* UI بسيط. الرسائل تعرض في مكان آخر لو أردت. */}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2"
            placeholder="اكتب رسالة..."
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==='Enter') send() }}
          />
          <button className="px-4 py-2 rounded-lg bg-white/10" onClick={send}>إرسال</button>
        </div>
      </div>

      {/* يمين: تحميل VRM + الكانفس موجود في صفحة الرئيسية */}
      <div className="border border-white/10 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">تحميل VRM</div>
          <button className="px-3 py-1 rounded-lg bg-white/10" onClick={()=>fileRef.current?.click()}>اختيار ملف</button>
          <input type="file" accept=".vrm" hidden ref={fileRef} onChange={onPickVRM}/>
        </div>
        <p className="text-xs text-gray-400">ضع ملف الشخصية باسم <code>public/avatar.vrm</code> أو حمّله من هنا.</p>
      </div>
    </div>
  )
}
