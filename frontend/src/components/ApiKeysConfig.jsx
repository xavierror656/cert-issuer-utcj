import { useState } from 'preact/hooks';

export function ApiKeysConfig({ apiKeys, csrfToken, onRefresh, onShowToast }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('auditor');
  const [submitting, setSubmitting] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('role', role);
      if (csrfToken) formData.append('csrf_token', csrfToken);

      const res = await fetch('/admin/api-keys', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        // Read redirect URL to extract generated token
        const finalUrl = res.url;
        const urlObj = new URL(finalUrl);
        const newKey = urlObj.searchParams.get('new_key');

        if (newKey) {
          setGeneratedKey(newKey);
          onShowToast('¡Token de API generado exitosamente!', 'success');
        } else {
          onShowToast('¡Token generado!', 'success');
        }
        
        setName('');
        onRefresh();
      } else {
        alert('Error al generar el token.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (token) => {
    if (!confirm('¿Estás seguro de que deseas revocar este token de API? Perderá acceso inmediato.')) return;

    try {
      const formData = new FormData();
      formData.append('token', token);
      if (csrfToken) formData.append('csrf_token', csrfToken);

      const res = await fetch('/admin/api-keys/revoke', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        onShowToast('¡Token de API revocado exitosamente!', 'success');
        onRefresh();
      } else {
        alert('Error al revocar el token.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    onShowToast('¡Copiado al portapapeles!', 'success');
  };

  return (
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {/* List of active tokens */}
      <div class="lg:col-span-2 space-y-6">
        <div class="card bg-base-100 border border-base-300 shadow-sm p-6">
          <div class="mb-4">
            <h4 class="font-outfit text-base font-bold text-base-content">Tokens de API Activos</h4>
            <p class="text-xs text-base-content/50 mt-0.5">Claves de acceso activas autorizadas para consulta externa</p>
          </div>

          <div class="overflow-x-auto">
            {apiKeys.length === 0 ? (
              <div class="text-center py-8 text-base-content/40 text-sm">
                No hay claves de acceso registradas.
              </div>
            ) : (
              <table class="table table-sm w-full text-left">
                <thead>
                  <tr class="bg-base-200 text-base-content/70">
                    <th class="text-xs uppercase">Nombre</th>
                    <th class="text-xs uppercase">Rol</th>
                    <th class="text-xs uppercase">Token</th>
                    <th class="text-xs uppercase text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => (
                    <tr key={key.id} class="hover:bg-base-200/50 transition-colors">
                      <td class="text-xs font-semibold text-base-content">{key.name}</td>
                      <td>
                        <span class={`badge badge-xs font-semibold py-1.5 px-2 ${
                          key.role === 'admin' 
                            ? 'badge-primary' 
                            : key.role === 'issuer' 
                            ? 'badge-success text-success-content' 
                            : 'badge-neutral'
                        }`}>
                          {key.role}
                        </span>
                      </td>
                      <td>
                        <code class="text-[10px] bg-base-200 px-1.5 py-0.5 rounded font-mono text-base-content/70">
                          {key.token.substring(0, 12)}...
                        </code>
                      </td>
                      <td class="text-right">
                        <button
                          onClick={() => handleRevoke(key.token)}
                          class="btn btn-error btn-outline btn-xs font-semibold"
                        >
                          Revocar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Generate new key form */}
      <div class="lg:col-span-1 space-y-6">
        <form onSubmit={handleGenerate} class="card bg-base-100 border border-base-300 shadow-sm p-6 space-y-4">
          <div>
            <h4 class="font-outfit text-base font-bold text-base-content">Nuevo Token</h4>
            <p class="text-xs text-base-content/50 mt-0.5">Genera una nueva credencial de acceso para sistemas externos</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-base-content/75 uppercase tracking-wide">
              Nombre de Integración
            </label>
            <input
              type="text"
              value={name}
              onInput={(e) => setName(e.target.value)}
              placeholder="Ej. Sistema Alumnos"
              class="input input-sm input-bordered focus:ring-primary/20"
              required
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-base-content/75 uppercase tracking-wide">
              Rol de Permisos
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              class="select select-sm select-bordered font-semibold text-base-content"
            >
              <option value="auditor">Auditor (Lectura de verificación)</option>
              <option value="issuer">Emisor (Registro/Emisión)</option>
              <option value="admin">Administrador (Acceso total)</option>
            </select>
          </div>

          <div class="pt-2 border-t border-base-200">
            <button
              type="submit"
              disabled={submitting}
              class="btn btn-primary btn-sm w-full font-bold"
            >
              {submitting ? 'Generando...' : 'Generar Token'}
            </button>
          </div>
        </form>

        {/* Display generated key overlay */}
        {generatedKey && (
          <div class="card bg-primary/10 border border-primary/20 p-5 space-y-3 relative overflow-hidden animate-[scale_0.2s_ease-out]">
            <div class="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
            <h5 class="text-xs font-bold text-primary uppercase tracking-wider">¡Clave Generada!</h5>
            <p class="text-[10px] text-base-content/70 leading-relaxed">
              Copia esta clave ahora. Por motivos de seguridad, <strong>no se volverá a mostrar</strong>.
            </p>
            
            <div class="flex gap-2">
              <input
                type="text"
                readOnly
                value={generatedKey}
                class="input input-xs font-mono text-[10px] bg-base-100 flex-1 select-all"
              />
              <button
                onClick={() => copyToClipboard(generatedKey)}
                class="btn btn-primary btn-xs font-bold"
              >
                Copiar
              </button>
            </div>
            
            <button
              onClick={() => setGeneratedKey(null)}
              class="btn btn-bordered btn-xs w-full text-[10px] font-semibold"
            >
              Entendido / Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
