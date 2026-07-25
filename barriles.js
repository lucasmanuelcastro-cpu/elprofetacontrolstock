let barriles = [];
let historial = [];
let filtroActual = "todos";

document.addEventListener("DOMContentLoaded", () => {
  cargarBarriles();
  cargarHistorial();
  actualizarEstadisticas();
  bindEvents();
});

async function cargarBarriles() {
  try {
    const resp = await fetch(`${URL_SCRIPT}?accion=leerBarriles`);
    const data = await resp.json();
    barriles = data.barriles || [];
    renderListaBarriles();
    actualizarEstadisticas();
  } catch (err) {
    console.error(err);
    const contenedor = document.getElementById("lista-barriles");
    if (contenedor) contenedor.innerHTML = `<p style="color:red;text-align:center">Error cargando barriles</p>`;
  }
}

async function cargarHistorial() {
  try {
    const resp = await fetch(`${URL_SCRIPT}?accion=leerHistorialBarriles`);
    const data = await resp.json();
    historial = data.historial || [];
    renderHistorial();
  } catch (err) {
    console.error(err);
    const contenedor = document.getElementById("historial-barriles");
    if (contenedor) contenedor.innerHTML = `<p style="color:red;text-align:center">Error cargando historial</p>`;
  }
}

async function actualizarEstadisticas() {
  try {
    const resp = await fetch(`${URL_SCRIPT}?accion=estadisticasBarriles`);
    const stats = await resp.json();
    const total = document.getElementById("total-barriles");
    const prestados = document.getElementById("prestados-count");
    const disponibles = document.getElementById("disponibles-count");
    if (total) total.textContent = stats.total || 0;
    if (prestados) prestados.textContent = stats.prestados || 0;
    if (disponibles) disponibles.textContent = stats.disponibles || 0;
  } catch (err) { console.error(err); }
}

window.filtrarBarriles = function (tipo) {
  filtroActual = tipo;
  document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.filtro === tipo) btn.classList.add("active");
  });
  renderListaBarriles();
};

function renderListaBarriles() {
  const container = document.getElementById("lista-barriles");
  if (!container) return;
  let lista = [...barriles];

  if (filtroActual === "prestado") lista = lista.filter(b => b.estado === "prestado");
  if (filtroActual === "disponible") lista = lista.filter(b => b.estado === "disponible");

  if (!lista.length) {
    container.innerHTML = `<div class="empty-state">No hay barriles en esta categoría</div>`;
    return;
  }

  container.innerHTML = lista.map(b => {
    return `
    <div class="barril-item">
      <div class="barril-header">
        <div>
          <div class="barril-tipo">${b.tipo || "Sin estilo"} — ${b.tamano}</div>
          <div class="barril-cliente">
            ${b.estado === "prestado" ? `👤 ${b.cliente || "Cliente anónimo"}` : "📦 En depósito"}
          </div>
        </div>
        <div style="display:flex; align-items:center;">
          ${
            b.estado === "prestado"
              ? `<button class="btn-devolver" onclick="devolverBarril('${b.id}')">Devolver</button>`
              : `<button class="filtro-btn active" style="background:#10b981; color:white; border-color:#10b981; font-weight:bold;" onclick="abrirModalPrestamoConDatos('${b.id}', '${b.serie || ''}', '${b.tamano || ''}')">➕ Prestar</button>`
          }
          <button class="btn-borrar" onclick="borrarBarrilDefinitivo('${b.id}', '${b.tipo || ''}', '${b.tamano || ''}', '${b.serie || ''}')">🗑️</button>
        </div>
      </div>
      <div style="margin-top: 8px; font-size: 0.9em; color: #475569;">
        ${b.serie ? `<div><strong>Número de Serie:</strong> ${b.serie}</div>` : ""}
        ${b.deposito ? `<div><strong>Depósito/Seña:</strong> $${Number(b.deposito).toLocaleString("es-AR")}</div>` : ""}
        ${b.fechaPrestamo ? `<div class="barril-fecha">Último préstamo: ${b.fechaPrestamo}</div>` : ""}
        ${b.observaciones ? `<div style="margin-top:5px; color:#64748b; font-style:italic;">"${b.observaciones}"</div>` : ""}
      </div>
    </div>`;
  }).join("");
}

function renderHistorial() {
  const container = document.getElementById("historial-barriles");
  if (!container) return;
  if (!historial.length) {
    container.innerHTML = `<div class="empty-state">Sin movimientos</div>`;
    return;
  }
  container.innerHTML = historial.slice().reverse().map(item => {
    return `
    <div class="historial-item">
      <div><strong>${item.accion}</strong></div>
      <div>Cliente: ${item.cliente || '-'}</div>
      <div>${item.tipo || '-'} ${item.tamano || ''}</div>
      ${item.serie ? `<div>Serie: ${item.serie}</div>` : ""}
      ${item.deposito ? `<div>Depósito: $${Number(item.deposito).toLocaleString("es-AR")}</div>` : ""}
      <div class="historial-fecha">${item.fecha}</div>
    </div>`;
  }).join("");
}

// ===== MODALES =====
window.abrirModalPrestamo = function () {
  document.getElementById("form-prestamo").reset();
  document.getElementById("id-barril-prestamo").value = "";
  document.getElementById("modal-prestamo").style.display = "flex";
  setTimeout(() => document.getElementById("cliente-barril")?.focus(), 100);
};

window.cerrarModalPrestamo = function () {
  document.getElementById("modal-prestamo").style.display = "none";
};

window.abrirModalAgregar = function () {
  document.getElementById("form-agregar").reset();
  document.getElementById("modal-agregar").style.display = "flex";
};

window.cerrarModalAgregar = function () {
  document.getElementById("modal-agregar").style.display = "none";
};

window.abrirModalPrestamoConDatos = function(id, serie, tamano) {
  window.abrirModalPrestamo();
  setTimeout(() => {
    document.getElementById("id-barril-prestamo").value = id || "";
    if (serie) document.getElementById("serie-barril").value = serie;
    if (tamano) document.getElementById("tamano-barril").value = tamano;
  }, 150);
};

// ===== EVENTOS FORM =====
function bindEvents() {
  document.getElementById("modal-prestamo")?.addEventListener("click", (e) => { if (e.target.id === "modal-prestamo") cerrarModalPrestamo(); });
  document.getElementById("modal-agregar")?.addEventListener("click", (e) => { if (e.target.id === "modal-agregar") cerrarModalAgregar(); });

  document.getElementById("form-agregar")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tipo = document.getElementById("add-tipo-barril").value;
    const tamano = document.getElementById("add-tamano-barril").value;
    const serie = document.getElementById("add-serie-barril").value.trim();
    const obs = document.getElementById("add-obs-barril").value.trim();
    
    if (!tamano) return alert("Seleccioná un tamaño.");

    const barril = {
      id: Date.now().toString(),
      cliente: "",
      tipo: tipo || "VACIO",
      tamano,
      serie: serie || "",
      deposito: 0,
      observaciones: obs,
      estado: "disponible",
      fechaPrestamo: "",
      fechaDevolucion: "",
      timestamp: Date.now()
    };

    try {
      await fetch(URL_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ accion: "guardarBarril", barril })
      });
      cerrarModalAgregar();
      await cargarBarriles();
      await actualizarEstadisticas();
      alert("Barril agregado al stock.");
    } catch (err) {
      alert("Error al agregar barril.");
    }
  });

  document.getElementById("form-prestamo")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await prestarBarril();
  });
}

// ===== PRESTAR BARRIL =====
async function prestarBarril() {
  const idExistente = document.getElementById("id-barril-prestamo").value;
  const cliente = document.getElementById("cliente-barril").value.trim();
  const tipo = document.getElementById("tipo-barril").value;
  const tamano = document.getElementById("tamano-barril").value;
  const serie = document.getElementById("serie-barril").value.trim();
  const deposito = document.getElementById("deposito-barril").value;
  const observaciones = document.getElementById("obs-barril").value.trim();

  if (!tamano) return alert("Completá al menos el Tamaño.");

  const barril = {
    id: idExistente || Date.now().toString(),
    cliente: cliente || "Consumidor Final",
    tipo: tipo || "VACIO",
    tamano,
    serie: serie || "",
    deposito: Number(deposito) || 0,
    observaciones,
    estado: "prestado",
    fechaPrestamo: new Date().toLocaleString("es-AR"),
    fechaDevolucion: "",
    timestamp: Date.now()
  };

  try {
    const accion = idExistente ? "actualizarBarril" : "guardarBarril";
    const resp = await fetch(URL_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ accion, barril })
    });
    const texto = await resp.text();
    if (!texto.includes("OK")) throw new Error(texto);

    await fetch(URL_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        accion: "registrarMovimientoBarril",
        movimiento: {
          fecha: new Date().toLocaleString("es-AR"),
          accion: "PRÉSTAMO",
          cliente: barril.cliente, tipo: barril.tipo, tamano: barril.tamano,
          serie: barril.serie, deposito: barril.deposito, observaciones: barril.observaciones
        }
      })
    });

    // 🟢 Depósito/Seña -> cartera de deudores del cliente
    if (barril.deposito > 0 && barril.cliente && barril.cliente.toLowerCase() !== "consumidor final") {
      await fetch(URL_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ accion: "registrarDepositoBarril", cliente: barril.cliente, monto: barril.deposito })
      });
      await fetch(URL_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          accion: "guardarAuditoria",
          registro: {
            fecha: new Date().toLocaleString("es-AR"),
            accion: "DEPÓSITO BARRIL",
            usuario: "",
            cliente: barril.cliente,
            detalle: `${barril.tipo} (${barril.tamano}) serie ${barril.serie || "-"}`,
            monto: barril.deposito
          }
        })
      }).catch(() => {});
    }

    cerrarModalPrestamo();
    await cargarBarriles();
    await cargarHistorial();
    await actualizarEstadisticas();
    alert("Préstamo registrado exitosamente." + (barril.deposito > 0 && barril.cliente ? `\n💰 Depósito de $${barril.deposito.toLocaleString("es-AR")} sumado a la cuenta de ${barril.cliente} (cartera de deudores).` : ""));
  } catch (err) {
    console.error(err);
    alert("Error al guardar préstamo.");
  }
}

// ===== DEVOLVER BARRIL =====
window.devolverBarril = async function(idBarril) {
  const barril = barriles.find(b => String(b.id) === String(idBarril));
  if (!barril) return alert("Error: No se encontró el barril.");

  let usuarioEntrega = prompt(`¿Quién devuelve este barril?`, barril.cliente || "");
  if (usuarioEntrega === null) return;

  // 🟢 Cancelación total/parcial del depósito en la cartera del cliente
  const clienteDeposito = (barril.cliente || "").trim();
  const tieneDepositoEnCartera = Number(barril.deposito) > 0 && clienteDeposito && clienteDeposito.toLowerCase() !== "consumidor final";
  let montoCancelar = 0;
  if (tieneDepositoEnCartera) {
    const respuesta = prompt(
      `Este barril tiene un depósito de $${Number(barril.deposito).toLocaleString("es-AR")} a nombre de ${clienteDeposito}.\n` +
      `¿Cuánto querés cancelar de su cuenta ahora? (dejalo vacío o 0 para no cancelar nada, podés hacerlo después desde Cartera)`,
      String(barril.deposito)
    );
    montoCancelar = Math.min(Math.max(0, Number(respuesta) || 0), Number(barril.deposito));
  }

  try {
    const actualizado = {
      ...barril,
      cliente: "",
      estado: "disponible",
      fechaDevolucion: new Date().toLocaleString("es-AR")
    };

    const resp = await fetch(URL_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ accion: "actualizarBarril", barril: actualizado })
    });
    const texto = await resp.text();
    if (!texto.includes("OK")) throw new Error(texto);

    await fetch(URL_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        accion: "registrarMovimientoBarril",
        movimiento: {
          fecha: new Date().toLocaleString("es-AR"),
          accion: "DEVOLUCIÓN",
          cliente: usuarioEntrega.trim() || barril.cliente,
          tipo: barril.tipo, tamano: barril.tamano, serie: barril.serie,
          deposito: barril.deposito, observaciones: barril.observaciones
        }
      })
    });

    if (tieneDepositoEnCartera && montoCancelar > 0) {
      await fetch(URL_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ accion: "cancelarDepositoBarril", cliente: clienteDeposito, monto: montoCancelar })
      });
      await fetch(URL_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          accion: "registrarMovimientoBarril",
          movimiento: {
            fecha: new Date().toLocaleString("es-AR"),
            accion: "CANCELACIÓN DE DEPÓSITO",
            cliente: clienteDeposito,
            tipo: barril.tipo, tamano: barril.tamano, serie: barril.serie,
            deposito: montoCancelar,
            observaciones: montoCancelar < Number(barril.deposito) ? "Cancelación parcial del depósito" : "Cancelación total del depósito"
          }
        })
      }).catch(() => {});
      await fetch(URL_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          accion: "guardarAuditoria",
          registro: {
            fecha: new Date().toLocaleString("es-AR"),
            accion: "CANCELACIÓN DEPÓSITO BARRIL",
            usuario: "",
            cliente: clienteDeposito,
            detalle: `${barril.tipo} (${barril.tamano}) serie ${barril.serie || "-"}`,
            monto: montoCancelar
          }
        })
      }).catch(() => {});
    }

    await cargarBarriles();
    await cargarHistorial();
    await actualizarEstadisticas();
    alert("Barril devuelto correctamente." + (tieneDepositoEnCartera && montoCancelar > 0 ? `\n💰 Se canceló $${montoCancelar.toLocaleString("es-AR")} del depósito en la cuenta de ${clienteDeposito}.` : ""));
  } catch (err) {
    console.error(err);
    alert("Error procesando la devolución.");
  }
};

// 🟢 NUEVO: BORRAR BARRIL (Mantiene historial)
window.borrarBarrilDefinitivo = async function(idBarril, tipo, tamano, serie) {
  if (!confirm("⚠️ ¿Borrar este barril del inventario?\nEl registro se conservará en el Historial de Movimientos.")) return;

  try {
    // 1. Registrar en historial que se borró
    await fetch(URL_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        accion: "registrarMovimientoBarril",
        movimiento: {
          fecha: new Date().toLocaleString("es-AR"),
          accion: "BAJA DE INVENTARIO",
          cliente: "—",
          tipo: tipo, tamano: tamano, serie: serie,
          deposito: 0, observaciones: "Barril eliminado del stock activo"
        }
      })
    });

    // 2. Borrar de la hoja principal
    const resp = await fetch(URL_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ accion: "borrarBarril", id: idBarril })
    });
    const texto = await resp.text();
    if (!texto.includes("OK")) throw new Error(texto);

    await cargarBarriles();
    await cargarHistorial();
    await actualizarEstadisticas();
    alert("Barril eliminado del inventario.");
  } catch (err) {
    console.error(err);
    alert("Error al borrar el barril.");
  }
};
