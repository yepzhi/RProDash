# RProDash — CRM de Seguimiento Escolar

Dashboard CRM para asesores comerciales de seguimiento de cuentas escolares (usuarios y conquistas).

## Estructura
```
index.html      → Login / selección de asesor
dashboard.html  → Analytics: KPIs, tabla, gráficas, mapa de México
capture.html    → Formulario de captura (encuesta animada, 1 pregunta a la vez)
profile.html    → Perfil del asesor: escuelas + asignación de estados
styles.css      → Sistema de diseño (Apple dark glass)
app.js          → Capa de datos (localStorage CRUD + helpers)
dashboard.js    → Lógica del dashboard (Chart.js, filtros, mapa SVG)
capture.js      → Motor de encuesta (pasos animados, validación)
profile.js      → Lógica del perfil (lista, edición, estados)
```

## Uso
Abrir `index.html` en el navegador (no requiere servidor — funciona como archivo local).

## Datos
Todos los datos se almacenan en `localStorage`. No se requiere backend.

## Asesores
Luis · Alberto · Fabi · Edgar · Arturo · Daniel · Miguel · Vacante
