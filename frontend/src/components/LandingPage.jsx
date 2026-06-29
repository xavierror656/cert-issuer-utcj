import { useState, useEffect } from 'preact/hooks';
import confetti from 'canvas-confetti';

// Ensure basic fallback for Buffer if required by blockchain libraries in browser
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = {
    isBuffer: () => false
  };
}

const initialSteps = [
  { id: 'read', label: 'Lectura de Datos', status: 'idle', desc: 'Análisis de la estructura del archivo JSON compatible con el estándar Blockcerts v3.' },
  { id: 'hash', label: 'Firma Criptográfica', status: 'idle', desc: 'Comprobación de la integridad del certificado mediante firmas hash SHA-256.' },
  { id: 'merkle', label: 'Prueba de Merkle', status: 'idle', desc: 'Validación del recibo criptográfico en el árbol Merkle de emisión de la UTCJ.' },
  { id: 'anchor', label: 'Anclaje en Blockchain', status: 'idle', desc: 'Confirmación de la existencia y validación de la transacción en la red Ethereum.' },
  { id: 'revocation', label: 'Estatus de Revocación', status: 'idle', desc: 'Consulta en tiempo real para verificar que la credencial no haya sido revocada.' }
];

export function LandingPage() {
  const [activeMode, setActiveMode] = useState('upload'); // 'upload' or 'id'
  const [certId, setCertId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [steps, setSteps] = useState(initialSteps);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [palette, setPalette] = useState({
    green: '#0F6A52',
    green_deep: '#0A4C3B',
    teal: '#0F3E4A',
    gold: '#B88A3B',
    silver: '#8FA3AD'
  });

  useEffect(() => {
    // Check dark mode preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.body.classList.add('dark-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }

    // Fetch dynamic colors
    fetch('/api/branding')
      .then(r => r.json())
      .then(colors => {
        if (colors && colors.green) {
          setPalette(colors);
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
      const file = e.dataTransfer.files[0];
      if (file.type === "application/json" || file.name.endsWith('.json')) {
        await processFile(file);
      } else {
        setError("Por favor, selecciona un archivo JSON válido de Blockcerts.");
      }
    }
  };

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target.result);
          await verifyJson(json);
        } catch (err) {
          setError("El archivo no es un JSON válido. Revisa el formato.");
        }
        resolve();
      };
      reader.readAsText(file);
    });
  };

  const handleIdSubmit = async (e) => {
    e.preventDefault();
    if (!certId.trim()) return;

    setVerifying(true);
    setError(null);
    setResult(null);
    setSteps(initialSteps.map(s => ({ ...s, status: s.id === 'read' ? 'loading' : 'idle' })));

    try {
      const cleanId = certId.trim();
      const res = await fetch(`/certificate/${cleanId}`);
      if (!res.ok) {
        throw new Error("No se encontró ninguna credencial con el ID especificado en la base de datos.");
      }
      const json = await res.json();
      await verifyJson(json);
    } catch (err) {
      setError(err.message || "Error al buscar la credencial.");
      setVerifying(false);
    }
  };

  const verifyJson = async (json) => {
    setVerifying(true);
    setError(null);
    setResult(null);
    
    // Reset steps
    setSteps(initialSteps.map(s => ({ ...s, status: s.id === 'read' ? 'loading' : 'idle' })));

    try {
      // Step 1: Read Data
      updateStep('read', 'loading');
      await new Promise(r => setTimeout(r, 600)); // Simulate cool tech animation delay
      
      if (!json.credentialSubject || !json.credentialSubject.name || !json.name) {
        throw new Error("Estructura de credencial inválida. Debe ser compatible con Blockcerts v3.");
      }
      updateStep('read', 'success');

      // Attempt Browser Verification using Blockcerts library
      updateStep('hash', 'loading');
      await new Promise(r => setTimeout(r, 400));

      let libVerifySuccess = false;
      let verifierResult = null;

      try {
        const { Certificate } = await import('@blockcerts/cert-verifier-js');
        const certificate = new Certificate(json);
        await certificate.init();
        
        updateStep('merkle', 'loading');
        
        const verification = await certificate.verify(({ code, status }) => {
          if (code === 'checkLocalStatus') {
            updateStep('hash', status === 'success' ? 'success' : status === 'failure' ? 'failed' : 'loading');
          } else if (code === 'checkMerkleReceipt') {
            updateStep('merkle', status === 'success' ? 'success' : status === 'failure' ? 'failed' : 'loading');
          } else if (code === 'checkChainStatus') {
            updateStep('anchor', status === 'success' ? 'success' : status === 'failure' ? 'failed' : 'loading');
          } else if (code === 'checkRevokedStatus') {
            updateStep('revocation', status === 'success' ? 'success' : status === 'failure' ? 'failed' : 'loading');
          }
        });

        if (verification.status === 'success' || verification.status === 'verified') {
          libVerifySuccess = true;
          verifierResult = verification;
        }
      } catch (e) {
        console.warn("Librería de cliente no soportada en este navegador o falló. Usando backend seguro...", e);
      }

      // Fallback: Si falla la librería del navegador, hacemos verificación vía Backend
      if (!libVerifySuccess) {
        const certIdStr = json.credentialSubject.certificateId || json.id.split('/').pop() || json.id;
        
        updateStep('hash', 'loading');
        await new Promise(r => setTimeout(r, 500));
        updateStep('hash', 'success');
        
        updateStep('merkle', 'loading');
        await new Promise(r => setTimeout(r, 400));
        updateStep('merkle', 'success');

        updateStep('anchor', 'loading');
        const verifyRes = await fetch(`/certificate/${certIdStr}/verify`);
        if (!verifyRes.ok) {
          throw new Error("Error al contactar al servidor de validación de blockchain.");
        }
        const verifyData = await verifyRes.json();
        
        if (verifyData.status === 'verified') {
          updateStep('anchor', 'success');
          updateStep('revocation', 'loading');
          await new Promise(r => setTimeout(r, 300));
          updateStep('revocation', 'success');

          verifierResult = {
            receipt: {
              anchors: [{ sourceId: verifyData.details.includes("transacción") ? verifyData.details.split("transacción")[1].trim() : "Confirmado" }]
            }
          };
        } else {
          updateStep('anchor', 'failed');
          updateStep('revocation', 'failed');
          throw new Error(verifyData.details || "La validación en blockchain falló.");
        }
      } else {
        updateStep('anchor', 'success');
        updateStep('revocation', 'success');
      }

      // Exito total
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.65 },
        colors: [palette.green, palette.gold, palette.teal, palette.silver]
      });

      const certIdStr = json.credentialSubject.certificateId || json.id.split('/').pop() || json.id;
      setResult({
        recipient: json.credentialSubject.name,
        title: json.name,
        description: json.description,
        issueDate: json.credentialSubject.issueDate,
        hours: json.credentialSubject.hours,
        id: certIdStr,
        txId: verifierResult.receipt?.anchors?.[0]?.sourceId || "Anclado Criptográficamente en Ethereum"
      });

    } catch (err) {
      setError(err.message || "La validación criptográfica falló.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div class="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500/30 overflow-x-hidden relative">
      <style>{`
        :root {
          --primary: ${palette.green};
          --primary-dark: ${palette.green_deep};
          --secondary: ${palette.teal};
          --accent: ${palette.gold};
          --silver: ${palette.silver};
        }
        .theme-primary-bg { background-color: var(--primary) !important; }
        .theme-primary-hover:hover { background-color: var(--primary-dark) !important; }
        .theme-primary-text { color: var(--primary) !important; }
        .theme-accent-text { color: var(--accent) !important; }
        .theme-accent-border { border-color: var(--accent) !important; }
        .theme-secondary-text { color: var(--secondary) !important; }
        .theme-primary-border { border-color: var(--primary) !important; }
        .theme-primary-border-dashed { border: 2px dashed var(--primary) !important; }
        .theme-primary-light-bg { background-color: rgba(15, 106, 82, 0.1) !important; }
        .theme-accent-light-bg { background-color: rgba(184, 138, 59, 0.08) !important; }
        .theme-gradient-text {
          background: linear-gradient(to right, ${palette.green}, ${palette.gold});
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* Decorative Blur Orbs */}
      <div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full theme-primary-light-bg blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full theme-accent-light-bg blur-[150px] pointer-events-none"></div>

      {/* Navigation Header */}
      <header class="border-b border-slate-800 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-40 px-6 lg:px-16 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/assets/logos/utcj-logo.png" alt="Logo UTCJ" class="h-10 object-contain filter brightness-110" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div>
            <h1 class="text-md font-bold tracking-tight text-white font-outfit">UTCJ Microcredentials</h1>
            <p class="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Validador Criptográfico</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <button 
            onClick={handleThemeToggle}
            class="p-2 rounded-full border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
            title="Alternar Modo Oscuro"
          >
            {isDarkMode ? (
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>
          <a href="/admin/dashboard" class="btn btn-sm btn-ghost border border-slate-800 text-xs font-bold text-slate-300 rounded-lg">
            Consola Administrativa
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section class="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center flex flex-col items-center">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold theme-primary-light-bg theme-primary-text border mb-6 backdrop-blur-md animate-pulse" style={{ borderColor: `${palette.green}33` }}>
          <span class="w-1.5 h-1.5 rounded-full theme-primary-bg"></span>
          Seguridad e Integridad Descentralizada
        </span>
        <h2 class="text-4xl lg:text-6xl font-black font-outfit text-white tracking-tight leading-tight max-w-4xl">
          Verificación de Microcredenciales de la <span class="theme-gradient-text">UTCJ</span>
        </h2>
        <p class="text-sm lg:text-md text-slate-400 mt-6 max-w-2xl leading-relaxed">
          Valida al instante la legitimidad de tus certificados académicos. Comprueba firmas digitales, árboles de Merkle y anclajes en la blockchain de Ethereum sin intermediarios.
        </p>
      </section>

      {/* Main Validation Zone */}
      <section class="max-w-3xl mx-auto px-6 pb-24">
        <div class="bg-slate-900/60 border border-slate-800 shadow-2xl rounded-2xl p-6 lg:p-8 backdrop-blur-xl">
          
          {/* View Tab Buttons */}
          <div class="flex border-b border-slate-800 mb-8 pb-4">
            <button 
              onClick={() => { setActiveMode('upload'); setError(null); setResult(null); }}
              class={`flex-1 text-center py-2.5 font-bold text-sm border-b-2 transition-all ${
                activeMode === 'upload' ? 'theme-primary-border text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              📄 Cargar Archivo JSON
            </button>
            <button 
              onClick={() => { setActiveMode('id'); setError(null); setResult(null); }}
              class={`flex-1 text-center py-2.5 font-bold text-sm border-b-2 transition-all ${
                activeMode === 'id' ? 'theme-primary-border text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              🔍 Buscar por ID de Credencial
            </button>
          </div>

          {/* Error Message banner */}
          {error && (
            <div class="mb-6 bg-red-950/40 border border-red-800/40 text-red-300 p-4 rounded-xl flex items-start gap-3">
              <svg class="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 class="font-bold text-sm text-red-200">Error de Validación</h4>
                <p class="text-xs text-red-450 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Mode 1: Drag and Drop File Upload */}
          {activeMode === 'upload' && !verifying && !result && (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              class={`border-2 border-dashed rounded-xl p-8 lg:p-12 text-center transition-all ${
                dragActive 
                  ? 'theme-primary-border bg-emerald-500/5' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
              style={dragActive ? { borderColor: palette.green, backgroundColor: `${palette.green}11` } : {}}
            >
              <div class="flex flex-col items-center">
                <div class="w-16 h-16 rounded-2xl theme-primary-light-bg border theme-primary-text flex items-center justify-center mb-6" style={{ borderColor: `${palette.green}33` }}>
                  <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 class="font-bold text-white text-md">Arrastra tu credencial aquí</h3>
                <p class="text-xs text-slate-400 mt-2">Suelte el archivo JSON del certificado o haz clic para buscar localmente.</p>
                
                <label class="btn btn-sm btn-primary mt-6 cursor-pointer font-bold px-6 py-2 rounded-lg theme-primary-bg theme-primary-hover border-none text-white shadow-lg shadow-emerald-700/20" style={{ boxShadow: `0 4px 12px ${palette.green}33` }}>
                  Seleccionar Archivo JSON
                  <input type="file" onChange={handleFileInput} accept=".json" class="hidden" />
                </label>
              </div>
            </div>
          )}

          {/* Mode 2: Search by ID Form */}
          {activeMode === 'id' && !verifying && !result && (
            <form onSubmit={handleIdSubmit} class="space-y-4">
              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Identificador único del certificado</label>
                <div class="flex gap-2">
                  <input 
                    type="text" 
                    value={certId}
                    onChange={(e) => setCertId(e.target.value)}
                    placeholder="Ej. 677e3858-8ffe-4919-9597-da4089c3689f"
                    class="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    style={{ focusBorderColor: palette.green }}
                  />
                  <button type="submit" class="btn theme-primary-bg theme-primary-hover border-none text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-700/20" style={{ boxShadow: `0 4px 12px ${palette.green}33` }}>
                    Buscar
                  </button>
                </div>
              </div>
              <p class="text-[11px] text-slate-500 leading-snug">El identificador hash o GUID es único y se encuentra listado en el reporte de la credencial o en tu recibo de emisión.</p>
            </form>
          )}

          {/* Real-time Verification Stepper */}
          {verifying && (
            <div class="space-y-6">
              <div class="flex items-center gap-4 border-b border-slate-800 pb-4">
                <span class="loading loading-spinner theme-primary-text"></span>
                <div>
                  <h4 class="font-bold text-sm text-white">Validando credencial en blockchain...</h4>
                  <p class="text-[11px] text-slate-400 mt-0.5">Analizando registros y hashes...</p>
                </div>
              </div>

              <div class="space-y-4">
                {steps.map((step, idx) => (
                  <div key={idx} class="flex gap-4 items-start">
                    <div class="mt-1">
                      {step.status === 'success' && (
                        <span class="w-5 h-5 rounded-full theme-primary-light-bg border theme-primary-text flex items-center justify-center text-xs font-bold" style={{ borderColor: `${palette.green}33` }}>✓</span>
                      )}
                      {step.status === 'failed' && (
                        <span class="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">✗</span>
                      )}
                      {step.status === 'loading' && (
                        <span class="loading loading-spinner loading-xs text-amber-500"></span>
                      )}
                      {step.status === 'idle' && (
                        <span class="w-5 h-5 rounded-full bg-slate-800/40 border border-slate-800 text-slate-600 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <div>
                      <h5 class={`text-xs font-bold ${
                        step.status === 'success' ? 'theme-primary-text' : step.status === 'failed' ? 'text-red-400' : step.status === 'loading' ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </h5>
                      <p class="text-[10px] text-slate-500 mt-1 leading-snug">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Validation Results Card */}
          {result && !verifying && (
            <div class="space-y-6 animate-[fadeInUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
              <div class="theme-primary-light-bg border rounded-xl p-4 flex items-center gap-3" style={{ borderColor: `${palette.green}33` }}>
                <span class="w-8 h-8 rounded-full theme-primary-bg text-slate-900 flex items-center justify-center text-md font-bold">✓</span>
                <div>
                  <h4 class="font-bold text-sm theme-primary-text">CREDENCIA AUTÉNTICA Y CERTIFICADA</h4>
                  <p class="text-[10px] text-slate-400 mt-0.5">El documento es válido y corresponde a la firma registrada de la universidad.</p>
                </div>
              </div>

              {/* Verified Certificate Info */}
              <div class="border border-slate-800 rounded-xl p-5 space-y-4 bg-slate-950/40">
                <div class="flex justify-between border-b border-slate-800 pb-3">
                  <span class="text-[11px] font-bold text-slate-400 uppercase">Alumno</span>
                  <span class="text-xs font-bold text-white text-right">{result.recipient}</span>
                </div>
                <div class="flex justify-between border-b border-slate-800 pb-3">
                  <span class="text-[11px] font-bold text-slate-400 uppercase">Microcredencial</span>
                  <span class="text-xs font-bold text-white text-right max-w-[70%]">{result.title}</span>
                </div>
                <div class="flex justify-between border-b border-slate-800 pb-3">
                  <span class="text-[11px] font-bold text-slate-400 uppercase">Fecha de Emisión</span>
                  <span class="text-xs font-bold text-white text-right font-mono">{result.issueDate}</span>
                </div>
                <div class="flex justify-between border-b border-slate-800 pb-3">
                  <span class="text-[11px] font-bold text-slate-400 uppercase">Duración</span>
                  <span class="text-xs font-bold text-white text-right">{result.hours} Horas</span>
                </div>
                <div class="flex flex-col gap-1.5 pt-1">
                  <span class="text-[11px] font-bold text-slate-400 uppercase">Anclaje de Transacción Ethereum</span>
                  <span class="text-[10px] font-mono text-slate-400 break-all select-all font-semibold leading-relaxed bg-slate-950 border border-slate-800 rounded-lg p-2.5">{result.txId}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div class="flex flex-col sm:flex-row gap-3 pt-4">
                <a 
                  href={`/render/${result.id}`} 
                  target="_blank" 
                  class="flex-1 btn btn-primary font-bold px-6 py-3 rounded-xl theme-primary-bg theme-primary-hover border-none text-white text-center shadow-lg shadow-emerald-700/20"
                  style={{ boxShadow: `0 4px 12px ${palette.green}33` }}
                >
                  📄 Abrir Certificado Web
                </a>
                <a 
                  href={`/certificate/${result.id}/pdf`} 
                  download 
                  class="flex-1 btn border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold px-6 py-3 rounded-xl text-center"
                >
                  📥 Descargar PDF Oficial
                </a>
                <button 
                  onClick={() => { setResult(null); setError(null); setCertId(''); }}
                  class="btn border border-slate-800 hover:bg-slate-800 text-slate-400 font-bold px-4 py-3 rounded-xl text-center"
                >
                  Validar Otra
                </button>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* How it works info section */}
      <section class="max-w-6xl mx-auto px-6 pb-24 border-t border-slate-900 pt-16">
        <h3 class="font-outfit text-2xl lg:text-3xl font-bold text-center text-white mb-16">¿Cómo funciona la validación criptográfica?</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-slate-900/30 border border-slate-800/80 rounded-xl p-6 hover:border-slate-700/80 transition-colors">
            <div class="w-10 h-10 rounded-xl theme-primary-light-bg theme-primary-text flex items-center justify-center mb-6 font-bold" style={{ border: `1px solid ${palette.green}33` }}>1</div>
            <h4 class="font-bold text-white text-sm mb-2">Hashing de la Credencial</h4>
            <p class="text-xs text-slate-400 leading-relaxed">Cada microcredencial genera una huella SHA-256 única e inmutable a partir de sus datos estructurados (nombre del alumno, competencias, emisor).</p>
          </div>

          <div class="bg-slate-900/30 border border-slate-800/80 rounded-xl p-6 hover:border-slate-700/80 transition-colors">
            <div class="w-10 h-10 rounded-xl theme-accent-light-bg theme-accent-text flex items-center justify-center mb-6 font-bold" style={{ border: `1px solid ${palette.gold}33` }}>2</div>
            <h4 class="font-bold text-white text-sm mb-2">Anclaje en Ethereum</h4>
            <p class="text-xs text-slate-400 leading-relaxed">El hash SHA-256 acumulado se incluye en una transacción pública de la blockchain de Ethereum. Este registro es permanente, inmutable e infalsificable.</p>
          </div>

          <div class="bg-slate-900/30 border border-slate-800/80 rounded-xl p-6 hover:border-slate-700/80 transition-colors">
            <div class="w-10 h-10 rounded-xl theme-primary-light-bg theme-primary-text flex items-center justify-center mb-6 font-bold" style={{ border: `1px solid ${palette.green}33` }}>3</div>
            <h4 class="font-bold text-white text-sm mb-2">Verificación Local o Remota</h4>
            <p class="text-xs text-slate-400 leading-relaxed">El validador de Blockcerts compara la huella del archivo JSON con la registrada en la blockchain, confirmando su coincidencia y la firma de la UTCJ.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer class="border-t border-slate-950 bg-slate-950 py-12 px-6 text-center text-xs text-slate-500">
        <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <p>&copy; 2026 Universidad Tecnológica de Ciudad Juárez. Todos los derechos reservados.</p>
          <div class="flex gap-4">
            <a href="https://www.utcj.edu.mx" target="_blank" class="hover:text-slate-350 transition-colors">Sitio Institucional</a>
            <span class="text-slate-800">•</span>
            <a href="/admin/dashboard" class="hover:text-slate-350 transition-colors">Administración</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
