'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera } from '@react-three/drei';
import { motion } from 'framer-motion';

// ID аватара по умолчанию (пример из Ready Player Me)
const DEFAULT_AVATAR_ID = '67ebd62a688cd661ebe09988';

interface AvatarModelProps {
  modelUrl: string;
}

function AvatarModel({ modelUrl }: AvatarModelProps) {
  const { scene } = useGLTF(modelUrl);
  const meshRef = useRef<any>();

  // Анимация idle (лёгкое покачивание)
  useFrame((state) => {
    if (meshRef.current) {
      // Лёгкое покачивание головы
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1) * 0.02;
    }
  });

  return (
    <primitive 
      ref={meshRef}
      object={scene} 
      scale={2.5}
      position={[0, -1.5, 0]}
    />
  );
}

interface RobotHeadProps {
  avatarId?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function RobotHead({
  avatarId = DEFAULT_AVATAR_ID,
  style,
  className,
}: RobotHeadProps) {
  // Создаем URL модели на основе avatarId
  const avatarUrl = `https://models.readyplayer.me/${avatarId}.glb`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className={className}
      style={{
        width: '100%',
        height: '400px',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(45,80,22,0.3))',
        border: '2px solid rgba(0,255,136,0.3)',
        boxShadow: '0 0 40px rgba(0,255,136,0.2)',
        ...style,
      }}
    >
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 2]} fov={50} />
        
        {/* Освещение */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 3, 2]} intensity={0.6} />
        <pointLight position={[0, 2, 3]} intensity={0.8} color="#00FF88" />
        <spotLight 
          position={[0, 3, 0]} 
          intensity={1} 
          angle={0.6} 
          penumbra={1}
          color="#00FF88"
        />

        <Suspense fallback={null}>
          <AvatarModel modelUrl={avatarUrl} />
        </Suspense>

        {/* Orbit Controls для вращения */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={1.5}
          maxDistance={4}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>

      {/* Loader */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#00FF88',
          fontSize: '14px',
          fontWeight: 'bold',
          pointerEvents: 'none',
        }}
      >
        ⏳ Загружаю робота...
      </div>
    </motion.div>
  );
}

export default RobotHead;
