import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, useTexture } from '@react-three/drei';
import { Mesh } from 'three';

// 🧠 Animated Brain/Neural Network Logo
function RotatingBrain() {
  const meshRef = useRef<Mesh>(null);

  // Slow continuous rotation
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3; // Slow spin
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1; // Subtle wobble
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* Main brain sphere with distortion effect */}
      <Sphere args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#00FF88"
          attach="material"
          distort={0.4} // Neural network-like distortion
          speed={2}
          roughness={0.3}
          metalness={0.8}
          emissive="#00FF88"
          emissiveIntensity={0.5}
        />
      </Sphere>

      {/* Inner glow sphere */}
      <Sphere args={[0.7, 32, 32]}>
        <meshBasicMaterial
          color="#00FF88"
          transparent
          opacity={0.2}
        />
      </Sphere>

      {/* Outer ring for chip/tech effect */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.02, 16, 100]} />
        <meshStandardMaterial
          color="#00FF88"
          emissive="#00FF88"
          emissiveIntensity={0.8}
          metalness={1}
        />
      </mesh>

      {/* Second ring at different angle */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.3, 0.02, 16, 100]} />
        <meshStandardMaterial
          color="#00ff00"
          emissive="#00ff00"
          emissiveIntensity={0.8}
          metalness={1}
        />
      </mesh>
    </mesh>
  );
}

interface NeuroBrainLogoProps {
  size?: number; // Size in pixels
  className?: string;
}

export function NeuroBrainLogo({ size = 80, className = '' }: NeuroBrainLogoProps) {
  return (
    <div 
      className={className} 
      style={{ 
        width: size, 
        height: size,
        minWidth: size,
        minHeight: size,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 50 }}
        dpr={[1, 2]} // Responsive pixel ratio
        performance={{ min: 0.5 }} // Performance optimization
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00ff00" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ff00" />
        
        {/* The 3D Brain */}
        <RotatingBrain />
      </Canvas>
    </div>
  );
}
























