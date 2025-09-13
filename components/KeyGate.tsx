'use client'

import { useEffect, useState } from 'react'
import { useApp } from '../lib/store'

export default function KeyGate() {
  const { keys, setKeys } = useApp()
  const [openrouter, setOpenrouter] = useState(keys.openrouter || '')
  const [eleven, setEleven] = useState(keys.eleven || '')
  const [voiceId, setVoiceId] = useState(keys.voiceId || 'pNInz6obpgDQGcFmaJgB')
  const [model, setModel] = useState(keys.model || 'gpt-4o-mini')

  useEffect(() => {
    setKeys({ openrouter, eleven, voiceId, model })
  }, [openrouter, eleven, voiceId, model, setKeys])

  return (
    <div className="grid gap-3 border border-white/10 rounded-2xl p-4">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm">
          OpenRouter Key
          <input className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded"
                 value={openrouter} onChange={e=>setOpenrouter(e.target.value)} placeholder="sk-or-..." />
        </label>
        <label className="text-sm">
          ElevenLabs Key
          <input className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded"
                 value={eleven} onChange={e=>setEleven(e.target.value)} placeholder="eleven-..." />
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm">
          Model
          <input className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded"
                 value={model} onChange={e=>setModel(e.target.value)} placeholder="gpt-4o-mini" />
        </label>
        <label className="text-sm">
          ElevenLabs Voice ID
          <input className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded"
                 value={voiceId} onChange={e=>setVoiceId(e.target.value)} placeholder="pNInz6obpgDQGcFmaJgB" />
        </label>
      </div>

      <p className="text-xs text-gray-400">
        يتم الحفظ محليًا. لا تُرسل المفاتيح للخادم إلا كبروكسي إلى مزود الخدمة.
      </p>
    </div>
  )
}
