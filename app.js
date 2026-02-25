const G_URL = 'https://script.google.com/macros/s/AKfycbyYBbsr5bFi8o0lzYguDYfJRILTTV3GwxHmoOkmsjI0CAwqhL4qU7h7dQ2CdlEgg_nUYg/exec';

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Iniciando Sincronización Global - El Profeta...");
    
    // 1. Cargar datos locales primero para rapidez
    cargarDatos(); 

    // 2. Intentar descargar datos nuevos de la nube
    try {
        const response = await fetch(G_URL);
        const ventasNube = await response.json();
        
        if (ventasNube && ventasNube.length > 0) {
            actualizarEstadoConNube(ventasNube);
        }
    } catch (e) {
        console.warn("No se pudo sincronizar con la nube, usando datos locales.");
    }

    render();
});

function actualizarEstadoConNube(ventas) {
    setState(prev => {
        // Limpiamos ventas locales para no duplicar y cargamos las de la nube
        Object.keys(prev.usuarios).forEach(u => prev.usuarios[u].ventas = []);
        
        ventas.forEach(v => {
            if (prev.usuarios[v.usuario]) {
                prev.usuarios[v.usuario].ventas.push({
                    cliente: v.cliente,
                    estilos: v.estilos,
                    totalCobrado: v.cobrado,
                    paraProfeta: v.paraProfeta,
                    metodoPago: v.metodo,
                    fecha: v.fecha
                });
            }
        });
        return prev;
    });
}
