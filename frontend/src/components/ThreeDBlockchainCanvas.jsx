import { useEffect, useRef } from 'preact/hooks';
import * as THREE from 'three';

export default function ThreeDBlockchainCanvas({ verifying, result, isDarkMode }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 260;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for objects
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Central Cryptographic Block (Icosahedron / Cube Wireframe)
    const geometry = new THREE.IcosahedronGeometry(1.6, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x0F6A52,
      wireframe: true,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x0F6A52,
      emissiveIntensity: 0.4
    });
    const blockMesh = new THREE.Mesh(geometry, material);
    mainGroup.add(blockMesh);

    // Inner Glowing Core (Gold)
    const coreGeo = new THREE.OctahedronGeometry(0.8, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xB88A3B,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0xB88A3B,
      emissiveIntensity: 0.8
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    mainGroup.add(coreMesh);

    // 2. Blockchain Particle Field
    const particleCount = 200;
    const particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const greenColor = new THREE.Color(0x0F6A52);
    const goldColor = new THREE.Color(0xB88A3B);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;

      const mixedColor = Math.random() > 0.5 ? greenColor : goldColor;
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleSystem);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xB88A3B, 2.5, 50);
    pointLight.position.set(3, 3, 4);
    scene.add(pointLight);

    const greenLight = new THREE.PointLight(0x0F6A52, 3, 50);
    greenLight.position.set(-3, -3, 2);
    scene.add(greenLight);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / height) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      const speed = verifying ? 0.04 : 0.01;
      mainGroup.rotation.x += speed;
      mainGroup.rotation.y += speed * 1.3;
      coreMesh.rotation.y -= speed * 2;

      particleSystem.rotation.y += 0.002;
      particleSystem.rotation.x += 0.001;

      // Mouse inertia tracking
      mainGroup.rotation.y += (mouseX * 0.5 - mainGroup.rotation.y) * 0.05;
      mainGroup.rotation.x += (-mouseY * 0.5 - mainGroup.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      renderer.dispose();
    };
  }, [verifying]);

  return (
    <div class="relative w-full h-[260px] flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-slate-950/80 to-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
      <div ref={mountRef} class="w-full h-full cursor-grab active:cursor-grabbing" />
      <div class="absolute bottom-3 left-4 right-4 flex justify-between items-center pointer-events-none text-[11px] font-mono text-slate-400">
        <span class="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800 backdrop-blur-md">
          <span class={`w-2 h-2 rounded-full ${verifying ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
          {verifying ? 'VERIFICANDO NODOS EN ETHEREUM...' : '3D BLOCKCHAIN NODE • WEBGL LIVE'}
        </span>
        <span class="text-slate-500 font-bold">UTCJ CRYPTO VAULT v2.4</span>
      </div>
    </div>
  );
}
