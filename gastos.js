/**
 * GASTOS.JS - Módulo independiente para Control de Gastos
 * No depende de ui.js ni logic.js. Habla directo con AppScript.
 */

// ⚠️ REEMPLAZÁ CON TU URL REAL DE GOOGLE APPS SCRIPT
const URL_SCRIPT = "https://script.google.com/macros/s/TU_ID_DE_PROYECTO/exec";

// Estado local
let gastos = [];
let datosApp = null; // Stock, finanzas, etc.

// Utilidades
const fmt = (n) => n ? "$" + Math.round(n).toLocaleString("es-AR") : "$0";
const esc = (str) => String(str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Traer datos generales (stock, finanzas) y gastos en paralelo
    const [resGeneral, resGastos] = await Promise.all([
      fetch(URL_SCRIPT),
      fetch(`${URL_SCRIPT}?accion=leerGastos`)
    ]);

    datosApp = await resGeneral.json();
    const dataGastos = await resGastos.json();
    gastos = dataGastos.gastos || [];

    renderAll();
    bindEvents();
  } catch (err) {
    console.error("❌ Error cargando gastos:", err);
    document.getElementById("historial-gastos").innerHTML = 
      `<p class="loading" style="color:#ef4444;">Error de conexión. Verificá la URL del script.</p>`;
  }
});

function renderAll() {
  renderStock();
  renderFinanzas();
  renderHistorial();
  calcularTotales();
}

// Render Stock
function renderStock() {
  const cont = document.getElementById("stock-table");
  if (!datosApp || !datosApp.stockGeneral) return cont.innerHTML = "<p class='loading'>—</p>";
  
  const estilos = ["BLONDE", "IRISH RED", "STOUT", "SESSION IPA", "RED IPA", "HONEY"];
  let html = `<table style="width:100%; border-collapse:collapse; margin-top:10px;">
    <thead><tr style="border-bottom:2px solid #eee; text-align:left; font-size:0.9em; color:#666;">
      <th style="padding:6px;">Estilo</th><th style="padding:6px; text-align:center;">C/E</th>
      <th style="padding:6px; text-align:center;">S/E</th><th style="padding:6px; text-align:center;">Total</th>
    </tr></thead><tbody>`;

  estilos.forEach(e => {
    const ce = datosApp.stockGeneral[e] || 0;
    const se = 0; // Ajustar si tu sheet maneja S/E en otra columna
    const tot = ce + se;
    html += `<tr style="border-bottom:1px solid #f5f5f5;">
      <td style="padding:6px;">${e}</td>
      <td style="padding:6px; text-align:center;">${ce}</td>
      <td style="padding:6px; text-align:center; color:#999;">${se || "—"}</td>
      <td style="padding:6px; text-align:center; font-weight:bold;">${tot}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  cont.innerHTML = html;
}

// Render Finanzas (4 cards)
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
    <div class="card">
      <div style="font-size:0.85em; color:#666; margin-bottom:4px;">${c.label}</div>
      <div class="big-number" style="color:${c.color};">${fmt(c.val)}</div>
    </div>
  `).join("");
}

// Render Historial
function renderHistorial() {
  const cont = document.getElementById("historial-gastos");
  if (gastos.length === 0) {
    cont.innerHTML = '<p class="loading">No hay gastos registrados</p>';
    return;
  }

  cont.innerHTML = gastos.map(g => `
    <div class="historial-item">
      <div>
        <strong>${esc(g.item)}</strong>
        <div style="font-size:0.8em; color:#666;">${esc(g.obs) || "Sin observación"}</div>
        <small style="color:#999;">${g.fecha || ""}</small>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-weight:bold; color:#ef4444;">-${fmt(g.monto)}</span>
        <button class="btn-delete" data-id="${g.idFila}">🗑️</button>
      </div>
    </div>
  `).join("");
}

// Cálculos
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
  // Agregar
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
        body: JSON.stringify({ accion: "guardarGasto", gasto: { item, monto, obs, fecha: new Date().toISOString() } })
      });
      if ((await res.text()).includes("OK")) {
        document.getElementById("gasto-item").value = "";
        document.getElementById("gasto-monto").value = "";
        document.getElementById("gasto-obs").value = "";
        await cargarGastosActualizados();
      } else {
        alert("Error al guardar en Sheet.");
      }
    } catch (e) { alert("Error de conexión"); }
    finally { btn.disabled = false; btn.textContent = "✅ Guardar"; }
  });

  // Eliminar (delegación de eventos)
  document.getElementById("historial-gastos").addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-delete");
    if (!btn) return;
    const idFila = btn.dataset.id;
    if (!confirm("¿Eliminar este gasto?")) return;

    try {
      const res = await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify({ accion: "borrarGasto", idFila: idFila })
      });
      if ((await res.text()).includes("OK")) {
        await cargarGastosActualizados();
      } else {
        alert("No se pudo borrar. Verificá permisos del Sheet.");
      }
    } catch (err) { alert("Error al borrar."); }
  });
}

// Refrescar solo gastos tras guardar/borrar
async function cargarGastosActualizados() {
  try {
    const res = await fetch(`${URL_SCRIPT}?accion=leerGastos`);
    const data = await res.json();
    gastos = data.gastos || [];
    renderHistorial();
    calcularTotales();
  } catch (e) { console.error(e); }
}
