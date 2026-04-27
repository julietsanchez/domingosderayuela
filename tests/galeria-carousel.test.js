'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MIN_SLIDE_COUNT,
  PRIORITY_IMAGE_COUNT,
  getGalleryBlock,
  getGalleryImages,
  validateGaleriaCarousel
} = require('../lib/galeria-carousel-validator');

const rootDir = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
const scriptJs = fs.readFileSync(path.join(rootDir, 'script.js'), 'utf8');

test('la galería tiene controles, track e imágenes válidas', function () {
  const result = validateGaleriaCarousel(indexHtml);

  assert.deepEqual(result.errors, []);
  assert.equal(result.isValid, true);
  assert.ok(result.slideCount >= MIN_SLIDE_COUNT);
  assert.equal(result.imageCount, result.slideCount);
});

test('las primeras imágenes se priorizan y el resto queda en lazy loading', function () {
  const galleryHtml = getGalleryBlock(indexHtml);
  const images = getGalleryImages(galleryHtml);

  assert.ok(images.length >= MIN_SLIDE_COUNT);

  images.slice(0, PRIORITY_IMAGE_COUNT).forEach(function(imageHtml) {
    assert.match(imageHtml, /\bloading="eager"/);
    assert.match(imageHtml, /\bfetchpriority="high"/);
    assert.match(imageHtml, /\bdecoding="async"/);
  });

  images.slice(PRIORITY_IMAGE_COUNT).forEach(function(imageHtml) {
    assert.match(imageHtml, /\bloading="lazy"/);
    assert.match(imageHtml, /\bdecoding="async"/);
  });
});

test('los estilos conservan autoscroll y agregan pausa manual', function () {
  assert.match(stylesCss, /@keyframes galeria-scroll/);
  assert.match(stylesCss, /\.galeria__track\s*\{[\s\S]*animation:\s*galeria-scroll/);
  assert.match(stylesCss, /\.galeria__track--manual\s*\{[\s\S]*animation-play-state:\s*paused/);
  assert.match(stylesCss, /\.galeria__nav/);
});

test('el script inicializa navegación manual de galería', function () {
  assert.match(scriptJs, /initGaleriaCarouselControls/);
  assert.match(scriptJs, /data-galeria-prev/);
  assert.match(scriptJs, /data-galeria-next/);
  assert.match(scriptJs, /scrollBy/);
  assert.match(scriptJs, /gallery-updated/);
});

test('validateGaleriaCarousel rechaza HTML vacío o sin galería', function () {
  assert.throws(function() {
    validateGaleriaCarousel('');
  }, /HTML no vacío/);

  const result = validateGaleriaCarousel('<main></main>');
  assert.equal(result.isValid, false);
  assert.deepEqual(result.errors, ['No se encontró la sección #galeria.']);
});
