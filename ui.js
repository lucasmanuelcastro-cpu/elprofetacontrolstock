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
  
  // Calcular totales
  const totalConEtiq = estilosBase.reduce((sum, e) => sum + (state.stockGeneral[e] || 0), 0);
  const totalSinEtiq = estilosBase.reduce((sum, e) => sum + (state.stockGeneralSinEtiqueta[e] || 0), 0);
  const granTotal = totalConEtiq + totalSinEtiq;
  
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div class="card">
        <h2>📦 Stock General (Disponible)</h2>
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8px; font-weight: bold; padding: 8px 0; border-bottom: 2px solid #3b82f6; margin-bottom: 8px; font-size: 0.85em;">
          <span>Estilo</span>
          <span style="text-align: center;">Con Etiq.</span>
          <span style="text-align: center;">Sin Etiq.</span>
          <span style="text-align: center;">Total</span>
        </div>
        ${estilosBase.map(e => {
          const conEtiq = state.stockGeneral[e] || 0;
          const sinEtiq = state.stockGeneralSinEtiqueta[e] || 0;
          const total = conEtiq + sinEtiq;
          return `
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 0.9em;">
            <span><b>${e}</b></span>
            <span style="text-align: center; color: ${conEtiq < 0 ? '#ef4444' : '#1f2937'};">${conEtiq}</span>
            <span style="text-align: center; color: ${sinEtiq < 0 ? '#ef4444' : '#1f2937'};">${sinEtiq}</span>
            <span style="text-align: center; font-weight: bold; color: ${total < 0 ? '#ef4444' : '#059669'};">${total}</span>
          </div>
        `}).join("")}
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8px; padding: 10px 0; border-top: 2px solid #3b82f6; margin-top: 8px; font-weight: bold; font-size: 0.95em; background: #f8fafc;">
          <span>TOTAL STOCK GENERAL</span>
          <span style="text-align: center; color: #3b82f6;">${totalConEtiq}</span>
          <span style="text-align: center; color: #3b82f6;">${totalSinEtiq}</span>
          <span style="text-align: center; color: #059669; font-size: 1.1em;">${granTotal}</span>
        </div>
      </div>
      <div class="card" style="background: #f8fafc; border: 1px solid #e2e8f0;">
        <h2>📊 Popularidad (% Ventas)</h2>
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
  const todasLasVentas = getVentasGenerales();

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
        <h2>👑 Para El Profeta (Total)</h2>
        <p class="big-number" style="color: #059669;">$${totalProfeta.toLocaleString()}</p>
        <small>Costo + 50% Ganancia generada</small>
      </div>
    </div>

    <!-- HISTORIAL GLOBAL DE TODAS LAS VENTAS -->
    <div class="card" style="margin-top: 20px; border-left: 4px solid #7c3aed;">
      <h2>📋 Historial Global (${todasLasVentas.length} ventas)</h2>
      <div style="max-height: 300px; overflow-y: auto; margin-top: 10px;">
        ${todasLasVentas.length === 0
          ? '<p style="color:gray;">No hay ventas registradas aún.</p>'
          : [...todasLasVentas].reverse().map(v => {
              const vendedor = v.vendedor || Object.keys(state.usuarios).find(u =>
                state.usuarios[u].ventas.some(vv => vv === v)
              ) || '—';
              return `
            <div style="border-bottom: 1px solid #f3f4f6; padding: 8px 0; font-size: 0.88em;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                <span><b>👤 ${v.cliente || 'Consumidor Final'}</b>
                  <span style="margin-left:8px; background:#ede9fe; color:#7c3aed; border-radius:6px; padding:1px 7px; font-size:0.85em;">
                    ${vendedor}
                  </span>
                </span>
                <small style="color:#64748b;">📅 ${v.fecha || ''}</small>
              </div>
              <div style="color:#555; margin: 3px 0;">
                ${Object.entries(v.estilos || {}).filter(([,c]) => Number(c) > 0).map(([e,c]) => `${c} ${e}`).join(', ') || '—'}
                <b style="color:#1e40af; margin-left:6px;">(${Object.values(v.estilos || {}).reduce((a,b) => a+(Number(b)||0), 0)} latas)</b>
              </div>
              <div style="display:flex; gap:12px; flex-wrap:wrap; color:#374151;">
                <span>💵 $${(v.totalCobrado||0).toLocaleString()}</span>
                <span>Comisión: $${(v.comision||0).toLocaleString()}</span>
                <span>👑 Profeta: $${(v.paraProfeta||0).toLocaleString()}</span>
              </div>
            </div>`;}).join("")
        }
      </div>
    </div>`;
}

// 3. CARTERA DE CLIENTES CON TODAS LAS VENTAS
function renderClientesGlobales() {
  const container = document.getElementById("clientes-section");
  if (!container) return;
  
  // Obtener todas las ventas registradas
  const todasLasVentas = getVentasGenerales();
  
  // Agrupar ventas por cliente
  const ventasPorCliente = {};
  todasLasVentas.forEach(venta => {
    const cliente = venta.cliente || 'Consumidor Final';
    if (!ventasPorCliente[cliente]) {
      ventasPorCliente[cliente] = [];
    }
    ventasPorCliente[cliente].push(venta);
  });
  
  const deudores = state.clientesGlobales.filter(c => (c.deuda - c.pagado) > 0);
  const deudaTotal = deudores.reduce((acc, c) => acc + (c.deuda - c.pagado), 0);
  
  container.innerHTML = `
    <div class="card" style="border-left: 5px solid #ef4444;">
      <div class="flex space-between">
        <h2>👥 Cartera de Clientes (Deudores)</h2>
        <b style="color: #ef4444;">Deuda Total: $${deudaTotal.toLocaleString()}</b>
      </div>
      <div style="max-height: 400px; overflow-y: auto; margin-top: 10px;">
        ${deudores.length === 0 ? '<p>No hay deudas pendientes</p>' :
          deudores.map((c) => {
            const idx = state.clientesGlobales.indexOf(c);
            const ventasCliente = ventasPorCliente[c.nombre] || [];
            const saldoPendiente = c.deuda - c.pagado;
            
            return `
            <div style="padding: 12px; border: 1px solid #fee2e2; border-radius: 8px; margin-bottom: 12px; background: #fef2f2;">
              <div class="flex space-between" style="flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 10px;">
                <div>
                  <div style="font-size: 1.1em; font-weight: bold; color: #991b1b;">${c.nombre}</div>
                  <div style="font-size: 0.9em; color: #7f1d1d; margin-top: 4px;">
                    Debe: <b style="font-size: 1.1em;">$${saldoPendiente.toLocaleString()}</b>
                  </div>
                </div>
                <button onclick="registrarPagoCliente(${idx})" style="background:#059669; padding:8px 16px; font-weight:bold;">💰 Cobrar</button>
              </div>
              
              ${ventasCliente.length > 0 ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #fecaca;">
                  <div style="font-size: 0.85em; color: #7f1d1d; margin-bottom: 6px; font-weight: bold;">📋 Ventas registradas (${ventasCliente.length}):</div>
                  <div style="max-height: 150px; overflow-y: auto;">
                    ${ventasCliente.slice().reverse().map(v => `
                      <div style="font-size: 0.8em; padding: 4px 0; border-bottom: 1px solid #fecaca;">
                        <div style="color: #991b1b;">
                          📅 ${v.fecha || '—'} | 
                          ${Object.entries(v.estilos || {}).filter(([,c]) => Number(c) > 0).map(([e,c]) => `${c} ${e}`).join(', ')}
                          <b style="color:#dc2626; margin-left:4px;">($${(v.totalCobrado||0).toLocaleString()})</b>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
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
  const totalLatas = Object.values(state.ventaActual).reduce((a, b) => a + (Number(b) || 0), 0);
  const precioUnitario = state.precioUnitario || "";
  const totalCobrado = totalLatas > 0 && precioUnitario ? totalLatas * Number(precioUnitario) : 0;

  // Calcular totales de stock propio
  const totalConEtiqPropio = estilosBase.reduce((sum, e) => sum + (usuario.stock[e] || 0), 0);
  const totalSinEtiqPropio = estilosBase.reduce((sum, e) => sum + (usuario.stockSinEtiqueta[e] || 0), 0);
  const granTotalPropio = totalConEtiqPropio + totalSinEtiqPropio;

  container.innerHTML = `
    <div class="panel-usuario card">
      <h1 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Panel de ${state.usuarioActivo}</h1>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">

        <!-- STOCK PROPIO -->
        <div>
          <h3 style="color: #3b82f6;">📦 Stock Propio</h3>
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 4px; font-weight: bold; font-size: 0.75em; padding: 4px 0; border-bottom: 2px solid #3b82f6; margin-bottom: 6px;">
            <span>Estilo</span>
            <span style="text-align: center;">Con Etiq.</span>
            <span style="text-align: center;">Sin Etiq.</span>
            <span style="text-align: center;">Total</span>
          </div>
          ${estilosBase.map(e => {
            const conEtiq = usuario.stock[e] || 0;
            const sinEtiq = usuario.stockSinEtiqueta[e] || 0;
            const total = conEtiq + sinEtiq;
            return `
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 4px; padding: 4px 0; border-bottom: 1px solid #f3f4f6; font-size: 0.85em;">
              <span style="font-weight: 600;">${e}</span>
              <span style="text-align: center;">${conEtiq}</span>
              <span style="text-align: center;">${sinEtiq}</span>
              <span style="text-align: center; font-weight: bold; color: #059669;">${total}</span>
            </div>
          `}).join("")}
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 4px; padding: 8px 0; border-top: 2px solid #3b82f6; margin-top: 6px; font-weight: bold; background: #eff6ff;">
            <span style="font-size: 0.85em;">TOTAL STOCK</span>
            <span style="text-align: center; color: #3b82f6; font-size: 0.9em;">${totalConEtiqPropio}</span>
            <span style="text-align: center; color: #3b82f6; font-size: 0.9em;">${totalSinEtiqPropio}</span>
            <span style="text-align: center; color: #059669; font-size: 1em;">${granTotalPropio}</span>
          </div>
        </div>

        <!-- REGISTRAR VENTA -->
        <div>
          <h3 style="color: #059669;">💵 Registrar Venta</h3>
          <div style="position: relative; margin-bottom: 12px;">
            <label style="font-size: 0.85em; font-weight: bold;">Nombre de Cliente:</label>
            <input type="text" id="cliente-nombre" placeholder="Consumidor Final" value="${state.clienteNombre}" 
              style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #d1d5db; margin-top: 4px;">
            <div id="sugerencias-cliente" style="display:none; position:absolute; background:white; border:1px solid #d1d5db; border-radius:6px; max-height:150px; overflow-y:auto; width:100%; z-index:100; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"></div>
          </div>

          <label style="font-size: 0.85em; font-weight: bold; display: block; margin-bottom: 4px;">Tipo de Lata:</label>
          <select onchange="setState(p => { p.tipoLata = this.value; return p; })" style="width: 100%; padding: 6px; border-radius: 6px; margin-bottom: 10px;">
            <option value="conEtiqueta" ${state.tipoLata === 'conEtiqueta' ? 'selected' : ''}>Con Etiqueta</option>
            <option value="sinEtiqueta" ${state.tipoLata === 'sinEtiqueta' ? 'selected' : ''}>Sin Etiqueta</option>
          </select>

          ${estilosBase.map(e => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin: 4px 0;">
              <label style="font-size:0.85em; font-weight:500;">${e}:</label>
              <input type="number" data-venta="${e}" value="${state.ventaActual[e] || ''}" 
                style="width:60px; padding:4px; border-radius:4px; border:1px solid #d1d5db; text-align:center;">
            </div>
          `).join("")}

          <div style="margin-top:12px; padding:10px; background:#f8fafc; border-radius:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label style="font-size:0.85em; font-weight:bold;">Precio por lata:</label>
              <input type="number" id="precio-unitario" value="${precioUnitario}" placeholder="0" 
                style="width:80px; padding:4px; border-radius:4px; border:1px solid #d1d5db; text-align:center;">
            </div>
            <div style="text-align:right; margin-top:8px; font-size:1.1em;">
              <b>Total:</b> <span data-total-display style="color:#059669; font-weight:bold;">${totalCobrado > 0 ? '$' + totalCobrado.toLocaleString() : '$—'}</span>
            </div>
          </div>

          <input type="text" id="alquiler-barril" placeholder="Alquiler Barril (opcional)" value="${state.alquilerBarril}" 
            style="width:100%; padding:6px; margin-top:8px; border-radius:6px; border:1px solid #d1d5db;">

          <button id="btn-registrar" style="width:100%; margin-top:12px; background:#059669; font-weight:bold;">
            ✅ Registrar Venta
          </button>
        </div>

        <!-- AGREGAR STOCK -->
        <div>
          <h3 style="color: #f59e0b;">➕ Agregar Stock</h3>
          ${estilosBase.map(e => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin:6px 0;">
              <label style="font-size:0.85em; font-weight:500;">${e}:</label>
              <div style="display:flex; gap:4px; align-items:center;">
                <input type="number" data-agregar="${e}" placeholder="0" 
                  style="width:50px; padding:4px; border-radius:4px; border:1px solid #d1d5db; text-align:center;">
                <div style="display:flex; flex-direction:column; gap:2px;">
                  <button onclick="agregarStockDirecto('${e}', true)" 
                    style="padding:2px 6px; font-size:0.7em; background:#3b82f6; min-width:24px;">C</button>
                  <button onclick="agregarStockDirecto('${e}', false)" 
                    style="padding:2px 6px; font-size:0.7em; background:#6b7280; min-width:24px;">S</button>
                </div>
              </div>
            </div>
          `).join("")}
          <small style="display:block; margin-top:8px; color:#6b7280; font-size:0.75em;">
            <b>C:</b> Con etiqueta | <b>S:</b> Sin etiqueta
          </small>
          <button id="btn-agregar-stock" style="width:100%; margin-top:10px; background:#f59e0b;">
            ➕ Agregar desde campos
          </button>
          <button id="btn-reset-stock" class="danger" style="width:100%; margin-top:6px;">
            🗑️ Resetear Stock a 0
          </button>
          
          ${usuario.historialAgregarStock && usuario.historialAgregarStock.length > 0 ? `
            <div style="margin-top:12px; padding:8px; background:#fef3c7; border-radius:6px; max-height:200px; overflow-y:auto;">
              <div style="font-size:0.8em; font-weight:bold; margin-bottom:6px; color:#92400e;">📜 Historial Agregar Stock:</div>
              ${usuario.historialAgregarStock.slice().reverse().map(h => `
                <div style="font-size:0.75em; padding:3px 0; border-bottom:1px solid #fde68a; color:#78350f;">
                  ${h.fecha} | ${h.estilo}: +${h.cantidad} ${h.conEtiqueta ? '(C)' : '(S)'}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      <hr>

      <!-- HISTORIAL DE VENTAS -->
      <div>
        <div class="flex space-between" style="align-items:center; margin-bottom:10px;">
          <h3>📋 Historial de Ventas (${usuario.ventas.length})</h3>
          <button onclick="borrarHistorialUsuario()" class="danger" style="padding:6px 12px; font-size:0.85em;">
            🗑️ Borrar Historial
          </button>
        </div>
        <div style="max-height:250px; overflow-y:auto; border:1px solid #e5e7eb; border-radius:8px; padding:10px; background:#f9fafb;">
          ${usuario.ventas.length === 0 ? '<p style="color:gray;">No hay ventas registradas</p>' :
            [...usuario.ventas].reverse().map((v, i) => `
            <div style="padding:8px; margin-bottom:8px; border-left:3px solid #3b82f6; background:white; border-radius:4px;">
              <div class="flex space-between" style="flex-wrap:wrap; gap:6px; margin-bottom:4px;">
                <b style="color:#1e40af;">👤 ${v.cliente || 'Consumidor Final'}</b>
                <small style="color:#64748b;">📅 ${v.fecha || ''}</small>
              </div>
              <div style="font-size:0.85em; color:#374151; margin:4px 0;">
                ${Object.entries(v.estilos || {}).filter(([,c]) => Number(c) > 0).map(([e,c]) => `${c} ${e}`).join(', ')}
                <b style="color:#1e40af; margin-left:4px;">(${Object.values(v.estilos || {}).reduce((a,b) => a+(Number(b)||0), 0)} latas)</b>
              </div>
              <div style="font-size:0.85em; color:#059669;">💵 $${(v.totalCobrado||0).toLocaleString()}</div>
              <button onclick="borrarVentaIndividual(${i})" class="danger" style="margin-top:6px; padding:4px 10px; font-size:0.8em;">
                🗑️ Borrar y Devolver Stock
              </button>
            </div>`).join("")}
        </div>
      </div>

      <!-- BOTONES FINALES -->
      <div class="flex" style="gap:10px; margin-top:20px; justify-content:center;">
        <button id="btn-guardar" style="flex:1; max-width:300px; background:#7c3aed; font-size:1.1em; padding:12px;">
          💾 Guardar en Sheet
        </button>
      </div>
    </div>`;

  bindPanelEventos();
  bindAutocompletadoCliente();
  bindPrecioUnitario();
}

// 5. PRECIO UNITARIO — actualiza totalCobradoInput en tiempo real
function bindPrecioUnitario() {
  const input = document.getElementById("precio-unitario");
  if (!input) return;
  input.addEventListener("input", () => {
    const precio = Number(input.value) || 0;
    state.precioUnitario = input.value;
    const totalLatas = Object.values(state.ventaActual).reduce((a, b) => a + (Number(b) || 0), 0);
    const total = totalLatas * precio;
    state.totalCobradoInput = total > 0 ? String(total) : "";
    const display = document.querySelector("[data-total-display]");
    if (display) display.textContent = total > 0 ? "$" + total.toLocaleString() : "$—";
  });
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

function agregarStockDirecto(estilo, conEtiqueta) {
  const input = document.querySelector(`[data-agregar="${estilo}"]`);
  if (!input || !input.value || input.value.trim() === "") {
    alert("Por favor ingrese una cantidad");
    return;
  }
  
  const cantidad = Number(input.value);
  if (isNaN(cantidad) || cantidad === 0) {
    alert("Cantidad inválida");
    return;
  }
  
  agregarStockConHistorial(state.usuarioActivo, estilo, cantidad, conEtiqueta);
  input.value = "";
}

// 7. EVENTOS
function bindPanelEventos() {
  document.querySelectorAll("[data-stock]").forEach(i =>
    i.onchange = (e) => modificarStockDirecto(state.usuarioActivo, e.target.dataset.stock, e.target.value, true));

  document.querySelectorAll("[data-venta]").forEach(i =>
    i.onchange = (e) => {
      setState(p => { p.ventaActual[e.target.dataset.venta] = e.target.value; return p; });
    });

  const clienteInput = document.getElementById("cliente-nombre");
  if (clienteInput) {
    clienteInput.oninput = (e) => { state.clienteNombre = e.target.value; };
  }
  
  const alquilerInput = document.getElementById("alquiler-barril");
  if (alquilerInput) {
    alquilerInput.oninput = (e) => { state.alquilerBarril = e.target.value; };
  }

  const btnRegistrar = document.getElementById("btn-registrar");
  if (btnRegistrar) {
    btnRegistrar.onclick = () => {
      const precio = Number(state.precioUnitario) || 0;
      const totalLatas = Object.values(state.ventaActual).reduce((a, b) => a + (Number(b) || 0), 0);
      if (precio > 0 && totalLatas > 0) {
        state.totalCobradoInput = String(totalLatas * precio);
      }
      registrarVentaLocal();
      state.precioUnitario = "";
    };
  }

  const btnGuardar = document.getElementById("btn-guardar");
  if (btnGuardar) {
    btnGuardar.onclick = async function() {
      this.disabled = true;
      this.textContent = "⏳ Guardando...";
      await guardarDatos();
      await guardarEnSheets();
      await guardarVentasPendientesEnSheet();
      this.disabled = false;
      this.textContent = "💾 Guardar en Sheet";
    };
  }

  const btnVerClientes = document.getElementById("btn-ver-clientes");
  if (btnVerClientes) {
    btnVerClientes.onclick = mostrarTodosLosClientes;
  }

  const btnAgregarStock = document.getElementById("btn-agregar-stock");
  if (btnAgregarStock) {
    btnAgregarStock.onclick = () => {
      document.querySelectorAll("[data-agregar]").forEach(input => {
        const estilo = input.dataset.agregar;
        const cantidad = Number(input.value);
        if (!isNaN(cantidad) && input.value.trim() !== "" && cantidad !== 0) {
          agregarStockConHistorial(state.usuarioActivo, estilo, cantidad, true);
          input.value = "";
        }
      });
    };
  }

  const btnResetStock = document.getElementById("btn-reset-stock");
  if (btnResetStock) {
    btnResetStock.onclick = () => {
      if (confirm("¿Resetear todo el stock a 0?")) {
        setState(p => {
          estilosBase.forEach(e => { 
            p.usuarios[p.usuarioActivo].stock[e] = 0;
            p.usuarios[p.usuarioActivo].stockSinEtiqueta[e] = 0;
          });
          return p;
        });
      }
    };
  }
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
  const historial = state.historialTransferencias || [];
  
  container.innerHTML = `
    <div class="card">
      <h2>📦 Transferencia de Stock entre Usuarios</h2>
      <div class="flex" style="flex-wrap: wrap; gap: 8px; align-items: center;">
        <select onchange="setState(p => { p.transferDesde = this.value; return p; })" style="width: auto;">
          ${Object.keys(state.usuarios).map(u => `<option ${state.transferDesde === u ? 'selected' : ''} value="${u}">${u}</option>`).join('')}
        </select>
        <span style="font-size: 1.2em;">→</span>
        <select onchange="setState(p => { p.transferHacia = this.value; return p; })" style="width: auto;">
          ${Object.keys(state.usuarios).map(u => `<option ${state.transferHacia === u ? 'selected' : ''} value="${u}">${u}</option>`).join('')}
        </select>
        <select onchange="setState(p => { p.transferEstilo = this.value; return p; })" style="width: auto;">
          ${estilosBase.map(e => `<option ${state.transferEstilo === e ? 'selected' : ''} value="${e}">${e}</option>`).join('')}
        </select>
        <input type="number" placeholder="Cant" oninput="state.transferCantidad = this.value" style="width: 70px; margin-bottom:0;">
        <select onchange="setState(p => { p.transferConEtiqueta = this.value === 'true'; return p; })" style="width: auto;">
          <option value="true" ${state.transferConEtiqueta ? 'selected' : ''}>Con Etiqueta</option>
          <option value="false" ${!state.transferConEtiqueta ? 'selected' : ''}>Sin Etiqueta</option>
        </select>
        <button onclick="transferirStock()">Pasar Stock</button>
      </div>
      
      ${historial.length > 0 ? `
        <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; max-height: 200px; overflow-y: auto;">
          <h4 style="margin: 0 0 10px 0; color: #475569;">📜 Historial de Transferencias (${historial.length})</h4>
          ${historial.slice().reverse().map(t => `
            <div style="font-size: 0.85em; padding: 6px 0; border-bottom: 1px solid #e2e8f0; color: #334155;">
              <b>${t.fecha}</b> | 
              <span style="color: #3b82f6;">${t.desde}</span> → 
              <span style="color: #059669;">${t.hacia}</span> | 
              ${t.estilo}: <b>${t.cantidad}</b> ${t.conEtiqueta ? '✅ C/Etiq' : '❌ S/Etiq'}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>`;
}

function mostrarTodosLosClientes() {
  const div = document.getElementById("lista-clientes");
  if (!state.clientesGlobales.length) { 
    div.innerHTML = "<p>No hay clientes registrados</p>"; 
    return; 
  }
  
  div.innerHTML = `
    <div class="card" style="margin-top: 10px;">
      <h3>👥 Lista Completa de Clientes</h3>
      <div style="max-height: 300px; overflow-y: auto;">
        ${state.clientesGlobales.map((c, i) => `
          <div style="padding: 10px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="flex: 1;">
              <div style="font-weight: bold; font-size: 1.05em;">${c.nombre}</div>
              <div style="font-size: 0.9em; color: #6b7280;">
                Deuda: $${c.deuda.toLocaleString()} | 
                Pagado: $${c.pagado.toLocaleString()} | 
                Saldo: <b style="color: ${(c.deuda - c.pagado) > 0 ? '#ef4444' : '#059669'};">$${(c.deuda - c.pagado).toLocaleString()}</b>
              </div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button onclick="seleccionarClienteParaVenta('${c.nombre.replace(/'/g, "\\'")}');" style="background:#3b82f6; padding:6px 12px; font-size:0.9em;">
                📝 Nueva Venta
              </button>
              <button onclick="borrarCliente(${i})" style="background:#ef4444; padding:6px 12px; font-size:0.9em;">
                🗑️
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function seleccionarClienteParaVenta(nombre) {
  if (!state.usuarioActivo) {
    alert("Por favor seleccione un usuario primero");
    return;
  }
  
  // Seleccionar el cliente
  seleccionarCliente(nombre);
  
  // Scroll al panel de usuario
  const panelUsuario = document.querySelector('.panel-usuario');
  if (panelUsuario) {
    panelUsuario.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  alert(`Cliente ${nombre} seleccionado. Puede registrar la venta ahora.`);
}

function borrarCliente(index) {
  if (confirm("¿Está seguro de borrar este cliente?")) {
    setState(p => { p.clientesGlobales.splice(index, 1); return p; });
    mostrarTodosLosClientes();
  }
}
