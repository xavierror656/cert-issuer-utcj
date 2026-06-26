import { useState } from 'preact/hooks';

export function AuditLogList({ auditLogs }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const actionMap = {
    "login_success": { label: "Inicio Sesión", badge: "badge-success text-success-content", icon: "M15 7a2 2 0 012 2m-2 4a2 2 0 012 2m-2-4a3 3 0 11-6 0 3 3 0 016 0zm-6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    "login_failure": { label: "Fallo Acceso", badge: "badge-error text-error-content", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
    "logout": { label: "Cierre Sesión", badge: "badge-neutral", icon: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" },
    "branding_change": { label: "Cambio Colores", badge: "badge-info text-info-content", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" },
    "upload_signature": { label: "Subida Firma", badge: "badge-accent text-accent-content", icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" },
    "upload_seal": { label: "Subida Sello", badge: "badge-accent text-accent-content", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    "create_api_key": { label: "Generar Token", badge: "badge-info text-info-content", icon: "M15 7a2 2 0 012 2m-2 4a2 2 0 012 2m-2-4a3 3 0 11-6 0 3 3 0 016 0zm-6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    "revoke_api_key": { label: "Revocar Token", badge: "badge-warning text-warning-content", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
    "revoke_certificate": { label: "Revocar Cert", badge: "badge-error text-error-content", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
    "issue_certificate": { label: "Emisión Cert", badge: "badge-success text-success-content", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    "issue_batch": { label: "Emisión Lote", badge: "badge-success text-success-content", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }
  };

  const filteredLogs = auditLogs.filter(log => {
    const action = log.action || '';
    const username = log.username || '';
    const details = log.details || '';
    const ip = log.ip_address || '';

    const matchesFilter = actionFilter === 'all' || action === actionFilter;
    
    if (!matchesFilter) return false;
    
    if (!search.trim()) return true;
    
    const query = search.toLowerCase().trim();
    return action.toLowerCase().includes(query) ||
           username.toLowerCase().includes(query) ||
           details.toLowerCase().includes(query) ||
           ip.toLowerCase().includes(query);
  });

  return (
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden max-w-5xl mx-auto">
      {/* Header and filters */}
      <div class="py-5 px-6 border-b border-base-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-200/20">
        <div>
          <h3 class="font-outfit text-base font-bold text-base-content">Bitácora de Auditoría de Seguridad</h3>
          <p class="text-xs text-base-content/50 mt-0.5 font-medium">Historial inmutable de acciones administrativas y eventos de la plataforma</p>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center font-semibold">
          <div class="relative flex-grow">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-base-content/40">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onInput={(e) => setSearch(e.target.value)}
              placeholder="Buscar en la bitácora..."
              class="input input-sm input-bordered pl-9 w-full sm:w-60 focus:ring-primary/20"
            />
          </div>
          
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            class="select select-sm select-bordered font-semibold text-base-content"
          >
            <option value="all">Acción: Todas</option>
            <option value="login_success">Inicios de Sesión</option>
            <option value="login_failure">Fallos de Acceso</option>
            <option value="logout">Cierres de Sesión</option>
            <option value="issue_certificate">Emisiones de Certificado</option>
            <option value="issue_batch">Emisiones de Lote</option>
            <option value="revoke_certificate">Revocaciones</option>
            <option value="branding_change">Cambios de Personalización</option>
            <option value="upload_signature">Cargas de Firma</option>
            <option value="upload_seal">Cargas de Sello</option>
            <option value="create_api_key">Generaciones de Token</option>
            <option value="revoke_api_key">Revocaciones de Token</option>
          </select>
        </div>
      </div>

      {/* Timeline view */}
      <div class="p-6">
        {filteredLogs.length === 0 ? (
          <div class="text-center py-12 text-base-content/40 text-sm">
            No se encontraron eventos en la bitácora.
          </div>
        ) : (
          <div class="flow-root max-h-[550px] overflow-y-auto pr-2">
            <ul role="list" class="-mb-8">
              {filteredLogs.map((log, idx) => {
                const timestamp = log.timestamp || '';
                const timeDisplay = timestamp.substring(11, 16) || timestamp;
                const dateDisplay = timestamp.substring(5, 10) || '';
                
                const actionInfo = actionMap[log.action] || {
                  label: log.action || 'Acción',
                  badge: 'badge-neutral',
                  icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                };
                
                const isLast = idx === filteredLogs.length - 1;
                const ipInfo = log.ip_address ? ` (${log.ip_address})` : '';

                return (
                  <li key={idx}>
                    <div class="relative pb-6">
                      {!isLast && (
                        <span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-base-300" aria-hidden="true"></span>
                      )}
                      
                      <div class="relative flex space-x-3">
                        {/* Event icon badge */}
                        <div>
                          <span class={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-base-100 badge ${actionInfo.badge} p-0`}>
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d={actionInfo.icon} />
                            </svg>
                          </span>
                        </div>
                        
                        {/* Event details */}
                        <div class="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p class="text-[11px] font-bold text-base-content">
                              {actionInfo.label} <span class="font-normal text-base-content/50">por {log.username}{ipInfo}</span>
                            </p>
                            <p class="text-[10px] text-base-content/60 mt-0.5 leading-snug">{log.details}</p>
                          </div>
                          
                          {/* Timestamp */}
                          <div class="text-right text-[10px] whitespace-nowrap text-base-content/40 font-semibold uppercase">
                            <time datetime={timestamp}>{dateDisplay} {timeDisplay}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
