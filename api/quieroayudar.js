'use strict';

/**
 * POST /api/quieroayudar — envío del formulario "Quiero ayudar" vía Resend.
 *
 * Variables de entorno (configurar en Vercel → Project → Settings → Environment Variables):
 * - RESEND_API_KEY   — API key de Resend (secreto).
 * - MAIL_FROM        — Remitente verificado, ej: "Domingos de Rayuela <no-reply@tudominio.com>".
 * - MAIL_TO          — Destinatario principal (campo To), una casilla.
 * - MAIL_BCC         — Opcional. Lista separada por comas para copias ocultas.
 *
 * No registrar valores secretos en el cliente ni en logs con datos personales completos.
 */

const { Resend } = require('resend');
const { trimString, parseBccList, escapeHtml } = require('../lib/quieroayudar-utils');

const MOTIVO_LABELS = {
  donaciones: 'Donaciones',
  padrinos: 'Programa de padrinos',
  voluntariado: 'Programa de voluntariado'
};

const ALLOWED_MOTIVOS = Object.keys(MOTIVO_LABELS);

const MAX_BODY_BYTES = 48 * 1024;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<Record<string, unknown>>}
 */
function readJsonBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let total = 0;

    req.on('data', function (chunk) {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', function () {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw || !raw.trim()) {
          resolve({});
          return;
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          resolve(parsed);
        } else {
          reject(new Error('INVALID_JSON_SHAPE'));
        }
      } catch (e) {
        reject(e);
      }
    });

    req.on('error', reject);
  });
}

/**
 * @param {object} params
 * @returns {{ html: string, text: string }}
 */
function buildEmailContent(params) {
  const {
    nombre,
    apellido,
    email,
    whatsapp,
    motivoLabel,
    contanosMas,
    receivedAt
  } = params;

  const nl = contanosMas ? escapeHtml(contanosMas).replace(/\r\n/g, '\n').replace(/\n/g, '<br>') : '—';

  const html =
    '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.5;max-width:560px;">' +
    '<p style="margin:0 0 16px;font-weight:700;color:#0d6b4c;">Domingos de Rayuela</p>' +
    '<h1 style="margin:0 0 12px;font-size:18px;">Nuevo formulario — Quiero ayudar</h1>' +
    '<p style="margin:0 0 20px;color:#555;font-size:14px;">Recibido: <strong>' +
    escapeHtml(receivedAt) +
    '</strong></p>' +
    '<table style="width:100%;border-collapse:collapse;">' +
    row('Nombre', nombre) +
    row('Apellido', apellido) +
    row('Correo electrónico', email) +
    row('WhatsApp', whatsapp) +
    row('Motivo', motivoLabel) +
    '</table>' +
    '<p style="margin:20px 0 6px;font-weight:600;">Contanos más</p>' +
    '<div style="padding:12px 14px;background:#f6f7f9;border-radius:8px;border:1px solid #e8eaed;">' +
    nl +
    '</div>' +
    '</div>';

  const textLines = [
    'Domingos de Rayuela — Nuevo formulario: Quiero ayudar',
    'Recibido: ' + receivedAt,
    '',
    'Nombre: ' + nombre,
    'Apellido: ' + apellido,
    'Correo electrónico: ' + email,
    'WhatsApp: ' + whatsapp,
    'Motivo: ' + motivoLabel,
    '',
    'Contanos más:',
    contanosMas || '—',
    ''
  ];
  const text = textLines.join('\n');

  return { html, text };
}

/**
 * @param {string} label
 * @param {string} value
 */
function row(label, value) {
  return (
    '<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;width:38%;vertical-align:top;">' +
    escapeHtml(label) +
    '</td><td style="padding:8px 0;border-bottom:1px solid #eee;vertical-align:top;">' +
    escapeHtml(value) +
    '</td></tr>'
  );
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Solo se aceptan solicitudes POST.'
        }
      })
    );
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    if (err && err.message === 'PAYLOAD_TOO_LARGE') {
      res.statusCode = 413;
      res.end(
        JSON.stringify({
          success: false,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'El envío es demasiado grande.'
          }
        })
      );
      return;
    }
    console.error('[quieroayudar] JSON inválido o no legible');
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'No se pudo leer el cuerpo del pedido.'
        }
      })
    );
    return;
  }

  const honeypot = trimString(body.website);
  if (honeypot) {
    console.warn('[quieroayudar] Honeypot activado (descartado sin enviar correo)');
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true }));
    return;
  }

  const nombre = trimString(body.nombre);
  const apellido = trimString(body.apellido);
  const email = trimString(body.email);
  const whatsapp = trimString(body.whatsapp);
  const motivo = trimString(body.motivo);
  const contanosMas = trimString(body.contanosMas);

  const missing = [];
  if (!nombre) missing.push('nombre');
  if (!apellido) missing.push('apellido');
  if (!email) missing.push('email');
  if (!whatsapp) missing.push('whatsapp');
  if (!motivo) missing.push('motivo');

  if (missing.length) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Faltan datos obligatorios. Revisá los campos marcados e intentá de nuevo.',
          fields: missing
        }
      })
    );
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El correo electrónico no tiene un formato válido.'
        }
      })
    );
    return;
  }

  if (ALLOWED_MOTIVOS.indexOf(motivo) === -1) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El motivo seleccionado no es válido.'
        }
      })
    );
    return;
  }

  const apiKey = trimString(process.env.RESEND_API_KEY);
  const mailFrom = trimString(process.env.MAIL_FROM);
  const mailTo = trimString(process.env.MAIL_TO);
  const mailBccRaw = process.env.MAIL_BCC;

  if (!apiKey || !mailFrom || !mailTo) {
    console.error('[quieroayudar] Falta configuración: RESEND_API_KEY, MAIL_FROM o MAIL_TO');
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'SERVER_CONFIG',
          message: 'Ocurrió un problema al enviar el formulario. Por favor, intentá nuevamente.'
        }
      })
    );
    return;
  }

  const bccList = parseBccList(mailBccRaw);
  const receivedAt = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'long',
    timeStyle: 'short'
  });

  const motivoLabel = MOTIVO_LABELS[motivo] || motivo;
  const { html, text } = buildEmailContent({
    nombre,
    apellido,
    email,
    whatsapp,
    motivoLabel,
    contanosMas,
    receivedAt
  });

  try {
    const resend = new Resend(apiKey);
    const payload = {
      from: mailFrom,
      to: mailTo,
      replyTo: email,
      subject: 'Nuevo formulario recibido - Quiero ayudar',
      html,
      text
    };
    if (bccList.length) {
      payload.bcc = bccList;
    }

    const result = await resend.emails.send(payload);

    if (result.error) {
      console.error('[quieroayudar] Resend respondió con error:', result.error.message || 'desconocido');
      res.statusCode = 502;
      res.end(
        JSON.stringify({
          success: false,
          error: {
            code: 'MAIL_PROVIDER',
            message: 'Ocurrió un problema al enviar el formulario. Por favor, intentá nuevamente.'
          }
        })
      );
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[quieroayudar] Error inesperado al enviar:', msg);
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL',
          message: 'Ocurrió un problema al enviar el formulario. Por favor, intentá nuevamente.'
        }
      })
    );
  }
};
