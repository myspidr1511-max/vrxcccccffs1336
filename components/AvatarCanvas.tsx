'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { VRM, VRMUtils, VRMExpressionPresetName, VRMLoaderPlugin } from '@pixiv/three-vrm'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

type Props = { analyser?: AnalyserNode | null; vrmFile?: File | null }

// --- استخراج طاقة الصوت + تنعيم ---
function useSpeechLevel(analyser?: AnalyserNode | null) {
  const arr = useMemo(() => new Uint8Array(1024), [])
  const [lvl, setLvl] = useState(0)
  useEffect(() => {
    let raf = 0
    let ema = 0
    const tick = () => {
      if (analyser) {
        analyser.getByteTimeDomainData(arr)
        let sum = 0
        for (let i = 0; i < arr.length; i++) {
          const v = (arr[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / arr.length)
        // EMA لتنعيم الحركة
        ema = 0.85 * ema + 0.15 * rms
        setLvl(ema)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [analyser, arr])
  return lvl
}

// --- أداة: bone = rest * delta(Euler) ---
function applyDelta(bone: THREE.Object3D | undefined, rest: THREE.Quaternion | undefined, dx=0, dy=0, dz=0) {
  if (!bone || !rest) return
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(dx, dy, dz, 'XYZ'))
  bone.quaternion.copy(rest).multiply(q)
}

function VRMModel({ analyser, vrmFile }: Props) {
  const [vrm, setVrm] = useState<VRM | null>(null)
  const url = useMemo(() => (vrmFile ? URL.createObjectURL(vrmFile) : '/avatar.vrm'), [vrmFile])
  const level = useSpeechLevel(analyser || undefined)

  // عظام + وضعية راحة
  const bones = useRef<{
    head?: THREE.Object3D
    neck?: THREE.Object3D
    spine?: THREE.Object3D
    lUp?: THREE.Object3D
    rUp?: THREE.Object3D
    lLo?: THREE.Object3D
    rLo?: THREE.Object3D
  }>({})

  const rest = useRef<Record<string, THREE.Quaternion>>({})

  // رمش وتنفس
  const t = useRef(0)
  const blinkT = useRef(0)
  const nextBlink = useRef(2 + Math.random() * 2.5)

  useEffect(() => {
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))
    loader.load(
      url,
      (gltf) => {
        const model = (gltf as any).userData?.vrm as VRM | undefined
        if (!model) return
        VRMUtils.removeUnnecessaryJoints(model.scene)
        model.scene.traverse((o: any) => (o.frustumCulled = false))
        model.scene.position.set(0, -0.9, 0)
        model.scene.scale.setScalar(1.1)

        bones.current.head  = model.humanoid?.getNormalizedBoneNode('head') || undefined
        bones.current.neck  = model.humanoid?.getNormalizedBoneNode('neck') || undefined
        bones.current.spine = model.humanoid?.getNormalizedBoneNode('spine') || undefined
        bones.current.lUp   = model.humanoid?.getNormalizedBoneNode('leftUpperArm') || undefined
        bones.current.rUp   = model.humanoid?.getNormalizedBoneNode('rightUpperArm') || undefined
        bones.current.lLo   = model.humanoid?.getNormalizedBoneNode('leftLowerArm') || undefined
        bones.current.rLo   = model.humanoid?.getNormalizedBoneNode('rightLowerArm') || undefined

        // حفظ Quat الراحة
        for (const [k, b] of Object.entries(bones.current)) {
          if (b) rest.current[k] = (b.quaternion as THREE.Quaternion).clone()
        }

        setVrm(model)
      },
      undefined,
      (e) => console.error(e)
    )
  }, [url])

  useFrame((state, delta) => {
    if (!vrm) return
    t.current += delta

    // تنفّس خفيف
    vrm.scene.position.y = -0.9 + Math.sin(t.current * 1.2) * 0.01

    // رمش
    blinkT.current += delta
    if (blinkT.current >= nextBlink.current) {
      const ph = (blinkT.current - nextBlink.current) / 0.12
      const v = ph < 0 ? 1 : ph < 0.5 ? 1 - ph * 2 : ph < 1 ? (ph - 0.5) * 2 : 1
      vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, v)
      if (ph >= 1) {
        blinkT.current = 0
        nextBlink.current = 2 + Math.random() * 2.5
        vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, 1)
      }
    }

    // حركات بشرية بسيطة:
    const talk = Math.min(1, level * 10) // 0..1
    const idleSway = Math.sin(t.current * 1.1) // -1..1
    const idleSway2 = Math.sin(t.current * 0.7 + 1.2)

    // الرأس/العنق: التفاتة خفيفة + إيماءة عند الكلام
    const headYaw   = idleSway * 0.08          // يمين/يسار
    const headPitch = (0.06 * idleSway2) + (0.10 * talk) // nod عند الكلام
    applyDelta(bones.current.neck, rest.current['neck'], headPitch * 0.6, headYaw * 0.6, 0)
    applyDelta(bones.current.head, rest.current['head'], headPitch * 0.4, headYaw * 0.4, 0)

    // الأذرع: تأرجح خفيف + ثني بسيط عند الكلام
    const armSwing = 0.15 * idleSway // للأعلى/الأسفل حول X
    const elbowBend = 0.12 * (0.3 + talk) // ثني الساعد مع الكلام
    applyDelta(bones.current.lUp, rest.current['lUp'], armSwing, 0, 0.03 * idleSway2)
    applyDelta(bones.current.rUp, rest.current['rUp'], -armSwing, 0, -0.03 * idleSway2)
    applyDelta(bones.current.lLo, rest.current['lLo'], -elbowBend, 0, 0)
    applyDelta(bones.current.rLo, rest.current['rLo'], -elbowBend, 0, 0)

    // فم حسب الصوت
    const m = Math.min(1, level * 8)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Aa, m)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Ih, m * 0.6)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Ou, m * 0.3)

    vrm.update(delta)
  })

  return vrm ? <primitive object={vrm.scene} /> : null
}

export default function AvatarCanvas({ analyser, vrmFile }: Props) {
  return (
    <div className="w-full h-[420px] rounded-2xl overflow-hidden border border-white/10">
      <Canvas camera={{ position: [0, 1.3, 1.8], fov: 35 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={1.2} />
        <Suspense fallback={null}>
          <VRMModel analyser={analyser} vrmFile={vrmFile} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  )
}
