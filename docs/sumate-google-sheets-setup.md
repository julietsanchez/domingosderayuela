# Convocatoria Sumate — registro en Google Sheets

Cada postulación del formulario en `/sumate` se guarda como **una fila** en una Google Sheet y, si eso sale bien, se envía el **mail de aviso** con Resend (como antes).

## Columnas (fila 1)

Copiá exactamente estos encabezados en la **fila 1** de la pestaña `Postulaciones` (una columna por celda, de la A a la O):

| Col | Encabezado |
|-----|------------|
| A | Fecha y hora (AR) |
| B | Correo electrónico |
| C | Nombre y apellido |
| D | Edad |
| E | Ocupación |
| F | Domicilio |
| G | Celular |
| H | ¿Conocés las actividades del voluntariado? |
| I | ¿Voluntariado previo? |
| J | Experiencia previa (detalle) |
| K | ¿Cómo te enteraste? |
| L | ¿Conocés a alguien del voluntariado? |
| M | ¿A quién? |
| N | Áreas de interés |
| O | Disponibilidad horaria |

Las filas nuevas se agregan automáticamente debajo (desde la fila 2 en adelante).

## Paso a paso en Google

1. **Crear la planilla**  
   En [Google Sheets](https://sheets.google.com), archivo nuevo. Nombre sugerido: `Convocatoria voluntariado — Domingos de Rayuela`.

2. **Pestaña y encabezados**  
   - Renombrá la primera pestaña a `Postulaciones` (o dejá el nombre por defecto y cambiá `SHEET_TAB_NAME` en el script si preferís otro).  
   - Pegá en la fila 1 los 15 encabezados de la tabla de arriba.

3. **Apps Script**  
   - Menú **Extensiones → Apps Script**.  
   - Borrá el contenido por defecto y pegá todo el archivo del repo: `docs/google-apps-script-sumate.gs`.  
   - En la línea `WEBHOOK_SECRET`, reemplazá `CAMBIAR_POR_TOKEN_LARGO_ALEATORIO` por un token largo y aleatorio (por ejemplo 32+ caracteres). **Guardalo**: lo vas a repetir en Vercel.

4. **Vincular script a la planilla**  
   El script debe estar ligado a **esta** planilla (el proyecto de Apps Script se abre desde Extensiones en esa hoja). `SpreadsheetApp.getActiveSpreadsheet()` usa esa hoja.

5. **Desplegar como Web App**  
   - **Implementar → Nueva implementación**.  
   - Tipo: **Aplicación web**.  
   - Descripción: ej. `sumate-webhook-v1`.  
   - **Ejecutar como:** Yo (tu cuenta).  
   - **Quién tiene acceso:** **Cualquier usuario** (en inglés: *Anyone*).  
     - Importante: si elegís *Solo yo*, Vercel recibe **HTTP 401** y el formulario falla. La seguridad la da el token `WEBHOOK_SECRET`, no el login de Google.  
   - **Implementar** y autorizá los permisos (lectura/escritura en la hoja).  
   - Copiá la **URL de la aplicación web** (termina en `/exec`). Esa es `GOOGLE_SHEETS_SUMATE_WEBHOOK_URL`.

6. **Probar desde el editor (opcional)**  
   - Ejecutá la función `testAppend` (menú desplegable de funciones → ▶).  
   - Debería aparecer una fila de prueba; borrala después.

7. **Compartir la planilla con el equipo**  
   - Botón **Compartir** en la Sheet.  
   - Agregá las mismas personas que reciben el mail (`MAIL_TO_SUMATE` / `MAIL_BCC`), con rol **Editor** o **Lector** según prefieran editar o solo ver.  
   - No compartas la URL del webhook ni el token; solo la planilla.

## Variables en Vercel

En **Project → Settings → Environment Variables** (Production y Preview si usan formulario en preview):

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `GOOGLE_SHEETS_SUMATE_WEBHOOK_URL` | Sí | URL `/exec` del despliegue de la Web App |
| `GOOGLE_SHEETS_SUMATE_SECRET` | Sí | **Mismo** valor que `WEBHOOK_SECRET` en el `.gs` |

Siguen siendo obligatorias las de correo (`RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO`, o sus variantes `_SUMATE`).

Comprobación local (sin imprimir secretos):

```bash
npm run verify:sumate-env
```

(Requiere tener las variables cargadas en `.env.local` o en el shell.)

## Comportamiento

1. El usuario envía el formulario.  
2. El servidor valida los datos.  
3. **Primero** se agrega la fila en Google Sheets (hasta 2 intentos, timeout ~12 s).  
4. Si la planilla falla → el usuario ve error y **no** se envía mail.  
5. Si la planilla OK → se envía el mail con Resend y respuesta `success: true`.

## Si algo falla

### Sigue HTTP 401 aunque “ya está público”

1. **Prueba en incógnito (la más importante)**  
   Pegá en el navegador la misma URL que está en Vercel (`.../exec`), sin estar logueada en Google o en ventana de incógnito.  
   - Si ves JSON tipo `{"ok":true,"service":"sumate-webhook",...}` → el acceso público está bien.  
   - Si pide login o error 401 → el despliegue **sigue** sin ser anónimo.

2. **Tres opciones que Google muestra distinto** (no son lo mismo):  
   | Opción en español (aprox.) | ¿Sirve para Vercel? |  
   |----------------------------|---------------------|  
   | **Cualquier usuario** / *Anyone* | ✅ Sí |  
   | Cualquier usuario **con cuenta de Google** | ❌ No (suele dar 401) |  
   | Solo yo | ❌ No (401) |  

3. **Ejecutar como: Yo** (no “usuario que accede a la aplicación web”).  

4. **Implementación nueva** después de cambiar acceso: **Implementar → Nueva implementación**, copiá la URL `/exec` y actualizá `GOOGLE_SHEETS_SUMATE_WEBHOOK_URL` en Vercel → **Redeploy**. Editar a veces no actualiza el endpoint que usa el servidor.

5. **Pegá el `doGet` actualizado** del repo (`docs/google-apps-script-sumate.gs`), guardá y volvé a desplegar, para poder usar la prueba de incógnito de arriba.

6. **Script de prueba local** (con `.env.local` con las mismas variables que Production):  
   `node scripts/test-sumate-sheets-webhook.js`

- **`unauthorized` en el JSON (a menudo HTTP 200):** el secreto en Vercel no coincide con `WEBHOOK_SECRET` en Apps Script.  
- **Fila en columna incorrecta:** los encabezados de la fila 1 no coinciden con el orden del documento (no mueve columnas el script; solo hace `appendRow` en orden A→O).  
- **Cambios en el script:** cada cambio en el `.gs` requiere **Nueva implementación** en Apps Script; la URL puede cambiar si creás una implementación nueva (actualizá Vercel si cambia).

## Archivos en el repo

- `docs/google-apps-script-sumate.gs` — código para pegar en Google  
- `lib/sumatevoluntariado-sheets.js` — cliente del webhook desde Vercel  
- `api/sumatevoluntariado.js` — orquesta Sheet + mail  
