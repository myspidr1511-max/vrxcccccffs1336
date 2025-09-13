'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { VRM, VRMUtils, VRMExpressionPresetName, VRMLoaderPlugin } from '@pixiv/three-vrm'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

type Win = typeof window & {
  __ANALYSER?: AnalyserNode | null
  __VRM_FILE?: File | null
}

function useSpeechLevel() {
  const [lvl, setLvl] = useState(0)
  const data = useMemo(() => new Uint8Array(1024), [])
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const analyser = (window as unknown as Win).__ANALYSER || null
      if (analyser) {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)
        setLvl(0.85 * lvl + 0.15 * rms)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [data, lvl])
  return lvl
}

function applyDelta(b: THREE.Object3D | undefined, rest: THREE.Quaternion | undefined, dx=0,dy=0,dz=0) {
  if (!b || !rest) return
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(dx,dy,dz))
  b.quaternion.copy(rest).multiply(q)
}

function VRMModel() {
  const [vrm, setVrm] = useState<VRM | null>(null)
  const [src, setSrc] = useState<string>('/avatar.vrm')
  const lvl = useSpeechLevel()
  const bones = useRef<Record<string, THREE.Object3D>>({})
  const rest = useRef<Record<string, THREE.Quaternion>>({})
  const t = useRef(0)
  const blinkT = useRef(0)
  const nextBlink = useRef(2 + Math.random() * 2.5)

  useEffect(() => {
    const f = (window as unknown as Win).__VRM_FILE
    setSrc(f ? URL.createObjectURL(f) : '/avatar.vrm')
  }, [])

  useEffect(() => {
    const loader = new GLTFLoader()
    loader.register((p) => new VRMLoaderPlugin(p))
    loader.load(src, (gltf) => {
      const m = (gltf as any).userData?.vrm as VRM
      if (!m) return
      VRMUtils.removeUnnecessaryJoints(m.scene)
      m.scene.traverse((o:any)=>o.frustumCulled=false)
      m.scene.position.set(0,-0.9,0)
      m.scene.scale.setScalar(1.1)
      ;['head','neck','spine','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm'].forEach(n=>{
        const b=m.humanoid?.getNormalizedBoneNode(n as any)
        if(b){bones.current[n]=b;rest.current[n]=b.quaternion.clone()}
      })
      setVrm(m)
    })
    return () => {}
  }, [src])

  useFrame((_,dt)=>{
    if(!vrm) return
    t.current += dt

    // تنفّس
    vrm.scene.position.y = -0.9 + Math.sin(t.current*1.2)*0.01

    // رمش
    blinkT.current += dt
    if (blinkT.current >= nextBlink.current) {
      const ph=(blinkT.current-nextBlink.current)/0.12
      const v = ph<0?1: ph<0.5? 1-ph*2 : ph<1? (ph-0.5)*2 : 1
      vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, v)
      if (ph>=1){ blinkT.current=0; nextBlink.current=2+Math.random()*2.5; vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink,1) }
    }

    // رأس وذراعان “إنساني”
    const talk = Math.min(1, lvl*10)
    const sway = Math.sin(t.current*1.1)*0.05
    applyDelta(bones.current['neck'], rest.current['neck'], 0.10*talk, 0.6*sway, 0)
    applyDelta(bones.current['head'], rest.current['head'], 0.15*talk, 0.3*sway, 0)
    applyDelta(bones.current['leftUpperArm'],  rest.current['leftUpperArm'],  -0.2*talk,  0.3*sway, 0)
    applyDelta(bones.current['rightUpperArm'], rest.current['rightUpperArm'], -0.2*talk, -0.3*sway, 0)
    applyDelta(bones.current['leftLowerArm'],  rest.current['leftLowerArm'],  -0.4*talk, 0, 0)
    applyDelta(bones.current['rightLowerArm'], rest.current['rightLowerArm'], -0.4*talk, 0, 0)

    // فم
    const m=Math.min(1,lvl*8)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Aa, m)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Ih, m*0.5)

    vrm.update(dt)
  })

  return vrm ? <primitive object={vrm.scene} /> : null
}

export default function AvatarCanvas(){
  return (
    <div className="w-full h-[420px] rounded-2xl overflow-hidden border border-white/10">
      <Canvas camera={{position:[0,1.3,1.8], fov:35}}>
        <ambientLight intensity={0.6}/>
        <directionalLight position={[2,2,2]} intensity={1.2}/>
        <Suspense fallback={null}>
          <VRMModel/>
          <Environment preset="city"/>
        </Suspense>
        <OrbitControls enablePan={false}/>
      </Canvas>
    </div>
  )
}
