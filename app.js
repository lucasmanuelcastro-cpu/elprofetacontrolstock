/**
 * APP.JS - Iniciador de la aplicación
 * Sincronización silenciosa con Google Sheets cada 500ms.
 */

const INTERVALO_REFRESH_MS = 500;
let refreshTimer = null;

function iniciarAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    cargarDatosDesdeSheet();
  }, INTERVALO_REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", async () => {
  cargarDatos();
  render();
  await cargarDatosDesdeSheet();
  iniciarAutoRefresh();
});
