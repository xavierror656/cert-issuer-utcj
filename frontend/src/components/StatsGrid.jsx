import { useEffect, useState } from 'preact/hooks';

export function StatsGrid({ stats }) {
  const [issued, setIssued] = useState(0);
  const [revoked, setRevoked] = useState(0);
  const [active, setActive] = useState(0);

  // Smooth count up animation
  useEffect(() => {
    if (!stats) return;
    const animateValue = (start, end, setter) => {
      if (start === end) return;
      let range = end - start;
      let current = start;
      let increment = end > start ? 1 : -1;
      let stepTime = Math.abs(Math.floor(800 / range));
      stepTime = Math.max(stepTime, 10);
      let timer = setInterval(() => {
        current += increment;
        setter(current);
        if (current === end) {
          clearInterval(timer);
        }
      }, stepTime);
    };

    animateValue(0, stats.total_issued || 0, setIssued);
    animateValue(0, stats.total_revoked || 0, setRevoked);
    animateValue(0, stats.active_certs || 0, setActive);
  }, [stats]);

  return (
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Issued Card */}
      <div class="card bg-base-100 border border-base-300 shadow-sm p-5 flex flex-row items-center gap-4 hover:shadow-md transition-all duration-200 hover:border-[#93C01F]/50">
        <div class="circle-badge-3d text-sm font-black">
          Σ
        </div>
        <div>
          <h3 class="text-xs font-montserrat font-bold text-base-content/50 uppercase tracking-wider">Emitidos Totales</h3>
          <div class="text-2xl font-black font-montserrat text-base-content mt-0.5">{issued}</div>
        </div>
      </div>

      {/* Active Card */}
      <div class="card bg-base-100 border border-base-300 shadow-sm p-5 flex flex-row items-center gap-4 hover:shadow-md transition-all duration-200 hover:border-[#3F9089]/50">
        <div class="circle-badge-3d teal text-sm font-black">
          ✓
        </div>
        <div>
          <h3 class="text-xs font-montserrat font-bold text-base-content/50 uppercase tracking-wider">Vigentes y Activos</h3>
          <div class="text-2xl font-black font-montserrat text-[#146049] dark:text-[#93C01F] mt-0.5">{active}</div>
        </div>
      </div>

      {/* Revoked Card */}
      <div class="card bg-base-100 border border-base-300 shadow-sm p-5 flex flex-row items-center gap-4 hover:shadow-md transition-all duration-200 hover:border-red-500/50">
        <div class="circle-badge-3d dark text-sm font-black" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', color: '#FFF' }}>
          ✕
        </div>
        <div>
          <h3 class="text-xs font-montserrat font-bold text-base-content/50 uppercase tracking-wider">Revocados</h3>
          <div class="text-2xl font-black font-montserrat text-error mt-0.5">{revoked}</div>
        </div>
      </div>
    </section>
  );
}
