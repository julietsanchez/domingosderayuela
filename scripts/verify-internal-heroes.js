'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  INTERNAL_HERO_PAGES,
  REDIRECT_PAGES,
  validateInternalHeroPage,
  validateRedirectPage
} = require('../lib/internal-hero-validator');

const rootDir = path.join(__dirname, '..');

function readHtml(relativePath) {
  const filePath = path.join(rootDir, relativePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró ${relativePath}.`);
  }

  return fs.readFileSync(filePath, 'utf8');
}

function main() {
  const errors = [];

  INTERNAL_HERO_PAGES.forEach(function(config) {
    errors.push(...validateInternalHeroPage(readHtml(config.path), config));
  });

  REDIRECT_PAGES.forEach(function(relativePath) {
    errors.push(...validateRedirectPage(readHtml(relativePath), relativePath));
  });

  if (errors.length) {
    console.error('La verificación de banners internos falló:');
    errors.forEach(function(error) {
      console.error(`- ${error}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(`Banners internos verificados correctamente: ${INTERNAL_HERO_PAGES.length} páginas internas y ${REDIRECT_PAGES.length} redirecciones.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
