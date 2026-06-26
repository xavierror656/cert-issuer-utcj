import { useState, useEffect, useRef } from 'preact/hooks';

export function EmissionChart({ certs }) {
  const [filter, setFilter] = useState('last_6_months');
  const [chartData, setChartData] = useState([]);
  const [chartLabels, setChartLabels] = useState([]);
  const [chartPrefixes, setChartPrefixes] = useState([]);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });
  
  // Drilldown modal state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [drilldownCerts, setDrilldownCerts] = useState([]);

  const svgRef = useRef(null);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const shortMonthNames = {
    "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic"
  };

  useEffect(() => {
    if (!certs || certs.length === 0) {
      setChartData([]);
      setChartLabels([]);
      setChartPrefixes([]);
      return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1; // 1-12

    let labels = [];
    let prefixes = [];
    let counts = [];

    if (filter === 'last_6_months') {
      // Last 6 months prefixes
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const prefix = `${y}-${m}`;
        prefixes.push(prefix);
        labels.push(`${shortMonthNames[m]} ${String(y).substring(2)}`);
      }
    } else if (filter === 'current_month_by_day') {
      // Days in current month
      const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
      const mStr = String(currentMonthNum).padStart(2, '0');
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = String(d).padStart(2, '0');
        prefixes.push(`${currentYear}-${mStr}-${dStr}`);
        labels.push(`${d}`);
      }
    } else if (filter === 'current_year_by_month') {
      // Months in current year
      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        prefixes.push(`${currentYear}-${mStr}`);
        labels.push(shortMonthNames[mStr]);
      }
    }

    // Calculate counts
    counts = prefixes.map(prefix => {
      return certs.filter(c => c.issued_at && c.issued_at.startsWith(prefix)).length;
    });

    setChartData(counts);
    setChartLabels(labels);
    setChartPrefixes(prefixes);
  }, [certs, filter]);

  // SVG Chart drawing calculations
  const maxVal = Math.max(...chartData, 5);
  const width = 300;
  const height = 100;
  const pointsCount = chartData.length;

  let linePoints = [];
  if (pointsCount === 1) {
    const y = 100 - (chartData[0] / maxVal) * 80;
    linePoints.push(`0,${y}`);
    linePoints.push(`${width},${y}`);
  } else if (pointsCount > 1) {
    chartData.forEach((val, i) => {
      const x = (i / (pointsCount - 1)) * width;
      const y = 100 - (val / maxVal) * 80;
      linePoints.push(`${x},${y}`);
    });
  }

  const linePathStr = linePoints.length > 0 ? 'M ' + linePoints.join(' L ') : '';
  const areaPathStr = linePoints.length > 0 ? linePathStr + ` L ${width},100 L 0,100 Z` : '';

  const handleMouseEnterCircle = (val, idx, x, y) => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const relativeX = (x / width) * svgRect.width;
    const relativeY = (y / 120) * svgRect.height;

    setTooltip({
      visible: true,
      x: relativeX,
      y: relativeY - 8,
      text: `${chartLabels[idx]}: ${val}`
    });
  };

  const handleMouseLeaveCircle = () => {
    setTooltip(t => ({ ...t, visible: false }));
  };

  const handleCircleClick = (idx) => {
    const prefix = chartPrefixes[idx];
    const filtered = certs.filter(c => c.issued_at && c.issued_at.startsWith(prefix));
    
    let titleText = '';
    if (filter === 'last_6_months') {
      const parts = prefix.split('-');
      titleText = `Certificados de ${monthNames[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
    } else if (filter === 'current_month_by_day') {
      titleText = `Certificados del Día ${idx + 1} de este Mes`;
    } else if (filter === 'current_year_by_month') {
      titleText = `Certificados de ${monthNames[idx]} ${prefix.split('-')[0]}`;
    }

    setDrilldownTitle(titleText);
    setDrilldownCerts(filtered);
    setDrilldownOpen(true);
  };

  return (
    <div class="card bg-base-100 border border-base-300 shadow-sm p-6">
      <div class="flex flex-col gap-3 mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 class="font-outfit font-bold text-base-content">Actividad de Emisión</h3>
          </div>
          <span class="badge badge-success badge-soft font-semibold text-[10px] uppercase">Tendencia</span>
        </div>
        
        {/* Filter Selector */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          class="select select-sm select-bordered w-full text-[11px] font-semibold text-base-content"
        >
          <option value="last_6_months">Filtrar: Últimos 6 Meses</option>
          <option value="current_month_by_day">Filtrar: Días (Mes Actual)</option>
          <option value="current_year_by_month">Filtrar: Meses (Año Actual)</option>
        </select>
      </div>

      {/* SVG Chart Area */}
      <div class="relative w-full h-32 mt-2">
        {/* Interactive Tooltip */}
        {tooltip.visible && (
          <div
            style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
            class="absolute bg-neutral text-neutral-content text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full z-10 border border-base-300 transition-all duration-150"
          >
            <span>{tooltip.text}</span>
          </div>
        )}
        
        {chartData.length > 0 ? (
          <svg
            ref={svgRef}
            viewBox="0 0 300 120"
            class="w-full h-full overflow-visible"
            id="emission-svg-chart"
          >
            <defs>
              <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--color-primary, #0F6A52)" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="var(--color-primary, #0F6A52)" stop-opacity="0.0"/>
              </linearGradient>
            </defs>
            
            {/* Grid Lines */}
            <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(156,163,175,0.15)" stroke-width="1" stroke-dasharray="4,4"/>
            <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(156,163,175,0.15)" stroke-width="1" stroke-dasharray="4,4"/>
            <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(156,163,175,0.15)" stroke-width="1" stroke-dasharray="4,4"/>
            
            {/* Area and Line Paths */}
            {linePoints.length > 0 && (
              <>
                <path d={areaPathStr} fill="url(#chart-grad)" />
                <path
                  d={linePathStr}
                  fill="none"
                  stroke="var(--color-primary, #0F6A52)"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  class="transition-all duration-500"
                />
              </>
            )}
            
            {/* Dots overlay */}
            <g id="chart-dots-group">
              {chartData.map((val, i) => {
                if (pointsCount > 20 && val === 0) return null;
                const x = pointsCount === 1 ? width / 2 : (i / (pointsCount - 1)) * width;
                const y = 100 - (val / maxVal) * 80;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={pointsCount > 20 ? 2 : 4}
                    fill="white"
                    stroke="var(--color-primary, #0F6A52)"
                    stroke-width={pointsCount > 20 ? 1 : 2}
                    class="cursor-pointer hover:r-6 hover:fill-primary transition-all duration-150"
                    onMouseEnter={() => handleMouseEnterCircle(val, i, x, y)}
                    onMouseLeave={handleMouseLeaveCircle}
                    onClick={() => handleCircleClick(i)}
                  />
                );
              })}
            </g>
          </svg>
        ) : (
          <div class="w-full h-full flex items-center justify-center text-xs text-base-content/40">
            No hay datos para graficar.
          </div>
        )}
      </div>

      {/* Chart Labels Footer */}
      <div class="flex justify-between mt-2 text-[10px] text-base-content/40 font-semibold uppercase tracking-wider px-1">
        {pointsCount <= 12 ? (
          chartLabels.map((lbl, idx) => <span key={idx}>{lbl}</span>)
        ) : (
          chartLabels.map((lbl, idx) => {
            if (idx % 6 === 0 || idx === pointsCount - 1) {
              return <span key={idx}>{lbl}</span>;
            }
            return null;
          })
        )}
      </div>

      {/* Drilldown Modal using DaisyUI 5 modal */}
      {drilldownOpen && (
        <dialog open class="modal modal-open">
          <div class="modal-box max-w-2xl bg-base-100 border border-base-300">
            <h3 class="font-bold text-lg font-outfit text-base-content">{drilldownTitle}</h3>
            
            <div class="py-4">
              {drilldownCerts.length === 0 ? (
                <div class="text-center py-8 text-base-content/40 text-sm">
                  No se encontraron emisiones en este periodo.
                </div>
              ) : (
                <div class="overflow-y-auto max-h-60">
                  <table class="table table-sm w-full text-left">
                    <thead>
                      <tr class="bg-base-200 text-base-content/70">
                        <th class="text-xs uppercase">Alumno</th>
                        <th class="text-xs uppercase">Programa</th>
                        <th class="text-xs uppercase">ID</th>
                        <th class="text-xs uppercase text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drilldownCerts.map((c) => (
                        <tr key={c.id} class="hover:bg-base-200/50 transition-colors">
                          <td class="text-xs font-semibold text-base-content">{c.recipient}</td>
                          <td class="text-xs text-base-content/80">{c.title}</td>
                          <td>
                            <code class="text-[10px] bg-base-200 px-1.5 py-0.5 rounded font-mono text-base-content/70">
                              {c.id.substring(0, 8)}...
                            </code>
                          </td>
                          <td class="text-right">
                            <a
                              href={`/render/${c.id}`}
                              target="_blank"
                              rel="noreferrer"
                              class="btn btn-primary btn-xs font-bold"
                            >
                              Ver
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div class="modal-action">
              <button onClick={() => setDrilldownOpen(false)} class="btn btn-sm select-none">
                Cerrar
              </button>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button onClick={() => setDrilldownOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
