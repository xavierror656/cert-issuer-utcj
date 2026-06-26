import { useEffect, useState } from 'preact/hooks';

export function Sidebar({ activeTab, onTabChange, username, isDarkMode, onThemeToggle }) {
  const tabs = [
    { id: 'overview', label: 'Panel de Control', icon: (
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    ) },
    { id: 'branding', label: 'Personalización', icon: (
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ) },
    { id: 'signature', label: 'Firma del Rector', icon: (
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ) },
    { id: 'api-keys', label: 'Tokens de API', icon: (
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m-2 4a2 2 0 012 2m-2-4a3 3 0 11-6 0 3 3 0 016 0zm-6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) },
    { id: 'audit-log', label: 'Bitácora', icon: (
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) },
  ];

  return (
    <aside class="w-64 bg-base-200 border-r border-base-300 flex flex-col fixed inset-y-0 left-0 z-20 p-6">
      {/* Brand Header */}
      <div class="flex items-center gap-3 mb-10">
        <div class="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-sm text-primary">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h1 class="font-outfit text-base font-bold text-base-content tracking-tight leading-none">UTCJ Micro</h1>
          <span class="text-[10px] text-base-content/50 font-semibold uppercase tracking-wider">Consola Admin</span>
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
              class={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                isActive
                  ? 'bg-primary text-primary-content border-primary shadow-sm shadow-primary/20'
                  : 'text-base-content/75 hover:bg-base-300/50 hover:text-base-content border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile and Settings Footer */}
      <div class="border-t border-base-300 pt-5 flex items-center justify-between">
        <div>
          <div class="text-xs font-bold text-base-content leading-none">{username || 'Cargando...'}</div>
          <span class="text-[10px] text-base-content/50 font-medium">Administrador</span>
        </div>
        
        <div class="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={onThemeToggle}
            class="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-base-content"
            title="Alternar Modo Oscuro/Claro"
          >
            {isDarkMode ? (
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>

          {/* Logout Button */}
          <a
            href="/admin/logout"
            class="btn btn-error btn-outline btn-xs font-semibold px-2.5"
          >
            Salir
          </a>
        </div>
      </div>
    </aside>
  );
}
