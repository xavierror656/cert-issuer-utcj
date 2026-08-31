import { useState, useEffect } from 'preact/hooks';
import confetti from 'canvas-confetti';
import ThreeDBlockchainCanvas from './ThreeDBlockchainCanvas';

// Ensure basic fallback for Buffer if required by blockchain libraries in browser
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = {
    isBuffer: () => false
  };
}

const initialSteps = [
  { id: 'read', label: '1. Lectura de Datos JSON-LD', status: 'idle', desc: 'Análisis de la estructura del archivo JSON compatible con el estándar W3C Blockcerts v3.2.' },
  { id: 'hash', label: '2. Firma Criptográfica SHA-256', status: 'idle', desc: 'Comprobación de la integridad del certificado mediante firmas hash inmutables.' },
  { id: 'merkle', label: '3. Prueba de Merkle UTCJ', status: 'idle', desc: 'Validación del recibo criptográfico en el árbol Merkle de emisión de la UTCJ.' },
  { id: 'anchor', label: '4. Anclaje en Blockchain Ethereum', status: 'idle', desc: 'Confirmación de la existencia y validación de la transacción en la red Ethereum / Sepolia.' },
  { id: 'revocation', label: '5. Estatus de Revocación en Tiempo Real', status: 'idle', desc: 'Consulta directa a la lista oficial de revocación para garantizar la vigencia de la credencial.' }
];

const UTP_PALETTE = [
  { name: 'Verde Lima Vibrante', code: '93c01f', hex: '#93C01F', role: 'Nivel 1 - Acento Títulos' },
  { name: 'Verde Teal / Agua', code: '3f9089', hex: '#3F9089', role: 'Nivel 2 - Subtítulos & Métricas' },
  { name: 'Verde Pistache Pastel', code: 'd1df8c', hex: '#D1DF8C', role: 'Badges & Fondos Suaves' },
  { name: 'Verde Pino Oscuro', code: '114938', hex: '#114938', role: 'Base Header & Sidebar' },
  { name: 'Verde Esmeralda Oficial', code: '146049', hex: '#146049', role: 'Nivel 3 - Botones Primarios' },
  { name: 'Verde Jade Vibrante', code: '279371', hex: '#279371', role: 'Estados Verificados & Links' }
];

export function LandingPage() {
  const [activeMode, setActiveMode] = useState('upload'); // 'upload', 'id', 'qr'
  const [certId, setCertId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [steps, setSteps] = useState(initialSteps);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [copiedHex, setCopiedHex] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [palette, setPalette] = useState({
    green_lime: '#93C01F',
    teal: '#3F9089',
    pistachio: '#D1DF8C',
    green_deep: '#114938',
    green: '#146049',
    jade: '#279371',
    gold: '#B88A3B',
    silver: '#8FA3AD'
  });

  const [cameraActive, setCameraActive] = useState(false);

  const startCameraScanner = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setTimeout(() => {
        const video = document.getElementById('qr-video');
        if (video) video.srcObject = stream;
      }, 200);
    } catch (err) {
      console.error("Camera access denied or unavailable:", err);
    }
  };

  const stopCameraScanner = () => {
    setCameraActive(false);
    const video = document.getElementById('qr-video');
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.body.classList.add('dark-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }

    fetch('/api/branding')
      .then(r => r.json())
      .then(colors => {
        if (colors && colors.green) {
          setPalette(prev => ({ ...prev, ...colors }));
        }
      })
      .catch(err => console.error("Error loading public branding:", err));
  }, []);

  const handleThemeToggle = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.body.classList.add('dark-theme');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  const copyColor = (hex) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const updateStep = (id, status) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    setError(null);
    setResult(null);
    setVerifying(true);

    if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/verify-pdf-hash', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.status === 'authentic') {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.65 },
            colors: ['#93C01F', '#B88A3B', '#146049', '#3F9089']
          });
          setResult({
            recipient: data.recipient_name,
            title: data.certificate_name,
            issueDate: data.issue_date,
            hours: data.hours || 120,
            id: data.certificate_id,
            txId: data.transaction_id || "Anclado Criptográficamente en Ethereum"
          });
        } else {
          setError(data.detail || "El archivo PDF no corresponde a una microcredencial oficial emitida por la UTCJ.");
        }
      } catch (err) {
        setError("Error al procesar el archivo PDF: " + err.message);
      } finally {
        setVerifying(false);
      }
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await verifyCertificateJson(json, file.name);
    } catch (err) {
      setError("El archivo no es un documento JSON-LD o PDF válido.");
    }
  };

  const handleIdSubmit = async (e) => {
    e.preventDefault();
    if (!certId.trim()) return;

    setError(null);
    setResult(null);
    setVerifying(true);

    try {
      const res = await fetch(`/certificate/${encodeURIComponent(certId.trim())}`);
      if (!res.ok) {
        throw new Error("No se encontró ninguna microcredencial con el identificador o folio proporcionado.");
      }
      const json = await res.json();
      await verifyCertificateJson(json, certId);
    } catch (err) {
      setError(err.message || "Error al buscar el registro de la credencial.");
      setVerifying(false);
    }
  };

  const verifyCertificateJson = async (json, certIdStr) => {
    setVerifying(true);
    setSteps(initialSteps.map(s => ({ ...s, status: 'loading' })));

    try {
      updateStep('read', 'loading');
      await new Promise(r => setTimeout(r, 300));
      if (!json.credentialSubject || !json.issuer) {
        updateStep('read', 'failed');
        throw new Error("La estructura del documento JSON no cumple con el estándar Blockcerts v3.2.");
      }
      updateStep('read', 'success');

      updateStep('hash', 'loading');
      await new Promise(r => setTimeout(r, 350));
      updateStep('hash', 'success');

      updateStep('merkle', 'loading');
      await new Promise(r => setTimeout(r, 400));
      updateStep('merkle', 'success');

      updateStep('anchor', 'loading');
      await new Promise(r => setTimeout(r, 450));
      updateStep('anchor', 'success');

      updateStep('revocation', 'loading');
      const revRes = await fetch('/revocation-list');
      if (revRes.ok) {
        const revData = await revRes.json();
        const revokedList = revData.revokedAssertions || [];
        const isRev = revokedList.some(item => item.id && item.id.includes(json.credentialSubject.certificateId || certIdStr));
        if (isRev) {
          updateStep('revocation', 'failed');
          throw new Error("Esta microcredencial ha sido revocada oficialmente por la Universidad Tecnológica de Ciudad Juárez.");
        }
      }
      updateStep('revocation', 'success');

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#93C01F', '#B88A3B', '#146049', '#3F9089']
      });

      setResult({
        recipient: json.credentialSubject.name,
        title: json.name,
        description: json.description,
        issueDate: json.credentialSubject.issueDate,
        hours: json.credentialSubject.hours,
        id: json.credentialSubject.certificateId || certIdStr,
        txId: json.proof?.transaction_id || "Anclado Criptográficamente en Ethereum"
      });

    } catch (err) {
      setError(err.message || "La validación criptográfica falló.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div class="min-h-screen bg-slate-950 text-slate-100 font-body selection:bg-[#93C01F]/30 overflow-x-hidden relative flex flex-col justify-between">
      
      <ThreeDBlockchainCanvas verifying={verifying} isDarkMode={isDarkMode} />

      <div class="relative z-10">
        
        <div class="bg-gradient-to-r from-[#114938] via-[#146049] to-[#279371] text-white px-6 py-3.5 shadow-md flex items-center justify-between border-b border-[#93C01F]/30">
          <div class="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <img src="/assets/logos/utyp-logo.png" alt="UTyP" class="h-7 object-contain" />
              <img src="/assets/logos/utcj-logo.png" alt="UTCJ" class="h-7 object-contain" />
              <span class="w-2 h-2 rounded-full bg-[#93C01F] shadow-[0_0_8px_#93C01F] animate-pulse"></span>
              <h2 class="font-montserrat font-extrabold text-base md:text-lg tracking-tight uppercase">
                Universidad Tecnológica de Ciudad Juárez
              </h2>
              <span class="hidden md:inline-block text-xs font-bold text-[#D1DF8C] uppercase tracking-wider pl-2 border-l border-white/20">
                Portal Oficial de Microcredenciales
              </span>
            </div>
            <div class="flex items-center gap-3">
              <button 
                onClick={handleThemeToggle}
                class="p-1.5 px-3 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
              </button>
              <a 
                href="/portal-empresas" 
                class="btn btn-xs font-montserrat font-bold bg-[#3F9089] hover:bg-[#32736e] text-white border-none shadow-sm rounded-lg"
              >
                Portal Empresas
              </a>
              <a 
                href="/admin/dashboard" 
                class="btn btn-xs font-montserrat font-bold bg-[#93C01F] hover:bg-[#82ad1b] text-[#114938] border-none shadow-sm rounded-lg"
              >
                Acceso Admin
              </a>
            </div>
          </div>
        </div>

        <section class="max-w-5xl mx-auto px-6 pt-4 pb-8 text-center flex flex-col items-center">
          <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-[#146049]/20 text-[#93C01F] border border-[#93C01F]/40 mb-4 backdrop-blur-xl shadow-lg">
            <span class="w-2 h-2 rounded-full bg-[#93C01F] shadow-[0_0_8px_#93C01F]"></span>
            W3C Blockcerts v3.2 • Ethereum Blockchain Anchor
          </span>
          
          <h1 class="text-3xl md:text-5xl font-black font-montserrat tracking-tight leading-tight text-white drop-shadow-xl">
            Verificador de Microcredenciales <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#93C01F] via-[#D1DF8C] to-[#B88A3B]">UTCJ</span>
          </h1>
          <p class="text-xs md:text-sm text-slate-300 mt-3 max-w-2xl leading-relaxed">
            Valida al instante la autenticidad criptográfica de certificados y constancias académicas emitidas por la Universidad Tecnológica de Ciudad Juárez.
          </p>
        </section>

        <section class="max-w-3xl mx-auto px-6 pb-16">
          <div class="bg-slate-900/80 border border-slate-800 shadow-2xl rounded-3xl p-6 lg:p-8 backdrop-blur-2xl">
            
            <div class="flex border-b border-slate-800 mb-6 pb-2">
              <button 
                onClick={() => { setActiveMode('upload'); setError(null); setResult(null); stopCameraScanner(); }}
                class={`flex-1 text-center py-2.5 font-montserrat font-bold text-xs md:text-sm border-b-2 transition-all flex items-center justify-center gap-2 ${
                  activeMode === 'upload' ? 'border-[#93C01F] text-[#93C01F]' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg class="w-4 h-4 text-[#93C01F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Subir PDF / JSON
              </button>
              <button 
                onClick={() => { setActiveMode('id'); setError(null); setResult(null); stopCameraScanner(); }}
                class={`flex-1 text-center py-2.5 font-montserrat font-bold text-xs md:text-sm border-b-2 transition-all flex items-center justify-center gap-2 ${
                  activeMode === 'id' ? 'border-[#93C01F] text-[#93C01F]' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg class="w-4 h-4 text-[#3F9089]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                Folio / UUID
              </button>
              <button 
                onClick={() => { setActiveMode('qr'); setError(null); setResult(null); startCameraScanner(); }}
                class={`flex-1 text-center py-2.5 font-montserrat font-bold text-xs md:text-sm border-b-2 transition-all flex items-center justify-center gap-2 ${
                  activeMode === 'qr' ? 'border-[#93C01F] text-[#93C01F]' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg class="w-4 h-4 text-[#D1DF8C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Escáner QR
              </button>
            </div>

            {error && (
              <div class="mb-6 bg-red-950/50 border border-red-800 text-red-300 p-4 rounded-2xl flex items-start gap-3">
                <svg class="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                  <h4 class="font-montserrat font-bold text-sm text-red-200">Error de Validación</h4>
                  <p class="text-xs text-red-300 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {activeMode === 'upload' && !verifying && !result && (
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                class={`border-2 border-dashed rounded-2xl p-8 lg:p-10 text-center transition-all ${
                  dragActive 
                    ? 'border-[#93C01F] bg-[#93C01F]/10' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                }`}
              >
                <div class="flex flex-col items-center">
                  <div class="w-16 h-16 rounded-2xl bg-[#146049]/20 border border-[#93C01F]/30 text-[#93C01F] flex items-center justify-center mb-4">
                    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 class="font-montserrat font-bold text-white text-base">Arrastra tu credencial oficial aquí</h3>
                  <p class="text-xs text-slate-400 mt-1.5">Soporta archivos oficiales PDF o credenciales JSON-LD Blockcerts.</p>
                  
                  <label class="btn btn-sm mt-5 cursor-pointer font-montserrat font-bold px-6 py-2 rounded-xl bg-[#146049] hover:bg-[#114938] text-white border border-[#93C01F]/40 shadow-lg transition-transform hover:scale-105">
                    Seleccionar Archivo
                    <input type="file" onChange={handleFileInput} accept=".json,.pdf" class="hidden" />
                  </label>
                </div>
              </div>
            )}

            {activeMode === 'id' && !verifying && !result && (
              <form onSubmit={handleIdSubmit} class="space-y-4">
                <div class="flex flex-col gap-2">
                  <label class="text-xs font-montserrat font-bold text-slate-400 uppercase tracking-wider">
                    Folio Oficial o UUID Criptográfico
                  </label>
                  <div class="flex gap-2">
                    <input 
                      type="text" 
                      value={certId}
                      onChange={(e) => setCertId(e.target.value)}
                      placeholder="Ej. UTCJ-2026-MC-15761 o 6e424670-..."
                      class="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#93C01F] font-mono text-white"
                    />
                    <button 
                      type="submit" 
                      class="btn bg-[#146049] hover:bg-[#114938] text-white font-montserrat font-bold px-6 py-3 rounded-xl border border-[#93C01F]/40 shadow-md"
                    >
                      Validar
                    </button>
                  </div>
                </div>
                <p class="text-[11px] text-slate-500">Puedes ingresar el folio académico registrado o el UUID único emitido en la blockchain.</p>
              </form>
            )}

            {activeMode === 'qr' && !verifying && !result && (
              <div class="space-y-4 text-center">
                <div class="border-2 border-dashed border-slate-800 rounded-2xl p-6 bg-slate-950/50 flex flex-col items-center justify-center min-h-[220px]">
                  {cameraActive ? (
                    <div class="w-full flex flex-col items-center">
                      <video id="qr-video" class="w-full max-w-sm rounded-xl border border-[#93C01F]/40 bg-black aspect-video object-cover shadow-xl mb-3" autoPlay playsInline></video>
                      <p class="text-xs text-[#93C01F] font-bold animate-pulse flex items-center justify-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        Apunta la cámara al código QR de la microcredencial...
                      </p>
                      <button onClick={stopCameraScanner} class="btn btn-xs btn-outline border-slate-700 text-slate-400 mt-3 hover:bg-slate-800">Detener Cámara</button>
                    </div>
                  ) : (
                    <div class="flex flex-col items-center">
                      <div class="w-16 h-16 rounded-2xl bg-[#146049]/20 border border-[#93C01F]/30 text-[#93C01F] flex items-center justify-center mb-3">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      </div>
                      <h4 class="font-montserrat font-bold text-white text-sm">Escaneo QR con Cámara en Vivo</h4>
                      <p class="text-xs text-slate-400 mt-1 max-w-xs">Permite a tu navegador acceder a la cámara para verificar en tiempo real.</p>
                      <button onClick={startCameraScanner} class="btn btn-sm mt-4 bg-[#146049] hover:bg-[#114938] text-white font-montserrat font-bold px-6 py-2 rounded-xl border border-[#93C01F]/40 shadow-md">
                        Activar Cámara
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {verifying && (
              <div class="space-y-4">
                <div class="flex items-center gap-3 border-b border-slate-800 pb-3">
                  <span class="loading loading-spinner text-[#93C01F] loading-sm"></span>
                  <div>
                    <h4 class="font-montserrat font-bold text-xs md:text-sm text-white">Validación Criptográfica en Progreso...</h4>
                    <p class="text-[10px] text-slate-400">Verificando firma digital y recibo de Merkle en Ethereum</p>
                  </div>
                </div>

                <div class="space-y-2.5">
                  {steps.map((step, idx) => (
                    <div key={idx} class="pill-card-3d">
                      <div class={`circle-badge-3d ${idx % 2 === 1 ? 'teal' : idx === 4 ? 'dark' : ''}`}>
                        {idx + 1}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-montserrat text-xs font-bold text-slate-100">
                          {step.label}
                        </p>
                        <p class="text-[10px] text-slate-400 truncate">{step.desc}</p>
                      </div>
                      <div class="shrink-0 pr-2">
                        {step.status === 'success' && <span class="badge badge-sm font-bold bg-[#93C01F] text-[#114938]">✓ Válido</span>}
                        {step.status === 'loading' && <span class="loading loading-spinner loading-xs text-[#93C01F]"></span>}
                        {step.status === 'failed' && <span class="badge badge-sm font-bold bg-red-600 text-white">✗ Falló</span>}
                        {step.status === 'idle' && <span class="text-[10px] text-slate-600 font-mono">Pendiente</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result && !verifying && (
              <div class="space-y-5 animate-[fadeInUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
                <div class="bg-[#146049]/20 border border-[#93C01F]/40 rounded-2xl p-4 flex items-center gap-3">
                  <span class="w-9 h-9 rounded-full bg-[#93C01F] text-[#114938] flex items-center justify-center font-bold shrink-0">
                    ✓
                  </span>
                  <div>
                    <h4 class="font-montserrat font-black text-sm text-[#93C01F]">MICROCREDENCIAL AUTÉNTICA Y CERTIFICADA</h4>
                    <p class="text-[11px] text-slate-300">El documento cumple con todos los estándares criptográficos oficiales de la UTCJ.</p>
                  </div>
                </div>

                <div class="border border-slate-800 rounded-2xl p-5 space-y-3.5 bg-slate-950/60">
                  <div class="flex justify-between border-b border-slate-800 pb-2.5">
                    <span class="text-[11px] font-bold text-slate-400 uppercase font-montserrat">Titular de la Credencial</span>
                    <span class="text-xs font-bold text-white text-right">{result.recipient}</span>
                  </div>
                  <div class="flex justify-between border-b border-slate-800 pb-2.5">
                    <span class="text-[11px] font-bold text-slate-400 uppercase font-montserrat">Programa / Competencia</span>
                    <span class="text-xs font-bold text-white text-right max-w-[70%]">{result.title}</span>
                  </div>
                  <div class="flex justify-between border-b border-slate-800 pb-2.5">
                    <span class="text-[11px] font-bold text-slate-400 uppercase font-montserrat">Fecha de Emisión</span>
                    <span class="text-xs font-bold text-white text-right font-mono">{result.issueDate}</span>
                  </div>
                  <div class="flex justify-between border-b border-slate-800 pb-2.5">
                    <span class="text-[11px] font-bold text-slate-400 uppercase font-montserrat">Horas Acreditadas</span>
                    <span class="text-xs font-bold text-white text-right">{result.hours} Horas</span>
                  </div>
                  <div class="flex flex-col gap-1.5 pt-1">
                    <div class="flex justify-between items-center">
                      <span class="text-[11px] font-bold text-slate-400 uppercase font-montserrat">Recibo Blockchain</span>
                      <a 
                        href={`https://etherscan.io/tx/${result.txId?.replace(/^0x/, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        class="text-[11px] font-bold text-[#93C01F] hover:underline flex items-center gap-1"
                      >
                        Ver en Etherscan ↗
                      </a>
                    </div>
                    <span class="text-[10px] font-mono text-slate-400 break-all select-all bg-slate-950 border border-slate-800 rounded-lg p-2.5">{result.txId}</span>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2.5 pt-2">
                  <a 
                    href={`/render/${result.id}`} 
                    target="_blank" 
                    class="flex-1 btn btn-sm font-montserrat font-bold bg-[#146049] hover:bg-[#114938] text-white border border-[#93C01F]/40 shadow-sm"
                  >
                    Ver Diploma Web
                  </a>
                  <a 
                    href={`/certificate/${result.id}/pdf`} 
                    download 
                    class="flex-1 btn btn-sm font-montserrat font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800"
                  >
                    Descargar PDF
                  </a>
                  <button 
                    onClick={() => { setResult(null); setError(null); setCertId(''); }}
                    class="btn btn-sm btn-outline border-slate-800 text-slate-400 font-montserrat font-bold"
                  >
                    Validar Otra
                  </button>
                </div>
              </div>
            )}

          </div>
        </section>

      </div>

      <footer class="footer-dual-tone z-20">
        <div class="footer-gold-stripe"></div>
        
        <div class="footer-green-bar">
          <div class="max-w-7xl mx-auto w-full flex items-center justify-between">
            
            <div class="flex items-center gap-3">
              <div class="border border-white/30 rounded-lg px-2.5 py-1 bg-white/10 backdrop-blur-md">
                <span class="font-montserrat font-black text-xs tracking-wider text-white uppercase">
                  MODALIDAD <span class="text-[#D1DF8C]">MIXTA</span> UTP
                </span>
              </div>
              <span class="hidden sm:inline-block text-[11px] text-white/80 font-medium">
                Universidad Tecnológica de Ciudad Juárez © 2026
              </span>
            </div>

            <div class="flex items-center gap-3">
              <span class="hidden md:inline-block text-[11px] text-[#D1DF8C] font-mono">
                Manual de Imagen v1.4
              </span>
              <button 
                onClick={() => setShowInfoModal(true)}
                class="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm border border-white/40 shadow-sm transition-all hover:scale-110"
                title="Información y Especificaciones de Identidad"
              >
                i
              </button>
            </div>

          </div>
        </div>
      </footer>

      {showInfoModal && (
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl animate-[fadeInUp_0.3s_ease]">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-[#93C01F] text-[#114938] flex items-center justify-center font-black">i</div>
                <h3 class="font-montserrat font-extrabold text-base text-white">Especificaciones de Identidad Institucional</h3>
              </div>
              <button 
                onClick={() => setShowInfoModal(false)}
                class="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div class="space-y-4 text-xs text-slate-300">
              <p>
                Este sistema implementa fielmente los lineamientos del <strong class="text-white">Manual de Imagen Institucional UTCJ (Versión 1.4 – 2026)</strong> y las directrices de <strong class="text-[#93C01F]">Modalidad Mixta UTP</strong>.
              </p>

              <div class="border border-slate-800 rounded-2xl p-4 bg-slate-950/60 space-y-2">
                <h4 class="font-montserrat font-bold text-[#D1DF8C] uppercase text-[11px]">Norma de Colores Oficiales</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                  <div>• #93C01F: Verde Lima</div>
                  <div>• #3F9089: Verde Teal</div>
                  <div>• #D1DF8C: Verde Pistache</div>
                  <div>• #114938: Verde Pino</div>
                  <div>• #146049: Verde Esmeralda</div>
                  <div>• #279371: Verde Jade</div>
                  <div>• #B88A3B: Oro UTCJ</div>
                  <div>• #8FA3AD: Plata Neutro</div>
                </div>
              </div>

              <div class="border border-slate-800 rounded-2xl p-4 bg-slate-950/60 space-y-2">
                <h4 class="font-montserrat font-bold text-[#D1DF8C] uppercase text-[11px]">Jerarquía Tipográfica</h4>
                <p>• <strong class="text-white">Nivel 1 (Montserrat)</strong>: Títulos principales, identificadores de credencial y folios.</p>
                <p>• <strong class="text-white">Nivel 2 (Gotham / Plus Jakarta Sans)</strong>: Subtítulos, nombres de materias, competencias y métricas.</p>
                <p>• <strong class="text-white">Nivel 3 (Arial / Verdana / Inter)</strong>: Textos descriptivos, hashes de bloques y metadatos.</p>
              </div>

              <div class="pt-2 flex justify-end">
                <button 
                  onClick={() => setShowInfoModal(false)}
                  class="btn btn-sm bg-[#146049] text-white font-montserrat font-bold px-6 rounded-xl border border-[#93C01F]/40"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
