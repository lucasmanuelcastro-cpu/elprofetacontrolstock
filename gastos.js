/**
 * GASTOS.JS - Módulo 100% independiente
 * No depende de ui.js ni logic.js. Habla directo con AppScript.
 */

// La URL_SCRIPT ahora se define una sola vez en config.js

let gastos = [];
let datosApp = null;

// Utilidades
const fmt = (n) => n ? "$" + Math.round(n).toLocaleString("es-AR") : "$0";
const esc = (str) => String(str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Traemos finanzas generales y gastos en paralelo
    const [resGeneral, resGastos] = await Promise.all([
      fetch(`${URL_SCRIPT}?v=${Date.now()}`, { mode: "cors", cache: "no-cache" }),
      fetch(`${URL_SCRIPT}?accion=leerGastos&v=${Date.now()}`, { mode: "cors", cache: "no-cache" })
    ]);

    datosApp = await resGeneral.json();
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
  renderFinanzas();
  renderHistorial();
  calcularTotales();
}

// Render 4 cards financieras
function renderFinanzas() {
  const cont = document.getElementById("finanzas-container");
  if (!datosApp) return;
  
  const cards = [
    { label: "💵 Efectivo", val: datosApp.efectivoSheet, color: "#059669" },
    { label: "🏦 Transferencia", val: datosApp.transferenciaSheet, color: "#2563eb" },
    { label: "💰 Total Ingresado", val: datosApp.totalIngresadoSheet, color: "#3b82f6" },
    { label: "👑 Para El Profeta", val: datosApp.paraProfetaSheet, color: "#7c3aed" }
  ];

  cont.innerHTML = cards.map(c => `
    <div class="card" style="padding:15px;">
      <div style="font-size:0.85em; color:#666;">${c.label}</div>
      <div style="font-size:20px; font-weight:bold; color:${c.color}; margin-top:4px;">${fmt(c.val)}</div>
    </div>
  `).join("");
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
  document.getElementById("total-gastado").textContent = fmt(total);
  document.getElementById("cantidad-gastos").textContent = `${gastos.length} gasto${gastos.length !== 1 ? "s" : ""}`;

  const profeta = Number(datosApp?.paraProfetaSheet) || 0;
  const equilibrio = profeta - total;
  const eqEl = document.getElementById("punto-equilibrio");
  eqEl.textContent = fmt(equilibrio);
  eqEl.style.color = equilibrio >= 0 ? "#10b981" : "#ef4444";
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
        body: JSON.stringify({ accion: "guardarGasto", gasto: { item, monto, obs, fecha: new Date().toISOString() } })
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
