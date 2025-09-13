'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  VRM,
  VRMUtils,
  VRMExpressionPresetName,
  VRMLoaderPlugin,
} from '@pixiv/three-vrm'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

type Props = { analyser?: AnalyserNode | null; vrmFile?: File | null }

// ====== صوت -> مستوى للفم ======
function useMouth(analyser?: AnalyserNode | null) {
  const dataArray = useMemo(() => new Uint8Array(1024), [])
  const [level, setLevel] = useState(0)
  useEffect(() => {
    let raf: number
    const tick = () => {
      if (analyser) {
        analyser.getByteTimeDomainData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / dataArray.length)
        setLevel(rms)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [analyser, dataArray])
  return level
}

// ====== نموذج VRM مع تفاعلات ======
function VRMModel({ analyser, vrmFile }: Props) {
  const group = useRef<THREE.Group>(null)
  const [vrm, setVrm] = useState<VRM | null>(null)
  const url = useMemo(
    () => (vrmFile ? URL.createObjectURL(vrmFile) : '/avatar.vrm'),
    [vrmFile]
  )

  // متغيرات أنيميشن بسيطة
  const mouthLevel = useMouth(analyser || undefined)
  const tRef = useRef(0)
  const blinkTimer = useRef(0)
  const nextBlinkAt = useRef(2 + Math.random() * 2)
  const breathing = useRef(0)

  useEffect(() => {
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))

    loader.load(
      url,
      (gltf) => {
        const loaded = (gltf as any).userData?.vrm as VRM | undefined
        if (!loaded) return
        VRMUtils.removeUnnecessaryJoints(loaded.scene)

        // تحسين وضعية البداية والحجم
        loaded.scene.position.set(0, -0.9, 0)
        loaded.scene.scale.setScalar(1.1)
        loaded.scene.traverse((obj: any) => {
          obj.frustumCulled = false
        })

        // خفض الذراعين من T-Pose
        const L = loaded.humanoid?.getNormalizedBoneNode('leftUpperArm')
        const R = loaded.humanoid?.getNormalizedBoneNode('rightUpperArm')
        if (L) L.rotation.z = 0.35
        if (R) R.rotation.z = -0.35

        setVrm(loaded)
      },
      undefined,
      (err) => console.error(err)
    )

    return () => {
      if (vrm) vrm.scene.removeFromParent()
    }
  }, [url])

  useFrame((state, delta) => {
    if (!vrm) return

    tRef.current += delta
    breathing.current += delta

    // تنفّس خفيف: حركة جسد طفيفة لأعلى/أسفل
    const breatheY = Math.sin(breathing.current * 1.2) * 0.01
    vrm.scene.position.y = -0.9 + breatheY

    // رمش: غلق قصير كل عدة ثوانٍ عشوائية
    blinkTimer.current += delta
    if (blinkTimer.current >= nextBlinkAt.current) {
      // blink window ~120ms
      const phase = (blinkTimer.current - nextBlinkAt.current) / 0.12
      const v =
        phase < 0
          ? 0
          : phase < 0.5
          ? 1 - phase * 2
          : phase < 1
          ? (phase - 0.5) * 2
          : 1
      vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, v)
      if (phase >= 1) {
        blinkTimer.current = 0
        nextBlinkAt.current = 2 + Math.random() * 2.5
        vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, 1)
      }
    }

    // تتبّع الرأس للكاميرا
    const head = vrm.humanoid?.getNormalizedBoneNode('head')
    if (head) {
      const camPos = state.camera.position.clone()
      head.lookAt(camPos)
    }

    // سويَة وقفة خفيفة للجسم
    vrm.scene.rotation.y = Math.sin(tRef.current * 0.5) * 0.1

    // فم حسب الصوت
    const v = Math.min(1.0, mouthLevel * 8.0)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Aa, v)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Ih, v * 0.6)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Ou, v * 0.3)

    vrm.update(delta)
  })

  return <group ref={group}>{vrm && <primitive object={vrm.scene} />}</group>
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
