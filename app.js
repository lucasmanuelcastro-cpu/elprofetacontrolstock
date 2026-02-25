/**
 * APP.JS - Iniciador de la aplicación
 * Este archivo conecta la carga de datos con la visualización inicial.
 */

 document.addEventListener("DOMContentLoaded", () => {
    console.log("Iniciando Control Integral - El Profeta...");

    // 1. Cargamos los datos desde el LocalStorage (definido en state.js)
    cargarDatos();

    // 2. Ejecutamos el primer renderizado para dibujar toda la interfaz
    // La función render() está definida en ui.js y dibuja:
    // - Stock General y Popularidad
    // - Ventas Totales y Ganancia Profeta
    // - Cartera de Clientes (Deudores)
    // - Selectores de Usuarios y Panel Activo
    render();

    console.log("Aplicación lista para usar.");
});

/**
 * Nota: Para que este archivo funcione correctamente, 
 * debe ser el ÚLTIMO en cargarse en tu index.html:
 * * <script src="state.js"></script>
 * <script src="logic.js"></script>
 * <script src="ui.js"></script>
 * <script src="app.js"></script>
 */