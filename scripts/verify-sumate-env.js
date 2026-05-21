#!/usr/bin/env node
'use strict';

/**
 * Verificación local: variables para /api/sumatevoluntariado (Sheet + mail).
 * Uso: npm run verify:sumate-env
 */

function isSet(key) {
  return !!process.env[key] && String(process.env[key]).trim() !== '';
}

function resolveMail(keySpecific, keyGeneral) {
  return isSet(keySpecific) || isSet(keyGeneral);
}

console.log('Comprobando variables de entorno para convocatoria /sumate...\n');

let ok = true;

const sheetsRequired = ['GOOGLE_SHEETS_SUMATE_WEBHOOK_URL', 'GOOGLE_SHEETS_SUMATE_SECRET'];
sheetsRequired.forEach(function (key) {
  const present = isSet(key);
  console.log((present ? '✓' : '✗') + ' ' + key + (present ? ' (definida)' : ' — FALTA'));
  if (!present) ok = false;
});

const resendOk = resolveMail('RESEND_API_KEY_SUMATE', 'RESEND_API_KEY');
console.log(
  (resendOk ? '✓' : '✗') +
    ' RESEND (RESEND_API_KEY_SUMATE o RESEND_API_KEY)' +
    (resendOk ? ' (definida)' : ' — FALTA')
);
if (!resendOk) ok = false;

const fromOk = resolveMail('MAIL_FROM_SUMATE', 'MAIL_FROM');
console.log(
  (fromOk ? '✓' : '✗') +
    ' MAIL_FROM (MAIL_FROM_SUMATE o MAIL_FROM)' +
    (fromOk ? ' (definida)' : ' — FALTA')
);
if (!fromOk) ok = false;

const toOk = resolveMail('MAIL_TO_SUMATE', 'MAIL_TO');
console.log(
  (toOk ? '✓' : '✗') + ' MAIL_TO (MAIL_TO_SUMATE o MAIL_TO)' + (toOk ? ' (definida)' : ' — FALTA')
);
if (!toOk) ok = false;

['MAIL_BCC_SUMATE', 'MAIL_BCC'].forEach(function (key) {
  const present = isSet(key);
  console.log('○ ' + key + (present ? ' (definida)' : ' (opcional)'));
});

console.log('');
if (ok) {
  console.log(
    'Variables obligatorias presentes. Configurá Google según docs/sumate-google-sheets-setup.md y probá con vercel dev.'
  );
  process.exit(0);
} else {
  console.log('Copiá .env.example a .env.local o configurá las variables en Vercel.');
  process.exit(1);
}
