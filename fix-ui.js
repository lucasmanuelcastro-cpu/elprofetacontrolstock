// fix-ui.js — patch to override a broken renderVentasGeneral in ui.js
// This file is intentionally small: it re-defines renderVentasGeneral to avoid
// a syntax error caused by a truncated template in ui.js. Once ui.js is fixed
// upstream this file can be removed.

function renderVentasGeneral() {
  const container = document.getElementById("ventas-general-section");
  if (!container) return;

  const dineroEfectivo = state.efectivoSheet;
  const dineroTransferencia = state.transferenciaSheet;
  const dineroTotal = state.totalIngresadoSheet;
  const totalProfeta = state.paraProfetaSheet;

  const todasLasVentas = getVentasGenerales().filter(v => ventaApareceEnHistorialGlobal(v));

  let html = `
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
    <div class="card" style="border-left: 4px solid #059669;">
      <h2>💵 Dinero Ingresado (Efectivo)</h2>
      <p class="big-number" style="color:#059669;">${dineroEfectivo != null ? '$' + dineroEfectivo.toLocaleString('es-AR') : '—'}</p>
      <small>Ventas cobradas en efectivo (prorrateadas si hay pagos parciales)</small>
    </div>
    <div class="card" style="border-left: 4px solid #2563eb;">
      <h2>🏦 Dinero Ingresado (Transferencia)</h2>
      <p class="big-number" style="color:#2563eb;">${dineroTransferencia != null ? '$' + dineroTransferencia.toLocaleString('es-AR') : '—'}</p>
      <small>Ventas cobradas por transferencia</small>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
    <div class="card" style="border-left: 4px solid #3b82f6;">
      <h2>💰 Total Ingresado</h2>
      <p class="big-number" style="color:#3b82f6;">${dineroTotal != null ? '$' + dineroTotal.toLocaleString('es-AR') : '—'}</p>
      <small>${dineroTotal != null ? '📊 Solo lo cobrado hasta ahora' : 'Sincronizando...'}</small>
    </div>
    <div class="card">
      <h2>👑 Para El Profeta (Total)</h2>
      <p class="big-number" style="color:#059669;">${totalProfeta != null ? '$' + totalProfeta.toLocaleString('es-AR') : '—'}</p>
      <small>Costo + 50% Ganancia generada (prorrateado si hay pagos parciales)</small>
    </div>
  </div>
  <div class="card" style="margin-top: 20px; border-left: 4px solid #7c3aed;">
    <h2>📋 Historial Global (${todasLasVentas.length} ventas cobradas)</h2>
    <p style="color:#64748b; font-size:0.85em; margin:0 0 8px 0;">Solo aparecen acá las ventas 100% saldadas. Sheet: botón «Guardar en Sheet».</p>
    <div style="max-height: 300px; overflow-y: auto; margin-top: 10px;">
  `;

  if (todasLasVentas.length === 0) {
    html += '<p style="color:gray;">No hay ventas cobradas en su totalidad aún.</p>';
  } else {
    const ordenadas = [...todasLasVentas].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    ordenadas.forEach(v => {
      const vendedor = v.vendedor || Object.keys(state.usuarios).find(u => state.usuarios[u].ventas.some(vv => vv === v)) || '—';
      const latasHtml = Object.entries(v.estilos || {}).filter(([,c]) => Number(c) > 0).map(([e,c]) => `${c} ${e}`).join(', ');
      const barrilesHtml = (v.barriles && v.barriles.length > 0) ? v.barriles.map(b => `1x Barril ${b.tipo} ${b.tamano}`).join(', ') : '';
      const sumLatas = Object.values(v.estilos || {}).reduce((a,b) => a + (Number(b)||0), 0);

      html += `
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
          ${latasHtml || ''}
          ${barrilesHtml ? `<span style="color:#7c3aed; font-weight:600; margin-left:6px;">🍺 ${barrilesHtml}</span>` : ''}
          ${sumLatas ? `<b style="color:#1e40af; margin-left:6px;">(${sumLatas} latas)</b>` : ''}
        </div>
        <div style="display:flex; gap:8px; margin-top:6px; align-items:center;">
          <span style="background:${v.tipoLata === 'sinEtiqueta' ? '#dbeafe' : '#fef9c3'}; padding:4px 8px; border-radius:8px; font-weight:600;">
            ${v.tipoLata === 'sinEtiqueta' ? 'Sin Etiqueta' : 'Con Etiqueta'}
          </span>
          <span style="margin-left:auto; color:#334155; font-weight:700;">Total: ${Number(v.totalCobrado || 0).toLocaleString('es-AR')}</span>
        </div>
      </div>`;
    });
  }

  html += '</div></div>';
  container.innerHTML = html;
}
