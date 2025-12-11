import { useEffect, useRef } from 'react';

/**
 * 🔥 NEON CORE ANIMATED BACKGROUND
 * 
 * Замена простой canvas-анимации на мощную Three.js сферу с:
 * - Прозрачной силиконовой сферой (50% opacity)
 * - Яркой data-сферой с цифрами (95% opacity)
 * - Мощным неоновым bloom эффектом
 * - Процедурной деформацией через noise
 * 
 * BACKUP: AnimatedBackground.backup.tsx (на случай отката)
 */

export function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Динамический импорт Three.js
    const initThreeScene = async () => {
      // @ts-ignore - Three.js импортируется динамически
      const THREE = await import('three');
      // @ts-ignore
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      // @ts-ignore
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
      // @ts-ignore
      const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');
      // @ts-ignore
      const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');

      const COLORS = {
        black: 0x030303,
        green: 0x00FF94
      };

      let scene: any, camera: any, renderer: any, composer: any, controls: any;
      let siliconeSphere: any, dataSphere: any;
      let clock = new THREE.Clock();
      let animationId: number;

      function init() {
        const container = containerRef.current;
        if (!container) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(COLORS.black);
        scene.fog = new THREE.FogExp2(COLORS.black, 0.02);

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 8);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Ограничиваем для производительности
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;

        // --- LIGHTING ---
        const ambientLight = new THREE.AmbientLight(0x111111, 3.0);
        scene.add(ambientLight);

        const rimLight = new THREE.SpotLight(COLORS.green, 80);
        rimLight.position.set(-10, 8, -5);
        rimLight.lookAt(0, 0, 0);
        scene.add(rimLight);

        const fillLight = new THREE.PointLight(0x4455ff, 10);
        fillLight.position.set(10, -5, 5);
        scene.add(fillLight);

        const frontLight = new THREE.PointLight(COLORS.green, 15, 30);
        frontLight.position.set(0, 2, 10);
        scene.add(frontLight);

        // --- SILICONE SPHERE (Прозрачная, 50%) ---
        const geometry = new THREE.IcosahedronGeometry(2, 64);
        const material = new THREE.MeshStandardMaterial({
          color: 0x000000,
          roughness: 0.05,
          metalness: 0.95,
          transparent: true,
          opacity: 0.5,
          emissive: COLORS.green,
          emissiveIntensity: 0.3
        });

        // Шейдер деформации
        material.onBeforeCompile = (shader: any) => {
          shader.uniforms.uTime = { value: 0 };
          material.userData.shader = shader;
          shader.vertexShader = `
            uniform float uTime;
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            float snoise(vec3 v) {
              const vec2  C = vec2(1.0/6.0, 1.0/3.0);
              const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
              vec3 i  = floor(v + dot(v, C.yyy));
              vec3 x0 = v - i + dot(i, C.xxx);
              vec3 g = step(x0.yzx, x0.xyz);
              vec3 l = 1.0 - g;
              vec3 i1 = min(g.xyz, l.zxy);
              vec3 i2 = max(g.xyz, l.zxy);
              vec3 x1 = x0 - i1 + C.xxx;
              vec3 x2 = x0 - i2 + C.yyy;
              vec3 x3 = x0 - D.yyy;
              i = mod289(i);
              vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
              float n_ = 0.142857142857;
              vec3  ns = n_ * D.wyz - D.xzx;
              vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
              vec4 x_ = floor(j * ns.z);
              vec4 y_ = floor(j - 7.0 * x_);
              vec4 x = x_ * ns.x + ns.yyyy;
              vec4 y = y_ * ns.x + ns.yyyy;
              vec4 h = 1.0 - abs(x) - abs(y);
              vec4 b0 = vec4(x.xy, y.xy);
              vec4 b1 = vec4(x.zw, y.zw);
              vec4 s0 = floor(b0)*2.0 + 1.0;
              vec4 s1 = floor(b1)*2.0 + 1.0;
              vec4 sh = -step(h, vec4(0.0));
              vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
              vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
              vec3 p0 = vec3(a0.xy,h.x);
              vec3 p1 = vec3(a0.zw,h.y);
              vec3 p2 = vec3(a1.xy,h.z);
              vec3 p3 = vec3(a1.zw,h.w);
              vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
              p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
              vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
              m = m * m;
              return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }
          ` + shader.vertexShader;

          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            float noise1 = snoise(position * 0.8 + vec3(uTime * 0.5));
            float noise2 = snoise(position * 3.0 - vec3(uTime * 0.7));
            float displacement = (noise1 * 0.6 + noise2 * 0.15) * 0.7;
            transformed += normal * displacement;
            `
          );
        };
        siliconeSphere = new THREE.Mesh(geometry, material);
        scene.add(siliconeSphere);

        // --- DATA SPHERE (Яркая, 95%) ---
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 1024, 1024);

          for (let i = 0; i < 800; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const size = Math.random() * 24 + 12;
            const brightness = Math.random() * 0.3 + 0.7;
            ctx.fillStyle = `rgba(0, 255, 148, ${brightness})`;
            ctx.font = size + 'px monospace';
            ctx.fillText(Math.random() > 0.5 ? '1' : '0', x, y);
            if (Math.random() > 0.95) {
              ctx.fillText(['X', '$', '#', '_'][Math.floor(Math.random() * 4)], x, y);
            }
          }
        }

        const dataTexture = new THREE.CanvasTexture(canvas);
        dataTexture.wrapS = THREE.RepeatWrapping;
        dataTexture.wrapT = THREE.RepeatWrapping;

        const dataGeo = new THREE.SphereGeometry(2.3, 64, 64);
        const dataMat = new THREE.MeshBasicMaterial({
          map: dataTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          opacity: 0.95,
          depthWrite: false
        });

        dataMat.onBeforeCompile = (shader: any) => {
          shader.uniforms.uTime = { value: 0 };
          dataMat.userData.shader = shader;
          shader.fragmentShader = `uniform float uTime;` + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `
            vec2 scrolledUv = vMapUv + vec2(uTime * 0.05, uTime * 0.15);
            vec4 texelColor = texture2D(map, scrolledUv);
            float glitch = step(0.98, sin(uTime * 20.0 + vMapUv.y * 50.0));
            texelColor.rgb += glitch * vec3(0.5, 1.0, 0.7);
            diffuseColor *= texelColor;
            `
          );
        };
        dataSphere = new THREE.Mesh(dataGeo, dataMat);
        scene.add(dataSphere);

        // --- POST-PROCESSING (BLOOM) ---
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          2.5,
          0.6,
          0.05
        );
        composer.addPass(bloomPass);

        // Resize handler
        const onWindowResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
          composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onWindowResize);

        // Animation loop
        function animate() {
          animationId = requestAnimationFrame(animate);
          const time = clock.getElapsedTime();

          if (siliconeSphere.material.userData.shader) {
            siliconeSphere.material.userData.shader.uniforms.uTime.value = time;
          }
          if (dataSphere.material.userData.shader) {
            dataSphere.material.userData.shader.uniforms.uTime.value = time;
          }

          siliconeSphere.rotation.y = time * 0.15;
          dataSphere.rotation.y = -time * 0.1;
          dataSphere.rotation.z = Math.sin(time * 0.2) * 0.1;

          controls.update();
          composer.render();
        }
        animate();

        // Cleanup function
        cleanupRef.current = () => {
          window.removeEventListener('resize', onWindowResize);
          if (animationId) cancelAnimationFrame(animationId);
          if (renderer) {
            renderer.dispose();
            container.removeChild(renderer.domElement);
          }
          if (composer) composer.dispose();
        };
      }

      init();
    };

    initThreeScene().catch(console.error);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ background: '#030303' }}
    />
  );
}
