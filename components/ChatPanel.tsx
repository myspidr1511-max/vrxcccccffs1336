
'use client'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { chat } from '@/lib/openrouter'
import { tts } from '@/lib/elevenlabs'
import { playAudioFromArrayBuffer } from '@/lib/audio'
import AvatarCanvas from './AvatarCanvas'

type CamCtx = { imageDataUrl?: string }

export default function ChatPanel() {
  const { keys, push, messages, model, voiceId } = useApp()
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [camCtx, setCamCtx] = useState<CamCtx>({})
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [vrmFile, setVrmFile] = useState<File | null>(null)

  // Camera
  const toggleCamera = async () => {
    if (!cameraOn) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
    } else {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(t => t.stop())
      }
      setCameraOn(false)
      setCamCtx({})
    }
  }

  const captureFrame = () => {
    if (!videoRef.current) return null
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.8)
  }

  // Web Speech API fallback STT
  const sttBrowser = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      if (!SR) return reject(new Error('SpeechRecognition غير مدعوم في المتصفح'))
      const r = new SR()
      r.lang = 'ar-JO,en-US'
      r.interimResults = false
      r.maxAlternatives = 1
      r.onresult = (e: any) => resolve(e.results[0][0].transcript)
      r.onerror = (e: any) => reject(e.error)
      r.start()
    })
  }

  // MediaRecorder for Whisper option
  useEffect(() => {
    if (!recording) return
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const mr = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      mr.ondataavailable = (e) => chunks.push(e.data)
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        try {
          let text: string | null = null
          if (keys.openai) {
            const form = new FormData()
            form.append('file', blob, 'audio.webm')
            const res = await fetch('/api/stt', { method: 'POST', headers: { 'x-openai-key': keys.openai! }, body: form })
            if (res.ok) {
              const j = await res.json()
              text = j.text
            }
          }
          if (!text) {
            // fallback to browser
            text = await sttBrowser()
          }
          if (!text) throw new Error('لم يتم التعرف على الكلام')
          push({ role: 'user', text })
          await respond(text)
        } catch (e:any) {
          alert(e?.message || 'STT failed')
        } finally {
          stream.getTracks().forEach(t=>t.stop())
        }
      }
      setMediaRecorder(mr)
      mr.start()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])

  const respond = async (userText: string) => {
    const imageDataUrl = cameraOn ? captureFrame()! : undefined
    setCamCtx({ imageDataUrl })

    const messagesPayload: any[] = [
      { role: 'system', content: 'أجب بإيجاز وبأسلوب طبيعي. إذا تم تزويدك بصورة فهي من كاميرا المستخدم لوصف تعبيره أو ما يفعله.'},
      imageDataUrl ? {
        role: 'user',
        content: [
          { type: 'input_text', text: userText },
          { type: 'input_image', image_url: imageDataUrl }
        ]
      } : { role: 'user', content: userText }
    ]

    const j = await chat({ model, messages: messagesPayload }, keys.openrouter!)
    const text = j.choices?.[0]?.message?.content || '...'
    push({ role: 'assistant', text, imageDataUrl })

    // TTS
    try {
      const buf = await tts(text, voiceId, keys.eleven!)
      await playAudioFromArrayBuffer(buf, setAnalyser)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">الأفاتار</h2>
            <label className="btn cursor-pointer">
              تحميل VRM
              <input type="file" accept=".vrm" className="hidden" onChange={(e)=>setVrmFile(e.target.files?.[0]||null)} />
            </label>
          </div>
          <AvatarCanvas analyser={analyser} vrmFile={vrmFile} />
          <p className="text-xs text-gray-400 mt-2">ضع ملف الشخصية باسم <code>public/avatar.vrm</code> أو حمّله من هنا.</p>
        </div>

        <div className="card space-y-2">
          <div className="flex items-center gap-2">
            <button className="btn" onClick={toggleCamera}>{cameraOn ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}</button>
            <button className="btn" onClick={()=>setRecording(r=>!r)}>{recording ? 'إيقاف التسجيل' : 'تحدث الآن'}</button>
          </div>
          <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-xl border border-white/10" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="card h-[520px] overflow-auto space-y-3">
          {messages.map((m,i)=> (
            <div key={i} className="p-3 rounded-xl bg-white/5">
              <div className="text-xs text-gray-400">{m.role === 'user' ? 'أنت' : 'الذكاء الاصطناعي'}</div>
              <div className="whitespace-pre-wrap">{m.text}</div>
              {m.imageDataUrl && <img src={m.imageDataUrl} alt="camera" className="mt-2 rounded-lg border border-white/10" />}
            </div>
          ))}
        </div>

        <form className="card" onSubmit={async (e) => {
          e.preventDefault()
          const form = e.target as HTMLFormElement
          const input = form.elements.namedItem('text') as HTMLInputElement
          const text = input.value.trim()
          if (!text) return
          input.value=''
          const imageDataUrl = cameraOn ? captureFrame()! : undefined
          push({ role: 'user', text, imageDataUrl })
          await respond(text)
        }}>
          <div className="flex gap-2">
            <input className="input flex-1" name="text" placeholder="اكتب رسالة..." />
            <button className="btn">إرسال</button>
          </div>
        </form>
      </div>
    </div>
  )
}
