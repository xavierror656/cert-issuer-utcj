import { useEffect, useRef } from 'preact/hooks';
import * as THREE from 'three';

export default function ThreeDBlockchainCanvas({ verifying, isDarkMode }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for objects
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Central Cryptographic Block (Icosahedron / Wireframe)
    const geometry = new THREE.IcosahedronGeometry(2.4, 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x0F6A52,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      emissive: 0x0F6A52,
      emissiveIntensity: 0.5
    });
    const blockMesh = new THREE.Mesh(geometry, material);
    mainGroup.add(blockMesh);

    // Inner Glowing Core (Gold)
    const coreGeo = new THREE.OctahedronGeometry(1.2, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xB88A3B,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
      emissive: 0xB88A3B,
      emissiveIntensity: 0.8
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    mainGroup.add(coreMesh);

    // 2. Fullscreen Particle Starfield
    const particleCount = 450;
    const particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const greenColor = new THREE.Color(0x0F6A52);
    const goldColor = new THREE.Color(0xB88A3B);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const mixedColor = Math.random() > 0.5 ? greenColor : goldColor;
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleSystem);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xB88A3B, 3, 60);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const greenLight = new THREE.PointLight(0x0F6A52, 4, 60);
    greenLight.position.set(-5, -5, 3);
    scene.add(greenLight);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      const speed = verifying ? 0.03 : 0.005;
      mainGroup.rotation.x += speed;
      mainGroup.rotation.y += speed * 1.2;
      coreMesh.rotation.y -= speed * 1.8;

      particleSystem.rotation.y += 0.001;
      particleSystem.rotation.x += 0.0005;

      // Mouse inertia tracking
      mainGroup.position.x += (mouseX * 1.2 - mainGroup.position.x) * 0.03;
      mainGroup.position.y += (mouseY * 1.2 - mainGroup.position.y) * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
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
    <div 
      ref={mountRef} 
      class="fixed inset-0 w-full h-full pointer-events-none z-0" 
    />
  );
}
