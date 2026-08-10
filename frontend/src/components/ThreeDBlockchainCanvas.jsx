import { useEffect, useRef } from 'preact/hooks';
import * as THREE from 'three';

export default function ThreeDBlockchainCanvas({ verifying, isDarkMode }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // MEJORA 10: Optimización WebGL con resolución adaptativa (DPR Cap)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group Principal
    const juarezGroup = new THREE.Group();
    scene.add(juarezGroup);

    // ----------------------------------------------------
    // MEJORA 9: Escudo Criptográfico de Cristal Concéntrico (Fresnel Shield Sphere)
    // ----------------------------------------------------
    const shieldGeo = new THREE.IcosahedronGeometry(4.2, 2);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x0F6A52,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      emissive: 0x0F6A52,
      emissiveIntensity: 0.2
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    juarezGroup.add(shieldMesh);

    // ----------------------------------------------------
    // 1. Estructura 3D "La X de Juárez"
    // ----------------------------------------------------
    const xMaterial = new THREE.MeshStandardMaterial({
      color: 0xd32f2f, // Rojo Icónico de La X
      roughness: 0.2,
      metalness: 0.7,
      emissive: 0x0F6A52,
      emissiveIntensity: 0.35
    });

    const xWireframeMat = new THREE.MeshStandardMaterial({
      color: 0xB88A3B, // Oro Institucional
      wireframe: true,
      emissive: 0xB88A3B,
      emissiveIntensity: 0.6
    });

    const pillar1Geo = new THREE.BoxGeometry(0.5, 4.2, 0.5);
    const pillar1 = new THREE.Mesh(pillar1Geo, xMaterial);
    pillar1.rotation.z = Math.PI / 4;
    juarezGroup.add(pillar1);

    const pillar1Wire = new THREE.Mesh(pillar1Geo, xWireframeMat);
    pillar1Wire.rotation.z = Math.PI / 4;
    pillar1Wire.scale.set(1.05, 1.05, 1.05);
    juarezGroup.add(pillar1Wire);

    const pillar2Geo = new THREE.BoxGeometry(0.5, 4.2, 0.5);
    const pillar2 = new THREE.Mesh(pillar2Geo, xMaterial);
    pillar2.rotation.z = -Math.PI / 4;
    juarezGroup.add(pillar2);

    const pillar2Wire = new THREE.Mesh(pillar2Geo, xWireframeMat);
    pillar2Wire.rotation.z = -Math.PI / 4;
    pillar2Wire.scale.set(1.05, 1.05, 1.05);
    juarezGroup.add(pillar2Wire);

    // ----------------------------------------------------
    // MEJORA 6: Núcleo Criptográfico de Doble Capa Concéntrica
    // ----------------------------------------------------
    const coreInnerGeo = new THREE.OctahedronGeometry(0.6, 1);
    const coreInnerMat = new THREE.MeshStandardMaterial({
      color: 0x0F6A52, // Verde Esmeralda UTCJ
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0F6A52,
      emissiveIntensity: 0.9
    });
    const coreInnerMesh = new THREE.Mesh(coreInnerGeo, coreInnerMat);
    juarezGroup.add(coreInnerMesh);

    const coreOuterGeo = new THREE.OctahedronGeometry(0.85, 0);
    const coreOuterMat = new THREE.MeshStandardMaterial({
      color: 0xB88A3B,
      wireframe: true,
      emissive: 0xB88A3B,
      emissiveIntensity: 0.8
    });
    const coreOuterMesh = new THREE.Mesh(coreOuterGeo, coreOuterMat);
    juarezGroup.add(coreOuterMesh);

    // ----------------------------------------------------
    // MEJORA 3: Onda de Choque de Energía (Verification Pulse Shockwave)
    // ----------------------------------------------------
    const shockwaveGeo = new THREE.TorusGeometry(0.8, 0.05, 16, 64);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x10B981,
      transparent: true,
      opacity: 0
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveMesh.rotation.x = Math.PI / 2;
    juarezGroup.add(shockwaveMesh);

    // ----------------------------------------------------
    // MEJORA 2: Cadena de Bloques Cúbicos Flotantes (3D Glassmorphism Block Chain Array)
    // ----------------------------------------------------
    const blockGroup = new THREE.Group();
    juarezGroup.add(blockGroup);

    const blockGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0x0F3E4A,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
      emissive: 0x0F6A52,
      emissiveIntensity: 0.4
    });

    const blockCount = 8;
    const blockMeshes = [];
    for (let i = 0; i < blockCount; i++) {
      const angle = (i / blockCount) * Math.PI * 2;
      const radius = 2.7;
      const block = new THREE.Mesh(blockGeo, blockMat);
      block.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.7, (Math.random() - 0.5) * 1.2);
      blockGroup.add(block);
      blockMeshes.push(block);
    }

    // ----------------------------------------------------
    // MEJORA 1: Haces de Luz de Datos Láser (Data Stream Laser Beams)
    // ----------------------------------------------------
    const laserGroup = new THREE.Group();
    juarezGroup.add(laserGroup);

    const laserLines = [];
    blockMeshes.forEach(block => {
      const points = [new THREE.Vector3(0, 0, 0), block.position];
      const laserGeo = new THREE.BufferGeometry().setFromPoints(points);
      const laserMat = new THREE.LineBasicMaterial({
        color: 0xB88A3B,
        transparent: true,
        opacity: 0.45
      });
      const laserLine = new THREE.Line(laserGeo, laserMat);
      laserGroup.add(laserLine);
      laserLines.push({ line: laserLine, target: block });
    });

    // ----------------------------------------------------
    // MEJORA 7: Partículas de Chispa Neón Flotantes (Additive Blending Dust)
    // ----------------------------------------------------
    const particleCount = 600;
    const particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const greenColor = new THREE.Color(0x0F6A52);
    const redColor = new THREE.Color(0xd32f2f);
    const goldColor = new THREE.Color(0xB88A3B);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24;

      const rand = Math.random();
      const mixedColor = rand < 0.45 ? greenColor : (rand < 0.75 ? goldColor : redColor);
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleSystem);

    // ----------------------------------------------------
    // MEJORA 4: Constelación de Nodos Interconectados Dinámicos
    // ----------------------------------------------------
    const constGeo = new THREE.BufferGeometry();
    const constMat = new THREE.LineBasicMaterial({
      color: 0x0F6A52,
      transparent: true,
      opacity: 0.2
    });
    const constLines = new THREE.LineSegments(constGeo, constMat);
    scene.add(constLines);

    // ----------------------------------------------------
    // MEJORA 8: Iluminación de Estudio Reactiva a Colores UTCJ
    // ----------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLightRed = new THREE.PointLight(0xd32f2f, 5, 50);
    pointLightRed.position.set(4, 4, 6);
    scene.add(pointLightRed);

    const pointLightGreen = new THREE.PointLight(0x0F6A52, 5, 50);
    pointLightGreen.position.set(-4, -4, 4);
    scene.add(pointLightGreen);

    const pointLightGold = new THREE.PointLight(0xB88A3B, 4, 40);
    pointLightGold.position.set(0, 5, -2);
    scene.add(pointLightGold);

    // ----------------------------------------------------
    // MEJORA 5: Control Orbit & Parallax con Inercia Física y Giroscopio
    // ----------------------------------------------------
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleOrientation = (event) => {
      if (event.gamma && event.beta) {
        mouseX = Math.min(Math.max(event.gamma / 30, -1), 1);
        mouseY = Math.min(Math.max(event.beta / 30, -1), 1);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);

    // Variables para la animación del pulso
    let shockwaveScale = 1;
    let shockwaveAlpha = 0;

    // Animation Loop
    let reqId;
    let clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Ajuste de velocidad según estatus de verificación
      const baseSpeed = verifying ? 0.04 : 0.007;
      juarezGroup.rotation.y += baseSpeed;
      blockGroup.rotation.z -= baseSpeed * 1.3;
      coreInnerMesh.rotation.x += baseSpeed * 2.2;
      coreOuterMesh.rotation.y -= baseSpeed * 2.8;
      shieldMesh.rotation.y += 0.002;

      // Animación de Bloques
      blockMeshes.forEach((block, idx) => {
        block.rotation.x += 0.01;
        block.rotation.y += 0.015;
        // Actualizar haz láser hacia el bloque
        const points = [new THREE.Vector3(0, 0, 0), block.position];
        laserLines[idx].line.geometry.setFromPoints(points);
      });

      // Animación de Onda de Choque (Shockwave) al verificar
      if (verifying || shockwaveAlpha > 0) {
        shockwaveScale += 0.08;
        shockwaveAlpha = Math.max(0, 1 - (shockwaveScale - 1) / 3);
        if (shockwaveScale > 4) {
          shockwaveScale = 1;
          if (!verifying) shockwaveAlpha = 0;
        }
        shockwaveMesh.scale.set(shockwaveScale, shockwaveScale, shockwaveScale);
        shockwaveMat.opacity = shockwaveAlpha;
      }

      // Animación de Luces Orbitales
      pointLightRed.position.x = Math.sin(elapsedTime * 0.8) * 5;
      pointLightRed.position.y = Math.cos(elapsedTime * 0.5) * 5;
      pointLightGreen.position.x = Math.cos(elapsedTime * 0.7) * -5;
      pointLightGreen.position.y = Math.sin(elapsedTime * 0.6) * -5;

      particleSystem.rotation.y += 0.0006;

      // Inercia Física Lerp
      targetX += (mouseX * 1.8 - targetX) * 0.05;
      targetY += (mouseY * 1.8 - targetY) * 0.05;
      juarezGroup.position.x = targetX;
      juarezGroup.position.y = targetY;

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

    // Cleanup completo de geometrías y materiales
    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      shieldGeo.dispose();
      shieldMat.dispose();
      pillar1Geo.dispose();
      pillar2Geo.dispose();
      xMaterial.dispose();
      xWireframeMat.dispose();
      coreInnerGeo.dispose();
      coreInnerMat.dispose();
      coreOuterGeo.dispose();
      coreOuterMat.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();
      blockGeo.dispose();
      blockMat.dispose();
      laserLines.forEach(l => {
        l.line.geometry.dispose();
        l.line.material.dispose();
      });
      particlesGeo.dispose();
      particlesMat.dispose();
      constGeo.dispose();
      constMat.dispose();
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
