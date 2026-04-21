// --- LÓGICA DE ESTADO Y SINCRONIZACIÓN EL PROFETA ---

const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbwcN2g_jeNnm6Ziv4goLKp6oIDolkydO2cVFpgvyblX-12S4Vpp9PSkN1KP7M_-IcD0Ag/exec";

let clientesHistoricos = [];
let ventasPendientes = [];

function modificarStockDirecto(usuario, estilo, cantidad) {
  setState((prev) => {
    prev.usuarios[usuario].stock[estilo] = Number(cantidad) || 0;
    return prev;
  });
}

function registrarVentaLocal() {
  if (!state.usuarioActivo) return;
  const preview = calcularPreview();
  const totalVenta = Number(state.totalCobradoInput) || 0;
  const alquilerBarril = state.alquilerBarril || "";

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
    metodoPago: "efectivo",
    fecha: new Date().toLocaleDateString("es-AR"),
    vendedor: state.usuarioActivo,
    esCobro: false,
  };

  ventasPendientes.push(ventaDatos);
  localStorage.setItem("ventasPendientes", JSON.stringify(ventasPendientes));
  console.log("📝 Venta registrada. Pendientes:", ventasPendientes.length);

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
    prev.alquilerBarril = "";
    return prev;
  });
}

async function guardarVentasPendientesEnSheet() {
  if (!ventasPendientes.length) {
    const guardadas = localStorage.getItem("ventasPendientes");
    if (guardadas) ventasPendientes = JSON.parse(guardadas);
  }

  console.log("📦 Ventas pendientes a enviar:", ventasPendientes.length, JSON.stringify(ventasPendientes));

  if (!ventasPendientes.length) {
    console.warn("⚠️ No hay ventas pendientes para enviar.");
    return;
  }

  const colaActual = [...ventasPendientes];
  ventasPendientes = [];
  localStorage.removeItem("ventasPendientes");

  for (const venta of colaActual) {
    try {
      const payload = { accion: "nuevaVenta", venta: venta };
      console.log("📤 Enviando:", JSON.stringify(payload));
      const resp = await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "text/plain" },
        mode: "cors"
      });
      const texto = await resp.text();
      console.log("✅ Respuesta del Sheet:", texto);
    } catch (err) {
      console.error("❌ Error enviando venta:", err);
      ventasPendientes.push(venta);
      localStorage.setItem("ventasPendientes", JSON.stringify(ventasPendientes));
    }
  }
}

async function cargarClientesHistoricos() {
  try {
    const url = URL_SCRIPT + "?accion=clientes&v=" + Date.now();
    const resp = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });
    const texto = await resp.text();
    const datos = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));
    if (datos.clientes && Array.isArray(datos.clientes)) {
      clientesHistoricos = datos.clientes;
      console.log("✅ Clientes históricos:", clientesHistoricos.length);
    }
  } catch (err) {
    console.error("❌ Error cargando clientes históricos:", err);
  }
}

function registrarPagoCliente(index, metodo = "efectivo") {
  const monto = prompt(`¿Cuánto pagó ${state.clientesGlobales[index].nombre}?`);
  if (!monto) return;
  const montoNum = Number(monto);
  const fecha = new Date().toLocaleDateString("es-AR");

  setState((prev) => {
    const c = prev.clientesGlobales[index];
    c.pagado += montoNum;
    if (!c.pagos) c.pagos = [];
    c.pagos.push({ monto: montoNum, metodo, fecha });
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

function borrarVentaIndividual(index) {
  if (!state.usuarioActivo) return;
  // El historial se muestra en orden inverso (.reverse()), 
  // así que hay que convertir el índice visual al índice real del array
  const ventas = state.usuarios[state.usuarioActivo].ventas;
  const indiceReal = ventas.length - 1 - index;
  if (confirm("¿Borrar esta venta del historial?")) {
    setState((prev) => {
      prev.usuarios[prev.usuarioActivo].ventas.splice(indiceReal, 1);
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

async function cargarDatosDesdeSheet() {
  try {
    const url = URL_SCRIPT + "?v=" + Date.now();
    const respuesta = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });
    const texto = await respuesta.text();
    const datosCloud = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));

    if (datosCloud.error) throw new Error(datosCloud.error);

    setState((prev) => {
      // 1. Aquí le decimos al mensajero que traiga el Stock Y TAMBIÉN LAS VENTAS
      Object.entries(datosCloud.usuarios).forEach(([nombre, datos]) => {
        if (prev.usuarios[nombre]) {
          prev.usuarios[nombre].stock = datos.stock || {};
          // Esta es la línea mágica que faltaba:
          prev.usuarios[nombre].ventas = datos.ventas || []; 
        }
      });

      // 2. Aquí le decimos que traiga a "Alejandro" y los demás clientes
      if (datosCloud.clientes && Array.isArray(datosCloud.clientes)) {
        prev.clientesGlobales = datosCloud.clientes;
      }
      
      return prev;
    });

    console.log("✅ Datos leídos correctamente desde la nube.");
  } catch (error) {
    console.error("❌ Error de lectura:", error);
  }
}
