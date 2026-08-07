
        // Data for dynamic interactive SVG chart
        const chartLabels = ["Mar 26", "Abr 26", "Jun 26"];
        const chartData = [5, 1, 46];
        
        function initChart() {
          const svg = document.getElementById('emission-svg-chart');
          if (!svg) return;
          
          const maxVal = Math.max(...chartData, 5);
          const width = 300;
          const height = 100;
          const pointsCount = chartData.length;
          
          let linePoints = [];
          chartData.forEach((val, i) => {
            const x = (i / (pointsCount - 1)) * width;
            const y = 100 - (val / maxVal) * 80;
            linePoints.push(`${x},${y}`);
          });
          
          const linePathStr = 'M ' + linePoints.join(' L ');
          const areaPathStr = linePathStr + ` L ${width},100 L 0,100 Z`;
          
          const linePath = document.getElementById('chart-line-path');
          const areaPath = document.getElementById('chart-area-path');
          
          if (linePath) linePath.setAttribute('d', linePathStr);
          if (areaPath) areaPath.setAttribute('d', areaPathStr);
          
          if (linePath) {
            const pathLength = linePath.getTotalLength();
            linePath.style.strokeDasharray = pathLength;
            linePath.style.strokeDashoffset = pathLength;
            linePath.getBoundingClientRect();
            linePath.style.transition = 'stroke-dashoffset 1.2s ease-in-out';
            linePath.style.strokeDashoffset = 0;
          }
          
          const dotsGroup = document.getElementById('chart-dots-group');
          const labelsContainer = document.getElementById('chart-labels-container');
          const tooltip = document.getElementById('chart-tooltip');
          const tooltipContent = document.getElementById('tooltip-content');
          
          if (dotsGroup) {
            dotsGroup.innerHTML = '';
            chartData.forEach((val, i) => {
              const x = (i / (pointsCount - 1)) * width;
              const y = 100 - (val / maxVal) * 80;
              
              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', x);
              circle.setAttribute('cy', y);
              circle.setAttribute('r', 4);
              circle.setAttribute('fill', 'white');
              circle.setAttribute('stroke', 'var(--primary, #0F6A52)');
              circle.setAttribute('stroke-width', 2);
              circle.setAttribute('class', 'cursor-pointer transition-all duration-150');
              
              circle.addEventListener('mouseenter', (e) => {
                circle.setAttribute('r', 6);
                circle.setAttribute('fill', 'var(--primary, #0F6A52)');
                tooltipContent.innerText = `${chartLabels[i]}: ${val}`;
                tooltip.classList.remove('hidden');
                
                const svgRect = svg.getBoundingClientRect();
                const relativeX = (x / width) * svgRect.width;
                const relativeY = (y / 120) * svgRect.height;
                tooltip.style.left = `${relativeX}px`;
                tooltip.style.top = `${relativeY - 8}px`;
              });
              
              circle.addEventListener('mouseleave', () => {
                circle.setAttribute('r', 4);
                circle.setAttribute('fill', 'white');
                tooltip.classList.add('hidden');
              });
              
              dotsGroup.appendChild(circle);
            });
          }
          
          if (labelsContainer) {
            labelsContainer.innerHTML = '';
            chartLabels.forEach(label => {
              const span = document.createElement('span');
              span.innerText = label;
              labelsContainer.appendChild(span);
            });
          }
        }
        
        function initCounters() {
          const counters = document.querySelectorAll('.count-up');
          counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target') || '0', 10);
            if (target === 0) {
              counter.innerText = '0';
              return;
            }
            let current = 0;
            const duration = 1000;
            const start = performance.now();
            
            function update(timestamp) {
              const elapsed = timestamp - start;
              const progress = Math.min(elapsed / duration, 1);
              const easeProgress = 1 - Math.pow(1 - progress, 3);
              current = Math.floor(easeProgress * target);
              counter.innerText = current;
              
              if (progress < 1) {
                requestAnimationFrame(update);
              } else {
                counter.innerText = target;
              }
            }
            requestAnimationFrame(update);
          });
        }
        
        function fireConfetti() {
          const canvas = document.createElement('canvas');
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          canvas.style.position = 'fixed';
          canvas.style.top = '0';
          canvas.style.left = '0';
          canvas.style.pointerEvents = 'none';
          canvas.style.zIndex = '9999';
          document.body.appendChild(canvas);
          
          const ctx = canvas.getContext('2d');
          const colors = ['#0F6A52', '#B88A3B', '#10B981', '#3B82F6', '#F59E0B'];
          const particles = [];
          
          for (let i = 0; i < 80; i++) {
            particles.push({
              x: canvas.width / 2,
              y: canvas.height * 0.4,
              vx: (Math.random() - 0.5) * 15,
              vy: (Math.random() - 0.7) * 12 - 5,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: Math.random() * 6 + 4,
              rotation: Math.random() * Math.PI * 2,
              rotationSpeed: (Math.random() - 0.5) * 0.2,
              opacity: 1
            });
          }
          
          function frame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let active = false;
            
            particles.forEach(p => {
              p.x += p.vx;
              p.y += p.vy;
              p.vy += 0.35;
              p.vx *= 0.98;
              p.rotation += p.rotationSpeed;
              p.opacity -= 0.015;
              
              if (p.opacity > 0) {
                active = true;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
              }
            });
            
            if (active) {
              requestAnimationFrame(frame);
            } else {
              canvas.remove();
            }
          }
          requestAnimationFrame(frame);
        }

        function updateColorHex(k, val) {
          document.getElementById('input-hex-' + k).value = val.toUpperCase();
          const cssMap = {
            'green': '--primary',
            'green_deep': '--primary-dark',
            'gold': '--accent',
            'teal': '--teal',
            'silver': '--silver'
          };
          const cssVar = cssMap[k];
          if (cssVar) {
            document.documentElement.style.setProperty(cssVar, val);
          }
        }

        function updateColorPicker(k, val) {
          if (val.match(/^#[0-9A-F]{6}$/i)) {
            const picker = document.getElementById('picker-' + k);
            if (picker) {
              picker.value = val;
              const cssMap = {
                'green': '--primary',
                'green_deep': '--primary-dark',
                'gold': '--accent',
                'teal': '--teal',
                'silver': '--silver'
              };
              const cssVar = cssMap[k];
              if (cssVar) {
                document.documentElement.style.setProperty(cssVar, val);
              }
            }
          }
        }

        let targetRevokeId = '';
        function openRevocationModal(id, recipient, title) {
          targetRevokeId = id;
          document.getElementById('modal-recipient').innerText = recipient;
          document.getElementById('modal-title').innerText = title;
          document.getElementById('modal-cert-id').innerText = id;
          document.getElementById('revocation-reason').value = 'Revocado por administración institucional';
          document.getElementById('revocation-modal').classList.remove('hidden');
          document.getElementById('revocation-modal').classList.add('flex');
        }
        
        function closeRevocationModal() {
          document.getElementById('revocation-modal').classList.remove('flex');
          document.getElementById('revocation-modal').classList.add('hidden');
        }
        
        function submitRevocation() {
          const reason = document.getElementById('revocation-reason').value;
          const formData = new FormData();
          formData.append('certificate_id', targetRevokeId);
          formData.append('reason', reason);
          
          fetch('/admin/revoke', {
            method: 'POST',
            body: formData
          }).then(res => {
            if(res.ok) {
              closeRevocationModal();
              showToast("¡Credencial revocada exitosamente!");
              setTimeout(() => { window.location.reload(); }, 1500);
            } else {
              alert('Error al revocar la credencial.');
            }
          });
        }
        
        function filterCertificates() {
          const search = document.getElementById('search-input').value.toLowerCase();
          const filter = document.getElementById('status-filter').value;
          const rows = document.querySelectorAll('tbody tr');
          
          let visibleCount = 0;
          let totalCount = 0;

          rows.forEach(row => {
            const name = row.getAttribute('data-name');
            if (!name) return;
            
            totalCount++;
            const id = row.getAttribute('data-id');
            const title = row.getAttribute('data-title');
            const course = row.getAttribute('data-course') || 'N/A';
            const isRevoked = row.getAttribute('data-revoked') === 'true';
            
            const matchesSearch = name.toLowerCase().includes(search) || 
                                  id.toLowerCase().includes(search) || 
                                  title.toLowerCase().includes(search) ||
                                  course.toLowerCase().includes(search);
                                  
            const matchesFilter = filter === 'all' || 
                                  (filter === 'active' && !isRevoked) || 
                                  (filter === 'revoked' && isRevoked);
                                  
            const cells = row.querySelectorAll('td');
            if (matchesSearch && matchesFilter) {
              row.classList.remove('hidden');
              visibleCount++;
              
              if (search.length >= 1) {
                highlightCell(cells[0], `<div class="font-semibold text-slate-800">${name}</div><div class="text-xs text-slate-400 mt-0.5">${course}</div>`, search);
                highlightCell(cells[1], title, search);
                highlightCell(cells[2], `<code class="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-mono">${id.substring(0, 8)}...</code>`, search);
              } else {
                cells[0].innerHTML = `<div class="font-semibold text-slate-800">${name}</div><div class="text-xs text-slate-400 mt-0.5">${course}</div>`;
                cells[1].innerHTML = title;
                cells[2].innerHTML = `<code class="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-mono">${id.substring(0, 8)}...</code>`;
              }
            } else {
              row.classList.add('hidden');
            }
          });

          const countEl = document.getElementById('search-count');
          if (countEl) {
            if (search.length > 0 || filter !== 'all') {
              countEl.innerText = `Encontradas ${visibleCount} de ${totalCount} credenciales`;
            } else {
              countEl.innerText = `${totalCount} credenciales en total`;
            }
          }
        }
        
        function highlightCell(cell, originalHtml, search) {
          const regex = new RegExp(`($${search.replace(/[-\/\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
          const parts = originalHtml.split(/(<[^>]*>)/);
          const highlightedParts = parts.map(part => {
            if (part.startsWith('<')) return part;
            return part.replace(regex, '<mark class="bg-amber-100 text-amber-900 px-0.5 rounded font-semibold">$1</mark>');
          });
          cell.innerHTML = highlightedParts.join('');
        }
        
        function exportToCSV() {
          const rows = document.querySelectorAll('tbody tr');
          let csvContent = "Receptor,Programa Academico,ID Credencial,Fecha Emision,Estatus
";
          
          let count = 0;
          rows.forEach(row => {
            if (row.classList.contains('hidden')) return;
            const name = row.getAttribute('data-name');
            if (!name) return; // skip non-cert rows
            
            const id = row.getAttribute('data-id');
            const title = row.getAttribute('data-title');
            const course = row.getAttribute('data-course') || 'N/A';
            const isRevoked = row.getAttribute('data-revoked') === 'true';
            
            const cells = row.querySelectorAll('td');
            const date = cells[3].innerText;
            const status = isRevoked ? "Revocado" : "Activo";
            
            const escapeCSV = (str) => `"${str.replace(/"/g, '""')}"`;
            csvContent += `${escapeCSV(name)},${escapeCSV(course)},${escapeCSV(id)},${escapeCSV(date)},${escapeCSV(status)}
`;
            count++;
          });
          
          if (count === 0) {
            alert("No hay registros visibles para exportar.");
            return;
          }
          
          const blob = new Blob(["﻿" + csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `utcj_microcredenciales_export_${new Date().toISOString().slice(0,10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast(`¡Exportados ${count} registros a CSV con éxito!`);
        }
        
        function showToast(message) {
          const toast = document.getElementById('toast-notification');
          document.getElementById('toast-msg').innerText = message;
          toast.classList.remove('translate-y-24', 'opacity-0');
          setTimeout(() => {
            toast.classList.add('translate-y-24', 'opacity-0');
          }, 4000);
        }
        
        function copyToken(tokenVal) {
          navigator.clipboard.writeText(tokenVal);
          showToast("¡Token copiado al portapapeles!");
        }
        
        function toggleTokenVisibility(btn, tokenVal) {
          const span = btn.previousElementSibling;
          if (span.innerText.includes('•')) {
            span.innerText = tokenVal;
            btn.innerText = 'Ocultar';
          } else {
            span.innerText = '••••••••' + tokenVal.substring(tokenVal.length - 4);
            btn.innerText = 'Mostrar';
          }
        }
        
        function revokeApiKey(tokenVal) {
          if (confirm("¿Estás seguro de que deseas revocar este Token de API? Los servicios que lo usen perderán acceso inmediato.")) {
            const formData = new FormData();
            formData.append('token', tokenVal);
            fetch('/admin/api-keys/revoke', {
              method: 'POST',
              body: formData
            }).then(res => {
              if(res.ok) {
                showToast("¡Token de API revocado!");
                setTimeout(() => { window.location.reload(); }, 1500);
              } else {
                alert('Error al revocar the token.');
              }
            });
          }
        }

        function switchDashboardTab(tabId) {
          // Hide all sections
          document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
          
          // Show target section
          const targetSec = document.getElementById('section-' + tabId);
          if (targetSec) targetSec.classList.add('active');

          // Update navigation styles
          const tabs = [
            { id: 'overview', nav: 'nav-overview' },
            { id: 'branding', nav: 'nav-branding' },
            { id: 'signature', nav: 'nav-signature' },
            { id: 'api-keys', nav: 'nav-tokens' }
          ];

          tabs.forEach(t => {
            const navLink = document.getElementById(t.nav);
            if (navLink) {
              if (t.id === tabId) {
                navLink.className = 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-50 text-slate-900 border border-slate-100';
              } else {
                navLink.className = 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50/60 transition-colors';
              }
            }
          });
          
          history.replaceState(null, null, '#' + tabId);
        }

        function setupDragAndDrop() {
          const dropzone = document.querySelector('label[for="sig-file-input"]');
          const fileInput = document.getElementById('sig-file-input');
          if (!dropzone || !fileInput) return;
          const sigForm = fileInput.form;

          ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
              e.preventDefault();
              e.stopPropagation();
              dropzone.classList.add('border-emerald-500', 'bg-emerald-50/20');
            }, false);
          });

          ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
              e.preventDefault();
              e.stopPropagation();
              dropzone.classList.remove('border-emerald-500', 'bg-emerald-50/20');
            }, false);
          });

          dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length) {
              fileInput.files = files;
              showSignatureLoader();
              sigForm.submit();
            }
          }, false);

          fileInput.addEventListener('change', () => {
            if (fileInput.files.length) {
              showSignatureLoader();
            }
          });
        }

        function showSignatureLoader() {
          const container = document.getElementById('signature-panel');
          if (container) {
            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30 rounded-xl';
            overlay.innerHTML = `
              <svg class="w-10 h-10 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="rgba(16,185,129,0.2)" stroke-width="4"></circle>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span class="text-sm font-semibold text-slate-700">Subiendo e invalidando firmas antiguas...</span>
            `;
            container.style.position = 'relative';
            container.appendChild(overlay);
          }
        }
        
        window.addEventListener('DOMContentLoaded', () => {
          initChart();
          initCounters();
          
          // Switch to active tab from hash if exists, default to 'overview'
          const hash = window.location.hash.substring(1);
          const validTabs = ['overview', 'branding', 'signature', 'api-keys'];
          if (validTabs.includes(hash)) {
            switchDashboardTab(hash);
          } else {
            switchDashboardTab('overview');
          }

          // Setup drag-and-drop signature listeners
          setupDragAndDrop();
          
          const params = new URLSearchParams(window.location.search);
          if (params.get('toast') === 'branding_saved') {
            showToast("¡Branding actualizado con éxito!");
            window.history.replaceState({}, document.title, window.location.pathname);
          } else if (params.get('toast') === 'signature_saved') {
            showToast("¡Firma del rector guardada con éxito!");
            fireConfetti();
            window.history.replaceState({}, document.title, window.location.pathname);
          } else if (params.get('toast') === 'key_generated') {
            showToast("¡Token de API generado!");
            fireConfetti();
            window.history.replaceState({}, document.title, window.location.pathname);
          } else if (params.get('error') === 'invalid_file') {
            alert("Error: Solo se admiten archivos PNG o JPG para la firma.");
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          // Initial search count update
          const rows = document.querySelectorAll('tbody tr');
          let count = 0;
          rows.forEach(r => { if (r.getAttribute('data-name')) count++; });
          const countEl = document.getElementById('search-count');
          if (countEl) countEl.innerText = `${count} credenciales en total`;
        });

        function toggleTheme() {
          const body = document.body;
          const sunIcon = document.querySelector('.sun-icon');
          const moonIcon = document.querySelector('.moon-icon');
          
          if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            if (sunIcon) sunIcon.classList.add('hidden');
            if (moonIcon) moonIcon.classList.remove('hidden');
            localStorage.setItem('theme', 'light');
          } else {
            body.classList.add('dark-theme');
            if (sunIcon) sunIcon.classList.remove('hidden');
            if (moonIcon) moonIcon.classList.add('hidden');
            localStorage.setItem('theme', 'dark');
          }
        }

        (function() {
          if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
            window.addEventListener('DOMContentLoaded', () => {
              const sunIcon = document.querySelector('.sun-icon');
              const moonIcon = document.querySelector('.moon-icon');
              if (sunIcon) sunIcon.classList.remove('hidden');
              if (moonIcon) moonIcon.classList.add('hidden');
            });
          }
        })();

        window.addEventListener('keydown', (e) => {
          if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
              switchDashboardTab('overview');
              searchInput.focus();
            }
          }
          if (e.key === 'Escape') {
            closeRevocationModal();
          }
        });
      