'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { trimString, parseBccList, escapeHtml } = require('../lib/quieroayudar-utils');

test('trimString recorta y tolera null', function () {
  assert.equal(trimString('  hola  '), 'hola');
  assert.equal(trimString(null), '');
  assert.equal(trimString(undefined), '');
});

test('parseBccList separa por comas y descarta vacíos', function () {
  assert.deepEqual(parseBccList('a@x.com, b@y.com '), ['a@x.com', 'b@y.com']);
  assert.deepEqual(parseBccList(''), []);
  assert.deepEqual(parseBccList(null), []);
});

test('escapeHtml neutraliza caracteres HTML', function () {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
});
