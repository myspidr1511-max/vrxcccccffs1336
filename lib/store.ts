'use client'
import { create } from 'zustand'

type Msg = { role: 'user'|'assistant'; content: string }
type Keys = { openrouter?: string; eleven?: string; voiceId?: string; model?: string }

type State = {
  keys: Keys
  setKeys: (k: Keys) => void

  analyser: AnalyserNode | null
  setAnalyser: (a: AnalyserNode | null) => void

  vrmFile: File | null
  setVrmFile: (f: File | null) => void

  messages: Msg[]
  pushMsg: (m: Msg) => void
}

export const useApp = create<State>((set) => ({
  keys: {
    openrouter: typeof window !== 'undefined' ? localStorage.getItem('OPENROUTER_KEY') || '' : '',
    eleven: typeof window !== 'undefined' ? localStorage.getItem('ELEVEN_KEY') || '' : '',
  },
  setKeys: (k) => set((s) => {
    if (typeof window !== 'undefined') {
      if (k.openrouter !== undefined) localStorage.setItem('OPENROUTER_KEY', k.openrouter || '')
      if (k.eleven !== undefined) localStorage.setItem('ELEVEN_KEY', k.eleven || '')
    }
    return { keys: { ...s.keys, ...k } }
  }),

  analyser: null,
  setAnalyser: (a) => set({ analyser: a }),

  vrmFile: null,
  setVrmFile: (f) => set({ vrmFile: f }),

  messages: [],
  pushMsg: (m) => set((s) => ({ messages: [...s.messages, m] })),
}))
