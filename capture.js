/* ==============================================
   RProDash — Capture Survey Engine
   One question per step with slide transitions
   ============================================== */

if (!isAuthenticated()) { window.location.href = 'login.html'; }

let formData = {};
let currentStep = 0;
let editId = null;

// Check if editing an existing school
const params = new URLSearchParams(window.location.search);
if (params.get('edit')) {
  editId = params.get('edit');
  const existing = getSchoolById(editId);
  if (existing) formData = { ...existing };
}

// Pre-fill advisor from session
if (!formData.asesor) {
  formData.asesor = getCurrentAdvisor() || '';
}

const TOTAL_STEPS = 8;

function updateProgress() {
  const pct = ((currentStep + 1) / TOTAL_STEPS) * 100;
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('stepCounter').textContent =
    `Paso ${currentStep + 1} de ${TOTAL_STEPS}`;
}

function renderStep(step, direction = 'forward') {
  const container = document.getElementById('stepContainer');

  if (container.firstChild) {
    container.firstChild.classList.add('step-exit');
    setTimeout(() => { container.innerHTML = ''; buildStep(step); }, 280);
  } else {
    buildStep(step);
  }
  updateProgress();
}

function buildStep(step) {
  const container = document.getElementById('stepContainer');
  let html = '';

  switch (step) {
    /* ── STEP 0: Asesor ── */
    case 0:
      html = `
        <div class="survey-card">
          <div class="survey-question">¿Quién eres?</div>
          <div class="survey-sub">Selecciona tu nombre de la lista de asesores.</div>
          <div class="form-group">
            <select class="form-select" id="f_asesor">
              <option value="">— Selecciona asesor —</option>
              ${ADVISORS.map(a => `<option value="${a}" ${formData.asesor === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
          </div>
          <div class="survey-actions">
            <span></span>
            <button class="btn btn-primary" onclick="nextStep(0)">Siguiente →</button>
          </div>
        </div>`;
      break;

    /* ── STEP 1: Nombre escuela ── */
    case 1:
      html = `
        <div class="survey-card">
          <div class="survey-question">Nombre de la escuela</div>
          <div class="survey-sub">Escribe el nombre completo o como la conoces internamente.</div>
          <div class="form-group">
            <input class="form-input" id="f_nombre" type="text" placeholder="Ej. CECTE Hermosillo Norte"
              value="${escapeHtml(formData.nombre || '')}">
          </div>
          <div class="survey-actions">
            <button class="btn btn-secondary" onclick="prevStep()">← Atrás</button>
            <button class="btn btn-primary" onclick="nextStep(1)">Siguiente →</button>
          </div>
        </div>`;
      break;

    /* ── STEP 2: Tipo de escuela + Tipo de compra (inline) ── */
    case 2:
      html = `
        <div class="survey-card">
          <div class="survey-question">Tipo de escuela</div>
          <div class="survey-sub">¿Es una cuenta activa o la estamos conquistando?</div>
          <div class="toggle-group" style="margin-bottom:20px;">
            <div class="toggle-opt ${formData.tipo === 'usuario' ? 'selected' : ''}" id="tipo_usuario" onclick="selectTipo('usuario')">
              📚 Usuario
            </div>
            <div class="toggle-opt ${formData.tipo === 'conquista' ? 'selected' : ''}" id="tipo_conquista" onclick="selectTipo('conquista')">
              🎯 Conquista
            </div>
          </div>
          <div class="form-label" style="margin-top: 4px;">Tipo de compra</div>
          <div class="toggle-sm-group" style="margin-bottom:8px;">
            <div class="toggle-opt-sm ${formData.tipoCompra === 'pro' ? 'selected' : ''}" id="compra_pro" onclick="selectCompra('pro')">Pro</div>
            <div class="toggle-opt-sm ${formData.tipoCompra === 'regular' || !formData.tipoCompra ? 'selected' : ''}" id="compra_regular" onclick="selectCompra('regular')">Regular</div>
          </div>
          <div class="survey-actions">
            <button class="btn btn-secondary" onclick="prevStep()">← Atrás</button>
            <button class="btn btn-primary" onclick="nextStep(2)">Siguiente →</button>
          </div>
        </div>`;
      // Default tipoCompra
      if (!formData.tipoCompra) formData.tipoCompra = 'regular';
      break;

    /* ── STEP 3: Etapa ── */
    case 3: {
      const etapas = formData.tipo === 'usuario' ? ETAPAS_USUARIO : ETAPAS_CONQUISTA;
      html = `
        <div class="survey-card">
          <div class="survey-question">Etapa actual</div>
          <div class="survey-sub">${formData.tipo === 'usuario' ? 'Estado de la relación con la cuenta.' : 'Avance en el proceso de conquista.'}</div>
          <div class="form-group">
            <select class="form-select" id="f_etapa">
              <option value="">— Selecciona etapa —</option>
              ${etapas.map(e => `<option value="${e}" ${formData.etapa === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select>
          </div>
          <div class="survey-actions">
            <button class="btn btn-secondary" onclick="prevStep()">← Atrás</button>
            <button class="btn btn-primary" onclick="nextStep(3)">Siguiente →</button>
          </div>
        </div>`;
      break;
    }

    /* ── STEP 4: Alumnos + Periodicidad ── */
    case 4:
      html = `
        <div class="survey-card">
          <div class="survey-question">Alumnos y periodicidad</div>
          <div class="survey-sub">Ingresa el total de alumnos de la institución y la frecuencia de compra por periodo.</div>
          <div class="calc-row">
            <div class="form-group" style="flex:2">
              <label class="form-label">Alumnos totales</label>
              <input class="form-input" id="f_alumnos" type="number" min="0" placeholder="Ej. 1000"
                value="${formData.alumnosTotales || ''}" oninput="recalcAlumnos()">
            </div>
            <div class="form-group" style="flex:2">
              <label class="form-label">Periodicidad</label>
              <select class="form-select" id="f_periodo" onchange="recalcAlumnos()">
                <option value="semestral" ${formData.periodicidad === 'semestral' ? 'selected' : ''}>Semestral</option>
                <option value="cuatrimestral" ${formData.periodicidad === 'cuatrimestral' ? 'selected' : ''}>Cuatrimestral</option>
                <option value="anual" ${formData.periodicidad === 'anual' ? 'selected' : ''}>Anual</option>
              </select>
            </div>
          </div>
          <div class="calc-result" id="calcResult" style="display:none"></div>
          <div class="survey-actions">
            <button class="btn btn-secondary" onclick="prevStep()">← Atrás</button>
            <button class="btn btn-primary" onclick="nextStep(4)">Siguiente →</button>
          </div>
        </div>`;
      break;

    /* ── STEP 5: Precio neto ── */
    case 5:
      html = `
        <div class="survey-card">
          <div class="survey-question">Precio de venta neto</div>
          <div class="survey-sub">Precio líquido con descuento aplicado (Precio al que se factura, no PVP al alumno).</div>
          <div class="form-group">
            <input class="form-input" id="f_precio" type="number" min="0" step="0.01"
              placeholder="Ej. 185.00" value="${formData.precioNeto || ''}">
            <div class="form-hint">💡 Este es el precio final al cliente (distribuidor o institución), no el precio de venta público al estudiante.</div>
          </div>
          <div class="survey-actions">
            <button class="btn btn-secondary" onclick="prevStep()">← Atrás</button>
            <button class="btn btn-primary" onclick="nextStep(5)">Siguiente →</button>
          </div>
        </div>`;
      break;

    /* ── STEP 6: Distribuidor ── */
    case 6:
      html = `
        <div class="survey-card">
          <div class="survey-question">Canal de distribución</div>
          <div class="survey-sub">¿La venta es directa con la institución o a través de un distribuidor?</div>
          <div class="toggle-group" style="margin-bottom:20px">
            <div class="toggle-opt ${formData.distribuidor === 'directo' || !formData.distribuidor ? 'selected' : ''}" id="dist_directo" onclick="selectDist('directo')">🏢 Directo</div>
            <div class="toggle-opt ${formData.distribuidor === 'distribuidor' ? 'selected' : ''}" id="dist_dist" onclick="selectDist('distribuidor')">🔗 Distribuidor</div>
          </div>
          <div id="distNameWrap" style="${(formData.distribuidor === 'distribuidor') ? '' : 'display:none'}">
            <div class="form-group">
              <label class="form-label">Nombre del distribuidor</label>
              <input class="form-input" id="f_dist_nombre" type="text" placeholder="Ej. Editorial Cass"
                value="${escapeHtml(formData.nombreDistribuidor || '')}">
            </div>
          </div>
          <div class="survey-actions">
            <button class="btn btn-secondary" onclick="prevStep()">← Atrás</button>
            <button class="btn btn-primary" onclick="nextStep(6)">Siguiente →</button>
          </div>
        </div>`;
      if (!formData.distribuidor) formData.distribuidor = 'directo';
      break;

    /* ── STEP 7: Review ── */
    case 7: {
      const alumnos_p = calcAlumnosPeriodo(formData.alumnosTotales, formData.periodicidad);
      const venta = alumnos_p * (parseFloat(formData.precioNeto) || 0);
      html = `
        <div class="survey-card">
          <div class="survey-question">✅ Revisa y guarda</div>
          <div class="survey-sub">Confirma los datos de la escuela antes de guardar.</div>
          <div class="review-grid">
            ${row('Asesor', formData.asesor)}
            ${row('Escuela', formData.nombre)}
            ${row('Tipo', formData.tipo === 'usuario' ? '📚 Usuario' : '🎯 Conquista')}
            ${row('Compra', formData.tipoCompra === 'pro' ? 'Pro' : 'Regular')}
            ${row('Etapa', formData.etapa)}
            ${row('Alumnos totales', formatNumber(formData.alumnosTotales))}
            ${row('Periodicidad', formData.periodicidad)}
            ${row('Alumnos / periodo', `<span style="color:var(--accent-2);font-weight:800">${formatNumber(alumnos_p)}</span>`)}
            ${row('Precio neto', formatCurrency(formData.precioNeto))}
            ${row('Venta proyectada / periodo', `<span style="color:var(--accent);font-weight:800">${formatCurrency(venta)}</span>`)}
            ${row('Canal', formData.distribuidor === 'distribuidor' ? `Distribuidor: ${formData.nombreDistribuidor || '—'}` : 'Directo')}
          </div>
          <div class="survey-actions" style="margin-top:24px">
            <button class="btn btn-secondary" onclick="prevStep()">← Editar</button>
            <button class="btn btn-primary" onclick="saveCapture()" style="background:var(--accent-2);box-shadow:0 4px 20px rgba(48,209,88,0.35)">
              Guardar Escuela 💾
            </button>
          </div>
        </div>`;
      break;
    }
  }

  document.getElementById('stepContainer').innerHTML = html;

  // Post-render side effects
  if (step === 4) recalcAlumnos();
}

function row(label, val) {
  return `<div class="review-row"><span class="review-label">${label}</span><span class="review-val">${val}</span></div>`;
}

// ── Navigation ──
function nextStep(step) {
  if (!validateStep(step)) return;
  collectStep(step);
  if (currentStep < TOTAL_STEPS - 1) { currentStep++; renderStep(currentStep); }
}

function prevStep() {
  if (currentStep > 0) { currentStep--; renderStep(currentStep, 'back'); }
}

function validateStep(step) {
  switch (step) {
    case 0:
      const a = document.getElementById('f_asesor')?.value;
      if (!a) { alert('Selecciona un asesor.'); return false; }
      break;
    case 1:
      const n = document.getElementById('f_nombre')?.value.trim();
      if (!n) { alert('Ingresa el nombre de la escuela.'); return false; }
      break;
    case 2:
      if (!formData.tipo) { alert('Selecciona el tipo de escuela.'); return false; }
      break;
    case 3:
      const e = document.getElementById('f_etapa')?.value;
      if (!e) { alert('Selecciona la etapa.'); return false; }
      break;
    case 4:
      const al = document.getElementById('f_alumnos')?.value;
      if (!al || parseInt(al) <= 0) { alert('Ingresa un número válido de alumnos.'); return false; }
      break;
    case 5:
      const p = document.getElementById('f_precio')?.value;
      if (!p || parseFloat(p) <= 0) { alert('Ingresa un precio neto válido.'); return false; }
      break;
  }
  return true;
}

function collectStep(step) {
  switch (step) {
    case 0: formData.asesor = document.getElementById('f_asesor').value; break;
    case 1: formData.nombre = document.getElementById('f_nombre').value.trim(); break;
    case 2: /* already set by toggle */ break;
    case 3: formData.etapa = document.getElementById('f_etapa').value; break;
    case 4:
      formData.alumnosTotales = parseInt(document.getElementById('f_alumnos').value);
      formData.periodicidad = document.getElementById('f_periodo').value;
      break;
    case 5: formData.precioNeto = parseFloat(document.getElementById('f_precio').value); break;
    case 6:
      if (formData.distribuidor === 'distribuidor') {
        formData.nombreDistribuidor = document.getElementById('f_dist_nombre')?.value.trim() || '';
      }
      break;
  }
}

// ── Toggle helpers ──
function selectTipo(val) {
  formData.tipo = val;
  document.getElementById('tipo_usuario')?.classList.toggle('selected', val === 'usuario');
  document.getElementById('tipo_conquista')?.classList.toggle('selected', val === 'conquista');
}

function selectCompra(val) {
  formData.tipoCompra = val;
  document.getElementById('compra_pro')?.classList.toggle('selected', val === 'pro');
  document.getElementById('compra_regular')?.classList.toggle('selected', val === 'regular');
}

function selectDist(val) {
  formData.distribuidor = val;
  document.getElementById('dist_directo')?.classList.toggle('selected', val === 'directo');
  document.getElementById('dist_dist')?.classList.toggle('selected', val === 'distribuidor');
  document.getElementById('distNameWrap').style.display = val === 'distribuidor' ? '' : 'none';
}

// ── Auto-calculator ──
function recalcAlumnos() {
  const al = parseInt(document.getElementById('f_alumnos')?.value);
  const per = document.getElementById('f_periodo')?.value;
  const resEl = document.getElementById('calcResult');
  if (al > 0 && per && resEl) {
    const res = calcAlumnosPeriodo(al, per);
    resEl.style.display = '';
    resEl.innerHTML = `📊 <strong>${formatNumber(res)} alumnos</strong> comprarían libro por periodo (${per}).`;
  } else if (resEl) {
    resEl.style.display = 'none';
  }
}

// ── Save ──
function saveCapture() {
  if (editId) formData.id = editId;
  const saved = saveSchool(formData);
  window.location.href = `profile.html?advisor=${encodeURIComponent(saved.asesor)}&saved=${saved.id}`;
}

// ── Utils ──
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Boot ──
initParticles('particleCanvas', '#0a84ff');
renderStep(0);
