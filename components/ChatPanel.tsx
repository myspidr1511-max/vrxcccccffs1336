'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store'

type Win = typeof window & { __ANALYSER?: AnalyserNode | null; __VRM_FILE?: File | null }

export default function ChatPanel() {
  const { keys, setKeys, pushMsg } = useApp()
  const [input, setInput] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const ensureAnalyser = async () => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioCtx()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    ;(window as unknown as Win).__ANALYSER = analyser
    return { ctx, analyser }
  }

  const playAudioBase64 = async (b64: string) => {
    const { ctx, analyser } = await ensureAnalyser()
    const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const buf = await ctx.decodeAudioData(data.buffer)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(analyser)
    analyser.connect(ctx.destination)
    src.start(0)
  }

  const send = async () => {
    if (!keys.openrouter || !keys.eleven) { alert('أدخل المفاتيح'); return }
    const user = input.trim(); if (!user) return
    pushMsg({ role: 'user', content: user }); setInput('')

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: user,
        keys,
        voiceId: keys.voiceId || 'pNInz6obpgDQGcFmaJgB',
        model: keys.model || 'gpt-4o-mini'
      })
    })
    const { text, audioBase64 } = await res.json()
    pushMsg({ role: 'assistant', content: text })
    if (audioBase64) await playAudioBase64(audioBase64)
  }

  const onPickVRM = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    ;(window as unknown as Win).__VRM_FILE = f || null
  }

  useEffect(() => {
    // احفظ المفاتيح فور تغييرها من KeyGate
    setKeys({ ...keys })
  }, [])

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="flex flex-col h-[420px] border border-white/10 rounded-2xl p-3">
        <div className="flex-1 overflow-auto space-y-2" />
        <div className="flex gap-2">
          <input className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                 placeholder="اكتب رسالة..." value={input}
                 onChange={(e)=>setInput(e.target.value)}
                 onKeyDown={(e)=>{ if(e.key==='Enter') send() }}/>
          <button className="px-4 py-2 rounded-lg bg-white/10" onClick={send}>إرسال</button>
        </div>
      </div>

      <div className="border border-white/10 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">تحميل VRM</div>
          <button className="px-3 py-1 rounded-lg bg-white/10" onClick={()=>fileRef.current?.click()}>اختيار ملف</button>
          <input type="file" accept=".vrm" hidden ref={fileRef} onChange={onPickVRM}/
