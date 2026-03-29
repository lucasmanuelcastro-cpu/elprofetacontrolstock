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

// 1. STOCK Y POPULARIDAD (Filtra estilos sin ventas)
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
                  </div>
                `;
              }).join("")
        }
        <div style="margin-top: 15px; text-align: right;">
          <small style="color: #64748b;">Total latas vendidas: <b>${stats.granTotalLatas}</b></small>
        </div>
      </div>

    </div>
  `;
}

// 2. VENTAS GENERALES (Muestra efectivo, transferencia y total)
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

// 3. CARTERA DE CLIENTES
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

// 4. PANEL DE USUARIO INDIVIDUAL
function renderPanelUsuario() {
  const container = document.getElementById("panel-usuario-container");
  if (!state.usuarioActivo) { container.innerHTML = ""; return; }
  
  const usuario = state.usuarios[state.usuarioActivo];
  const preview = calcularPreview();

  container.innerHTML = `
    <div class="panel-usuario card">
      <h1 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Panel de ${state.usuarioActivo}</h1>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
        <div>
          <h3>📦 Stock Propio</h3>
          ${estilosBase.map(e => `
            <div class="flex space-between" style="margin-bottom: 5px; padding: 6px 8px; background: #f8fafc; border-radius: 8px;">
              <span>${e}</span>
              <b style="color: ${(usuario.stock[e] || 0) < 0 ? '#ef4444' : '#1e40af'};">${usuario.stock[e] || 0} un.</b>
            </div>`).join("")}
        </div>
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
        <div>
          <h3>🛒 Registrar Venta</h3>
          <input type="text" id="cliente-nombre" placeholder="Nombre Cliente (Opcional)" value="${state.clienteNombre}">
          ${estilosBase.map(e => `
            <div class="flex space-between" style="margin-bottom: 5px;">
              <span>${e}</span>
              <input type="number" data-venta="${e}" value="${state.ventaActual[e] || ""}" placeholder="0" style="width: 80px;">
            </div>`).join("")}
          <input type="number" id="total-cobrado" placeholder="Total a Cobrar ($)" value="${state.totalCobradoInput}" style="margin-top:10px; font-weight:bold;">

          
          <div class="card" style="background:#fef3c7; border: 1px solid #f59e0b; margin-top: 10px;">
            <h4 style="margin-top:0;">Vista Previa Profeta</h4>
            <p style="margin: 5px 0;">Costo: $${preview.costoTotal.toLocaleString()}</p>
            <p style="margin: 5px 0;">Comisión (50%): $${preview.comision.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Total a Rendir: $${preview.paraProfeta.toLocaleString()}</strong></p>
          </div>
          <button id="btn-registrar" style="width:100%; margin-top:10px; background:#1e40af;">Registrar Venta</button>
        </div>
      </div>
      <hr>
      <div class="flex space-between">
        <h3>📜 Historial de Ventas</h3>
        <div>
          <button id="btn-guardar" style="background:#059669;">Guardar Datos</button>
          <button id="btn-sheets" style="background:#16a34a;">📊 Guardar en Sheets</button>
          <button id="btn-borrar" class="danger">Borrar Historial</button>
        </div>
      </div>
      <div id="historial-lista" style="margin-top: 15px;">
        ${usuario.ventas.length === 0 ? '<p>No hay ventas registradas</p>' :
          usuario.ventas.map((v, idx) => {
            return `
          <div style="border-bottom:1px solid #eee; padding:10px 0; font-size: 0.9em;">
            <div class="flex space-between"><b>👤 ${v.cliente}</b> <small>📅 ${v.fecha}</small></div>
            <div style="color: #666; margin: 4px 0;">Pedido: ${Object.entries(v.estilos).filter(e => e[1]>0).map(e => `${e[1]} ${e[0]}`).join(", ")} <b style="color:#1e40af;">(${Object.values(v.estilos).reduce((a,b) => a + (Number(b)||0), 0)} latas)</b></div>
            <div>
              <span>Cobrado: $${v.totalCobrado.toLocaleString()} | Comisión: $${v.comision.toLocaleString()} | 👑 Profeta: $${v.paraProfeta.toLocaleString()}</span>
            </div>
          </div>`;
          }).reverse().join("")}
      </div>
    </div>`;
  bindPanelEventos();
}

// 5. EVENTOS Y BOTONES
function bindPanelEventos() {
  document.querySelectorAll("[data-stock]").forEach(i => i.onchange = (e) => modificarStockDirecto(state.usuarioActivo, e.target.dataset.stock, e.target.value));
  document.querySelectorAll("[data-venta]").forEach(i => i.onchange = (e) => setState(p => { p.ventaActual[e.target.dataset.venta] = e.target.value; return p; }));
  document.getElementById("cliente-nombre").oninput = (e) => state.clienteNombre = e.target.value;
  document.getElementById("total-cobrado").onchange = (e) => setState(p => { p.totalCobradoInput = e.target.value; return p; });
  document.getElementById("btn-registrar").onclick = registrarVenta;
  document.getElementById("btn-guardar").onclick = guardarDatos;
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
  document.getElementById("btn-sheets").onclick = guardarEnSheets;
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
    </button>
  `).join("");
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
  if (!state.clientesGlobales.length) {
    div.innerHTML = "<p>No hay clientes registrados</p>";
    return;
  }
  div.innerHTML = state.clientesGlobales
    .map((c, i) => `
      <div>
        ${c.nombre} — Deuda: $${c.deuda.toLocaleString()} | Pagado: $${c.pagado.toLocaleString()}
        <button onclick="borrarCliente(${i})" style="margin-left:10px;background:#ef4444;">Borrar</button>
      </div>
    `).join("");
}

function borrarCliente(index) {
  setState(p => { p.clientesGlobales.splice(index, 1); return p; });
  mostrarTodosLosClientes();
}
