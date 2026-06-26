import { useState } from 'preact/hooks';

export function SignatureConfig({ csrfToken, onShowToast }) {
  const [sigTime, setSigTime] = useState(Date.now());
  const [sealTime, setSealTime] = useState(Date.now());
  
  const [sigLoading, setSigLoading] = useState(false);
  const [sealLoading, setSealLoading] = useState(false);
  
  const [sigDragActive, setSigDragActive] = useState(false);
  const [sealDragActive, setSealDragActive] = useState(false);

  const handleUpload = async (file, type) => {
    if (!file) return;
    const isSig = type === 'signature';
    const setterLoading = isSig ? setSigLoading : setSealLoading;
    const setterTime = isSig ? setSigTime : setSealTime;
    const endpoint = isSig ? '/admin/upload-rector-signature' : '/admin/upload-rector-seal';
    
    setterLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (csrfToken) formData.append('csrf_token', csrfToken);

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        onShowToast(`¡${isSig ? 'Firma' : 'Sello'} oficial cargado y actualizado correctamente!`, 'success');
        // Trigger cache-busting reload of the image
        setterTime(Date.now());
      } else {
        const errText = await res.text();
        alert(`Error al cargar archivo: ${errText || res.statusText}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
    } finally {
      setterLoading(false);
    }
  };

  const handleDrag = (e, type, activeState) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'signature') {
      setSigDragActive(activeState);
    } else {
      setSealDragActive(activeState);
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'signature') {
      setSigDragActive(false);
    } else {
      setSealDragActive(false);
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0], type);
    }
  };

  return (
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
      {/* Signature Panel */}
      <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden flex flex-col justify-between">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 text-primary">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <h4 class="font-outfit text-base font-bold text-base-content">Firma del Rector</h4>
              <p class="text-xs text-base-content/50">Carga la firma digitalizada en formato PNG transparente</p>
            </div>
          </div>
          
          <div class="space-y-6 mt-6">
            {/* Image Preview */}
            <div class="bg-base-200 border border-base-300 rounded-2xl p-6 flex items-center justify-center min-h-[140px] relative">
              {sigLoading && (
                <div class="absolute inset-0 bg-base-100/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10 rounded-2xl">
                  <span class="loading loading-spinner text-primary"></span>
                  <span class="text-xs font-semibold text-base-content/75">Subiendo e invalidando firmas antiguas...</span>
                </div>
              )}
              <img
                src={`/rector-signature?t=${sigTime}`}
                alt="Firma del Rector"
                class="max-h-24 object-contain dark:invert"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>

            {/* Dropzone */}
            <div
              onDragEnter={(e) => handleDrag(e, 'signature', true)}
              onDragOver={(e) => handleDrag(e, 'signature', true)}
              onDragLeave={(e) => handleDrag(e, 'signature', false)}
              onDrop={(e) => handleDrop(e, 'signature')}
              class={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                sigDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-base-300 hover:border-primary/50 bg-base-200/20'
              }`}
            >
              <input
                type="file"
                id="sig-file-input"
                accept="image/png"
                onChange={(e) => handleUpload(e.target.files[0], 'signature')}
                class="hidden"
              />
              <label for="sig-file-input" class="cursor-pointer flex flex-col items-center gap-2">
                <svg class="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span class="text-xs font-semibold text-base-content">
                  Arrastra o selecciona un archivo
                </span>
                <span class="text-[10px] text-base-content/40">Solo PNG transparente (máx. 1MB)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Seal Panel */}
      <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden flex flex-col justify-between">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 text-primary">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 class="font-outfit text-base font-bold text-base-content">Sello Oficial</h4>
              <p class="text-xs text-base-content/50">Carga el sello institucional en formato PNG transparente</p>
            </div>
          </div>
          
          <div class="space-y-6 mt-6">
            {/* Image Preview */}
            <div class="bg-base-200 border border-base-300 rounded-2xl p-6 flex items-center justify-center min-h-[140px] relative">
              {sealLoading && (
                <div class="absolute inset-0 bg-base-100/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10 rounded-2xl">
                  <span class="loading loading-spinner text-primary"></span>
                  <span class="text-xs font-semibold text-base-content/75">Subiendo e invalidando sellos antiguos...</span>
                </div>
              )}
              <img
                src={`/rector-seal?t=${sealTime}`}
                alt="Sello del Rector"
                class="max-h-24 object-contain dark:invert"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>

            {/* Dropzone */}
            <div
              onDragEnter={(e) => handleDrag(e, 'seal', true)}
              onDragOver={(e) => handleDrag(e, 'seal', true)}
              onDragLeave={(e) => handleDrag(e, 'seal', false)}
              onDrop={(e) => handleDrop(e, 'seal')}
              class={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                sealDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-base-300 hover:border-primary/50 bg-base-200/20'
              }`}
            >
              <input
                type="file"
                id="seal-file-input"
                accept="image/png"
                onChange={(e) => handleUpload(e.target.files[0], 'seal')}
                class="hidden"
              />
              <label for="seal-file-input" class="cursor-pointer flex flex-col items-center gap-2">
                <svg class="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span class="text-xs font-semibold text-base-content">
                  Arrastra o selecciona un archivo
                </span>
                <span class="text-[10px] text-base-content/40">Solo PNG transparente (máx. 1MB)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
