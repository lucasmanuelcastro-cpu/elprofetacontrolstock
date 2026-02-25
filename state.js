const estilosBase = ["BLONDE", "IRISH RED", "STOUT", "SESSION IPA", "RED IPA", "HONEY"];
const costoPorLata = 1700;

let state = {
  usuarios: {
    Julian: { stock: {}, ventas: [] },
    Matias: { stock: {}, ventas: [] },
    Lucas: { stock: {}, ventas: [] },
  },
  clientesGlobales: [], 
  stockGeneral: {},
  usuarioActivo: null,
  ventaActual: {},
  metodoPago: "efectivo",
  clienteNombre: "",
  totalCobradoInput: "",
  transferDesde: "Julian",
  transferHacia: "Matias",
  transferEstilo: "BLONDE",
  transferCantidad: 0,
};

function setState(updater) {
  state = typeof updater === "function" ? updater(structuredClone(state)) : updater;
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
  const totalLatas = Object.values(state.ventaActual).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalCobrado = Number(state.totalCobradoInput) || 0;
  const costoTotal = totalLatas * costoPorLata;
  const gananciaBruta = totalCobrado > costoTotal ? totalCobrado - costoTotal : 0;
  const comision = gananciaBruta * 0.5;
  return { costoTotal, comision, paraProfeta: costoTotal + comision, totalLatas };
}

function getVentasGenerales() {
  return Object.values(state.usuarios).flatMap((u) => u.ventas);
}

function getTotalVentasDinero() {
  const totalVentas = getVentasGenerales().reduce((acc, v) => acc + (Number(v.totalCobrado) || 0), 0);
  const deudaPendiente = state.clientesGlobales.reduce((acc, c) => {
    const saldo = (Number(c.deuda) || 0) - (Number(c.pagado) || 0);
    return acc + (saldo > 0 ? saldo : 0);
  }, 0);
  return totalVentas - deudaPendiente;
}

function getTotalVentasPorMetodo(metodo) {
  const ventas = getVentasGenerales().filter(v => (v.metodoPago || "efectivo") === metodo);
  const total = ventas.reduce((acc, v) => acc + (Number(v.totalCobrado) || 0), 0);
  if (metodo === "efectivo") {
    const deudaPendiente = state.clientesGlobales.reduce((acc, c) => {
      const saldo = (Number(c.deuda) || 0) - (Number(c.pagado) || 0);
      return acc + (saldo > 0 ? saldo : 0);
    }, 0);
    return total - deudaPendiente;
  }
  return total;
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
  const data = { usuarios: state.usuarios, clientes: state.clientesGlobales };
  localStorage.setItem("elProfetaData", JSON.stringify(data));
  alert("¡Datos y Cartera de Clientes guardados!");
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