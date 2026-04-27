'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EXPECTED_CARD_COUNT,
  EXPECTED_MINI_PHOTO_COUNT,
  getNosotrosCardBlocks,
  validateNosotrosCards
} = require('../lib/nosotros-cards-validator');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('las cards de nosotros tienen estructura interactiva completa', function () {
  const result = validateNosotrosCards(indexHtml);

  assert.deepEqual(result.errors, []);
  assert.equal(result.isValid, true);
  assert.equal(result.cardCount, EXPECTED_CARD_COUNT);
});

test('cada card tiene cuatro fotos internas', function () {
  const cards = getNosotrosCardBlocks(indexHtml);

  assert.equal(cards.length, EXPECTED_CARD_COUNT);

  cards.forEach(function(cardHtml) {
    const miniPhotoCount = (cardHtml.match(/class="nosotros__mini-photo"/g) || []).length;
    assert.equal(miniPhotoCount, EXPECTED_MINI_PHOTO_COUNT);
  });
});

test('validateNosotrosCards rechaza HTML vacío o inválido', function () {
  assert.throws(function() {
    validateNosotrosCards('');
  }, /HTML no vacío/);

  const result = validateNosotrosCards('<main></main>');
  assert.equal(result.isValid, false);
  assert.match(result.errors[0], /Se esperaban 6 cards interactivas/);
});
