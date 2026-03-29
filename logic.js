// --- LÓGICA DE ESTADO Y SINCRONIZACIÓN EL PROFETA ---

const URL_SCRIPT = "https://script.google.com/macros/s/AKfycby516QlK6tXkDISDJIdG075_LdH0CyhYs63KqTevYIl5lllkxcQLiNqLRKyFqyFhURs1g/exec";

// Clientes históricos cargados desde "Venta de Latas y Barriles"
let clientesHistoricos = [];

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
  const alquilerBarril = state.alquilerBarril || "";

  // Capturar datos ANTES de que setState los limpie
  const ventaDatos = {
    cliente: state.clienteNombre || "Consumidor Final",
    estilos: { ...state.ventaActual },
    alquilerBarril: alquilerBarril,
    totalCobrado: totalVenta,
    paraProfeta: preview.paraProfeta,
    comision: preview.comision,
    totalLatas: preview.totalLatas,
    costo: preview.costoTotal,
    ganancia: totalVenta - preview.costoTotal,
    metodoPago: state.metodoPago || "efectivo",
    fecha: new Date().toLocaleDateString("es-AR"),
    vendedor: state.usuarioActivo,
  };

  setState((prev) => {
    const usuario = prev.usuarios[prev.usuarioActivo];

    usuario.ventas.push({
      cliente: ventaDatos.cliente,
      estilos: ventaDatos.estilos,
      totalCobrado: totalVenta,
      paraProfeta: preview.paraProfeta,
      comision: preview.comision,
      metodoPago: ventaDatos.metodoPago,
      fecha: ventaDatos.fecha,
    });

    if (prev.clienteNombre && prev.clienteNombre.trim() !== "") {
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
    prev.alquilerBarril = "";
    return prev;
  });

  // Guardar en Google Sheets (silencioso, no bloquea)
  guardarVentaEnSheet(ventaDatos);
  guardarEnSheets();
}

// --- GUARDAR VENTA EN "Venta de Latas y Barriles" ---
async function guardarVentaEnSheet(venta) {
  try {
    const payload = {
      accion: "nuevaVenta",
      venta: venta
    };
    await fetch(URL_SCRIPT, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain" }
    });
    console.log("✅ Venta guardada en Sheet.");
  } catch (err) {
    console.error("❌ Error guardando venta en Sheet:", err);
  }
}

// --- CARGAR CLIENTES HISTÓRICOS DESDE "Venta de Latas y Barriles" ---
async function cargarClientesHistoricos() {
  try {
    const url = URL_SCRIPT + "?accion=clientes&v=" + Date.now();
    const resp = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });
    const texto = await resp.text();
    const datos = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));
    if (datos.clientes && Array.isArray(datos.clientes)) {
      clientesHistoricos = datos.clientes;
      console.log("✅ Clientes históricos cargados:", clientesHistoricos.length);
    }
  } catch (err) {
    console.error("❌ Error cargando clientes históricos:", err);
  }
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

// --- LECTURA DE STOCK DESDE NUBE ---
async function cargarDatosDesdeSheet() {
  try {
    const url = URL_SCRIPT + "?v=" + Date.now();
    const respuesta = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });
    if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);

    const texto = await respuesta.text();
    const datosCloud = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));

    if (datosCloud.error) throw new Error(datosCloud.error);
    if (!datosCloud.usuarios || typeof datosCloud.usuarios !== "object") return;

    setState((prev) => {
      Object.entries(datosCloud.usuarios).forEach(([nombre, datos]) => {
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

    // También actualizar clientes históricos silenciosamente
    if (datosCloud.clientesHistoricos) {
      clientesHistoricos = datosCloud.clientesHistoricos;
    }

  } catch (error) {
    console.error("❌ Error de lectura desde Google Sheets:", error);
  }
}
