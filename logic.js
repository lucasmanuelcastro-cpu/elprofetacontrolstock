// --- LÓGICA DE ESTADO Y SINCRONIZACIÓN EL PROFETA ---
// La URL_SCRIPT ahora se define una sola vez en config.js

/** El Sheet guarda "sin"/"con"; la UI usa sinEtiqueta/conEtiqueta */
function normalizarTipoLataDesdeSheet(raw) {
  var s = String(raw || "").toLowerCase().trim();
  if (s === "sin" || s === "sinetiqueta" || s === "sin_etiqueta") return "sinEtiqueta";
  if (s === "con" || s === "conetiqueta" || s === "con_etiqueta") return "conEtiqueta";
  if (s.indexOf("sin") !== -1) return "sinEtiqueta";
  return "conEtiqueta";
}

let clientesHistoricos = [];
let ventasPendientes = [];
let pagosPendientes = [];

/** Cobros encolados hasta que el usuario pulse «Guardar en Sheet». */
function encolarPagoParaSheet(nombreCliente, monto, metodo) {
  if (!pagosPendientes.length) {
    try {
      const raw = localStorage.getItem("pagosPendientes");
      if (raw) pagosPendientes = JSON.parse(raw);
    } catch (e) {}
  }
  const metodoNorm = String(metodo || "").toLowerCase().trim() === "transferencia" ? "transferencia" : "efectivo";
  pagosPendientes.push({
    cliente: nombreCliente,
    monto: Number(monto) || 0,
    metodo: metodoNorm,
    metodoPago: metodoNorm,
    fecha: new Date().toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit', year:'numeric'}) + ' ' + new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}),
    timestamp: Date.now(),
  });
  localStorage.setItem("pagosPendientes", JSON.stringify(pagosPendientes));
}

async function guardarPagosPendientesEnSheet() {
  if (!pagosPendientes.length) {
    const raw = localStorage.getItem("pagosPendientes");
    if (raw) pagosPendientes = JSON.parse(raw);
  }
  if (!pagosPendientes.length) return;

  const cola = [...pagosPendientes];
  pagosPendientes = [];
  localStorage.removeItem("pagosPendientes");

  for (const p of cola) {
    try {
      const payload = {
        accion: "registrarPago",
        cliente: p.cliente,
        monto: p.monto,
        metodo: p.metodo,
        metodoPago: p.metodoPago || p.metodo,
        fecha: p.fecha,
      };
      const resp = await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "text/plain" },
        mode: "cors",
      });
      await resp.text();
      // Marcar pagos locales de este cliente como confirmados (quitar _pendiente)
      const clienteObj = state.clientesGlobales.find(c => c.nombre && c.nombre.toLowerCase() === p.cliente.toLowerCase());
      if (clienteObj && clienteObj.pagos) {
        clienteObj.pagos.forEach(pago => { if (pago._pendiente) delete pago._pendiente; });
      }
    } catch (err) {
      console.error("Error enviando pago al Sheet:", err);
      pagosPendientes.push(p);
      localStorage.setItem("pagosPendientes", JSON.stringify(pagosPendientes));
    }
  }
}

function modificarStockDirecto(usuario, estilo, cantidad) {
  setState((prev) => {
    prev.usuarios[usuario].stock[estilo] = Number(cantidad) || 0;
    return prev;
  });
}

// REGISTRAR VENTA LOCAL
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
    metodoPago: "",
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
      metodoPago: "",
      fecha: ventaDatos.fecha,
      tipoLata: ventaDatos.tipoLata,
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
      if (prev.tipoLata === 'sinEtiqueta') {
        if (!usuario.stockSinEtiqueta) usuario.stockSinEtiqueta = {};
        usuario.stockSinEtiqueta[estilo] = (usuario.stockSinEtiqueta[estilo] || 0) - (Number(cant) || 0);
      } else {
        usuario.stock[estilo] = (usuario.stock[estilo] || 0) - (Number(cant) || 0);
      }
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
  console.log("📦 Ventas pendientes a enviar:", ventasPendientes.length);
  if (!ventasPendientes.length) return;

  const colaActual = [...ventasPendientes];
  ventasPendientes = [];
  localStorage.removeItem("ventasPendientes");

  for (const venta of colaActual) {
    try {
      const payload = { accion: "nuevaVenta", venta: venta };
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
    const url = URL_SCRIPT + "?accion=clientesTodos&v=" + Date.now();
    const resp = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });
    const texto = await resp.text();
    const datos = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));
    if (datos.clientesTodos && Array.isArray(datos.clientesTodos)) {
      clientesHistoricos = datos.clientesTodos.filter(c => c && c.nombre);
      console.log("✅ Clientes históricos desde ventas:", clientesHistoricos.length);
    }
  } catch (err) {
    console.error("❌ Error cargando clientes históricos:", err);
  }
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
  const ventas = state.usuarios[state.usuarioActivo].ventas;
  const indiceReal = ventas.length - 1 - index;
  if (confirm("¿Borrar esta venta del historial?")) {
    setState((prev) => {
      prev.usuarios[prev.usuarioActivo].ventas.splice(indiceReal, 1);
      return prev;
    });
  }
}

function swapMetodoPago(nombreUsuario, ventaIndex) {
  setState((prev) => {
    const venta = prev.usuarios[nombreUsuario].ventas[ventaIndex];
    if (!venta) return prev;
    venta.metodoPago = (venta.metodoPago || "efectivo") === "efectivo" ? "transferencia" : "efectivo";
    return prev;
  });
}

// Guardar Transferencia en Sheet
async function guardarTransferenciaEnSheet(desde, hacia, estilos, tipo) {
  try {
    const entrada = {
      fecha: new Date().toLocaleString("es-AR"),
      desde: desde,
      hacia: hacia,
      estilos: estilos,
      tipo: tipo
    };
    
    await fetch(URL_SCRIPT, {
      method: "POST",
      body: JSON.stringify({ 
        accion: "guardarTransferencia", 
        entrada: entrada 
      }),
      headers: { "Content-Type": "text/plain" },
      mode: "cors"
    });
  } catch (err) {
    console.error("Error guardando transferencia en Sheet:", err);
  }
}

// ============================================================
// CARGA DE DATOS DESDE SHEET (VERSIÓN CORREGIDA)
// ============================================================
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
     // 1. POPULARIDAD
if (datosCloud.popularidad) {
  prev.popularidadSheet = datosCloud.popularidad;
  prev.popularidad = datosCloud.popularidad; // 👈 AGREGÁ ESTA LÍNEA JUSTO ABAJO
}

      // 2. TOTALES FINANCIEROS
      if (datosCloud.totalIngresadoSheet !== undefined) prev.totalIngresadoSheet = Number(datosCloud.totalIngresadoSheet) || 0;
      if (datosCloud.efectivoSheet !== undefined) prev.efectivoSheet = Number(datosCloud.efectivoSheet) || 0;
      if (datosCloud.transferenciaSheet !== undefined) prev.transferenciaSheet = Number(datosCloud.transferenciaSheet) || 0;
      if (datosCloud.paraProfetaSheet !== undefined) prev.paraProfetaSheet = Number(datosCloud.paraProfetaSheet) || 0;

      // 3. STOCK GENERAL
      if (datosCloud.stockGeneral) {
        prev.stockGeneral = {
          "BLONDE": Number(datosCloud.stockGeneral["BLONDE"]) || 0,
          "IRISH RED": Number(datosCloud.stockGeneral["IRISH RED"]) || 0,
          "STOUT": Number(datosCloud.stockGeneral["STOUT"]) || 0,
          "SESSION IPA": Number(datosCloud.stockGeneral["SESSION IPA"]) || 0,
          "RED IPA": Number(datosCloud.stockGeneral["RED IPA"]) || 0,
          "HONEY": Number(datosCloud.stockGeneral["HONEY"]) || 0,
          "LATAS SIN ETIQUETA": Number(datosCloud.stockGeneral["LATAS SIN ETIQUETA"]) || 0
        };
      }

      // 4. SINCRONIZAR STOCK Y VENTAS POR USUARIO
      Object.entries(datosCloud.usuarios).forEach(([nombre, datos]) => {
        if (prev.usuarios[nombre]) {
          // Stock con etiqueta
          if (datos.stock) {
            prev.usuarios[nombre].stock = {
              "BLONDE": Number(datos.stock["BLONDE"]) || 0,
              "IRISH RED": Number(datos.stock["IRISH RED"]) || 0,
              "STOUT": Number(datos.stock["STOUT"]) || 0,
              "SESSION IPA": Number(datos.stock["SESSION IPA"]) || 0,
              "RED IPA": Number(datos.stock["RED IPA"]) || 0,
              "HONEY": Number(datos.stock["HONEY"]) || 0,
            };
          }
          
          // Stock sin etiqueta
          if (datos.stockSinEtiqueta) {
            prev.usuarios[nombre].stockSinEtiqueta = {
              "BLONDE": Number(datos.stockSinEtiqueta["BLONDE"]) || 0,
              "IRISH RED": Number(datos.stockSinEtiqueta["IRISH RED"]) || 0,
              "STOUT": Number(datos.stockSinEtiqueta["STOUT"]) || 0,
              "SESSION IPA": Number(datos.stockSinEtiqueta["SESSION IPA"]) || 0,
              "RED IPA": Number(datos.stockSinEtiqueta["RED IPA"]) || 0,
              "HONEY": Number(datos.stockSinEtiqueta["HONEY"]) || 0,
            };
          }
          
          // ⭐ VENTAS - Sincronización completa desde el Sheet ⭐
          if (datos.ventas && Array.isArray(datos.ventas)) {
            prev.usuarios[nombre].ventas = datos.ventas.map(venta => {
              const tipo = normalizarTipoLataDesdeSheet(venta.tipoLata);
              const costo = Number(venta.costo) || 0;
              const com = Number(venta.comision) || 0;
              const paraProfeta = venta.paraProfeta != null && venta.paraProfeta !== ""
                ? Number(venta.paraProfeta)
                : costo + com;
              
              return {
                cliente: venta.cliente || "Consumidor Final",
                estilos: venta.estilos || {},
                alquilerBarril: venta.alquilerBarril || "",
                tipoLata: tipo,
                estado: venta.estado || "PENDIENTE",
                metodoPago: venta.metodoPago || "",
                totalCobrado: Number(venta.totalCobrado) || 0,
                costoTotal: Number(venta.costoTotal) || costo,
                comision: com,
                paraProfeta: paraProfeta,
                fecha: venta.fecha || "",
                timestamp: venta.timestamp 
                  ? Number(venta.timestamp) 
                  : (new Date(venta.fecha).getTime() || 0),
                vendedor: venta.vendedor || nombre,
                cobradoReal: Number(venta.cobradoReal) || 0
              };
            });
          }
        }
      });

      // 5. SINCRONIZAR CLIENTES — Sheet es siempre fuente de verdad
      if (datosCloud.clientes && Array.isArray(datosCloud.clientes) && datosCloud.clientes.length > 0) {
        datosCloud.clientes.forEach(clienteCloud => {
          if (!clienteCloud.nombre || typeof clienteCloud.nombre !== 'string') return;
          const deudaCloud  = Number(clienteCloud.deuda)  || 0;
          const pagadoCloud = Number(clienteCloud.pagado) || 0;
          // Saldo real = deuda - pagado (calculado siempre desde Sheet)
          const saldoReal   = Math.max(0, deudaCloud - pagadoCloud);
          const idx = prev.clientesGlobales.findIndex(c => c.nombre && c.nombre.toLowerCase() === clienteCloud.nombre.toLowerCase());
          if (idx !== -1) {
            // Si hay pagos locales pendientes de enviar al Sheet, los sumamos al pagado del Sheet
            const pagosLocalesPendientes = (prev.clientesGlobales[idx].pagos || [])
              .filter(p => p._pendiente)
              .reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
            prev.clientesGlobales[idx].deuda  = deudaCloud;
            prev.clientesGlobales[idx].pagado = pagadoCloud + pagosLocalesPendientes;
            prev.clientesGlobales[idx].saldo  = Math.max(0, saldoReal - pagosLocalesPendientes);
          } else {
            prev.clientesGlobales.push({
              nombre: clienteCloud.nombre,
              deuda:  deudaCloud,
              pagado: pagadoCloud,
              saldo:  saldoReal,
              pagos:  []
            });
          }
        });
      }

      // 6. HISTORIAL DE STOCK
      if (datosCloud.historialStock && Array.isArray(datosCloud.historialStock) && datosCloud.historialStock.length > 0) {
        prev.historialStock = datosCloud.historialStock.map(h => ({
          fecha: h.fecha || "",
          usuario: h.usuario || "",
          tipo: h.tipo || "conEtiqueta",
          estilos: h.estilos || {}
        }));
      }

      // 7. HISTORIAL DE TRANSFERENCIAS
      if (datosCloud.historialTransferencias && Array.isArray(datosCloud.historialTransferencias) && datosCloud.historialTransferencias.length > 0) {
        prev.historialTransferencias = datosCloud.historialTransferencias.map(t => ({
          fecha: t.fecha || "",
          desde: t.desde || "",
          hacia: t.hacia || "",
          tipo: t.tipo || "conEtiqueta",
          estilos: t.estilos || {}
        }));
      }

      return prev;
    });

    if (datosCloud.clientesHistoricos) {
      clientesHistoricos = datosCloud.clientesHistoricos;
    }
    
    console.log("✅ Datos sincronizados desde Sheet correctamente");
    
  } catch (error) {
    console.error("❌ Error de lectura:", error);
  }
}

function agregarStockDirecto(estilo, conEtiqueta) {
  const input = document.querySelector(`[data-agregar="${estilo}"]`);
  if (!input || !input.value || input.value.trim() === "") {
    alert("Ingrese cantidad");
    return;
  }
  const cantidad = Number(input.value);
  if (isNaN(cantidad) || cantidad === 0) {
    alert("Cantidad inválida");
    return;
  }
  setState((prev) => {
    const target = conEtiqueta ? prev.usuarios[prev.usuarioActivo].stock : prev.usuarios[prev.usuarioActivo].stockSinEtiqueta;
    target[estilo] = (target[estilo] || 0) + cantidad;
    return prev;
  });
  input.value = "";
}

function encolarActualizarStockEnSheet(usuario) {
  if (!usuario) return;
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem("stockPendienteUsuarios") || "[]");
  } catch (e) {}
  if (arr.indexOf(usuario) === -1) arr.push(usuario);
  localStorage.setItem("stockPendienteUsuarios", JSON.stringify(arr));
}

function encolarBorrarVentaEnSheet(payload) {
  let cola = [];
  try {
    cola = JSON.parse(localStorage.getItem("borrarVentasPendientes") || "[]");
  } catch (e) {}
  cola.push(payload);
  localStorage.setItem("borrarVentasPendientes", JSON.stringify(cola));
}

async function guardarBorrarVentasPendienteEnSheet() {
  let cola = [];
  try {
    cola = JSON.parse(localStorage.getItem("borrarVentasPendientes") || "[]");
  } catch (e) {}
  if (!cola.length) return;
  localStorage.removeItem("borrarVentasPendientes");
  const fallidos = [];
  for (const data of cola) {
    try {
      const payload = Object.assign({ accion: "borrarVenta" }, data);
      await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "text/plain" },
        mode: "cors"
      });
    } catch (err) {
      console.error("Error borrando venta en Sheet:", err);
      fallidos.push(data);
    }
  }
  if (fallidos.length) {
    let prev = [];
    try { prev = JSON.parse(localStorage.getItem("borrarVentasPendientes") || "[]"); } catch (e2) {}
    localStorage.setItem("borrarVentasPendientes", JSON.stringify(prev.concat(fallidos)));
  }
}

async function guardarStockPendienteEnSheet() {
  let usuarios = [];
  try {
    usuarios = JSON.parse(localStorage.getItem("stockPendienteUsuarios") || "[]");
  } catch (e) {}
  if (!usuarios.length) return;
  localStorage.removeItem("stockPendienteUsuarios");
  const fallidos = [];
  for (const usuario of usuarios) {
    const u = state.usuarios[usuario];
    if (!u) continue;
    try {
      const payload = {
        accion: "actualizarStock",
        usuario: usuario,
        stock: { ...u.stock },
        stockSinEtiqueta: { ...(u.stockSinEtiqueta || {}) }
      };
      await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "text/plain" },
        mode: "cors"
      });
    } catch (err) {
      console.error("Error subiendo stock:", err);
      fallidos.push(usuario);
    }
  }
  if (fallidos.length) {
    let prev = [];
    try { prev = JSON.parse(localStorage.getItem("stockPendienteUsuarios") || "[]"); } catch (e3) {}
    localStorage.setItem("stockPendienteUsuarios", JSON.stringify(prev.concat(fallidos)));
  }
}

// ===== AUDITORÍA =====
function registrarAuditoria(accion, usuario, cliente, detalle, monto) {
  const registro = {
    fecha: new Date().toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit', year:'numeric'}) + ' ' + new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}),
    accion: accion,
    usuario: usuario || state.usuarioActivo || "",
    cliente: cliente || "",
    detalle: detalle || "",
    monto: monto || 0
  };
  fetch(URL_SCRIPT, {
    method: "POST",
    body: JSON.stringify({ accion: "guardarAuditoria", registro: registro }),
    headers: { "Content-Type": "text/plain" },
    mode: "cors"
  }).catch(err => console.error("Error auditoría:", err));
}
