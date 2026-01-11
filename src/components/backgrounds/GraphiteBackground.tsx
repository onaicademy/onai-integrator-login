import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Компонент частиц с графитовым эффектом
function GraphiteParticles() {
  const particlesRef = useRef<THREE.Points>(null);
  const mousePosition = useRef({ x: 0, y: 0 });

  // Цветовая палитра: ТОЛЬКО твои цвета!
  const colors = useMemo(() => ({
    black: new THREE.Color(0x0a0a0a),     // #0a0a0a - черный
    green: new THREE.Color(0x00FF00),     // #00FF88 - зеленый
    gray: new THREE.Color(0x6b6b6b),      // #6b6b6b - серый
    white: new THREE.Color(0xffffff),     // #ffffff - белый
  }), []);

  // Создание частиц - ОПТИМИЗИРОВАНО для производительности
  const { positions, colorArray, scales } = useMemo(() => {
    const particleCount = 1500; // ⚡ Уменьшено с 5000 до 1500 для плавной работы
    const positions = new Float32Array(particleCount * 3);
    const colorArray = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Позиции в 3D пространстве
      positions[i * 3] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150;

      // Случайные цвета из палитры - ТОЛЬКО твои цвета!
      const rand = Math.random();
      let color: THREE.Color;

      if (rand < 0.3) {
        color = colors.green;  // 30% зеленые (снижено с 40%)
      } else if (rand < 0.6) {
        color = colors.gray;   // 30% серые
      } else if (rand < 0.95) {
        color = colors.black;  // 35% черные (увеличено для баланса)
      } else {
        color = colors.white;  // 5% белые (акцент)
      }

      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;

      // Случайные размеры - Уменьшены для тонкого эффекта
      scales[i] = Math.random() * 2.5 + 1.0; // Уменьшено с (2.0-6.0) до (1.0-3.5)
    }

    return { positions, colorArray, scales };
  }, [colors]);

  // Обработка движения мыши
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePosition.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Анимация частиц
  useFrame((state) => {
    if (!particlesRef.current) return;

    const time = state.clock.getElapsedTime();
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

    // Очень медленное вращение для subtle 3D эффекта
    particlesRef.current.rotation.y = time * 0.02; // Уменьшено с 0.05 до 0.02
    particlesRef.current.rotation.x = Math.sin(time * 0.1) * 0.05; // Уменьшено с 0.1 до 0.05

    // Интерактивность с мышью
    const mouseX = mousePosition.current.x;
    const mouseY = mousePosition.current.y;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];

      // Отталкивание от курсора
      const distX = x / 50 - mouseX;
      const distY = y / 50 - mouseY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      if (distance < 2) {
        positions[i] += distX * 0.02;
        positions[i + 1] += distY * 0.02;
      }

      // Волновой эффект
      positions[i + 2] = Math.sin(time * 0.3 + x * 0.02 + y * 0.02) * 5;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colorArray.length / 3}
          array={colorArray}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-scale"
          count={scales.length}
          array={scales}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={3.0} // Уменьшено с 5.0 до 3.0 для тонкого эффекта
        vertexColors
        transparent
        opacity={0.3} // Снижено с 1.0 до 0.3 (~30% интенсивность)
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Главный компонент фона
export function GraphiteBackground() {
  return (
    <div className="graphite-background-container">
      {/* CSS Градиентный фон с шумом */}
      <div className="graphite-gradient-layer" />
      
      {/* Three.js Canvas с частицами - ОПТИМИЗИРОВАНО */}
      <Canvas
        camera={{ position: [0, 0, 50], fov: 75 }}
        className="graphite-canvas"
        gl={{ powerPreference: 'high-performance', antialias: false }} // GPU optimization
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          willChange: 'transform', // GPU acceleration hint
        }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#00FF88" />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#6b6b6b" />
        <GraphiteParticles />
      </Canvas>
    </div>
  );
}

