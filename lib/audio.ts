
export async function playAudioFromArrayBuffer(buf: ArrayBuffer, onNode?: (analyser: AnalyserNode)=>void) {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const source = ctx.createBufferSource()
  const audioBuffer = await ctx.decodeAudioData(buf.slice(0))
  source.buffer = audioBuffer
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  const gain = ctx.createGain()
  gain.gain.value = 1.0
  source.connect(analyser)
  analyser.connect(gain)
  gain.connect(ctx.destination)
  onNode?.(analyser)
  source.start(0)
  return new Promise<void>((resolve) => {
    source.onended = () => resolve()
  })
}
