/**
 * BARRILES.JS
 * El Profeta
 * Versión corregida para barriles.html
 */

const URL_SCRIPT =
  "https://script.google.com/macros/s/AKfycbwTgEcDR_8OkM1mZaSchH7wGJjuST8lV1JMQ0sbXnH2r8rohwn7CJEZhU0Kmx-_31q3NQ/exec";

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

  const container =
    document.getElementById(
      "lista-barriles"
    );

  if (!container) return;

  let lista = [...barriles];

  if (filtroActual === "prestado") {
    lista =
      lista.filter(
        b => b.estado === "prestado"
      );
  }

  if (filtroActual === "disponible") {
    lista =
      lista.filter(
        b => b.estado === "disponible"
      );
  }

  if (!lista.length) {

    container.innerHTML = `
      <div class="empty-state">
        No hay barriles registrados
      </div>
    `;

    return;
  }

  container.innerHTML =
    lista.map(b => {

      return `
      <div class="barril-item">

        <div class="barril-header">

          <div>

            <div class="barril-tipo">
              ${b.tipo}
              ${b.tamano}
            </div>

            <div class="barril-cliente">
              ${b.cliente || "-"}
            </div>

          </div>

          <div>

            ${
              b.estado === "prestado"
                ? `
                <button
                  class="btn-devolver"
                  onclick="devolverBarril('${b.id}')">
                  Devolver
                </button>
                `
                : `
                <span
                  style="color:green;font-weight:bold;">
                  Disponible
                </span>
                `
            }

          </div>

        </div>
        <div>

          ${
            b.serie
              ? `
              <div>
                <strong>Serie:</strong>
                ${b.serie}
              </div>
              `
              : ""
          }

          ${
            b.deposito
              ? `
              <div>
                <strong>Depósito:</strong>
                $${Number(
                  b.deposito || 0
                ).toLocaleString("es-AR")}
              </div>
              `
              : ""
          }

          ${
            b.fechaPrestamo
              ? `
              <div class="barril-fecha">
                Prestado:
                ${b.fechaPrestamo}
              </div>
              `
              : ""
          }

          ${
            b.observaciones
              ? `
              <div
                style="
                  margin-top:8px;
                  color:#666;
                  font-style:italic;
                ">
                ${b.observaciones}
              </div>
              `
              : ""
          }

        </div>

      </div>
      `;
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

  const cliente =
    document
      .getElementById(
        "cliente-barril"
      )
      .value
      .trim();

  const tipo =
    document
      .getElementById(
        "tipo-barril"
      )
      .value;

  const tamano =
    document
      .getElementById(
        "tamano-barril"
      )
      .value;

  const serie =
    document
      .getElementById(
        "serie-barril"
      )
      .value
      .trim();

  const deposito =
    document
      .getElementById(
        "deposito-barril"
      )
      .value;

  const observaciones =
    document
      .getElementById(
        "obs-barril"
      )
      .value
      .trim();
    if (!cliente || !tipo || !tamano) {

    alert(
      "Completá Cliente, Tipo y Tamaño"
    );

    return;
  }

  const btn =
    document.querySelector(
      "#form-prestamo button[type='submit']"
    );

  if (btn) {

    btn.disabled = true;
    btn.textContent =
      "Guardando...";
  }

  try {

    const barril = {

      id: Date.now().toString(),

      cliente,

      tipo,

      tamano,

      serie:
        serie || "",

      deposito:
        Number(deposito) || 0,

      observaciones,

      estado: "prestado",

      fechaPrestamo:
        new Date()
          .toLocaleString(
            "es-AR"
          ),

      fechaDevolucion: "",

      timestamp:
        Date.now()
    };

    const resp =
      await fetch(
        URL_SCRIPT,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain"
          },

          body:
            JSON.stringify({
              accion:
                "guardarBarril",
              barril
            })
        }
      );

    const texto =
      await resp.text();

    if (
      !texto.includes("OK")
    ) {

      throw new Error(
        texto
      );
    }

    await fetch(
      URL_SCRIPT,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain"
        },

        body:
          JSON.stringify({

            accion:
              "registrarMovimientoBarril",

            movimiento: {

              fecha:
                new Date()
                  .toLocaleString(
                    "es-AR"
                  ),

              accion:
                "PRÉSTAMO",

              cliente,

              tipo,

              tamano,

              serie,

              deposito:
                Number(
                  deposito
                ) || 0,

              observaciones
            }
          })
      }
    );

    cerrarModalPrestamo();

    await cargarBarriles();

    await cargarHistorial();

    await actualizarEstadisticas();

    alert(
      "Barril guardado correctamente"
    );

  } catch (err) {

    console.error(err);

    alert(
      "Error al guardar barril"
    );

  } finally {

    if (btn) {

      btn.disabled = false;

      btn.textContent =
        "Confirmar Préstamo";
    }
  }
}

// ====================================
// DEVOLVER BARRIL
// ====================================

window.devolverBarril =
async function(idBarril) {

  if (
    !confirm(
      "¿Confirmar devolución?"
    )
  ) {
    return;
  }

  const barril =
    barriles.find(
      b => b.id === idBarril
    );

  if (!barril) return;

  try {

    const actualizado = {

      ...barril,

      estado:
        "disponible",

      fechaDevolucion:
        new Date()
          .toLocaleString(
            "es-AR"
          )
    };

    const resp =
      await fetch(
        URL_SCRIPT,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain"
          },

          body:
            JSON.stringify({

              accion:
                "actualizarBarril",

              barril:
                actualizado
            })
        }
      );

    const texto =
      await resp.text();

    if (
      !texto.includes("OK")
    ) {

      throw new Error(
        texto
      );
    }

    await fetch(
      URL_SCRIPT,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain"
        },

        body:
          JSON.stringify({

            accion:
              "registrarMovimientoBarril",

            movimiento: {

              fecha:
                new Date()
                  .toLocaleString(
                    "es-AR"
                  ),

              accion:
                "DEVOLUCIÓN",

              cliente:
                barril.cliente,

              tipo:
                barril.tipo,

              tamano:
                barril.tamano,

              serie:
                barril.serie,

              deposito:
                barril.deposito,

              observaciones:
                barril.observaciones
            }
          })
      }
    );

    await cargarBarriles();

    await cargarHistorial();

    await actualizarEstadisticas();

    alert(
      "Barril devuelto correctamente"
    );

  } catch (err) {

    console.error(err);

    alert(
      "Error al devolver barril"
    );
  }
};

// ====================================
// FIN
// ====================================
      
