
import { create } from 'zustand'

type Msg = { role: 'user'|'assistant'; text: string; imageDataUrl?: string }
type Keys = { openrouter?: string; eleven?: string; openai?: string }
type State = {
  keys: Keys
  setKeys: (k: Keys) => void
  messages: Msg[]
  push: (m: Msg) => void
  clear: () => void
  model: string
  setModel: (m: string) => void
  voiceId: string
  setVoiceId: (v: string) => void
}

export const useApp = create<State>((set) => ({
  keys: {},
  setKeys: (k) => {
    localStorage.setItem('keys', JSON.stringify(k))
    set({ keys: k })
  },
  messages: [],
  push: (m) => set((s) => ({ messages: [...s.messages, m] })),
  clear: () => set({ messages: [] }),
  model: 'openai/gpt-4o-mini',
  setModel: (m) => set({ model: m }),
  voiceId: 'Adam', // ElevenLabs default voice
  setVoiceId: (v) => set({ voiceId: v }),
}))
