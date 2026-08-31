import { useState, useEffect } from 'preact/hooks';

const PRESETS = {
  utp_mixta: {
    name: 'Modalidad Mixta UTP (Oficial 2026)',
    green_lime: '#93C01F',
    teal: '#3F9089',
    pistachio: '#D1DF8C',
    green_deep: '#114938',
    green: '#146049',
    jade: '#279371',
    gold: '#B88A3B',
    silver: '#8FA3AD'
  },
  utcj_clasico: {
    name: 'UTCJ Institucional Tradicional',
    green_lime: '#84B528',
    teal: '#0F3E4A',
    pistachio: '#CBE09C',
    green_deep: '#0A4C3B',
    green: '#0F6A52',
    jade: '#15803D',
    gold: '#B88A3B',
    silver: '#8FA3AD'
  },
  utcj_esmeralda: {
    name: 'UTCJ Esmeralda & Oro',
    green_lime: '#A3E635',
    teal: '#0D9488',
    pistachio: '#D9F99D',
    green_deep: '#064E3B',
    green: '#047857',
    jade: '#10B981',
    gold: '#D97706',
    silver: '#94A3B8'
  }
};

export function BrandingConfig({ initialBranding, csrfToken, onShowToast }) {
  const [colors, setColors] = useState({
    green_lime: '#93C01F',
    teal: '#3F9089',
    pistachio: '#D1DF8C',
    green_deep: '#114938',
    green: '#146049',
    jade: '#279371',
    gold: '#B88A3B',
    silver: '#8FA3AD'
  });
  const [submitting, setSubmitting] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('/admin/preview-certificate/pdf');

  useEffect(() => {
    if (initialBranding) {
      setColors(prev => ({
        ...prev,
        green_lime: initialBranding.green_lime || '#93C01F',
        teal: initialBranding.teal || '#3F9089',
        pistachio: initialBranding.pistachio || '#D1DF8C',
        green_deep: initialBranding.green_deep || '#114938',
        green: initialBranding.green || '#146049',
        jade: initialBranding.jade || '#279371',
        gold: initialBranding.gold || '#B88A3B',
        silver: initialBranding.silver || '#8FA3AD'
      }));
    }
  }, [initialBranding]);

  // Apply colors dynamically to document root
  useEffect(() => {
    document.documentElement.style.setProperty('--utp-green-lime', colors.green_lime);
    document.documentElement.style.setProperty('--utp-teal', colors.teal);
    document.documentElement.style.setProperty('--utp-pistachio', colors.pistachio);
    document.documentElement.style.setProperty('--utp-green-deep', colors.green_deep);
    document.documentElement.style.setProperty('--utp-green', colors.green);
    document.documentElement.style.setProperty('--utp-jade', colors.jade);
    document.documentElement.style.setProperty('--primary', colors.green);
    document.documentElement.style.setProperty('--primary-dark', colors.green_deep);
    document.documentElement.style.setProperty('--accent', colors.gold);
  }, [colors]);

  // Update preview src with a small debounce
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

  const applyPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setColors({
        green_lime: preset.green_lime,
        teal: preset.teal,
        pistachio: preset.pistachio,
        green_deep: preset.green_deep,
        green: preset.green,
        jade: preset.jade,
        gold: preset.gold,
        silver: preset.silver
      });
      if (onShowToast) {
        onShowToast(`Preset aplicado: ${preset.name}`, 'info');
      }
    }
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
      formData.append('green_lime', colors.green_lime);
      formData.append('pistachio', colors.pistachio);
      formData.append('jade', colors.jade);
      if (csrfToken) formData.append('csrf_token', csrfToken);

      const res = await fetch('/admin/branding', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        onShowToast('¡Colores de identidad institucional guardados exitosamente!', 'success');
      } else {
        alert('Error al guardar la personalización.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const colorFields = [
    { key: 'green_lime', label: '1. Verde Lima (#93C01F)', desc: 'Nivel 1 - Títulos, acentos destacados y badges de inicio.', code: '93c01f' },
    { key: 'teal', label: '2. Verde Teal (#3F9089)', desc: 'Nivel 2 - Subtítulos, métricas y acentos secundarios.', code: '3f9089' },
    { key: 'pistachio', label: '3. Verde Pistache / Pastel (#D1DF8C)', desc: 'Fondos suaves de pastillas e insignias.', code: 'd1df8c' },
    { key: 'green_deep', label: '4. Verde Pino Profundo (#114938)', desc: 'Cabeceras, navbar principal y fondos oscuros.', code: '114938' },
    { key: 'green', label: '5. Verde Esmeralda Oficial (#146049)', desc: 'Nivel 3 - Botones primarios, diplomas y sellos oficiales.', code: '146049' },
    { key: 'jade', label: '6. Verde Jade (#279371)', desc: 'Estados verificados, enlaces activos y confirmaciones.', code: '279371' },
    { key: 'gold', label: '7. Oro Institucional (#B88A3B)', desc: 'Franja inferior de prestigio, sellos de honor y bordes.', code: 'b88a3b' },
    { key: 'silver', label: '8. Plata Neutro (#8FA3AD)', desc: 'Bordes sutiles, hashes y separadores de tabla.', code: '8fa3ad' }
  ];

  return (
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
      {/* Left panel: form & presets */}
      <div class="lg:col-span-5 space-y-6">
        {/* Presets Card */}
        <div class="card bg-base-100 border border-base-300 shadow-sm p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-montserrat text-sm font-bold text-base-content">Presets de Identidad Gráfica</h4>
              <p class="text-xs text-base-content/50">Selecciona una configuración estandarizada</p>
            </div>
            <span class="badge badge-sm font-bold bg-[#146049] text-white">UTP 2026</span>
          </div>

          <div class="grid grid-cols-1 gap-2">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                class="flex items-center justify-between p-3 rounded-xl border border-base-300 hover:border-[#93C01F] bg-base-200/40 hover:bg-base-200 text-left transition-all group"
              >
                <div class="flex items-center gap-3">
                  <div class="flex -space-x-1.5 overflow-hidden">
                    <span class="inline-block w-4 h-4 rounded-full border border-white" style={{ background: p.green_lime }} />
                    <span class="inline-block w-4 h-4 rounded-full border border-white" style={{ background: p.teal }} />
                    <span class="inline-block w-4 h-4 rounded-full border border-white" style={{ background: p.green_deep }} />
                    <span class="inline-block w-4 h-4 rounded-full border border-white" style={{ background: p.green }} />
                  </div>
                  <span class="text-xs font-semibold text-base-content group-hover:text-[#146049] dark:group-hover:text-[#93C01F] transition-colors">
                    {p.name}
                  </span>
                </div>
                <span class="text-[10px] text-base-content/40 font-mono">Aplicar</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color customizer */}
        <form onSubmit={handleSave} class="card bg-base-100 border border-base-300 shadow-sm p-6 space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-montserrat text-base font-bold text-base-content">Colorimetría Oficial</h4>
              <p class="text-xs text-base-content/50 mt-0.5">8 colores institucionales del sistema</p>
            </div>
          </div>

          <div class="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {colorFields.map((field) => (
              <div key={field.key} class="flex items-center justify-between p-2.5 rounded-xl border border-base-200 hover:border-base-300 bg-base-200/20">
                <div class="flex items-center gap-3 min-w-0">
                  <input
                    type="color"
                    value={colors[field.key]}
                    onInput={(e) => handleColorChange(field.key, e.target.value)}
                    class="w-8 h-8 rounded-lg cursor-pointer border border-base-300 p-0 bg-transparent shrink-0"
                  />
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-base-content truncate">{field.label}</p>
                    <p class="text-[10px] text-base-content/50 truncate">{field.desc}</p>
                  </div>
                </div>
                <input
                  type="text"
                  value={colors[field.key]}
                  onInput={(e) => handleColorChange(field.key, e.target.value)}
                  class="input input-xs input-bordered font-mono text-[11px] w-20 uppercase text-center shrink-0 ml-2"
                  maxLength={7}
                />
              </div>
            ))}
          </div>

          <div class="pt-3 border-t border-base-200">
            <button
              type="submit"
              disabled={submitting}
              class="btn btn-sm w-full font-montserrat font-bold text-white shadow-md transition-all hover:scale-[1.01]"
              style={{ background: 'linear-gradient(90deg, #114938 0%, #146049 60%, #279371 100%)' }}
            >
              {submitting ? 'Guardando Cambios...' : 'Guardar Colorimetría Institucional'}
            </button>
          </div>
        </form>
      </div>

      {/* Right panel: preview & typography guide */}
      <div class="lg:col-span-7 space-y-6">
        {/* Typography & Hierarchy Interactive Preview (Matches Reference Slide) */}
        <div class="card bg-base-100 border border-base-300 shadow-sm p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-base-200 pb-3">
            <div>
              <h4 class="font-montserrat text-sm font-bold text-base-content">Jerarquía Tipográfica Oficial</h4>
              <p class="text-xs text-base-content/50">Norma de 3 niveles del Manual UTP / Modalidad Mixta</p>
            </div>
            <span class="text-xs font-mono text-[#93C01F] font-bold">Aa Typography</span>
          </div>

          <div class="space-y-3">
            {/* Level 1 Pill */}
            <div class="pill-card-3d">
              <div class="circle-badge-3d">1</div>
              <div class="flex-1 min-w-0">
                <p class="font-montserrat text-xs md:text-sm font-extrabold text-base-content">
                  Montserrat, <span class="font-black">Montserrat Bold</span>, <span class="italic font-medium">Montserrat Italic</span>
                </p>
                <p class="text-[10px] text-base-content/50">Nivel 1: Títulos principales, folios y gran impacto</p>
              </div>
              <div class="pill-end-aa">Aa</div>
            </div>

            {/* Level 2 Pill */}
            <div class="pill-card-3d">
              <div class="circle-badge-3d teal">2</div>
              <div class="flex-1 min-w-0">
                <p class="font-gotham text-xs md:text-sm font-bold text-base-content">
                  Gotham, <span class="font-normal">Gotham Light</span>, <span class="italic font-bold">Gotham Italic</span>, <span class="font-black">Gotham Bold</span>
                </p>
                <p class="text-[10px] text-base-content/50">Nivel 2: Subtítulos, métricas, tags y nombres destacados</p>
              </div>
              <div class="pill-end-aa" style={{ color: '#3F9089', borderColor: 'rgba(63,144,137,0.4)', background: 'rgba(63,144,137,0.12)' }}>Aa</div>
            </div>

            {/* Level 3 Pill */}
            <div class="pill-card-3d">
              <div class="circle-badge-3d dark">3</div>
              <div class="flex-1 min-w-0">
                <p class="font-body text-xs md:text-sm text-base-content font-medium">
                  Arial, Verdana, Century Gothic, <span class="font-bold">Inter Regular / SemiBold</span>
                </p>
                <p class="text-[10px] text-base-content/50">Nivel 3: Textos corridos, tablas de datos, hashes y metadatos</p>
              </div>
              <div class="pill-end-aa" style={{ color: '#146049', borderColor: 'rgba(20,96,73,0.4)', background: 'rgba(20,96,73,0.12)' }}>Aa</div>
            </div>
          </div>
        </div>

        {/* Certificate live preview */}
        <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden flex flex-col min-h-[440px]">
          <div class="py-3 px-5 border-b border-base-300 bg-base-200/20 flex items-center justify-between">
            <div>
              <h4 class="font-montserrat text-xs font-bold text-base-content">Vista Previa Oficial en Tiempo Real</h4>
              <p class="text-[10px] text-base-content/50">Generador vectorial PDF con sello y firma de Rectoría</p>
            </div>
            <a
              href={previewSrc}
              target="_blank"
              rel="noreferrer"
              class="btn btn-xs btn-outline font-montserrat text-[11px]"
            >
              Abrir PDF
            </a>
          </div>
          
          <div class="flex-1 relative bg-base-300 flex items-center justify-center p-2">
            <iframe
              id="pdf-preview-iframe"
              src={previewSrc}
              class="w-full h-full border-0 absolute inset-0 bg-base-350"
              style={{ minHeight: '400px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
