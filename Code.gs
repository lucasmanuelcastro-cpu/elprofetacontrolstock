/**
 * ============================================================
 *  EL PROFETA — BACKEND (Google Apps Script + Google Sheets)
 *  VERSIÓN 3: Configuración dinámica, Barriles en Ventas y Fix de Deudas
 * ============================================================
 */

// ---------- CONFIG ----------
const USUARIOS = ["Julian", "Matias", "Lucas"];
const ESTILOS = ["BLONDE", "IRISH RED", "STOUT", "SESSION IPA", "RED IPA", "HONEY"];
const ESTILOS_BARRIL = ["VACIO","BLONDE", "HONEY", "IRISH RED", "RED HONEY", "STOUT", "HAZELNUT STOUT", "SESSION IPA", "RED IPA", "APA", "JAMESON ALE", "SCOTH MALT", "JAMESON IPA", "AMERICAN IPA", "NEIPA", "GIN TONIC", "VERMOUTH"];

const SH_STOCK        = "StockUsuarios";
const SH_VENTAS       = "Ventas";
const SH_CLIENTES     = "Clientes";
const SH_CLIENTES_ARCHIVO = "ClientesArchivados"; 
const SH_PAGOS        = "Pagos";
const SH_HIST_STOCK   = "HistorialStock";
const SH_TRANSFER     = "Transferencias";
const SH_GASTOS       = "Gastos";
const SH_BARRILES     = "Barriles";
const SH_HIST_BARR    = "HistorialBarriles";
const SH_AUDITORIA    = "Auditoria";
const SH_CONFIG       = "Configuracion";

// ---------- SETUP ----------
// ---------- SETUP ----------
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  crearSheetSiNoExiste(ss, SH_STOCK, ["Usuario", "Stock", "StockSinEtiqueta"]);
  crearSheetSiNoExiste(ss, SH_VENTAS, [
    "Fecha", "Vendedor", "Cliente", "Estilos", "TipoLata", "TotalCobrado",
    "ParaProfeta", "Comision", "Costo", "Ganancia", "Barriles", "MetodoPago", "Timestamp"
  ]);
  agregarColumnaSiNoExiste(getSheet(SH_VENTAS), "Servicios");
   agregarColumnaSiNoExiste(getSheet(SH_VENTAS), "CostosAsociados")

  crearSheetSiNoExiste(ss, SH_CLIENTES, ["Nombre", "Deuda", "Pagado"]);
  crearSheetSiNoExiste(ss, SH_CLIENTES_ARCHIVO, ["Nombre", "Deuda", "Pagado", "ArchivadoFecha", "Nota"]);

  crearSheetSiNoExiste(ss, SH_PAGOS, ["Fecha", "Cliente", "Monto", "Metodo", "Timestamp"]);
  agregarColumnaSiNoExiste(getSheet(SH_PAGOS), "Timestamp");
  
  crearSheetSiNoExiste(ss, SH_HIST_STOCK, ["Fecha", "Usuario", "Estilos", "Tipo"]);
  crearSheetSiNoExiste(ss, SH_TRANSFER, ["Fecha", "Desde", "Hacia", "Estilos", "Tipo"]);
  
  const gastosSheet = crearSheetSiNoExiste(ss, SH_GASTOS, ["IdFila", "Item", "Monto", "Obs", "Fecha", "Timestamp"]);
  agregarColumnaSiNoExiste(gastosSheet, "Timestamp");
  
  crearSheetSiNoExiste(ss, SH_BARRILES, [
    "Id", "Cliente", "Tipo", "Tamano", "Serie", "Deposito", "Observaciones",
    "Estado", "FechaPrestamo", "FechaDevolucion", "Timestamp"
  ]);
  crearSheetSiNoExiste(ss, SH_HIST_BARR, [
    "Fecha", "Accion", "Cliente", "Tipo", "Tamano", "Serie", "Deposito", "Observaciones"
  ]);
  crearSheetSiNoExiste(ss, SH_AUDITORIA, ["Fecha", "Accion", "Usuario", "Cliente", "Detalle", "Monto"]);

  const confSheet = crearSheetSiNoExiste(ss, SH_CONFIG, ["Clave", "Valor"]);
  if (confSheet.getLastRow() < 2) {
    confSheet.appendRow(["costoConEtiquetaNormal", 1850]);
    confSheet.appendRow(["costoSinEtiquetaNormal", 1510]); 
    confSheet.appendRow(["costoConEtiquetaLupulada", 1950]);
    confSheet.appendRow(["costoSinEtiquetaLupulada", 1610]); 
    confSheet.appendRow(["costoEtiqueta", 340]);
    confSheet.appendRow(["precioMinorista", 3500]);
    confSheet.appendRow(["precioMayoristaNormal", 2400]);
    confSheet.appendRow(["precioMayoristaLupulada", 2500]);
    confSheet.appendRow(["precioSixPack", 3250]);
    confSheet.appendRow(["precioDocePack", 3000]);
  }

  // Lógica blindada para agregar costos de barriles que falten (como BLONDE)
  const confObjs = filaAObjetos(confSheet);
  ESTILOS_BARRIL.forEach(e => {
    if (e !== "VACIO") {
      const clave = "costoLitro_" + e;
      const existeClave = confObjs.some(r => r.Clave === clave);
      if (!existeClave) confSheet.appendRow([clave, 1600]); 
    }
  });

  const stockSheet = ss.getSheetByName(SH_STOCK);
  const stockObjs = filaAObjetos(stockSheet);
  USUARIOS.forEach(function (u) {
    const existe = stockObjs.some(function (r) { return r.Usuario === u; });
    if (!existe) {
      const stockVacio = {};
      ESTILOS.forEach(function (e) { stockVacio[e] = 0; });
      stockSheet.appendRow([u, JSON.stringify(stockVacio), JSON.stringify(stockVacio)]);
    }
  });

  SpreadsheetApp.getUi().alert("Listo. Hojas actualizadas con Configuración y columna 'Barriles'.");
}

function crearSheetSiNoExiste(ss, nombre, headers) {
  let sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function agregarColumnaSiNoExiste(sheet, nombreColumna) {
  const ultimaCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, ultimaCol).getValues()[0];
  const yaExiste = headers.some(h => String(h).trim() === nombreColumna);
  if (!yaExiste) {
    sheet.getRange(1, ultimaCol + 1).setValue(nombreColumna);
  }
}
// ---------- UTILIDADES ----------
function getSheet(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(nombre);
  if (!sheet) throw new Error("Falta la hoja '" + nombre + "'. Ejecutá setup() primero.");
  return sheet;
}

function filaAObjetos(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const filas = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  return filas.map(function (fila, i) {
    const obj = { __row: i + 2 };
    headers.forEach(function (h, idx) { obj[h] = fila[idx]; });
    return obj;
  });
}

function jsonSeguro(valor, fallback) {
  if (valor === "" || valor === null || valor === undefined) return fallback;
  try { return JSON.parse(valor); } catch (e) { return fallback; }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function textOut(txt) {
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.TEXT);
}

function ahora() {
  return Utilities.formatDate(new Date(), "GMT-3", "dd/MM/yyyy HH:mm");
}

function leerConfiguracion() {
  const sheet = getSheet(SH_CONFIG);
  const objs = filaAObjetos(sheet);
  const conf = {};
  objs.forEach(function(r) {
    if (r.Clave) conf[r.Clave] = isNaN(Number(r.Valor)) ? r.Valor : Number(r.Valor);
  });
  return conf;
}

// ============================================================
//  ENTRADA PRINCIPAL
// ============================================================
function doGet(e) {
  const accion = e && e.parameter ? e.parameter.accion : null;
  let payload;
  try {
    if (accion === "clientesTodos") payload = accionClientesTodos();
    else if (accion === "leerGastos") payload = accionLeerGastos();
    else if (accion === "leerBarriles") payload = accionLeerBarriles();
    else if (accion === "leerHistorialBarriles") payload = accionLeerHistorialBarriles();
    else if (accion === "estadisticasBarriles") payload = accionEstadisticasBarriles();
    else if (accion === "leerAuditoria") payload = accionLeerAuditoria();
    else payload = accionSyncGeneral();
  } catch (err) {
    payload = { error: String(err) };
  }
  return jsonOut(payload);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return textOut("ERROR: JSON inválido");
    }
    const accion = data.accion;
    try {
      switch (accion) {
        case "nuevaVenta": accionNuevaVenta(data.venta); break;
        case "registrarPago": accionRegistrarPago(data); break;
        case "borrarVenta": accionBorrarVenta(data); break;
        case "actualizarStock": accionActualizarStock(data); break;
        case "guardarHistorialStock": accionGuardarHistorialStock(data.entrada); break;
        case "guardarTransferencia": accionGuardarTransferencia(data.entrada); break;
        case "guardarAuditoria": accionGuardarAuditoria(data.registro); break;
        case "borrarDeudaCliente": accionBorrarDeudaCliente(data.cliente); break;
        case "guardarGasto": accionGuardarGasto(data.gasto); break;
        case "borrarGasto": accionBorrarGasto(data.idFila); break;
        case "guardarBarril": accionGuardarBarril(data.barril); break;
        case "actualizarBarril": accionActualizarBarril(data.barril); break;
        case "borrarBarril": accionBorrarBarril(data.id); break;
        case "registrarMovimientoBarril": accionRegistrarMovimientoBarril(data.movimiento); break;
        case "registrarDepositoBarril": accionRegistrarDepositoBarril(data); break;
        case "cancelarDepositoBarril": accionCancelarDepositoBarril(data); break;
        case "borrarAuditoria": accionBorrarAuditoria(); break;
        case "iniciarNuevoCiclo": accionIniciarNuevoCiclo(data); break;
        case "actualizarMetodoPagoVentas": accionActualizarMetodoPagoVentas(data); break;
        default: return textOut("ERROR: acción desconocida (" + accion + ")");
      }
      return textOut("OK");
    } catch (err) {
      return textOut("ERROR: " + err);
    }
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
//  SYNC GENERAL 
// ============================================================

function parsearFechaPago(str) {
  if (!str) return 0;
  const m = String(str).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  const dia = Number(m[1]), mes = Number(m[2]), anio = Number(m[3]), hora = Number(m[4]), min = Number(m[5]);
  return new Date(anio, mes - 1, dia, hora, min).getTime() || 0;
}

function accionSyncGeneral() {
  const stockObjs = filaAObjetos(getSheet(SH_STOCK));
  const ventasObjs = filaAObjetos(getSheet(SH_VENTAS));
  const clientesObjs = filaAObjetos(getSheet(SH_CLIENTES));
  const histStockObjs = filaAObjetos(getSheet(SH_HIST_STOCK));
  const histTransferObjs = filaAObjetos(getSheet(SH_TRANSFER));
  const barrilesObjs = filaAObjetos(getSheet(SH_BARRILES));
  const pagosObjs = filaAObjetos(getSheet(SH_PAGOS));

  function limpiarMonto(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const numStr = String(val).replace(/[^0-9,-]/g, "").replace(/\./g, "").replace(",", ".");
    return Number(numStr) || 0;
  }

  const configuracion = leerConfiguracion();
  const cicloFechaCorte = Number(configuracion.cicloFechaCorte) || 0;
  const profetaInicialCiclo = Number(configuracion.profetaInicialCiclo) || 0;

  const usuarios = {};
  USUARIOS.forEach(function (u) {
    const fila = stockObjs.filter(function (r) { return r.Usuario === u; })[0];
    usuarios[u] = {
      stock: fila ? jsonSeguro(fila.Stock, {}) : {},
      stockSinEtiqueta: fila ? jsonSeguro(fila.StockSinEtiqueta, {}) : {},
      ventas: ventasObjs
        .filter(function (v) { return v.Vendedor === u; })
        .map(function (v) {
          const met = String(v.MetodoPago || "").trim();
          const costo = limpiarMonto(v.Costo);
          const com = limpiarMonto(v.Comision);
          // Lógica blindada: Si ParaProfeta está vacío, lo calcula. Si está puesto por vos, lo respeta.
          const pp = limpiarMonto(v.ParaProfeta);
          const paraProfeta = (pp === 0 && (costo > 0 || com > 0)) ? costo + com : pp;
          
          return {
            cliente: v.Cliente || "Consumidor Final",
            estilos: jsonSeguro(v.Estilos, {}),
            tipoLata: v.TipoLata || "conEtiqueta",
            estado: met !== "" ? "COBRADO" : "PENDIENTE",
            totalCobrado: limpiarMonto(v.TotalCobrado),
            costo: costo,
            costoTotal: costo,
            comision: com,
            paraProfeta: paraProfeta,
            metodoPago: met,
            fecha: v.Fecha || "",
            vendedor: v.Vendedor,
            timestamp: v.Timestamp || 0,
            barriles: jsonSeguro(v.Barriles, []),
            servicios: jsonSeguro(v.Servicios, []),
            costosAsociados: jsonSeguro(v.CostosAsociados, [])
          };
        })
    };
  });

  const stockGeneral = {};
  ESTILOS.forEach(function (e) { stockGeneral[e] = 0; });
  let totalSinEtiqueta = 0;
  USUARIOS.forEach(function (u) {
    ESTILOS.forEach(function (e) {
      stockGeneral[e] += Number(usuarios[u].stock[e]) || 0;
      totalSinEtiqueta += Number(usuarios[u].stockSinEtiqueta[e]) || 0;
    });
  });
  stockGeneral["LATAS SIN ETIQUETA"] = totalSinEtiqueta;

  // POPULARIDAD (Solo cuenta ventas posteriores al corte de ciclo)
  const popularidad = {};
  ventasObjs.forEach(function (v) {
    if (cicloFechaCorte > 0 && (Number(v.Timestamp) || 0) < cicloFechaCorte) return;
    const estilos = jsonSeguro(v.Estilos, {});
    Object.keys(estilos).forEach(function (e) {
      popularidad[e] = (popularidad[e] || 0) + (Number(estilos[e]) || 0);
    });
  });

  const ratioPagoPorCliente = {};
  clientesObjs.forEach(function (c) {
    const deuda = limpiarMonto(c.Deuda);
    const pagado = limpiarMonto(c.Pagado);
    const nombreNorm = String(c.Nombre || "").toLowerCase().trim();
    ratioPagoPorCliente[nombreNorm] = deuda > 0 ? Math.min(1, pagado / deuda) : 1;
  });

  let efectivo = 0, transferencia = 0, paraProfeta = 0;

  // 1. Agrupar ventas por cliente (todas, sin importar el ciclo) para saber el ratio del Profeta
  const ventasPorCliente = {};
  ventasObjs.forEach(function (v) {
    const cliente = String(v.Cliente || "Consumidor Final").toLowerCase().trim();
    if (!ventasPorCliente[cliente]) ventasPorCliente[cliente] = { totalCobrado: 0, totalParaProfeta: 0 };
    
    const tc = limpiarMonto(v.TotalCobrado);
    const pp = limpiarMonto(v.ParaProfeta);
    const costo = limpiarMonto(v.Costo);
    const com = limpiarMonto(v.Comision);
    const valParaProfeta = (pp === 0 && (costo > 0 || com > 0)) ? costo + com : pp;
    
    ventasPorCliente[cliente].totalCobrado += tc;
    ventasPorCliente[cliente].totalParaProfeta += valParaProfeta;
  });

  // 2. Procesar Pagos de este ciclo (Cobros a deudores)
  pagosObjs.forEach(function (p) {
    if (cicloFechaCorte > 0 && (Number(p.Timestamp) || 0) < cicloFechaCorte) return;
    
    const monto = limpiarMonto(p.Monto);
    const cliente = String(p.Cliente || "Consumidor Final").toLowerCase().trim();
    
    // Sumar dinero físico a la caja del ciclo actual
    if (String(p.Metodo).toLowerCase() === "transferencia") transferencia += monto;
    else efectivo += monto;
    
    // Sumar parte del Profeta (prorrateada) basándose en la deuda total del cliente
    const dataCliente = ventasPorCliente[cliente];
    if (dataCliente && dataCliente.totalCobrado > 0) {
      const ratio = dataCliente.totalParaProfeta / dataCliente.totalCobrado;
      paraProfeta += monto * ratio;
    }
  });

  // 3. Sumar Ventas 100% cobradas en este ciclo (ventas directas que no pasaron por deudores)
  ventasObjs.forEach(function (v) {
    const ts = Number(v.Timestamp) || 0;
    const met = String(v.MetodoPago || "").trim();
    
    // Si la venta se creó y pagó en este ciclo
    if (ts >= cicloFechaCorte && met !== "") {
      const monto = limpiarMonto(v.TotalCobrado);
      const pp = limpiarMonto(v.ParaProfeta);
      const costo = limpiarMonto(v.Costo);
      const com = limpiarMonto(v.Comision);
      const paraProfetaVenta = (pp === 0 && (costo > 0 || com > 0)) ? costo + com : pp;
      
      if (met === "transferencia") transferencia += monto;
      else efectivo += monto;
      paraProfeta += paraProfetaVenta;
    }
  });
  
  paraProfeta = Math.round(paraProfeta + profetaInicialCiclo);

  const clientes = clientesObjs.map(function (c) {
    return {
      nombre: c.Nombre,
      deuda: limpiarMonto(c.Deuda),
      pagado: limpiarMonto(c.Pagado)
    };
  });

  const barrilesDisponibles = barrilesObjs
    .filter(function (b) { return String(b.Estado).toLowerCase().trim() === "disponible"; })
    .map(function (b) {
      return { id: b.Id, tipo: b.Tipo, tamano: b.Tamano, serie: b.Serie };
    });

  return {
    usuarios: usuarios,
    clientes: clientes,
    stockGeneral: stockGeneral,
    popularidad: popularidad,
    totalIngresadoSheet: efectivo + transferencia,
    efectivoSheet: efectivo,
    transferenciaSheet: transferencia,
    paraProfetaSheet: paraProfeta,
    configuracion: configuracion,
    cicloFechaCorte: cicloFechaCorte,
    profetaInicialCiclo: profetaInicialCiclo,
    barrilesDisponibles: barrilesDisponibles,
    historialStock: histStockObjs.map(function (h) {
      return { fecha: h.Fecha, usuario: h.Usuario, estilos: jsonSeguro(h.Estilos, {}), tipo: h.Tipo };
    }),
    historialTransferencias: histTransferObjs.map(function (t) {
      return { fecha: t.Fecha, desde: t.Desde, hacia: t.Hacia, estilos: jsonSeguro(t.Estilos, {}), tipo: t.Tipo };
    })
  };
}

// ============================================================
//  FUNCIONES DE DATOS
// ============================================================
function accionClientesTodos() { 
  const clientesActivos = filaAObjetos(getSheet(SH_CLIENTES)); 
  
  let clientesArchivados = [];
  try {
    clientesArchivados = filaAObjetos(getSheet(SH_CLIENTES_ARCHIVO));
  } catch(e) {}

  const todos = [...clientesActivos, ...clientesArchivados];
  const unicos = {};
  
  todos.forEach(function(r) {
    const nombre = String(r.Nombre || "").trim();
    if (nombre && !unicos[nombre.toLowerCase()]) {
      unicos[nombre.toLowerCase()] = {
        nombre: nombre, 
        deuda: Number(r.Deuda)||0, 
        pagado: Number(r.Pagado)||0
      };
    }
  });

  return { clientesTodos: Object.values(unicos) }; 
}

function buscarFilaCliente(objs, nombre) { 
  const n = String(nombre||"").toLowerCase().trim(); 
  for(let i=0; i<objs.length; i++){ if(String(objs[i].Nombre||"").toLowerCase().trim()===n) return objs[i]; } 
  return null; 
}

function accionBorrarDeudaCliente(n) { 
  const s=getSheet(SH_CLIENTES); 
  const o=filaAObjetos(s); 
  const f=buscarFilaCliente(o,n); 
  if(f){
    const archive = getSheet(SH_CLIENTES_ARCHIVO);
    archive.appendRow([f.Nombre, Number(f.Deuda)||0, Number(f.Pagado)||0, ahora(), 'Borrado manual']);
    s.deleteRow(f.__row);
  } 
}

function accionNuevaVenta(v) {
  if(!v) throw new Error("Falta 'venta'"); 
  const s=getSheet(SH_VENTAS); 
  const c = Number(v.costoTotal !== undefined ? v.costoTotal : v.costo) || 0; 
  const com=Number(v.comision)||0; 
  const pp=v.paraProfeta!=null?Number(v.paraProfeta):(c+com); 
  const tc=Number(v.totalCobrado)||0; 
s.appendRow([
    v.fecha||ahora(), 
    v.vendedor||"", 
    v.cliente||"Consumidor Final", 
    JSON.stringify(v.estilos||{}), 
    v.tipoLata||"conEtiqueta", 
    tc, pp, com, c, 
    v.ganancia!=null?Number(v.ganancia):(tc-c), 
    JSON.stringify(v.barriles || []), 
    v.metodoPago||"", 
    v.timestamp || Date.now(),
    JSON.stringify(v.servicios || []),
    JSON.stringify(v.costosAsociados || [])
  ]);
  const nc=String(v.cliente||"").trim(); 
  if(nc&&nc.toLowerCase()!="consumidor final"){ 
    upsertDeudaCliente(nc,tc,0); 
  } 
}


function accionBorrarVenta(d) { 
  const s=getSheet(SH_VENTAS); 
  const o=filaAObjetos(s); 
  let f=null; 
  for (let i = o.length - 1; i >= 0; i--) {
    const v = o[i];
    if (
      String(v.Vendedor) === String(d.vendedor || "") &&
      String(v.Fecha) === String(d.fecha || "") &&
      String((v.Cliente || "Consumidor Final")) === String(d.cliente || "Consumidor Final") &&
      Number(v.TotalCobrado) === Number(d.totalCobrado || 0)
    ) {
      f = v;
      break;
    }
  }
  if(!f) return; 
  s.deleteRow(f.__row); 
  const nc=String(d.cliente||"").trim(); 
  if(nc&&nc.toLowerCase()!="consumidor final"){ 
    upsertDeudaCliente(nc,-Number(d.totalCobrado||0),0); 
  } 
}

function upsertDeudaCliente(n, dd, dp) { 
  const s=getSheet(SH_CLIENTES); 
  const o=filaAObjetos(s); 
  const f=buscarFilaCliente(o,n); 
  if(f){ 
    let nd = Math.max(0, (Number(f.Deuda)||0) + dd); 
    let np = Math.max(0, (Number(f.Pagado)||0) + dp); 
    if (np >= nd) { 
      const archive = getSheet(SH_CLIENTES_ARCHIVO);
      archive.appendRow([f.Nombre, Number(f.Deuda)||0, Number(f.Pagado)||0, ahora(), 'Saldado']);
      s.deleteRow(f.__row);
    } else {
      s.getRange(f.__row,2,1,2).setValues([[nd,np]]); 
    }
  } else { 
    s.appendRow([n, Math.max(0,dd), Math.max(0,dp)]); 
  } 
}

function accionRegistrarPago(d) { 
  const s=getSheet(SH_PAGOS); 
  const m=Number(d.monto)||0; 
  const met=String(d.metodo||d.metodoPago||"efectivo").toLowerCase(); 
  s.appendRow([d.fecha||ahora(), d.cliente||"", m, met, d.timestamp || Date.now()]); // <--- Agregado timestamp
  if(d.cliente) upsertDeudaCliente(d.cliente,0,m); 
}

function accionActualizarStock(d) { 
  const s=getSheet(SH_STOCK); 
  const o=filaAObjetos(s); 
  const f=o.filter(function(r){return r.Usuario===d.usuario;})[0]; 
  const sj=JSON.stringify(d.stock||{}); 
  const ssj=JSON.stringify(d.stockSinEtiqueta||{}); 
  if(f){ s.getRange(f.__row,2,1,2).setValues([[sj,ssj]]); } 
  else { s.appendRow([d.usuario,sj,ssj]); } 
}

function accionGuardarHistorialStock(e) { if(!e) return; getSheet(SH_HIST_STOCK).appendRow([e.fecha||ahora(), e.usuario||"", JSON.stringify(e.estilos||{}), e.tipo||"conEtiqueta"]); }
function accionGuardarTransferencia(e) { if(!e) return; getSheet(SH_TRANSFER).appendRow([e.fecha||ahora(), e.desde||"", e.hacia||"", JSON.stringify(e.estilos||{}), e.tipo||"conEtiqueta"]); }

function accionLeerGastos() { 
  const o = filaAObjetos(getSheet(SH_GASTOS)); 
  const config = leerConfiguracion();
  const cicloFechaCorte = Number(config.cicloFechaCorte) || 0;

  // Mandamos todos los gastos, junto con la fecha de corte
  return { 
    cicloFechaCorte: cicloFechaCorte,
    gastos: o.map(function(g) { 
      return {
        idFila: g.IdFila, 
        item: g.Item, 
        monto: Number(g.Monto) || 0, 
        obs: g.Obs, 
        fecha: g.Fecha,
        timestamp: Number(g.Timestamp) || 0 // <--- Mandamos el timestamp
      }; 
    }) 
  }; 
}

function accionGuardarGasto(g) { 
  if(!g) throw new Error("Falta 'gasto'"); 
  const s = getSheet(SH_GASTOS); 
  s.appendRow([
    "G" + Date.now(), 
    g.item || "", 
    Number(g.monto) || 0, 
    g.obs || "", 
    g.fecha || ahora(), 
    g.timestamp || Date.now() // <--- NUEVO
  ]); 
}
function accionBorrarGasto(id) { const s=getSheet(SH_GASTOS); const o=filaAObjetos(s); const f=o.filter(function(g){return String(g.IdFila)===String(id);})[0]; if(f) s.deleteRow(f.__row); }

function accionLeerBarriles() {
  const objs = filaAObjetos(getSheet(SH_BARRILES));
  return {
    barriles: objs.map(function (b) {
      return {
        id: b.Id, cliente: b.Cliente, tipo: b.Tipo, tamano: b.Tamano, serie: b.Serie,
        deposito: Number(b.Deposito) || 0, observaciones: b.Observaciones, estado: b.Estado,
        fechaPrestamo: b.FechaPrestamo, fechaDevolucion: b.FechaDevolucion, timestamp: b.Timestamp
      };
    })
  };
}

function accionGuardarBarril(barril) {
  if (!barril) throw new Error("Falta 'barril'");
  getSheet(SH_BARRILES).appendRow([
    barril.id || String(Date.now()), barril.cliente || "", barril.tipo || "", barril.tamano || "",
    barril.serie || "", Number(barril.deposito) || 0, barril.observaciones || "",
    barril.estado || "disponible", barril.fechaPrestamo || "", barril.fechaDevolucion || "",
    barril.timestamp || Date.now()
  ]);
}

function accionActualizarBarril(barril) {
  if (!barril || !barril.id) throw new Error("Falta 'barril.id'");
  const sheet = getSheet(SH_BARRILES);
  const objs = filaAObjetos(sheet);
  const fila = objs.filter(function (b) { return String(b.Id) === String(barril.id); })[0];
  if (!fila) throw new Error("Barril no encontrado");

  const nuevosValores = [
    barril.id,
    barril.cliente !== undefined ? barril.cliente : (fila.Cliente || ""),
    barril.tipo !== undefined ? barril.tipo : (fila.Tipo || ""),
    barril.tamano !== undefined ? barril.tamano : (fila.Tamano || ""),
    barril.serie !== undefined ? barril.serie : (fila.Serie || ""),
    barril.deposito !== undefined ? Number(barril.deposito) : (Number(fila.Deposito) || 0),
    barril.observaciones !== undefined ? barril.observaciones : (fila.Observaciones || ""),
    barril.estado !== undefined ? barril.estado : (fila.Estado || "disponible"),
    barril.fechaPrestamo !== undefined ? barril.fechaPrestamo : (fila.FechaPrestamo || ""),
    barril.fechaDevolucion !== undefined ? barril.fechaDevolucion : (fila.FechaDevolucion || ""),
    barril.timestamp !== undefined ? barril.timestamp : (Number(fila.Timestamp) || Date.now())
  ];

  sheet.getRange(fila.__row, 1, 1, 11).setValues([nuevosValores]);
}

function accionBorrarBarril(idBarril) {
  const sheet = getSheet(SH_BARRILES);
  const objs = filaAObjetos(sheet);
  const fila = objs.filter(function (b) { return String(b.Id) === String(idBarril); })[0];
  if (fila) sheet.deleteRow(fila.__row);
}

function accionRegistrarDepositoBarril(d) {
  const cliente = String(d.cliente || "").trim();
  const monto = Number(d.monto) || 0;
  if (!cliente || cliente.toLowerCase() === "consumidor final" || monto <= 0) return;
  upsertDeudaCliente(cliente, monto, 0);
}

function accionCancelarDepositoBarril(d) {
  const cliente = String(d.cliente || "").trim();
  const monto = Number(d.monto) || 0;
  if (!cliente || monto <= 0) return;
  upsertDeudaCliente(cliente, 0, monto);
}

function accionRegistrarMovimientoBarril(mov) {
  if (!mov) return;
  getSheet(SH_HIST_BARR).appendRow([
    mov.fecha || ahora(), mov.accion || "", mov.cliente || "", mov.tipo || "",
    mov.tamano || "", mov.serie || "", Number(mov.deposito) || 0, mov.observaciones || ""
  ]);
}

function accionLeerHistorialBarriles() {
  const objs = filaAObjetos(getSheet(SH_HIST_BARR));
  return {
    historial: objs.map(function (h) {
      return {
        fecha: h.Fecha, accion: h.Accion, cliente: h.Cliente, tipo: h.Tipo,
        tamano: h.Tamano, serie: h.Serie, deposito: Number(h.Deposito) || 0, observaciones: h.Observaciones
      };
    })
  };
}

function accionEstadisticasBarriles() {
  const objs = filaAObjetos(getSheet(SH_BARRILES));
  const prestados = objs.filter(function (b) { return String(b.Estado).toLowerCase().trim() === "prestado"; }).length;
  const disponibles = objs.filter(function (b) { return String(b.Estado).toLowerCase().trim() === "disponible"; }).length;
  return { total: objs.length, prestados: prestados, disponibles: disponibles };
}

function accionGuardarAuditoria(registro) {
  if (!registro) return;
  getSheet(SH_AUDITORIA).appendRow([
    registro.fecha || ahora(), registro.accion || "", registro.usuario || "",
    registro.cliente || "", registro.detalle || "", Number(registro.monto) || 0
  ]);
}

function accionLeerAuditoria() {
  const objs = filaAObjetos(getSheet(SH_AUDITORIA));
  const registros = objs.map(function (r) {
    return { fecha: r.Fecha, accion: r.Accion, usuario: r.Usuario, cliente: r.Cliente, detalle: r.Detalle, monto: Number(r.Monto) || 0 };
  });
  registros.reverse(); 
  return { registros: registros };
}

function accionBorrarAuditoria() {
  const sheet = getSheet(SH_AUDITORIA);
  const last = sheet.getLastRow();
  if (last > 1) sheet.deleteRows(2, last - 1);
}

function diagnostico_ventas() {
  const sheet = getSheet(SH_VENTAS);
  Logger.log("Nombre real de la hoja: " + sheet.getName());
  Logger.log("Last Row: " + sheet.getLastRow());
  Logger.log("Last Column: " + sheet.getLastColumn());

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log("Headers crudos: " + JSON.stringify(headers));

  const objs = filaAObjetos(sheet);
  Logger.log("Filas parseadas (deberían ser ~85): " + objs.length);

  if (objs.length > 0) {
    Logger.log("Primera fila completa: " + JSON.stringify(objs[0]));
    Logger.log("Vendedor primera fila entre corchetes: [" + objs[0].Vendedor + "]");
  }

  const conteoPorVendedor = {};
  objs.forEach(function (o) {
    const v = String(o.Vendedor || "(VACIO)");
    conteoPorVendedor[v] = (conteoPorVendedor[v] || 0) + 1;
  });
  Logger.log("Conteo por vendedor: " + JSON.stringify(conteoPorVendedor));
}

// ===== FUNCIONES DE CICLO Y DEUDAS =====
function accionIniciarNuevoCiclo(data) {
  const confSheet = getSheet(SH_CONFIG);
  const ventasSheet = getSheet(SH_VENTAS);
  const gastosSheet = getSheet(SH_GASTOS); // <--- NUEVO
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Crear hojas de backup
  const fechaBackup = Utilities.formatDate(new Date(), "GMT-3", "dd_MM_yyyy_HH_mm");
  
  const backupVentas = ventasSheet.copyTo(ss);
  backupVentas.setName("Ventas_Backup_" + fechaBackup);
  
  const backupGastos = gastosSheet.copyTo(ss); // <--- NUEVO
  backupGastos.setName("Gastos_Backup_" + fechaBackup); // <--- NUEVO

  // 2. Actualizar configuración
  const config = leerConfiguracion();
  config["cicloFechaCorte"] = Date.now();
  config["profetaInicialCiclo"] = Number(data.profetaInicial) || 0;

  const lastRow = confSheet.getLastRow();
  if (lastRow > 1) {
    confSheet.getRange(2, 1, lastRow - 1, 2).clearContent();
  }
  Object.entries(config).forEach(([k, v]) => {
    confSheet.appendRow([k, v]);
  });
}
// backup y marcar las ventas

function accionActualizarMetodoPagoVentas(data) {
  if (!data.ventas || !Array.isArray(data.ventas)) return;
  const ventasSheet = getSheet(SH_VENTAS);
  const objs = filaAObjetos(ventasSheet);
  
  data.ventas.forEach(v => {
    const cliente = String(v.cliente || "").toLowerCase().trim();
    const metodo = String(v.metodo || "efectivo").toLowerCase();
    const timestamp = Number(v.timestamp) || 0;
    
    for (let i = 0; i < objs.length; i++) {
      const row = objs[i];
      
      // Blindamos la lectura del Timestamp por si Google Sheets lo guardó como Fecha
      let sheetTs = row.Timestamp;
      if (sheetTs instanceof Date) {
        sheetTs = sheetTs.getTime();
      } else {
        sheetTs = Number(sheetTs) || 0;
      }
      
      if (String(row.Cliente || "").toLowerCase().trim() === cliente && sheetTs === timestamp) {
        ventasSheet.getRange(row.__row, 12).setValue(metodo); // Columna 12 = MetodoPago
        break;
      }
    }
  });
}

// ===== MANTENIMIENTO: RELLENAR TIMESTAMPS FALTANTES =====
function rellenarTimestampsFaltantes() {
  const sheet = getSheet(SH_VENTAS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colFecha = headers.indexOf("Fecha");
  const colTs = headers.indexOf("Timestamp");
  
  if (colFecha === -1 || colTs === -1) {
    SpreadsheetApp.getUi().alert("No se encuentran las columnas 'Fecha' o 'Timestamp'.");
    return;
  }
  
  let actualizadas = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let ts = row[colTs];
    
    // Si el timestamp está vacío, es 0, o es una fecha que Sheets convirtió
    if (!ts || ts === 0 || ts === "" || ts instanceof Date) {
      const fechaStr = row[colFecha];
      if (fechaStr) {
        let parts = String(fechaStr).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})/);
        let dateObj;
        
        if (parts) {
          // Si tiene fecha y hora
          dateObj = new Date(parts[3], parts[2]-1, parts[1], parts[4], parts[5]);
        } else {
          let parts2 = String(fechaStr).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (parts2) {
            // Si solo tiene fecha (asume 00:00)
            dateObj = new Date(parts2[3], parts2[2]-1, parts2[1]);
          }
        }
        
        if (dateObj) {
          // Lo guardamos como TEXTO para que Sheets no lo vuelva a convertir en Fecha
          sheet.getRange(i+1, colTs+1).setValue(String(dateObj.getTime()));
          actualizadas++;
        }
      }
    }
  }
  SpreadsheetApp.getUi().alert("Migración terminada. Se actualizaron " + actualizadas + " ventas con Timestamp faltante.");
}
