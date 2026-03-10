/* ==============================================
   RProDash — Data Layer v2
   Firestore (primary) + localStorage (fallback)
   ============================================== */

const ADVISORS = ['Luis', 'Alberto', 'Fabi', 'Edgar', 'Arturo', 'Daniel', 'Miguel', 'Vacante'];
const MASTER_PIN = 'Pro2610';

const ADVISOR_COLORS = {
    Luis: '#0a84ff',
    Alberto: '#30d158',
    Fabi: '#ff375f',
    Edgar: '#bf5af2',
    Arturo: '#ff9f0a',
    Daniel: '#64d2ff',
    Miguel: '#ffd60a',
    Vacante: '#636366',
};

const ADVISOR_INITIALS = {
    Luis: 'L', Alberto: 'A', Fabi: 'F', Edgar: 'E',
    Arturo: 'AR', Daniel: 'D', Miguel: 'M', Vacante: '?',
};

const ETAPAS_USUARIO = ['Usuario Estable', 'Usuario en Riesgo'];
const ETAPAS_CONQUISTA = [
    'Diagnóstico 20%', 'Material / Samples enviados 40%',
    'Propuesta académica enviada 60%', 'Propuesta académica-comercial 80%',
    'Pilotaje 90%', 'Facturando — Conquista 100%',
];

// ── ID helper ──
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

// ─────────────────────────────────────────────
//  SCHOOLS
// ─────────────────────────────────────────────
function getSchools() {
    return JSON.parse(localStorage.getItem('rprodash_schools') || '[]');
}

async function getSchoolsAsync() {
    if (db) {
        try {
            const snap = await db.collection('schools').orderBy('updatedAt', 'desc').get();
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            localStorage.setItem('rprodash_schools', JSON.stringify(data)); // cache
            return data;
        } catch (e) { console.warn('Firestore read failed, using cache:', e); }
    }
    return getSchools();
}

function saveSchool(school) {
    const schools = getSchools();
    if (!school.id) school.id = generateId();
    school.createdAt = school.createdAt || new Date().toISOString();
    school.updatedAt = new Date().toISOString();
    school.alumnos_periodo = calcAlumnosPeriodo(school.alumnosTotales, school.periodicidad);

    const idx = schools.findIndex(s => s.id === school.id);
    if (idx >= 0) schools[idx] = school; else schools.push(school);
    localStorage.setItem('rprodash_schools', JSON.stringify(schools));

    if (db) db.collection('schools').doc(school.id).set(school).catch(console.warn);
    return school;
}

function deleteSchool(id) {
    const schools = getSchools().filter(s => s.id !== id);
    localStorage.setItem('rprodash_schools', JSON.stringify(schools));
    if (db) db.collection('schools').doc(id).delete().catch(console.warn);
}

function getSchoolById(id) {
    return getSchools().find(s => s.id === id) || null;
}

// Bulk upsert from Excel import
function bulkUpsertSchools(rows) {
    const schools = getSchools();
    const results = { added: 0, updated: 0, errors: [] };

    rows.forEach((row, i) => {
        if (!row.nombre) { results.errors.push(`Fila ${i + 2}: sin nombre`); return; }
        const existing = schools.find(s =>
            s.nombre?.toLowerCase().trim() === row.nombre?.toLowerCase().trim() &&
            s.asesor === row.asesor
        );
        if (existing) {
            Object.assign(existing, row);
            existing.updatedAt = new Date().toISOString();
            existing.alumnos_periodo = calcAlumnosPeriodo(existing.alumnosTotales, existing.periodicidad);
            results.updated++;
        } else {
            const s = { ...row, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            s.alumnos_periodo = calcAlumnosPeriodo(s.alumnosTotales, s.periodicidad);
            schools.push(s);
            results.added++;
        }
    });

    localStorage.setItem('rprodash_schools', JSON.stringify(schools));
    if (db) schools.forEach(s => db.collection('schools').doc(s.id).set(s).catch(console.warn));
    return results;
}

// ─────────────────────────────────────────────
//  ADVISOR PROFILES (States)
// ─────────────────────────────────────────────
function getAdvisorProfile(name) {
    const all = JSON.parse(localStorage.getItem('rprodash_advisors') || '{}');
    return all[name] || { estados: [] };
}

function saveAdvisorStates(name, estados) {
    const all = JSON.parse(localStorage.getItem('rprodash_advisors') || '{}');
    all[name] = { ...(all[name] || {}), estados };
    localStorage.setItem('rprodash_advisors', JSON.stringify(all));
    if (db) db.collection('advisors').doc(name).set({ estados }, { merge: true }).catch(console.warn);
}

function getAllAdvisorStates() {
    return JSON.parse(localStorage.getItem('rprodash_advisors') || '{}');
}

// ─────────────────────────────────────────────
//  AUDIT LOG (download tracking)
// ─────────────────────────────────────────────
async function getPublicIP() {
    try {
        const r = await fetch('https://api.ipify.org?format=json');
        const j = await r.json();
        return j.ip || '—';
    } catch { return '—'; }
}

async function logDownload(userName, fileName) {
    const ip = await getPublicIP();
    const entry = {
        id: generateId(),
        userName,
        fileName,
        ip,
        ts: new Date().toISOString(),
        ua: navigator.userAgent,
    };
    const logs = JSON.parse(localStorage.getItem('rprodash_audit') || '[]');
    logs.unshift(entry);
    localStorage.setItem('rprodash_audit', JSON.stringify(logs.slice(0, 500)));
    if (db) db.collection('audit').doc(entry.id).set(entry).catch(console.warn);
    return entry;
}

function getAuditLog() {
    return JSON.parse(localStorage.getItem('rprodash_audit') || '[]');
}

// ─────────────────────────────────────────────
//  SESSION / PIN
// ─────────────────────────────────────────────
function isAuthenticated() {
    return sessionStorage.getItem('rprodash_auth') === '1';
}

function authenticate(pin) {
    if (pin === MASTER_PIN) {
        sessionStorage.setItem('rprodash_auth', '1');
        return true;
    }
    return false;
}

function requireAuth() {
    if (!isAuthenticated()) {
        const cur = encodeURIComponent(window.location.href);
        window.location.href = `login.html?next=${cur}`;
        return false;
    }
    return true;
}

function getCurrentAdvisor() {
    return sessionStorage.getItem('rprodash_current') || localStorage.getItem('rprodash_last') || null;
}

function setCurrentAdvisor(name) {
    sessionStorage.setItem('rprodash_current', name);
    localStorage.setItem('rprodash_last', name);
}

// ─────────────────────────────────────────────
//  CALCULATIONS
// ─────────────────────────────────────────────
function calcAlumnosPeriodo(total, periodicidad) {
    total = parseInt(total) || 0;
    if (periodicidad === 'cuatrimestral') return Math.round(total / 3);
    if (periodicidad === 'semestral') return Math.round(total / 2);
    if (periodicidad === 'anual') return total;
    return total;
}

function calcVentaProyectada(school) {
    return (school.alumnos_periodo || 0) * (parseFloat(school.precioNeto) || 0);
}

// ─────────────────────────────────────────────
//  FORMATTING
// ─────────────────────────────────────────────
function formatCurrency(n) {
    return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function formatNumber(n) { return (parseInt(n) || 0).toLocaleString('es-MX'); }
function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
function etapaPercent(etapa) { const m = String(etapa).match(/(\d+)%/); return m ? parseInt(m[1]) : null; }
function etapaColor(etapa) {
    if (etapa === 'Usuario Estable') return '#30d158';
    if (etapa === 'Usuario en Riesgo') return '#ff453a';
    const p = etapaPercent(etapa);
    if (p !== null) {
        if (p <= 40) return '#ff9f0a';
        if (p <= 60) return '#ffd60a';
        if (p <= 80) return '#64d2ff';
        if (p >= 90) return '#30d158';
    }
    return '#636366';
}
function advisorColor(name) { return ADVISOR_COLORS[name] || '#636366'; }

// ─────────────────────────────────────────────
//  PARTICLES
// ─────────────────────────────────────────────
function hexToRgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
}

function initParticles(canvasId, glowColor = '#0a84ff') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    function resize() {
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        if (!particles.length) initP();
    }
    function initP() {
        particles = Array.from({ length: 50 }, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            baseRadius: Math.random() * 1.5 + 0.5,
            speedX: (Math.random() - 0.5) * 0.4, speedY: (Math.random() - 0.5) * 0.4,
            phase: Math.random() * Math.PI * 2,
        }));
    }
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const t = Date.now() * 0.001;
        particles.forEach(p => {
            p.x += p.speedX; p.y += p.speedY;
            if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
            const pulse = Math.sin(t + p.phase) * 0.5 + 0.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.baseRadius + pulse * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${0.1 + pulse * 0.18})`;
            ctx.shadowBlur = 6 + pulse * 8; ctx.shadowColor = glowColor; ctx.fill();
        });
        ctx.shadowBlur = 0;
        particles.forEach((p, i) => {
            for (let j = i + 1; j < particles.length; j++) {
                const q = particles[j], d = Math.hypot(p.x - q.x, p.y - q.y);
                if (d < 110) {
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = hexToRgba(glowColor.startsWith('#') ? glowColor : '#0a84ff', 0.06 * (1 - d / 110));
                    ctx.lineWidth = 0.5; ctx.stroke();
                }
            }
        });
        requestAnimationFrame(render);
    }
    window.addEventListener('resize', resize); resize(); render();
}
