// --- LÓGICA DE ESTADO Y SINCRONIZACIÓN EL PROFETA ---

/** El Sheet guarda "sin"/"con"; la UI usa sinEtiqueta/conEtiqueta */

/**
 * Parsea fechas en formato día/mes/año (con hora opcional).
 * Sin ambigüedad: el primer número SIEMPRE es el día, el segundo SIEMPRE el mes.
 */
function parsearFechaFlexible(str) {
  if (!str) return 0;
  str = String(str).trim();

  // dd/MM/yyyy HH:mm(:ss) opcional, con o sin am/pm
  const conHora = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[,]?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?/i);
  if (conHora) {
    let [, dia, mes, anio, hora, min, seg, ampm] = conHora;
    dia = Number(dia); mes = Number(mes); anio = Number(anio);
    hora = Number(hora); min = Number(min); seg = seg ? Number(seg) : 0;

    if (ampm) {
      const esPM = /p/i.test(ampm);
      if (esPM && hora < 12) hora += 12;
      if (!esPM && hora === 12) hora = 0;
    }
    return new Date(anio, mes - 1, dia, hora, min, seg).getTime() || 0;
  }

  // dd/MM/yyyy sin hora
  const soloFecha = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (soloFecha) {
    let [, dia, mes, anio] = soloFecha.map(Number);
    return new Date(anio, mes - 1, dia).getTime() || 0;
  }

  return 0;
}

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
let pagosMetodoPendientes = [];
let cicloPendiente = null;

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
        timestamp: p.timestamp // <--- Agregado para que el ciclo lo filtre bien
      };
      const resp = await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "text/plain" },
        mode: "cors",
      });
      await resp.text();
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



// REGISTRAR VENTA LOCAL


async function guardarVentasPendientesEnSheet() {
  if (!ventasPendientes.length) {
    const guardadas = localStorage.getItem("ventasPendientes");
    if (guardadas) ventasPendientes = JSON.parse(guardadas);
  }
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

async function guardarBarrilesPendientesEnSheet() {
  let cola = [];
  try {
    cola = JSON.parse(localStorage.getItem("barrilesPendientes") || "[]");
  } catch (e) {}
  if (!cola.length) return;
  localStorage.removeItem("barrilesPendientes");

  for (const b of cola) {
    try {
      const payload = { accion: "actualizarBarril", barril: b };
      await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "text/plain" },
        mode: "cors"
      });
    } catch (err) {
      console.error("Error enviando barril al Sheet:", err);
      let prev = [];
      try { prev = JSON.parse(localStorage.getItem("barrilesPendientes") || "[]"); } catch(e2) {}
      prev.push(b);
      localStorage.setItem("barrilesPendientes", JSON.stringify(prev));
    }
  }
}

async function cargarClientesHistoricos() {
  try {
    const url = URL_SCRIPT + "?accion=clientesTodos&v=" + Date.now();
    const resp = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });
    const texto = await resp.text();
    const datos = JSON.parse(texto.trim().replace(/^﻿/, ""));
    if (datos.clientesTodos && Array.isArray(datos.clientesTodos)) {
      clientesHistoricos = datos.clientesTodos.filter(c => c && c.nombre);
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
// CARGA DE DATOS DESDE SHEET
// ============================================================

async function cargarDatosDesdeSheet() {
  try {
    const url = URL_SCRIPT + "?v=" + Date.now();
    const respuesta = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });
    if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);

    const texto = await respuesta.text();
    const datosCloud = JSON.parse(texto.trim().replace(/^﻿/, ""));
    if (datosCloud.error) throw new Error(datosCloud.error);

    setState((prev) => {
      // 1. POPULARIDAD
      if (datosCloud.popularidad) {
        prev.popularidadSheet = datosCloud.popularidad;
        prev.popularidad = datosCloud.popularidad;
      }
            // LEER CONFIGURACIÓN DE CICLO
      if (datosCloud.cicloFechaCorte !== undefined) {
        prev.cicloFechaCorte = Number(datosCloud.cicloFechaCorte) || 0;
      }
      if (datosCloud.profetaInicialCiclo !== undefined) {
        prev.profetaInicialCiclo = Number(datosCloud.profetaInicialCiclo) || 0;
      }

      
      if (datosCloud.configuracion) {
        prev.configuracion = datosCloud.configuracion;
      }
      if (datosCloud.barrilesDisponibles) {
        prev.barrilesDisponibles = datosCloud.barrilesDisponibles;
      }

      // 2. TOTALES FINANCIEROS (Lectura directa blindada)
      prev.totalIngresadoSheet = datosCloud.totalIngresadoSheet !== undefined ? Number(datosCloud.totalIngresadoSheet) || 0 : (Number(datosCloud.totalIngresado) || 0);
      prev.efectivoSheet = datosCloud.efectivoSheet !== undefined ? Number(datosCloud.efectivoSheet) || 0 : (Number(datosCloud.efectivo) || 0);
      prev.transferenciaSheet = datosCloud.transferenciaSheet !== undefined ? Number(datosCloud.transferenciaSheet) || 0 : (Number(datosCloud.transferencia) || 0);
      prev.paraProfetaSheet = datosCloud.paraProfetaSheet !== undefined ? Number(datosCloud.paraProfetaSheet) || 0 : (Number(datosCloud.paraProfeta) || 0);

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
      if (datosCloud.usuarios && typeof datosCloud.usuarios === "object") {
        Object.entries(datosCloud.usuarios).forEach(([nombre, datos]) => {
          if (!prev.usuarios[nombre]) {
            prev.usuarios[nombre] = { stock: {}, stockSinEtiqueta: {}, ventas: [] };
          }
          
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
                   : parsearFechaFlexible(venta.fecha),
                vendedor: venta.vendedor || nombre,
               cobradoReal: Number(venta.cobradoReal) || 0,
                barriles: venta.barriles || [],
                servicios: venta.servicios || [],
                costosAsociados: venta.costosAsociados || []
              };
            });
          }
        });
      }

      // 5. SINCRONIZAR CLIENTES
      if (datosCloud.clientes && Array.isArray(datosCloud.clientes) && datosCloud.clientes.length > 0) {
        datosCloud.clientes.forEach(clienteCloud => {
          if (!clienteCloud.nombre || typeof clienteCloud.nombre !== 'string') return;
          const deudaCloud  = Number(clienteCloud.deuda)  || 0;
          const pagadoCloud = Number(clienteCloud.pagado) || 0;
          const saldoReal   = Math.max(0, deudaCloud - pagadoCloud);
          const idx = prev.clientesGlobales.findIndex(c => c.nombre && c.nombre.toLowerCase() === clienteCloud.nombre.toLowerCase());
          if (idx !== -1) {
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



// ===== RESETEO MANUAL DE CACHÉ LOCAL =====
function resetearCacheLocal() {
  const claves = [
    "elProfetaData",
    "ventasPendientes",
    "pagosPendientes",
    "stockPendienteUsuarios",
    "borrarVentasPendientes",
    "barrilesPendientes",
    "barrilesPrestamoPendientes"
  ];

  const pendientes = [];
  claves.forEach((clave) => {
    if (clave === "elProfetaData") return;
    try {
      const raw = localStorage.getItem(clave);
      if (raw) {
        const arr = JSON.parse(raw);
        const cantidad = Array.isArray(arr) ? arr.length : (arr ? 1 : 0);
        if (cantidad > 0) pendientes.push(`• ${clave}: ${cantidad}`);
      }
    } catch (e) {}
  });

  let mensaje;
  if (pendientes.length > 0) {
    mensaje =
      "⚠️ ATENCIÓN: hay datos SIN ENVIAR a la Sheet:\n\n" +
      pendientes.join("\n") +
      "\n\nSi continuás, esos cambios se van a PERDER definitivamente " +
      "(la app va a quedar igual a lo que hay en Google Sheets ahora mismo).\n\n" +
      "¿Seguro que querés borrar el caché local y recargar?";
  } else {
    mensaje =
      "✅ No se detectaron datos pendientes de envío.\n\n" +
      "¿Borrar el caché local y recargar la app desde cero de todas formas?";
  }

  if (!confirm(mensaje)) return;

  claves.forEach((clave) => localStorage.removeItem(clave));
  alert("🧹 Caché local borrado. La página se va a recargar.");
  location.reload();
}

// ===== NUEVAS FUNCIONES DE COLA =====
function encolarMetodoPagoVenta(cliente, metodo, timestamp) {
  try {
    const raw = localStorage.getItem("pagosMetodoPendientes");
    if (raw) pagosMetodoPendientes = JSON.parse(raw);
  } catch(e) {}
  pagosMetodoPendientes.push({ cliente, metodo, timestamp });
  localStorage.setItem("pagosMetodoPendientes", JSON.stringify(pagosMetodoPendientes));
}

async function guardarPagosMetodoPendientesEnSheet() {
  try {
    const raw = localStorage.getItem("pagosMetodoPendientes");
    if (raw) pagosMetodoPendientes = JSON.parse(raw);
  } catch(e) {}
  if (!pagosMetodoPendientes.length) return;
  
  const cola = [...pagosMetodoPendientes];
  pagosMetodoPendientes = [];
  localStorage.removeItem("pagosMetodoPendientes");

  try {
    await fetch(URL_SCRIPT, {
      method: "POST",
      body: JSON.stringify({ accion: "actualizarMetodoPagoVentas", ventas: cola }),
      headers: { "Content-Type": "text/plain" },
      mode: "cors"
    });
  } catch (err) {
    console.error("Error guardando métodos de pago:", err);
    let prev = [];
    try { prev = JSON.parse(localStorage.getItem("pagosMetodoPendientes") || "[]"); } catch(e) {}
    localStorage.setItem("pagosMetodoPendientes", JSON.stringify(prev.concat(cola)));
  }
}

function encolarNuevoCiclo(montoProfeta) {
  cicloPendiente = { profetaInicial: montoProfeta };
  localStorage.setItem("cicloPendiente", JSON.stringify(cicloPendiente));
}

async function guardarCicloPendienteEnSheet() {
  try {
    const raw = localStorage.getItem("cicloPendiente");
    if (raw) cicloPendiente = JSON.parse(raw);
  } catch(e) {}
  if (!cicloPendiente) return;
  
  const data = { ...cicloPendiente };

  try {
    const resp = await fetch(URL_SCRIPT, {
      method: "POST",
      body: JSON.stringify({ accion: "iniciarNuevoCiclo", ...data }),
      headers: { "Content-Type": "text/plain" },
      mode: "cors"
    });
    const texto = await resp.text();
    if (!texto.includes("OK")) {
      throw new Error(texto);
    }
    cicloPendiente = null;
    localStorage.removeItem("cicloPendiente");
  } catch (err) {
    console.error("Error iniciando nuevo ciclo:", err);
    throw err;
  }
}

function registrarAuditoria(accion, usuario, cliente, detalle, monto) {
  // Función vacía para evitar errores
  console.log("📝 Auditoría ignorada:", accion, usuario, cliente);
}


// ============================================================
// FUNCIONES MOVIDAS DESDE ui.js (lógica de negocio, sin manejo de DOM)
// ============================================================

function setState(updater) {
  const estadoClonado = JSON.parse(JSON.stringify(state));
  state = typeof updater === "function" ? updater(estadoClonado) : updater;
  actualizarStockGeneral();
  render();
}

function actualizarStockGeneral() {
  let total = {};
  Object.values(state.usuarios).forEach((u) => {
    Object.entries(u.stock).forEach(([estilo, cant]) => {
      total[estilo] = (total[estilo] || 0) + (Number(cant) || 0);
    });
  });
  state.stockGeneral = total;
}

function calcularPreview() {
  const config = state.configuracion || {};
  const costoConEtiqNormal = Number(config.costoConEtiquetaNormal) || 1850;
  const costoSinEtiqNormal = Number(config.costoSinEtiquetaNormal) || 1510;
  const costoConEtiqLup = Number(config.costoConEtiquetaLupulada) || 1950;
  const costoSinEtiqLup = Number(config.costoSinEtiquetaLupulada) || 1610;
  const estilosLupulados = ["SESSION IPA", "RED IPA"];

  let costoTotalLatas = 0;
  const totalLatas = Object.values(state.ventaActual).reduce((a, b) => a + (Number(b) || 0), 0);
  Object.entries(state.ventaActual).forEach(([estilo, cant]) => {
    const c = Number(cant) || 0;
    if (c > 0) {
      const esLupulada = estilosLupulados.includes(estilo);
      let costoUnitario = state.tipoLata === "sinEtiqueta" ? (esLupulada ? costoSinEtiqLup : costoSinEtiqNormal) : (esLupulada ? costoConEtiqLup : costoConEtiqNormal);
      costoTotalLatas += c * costoUnitario;
    }
  });

  let costoTotalBarriles = 0;
  (state.ventaActualBarriles || []).forEach(b => {
    const litros = parseInt(b.tamano) || 0; 
    const costoLitro = Number(config["costoLitro_" + b.tipo]) || 0;
    costoTotalBarriles += litros * costoLitro;
  });

  let paraProfetaServicios = 0, comisionVendedoresServicios = 0, sumServicios = 0;
  (state.serviciosActuales || []).forEach(s => {
    sumServicios += Number(s.montoTotal) || 0;
    paraProfetaServicios += Number(s.montoProfeta) || 0;
    comisionVendedoresServicios += (Number(s.montoJulian) || 0) + (Number(s.montoMatias) || 0) + (Number(s.montoLucas) || 0);
  });

  let costoAsociadoTotal = 0;
  (state.costosAsociados || []).forEach(c => {
    costoAsociadoTotal += Number(c.monto) || 0;
  });
  const costoTotal = costoTotalLatas + costoTotalBarriles + costoAsociadoTotal;
  const totalCobrado = Number(state.totalCobradoInput) || 0;
  const totalCobradoSinServicios = totalCobrado - sumServicios;
  const gananciaBruta = totalCobradoSinServicios > costoTotal ? totalCobradoSinServicios - costoTotal : 0;
  const comisionLatas = gananciaBruta * 0.5;
  const comision = comisionLatas + comisionVendedoresServicios;
  const paraProfeta = costoTotal + comisionLatas + paraProfetaServicios;
  return { costoTotal, comision, paraProfeta, totalLatas, gananciaBruta, costoTotalBarriles, costoTotalLatas, paraProfetaServicios };
}

function getVentasGenerales() {
  return Object.values(state.usuarios).flatMap((u) => u.ventas);
}

function paraProfetaMostrar(v) {
  const p = Number(v.paraProfeta);
  if (v.paraProfeta !== undefined && v.paraProfeta !== null && v.paraProfeta !== "" && !isNaN(p)) return p;
  const c = Number(v.costoTotal !== undefined ? v.costoTotal : v.costo) || 0;
  const com = Number(v.comision) || 0;
  return c + com;
}

function ventaApareceEnHistorialGlobal(v) {
  const pagada = String(v.estado || "").toUpperCase() === "COBRADO" || (v.metodoPago && v.metodoPago !== "");
  if (pagada) return true;
  
  // Si no está pagada, verificamos si tiene pagos parciales
  const norm = (s) => String(s || "").toLowerCase().trim();
  const cliente = state.clientesGlobales.find(c => norm(c.nombre) === norm(v.cliente));
  if (cliente && Number(cliente.deuda) > 0) {
    const ratio = Number(cliente.pagado) / Number(cliente.deuda);
    if (ratio > 0 && ratio < 1) return true; // Pago parcial
  }
  return false;
}

function marcaVentasLocalesCobradasSiSaldado(nombreCliente, metodo) {
  const norm = (s) => String(s || "").toLowerCase().trim();
  const n = norm(nombreCliente);
  Object.values(state.usuarios).forEach((u) => {
    u.ventas.forEach((v) => {
      if (norm(v.cliente) !== n) return;
      const sinCobrar = v.estado === "PENDIENTE" || !v.metodoPago || v.metodoPago === "";
      if (!sinCobrar) return;
      v.metodoPago = metodo;
      v.estado = "COBRADO";
      v.cobradoReal = Number(v.totalCobrado) || 0;
      if (typeof encolarMetodoPagoVenta === 'function') {
        encolarMetodoPagoVenta(v.cliente, metodo, v.timestamp);
      }
    });
  });
}

function modificarStockDirecto(usuario, estilo, valor, tipo = 'conEtiqueta') {
  const cantidadNueva = Number(valor) || 0;
  const usuarioObj = state.usuarios[usuario];
  const cantidadAnterior = tipo === 'sinEtiqueta'
    ? (usuarioObj.stockSinEtiqueta?.[estilo] || 0)
    : (usuarioObj.stock[estilo] || 0);
  
  if (tipo === 'sinEtiqueta') {
    if (!usuarioObj.stockSinEtiqueta) usuarioObj.stockSinEtiqueta = {};
    usuarioObj.stockSinEtiqueta[estilo] = cantidadNueva;
  } else {
    usuarioObj.stock[estilo] = cantidadNueva;
  }
  registrarCargaStock(usuario, estilo, cantidadNueva - cantidadAnterior, tipo);
  encolarActualizarStockEnSheet(usuario);
  render();
}

async function borrarVentaIndividual(index) {
  if (!confirm("¿Borrar esta venta? Se devolverá el stock y los barriles automáticamente.")) return;
  const venta = state.usuarios[state.usuarioActivo].ventas[index];
  if (!venta) return;

  setState(prev => {
    const usuario = prev.usuarios[prev.usuarioActivo];
    
    // 1. Devolver Latas al stock
    Object.entries(venta.estilos || {}).forEach(([estilo, cant]) => {
      const c = Number(cant) || 0;
      if (c > 0) {
        if (venta.tipoLata === 'sinEtiqueta') {
          if (!usuario.stockSinEtiqueta) usuario.stockSinEtiqueta = {};
          usuario.stockSinEtiqueta[estilo] = (usuario.stockSinEtiqueta[estilo] || 0) + c;
        } else {
          usuario.stock[estilo] = (usuario.stock[estilo] || 0) + c;
        }
      }
    });

    // 2. Devolver Barriles a la cola de pendientes y al estado local
    if (venta.barriles && venta.barriles.length > 0) {
      let barrilesPendientes = [];
      try { barrilesPendientes = JSON.parse(localStorage.getItem("barrilesPendientes") || "[]"); } catch(e) {}
      
      venta.barriles.forEach(b => {
        // Lo mandamos a la cola para que vuelva a "disponible" en Google Sheets cuando guardes
        barrilesPendientes.push({
          id: b.id,
          cliente: "",
          tipo: b.tipo,
          tamano: b.tamano,
          serie: b.serie || "",
          deposito: 0,
          observaciones: "Devuelto por borrado de venta",
          estado: "disponible",
          fechaPrestamo: "",
          fechaDevolucion: new Date().toLocaleString("es-AR"),
          timestamp: Date.now()
        });
        // Lo volvemos a agregar a la lista de disponibles en la pantalla para que lo veas ya
        if (!prev.barrilesDisponibles.some(bd => String(bd.id) === String(b.id))) {
          prev.barrilesDisponibles.push({ id: b.id, tipo: b.tipo, tamano: b.tamano, serie: b.serie });
        }
      });
      localStorage.setItem("barrilesPendientes", JSON.stringify(barrilesPendientes));
    }

    // 3. Descontar deuda al cliente
    const nombreCliente = String(venta.cliente || "").toLowerCase().trim();
    const idxCliente = prev.clientesGlobales.findIndex(c =>
      String(c.nombre || "").toLowerCase().trim() === nombreCliente
    );
    if (idxCliente !== -1) {
      const monto = Number(venta.totalCobrado) || 0;
      prev.clientesGlobales[idxCliente].deuda = Math.max(0, (prev.clientesGlobales[idxCliente].deuda || 0) - monto);
      if (prev.clientesGlobales[idxCliente].deuda === 0) {
        prev.clientesGlobales[idxCliente].pagado = 0;
      }
    }

    // 4. Borrar la venta del historial local
    prev.usuarios[prev.usuarioActivo].ventas.splice(index, 1);
    return prev;
  });

  // 5. Encolar cambios para Google Sheets
  encolarBorrarVentaEnSheet({
    vendedor: venta.vendedor || state.usuarioActivo,
    fecha: venta.fecha,
    cliente: venta.cliente,
    estilos: venta.estilos,
    tipoLata: venta.tipoLata || "conEtiqueta",
    totalCobrado: venta.totalCobrado || 0,
  });
  encolarActualizarStockEnSheet(state.usuarioActivo);
}

function encolarPrestamoBarrilDesdeVenta(barril, cliente) {
  let cola = [];
  try {
    cola = JSON.parse(localStorage.getItem("barrilesPrestamoPendientes") || "[]");
  } catch (e) {}
  cola.push({
    barril: {
      id: barril.id,
      cliente: cliente || "Consumidor Final",
      tipo: barril.tipo,
      tamano: barril.tamano,
      serie: barril.serie || "",
      deposito: 0,
      observaciones: `Vendido en venta a ${cliente || "Consumidor Final"} - $${(barril.precioVenta||0).toLocaleString('es-AR')}`,
      estado: "prestado",
      fechaPrestamo: new Date().toLocaleString("es-AR"),
      fechaDevolucion: "",
      timestamp: Date.now()
    },
    movimiento: {
      fecha: new Date().toLocaleString("es-AR"),
      accion: "PRÉSTAMO (Venta)",
      cliente: cliente || "Consumidor Final",
      tipo: barril.tipo,
      tamano: barril.tamano,
      serie: barril.serie || "",
      deposito: 0,
      observaciones: `Precio venta: $${(barril.precioVenta||0).toLocaleString('es-AR')}`
    }
  });
  localStorage.setItem("barrilesPrestamoPendientes", JSON.stringify(cola));
}

async function guardarBarrilesPrestamoPendientesEnSheet() {
  let cola = [];
  try {
    cola = JSON.parse(localStorage.getItem("barrilesPrestamoPendientes") || "[]");
  } catch (e) {}
  if (!cola.length) return;
  localStorage.removeItem("barrilesPrestamoPendientes");
  const fallidos = [];
  for (const item of cola) {
    try {
      await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify({ accion: "actualizarBarril", barril: item.barril }),
        headers: { "Content-Type": "text/plain" },
        mode: "cors"
      });
      await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify({ accion: "registrarMovimientoBarril", movimiento: item.movimiento }),
        headers: { "Content-Type": "text/plain" },
        mode: "cors"
      });
    } catch (err) {
      console.error("Error prestando barril desde venta:", err);
      fallidos.push(item);
    }
  }
  if (fallidos.length) {
    let prev = [];
    try { prev = JSON.parse(localStorage.getItem("barrilesPrestamoPendientes") || "[]"); } catch (e2) {}
    localStorage.setItem("barrilesPrestamoPendientes", JSON.stringify(prev.concat(fallidos)));
  }
}

function normalizarMetodoPago(metodoRaw) {
  const s = String(metodoRaw || "").toLowerCase().trim();
  return s === "transferencia" ? "transferencia" : "efectivo";
}

function aplicarCobroCartera(index, montoPropuesto, metodoRaw) {
  const metodo = normalizarMetodoPago(metodoRaw);
  const cliente = state.clientesGlobales[index];
  if (!cliente) return;
  const deudaAntes = cliente.deuda - cliente.pagado;
  if (deudaAntes <= 0) {
    alert(`✅ ${cliente.nombre} no tiene deuda pendiente.`);
    return;
  }
  const monto = Math.min(Math.max(0, Number(montoPropuesto) || 0), deudaAntes);
  if (monto <= 0) return;

  cliente.pagado += monto;
  if (!cliente.pagos) cliente.pagos = [];
  cliente.pagos.push({ monto: monto, metodo: metodo, fecha: new Date().toLocaleString("es-AR"), _pendiente: true });

  const deudaRestante = Math.max(0, cliente.deuda - cliente.pagado);
  if (deudaRestante < 1) {
    marcaVentasLocalesCobradasSiSaldado(cliente.nombre, metodo);
  }
  encolarPagoParaSheet(cliente.nombre, monto, metodo);
  // registrarAuditoria("COBRO", state.usuarioActivo, cliente.nombre, metodo, monto);
  
  const metodoTexto = metodo === "efectivo" ? "💵 Efectivo" : "🏦 Transferencia";
  alert(`✅ Registrado cobro $${monto.toLocaleString('es-AR')} de ${cliente.nombre} (${metodoTexto}).\nPara grabar ventas y cobros en Google Sheets usá «Guardar en Sheet».`);
  
  guardarDatos();
  render();
}

function registrarPagoCliente(index, metodo, porcentaje) {
  const cliente = state.clientesGlobales[index];
  if (!cliente) return;
  const deudaActual = cliente.deuda - cliente.pagado;
  if (deudaActual <= 0) {
    alert(`✅ ${cliente.nombre} no tiene deuda pendiente.`);
    return;
  }
  const monto = porcentaje === "100" ? deudaActual : deudaActual * 0.5;
  aplicarCobroCartera(index, monto, metodo);
}

function registrarCargaStock(usuario, estilos, tipo) {
  const fecha = new Date().toLocaleString('es-AR');
  if (typeof estilos === 'string') return; 
  const entrada = { usuario, estilos, tipo, fecha };
  state.historialStock.push(entrada);
  
  fetch(URL_SCRIPT, {
    method: "POST",
    body: JSON.stringify({ accion: "guardarHistorialStock", entrada }),
    headers: { "Content-Type": "text/plain" },
    mode: "cors"
  }).catch(err => console.error("Error guardando historial stock:", err));
}

function registrarTransferenciaHistorial(desde, hacia, estilos, tipo) {
  state.historialTransferencias.push({
    desde,
    hacia,
    estilos,
    tipo,
    fecha: new Date().toLocaleString('es-AR')
  });
}

function guardarDatos() {
  const data = { usuarios: state.usuarios, clientes: state.clientesGlobales };
  localStorage.setItem("elProfetaData", JSON.stringify(data));
}

function cargarDatos() {
  const dataRaw = localStorage.getItem("elProfetaData");
  if (dataRaw) {
    const data = JSON.parse(dataRaw);
    state.usuarios = data.usuarios || state.usuarios;
    state.clientesGlobales = data.clientes || [];
    actualizarStockGeneral();
  }
}

function render() {
  renderStockGeneral();
  renderVentasGeneral();
  renderClientesGlobales();
  renderTransferencia();
  renderUsuarios();
  renderPanelUsuario();
}

function getEstadisticasVentas() {
  const ventas = getVentasGenerales();
  const cicloCorte = state.cicloFechaCorte || 0;
  const totalesPorEstilo = {};
  let granTotalLatas = 0;
  ventas.forEach(v => {
    if (cicloCorte > 0 && (v.timestamp || 0) < cicloCorte) return;
    Object.entries(v.estilos || {}).forEach(([estilo, cant]) => {
      const c = Number(cant) || 0;
      if (c > 0) {
        totalesPorEstilo[estilo] = (totalesPorEstilo[estilo] || 0) + c;
        granTotalLatas += c;
      }
    });
  });
  return { totalesPorEstilo, granTotalLatas };
}

function borrarDeudaCliente(idx) {
  const cliente = state.clientesGlobales[idx];
  if (!cliente) return;
  
  if (!confirm(`⚠️ ¿Borrar toda la deuda de ${cliente.nombre}?\nSe devolverá el stock y se precargará el formulario.`)) return;

  let ventasCliente = [];
  Object.entries(state.usuarios).forEach(([nombreUsuario, u]) => {
    u.ventas.forEach((v, i) => {
      if (String(v.cliente || "").toLowerCase().trim() === String(cliente.nombre || "").toLowerCase().trim()) {
        if (v.estado === "PENDIENTE" || !v.metodoPago || v.metodoPago === "") {
          ventasCliente.push({ venta: v, usuario: nombreUsuario, index: i });
        }
      }
    });
  });

  setState(prev => {
    ventasCliente.forEach(({ venta, usuario }) => {
      const u = prev.usuarios[usuario];
      Object.entries(venta.estilos || {}).forEach(([estilo, cant]) => {
        const c = Number(cant) || 0;
        if (c <= 0) return;
        if (venta.tipoLata === 'sinEtiqueta') {
          if (!u.stockSinEtiqueta) u.stockSinEtiqueta = {};
          u.stockSinEtiqueta[estilo] = (u.stockSinEtiqueta[estilo] || 0) + c;
        } else {
          u.stock[estilo] = (u.stock[estilo] || 0) + c;
        }
      });
    });

    prev.clientesGlobales[idx].deuda = 0;
    prev.clientesGlobales[idx].pagado = 0;
    prev.clientesGlobales[idx].pagos = [];

    Object.keys(prev.usuarios).forEach(nombreUsuario => {
      prev.usuarios[nombreUsuario].ventas = prev.usuarios[nombreUsuario].ventas.filter(v => {
        const esEsteCliente = String(v.cliente || "").toLowerCase().trim() === String(cliente.nombre || "").toLowerCase().trim();
        const esPendiente = v.estado === "PENDIENTE" || !v.metodoPago || v.metodoPago === "";
        return !(esEsteCliente && esPendiente);
      });
    });

    return prev;
  });

  if (ventasCliente.length > 0) {
    const ultima = ventasCliente[ventasCliente.length - 1].venta;
    state.usuarioActivo = ventasCliente[ventasCliente.length - 1].usuario;
    state.clienteNombre = cliente.nombre;
    state.ventaActual = { ...ultima.estilos };
    state.tipoLata = ultima.tipoLata || 'conEtiqueta';
    state.alquilerBarril = ultima.alquilerBarril || "";
    state.totalCobradoInput = String(ultima.totalCobrado || "");
  }

  Object.keys(state.usuarios).forEach(u => encolarActualizarStockEnSheet(u));

  fetch(URL_SCRIPT, {
    method: "POST",
    body: JSON.stringify({ accion: "borrarDeudaCliente", cliente: cliente.nombre }),
    headers: { "Content-Type": "text/plain" },
    mode: "cors"
  }).catch(err => console.error("Error borrando deuda en Sheet:", err));

  guardarDatos();
  render();
  alert(`✅ Deuda de ${cliente.nombre} borrada. Stock devuelto. Formulario precargado.`);
}

function renderDesgloseMayorista() {
  const config = state.configuracion || {};
  const estilosLupulados = ["SESSION IPA", "RED IPA"];
  const precioLup = Number(config.precioMayoristaLupulada) || 2500;
  const precioNorm = Number(config.precioMayoristaNormal) || 2400;
  let filas = "";
  Object.entries(state.ventaActual).forEach(([estilo, cant]) => {
    const c = Number(cant) || 0;
    if (c > 0) {
      const precio = estilosLupulados.includes(estilo) ? precioLup : precioNorm;
      const subtotal = c * precio;
      filas += `<div style="display:flex; justify-content:space-between; padding:3px 0; font-size:0.85em; color:#cbd5e1;">
        <span>${estilo} (${c} x $${precio.toLocaleString('es-AR')})</span>
        <span>$${subtotal.toLocaleString('es-AR')}</span>
      </div>`;
    }
  });
  return `
    <div style="background:#0f172a; border-radius:8px; padding:10px; margin-bottom:8px;">
      <div style="color:#94a3b8; font-size:0.8em; margin-bottom:6px;">📋 Detalle Mayorista (precio por estilo):</div>
      ${filas || '<div style="color:#64748b; font-size:0.85em;">Cargá cantidades para ver el detalle</div>'}
    </div>
  `;
}

function calcularPrecioSegunModo(prev) {
  if (!prev.modoPrecioActivo) return;
  const config = prev.configuracion || {};
  const estilosLupulados = ["SESSION IPA", "RED IPA"];

  if (prev.modoPrecioActivo === 'mayorista') {
    const precioLup = Number(config.precioMayoristaLupulada) || 2500;
    const precioNorm = Number(config.precioMayoristaNormal) || 2400;
    let total = 0, totalLatas = 0;
    Object.entries(prev.ventaActual).forEach(([estilo, cant]) => {
      const c = Number(cant) || 0;
      if (c > 0) {
        total += c * (estilosLupulados.includes(estilo) ? precioLup : precioNorm);
        totalLatas += c;
      }
    });
    prev.precioUnitario = totalLatas > 0 ? String(Math.round(total / totalLatas)) : "";
    prev.totalCobradoInput = totalLatas > 0 ? String(total) : "";
  } else {
    let precio = 0;
    if (prev.modoPrecioActivo === 'six') precio = Number(config.precioSixPack) || 3250;
    else if (prev.modoPrecioActivo === 'doce') precio = Number(config.precioDocePack) || 3000;
    else if (prev.modoPrecioActivo === 'minorista') precio = Number(config.precioMinorista) || 3500;
    const totalLatas = Object.values(prev.ventaActual).reduce((a, b) => a + (Number(b) || 0), 0);
    prev.precioUnitario = String(precio);
    prev.totalCobradoInput = totalLatas > 0 ? String(totalLatas * precio) : "";
  }
}

function setPrecioVenta(tipo) {
  setState(prev => {
    prev.modoPrecioActivo = tipo;
    calcularPrecioSegunModo(prev);
    return prev;
  });
}

function quitarServicio(index) {
  if (!state.serviciosActuales) return;
  const servicio = state.serviciosActuales[index];
  if (servicio) {
    const totalActual = Number(state.totalCobradoInput) || 0;
    state.totalCobradoInput = String(Math.max(0, totalActual - (servicio.montoTotal || 0)));
  }
  state.serviciosActuales.splice(index, 1);
  render();
}

function quitarBarrilDeVenta(index) {
  if (!state.ventaActualBarriles) return;
  const barril = state.ventaActualBarriles[index];
  if (barril) {
    const totalActual = Number(state.totalCobradoInput) || 0;
    state.totalCobradoInput = String(Math.max(0, totalActual - (barril.precioVenta || 0)));
  }
  state.ventaActualBarriles.splice(index, 1);
  render();
}

function iniciarNuevoCicloUI() {
  const montoStr = prompt("¿Cuál es el saldo de 'Para El Profeta' del ciclo anterior?\n(Ingresá solo números, ej: 50000)", "0");
  if (montoStr === null) return;
  const monto = Number(montoStr) || 0;
  
  if (typeof encolarNuevoCiclo === 'function') {
    encolarNuevoCiclo(monto);
  }
  
  // Actualizamos el estado visualmente, pero NO toca la BD hasta "Guardar en Sheet"
  state.cicloFechaCorte = Date.now();
  state.profetaInicialCiclo = monto;
  state.efectivoSheet = 0;
  state.transferenciaSheet = 0;
  state.popularidadSheet = {};
  state.popularidad = {};
  state.totalIngresadoSheet = 0;
  state.paraProfetaSheet = monto;
  
  render();
  alert("✅ Ciclo iniciado localmente.\nLos contadores están en 0 y el historial viejo aparece opaco.\n\nAcordate de apretar '💾 Guardar en Sheet' para que el backup y el corte queden en la base de datos.");
}