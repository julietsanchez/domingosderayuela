'use strict';

const { trimString } = require('./quieroayudar-utils');

/** Encabezados de la fila 1 en Google Sheets (orden de columnas A→O). */
const SUMATE_SHEET_HEADERS = [
  'Fecha y hora (AR)',
  'Correo electrónico',
  'Nombre y apellido',
  'Edad',
  'Ocupación',
  'Domicilio',
  'Celular',
  '¿Conocés las actividades del voluntariado?',
  '¿Voluntariado previo?',
  'Experiencia previa (detalle)',
  '¿Cómo te enteraste?',
  '¿Conocés a alguien del voluntariado?',
  '¿A quién?',
  'Áreas de interés',
  'Disponibilidad horaria'
];

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_MAX_ATTEMPTS = 2;

/**
 * @param {string} v
 * @returns {string}
 */
function siNoLabel(v) {
  return v === 'si' ? 'Sí' : 'No';
}

/**
 * @param {object} data — salida de processSumateBody cuando ok
 * @param {string} receivedAt
 * @returns {string[]}
 */
function buildSumateSheetRow(data, receivedAt) {
  if (!data || typeof data !== 'object') {
    throw new Error('SUMATE_SHEET_INVALID_DATA');
  }

  const areasText =
    Array.isArray(data.areasLabels) && data.areasLabels.length
      ? data.areasLabels.join('; ')
      : '—';

  return [
    receivedAt,
    data.email,
    data.nombreCompleto,
    String(data.edad),
    data.ocupacion,
    data.domicilio || '',
    data.celular,
    siNoLabel(data.conoceActividades),
    siNoLabel(data.experienciaVoluntariado),
    data.experienciaDetalle || '',
    data.comoSeEnteroLabel || data.comoSeEntero || '',
    siNoLabel(data.conoceIntegrante),
    data.integranteQuien || '',
    areasText,
    data.disponibilidad || ''
  ];
}

/**
 * @param {object} data
 * @param {string} receivedAt
 * @param {string} secret
 * @returns {{ secret: string, row: string[] }}
 */
function buildSumateSheetPayload(data, receivedAt, secret) {
  const token = trimString(secret);
  if (!token) {
    throw new Error('SUMATE_SHEET_MISSING_SECRET');
  }
  return {
    secret: token,
    row: buildSumateSheetRow(data, receivedAt)
  };
}

/**
 * @param {unknown} err
 * @returns {string}
 */
function errorMessage(err) {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Mensaje corto para logs / detail al cliente (sin datos personales).
 * @param {number} status
 * @param {unknown} body
 * @returns {string}
 */
function describeSheetsFailure(status, body) {
  if (status === 401) {
    return (
      'HTTP 401 — En Google Apps Script, editá el despliegue de la Web App: ' +
      '"Quién tiene acceso" debe ser Cualquier usuario (Anyone), no Solo yo'
    );
  }
  if (body && typeof body === 'object' && !Array.isArray(body) && body.error === 'unauthorized') {
    return 'Token rechazado — revisá que GOOGLE_SHEETS_SUMATE_SECRET coincida con WEBHOOK_SECRET';
  }
  const errPart =
    body && typeof body === 'object' && !Array.isArray(body) && body.error
      ? ' ' + String(body.error)
      : '';
  return 'HTTP ' + status + errPart;
}

/**
 * @param {Response} res
 * @returns {Promise<{ ok: boolean, status: number, body?: unknown }>}
 */
async function parseWebhookResponse(res) {
  const status = res.status;
  let body;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.indexOf('application/json') !== -1) {
    try {
      body = await res.json();
    } catch (_e) {
      body = null;
    }
  } else {
    const text = await res.text();
    body = text ? { raw: text.slice(0, 200) } : null;
  }

  const ok =
    res.ok &&
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    body.ok === true;

  return { ok, status, body };
}

/**
 * @param {object} options
 * @param {string} options.webhookUrl
 * @param {string} options.secret
 * @param {object} options.data
 * @param {string} options.receivedAt
 * @param {typeof fetch} [options.fetchImpl]
 * @param {number} [options.timeoutMs]
 * @param {number} [options.maxAttempts]
 * @returns {Promise<{ ok: true } | { ok: false, code: string, message: string, detail?: string }>}
 */
async function appendSumateToGoogleSheet(options) {
  const webhookUrl = trimString(options && options.webhookUrl);
  const secret = trimString(options && options.secret);
  const data = options && options.data;
  const receivedAt = trimString(options && options.receivedAt);
  const fetchImpl = (options && options.fetchImpl) || fetch;
  const timeoutMs =
    options && typeof options.timeoutMs === 'number' && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_TIMEOUT_MS;
  const maxAttempts =
    options && typeof options.maxAttempts === 'number' && options.maxAttempts >= 1
      ? Math.floor(options.maxAttempts)
      : DEFAULT_MAX_ATTEMPTS;

  if (!webhookUrl || !secret) {
    return {
      ok: false,
      code: 'SERVER_CONFIG',
      message:
        'El registro en planilla no está configurado en el servidor. Intentá de nuevo en unos minutos o avisanos por otro canal.',
      detail: 'Variables faltantes: GOOGLE_SHEETS_SUMATE_WEBHOOK_URL y/o GOOGLE_SHEETS_SUMATE_SECRET'
    };
  }

  if (!receivedAt) {
    return {
      ok: false,
      code: 'INTERNAL',
      message: 'No se pudo registrar la postulación. Por favor, intentá nuevamente.',
      detail: 'receivedAt vacío'
    };
  }

  let payload;
  try {
    payload = buildSumateSheetPayload(data, receivedAt, secret);
  } catch (e) {
    return {
      ok: false,
      code: 'INTERNAL',
      message: 'No se pudo preparar el registro. Por favor, intentá nuevamente.',
      detail: errorMessage(e)
    };
  }

  if (payload.row.length !== SUMATE_SHEET_HEADERS.length) {
    return {
      ok: false,
      code: 'INTERNAL',
      message: 'No se pudo preparar el registro. Por favor, intentá nuevamente.',
      detail:
        'columnas=' + String(payload.row.length) + ' esperadas=' + String(SUMATE_SHEET_HEADERS.length)
    };
  }

  let lastDetail = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, timeoutMs);

    try {
      const res = await fetchImpl(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timer);

      const parsed = await parseWebhookResponse(res);

      if (parsed.ok) {
        console.log(
          '[sumatevoluntariado] Google Sheet: fila agregada. attempt=' +
            attempt +
            ' status=' +
            parsed.status
        );
        return { ok: true };
      }

      lastDetail = describeSheetsFailure(parsed.status, parsed.body);
      console.error(
        '[sumatevoluntariado] Google Sheet rechazó el pedido. attempt=' +
          attempt +
          ' ' +
          lastDetail
      );
    } catch (err) {
      clearTimeout(timer);
      const aborted = err && typeof err === 'object' && err.name === 'AbortError';
      lastDetail = aborted ? 'timeout después de ' + timeoutMs + 'ms' : errorMessage(err);
      console.error(
        '[sumatevoluntariado] Error al llamar Google Sheet. attempt=' +
          attempt +
          ' ' +
          lastDetail
      );
    }

    if (attempt < maxAttempts) {
      await new Promise(function (resolve) {
        setTimeout(resolve, 400);
      });
    }
  }

  return {
    ok: false,
    code: 'SHEETS_PROVIDER',
    message:
      'No pudimos guardar tu postulación en este momento. Por favor, intentá nuevamente en unos minutos o avisanos por otro canal.',
    detail: lastDetail
  };
}

module.exports = {
  SUMATE_SHEET_HEADERS,
  buildSumateSheetRow,
  buildSumateSheetPayload,
  describeSheetsFailure,
  appendSumateToGoogleSheet
};
