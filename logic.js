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
