/**
 * GASTOS.JS - Módulo 100% independiente
 * No depende de ui.js ni logic.js. Habla directo con AppScript.
 */

let gastos = [];

// Utilidades
const fmt = (n) => n ? "$" + Math.round(n).toLocaleString("es-AR") : "$0";
const esc = (str) => String(str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Como ya no mostramos las tarjetas financieras acá, pedimos solo los gastos
    const resGastos = await fetch(`${URL_SCRIPT}?accion=leerGastos&v=${Date.now()}`, { mode: "cors", cache: "no-cache" });

    const dataGastos = await resGastos.json();
    gastos = dataGastos.gastos || [];

    renderAll();
    bindEvents();
  } catch (err) {
    console.error("❌ Error cargando gastos:", err);
    document.getElementById("historial-gastos").innerHTML = 
      `<p style="color:#ef4444; text-align:center;">Error de conexión. Verificá la URL del script.</p>`;
  }
});

function renderAll() {
  // Sacamos renderFinanzas() porque no lo necesitamos más en esta pantalla
  renderHistorial();
  calcularTotales();
}

// Render lista de gastos
function renderHistorial() {
  const cont = document.getElementById("historial-gastos");
  if (gastos.length === 0) {
    cont.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">No hay gastos registrados</p>';
    return;
  }

  cont.innerHTML = gastos.map(g => `
    <div class="historial-item">
      <div>
        <strong style="font-size:1em;">${esc(g.item)}</strong>
        <div style="font-size:0.8em; color:#666;">${esc(g.obs) || "Sin observación"}</div>
        <small style="color:#999;">${g.fecha || ""}</small>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-weight:bold; color:#ef4444; font-size:1.1em;">-${fmt(g.monto)}</span>
        <button class="btn-delete" data-id="${g.idFila}">🗑️ Borrar</button>
      </div>
    </div>
  `).join("");
}

// Cálculos en vivo
function calcularTotales() {
  const total = gastos.reduce((s, g) => s + (Number(g.monto) || 0), 0);
  const totalEl = document.getElementById("total-gastado");
  if (totalEl) totalEl.textContent = fmt(total);
  
  const cantEl = document.getElementById("cantidad-gastos");
  if (cantEl) cantEl.textContent = `${gastos.length} gasto${gastos.length !== 1 ? "s" : ""}`;
}


// Eventos
function bindEvents() {
  // AGREGAR
  document.getElementById("btn-agregar-gasto").addEventListener("click", async () => {
    const item = document.getElementById("gasto-item").value.trim();
    const monto = parseFloat(document.getElementById("gasto-monto").value);
    const obs = document.getElementById("gasto-obs").value.trim();
    const btn = document.getElementById("btn-agregar-gasto");

    if (!item || !monto || monto <= 0) return alert("Completá ITEM y TOTAL correctamente.");

    btn.disabled = true; btn.textContent = "⏳ Guardando...";
    try {
      const res = await fetch(URL_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        mode: "cors",
        body: JSON.stringify({ 
          accion: "guardarGasto", 
          gasto: { 
            item, 
            monto, 
            obs, 
            fecha: new Date().toLocaleString("es-AR"),
            timestamp: Date.now() // <--- Agregado para el filtro del Nuevo Ciclo
          } 
        })
      });
      if ((await res.text()).includes("OK")) {
        document.getElementById("gasto-item").value = "";
        document.getElementById("gasto-monto").value = "";
        document.getElementById("gasto-obs").value = "";
        await cargarGastosActualizados();
      } else { alert("Error al guardar en Sheet."); }
    } catch (e) { alert("Error de conexión"); }
    finally { btn.disabled = false; btn.textContent = "✅ Guardar"; }
  });

  // BORRAR
  document.getElementById("historial-gastos").addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-delete");
    if (!btn) return;
    const idFila = btn.dataset.id;
    if (!confirm("¿Eliminar este gasto? Esta acción no se puede deshacer.")) return;

    try {
      const res = await fetch(URL_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        mode: "cors",
        body: JSON.stringify({ accion: "borrarGasto", idFila: idFila })
      });
      if ((await res.text()).includes("OK")) {
        await cargarGastosActualizados();
      } else { alert("No se pudo borrar. Verificá permisos."); }
    } catch (err) { alert("Error al borrar."); }
  });
}

// Refresco rápido tras guardar/borrar
async function cargarGastosActualizados() {
  try {
    const res = await fetch(`${URL_SCRIPT}?accion=leerGastos`);
    const data = await res.json();
    gastos = data.gastos || [];
    renderHistorial();
    calcularTotales();
  } catch (e) { console.error(e); }
}
