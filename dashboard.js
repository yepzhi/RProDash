/* ==============================================
   RProDash — Dashboard Logic
   KPIs, Charts (Chart.js), Mexico Map, Filters
   ============================================== */

const chartRegistry = {};
let allSchools = [];
let filteredSchools = [];

// ── Boot ──
function boot() {
    if (!requireAuth()) return;
    const advisor = getCurrentAdvisor();
    const color = advisor ? advisorColor(advisor) : '#0a84ff';

    // Nav badge — shows current advisor or global label
    const badge = document.getElementById('navAdvisorBadge');
    if (advisor) {
        badge.innerHTML = `<span class="advisor-dot" style="background:${color}"></span>${advisor}`;
    } else {
        badge.innerHTML = `<span class="advisor-dot" style="background:var(--accent-2)"></span>Vista Global`;
    }

    allSchools = getSchools();
    filteredSchools = [...allSchools];

    buildFilterOptions();
    renderKPIs();
    renderTable();
    buildCharts();
    buildMap();
    initParticles('particleCanvas', color);
}

// ── Tabs ──
function switchTab(btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.panel).classList.add('active');
    // Rebuild charts when tab becomes visible
    if (btn.dataset.panel === 'panelGraficas') { buildCharts(); }
    if (btn.dataset.panel === 'panelAudit') { renderAudit(); }
}

// ── Filter Options ──
function buildFilterOptions() {
    const asesorSel = document.getElementById('fAsesor');
    const etapaSel = document.getElementById('fEtapa');

    ADVISORS.forEach(a => {
        const o = document.createElement('option'); o.value = a; o.textContent = a;
        asesorSel.appendChild(o);
    });

    const etapas = [...new Set(allSchools.map(s => s.etapa).filter(Boolean))];
    etapas.forEach(e => {
        const o = document.createElement('option'); o.value = e; o.textContent = e;
        etapaSel.appendChild(o);
    });

    // Default to global view — no advisor pre-selected
    applyFilters();
}

function applyFilters() {
    const a = document.getElementById('fAsesor').value;
    const t = document.getElementById('fTipo').value;
    const e = document.getElementById('fEtapa').value;
    const d = document.getElementById('fDist').value;
    filteredSchools = allSchools.filter(s =>
        (!a || s.asesor === a) &&
        (!t || s.tipo === t) &&
        (!e || s.etapa === e) &&
        (!d || s.distribuidor === d)
    );
    renderKPIs();
    renderTable();
}

function resetFilters() {
    document.getElementById('fAsesor').value = '';
    document.getElementById('fTipo').value = '';
    document.getElementById('fEtapa').value = '';
    document.getElementById('fDist').value = '';
    filteredSchools = [...allSchools];
    renderKPIs();
    renderTable();
}

// ── KPIs ──
function renderKPIs() {
    const s = filteredSchools;
    const totalEscuelas = s.length;
    const totalAlumnos = s.reduce((a, x) => a + (x.alumnos_periodo || 0), 0);
    const totalVenta = s.reduce((a, x) => a + calcVentaProyectada(x), 0);
    const avgTicket = totalEscuelas ? totalVenta / totalEscuelas : 0;
    const conquistas = s.filter(x => x.tipo === 'conquista').length;
    const usuarios = s.filter(x => x.tipo === 'usuario').length;

    document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Escuelas</div>
      <div class="kpi-value">${totalEscuelas}</div>
      <div class="kpi-sub">${usuarios} usuarios · ${conquistas} conquistas</div>
      <div class="ratio-bar" style="margin-top:10px">
        <div class="ratio-fill" style="width:${totalEscuelas ? usuarios / totalEscuelas * 100 : 0}%;background:var(--accent)"></div>
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Alumnos / Periodo</div>
      <div class="kpi-value">${formatNumber(totalAlumnos)}</div>
      <div class="kpi-sub">Demanda potencial por período</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Venta proyectada</div>
      <div class="kpi-value" style="font-size:1.6em;">${formatCurrency(totalVenta)}</div>
      <div class="kpi-sub">Por período académico</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Ticket promedio</div>
      <div class="kpi-value" style="font-size:1.6em;">${formatCurrency(avgTicket)}</div>
      <div class="kpi-sub">Por escuela</div>
    </div>
  `;
}

// ── Table ──
function renderTable() {
    const tbody = document.getElementById('tableBody');
    document.getElementById('countBadge').textContent = filteredSchools.length;

    if (!filteredSchools.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-3)">Sin resultados. Prueba cambiando los filtros.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredSchools.map(s => {
        const color = advisorColor(s.asesor);
        const etColor = etapaColor(s.etapa || '');
        const venta = calcVentaProyectada(s);
        return `<tr>
      <td><strong>${esc(s.nombre) || '—'}</strong></td>
      <td><span style="display:inline-flex;align-items:center;gap:5px">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
        ${esc(s.asesor)}
      </span></td>
      <td><span class="badge ${s.tipo === 'usuario' ? 'badge-blue' : 'badge-orange'}">${s.tipo === 'usuario' ? ' Usuario' : ' Conquista'}</span></td>
      <td><span class="badge" style="background:${etColor}22;color:${etColor}">${esc(s.etapa) || '—'}</span></td>
      <td style="text-align:right">${formatNumber(s.alumnos_periodo)}</td>
      <td style="text-align:right">${formatCurrency(s.precioNeto)}</td>
      <td style="text-align:right;font-weight:700;color:var(--accent)">${formatCurrency(venta)}</td>
      <td>${s.distribuidor === 'distribuidor' ? ` ${esc(s.nombreDistribuidor || '')}` : ' Directo'}</td>
      <td style="color:var(--text-3);font-size:12px">${formatDate(s.updatedAt)}</td>
    </tr>`;
    }).join('');
}

// ── Charts ──
const CHART_DEFAULTS = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#ffffff99', font: { size: 12 } }, position: 'bottom' } },
};

function destroyChart(id) {
    if (chartRegistry[id]) { chartRegistry[id].destroy(); delete chartRegistry[id]; }
}

function buildCharts() {
    const s = allSchools;

    // Chart 1: Donut tipo
    destroyChart('tipo');
    const u = s.filter(x => x.tipo === 'usuario').length;
    const c = s.filter(x => x.tipo === 'conquista').length;
    chartRegistry.tipo = new Chart(document.getElementById('chartTipo'), {
        type: 'doughnut',
        data: {
            labels: [' Usuario', ' Conquista'],
            datasets: [{ data: [u, c], backgroundColor: ['#0a84ff', '#ff9f0a'], borderWidth: 0 }]
        },
        options: { ...CHART_DEFAULTS, cutout: '65%' }
    });

    // Chart 2: Bar escuelas por asesor
    destroyChart('asesor');
    const asesorCounts = ADVISORS.map(a => s.filter(x => x.asesor === a).length);
    chartRegistry.asesor = new Chart(document.getElementById('chartAsesor'), {
        type: 'bar',
        data: {
            labels: ADVISORS,
            datasets: [{
                label: 'Escuelas', data: asesorCounts,
                backgroundColor: ADVISORS.map(a => advisorColor(a) + '99'),
                borderColor: ADVISORS.map(a => advisorColor(a)),
                borderWidth: 2, borderRadius: 6
            }]
        },
        options: {
            ...CHART_DEFAULTS, indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { color: '#ffffff55' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#ffffffaa' }, grid: { display: false } } }
        }
    });

    // Chart 3: Bar etapas conquista
    destroyChart('etapa');
    const etapaData = {};
    s.filter(x => x.tipo === 'conquista').forEach(x => { etapaData[x.etapa] = (etapaData[x.etapa] || 0) + 1; });
    const etLabels = Object.keys(etapaData).sort((a, b) => (etapaPercent(a) || 0) - (etapaPercent(b) || 0));
    chartRegistry.etapa = new Chart(document.getElementById('chartEtapa'), {
        type: 'bar',
        data: {
            labels: etLabels.map(e => { const m = e.match(/(\d+)%/); return m ? m[0] + ' — ' + e.split(' ')[0] : e; }),
            datasets: [{
                label: 'Escuelas', data: etLabels.map(e => etapaData[e]),
                backgroundColor: 'rgba(255,159,10,0.35)', borderColor: '#ff9f0a', borderWidth: 2, borderRadius: 6
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#ffffff55', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#ffffffaa' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });

    // Chart 4: Bar venta por asesor
    destroyChart('venta');
    const ventaData = ADVISORS.map(a => {
        const sc = s.filter(x => x.asesor === a);
        return sc.reduce((acc, x) => acc + calcVentaProyectada(x), 0);
    });
    chartRegistry.venta = new Chart(document.getElementById('chartVenta'), {
        type: 'bar',
        data: {
            labels: ADVISORS,
            datasets: [{
                label: 'Venta proyectada ($)', data: ventaData,
                backgroundColor: ADVISORS.map(a => advisorColor(a) + '88'),
                borderColor: ADVISORS.map(a => advisorColor(a)),
                borderWidth: 2, borderRadius: 6
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#ffffff55' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#ffffffaa', callback: v => '$' + formatNumber(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

// ── Real Mexico Map with D3 + TopoJSON ──
const MEXICO_TOPOJSON_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'; // fallback
const MX_GEO_URL = 'https://raw.githubusercontent.com/angelnmara/geojson/master/mexicoHigh.json';

function buildMap() {
    const container = document.getElementById('mapSvg').parentElement;
    const tooltip = document.getElementById('mapTooltip');
    const advisorProfiles = getAllAdvisorStates();

    // Build reverse map: stateName → advisor
    const stateOwner = {};
    Object.entries(advisorProfiles).forEach(([advisor, profile]) => {
        (profile.estados || []).forEach(name => { stateOwner[name] = advisor; });
    });

    // Legend
    const usedAdvisors = [...new Set(Object.values(stateOwner))];
    document.getElementById('mapLegend').innerHTML =
        usedAdvisors.map(a => `
            <div class="map-legend-item">
              <div class="map-legend-dot" style="background:${advisorColor(a)}"></div>
              <span>${a}</span>
            </div>`).join('') +
        `<div class="map-legend-item">
           <div class="map-legend-dot" style="background:#1c1c1e;border:1px solid rgba(255,255,255,0.15)"></div>
           <span>Sin asignar</span>
         </div>`;

    // Build D3 SVG
    const svgEl = document.getElementById('mapSvg');
    svgEl.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#636366" font-size="14">Cargando mapa…</text>';

    const w = container.clientWidth || 800;
    const h = Math.round(w * 0.6);
    svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svgEl.style.width = '100%';
    svgEl.style.height = 'auto';

    fetch(MX_GEO_URL)
        .then(r => r.json())
        .then(geoData => {
            svgEl.innerHTML = '';
            const svg = d3.select(svgEl);
            const projection = d3.geoMercator().fitSize([w, h], geoData);
            const path = d3.geoPath().projection(projection);

            svg.selectAll('path')
                .data(geoData.features)
                .enter()
                .append('path')
                .attr('d', path)
                .attr('id', d => 'state_' + (d.properties.ESTADO || d.properties.name || '').replace(/\s/g, '_'))
                .style('fill', d => {
                    const sName = d.properties.ESTADO || d.properties.name || '';
                    const owner = stateOwner[sName];
                    return owner ? advisorColor(owner) + 'aa' : '#1c1c1e';
                })
                .style('stroke', d => {
                    const sName = d.properties.ESTADO || d.properties.name || '';
                    const owner = stateOwner[sName];
                    return owner ? advisorColor(owner) : 'rgba(255,255,255,0.12)';
                })
                .style('stroke-width', d => {
                    const sName = d.properties.ESTADO || d.properties.name || '';
                    return stateOwner[sName] ? '1.5' : '0.7';
                })
                .style('cursor', 'pointer')
                .style('transition', 'fill 0.2s')
                .on('mouseover', function (event, d) {
                    const sName = d.properties.ESTADO || d.properties.name || '';
                    const owner = stateOwner[sName];
                    const color = owner ? advisorColor(owner) : null;
                    const schools = owner ? allSchools.filter(s => s.asesor === owner).length : 0;
                    d3.select(this).style('fill', owner ? advisorColor(owner) + 'dd' : 'rgba(10,132,255,0.25)');
                    tooltip.style.opacity = '1';
                    tooltip.style.left = (event.pageX + 14) + 'px';
                    tooltip.style.top = (event.pageY - 30) + 'px';
                    tooltip.innerHTML = `<strong>${sName}</strong><br>${owner
                            ? `<span style="color:${color}">● ${owner}</span> · ${schools} escuela${schools !== 1 ? 's' : ''}`
                            : '<span style="color:#636366">Sin asignar</span>'
                        }`;
                })
                .on('mousemove', function (event) {
                    tooltip.style.left = (event.pageX + 14) + 'px';
                    tooltip.style.top = (event.pageY - 30) + 'px';
                })
                .on('mouseout', function (event, d) {
                    const sName = d.properties.ESTADO || d.properties.name || '';
                    const owner = stateOwner[sName];
                    d3.select(this).style('fill', owner ? advisorColor(owner) + 'aa' : '#1c1c1e');
                    tooltip.style.opacity = '0';
                });

            // State labels
            svg.selectAll('text.state-label')
                .data(geoData.features.filter(d => {
                    const b = path.bounds(d);
                    return (b[1][0] - b[0][0]) > 20 && (b[1][1] - b[0][1]) > 14;
                }))
                .enter()
                .append('text')
                .attr('class', 'state-label')
                .attr('transform', d => `translate(${path.centroid(d)})`)
                .attr('text-anchor', 'middle')
                .attr('font-size', '9')
                .attr('fill', 'rgba(255,255,255,0.55)')
                .attr('pointer-events', 'none')
                .text(d => {
                    const name = d.properties.ESTADO || d.properties.name || '';
                    return name.length > 10 ? name.split(' ')[0] : name;
                });
        })
        .catch(err => {
            svgEl.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#ff453a" font-size="13">
                Error cargando mapa. Verifica tu conexión.
            </text>`;
            console.warn('Map load error:', err);
        });
}


function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Excel export ──
const EXCEL_COLS = [
    'asesor', 'nombre', 'tipo', 'tipoCompra', 'etapa', 'alumnosTotales', 'alumnos_periodo',
    'periodicidad', 'precioNeto', 'distribuidor', 'nombreDistribuidor', 'createdAt', 'updatedAt'
];
const EXCEL_HEADERS = {
    asesor: 'Asesor', nombre: 'Nombre Escuela', tipo: 'Tipo', tipoCompra: 'Tipo Compra',
    etapa: 'Etapa', alumnosTotales: 'Alumnos Totales', alumnos_periodo: 'Alumnos/Periodo',
    periodicidad: 'Periodicidad', precioNeto: 'Precio Neto', distribuidor: 'Canal',
    nombreDistribuidor: 'Nombre Distribuidor', createdAt: 'Creado', updatedAt: 'Actualizado'
};

let pendingDownloadName = '';

function openDownloadModal() {
    document.getElementById('downloadModal').style.display = 'flex';
    setTimeout(() => document.getElementById('dlName').focus(), 100);
}
function closeDownloadModal() {
    document.getElementById('downloadModal').style.display = 'none';
    document.getElementById('dlName').value = '';
}
async function confirmDownload() {
    const name = document.getElementById('dlName').value.trim();
    if (!name) { alert('Por favor escribe tu nombre.'); return; }
    closeDownloadModal();
    await logDownload(name, 'rprodash_escuelas.xlsx');
    exportExcel(name);
}

function exportExcel(exporterName) {
    const s = getSchools();
    const rows = s.map(school => {
        const row = {};
        EXCEL_COLS.forEach(col => { row[EXCEL_HEADERS[col]] = school[col] ?? ''; });
        return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Escuelas');

    // Second sheet: audit log
    const logs = getAuditLog();
    const logsRows = logs.map(l => ({
        'Fecha/Hora': l.ts, 'Nombre': l.userName, 'Archivo': l.fileName,
        'IP': l.ip, 'Dispositivo': l.ua
    }));
    const wsLog = XLSX.utils.json_to_sheet(logsRows);
    XLSX.utils.book_append_sheet(wb, wsLog, 'Historial Descargas');

    XLSX.writeFile(wb, 'rprodash_escuelas.xlsx');
}

function downloadTemplate() {
    openDownloadModalTemplate();
}

async function openDownloadModalTemplate() {
    const name = prompt('Tu nombre completo (para el registro de descarga):');
    if (!name) return;
    await logDownload(name.trim(), 'plantilla_importacion.xlsx');

    const headers = EXCEL_COLS.map(c => EXCEL_HEADERS[c]);
    const sampleRow = [
        'Luis', 'Escuela Ejemplo', 'conquista', 'regular', 'Diagnóstico 20%', '1000', '333', 'cuatrimestral', '185', 'directo', '', '2025-01-01', '2025-01-01'
    ];

    // ── Sheet 1: Plantilla ──
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

    // Column widths
    ws['!cols'] = headers.map(() => ({ wch: 22 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');

    // ── Sheet 2: Instrucciones ──
    const instrucciones = [
        ['INSTRUCCIONES DE CAPTURA MASIVA — RProDash'],
        [''],
        ['IMPORTANTE: El campo "Asesor" debe escribirse EXACTAMENTE como aparece en el sistema.'],
        ['El sistema usa el nombre para identificar a qué asesor pertenece cada escuela.'],
        ['Si el nombre no coincide exactamente, la captura NO se asignará correctamente.'],
        [''],
        ['Nombres válidos (copia uno tal cual en la columna Asesor):'],
        ...ADVISORS.map(a => ['   ' + a]),
        [''],
        ['Valores válidos para otros campos:'],
        ['Tipo:          usuario | conquista'],
        ['Tipo Compra:   pro | regular'],
        ['Periodicidad:  semestral | cuatrimestral | anual'],
        ['Canal:         directo | distribuidor'],
        ['Etapas (usuario):     Usuario Estable | Usuario en Riesgo'],
        ['Etapas (conquista):   Diagnóstico 20% | Material / Samples enviados 40% |'],
        ['                      Propuesta académica enviada 60% | Propuesta académica-comercial 80% |'],
        ['                      Pilotaje 90% | Facturando — Conquista 100%'],
        [''],
        ['Si tienes dudas, contacta al administrador del sistema.'],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrucciones);
    wsInstr['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');

    XLSX.writeFile(wb, 'plantilla_importacion.xlsx');
}


// ── Bulk Import ──
function handleImportFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const wb = XLSX.read(e.target.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const raw = XLSX.utils.sheet_to_json(ws);

            // Map Excel headers to internal keys
            const reverseHeaders = {};
            Object.entries(EXCEL_HEADERS).forEach(([k, v]) => { reverseHeaders[v] = k; });

            const rows = raw.map(r => {
                const obj = {};
                Object.entries(r).forEach(([header, val]) => {
                    const key = reverseHeaders[header];
                    if (key) obj[key] = val;
                });
                return obj;
            }).filter(r => r.nombre);

            const result = bulkUpsertSchools(rows);
            allSchools = getSchools();
            filteredSchools = [...allSchools];
            renderKPIs(); renderTable();

            const okEl = document.getElementById('importOk');
            okEl.textContent = ` Importación completa: ${result.added} nuevas, ${result.updated} actualizadas.${result.errors.length ? ' Errores: ' + result.errors.join('; ') : ''}`;
            okEl.style.display = 'block';
            document.getElementById('importErr').style.display = 'none';
        } catch (err) {
            const errEl = document.getElementById('importErr');
            errEl.textContent = '❌ Error al leer el archivo: ' + err.message;
            errEl.style.display = 'block';
            document.getElementById('importOk').style.display = 'none';
        }
        input.value = '';
    };
    reader.readAsBinaryString(file);
}

// Drag & Drop
document.addEventListener('DOMContentLoaded', () => {
    const drop = document.getElementById('importDrop');
    if (!drop) return;
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => {
        e.preventDefault(); drop.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) { const dt = new DataTransfer(); dt.items.add(file); document.getElementById('importFile').files = dt.files; handleImportFile(document.getElementById('importFile')); }
    });
});

// ── Audit Log ──
function renderAudit() {
    const tbody = document.getElementById('auditBody');
    const logs = getAuditLog();
    if (!logs.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-3)">Sin registros de descarga.</td></tr>`;
        return;
    }
    tbody.innerHTML = logs.map(l => `<tr>
        <td>${new Date(l.ts).toLocaleString('es-MX')}</td>
        <td><strong>${esc(l.userName)}</strong></td>
        <td>${esc(l.fileName)}</td>
        <td><code style="color:var(--accent-2)">${esc(l.ip)}</code></td>
        <td style="font-size:12px;color:var(--text-2)">${esc(l.location || l.city || '—')}</td>
        <td style="font-size:11px;color:var(--text-3);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.ua)}</td>
    </tr>`).join('');
}


boot();
