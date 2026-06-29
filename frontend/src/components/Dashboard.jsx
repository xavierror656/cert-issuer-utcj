import { useState, useEffect } from 'preact/hooks';
import { Sidebar } from './Sidebar';
import { StatsGrid } from './StatsGrid';
import { EmissionChart } from './EmissionChart';
import { CredentialsTable } from './CredentialsTable';
import { BrandingConfig } from './BrandingConfig';
import { SignatureConfig } from './SignatureConfig';
import { ApiKeysConfig } from './ApiKeysConfig';
import { AuditLogList } from './AuditLogList';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [cmdSelectedIndex, setCmdSelectedIndex] = useState(0);

  const loadData = async () => {
    try {
      const res = await fetch('/admin/dashboard/data');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        if (res.status === 403) {
          window.location.href = '/admin/dashboard';
          return;
        }
        console.error('Failed to load dashboard data:', res.statusText);
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    loadData();

    // Check system preference or local storage for dark theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.body.classList.add('dark-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }

    // Hash-based routing for direct link sharing
    const hash = window.location.hash.substring(1);
    const validTabs = ['overview', 'branding', 'signature', 'api-keys', 'audit-log'];
    if (validTabs.includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
  };

  const handleThemeToggle = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.body.classList.add('dark-theme');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(t => ({ ...t, visible: false }));
    }, 3000);
  };

  // Keyboard listeners for Ctrl+K Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdPaletteOpen(prev => !prev);
        setCmdSelectedIndex(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const executePaletteAction = (action) => {
    setCmdPaletteOpen(false);
    if (action.startsWith('tab-')) {
      handleTabChange(action.replace('tab-', ''));
    } else if (action === 'toggle-theme') {
      handleThemeToggle();
    } else if (action === 'logout') {
      window.location.href = '/admin/logout';
    } else if (action === 'focus-search') {
      handleTabChange('overview');
      setTimeout(() => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
      }, 100);
    }
  };

  // Command palette items
  const cmdItems = [
    { label: 'Ir al Panel de Control', action: 'tab-overview', tag: 'Panel', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z' },
    { label: 'Ir a Personalización Visual', action: 'tab-branding', tag: 'Branding', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343' },
    { label: 'Ir a Firmas y Sellos Oficiales', action: 'tab-signature', tag: 'Firma', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
    { label: 'Ir a Tokens de API', action: 'tab-api-keys', tag: 'API', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
    { label: 'Ir a Bitácora de Seguridad', action: 'tab-audit-log', tag: 'Bitácora', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Alternar Modo Oscuro / Claro', action: 'toggle-theme', tag: 'Tema', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
    { label: 'Buscar Alumnos y Credenciales', action: 'focus-search', tag: 'Buscar', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { label: 'Cerrar Sesión', action: 'logout', tag: 'Salir', icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1', isDanger: true }
  ];

  const handlePaletteKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCmdSelectedIndex(prev => (prev + 1) % cmdItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCmdSelectedIndex(prev => (prev - 1 + cmdItems.length) % cmdItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executePaletteAction(cmdItems[cmdSelectedIndex].action);
    } else if (e.key === 'Escape') {
      setCmdPaletteOpen(false);
    }
  };

  if (loading) {
    return (
      <div class="min-h-screen bg-base-250 flex flex-col items-center justify-center gap-4">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <span class="text-xs font-semibold text-base-content/60">Cargando Consola Administrativa...</span>
      </div>
    );
  }

  const { stats, certs, api_keys, audit_logs, branding, username, csrf_token, wallet_balance } = data || {
    stats: {}, certs: [], api_keys: [], audit_logs: [], branding: {}, username: '', csrf_token: '', wallet_balance: 0.1245
  };

  // Check Sepolia/Ethereum Wallet Balance
  const isSepolia = (branding?.default_chain || 'ethereum_sepolia').includes('sepolia');
  const actualBalance = wallet_balance !== undefined ? wallet_balance : 0.1245;
  const isLowBalance = actualBalance < (isSepolia ? 0.05 : 0.003);

  // Tab Titles mapping
  const titleMap = {
    overview: { title: 'Panel de Control', desc: 'Gestión de microcredenciales verificables y branding institucional' },
    branding: { title: 'Personalización Visual', desc: 'Configura la paleta de colores institucional de la universidad' },
    signature: { title: 'Firma Oficial del Rector', desc: 'Gestiona la firma manuscrita estampada digitalmente en los documentos' },
    'api-keys': { title: 'Tokens de API', desc: 'Administra claves de acceso y permisos para emisores y auditores externos' },
    'audit-log': { title: 'Bitácora de Seguridad', desc: 'Historial de auditoría inmutable de todas las acciones administrativas' }
  };
  const activeHeader = titleMap[activeTab] || titleMap.overview;

  // Filter last 5 logs for Overview widget
  const recentLogs = audit_logs.slice(0, 5);

  const actionMap = {
    "login_success": "badge-success text-success-content",
    "login_failure": "badge-error text-error-content",
    "logout": "badge-neutral",
    "branding_change": "badge-info text-info-content",
    "upload_signature": "badge-accent text-accent-content",
    "upload_seal": "badge-accent text-accent-content",
    "create_api_key": "badge-info text-info-content",
    "revoke_api_key": "badge-warning text-warning-content",
    "revoke_certificate": "badge-error text-error-content",
    "issue_certificate": "badge-success text-success-content",
    "issue_batch": "badge-success text-success-content"
  };

  return (
    <div class="bg-base-250 text-base-content min-h-screen flex font-sans">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        username={username}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
      />

      {/* Main Content Area */}
      <main class="flex-1 ml-64 p-8 md:p-10 max-w-7xl">
        {/* Header Block */}
        <header class="flex justify-between items-center mb-8">
          <div>
            <h2 class="font-outfit text-3xl font-extrabold text-base-content tracking-tight">{activeHeader.title}</h2>
            <p class="text-sm text-base-content/50 mt-1">{activeHeader.desc}</p>
          </div>
          
          <div class="flex items-center gap-3">
            {/* Wallet Balance Badge */}
            <span class={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isLowBalance ? 'bg-error/10 text-error border-error/20' : 'bg-info/10 text-info border-info/20'
            }`}>
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Balance Wallet: {actualBalance.toFixed(4)} ETH {isLowBalance && '(FONDOS BAJOS)'}</span>
            </span>

            {/* Connection Status Badge */}
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
              <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
              Conexión Activa
            </span>
          </div>
        </header>

        {/* Dynamic Tab Render */}
        <div class="animate-[fadeInUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          {activeTab === 'overview' && (
            <div>
              {/* Stats Grid Component */}
              <StatsGrid stats={stats} />
              
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Table Panel */}
                <div class="lg:col-span-2">
                  <CredentialsTable
                    certs={certs}
                    csrfToken={csrf_token}
                    onRefresh={loadData}
                    onShowToast={showToast}
                  />
                </div>
                
                {/* Right Widgets Panel */}
                <div class="lg:col-span-1 space-y-6">
                  {/* Emission Chart Component */}
                  <EmissionChart certs={certs} />

                  {/* Compact Activity Log widget */}
                  <div class="card bg-base-100 border border-base-300 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                      <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                          <svg class="w-5 h-5 text-warning" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 class="font-outfit font-bold text-base-content text-sm">Actividad Reciente</h3>
                        </div>
                        <span class="badge badge-warning badge-soft font-semibold text-[9px] py-1 px-1.5 uppercase">Seguridad</span>
                      </div>
                      
                      {/* Timeline Summary list */}
                      <div class="flow-root max-h-60 overflow-y-auto pr-1">
                        {recentLogs.length === 0 ? (
                          <div class="text-center py-6 text-base-content/40 text-xs">
                            No hay actividad registrada.
                          </div>
                        ) : (
                          <ul role="list" class="-mb-8">
                            {recentLogs.map((log, idx) => {
                              const timestamp = log.timestamp || '';
                              const timeDisplay = timestamp.substring(11, 16) || timestamp;
                              const dateDisplay = timestamp.substring(5, 10) || '';
                              const isLast = idx === recentLogs.length - 1;

                              return (
                                <li key={idx}>
                                  <div class="relative pb-6">
                                    {!isLast && (
                                      <span class="absolute top-4 left-3 -ml-px h-full w-0.5 bg-base-300" aria-hidden="true"></span>
                                    )}
                                    <div class="relative flex space-x-3">
                                      <div>
                                        <span class={`h-6 w-6 rounded-full flex items-center justify-center ring-4 ring-base-100 badge ${actionMap[log.action] || 'badge-neutral'} p-0`}>
                                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                            <circle cx="12" cy="12" r="9"></circle>
                                          </svg>
                                        </span>
                                      </div>
                                      <div class="flex-1 min-w-0 pt-0.5 flex justify-between space-x-4">
                                        <div>
                                          <p class="text-[10px] font-bold text-base-content">
                                            {log.action} <span class="font-normal text-base-content/50">por {log.username}</span>
                                          </p>
                                          <p class="text-[9px] text-base-content/60 mt-0.5 leading-snug">{log.details}</p>
                                        </div>
                                        <div class="text-right text-[9px] whitespace-nowrap text-base-content/40 font-semibold">
                                          <time>{dateDisplay} {timeDisplay}</time>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                    
                    <div class="border-t border-base-200 mt-5 pt-3">
                      <button
                        onClick={() => handleTabChange('audit-log')}
                        class="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1.5 transition-colors group"
                      >
                        <span>Ver bitácora de seguridad completa</span>
                        <svg class="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <BrandingConfig
              initialBranding={branding}
              csrfToken={csrf_token}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'signature' && (
            <SignatureConfig
              csrfToken={csrf_token}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'api-keys' && (
            <ApiKeysConfig
              apiKeys={api_keys}
              csrfToken={csrf_token}
              onRefresh={loadData}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'audit-log' && (
            <AuditLogList auditLogs={audit_logs} />
          )}
        </div>
      </main>

      {/* Toast Alert Dialog */}
      {toast.visible && (
        <div class="fixed bottom-6 right-6 px-5 py-4 rounded-xl text-sm font-semibold shadow-2xl flex items-center gap-3 z-50 border border-success/20 bg-success text-success-content animate-[scale_0.2s_ease-out]">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Command Palette Modal (Ctrl + K) */}
      {cmdPaletteOpen && (
        <dialog open class="modal modal-open z-50">
          <div class="modal-box p-0 max-w-lg bg-base-100 border border-base-300 rounded-2xl shadow-2xl overflow-hidden">
            {/* Search Input */}
            <div class="flex items-center gap-3 px-4 py-3.5 border-b border-base-300 bg-base-200/50">
              <svg class="w-5 h-5 text-base-content/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                autoFocus
                onKeyDown={handlePaletteKeyDown}
                placeholder="Escribe un comando o navega con flechas..."
                class="w-full text-sm outline-none bg-transparent text-base-content font-medium"
              />
              <span class="badge badge-neutral text-[10px] font-mono select-none">ESC</span>
            </div>
            
            {/* Command items list */}
            <div class="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
              {cmdItems.map((item, idx) => {
                const isSelected = idx === cmdSelectedIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => executePaletteAction(item.action)}
                    class={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-content'
                        : item.isDanger
                        ? 'text-error hover:bg-error/10'
                        : 'text-base-content hover:bg-base-200'
                    }`}
                  >
                    <div class="flex items-center gap-3">
                      <svg class={`w-4 h-4 ${isSelected ? 'text-primary-content' : 'text-base-content/40'}`} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
                      </svg>
                      <span>{item.label}</span>
                    </div>
                    <span class={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      isSelected
                        ? 'bg-primary-dark/30 border-primary-dark/20 text-primary-content'
                        : 'bg-base-200 border-base-300 text-base-content/50'
                    }`}>
                      {item.tag}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div class="p-3 bg-base-200 border-t border-base-300 flex justify-between items-center text-[10px] text-base-content/55">
              <span>Usa <kbd class="kbd kbd-xs">↑↓</kbd> para navegar y <kbd class="kbd kbd-xs">Enter</kbd> para seleccionar.</span>
              <span>Atajo: <kbd class="kbd kbd-xs">Ctrl + K</kbd></span>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button onClick={() => setCmdPaletteOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
