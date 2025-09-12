
'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'

export default function KeyGate() {
  const { keys, setKeys, model, setModel, voiceId, setVoiceId } = useApp()
  const [openrouter, setOpenrouter] = useState(keys.openrouter || '')
  const [eleven, setEleven] = useState(keys.eleven || '')
  const [openai, setOpenai] = useState(keys.openai || '')
  const [show, setShow] = useState(false)

  useEffect(() => {
    const s = localStorage.getItem('keys')
    if (s) {
      try { setKeys(JSON.parse(s)) } catch {}
    }
  }, [setKeys])

  const save = () => {
    setKeys({ openrouter, eleven, openai })
    setShow(false)
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">المفاتيح BYOK</h2>
        <button className="btn" onClick={() => setShow(s => !s)}>{show ? 'إخفاء' : 'عرض'}</button>
      </div>

      {show && (
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">OpenRouter Key</label>
            <input className="input" value={openrouter} onChange={e=>setOpenrouter(e.target.value)} placeholder="sk-or-v1-..." />
          </div>
          <div>
            <label className="text-sm">ElevenLabs Key</label>
            <input className="input" value={eleven} onChange={e=>setEleven(e.target.value)} placeholder="elevenlabs_..." />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">OpenAI Key (اختياري لـ Whisper)</label>
            <input className="input" value={openai} onChange={e=>setOpenai(e.target.value)} placeholder="sk-..." />
          </div>
          <div>
            <label className="text-sm">نموذج GPT</label>
            <input className="input" value={model} onChange={e=>setModel(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Voice ID (ElevenLabs)</label>
            <input className="input" value={voiceId} onChange={e=>setVoiceId(e.target.value)} placeholder="Adam, Rachel, ... or a voice-id" />
          </div>
          <div className="md:col-span-2">
            <button className="btn w-full" onClick={save}>حفظ</button>
          </div>
        </div>
      )}

      {!show && <p className="text-sm text-gray-400">لن نخزّن المفاتيح على الخادم. تُحفظ محليًا في المتصفح وتُرسل فقط كبروكسي عند الطلب.</p>}
    </div>
  )
}
