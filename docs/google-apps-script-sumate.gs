/**
 * Domingos de Rayuela — Convocatoria /sumate → Google Sheets
 *
 * 1. Creá una Google Sheet y pegá los encabezados de la fila 1 (ver docs/sumate-google-sheets-setup.md).
 * 2. Extensiones → Apps Script → pegá este archivo completo.
 * 3. Cambiá WEBHOOK_SECRET por un token largo (el mismo valor que GOOGLE_SHEETS_SUMATE_SECRET en Vercel).
 * 4. Desplegar → Nueva implementación → Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Solo yo (el servidor llama con POST; la URL no va al navegador del usuario)
 * 5. Copiá la URL de la implementación a GOOGLE_SHEETS_SUMATE_WEBHOOK_URL en Vercel.
 */

/** @const {string} Mismo valor que GOOGLE_SHEETS_SUMATE_SECRET en Vercel. */
var WEBHOOK_SECRET = '244ae83d38cbe7e033616070ad8794c41c093bab598bdbf5d3ef235fc35e1314';

/** Nombre de la pestaña donde se agregan filas (creala si no existe). */
var SHEET_TAB_NAME = 'Postulaciones';

/**
 * @param {object} payload
 * @param {number} statusCode
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(payload, statusCode) {
  var out = ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
  if (statusCode) {
    // Apps Script no expone status HTTP en doPost; el cliente valida body.ok
  }
  return out;
}

/**
 * @param {GoogleAppsScript.Events.DoPost} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'empty_body' });
    }

    var body = JSON.parse(e.postData.contents);

    if (!body.secret || body.secret !== WEBHOOK_SECRET) {
      return jsonResponse({ ok: false, error: 'unauthorized' });
    }

    var row = body.row;
    if (!row || Object.prototype.toString.call(row) !== '[object Array]' || row.length < 1) {
      return jsonResponse({ ok: false, error: 'invalid_row' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_TAB_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_TAB_NAME);
    }

    sheet.appendRow(row);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/** Prueba manual desde el editor: Ejecutar → testAppend (configurá WEBHOOK_SECRET antes). */
function testAppend() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TAB_NAME);
  if (!sheet) {
    throw new Error('Creá la pestaña "' + SHEET_TAB_NAME + '" con los encabezados en la fila 1.');
  }
  sheet.appendRow([
    'PRUEBA — borrar fila',
    'test@example.com',
    'Nombre Prueba',
    '25',
    'Estudiante',
    '',
    '381 4000000',
    'Sí',
    'No',
    '',
    'Instagram',
    'No',
    '',
    'Actividades domingos',
    'Domingos tarde'
  ]);
}
