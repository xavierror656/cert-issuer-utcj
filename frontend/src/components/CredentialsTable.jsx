import { useState, useEffect } from 'preact/hooks';

export function CredentialsTable({ certs, csrfToken, onRefresh, onShowToast }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [hoursFilter, setHoursFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Revocation Modal State
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [targetCert, setTargetCert] = useState(null);
  const [revocationReason, setRevocationReason] = useState('Revocado por administración institucional');
  const [submittingRevoke, setSubmittingRevoke] = useState(false);

  // Extract unique course/program names dynamically for dropdown filter
  const uniqueCourses = Array.from(
    new Set(certs.map(c => c.course_name || c.title).filter(Boolean))
  ).sort();

  // Reset page when filters change
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleCourseFilterChange = (val) => {
    setCourseFilter(val);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (val) => {
    setDateFilter(val);
    setCurrentPage(1);
  };

  const handleHoursFilterChange = (val) => {
    setHoursFilter(val);
    setCurrentPage(1);
  };

  const handleSortByChange = (val) => {
    setSortBy(val);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (val) => {
    setItemsPerPage(parseInt(val, 10));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCourseFilter('all');
    setDateFilter('all');
    setHoursFilter('all');
    setSortBy('date_desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all' || courseFilter !== 'all' || dateFilter !== 'all' || hoursFilter !== 'all' || sortBy !== 'date_desc';

  // Filter & Sort Logic
  const filteredCerts = certs.filter(c => {
    const isRevoked = c.revoked;
    
    // Status Filter
    if (statusFilter === 'active' && isRevoked) return false;
    if (statusFilter === 'revoked' && !isRevoked) return false;

    // Course / Program Filter
    if (courseFilter !== 'all') {
      const cCourse = c.course_name || c.title || '';
      if (cCourse !== courseFilter) return false;
    }

    // Duration / Hours Filter
    const hours = parseInt(c.hours || '0', 10);
    if (hoursFilter === 'under30' && hours >= 30) return false;
    if (hoursFilter === '30to60' && (hours < 30 || hours > 60)) return false;
    if (hoursFilter === 'over60' && hours <= 60) return false;

    // Date Range Filter
    if (dateFilter !== 'all' && c.issued_at) {
      const issueDate = new Date(c.issued_at);
      const now = new Date();
      const diffDays = (now - issueDate) / (1000 * 60 * 60 * 24);
      
      if (dateFilter === '24h' && diffDays > 1) return false;
      if (dateFilter === '7d' && diffDays > 7) return false;
      if (dateFilter === '30d' && diffDays > 30) return false;
      if (dateFilter === '2026' && issueDate.getFullYear() !== 2026) return false;
    }

    // Search Query (Multi-token OR/AND searching across Name, Title, Course, ID, Folio)
    if (!searchQuery.trim()) return true;

    const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
    const name = (c.recipient || '').toLowerCase();
    const id = (c.id || '').toLowerCase();
    const title = (c.title || '').toLowerCase();
    const course = (c.course_name || '').toLowerCase();
    const txId = (c.transaction_id || '').toLowerCase();

    return tokens.every(token => 
      name.includes(token) || 
      id.includes(token) || 
      title.includes(token) || 
      course.includes(token) ||
      txId.includes(token)
    );
  });

  // Sorting Logic
  const sortedCerts = [...filteredCerts].sort((a, b) => {
    if (sortBy === 'date_asc') {
      return new Date(a.issued_at || 0) - new Date(b.issued_at || 0);
    }
    if (sortBy === 'name_asc') {
      return (a.recipient || '').localeCompare(b.recipient || '');
    }
    if (sortBy === 'name_desc') {
      return (b.recipient || '').localeCompare(a.recipient || '');
    }
    if (sortBy === 'hours_desc') {
      return parseInt(b.hours || 0, 10) - parseInt(a.hours || 0, 10);
    }
    // Default: date_desc
    return new Date(b.issued_at || 0) - new Date(a.issued_at || 0);
  });

  // Pagination bounds
  const totalMatches = sortedCerts.length;
  const totalPages = Math.ceil(totalMatches / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalMatches);
  const pagedCerts = sortedCerts.slice(startIndex, endIndex);

  // Term Highlighter helper
  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    const cleanSearch = query.split(/\s+/)
      .filter(t => !t.includes(':') && !t.includes('>') && !t.includes('<') && !t.includes('='))
      .join(' ')
      .trim();
    if (!cleanSearch) return text;
    
    // Escape regex characters
    const escaped = cleanSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    
    // Split and highlight
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? <mark class="bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 px-0.5 rounded font-semibold" key={i}>{part}</mark> : part
        )}
      </>
    );
  };

  const openRevocationModal = (cert) => {
    setTargetCert(cert);
    setRevocationReason('Revocado por administración institucional');
    setRevokeModalOpen(true);
  };

  const submitRevocation = async () => {
    if (!targetCert) return;
    setSubmittingRevoke(true);
    
    try {
      const formData = new FormData();
      formData.append('certificate_id', targetCert.id);
      formData.append('reason', revocationReason);
      if (csrfToken) formData.append('csrf_token', csrfToken);
      
      const response = await fetch('/admin/revoke', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        setRevokeModalOpen(false);
        onShowToast("¡Credencial revocada exitosamente!", "success");
        onRefresh();
      } else {
        const errorText = await response.text();
        alert(`Error al revocar la credencial: ${errorText}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión al revocar.');
    } finally {
      setSubmittingRevoke(false);
    }
  };

  return (
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden mb-8">
      {/* Header and Counters */}
      <div class="py-5 px-6 border-b border-base-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-200/20">
        <div>
          <h3 class="font-outfit text-base font-bold text-base-content">Listado de Credenciales Recientes</h3>
          <p class="text-xs text-base-content/50 mt-0.5">Historial y estado de las emisiones registradas en el emisor institucional</p>
        </div>
        <span class="badge badge-neutral font-semibold text-xs py-2 px-3">
          {hasActiveFilters
            ? `Filtradas ${totalMatches} de ${certs.length} credenciales`
            : `${certs.length} credenciales en total`}
        </span>
      </div>

      {/* Advanced Query Filters & Controls */}
      <div class="p-6 border-b border-base-300 space-y-4">
        {/* Row 1: Search & Reset */}
        <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div class="relative flex-grow max-w-xl">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-base-content/40">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onInput={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por alumno, programa, GUID, Folio o Hash de Transacción..."
              class="input input-sm input-bordered pl-9 pr-8 w-full focus:ring-primary/20"
            />
            {searchQuery && (
              <button 
                onClick={() => handleSearchChange('')}
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-base-content"
                title="Limpiar texto"
              >
                ✕
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              class="btn btn-ghost btn-xs text-error font-semibold flex items-center gap-1 self-start md:self-auto"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              Limpiar Todos los Filtros
            </button>
          )}
        </div>

        {/* Row 2: Dropdown Select Filters & Sorting */}
        <div class="flex flex-wrap gap-2.5 items-center">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            class="select select-sm select-bordered font-semibold text-xs text-base-content"
          >
            <option value="all">Estatus: Todos</option>
            <option value="active">Activos</option>
            <option value="revoked">Revocados</option>
          </select>

          {/* Program / Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => handleCourseFilterChange(e.target.value)}
            class="select select-sm select-bordered font-semibold text-xs text-base-content max-w-xs"
          >
            <option value="all">Programa: Todos</option>
            {uniqueCourses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => handleDateFilterChange(e.target.value)}
            class="select select-sm select-bordered font-semibold text-xs text-base-content"
          >
            <option value="all">Fecha: Todas</option>
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="2026">Año 2026</option>
          </select>

          {/* Duration / Hours Filter */}
          <select
            value={hoursFilter}
            onChange={(e) => handleHoursFilterChange(e.target.value)}
            class="select select-sm select-bordered font-semibold text-xs text-base-content"
          >
            <option value="all">Horas: Todas</option>
            <option value="under30">&lt; 30 horas</option>
            <option value="30to60">30 a 60 horas</option>
            <option value="over60">&gt; 60 horas</option>
          </select>

          {/* Sorting Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => handleSortByChange(e.target.value)}
            class="select select-sm select-bordered font-semibold text-xs text-base-content ml-auto"
          >
            <option value="date_desc">Ordenar: Más Recientes</option>
            <option value="date_asc">Ordenar: Más Antiguos</option>
            <option value="name_asc">Alumno: A - Z</option>
            <option value="name_desc">Alumno: Z - A</option>
            <option value="hours_desc">Horas: Mayor a Menor</option>
          </select>
        </div>

        {/* Row 3: Quick Filter Preset Chips */}
        <div class="flex items-center gap-2 pt-1 flex-wrap">
          <span class="text-[11px] font-bold text-base-content/50 uppercase tracking-wider">Filtros Rápidos:</span>
          <button 
            onClick={() => handleSearchChange('Semiconductores')}
            class="badge badge-outline text-xs cursor-pointer hover:bg-primary hover:text-white transition-colors"
          >
            Semiconductores
          </button>
          <button 
            onClick={() => handleSearchChange('Ciberseguridad')}
            class="badge badge-outline text-xs cursor-pointer hover:bg-primary hover:text-white transition-colors"
          >
            Ciberseguridad
          </button>
          <button 
            onClick={() => handleSearchChange('Barbería')}
            class="badge badge-outline text-xs cursor-pointer hover:bg-primary hover:text-white transition-colors"
          >
            Barbería
          </button>
          <button 
            onClick={() => handleStatusFilterChange('active')}
            class="badge badge-outline text-xs cursor-pointer hover:bg-success hover:text-white transition-colors"
          >
            Solo Activos
          </button>
          <button 
            onClick={() => handleStatusFilterChange('revoked')}
            class="badge badge-outline text-xs cursor-pointer hover:bg-error hover:text-white transition-colors"
          >
            Solo Revocados
          </button>
        </div>
      </div>

      {/* Credentials Table */}
      <div class="overflow-x-auto">
        {totalMatches === 0 ? (
          <div class="text-center py-12 text-base-content/40 text-sm">
            No se encontraron credenciales que coincidan con la búsqueda y filtros seleccionados.
          </div>
        ) : (
          <table class="table table-md w-full text-left">
            <thead>
              <tr class="bg-base-200 text-base-content/75 border-b border-base-300">
                <th class="font-bold text-xs uppercase py-4">Alumno</th>
                <th class="font-bold text-xs uppercase py-4">Programa / Curso</th>
                <th class="font-bold text-xs uppercase py-4">ID Credencial</th>
                <th class="font-bold text-xs uppercase py-4">Estatus</th>
                <th class="font-bold text-xs uppercase py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagedCerts.map((c) => (
                <tr key={c.id} class="hover:bg-base-200/30 transition-colors border-b border-base-200">
                  <td class="py-4">
                    <div class="font-semibold text-base-content">
                      {highlightText(c.recipient, searchQuery)}
                    </div>
                    <div class="text-xs text-base-content/40 mt-0.5">
                      {highlightText(c.course_name || 'N/A', searchQuery)}
                    </div>
                  </td>
                  <td class="py-4">
                    <div class="text-sm text-base-content">{c.title}</div>
                    <div class="text-xs text-base-content/50 mt-0.5 font-semibold">{c.hours || 0} hrs • {c.issued_at ? c.issued_at.substring(0,10) : ''}</div>
                  </td>
                  <td class="py-4 font-mono">
                    <code class="text-xs bg-base-200 text-base-content/70 px-2 py-1 rounded-md">
                      {highlightText(c.id.substring(0, 8), searchQuery)}...
                    </code>
                  </td>
                  <td class="py-4">
                    {c.revoked ? (
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-error/10 text-error border border-error/20">
                        <span class="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                        Revocado
                      </span>
                    ) : (
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                        <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
                        Activo
                      </span>
                    )}
                  </td>
                  <td class="py-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <a
                        href={`/render/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn-outline btn-xs font-semibold"
                        title="Ver Diploma Web"
                      >
                        Ver
                      </a>
                      <a
                        href={`/certificate/${c.id}/constancia-pdf`}
                        download
                        class="btn btn-ghost btn-xs text-amber-500 font-semibold"
                        title="Descargar Constancia Oficial PDF"
                      >
                        Constancia PDF
                      </a>
                      {c.revoked ? (
                        <span class="text-[11px] text-base-content/40 font-semibold uppercase px-1">Revocada</span>
                      ) : (
                        <button
                          onClick={() => openRevocationModal(c)}
                          class="btn btn-error btn-outline btn-xs font-semibold"
                        >
                          Revocar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalMatches > 0 && (
        <div class="p-4 border-t border-base-300 flex flex-col sm:flex-row justify-between items-center gap-4 bg-base-200/10">
          <div class="flex flex-wrap items-center gap-3 text-base-content/60 text-xs">
            <span>
              Mostrando <strong>{startIndex + 1}-{endIndex}</strong> de <strong>{totalMatches}</strong>
            </span>
            <span class="text-base-content/20">|</span>
            <div class="flex items-center gap-1.5">
              <span>Filas por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(e.target.value)}
                class="select select-bordered select-xs text-xs font-medium cursor-pointer"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          
          <div class="flex gap-1.5 items-center">
            {/* Prev Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={activePage === 1}
              class="btn btn-bordered btn-xs font-semibold"
            >
              Anterior
            </button>
            
            {/* Page Index Numbers */}
            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1;
              const isPageActive = p === activePage;
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  class={`btn btn-xs w-8 h-8 font-semibold ${
                    isPageActive ? 'btn-primary' : 'btn-ghost border border-base-300'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={activePage === totalPages}
              class="btn btn-bordered btn-xs font-semibold"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Revocation Modal Dialog */}
      {revokeModalOpen && (
        <dialog open class="modal modal-open">
          <div class="modal-box bg-base-100 border border-base-300 max-w-md">
            <div class="flex items-center gap-3 text-error mb-4">
              <div class="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center border border-error/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 class="font-outfit font-bold text-lg text-base-content">Confirmar Revocación</h4>
            </div>

            <div class="space-y-4 mb-6">
              <p class="text-sm text-base-content/60 leading-relaxed">
                Esta acción revocará oficialmente la validez de la credencial. Se publicará en el listado público de revocaciones y la transacción quedará invalidada.
              </p>
              
              <div class="bg-base-200 border border-base-300 rounded-xl p-4 text-xs space-y-2">
                <div class="flex justify-between">
                  <span class="text-base-content/50">Alumno:</span>
                  <span class="font-semibold text-base-content">{targetCert?.recipient}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/50">Credencial:</span>
                  <span class="font-semibold text-base-content">{targetCert?.title}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/50">ID Credencial:</span>
                  <span class="font-mono text-base-content/75">{targetCert?.id}</span>
                </div>
              </div>
              
              <div>
                <label class="block text-xs font-semibold text-base-content/50 mb-1.5 uppercase tracking-wider">
                  Motivo de Revocación
                </label>
                <textarea
                  value={revocationReason}
                  onInput={(e) => setRevocationReason(e.target.value)}
                  class="textarea textarea-bordered w-full text-sm bg-base-200 resize-none h-20"
                />
              </div>
            </div>

            <div class="modal-action gap-3">
              <button
                onClick={() => setRevokeModalOpen(false)}
                disabled={submittingRevoke}
                class="btn btn-sm"
              >
                Cancelar
              </button>
              <button
                onClick={submitRevocation}
                disabled={submittingRevoke}
                class="btn btn-error btn-sm text-white"
              >
                {submittingRevoke ? 'Revocando...' : 'Revocar Credencial'}
              </button>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button onClick={() => setRevokeModalOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
