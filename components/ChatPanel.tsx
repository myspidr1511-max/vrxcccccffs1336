"use client"

import { useState, useRef, useEffect } from "react"
import { useApp } from "@/lib/store"

export default function ChatPanel() {
  const { keys, setKeys } = useApp()
  const [input, setInput] = useState("")
  const fileRef = useRef<HTMLInputElement | null>(null)

  const send = () => {
    if (!input.trim()) return
    console.log("إرسال:", input)
    setInput("")
  }

  const onPickVRM = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    console.log("تم اختيار VRM:", e.target.files[0])
  }

  useEffect(() => {
    setKeys({ ...keys })
  }, [keys, setKeys]) // ✅ مسكر صح

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="flex flex-col h-[420px] border border-white/10 rounded-2xl p-3">
        <div className="flex-1 overflow-auto space-y-2" />
        <div className="flex gap-2">
          <input
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2"
            placeholder="اكتب رسالة..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send()
            }}
          />
          <button
            className="px-4 py-2 rounded-lg bg-white/10"
            onClick={send}
          >
            إرسال
          </button>
        </div>
      </div>

      <div className="border border-white/10 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">تحميل VRM</div>
          <button
            className="px-3 py-1 rounded-lg bg-white/10"
            onClick={() => fileRef.current?.click()}
          >
            اختيار ملف
          </button>
          <input
            type="file"
            accept=".vrm"
            hidden
            ref={fileRef}
            onChange={onPickVRM}
          />
        </div>
        <p className="text-xs text-gray-400">
          أو ضع ملفًا باسم <code>public/avatar.vrm</code>.
        </p>
      </div>
    </div>
  )
}
