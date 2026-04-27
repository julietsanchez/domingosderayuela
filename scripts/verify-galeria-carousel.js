'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateGaleriaCarousel } = require('../lib/galeria-carousel-validator');

const indexPath = path.join(__dirname, '..', 'index.html');

function main() {
  if (!fs.existsSync(indexPath)) {
    throw new Error(`No se encontró index.html en ${indexPath}.`);
  }

  const html = fs.readFileSync(indexPath, 'utf8');
  const result = validateGaleriaCarousel(html);

  if (!result.isValid) {
    console.error('La verificación del carrusel de galería falló:');
    result.errors.forEach(function(error) {
      console.error(`- ${error}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(`Carrusel de galería verificado correctamente: ${result.slideCount} slides, ${result.imageCount} imágenes.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
