import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import type { Group } from 'three';

function PlaceholderCharacter() {
  const ref = useRef<Group>(null);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.5;
  });

  return (
    <group ref={ref} position={[0, -0.3, 0]}>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#FFB6C1" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.5, 0.7, 0.3]} />
        <meshStandardMaterial color="#6366F1" />
      </mesh>
      <mesh position={[-0.45, 0.55, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.15]} />
        <meshStandardMaterial color="#FFB6C1" />
      </mesh>
      <mesh position={[0.45, 0.55, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.15]} />
        <meshStandardMaterial color="#FFB6C1" />
      </mesh>
      <mesh position={[-0.15, -0.05, 0]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0.15, -0.05, 0]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.8, 0.9, 0.1, 32]} />
        <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<Group>(null);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.3;
  });

  return <primitive ref={ref} object={scene.clone()} scale={1.2} position={[0, -0.5, 0]} />;
}

function SceneContent({ modelUrl, useGlb }: { modelUrl: string; useGlb: boolean }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <pointLight position={[-3, 2, -2]} intensity={0.4} color="#6366F1" />

      {useGlb ? (
        <Suspense fallback={<PlaceholderCharacter />}>
          <GLBModel url={modelUrl} />
        </Suspense>
      ) : (
        <PlaceholderCharacter />
      )}

      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1.5} maxPolarAngle={Math.PI / 2} />
      <Environment preset="sunset" />
    </>
  );
}

interface Character3DProps {
  level: number;
  modelPath?: string;
}

export default function Character3D({ level, modelPath = '/models/character.glb' }: Character3DProps) {
  const [hasGlb, setHasGlb] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(modelPath, { method: 'HEAD' })
      .then(res => {
        if (!cancelled) setHasGlb(res.ok);
      })
      .catch(() => {
        if (!cancelled) setHasGlb(false);
      });
    return () => { cancelled = true; };
  }, [modelPath]);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        height: 320,
        background: 'linear-gradient(180deg, #151A26 0%, #0B0E14 100%)',
        border: '1px solid var(--vault-border)',
      }}
    >
      <Canvas camera={{ position: [0, 1.2, 3.5], fov: 45 }}>
        <SceneContent modelUrl={modelPath} useGlb={hasGlb} />
      </Canvas>

      <div
        className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold"
        style={{
          backgroundColor: 'rgba(99, 102, 241, 0.9)',
          color: '#fff',
          boxShadow: '0 0 20px rgba(99,102,241,0.4)',
        }}
      >
        Lv.{level}
      </div>

      {!hasGlb && (
        <div
          className="absolute bottom-3 left-3 right-3 text-[10px] px-2 py-1.5 rounded-lg"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'var(--vault-text-secondary)',
          }}
        >
          将 Meshy 生成的 GLB 放入 public/models/character.glb 即可替换默认角色
        </div>
      )}
    </div>
  );
}
