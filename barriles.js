/**
 * BARRILES.JS
 * El Profeta
 * Versión corregida para barriles.html
 */

// La URL_SCRIPT ahora se define una sola vez en config.js

let barriles = [];
let historial = [];
let filtroActual = "todos";

document.addEventListener("DOMContentLoaded", () => {
  cargarBarriles();
  cargarHistorial();
  actualizarEstadisticas();
  bindEvents();
});

// ====================================
// CARGAR BARRILES
// ====================================

async function cargarBarriles() {
  try {
    const resp = await fetch(`${URL_SCRIPT}?accion=leerBarriles`);
    const data = await resp.json();

    barriles = data.barriles || [];

    renderListaBarriles();
    actualizarEstadisticas();

  } catch (err) {

    console.error(err);

    const contenedor =
      document.getElementById("lista-barriles");

    if (contenedor) {
      contenedor.innerHTML =
        `<p style="color:red;text-align:center">
          Error cargando barriles
        </p>`;
    }
  }
}

// ====================================
// CARGAR HISTORIAL
// ====================================

async function cargarHistorial() {
  try {

    const resp =
      await fetch(
        `${URL_SCRIPT}?accion=leerHistorialBarriles`
      );

    const data = await resp.json();

    historial = data.historial || [];

    renderHistorial();

  } catch (err) {

    console.error(err);

    const contenedor =
      document.getElementById("historial-barriles");

    if (contenedor) {
      contenedor.innerHTML =
        `<p style="color:red;text-align:center">
          Error cargando historial
        </p>`;
    }
  }
}

// ====================================
// ESTADISTICAS
// ====================================

async function actualizarEstadisticas() {

  try {

    const resp =
      await fetch(
        `${URL_SCRIPT}?accion=estadisticasBarriles`
      );

    const stats = await resp.json();

    const total =
      document.getElementById(
        "total-barriles"
      );

    const prestados =
      document.getElementById(
        "prestados-count"
      );

    const disponibles =
      document.getElementById(
        "disponibles-count"
      );

    if (total)
      total.textContent =
        stats.total || 0;

    if (prestados)
      prestados.textContent =
        stats.prestados || 0;

    if (disponibles)
      disponibles.textContent =
        stats.disponibles || 0;

  } catch (err) {
    console.error(err);
  }
}

// ====================================
// FILTROS
// ====================================

window.filtrarBarriles = function (tipo) {

  filtroActual = tipo;

  document
    .querySelectorAll(".filtro-btn")
    .forEach(btn => {

      btn.classList.remove("active");

      if (
        btn.dataset.filtro === tipo
      ) {
        btn.classList.add("active");
      }
    });

  renderListaBarriles();
};

// ====================================
// RENDER BARRILES
// ====================================

function renderListaBarriles() {
  const container = document.getElementById("lista-barriles");
  if (!container) return;

  let lista = [...barriles];

  if (filtroActual === "prestado") {
    lista = lista.filter(b => b.estado === "prestado");
  }
  if (filtroActual === "disponible") {
    lista = lista.filter(b => b.estado === "disponible");
  }

  if (!lista.length) {
    container.innerHTML = `<div class="empty-state">No hay barriles registrados</div>`;
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
              : `<button class="filtro-btn active" style="background:#10b981; color:white; border-color:#10b981; font-weight:bold;" onclick="abrirModalPrestamoConDatos('${b.serie || ''}', '${b.tamano || ''}')">➕ Prestar</button>`
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

// ====================================
// RENDER HISTORIAL
// ====================================

function renderHistorial() {

  const container =
    document.getElementById(
      "historial-barriles"
    );

  if (!container) return;

  if (!historial.length) {

    container.innerHTML = `
      <div class="empty-state">
        Sin movimientos
      </div>
    `;

    return;
  }

  container.innerHTML =
    historial
      .slice()
      .reverse()
      .map(item => {

        return `
        <div class="historial-item">

          <div>
            <strong>
              ${item.accion}
            </strong>
          </div>

          <div>
            Cliente:
            ${item.cliente}
          </div>

          <div>
            ${item.tipo}
            ${item.tamano}
          </div>

          ${
            item.serie
              ? `
              <div>
                Serie:
                ${item.serie}
              </div>
              `
              : ""
          }

          ${
            item.deposito
              ? `
              <div>
                Depósito:
                $${Number(
                  item.deposito
                ).toLocaleString("es-AR")}
              </div>
              `
              : ""
          }

          <div class="historial-fecha">
            ${item.fecha}
          </div>

        </div>
        `;
      })
      .join("");
}

// ====================================
// MODAL
// ====================================

window.abrirModalPrestamo =
function () {

  const modal =
    document.getElementById(
      "modal-prestamo"
    );

  if (!modal) return;

  modal.style.display = "flex";

  setTimeout(() => {

    const input =
      document.getElementById(
        "cliente-barril"
      );

    if (input)
      input.focus();

  }, 100);
};

window.cerrarModalPrestamo =
function () {

  const modal =
    document.getElementById(
      "modal-prestamo"
    );

  if (modal)
    modal.style.display = "none";

  const form =
    document.getElementById(
      "form-prestamo"
    );

  if (form)
    form.reset();
};

// ====================================
// EVENTOS
// ====================================

function bindEvents() {

  const modal =
    document.getElementById(
      "modal-prestamo"
    );

  if (modal) {

    modal.addEventListener(
      "click",
      (e) => {

        if (e.target === modal) {
          cerrarModalPrestamo();
        }
      }
    );
  }

  const form =
    document.getElementById(
      "form-prestamo"
    );

  if (form) {

    form.addEventListener(
      "submit",
      async (e) => {

        e.preventDefault();

        await prestarBarril();
      }
    );
  }
}

// ====================================
// PRESTAR BARRIL
// ====================================

async function prestarBarril() {
  const cliente = document.getElementById("cliente-barril").value.trim();
  const tipo = document.getElementById("tipo-barril").value.trim();
  const tamano = document.getElementById("tamano-barril").value;
  const serie = document.getElementById("serie-barril").value.trim();
  const deposito = document.getElementById("deposito-barril").value;
  const observaciones = document.getElementById("obs-barril").value.trim();

  // REEMPLAZAR LA VALIDACIÓN VIEJA POR ESTA:
  if (!tamano) {
    alert("Completá al menos el Tamaño del barril (Litros).");
    return;
  }

  const btn = document.querySelector("#form-prestamo button[type='submit']");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Guardando...";
  }

  try {
    // Si van vacíos, les asignamos un genérico para que no quede horrible en el historial
    const barril = {
      id: Date.now().toString(),
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

    const resp = await fetch(URL_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ accion: "guardarBarril", barril })
    });

    const texto = await resp.text();
    if (!texto.includes("OK")) throw new Error(texto);

    // Registro en el historial
    await fetch(URL_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        accion: "registrarMovimientoBarril",
        movimiento: {
          fecha: new Date().toLocaleString("es-AR"),
          accion: "PRÉSTAMO",
          cliente: barril.cliente,
          tipo: barril.tipo,
          tamano: barril.tamano,
          serie: barril.serie,
          deposito: barril.deposito,
          observaciones: barril.observaciones
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
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Confirmar Préstamo";
    }
  }
}

// ====================================
// DEVOLVER BARRIL
// ====================================

window.devolverBarril = async function(idBarril) {
  const barril = barriles.find(b => b.id === idBarril);
  if (!barril) return;

  // Cuadro para modificar/confirmar quién devuelve
  let usuarioEntrega = prompt("¿Quién está haciendo la devolución de este barril?", barril.cliente || "");
  if (usuarioEntrega === null) return; // Si toca cancelar, frena la ejecución

  try {
    const actualizado = {
      ...barril,
      cliente: usuarioEntrega.trim() || barril.cliente,
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

    // Guardar el movimiento en la hoja de historial
    await fetch(URL_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        accion: "registrarMovimientoBarril",
        movimiento: {
          fecha: new Date().toLocaleString("es-AR"),
          accion: "DEVOLUCIÓN",
          cliente: usuarioEntrega.trim() || barril.cliente,
          tipo: barril.tipo,
          tamano: barril.tamano,
          serie: barril.serie,
          deposito: barril.deposito,
          observaciones: barril.observaciones
        }
      })
    });

    await cargarBarriles();
    await cargarHistorial();
    await actualizarEstadisticas();
    alert("Barril devuelto correctamente.");
  } catch (err) {
    console.error(err);
    alert("Error procesando la devolución del barril.");
  }
};

// ====================================
// AUTORELLENADO
// ====================================

window.abrirModalPrestamoConDatos = function(serie, tamano) {
  window.abrirModalPrestamo();
  setTimeout(() => {
    if (serie) document.getElementById("serie-barril").value = serie;
    if (tamano) document.getElementById("tamano-barril").value = tamano;
  }, 150);
};

// ====================================
// FIN
// ====================================
      
