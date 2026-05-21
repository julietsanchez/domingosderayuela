'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SUMATE_SHEET_HEADERS,
  buildSumateSheetRow,
  buildSumateSheetPayload,
  appendSumateToGoogleSheet
} = require('../lib/sumatevoluntariado-sheets');

const sampleData = {
  email: 'voluntario@example.com',
  nombreCompleto: 'Juan Pérez',
  edad: 22,
  ocupacion: 'Docente',
  domicilio: 'San Miguel de Tucumán',
  celular: '381 4000000',
  conoceActividades: 'no',
  experienciaVoluntariado: 'si',
  experienciaDetalle: 'ONG local',
  comoSeEntero: 'amigo',
  comoSeEnteroLabel: 'Por un amigo/conocido',
  conoceIntegrante: 'si',
  integranteQuien: 'María',
  areas: ['domingos', 'cumpleanios'],
  areasLabels: [
    'Actividades que realiza el voluntariado todos los domingos',
    'Cumpleaños de lxs niñxs'
  ],
  disponibilidad: 'Domingos por la tarde'
};

test('SUMATE_SHEET_HEADERS tiene 15 columnas', function () {
  assert.equal(SUMATE_SHEET_HEADERS.length, 15);
});

test('buildSumateSheetRow alinea columnas con encabezados', function () {
  const receivedAt = '20 de mayo de 2026, 03:45 p. m.';
  const row = buildSumateSheetRow(sampleData, receivedAt);
  assert.equal(row.length, SUMATE_SHEET_HEADERS.length);
  assert.equal(row[0], receivedAt);
  assert.equal(row[1], sampleData.email);
  assert.equal(row[2], sampleData.nombreCompleto);
  assert.equal(row[3], '22');
  assert.equal(row[8], 'Sí');
  assert.match(row[13], /domingos|Cumpleaños/);
});

test('buildSumateSheetPayload incluye secret y row', function () {
  const payload = buildSumateSheetPayload(sampleData, 'fecha', 'token-secreto-test');
  assert.equal(payload.secret, 'token-secreto-test');
  assert.equal(payload.row.length, 15);
});

test('appendSumateToGoogleSheet falla sin URL o secret', async function () {
  const r = await appendSumateToGoogleSheet({
    webhookUrl: '',
    secret: 'x',
    data: sampleData,
    receivedAt: 'fecha'
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'SERVER_CONFIG');
});

test('appendSumateToGoogleSheet envía POST y reintenta una vez', async function () {
  const calls = [];

  async function mockFetch(url, init) {
    calls.push({ url, init });
    if (calls.length === 1) {
      return {
        ok: false,
        status: 500,
        headers: { get: function () {
          return 'application/json';
        } },
        json: async function () {
          return { ok: false, error: 'temporary' };
        }
      };
    }
    return {
      ok: true,
      status: 200,
      headers: { get: function () {
        return 'application/json';
      } },
      json: async function () {
        return { ok: true };
      }
    };
  }

  const r = await appendSumateToGoogleSheet({
    webhookUrl: 'https://script.google.com/macros/s/abc/exec',
    secret: 'mi-token',
    data: sampleData,
    receivedAt: '20 de mayo de 2026, 03:45 p. m.',
    fetchImpl: mockFetch,
    maxAttempts: 2,
    timeoutMs: 5000
  });

  assert.equal(r.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://script.google.com/macros/s/abc/exec');
  assert.equal(calls[0].init.method, 'POST');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.secret, 'mi-token');
  assert.equal(body.row.length, 15);
});

test('appendSumateToGoogleSheet devuelve SHEETS_PROVIDER tras agotar reintentos', async function () {
  async function mockFetch() {
    return {
      ok: true,
      status: 200,
      headers: { get: function () {
        return 'application/json';
      } },
      json: async function () {
        return { ok: false, error: 'unauthorized' };
      }
    };
  }

  const r = await appendSumateToGoogleSheet({
    webhookUrl: 'https://script.google.com/macros/s/abc/exec',
    secret: 'bad',
    data: sampleData,
    receivedAt: 'fecha',
    fetchImpl: mockFetch,
    maxAttempts: 2,
    timeoutMs: 5000
  });

  assert.equal(r.ok, false);
  assert.equal(r.code, 'SHEETS_PROVIDER');
});
