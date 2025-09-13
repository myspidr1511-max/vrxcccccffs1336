"use client"

import { useState } from "react"
import { useApp } from "@/lib/store"

export default function KeyGate() {
  const { keys, setKeys, model, setModel, voiceId, setVoiceId } = useApp()
  const [openrouter, setOpenrouter] = useState(keys.openrouter || "")
  const [eleven, setEleven] = useState(keys.eleven || "")
  const [openai, setOpenai] = useState(keys.openai || "")

  const saveKeys = () => {
    setKeys({ openrouter, eleven, openai })
  }

  return (
    <div className="p-4 border border-white/10 rounded-2xl space-y-4">
      <div>
        <label className="block text-sm mb-1">OpenRouter Key</label>
        <input
          type="password"
          className="w-full p-2 bg-black/40 border border-white/10 rounded"
          value={openrouter}
          onChange={(e) => setOpenrouter(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">ElevenLabs Key</label>
        <input
          type="password"
          className="w-full p-2 bg-black/40 border border-white/10 rounded"
          value={eleven}
          onChange={(e) => setEleven(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">OpenAI Key</label>
        <input
          type="password"
          className="w-full p-2 bg-black/40 border border-white/10 rounded"
          value={openai}
          onChange={(e) => setOpenai(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Model</label>
        <input
          type="text"
          className="w-full p-2 bg-black/40 border border-white/10 rounded"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Voice ID</label>
        <input
          type="text"
          className="w-full p-2 bg-black/40 border border-white/10 rounded"
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
        />
      </div>

      <button
        className="w-full py-2 bg-white/10 rounded-lg"
        onClick={saveKeys}
      >
        حفظ
      </button>
    </div>
  )
}
