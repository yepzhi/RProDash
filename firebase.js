/* =====================================================
   RProDash — Firebase Configuration
   =====================================================
   INSTRUCCIONES PARA CONFIGURAR:

   1. Ve a https://console.firebase.google.com/
   2. Haz click en "Agregar proyecto" → nombre: "RProDash"
      (NO uses el proyecto de CBSalon)
   3. Desactiva Google Analytics (opcional)
   4. En el proyecto: "Agregar app" → Web → nombre: "rprodash"
   5. Copia las credenciales que te da Firebase y pégalas abajo
   6. En Firestore Database → Crear base de datos → Modo de producción
   7. En Reglas de Firestore pega:
      rules_version = '2';
      service cloud.firestore.beta {
        match /databases/{database}/documents {
          match /{document=**} {
            allow read, write: if true;
          }
        }
      }
   ===================================================== */

const FIREBASE_CONFIG = {
    apiKey: "PEGA_TU_API_KEY_AQUI",
    authDomain: "PEGA_TU_AUTH_DOMAIN_AQUI",
    projectId: "PEGA_TU_PROJECT_ID_AQUI",
    storageBucket: "PEGA_TU_STORAGE_BUCKET_AQUI",
    messagingSenderId: "PEGA_TU_MESSAGING_SENDER_ID_AQUI",
    appId: "PEGA_TU_APP_ID_AQUI"
};

// ── Firebase ready flag ──
// Se activa automáticamente cuando detecta credenciales reales
const FIREBASE_READY = !Object.values(FIREBASE_CONFIG).some(v => v.startsWith('PEGA_'));

let db = null;

if (FIREBASE_READY) {
    try {
        if (!firebase.apps?.length) firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
        console.info('[RProDash] ✅ Firebase conectado a proyecto:', FIREBASE_CONFIG.projectId);
    } catch (e) {
        console.warn('[RProDash] ⚠️ Firebase error, usando localStorage:', e.message);
    }
} else {
    console.info('[RProDash] 📦 Modo local (localStorage). Configura firebase.js para sincronizar en la nube.');
}
