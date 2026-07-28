/* UI.JS - Control de la interfaz visual - Versión Final Estable (modificado)
 + Ajustes en agregarBarrilAVenta: prompt por precio/lt prellenado con costo por litro y calculo total
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
    const costoLitro = Number(state.configuracion["costoLitro_" + b.tipo]) || 0;
    costoTotalBarriles += litros * costoLitro;
  });

  const costoTotal = costoTotalLatas + costoTotalBarriles;
  const totalCobrado = Number(state.totalCobradoInput) || 0;
  const gananciaBruta = totalCobrado > costoTotal ? totalCobrado - costoTotal : 0;
  const comision = gananciaBruta * 0.5;
  
  return { costoTotal, comision, paraProfeta: costoTotal + comision, totalLatas, gananciaBruta, costoTotalBarriles };
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
  return (Number(v.totalCobrado) || 0) > 0;
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

// ===== REGISTRAR VENTA LOCAL =====
function registrarVentaLocal() {
  const cliente = (state.clienteNombre || "").trim();
  
  if (!cliente || cliente === "Consumidor Final") {
    alert("⚠️ Debes ingresar el nombre del cliente.\n\nNo se puede registrar como 'Consumidor Final' automáticamente.");
    const inputCliente = document.getElementById("cliente-nombre");
    if (inputCliente) inputCliente.focus();
    return;
  }

  const totalLatas = Object.values(state.ventaActual).reduce((a, b) => a + (Number(b) || 0), 0);
  const hayBarriles = (state.ventaActualBarriles || []).length > 0;

  if (totalLatas === 0 && !hayBarriles) {
    alert("Cargá al menos 1 lata o un barril");
    return;
  }

  const preview = calcularPreview();
  const totalCobrado = Number(state.totalCobradoInput) || 0;

  if (totalCobrado <= 0) {
    alert("⚠️ El total a cobrar no puede ser $0. Cargá un precio o un monto manual.");
    return;
  }

  const barrilesParaGuardar = (state.ventaActualBarriles || []).map(b => ({
    id: b.id,
    serie: b.serie || "",
    tipo: b.tipo || "",
    tamano: b.tamano || "",
    precioTotal: b.precioTotal || 0,
    precioPorLitro: b.precioPorLitro || null
  }));

  const venta = {
    cliente: cliente,
    estilos: {...state.ventaActual},
    barriles: barrilesParaGuardar,
    tipoLata: state.tipoLata,
    estado: "PENDIENTE",
    metodoPago: "",
    totalCobrado: totalCobrado,
    costo: preview.costoTotal,
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

  if (barrilesParaGuardar.length > 0) {
    let barrilesPendientes = [];
    try { barrilesPendientes = JSON.parse(localStorage.getItem("barrilesPendientes") || "[]"); } catch(e) {}
    barrilesParaGuardar.forEach(b => {
      barrilesPendientes.push({
        id: b.id,
        serie: b.serie,
        tipo: b.tipo,
        tamano: b.tamano,
        cliente: cliente,
        estado: "prestado",
        fechaPrestamo: new Date().toLocaleString("es-AR")
      });
    });
    localStorage.setItem("barrilesPendientes", JSON.stringify(barrilesPendientes));
  }

  state.ventaActual = { BLONDE: "", "IRISH RED": "", STOUT: "", "SESSION IPA": "", "RED IPA": "", HONEY: "" };
  state.ventaActualBarriles = [];
  state.clienteNombre = "";
  state.totalCobradoInput = "";
  state.precioUnitario = "";

  registrarAuditoria("VENTA", state.usuarioActivo, cliente,
    Object.entries(venta.estilos || {}).filter(([,c]) => Number(c) > 0).map(([e,c]) => `${c} ${e}`).join(', '),
    totalCobrado);
  alert(`✅ Venta registrada correctamente para ${cliente}`);
  render();
}

// ===== MANEJO DE STOCK =====
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
  registrarCargaStock(usuario, { [estilo]: cantidadNueva - cantidadAnterior }, tipo);
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

  
  },
  "merge: aplicar cambios de branch fix/barril-precio-litro-deudores-delete a main (ui.js)");
