import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import { Mesh, Group } from 'three';
import * as THREE from 'three';

// 🧠 The Living Neural Network - Pulsing Sphere with Wireframe
function NeuralSphere() {
  const groupRef = useRef<Group>(null);
  const pulsingCoreRef = useRef<Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);

  // Animation loop for rotation and pulsing
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Slow continuous rotation
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.15; // Slow horizontal rotation
      groupRef.current.rotation.x = Math.sin(time * 0.3) * 0.1; // Subtle wobble
    }

    // Pulsing core animation (expand/contract)
    if (pulsingCoreRef.current) {
      const pulse = Math.sin(time * 1.2) * 0.15 + 1; // Pulse between 0.85 and 1.15
      pulsingCoreRef.current.scale.set(pulse, pulse, pulse);
    }

    // Sync wireframe opacity with pulse for extra effect
    if (wireframeRef.current) {
      const wireframeOpacity = Math.sin(time * 1.2) * 0.2 + 0.6; // Oscillate opacity
      (wireframeRef.current.material as THREE.LineBasicMaterial).opacity = wireframeOpacity;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. WIREFRAME SPHERE (Outer shell) */}
      <Sphere args={[1, 32, 32]}>
        <meshBasicMaterial
          color="#00FF88"
          wireframe
          transparent
          opacity={0.4}
        />
      </Sphere>

      {/* 2. ADVANCED WIREFRAME with LineSegments for sharper look */}
      <lineSegments ref={wireframeRef}>
        <edgesGeometry args={[new THREE.SphereGeometry(1, 32, 32)]} />
        <lineBasicMaterial
          color="#00FF88"
          transparent
          opacity={0.6}
          linewidth={2}
        />
      </lineSegments>

      {/* 3. PULSING CORE (Inner sphere with glow) */}
      <mesh ref={pulsingCoreRef}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial
          color="#00FF88"
          transparent
          opacity={0.3}
          emissive="#00FF88"
          emissiveIntensity={0.8}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* 4. INNER ENERGY CORE (Smallest, brightest) */}
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial
          color="#00FF88"
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* 5. ENERGY PARTICLES (Small orbiting dots) */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 1.2;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle * 0.5) * 0.3,
              Math.sin(angle) * radius,
            ]}
          >
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#00FF88" />
          </mesh>
        );
      })}
    </group>
  );
}

interface LivingNeuralNetworkProps {
  size?: number; // Size in pixels
  className?: string;
}

export function LivingNeuralNetwork({ size = 80, className = '' }: LivingNeuralNetworkProps) {
  return (
    <div 
      className={`${className} relative`}
      style={{ 
        width: `${size}px`,
        height: `${size}px`,
        maxWidth: '100%', // Mobile optimization
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 50 }}
        dpr={window.devicePixelRatio > 2 ? [1, 1.5] : [1, 2]} // Optimized for mobile
        performance={{ min: 0.5 }} // Performance throttling
        gl={{ 
          antialias: window.innerWidth > 768, // Disable AA on mobile for performance
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        {/* LIGHTING SETUP - Neon Green Glow */}
        <ambientLight intensity={0.3} color="#00FF88" />
        
        {/* Main light from top */}
        <pointLight position={[3, 3, 3]} intensity={1.5} color="#00FF88" />
        
        {/* Fill light from bottom for depth */}
        <pointLight position={[-3, -3, -3]} intensity={0.8} color="#00FF88" />
        
        {/* Rim light for edge glow */}
        <pointLight position={[0, 0, -5]} intensity={1} color="#00FF88" />
        
        {/* The Living Neural Network */}
        <NeuralSphere />
      </Canvas>
    </div>
  );
}

