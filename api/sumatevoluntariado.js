'use strict';

/**
 * POST /api/sumatevoluntariado — formulario de convocatoria en /sumate (Resend).
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 * - RESEND_API_KEY — obligatoria (salvo que definas RESEND_API_KEY_SUMATE).
 * - RESEND_API_KEY_SUMATE — opcional. Otra API key de Resend solo para esta convocatoria.
 * - MAIL_FROM, MAIL_TO — obligatorias si no usás las específicas de sumate.
 * - MAIL_FROM_SUMATE — opcional. Remitente distinto (debe estar verificado en Resend).
 * - MAIL_TO_SUMATE — opcional. Casilla distinta para recibir postulaciones.
 * - MAIL_BCC_SUMATE — opcional. BCC solo para sumate (no hereda MAIL_BCC de Quiero ayudar).
 */

const { Resend } = require('resend');
const { trimString, parseBccList } = require('../lib/quieroayudar-utils');
const { processSumateBody, buildSumateEmailContent } = require('../lib/sumatevoluntariado-mail');

const MAX_BODY_BYTES = 64 * 1024;

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
    console.error('[sumatevoluntariado] JSON inválido o no legible');
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

  const processed = processSumateBody(body);

  if (processed.honeypot) {
    console.warn('[sumatevoluntariado] Honeypot activado (descartado sin enviar correo)');
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (!processed.ok) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code: processed.code || 'VALIDATION_ERROR',
          message: processed.message,
          fields: processed.fields
        }
      })
    );
    return;
  }

  const apiKey =
    trimString(process.env.RESEND_API_KEY_SUMATE) || trimString(process.env.RESEND_API_KEY);
  const mailFrom =
    trimString(process.env.MAIL_FROM_SUMATE) || trimString(process.env.MAIL_FROM);
  const mailTo = trimString(process.env.MAIL_TO_SUMATE) || trimString(process.env.MAIL_TO);
  const mailBccRaw = process.env.MAIL_BCC_SUMATE;

  if (!apiKey || !mailFrom || !mailTo) {
    console.error(
      '[sumatevoluntariado] Falta configuración: RESEND_API_KEY (o RESEND_API_KEY_SUMATE), MAIL_FROM (o MAIL_FROM_SUMATE) o MAIL_TO (o MAIL_TO_SUMATE)'
    );
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

  const bccList = parseBccList(mailBccRaw != null ? String(mailBccRaw) : '');
  const receivedAt = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'long',
    timeStyle: 'short'
  });

  const { html, text } = buildSumateEmailContent(processed.data, receivedAt);

  try {
    const resend = new Resend(apiKey);
    const payload = {
      from: mailFrom,
      to: mailTo,
      replyTo: processed.data.email,
      subject: 'Nueva postulación — Convocatoria voluntariado (sumate)',
      html,
      text
    };
    if (bccList.length) {
      payload.bcc = bccList;
    }

    const result = await resend.emails.send(payload);

    if (result.error) {
      console.error(
        '[sumatevoluntariado] Resend respondió con error:',
        result.error.message || 'desconocido'
      );
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
    console.error('[sumatevoluntariado] Error inesperado al enviar:', msg);
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
