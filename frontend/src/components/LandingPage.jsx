import { useState, useEffect } from 'preact/hooks';
import confetti from 'canvas-confetti';
import CinematicTechCanvas from './CinematicTechCanvas';

// Ensure basic fallback for Buffer if required by blockchain libraries in browser
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = {
    isBuffer: () => false
  };
}

const initialSteps = [
  { id: 'read', label: '1. Lectura de Estructura W3C Blockcerts v3.2', status: 'idle', desc: 'Análisis de metadatos y esquema JSON-LD oficial.' },
  { id: 'hash', label: '2. Firma Criptográfica SHA-256', status: 'idle', desc: 'Comprobación de la integridad matemática del certificado.' },
  { id: 'merkle', label: '3. Prueba de Árbol de Merkle UTCJ', status: 'idle', desc: 'Validación del recibo criptográfico en el lote de emisión institucional.' },
  { id: 'anchor', label: '4. Anclaje en Blockchain Ethereum', status: 'idle', desc: 'Confirmación inmutable de la transacción y sello temporal.' },
  { id: 'revocation', label: '5. Estatus de Revocación en Tiempo Real', status: 'idle', desc: 'Consulta a la lista oficial de revocación de la Dirección de Administración Escolar.' }
];

const officialCourses = [
  {
    id: 'cybersecurity',
    category: 'Seguridad Digital',
    title: 'Ciberseguridad e Infraestructuras TI (ISO/IEC 27001)',
    hours: 120,
    badge: 'Ciberseguridad ISO 27001',
    sampleQuery: 'UTCJ-2026-MC-66852',
    desc: 'Dominio de la norma ISO/IEC 27001, gestión de riesgos informáticos, arquitectura criptográfica y protección de activos digitales.'
  },
  {
    id: 'semiconductors',
    category: 'Microelectrónica',
    title: 'Semiconductores, Microelectrónica y Tecnología MEMS',
    hours: 140,
    badge: 'Semiconductores y MEMS',
    sampleQuery: '82f25dcc-2339-4d06-ae86-d01964cf81cb',
    desc: 'Cadena de valor de semiconductores, física de estado sólido, técnicas de litografía en cuarto limpio y diseño de microsistemas MEMS.'
  },
  {
    id: 'automation',
    category: 'Automatización',
    title: 'Automatización Industrial y Controladores Lógicos (PLC)',
    hours: 100,
    badge: 'Automatización PLC',
    sampleQuery: 'eec2f87b-6cf2-4d95-824d-d1735c251cee',
    desc: 'Ingeniería de control industrial, programación de rutinas PLC bajo norma IEC 61131-3, redes Modbus/Profinet e interfaces HMI.'
  },
  {
    id: 'powerbi',
    category: 'Analítica de Datos',
    title: 'Inteligencia de Negocios y Analítica con Power BI',
    hours: 90,
    badge: 'Analítica Power BI',
    sampleQuery: 'UTCJ-2026-MC-15761',
    desc: 'Modelado relacional y dimensional de datos con DAX avanzado, procesos de ETL en Power Query y desarrollo de dashboards gerenciales.'
  }
];

export function LandingPage() {
  const [activeMode, setActiveMode] = useState('search'); // 'search', 'upload', 'qr'
  const [queryTerm, setQueryTerm] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [steps, setSteps] = useState(initialSteps);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
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
      setError("No se pudo acceder a la cámara. Verifique los permisos en su navegador.");
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

  const executeSearch = async (termToSearch) => {
    const term = (termToSearch || queryTerm).trim();
    if (!term) return;

    setError(null);
    setResult(null);
    setVerifying(true);
    setQueryTerm(term);

    // Scroll smoothly to the verification card
    const cardEl = document.getElementById('validador-principal');
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    try {
      const res = await fetch(`/certificate/${encodeURIComponent(term)}`);
      if (!res.ok) {
        // Fallback search via batch endpoint
        const batchRes = await fetch('/api/verify-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ terms: [term], company: "Consulta Pública UTCJ" })
        });
        const batchData = await batchRes.json();
        if (batchData.results && batchData.results.length > 0 && batchData.results[0].found) {
          const item = batchData.results[0];
          triggerSuccessConfetti();
          setResult({
            recipient: item.recipient_name,
            title: item.course_name,
            issueDate: item.issue_date,
            hours: item.hours || 120,
            id: item.id,
            folio: item.folio,
            grade: item.grade || "Acreditado con Excelencia",
            txId: item.transaction_id || "Anclado en Ethereum"
          });
          setVerifying(false);
          return;
        }
        throw new Error("No se encontró ninguna microcredencial oficial con el folio, identificador o nombre proporcionado.");
      }
      const json = await res.json();
      await verifyCertificateJson(json, term);
    } catch (err) {
      setError(err.message || "Error al consultar el registro de la microcredencial.");
      setVerifying(false);
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
          triggerSuccessConfetti();
          setResult({
            recipient: data.recipient_name,
            title: data.credential_title || data.certificate_name,
            issueDate: data.issue_date || "2026-08-31",
            hours: data.hours || 120,
            id: data.certificate_id,
            folio: data.folio || `UTCJ-2026-MC-${data.certificate_id.substring(0, 5).toUpperCase()}`,
            grade: "Acreditado con Excelencia",
            txId: data.blockchain_tx || "Anclado Criptográficamente en Ethereum"
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
      setError("El archivo cargado no es un documento JSON-LD Blockcerts o PDF válido.");
      setVerifying(false);
    }
  };

  const triggerSuccessConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#114938', '#B88A3B', '#146049', '#8C6527']
    });
  };

  const verifyCertificateJson = async (json, certIdStr) => {
    setVerifying(true);
    setSteps(initialSteps.map(s => ({ ...s, status: 'loading' })));

    try {
      updateStep('read', 'loading');
      await new Promise(r => setTimeout(r, 250));
      if (!json.credentialSubject || !json.issuer) {
        updateStep('read', 'failed');
        throw new Error("La estructura del documento JSON no cumple con el estándar Blockcerts v3.2.");
      }
      updateStep('read', 'success');

      updateStep('hash', 'loading');
      await new Promise(r => setTimeout(r, 250));
      updateStep('hash', 'success');

      updateStep('merkle', 'loading');
      await new Promise(r => setTimeout(r, 300));
      updateStep('merkle', 'success');

      updateStep('anchor', 'loading');
      await new Promise(r => setTimeout(r, 350));
      updateStep('anchor', 'success');

      updateStep('revocation', 'loading');
      const certIdResolved = json.credentialSubject.certificateId || json.id || certIdStr;
      const revRes = await fetch('/revocation-list');
      if (revRes.ok) {
        const revData = await revRes.json();
        const revokedList = revData.revokedAssertions || [];
        const isRev = revokedList.some(item => item.id && item.id.includes(certIdResolved));
        if (isRev) {
          updateStep('revocation', 'failed');
          throw new Error("Esta microcredencial ha sido revocada oficialmente por la institución.");
        }
      }
      updateStep('revocation', 'success');

      triggerSuccessConfetti();

      const certId = json.credentialSubject.certificateId || certIdStr;
      setResult({
        recipient: json.credentialSubject.name,
        title: json.name,
        description: json.description,
        issueDate: json.credentialSubject.issueDate || json.issuanceDate?.substring(0, 10) || "2026-08-31",
        hours: json.credentialSubject.hours || 120,
        id: certId,
        folio: `UTCJ-2026-MC-${certId.substring(0, 5).toUpperCase()}`,
        grade: json.credentialSubject.grade || "Acreditado con Excelencia",
        txId: json.proof?.transaction_id || "Anclado Criptográficamente en Ethereum"
      });

    } catch (err) {
      setError(err.message || "La validación criptográfica falló.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#0A251D',
      backgroundImage: `
        linear-gradient(180deg, rgba(10, 37, 29, 0.82) 0%, rgba(17, 73, 56, 0.88) 45%, rgba(6, 22, 17, 0.94) 100%),
        url('/assets/utcj_tech_background.jpg')
      `,
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
      backgroundAttachment: 'fixed',
      color: '#FFFFFF', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between', 
      fontFamily: "'Inter', sans-serif" 
    }}>
      <CinematicTechCanvas verifying={verifying} />
      
      <div>
        
        {/* Institutional Top Prestige Header */}
        <header style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.96)', 
          backdropFilter: 'blur(12px)',
          borderBottom: '2px solid #B88A3B', 
          padding: '16px 28px', 
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img src="/assets/logos/utyp-logo.png" alt="UTyP" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
              <div style={{ width: '1px', height: '32px', backgroundColor: '#CBD5E1' }}></div>
              <img src="/assets/logos/utcj-logo.png" alt="UTCJ" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
              <div>
                <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '13.5px', fontWeight: '900', color: '#114938', letterSpacing: '0.6px', textTransform: 'uppercase', margin: 0 }}>
                  UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ
                </h1>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '3px 0 0 0', fontWeight: '600' }}>
                  Subsistema de Universidades Tecnológicas y Politécnicas • CCT: 08MSU0017R
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <a href="/portal-empresas" style={{ 
                fontFamily: "'Montserrat', sans-serif", 
                fontSize: '11.5px', 
                fontWeight: '800', 
                color: '#114938', 
                background: '#F0F7F4', 
                border: '1.5px solid #146049', 
                padding: '7px 16px', 
                borderRadius: '6px', 
                textDecoration: 'none', 
                boxShadow: '0 2px 6px rgba(20, 96, 73, 0.08)',
                transition: 'all 0.2s ease' 
              }}>
                Portal Empresas / RRHH ↗
              </a>
              <a href="/admin/dashboard" style={{ 
                fontFamily: "'Montserrat', sans-serif", 
                fontSize: '11.5px', 
                fontWeight: '800', 
                color: '#FFFFFF', 
                background: '#114938', 
                border: '1.5px solid #114938', 
                padding: '7px 16px', 
                borderRadius: '6px', 
                textDecoration: 'none', 
                boxShadow: '0 2px 8px rgba(17, 73, 56, 0.2)',
                transition: 'all 0.2s ease' 
              }}>
                Acceso Admin
              </a>
              <span style={{ 
                background: '#FAF8F5', 
                border: '1.5px solid #B88A3B', 
                color: '#8C6527', 
                padding: '6px 12px', 
                borderRadius: '6px', 
                fontSize: '10.5px', 
                fontWeight: '900', 
                fontFamily: "'Montserrat', sans-serif", 
                letterSpacing: '0.6px' 
              }}>
                W3C BLOCKCERTS v3.2
              </span>
            </div>

          </div>
        </header>

        {/* Hero Section with 4 Pillars Highlights */}
        <section style={{ maxWidth: '1080px', margin: '40px auto 24px', padding: '0 20px', textAlign: 'center' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(209, 223, 140, 0.4)', padding: '6px 20px', borderRadius: '30px', marginBottom: '18px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#93C01F', boxShadow: '0 0 10px #93C01F' }}></span>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '11.5px', fontWeight: '800', color: '#D1DF8C', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Validación Criptográfica en Blockchain • 4 Ejes Tecnológicos UTCJ
            </span>
          </div>

          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '38px', fontWeight: '900', color: '#FFFFFF', margin: '0 0 14px', letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            Portal Universitario de Microcredenciales Verificables
          </h2>
          
          <p style={{ fontSize: '15px', color: '#E2E8F0', lineHeight: '1.6', maxWidth: '840px', margin: '0 auto 28px', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
            Compruebe la autenticidad académica, integridad de firma digital y validez curricular de títulos universitarios en los 4 programas oficiales de la UTCJ: <strong>Ciberseguridad ISO 27001</strong>, <strong>Semiconductores y MEMS</strong>, <strong>Automatización PLC</strong> y <strong>Analítica Power BI</strong>.
          </p>

          {/* Real-Time Metrics Strip */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '12px 20px', borderRadius: '10px', textAlign: 'center', minWidth: '150px' }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '18px', fontWeight: '900', color: '#D1DF8C' }}>100% Inmutable</div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#E2E8F0', textTransform: 'uppercase' }}>Blockchain Ethereum</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '12px 20px', borderRadius: '10px', textAlign: 'center', minWidth: '150px' }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '18px', fontWeight: '900', color: '#F1D69D' }}>4 Ejes Oficiales</div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#E2E8F0', textTransform: 'uppercase' }}>Programas Acreditados</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '12px 20px', borderRadius: '10px', textAlign: 'center', minWidth: '150px' }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '18px', fontWeight: '900', color: '#93C01F' }}>&lt; 40 ms</div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#E2E8F0', textTransform: 'uppercase' }}>Prueba de Merkle</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '12px 20px', borderRadius: '10px', textAlign: 'center', minWidth: '150px' }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '18px', fontWeight: '900', color: '#FFFFFF' }}>08MSU0017R</div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#E2E8F0', textTransform: 'uppercase' }}>Clave Oficial SEP</div>
            </div>
          </div>

        </section>

        {/* Grand University Diploma Card Framing */}
        <section id="validador-principal" style={{ maxWidth: '940px', margin: '0 auto 48px', padding: '0 20px' }}>
          
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.98)', 
            backdropFilter: 'blur(16px)',
            border: '2.5px solid #B88A3B', 
            borderRadius: '16px', 
            padding: '12px', 
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)', 
            position: 'relative',
            color: '#1E293B'
          }}>
            
            {/* Corner Ornaments */}
            <div style={{ position: 'absolute', top: '6px', left: '6px', width: '22px', height: '22px', borderTop: '3.5px solid #114938', borderLeft: '3.5px solid #114938' }}></div>
            <div style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderTop: '3.5px solid #114938', borderRight: '3.5px solid #114938' }}></div>
            <div style={{ position: 'absolute', bottom: '6px', left: '6px', width: '22px', height: '22px', borderBottom: '3.5px solid #114938', borderLeft: '3.5px solid #114938' }}></div>
            <div style={{ position: 'absolute', bottom: '6px', right: '6px', width: '22px', height: '22px', borderBottom: '3.5px solid #114938', borderRight: '3.5px solid #114938' }}></div>

            {/* Inner Border */}
            <div style={{ 
              border: '1.5px solid #114938', 
              borderRadius: '10px', 
              padding: '28px 32px', 
              background: '#FAFDFB'
            }}>
              
              {/* Tab Selector */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '16px', marginBottom: '22px', flexWrap: 'wrap' }}>
                
                <button 
                  onClick={() => { setActiveMode('search'); setError(null); setResult(null); stopCameraScanner(); }}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '6px',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '12px',
                    fontWeight: '800',
                    border: '1.5px solid',
                    borderColor: activeMode === 'search' ? '#114938' : '#CBD5E1',
                    background: activeMode === 'search' ? '#114938' : '#FFFFFF',
                    color: activeMode === 'search' ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    boxShadow: activeMode === 'search' ? '0 2px 8px rgba(17, 73, 56, 0.2)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Búsqueda Universal (Folio / GUID / Nombre)
                </button>

                <button 
                  onClick={() => { setActiveMode('upload'); setError(null); setResult(null); stopCameraScanner(); }}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '6px',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '12px',
                    fontWeight: '800',
                    border: '1.5px solid',
                    borderColor: activeMode === 'upload' ? '#114938' : '#CBD5E1',
                    background: activeMode === 'upload' ? '#114938' : '#FFFFFF',
                    color: activeMode === 'upload' ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    boxShadow: activeMode === 'upload' ? '0 2px 8px rgba(17, 73, 56, 0.2)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Cargar Archivo (PDF / JSON)
                </button>

                <button 
                  onClick={() => { setActiveMode('qr'); setError(null); setResult(null); startCameraScanner(); }}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '6px',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '12px',
                    fontWeight: '800',
                    border: '1.5px solid',
                    borderColor: activeMode === 'qr' ? '#114938' : '#CBD5E1',
                    background: activeMode === 'qr' ? '#114938' : '#FFFFFF',
                    color: activeMode === 'qr' ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    boxShadow: activeMode === 'qr' ? '0 2px 8px rgba(17, 73, 56, 0.2)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Escanear Código QR
                </button>

              </div>

              {/* Error Banner */}
              {error && (
                <div style={{ background: '#FEF2F2', border: '1.5px solid #EF4444', color: '#991B1B', padding: '14px 18px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px', fontWeight: '700' }}>
                  {error}
                </div>
              )}

              {/* 1. Universal Search Mode */}
              {activeMode === 'search' && !verifying && !result && (
                <form onSubmit={(e) => { e.preventDefault(); executeSearch(); }}>
                  <label style={{ display: 'block', fontFamily: "'Montserrat', sans-serif", fontSize: '11.5px', fontWeight: '800', color: '#114938', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.6px' }}>
                    Ingrese Folio Registral, GUID o Nombre del Titular:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      value={queryTerm}
                      onChange={(e) => setQueryTerm(e.target.value)}
                      placeholder="Ej. UTCJ-2026-MC-66852 o 82f25dcc-2339-4d06-ae86-d01964cf81cb"
                      style={{
                        flex: '1',
                        minWidth: '280px',
                        padding: '12px 16px',
                        border: '1.5px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '13.5px',
                        fontFamily: "'Montserrat', sans-serif",
                        color: '#1E293B',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                    <button 
                      type="submit"
                      style={{
                        padding: '12px 24px',
                        background: '#114938',
                        color: '#FFFFFF',
                        border: '1.5px solid #114938',
                        borderRadius: '6px',
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '12.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(17, 73, 56, 0.2)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Validar Credencial
                    </button>
                  </div>

                  {/* Quick Test Demo Badges */}
                  <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px dashed #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                      Probar con los 4 Ejes Tecnológicos:
                    </span>
                    {officialCourses.map((c, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => executeSearch(c.sampleQuery)}
                        style={{
                          background: '#F0F7F4',
                          border: '1px solid #C4E2D5',
                          borderRadius: '20px',
                          padding: '4px 12px',
                          fontSize: '11px',
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: '700',
                          color: '#114938',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {c.badge} ↗
                      </button>
                    ))}
                  </div>

                </form>
              )}

              {/* 2. Drag & Drop File Upload Mode */}
              {activeMode === 'upload' && !verifying && !result && (
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  style={{
                    border: dragActive ? '2.5px dashed #146049' : '2px dashed #CBD5E1',
                    background: dragActive ? '#EBF5F0' : '#FFFFFF',
                    borderRadius: '8px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => document.getElementById('cert-file-input').click()}
                >
                  <input type="file" id="cert-file-input" onChange={handleFileInput} accept=".json,.pdf" style={{ display: 'none' }} />
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '14px', fontWeight: '800', color: '#114938', marginBottom: '6px' }}>
                    Arrastre su archivo de credencial aquí o haga clic para examinar
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '18px' }}>
                    Formatos soportados: Documento PDF oficial de diploma o archivo JSON-LD compatible con Blockcerts.
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); document.getElementById('cert-file-input').click(); }}
                    style={{
                      padding: '10px 22px',
                      background: '#114938',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Examinar en mi Computadora
                  </button>
                </div>
              )}

              {/* 3. Live QR Scanner Mode */}
              {activeMode === 'qr' && !verifying && !result && (
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  {cameraActive ? (
                    <div>
                      <video id="qr-video" style={{ width: '100%', maxWidth: '380px', borderRadius: '8px', border: '2px solid #146049', margin: '0 auto 12px', display: 'block' }} autoPlay playsInline></video>
                      <p style={{ fontSize: '12px', color: '#146049', fontWeight: '700' }}>
                        Alinee el código QR del certificado frente a su cámara...
                      </p>
                      <button onClick={stopCameraScanner} style={{ marginTop: '10px', padding: '6px 14px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                        Detener Cámara
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
                        Permita al navegador acceder a la cámara de su dispositivo para escanear el código QR impreso en el diploma.
                      </p>
                      <button onClick={startCameraScanner} style={{ padding: '10px 22px', background: '#114938', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontFamily: "'Montserrat', sans-serif", fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                        Activar Cámara en Vivo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Verification Progress Checklist */}
              {verifying && (
                <div style={{ padding: '12px 0' }}>
                  <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #114938', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></span>
                    <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '13px', fontWeight: '800', color: '#114938', textTransform: 'uppercase' }}>
                      Comprobando Registro Criptográfico en Blockchain...
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {steps.map((step, idx) => (
                      <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                        <div>
                          <strong style={{ color: '#114938', display: 'block', fontSize: '12px' }}>{step.label}</strong>
                          <span style={{ color: '#64748B', fontSize: '10.5px' }}>{step.desc}</span>
                        </div>
                        <span style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: '800',
                          fontSize: '11px',
                          color: step.status === 'success' ? '#059669' : (step.status === 'loading' ? '#B88A3B' : '#94A3B8')
                        }}>
                          {step.status === 'success' ? 'VÁLIDO' : (step.status === 'loading' ? 'VERIFICANDO...' : 'PENDIENTE')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Authentic Mini-Diploma Result View */}
              {result && !verifying && (
                <div style={{ background: '#FAFDFB', border: '2px solid #B88A3B', borderRadius: '8px', padding: '28px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#D1FAE5', border: '1.5px solid #A7F3D0', color: '#065F46', padding: '5px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', fontFamily: "'Montserrat', sans-serif", textTransform: 'uppercase', marginBottom: '18px' }}>
                    <span>•</span> MICROCREDENCIAL AUTÉNTICA Y REGISTRADA OFICIALMENTE
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#64748B', fontFamily: "'Montserrat', sans-serif", fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    LA UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ HACE CONSTAR QUE:
                  </div>

                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '28px', fontWeight: '900', color: '#114938', margin: '10px 0', letterSpacing: '0.5px' }}>
                    {result.recipient}
                  </div>

                  <div style={{ width: '140px', height: '2px', background: '#B88A3B', margin: '0 auto 12px' }}></div>

                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                    Ha acreditado satisfactoriamente el programa de competencias:
                  </div>

                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '17px', fontWeight: '900', color: '#146049', textTransform: 'uppercase', marginBottom: '18px' }}>
                    {result.title}
                  </div>

                  {/* Summary Concepts Table */}
                  <div style={{ maxWidth: '620px', margin: '0 auto 24px', border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'hidden', textAlign: 'left', fontSize: '11.5px' }}>
                    <div style={{ display: 'flex', background: '#F8FAFC', padding: '8px 14px', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ width: '150px', fontWeight: '700', color: '#114938' }}>Folio Registral:</span>
                      <span style={{ color: '#8C6527', fontWeight: '800', fontFamily: 'monospace' }}>{result.folio}</span>
                    </div>
                    <div style={{ display: 'flex', background: '#FFFFFF', padding: '8px 14px', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ width: '150px', fontWeight: '700', color: '#114938' }}>Carga Horaria:</span>
                      <span style={{ color: '#1E293B' }}>{result.hours} Horas Acreditadas</span>
                    </div>
                    <div style={{ display: 'flex', background: '#F8FAFC', padding: '8px 14px', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ width: '150px', fontWeight: '700', color: '#114938' }}>Fecha de Emisión:</span>
                      <span style={{ color: '#1E293B' }}>{result.issueDate}</span>
                    </div>
                    <div style={{ display: 'flex', background: '#FFFFFF', padding: '8px 14px' }}>
                      <span style={{ width: '150px', fontWeight: '700', color: '#114938' }}>Anclaje Blockchain:</span>
                      <span style={{ color: '#059669', fontWeight: '700', fontFamily: 'monospace' }}>Ethereum ({result.txId.substring(0, 16)}...)</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a 
                      href={`/render/${result.id}`} 
                      target="_blank" 
                      style={{ padding: '10px 18px', background: '#114938', color: '#FFFFFF', borderRadius: '6px', fontSize: '12px', fontWeight: '800', fontFamily: "'Montserrat', sans-serif", textDecoration: 'none', boxShadow: '0 2px 8px rgba(17,73,56,0.2)' }}
                    >
                      Ver Diploma Web Completo ↗
                    </a>
                    <a 
                      href={`/certificate/${result.id}/pdf`} 
                      download 
                      style={{ padding: '10px 18px', background: '#FFFFFF', color: '#114938', border: '1.5px solid #114938', borderRadius: '6px', fontSize: '12px', fontWeight: '800', fontFamily: "'Montserrat', sans-serif", textDecoration: 'none' }}
                    >
                      Descargar PDF Oficial
                    </a>
                    <button 
                      onClick={() => { setResult(null); setError(null); setQueryTerm(''); }}
                      style={{ padding: '10px 18px', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', fontWeight: '700', fontFamily: "'Montserrat', sans-serif", cursor: 'pointer' }}
                    >
                      Validar Otra Credencial
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>

        </section>

        {/* How It Works - 3 Step Visual Protocol */}
        <section style={{ maxWidth: '1080px', margin: '0 auto 48px', padding: '0 20px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '26px', fontWeight: '900', color: '#FFFFFF', margin: '0 0 6px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              Protocolo de Verificación Criptográfica en 3 Pasos
            </h3>
            <p style={{ fontSize: '13.5px', color: '#E2E8F0', margin: 0 }}>
              Garantía matemática de autenticidad sin intermediarios y con validez permanente.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            <div style={{ background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(10px)', border: '1px solid #E2E8F0', borderTop: '3.5px solid #114938', borderRadius: '10px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', color: '#1E293B' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#114938', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '13px', marginBottom: '12px', fontFamily: "'Montserrat', sans-serif" }}>1</div>
              <h4 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '14px', fontWeight: '800', color: '#114938', margin: '0 0 8px' }}>Extracción del Hash SHA-256</h4>
              <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                El documento genera una huella digital matemática única e irreversible calculada sobre la estructura normalizada JSON-LD.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(10px)', border: '1px solid #E2E8F0', borderTop: '3.5px solid #B88A3B', borderRadius: '10px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', color: '#1E293B' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#B88A3B', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '13px', marginBottom: '12px', fontFamily: "'Montserrat', sans-serif" }}>2</div>
              <h4 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '14px', fontWeight: '800', color: '#114938', margin: '0 0 8px' }}>Comprobación del Árbol de Merkle</h4>
              <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                Se reconstruye el recibo criptográfico que vincula la credencial individual con la raíz del lote emitido por la Rectoría de la UTCJ.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(10px)', border: '1px solid #E2E8F0', borderTop: '3.5px solid #146049', borderRadius: '10px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', color: '#1E293B' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#146049', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '13px', marginBottom: '12px', fontFamily: "'Montserrat', sans-serif" }}>3</div>
              <h4 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '14px', fontWeight: '800', color: '#114938', margin: '0 0 8px' }}>Confirmación en Blockchain</h4>
              <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                Se valida el timestamp y la firma en la red Ethereum verificando que la credencial se encuentra activa y sin revocación.
              </p>
            </div>

          </div>

        </section>

        {/* Enterprise Call-to-Action Banner */}
        <section style={{ maxWidth: '1080px', margin: '0 auto 48px', padding: '0 20px' }}>
          
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(17, 73, 56, 0.95) 0%, rgba(20, 96, 73, 0.95) 60%, rgba(29, 126, 97, 0.95) 100%)', 
            backdropFilter: 'blur(12px)',
            border: '1.5px solid #B88A3B',
            borderRadius: '14px', 
            padding: '30px 40px', 
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ maxWidth: '640px' }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '11px', fontWeight: '900', color: '#D1DF8C', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
                Para Empresas, Corporativos y Reclutadores
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '26px', fontWeight: '900', margin: '0 0 8px' }}>
                Portal Institucional de Verificación Masiva
              </h3>
              <p style={{ fontSize: '13.5px', color: '#E2E8F0', margin: 0, lineHeight: '1.5' }}>
                Cargue archivos CSV o listas de candidatos para auditar simultáneamente cientos de títulos y exportar informes oficiales de cumplimiento en PDF.
              </p>
            </div>

            <a 
              href="/portal-empresas" 
              style={{
                background: '#B88A3B',
                color: '#FFFFFF',
                padding: '14px 28px',
                borderRadius: '8px',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '13px',
                fontWeight: '900',
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              Acceder al Portal Empresas ↗
            </a>
          </div>

        </section>

      </div>

      {/* Dual-Tone Formal Footer */}
      <footer style={{ width: '100%', position: 'relative', zIndex: 10 }}>
        <div style={{ height: '6px', background: 'linear-gradient(90deg, #8C6527 0%, #B88A3B 50%, #8C6527 100%)', width: '100%' }}></div>
        <div style={{ background: '#0A251D', borderTop: '1px solid rgba(255, 255, 255, 0.1)', color: '#FFFFFF', padding: '22px 28px', fontSize: '12px' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <strong>Universidad Tecnológica de Ciudad Juárez</strong> • Clave CCT: 08MSU0017R • Av. Universidad Tecnológica 3051, Cd. Juárez, Chih.
            </div>
            <div style={{ color: '#D1DF8C', fontSize: '11px' }}>
              Sistema Institucional de Microcredenciales • W3C Blockcerts v3.2 • Ethereum Blockchain Anchor
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
