'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  INTERNAL_HERO_PAGES,
  REDIRECT_PAGES,
  validateInternalHeroPage,
  validateRedirectPage
} = require('../lib/internal-hero-validator');

const rootDir = path.join(__dirname, '..');
const stylesCss = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
const scriptJs = fs.readFileSync(path.join(rootDir, 'script.js'), 'utf8');

function readHtml(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

test('las páginas internas tienen banner fijo y logo blanco', function () {
  INTERNAL_HERO_PAGES.forEach(function(config) {
    const errors = validateInternalHeroPage(readHtml(config.path), config);
    assert.deepEqual(errors, []);
  });
});

test('las páginas de redirección conservan fallback visual y redirección', function () {
  REDIRECT_PAGES.forEach(function(relativePath) {
    const errors = validateRedirectPage(readHtml(relativePath), relativePath);
    assert.deepEqual(errors, []);
  });
});

test('los estilos de hero interno reutilizan el overlay verde del home', function () {
  assert.match(stylesCss, /\.hero-secondary\s*\{[\s\S]*--internal-hero-img/);
  assert.match(stylesCss, /rgba\(0,\s*191,\s*99,\s*0\.52\)\s*0%/);
  assert.match(stylesCss, /rgba\(0,\s*168,\s*84,\s*0\.48\)\s*50%/);
  assert.match(stylesCss, /rgba\(0,\s*90,\s*50,\s*0\.55\)\s*100%/);
  assert.match(stylesCss, /\.hero-secondary__logo/);
  assert.match(stylesCss, /\.redirect-splash__logo/);
});

test('el script no reemplaza las imágenes fijas de banners internos', function () {
  assert.doesNotMatch(scriptJs, /INTERNAL_HERO_IMAGES/);
  assert.doesNotMatch(scriptJs, /initInternalHeroBanners/);
  assert.doesNotMatch(scriptJs, /data-random-hero/);
  assert.doesNotMatch(scriptJs, /Math\.floor\(Math\.random\(\)/);
});

test('los validadores rechazan entradas inválidas', function () {
  assert.throws(function() {
    validateInternalHeroPage('', INTERNAL_HERO_PAGES[0]);
  }, /HTML no vacío/);

  assert.throws(function() {
    validateRedirectPage('', 'sumate.html');
  }, /HTML no vacío/);
});
