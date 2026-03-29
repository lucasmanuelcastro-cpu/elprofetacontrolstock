/**
 * APP.JS - Iniciador de la aplicación
 * Este archivo conecta la carga de datos con la visualización inicial.
 * Debe ser el ÚLTIMO script en cargarse en index.html.
 */

document.addEventListener("DOMContentLoaded", () => {
    console.log("Iniciando Control Integral - El Profeta...");

    // 1. Cargamos los datos guardados localmente (localStorage)
    cargarDatos();

    // 2. Primer renderizado con los datos locales
    render();

    // 3. Intentamos sincronizar con Google Sheets (async, no bloquea la UI)
    //    Se llama ACÁ porque render() ya está definida en ui.js
    cargarDatosDesdeSheet();

    console.log("Aplicacion lista para usar.");
});
