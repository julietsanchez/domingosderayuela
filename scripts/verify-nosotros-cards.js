'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateNosotrosCards } = require('../lib/nosotros-cards-validator');

const indexPath = path.join(__dirname, '..', 'index.html');

function main() {
  if (!fs.existsSync(indexPath)) {
    throw new Error(`No se encontró index.html en ${indexPath}.`);
  }

  const html = fs.readFileSync(indexPath, 'utf8');
  const result = validateNosotrosCards(html);

  if (!result.isValid) {
    console.error('La verificación de cards interactivas falló:');
    result.errors.forEach(function(error) {
      console.error(`- ${error}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(`Cards interactivas verificadas correctamente: ${result.cardCount}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
