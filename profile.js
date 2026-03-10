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

async function boot() {
  if (!requireAuth()) return;
  const color = advisorColor(advisor);
  const initial = ADVISOR_INITIALS[advisor];

  const tmpSchools = await getSchoolsAsync();
  await getAdvisorsAsync(); // Ensure states and photos are fresh

  advisorStates = getAdvisorProfile(advisor).estados || [];

  // Avatar
  const av = document.getElementById('profileAvatar');
  const photo = getAdvisorPhoto(advisor);

  if (photo) {
    av.style.background = 'transparent';
    av.style.border = `2px solid ${color}66`;
    av.textContent = '';
    av.innerHTML = `<img src="${photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  } else {
    av.style.background = `linear-gradient(135deg, ${color}88, ${color}33)`;
    av.style.border = `2px solid ${color}66`;
    av.style.color = color;
    av.textContent = initial;
  }

  document.getElementById('profileName').textContent = advisor;

  allSchools = tmpSchools.filter(s => s.asesor === advisor);
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
    el.innerHTML = `<div class="empty-state"><div class="empty-icon"></div><div class="empty-title">Sin escuelas</div><p>Aún no has capturado ninguna escuela.</p></div>`;
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
            <span class="badge ${s.tipo === 'usuario' ? 'badge-blue' : 'badge-orange'}">${s.tipo === 'usuario' ? ' Usuario' : ' Conquista'}</span>
            <span class="badge badge-gray">${s.tipoCompra === 'pro' ? 'Pro' : 'Regular'}</span>
            <span class="badge" style="background:${etColor}22;color:${etColor}">${s.etapa || '—'}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button class="btn btn-secondary btn-icon" title="Editar" onclick="editSchool('${s.id}')">
            <svg style="width:16px;height:16px;opacity:0.8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
          </button>
          <button class="btn btn-danger btn-icon" title="Eliminar" onclick="confirmDelete('${s.id}')">
            <svg style="width:16px;height:16px;opacity:0.8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:20px;font-size:13px;color:var(--text-2);margin-top:8px">
        <span> <strong style="color:var(--text)">${formatNumber(s.alumnos_periodo)}</strong> alumnos/periodo</span>
        <span> <strong style="color:var(--accent)">${formatCurrency(venta)}</strong> proyectado</span>
        <span> ${s.distribuidor === 'distribuidor' ? `Dist. ${escapeHtml(s.nombreDistribuidor || '')}` : 'Directo'}</span>
        <span style="color:var(--text-3)">Actualizado ${formatDate(s.updatedAt)}</span>
      </div>
    </div>`;
  }).join('');
}

function editSchool(id) {
  window.location.href = `capture.html?edit=${id}`;
}

function confirmDelete(id) {
  const school = getSchoolById(id);
  if (!school) return;
  deleteSchool(id);
  allSchools = getSchools().filter(s => s.asesor === advisor);
  filteredSchools = [...allSchools];
  renderStats(); renderMiniKpis(); renderSchools();
  showUndoToast(school.nombre || 'Escuela');
}

let undoTimer = null;
function showUndoToast(nombre) {
  clearTimeout(undoTimer);
  let toast = document.getElementById('undoToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'undoToast';
    toast.style.cssText = `
      position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
      background:#1c1c1e; border:1px solid rgba(255,255,255,0.12);
      border-radius:14px; padding:14px 20px;
      display:flex; align-items:center; gap:14px;
      font-size:14px; color:#f5f5f7; z-index:999;
      box-shadow:0 8px 32px rgba(0,0,0,0.5);
      animation: fadeIn 0.25s ease;
    `;
    document.body.appendChild(toast);
  }
  const color = advisorColor(advisor);
  toast.innerHTML = `
    <span style="color:var(--text-2)">"${nombre}" eliminada</span>
    <button onclick="undoDelete()" style="
      background:${color}; color:#fff; border:none; border-radius:8px;
      padding:6px 16px; font-size:13px; font-weight:700; cursor:pointer;
    ">Deshacer</button>
  `;
  toast.style.display = 'flex';
  undoTimer = setTimeout(() => { toast.style.display = 'none'; }, 8000);
}

function undoDelete() {
  clearTimeout(undoTimer);
  document.getElementById('undoToast').style.display = 'none';
  const restored = restoreLastDeleted();
  if (restored) {
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

function handlePhotoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const base64 = e.target.result;
    saveAdvisorPhoto(advisor, base64);

    const av = document.getElementById('profileAvatar');
    const color = advisorColor(advisor);
    av.style.background = 'transparent';
    av.style.border = `2px solid ${color}66`;
    av.textContent = '';
    av.innerHTML = `<img src="${base64}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

boot();
