
'use client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { VRM, VRMUtils, VRMExpressionPresetName } from 'three-vrm'
import { GLTFLoader } from 'three-stdlib'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  analyser?: AnalyserNode | null
  vrmFile?: File | null
}

function useMouth(analyser?: AnalyserNode | null) {
  const dataArray = useMemo(()=>new Uint8Array(1024),[])
  const [level, setLevel] = useState(0)
  useEffect(() => {
    let raf: number
    const tick = () => {
      if (analyser) {
        analyser.getByteTimeDomainData(dataArray)
        // Compute RMS as mouth openness proxy
        let sum = 0
        for (let i=0;i<dataArray.length;i++) {
          const v = (dataArray[i]-128)/128
          sum += v*v
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
  const url = useMemo(() => vrmFile ? URL.createObjectURL(vrmFile) : '/avatar.vrm', [vrmFile])

  const level = useMouth(analyser || undefined)

  useEffect(() => {
    const loader = new GLTFLoader()
    loader.load(url, (gltf) => {
      const _vrm = VRM.from(gltf.scene)
      VRMUtils.removeUnnecessaryJoints(_vrm.scene)
      _vrm.scene.traverse((obj:any)=>{
        obj.frustumCulled = false
      })
      setVrm(_vrm)
    })
    return () => {
      if (vrm) {
        vrm.scene.removeFromParent()
      }
    }
  }, [url])

  useFrame((_, delta) => {
    if (!vrm) return
    // Simple idle motion
    vrm.scene.rotation.y += delta * 0.2
    // Mouth open based on audio level
    const v = Math.min(1.0, level * 8.0)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Aa, v)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Ih, v*0.6)
    vrm.expressionManager?.setValue(VRMExpressionPresetName.Ou, v*0.3)
    vrm.update(delta)
  })

  return (
    <group ref={group}>
      {vrm && <primitive object={vrm.scene} />}
    </group>
  )
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
