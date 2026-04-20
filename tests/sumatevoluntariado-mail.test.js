'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAreas,
  processSumateBody,
  buildSumateEmailContent
} = require('../lib/sumatevoluntariado-mail');

test('normalizeAreas acepta array y filtra valores inválidos', function () {
  assert.deepEqual(normalizeAreas(['domingos', 'xyz', 'reuniones']), ['domingos', 'reuniones']);
  assert.deepEqual(normalizeAreas([]), []);
});

test('processSumateBody rechaza edad menor a 18', function () {
  const r = processSumateBody({
    email: 'a@b.com',
    nombreCompleto: 'Ana López',
    edad: 17,
    ocupacion: 'Estudiante',
    celular: '381 5555555',
    conoceActividades: 'si',
    experienciaVoluntariado: 'no',
    comoSeEntero: 'instagram',
    conoceIntegrante: 'no',
    areas: ['domingos'],
    website: ''
  });
  assert.equal(r.ok, false);
  assert.match(r.message || '', /18/);
});

test('processSumateBody acepta payload mínimo válido', function () {
  const r = processSumateBody({
    email: 'voluntario@example.com',
    nombreCompleto: 'Juan Pérez',
    edad: '22',
    ocupacion: 'Docente',
    domicilio: 'San Miguel de Tucumán',
    celular: '381 4000000',
    conoceActividades: 'no',
    experienciaVoluntariado: 'si',
    experienciaDetalle: 'ONG local',
    comoSeEntero: 'amigo',
    conoceIntegrante: 'si',
    integranteQuien: 'María',
    areas: ['domingos', 'cumpleanios'],
    disponibilidad: 'Domingos por la tarde',
    website: ''
  });
  assert.equal(r.honeypot, false);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.data.email, 'voluntario@example.com');
    assert.equal(r.data.edad, 22);
    assert.deepEqual(r.data.areas, ['domingos', 'cumpleanios']);
  }
});

test('processSumateBody descarta honeypot', function () {
  const r = processSumateBody({
    email: 'a@b.com',
    website: 'http://spam.example'
  });
  assert.equal(r.honeypot, true);
});

test('buildSumateEmailContent incluye datos escapados', function () {
  const data = {
    email: 'x@y.com',
    nombreCompleto: 'Te<st>',
    edad: 30,
    ocupacion: 'Dev',
    domicilio: '',
    celular: '11 2222',
    conoceActividades: 'si',
    experienciaVoluntariado: 'no',
    experienciaDetalle: '',
    comoSeEntero: 'facebook',
    comoSeEnteroLabel: 'Facebook',
    conoceIntegrante: 'no',
    integranteQuien: '',
    areas: ['domingos'],
    areasLabels: ['Actividades que realiza el voluntariado todos los domingos'],
    disponibilidad: 'Line1\nLine2'
  };
  const { html, text } = buildSumateEmailContent(data, '20 de abril de 2026, 12:00');
  assert.match(html, /Te&lt;st&gt;/);
  assert.match(text, /Te<st>/);
  assert.match(text, /Line1/);
});
