'use client'
import { create } from 'zustand'

type Msg = { role: 'user' | 'assistant'; content: string }

type Keys = {
  openrouter?: string
  eleven?: string
  voiceId?: string
  model?: string
  openai?: string
}

type State = {
  keys: Keys
  setKeys: (k: Partial<Keys>) => void

  // الصوت
  analyser: AnalyserNode | null
  setAnalyser: (a: AnalyserNode | null) => void

  // VRM
  vrmFile: File | null
  setVrmFile: (f: File | null) => void

  // رسائل الشات
  messages: Msg[]
  pushMsg: (m: Msg) => void

  // إعدادات إضافية (لتجنب خطأ KeyGate.tsx)
  model: string
  setModel: (m: string) => void
  voiceId: string
  setVoiceId: (v: string) => void
}

export const useApp = create<State>((set) => ({
  keys: {
    openrouter: typeof window !== 'undefined' ? localStorage.getItem('OPENROUTER_KEY') || '' : '',
    eleven: typeof window !== 'undefined' ? localStorage.getItem('ELEVEN_KEY') || '' : '',
    voiceId: typeof window !== 'undefined' ? localStorage.getItem('ELEVEN_VOICE') || '' : '',
    model: typeof window !== 'undefined' ? localStorage.getItem('MODEL') || 'gpt-4o-mini' : 'gpt-4o-mini',
  },
  setKeys: (k) =>
    set((s) => {
      if (typeof window !== 'undefined') {
        if (k.openrouter !== undefined) localStorage.setItem('OPENROUTER_KEY', k.openrouter || '')
        if (k.eleven !== undefined) localStorage.setItem('ELEVEN_KEY', k.eleven || '')
        if (k.voiceId !== undefined) localStorage.setItem('ELEVEN_VOICE', k.voiceId || '')
        if (k.model !== undefined) localStorage.setItem('MODEL', k.model || '')
      }
      return { keys: { ...s.keys, ...k } }
    }),

  analyser: null,
  setAnalyser: (a) => set({ analyser: a }),

  vrmFile: null,
  setVrmFile: (f) => set({ vrmFile: f }),

  messages: [],
  pushMsg: (m) => set((s) => ({ messages: [...s.messages, m] })),

  model: 'gpt-4o-mini',
  setModel: (m) => set({ model: m }),

  voiceId: 'pNInz6obpgDQGcFmaJgB',
  setVoiceId: (v) => set({ voiceId: v }),
}))
