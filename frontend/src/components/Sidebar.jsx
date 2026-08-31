import { useEffect, useState } from 'preact/hooks';

export function Sidebar({ activeTab, onTabChange, username, isDarkMode, onThemeToggle }) {
  const tabs = [
    { id: 'overview', label: 'Panel de Control', icon: (
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    ) },
    { id: 'branding', label: 'Colorimetría & Marca', icon: (
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ) },
    { id: 'signature', label: 'Firma de Rectoría', icon: (
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ) },
    { id: 'api-keys', label: 'Tokens de API', icon: (
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m-2 4a2 2 0 012 2m-2-4a3 3 0 11-6 0 3 3 0 016 0zm-6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) },
    { id: 'audit-log', label: 'Auditoría', icon: (
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) },
  ];

  return (
    <aside class="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col fixed inset-y-0 left-0 z-20 p-5 backdrop-blur-xl">
      {/* Brand Header */}
      <div class="flex items-center gap-3 mb-8 pb-4 border-b border-slate-800">
        <img src="/assets/logos/utyp-logo.png" alt="UTyP" class="h-8 object-contain shrink-0" />
        <div class="min-w-0">
          <h1 class="font-montserrat text-sm font-extrabold text-white tracking-tight leading-tight truncate">UTCJ • UTyP</h1>
          <span class="text-[10px] text-[#93C01F] font-bold tracking-wider uppercase block truncate">Modalidad Mixta</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav class="flex flex-col gap-1.5 flex-grow">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              class={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-montserrat font-bold transition-all duration-200 border ${
                isActive
                  ? 'bg-[#146049] text-white border-[#93C01F]/50 shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border-transparent'
              }`}
            >
              <div class={isActive ? 'text-[#93C01F]' : 'text-slate-400'}>
                {tab.icon}
              </div>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile and Settings Footer */}
      <div class="border-t border-slate-800 pt-4 flex items-center justify-between">
        <div class="min-w-0">
          <div class="text-xs font-montserrat font-bold text-white leading-none truncate">{username || 'Admin'}</div>
          <span class="text-[10px] text-[#93C01F] font-medium block mt-0.5">Rectoría UTCJ</span>
        </div>
        
        <div class="flex items-center gap-2 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            class="px-2 py-1 rounded-lg border border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-[10px] font-bold"
            title="Alternar Modo Oscuro/Claro"
          >
            {isDarkMode ? 'Claro' : 'Oscuro'}
          </button>

          {/* Logout Button */}
          <a
            href="/admin/logout"
            class="btn btn-xs btn-error btn-outline font-montserrat font-bold px-2 text-[10px]"
          >
            Salir
          </a>
        </div>
      </div>
    </aside>
  );
}
