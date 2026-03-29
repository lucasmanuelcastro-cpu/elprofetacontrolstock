// --- LÓGICA DE ESTADO Y SINCRONIZACIÓN EL PROFETA ---

function modificarStockDirecto(usuario, estilo, cantidad) {
  setState((prev) => {
    prev.usuarios[usuario].stock[estilo] = Number(cantidad) || 0;
    return prev;
  });
}

function registrarVenta() {
  if (!state.usuarioActivo) return;
  const preview = calcularPreview();
  const totalVenta = Number(state.totalCobradoInput) || 0;

  setState((prev) => {
    const usuario = prev.usuarios[prev.usuarioActivo];
    
    usuario.ventas.push({
      cliente: prev.clienteNombre || "Consumidor Final",
      estilos: { ...prev.ventaActual },
      totalCobrado: totalVenta,
      paraProfeta: preview.paraProfeta,
      comision: preview.comision,
      metodoPago: prev.metodoPago || "efectivo",
      fecha: new Date().toLocaleDateString(),
    });

    if (prev.clienteNombre.trim() !== "") {
      const idx = prev.clientesGlobales.findIndex(c => c.nombre.toLowerCase() === prev.clienteNombre.toLowerCase());
      if (idx !== -1) {
        prev.clientesGlobales[idx].deuda += totalVenta;
      } else {
        prev.clientesGlobales.push({ nombre: prev.clienteNombre, deuda: totalVenta, pagado: 0 });
      }
    }

    Object.entries(prev.ventaActual).forEach(([estilo, cant]) => {
      usuario.stock[estilo] = (usuario.stock[estilo] || 0) - (Number(cant) || 0);
    });

    prev.ventaActual = {};
    prev.clienteNombre = "";
    prev.totalCobradoInput = "";
    prev.metodoPago = "efectivo";
    return prev;
  });
}

function registrarPagoCliente(index, metodo = "efectivo") {
  const monto = prompt(`¿Cuánto pagó ${state.clientesGlobales[index].nombre}?`);
  if (!monto) return;
  setState((prev) => {
    const cliente = prev.clientesGlobales[index];
    cliente.pagado += Number(monto);
    if (!cliente.pagos) cliente.pagos = [];
    cliente.pagos.push({ monto: Number(monto), metodo, fecha: new Date().toLocaleDateString() });
    return prev;
  });
}

function borrarHistorialUsuario() {
  if (!state.usuarioActivo) return;
  if (confirm("¿Borrar ventas?")) {
    setState((prev) => {
      prev.usuarios[prev.usuarioActivo].ventas = [];
      return prev;
    });
  }
}

function transferirStock() {
  setState((prev) => {
    const { transferDesde, transferHacia, transferEstilo, transferCantidad } = prev;
    if (transferDesde === transferHacia) return prev;
    const disponible = prev.usuarios[transferDesde].stock[transferEstilo] || 0;
    if (disponible < transferCantidad) { alert("Stock insuficiente"); return prev; }
    prev.usuarios[transferDesde].stock[transferEstilo] -= Number(transferCantidad);
    prev.usuarios[transferHacia].stock[transferEstilo] = (prev.usuarios[transferHacia].stock[transferEstilo] || 0) + Number(transferCantidad);
    prev.transferCantidad = 0;
    return prev;
  });
}

function swapMetodoPago(nombreUsuario, ventaIndex) {
  setState((prev) => {
    const venta = prev.usuarios[nombreUsuario].ventas[ventaIndex];
    if (!venta) return prev;
    venta.metodoPago = (venta.metodoPago || "efectivo") === "efectivo" ? "transferencia" : "efectivo";
    return prev;
  });
}

// --- FUNCIÓN DE LECTURA CRÍTICA (NUBE -> APP) ---

async function cargarDatosDesdeSheet() {
  const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbwSfPgfmAD2eavLkIPN_qhOmo0XounU-nehZzEgpdzmZptvq1ELgMukla1kCBmGJysm/exec";
  
  try {
    console.log("Intentando sincronizar con El Profeta Cloud...");

    const url = URL_SCRIPT + "?v=" + Date.now();
    const respuesta = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });

    if (!respuesta.ok) {
      throw new Error("HTTP " + respuesta.status + ": " + respuesta.statusText);
    }

    const texto = await respuesta.text();
    const datosCloud = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));
    console.log("Datos recibidos del Sheet:", datosCloud);

    // Tu doGet devuelve: { usuarios: { Julian: { stock: {...} }, Matias: {...}, Lucas: {...} } }
    if (datosCloud.error) {
      throw new Error("Error del Sheet: " + datosCloud.error);
    }

    if (!datosCloud.usuarios || typeof datosCloud.usuarios !== "object") {
      throw new Error("Formato inesperado: " + JSON.stringify(datosCloud).substring(0, 100));
    }

    setState((prev) => {
      // Recorrer cada usuario que vino del Sheet
      Object.entries(datosCloud.usuarios).forEach(function(entry) {
        const nombre = entry[0];   // "Julian", "Matias", "Lucas"
        const datos  = entry[1];   // { stock: { BLONDE: 333, ... } }

        if (prev.usuarios[nombre] && datos.stock) {
          prev.usuarios[nombre].stock = {
            "BLONDE":      Number(datos.stock["BLONDE"])      || 0,
            "IRISH RED":   Number(datos.stock["IRISH RED"])   || 0,
            "STOUT":       Number(datos.stock["STOUT"])       || 0,
            "SESSION IPA": Number(datos.stock["SESSION IPA"]) || 0,
            "RED IPA":     Number(datos.stock["RED IPA"])     || 0,
            "HONEY":       Number(datos.stock["HONEY"])       || 0
          };
        }
      });
      return prev;
    });

    const aviso = document.getElementById("aviso-sync");
    if (aviso) aviso.textContent = "";
    console.log("✅ Sincronizacion exitosa. Datos cargados en el panel.");

  } catch (error) {
    console.error("❌ Error de lectura desde Google Sheets:", error);
    const aviso = document.getElementById("aviso-sync");
    if (aviso) aviso.textContent = "⚠️ Sin conexión al Sheet: " + error.message;
  }
}

// NOTA: cargarDatosDesdeSheet() se llama desde app.js,
// después de que ui.js (que define render()) ya está cargado.
