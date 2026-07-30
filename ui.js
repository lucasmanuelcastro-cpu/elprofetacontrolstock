/**
 * UI.JS - Control de la interfaz visual - Versión Final v40
 * + Alquiler de Barril + Formato de Miles (es-AR)
 * + Precios dinámicos desde Sheets + Barriles en venta
 */

// ===== CONSTANTES Y ESTADO GLOBAL =====
const estilosBase = ["BLONDE", "IRISH RED", "STOUT", "SESSION IPA", "RED IPA", "HONEY"];

let state = {
  usuarios: {
    Julian: { stock: {}, stockSinEtiqueta: {}, ventas: [] },
    Matias: { stock: {}, stockSinEtiqueta: {}, ventas: [] },
    Lucas: { stock: {}, stockSinEtiqueta: {}, ventas: [] },
  },
  clientesGlobales: [],
  stockGeneral: {},
  popularidadSheet: {},
  usuarioActivo: "Julian",
  ventaActual: { BLONDE: "", "IRISH RED": "", STOUT: "", "SESSION IPA": "", "RED IPA": "", HONEY: "" },
  ventaActualBarriles: [],
  configuracion: {},
  barrilesDisponibles: [],
  metodoPago: "efectivo",
  clienteNombre: "",
  totalCobradoInput: "",
  alquilerBarril: "",
  tipoLata: "conEtiqueta",
  precioUnitario: "",
  transferDesde: "Julian",
  transferHacia: "Matias",
  transferEstilo: "BLONDE",
  transferCantidad: 0,
  historialStock: [],
  historialTransferencias: [],
  totalIngresadoSheet: null,
  efectivoSheet: null,
  transferenciaSheet: null,
  paraProfetaSheet: null
};

// ===== UTILIDADES =====
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
      let costoUnitario = 0;
      if (state.tipoLata === "sinEtiqueta") {
        costoUnitario = esLupulada ? costoSinEtiqLup : costoSinEtiqNormal;
      } else {
        costoUnitario = esLupulada ? costoConEtiqLup : costoConEtiqNormal;
      }
      costoTotalLatas += c * costoUnitario;
    }
  });

  let costoTotalBarriles = 0;
  (state.ventaActualBarriles || []).forEach(b => {
    const litros = parseInt(b.tamano) || 0; 
    const costoLitro = Number(config["costoLitro_" + b.tipo]) || 0;
    costoTotalBarriles += litros * costoLitro;
  });

  const costoTotal = costoTotalLatas + costoTotalBarriles;
  const totalCobrado = Number(state.totalCobradoInput) || 0;
  const gananciaBruta = totalCobrado > costoTotal ? totalCobrado - costoTotal : 0;
  const comision = gananciaBruta * 0.5;
  
  return { costoTotal, comision, paraProfeta: costoTotal + comision, totalLatas, gananciaBruta, costoTotalBarriles, costoTotalLatas };
}

function getVentasGenerales() {
  return Object.values(state.usuarios).flatMap((u) => u.ventas);
}

function paraProfetaMostrar(v) {
  const p = Number(v.paraProfeta);
  if (!isNaN(p) && p > 0) return p;
  const c = Number(v.costoTotal !== undefined ? v.costoTotal : v.costo) || 0;
  const com = Number(v.comision) || 0;
  return c + com;
}

function ventaApareceEnHistorialGlobal(v) {
  return String(v.estado || "").toUpperCase() === "COBRADO" || (v.metodoPago && v.metodoPago !== "");
}

function getEstadisticasVentas() {
  const ventas = getVentasGenerales();
  const totalesPorEstilo = {};
  let granTotalLatas = 0;
  ventas.forEach(v => {
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
    });
  });
}

function registrarVentaLocal() {
  const cliente = (state.clienteNombre || "").trim();
  
  if (!cliente || cliente === "Consumidor Final") {
    alert("⚠️ Debes ingresar el nombre del cliente.\n\nNo se puede registrar como 'Consumidor Final' automáticamente.");
    const inputCliente = document.getElementById("cliente-nombre");
    if (inputCliente) inputCliente.focus();
    return;
  }

  const totalLatas = Object.values(state.ventaActual).reduce((a, b) => a + (Number(b) || 0), 0);
  const hayAlquiler = (state.alquilerBarril || "").trim() !== "";
  const hayBarriles = (state.ventaActualBarriles || []).length > 0;

  if (totalLatas === 0 && !hayAlquiler && !hayBarriles) {
    alert("Cargá al menos 1 lata, un barril o el alquiler de barril");
    return;
  }

  const preview = calcularPreview();
  const totalCobrado = Number(state.totalCobradoInput) || 0;

  const venta = {
    cliente: cliente,
    estilos: {...state.ventaActual},
    alquilerBarril: state.alquilerBarril || "",
    barriles: state.ventaActualBarriles || [],
    tipoLata: state.tipoLata,
    estado: "PENDIENTE",
    metodoPago: "",
    totalCobrado: totalCobrado,
    costoTotal: preview.costoTotal,
    comision: preview.comision,
    paraProfeta: preview.paraProfeta,
    fecha: new Date().toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit', year:'numeric'}) + ' ' + new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}),
    timestamp: Date.now(),
    vendedor: state.usuarioActivo
  };

  state.usuarios[state.usuarioActivo].ventas.push(venta);

  if (totalLatas > 0) {
    Object.entries(state.ventaActual).forEach(([estilo, cant]) => {
      const c = Number(cant) || 0;
      if (c > 0) {
        const usuario = state.usuarios[state.usuarioActivo];
        if (state.tipoLata === 'sinEtiqueta') {
          if (!usuario.stockSinEtiqueta) usuario.stockSinEtiqueta = {};
          usuario.stockSinEtiqueta[estilo] = (usuario.stockSinEtiqueta[estilo] || 0) - c;
        } else {
          usuario.stock[estilo] = (usuario.stock[estilo] || 0) - c;
        }
      }
    });
  }

  let clienteObj = state.clientesGlobales.find(c => c.nombre === cliente);
  if (!clienteObj) {
    clienteObj = { nombre: cliente, deuda: 0, pagado: 0, pagos: [], timestamp: Date.now() };
    state.clientesGlobales.push(clienteObj);
  }
  clienteObj.deuda += totalCobrado;

  const ventaParaSheet = { ...venta, paraProfeta: preview.paraProfeta, totalLatas: totalLatas };
  ventasPendientes.push(ventaParaSheet);
  localStorage.setItem("ventasPendientes", JSON.stringify(ventasPendientes));

  state.ventaActual = { BLONDE: "", "IRISH RED": "", STOUT: "", "SESSION IPA": "", "RED IPA": "", HONEY: "" };
  state.ventaActualBarriles = [];
  state.clienteNombre = "";
  state.alquilerBarril = "";
  state.totalCobradoInput = "";
  state.precioUnitario = "";

  registrarAuditoria("VENTA", state.usuarioActivo, cliente,
    Object.entries(venta.estilos || {}).filter(([,c]) => Number(c) > 0).map(([e,c]) => `${c} ${e}`).join(', '),
    totalCobrado);
  alert(`✅ Venta registrada correctamente para ${cliente}`);
  render();
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
  if (!confirm("¿Borrar esta venta? Se devolverá el stock automáticamente.")) return;
  const venta = state.usuarios[state.usuarioActivo].ventas[index];
  if (!venta) return;

  setState(prev => {
    const usuario = prev.usuarios[prev.usuarioActivo];
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

    prev.usuarios[prev.usuarioActivo].ventas.splice(index, 1);
    return prev;
  });

  encolarBorrarVentaEnSheet({
    vendedor: venta.vendedor || state.usuarioActivo,
    fecha: venta.fecha,
    cliente: venta.cliente,
    estilos: venta.estilos,
    tipoLata: venta.tipoLata || "conEtiqueta",
    totalCobrado: venta.totalCobrado || 0,
  });
  encolarActualizarStockEnSheet(state.usuarioActivo);
  registrarAuditoria("BORRADO", state.usuarioActivo, venta.cliente,
    Object.entries(venta.estilos || {}).filter(([,c]) => Number(c) > 0).map(([e,c]) => `${c} ${e}`).join(', '),
    venta.totalCobrado || 0);
  guardarDatos();
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
  registrarAuditoria("COBRO", state.usuarioActivo, cliente.nombre, metodo, monto);
  
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

function registrarPagoManual(index) {
  const inputEl = document.getElementById(`pago-manual-${index}`);
  const metodoEl = document.getElementById(`pago-metodo-${index}`);
  if (!inputEl || !metodoEl) return;
  
  const montoIngresado = Number(inputEl.value);
  const metodo = metodoEl.value;
  if (!montoIngresado || montoIngresado <= 0) {
    alert("⚠️ Ingresá un monto válido mayor a 0");
    return;
  }
  const cliente = state.clientesGlobales[index];
  if (!cliente) return;
  const deudaActual = cliente.deuda - cliente.pagado;
  if (montoIngresado > deudaActual) {
    alert(`⚠️ El monto ($${montoIngresado.toLocaleString('es-AR')}) supera la deuda ($${deudaActual.toLocaleString('es-AR')}). Se cobrará solo la deuda.`);
  }
  inputEl.value = "";
  aplicarCobroCartera(index, montoIngresado, metodo);
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

async function guardarEnSheets() {
  let nVentas = 0, nPagos = 0, nStock = 0, nBorrar = 0, nBarriles = 0;
  try { const vRaw = localStorage.getItem("ventasPendientes"); if (vRaw) nVentas = JSON.parse(vRaw).length; } catch (e) {}
  try { const pRaw = localStorage.getItem("pagosPendientes"); if (pRaw) nPagos = JSON.parse(pRaw).length; } catch (e) {}
  try { const sRaw = localStorage.getItem("stockPendienteUsuarios"); if (sRaw) nStock = JSON.parse(sRaw).length; } catch (e) {}
  try { const bRaw = localStorage.getItem("borrarVentasPendientes"); if (bRaw) nBorrar = JSON.parse(bRaw).length; } catch (e) {}
  try { const blRaw = localStorage.getItem("barrilesPendientes"); if (blRaw) nBarriles = JSON.parse(blRaw).length; } catch (e) {}

  if (nVentas === 0 && nPagos === 0 && nStock === 0 && nBorrar === 0 && nBarriles === 0) {
    alert("No hay nada pendiente de enviar al Sheet.");
    return;
  }

  try {
    await guardarVentasPendientesEnSheet();
    await guardarPagosPendientesEnSheet();
    await guardarBorrarVentasPendienteEnSheet();
    await guardarStockPendienteEnSheet();
    await guardarBarrilesPendientesEnSheet(); 
    await cargarDatosDesdeSheet();
    alert("✅ Todo pendiente se envió a Google Sheets.");
  } catch (err) {
    alert("❌ Error al guardar: " + err.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  cargarDatos();
  render();
  try {
    await cargarDatosDesdeSheet();
    await cargarClientesHistoricos();
    render();
  } catch(e) {
    console.warn("No se pudo sincronizar con Sheets al inicio:", e);
  }
});

function render() {
  renderStockGeneral();
  renderVentasGeneral();
  renderClientesGlobales();
  renderTransferencia();
  renderUsuarios();
  renderPanelUsuario();
}

function renderStockGeneral() {
  const container = document.getElementById("stock-general-section");
  if (!container) return;
  const stats = getEstadisticasVentas();
  
  // Muestra las ventas locales si existen en la sesión, o la popularidad directa que envió Google Sheets
  const popularidadData = stats.granTotalLatas > 0 
    ? stats.totalesPorEstilo 
    : (state.popularidadSheet || {});

  const tienePop = Object.keys(popularidadData).length > 0;

  container.innerHTML = `
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
  <div class="card">
    <div class="flex space-between">
      <h2>Stock General (Disponible)</h2>
      <button onclick="mostrarHistorialStock()" style="background:#7c3aed; padding:6px 12px; font-size:0.85em;">📜 Historial</button>
    </div>
    <table style="width:100%; border-collapse: collapse; margin-top:10px;">
      <thead><tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
        <th style="padding: 8px 4px; font-size: 0.9em;">Estilo</th>
        <th style="padding: 8px 4px; text-align: center; font-size: 0.9em; color: #3b82f6;">Con Etiq</th>
        <th style="padding: 8px 4px; text-align: center; font-size: 0.9em; color: #6b7280;">Sin Etiq</th>
        <th style="padding: 8px 4px; text-align: center; font-size: 0.9em;">Total</th>
      </tr></thead>
      <tbody>
 ${estilosBase.map(e => {
  const conEtiq = Object.values(state.usuarios).reduce((sum, u) => sum + (u.stock[e] || 0), 0);
  const sinEtiq = Object.values(state.usuarios).reduce((sum, u) => sum + ((u.stockSinEtiqueta && u.stockSinEtiqueta[e]) || 0), 0);
  const total = conEtiq + sinEtiq;
  return `
  <tr style="border-bottom: 1px solid #f3f4f6;">
    <td style="padding: 6px 4px; font-weight: 500;">${e}</td>
    <td style="padding: 6px 4px; text-align: center;">${conEtiq}</td>
    <td style="padding: 6px 4px; text-align: center;">${sinEtiq}</td>
    <td style="padding: 6px 4px; text-align: center; font-weight: bold; color: ${total < 0? '#ef4444' : '#1f2937'};">${total}</td>
  </tr>`;
 }).join("")}
      </tbody>
      <tfoot><tr style="border-top: 2px solid #3b82f6; background: #eff6ff;">
        <td style="padding: 8px 4px; font-weight: bold;">TOTAL</td>
        <td style="padding: 8px 4px; text-align: center; font-weight: bold; color: #3b82f6;">
 ${estilosBase.reduce((sum, e) => sum + Object.values(state.usuarios).reduce((s, u) => s + (u.stock[e] || 0), 0), 0)}
        </td>
        <td style="padding: 8px 4px; text-align: center; font-weight: bold; color: #6b7280;">
 ${estilosBase.reduce((sum, e) => sum + Object.values(state.usuarios).reduce((s, u) => s + ((u.stockSinEtiqueta && u.stockSinEtiqueta[e]) || 0), 0), 0)}
        </td>
        <td style="padding: 8px 4px; text-align: center; font-weight: bold; color: #1e40af;">
 ${estilosBase.reduce((sum, e) => sum + Object.values(state.usuarios).reduce((s, u) => s + (u.stock[e] || 0) + ((u.stockSinEtiqueta && u.stockSinEtiqueta[e]) || 0), 0), 0)}
        </td>
      </tr></tfoot>
    </table>
  </div>
  <div class="card" style="background: #f8fafc; border: 1px solid #e2e8f0;">
    <h2>Popularidad (% Ventas)</h2>
 ${(() => {
  if (!tienePop) return '<p style="color:gray; font-size: 0.9em;">Esperando primeras ventas...</p>';
  
  const totalBase = stats.granTotalLatas > 0 
    ? stats.granTotalLatas 
    : Object.values(popularidadData).reduce((a, b) => a + (Number(b) || 0), 0);

  return Object.entries(popularidadData).sort((a, b) => b[1] - a[1]).map(([estilo, cant]) => {
    const val = Number(cant) || 0;
    const porcentaje = totalBase > 0 ? ((val / totalBase) * 100).toFixed(0) : '0';
    return `
    <div class="flex space-between" style="padding: 4px 0; border-bottom: 1px solid #e2e8f0;">
      <span>${estilo}</span>
      <span style="color:#64748b; font-size:0.85em; margin-right:8px;">${val} latas</span>
      <span style="color: #3b82f6; font-weight: bold;">${porcentaje}%</span>
    </div>`;
  }).join("") + `
  <div style="margin-top: 15px; text-align: right;">
    <small style="color: #64748b;">Total latas vendidas: <b>${totalBase}</b></small>
  </div>`;
 })()}
   </div>
</div>`;
}

function renderVentasGeneral() {
  const container = document.getElementById("ventas-general-section");
  if (!container) return;
  
  const dineroEfectivo = state.efectivoSheet;
  const dineroTransferencia = state.transferenciaSheet;
  const dineroTotal = state.totalIngresadoSheet;
  const totalProfeta = state.paraProfetaSheet;
  
  const todasLasVentas = getVentasGenerales().filter(v => ventaApareceEnHistorialGlobal(v));
  
  container.innerHTML = `
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
    <div class="card" style="border-left: 4px solid #059669;">
      <h2>💵 Dinero Ingresado (Efectivo)</h2>
      <p class="big-number" style="color:#059669;">${dineroEfectivo != null ? '$' + dineroEfectivo.toLocaleString('es-AR') : '—'}</p>
      <small>Ventas cobradas en efectivo (prorrateadas si hay pagos parciales)</small>
    </div>
    <div class="card" style="border-left: 4px solid #2563eb;">
      <h2>🏦 Dinero Ingresado (Transferencia)</h2>
      <p class="big-number" style="color:#2563eb;">${dineroTransferencia != null ? '$' + dineroTransferencia.toLocaleString('es-AR') : '—'}</p>
      <small>Ventas cobradas por transferencia</small>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
    <div class="card" style="border-left: 4px solid #3b82f6;">
      <h2>💰 Total Ingresado</h2>
      <p class="big-number" style="color:#3b82f6;">${dineroTotal != null ? '$' + dineroTotal.toLocaleString('es-AR') : '—'}</p>
      <small>${dineroTotal != null ? '📊 Solo lo cobrado hasta ahora' : 'Sincronizando...'}</small>
    </div>
    <div class="card">
      <h2>👑 Para El Profeta (Total)</h2>
      <p class="big-number" style="color:#059669;">${totalProfeta != null ? '$' + totalProfeta.toLocaleString('es-AR') : '—'}</p>
      <small>Costo + 50% Ganancia generada (prorrateado si hay pagos parciales)</small>
    </div>
  </div>
  <div class="card" style="margin-top: 20px; border-left: 4px solid #7c3aed;">
    <h2>📋 Historial Global (${todasLasVentas.length} ventas cobradas)</h2>
    <p style="color:#64748b; font-size:0.85em; margin:0 0 8px 0;">Solo aparecen acá las ventas 100% saldadas. Sheet: botón «Guardar en Sheet».</p>
    <div style="max-height: 300px; overflow-y: auto; margin-top: 10px;">
    ${todasLasVentas.length === 0
      ? '<p style="color:gray;">No hay ventas cobradas en su totalidad aún.</p>'
      : [...todasLasVentas].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).map(v => {
          const vendedor = v.vendedor || Object.keys(state.usuarios).find(u => state.usuarios[u].ventas.some(vv => vv === v)) || '—';
          const latasHtml = Object.entries(v.estilos || {}).filter(([,c]) => Number(c) > 0).map(([e,c]) => `${c} ${e}`).join(', ');
          const barrilesHtml = (v.barriles && v.barriles.length > 0) 
            ? v.barriles.map(b => `1x Barril ${b.tipo} ${b.tamano}`).join(', ') 
            : '';
          
          return `
          <div style="border-bottom: 1px solid #f3f4f6; padding: 8px 0; font-size: 0.88em;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
              <span><b>👤 ${v.cliente || 'Consumidor Final'}</b>
                <span style="margin-left:8px; background:#ede9fe; color:#7c3aed; border-radius:6px; padding:1px 7px; font-size:0.85em;">
                  ${vendedor}
                </span>
              </span>
              <small style="color:#64748b;">📅 ${v.fecha || ''}</small>
            </div>
            <div style="color:#555; margin: 3px 0;">
              ${latasHtml || ''}
              ${barrilesHtml ? `<span style="color:#7c3aed; font-weight:600; margin-left:6px;">🍺 ${barrilesHtml}</span>` : ''}
              ${latasHtml ? `<b style="color:#1e40af; margin-left:6px;">(${Object.values(v.estilos || {}).reduce((a,b) => a+(Number(b)||0), 0)} latas)</b>` : ''}
              <span style="margin-left:6px; padding:1px 8px; border-radius:10px; font-size:0.82em; font-weight:600; background:${v.tipoLata === 'sinEtiqueta' ? '#dbeafe' : '#fef9c3'}; color:${v.t[...],