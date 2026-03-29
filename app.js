/**
 * APP.JS - Iniciador de la aplicación
 * Carga una sola vez al entrar. Al guardar, sincroniza primero y luego guarda.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Datos locales primero para arrancar rápido
  cargarDatos();
  render();

  // 2. Sincronización única al entrar
  await cargarDatosDesdeSheet();

  console.log("Aplicacion lista.");
});
