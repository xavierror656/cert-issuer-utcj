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
      <div class="card bg-base-100 border border-base-300 shadow-sm p-6 flex flex-row items-center gap-4 hover:shadow-md transition-all duration-200">
        <div class="w-12 h-12 rounded-xl bg-success/10 border border-success/20 text-success flex items-center justify-center">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Emitidos Totales</h3>
          <div class="text-2xl font-bold font-outfit text-base-content mt-0.5">{issued}</div>
        </div>
      </div>

      {/* Revoked Card */}
      <div class="card bg-base-100 border border-base-300 shadow-sm p-6 flex flex-row items-center gap-4 hover:shadow-md transition-all duration-200">
        <div class="w-12 h-12 rounded-xl bg-error/10 border border-error/20 text-error flex items-center justify-center">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <div>
          <h3 class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Revocados</h3>
          <div class="text-2xl font-bold font-outfit text-error mt-0.5">{revoked}</div>
        </div>
      </div>

      {/* Active Card */}
      <div class="card bg-base-100 border border-base-300 shadow-sm p-6 flex flex-row items-center gap-4 hover:shadow-md transition-all duration-200">
        <div class="w-12 h-12 rounded-xl bg-info/10 border border-info/20 text-info flex items-center justify-center">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Activos</h3>
          <div class="text-2xl font-bold font-outfit text-info mt-0.5">{active}</div>
        </div>
      </div>
    </section>
  );
}
