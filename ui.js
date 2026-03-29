/**
 * UI.JS - Control de la interfaz visual
 */

function render() {
  renderStockGeneral();
  renderVentasGeneral();
  renderClientesGlobales();
  renderTransferencia();
  renderUsuarios();
  renderPanelUsuario();
}

// 1. STOCK Y POPULARIDAD
function renderStockGeneral() {
  const container = document.getElementById("stock-general-section");
  const stats = getEstadisticasVentas();
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div class="card">
        <h2>Stock General (Disponible)</h2>
        ${estilosBase.map(e => `
          <div class="flex space-between" style="padding: 4px 0; border-bottom: 1px solid #f3f4f6;">
            <span>${e}</span>
            <b style="color: ${(state.stockGeneral[e] || 0) < 0 ? '#ef4444' : '#1f2937'};">
              ${state.stockGeneral[e] || 0} un.
            </b>
          </div>
        `).join("")}
      </div>
      <div class="card" style="background: #f8fafc; border: 1px solid #e2e8f0;">
        <h2>Popularidad (% Ventas)</h2>
        ${Object.entries(stats.totalesPorEstilo).length === 0
          ? '<p style="color:gray; font-size: 0.9em;">Esperando primeras ventas...</p>'
          : Object.entries(stats.totalesPorEstilo)
              .sort((a, b) => b[1] - a[1])
              .map(([estilo, cant]) => {
                const porcentaje = ((cant / stats.granTotalLatas) * 100).toFixed(0);
                return `
                  <div class="flex space-between" style="padding: 4px 0; border-bottom: 1px solid #e2e8f0;">
                    <span>${estilo}</span>
                    <span style="color: #3b82f6; font-weight: bold;">${porcentaje}%</span>
                  </div>`;
              }).join("")
        }
        <div style="margin-top: 15px; text-align: right;">
          <small style="color: #64748b;">Total latas vendidas: <b>${stats.granTotalLatas}</b></small>
        </div>
      </div>
    </div>`;
}

// 2. VENTAS GENERALES
function renderVentasGeneral() {
  const container = document.getElementById("ventas-general-section");
  const dineroEfectivo = getTotalVentasPorMetodo("efectivo");
  const dineroTransferencia = getTotalVentasPorMetodo("transferencia");
  const dineroTotal = getTotalVentasDinero();
  const totalProfeta = getGananciaTotalProfeta();
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div class="card" style="border-left: 4px solid #059669;">
        <h2>💵 Dinero Ingresado (Efectivo)</h2>
        <p class="big-number" style="color: #059669;">$${dineroEfectivo.toLocaleString()}</p>
        <small>Ventas cobradas en efectivo</small>
      </div>
      <div class="card" style="border-left: 4px solid #2563eb;">
        <h2>🏦 Dinero Ingresado (Transferencia)</h2>
        <p class="big-number" style="color: #2563eb;">$${dineroTransferencia.toLocaleString()}</p>
        <small>Ventas cobradas por transferencia</small>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
      <div class="card" style="border-left: 4px solid #3b82f6;">
        <h2>💰 Total Ingresado</h2>
        <p class="big-number" style="color: #3b82f6;">$${dineroTotal.toLocaleString()}</p>
        <small>Efectivo + Transferencia</small>
      </div>
      <div class="card">
        <h2>Para El Profeta (Total)</h2>
        <p class="big-number" style="color: #059669;">$${totalProfeta.toLocaleString()}</p>
        <small>Costo + 50% Ganancia generada</small>
      </div>
    </div>`;
}

// 3. CARTERA DE CLIENTES (método de pago solo acá)
function renderClientesGlobales() {
  const container = document.getElementById("clientes-section");
  if (!container) return;
  const deudores = state.clientesGlobales.filter(c => (c.deuda - c.pagado) > 0);
  const deudaTotal = deudores.reduce((acc, c) => acc + (c.deuda - c.pagado), 0);
  container.innerHTML = `
    <div class="card" style="border-left: 5px solid #ef4444;">
      <div class="flex space-between">
        <h2>👥 Cartera de Clientes (Deudores)</h2>
        <b style="color: #ef4444;">Deuda Total: $${deudaTotal.toLocaleString()}</b>
      </div>
      <div style="max-height: 250px; overflow-y: auto; margin-top: 10px;">
        ${deudores.length === 0 ? '<p>No hay deudas pendientes</p>' :
          deudores.map((c) => {
            const idx = state.clientesGlobales.indexOf(c);
            return `
            <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
              <div class="flex space-between" style="flex-wrap: wrap; gap: 6px; align-items: center;">
                <span><b>${c.nombre}</b> (Debe: $${(c.deuda - c.pagado).toLocaleString()})</span>
                <div style="display:flex; gap:6px; align-items:center;">
                  <select id="metodo-cobro-${idx}" style="padding:4px 8px; border-radius:8px; border:1px solid #d1d5db; width:auto; margin-bottom:0;">
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">🏦 Transferencia</option>
                  </select>
                  <button onclick="registrarPagoCliente(${idx}, document.getElementById('metodo-cobro-${idx}').value)" style="background:#059669; padding:4px 10px;">Cobrar</button>
                </div>
              </div>
            </div>`;
          }).join("")}
      </div>
    </div>`;
}

// 4. PANEL DE USUARIO
function renderPanelUsuario() {
  const container = document.getElementById("panel-usuario-container");
  if (!state.usuarioActivo) { container.innerHTML = ""; return; }
  const usuario = state.usuarios[state.usuarioActivo];
  const preview = calcularPreview();

  container.innerHTML = `
    <div class="panel-usuario card">
      <h1 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Panel de ${state.usuarioActivo}</h1>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">

        <!-- STOCK PROPIO -->
        <div>
          <h3>📦 Stock Propio</h3>
          ${estilosBase.map(e => `
            <div class="flex space-between" style="margin-bottom: 5px; padding: 6px 8px; background: #f8fafc; border-radius: 8px;">
              <span>${e}</span>
              <b style="color: ${(usuario.stock[e] || 0) < 0 ? '#ef4444' : '#1e40af'};">${usuario.stock[e] || 0} un.</b>
            </div>`).join("")}
        </div>

        <!-- AGREGAR STOCK -->
        <div>
          <h3>➕ Agregar Stock</h3>
          ${estilosBase.map(e => `
            <div class="flex space-between" style="margin-bottom: 5px;">
              <span>${e}</span>
              <input type="number" data-agregar="${e}" placeholder="0" style="width: 80px;">
            </div>`).join("")}
          <button id="btn-agregar-stock" style="width:100%; margin-top:10px; background:#059669;">✅ Sumar al Stock</button>
          <button id="btn-reset-stock" style="width:100%; margin-top:6px; background:#ef4444;">Reset Stock</button>
        </div>

        <!-- REGISTRAR VENTA -->
        <div>
          <h3>🛒 Registrar Venta</h3>

          <!-- CLIENTE CON AUTOCOMPLETADO -->
          <div style="position: relative; margin-bottom: 10px;">
            <input type="text" id="cliente-nombre" placeholder="Nombre Cliente (Opcional)"
              value="${state.clienteNombre}" autocomplete="off" style="margin-bottom: 0; width: 100%;">
            <div id="sugerencias-cliente" style="
              position: absolute; top: 100%; left: 0; right: 0;
              background: white; border: 1px solid #d1d5db; border-top: none;
              border-radius: 0 0 8px 8px; max-height: 160px; overflow-y: auto;
              z-index: 999; display: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            "></div>
          </div>

          <!-- ESTILOS -->
          ${estilosBase.map(e => `
            <div class="flex space-between" style="margin-bottom: 5px;">
              <span>${e}</span>
              <input type="number" data-venta="${e}" value="${state.ventaActual[e] || ""}" placeholder="0" style="width: 80px;">
            </div>`).join("")}

          <!-- ALQUILER BARRIL -->
          <input type="text" id="alquiler-barril" placeholder="Alquiler barril (ej: HONEY 30Lts)"
            value="${state.alquilerBarril || ""}" style="margin-top: 6px;">

          <!-- CALCULADORA TOTAL A COBRAR -->
          <div style="margin-top: 8px; background: #1e293b; border-radius: 10px; padding: 10px;">
            <div id="calc-display" style="
              background: #0f172a; color: #f1f5f9; font-size: 1.3em; font-weight: bold;
              padding: 8px 12px; border-radius: 6px; text-align: right;
              min-height: 38px; margin-bottom: 8px; word-break: break-all;">
              ${state.totalCobradoInput || "0"}
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
              <button class="cbtn" onclick="calcPresionar('7')">7</button>
              <button class="cbtn" onclick="calcPresionar('8')">8</button>
              <button class="cbtn" onclick="calcPresionar('9')">9</button>
              <button class="cbtn cop" onclick="calcPresionar('/')">÷</button>

              <button class="cbtn" onclick="calcPresionar('4')">4</button>
              <button class="cbtn" onclick="calcPresionar('5')">5</button>
              <button class="cbtn" onclick="calcPresionar('6')">6</button>
              <button class="cbtn cop" onclick="calcPresionar('*')">×</button>

              <button class="cbtn" onclick="calcPresionar('1')">1</button>
              <button class="cbtn" onclick="calcPresionar('2')">2</button>
              <button class="cbtn" onclick="calcPresionar('3')">3</button>
              <button class="cbtn cop" onclick="calcPresionar('-')">−</button>

              <button class="cbtn" onclick="calcPresionar('0')">0</button>
              <button class="cbtn" onclick="calcPresionar('00')">00</button>
              <button class="cbtn" onclick="calcPresionar('.')">.</button>
              <button class="cbtn cop" onclick="calcPresionar('+')">+</button>

              <button class="cbtn cclr" onclick="calcPresionar('C')">C</button>
              <button class="cbtn cdel" onclick="calcPresionar('DEL')">⌫</button>
              <button class="cbtn ceq" onclick="calcPresionar('=')" style="grid-column: span 2;">=</button>
            </div>
          </div>
          <style>
            .cbtn { color:white; border:none; border-radius:6px; padding:10px 0; font-size:1em; font-weight:bold; cursor:pointer; background:#334155; }
            .cbtn:active { opacity: 0.7; }
            .cop  { background:#f59e0b; }
            .cclr { background:#ef4444; }
            .cdel { background:#64748b; }
            .ceq  { background:#2563eb; }
          </style>

          <!-- PREVIEW -->
          <div class="card" style="background:#fef3c7; border: 1px solid #f59e0b; margin-top: 10px;">
            <h4 style="margin-top:0;">Vista Previa Profeta</h4>
            <p style="margin: 5px 0;">Costo: $${preview.costoTotal.toLocaleString()}</p>
            <p style="margin: 5px 0;">Comisión (50%): $${preview.comision.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Total a Rendir: $${preview.paraProfeta.toLocaleString()}</strong></p>
          </div>

          <!-- BOTÓN REGISTRAR (solo local, no guarda en Sheet) -->
          <button id="btn-registrar" style="width:100%; margin-top:10px; background:#1e40af;">
            ✅ Registrar Venta
          </button>
        </div>
      </div>

      <hr>
      <div class="flex space-between">
        <h3>📜 Historial de Ventas</h3>
        <div>
          <!-- GUARDAR: sincroniza y manda al Sheet -->
          <button id="btn-guardar" style="background:#059669;">💾 Guardar en Sheet</button>
          <button id="btn-borrar" class="danger">Borrar Historial</button>
        </div>
      </div>
      <div id="historial-lista" style="margin-top: 15px;">
        ${usuario.ventas.length === 0 ? '<p>No hay ventas registradas</p>' :
          usuario.ventas.map((v) => `
          <div style="border-bottom:1px solid #eee; padding:10px 0; font-size: 0.9em;">
            <div class="flex space-between"><b>👤 ${v.cliente}</b> <small>📅 ${v.fecha}</small></div>
            <div style="color: #666; margin: 4px 0;">
              Pedido: ${Object.entries(v.estilos).filter(e => e[1]>0).map(e => `${e[1]} ${e[0]}`).join(", ")}
              <b style="color:#1e40af;">(${Object.values(v.estilos).reduce((a,b) => a+(Number(b)||0),0)} latas)</b>
            </div>
            <div>
              Cobrado: $${v.totalCobrado.toLocaleString()} | Comisión: $${v.comision.toLocaleString()} | 👑 Profeta: $${v.paraProfeta.toLocaleString()}
            </div>
          </div>`).reverse().join("")}
      </div>
    </div>`;

  bindPanelEventos();
  bindAutocompletadoCliente();
  bindCalculadora();
}

// 5. CALCULADORA
let calcExpr = "";

function bindCalculadora() {
  calcExpr = state.totalCobradoInput ? String(state.totalCobradoInput) : "";
}

function calcPresionar(tecla) {
  const display = document.getElementById("calc-display");
  if (!display) return;

  if (tecla === "C") {
    calcExpr = "";
  } else if (tecla === "DEL") {
    calcExpr = calcExpr.slice(0, -1);
  } else if (tecla === "=") {
    try {
      const resultado = Function('"use strict"; return (' + calcExpr + ')')();
      calcExpr = isFinite(resultado) ? String(Math.round(resultado * 100) / 100) : "0";
    } catch {
      calcExpr = "0";
    }
  } else {
    calcExpr += tecla;
  }

  display.textContent = calcExpr || "0";

  const val = parseFloat(calcExpr);
  if (!isNaN(val)) {
    state.totalCobradoInput = String(val);
  }
}

// 6. AUTOCOMPLETADO CLIENTE
function bindAutocompletadoCliente() {
  const input = document.getElementById("cliente-nombre");
  const sugerencias = document.getElementById("sugerencias-cliente");
  if (!input || !sugerencias) return;

  input.addEventListener("input", () => {
    const val = input.value.trim().toLowerCase();
    state.clienteNombre = input.value;
    if (val.length < 1) { sugerencias.style.display = "none"; return; }

    const todos = [...new Set([
      ...clientesHistoricos,
      ...state.clientesGlobales.map(c => c.nombre)
    ])];
    const filtrados = todos.filter(n => n.toLowerCase().includes(val)).slice(0, 8);

    if (!filtrados.length) { sugerencias.style.display = "none"; return; }

    sugerencias.innerHTML = filtrados.map(nombre => `
      <div onclick="seleccionarCliente('${nombre.replace(/'/g, "\\'")}')"
        style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f3f4f6; font-size: 0.9em;"
        onmouseover="this.style.background='#eff6ff'"
        onmouseout="this.style.background='white'">
        👤 ${nombre}
      </div>`).join("");
    sugerencias.style.display = "block";
  });

  input.addEventListener("blur", () => setTimeout(() => { sugerencias.style.display = "none"; }, 200));
  input.addEventListener("focus", () => { if (input.value.trim().length > 0) input.dispatchEvent(new Event("input")); });
}

function seleccionarCliente(nombre) {
  state.clienteNombre = nombre;
  const input = document.getElementById("cliente-nombre");
  if (input) input.value = nombre;
  const sugerencias = document.getElementById("sugerencias-cliente");
  if (sugerencias) sugerencias.style.display = "none";

  const ventas = Object.values(state.usuarios).flatMap(u => u.ventas);
  const ventasCliente = ventas.filter(v => v.cliente && v.cliente.toLowerCase() === nombre.toLowerCase());
  if (ventasCliente.length > 0) {
    const ultima = ventasCliente[ventasCliente.length - 1];
    setState(p => { p.ventaActual = { ...ultima.estilos }; return p; });
  }
}

// 7. EVENTOS
function bindPanelEventos() {
  document.querySelectorAll("[data-stock]").forEach(i =>
    i.onchange = (e) => modificarStockDirecto(state.usuarioActivo, e.target.dataset.stock, e.target.value));

  document.querySelectorAll("[data-venta]").forEach(i =>
    i.onchange = (e) => setState(p => { p.ventaActual[e.target.dataset.venta] = e.target.value; return p; }));

  document.getElementById("cliente-nombre").oninput = (e) => { state.clienteNombre = e.target.value; };
  document.getElementById("alquiler-barril").oninput = (e) => { state.alquilerBarril = e.target.value; };

  // REGISTRAR: solo local, NO manda al Sheet
  document.getElementById("btn-registrar").onclick = registrarVentaLocal;

  // GUARDAR: sincroniza y manda todo al Sheet
  document.getElementById("btn-guardar").onclick = async function() {
    this.disabled = true;
    this.textContent = "⏳ Guardando...";
    await guardarDatos();
    await guardarEnSheets();
    await guardarVentasPendientesEnSheet();
    this.disabled = false;
    this.textContent = "💾 Guardar en Sheet";
  };

  document.getElementById("btn-borrar").onclick = borrarHistorialUsuario;
  document.getElementById("btn-ver-clientes").onclick = mostrarTodosLosClientes;

  document.getElementById("btn-agregar-stock").onclick = () => {
    document.querySelectorAll("[data-agregar]").forEach(input => {
      const estilo = input.dataset.agregar;
      const cantidad = Number(input.value);
      if (!isNaN(cantidad) && input.value.trim() !== "" && cantidad !== 0) {
        modificarStockDirecto(state.usuarioActivo, estilo, (state.usuarios[state.usuarioActivo].stock[estilo] || 0) + cantidad);
        input.value = "";
      }
    });
  };

  document.getElementById("btn-reset-stock").onclick = () => {
    if (confirm("¿Resetear todo el stock a 0?")) {
      setState(p => {
        estilosBase.forEach(e => { p.usuarios[p.usuarioActivo].stock[e] = 0; });
        return p;
      });
    }
  };
}

function renderUsuarios() {
  const container = document.getElementById("usuarios-section");
  container.innerHTML = Object.keys(state.usuarios).map(u => `
    <button onclick="setState(p => { p.usuarioActivo = '${u}'; return p; })"
      style="background: ${state.usuarioActivo === u ? '#1e40af' : '#3b82f6'}; margin: 5px;">
      Panel ${u}
    </button>`).join("");
}

function renderTransferencia() {
  const container = document.getElementById("transferencia-section");
  container.innerHTML = `
    <div class="card">
      <h2>📦 Transferencia de Stock entre Usuarios</h2>
      <div class="flex" style="flex-wrap: wrap;">
        <select onchange="setState(p => { p.transferDesde = this.value; return p; })" style="width: auto;">
          ${Object.keys(state.usuarios).map(u => `<option ${state.transferDesde === u ? 'selected' : ''} value="${u}">${u}</option>`)}
        </select>
        <span> → </span>
        <select onchange="setState(p => { p.transferHacia = this.value; return p; })" style="width: auto;">
          ${Object.keys(state.usuarios).map(u => `<option ${state.transferHacia === u ? 'selected' : ''} value="${u}">${u}</option>`)}
        </select>
        <select onchange="setState(p => { p.transferEstilo = this.value; return p; })" style="width: auto;">
          ${estilosBase.map(e => `<option ${state.transferEstilo === e ? 'selected' : ''} value="${e}">${e}</option>`)}
        </select>
        <input type="number" placeholder="Cant" oninput="state.transferCantidad = this.value" style="width: 70px; margin-bottom:0;">
        <button onclick="transferirStock()">Pasar Stock</button>
      </div>
    </div>`;
}

function mostrarTodosLosClientes() {
  const div = document.getElementById("lista-clientes");
  if (!state.clientesGlobales.length) { div.innerHTML = "<p>No hay clientes registrados</p>"; return; }
  div.innerHTML = state.clientesGlobales.map((c, i) => `
    <div>
      ${c.nombre} — Deuda: $${c.deuda.toLocaleString()} | Pagado: $${c.pagado.toLocaleString()}
      <button onclick="borrarCliente(${i})" style="margin-left:10px;background:#ef4444;">Borrar</button>
    </div>`).join("");
}

function borrarCliente(index) {
  setState(p => { p.clientesGlobales.splice(index, 1); return p; });
  mostrarTodosLosClientes();
}
