import { useState, useEffect } from 'preact/hooks';

export function BrandingConfig({ initialBranding, csrfToken, onShowToast }) {
  const [colors, setColors] = useState({
    green: '#0F6A52',
    green_deep: '#0A4C3B',
    teal: '#0F3E4A',
    gold: '#B88A3B',
    silver: '#8FA3AD'
  });
  const [submitting, setSubmitting] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('/admin/preview-certificate/pdf');

  useEffect(() => {
    if (initialBranding) {
      setColors({
        green: initialBranding.green || '#0F6A52',
        green_deep: initialBranding.green_deep || '#0A4C3B',
        teal: initialBranding.teal || '#0F3E4A',
        gold: initialBranding.gold || '#B88A3B',
        silver: initialBranding.silver || '#8FA3AD'
      });
    }
  }, [initialBranding]);

  // Apply colors dynamically to document root so UI updates instantly!
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', colors.green);
    document.documentElement.style.setProperty('--color-primary-dark', colors.green_deep);
    document.documentElement.style.setProperty('--color-accent', colors.gold);
  }, [colors]);

  // Update preview src with a small debounce to avoid hammering the PDF generator
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        green: colors.green,
        green_deep: colors.green_deep,
        teal: colors.teal,
        gold: colors.gold,
        silver: colors.silver,
        t: Date.now()
      }).toString();
      setPreviewSrc(`/admin/preview-certificate/pdf?${params}`);
    }, 400);

    return () => clearTimeout(timer);
  }, [colors]);

  const handleColorChange = (key, value) => {
    setColors(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('green', colors.green);
      formData.append('green_deep', colors.green_deep);
      formData.append('teal', colors.teal);
      formData.append('gold', colors.gold);
      formData.append('silver', colors.silver);
      if (csrfToken) formData.append('csrf_token', csrfToken);

      const res = await fetch('/admin/branding', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        onShowToast('¡Colores de personalización guardados exitosamente!', 'success');
      } else {
        alert('Error al guardar la personalización.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const colorFields = [
    { key: 'green', label: 'Color Primario (Verde Institucional)', desc: 'Marca la presencia de cabeceras, botones principales y bordes principales.' },
    { key: 'green_deep', label: 'Color Primario Oscuro (Verde Profundo)', desc: 'Utilizado para hover y transiciones de estado.' },
    { key: 'teal', label: 'Color Verde Azulado (Teal)', desc: 'Acento institucional para fondos secundarios.' },
    { key: 'gold', label: 'Color de Acento (Dorado)', desc: 'Resalta elementos clave, insignias de excelencia y badges.' },
    { key: 'silver', label: 'Color Secundario (Plata)', desc: 'Utilizado para marcos decorativos secundarios.' }
  ];

  return (
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-5xl mx-auto">
      {/* Left panel: form */}
      <div class="lg:col-span-2 space-y-6">
        <form onSubmit={handleSave} class="card bg-base-100 border border-base-300 shadow-sm p-6 space-y-5">
          <div>
            <h4 class="font-outfit text-base font-bold text-base-content">Paleta de Colores</h4>
            <p class="text-xs text-base-content/50 mt-0.5">Configura los colores oficiales del emisor institucional</p>
          </div>

          <div class="space-y-4">
            {colorFields.map((field) => (
              <div key={field.key} class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-base-content/75 uppercase tracking-wide">
                  {field.label}
                </label>
                <div class="flex gap-3 items-center">
                  <input
                    type="color"
                    value={colors[field.key]}
                    onInput={(e) => handleColorChange(field.key, e.target.value)}
                    class="w-10 h-10 rounded-lg cursor-pointer border border-base-300 p-0.5 bg-base-100"
                  />
                  <input
                    type="text"
                    value={colors[field.key]}
                    onInput={(e) => handleColorChange(field.key, e.target.value)}
                    class="input input-sm input-bordered font-mono text-xs w-28 uppercase text-center"
                    maxLength={7}
                  />
                </div>
                <span class="text-[10px] text-base-content/40 leading-snug">{field.desc}</span>
              </div>
            ))}
          </div>

          <div class="pt-3 border-t border-base-200">
            <button
              type="submit"
              disabled={submitting}
              class="btn btn-primary btn-sm w-full font-bold"
            >
              {submitting ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>

      {/* Right panel: preview */}
      <div class="lg:col-span-3">
        <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden h-full flex flex-col min-h-[500px]">
          <div class="py-4 px-6 border-b border-base-300 bg-base-200/20">
            <h4 class="font-outfit text-sm font-bold text-base-content">Vista Previa del Certificado</h4>
            <p class="text-[10px] text-base-content/50">Muestra en tiempo real cómo lucirá el documento emitido en PDF</p>
          </div>
          
          <div class="flex-1 relative bg-base-300 flex items-center justify-center p-4">
            <iframe
              id="pdf-preview-iframe"
              src={previewSrc}
              class="w-full h-full border-0 absolute inset-0 bg-base-350"
              style={{ minHeight: '480px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
