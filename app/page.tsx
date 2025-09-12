'use client'
import Image from 'next/image'
import KeyGate from '../components/KeyGate'
import ChatPanel from '../components/ChatPanel'
import { useApp } from '../lib/store'
import { useEffect, useState } from 'react'

export default function Page() {
  const { keys } = useApp()
  const [ready, setReady] = useState(false)

  useEffect(() => { setTimeout(()=>setReady(true), 50) }, [])
  const hasKeys = !!keys.openrouter && !!keys.eleven

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-6">
      <header className="flex items-center gap-3">
        <Image src="/logo.svg" alt="logo" width={40} height={40} />
        <div>
          <h1 className="text-2xl font-bold">AI VRM Voice Chat</h1>
          <p className="text-sm text-gray-400">BYOK: OpenRouter + ElevenLabs + اختيارياً OpenAI Whisper</p>
        </div>
      </header>

      <KeyGate />

      {ready && hasKeys ? (
        <ChatPanel />
      ) : (
        <div className="card">
          <p>أدخل مفاتيحك ثم ابدأ. ستحتاج إلى OpenRouter للردود وElevenLabs للصوت. يمكنك إضافة OpenAI لاستخدام Whisper.</p>
        </div>
      )}

      <footer className="text-xs text-gray-500 text-center py-6">
        جاهز للنشر على Vercel. لا يتم تخزين المفاتيح على الخادم.
      </footer>
    </main>
  )
}
