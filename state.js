const estilosBase = ["BLONDE", "IRISH RED", "STOUT", "SESSION IPA", "RED IPA", "HONEY"];
const costoPorLata = 1750;
const costoPorLataSinEtiqueta = 1450;

let state = {
  usuarios: {
    Julian: { stock: {}, stockSinEtiqueta: {}, ventas: [], historialAgregarStock: [] },
    Matias: { stock: {}, stockSinEtiqueta: {}, ventas: [], historialAgregarStock: [] },
    Lucas: { stock: {}, stockSinEtiqueta: {}, ventas: [], historialAgregarStock: [] },
  },
  clientesGlobales: [], 
  stockGeneral: {},
  stockGeneralSinEtiqueta: {},
  historialTransferencias: [],
  usuarioActivo: null,
  ventaActual: {},
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
  transferConEtiqueta: true,
};

function setState(updater) {
  state = typeof updater === "function" ? updater(structuredClone(state)) : updater;
  actualizarStockGeneral();
  render();
}

function actualizarStockGeneral() {
  let total = {};
  let totalSinEtiqueta = {};
  Object.values(state.usuarios).forEach((u) => {
    // Stock con etiqueta
    Object.entries(u.stock || {}).forEach(([estilo, cant]) => {
      total[estilo] = (total[estilo] || 0) + (Number(cant) || 0);
    });
    // Stock sin etiqueta
    Object.entries(u.stockSinEtiqueta || {}).forEach(([estilo, cant]) => {
      totalSinEtiqueta[estilo] = (totalSinEtiqueta[estilo] || 0) + (Number(cant) || 0);
    });
  });
  state.stockGeneral = total;
  state.stockGeneralSinEtiqueta = totalSinEtiqueta;
}

function calcularPreview() {
  const totalLatas = Object.values(state.ventaActual).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalCobrado = Number(state.totalCobradoInput) || 0;
  const costo = state.tipoLata === "sinEtiqueta" ? costoPorLataSinEtiqueta : costoPorLata;
  const costoTotal = totalLatas * costo;
  // Comisión solo si hay precio cargado y supera el costo
  const gananciaBruta = totalCobrado > costoTotal ? totalCobrado - costoTotal : 0;
  const comision = gananciaBruta * 0.5;
  return { costoTotal, comision, paraProfeta: costoTotal + comision, totalLatas, gananciaBruta };
}

function getVentasGenerales() {
  return Object.values(state.usuarios).flatMap((u) => u.ventas);
}

function getTotalVentasDinero() {
  return getTotalVentasPorMetodo("efectivo") + getTotalVentasPorMetodo("transferencia");
}

function getTotalVentasPorMetodo(metodo) {
  // Nombres de clientes que tienen deuda registrada
  const nombresDeudores = new Set(
    state.clientesGlobales.map(c => c.nombre.toLowerCase().trim())
  );

  // Ventas cobradas en el momento (no deudores, o "Consumidor Final")
  const ventasAlContado = getVentasGenerales().filter(v =>
    (v.metodoPago || "efectivo") === metodo &&
    (!v.cliente || v.cliente.trim() === "" ||
     v.cliente === "Consumidor Final" ||
     !nombresDeudores.has(v.cliente.toLowerCase().trim()))
  );
  const totalContado = ventasAlContado.reduce((acc, v) => acc + (Number(v.totalCobrado) || 0), 0);

  // Cobros de deuda recibidos con ese método
  const cobrosDeuda = state.clientesGlobales.reduce((acc, c) => {
    const pagos = c.pagos || [];
    return acc + pagos
      .filter(p => (p.metodo || "efectivo") === metodo)
      .reduce((s, p) => s + (Number(p.monto) || 0), 0);
  }, 0);

  return totalContado + cobrosDeuda;
}

function getGananciaTotalProfeta() {
  return getVentasGenerales().reduce((acc, v) => acc + (Number(v.paraProfeta) || 0), 0);
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

function guardarDatos() {
  const data = { usuarios: state.usuarios, clientes: state.clientesGlobales, historialTransferencias: state.historialTransferencias };
  localStorage.setItem("elProfetaData", JSON.stringify(data));
  alert("¡Datos y Cartera de Clientes guardados!");
}

function cargarDatos() {
  const dataRaw = localStorage.getItem("elProfetaData");
  if (dataRaw) {
    const data = JSON.parse(dataRaw);
    state.usuarios = data.usuarios || state.usuarios;
    state.clientesGlobales = data.clientes || [];
    state.historialTransferencias = data.historialTransferencias || [];
    
    // Asegurar que cada usuario tenga las nuevas propiedades
    Object.keys(state.usuarios).forEach(nombre => {
      if (!state.usuarios[nombre].stockSinEtiqueta) {
        state.usuarios[nombre].stockSinEtiqueta = {};
      }
      if (!state.usuarios[nombre].historialAgregarStock) {
        state.usuarios[nombre].historialAgregarStock = [];
      }
    });
    
    actualizarStockGeneral();
  }
}

function guardarEnSheets() {
  const SHEET_URL = "https://script.google.com/macros/s/AKfycbzsNDTHpBPGbIE8fGV9F8RJhjlKTyOB5AZEKkcm59OhTgX5ZIiw3rBFw5bZgFrBdrCG5Q/exec";

  const stats = getEstadisticasVentas();
  const ventas = getVentasGenerales();

  // Totales de ventas
  const totalCobrado = ventas.reduce((a, v) => a + (Number(v.totalCobrado) || 0), 0);
  const totalProfeta = ventas.reduce((a, v) => a + (Number(v.paraProfeta) || 0), 0);
  const totalEfectivo = getTotalVentasPorMetodo("efectivo");
  const totalTransferencia = getTotalVentasPorMetodo("transferencia");

  // Clientes: nombre, deuda total, pagado, saldo pendiente
  const clientes = state.clientesGlobales.map(function(c) {
    return {
      nombre: c.nombre,
      deuda: Number(c.deuda) || 0,
      pagado: Number(c.pagado) || 0,
      saldo: (Number(c.deuda) || 0) - (Number(c.pagado) || 0)
    };
  });

  const payload = {
    stockGeneral: state.stockGeneral,
    stockGeneralSinEtiqueta: state.stockGeneralSinEtiqueta,
    stockIndividual: Object.fromEntries(
      Object.entries(state.usuarios).map(([nombre, u]) => [nombre, u.stock])
    ),
    stockIndividualSinEtiqueta: Object.fromEntries(
      Object.entries(state.usuarios).map(([nombre, u]) => [nombre, u.stockSinEtiqueta || {}])
    ),
    popularidad: {
      totalesPorEstilo: stats.totalesPorEstilo,
      granTotalLatas: stats.granTotalLatas
    },
    ventas: {
      totalCobrado: totalCobrado,
      totalProfeta: totalProfeta,
      totalEfectivo: totalEfectivo,
      totalTransferencia: totalTransferencia,
      cantidadVentas: ventas.length
    },
    clientes: clientes,
    historialTransferencias: state.historialTransferencias
  };

  fetch(SHEET_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "text/plain" }
  })
    .then(r => r.text())
    .then(res => alert("✅ Datos guardados en Google Sheets"))
    .catch(err => alert("❌ Error al guardar: " + err));
}
