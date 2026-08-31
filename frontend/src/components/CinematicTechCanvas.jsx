import { useEffect, useRef } from 'preact/hooks';

export default function CinematicTechCanvas({ verifying }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse coordinates
    let mouse = { x: width / 2, y: height / 2, active: false };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Particle nodes for blockchain & neural mesh
    const nodeCount = Math.min(Math.floor((width * height) / 18000), 75);
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1,
        color: i % 3 === 0 ? '#B88A3B' : (i % 3 === 1 ? '#93C01F' : '#279371'),
        alpha: Math.random() * 0.5 + 0.3
      });
    }

    // Circuit laser pulses
    const circuitPulses = [];
    const pulseCount = 14;
    for (let i = 0; i < pulseCount; i++) {
      circuitPulses.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: Math.random() * 80 + 40,
        speed: Math.random() * 2.5 + 1.5,
        direction: Math.random() > 0.5 ? 'h' : 'v',
        color: i % 2 === 0 ? '#B88A3B' : '#93C01F',
        alpha: Math.random() * 0.6 + 0.3
      });
    }

    // Floating Hash snippets
    const cryptoSnippets = [
      'SHA256: 82f25dcc...',
      'MERKLE: 0x93C01F...',
      'BLOCKCERTS v3.2',
      'UTCJ: 08MSU0017R',
      'ETHEREUM ANCHOR',
      'ISO 27001 OK',
      'SEMI: VLSI_CHIP',
      'PLC: LADDER_RUN',
      'POWER_BI: DAX_KPI'
    ];
    const floatingTexts = [];
    for (let i = 0; i < 8; i++) {
      floatingTexts.push({
        text: cryptoSnippets[i % cryptoSnippets.length],
        x: Math.random() * width,
        y: Math.random() * height,
        speed: Math.random() * 0.4 + 0.2,
        alpha: Math.random() * 0.25 + 0.15,
        size: Math.random() * 3 + 9
      });
    }

    let pulseRadius = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const speedMultiplier = verifying ? 3.2 : 1.0;

      // 1. Draw Expanding Cryptographic Ring Wave
      pulseRadius += 0.8 * speedMultiplier;
      if (pulseRadius > Math.max(width, height) * 0.8) {
        pulseRadius = 0;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = verifying ? 'rgba(184, 138, 59, 0.4)' : 'rgba(39, 147, 113, 0.15)';
      ctx.lineWidth = verifying ? 2.5 : 1;
      ctx.setLineDash([8, 12]);
      ctx.stroke();
      ctx.restore();

      // 2. Draw Floating Cryptographic Data Strings
      ctx.font = "10px 'Fira Code', monospace";
      ctx.fillStyle = '#D1DF8C';
      for (const ft of floatingTexts) {
        ft.y -= ft.speed * speedMultiplier;
        if (ft.y < -20) {
          ft.y = height + 20;
          ft.x = Math.random() * width;
        }
        ctx.globalAlpha = verifying ? ft.alpha * 1.8 : ft.alpha;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1.0;

      // 3. Draw Laser Circuit Pulses
      for (const p of circuitPulses) {
        if (p.direction === 'h') {
          p.x += p.speed * speedMultiplier;
          if (p.x > width + p.length) {
            p.x = -p.length;
            p.y = Math.random() * height;
          }
          const grad = ctx.createLinearGradient(p.x - p.length, p.y, p.x, p.y);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, p.color);
          ctx.beginPath();
          ctx.moveTo(p.x - p.length, p.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Pulse head dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        } else {
          p.y += p.speed * speedMultiplier;
          if (p.y > height + p.length) {
            p.y = -p.length;
            p.x = Math.random() * width;
          }
          const grad = ctx.createLinearGradient(p.x, p.y - p.length, p.x, p.y);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, p.color);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - p.length);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      }

      // 4. Update and Draw Blockchain / Neural Constellation Nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.x += node.vx * speedMultiplier;
        node.y += node.vy * speedMultiplier;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Interaction with mouse
        if (mouse.active) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const force = (140 - dist) / 140;
            node.x += (dx / dist) * force * 1.5;
            node.y += (dy / dist) * force * 1.5;
          }
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = verifying ? Math.min(node.alpha * 1.5, 1) : node.alpha;
        ctx.fill();

        // Connect nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = node.x - nodeB.x;
          const dy = node.y - nodeB.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = verifying ? 160 : 110;

          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.strokeStyle = verifying ? 'rgba(184, 138, 59, 0.28)' : 'rgba(39, 147, 113, 0.12)';
            ctx.lineWidth = 1 - dist / maxDist;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [verifying]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
}
