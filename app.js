/**
 * APP.JS - Iniciador de la aplicación
 * Este archivo conecta la carga de datos con la visualización inicial.
 * Debe ser el ÚLTIMO script en cargarse en index.html.
 */

// --- CONFIGURACIÓN DE AUTO-REFRESH ---
const INTERVALO_REFRESH_MS = 2 * 1000; // 2 segundos // 60 segundos (modificá este valor)
let refreshTimer = null;
let refreshActivo = true;

function iniciarAutoRefresh() {
  detenerAutoRefresh(); // Limpia cualquier timer previo
  refreshTimer = setInterval(async () => {
    if (!refreshActivo) return;
    console.log("🔄 Auto-refresh: sincronizando con Google Sheets...");
    actualizarIndicadorRefresh("syncing");
    await cargarDatosDesdeSheet();
    actualizarIndicadorRefresh("ok");
  }, INTERVALO_REFRESH_MS);
  console.log(`✅ Auto-refresh iniciado cada ${INTERVALO_REFRESH_MS / 1000} segundos.`);
}

function detenerAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function actualizarIndicadorRefresh(estado) {
  const indicador = document.getElementById("refresh-indicator");
  const countdown = document.getElementById("refresh-countdown");
  if (!indicador) return;

  if (estado === "syncing") {
    indicador.textContent = "🔄 Sincronizando...";
    indicador.style.color = "#f59e0b";
  } else if (estado === "ok") {
    const ahora = new Date().toLocaleTimeString();
    indicador.textContent = `✅ Última sync: ${ahora}`;
    indicador.style.color = "#059669";
    iniciarCountdown();
  } else if (estado === "paused") {
    indicador.textContent = "⏸️ Auto-refresh pausado";
    indicador.style.color = "#6b7280";
    if (countdown) countdown.textContent = "";
  }
}

// Contador regresivo visual
let countdownTimer = null;
let segundosRestantes = INTERVALO_REFRESH_MS / 1000;

function iniciarCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  segundosRestantes = INTERVALO_REFRESH_MS / 1000;
  const countdown = document.getElementById("refresh-countdown");
  if (!countdown) return;

  countdownTimer = setInterval(() => {
    if (!refreshActivo) { clearInterval(countdownTimer); return; }
    segundosRestantes--;
    if (segundosRestantes <= 0) {
      segundosRestantes = INTERVALO_REFRESH_MS / 1000;
    }
    countdown.textContent = `(próxima en ${segundosRestantes}s)`;
  }, 1000);
}

function toggleRefresh() {
  refreshActivo = !refreshActivo;
  const btn = document.getElementById("btn-toggle-refresh");
  if (refreshActivo) {
    iniciarAutoRefresh();
    iniciarCountdown();
    actualizarIndicadorRefresh("ok");
    if (btn) { btn.textContent = "⏸️ Pausar Sync"; btn.style.background = "#f59e0b"; }
  } else {
    detenerAutoRefresh();
    if (countdownTimer) clearInterval(countdownTimer);
    actualizarIndicadorRefresh("paused");
    if (btn) { btn.textContent = "▶️ Reanudar Sync"; btn.style.background = "#059669"; }
  }
}

async function syncManual() {
  const btn = document.getElementById("btn-sync-manual");
  if (btn) { btn.disabled = true; btn.textContent = "🔄 Sincronizando..."; }
  actualizarIndicadorRefresh("syncing");
  await cargarDatosDesdeSheet();
  actualizarIndicadorRefresh("ok");
  iniciarCountdown();
  if (btn) { btn.disabled = false; btn.textContent = "🔄 Sync Ahora"; }
}

// --- INICIO DE LA APP ---
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Iniciando Control Integral - El Profeta...");

  // 1. Cargamos los datos guardados localmente (localStorage)
  cargarDatos();

  // 2. Primer renderizado con los datos locales
  render();

  // 3. Sincronización inicial con Google Sheets
  actualizarIndicadorRefresh("syncing");
  await cargarDatosDesdeSheet();
  actualizarIndicadorRefresh("ok");

  // 4. Iniciar auto-refresh periódico
  iniciarAutoRefresh();
  iniciarCountdown();

  console.log("Aplicacion lista para usar.");
});
