// ============================================================
// CLAUDE-ASSISTANT.JS — Asistente IA para El Profeta
// Se inyecta encima de la app existente sin modificar nada.
// ============================================================

(function () {

  // ── Estilos del widget ──────────────────────────────────────
  const CSS = `
    #ep-fab {
      position: fixed; bottom: 28px; right: 28px; z-index: 9999;
      width: 58px; height: 58px; border-radius: 50%;
      background: #1e40af; color: white; border: none;
      font-size: 26px; cursor: pointer;
      box-shadow: 0 6px 24px rgba(30,64,175,0.45);
      transition: transform .2s, box-shadow .2s;
      display: flex; align-items: center; justify-content: center;
    }
    #ep-fab:hover { transform: scale(1.09); box-shadow: 0 10px 32px rgba(30,64,175,0.55); }

    #ep-panel {
      position: fixed; bottom: 100px; right: 28px; z-index: 9998;
      width: 360px; max-height: 580px;
      background: white; border-radius: 20px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.18);
      display: flex; flex-direction: column;
      overflow: hidden; transition: opacity .2s, transform .2s;
      font-family: 'Segoe UI', sans-serif;
    }
    #ep-panel.ep-hidden { opacity: 0; transform: translateY(16px); pointer-events: none; }

    #ep-header {
      background: #1e40af; color: white;
      padding: 14px 18px; display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    #ep-header .ep-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    #ep-header .ep-title { flex: 1; }
    #ep-header .ep-title strong { display: block; font-size: 14px; }
    #ep-header .ep-title span { font-size: 11px; opacity: .75; }
    #ep-header button {
      background: none; border: none; color: white;
      font-size: 18px; cursor: pointer; padding: 0; opacity: .8;
    }
    #ep-header button:hover { opacity: 1; }

    #ep-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
    }

    .ep-msg {
      max-width: 88%; padding: 9px 13px;
      border-radius: 14px; font-size: 13.5px; line-height: 1.5;
      animation: epFadeUp .18s ease both;
    }
    @keyframes epFadeUp {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .ep-msg.ep-user {
      align-self: flex-end;
      background: #1e40af; color: white;
      border-radius: 14px 4px 14px 14px;
    }
    .ep-msg.ep-bot {
      align-self: flex-start;
      background: #f1f5f9; color: #1e293b;
      border-radius: 4px 14px 14px 14px;
    }
    .ep-msg.ep-bot.ep-ok  { background: #ecfdf5; border-left: 3px solid #059669; }
    .ep-msg.ep-bot.ep-err { background: #fff1f2; border-left: 3px solid #ef4444; }

    .ep-typing { display: flex; gap: 4px; align-items: center; padding: 2px 0; }
    .ep-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: #94a3b8;
      animation: epDot 1.2s infinite ease-in-out;
    }
    .ep-typing span:nth-child(2) { animation-delay: .2s; }
    .ep-typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes epDot {
      0%,80%,100% { transform: scale(.7); opacity:.4; }
      40%          { transform: scale(1);  opacity:1;  }
    }

    #ep-suggestions {
      padding: 0 10px 10px;
      display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0;
    }
    #ep-suggestions button {
      background: #eff6ff; color: #1e40af;
      border: 1px solid #bfdbfe; border-radius: 20px;
      padding: 5px 12px; font-size: 12px; cursor: pointer;
      transition: background .15s;
    }
    #ep-suggestions button:hover { background: #dbeafe; }

    #ep-input-area {
      border-top: 1px solid #e5e7eb;
      padding: 10px 12px; display: flex; gap: 8px; align-items: flex-end;
      flex-shrink: 0;
    }
    #ep-input {
      flex: 1; resize: none; border: 1px solid #d1d5db;
      border-radius: 10px; padding: 8px 10px;
      font-family: inherit; font-size: 13.5px;
      color: #1e293b; background: #f9fafb;
      line-height: 1.45; min-height: 36px; max-height: 100px;
      overflow-y: auto; outline: none;
    }
    #ep-input:focus { border-color: #1e40af; background: white; }
    #ep-send {
      width: 34px; height: 34px; border-radius: 50%;
      background: #1e40af; color: white; border: none;
      cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: opacity .15s;
    }
    #ep-send:hover { opacity: .85; }
    #ep-send:disabled { opacity: .35; cursor: not-allowed; }
    #ep-send svg { width: 15px; height: 15px; }

    @media (max-width: 480px) {
      #ep-panel { width: calc(100vw - 24px); right: 12px; }
      #ep-fab   { bottom: 16px; right: 16px; }
    }
  `;

  // ── Inyectar CSS ───────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  // ── HTML del widget ────────────────────────────────────────
  document.body.insertAdjacentHTML("beforeend", `
    <button id="ep-fab" title="Asistente IA">🤖</button>

    <div id="ep-panel" class="ep-hidden">
      <div id="ep-header">
        <div class="ep-avatar">🤖</div>
        <div class="ep-title">
          <strong>Asistente El Profeta</strong>
          <span>Powered by Claude</span>
        </div>
        <button onclick="epToggle()" title="Cerrar">✕</button>
      </div>

      <div id="ep-messages"></div>

      <div id="ep-suggestions">
        <button onclick="epSuggest('¿Cuánto stock hay disponible?')">📦 Ver stock</button>
        <button onclick="epSuggest('¿Cuánto se vendió en total?')">💰 Ver ventas</button>
        <button onclick="epSuggest('¿Quiénes deben plata?')">👥 Deudores</button>
        <button onclick="epSuggest('Ayuda, ¿qué puedo pedirte?')">❓ Ayuda</button>
      </div>

      <div id="ep-input-area">
        <textarea id="ep-input" rows="1" placeholder="Ej: Agregá 24 Blonde al stock de Julián..."></textarea>
        <button id="ep-send" onclick="epSend()">
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 8L14 8M14 8L9 3M14 8L9 13" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  `);

  // ── Estado del chat ────────────────────────────────────────
  let epHistory = [];
  let epOpen    = false;

  // ── Toggle panel ───────────────────────────────────────────
  window.epToggle = function () {
    epOpen = !epOpen;
    document.getElementById("ep-panel").classList.toggle("ep-hidden", !epOpen);
    if (epOpen && epHistory.length === 0) epBotMsg(
      "¡Hola! Soy tu asistente para El Profeta 🍺\n\nPodés pedirme cosas como:\n• \"Agregá 24 Blonde al stock de Julián\"\n• \"Registrá venta de 6 IPA y 4 Stout por $18000 a Rodrigo\"\n• \"Transferí 10 Honey de Matías a Lucas\"\n• \"¿Cuánto stock queda?\"\n\n¿En qué te ayudo?"
    );
    if (epOpen) setTimeout(() => document.getElementById("ep-input").focus(), 50);
  };

  document.getElementById("ep-fab").onclick = epToggle;

  // ── Atajos de teclado ──────────────────────────────────────
  document.getElementById("ep-input").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); epSend(); }
  });
  document.getElementById("ep-input").addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 100) + "px";
  });

  window.epSuggest = function (txt) {
    document.getElementById("ep-input").value = txt;
    epSend();
  };

  // ── Agregar mensaje usuario ────────────────────────────────
  function epUserMsg(txt) {
    const div = document.createElement("div");
    div.className = "ep-msg ep-user";
    div.textContent = txt;
    document.getElementById("ep-messages").appendChild(div);
    epScroll();
  }

  // ── Agregar mensaje bot ────────────────────────────────────
  function epBotMsg(txt, tipo = "") {
    const div = document.createElement("div");
    div.className = "ep-msg ep-bot " + tipo;
    div.style.whiteSpace = "pre-wrap";
    div.textContent = txt;
    document.getElementById("ep-messages").appendChild(div);
    epScroll();
    return div;
  }

  // ── Typing indicator ───────────────────────────────────────
  function epShowTyping() {
    const div = document.createElement("div");
    div.id = "ep-typing";
    div.className = "ep-msg ep-bot";
    div.innerHTML = '<div class="ep-typing"><span></span><span></span><span></span></div>';
    document.getElementById("ep-messages").appendChild(div);
    epScroll();
  }
  function epHideTyping() {
    const el = document.getElementById("ep-typing");
    if (el) el.remove();
  }

  function epScroll() {
    const m = document.getElementById("ep-messages");
    m.scrollTop = m.scrollHeight;
  }

  // ── Snapshot del estado actual para dar contexto a Claude ──
  function epGetContexto() {
    const stockLines = Object.keys(state.usuarios).map(u => {
      const stocks = estilosBase.map(e => `${e}: ${state.usuarios[u].stock[e] || 0}`).join(", ");
      return `  ${u} → ${stocks}`;
    }).join("\n");

    const general = estilosBase.map(e => `${e}: ${state.stockGeneral[e] || 0}`).join(", ");

    const deudores = state.clientesGlobales
      .filter(c => (c.deuda - c.pagado) > 0)
      .map(c => `${c.nombre}: $${(c.deuda - c.pagado).toLocaleString()}`)
      .join(", ") || "ninguno";

    const stats = getEstadisticasVentas();
    const totalVentas = getVentasGenerales().length;
    const efectivo = getTotalVentasPorMetodo("efectivo");
    const transf    = getTotalVentasPorMetodo("transferencia");

    return `ESTADO ACTUAL DE LA APP EL PROFETA
Fecha: ${new Date().toLocaleDateString("es-AR")}
Usuario activo: ${state.usuarioActivo || "ninguno"}

STOCK GENERAL: ${general}

STOCK INDIVIDUAL:
${stockLines}

VENTAS: ${totalVentas} ventas registradas
  Efectivo: $${efectivo.toLocaleString()}
  Transferencia: $${transf.toLocaleString()}
  Total: $${(efectivo + transf).toLocaleString()}

DEUDORES: ${deudores}

ESTILOS DISPONIBLES: ${estilosBase.join(", ")}
USUARIOS: ${Object.keys(state.usuarios).join(", ")}`;
  }

  // ── System prompt para Claude ──────────────────────────────
  function epSystemPrompt() {
    return `Sos el asistente inteligente de "El Profeta", un sistema de gestión de stock de cervezas artesanales.

Tu trabajo es ayudar al usuario a manejar la app. Podés hacer DOS cosas:

1. RESPONDER PREGUNTAS sobre el estado actual (stock, ventas, deudores, etc.)
2. EJECUTAR ACCIONES en la app mediante comandos JSON

Cuando el usuario pida ejecutar una acción, respondé SIEMPRE con un bloque JSON así:
\`\`\`json
{
  "accion": "NOMBRE_ACCION",
  "params": { ... },
  "mensaje": "Texto amigable explicando qué hiciste"
}
\`\`\`

ACCIONES DISPONIBLES:

• modificarStock → params: { usuario, estilo, cantidad }
  Ej: "Agregá 24 Blonde a Julián" → { "usuario": "Julian", "estilo": "BLONDE", "cantidad": 24 }
  Nota: suma a lo existente, no reemplaza.

• sumarStock → params: { usuario, estilo, cantidad }
  Igual que modificarStock pero siempre suma.

• registrarVenta → params: { usuario, estilos: {ESTILO: cantidad}, cliente, totalCobrado, metodoPago }
  Ej: { "usuario": "Matias", "estilos": {"BLONDE": 6, "STOUT": 4}, "cliente": "Rodrigo", "totalCobrado": 18000, "metodoPago": "efectivo" }

• transferirStock → params: { desde, hacia, estilo, cantidad }
  Ej: { "desde": "Julian", "hacia": "Lucas", "estilo": "HONEY", "cantidad": 10 }

• seleccionarUsuario → params: { usuario }
  Abre el panel de ese usuario.

• registrarPago → params: { cliente, monto, metodo }
  Registra un pago de un cliente deudor.

REGLAS IMPORTANTES:
- Los nombres de estilos van SIEMPRE en mayúsculas: BLONDE, IRISH RED, STOUT, SESSION IPA, RED IPA, HONEY
- Los nombres de usuarios: Julian, Matias, Lucas (con mayúscula inicial exacta)
- Si el usuario pide una acción pero faltan datos (ej: no dice el monto), preguntale antes de ejecutar
- Si solo pregunta algo (consulta de stock, ventas, etc.) respondé en texto normal SIN JSON
- Respondé siempre en español, de forma concisa y amigable
- Cuando confirmes una acción exitosa usá emojis apropiados 🍺✅

${epGetContexto()}`;
  }

  // ── Ejecutar acción parseada ───────────────────────────────
  function epEjecutarAccion(cmd) {
    const { accion, params } = cmd;
    try {
      switch (accion) {

        case "modificarStock":
        case "sumarStock": {
          const { usuario, estilo, cantidad } = params;
          if (!state.usuarios[usuario]) throw new Error(`Usuario "${usuario}" no existe`);
          const actual = state.usuarios[usuario].stock[estilo] || 0;
          modificarStockDirecto(usuario, estilo, actual + Number(cantidad));
          return true;
        }

        case "registrarVenta": {
          const { usuario, estilos, cliente, totalCobrado, metodoPago } = params;
          if (!state.usuarios[usuario]) throw new Error(`Usuario "${usuario}" no existe`);

          setState(prev => {
            prev.usuarioActivo     = usuario;
            prev.ventaActual       = estilos || {};
            prev.clienteNombre     = cliente || "";
            prev.totalCobradoInput = String(totalCobrado || 0);
            prev.metodoPago        = metodoPago || "efectivo";
            return prev;
          });

          // Asignar método de pago al objeto de venta luego de registrar
          registrarVentaLocal();

          // Parchar el método de pago en la última venta si no es efectivo
          if (metodoPago && metodoPago !== "efectivo") {
            setState(prev => {
              const ventas = prev.usuarios[usuario].ventas;
              if (ventas.length > 0) {
                ventas[ventas.length - 1].metodoPago = metodoPago;
              }
              return prev;
            });
          }
          return true;
        }

        case "transferirStock": {
          const { desde, hacia, estilo, cantidad } = params;
          setState(prev => {
            prev.transferDesde    = desde;
            prev.transferHacia    = hacia;
            prev.transferEstilo   = estilo;
            prev.transferCantidad = Number(cantidad);
            return prev;
          });
          transferirStock();
          return true;
        }

        case "seleccionarUsuario": {
          setState(prev => { prev.usuarioActivo = params.usuario; return prev; });
          return true;
        }

        case "registrarPago": {
          const { cliente, monto, metodo } = params;
          const idx = state.clientesGlobales.findIndex(
            c => c.nombre.toLowerCase() === cliente.toLowerCase()
          );
          if (idx === -1) throw new Error(`Cliente "${cliente}" no encontrado`);
          const fecha = new Date().toLocaleDateString("es-AR");
          setState(prev => {
            const c = prev.clientesGlobales[idx];
            c.pagado += Number(monto);
            if (!c.pagos) c.pagos = [];
            c.pagos.push({ monto: Number(monto), metodo: metodo || "efectivo", fecha });
            return prev;
          });
          return true;
        }

        default:
          throw new Error(`Acción desconocida: ${accion}`);
      }
    } catch (err) {
      epBotMsg("❌ Error al ejecutar: " + err.message, "ep-err");
      return false;
    }
  }

  // ── Enviar mensaje ─────────────────────────────────────────
  window.epSend = async function () {
    const input = document.getElementById("ep-input");
    const txt   = input.value.trim();
    if (!txt) return;

    input.value = "";
    input.style.height = "auto";
    document.getElementById("ep-send").disabled = true;

    epUserMsg(txt);
    epHistory.push({ role: "user", content: txt });
    epShowTyping();

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: epSystemPrompt(),
          messages: epHistory,
        }),
      });

      const data = await resp.json();
      epHideTyping();

      const reply = data.content
        ? data.content.filter(b => b.type === "text").map(b => b.text).join("\n")
        : (data.error ? "Error API: " + data.error.message : "Sin respuesta");

      epHistory.push({ role: "assistant", content: reply });

      // ── Detectar y ejecutar JSON de acción ─────────────────
      const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const cmd = JSON.parse(jsonMatch[1]);
          const ok  = epEjecutarAccion(cmd);
          if (ok) {
            epBotMsg("✅ " + (cmd.mensaje || "Acción ejecutada correctamente."), "ep-ok");
          }
        } catch (parseErr) {
          epBotMsg(reply);
        }
      } else {
        epBotMsg(reply);
      }

    } catch (err) {
      epHideTyping();
      epBotMsg("❌ Error de conexión: " + err.message, "ep-err");
    }

    document.getElementById("ep-send").disabled = false;
    input.focus();
  };

})();
