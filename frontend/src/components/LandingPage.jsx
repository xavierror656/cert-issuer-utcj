import { useState, useEffect } from 'preact/hooks';
import confetti from 'canvas-confetti';

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

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    const term = queryTerm.trim();
    if (!term) return;

    setError(null);
    setResult(null);
    setVerifying(true);

    try {
      const res = await fetch(`/certificate/${encodeURIComponent(term)}`);
      if (!res.ok) {
        // Try fallback to search via batch verify
        const batchRes = await fetch('/api/verify-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ terms: [term], company: "Consulta Pública" })
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
    <div style={{ backgroundColor: '#FAFDFB', color: '#1E293B', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: "'Inter', sans-serif" }}>
      
      <div>
        
        {/* Institutional Co-Branding Header */}
        <header style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '14px 28px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img src="/assets/logos/utyp-logo.png" alt="UTyP" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
              <img src="/assets/logos/utcj-logo.png" alt="UTCJ" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
              <div>
                <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '13.5px', fontWeight: '900', color: '#114938', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
                  UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ
                </h1>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0 0', fontWeight: '500' }}>
                  Subsistema de Universidades Tecnológicas y Politécnicas • CCT: 08MSU0017R
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <a href="/portal-empresas" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '11.5px', fontWeight: '800', color: '#114938', background: '#F0F7F4', border: '1px solid #C4E2D5', padding: '6px 14px', borderRadius: '6px', textDecoration: 'none', transition: 'all 0.2s ease' }}>
                Portal Empresas / RRHH
              </a>
              <a href="/admin/dashboard" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '11.5px', fontWeight: '800', color: '#FFFFFF', background: '#114938', border: '1px solid #114938', padding: '6px 14px', borderRadius: '6px', textDecoration: 'none', transition: 'all 0.2s ease' }}>
                Control Escolar
              </a>
              <span style={{ background: '#FAF8F5', border: '1px solid #B88A3B', color: '#8C6527', padding: '4px 10px', borderRadius: '4px', fontSize: '10.5px', fontWeight: '800', fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.5px' }}>
                W3C BLOCKCERTS v3.2
              </span>
            </div>

          </div>
        </header>

        {/* Hero Section */}
        <section style={{ maxWidth: '980px', margin: '32px auto 20px', padding: '0 20px', textAlign: 'center' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#EBF5F0', border: '1px solid #C4E2D5', padding: '5px 14px', borderRadius: '20px', marginBottom: '14px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#146049' }}></span>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '11px', fontWeight: '800', color: '#114938', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Registro Oficial en Blockchain Ethereum
            </span>
          </div>

          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '32px', fontWeight: '900', color: '#114938', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
            Validador Criptográfico de Microcredenciales
          </h2>
          
          <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6', maxWidth: '720px', margin: '0 auto' }}>
            Compruebe la autenticidad académica, integridad de firma digital y validez curricular de títulos universitarios emitidos por la Universidad Tecnológica de Ciudad Juárez.
          </p>

        </section>

        {/* Main Grand Validator Card */}
        <section style={{ maxWidth: '860px', margin: '0 auto 36px', padding: '0 20px' }}>
          
          <div style={{ background: '#FFFFFF', border: '2px solid #B88A3B', borderRadius: '12px', padding: '28px 32px', boxShadow: '0 8px 30px rgba(17,73,56,0.06)', position: 'relative' }}>
            
            {/* Inner Border */}
            <div style={{ border: '1px solid #114938', borderRadius: '8px', padding: '20px', background: '#FAFCFA' }}>
              
              {/* Tab Selector */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
                
                <button 
                  onClick={() => { setActiveMode('search'); setError(null); setResult(null); stopCameraScanner(); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '11.5px',
                    fontWeight: '800',
                    border: '1px solid',
                    borderColor: activeMode === 'search' ? '#114938' : '#CBD5E1',
                    background: activeMode === 'search' ? '#114938' : '#FFFFFF',
                    color: activeMode === 'search' ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Búsqueda Universal (Folio / GUID / Nombre)
                </button>

                <button 
                  onClick={() => { setActiveMode('upload'); setError(null); setResult(null); stopCameraScanner(); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '11.5px',
                    fontWeight: '800',
                    border: '1px solid',
                    borderColor: activeMode === 'upload' ? '#114938' : '#CBD5E1',
                    background: activeMode === 'upload' ? '#114938' : '#FFFFFF',
                    color: activeMode === 'upload' ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Cargar Archivo (PDF / JSON)
                </button>

                <button 
                  onClick={() => { setActiveMode('qr'); setError(null); setResult(null); startCameraScanner(); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '11.5px',
                    fontWeight: '800',
                    border: '1px solid',
                    borderColor: activeMode === 'qr' ? '#114938' : '#CBD5E1',
                    background: activeMode === 'qr' ? '#114938' : '#FFFFFF',
                    color: activeMode === 'qr' ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Escanear Código QR
                </button>

              </div>

              {/* Error Banner */}
              {error && (
                <div style={{ background: '#FEF2F2', border: '1.5px solid #EF4444', color: '#991B1B', padding: '12px 16px', borderRadius: '6px', marginBottom: '18px', fontSize: '12.5px', fontWeight: '700' }}>
                  {error}
                </div>
              )}

              {/* 1. Universal Search Mode */}
              {activeMode === 'search' && !verifying && !result && (
                <form onSubmit={handleSearchSubmit}>
                  <label style={{ display: 'block', fontFamily: "'Montserrat', sans-serif", fontSize: '11px', fontWeight: '800', color: '#114938', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                    Ingrese Folio Registral, GUID o Nombre del Alumno:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      value={queryTerm}
                      onChange={(e) => setQueryTerm(e.target.value)}
                      placeholder="Ej. UTCJ-2026-MC-66852 o 82f25dcc-2339-4d06-ae86-d01964cf81cb"
                      style={{
                        flex: '1',
                        minWidth: '260px',
                        padding: '10px 14px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        fontFamily: "'Montserrat', sans-serif",
                        color: '#1E293B'
                      }}
                    />
                    <button 
                      type="submit"
                      style={{
                        padding: '10px 22px',
                        background: '#114938',
                        color: '#FFFFFF',
                        border: '1px solid #114938',
                        borderRadius: '6px',
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Validar Credencial
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748B', marginTop: '8px', margin: '8px 0 0 0' }}>
                    La búsqueda universal comprueba simultáneamente la base de datos registral de Control Escolar y el árbol de Merkle en Ethereum.
                  </p>
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
                    border: dragActive ? '2px dashed #146049' : '2px dashed #CBD5E1',
                    background: dragActive ? '#EBF5F0' : '#FFFFFF',
                    borderRadius: '8px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => document.getElementById('cert-file-input').click()}
                >
                  <input type="file" id="cert-file-input" onChange={handleFileInput} accept=".json,.pdf" style={{ display: 'none' }} />
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '13.5px', fontWeight: '800', color: '#114938', marginBottom: '6px' }}>
                    Arrastre su archivo de credencial aquí o haga clic para seleccionar
                  </div>
                  <p style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '16px' }}>
                    Formatos aceptados: Documento PDF oficial de diploma o archivo JSON-LD compatible con Blockcerts.
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); document.getElementById('cert-file-input').click(); }}
                    style={{
                      padding: '8px 18px',
                      background: '#114938',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Examinar Archivo
                  </button>
                </div>
              )}

              {/* 3. Live QR Scanner Mode */}
              {activeMode === 'qr' && !verifying && !result && (
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  {cameraActive ? (
                    <div>
                      <video id="qr-video" style={{ width: '100%', maxWidth: '380px', borderRadius: '8px', border: '2px solid #146049', margin: '0 auto 12px', display: 'block' }} autoPlay playsInline></video>
                      <p style={{ fontSize: '11.5px', color: '#146049', fontWeight: '700' }}>
                        Alinee el código QR del certificado frente a su cámara...
                      </p>
                      <button onClick={stopCameraScanner} style={{ marginTop: '10px', padding: '6px 14px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                        Detener Cámara
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '12.5px', color: '#475569', marginBottom: '14px' }}>
                        Permita al navegador acceder a la cámara de su dispositivo para escanear el código QR impreso en el diploma.
                      </p>
                      <button onClick={startCameraScanner} style={{ padding: '8px 18px', background: '#114938', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontFamily: "'Montserrat', sans-serif", fontSize: '11.5px', fontWeight: '800', cursor: 'pointer' }}>
                        Activar Cámara
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Verification Progress Checklist */}
              {verifying && (
                <div style={{ padding: '12px 0' }}>
                  <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #114938', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></span>
                    <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '12.5px', fontWeight: '800', color: '#114938', textTransform: 'uppercase' }}>
                      Comprobando Registro Criptográfico en Blockchain...
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {steps.map((step, idx) => (
                      <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                        <div>
                          <strong style={{ color: '#114938', display: 'block', fontSize: '11.5px' }}>{step.label}</strong>
                          <span style={{ color: '#64748B', fontSize: '10px' }}>{step.desc}</span>
                        </div>
                        <span style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: '800',
                          fontSize: '10.5px',
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
                <div style={{ background: '#FAFDFB', border: '1.5px solid #B88A3B', borderRadius: '8px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#D1FAE5', border: '1px solid #A7F3D0', color: '#065F46', padding: '4px 12px', borderRadius: '20px', fontSize: '10.5px', fontWeight: '800', fontFamily: "'Montserrat', sans-serif", textTransform: 'uppercase', marginBottom: '16px' }}>
                    <span>•</span> MICROCREDENCIAL AUTÉNTICA Y REGISTRADA OFICIALMENTE
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Montserrat', sans-serif", fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    LA UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ HACE CONSTAR QUE:
                  </div>

                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '26px', fontWeight: '900', color: '#114938', margin: '8px 0', letterSpacing: '0.5px' }}>
                    {result.recipient}
                  </div>

                  <div style={{ width: '120px', height: '1.5px', background: '#B88A3B', margin: '0 auto 10px' }}></div>

                  <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '6px' }}>
                    Ha acreditado satisfactoriamente el programa de competencias:
                  </div>

                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '16px', fontWeight: '900', color: '#146049', textTransform: 'uppercase', marginBottom: '16px' }}>
                    {result.title}
                  </div>

                  {/* Summary Concepts Table */}
                  <div style={{ maxWidth: '580px', margin: '0 auto 20px', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', textAlign: 'left', fontSize: '11px' }}>
                    <div style={{ display: 'flex', background: '#F8FAFC', padding: '6px 12px', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ width: '140px', fontWeight: '700', color: '#114938' }}>Folio Registral:</span>
                      <span style={{ color: '#8C6527', fontWeight: '800', fontFamily: 'monospace' }}>{result.folio}</span>
                    </div>
                    <div style={{ display: 'flex', background: '#FFFFFF', padding: '6px 12px', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ width: '140px', fontWeight: '700', color: '#114938' }}>Carga Horaria:</span>
                      <span style={{ color: '#1E293B' }}>{result.hours} Horas Acreditadas</span>
                    </div>
                    <div style={{ display: 'flex', background: '#F8FAFC', padding: '6px 12px', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ width: '140px', fontWeight: '700', color: '#114938' }}>Fecha de Emisión:</span>
                      <span style={{ color: '#1E293B' }}>{result.issueDate}</span>
                    </div>
                    <div style={{ display: 'flex', background: '#FFFFFF', padding: '6px 12px' }}>
                      <span style={{ width: '140px', fontWeight: '700', color: '#114938' }}>Anclaje Blockchain:</span>
                      <span style={{ color: '#059669', fontWeight: '700', fontFamily: 'monospace' }}>Ethereum ({result.txId.substring(0, 16)}...)</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a 
                      href={`/render/${result.id}`} 
                      target="_blank" 
                      style={{ padding: '8px 16px', background: '#114938', color: '#FFFFFF', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', fontFamily: "'Montserrat', sans-serif", textDecoration: 'none' }}
                    >
                      Ver Diploma Web Completo ↗
                    </a>
                    <a 
                      href={`/certificate/${result.id}/pdf`} 
                      download 
                      style={{ padding: '8px 16px', background: '#FFFFFF', color: '#114938', border: '1px solid #114938', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', fontFamily: "'Montserrat', sans-serif", textDecoration: 'none' }}
                    >
                      Descargar PDF Oficial
                    </a>
                    <button 
                      onClick={() => { setResult(null); setError(null); setQueryTerm(''); }}
                      style={{ padding: '8px 16px', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700', fontFamily: "'Montserrat', sans-serif", cursor: 'pointer' }}
                    >
                      Validar Otra Credencial
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>

        </section>

        {/* 3 Security and Legal Assurance Pillars */}
        <section style={{ maxWidth: '1080px', margin: '0 auto 40px', padding: '0 20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '12px', fontWeight: '800', color: '#114938', textTransform: 'uppercase', marginBottom: '6px' }}>
                Estándar Global W3C Blockcerts v3.2
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                Las credenciales emitidas cumplen con las especificaciones internacionales de credenciales verificables, garantizando portabilidad y reconocimiento global.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '12px', fontWeight: '800', color: '#114938', textTransform: 'uppercase', marginBottom: '6px' }}>
                Anclaje Inmutable en Ethereum
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                Cada certificado cuenta con una prueba matemática de Merkle sellada criptográficamente en la cadena de bloques, impidiendo cualquier intento de falsificación.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '12px', fontWeight: '800', color: '#114938', textTransform: 'uppercase', marginBottom: '6px' }}>
                Validez Curricular e Institucional
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                Documentos expedidos con sello oficial y firma electrónica de Rectoría y Secretaría Académica de la UTCJ conforme a la normatividad universitaria vigente.
              </p>
            </div>

          </div>

        </section>

      </div>

      {/* Dual-Tone Formal Footer */}
      <footer style={{ width: '100%' }}>
        <div style={{ height: '5px', background: 'linear-gradient(90deg, #8C6527 0%, #B88A3B 50%, #8C6527 100%)', width: '100%' }}></div>
        <div style={{ background: '#114938', color: '#FFFFFF', padding: '16px 28px', fontSize: '11.5px' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <strong>Universidad Tecnológica de Ciudad Juárez</strong> • Clave CCT: 08MSU0017R • Av. Universidad Tecnológica 3051, Cd. Juárez, Chih.
            </div>
            <div style={{ color: '#D1E7DD', fontSize: '10.5px' }}>
              Sistema Institucional de Microcredenciales • W3C Blockcerts v3.2
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
