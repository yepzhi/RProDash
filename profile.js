/* ==============================================
   RProDash — Profile Page Logic
   ============================================== */

const MEXICO_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Guanajuato',
  'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

const params = new URLSearchParams(window.location.search);
let advisor = params.get('advisor') || getCurrentAdvisor();
if (!advisor) { window.location.href = 'index.html'; }

let advisorStates = getAdvisorProfile(advisor).estados || [];
let allSchools = [];
let filteredSchools = [];

function boot() {
  if (!requireAuth()) return;
  const color = advisorColor(advisor);
  const initial = ADVISOR_INITIALS[advisor];

  // Avatar
  const av = document.getElementById('profileAvatar');
  av.style.background = `linear-gradient(135deg, ${color}88, ${color}33)`;
  av.style.border = `2px solid ${color}66`;
  av.style.color = color;
  av.textContent = initial;

  document.getElementById('profileName').textContent = advisor;

  allSchools = getSchools().filter(s => s.asesor === advisor);
  filteredSchools = [...allSchools];

  renderStats();
  renderMiniKpis();
  renderSchools();
  renderStatesList();
  initParticles('particleCanvas', color);

  // Highlight saved school if coming from capture
  const saved = params.get('saved');
  if (saved) {
    setTimeout(() => {
      const el = document.getElementById('school_' + saved);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.border = `1px solid ${color}`; }
    }, 400);
  }
}

function renderStats() {
  const s = allSchools;
  const usuarios = s.filter(x => x.tipo === 'usuario').length;
  const conquistas = s.filter(x => x.tipo === 'conquista').length;
  document.getElementById('profileStats').innerHTML = `
    <span class="pstat"><strong>${s.length}</strong> escuelas</span>
    <span class="pstat"><strong>${usuarios}</strong> usuarios</span>
    <span class="pstat"><strong>${conquistas}</strong> conquistas</span>
  `;
}

function renderMiniKpis() {
  const s = allSchools;
  const totalAlumnos = s.reduce((a, x) => a + (x.alumnos_periodo || 0), 0);
  const totalVenta = s.reduce((a, x) => a + calcVentaProyectada(x), 0);
  document.getElementById('miniKpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Escuelas</div>
      <div class="kpi-value">${s.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Alumnos / Periodo</div>
      <div class="kpi-value">${formatNumber(totalAlumnos)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Venta proyectada</div>
      <div class="kpi-value" style="font-size:1.5em">${formatCurrency(totalVenta)}</div>
    </div>
  `;
}

function filterSchools() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  filteredSchools = allSchools.filter(s =>
    s.nombre?.toLowerCase().includes(q) || s.etapa?.toLowerCase().includes(q)
  );
  renderSchools();
}

function renderSchools() {
  const el = document.getElementById('schoolsList');
  if (!filteredSchools.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🏫</div><div class="empty-title">Sin escuelas</div><p>Aún no has capturado ninguna escuela.</p></div>`;
    return;
  }

  const color = advisorColor(advisor);
  el.innerHTML = filteredSchools.map(s => {
    const etColor = etapaColor(s.etapa || '');
    const venta = calcVentaProyectada(s);
    return `
    <div class="school-card" id="school_${s.id}">
      <div class="school-card-header">
        <div>
          <div class="school-name">${escapeHtml(s.nombre || '—')}</div>
          <div class="school-meta">
            <span class="badge ${s.tipo === 'usuario' ? 'badge-blue' : 'badge-orange'}">${s.tipo === 'usuario' ? '📚 Usuario' : '🎯 Conquista'}</span>
            <span class="badge badge-gray">${s.tipoCompra === 'pro' ? 'Pro' : 'Regular'}</span>
            <span class="badge" style="background:${etColor}22;color:${etColor}">${s.etapa || '—'}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button class="btn btn-secondary" style="font-size:12px;padding:7px 14px" onclick="editSchool('${s.id}')">✏️ Editar</button>
          <button class="btn btn-danger" style="font-size:12px;padding:7px 14px" onclick="confirmDelete('${s.id}')">🗑</button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:20px;font-size:13px;color:var(--text-2);margin-top:8px">
        <span>👩‍🎓 <strong style="color:var(--text)">${formatNumber(s.alumnos_periodo)}</strong> alumnos/periodo</span>
        <span>💰 <strong style="color:var(--accent)">${formatCurrency(venta)}</strong> proyectado</span>
        <span>🔗 ${s.distribuidor === 'distribuidor' ? `Dist. ${escapeHtml(s.nombreDistribuidor || '')}` : 'Directo'}</span>
        <span style="color:var(--text-3)">Actualizado ${formatDate(s.updatedAt)}</span>
      </div>
    </div>`;
  }).join('');
}

function editSchool(id) {
  window.location.href = `capture.html?edit=${id}`;
}

function confirmDelete(id) {
  if (confirm('¿Eliminar esta escuela? Esta acción no se puede deshacer.')) {
    deleteSchool(id);
    allSchools = getSchools().filter(s => s.asesor === advisor);
    filteredSchools = [...allSchools];
    renderStats(); renderMiniKpis(); renderSchools();
  }
}

// ── States ──
function renderStatesList() {
  const el = document.getElementById('stateList');
  const color = advisorColor(advisor);
  el.innerHTML = MEXICO_STATES.map(state => {
    const on = advisorStates.includes(state);
    return `<div class="state-tag ${on ? 'on' : ''}" id="state_${state.replace(/\s/g, '_')}"
      style="${on ? `background:${color}33; border-color:${color}77; color:${color};` : ''}"
      onclick="toggleState('${state}', '${color}')">${state}</div>`;
  }).join('');
}

function toggleState(state, color) {
  const idx = advisorStates.indexOf(state);
  if (idx >= 0) advisorStates.splice(idx, 1);
  else advisorStates.push(state);

  const el = document.getElementById('state_' + state.replace(/\s/g, '_'));
  const on = advisorStates.includes(state);
  el.className = 'state-tag' + (on ? ' on' : '');
  el.style.cssText = on ? `background:${color}33; border-color:${color}77; color:${color};` : '';
}

function saveStates() {
  saveAdvisorStates(advisor, advisorStates);
  const el = document.getElementById('statesSaved');
  el.style.display = '';
  setTimeout(() => { el.style.display = 'none'; }, 2500);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

boot();
