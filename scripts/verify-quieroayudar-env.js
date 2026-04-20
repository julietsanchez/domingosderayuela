#!/usr/bin/env node
'use strict';

/**
 * Verificación local: lista variables requeridas para /api/quieroayudar
 * sin imprimir secretos. Uso: npm run verify:env
 */

const required = ['RESEND_API_KEY', 'MAIL_FROM', 'MAIL_TO'];
const optional = ['MAIL_BCC'];

console.log('Comprobando variables de entorno para el formulario "Quiero ayudar"...\n');

let ok = true;
required.forEach(function (key) {
  const present = !!process.env[key] && String(process.env[key]).trim() !== '';
  console.log((present ? '✓' : '✗') + ' ' + key + (present ? ' (definida)' : ' — FALTA'));
  if (!present) ok = false;
});

optional.forEach(function (key) {
  const present = !!process.env[key] && String(process.env[key]).trim() !== '';
  console.log((present ? '○' : '○') + ' ' + key + (present ? ' (definida)' : ' (opcional, sin valor)'));
});


console.log('\nConvocatoria /sumate (opcional — si falta, se usan RESEND_API_KEY, MAIL_FROM, MAIL_TO):');
['MAIL_TO_SUMATE', 'MAIL_FROM_SUMATE', 'MAIL_BCC_SUMATE', 'RESEND_API_KEY_SUMATE'].forEach(function (key) {
  const present = !!process.env[key] && String(process.env[key]).trim() !== '';
  console.log((present ? '○' : '○') + ' ' + key + (present ? ' (definida)' : ' (sin valor)'));
});

console.log('');
if (ok) {
  console.log('Variables obligatorias presentes. Podés probar con `vercel dev` y el formulario en local.');
  process.exit(0);
} else {
  console.log('Copiá .env.example a .env.local o configurá las variables en Vercel.');
  process.exit(1);
}
