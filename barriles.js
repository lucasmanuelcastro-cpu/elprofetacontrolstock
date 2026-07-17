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
        <div>
          ${
            b.estado === "prestado"
              ? `<button class="btn-devolver" onclick="devolverBarril('${b.id}')">Devolver</button>`
              : `<button class="filtro-btn active" style="background:#10b981; color:white; border-color:#10b981; font-weight:bold;" onclick="abrirModalPrestamoConDatos('${b.id}', '${b.serie || ''}', '${b.tamano || ''}')">➕ Prestar</button>`
          }
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
  document.getElementById("id-barril-prestamo").value = ""; // Limpiar ID oculto
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
  // Cerrar modales clickeando fuera
  document.getElementById("modal-prestamo")?.addEventListener("click", (e) => { if (e.target.id === "modal-prestamo") cerrarModalPrestamo(); });
  document.getElementById("modal-agregar")?.addEventListener("click", (e) => { if (e.target.id === "modal-agregar") cerrarModalAgregar(); });

  // Submit Agregar Barril
  document.getElementById("form-agregar")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tipo = document.getElementById("add-tipo-barril").value.trim();
    const tamano = document.getElementById("add-tamano-barril").value;
    const serie = document.getElementById("add-serie-barril").value.trim();
    const obs = document.getElementById("add-obs-barril").value.trim();
    
    if (!tamano) return alert("Seleccioná un tamaño.");

    const barril = {
      id: Date.now().toString(),
      cliente: "",
      tipo: tipo || "Cerveza General",
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

  // Submit Prestar Barril
  document.getElementById("form-prestamo")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await prestarBarril();
  });
}

// ===== PRESTAR BARRIL (Corregido para actualizar si ya existe) =====
async function prestarBarril() {
  const idExistente = document.getElementById("id-barril-prestamo").value;
  const cliente = document.getElementById("cliente-barril").value.trim();
  const tipo = document.getElementById("tipo-barril").value.trim();
  const tamano = document.getElementById("tamano-barril").value;
  const serie = document.getElementById("serie-barril").value.trim();
  const deposito = document.getElementById("deposito-barril").value;
  const observaciones = document.getElementById("obs-barril").value.trim();

  if (!tamano) return alert("Completá al menos el Tamaño.");

  const barril = {
    id: idExistente || Date.now().toString(), // Usa ID viejo si existe, sino crea nuevo
    cliente: cliente || "Consumidor Final",
    tipo: tipo || "Cerveza General",
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
    // Si tiene ID existente, actualiza. Si no, guarda nuevo.
    const accion = idExistente ? "actualizarBarril" : "guardarBarril";
    const resp = await fetch(URL_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ accion, barril })
    });
    const texto = await resp.text();
    if (!texto.includes("OK")) throw new Error(texto);

    // Registrar en historial
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

    cerrarModalPrestamo();
    await cargarBarriles();
    await cargarHistorial();
    await actualizarEstadisticas();
    alert("Préstamo registrado exitosamente.");
  } catch (err) {
    console.error(err);
    alert("Error al guardar préstamo.");
  }
}

// ===== DEVOLVER BARRIL (Corregido el bug de comparación de ID) =====
window.devolverBarril = async function(idBarril) {
  // FIX: Convertimos ambos a String para que la comparación funcione siempre
  const barril = barriles.find(b => String(b.id) === String(idBarril));
  if (!barril) return alert("Error: No se encontró el barril.");

  let usuarioEntrega = prompt(`¿Quién devuelve este barril?`, barril.cliente || "");
  if (usuarioEntrega === null) return; // Canceló

  try {
    const actualizado = {
      ...barril,
      cliente: "", // Vaciamos el cliente porque ya volvió al depósito
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

    // Guardar movimiento
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

    await cargarBarriles();
    await cargarHistorial();
    await actualizarEstadisticas();
    alert("Barril devuelto correctamente.");
  } catch (err) {
    console.error(err);
    alert("Error procesando la devolución.");
  }
};
