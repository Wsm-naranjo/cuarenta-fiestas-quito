// Configuración del proyecto Firebase (Consola → ⚙️ Configuración del proyecto → Tus apps → Web).
// Estos datos son públicos por diseño: lo que protege la base son las reglas de Realtime Database.
// Para probar con el emulador local en vez de este proyecto: VITE_EMULADOR=1 npm run dev
export const firebaseConfig = {
  apiKey: 'AIzaSyAcBzd_qN2iyEtb4XKWejyriNluzNUELOA',
  authDomain: 'cuarenta-prolipa.firebaseapp.com',
  databaseURL: 'https://cuarenta-prolipa-default-rtdb.firebaseio.com',
  projectId: 'cuarenta-prolipa',
  storageBucket: 'cuarenta-prolipa.firebasestorage.app',
  messagingSenderId: '671727542055',
  appId: '1:671727542055:web:dc0e88a5a238dbcd6d5302',
}
