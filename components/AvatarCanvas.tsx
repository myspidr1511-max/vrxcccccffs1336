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

// ===== صوت -> مستوى للفم
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

function VRMModel({ analyser, vrmFile }: Props) {
  const group = useRef<THREE.Group>(null)
  const [vrm, setVrm] = useState<VRM | null>(null)
  const url = useMemo(() => (vrmFile ? URL.createObjectURL(vrmFile) : '/avatar.vrm'), [vrmFile])

  const mouthLevel = useMouth(analyser || undefined)

  // عظام سنعدّلها
  const bones = useRef<{
    L?: THREE.Object3D
    R?: THREE.Object3D
    Lf?: THREE.Object3D
    Rf?: THREE.Object3D
  }>({})

  // كواتيرنيون البداية والهدف
  const qInit = useRef<{ [k: string]: THREE.Quaternion }>({})
  const qTarget = useRef<{ [k: string]: THREE.Quaternion }>({})
  const poseBlend = useRef(0) // 0..1

  // رمش وتنفس
  const blinkT = useRef(0)
  const nextBlink = useRef(2 + Math.random() * 2.5)
  const breathT = useRef(0)

  useEffect(() => {
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))

    loader.load(
      url,
      (gltf) => {
        const loaded = (gltf as any).userData?.vrm as VRM | undefined
        if (!loaded) return
        VRMUtils.removeUnnecessaryJoints(loaded.scene)
        loaded.scene.traverse((o: any) => (o.frustumCulled = false))

        // تموضع مبدئي
        loaded.scene.position.set(0, -0.9, 0)
        loaded.scene.scale.setScalar(1.1)

        // التقاط عظام الذراعين والساعدين
        bones.current.L = loaded.humanoid?.getNormalizedBoneNode('leftUpperArm') || undefined
        bones.current.R = loaded.humanoid?.getNormalizedBoneNode('rightUpperArm') || undefined
        bones.current.Lf = loaded.humanoid?.getNormalizedBoneNode('leftLowerArm') || undefined
        bones.current.Rf = loaded.humanoid?.getNormalizedBoneNode('rightLowerArm') || undefined

        // حفظ كواتيرنيون البداية
        for (const k of ['L', 'R', 'Lf', 'Rf'] as const) {
          const b = bones.current[k]
          if (b) qInit.current[k] = b.quaternion.clone()
        }

        // بناء أهداف Idle:
        // إنزال الذراعين ~70° حول محور Z، وثني الساعد ~10°
        const qZL = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), +1.2) // ~69°
        const qZR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -1.2)
        const qElbow = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.18)

        if (bones.current.L) qTarget.current.L = qInit.current.L.clone().multiply(qZL)
        if (bones.current.R) qTarget.current.R = qInit.current.R.clone().multiply(qZR)
        if (bones.current.Lf) qTarget.current.Lf = qInit.current.Lf.clone().multiply(qElbow)
        if (bones.current.Rf) qTarget.current.Rf = qInit.current.Rf.clone().multiply(qElbow)

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

    // مزج نحو وضع Idle خلال ~1.2s
    if (poseBlend.current < 1) {
      poseBlend.current = Math.min(1, poseBlend.current + delta * 0.8)
      for (const k of Object.keys(qTarget.current)) {
        const bone = (bones.current as any)[k]
        const tgt = (qTarget.current as any)[k]
        if (bone && tgt) bone.quaternion.slerp(tgt, poseBlend.current)
      }
    }

    // تنفس خفيف
    breathT.current += delta
    vrm.scene.position.y = -0.9 + Math.sin(breathT.current * 1.2) * 0.01

    // رمش
    blinkT.current += delta
    if (blinkT.current >= nextBlink.current) {
      const ph = (blinkT.current - nextBlink.current) / 0.12 // 120ms
      const v = ph < 0 ? 1 : ph < 0.5 ? 1 - ph * 2 : ph < 1 ? (ph - 0.5) * 2 : 1
      vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, v)
      if (ph >= 1) {
        blinkT.current = 0
        nextBlink.current = 2 + Math.random() * 2.5
        vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, 1)
      }
    }

    // تتبع الرأس للكاميرا
    const head = vrm.humanoid?.getNormalizedBoneNode('head')
    if (head) head.lookAt(state.camera.position)

    // فم حسب الصوت
    const m = Math.min(1, mouthLevel * 8)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Aa, m)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Ih, m * 0.6)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Ou, m * 0.3)

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
