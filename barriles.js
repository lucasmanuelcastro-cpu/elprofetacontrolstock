/**
 * BARRILES.JS - Control de préstamos de barriles
 * Versión limpia y funcional
 */

const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzFaSL2UsVfYM1KHxQQE87S4nAjCmJTwTqelh8qxPqqNpxvMo6Md0a2_hPsrvvZrKHRxQ/exec";

let barriles = [];
let historial = [];
let filtroActual = "todos";

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  cargarBarriles();
  cargarHistorial();
  actualizarEstadisticas();
  bindEvents();
});

// Cargar barriles desde Sheet
async function cargarBarriles() {
  try {
    const resp = await fetch(`${URL_SCRIPT}?accion=leerBarriles`);
    const data = await resp.json();
    barriles = data.barriles || [];
    renderListaBarriles();
    actualizarEstadisticas();
  } catch (err) {
    console.error("Error cargando barriles:", err);
    document.getElementById("lista-barriles").innerHTML =
      '<p style="color:#ef4444; text-align:center;">Error de conexión</p>';
  }
}

// Cargar historial
async function cargarHistorial() {
  try {
    const resp = await fetch(`${URL_SCRIPT}?accion=leerHistorialBarriles`);
    const data = await resp.json();
    historial = data.historial || [];
    renderHistorial();
  } catch (err) {
    console.error("Error cargando historial:", err);
    document.getElementById("historial-movimientos").innerHTML =
      '<p style="color:#ef4444; text-align:center;">Error de conexión</p>';
  }
}

// Actualizar estadísticas
async function actualizarEstadisticas() {
  try {
    const resp = await fetch(`${URL_SCRIPT}?accion=estadisticasBarriles`);
    const stats = await resp.json();

    const elTotal = document.getElementById("total-barriles");
    const elPrestados = document.getElementById("prestados");
    const elDisponibles = document.getElementById("disponibles");
    const elDepositos = document.getElementById("depositos-pendientes");

    if (elTotal) elTotal.textContent = stats.total || 0;
    if (elPrestados) elPrestados.textContent = stats.prestados || 0;
    if (elDisponibles) elDisponibles.textContent = stats.disponibles || 0;
    if (elDepositos) elDepositos.textContent = `$${Number(stats.depositosPendientes || 0).toLocaleString('es-AR')}`;
  } catch (err) {
    console.error("Error cargando estadísticas:", err);
  }
}

// Renderizar lista de barriles
function renderListaBarriles() {
  const container = document.getElementById("lista-barriles");
  if (!container) return;

  let filtrados = barriles;
  if (filtroActual === "prestados") {
    filtrados = barriles.filter(b => b.estado === "prestado");
  } else if (filtroActual === "disponibles") {
    filtrados = barriles.filter(b => b.estado === "disponible");
  }

  if (filtrados.length === 0) {
    container.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">No hay barriles registrados</p>';
    return;
  }

  container.innerHTML = filtrados.map(b => `
    <div style="background:white; border:1px solid #e5e7eb; border-radius:12px; padding:15px; margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:10px;">
        <div style="flex:1;">
          <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
            <span style="background:${b.estado === 'prestado' ? '#fef3c7' : '#d1fae5'}; color:${b.estado === 'prestado' ? '#92400e' : '#065f46'}; padding:4px 12px; border-radius:20px; font-size:0.85em; font-weight:600;">
              ${b.estado === 'prestado' ? '📤 Prestado' : '📦 Disponible'}
            </span>
            <span style="background:#e0e7ff; color:#3730a3; padding:4px 10px; border-radius:6px; font-size:0.85em;">
              ${b.tipo} - ${b.tamano}
            </span>
          </div>
          <div style="margin:8px 0;">
            <p style="margin:4px 0; color:#374151;"><strong>Cliente:</strong> ${b.cliente || '—'}</p>
            ${b.serie ? `<p style="margin:4px 0; color:#6b7280;"><strong>Serie:</strong> ${b.serie}</p>` : ''}
            ${b.deposito ? `<p style="margin:4px 0; color:#059669;"><strong>Depósito:</strong> $${Number(b.deposito).toLocaleString('es-AR')}</p>` : ''}
            ${b.fechaPrestamo ? `<p style="margin:4px 0; color:#6b7280; font-size:0.9em;"><strong>Fecha:</strong> ${b.fechaPrestamo}</p>` : ''}
            ${b.observaciones ? `<p style="margin:8px 0; color:#6b7280; font-size:0.9em; font-style:italic;">📝 ${b.observaciones}</p>` : ''}
          </div>
        </div>
        ${b.estado === 'prestado' ? `
          <button onclick="devolverBarril('${b.id}')" style="background:#059669; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-size:0.9em;">
            ✅ Devolver
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Renderizar historial
function renderHistorial() {
  const container = document.getElementById("historial-movimientos");
  if (!container) return;

  if (historial.length === 0) {
    container.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">No hay movimientos registrados</p>';
    return;
  }

  container.innerHTML = [...historial].reverse().map(h => `
    <div style="border-bottom:1px solid #e5e7eb; padding:10px 0; font-size:0.9em;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; flex-wrap:wrap; gap:4px;">
        <span style="font-weight:600;">${h.accion === 'PRÉSTAMO' ? '📤' : ''} ${h.accion}</span>
        <small style="color:#6b7280;">${h.fecha}</small>
      </div>
      <div style="color:#374151;">
        <strong>${h.cliente}</strong> - ${h.tipo} ${h.tamano}
        ${h.serie ? ` (Serie: ${h.serie})` : ''}
        ${h.deposito ? ` - Depósito: $${Number(h.deposito).toLocaleString('es-AR')}` : ''}
      </div>
      ${h.observaciones ? `<div style="color:#6b7280; font-size:0.85em; margin-top:4px;">📝 ${h.observaciones}</div>` : ''}
    </div>
  `).join('');
}

// Filtrar barriles (función global para el HTML)
window.filtrarBarriles = function(tipo) {
  filtroActual = tipo;

  // Actualizar botones activos
  document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.style.background = "#f3f4f6";
    btn.style.color = "#374151";
    btn.style.fontWeight = "normal";
  });
  const btnActivo = document.querySelector(`[data-filtro="${tipo}"]`);
  if (btnActivo) {
    btnActivo.style.background = "#1e40af";
    btnActivo.style.color = "white";
    btnActivo.style.fontWeight = "bold";
  }

  renderListaBarriles();
};

// Abrir modal (función global para el HTML)
window.abrirModalPrestamo = function() {
  const modal = document.getElementById("modal-prestar");
  if (modal) {
    modal.style.display = "flex";
    setTimeout(() => {
      const input = document.getElementById("input-cliente");
      if (input) input.focus();
    }, 100);
  }
};

// Cerrar modal (función global para el HTML)
window.cerrarModalPrestamo = function() {
  const modal = document.getElementById("modal-prestar");
  if (modal) modal.style.display = "none";
  const form = document.getElementById("form-prestar-barril");
  if (form) form.reset();
};

// Devolver barril (función global para el HTML)
window.devolverBarril = async function(idBarril) {
  if (!confirm("¿Confirmar devolución del barril?")) return;

  const barril = barriles.find(b => b.id === idBarril);
  if (!barril) return;

  try {
    const barrilActualizado = {
      ...barril,
      estado: "disponible",
      fechaDevolucion: new Date().toLocaleString("es-AR")
    };

    const resp = await fetch(URL_SCRIPT, {
      method: "POST",
      body: JSON.stringify({ accion: "actualizarBarril", barril: barrilActualizado }),
      headers: { "Content-Type": "text/plain" },
      mode: "cors"
    });

    if ((await resp.text()).includes("OK")) {
      // Registrar en historial
      await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify({
          accion: "registrarMovimientoBarril",
          movimiento: {
            fecha: new Date().toLocaleString("es-AR"),
            accion: "DEVOLUCIÓN",
            cliente: barril.cliente,
            tipo: barril.tipo,
            tamano: barril.tamano,
            serie: barril.serie || "",
            deposito: barril.deposito || 0,
            observaciones: barril.observaciones || ""
          }
        }),
        headers: { "Content-Type": "text/plain" },
        mode: "cors"
      });

      await cargarBarriles();
      await cargarHistorial();
      alert("✅ Barril devuelto correctamente");
    } else {
      alert("❌ Error al actualizar");
    }
  } catch (err) {
    console.error("Error:", err);
    alert("❌ Error de conexión");
  }
};

// Bind de eventos
function bindEvents() {
  // Cerrar modal al hacer click fuera
  const modal = document.getElementById("modal-prestar");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cerrarModalPrestamo();
    });
  }

  // Formulario
  const form = document.getElementById("form-prestar-barril");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await prestarBarril();
    });
  }
}

// Prestar barril
async function prestarBarril() {
  const cliente = document.getElementById("input-cliente").value.trim();
  const tipo = document.getElementById("select-tipo").value;
  const tamano = document.getElementById("select-tamano").value;
  const serie = document.getElementById("input-serie").value.trim();
  const deposito = document.getElementById("input-deposito").value;
  const observaciones = document.getElementById("input-observaciones").value.trim();

  if (!cliente || !tipo || !tamano) {
    alert("⚠️ Completá los campos obligatorios (Cliente, Tipo y Tamaño)");
    return;
  }

  const btn = document.querySelector("#form-prestar-barril button[type='submit']");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Guardando...";
  }

  try {
    const barril = {
      id: Date.now().toString(),
      cliente,
      tipo,
      tamano,
      serie: serie || null,
      deposito: Number(deposito) || 0,
      observaciones,
      estado: "prestado",
      fechaPrestamo: new Date().toLocaleString("es-AR"),
      fechaDevolucion: "",
      timestamp: Date.now()
    };

    const resp = await fetch(URL_SCRIPT, {
      method: "POST",
      body: JSON.stringify({ accion: "guardarBarril", barril }),
      headers: { "Content-Type": "text/plain" },
      mode: "cors"
    });

    if ((await resp.text()).includes("OK")) {
      // Registrar en historial
      await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify({
          accion: "registrarMovimientoBarril",
          movimiento: {
            fecha: new Date().toLocaleString("es-AR"),
            accion: "PRÉSTAMO",
            cliente,
            tipo,
            tamano,
            serie: serie || "",
            deposito: Number(deposito) || 0,
            observaciones
          }
        }),
        headers: { "Content-Type": "text/plain" },
        mode: "cors"
      });

      cerrarModalPrestamo();
      await cargarBarriles();
      await cargarHistorial();
      await actualizarEstadisticas();
      alert("✅ Barril prestado correctamente");
    } else {
      alert("❌ Error al guardar en Sheet");
    }
  } catch (err) {
    console.error("Error:", err);
    alert("❌ Error de conexión");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Confirmar Préstamo";
    }
  }
}
