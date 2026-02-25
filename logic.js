function registrarVenta() {
  if (!state.usuarioActivo) return;
  const preview = calcularPreview();
  const totalVenta = Number(state.totalCobradoInput) || 0;
  
  // URL de tu Google Apps Script
  const G_URL = 'https://script.google.com/macros/s/AKfycbyYBbsr5bFi8o0lzYguDYfJRILTTV3GwxHmoOkmsjI0CAwqhL4qU7h7dQ2CdlEgg_nUYg/exec';

  setState((prev) => {
    const usuario = prev.usuarios[prev.usuarioActivo];
    const nuevaVenta = {
      cliente: prev.clienteNombre || "Consumidor Final",
      estilos: { ...prev.ventaActual },
      totalCobrado: totalVenta,
      paraProfeta: preview.paraProfeta,
      comision: preview.comision,
      metodoPago: prev.metodoPago || "efectivo",
      fecha: new Date().toLocaleDateString(),
    };

    // 1. Guardar localmente
    usuario.ventas.push(nuevaVenta);

    // 2. Enviar a Google Sheets para sincronizar con otros Android
// Cambiá el bloque fetch por este que es más compatible con Android
fetch(G_URL, {
  method: 'POST',
  mode: 'no-cors', // Mantenemos no-cors para evitar errores de seguridad
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fecha: nuevaVenta.fecha,
    usuario: prev.usuarioActivo,
    cliente: nuevaVenta.cliente,
    estilos: nuevaVenta.estilos,
    cobrado: nuevaVenta.totalCobrado,
    paraProfeta: nuevaVenta.paraProfeta,
    metodo: nuevaVenta.metodoPago
  })
});

    // 3. Cliente Global
    if (prev.clienteNombre.trim() !== "") {
      const idx = prev.clientesGlobales.findIndex(c => c.nombre.toLowerCase() === prev.clienteNombre.toLowerCase());
      if (idx !== -1) prev.clientesGlobales[idx].deuda += totalVenta;
      else prev.clientesGlobales.push({ nombre: prev.clienteNombre, deuda: totalVenta, pagado: 0 });
    }

    // 4. Restar Stock
    Object.entries(prev.ventaActual).forEach(([estilo, cant]) => {
      usuario.stock[estilo] = (usuario.stock[estilo] || 0) - (Number(cant) || 0);
    });

    // Limpiar campos
    prev.ventaActual = {};
    prev.clienteNombre = "";
    prev.totalCobradoInput = "";
    prev.metodoPago = "efectivo";
    return prev;
  });
}

