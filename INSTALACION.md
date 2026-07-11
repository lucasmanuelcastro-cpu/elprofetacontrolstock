# El Profeta — Control de Stock (clon funcional)

Este es un clon completo y funcional del sistema original de control de stock
y ventas de "El Profeta". Reemplaza el Google Apps Script privado original
(al que no tenía acceso) por uno propio, que vos vas a desplegar en 5 minutos
sobre tu propia Google Sheet. El resto de la app (frontend: HTML/CSS/JS) es
una reconstrucción fiel de la lógica original.

Se quitó el asistente de IA (chat) por decisión tuya, así que **no hace falta
ningún servidor Node/Express**: es 100% frontend estático + Google Sheets.

---

## 1. Crear la Google Sheet (base de datos)

1. Andá a [sheets.google.com](https://sheets.google.com) y creá una hoja de cálculo nueva.
2. Ponele el nombre que quieras, por ejemplo `El Profeta - Base de Datos`.

## 2. Pegar el backend (Apps Script)

1. Dentro de la Sheet: **Extensiones → Apps Script**.
2. Borrá todo el contenido del archivo `Code.gs` que aparece por defecto.
3. Copiá y pegá ahí todo el contenido del archivo `apps-script/Code.gs` que
   te entregué.
4. Guardá (ícono de disquete o `Ctrl+S`).

## 3. Crear las hojas necesarias (una sola vez)

1. En el editor de Apps Script, arriba, elegí la función `setup` en el
   desplegable de funciones (al lado del botón ▶️ Ejecutar).
2. Tocá **Ejecutar**.
3. La primera vez Google te va a pedir autorización: elegí tu cuenta, tocá
   "Avanzado" y luego "Ir a [nombre del proyecto] (no seguro)" — es normal,
   es tu propio script.
4. Cuando termine vas a ver un mensaje "Listo. Todas las hojas fueron
   creadas/verificadas." y en tu Sheet van a aparecer las pestañas:
   `StockUsuarios`, `Ventas`, `Clientes`, `Pagos`, `HistorialStock`,
   `Transferencias`, `Gastos`, `Barriles`, `HistorialBarriles`, `Auditoria`.

## 4. Publicar el script como aplicación web

1. En el editor de Apps Script: **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Configuración:
   - Ejecutar como: **Yo (tu cuenta)**
   - Quién tiene acceso: **Cualquier usuario**
4. Tocá **Implementar**, autorizá de nuevo si te lo pide.
5. Copiá la **URL de la aplicación web** que te da (termina en `/exec`).

> ⚠️ Cada vez que edites `Code.gs` en el futuro, tenés que hacer
> **Implementar → Administrar implementaciones → ✏️ editar → Nueva versión**
> para que los cambios se reflejen en la URL publicada.

## 5. Conectar el frontend

1. Abrí el archivo `config.js` del proyecto.
2. Reemplazá el valor de `URL_SCRIPT` por la URL que copiaste:

```js
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycb.../exec";
```

3. Guardá.

## 6. Usar la app

Solo tenés que abrir `index.html` en el navegador (doble clic, o servirlo con
cualquier hosting estático: GitHub Pages, Netlify, Vercel, etc.). No requiere
build ni instalación de dependencias.

Páginas disponibles:
- `index.html` → Ventas, stock, clientes y transferencias.
- `barriles.html` → Gestión de barriles prestados.
- `gastos.html` → Registro de gastos.
- `auditoria.html` → Historial de auditoría de todas las acciones.

---

## Notas sobre el cálculo de totales financieros

El script original privado (al que no tuve acceso) probablemente calculaba
"Efectivo", "Transferencia" y "Para el Profeta" con alguna fórmula propia
dentro de la Sheet. En este clon los calculo así, de forma transparente y
fácil de editar (todo está en la función `accionSyncGeneral` de `Code.gs`):

- **Efectivo / Transferencia**: suma de `totalCobrado` de cada venta según su
  `metodoPago`, más los pagos de deuda (`Pagos`) según su método.
- **Total ingresado**: efectivo + transferencia.
- **Para el Profeta**: suma del campo `paraProfeta` de cada venta (costo de
  las latas + 50% de la ganancia, tal como lo calcula `ui.js` en
  `calcularPreview()`).

Si tu lógica de negocio real era distinta, es cuestión de ajustar esa función
— quedó comentada y aislada justamente para que sea fácil de modificar.

## Estructura del proyecto

```
├── index.html          → página principal (ventas/stock/clientes)
├── barriles.html/js     → gestión de barriles
├── gastos.html/js       → gestión de gastos
├── auditoria.html       → historial de auditoría
├── config.js            → ⭐ acá va tu URL de Apps Script
├── logic.js             → lógica de sincronización y estado
├── ui.js                → renderizado e interacción
├── styles.css           → estilos
├── EP CARA.png          → logo
└── apps-script/
    └── Code.gs           → backend completo (pegar en Google Apps Script)
```
