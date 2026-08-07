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
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for La X de Juárez and Blockchain Nodes
    const juarezGroup = new THREE.Group();
    scene.add(juarezGroup);

    // 1. Build 3D "La X de Juárez" Monument
    const xMaterial = new THREE.MeshStandardMaterial({
      color: 0xd32f2f, // Iconic Red of La X de Juárez
      roughness: 0.2,
      metalness: 0.7,
      emissive: 0x0F6A52,
      emissiveIntensity: 0.35,
      wireframe: false
    });

    const xWireframeMat = new THREE.MeshStandardMaterial({
      color: 0xB88A3B, // Gold Accent Wireframe
      wireframe: true,
      emissive: 0xB88A3B,
      emissiveIntensity: 0.6
    });

    // Pillar 1 of X (Diagonal left-to-right)
    const pillar1Geo = new THREE.BoxGeometry(0.5, 4.2, 0.5);
    const pillar1 = new THREE.Mesh(pillar1Geo, xMaterial);
    pillar1.rotation.z = Math.PI / 4;
    juarezGroup.add(pillar1);

    const pillar1Wire = new THREE.Mesh(pillar1Geo, xWireframeMat);
    pillar1Wire.rotation.z = Math.PI / 4;
    pillar1Wire.scale.set(1.05, 1.05, 1.05);
    juarezGroup.add(pillar1Wire);

    // Pillar 2 of X (Diagonal right-to-left)
    const pillar2Geo = new THREE.BoxGeometry(0.5, 4.2, 0.5);
    const pillar2 = new THREE.Mesh(pillar2Geo, xMaterial);
    pillar2.rotation.z = -Math.PI / 4;
    juarezGroup.add(pillar2);

    const pillar2Wire = new THREE.Mesh(pillar2Geo, xWireframeMat);
    pillar2Wire.rotation.z = -Math.PI / 4;
    pillar2Wire.scale.set(1.05, 1.05, 1.05);
    juarezGroup.add(pillar2Wire);

    // Central Eye / Cryptographic Core at the intersection of La X
    const coreGeo = new THREE.OctahedronGeometry(0.75, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0F6A52, // UTCJ Emerald Green Core
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0F6A52,
      emissiveIntensity: 0.9
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    juarezGroup.add(coreMesh);

    // 2. Orbiting Ethereum Blockchain Nodes around La X
    const nodeGroup = new THREE.Group();
    juarezGroup.add(nodeGroup);

    const nodeGeo = new THREE.IcosahedronGeometry(0.3, 0);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xB88A3B,
      wireframe: true,
      emissive: 0xB88A3B,
      emissiveIntensity: 0.8
    });

    const numOrbitNodes = 6;
    for (let i = 0; i < numOrbitNodes; i++) {
      const angle = (i / numOrbitNodes) * Math.PI * 2;
      const radius = 3.2;
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.6, (Math.random() - 0.5) * 1.5);
      nodeGroup.add(node);
    }

    // 3. Fullscreen Particle Starfield (Ciudad Juárez Technological Energy)
    const particleCount = 550;
    const particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const greenColor = new THREE.Color(0x0F6A52);
    const redColor = new THREE.Color(0xd32f2f);
    const goldColor = new THREE.Color(0xB88A3B);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;

      const rand = Math.random();
      const mixedColor = rand < 0.4 ? greenColor : (rand < 0.7 ? goldColor : redColor);
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: 0.095,
      vertexColors: true,
      transparent: true,
      opacity: 0.65
    });
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleSystem);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xd32f2f, 4, 60);
    pointLight1.position.set(4, 4, 6);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x0F6A52, 4, 60);
    pointLight2.position.set(-4, -4, 4);
    scene.add(pointLight2);

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

      const speed = verifying ? 0.035 : 0.006;
      juarezGroup.rotation.y += speed;
      nodeGroup.rotation.z -= speed * 1.5;
      coreMesh.rotation.x += speed * 2;

      particleSystem.rotation.y += 0.0008;

      // Smooth inertia tracking
      juarezGroup.position.x += (mouseX * 1.5 - juarezGroup.position.x) * 0.04;
      juarezGroup.position.y += (mouseY * 1.5 - juarezGroup.position.y) * 0.04;

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
      pillar1Geo.dispose();
      pillar2Geo.dispose();
      xMaterial.dispose();
      xWireframeMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
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
