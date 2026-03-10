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

    // Nav badge
    const badge = document.getElementById('navAdvisorBadge');
    if (advisor) {
        badge.innerHTML = `<span class="advisor-dot" style="background:${color}"></span>${advisor}`;
    } else {
        badge.textContent = 'Seleccionar asesor';
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

    // Pre-select current advisor
    const cur = getCurrentAdvisor();
    if (cur) asesorSel.value = cur;
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

// ── Mexico SVG Map ──
// Simplified state paths (approximate bounding box rectangles for MVP — labeled by state)
const MEXICO_SVG_STATES = [
    { id: 'BC', name: 'Baja California', d: 'M 30 80 L 110 80 L 130 160 L 50 160 Z' },
    { id: 'BCS', name: 'Baja California Sur', d: 'M 55 165 L 115 165 L 90 280 L 60 270 Z' },
    { id: 'SON', name: 'Sonora', d: 'M 115 80 L 230 80 L 230 200 L 115 200 Z' },
    { id: 'CHIH', name: 'Chihuahua', d: 'M 230 80 L 370 80 L 370 210 L 230 210 Z' },
    { id: 'COAH', name: 'Coahuila', d: 'M 370 100 L 480 100 L 480 210 L 370 210 Z' },
    { id: 'NL', name: 'Nuevo León', d: 'M 480 130 L 560 130 L 560 220 L 480 220 Z' },
    { id: 'TAMP', name: 'Tamaulipas', d: 'M 560 120 L 650 120 L 650 260 L 560 260 Z' },
    { id: 'SIN', name: 'Sinaloa', d: 'M 155 195 L 220 195 L 230 320 L 165 310 Z' },
    { id: 'DGO', name: 'Durango', d: 'M 220 195 L 320 195 L 315 320 L 225 315 Z' },
    { id: 'ZACT', name: 'Zacatecas', d: 'M 320 200 L 410 200 L 400 300 L 315 295 Z' },
    { id: 'SLP', name: 'San Luis Potosí', d: 'M 410 200 L 500 200 L 495 290 L 405 285 Z' },
    { id: 'NAY', name: 'Nayarit', d: 'M 185 305 L 240 305 L 235 370 L 185 360 Z' },
    { id: 'JAL', name: 'Jalisco', d: 'M 240 305 L 360 305 L 355 395 L 240 390 Z' },
    { id: 'AGS', name: 'Aguascalientes', d: 'M 355 270 L 395 270 L 392 305 L 355 302 Z' },
    { id: 'GTO', name: 'Guanajuato', d: 'M 395 300 L 470 300 L 460 355 L 390 350 Z' },
    { id: 'QRO', name: 'Querétaro', d: 'M 470 295 L 510 295 L 505 340 L 465 337 Z' },
    { id: 'HGO', name: 'Hidalgo', d: 'M 510 280 L 560 280 L 552 330 L 505 328 Z' },
    { id: 'COL', name: 'Colima', d: 'M 245 385 L 280 385 L 278 415 L 244 412 Z' },
    { id: 'MICH', name: 'Michoacán', d: 'M 280 380 L 400 380 L 395 450 L 280 445 Z' },
    { id: 'MEX', name: 'México', d: 'M 480 330 L 540 330 L 535 390 L 478 386 Z' },
    { id: 'CDMX', name: 'Ciudad de México', d: 'M 516 372 L 535 372 L 533 392 L 515 390 Z' },
    { id: 'TLX', name: 'Tlaxcala', d: 'M 540 340 L 570 340 L 567 360 L 538 358 Z' },
    { id: 'MOR', name: 'Morelos', d: 'M 500 388 L 540 388 L 537 415 L 498 412 Z' },
    { id: 'PUE', name: 'Puebla', d: 'M 540 340 L 610 340 L 605 420 L 537 416 Z' },
    { id: 'TLAX', name: 'Tlaxcala', d: 'M 562 330 L 590 330 L 588 342 L 560 340 Z' },
    { id: 'VER', name: 'Veracruz', d: 'M 580 250 L 650 250 L 660 450 L 580 440 Z' },
    { id: 'GRO', name: 'Guerrero', d: 'M 385 440 L 510 440 L 515 530 L 385 522 Z' },
    { id: 'OAX', name: 'Oaxaca', d: 'M 510 430 L 640 430 L 638 530 L 508 525 Z' },
    { id: 'CHIS', name: 'Chiapas', d: 'M 580 520 L 720 520 L 715 600 L 575 592 Z' },
    { id: 'TAB', name: 'Tabasco', d: 'M 650 420 L 730 420 L 728 490 L 648 485 Z' },
    { id: 'CAMP', name: 'Campeche', d: 'M 730 400 L 830 400 L 828 520 L 728 516 Z' },
    { id: 'YUC', name: 'Yucatán', d: 'M 780 300 L 920 300 L 918 400 L 778 398 Z' },
    { id: 'QROO', name: 'Quintana Roo', d: 'M 880 340 L 980 340 L 978 580 L 878 575 Z' },
];

function buildMap() {
    const svg = document.getElementById('mapSvg');
    const tooltip = document.getElementById('mapTooltip');
    const advisorProfiles = getAllAdvisorStates();

    // Build reverse map: state → advisor
    const stateOwner = {};
    Object.entries(advisorProfiles).forEach(([advisor, profile]) => {
        (profile.estados || []).forEach(stateName => {
            stateOwner[stateName] = advisor;
        });
    });

    // Map name → SVG id
    const nameLookup = {};
    MEXICO_SVG_STATES.forEach(s => { nameLookup[s.name] = s.id; });

    // Legend
    const usedAdvisors = [...new Set(Object.values(stateOwner))];
    document.getElementById('mapLegend').innerHTML = usedAdvisors.map(a => `
    <div class="map-legend-item">
      <div class="map-legend-dot" style="background:${advisorColor(a)}"></div>
      <span>${a}</span>
    </div>
  `).join('') + '<div class="map-legend-item"><div class="map-legend-dot" style="background:#1c1c1e;border:1px solid rgba(255,255,255,0.15)"></div><span>Sin asignar</span></div>';

    // Draw states
    svg.innerHTML = '';
    MEXICO_SVG_STATES.forEach(state => {
        const ownerByState = Object.entries(stateOwner).find(([sName]) => sName === state.name);
        const ownerName = ownerByState ? ownerByState[1] : null;
        const color = ownerName ? advisorColor(ownerName) : null;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', state.d);
        path.setAttribute('id', 'state_' + state.id);
        if (color) {
            path.style.fill = color + '88';
            path.style.stroke = color;
            path.style.strokeWidth = '1.5';
        }

        path.addEventListener('mouseenter', (ev) => {
            const schools = allSchools.filter(s => stateOwner[state.name] === s.asesor).length;
            tooltip.style.opacity = '1';
            tooltip.style.left = (ev.pageX + 14) + 'px';
            tooltip.style.top = (ev.pageY - 30) + 'px';
            tooltip.innerHTML = `<strong>${state.name}</strong><br>
        ${ownerName ? `<span style="color:${color}">● ${ownerName}</span>` : '<span style="color:#636366">Sin asignar</span>'}`;
        });
        path.addEventListener('mousemove', (ev) => {
            tooltip.style.left = (ev.pageX + 14) + 'px';
            tooltip.style.top = (ev.pageY - 30) + 'px';
        });
        path.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });

        svg.appendChild(path);
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
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
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
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-3)">Sin registros de descarga.</td></tr>`;
        return;
    }
    tbody.innerHTML = logs.map(l => `<tr>
        <td>${new Date(l.ts).toLocaleString('es-MX')}</td>
        <td><strong>${esc(l.userName)}</strong></td>
        <td>${esc(l.fileName)}</td>
        <td><code style="color:var(--accent-2)">${esc(l.ip)}</code></td>
        <td style="font-size:11px;color:var(--text-3);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.ua)}</td>
    </tr>`).join('');
}

boot();
