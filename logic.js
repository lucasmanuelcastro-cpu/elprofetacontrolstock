// --- LÓGICA DE ESTADO Y SINCRONIZACIÓN EL PROFETA ---

const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzMd76MQpwnWeOluDo4SEX4rBAC4skskmFCgr73WCh2P33Mnh6OUUoBseTEJyGtRwkxtA/exec";

let clientesHistoricos = [];
let ventasPendientes = [];

function modificarStockDirecto(usuario, estilo, cantidad, conEtiqueta = true) {
  setState((prev) => {
    if (conEtiqueta) {
      prev.usuarios[usuario].stock[estilo] = Number(cantidad) || 0;
    } else {
      prev.usuarios[usuario].stockSinEtiqueta[estilo] = Number(cantidad) || 0;
    }
    return prev;
  });
}

function agregarStockConHistorial(usuario, estilo, cantidad, conEtiqueta = true) {
  setState((prev) => {
    const fecha = new Date().toLocaleDateString("es-AR");
    const hora = new Date().toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' });
    
    if (conEtiqueta) {
      prev.usuarios[usuario].stock[estilo] = (prev.usuarios[usuario].stock[estilo] || 0) + Number(cantidad);
    } else {
      prev.usuarios[usuario].stockSinEtiqueta[estilo] = (prev.usuarios[usuario].stockSinEtiqueta[estilo] || 0) + Number(cantidad);
    }
    
    // Registrar en historial
    if (!prev.usuarios[usuario].historialAgregarStock) {
      prev.usuarios[usuario].historialAgregarStock = [];
    }
    prev.usuarios[usuario].historialAgregarStock.push({
      estilo,
      cantidad: Number(cantidad),
      conEtiqueta,
      fecha: `${fecha} ${hora}`
    });
    
    return prev;
  });
}

function registrarVentaLocal() {
  if (!state.usuarioActivo) return;
  const preview = calcularPreview();
  const totalVenta = Number(state.totalCobradoInput) || 0;
  const alquilerBarril = state.alquilerBarril || "";
  const esVentaADeudor = state.clienteNombre && state.clienteNombre.trim() !== "" && state.clienteNombre !== "Consumidor Final";

  const ventaDatos = {
    cliente: state.clienteNombre || "Consumidor Final",
    estilos: { ...state.ventaActual },
    alquilerBarril: alquilerBarril,
    totalCobrado: totalVenta,
    paraProfeta: preview.paraProfeta,
    comision: preview.comision,
    totalLatas: preview.totalLatas,
    costo: preview.costoTotal,
    ganancia: totalVenta - preview.costoTotal,
    metodoPago: esVentaADeudor ? "deuda" : state.metodoPago,
    fecha: new Date().toLocaleDateString("es-AR"),
    vendedor: state.usuarioActivo,
    tipoLata: state.tipoLata,
    esCobro: false,
  };

  ventasPendientes.push(ventaDatos);
  localStorage.setItem("ventasPendientes", JSON.stringify(ventasPendientes));
  console.log("📝 Venta registrada. Pendientes:", ventasPendientes.length);

  setState((prev) => {
    const usuario = prev.usuarios[prev.usuarioActivo];
    usuario.ventas.push({
      cliente: ventaDatos.cliente,
      estilos: ventaDatos.estilos,
      totalCobrado: totalVenta,
      paraProfeta: preview.paraProfeta,
      comision: preview.comision,
      metodoPago: ventaDatos.metodoPago,
      fecha: ventaDatos.fecha,
      tipoLata: state.tipoLata,
    });

    // Si es venta a deudor, agregar/actualizar en clientesGlobales
    if (esVentaADeudor) {
      const idx = prev.clientesGlobales.findIndex(c => c.nombre.toLowerCase() === prev.clienteNombre.toLowerCase());
      if (idx !== -1) {
        prev.clientesGlobales[idx].deuda += totalVenta;
      } else {
        prev.clientesGlobales.push({ 
          nombre: prev.clienteNombre, 
          deuda: totalVenta, 
          pagado: 0,
          pagos: []
        });
      }
    }

    // Restar del stock según tipo de lata
    Object.entries(prev.ventaActual).forEach(([estilo, cant]) => {
      if (state.tipoLata === "sinEtiqueta") {
        usuario.stockSinEtiqueta[estilo] = (usuario.stockSinEtiqueta[estilo] || 0) - (Number(cant) || 0);
      } else {
        usuario.stock[estilo] = (usuario.stock[estilo] || 0) - (Number(cant) || 0);
      }
    });

    prev.ventaActual = {};
    prev.clienteNombre = "";
    prev.totalCobradoInput = "";
    prev.alquilerBarril = "";
    prev.precioUnitario = "";
    return prev;
  });
}

async function guardarVentasPendientesEnSheet() {
  if (!ventasPendientes.length) {
    const guardadas = localStorage.getItem("ventasPendientes");
    if (guardadas) ventasPendientes = JSON.parse(guardadas);
  }

  console.log("📦 Ventas pendientes a enviar:", ventasPendientes.length, JSON.stringify(ventasPendientes));

  if (!ventasPendientes.length) {
    console.warn("⚠️ No hay ventas pendientes para enviar.");
    return;
  }

  const colaActual = [...ventasPendientes];
  ventasPendientes = [];
  localStorage.removeItem("ventasPendientes");

  for (const venta of colaActual) {
    try {
      const payload = { accion: "nuevaVenta", venta: venta };
      console.log("📤 Enviando:", JSON.stringify(payload));
      const resp = await fetch(URL_SCRIPT, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "text/plain" },
        mode: "cors"
      });
      const texto = await resp.text();
      console.log("✅ Respuesta del Sheet:", texto);
    } catch (err) {
      console.error("❌ Error enviando venta:", err);
      ventasPendientes.push(venta);
      localStorage.setItem("ventasPendientes", JSON.stringify(ventasPendientes));
    }
  }
}

async function cargarClientesHistoricos() {
  try {
    const url = URL_SCRIPT + "?accion=clientes&v=" + Date.now();
    const resp = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });
    const texto = await resp.text();
    const datos = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));
    if (datos.clientes && Array.isArray(datos.clientes)) {
      clientesHistoricos = datos.clientes;
      console.log("✅ Clientes históricos:", clientesHistoricos.length);
    }
  } catch (err) {
    console.error("❌ Error cargando clientes históricos:", err);
  }
}

function registrarPagoCliente(index, metodo = "efectivo") {
  const cliente = state.clientesGlobales[index];
  const saldoPendiente = cliente.deuda - cliente.pagado;
  
  // Crear modal para cobrar
  const modalHTML = `
    <div id="modal-cobro" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;">
      <div style="background:white; padding:30px; border-radius:12px; max-width:400px; width:90%;">
        <h3 style="margin-top:0;">Cobrar a ${cliente.nombre}</h3>
        <p style="font-size:1.2em; color:#ef4444;"><b>Saldo Pendiente: $${saldoPendiente.toLocaleString()}</b></p>
        
        <div style="margin:20px 0;">
          <label style="display:block; margin-bottom:8px; font-weight:bold;">Método de Pago:</label>
          <select id="metodo-pago-modal" style="width:100%; padding:10px; border-radius:6px; border:1px solid #d1d5db;">
            <option value="efectivo" ${metodo === 'efectivo' ? 'selected' : ''}>💵 Efectivo</option>
            <option value="transferencia" ${metodo === 'transferencia' ? 'selected' : ''}>🏦 Transferencia</option>
          </select>
        </div>
        
        <div style="margin:20px 0;">
          <label style="display:block; margin-bottom:8px; font-weight:bold;">Monto a Cobrar:</label>
          <input type="number" id="monto-cobro" style="width:100%; padding:10px; border-radius:6px; border:1px solid #d1d5db;" placeholder="Ingrese monto">
          <div style="display:flex; gap:10px; margin-top:10px;">
            <button onclick="document.getElementById('monto-cobro').value = ${saldoPendiente}" style="flex:1; padding:8px; background:#3b82f6; color:white; border:none; border-radius:6px; cursor:pointer;">100%</button>
            <button onclick="document.getElementById('monto-cobro').value = ${Math.round(saldoPendiente * 0.5)}" style="flex:1; padding:8px; background:#10b981; color:white; border:none; border-radius:6px; cursor:pointer;">50%</button>
          </div>
        </div>
        
        <div style="display:flex; gap:10px; margin-top:20px;">
          <button onclick="cerrarModalCobro()" style="flex:1; padding:10px; background:#6b7280; color:white; border:none; border-radius:6px; cursor:pointer;">Cancelar</button>
          <button onclick="confirmarCobro(${index})" style="flex:1; padding:10px; background:#059669; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">Confirmar Cobro</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.getElementById('monto-cobro').focus();
}

function cerrarModalCobro() {
  const modal = document.getElementById('modal-cobro');
  if (modal) modal.remove();
}

function confirmarCobro(index) {
  const monto = document.getElementById('monto-cobro').value;
  const metodo = document.getElementById('metodo-pago-modal').value;
  
  if (!monto || Number(monto) <= 0) {
    alert('Por favor ingrese un monto válido');
    return;
  }
  
  const montoNum = Number(monto);
  const fecha = new Date().toLocaleDateString("es-AR");

  setState((prev) => {
    const c = prev.clientesGlobales[index];
    c.pagado += montoNum;
    if (!c.pagos) c.pagos = [];
    c.pagos.push({ monto: montoNum, metodo, fecha });
    return prev;
  });
  
  cerrarModalCobro();
  alert(`✅ Cobro registrado: $${montoNum.toLocaleString()} - ${metodo === 'efectivo' ? 'Efectivo' : 'Transferencia'}`);
}

function borrarHistorialUsuario() {
  if (!state.usuarioActivo) return;
  if (confirm("¿Borrar ventas?")) {
    setState((prev) => {
      prev.usuarios[prev.usuarioActivo].ventas = [];
      return prev;
    });
  }
}

function borrarVentaIndividual(index) {
  if (!state.usuarioActivo) return;
  const ventas = state.usuarios[state.usuarioActivo].ventas;
  const indiceReal = ventas.length - 1 - index;
  const venta = ventas[indiceReal];
  
  if (confirm("¿Borrar esta venta del historial? Las latas volverán al stock.")) {
    setState((prev) => {
      const usuario = prev.usuarios[prev.usuarioActivo];
      
      // Devolver latas al stock
      Object.entries(venta.estilos || {}).forEach(([estilo, cant]) => {
        const cantidad = Number(cant) || 0;
        if (venta.tipoLata === "sinEtiqueta") {
          usuario.stockSinEtiqueta[estilo] = (usuario.stockSinEtiqueta[estilo] || 0) + cantidad;
        } else {
          usuario.stock[estilo] = (usuario.stock[estilo] || 0) + cantidad;
        }
      });
      
      // Eliminar la venta
      usuario.ventas.splice(indiceReal, 1);
      
      return prev;
    });
  }
}

function transferirStock() {
  setState((prev) => {
    const { transferDesde, transferHacia, transferEstilo, transferCantidad, transferConEtiqueta } = prev;
    if (transferDesde === transferHacia) return prev;
    
    const stockOrigen = transferConEtiqueta ? prev.usuarios[transferDesde].stock : prev.usuarios[transferDesde].stockSinEtiqueta;
    const disponible = stockOrigen[transferEstilo] || 0;
    
    if (disponible < transferCantidad) { 
      alert("Stock insuficiente"); 
      return prev; 
    }
    
    // Restar del origen
    if (transferConEtiqueta) {
      prev.usuarios[transferDesde].stock[transferEstilo] -= Number(transferCantidad);
    } else {
      prev.usuarios[transferDesde].stockSinEtiqueta[transferEstilo] -= Number(transferCantidad);
    }
    
    // Sumar al destino
    if (transferConEtiqueta) {
      prev.usuarios[transferHacia].stock[transferEstilo] = (prev.usuarios[transferHacia].stock[transferEstilo] || 0) + Number(transferCantidad);
    } else {
      prev.usuarios[transferHacia].stockSinEtiqueta[transferEstilo] = (prev.usuarios[transferHacia].stockSinEtiqueta[transferEstilo] || 0) + Number(transferCantidad);
    }
    
    // Registrar en historial
    const fecha = new Date().toLocaleDateString("es-AR");
    const hora = new Date().toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' });
    prev.historialTransferencias.push({
      desde: transferDesde,
      hacia: transferHacia,
      estilo: transferEstilo,
      cantidad: Number(transferCantidad),
      conEtiqueta: transferConEtiqueta,
      fecha: `${fecha} ${hora}`
    });
    
    prev.transferCantidad = 0;
    return prev;
  });
}

function swapMetodoPago(nombreUsuario, ventaIndex) {
  setState((prev) => {
    const venta = prev.usuarios[nombreUsuario].ventas[ventaIndex];
    if (!venta) return prev;
    venta.metodoPago = (venta.metodoPago || "efectivo") === "efectivo" ? "transferencia" : "efectivo";
    return prev;
  });
}

async function cargarDatosDesdeSheet() {
  try {
    const url = URL_SCRIPT + "?v=" + Date.now();
    const respuesta = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });
    if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);

    const texto = await respuesta.text();
    const datosCloud = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));
    if (datosCloud.error) throw new Error(datosCloud.error);
    if (!datosCloud.usuarios || typeof datosCloud.usuarios !== "object") return;

    setState((prev) => {
      Object.entries(datosCloud.usuarios).forEach(([nombre, datos]) => {
        if (prev.usuarios[nombre]) {
          // Sincronizar stock con etiqueta
          if (datos.stock) {
            prev.usuarios[nombre].stock = {
              "BLONDE":      Number(datos.stock["BLONDE"])      || 0,
              "IRISH RED":   Number(datos.stock["IRISH RED"])   || 0,
              "STOUT":       Number(datos.stock["STOUT"])       || 0,
              "SESSION IPA": Number(datos.stock["SESSION IPA"]) || 0,
              "RED IPA":     Number(datos.stock["RED IPA"])     || 0,
              "HONEY":       Number(datos.stock["HONEY"])       || 0
            };
          }
          
          // Sincronizar stock sin etiqueta
          if (datos.stockSinEtiqueta) {
            prev.usuarios[nombre].stockSinEtiqueta = {
              "BLONDE":      Number(datos.stockSinEtiqueta["BLONDE"])      || 0,
              "IRISH RED":   Number(datos.stockSinEtiqueta["IRISH RED"])   || 0,
              "STOUT":       Number(datos.stockSinEtiqueta["STOUT"])       || 0,
              "SESSION IPA": Number(datos.stockSinEtiqueta["SESSION IPA"]) || 0,
              "RED IPA":     Number(datos.stockSinEtiqueta["RED IPA"])     || 0,
              "HONEY":       Number(datos.stockSinEtiqueta["HONEY"])       || 0
            };
          }
          
          // Sincronizar ventas desde el Sheet
          if (datos.ventas && Array.isArray(datos.ventas) && datos.ventas.length > 0) {
            prev.usuarios[nombre].ventas = datos.ventas;
          }
          
          // Sincronizar historial de agregar stock
          if (datos.historialAgregarStock && Array.isArray(datos.historialAgregarStock)) {
            prev.usuarios[nombre].historialAgregarStock = datos.historialAgregarStock;
          }
        }
      });

      // Sincronizar clientes/deudores desde el Sheet
      if (datosCloud.clientes && Array.isArray(datosCloud.clientes) && datosCloud.clientes.length > 0) {
        datosCloud.clientes.forEach(clienteCloud => {
          const idx = prev.clientesGlobales.findIndex(c => c.nombre.toLowerCase() === clienteCloud.nombre.toLowerCase());
          if (idx !== -1) {
            prev.clientesGlobales[idx].deuda = clienteCloud.deuda;
            prev.clientesGlobales[idx].saldo = clienteCloud.saldo;
          } else {
            prev.clientesGlobales.push({
              nombre: clienteCloud.nombre,
              deuda: clienteCloud.deuda || 0,
              pagado: clienteCloud.pagado || 0,
              pagos: []
            });
          }
        });
      }
      
      // Sincronizar historial de transferencias
      if (datosCloud.historialTransferencias && Array.isArray(datosCloud.historialTransferencias)) {
        prev.historialTransferencias = datosCloud.historialTransferencias;
      }

      return prev;
    });

    if (datosCloud.clientesHistoricos) {
      clientesHistoricos = datosCloud.clientesHistoricos;
    }

    console.log("✅ Sync exitosa — stock, ventas y clientes cargados.");
  } catch (error) {
    console.error("❌ Error de lectura:", error);
  }
}
