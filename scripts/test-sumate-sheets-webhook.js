#!/usr/bin/env node
'use strict';

/**
 * Prueba el webhook de Google Sheets (GET público + POST con token).
 * Uso con .env.local cargado:
 *   export $(grep -v '^#' .env.local | xargs) && node scripts/test-sumate-sheets-webhook.js
 * o en Vercel CLI:
 *   vercel env pull .env.local && source .env.local 2>/dev/null; node scripts/test-sumate-sheets-webhook.js
 */

const { trimString } = require('../lib/quieroayudar-utils');
const { buildSumateSheetPayload } = require('../lib/sumatevoluntariado-sheets');

const url = trimString(process.env.GOOGLE_SHEETS_SUMATE_WEBHOOK_URL);
const secret = trimString(process.env.GOOGLE_SHEETS_SUMATE_SECRET);

if (!url || !secret) {
  console.error('Faltan GOOGLE_SHEETS_SUMATE_WEBHOOK_URL y/o GOOGLE_SHEETS_SUMATE_SECRET');
  process.exit(1);
}

if (!/\/exec\/?$/.test(url)) {
  console.warn('⚠ La URL no termina en /exec — suele ser la causa de errores.\n');
}

const sampleData = {
  email: 'prueba-webhook@example.com',
  nombreCompleto: 'Prueba Webhook',
  edad: 25,
  ocupacion: 'Test',
  domicilio: '',
  celular: '381 4000000',
  conoceActividades: 'no',
  experienciaVoluntariado: 'no',
  experienciaDetalle: '',
  comoSeEntero: 'otro',
  comoSeEnteroLabel: 'Otro',
  conoceIntegrante: 'no',
  integranteQuien: '',
  areas: ['domingos'],
  areasLabels: ['Actividades que realiza el voluntariado todos los domingos'],
  disponibilidad: 'PRUEBA — borrar fila'
};

async function main() {
  console.log('1) GET (incógnito simulado) — debe responder JSON { ok: true } sin login\n');
  const getRes = await fetch(url, { method: 'GET', redirect: 'manual' });
  const getLoc = getRes.headers.get('location') || '';
  console.log('   Status:', getRes.status, getLoc ? '→ ' + getLoc.slice(0, 80) : '');
  const getText = await getRes.text();
  console.log('   Body (primeros 200 chars):', getText.slice(0, 200).replace(/\s+/g, ' '), '\n');

  if (getRes.status === 401) {
    console.error(
      '✗ GET devolvió 401. El despliegue NO es público para visitantes anónimos.\n' +
        '  En Apps Script: Ejecutar como YO + acceso CUALQUIER USUARIO (Anyone).\n' +
        '  Creá una implementación NUEVA, copiá la URL /exec y actualizá Vercel.\n'
    );
    process.exit(1);
  }

  if (getRes.status >= 300 && getRes.status < 400 && /accounts\.google/i.test(getLoc)) {
    console.error('✗ GET redirige a login de Google. Acceso debe ser "Cualquier usuario", no "con cuenta de Google".\n');
    process.exit(1);
  }

  console.log('2) POST con token — debe responder { ok: true } y agregar una fila\n');
  const payload = buildSumateSheetPayload(sampleData, 'PRUEBA SCRIPT — ' + new Date().toISOString(), secret);
  const postRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'DomingosDeRayuela-SumateWebhook/1.0'
    },
    body: JSON.stringify(payload)
  });
  console.log('   Status:', postRes.status);
  const postText = await postRes.text();
  console.log('   Body:', postText.slice(0, 300));

  let postJson;
  try {
    postJson = JSON.parse(postText);
  } catch (_e) {
    postJson = null;
  }

  if (postRes.status === 401) {
    console.error('\n✗ POST 401: despliegue no accesible (mismo arreglo que GET).');
    process.exit(1);
  }

  if (postJson && postJson.ok === true) {
    console.log('\n✓ Webhook OK. Revisá la planilla y borrá la fila de prueba.');
    process.exit(0);
  }

  if (postJson && postJson.error === 'unauthorized') {
    console.error('\n✗ Token rechazado: GOOGLE_SHEETS_SUMATE_SECRET ≠ WEBHOOK_SECRET en Apps Script.');
    process.exit(1);
  }

  console.error('\n✗ Respuesta inesperada. Revisá implementación y permisos del script.');
  process.exit(1);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
