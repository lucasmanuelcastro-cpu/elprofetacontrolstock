function modificarStockDirecto(usuario, estilo, cantidad) {
    setState((prev) => {
      prev.usuarios[usuario].stock[estilo] = Number(cantidad) || 0;
      return prev;
    });
  }
  
  function registrarVenta() {
    if (!state.usuarioActivo) return;
    const preview = calcularPreview();
    const totalVenta = Number(state.totalCobradoInput) || 0;
    
  
    setState((prev) => {
      const usuario = prev.usuarios[prev.usuarioActivo];
      // 1. Guardar Venta
      usuario.ventas.push({
        cliente: prev.clienteNombre || "Consumidor Final",
        estilos: { ...prev.ventaActual },
        totalCobrado: totalVenta,
        paraProfeta: preview.paraProfeta,
        comision: preview.comision,   // ← esta línea es obligatoria
        metodoPago: prev.metodoPago || "efectivo",
        fecha: new Date().toLocaleDateString(),
      });
      // 2. Cliente Global
      if (prev.clienteNombre.trim() !== "") {
        const idx = prev.clientesGlobales.findIndex(c => c.nombre.toLowerCase() === prev.clienteNombre.toLowerCase());
        if (idx !== -1) prev.clientesGlobales[idx].deuda += totalVenta;
        else prev.clientesGlobales.push({ nombre: prev.clienteNombre, deuda: totalVenta, pagado: 0 });
      }
      // 3. Restar Stock
      Object.entries(prev.ventaActual).forEach(([estilo, cant]) => {
        usuario.stock[estilo] = (usuario.stock[estilo] || 0) - (Number(cant) || 0);
      });
      prev.ventaActual = {};
      prev.clienteNombre = "";
      prev.totalCobradoInput = "";
      prev.metodoPago = "efectivo";
      return prev;
    });
    usuario.ventas.push({
      cliente: prev.clienteNombre || "Consumidor Final",
      estilos: { ...prev.ventaActual },
      totalCobrado: totalVenta,
      paraProfeta: preview.paraProfeta,
      comision: preview.comision,           // ← agregar esta línea
      metodoPago: prev.metodoPago || "efectivo",
      fecha: new Date().toLocaleDateString(),
    });
  }
  
  function registrarPagoCliente(index) {
    const monto = prompt(`¿Cuánto pagó ${state.clientesGlobales[index].nombre}?`);
    if (!monto) return;
    setState((prev) => {
      prev.clientesGlobales[index].pagado += Number(monto);
      return prev;
    });
  }
  
  function borrarHistorialUsuario() {
    if (!state.usuarioActivo) return;
    if (confirm("¿Borrar ventas? (Los clientes no se borrarán)")) {
      setState((prev) => {
        prev.usuarios[prev.usuarioActivo].ventas = [];
        return prev;
      });
    }
  }
  
  function transferirStock() {
    setState((prev) => {
      const { transferDesde, transferHacia, transferEstilo, transferCantidad } = prev;
      if (transferDesde === transferHacia) return prev;
      const disponible = prev.usuarios[transferDesde].stock[transferEstilo] || 0;
      if (disponible < transferCantidad) { alert("Stock insuficiente"); return prev; }
      prev.usuarios[transferDesde].stock[transferEstilo] -= Number(transferCantidad);
      prev.usuarios[transferHacia].stock[transferEstilo] = (prev.usuarios[transferHacia].stock[transferEstilo] || 0) + Number(transferCantidad);
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